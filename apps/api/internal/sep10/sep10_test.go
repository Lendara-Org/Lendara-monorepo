package sep10

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stellar/go-stellar-sdk/clients/horizonclient"
	"github.com/stellar/go-stellar-sdk/keypair"
	"github.com/stellar/go-stellar-sdk/network"
	"github.com/stellar/go-stellar-sdk/protocols/horizon"
	"github.com/stellar/go-stellar-sdk/support/render/problem"
	"github.com/stellar/go-stellar-sdk/txnbuild"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/config"
)

// fakeAccounts serves accounts by ID; missing ones return a Horizon 404.
type fakeAccounts struct {
	accounts map[string]horizon.Account
	err      error
}

func (f fakeAccounts) AccountDetail(req horizonclient.AccountRequest) (horizon.Account, error) {
	if f.err != nil {
		return horizon.Account{}, f.err
	}
	if acc, ok := f.accounts[req.AccountID]; ok {
		return acc, nil
	}
	return horizon.Account{}, &horizonclient.Error{Problem: problem.P{Type: "https://stellar.org/horizon-errors/not_found"}}
}

func randomKP(t *testing.T) *keypair.Full {
	t.Helper()
	kp, err := keypair.Random()
	if err != nil {
		t.Fatalf("keypair: %v", err)
	}
	return kp
}

func newService(t *testing.T, accounts AccountLoader) *Service {
	t.Helper()
	cfg := config.Config{
		APIBaseURL: "https://api.lendara.test",
		JWTSecret:  []byte(strings.Repeat("s", 32)),
		Stellar:    config.Stellar{HomeDomain: "lendara.test", Signing: randomKP(t)},
	}
	s, err := New(cfg, accounts)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	return s
}

// sign signs a challenge as the client would.
func sign(t *testing.T, challenge string, signers ...*keypair.Full) string {
	t.Helper()
	parsed, err := txnbuild.TransactionFromXDR(challenge)
	if err != nil {
		t.Fatalf("parse challenge: %v", err)
	}
	tx, _ := parsed.Transaction()
	tx, err = tx.Sign(network.TestNetworkPassphrase, signers...)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	signed, err := tx.Base64()
	if err != nil {
		t.Fatalf("encode: %v", err)
	}
	return signed
}

func login(t *testing.T, s *Service, account, memo string, signers ...*keypair.Full) (string, error) {
	t.Helper()
	challenge, err := s.Challenge(account, memo, "")
	if err != nil {
		t.Fatalf("Challenge() error = %v", err)
	}
	return s.Token(sign(t, challenge, signers...))
}

func TestChallengeRejectsInvalidRequests(t *testing.T) {
	s := newService(t, fakeAccounts{})
	client := randomKP(t).Address()
	muxed := "MA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVAAAAAAAAAAAAAJLK"
	tests := []struct {
		name, account, memo, homeDomain string
	}{
		{name: "invalid account", account: "GBAD"},
		{name: "secret seed as account", account: randomKP(t).Seed()},
		{name: "memo is not an ID", account: client, memo: "hello"},
		{name: "memo with muxed account", account: muxed, memo: "1"},
		{name: "unknown home domain", account: client, homeDomain: "evil.test"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := s.Challenge(tt.account, tt.memo, tt.homeDomain)
			if _, ok := errors.AsType[*RequestError](err); !ok {
				t.Errorf("Challenge() error = %v, want *RequestError", err)
			}
		})
	}
}

func TestTokenForNewAccount(t *testing.T) {
	s := newService(t, fakeAccounts{})
	client := randomKP(t)

	token, err := login(t, s, client.Address(), "", client)
	if err != nil {
		t.Fatalf("Token() error = %v", err)
	}

	var claims jwt.RegisteredClaims
	if _, _, err := jwt.NewParser().ParseUnverified(token, &claims); err != nil {
		t.Fatalf("parse token: %v", err)
	}
	if claims.Issuer != "https://api.lendara.test/auth" {
		t.Errorf("iss = %q, want the WEB_AUTH_ENDPOINT", claims.Issuer)
	}
	if len(claims.ID) != 64 {
		t.Errorf("jti = %q, want the challenge hash", claims.ID)
	}
	subject, err := s.Verify(token)
	if err != nil {
		t.Fatalf("Verify() error = %v", err)
	}
	if subject != client.Address() {
		t.Errorf("subject = %q, want %q", subject, client.Address())
	}
}

