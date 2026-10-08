package handlers

import (
	"context"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
)

// Endpoints below are defined in openapi.yaml but not implemented yet.
// Each one moves to its own file when its PR lands.

// GetSep10Challenge is not implemented yet.
func (*Handlers) GetSep10Challenge(_ context.Context, _ api.GetSep10ChallengeRequestObject) (api.GetSep10ChallengeResponseObject, error) {
	return nil, ErrNotImplemented
}

// PostSep10Token is not implemented yet.
func (*Handlers) PostSep10Token(_ context.Context, _ api.PostSep10TokenRequestObject) (api.PostSep10TokenResponseObject, error) {
	return nil, ErrNotImplemented
}

// GetSep24Info is not implemented yet.
func (*Handlers) GetSep24Info(_ context.Context, _ api.GetSep24InfoRequestObject) (api.GetSep24InfoResponseObject, error) {
	return nil, ErrNotImplemented
}

// GetSep24Transaction is not implemented yet.
func (*Handlers) GetSep24Transaction(_ context.Context, _ api.GetSep24TransactionRequestObject) (api.GetSep24TransactionResponseObject, error) {
	return nil, ErrNotImplemented
}

// GetSep24Transactions is not implemented yet.
func (*Handlers) GetSep24Transactions(_ context.Context, _ api.GetSep24TransactionsRequestObject) (api.GetSep24TransactionsResponseObject, error) {
	return nil, ErrNotImplemented
}

// PostSep24DepositInteractive is not implemented yet.
func (*Handlers) PostSep24DepositInteractive(_ context.Context, _ api.PostSep24DepositInteractiveRequestObject) (api.PostSep24DepositInteractiveResponseObject, error) {
	return nil, ErrNotImplemented
}

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

// GetWidgetQuote is not implemented yet.
func (*Handlers) GetWidgetQuote(_ context.Context, _ api.GetWidgetQuoteRequestObject) (api.GetWidgetQuoteResponseObject, error) {
	return nil, ErrNotImplemented
}

// CreateWidgetSession is not implemented yet.
func (*Handlers) CreateWidgetSession(_ context.Context, _ api.CreateWidgetSessionRequestObject) (api.CreateWidgetSessionResponseObject, error) {
	return nil, ErrNotImplemented
}

// GetWidgetTransaction is not implemented yet.
func (*Handlers) GetWidgetTransaction(_ context.Context, _ api.GetWidgetTransactionRequestObject) (api.GetWidgetTransactionResponseObject, error) {
	return nil, ErrNotImplemented
}

// ConfirmWidgetTransaction is not implemented yet.
func (*Handlers) ConfirmWidgetTransaction(_ context.Context, _ api.ConfirmWidgetTransactionRequestObject) (api.ConfirmWidgetTransactionResponseObject, error) {
	return nil, ErrNotImplemented
}

// SimulateWidgetPayment is not implemented yet.
func (*Handlers) SimulateWidgetPayment(_ context.Context, _ api.SimulateWidgetPaymentRequestObject) (api.SimulateWidgetPaymentResponseObject, error) {
	return nil, ErrNotImplemented
}
