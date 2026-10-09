package handlers

import (
	"context"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
)

// Endpoints below are defined in openapi.yaml but not implemented yet.
// Each one moves to its own file when its PR lands.

// GetProject is not implemented yet.
func (*Handlers) GetProject(_ context.Context, _ api.GetProjectRequestObject) (api.GetProjectResponseObject, error) {
	return nil, ErrNotImplemented
}

// CreateProject is not implemented yet.
func (*Handlers) CreateProject(_ context.Context, _ api.CreateProjectRequestObject) (api.CreateProjectResponseObject, error) {
	return nil, ErrNotImplemented
}

// CreateSession is not implemented yet.
func (*Handlers) CreateSession(_ context.Context, _ api.CreateSessionRequestObject) (api.CreateSessionResponseObject, error) {
	return nil, ErrNotImplemented
}

// ListTransactions is not implemented yet.
func (*Handlers) ListTransactions(_ context.Context, _ api.ListTransactionsRequestObject) (api.ListTransactionsResponseObject, error) {
	return nil, ErrNotImplemented
}

// GetTransaction is not implemented yet.
func (*Handlers) GetTransaction(_ context.Context, _ api.GetTransactionRequestObject) (api.GetTransactionResponseObject, error) {
	return nil, ErrNotImplemented
}
