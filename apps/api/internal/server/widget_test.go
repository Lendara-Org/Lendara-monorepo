package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stellar/go-stellar-sdk/keypair"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
)

// widgetDo sends a request with a widget session token (or none if empty).
func (e sep24Env) widgetDo(t *testing.T, method, path, session string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var r *strings.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		r = strings.NewReader(string(b))
	} else {
		r = strings.NewReader("")
	}
	req := httptest.NewRequestWithContext(t.Context(), method, path, r)
	req.Header.Set("Content-Type", "application/json")
	if session != "" {
		req.Header.Set("Authorization", "Bearer "+session)
	}
	rec := httptest.NewRecorder()
	e.h.ServeHTTP(rec, req)
	return rec
}

// startWidget starts a deposit and returns its id and the one-time URL token.
func (e sep24Env) startWidget(t *testing.T, subject string) (id, token string) {
	t.Helper()
	resp := e.deposit(t, subject, map[string]any{"asset_code": "USDC"})
	u, err := url.Parse(resp.Url)
	if err != nil {
		t.Fatalf("parse url: %v", err)
	}
	return resp.Id, u.Query().Get("token")
}

func (e sep24Env) session(t *testing.T, id, token string) string {
	t.Helper()
	rec := e.widgetDo(t, http.MethodPost, "/widget-api/sessions", "", map[string]string{"transaction_id": id, "token": token})
	if rec.Code != http.StatusCreated {
		t.Fatalf("POST /widget-api/sessions status = %d, body = %s", rec.Code, rec.Body)
	}
	var s api.WidgetSession
	decode(t, rec, &s)
	return s.AccessToken
}

func TestWidgetFlow(t *testing.T) {
	e := newSEP24Env(t)
	subject := keypair.MustRandom().Address()
	id, token := e.startWidget(t, subject)
	session := e.session(t, id, token)

	rec := e.widgetDo(t, http.MethodGet, "/widget-api/transaction", session, nil)
	var view api.WidgetTransaction
	decode(t, rec, &view)
	if view.Transaction.Id != id || view.Transaction.Status != "incomplete" || view.Quote != nil || view.PaymentInstructions != nil {
		t.Fatalf("initial view = %+v, want incomplete without quote", view)
	}

	rec = e.widgetDo(t, http.MethodGet, "/widget-api/quote?fiat_currency=CRC&amount=10000", session, nil)
	var quote api.Quote
	decode(t, rec, &quote)
	if rec.Code != http.StatusOK || quote.AmountOut != "19.1078431" || quote.Fee != "0.50" || quote.Rate != "510" {
		t.Fatalf("quote = %d %+v", rec.Code, quote)
	}

	rec = e.widgetDo(t, http.MethodPost, "/widget-api/transaction/confirm", session,
		map[string]string{"fiat_currency": "CRC", "amount": "10000"})
	if rec.Code != http.StatusOK {
		t.Fatalf("confirm status = %d, body = %s", rec.Code, rec.Body)
	}
	decode(t, rec, &view)
	if view.Transaction.Status != "pending_user_transfer_start" || view.Quote == nil || view.PaymentInstructions == nil {
		t.Fatalf("confirmed view = %+v, want pending_user_transfer_start with quote and instructions", view)
	}
	if pi := view.PaymentInstructions; pi.Amount != "10000.00" || pi.FiatCurrency != api.CRC || !strings.HasPrefix(pi.Reference, "LND-") {
		t.Errorf("payment instructions = %+v", pi)
	}

	// The wallet sees the confirmed amounts through SEP-24.
	_, tx := e.transaction(t, subject, id)
	if tx.AmountInAsset == nil || *tx.AmountInAsset != "iso4217:CRC" || tx.AmountOut == nil || *tx.AmountOut != "19.1078431" {
		t.Errorf("SEP-24 transaction = %+v, want CRC amounts", tx)
	}

	rec = e.widgetDo(t, http.MethodPost, "/widget-api/transaction/confirm", session,
		map[string]string{"fiat_currency": "BRL", "amount": "100"})
	if rec.Code != http.StatusConflict {
		t.Errorf("second confirm status = %d, want 409", rec.Code)
	}
}

