// Command setup-testnet creates and funds the Lendara sandbox accounts on the
// Stellar testnet and issues the test USDC asset. It is idempotent: keys
// already present in the environment are reused and finished steps are skipped.
package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/stellar/go-stellar-sdk/clients/horizonclient"
	"github.com/stellar/go-stellar-sdk/keypair"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/config"
)

const (
	defaultHorizonURL = "https://horizon-testnet.stellar.org"
	maxHomeDomain     = 32 // characters, in the SetOptions operation
)

func main() {
	if err := run(); err != nil {
		slog.Error("setup failed", slog.Any("error", err))
		os.Exit(1)
	}
}

func run() error {
	horizonURL := envOr("STELLAR_HORIZON_URL", defaultHorizonURL)
	homeDomains := envOr("STELLAR_HOME_DOMAIN", "localhost:8080")
	// The issuer's home_domain is the first domain: the one wallets use to
	// find stellar.toml from the asset. Stellar caps it at 32 characters.
	domains := config.ParseHomeDomains(homeDomains)
	if len(domains) == 0 || len(domains[0]) > maxHomeDomain {
		return fmt.Errorf("STELLAR_HOME_DOMAIN: the first domain must have 1 to %d characters, the maximum for an account's home_domain", maxHomeDomain)
	}
	homeDomain := domains[0]

	issuer, err := loadOrGenerate("STELLAR_ISSUER_SECRET")
	if err != nil {
		return err
	}
	distribution, err := loadOrGenerate("STELLAR_DISTRIBUTION_SECRET")
	if err != nil {
		return err
	}
	signing, err := loadOrGenerate("STELLAR_SIGNING_SECRET")
	if err != nil {
		return err
	}

	client := &horizonclient.Client{
		HorizonURL: horizonURL,
		HTTP:       &http.Client{Timeout: 30 * time.Second},
	}
	s := setup{client: client, log: slog.Default()}
	if err := s.run(issuer, distribution, homeDomain); err != nil {
		return err
	}

	fmt.Printf(`
# Lendara testnet accounts. Add these to your .env (never commit them).
STELLAR_HORIZON_URL=%s
STELLAR_HOME_DOMAIN=%s
STELLAR_ISSUER_PUBLIC_KEY=%s
STELLAR_ISSUER_SECRET=%s
STELLAR_DISTRIBUTION_SECRET=%s
STELLAR_SIGNING_SECRET=%s
`, horizonURL, homeDomains, issuer.Address(), issuer.Seed(), distribution.Seed(), signing.Seed())
	return nil
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func loadOrGenerate(key string) (*keypair.Full, error) {
	if seed := os.Getenv(key); seed != "" {
		kp, err := keypair.ParseFull(seed)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", key, err)
		}
		return kp, nil
	}
	kp, err := keypair.Random()
	if err != nil {
		return nil, fmt.Errorf("generate %s: %w", key, err)
	}
	return kp, nil
}
