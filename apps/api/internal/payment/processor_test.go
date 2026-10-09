package payment

import (
	"log/slog"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stellar/go-stellar-sdk/clients/horizonclient"
	"github.com/stellar/go-stellar-sdk/keypair"
	"github.com/stellar/go-stellar-sdk/network"
	"github.com/stellar/go-stellar-sdk/protocols/horizon"
	"github.com/stellar/go-stellar-sdk/protocols/horizon/base"
	"github.com/stellar/go-stellar-sdk/support/render/problem"
	"github.com/stellar/go-stellar-sdk/txnbuild"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/db"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/transaction"
)

type fakeHorizon struct {
	accounts  map[string]horizon.Account
	submitErr error
	submitted []*txnbuild.Transaction
}

func (f *fakeHorizon) AccountDetail(req horizonclient.AccountRequest) (horizon.Account, error) {
	if acc, ok := f.accounts[req.AccountID]; ok {
		return acc, nil
	}
	return horizon.Account{}, &horizonclient.Error{Problem: problem.P{Type: "https://stellar.org/horizon-errors/not_found"}}
}

func (f *fakeHorizon) SubmitTransaction(tx *txnbuild.Transaction) (horizon.Transaction, error) {
	f.submitted = append(f.submitted, tx)
	return horizon.Transaction{}, f.submitErr
}

type env struct {
	p       *Processor
	store   *transaction.Store
	horizon *fakeHorizon
	issuer  string
}

func newEnv(t *testing.T) env {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	pool, err := pgxpool.New(t.Context(), url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)

	distribution, issuer := keypair.MustRandom(), keypair.MustRandom().Address()
	h := &fakeHorizon{accounts: map[string]horizon.Account{
		distribution.Address(): {AccountID: distribution.Address(), Sequence: 100},
	}}
	store := transaction.NewStore(pool)
	return env{
		p:       New(store, h, distribution, issuer, slog.New(slog.DiscardHandler)),
		store:   store,
		horizon: h,
		issuer:  issuer,
	}
}

// addAccount registers a destination account, with a USDC trustline if trusted.
func (e env) addAccount(address string, trusted bool) {
	acc := horizon.Account{AccountID: address}
	if trusted {
		acc.Balances = []horizon.Balance{{Balance: "0", Asset: base.Asset{Type: "credit_alphanum4", Code: "USDC", Issuer: e.issuer}}}
	}
	e.horizon.accounts[address] = acc
}

// approvedDeposit creates a deposit that is due in pending_anchor.
func (e env) approvedDeposit(t *testing.T, destination string, memo *string) db.Transaction {
	t.Helper()
	ctx := t.Context()
	memoType := "id"
	params := transaction.CreateParams{AssetCode: "USDC", StellarAccount: destination}
	if memo != nil {
		params.Memo, params.MemoType = memo, &memoType
	}
	created, err := e.store.Create(ctx, params)
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if _, err := e.store.Confirm(ctx, created.ID, transaction.Quote{
		FiatCurrency: "CRC", AmountIn: "10000.00", AmountOut: "19.1078431", AmountFee: "0.50",
	}); err != nil {
		t.Fatalf("Confirm() error = %v", err)
	}
	now := time.Now()
	tx, err := e.store.Transition(ctx, created.ID, transaction.StatusPendingAnchor, transaction.Update{NextAttemptAt: &now})
	if err != nil {
		t.Fatalf("Transition() error = %v", err)
	}
	return tx
}

// process runs the worker on one transaction and returns it reloaded.
func (e env) process(t *testing.T, tx db.Transaction) db.Transaction {
	t.Helper()
	current, err := e.store.Get(t.Context(), tx.ID)
	if err != nil {
		t.Fatalf("Get() error = %v", err)
	}
	if err := e.p.process(t.Context(), current); err != nil {
		t.Fatalf("process() error = %v", err)
	}
	updated, err := e.store.Get(t.Context(), tx.ID)
	if err != nil {
		t.Fatalf("Get() error = %v", err)
	}
	return updated
}

func TestPaymentCompleted(t *testing.T) {
	e := newEnv(t)
	destination := keypair.MustRandom().Address()
	e.addAccount(destination, true)

	got := e.process(t, e.approvedDeposit(t, destination, ptr("42")))

	if got.Status != string(transaction.StatusCompleted) {
		t.Fatalf("status = %s (%v), want completed", got.Status, got.Message)
	}
	if len(e.horizon.submitted) != 1 {
		t.Fatalf("submitted %d transactions, want 1", len(e.horizon.submitted))
	}
	sent := e.horizon.submitted[0]
	hash, _ := sent.HashHex(network.TestNetworkPassphrase)
	if got.StellarTransactionID == nil || *got.StellarTransactionID != hash {
		t.Errorf("stellar_transaction_id = %v, want %s", got.StellarTransactionID, hash)
	}
	op, ok := sent.Operations()[0].(*txnbuild.Payment)
	if !ok || op.Destination != destination || op.Amount != "19.1078431" || op.Asset.GetCode() != "USDC" {
		t.Errorf("payment = %+v, want 19.1078431 USDC to %s", sent.Operations()[0], destination)
	}
	if memo, ok := sent.Memo().(txnbuild.MemoID); !ok || memo != 42 {
		t.Errorf("memo = %v, want id 42", sent.Memo())
	}
}

