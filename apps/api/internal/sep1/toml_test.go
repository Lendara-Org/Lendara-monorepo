package sep1

import (
	"strings"
	"testing"

	"github.com/BurntSushi/toml"
	"github.com/stellar/go-stellar-sdk/keypair"
	"github.com/stellar/go-stellar-sdk/network"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/config"
)

func testConfig(t *testing.T) config.Config {
	t.Helper()
	kp := func() *keypair.Full {
		k, err := keypair.Random()
		if err != nil {
			t.Fatalf("keypair: %v", err)
		}
		return k
	}
	return config.Config{
		APIBaseURL: "https://api.lendara.test",
		WebBaseURL: "https://lendara.test",
		Stellar: config.Stellar{
			IssuerPublic: kp().Address(),
			Distribution: kp(),
			Signing:      kp(),
		},
	}
}

func TestEncodeRoundTrip(t *testing.T) {
	cfg := testConfig(t)
	out, err := New(cfg).Encode()
	if err != nil {
		t.Fatalf("Encode() error = %v", err)
	}

	var got File
	if _, err := toml.Decode(string(out), &got); err != nil {
		t.Fatalf("output is not valid TOML: %v\n%s", err, out)
	}

	checks := map[string][2]string{
		"NETWORK_PASSPHRASE":      {got.NetworkPassphrase, network.TestNetworkPassphrase},
		"SIGNING_KEY":             {got.SigningKey, cfg.Stellar.Signing.Address()},
		"WEB_AUTH_ENDPOINT":       {got.WebAuthEndpoint, "https://api.lendara.test/auth"},
		"TRANSFER_SERVER_SEP0024": {got.TransferServerSEP0024, "https://api.lendara.test/sep24"},
		"ORG_URL":                 {got.Documentation.OrgURL, "https://lendara.test"},
	}
	for field, c := range checks {
		if c[0] != c[1] {
			t.Errorf("%s = %q, want %q", field, c[0], c[1])
		}
	}
	if len(got.Currencies) != 1 || got.Currencies[0].Issuer != cfg.Stellar.IssuerPublic || got.Currencies[0].Status != "test" {
		t.Errorf("CURRENCIES = %+v, want one test USDC from the issuer", got.Currencies)
	}
}

func TestNoSecretsInOutput(t *testing.T) {
	cfg := testConfig(t)
	out, err := New(cfg).Encode()
	if err != nil {
		t.Fatalf("Encode() error = %v", err)
	}
	for _, seed := range []string{cfg.Stellar.Signing.Seed(), cfg.Stellar.Distribution.Seed()} {
		if strings.Contains(string(out), seed) {
			t.Fatal("stellar.toml contains a secret seed")
		}
	}
}
