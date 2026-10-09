package server

import (
	"bytes"
	"encoding/json"
	"errors"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stellar/go-stellar-sdk/keypair"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/handlers"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/transaction"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/widgetauth"
)

const testWebBaseURL = "https://web.lendara.test"

// subjectAuth accepts tokens of the form "subject:<SEP-10 subject>".
type subjectAuth struct{}

func (subjectAuth) Verify(token string) (string, error) {
	subject, ok := strings.CutPrefix(token, "subject:")
	if !ok {
		return "", errors.New("invalid token")
	}
	return subject, nil
}

type sep24Env struct {
	h      http.Handler
	store  *transaction.Store
	widget *widgetauth.Issuer
	issuer string
}

// newSEP24Env serves the API with a real store on TEST_DATABASE_URL.
func newSEP24Env(t *testing.T) sep24Env {
	t.Helper()
	dbURL := os.Getenv("TEST_DATABASE_URL")
	if dbURL == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	pool, err := pgxpool.New(t.Context(), dbURL)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)

	env := sep24Env{
		store:  transaction.NewStore(pool),
		widget: widgetauth.New("https://api.lendara.test", []byte(strings.Repeat("s", 32))),
		issuer: keypair.MustRandom().Address(),
	}
	env.h = New(discardLogger(), fakePinger{}, handlers.New(handlers.Config{
		Transactions: env.store,
		Widget:       env.widget,
		WebBaseURL:   testWebBaseURL,
		Issuer:       env.issuer,
	}), Auth{SEP10: subjectAuth{}, Widget: env.widget})
	return env
}

func (e sep24Env) do(t *testing.T, method, path, subject, contentType string, body []byte) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), method, path, bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer subject:"+subject)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	rec := httptest.NewRecorder()
	e.h.ServeHTTP(rec, req)
	return rec
}

// deposit starts a JSON deposit and returns the response.
func (e sep24Env) deposit(t *testing.T, subject string, body map[string]any) api.Sep24InteractiveResponse {
	t.Helper()
	b, _ := json.Marshal(body)
	rec := e.do(t, http.MethodPost, "/sep24/transactions/deposit/interactive", subject, "application/json", b)
	if rec.Code != http.StatusOK {
		t.Fatalf("deposit status = %d, body = %s", rec.Code, rec.Body)
	}
	var resp api.Sep24InteractiveResponse
	decode(t, rec, &resp)
	return resp
}

func (e sep24Env) transaction(t *testing.T, subject, id string) (int, api.Sep24Transaction) {
	t.Helper()
	rec := e.do(t, http.MethodGet, "/sep24/transaction?id="+url.QueryEscape(id), subject, "", nil)
	var resp api.Sep24TransactionResponse
	if rec.Code == http.StatusOK {
		decode(t, rec, &resp)
	}
	return rec.Code, resp.Transaction
}

