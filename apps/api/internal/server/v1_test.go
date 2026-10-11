package server

import (
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/stellar/go-stellar-sdk/keypair"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
)

// newProject creates a project through the API and returns its API key.
func (e sep24Env) newProject(t *testing.T, name string) (api.Project, string) {
	t.Helper()
	rec := e.widgetDo(t, http.MethodPost, "/v1/projects", "", map[string]string{"name": name})
	if rec.Code != http.StatusCreated {
		t.Fatalf("POST /v1/projects status = %d, body = %s", rec.Code, rec.Body)
	}
	var created api.ProjectCreated
	decode(t, rec, &created)
	return created.Project, created.ApiKey
}

// newSession creates a session with the API key and returns it.
func (e sep24Env) newSession(t *testing.T, key string, body map[string]any) api.Session {
	t.Helper()
	rec := e.widgetDo(t, http.MethodPost, "/v1/sessions", key, body)
	if rec.Code != http.StatusCreated {
		t.Fatalf("POST /v1/sessions status = %d, body = %s", rec.Code, rec.Body)
	}
	var s api.Session
	decode(t, rec, &s)
	return s
}

func TestV1Projects(t *testing.T) {
	e := newSEP24Env(t)
	p, key := e.newProject(t, "  Demo store  ")

	if p.Name != "Demo store" {
		t.Errorf("name = %q, want trimmed", p.Name)
	}
	if !strings.HasPrefix(key, "lnd_test_") || len(key) < 30 {
		t.Errorf("api_key = %q, want lnd_test_ + random", key)
	}

	rec := e.widgetDo(t, http.MethodGet, "/v1/project", key, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /v1/project status = %d, body = %s", rec.Code, rec.Body)
	}
	var got api.Project
	decode(t, rec, &got)
	if got.Id != p.Id || got.Name != p.Name {
		t.Errorf("project = %+v, want %+v", got, p)
	}

	for _, name := range []string{"", "   ", strings.Repeat("x", 101)} {
		if rec := e.widgetDo(t, http.MethodPost, "/v1/projects", "", map[string]string{"name": name}); rec.Code != http.StatusBadRequest {
			t.Errorf("name %q: status = %d, want 400", name, rec.Code)
		}
	}
}

func TestV1RequiresAPIKey(t *testing.T) {
	e := newSEP24Env(t)
	for _, key := range []string{"", "lnd_test_unknown", "not-a-key"} {
		for _, path := range []string{"/v1/project", "/v1/transactions", "/v1/transactions/x"} {
			if rec := e.widgetDo(t, http.MethodGet, path, key, nil); rec.Code != http.StatusUnauthorized {
				t.Errorf("GET %s with key %q: status = %d, want 401", path, key, rec.Code)
			}
		}
		if rec := e.widgetDo(t, http.MethodPost, "/v1/sessions", key, map[string]any{}); rec.Code != http.StatusUnauthorized {
			t.Errorf("POST /v1/sessions with key %q: status = %d, want 401", key, rec.Code)
		}
	}
}

func TestV1Session(t *testing.T) {
	e := newSEP24Env(t)
	_, key := e.newProject(t, "Shop")
	account := keypair.MustRandom().Address()

	s := e.newSession(t, key, map[string]any{
		"account": account, "fiat_currency": "CRC", "amount": "20000", "memo": "42", "memo_type": "id",
	})
	u, err := url.Parse(s.Url)
	if err != nil {
		t.Fatalf("parse url: %v", err)
	}
	if want := testWebBaseURL + "/widget/" + s.Id; u.Scheme+"://"+u.Host+u.Path != want {
		t.Errorf("url = %s, want %s?...", s.Url, want)
	}
	q := u.Query()
	if q.Get("fiat_currency") != "CRC" || q.Get("fiat_amount") != "20000" || q.Get("token") == "" {
		t.Errorf("url query = %v, want fiat_currency, fiat_amount and token", q)
	}
	if left := time.Until(s.ExpiresAt); left < 14*time.Minute || left > 15*time.Minute {
		t.Errorf("expires_at in %s, want ~15m", left)
	}

	// The token opens the widget, like the SEP-24 interactive URL.
	e.session(t, s.Id, q.Get("token"))

	rec := e.widgetDo(t, http.MethodGet, "/v1/transactions/"+s.Id, key, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /v1/transactions/{id} status = %d, body = %s", rec.Code, rec.Body)
	}
	var tx api.Sep24Transaction
	decode(t, rec, &tx)
	if tx.Status != api.Sep24TransactionStatusIncomplete || tx.To == nil || *tx.To != account ||
		tx.DepositMemo == nil || *tx.DepositMemo != "42" {
		t.Errorf("transaction = %+v", tx)
	}
}

func TestV1SessionBadRequests(t *testing.T) {
	e := newSEP24Env(t)
	_, key := e.newProject(t, "Shop")
	account := keypair.MustRandom().Address()

	for name, body := range map[string]map[string]any{
		"no account":       {},
		"bad account":      {"account": "GABC"},
		"bad currency":     {"account": account, "fiat_currency": "USD"},
		"amount alone":     {"account": account, "amount": "20000"},
		"amount too small": {"account": account, "fiat_currency": "CRC", "amount": "1"},
		"amount decimals":  {"account": account, "fiat_currency": "CRC", "amount": "20000.123"},
		"bad memo":         {"account": account, "memo": "x", "memo_type": "id"},
		"memo_type alone":  {"account": account, "memo_type": "text"},
	} {
		if rec := e.widgetDo(t, http.MethodPost, "/v1/sessions", key, body); rec.Code != http.StatusBadRequest {
			t.Errorf("%s: status = %d, want 400 (body %s)", name, rec.Code, rec.Body)
		}
	}
}

func TestV1Transactions(t *testing.T) {
	e := newSEP24Env(t)
	_, key := e.newProject(t, "Shop")
	_, otherKey := e.newProject(t, "Other")
	account := keypair.MustRandom().Address()

	var ids []string
	for range 3 {
		ids = append(ids, e.newSession(t, key, map[string]any{"account": account}).Id)
	}
	other := e.newSession(t, otherKey, map[string]any{"account": account}).Id

	list := func(query string) api.TransactionList {
		t.Helper()
		rec := e.widgetDo(t, http.MethodGet, "/v1/transactions"+query, key, nil)
		if rec.Code != http.StatusOK {
			t.Fatalf("GET /v1/transactions%s status = %d, body = %s", query, rec.Code, rec.Body)
		}
		var l api.TransactionList
		decode(t, rec, &l)
		return l
	}

	first := list("?limit=2")
	if len(first.Data) != 2 || first.Data[0].Id != ids[2] || first.Data[1].Id != ids[1] || first.NextCursor == nil {
		t.Fatalf("first page = %+v, want the 2 newest and a cursor", first)
	}
	second := list("?limit=2&cursor=" + *first.NextCursor)
	if len(second.Data) != 1 || second.Data[0].Id != ids[0] || second.NextCursor != nil {
		t.Errorf("second page = %+v, want the oldest and no cursor", second)
	}

	if rec := e.widgetDo(t, http.MethodGet, "/v1/transactions/"+other, key, nil); rec.Code != http.StatusNotFound {
		t.Errorf("other project's transaction: status = %d, want 404", rec.Code)
	}
	for _, query := range []string{"?limit=0", "?limit=101", "?cursor=nope"} {
		if rec := e.widgetDo(t, http.MethodGet, "/v1/transactions"+query, key, nil); rec.Code != http.StatusBadRequest {
			t.Errorf("%s: status = %d, want 400", query, rec.Code)
		}
	}
}
