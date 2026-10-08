package handlers

import (
	"context"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
)

// GetStellarToml serves the SEP-1 stellar.toml.
func (h *Handlers) GetStellarToml(context.Context, api.GetStellarTomlRequestObject) (api.GetStellarTomlResponseObject, error) {
	return api.GetStellarToml200TextResponse(h.stellarTOML), nil
}
