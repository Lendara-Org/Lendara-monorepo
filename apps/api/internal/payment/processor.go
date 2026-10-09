// Package payment sends the USDC of confirmed deposits on Stellar testnet.
// A worker in the API process picks up transactions in pending_anchor and
// pending_trust when their next_attempt_at is due (CLAUDE.md §6.8).
package payment

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/stellar/go-stellar-sdk/clients/horizonclient"
	"github.com/stellar/go-stellar-sdk/keypair"
	"github.com/stellar/go-stellar-sdk/network"
	"github.com/stellar/go-stellar-sdk/protocols/horizon"
	"github.com/stellar/go-stellar-sdk/txnbuild"
	"github.com/stellar/go-stellar-sdk/xdr"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/db"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/sandbox"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/transaction"
)

const (
	pollInterval  = 2 * time.Second
	batchSize     = 10
	trustRecheck  = 15 * time.Second
	trustDeadline = time.Hour // then the deposit fails
	txTimeout     = 60        // seconds
	baseFeeStroop = 1000
)

// Horizon is the part of horizonclient.Client the worker uses.
type Horizon interface {
	AccountDetail(request horizonclient.AccountRequest) (horizon.Account, error)
	SubmitTransaction(tx *txnbuild.Transaction) (horizon.Transaction, error)
}

// Processor moves deposits from pending_anchor to completed.
type Processor struct {
	store        *transaction.Store
	horizon      Horizon
	distribution *keypair.Full
	asset        txnbuild.CreditAsset
	logger       *slog.Logger
	// trustDeadline is how long a deposit waits in pending_trust.
	trustDeadline time.Duration
}

// New returns a Processor that pays from distribution the USDC issued by issuer.
func New(store *transaction.Store, h Horizon, distribution *keypair.Full, issuer string, logger *slog.Logger) *Processor {
	return &Processor{
		store:         store,
		horizon:       h,
		distribution:  distribution,
		asset:         txnbuild.CreditAsset{Code: sandbox.AssetCode, Issuer: issuer},
		logger:        logger,
		trustDeadline: trustDeadline,
	}
}

// Run processes due transactions until ctx is canceled.
func (p *Processor) Run(ctx context.Context) {
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			p.ProcessDue(ctx)
		}
	}
}

// ProcessDue handles every transaction whose next attempt is due. Errors are
// logged; a transaction that failed for a transient reason is retried later.
func (p *Processor) ProcessDue(ctx context.Context) {
	due, err := p.store.ListDue(ctx, batchSize)
	if err != nil {
		p.logger.ErrorContext(ctx, "list due transactions", slog.Any("error", err))
		return
	}
	for _, t := range due {
		if err := p.process(ctx, t); err != nil {
			p.logger.ErrorContext(ctx, "process payment", slog.String("transaction_id", t.ID.String()), slog.Any("error", err))
		}
	}
}

func (p *Processor) process(ctx context.Context, t db.Transaction) error {
	trusted, reason, err := p.hasTrustline(t.StellarAccount)
	if err != nil {
		return err
	}

	status := transaction.Status(t.Status)
	if !trusted {
		recheck := time.Now().Add(trustRecheck)
		if status == transaction.StatusPendingTrust {
			if time.Since(t.UpdatedAt) > p.trustDeadline {
				return p.fail(ctx, t, "No USDC trustline was added in time. Start a new deposit.")
			}
			return p.store.Reschedule(ctx, t.ID, recheck)
		}
		_, err := p.store.Transition(ctx, t.ID, transaction.StatusPendingTrust,
			transaction.Update{Message: &reason, NextAttemptAt: &recheck})
		return err
	}
	if status == transaction.StatusPendingTrust {
		if _, err := p.store.Transition(ctx, t.ID, transaction.StatusPendingAnchor, transaction.Update{}); err != nil {
			return err
		}
	}
	return p.pay(ctx, t)
}

