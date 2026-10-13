package server

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestLimiter(t *testing.T) {
	now := time.Unix(0, 0)
	l := newLimiter(2, time.Minute, func() time.Time { return now })

	for i := range 2 {
		if ok, _ := l.allow("a"); !ok {
			t.Fatalf("request %d rejected, want allowed", i+1)
		}
	}
	now = now.Add(20 * time.Second)
	if ok, retry := l.allow("a"); ok || retry != 40*time.Second {
		t.Errorf("third request: allowed = %v, retry = %v; want rejected, retry 40s", ok, retry)
	}
	if ok, _ := l.allow("b"); !ok {
		t.Error("another key rejected, want its own count")
	}

	now = now.Add(40 * time.Second)
	if ok, _ := l.allow("a"); !ok {
		t.Error("request after the window rejected, want allowed")
	}

	now = now.Add(2 * time.Minute)
	l.allow("c")
	if len(l.windows) != 1 {
		t.Errorf("windows = %d, want only c (expired ones swept)", len(l.windows))
	}
}

func TestClientIP(t *testing.T) {
	for _, tc := range []struct{ xff, want string }{
		{"", "192.0.2.1"},
		{"203.0.113.7", "203.0.113.7"},
		{"6.6.6.6, 203.0.113.7", "203.0.113.7"}, // the first entry is forged by the client
	} {
		r := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/", nil)
		if tc.xff != "" {
			r.Header.Set("X-Forwarded-For", tc.xff)
		}
		if got := clientIP(r); got != tc.want {
			t.Errorf("X-Forwarded-For %q: clientIP = %q, want %q", tc.xff, got, tc.want)
		}
	}
}