func TestWidgetSessionRejects(t *testing.T) {
	e := newSEP24Env(t)
	id, token := e.startWidget(t, keypair.MustRandom().Address())
	otherID, otherToken := e.startWidget(t, keypair.MustRandom().Address())

	post := func(body map[string]string) int {
		return e.widgetDo(t, http.MethodPost, "/widget-api/sessions", "", body).Code
	}
	if code := post(map[string]string{"transaction_id": id}); code != http.StatusBadRequest {
		t.Errorf("missing token status = %d, want 400", code)
	}
	if code := post(map[string]string{"transaction_id": otherID, "token": token}); code != http.StatusUnauthorized {
		t.Errorf("token of another transaction status = %d, want 401", code)
	}
	e.session(t, otherID, otherToken)
	if code := post(map[string]string{"transaction_id": otherID, "token": otherToken}); code != http.StatusUnauthorized {
		t.Errorf("reused token status = %d, want 401", code)
	}
}

func TestWidgetEndpointsRequireSession(t *testing.T) {
	e := newSEP24Env(t)
	subject := keypair.MustRandom().Address()

	for name, session := range map[string]string{"none": "", "SEP-10 token": "subject:" + subject, "garbage": "nope"} {
		t.Run(name, func(t *testing.T) {
			rec := e.widgetDo(t, http.MethodGet, "/widget-api/transaction", session, nil)
			if rec.Code != http.StatusUnauthorized {
				t.Errorf("status = %d, want 401", rec.Code)
			}
		})
	}
}

func TestWidgetQuoteBadRequest(t *testing.T) {
	e := newSEP24Env(t)
	id, token := e.startWidget(t, keypair.MustRandom().Address())
	session := e.session(t, id, token)

	for _, query := range []string{"fiat_currency=USD&amount=10", "fiat_currency=BRL&amount=1.234", "fiat_currency=BRL&amount=1"} {
		rec := e.widgetDo(t, http.MethodGet, "/widget-api/quote?"+query, session, nil)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("%s: status = %d, want 400", query, rec.Code)
		}
	}
}

func TestWidgetSimulatePayment(t *testing.T) {
	e := newSEP24Env(t)
	tests := []struct {
		amount, wantStatus, wantScenario string
		wantDelay                        bool
	}{
		{amount: "10000.00", wantStatus: "pending_anchor", wantScenario: "approved"},
		{amount: "10000.50", wantStatus: "pending_anchor", wantScenario: "delayed", wantDelay: true},
		{amount: "10000.13", wantStatus: "error", wantScenario: "kyc_rejected"},
		{amount: "10000.99", wantStatus: "expired", wantScenario: "payment_not_received"},
	}
	for _, tt := range tests {
		t.Run(tt.amount, func(t *testing.T) {
			id, token := e.startWidget(t, keypair.MustRandom().Address())
			session := e.session(t, id, token)

			// Paying before confirming the amount is a conflict.
			if rec := e.widgetDo(t, http.MethodPost, "/widget-api/transaction/simulate-payment", session, nil); rec.Code != http.StatusConflict {
				t.Errorf("simulate before confirm status = %d, want 409", rec.Code)
			}
			e.widgetDo(t, http.MethodPost, "/widget-api/transaction/confirm", session,
				map[string]string{"fiat_currency": "CRC", "amount": tt.amount})

			rec := e.widgetDo(t, http.MethodPost, "/widget-api/transaction/simulate-payment", session, nil)
			if rec.Code != http.StatusOK {
				t.Fatalf("simulate status = %d, body = %s", rec.Code, rec.Body)
			}
			var view api.WidgetTransaction
			decode(t, rec, &view)
			if string(view.Transaction.Status) != tt.wantStatus || view.PaymentInstructions != nil {
				t.Errorf("status = %s, want %s without payment instructions", view.Transaction.Status, tt.wantStatus)
			}

			stored, err := e.store.Get(t.Context(), mustUUID(t, id))
			if err != nil {
				t.Fatalf("Get() error = %v", err)
			}
			if stored.Scenario == nil || *stored.Scenario != tt.wantScenario {
				t.Errorf("scenario = %v, want %s", stored.Scenario, tt.wantScenario)
			}
			if delayed := stored.NextAttemptAt != nil && time.Until(*stored.NextAttemptAt) > 20*time.Second; delayed != tt.wantDelay {
				t.Errorf("next_attempt_at = %v, want delayed=%v", stored.NextAttemptAt, tt.wantDelay)
			}

			if rec := e.widgetDo(t, http.MethodPost, "/widget-api/transaction/simulate-payment", session, nil); rec.Code != http.StatusConflict {
				t.Errorf("second simulate status = %d, want 409", rec.Code)
			}
		})
	}
}

func mustUUID(t *testing.T, s string) uuid.UUID {
	t.Helper()
	id, err := uuid.Parse(s)
	if err != nil {
		t.Fatalf("parse id: %v", err)
	}
	return id
}
