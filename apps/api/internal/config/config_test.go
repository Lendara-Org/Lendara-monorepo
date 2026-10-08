package config

import (
	"log/slog"
	"strings"
	"testing"
)

func env(vars map[string]string) func(string) string {
	return func(key string) string { return vars[key] }
}

func TestLoad(t *testing.T) {
	cfg, err := Load(env(map[string]string{
		"PORT":         "9000",
		"DATABASE_URL": "postgres://localhost/lendara",
		"LOG_LEVEL":    "debug",
	}))
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	want := Config{Port: "9000", DatabaseURL: "postgres://localhost/lendara", LogLevel: slog.LevelDebug}
	if cfg != want {
		t.Errorf("Load() = %+v, want %+v", cfg, want)
	}
}

func TestLoadDefaults(t *testing.T) {
	cfg, err := Load(env(map[string]string{"DATABASE_URL": "postgres://localhost/lendara"}))
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.Port != "8080" {
		t.Errorf("Port = %q, want %q", cfg.Port, "8080")
	}
	if cfg.LogLevel != slog.LevelInfo {
		t.Errorf("LogLevel = %v, want %v", cfg.LogLevel, slog.LevelInfo)
	}
}

func TestLoadReportsAllErrors(t *testing.T) {
	_, err := Load(env(map[string]string{"LOG_LEVEL": "loud"}))
	if err == nil {
		t.Fatal("Load() error = nil, want error")
	}
	for _, want := range []string{"DATABASE_URL", "LOG_LEVEL"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("error %q does not mention %s", err, want)
		}
	}
}