// hasTrustline reports whether the destination can receive USDC; if not,
// reason tells the user what to do.
func (p *Processor) hasTrustline(destination string) (bool, string, error) {
	account := destination
	if muxed, err := xdr.AddressToMuxedAccount(destination); err == nil {
		accountID := muxed.ToAccountId()
		account = accountID.Address()
	}

	detail, err := p.horizon.AccountDetail(horizonclient.AccountRequest{AccountID: account})
	if horizonclient.IsNotFoundError(err) {
		return false, "The destination account does not exist on testnet. Fund it and add a USDC trustline.", nil
	}
	if err != nil {
		return false, "", fmt.Errorf("load destination account: %w", err)
	}
	for _, b := range detail.Balances {
		if b.Code == p.asset.Code && b.Issuer == p.asset.Issuer {
			return true, "", nil
		}
	}
	return false, "Add a trustline to USDC (issuer " + p.asset.Issuer + ") to receive the deposit.", nil
}

// pay sends amount_out from the distribution account. The hash is stored in
// pending_stellar before submitting, so a crash leaves a traceable record.
func (p *Processor) pay(ctx context.Context, t db.Transaction) error {
	source, err := p.horizon.AccountDetail(horizonclient.AccountRequest{AccountID: p.distribution.Address()})
	if err != nil {
		return fmt.Errorf("load distribution account: %w", err) // retried on the next tick
	}
	tx, err := p.buildPayment(t, &source)
	if err != nil {
		return p.fail(ctx, t, fmt.Sprintf("Could not build the Stellar payment: %v", err))
	}
	hash, err := tx.HashHex(network.TestNetworkPassphrase)
	if err != nil {
		return fmt.Errorf("hash payment: %w", err)
	}
	if _, err := p.store.Transition(ctx, t.ID, transaction.StatusPendingStellar,
		transaction.Update{StellarTransactionID: &hash}); err != nil {
		return err
	}

	if _, err := p.horizon.SubmitTransaction(tx); err != nil {
		return p.fail(ctx, t, "The Stellar payment failed: "+horizonError(err))
	}
	_, err = p.store.Transition(ctx, t.ID, transaction.StatusCompleted, transaction.Update{})
	return err
}

func (p *Processor) buildPayment(t db.Transaction, source *horizon.Account) (*txnbuild.Transaction, error) {
	if t.AmountOut == nil {
		return nil, errors.New("the transaction has no amount_out")
	}
	memo, err := stellarMemo(t.Memo, t.MemoType)
	if err != nil {
		return nil, err
	}
	tx, err := txnbuild.NewTransaction(txnbuild.TransactionParams{
		SourceAccount:        source,
		IncrementSequenceNum: true,
		BaseFee:              baseFeeStroop,
		Memo:                 memo,
		Preconditions:        txnbuild.Preconditions{TimeBounds: txnbuild.NewTimeout(txTimeout)},
		Operations: []txnbuild.Operation{&txnbuild.Payment{
			Destination: t.StellarAccount,
			Amount:      *t.AmountOut,
			Asset:       p.asset,
		}},
	})
	if err != nil {
		return nil, err
	}
	return tx.Sign(network.TestNetworkPassphrase, p.distribution)
}

// fail moves the transaction to error with a message for the user.
func (p *Processor) fail(ctx context.Context, t db.Transaction, message string) error {
	_, err := p.store.Transition(ctx, t.ID, transaction.StatusError, transaction.Update{Message: &message})
	return err
}

// stellarMemo converts a stored memo to its txnbuild type. Values were
// validated when the deposit was created.
func stellarMemo(memo, memoType *string) (txnbuild.Memo, error) {
	if memo == nil || memoType == nil {
		return nil, nil
	}
	switch *memoType {
	case "text":
		return txnbuild.MemoText(*memo), nil
	case "id":
		id, err := strconv.ParseUint(*memo, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid id memo: %w", err)
		}
		return txnbuild.MemoID(id), nil
	case "hash":
		b, err := base64.StdEncoding.DecodeString(*memo)
		if err != nil || len(b) != 32 {
			return nil, errors.New("invalid hash memo")
		}
		var h txnbuild.MemoHash
		copy(h[:], b)
		return h, nil
	default:
		return nil, fmt.Errorf("unknown memo type %q", *memoType)
	}
}

// horizonError summarizes a Horizon submission error with its result codes.
func horizonError(err error) string {
	var hErr *horizonclient.Error
	if errors.As(err, &hErr) {
		if codes, cErr := hErr.ResultCodes(); cErr == nil && codes != nil {
			return strings.Join(append([]string{codes.TransactionCode}, codes.OperationCodes...), ", ")
		}
		return hErr.Problem.Title
	}
	return err.Error()
}
