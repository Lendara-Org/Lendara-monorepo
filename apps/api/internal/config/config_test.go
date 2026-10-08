package config

import (
	"log/slog"
	"strings"
	"testing"

	"github.com/stellar/go-stellar-sdk/keypair"
)

func env(vars map[string]string) func(string) string {
	return func(key string) string { return vars[key] }
}

func validEnv(t *testing.T) map[string]string {
	t.Helper()
	random := func() *keypair.Full {
		kp, err := keypair.Random()
		if err != nil {
			t.Fatalf("keypair: %v", err)
		}
		return kp
	}
	return map[string]string{
		"DATABASE_URL":                "postgres://localhost/lendara",
		"STELLAR_ISSUER_PUBLIC_KEY":   random().Address(),
		"STELLAR_DISTRIBUTION_SECRET": random().Seed(),
		"STELLAR_SIGNING_SECRET":      random().Seed(),
	}
}

func TestLoad(t *testing.T) {
	vars := validEnv(t)
	vars["PORT"] = "9000"
	vars["LOG_LEVEL"] = "debug"
	vars["API_BASE_URL"] = "https://api.example.com/"

	cfg, err := Load(env(vars))
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.Port != "9000" || cfg.LogLevel != slog.LevelDebug {
		t.Errorf("Port, LogLevel = %q, %v; want 9000, debug", cfg.Port, cfg.LogLevel)
	}
	if cfg.APIBaseURL != "https://api.example.com" {
		t.Errorf("APIBaseURL = %q, want trailing slash trimmed", cfg.APIBaseURL)
	}
	if cfg.Stellar.Signing.Seed() != vars["STELLAR_SIGNING_SECRET"] {
		t.Error("signing keypair not parsed from STELLAR_SIGNING_SECRET")
	}
}

func TestLoadDefaults(t *testing.T) {
	cfg, err := Load(env(validEnv(t)))
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.Port != "8080" {
		t.Errorf("Port = %q, want %q", cfg.Port, "8080")
	}
	if cfg.LogLevel != slog.LevelInfo {
		t.Errorf("LogLevel = %v, want %v", cfg.LogLevel, slog.LevelInfo)
	}
	if cfg.Stellar.HorizonURL != "https://horizon-testnet.stellar.org" {
		t.Errorf("HorizonURL = %q, want testnet", cfg.Stellar.HorizonURL)
	}
}

func TestLoadReportsAllErrors(t *testing.T) {
	_, err := Load(env(map[string]string{"LOG_LEVEL": "loud", "API_BASE_URL": "not-a-url"}))
	if err == nil {
		t.Fatal("Load() error = nil, want error")
	}
	for _, want := range []string{
		"DATABASE_URL", "LOG_LEVEL", "API_BASE_URL",
		"STELLAR_ISSUER_PUBLIC_KEY", "STELLAR_DISTRIBUTION_SECRET", "STELLAR_SIGNING_SECRET",
	} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("error %q does not mention %s", err, want)
		}
	}
}

func TestLoadDoesNotLeakSecrets(t *testing.T) {
	vars := validEnv(t)
	vars["STELLAR_SIGNING_SECRET"] = "SNOTAVALIDSEEDBUTSECRETLOOKING"
	vars["STELLAR_ISSUER_PUBLIC_KEY"] = "GBAD"

	_, err := Load(env(vars))
	if err == nil {
		t.Fatal("Load() error = nil, want error")
	}
	if strings.Contains(err.Error(), vars["STELLAR_SIGNING_SECRET"]) {
		t.Errorf("error leaks the secret value: %q", err)
	}
}
