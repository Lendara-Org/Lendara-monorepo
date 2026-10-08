package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"
)

const healthTimeout = 2 * time.Second

func health(logger *slog.Logger, db Pinger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), healthTimeout)
		defer cancel()

		if err := db.Ping(ctx); err != nil {
			logger.ErrorContext(ctx, "health check failed", slog.Any("error", err))
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "unavailable"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}