func TestSEP24Info(t *testing.T) {
	rec := serve(t, New(discardLogger(), fakePinger{}, handlers.New(handlers.Config{}), Auth{SEP10: fakeAuth{}}),
		http.MethodGet, "/sep24/info", nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var info api.Sep24Info
	decode(t, rec, &info)
	if usdc, ok := info.Deposit["USDC"]; !ok || !usdc.Enabled || usdc.MinAmount == nil || usdc.MaxAmount == nil {
		t.Errorf("deposit.USDC = %+v, want enabled with limits", info.Deposit["USDC"])
	}
	if info.Withdraw == nil || len(info.Withdraw) != 0 {
		t.Errorf("withdraw = %v, want empty object", info.Withdraw)
	}
}

func TestSEP24Deposit(t *testing.T) {
	e := newSEP24Env(t)
	subject := keypair.MustRandom().Address()

	resp := e.deposit(t, subject, map[string]any{"asset_code": "USDC", "amount": 25.5, "lang": "es"})

	if resp.Type != api.InteractiveCustomerInfoNeeded {
		t.Errorf("type = %q", resp.Type)
	}
	u, err := url.Parse(resp.Url)
	if err != nil || !strings.HasPrefix(resp.Url, testWebBaseURL+"/widget/"+resp.Id+"?") {
		t.Fatalf("url = %q, want %s/widget/<id>?...", resp.Url, testWebBaseURL)
	}
	if q := u.Query(); q.Get("amount") != "25.5" || q.Get("lang") != "es" {
		t.Errorf("url query = %v, want amount and lang prefilled", q)
	}
	id, err := e.store.ConsumeInteractiveToken(t.Context(), u.Query().Get("token"))
	if err != nil || id.String() != resp.Id {
		t.Errorf("token in url resolves to %v, %v; want %s", id, err, resp.Id)
	}

	status, tx := e.transaction(t, subject, resp.Id)
	if status != http.StatusOK {
		t.Fatalf("GET /sep24/transaction status = %d", status)
	}
	if tx.Status != "incomplete" || tx.Kind != "deposit" || tx.To == nil || *tx.To != subject {
		t.Errorf("transaction = %+v, want incomplete deposit to %s", tx, subject)
	}
	if tx.StartedAt.Location() != time.UTC {
		t.Errorf("started_at = %s, want UTC", tx.StartedAt)
	}
	if tx.AmountOutAsset == nil || *tx.AmountOutAsset != "stellar:USDC:"+e.issuer {
		t.Errorf("amount_out_asset = %v", tx.AmountOutAsset)
	}
}

func TestSEP24DepositContentTypes(t *testing.T) {
	e := newSEP24Env(t)
	subject := keypair.MustRandom().Address()

	form := url.Values{"asset_code": {"USDC"}, "amount": {"10"}}.Encode()
	rec := e.do(t, http.MethodPost, "/sep24/transactions/deposit/interactive", subject,
		"application/x-www-form-urlencoded", []byte(form))
	if rec.Code != http.StatusOK {
		t.Errorf("form status = %d, body = %s", rec.Code, rec.Body)
	}

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	_ = w.WriteField("asset_code", "USDC")
	_ = w.WriteField("memo", "order-42")
	_ = w.Close()
	rec = e.do(t, http.MethodPost, "/sep24/transactions/deposit/interactive", subject,
		w.FormDataContentType(), buf.Bytes())
	if rec.Code != http.StatusOK {
		t.Fatalf("multipart status = %d, body = %s", rec.Code, rec.Body)
	}
	var resp api.Sep24InteractiveResponse
	decode(t, rec, &resp)
	if _, tx := e.transaction(t, subject, resp.Id); tx.DepositMemo == nil || *tx.DepositMemo != "order-42" {
		t.Errorf("deposit_memo = %v, want order-42 (text)", tx.DepositMemo)
	}
}

func TestSEP24DepositUsesSubjectMemo(t *testing.T) {
	e := newSEP24Env(t)
	subject := keypair.MustRandom().Address() + ":17509749319012223907"

	resp := e.deposit(t, subject, map[string]any{"asset_code": "USDC"})

	_, tx := e.transaction(t, subject, resp.Id)
	if tx.DepositMemo == nil || *tx.DepositMemo != "17509749319012223907" || *tx.DepositMemoType != "id" {
		t.Errorf("deposit memo = %v (%v), want the SEP-10 memo as an id memo", tx.DepositMemo, tx.DepositMemoType)
	}
	if !strings.HasPrefix(subject, *tx.To) {
		t.Errorf("to = %s, want the subject's account", *tx.To)
	}
}

func TestSEP24DepositBadRequests(t *testing.T) {
	e := newSEP24Env(t)
	subject := keypair.MustRandom().Address()
	tests := map[string]map[string]any{
		"unsupported asset":  {"asset_code": "EURC"},
		"wrong issuer":       {"asset_code": "USDC", "asset_issuer": keypair.MustRandom().Address()},
		"invalid account":    {"asset_code": "USDC", "account": "GBAD"},
		"id memo not number": {"asset_code": "USDC", "memo": "abc", "memo_type": "id"},
		"text memo too long": {"asset_code": "USDC", "memo": strings.Repeat("a", 29)},
		"hash memo invalid":  {"asset_code": "USDC", "memo": "aGVsbG8=", "memo_type": "hash"},
		"too many decimals":  {"asset_code": "USDC", "amount": "1.12345678"},
		"amount too small":   {"asset_code": "USDC", "amount": 0.5},
		"amount too large":   {"asset_code": "USDC", "amount": 10000.01},
	}
	for name, body := range tests {
		t.Run(name, func(t *testing.T) {
			b, _ := json.Marshal(body)
			rec := e.do(t, http.MethodPost, "/sep24/transactions/deposit/interactive", subject, "application/json", b)
			if rec.Code != http.StatusBadRequest {
				t.Errorf("status = %d, body = %s; want 400", rec.Code, rec.Body)
			}
		})
	}
}

func TestSEP24TransactionNotFound(t *testing.T) {
	e := newSEP24Env(t)
	owner, other := keypair.MustRandom().Address(), keypair.MustRandom().Address()
	resp := e.deposit(t, owner, map[string]any{"asset_code": "USDC"})

	for name, id := range map[string]string{"other account": resp.Id, "unknown": "00000000-0000-0000-0000-000000000000", "malformed": "nope"} {
		t.Run(name, func(t *testing.T) {
			if status, _ := e.transaction(t, other, id); status != http.StatusNotFound {
				t.Errorf("status = %d, want 404", status)
			}
		})
	}

	rec := e.do(t, http.MethodGet, "/sep24/transaction", owner, "", nil)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("without id status = %d, want 400", rec.Code)
	}
}

func TestSEP24Transactions(t *testing.T) {
	e := newSEP24Env(t)
	subject := keypair.MustRandom().Address()
	first := e.deposit(t, subject, map[string]any{"asset_code": "USDC"})
	second := e.deposit(t, subject, map[string]any{"asset_code": "USDC"})
	e.deposit(t, keypair.MustRandom().Address(), map[string]any{"asset_code": "USDC"})

	list := func(query string) []api.Sep24Transaction {
		t.Helper()
		rec := e.do(t, http.MethodGet, "/sep24/transactions?asset_code=USDC"+query, subject, "", nil)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, body = %s", rec.Code, rec.Body)
		}
		var resp api.Sep24TransactionsResponse
		decode(t, rec, &resp)
		return resp.Transactions
	}

	if got := list(""); len(got) != 2 || got[0].Id != second.Id || got[1].Id != first.Id {
		t.Errorf("list = %d transactions, want the subject's 2, newest first", len(got))
	}
	if got := list("&limit=1"); len(got) != 1 {
		t.Errorf("limit=1 returned %d", len(got))
	}
	if got := list("&paging_id=" + second.Id); len(got) != 1 || got[0].Id != first.Id {
		t.Errorf("paging_id returned %d, want only the older one", len(got))
	}
	if rec := e.do(t, http.MethodGet, "/sep24/transactions?asset_code=USDC&limit=0", subject, "", nil); rec.Code != http.StatusBadRequest {
		t.Errorf("limit=0 status = %d, want 400", rec.Code)
	}
}
