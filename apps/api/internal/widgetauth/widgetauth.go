// Package widgetauth issues the short-lived access tokens of the interactive
// widget. A token is bound to one transaction and is not a SEP-10 token.
package widgetauth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// sessionTTL is how long the widget can act on a transaction.
const sessionTTL = 30 * time.Minute

// audience keeps widget tokens and SEP-10 tokens from being swapped.
const audience = "lendara-widget"

// Issuer signs and verifies widget session tokens (HS256).
type Issuer struct {
	issuer string
	secret []byte
	now    func() time.Time
}

// New returns an Issuer. issuer is the API base URL; secret is SEP10_JWT_SECRET.
func New(issuer string, secret []byte) *Issuer {
	return &Issuer{issuer: issuer + "/widget-api", secret: secret, now: time.Now}
}

// Issue returns a session token for a transaction and its expiration.
func (i *Issuer) Issue(transactionID uuid.UUID) (string, time.Time, error) {
	now := i.now()
	expires := now.Add(sessionTTL)
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		Issuer:    i.issuer,
		Audience:  jwt.ClaimStrings{audience},
		Subject:   transactionID.String(),
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(expires),
	}).SignedString(i.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign widget token: %w", err)
	}
	return token, expires, nil
}

// Verify checks a session token and returns its transaction ID.
func (i *Issuer) Verify(token string) (uuid.UUID, error) {
	var claims jwt.RegisteredClaims
	_, err := jwt.ParseWithClaims(token, &claims,
		func(*jwt.Token) (any, error) { return i.secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(i.issuer),
		jwt.WithAudience(audience),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(i.now),
	)
	if err != nil {
		return uuid.UUID{}, fmt.Errorf("invalid widget token: %w", err)
	}
	id, err := uuid.Parse(claims.Subject)
	if err != nil {
		return uuid.UUID{}, errors.New("invalid widget token: bad subject")
	}
	return id, nil
}

type transactionKey struct{}

// WithTransaction returns a context carrying the widget's transaction ID.
func WithTransaction(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, transactionKey{}, id)
}

// TransactionFrom returns the transaction ID stored by WithTransaction.
func TransactionFrom(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(transactionKey{}).(uuid.UUID)
	return id, ok
}
