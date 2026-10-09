// Package handlers implements the API defined in openapi.yaml.
package handlers

import (
	"errors"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/sep10"
)

// ErrNotImplemented is returned by endpoints that are not built yet.
var ErrNotImplemented = errors.New("not implemented")

// Handlers implements api.StrictServerInterface.
type Handlers struct {
	stellarTOML string
	sep10       *sep10.Service
}

var _ api.StrictServerInterface = (*Handlers)(nil)

// New returns the API handlers. stellarTOML is the pre-rendered SEP-1 file.
func New(stellarTOML []byte, auth *sep10.Service) *Handlers {
	return &Handlers{stellarTOML: string(stellarTOML), sep10: auth}
}
