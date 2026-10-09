// Package handlers implements the API defined in openapi.yaml.
package handlers

import (
	"errors"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/sep10"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/transaction"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/widgetauth"
)

// ErrNotImplemented is returned by endpoints that are not built yet.
var ErrNotImplemented = errors.New("not implemented")

// Handlers implements api.StrictServerInterface.
type Handlers struct {
	stellarTOML  string
	sep10        *sep10.Service
	transactions *transaction.Store
	widget       *widgetauth.Issuer
	webBaseURL   string
	issuer       string
}

var _ api.StrictServerInterface = (*Handlers)(nil)

// Config holds the dependencies of the handlers.
type Config struct {
	// StellarTOML is the pre-rendered SEP-1 file.
	StellarTOML  []byte
	SEP10        *sep10.Service
	Transactions *transaction.Store
	Widget       *widgetauth.Issuer
	// WebBaseURL hosts the interactive widget (/widget/<id>).
	WebBaseURL string
	// Issuer is the public key of the USDC test asset issuer.
	Issuer string
}

// New returns the API handlers.
func New(cfg Config) *Handlers {
	return &Handlers{
		stellarTOML:  string(cfg.StellarTOML),
		sep10:        cfg.SEP10,
		transactions: cfg.Transactions,
		widget:       cfg.Widget,
		webBaseURL:   cfg.WebBaseURL,
		issuer:       cfg.Issuer,
	}
}
