// Package server wires the HTTP routes and middleware of the API.
package server

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
)

// Pinger reports whether a dependency (the database) is reachable.
type Pinger interface {
	Ping(ctx context.Context) error
}

// New returns the root HTTP handler of the API.
func New(logger *slog.Logger, db Pinger, h api.StrictServerInterface, auth Auth) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", health(logger, db))

	strict := api.NewStrictHandlerWithOptions(h, []api.StrictMiddlewareFunc{rateLimit(rateRules, time.Now), requireAuth(auth)}, api.StrictHTTPServerOptions{
		RequestErrorHandlerFunc:  badRequest,
		ResponseErrorHandlerFunc: responseError(logger),
	})
	api.HandlerWithOptions(strict, api.StdHTTPServerOptions{
		BaseRouter:       mux,
		ErrorHandlerFunc: badRequest,
	})

	return recoverPanics(logger, logRequests(logger, cors(mux)))
}

func badRequest(w http.ResponseWriter, _ *http.Request, err error) {
	writeError(w, http.StatusBadRequest, err.Error())
}

func responseError(logger *slog.Logger) func(http.ResponseWriter, *http.Request, error) {
	return func(w http.ResponseWriter, r *http.Request, err error) {
		logger.ErrorContext(r.Context(), "handler failed", slog.Any("error", err))
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
