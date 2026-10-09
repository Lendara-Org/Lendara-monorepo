package server

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/handlers"
)

type fakePinger struct{ err error }

func (f fakePinger) Ping(context.Context) error { return f.err }

func discardLogger() *slog.Logger {
	return slog.New(slog.DiscardHandler)
}

func TestHealth(t *testing.T) {
	tests := []struct {
		name       string
		pingErr    error
		wantStatus int
		wantBody   string
	}{
		{name: "database reachable", wantStatus: http.StatusOK, wantBody: "ok"},
		{name: "database down", pingErr: errors.New("connection refused"), wantStatus: http.StatusServiceUnavailable, wantBody: "unavailable"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := New(discardLogger(), fakePinger{err: tt.pingErr}, handlers.New(handlers.Config{}), fakeAuth{})
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/health", nil))

			if rec.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			var body map[string]string
			if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
				t.Fatalf("decode body: %v", err)
			}
			if body["status"] != tt.wantBody {
				t.Errorf("status field = %q, want %q", body["status"], tt.wantBody)
			}
		})
	}
}

func TestHealthRejectsOtherMethods(t *testing.T) {
	h := New(discardLogger(), fakePinger{}, handlers.New(handlers.Config{}), fakeAuth{})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/health", nil))

	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusMethodNotAllowed)
	}
}

func TestRecoverPanics(t *testing.T) {
	panicking := http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic("boom") })
	h := recoverPanics(discardLogger(), panicking)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/", nil))

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}
}

func serve(t *testing.T, h http.Handler, method, path string, header http.Header) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), method, path, nil)
	for k, v := range header {
		req.Header[k] = v
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestStellarToml(t *testing.T) {
	const toml = "VERSION = \"2.7.0\"\n"
	h := New(discardLogger(), fakePinger{}, handlers.New(handlers.Config{StellarTOML: []byte(toml)}), fakeAuth{})

	rec := serve(t, h, http.MethodGet, "/.well-known/stellar.toml", nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("Content-Type"); got != "text/plain" {
		t.Errorf("Content-Type = %q, want text/plain", got)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("Access-Control-Allow-Origin = %q, want *", got)
	}
	if rec.Body.String() != toml {
		t.Errorf("body = %q, want %q", rec.Body.String(), toml)
	}
}

func TestCORSPreflight(t *testing.T) {
	h := New(discardLogger(), fakePinger{}, handlers.New(handlers.Config{}), fakeAuth{})

	rec := serve(t, h, http.MethodOptions, "/auth", http.Header{
		"Origin":                        {"https://demo-wallet.stellar.org"},
		"Access-Control-Request-Method": {"POST"},
	})

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNoContent)
	}
	for header, want := range map[string]string{
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Headers": "Authorization, Content-Type",
	} {
		if got := rec.Header().Get(header); got != want {
			t.Errorf("%s = %q, want %q", header, got, want)
		}
	}
}

func TestUnimplementedEndpoint(t *testing.T) {
	h := New(discardLogger(), fakePinger{}, handlers.New(handlers.Config{}), fakeAuth{})

	rec := serve(t, h, http.MethodGet, "/v1/project", nil)

	if rec.Code != http.StatusNotImplemented {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusNotImplemented)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("error responses must keep CORS; Access-Control-Allow-Origin = %q", got)
	}
}
