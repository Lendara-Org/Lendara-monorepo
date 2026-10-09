package server

import (
	"context"
	"net/http"
	"strings"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/sep10"
)

// Authenticator verifies a SEP-10 session JWT and returns its subject.
type Authenticator interface {
	Verify(token string) (string, error)
}

// sep10Operations use the sep10Jwt security scheme in openapi.yaml.
var sep10Operations = map[string]bool{
	"GetSep24Transaction":         true,
	"GetSep24Transactions":        true,
	"PostSep24DepositInteractive": true,
}

// requireSEP10 rejects requests to sep10Operations without a valid JWT, with
// the SEP-24 "Authentication required" response, and stores the subject in
// the request context (see sep10.SubjectFrom).
func requireSEP10(auth Authenticator) api.StrictMiddlewareFunc {
	return func(next api.StrictHandlerFunc, operationID string) api.StrictHandlerFunc {
		if !sep10Operations[operationID] {
			return next
		}
		return func(ctx context.Context, w http.ResponseWriter, r *http.Request, req any) (any, error) {
			token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
			subject, err := auth.Verify(token)
			if !ok || err != nil {
				writeJSON(w, http.StatusForbidden, api.AuthenticationRequired{Type: api.AuthenticationRequiredTypeAuthenticationRequired})
				return nil, nil
			}
			return next(sep10.WithSubject(ctx, subject), w, r, req)
		}
	}
}
