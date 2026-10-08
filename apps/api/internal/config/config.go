// Package config loads the API configuration from environment variables.
package config

import (
	"errors"
	"fmt"
	"log/slog"
)

// Config holds the runtime configuration of the API.
type Config struct {
	Port        string
	DatabaseURL string
	LogLevel    slog.Level
}

// Load reads the configuration using getenv (usually os.Getenv).
// It reports every missing or invalid variable at once.
func Load(getenv func(string) string) (Config, error) {
	cfg := Config{
		Port:        getenv("PORT"),
		DatabaseURL: getenv("DATABASE_URL"),
	}

	var errs []error

	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	if cfg.DatabaseURL == "" {
		errs = append(errs, errors.New("DATABASE_URL is required"))
	}
	if level := getenv("LOG_LEVEL"); level != "" {
		if err := cfg.LogLevel.UnmarshalText([]byte(level)); err != nil {
			errs = append(errs, fmt.Errorf("LOG_LEVEL: %w", err))
		}
	}

	if err := errors.Join(errs...); err != nil {
		return Config{}, fmt.Errorf("invalid config: %w", err)
	}
	return cfg, nil
}