func TestPaymentWaitsForTrustline(t *testing.T) {
	e := newEnv(t)
	destination := keypair.MustRandom().Address()
	e.addAccount(destination, false)
	deposit := e.approvedDeposit(t, destination, nil)

	got := e.process(t, deposit)
	if got.Status != string(transaction.StatusPendingTrust) || got.Message == nil || !strings.Contains(*got.Message, "trustline") {
		t.Fatalf("status = %s (%v), want pending_trust asking for a trustline", got.Status, got.Message)
	}
	if got.NextAttemptAt == nil || !got.NextAttemptAt.After(time.Now()) {
		t.Errorf("next_attempt_at = %v, want a later recheck", got.NextAttemptAt)
	}
	if got := e.process(t, deposit); got.Status != string(transaction.StatusPendingTrust) {
		t.Errorf("recheck without trustline status = %s, want pending_trust", got.Status)
	}

	e.addAccount(destination, true)
	if got := e.process(t, deposit); got.Status != string(transaction.StatusCompleted) {
		t.Errorf("status after adding the trustline = %s (%v), want completed", got.Status, got.Message)
	}
}

func TestPaymentTrustlineDeadline(t *testing.T) {
	e := newEnv(t)
	deposit := e.approvedDeposit(t, keypair.MustRandom().Address(), nil)
	e.process(t, deposit) // -> pending_trust

	e.p.trustDeadline = 0
	got := e.process(t, deposit)

	if got.Status != string(transaction.StatusError) || got.NextAttemptAt != nil {
		t.Errorf("status = %s, next_attempt_at = %v; want error and no more attempts", got.Status, got.NextAttemptAt)
	}
}

func TestPaymentAccountNotFound(t *testing.T) {
	e := newEnv(t)

	got := e.process(t, e.approvedDeposit(t, keypair.MustRandom().Address(), nil))

	if got.Status != string(transaction.StatusPendingTrust) || got.Message == nil || !strings.Contains(*got.Message, "does not exist") {
		t.Errorf("status = %s (%v), want pending_trust for a missing account", got.Status, got.Message)
	}
}

func TestPaymentSubmitFails(t *testing.T) {
	e := newEnv(t)
	destination := keypair.MustRandom().Address()
	e.addAccount(destination, true)
	e.horizon.submitErr = &horizonclient.Error{Problem: problem.P{
		Title:  "Transaction Failed",
		Extras: map[string]any{"result_codes": map[string]any{"transaction": "tx_failed", "operations": []string{"op_underfunded"}}},
	}}

	got := e.process(t, e.approvedDeposit(t, destination, nil))

	if got.Status != string(transaction.StatusError) || got.Message == nil || !strings.Contains(*got.Message, "op_underfunded") {
		t.Errorf("status = %s (%v), want error with the result codes", got.Status, got.Message)
	}
	if got.StellarTransactionID == nil {
		t.Error("stellar_transaction_id = nil, want the attempted hash")
	}
}

func TestPaymentRetriesWhenHorizonIsDown(t *testing.T) {
	e := newEnv(t)
	destination := keypair.MustRandom().Address()
	e.addAccount(destination, true)
	deposit := e.approvedDeposit(t, destination, nil)
	delete(e.horizon.accounts, e.p.distribution.Address())

	current, _ := e.store.Get(t.Context(), deposit.ID)
	if err := e.p.process(t.Context(), current); err == nil {
		t.Fatal("process() error = nil, want error")
	}
	if got, _ := e.store.Get(t.Context(), deposit.ID); got.Status != string(transaction.StatusPendingAnchor) {
		t.Errorf("status = %s, want pending_anchor (retried later)", got.Status)
	}
}

func TestStellarMemo(t *testing.T) {
	hash := strings.Repeat("A", 43) + "=" // 32 bytes in base64
	for _, tc := range []struct{ memo, memoType string }{{"hi", "text"}, {"7", "id"}, {hash, "hash"}} {
		if m, err := stellarMemo(&tc.memo, &tc.memoType); err != nil || m == nil {
			t.Errorf("stellarMemo(%q, %s) = %v, %v", tc.memo, tc.memoType, m, err)
		}
	}
	if m, err := stellarMemo(nil, nil); m != nil || err != nil {
		t.Errorf("no memo = %v, %v; want nil", m, err)
	}
	bad := "x"
	if _, err := stellarMemo(&bad, ptr("id")); err == nil {
		t.Error("invalid id memo accepted")
	}
}

func ptr[T any](v T) *T { return &v }
