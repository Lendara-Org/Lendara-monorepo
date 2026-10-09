// Package sep10 implements SEP-10 Stellar Web Authentication: challenge
// transactions and the session JWT.
// Spec: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md
package sep10

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stellar/go-stellar-sdk/clients/horizonclient"
	"github.com/stellar/go-stellar-sdk/keypair"
	"github.com/stellar/go-stellar-sdk/network"
	"github.com/stellar/go-stellar-sdk/protocols/horizon"
	"github.com/stellar/go-stellar-sdk/strkey"
	"github.com/stellar/go-stellar-sdk/txnbuild"
	"github.com/stellar/go-stellar-sdk/xdr"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/config"
)

const (
	// challengeTimeout is the challenge validity window (300s, as the SDK recommends).
	challengeTimeout = 5 * time.Minute
	// tokenTTL is how long a session JWT is accepted.
	tokenTTL = 24 * time.Hour
)

// AccountLoader looks up accounts on the Stellar network (horizonclient.Client).
type AccountLoader interface {
	AccountDetail(request horizonclient.AccountRequest) (horizon.Account, error)
}

// RequestError is a client error. Handlers report it as a 400 with its message.
type RequestError struct{ msg string }

func (e *RequestError) Error() string { return e.msg }

func badRequest(format string, args ...any) error {
	return &RequestError{msg: fmt.Sprintf(format, args...)}
}

// Service issues challenges and session tokens.
type Service struct {
	signing         *keypair.Full
	homeDomain      string
	webAuthDomain   string
	webAuthEndpoint string
	jwtSecret       []byte
	accounts        AccountLoader
	now             func() time.Time
}

// New returns a Service for cfg. accounts is used to check the signers of
// existing client accounts.
func New(cfg config.Config, accounts AccountLoader) (*Service, error) {
	u, err := url.Parse(cfg.APIBaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse API base URL: %w", err)
	}
	return &Service{
		signing:         cfg.Stellar.Signing,
		homeDomain:      cfg.Stellar.HomeDomain,
		webAuthDomain:   u.Host,
		webAuthEndpoint: cfg.APIBaseURL + "/auth",
		jwtSecret:       cfg.JWTSecret,
		accounts:        accounts,
		now:             time.Now,
	}, nil
}

// Challenge builds a challenge transaction for account, signed by the server
// (SEP-10 "Challenge"). memo and homeDomain are optional.
func (s *Service) Challenge(account, memo, homeDomain string) (string, error) {
	if homeDomain == "" {
		homeDomain = s.homeDomain
	}
	if homeDomain != s.homeDomain {
		return "", badRequest("home_domain %q is not supported", homeDomain)
	}

	muxed := strkey.IsValidMuxedAccountEd25519PublicKey(account)
	if !muxed && !strkey.IsValidEd25519PublicKey(account) {
		return "", badRequest("account must be a valid G... or M... address")
	}

	var memoID *txnbuild.MemoID
	if memo != "" {
		if muxed {
			return "", badRequest("memo cannot be used with a muxed account")
		}
		id, err := strconv.ParseUint(memo, 10, 64)
		if err != nil {
			return "", badRequest("memo must be an ID memo (unsigned 64-bit integer)")
		}
		m := txnbuild.MemoID(id)
		memoID = &m
	}

	tx, err := txnbuild.BuildChallengeTx(s.signing.Seed(), account, s.webAuthDomain, homeDomain,
		network.TestNetworkPassphrase, challengeTimeout, memoID)
	if err != nil {
		return "", fmt.Errorf("build challenge: %w", err)
	}
	return tx.Base64()
}

// Token verifies a challenge signed by the client and returns a session JWT
// (SEP-10 "Token"). If the client account exists, its signers must meet the
// medium threshold; otherwise the challenge must be signed by its master key.
func (s *Service) Token(challengeXDR string) (string, error) {
	homeDomains := []string{s.homeDomain}
	tx, clientAccount, _, memo, err := txnbuild.ReadChallengeTx(challengeXDR, s.signing.Address(),
		network.TestNetworkPassphrase, s.webAuthDomain, homeDomains)
	if err != nil {
		return "", badRequest("invalid challenge: %v", err)
	}

	// A muxed account (M...) is signed for by its underlying G... account.
	signer := clientAccount
	if muxed, err := xdr.AddressToMuxedAccount(clientAccount); err == nil {
		accountID := muxed.ToAccountId()
		signer = accountID.Address()
	}

	account, err := s.accounts.AccountDetail(horizonclient.AccountRequest{AccountID: signer})
	switch {
	case horizonclient.IsNotFoundError(err):
		_, err = txnbuild.VerifyChallengeTxSigners(challengeXDR, s.signing.Address(),
			network.TestNetworkPassphrase, s.webAuthDomain, homeDomains, signer)
	case err != nil:
		return "", fmt.Errorf("load client account: %w", err)
	default:
		_, err = txnbuild.VerifyChallengeTxThreshold(challengeXDR, s.signing.Address(),
			network.TestNetworkPassphrase, s.webAuthDomain, homeDomains,
			txnbuild.Threshold(account.Thresholds.MedThreshold), account.SignerSummary())
	}
	if err != nil {
		return "", badRequest("challenge verification failed: %v", err)
	}

	hash, err := tx.HashHex(network.TestNetworkPassphrase)
	if err != nil {
		return "", fmt.Errorf("hash challenge: %w", err)
	}

	subject := clientAccount
	if memo != nil {
		subject = fmt.Sprintf("%s:%d", clientAccount, uint64(*memo))
	}
	now := s.now()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		Issuer:    s.webAuthEndpoint,
		Subject:   subject,
		ID:        hash,
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(tokenTTL)),
	})
	signed, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}
	return signed, nil
}

// Verify checks a session JWT and returns its subject: G..., M... or G...:memo.
func (s *Service) Verify(token string) (string, error) {
	var claims jwt.RegisteredClaims
	_, err := jwt.ParseWithClaims(token, &claims,
		func(*jwt.Token) (any, error) { return s.jwtSecret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(s.webAuthEndpoint),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(s.now),
	)
	if err != nil {
		return "", fmt.Errorf("invalid token: %w", err)
	}
	if claims.Subject == "" {
		return "", errors.New("invalid token: missing subject")
	}
	return claims.Subject, nil
}

type subjectKey struct{}

// WithSubject returns a context carrying the authenticated SEP-10 subject.
func WithSubject(ctx context.Context, subject string) context.Context {
	return context.WithValue(ctx, subjectKey{}, subject)
}

// SubjectFrom returns the SEP-10 subject stored by WithSubject.
func SubjectFrom(ctx context.Context) (string, bool) {
	subject, ok := ctx.Value(subjectKey{}).(string)
	return subject, ok
}
