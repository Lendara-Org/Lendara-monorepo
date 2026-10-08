// Package sep1 builds the stellar.toml file (SEP-1 v2.7.0).
package sep1

import (
	"bytes"
	"fmt"

	"github.com/BurntSushi/toml"
	"github.com/stellar/go-stellar-sdk/network"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/config"
)

const sepVersion = "2.7.0"

// File is the subset of SEP-1 fields Lendara publishes.
type File struct {
	Version               string        `toml:"VERSION"`
	NetworkPassphrase     string        `toml:"NETWORK_PASSPHRASE"`
	SigningKey            string        `toml:"SIGNING_KEY"`
	WebAuthEndpoint       string        `toml:"WEB_AUTH_ENDPOINT"`
	TransferServerSEP0024 string        `toml:"TRANSFER_SERVER_SEP0024"`
	Accounts              []string      `toml:"ACCOUNTS"`
	Documentation         Documentation `toml:"DOCUMENTATION"`
	Currencies            []Currency    `toml:"CURRENCIES"`
}

// Documentation is the [DOCUMENTATION] table.
type Documentation struct {
	OrgName        string `toml:"ORG_NAME"`
	OrgURL         string `toml:"ORG_URL"`
	OrgDescription string `toml:"ORG_DESCRIPTION"`
}

// Currency is one [[CURRENCIES]] entry.
type Currency struct {
	Code            string `toml:"code"`
	Issuer          string `toml:"issuer"`
	Status          string `toml:"status"`
	DisplayDecimals int    `toml:"display_decimals"`
	Name            string `toml:"name"`
	Desc            string `toml:"desc"`
	IsUnlimited     bool   `toml:"is_unlimited"`
	IsAssetAnchored bool   `toml:"is_asset_anchored"`
	AnchorAssetType string `toml:"anchor_asset_type"`
	AnchorAsset     string `toml:"anchor_asset"`
}

// New returns the stellar.toml contents for cfg.
func New(cfg config.Config) File {
	return File{
		Version:               sepVersion,
		NetworkPassphrase:     network.TestNetworkPassphrase,
		SigningKey:            cfg.Stellar.Signing.Address(),
		WebAuthEndpoint:       cfg.APIBaseURL + "/auth",
		TransferServerSEP0024: cfg.APIBaseURL + "/sep24",
		Accounts:              []string{cfg.Stellar.Distribution.Address(), cfg.Stellar.IssuerPublic},
		Documentation: Documentation{
			OrgName:        "Lendara (Sandbox)",
			OrgURL:         cfg.WebBaseURL,
			OrgDescription: "Testnet sandbox of an embeddable fiat to USDC on-ramp. Fiat rails are simulated; no real money moves.",
		},
		Currencies: []Currency{{
			Code:            "USDC",
			Issuer:          cfg.Stellar.IssuerPublic,
			Status:          "test",
			DisplayDecimals: 2,
			Name:            "Lendara test USDC",
			Desc:            "Lendara sandbox test asset. No real value.",
			IsUnlimited:     true,
			IsAssetAnchored: true,
			AnchorAssetType: "fiat",
			AnchorAsset:     "USD",
		}},
	}
}

// Encode renders f as TOML.
func (f File) Encode() ([]byte, error) {
	var buf bytes.Buffer
	if err := toml.NewEncoder(&buf).Encode(f); err != nil {
		return nil, fmt.Errorf("encode stellar.toml: %w", err)
	}
	return buf.Bytes(), nil
}
