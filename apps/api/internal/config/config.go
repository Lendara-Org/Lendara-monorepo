// Package config loads the API configuration from environment variables.
package config

import (
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"strings"

	"github.com/stellar/go-stellar-sdk/keypair"
	"github.com/stellar/go-stellar-sdk/strkey"
)

// minJWTSecretLen is 32 bytes, the HS256 key size recommended by RFC 7518.
const minJWTSecretLen = 32

// Config holds the runtime configuration of the API.
type Config struct {
	Port        string
	DatabaseURL string
	LogLevel    slog.Level

	// APIBaseURL is the public URL of this API, used in stellar.toml.
	APIBaseURL string
	// WebBaseURL is the public URL of the web app (landing, docs, widget).
	WebBaseURL string

	// JWTSecret signs the SEP-10 session tokens (HS256).
	JWTSecret []byte

	Stellar Stellar
}

// Stellar holds the testnet accounts created by `make setup-testnet`.
type Stellar struct {
	HorizonURL string
	// HomeDomains are the domains whose stellar.toml points to this API
	// (STELLAR_HOME_DOMAIN, comma-separated). The first is the default
	// SEP-10 home_domain and the one setup-testnet sets on the issuer.
	HomeDomains  []string
	IssuerPublic string
	Distribution *keypair.Full
	Signing      *keypair.Full
}

// Load reads the configuration using getenv (usually os.Getenv).
// It reports every missing or invalid variable at once.
func Load(getenv func(string) string) (Config, error) {
	var errs []error
	required := func(key string) string {
		v := getenv(key)
		if v == "" {
			errs = append(errs, fmt.Errorf("%s is required", key))
		}
		return v
	}
	optional := func(key, fallback string) string {
		if v := getenv(key); v != "" {
			return v
		}
		return fallback
	}

	cfg := Config{
		Port:        optional("PORT", "8080"),
		DatabaseURL: required("DATABASE_URL"),
		APIBaseURL:  strings.TrimSuffix(optional("API_BASE_URL", "http://localhost:8080"), "/"),
		WebBaseURL:  strings.TrimSuffix(optional("WEB_BASE_URL", "http://localhost:3000"), "/"),
		Stellar: Stellar{
			HorizonURL:   optional("STELLAR_HORIZON_URL", "https://horizon-testnet.stellar.org"),
			HomeDomains:  ParseHomeDomains(optional("STELLAR_HOME_DOMAIN", "localhost:8080")),
			IssuerPublic: required("STELLAR_ISSUER_PUBLIC_KEY"),
		},
	}

	if level := getenv("LOG_LEVEL"); level != "" {
		if err := cfg.LogLevel.UnmarshalText([]byte(level)); err != nil {
			errs = append(errs, fmt.Errorf("LOG_LEVEL: %w", err))
		}
	}
	for key, u := range map[string]string{"API_BASE_URL": cfg.APIBaseURL, "WEB_BASE_URL": cfg.WebBaseURL} {
		if parsed, err := url.Parse(u); err != nil || parsed.Scheme == "" || parsed.Host == "" {
			errs = append(errs, fmt.Errorf("%s must be an absolute URL", key))
		}
	}
	if len(cfg.Stellar.HomeDomains) == 0 {
		errs = append(errs, errors.New("STELLAR_HOME_DOMAIN must list at least one domain"))
	}
	if cfg.Stellar.IssuerPublic != "" && !strkey.IsValidEd25519PublicKey(cfg.Stellar.IssuerPublic) {
		errs = append(errs, errors.New("STELLAR_ISSUER_PUBLIC_KEY is not a valid public key"))
	}

	parseSeed := func(key string) *keypair.Full {
		seed := required(key)
		if seed == "" {
			return nil
		}
		kp, err := keypair.ParseFull(seed)
		if err != nil {
			// Never include the value: it is a secret.
			errs = append(errs, fmt.Errorf("%s is not a valid secret seed", key))
			return nil
		}
		return kp
	}
	if secret := required("SEP10_JWT_SECRET"); secret != "" {
		if len(secret) < minJWTSecretLen {
			errs = append(errs, fmt.Errorf("SEP10_JWT_SECRET must be at least %d characters", minJWTSecretLen))
		}
		cfg.JWTSecret = []byte(secret)
	}

	cfg.Stellar.Distribution = parseSeed("STELLAR_DISTRIBUTION_SECRET")
	cfg.Stellar.Signing = parseSeed("STELLAR_SIGNING_SECRET")

	if err := errors.Join(errs...); err != nil {
		return Config{}, fmt.Errorf("invalid config: %w", err)
	}
	return cfg, nil
}

// ParseHomeDomains splits a comma-separated STELLAR_HOME_DOMAIN value.
func ParseHomeDomains(v string) []string {
	var domains []string
	for d := range strings.SplitSeq(v, ",") {
		if d = strings.TrimSpace(d); d != "" {
			domains = append(domains, d)
		}
	}
	return domains
}