func TestTokenSubjectIncludesMemo(t *testing.T) {
	s := newService(t, fakeAccounts{})
	client := randomKP(t)

	token, err := login(t, s, client.Address(), "17509749319012223907", client)
	if err != nil {
		t.Fatalf("Token() error = %v", err)
	}
	subject, err := s.Verify(token)
	if err != nil {
		t.Fatalf("Verify() error = %v", err)
	}
	if want := client.Address() + ":17509749319012223907"; subject != want {
		t.Errorf("subject = %q, want %q", subject, want)
	}
}

func TestTokenForExistingAccount(t *testing.T) {
	client, cosigner, stranger := randomKP(t), randomKP(t), randomKP(t)
	account := horizon.Account{
		AccountID:  client.Address(),
		Thresholds: horizon.AccountThresholds{MedThreshold: 2},
		Signers: []horizon.Signer{
			{Key: client.Address(), Weight: 1},
			{Key: cosigner.Address(), Weight: 1},
		},
	}
	s := newService(t, fakeAccounts{accounts: map[string]horizon.Account{client.Address(): account}})

	tests := []struct {
		name    string
		signers []*keypair.Full
		wantErr bool
	}{
		{name: "meets medium threshold", signers: []*keypair.Full{client, cosigner}},
		{name: "below medium threshold", signers: []*keypair.Full{client}, wantErr: true},
		{name: "unknown signer", signers: []*keypair.Full{client, stranger}, wantErr: true},
		{name: "unsigned", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := login(t, s, client.Address(), "", tt.signers...)
			if !tt.wantErr {
				if err != nil {
					t.Fatalf("Token() error = %v", err)
				}
				return
			}
			if _, ok := errors.AsType[*RequestError](err); !ok {
				t.Errorf("Token() error = %v, want *RequestError", err)
			}
		})
	}
}

func TestTokenRejectsOtherServerChallenge(t *testing.T) {
	s, other := newService(t, fakeAccounts{}), newService(t, fakeAccounts{})
	client := randomKP(t)

	challenge, err := other.Challenge(client.Address(), "", "")
	if err != nil {
		t.Fatalf("Challenge() error = %v", err)
	}
	_, err = s.Token(sign(t, challenge, client))
	if _, ok := errors.AsType[*RequestError](err); !ok {
		t.Errorf("Token() error = %v, want *RequestError", err)
	}
}

func TestTokenHorizonFailure(t *testing.T) {
	s := newService(t, fakeAccounts{err: errors.New("horizon down")})
	client := randomKP(t)

	_, err := login(t, s, client.Address(), "", client)
	if err == nil {
		t.Fatal("Token() error = nil, want error")
	}
	if _, ok := errors.AsType[*RequestError](err); ok {
		t.Errorf("Horizon failures are server errors, got *RequestError: %v", err)
	}
}

func TestVerifyRejectsInvalidTokens(t *testing.T) {
	s := newService(t, fakeAccounts{})
	client := randomKP(t)
	token, err := login(t, s, client.Address(), "", client)
	if err != nil {
		t.Fatalf("Token() error = %v", err)
	}

	t.Run("expired", func(t *testing.T) {
		expired := *s
		expired.now = func() time.Time { return time.Now().Add(tokenTTL + time.Minute) }
		if _, err := expired.Verify(token); err == nil {
			t.Error("Verify() error = nil, want error")
		}
	})
	t.Run("other secret", func(t *testing.T) {
		other := *s
		other.jwtSecret = []byte(strings.Repeat("x", 32))
		if _, err := other.Verify(token); err == nil {
			t.Error("Verify() error = nil, want error")
		}
	})
	t.Run("unsigned", func(t *testing.T) {
		unsigned, err := jwt.NewWithClaims(jwt.SigningMethodNone, jwt.RegisteredClaims{
			Issuer:    s.webAuthEndpoint,
			Subject:   client.Address(),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		}).SignedString(jwt.UnsafeAllowNoneSignatureType)
		if err != nil {
			t.Fatalf("sign: %v", err)
		}
		if _, err := s.Verify(unsigned); err == nil {
			t.Error("Verify() error = nil, want error")
		}
	})
}
