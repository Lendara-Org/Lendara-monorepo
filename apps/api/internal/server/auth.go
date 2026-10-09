package server

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/sep10"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/widgetauth"
)

// Authenticator verifies a SEP-10 session JWT and returns its subject.
type Authenticator interface {
	Verify(token string) (string, error)
}

// WidgetAuthenticator verifies a widget session token and returns its transaction.
type WidgetAuthenticator interface {
	Verify(token string) (uuid.UUID, error)
}

// Auth holds the verifiers of each security scheme in openapi.yaml.
type Auth struct {
	SEP10  Authenticator
	Widget WidgetAuthenticator
}

// sep10Operations use the sep10Jwt security scheme in openapi.yaml.
var sep10Operations = map[string]bool{
	"GetSep24Transaction":         true,
	"GetSep24Transactions":        true,
	"PostSep24DepositInteractive": true,
}

// widgetOperations use the widgetSession security scheme in openapi.yaml.
var widgetOperations = map[string]bool{
	"GetWidgetTransaction":     true,
	"GetWidgetQuote":           true,
	"ConfirmWidgetTransaction": true,
	"SimulateWidgetPayment":    true,
}

// requireAuth checks the bearer token of protected operations and stores the
// authenticated identity in the request context:
//   - sep10Operations: SEP-24 "Authentication required" (403) on failure;
//     the subject is read with sep10.SubjectFrom.
//   - widgetOperations: 401 on failure; the transaction is read with
//     widgetauth.TransactionFrom.
func requireAuth(auth Auth) api.StrictMiddlewareFunc {
	return func(next api.StrictHandlerFunc, operationID string) api.StrictHandlerFunc {
		switch {
		case sep10Operations[operationID]:
			return func(ctx context.Context, w http.ResponseWriter, r *http.Request, req any) (any, error) {
				token, ok := bearer(r)
				subject, err := auth.SEP10.Verify(token)
				if !ok || err != nil {
					writeJSON(w, http.StatusForbidden, api.AuthenticationRequired{Type: api.AuthenticationRequiredTypeAuthenticationRequired})
					return nil, nil
				}
				return next(sep10.WithSubject(ctx, subject), w, r, req)
			}
		case widgetOperations[operationID]:
			return func(ctx context.Context, w http.ResponseWriter, r *http.Request, req any) (any, error) {
				token, ok := bearer(r)
				id, err := auth.Widget.Verify(token)
				if !ok || err != nil {
					writeError(w, http.StatusUnauthorized, "invalid or expired widget session")
					return nil, nil
				}
				return next(widgetauth.WithTransaction(ctx, id), w, r, req)
			}
		default:
			return next
		}
	}
}

func bearer(r *http.Request) (string, bool) {
	return strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
}
