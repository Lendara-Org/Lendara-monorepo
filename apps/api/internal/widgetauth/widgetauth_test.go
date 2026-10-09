package widgetauth

import (
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var secret = []byte(strings.Repeat("s", 32))

func TestIssueAndVerify(t *testing.T) {
	i := New("https://api.lendara.test", secret)
	id := uuid.New()

	token, expires, err := i.Issue(id)
	if err != nil {
		t.Fatalf("Issue() error = %v", err)
	}
	if d := time.Until(expires); d < 29*time.Minute || d > sessionTTL {
		t.Errorf("expires in %s, want %s", d, sessionTTL)
	}
	got, err := i.Verify(token)
	if err != nil || got != id {
		t.Errorf("Verify() = %v, %v; want %v", got, err, id)
	}
}

func TestVerifyRejects(t *testing.T) {
	i := New("https://api.lendara.test", secret)
	token, _, err := i.Issue(uuid.New())
	if err != nil {
		t.Fatalf("Issue() error = %v", err)
	}

	expired := *i
	expired.now = func() time.Time { return time.Now().Add(sessionTTL + time.Minute) }
	otherSecret := New("https://api.lendara.test", []byte(strings.Repeat("x", 32)))
	// A SEP-10 token: same secret, but another issuer and no audience.
	sep10, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.RegisteredClaims{
		Issuer:    "https://api.lendara.test/auth",
		Subject:   uuid.NewString(),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}).SignedString(secret)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	cases := map[string]struct {
		issuer *Issuer
		token  string
	}{
		"expired":      {&expired, token},
		"other secret": {otherSecret, token},
		"SEP-10 token": {i, sep10},
		"garbage":      {i, "not-a-jwt"},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			if _, err := c.issuer.Verify(c.token); err == nil {
				t.Error("Verify() error = nil, want error")
			}
		})
	}
}
