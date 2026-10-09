package server

import (
	"encoding/json"
	"errors"
	"net/http"
	"testing"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/handlers"
)

const validToken = "valid-token"

type fakeAuth struct{}

func (fakeAuth) Verify(token string) (string, error) {
	if token != validToken {
		return "", errors.New("invalid token")
	}
	return "GCLIENT", nil
}

func TestRequireSEP10(t *testing.T) {
	tests := []struct {
		name          string
		authorization string
		wantStatus    int
	}{
		{name: "missing token", wantStatus: http.StatusForbidden},
		{name: "not a bearer token", authorization: "Basic " + validToken, wantStatus: http.StatusForbidden},
		{name: "invalid token", authorization: "Bearer nope", wantStatus: http.StatusForbidden},
		// Reaches the handler, which rejects the paging_id before touching the database.
		{name: "valid token", authorization: "Bearer " + validToken, wantStatus: http.StatusBadRequest},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := New(discardLogger(), fakePinger{}, handlers.New(handlers.Config{}), Auth{SEP10: fakeAuth{}})
			header := http.Header{}
			if tt.authorization != "" {
				header.Set("Authorization", tt.authorization)
			}

			rec := serve(t, h, http.MethodGet, "/sep24/transactions?asset_code=USDC&paging_id=bad", header)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusForbidden {
				return
			}
			var body struct{ Type string }
			if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
				t.Fatalf("decode body: %v", err)
			}
			if body.Type != "authentication_required" {
				t.Errorf("type = %q, want authentication_required", body.Type)
			}
		})
	}
}

func TestPublicEndpointsSkipSEP10(t *testing.T) {
	h := New(discardLogger(), fakePinger{}, handlers.New(handlers.Config{}), Auth{SEP10: fakeAuth{}})

	rec := serve(t, h, http.MethodGet, "/sep24/info", nil)

	if rec.Code == http.StatusForbidden {
		t.Errorf("GET /sep24/info requires no JWT, got %d", rec.Code)
	}
}
