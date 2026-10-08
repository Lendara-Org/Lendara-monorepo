package main

import (
	"errors"
	"fmt"
	"log/slog"

	"github.com/stellar/go-stellar-sdk/amount"
	"github.com/stellar/go-stellar-sdk/clients/horizonclient"
	"github.com/stellar/go-stellar-sdk/keypair"
	"github.com/stellar/go-stellar-sdk/network"
	hProtocol "github.com/stellar/go-stellar-sdk/protocols/horizon"
	"github.com/stellar/go-stellar-sdk/txnbuild"
)

const (
	assetCode     = "USDC"
	initialSupply = "1000000"
)

type setup struct {
	client horizonclient.ClientInterface
	log    *slog.Logger
}

func (s setup) run(issuer, distribution *keypair.Full, homeDomain string) error {
	if err := s.checkTestnet(); err != nil {
		return err
	}

	issuerAcc, err := s.ensureFunded(issuer.Address())
	if err != nil {
		return err
	}
	distAcc, err := s.ensureFunded(distribution.Address())
	if err != nil {
		return err
	}

	usdc := txnbuild.CreditAsset{Code: assetCode, Issuer: issuer.Address()}

	if issuerAcc.HomeDomain != homeDomain {
		s.log.Info("setting issuer home domain", slog.String("home_domain", homeDomain))
		if err := s.submit(issuer, &txnbuild.SetOptions{HomeDomain: &homeDomain}); err != nil {
			return fmt.Errorf("set home domain: %w", err)
		}
	}

	hasSupply, err := holdsAsset(distAcc, usdc)
	if err != nil {
		return err
	}

	if !hasTrustline(distAcc, usdc) {
		s.log.Info("creating distribution trustline")
		line, err := usdc.ToChangeTrustAsset()
		if err != nil {
			return fmt.Errorf("build trustline asset: %w", err)
		}
		if err := s.submit(distribution, &txnbuild.ChangeTrust{Line: line, Limit: txnbuild.MaxTrustlineLimit}); err != nil {
			return fmt.Errorf("create trustline: %w", err)
		}
	}

	if !hasSupply {
		s.log.Info("issuing initial USDC supply", slog.String("amount", initialSupply))
		payment := &txnbuild.Payment{Destination: distribution.Address(), Amount: initialSupply, Asset: usdc}
		if err := s.submit(issuer, payment); err != nil {
			return fmt.Errorf("issue USDC: %w", err)
		}
	}

	s.log.Info("testnet setup complete",
		slog.String("issuer", issuer.Address()),
		slog.String("distribution", distribution.Address()),
	)
	return nil
}

// checkTestnet refuses to run against any network other than the SDF testnet.
func (s setup) checkTestnet() error {
	root, err := s.client.Root()
	if err != nil {
		return fmt.Errorf("reach horizon: %w", err)
	}
	if root.NetworkPassphrase != network.TestNetworkPassphrase {
		return fmt.Errorf("horizon is not on testnet (passphrase %q)", root.NetworkPassphrase)
	}
	return nil
}

func (s setup) ensureFunded(address string) (hProtocol.Account, error) {
	acc, err := s.client.AccountDetail(horizonclient.AccountRequest{AccountID: address})
	if err == nil {
		return acc, nil
	}
	if !horizonclient.IsNotFoundError(err) {
		return hProtocol.Account{}, fmt.Errorf("load account %s: %w", address, err)
	}

	s.log.Info("funding account with friendbot", slog.String("account", address))
	if _, err := s.client.Fund(address); err != nil {
		return hProtocol.Account{}, fmt.Errorf("fund %s: %w", address, err)
	}
	acc, err = s.client.AccountDetail(horizonclient.AccountRequest{AccountID: address})
	if err != nil {
		return hProtocol.Account{}, fmt.Errorf("load funded account %s: %w", address, err)
	}
	return acc, nil
}

func (s setup) submit(signer *keypair.Full, op txnbuild.Operation) error {
	acc, err := s.client.AccountDetail(horizonclient.AccountRequest{AccountID: signer.Address()})
	if err != nil {
		return fmt.Errorf("load source account: %w", err)
	}
	tx, err := txnbuild.NewTransaction(txnbuild.TransactionParams{
		SourceAccount:        &acc,
		IncrementSequenceNum: true,
		Operations:           []txnbuild.Operation{op},
		BaseFee:              txnbuild.MinBaseFee,
		Preconditions:        txnbuild.Preconditions{TimeBounds: txnbuild.NewTimeout(300)},
	})
	if err != nil {
		return fmt.Errorf("build transaction: %w", err)
	}
	tx, err = tx.Sign(network.TestNetworkPassphrase, signer)
	if err != nil {
		return fmt.Errorf("sign transaction: %w", err)
	}
	if _, err := s.client.SubmitTransaction(tx); err != nil {
		var hErr *horizonclient.Error
		if errors.As(err, &hErr) {
			codes, _ := hErr.ResultCodes()
			return fmt.Errorf("submit transaction: %w (result codes: %+v)", err, codes)
		}
		return fmt.Errorf("submit transaction: %w", err)
	}
	return nil
}

// holdsAsset reports whether acc has a positive balance of asset.
func holdsAsset(acc hProtocol.Account, asset txnbuild.CreditAsset) (bool, error) {
	if !hasTrustline(acc, asset) {
		return false, nil
	}
	stroops, err := amount.ParseInt64(acc.GetCreditBalance(asset.Code, asset.Issuer))
	if err != nil {
		return false, fmt.Errorf("parse %s balance: %w", asset.Code, err)
	}
	return stroops > 0, nil
}

func hasTrustline(acc hProtocol.Account, asset txnbuild.CreditAsset) bool {
	for _, b := range acc.Balances {
		if b.Code == asset.Code && b.Issuer == asset.Issuer {
			return true
		}
	}
	return false
}
