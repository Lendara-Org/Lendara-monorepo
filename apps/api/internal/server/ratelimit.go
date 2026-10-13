package server

import (
	"context"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/project"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/sep10"
)

// rateRule limits an operation to limit requests per window for each key.
type rateRule struct {
	limit  int
	window time.Duration
	// key identifies who is limited; it runs after requireAuth, so it can
	// read the authenticated identity from the context.
	key func(ctx context.Context, r *http.Request) string
}

// rateRules cover the operations that create rows without a real cost to
// the caller: projects need no auth at all, and sessions and deposits only
// need a free API key or SEP-10 account.
var rateRules = map[string]rateRule{
	"CreateProject": {limit: 10, window: time.Hour, key: func(_ context.Context, r *http.Request) string {
		return clientIP(r)
	}},
	"CreateSession": {limit: 60, window: time.Minute, key: func(ctx context.Context, _ *http.Request) string {
		id, _ := project.IDFrom(ctx)
		return id.String()
	}},
	"PostSep24DepositInteractive": {limit: 30, window: time.Minute, key: func(ctx context.Context, _ *http.Request) string {
		subject, _ := sep10.SubjectFrom(ctx)
		return subject
	}},
}

// rateLimit answers 429 with Retry-After once a caller exceeds the rule of
// the operation. It must run after requireAuth (earlier in the strict
// middleware list, which wraps from first to last).
func rateLimit(rules map[string]rateRule, now func() time.Time) api.StrictMiddlewareFunc {
	// The strict handler applies middleware on every request, so the
	// limiters are created here, once.
	limiters := make(map[string]*limiter, len(rules))
	for op, rule := range rules {
		limiters[op] = newLimiter(rule.limit, rule.window, now)
	}
	return func(next api.StrictHandlerFunc, operationID string) api.StrictHandlerFunc {
		rule, l := rules[operationID], limiters[operationID]
		if l == nil {
			return next
		}
		return func(ctx context.Context, w http.ResponseWriter, r *http.Request, req any) (any, error) {
			if allowed, retry := l.allow(rule.key(ctx, r)); !allowed {
				w.Header().Set("Retry-After", strconv.Itoa(int(retry.Round(time.Second).Seconds())))
				writeError(w, http.StatusTooManyRequests, "too many requests, try again later")
				return nil, nil
			}
			return next(ctx, w, r, req)
		}
	}
}

// limiter counts requests per key in fixed windows, in memory. That is enough
// for the sandbox's single API instance; several instances would each keep
// their own count.
type limiter struct {
	mu        sync.Mutex
	limit     int
	window    time.Duration
	now       func() time.Time
	windows   map[string]*window
	lastSweep time.Time
}

type window struct {
	start time.Time
	count int
}

func newLimiter(limit int, d time.Duration, now func() time.Time) *limiter {
	return &limiter{limit: limit, window: d, now: now, windows: map[string]*window{}, lastSweep: now()}
}

// allow records a request for key and reports whether it is within the
// limit; if not, retry is how long until the window resets.
func (l *limiter) allow(key string) (allowed bool, retry time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	if now.Sub(l.lastSweep) > l.window {
		for k, w := range l.windows {
			if now.Sub(w.start) >= l.window {
				delete(l.windows, k)
			}
		}
		l.lastSweep = now
	}

	w, ok := l.windows[key]
	if !ok || now.Sub(w.start) >= l.window {
		w = &window{start: now}
		l.windows[key] = w
	}
	if w.count >= l.limit {
		return false, w.start.Add(l.window).Sub(now)
	}
	w.count++
	return true, 0
}

// clientIP is the address of the caller. Behind Railway's proxy it is the
// last X-Forwarded-For entry, the one the proxy appended: earlier entries
// come from the client and can be forged.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[len(parts)-1])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
