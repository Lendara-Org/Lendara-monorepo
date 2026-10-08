package main

import (
	"log/slog"
	"strings"
	"testing"

	"github.com/stellar/go-stellar-sdk/clients/horizonclient"
	"github.com/stellar/go-stellar-sdk/keypair"
	"github.com/stellar/go-stellar-sdk/network"
	hProtocol "github.com/stellar/go-stellar-sdk/protocols/horizon"
	"github.com/stellar/go-stellar-sdk/protocols/horizon/base"
	"github.com/stellar/go-stellar-sdk/txnbuild"
	"github.com/stretchr/testify/mock"
)

func newKeypair(t *testing.T) *keypair.Full {
	t.Helper()
	kp, err := keypair.Random()
	if err != nil {
		t.Fatalf("keypair: %v", err)
	}
	return kp
}

func usdcBalance(issuer, balance string) hProtocol.Balance {
	return hProtocol.Balance{
		Balance: balance,
		Asset:   base.Asset{Type: "credit_alphanum4", Code: assetCode, Issuer: issuer},
	}
}

func TestRunRefusesNonTestnet(t *testing.T) {
	client := &horizonclient.MockClient{}
	client.On("Root").Return(hProtocol.Root{NetworkPassphrase: network.PublicNetworkPassphrase}, nil)

	s := setup{client: client, log: slog.New(slog.DiscardHandler)}
	err := s.run(newKeypair(t), newKeypair(t), "localhost:8080")

	if err == nil || !strings.Contains(err.Error(), "not on testnet") {
		t.Fatalf("run() error = %v, want testnet error", err)
	}
	client.AssertNotCalled(t, "AccountDetail", mock.Anything)
}

func TestRunSkipsCompletedSteps(t *testing.T) {
	issuer, distribution := newKeypair(t), newKeypair(t)
	client := &horizonclient.MockClient{}
	client.On("Root").Return(hProtocol.Root{NetworkPassphrase: network.TestNetworkPassphrase}, nil)
	client.On("AccountDetail", horizonclient.AccountRequest{AccountID: issuer.Address()}).
		Return(hProtocol.Account{AccountID: issuer.Address(), HomeDomain: "localhost:8080"}, nil)
	client.On("AccountDetail", horizonclient.AccountRequest{AccountID: distribution.Address()}).
		Return(hProtocol.Account{
			AccountID: distribution.Address(),
			Balances:  []hProtocol.Balance{usdcBalance(issuer.Address(), "1000000.0000000")},
		}, nil)

	s := setup{client: client, log: slog.New(slog.DiscardHandler)}
	if err := s.run(issuer, distribution, "localhost:8080"); err != nil {
		t.Fatalf("run() error = %v", err)
	}
	client.AssertNotCalled(t, "Fund", mock.Anything)
	client.AssertNotCalled(t, "SubmitTransaction", mock.Anything)
}

func TestHoldsAsset(t *testing.T) {
	issuer := newKeypair(t).Address()
	usdc := txnbuild.CreditAsset{Code: assetCode, Issuer: issuer}

	tests := []struct {
		name     string
		balances []hProtocol.Balance
		want     bool
	}{
		{name: "no trustline", want: false},
		{name: "trustline with zero balance", balances: []hProtocol.Balance{usdcBalance(issuer, "0.0000000")}, want: false},
		{name: "positive balance", balances: []hProtocol.Balance{usdcBalance(issuer, "10.0000000")}, want: true},
		{name: "other issuer", balances: []hProtocol.Balance{usdcBalance(newKeypair(t).Address(), "10.0000000")}, want: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := holdsAsset(hProtocol.Account{Balances: tt.balances}, usdc)
			if err != nil {
				t.Fatalf("holdsAsset() error = %v", err)
			}
			if got != tt.want {
				t.Errorf("holdsAsset() = %v, want %v", got, tt.want)
			}
		})
	}
}
