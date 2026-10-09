package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/stellar/go-stellar-sdk/clients/horizonclient"
	"github.com/stellar/go-stellar-sdk/keypair"
	"github.com/stellar/go-stellar-sdk/network"
	"github.com/stellar/go-stellar-sdk/protocols/horizon"
	"github.com/stellar/go-stellar-sdk/support/render/problem"
	"github.com/stellar/go-stellar-sdk/txnbuild"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/config"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/handlers"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/sep10"
)

// noAccounts reports every account as missing from the network.
type noAccounts struct{}

func (noAccounts) AccountDetail(horizonclient.AccountRequest) (horizon.Account, error) {
	return horizon.Account{}, &horizonclient.Error{Problem: problem.P{Type: "https://stellar.org/horizon-errors/not_found"}}
}

func sep10Server(t *testing.T) http.Handler {
	t.Helper()
	cfg := config.Config{
		APIBaseURL: "http://localhost:8080",
		JWTSecret:  []byte(strings.Repeat("s", 32)),
		Stellar:    config.Stellar{HomeDomain: "localhost:8080", Signing: keypair.MustRandom()},
	}
	auth, err := sep10.New(cfg, noAccounts{})
	if err != nil {
		t.Fatalf("sep10.New() error = %v", err)
	}
	return New(discardLogger(), fakePinger{}, handlers.New(handlers.Config{SEP10: auth}), auth)
}

func decode(t *testing.T, rec *httptest.ResponseRecorder, v any) {
	t.Helper()
	if err := json.NewDecoder(rec.Body).Decode(v); err != nil {
		t.Fatalf("decode body: %v", err)
	}
}

func TestSEP10Flow(t *testing.T) {
	for _, contentType := range []string{"application/json", "application/x-www-form-urlencoded"} {
		t.Run(contentType, func(t *testing.T) {
			h := sep10Server(t)
			client := keypair.MustRandom()

			rec := serve(t, h, http.MethodGet, "/auth?account="+client.Address(), nil)
			if rec.Code != http.StatusOK {
				t.Fatalf("GET /auth status = %d, body = %s", rec.Code, rec.Body)
			}
			var challenge struct{ Transaction string }
			decode(t, rec, &challenge)

			parsed, err := txnbuild.TransactionFromXDR(challenge.Transaction)
			if err != nil {
				t.Fatalf("parse challenge: %v", err)
			}
			tx, _ := parsed.Transaction()
			tx, err = tx.Sign(network.TestNetworkPassphrase, client)
			if err != nil {
				t.Fatalf("sign: %v", err)
			}
			signed, err := tx.Base64()
			if err != nil {
				t.Fatalf("encode: %v", err)
			}

			body := url.Values{"transaction": {signed}}.Encode()
			if contentType == "application/json" {
				b, _ := json.Marshal(map[string]string{"transaction": signed})
				body = string(b)
			}
			req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/auth", strings.NewReader(body))
			req.Header.Set("Content-Type", contentType)
			rec = httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != http.StatusOK {
				t.Fatalf("POST /auth status = %d, body = %s", rec.Code, rec.Body)
			}
			var token struct{ Token string }
			decode(t, rec, &token)

			// A 400 for the bad paging_id means the JWT was accepted.
			rec = serve(t, h, http.MethodGet, "/sep24/transactions?asset_code=USDC&paging_id=bad",
				http.Header{"Authorization": {"Bearer " + token.Token}})
			if rec.Code != http.StatusBadRequest {
				t.Errorf("authenticated SEP-24 request status = %d, want %d", rec.Code, http.StatusBadRequest)
			}
		})
	}
}

func TestSEP10ChallengeBadRequest(t *testing.T) {
	rec := serve(t, sep10Server(t), http.MethodGet, "/auth?account=GBAD", nil)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
	var body struct{ Error string }
	decode(t, rec, &body)
	if body.Error == "" {
		t.Error(`want {"error": "..."} body`)
	}
}
