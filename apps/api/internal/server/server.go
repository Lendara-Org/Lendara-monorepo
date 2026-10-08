// Package server wires the HTTP routes and middleware of the API.
package server

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
)

// Pinger reports whether a dependency (the database) is reachable.
type Pinger interface {
	Ping(ctx context.Context) error
}

// New returns the root HTTP handler of the API.
func New(logger *slog.Logger, db Pinger) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", health(logger, db))

	return recoverPanics(logger, logRequests(logger, mux))
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
