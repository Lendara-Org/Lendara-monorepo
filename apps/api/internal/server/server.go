// Package server wires the HTTP routes and middleware of the API.
package server

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/handlers"
)

// Pinger reports whether a dependency (the database) is reachable.
type Pinger interface {
	Ping(ctx context.Context) error
}

// New returns the root HTTP handler of the API.
func New(logger *slog.Logger, db Pinger, h api.StrictServerInterface) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", health(logger, db))

	strict := api.NewStrictHandlerWithOptions(h, nil, api.StrictHTTPServerOptions{
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
		if errors.Is(err, handlers.ErrNotImplemented) {
			writeError(w, http.StatusNotImplemented, "not implemented")
			return
		}
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
