package handlers

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/db"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/sandbox"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/transaction"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/widgetauth"
)

// CreateWidgetSession exchanges the one-time token of the interactive URL
// for a widget session bound to the transaction.
func (h *Handlers) CreateWidgetSession(ctx context.Context, req api.CreateWidgetSessionRequestObject) (api.CreateWidgetSessionResponseObject, error) {
	if req.Body == nil || req.Body.Token == "" || req.Body.TransactionId == "" {
		return api.CreateWidgetSession400JSONResponse{BadRequestJSONResponse: api.BadRequestJSONResponse{
			Error: "transaction_id and token are required",
		}}, nil
	}
	unauthorized := api.CreateWidgetSession401JSONResponse{UnauthorizedJSONResponse: api.UnauthorizedJSONResponse{
		Error: "the link is invalid, expired or was already used",
	}}

	id, err := h.transactions.ConsumeInteractiveToken(ctx, req.Body.Token)
	if errors.Is(err, transaction.ErrInvalidToken) {
		return unauthorized, nil
	}
	if err != nil {
		return nil, err
	}
	if id.String() != req.Body.TransactionId {
		return unauthorized, nil
	}

	token, expires, err := h.widget.Issue(id)
	if err != nil {
		return nil, err
	}
	return api.CreateWidgetSession201JSONResponse{AccessToken: token, ExpiresAt: expires.UTC()}, nil
}

// GetWidgetTransaction returns the session's transaction, with its quote and
// payment instructions once the amount is confirmed.
func (h *Handlers) GetWidgetTransaction(ctx context.Context, _ api.GetWidgetTransactionRequestObject) (api.GetWidgetTransactionResponseObject, error) {
	t, err := h.widgetTransaction(ctx)
	if err != nil {
		return nil, err
	}
	return api.GetWidgetTransaction200JSONResponse(h.widgetView(t)), nil
}

// GetWidgetQuote previews a deposit with the simulated rates and fee.
func (*Handlers) GetWidgetQuote(_ context.Context, req api.GetWidgetQuoteRequestObject) (api.GetWidgetQuoteResponseObject, error) {
	q, err := sandbox.NewQuote(string(req.Params.FiatCurrency), req.Params.Amount)
	if errors.Is(err, sandbox.ErrInvalidQuote) {
		return api.GetWidgetQuote400JSONResponse{BadRequestJSONResponse: api.BadRequestJSONResponse{Error: quoteError(err)}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.GetWidgetQuote200JSONResponse(apiQuote(q)), nil
}

// ConfirmWidgetTransaction stores the quote the user accepted and moves the
// deposit to pending_user_transfer_start.
func (h *Handlers) ConfirmWidgetTransaction(ctx context.Context, req api.ConfirmWidgetTransactionRequestObject) (api.ConfirmWidgetTransactionResponseObject, error) {
	if req.Body == nil {
		return api.ConfirmWidgetTransaction400JSONResponse{BadRequestJSONResponse: api.BadRequestJSONResponse{Error: "request body is required"}}, nil
	}
	q, err := sandbox.NewQuote(string(req.Body.FiatCurrency), req.Body.Amount)
	if errors.Is(err, sandbox.ErrInvalidQuote) {
		return api.ConfirmWidgetTransaction400JSONResponse{BadRequestJSONResponse: api.BadRequestJSONResponse{Error: quoteError(err)}}, nil
	}
	if err != nil {
		return nil, err
	}

	id, _ := widgetauth.TransactionFrom(ctx)
	t, err := h.transactions.Confirm(ctx, id, transaction.Quote{
		FiatCurrency: q.FiatCurrency,
		AmountIn:     q.AmountIn,
		AmountOut:    q.AmountOut,
		AmountFee:    q.Fee,
	})
	if errors.Is(err, transaction.ErrInvalidTransition) {
		return api.ConfirmWidgetTransaction409JSONResponse{ConflictJSONResponse: api.ConflictJSONResponse{
			Error: "the amount of this transaction was already confirmed",
		}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.ConfirmWidgetTransaction200JSONResponse(h.widgetView(t)), nil
}

// SimulateWidgetPayment simulates the user's fiat payment with the scenario
// of the test card they entered; approved deposits are paid on Stellar by the
// payment worker.
func (h *Handlers) SimulateWidgetPayment(ctx context.Context, req api.SimulateWidgetPaymentRequestObject) (api.SimulateWidgetPaymentResponseObject, error) {
	if req.Body == nil || !req.Body.Scenario.Valid() {
		return api.SimulateWidgetPayment400JSONResponse{BadRequestJSONResponse: api.BadRequestJSONResponse{
			Error: "scenario must be one of approved, kyc_rejected, payment_not_received, delayed",
		}}, nil
	}
	conflict := api.SimulateWidgetPayment409JSONResponse{ConflictJSONResponse: api.ConflictJSONResponse{
		Error: "the transaction is not waiting for a payment",
	}}
	t, err := h.widgetTransaction(ctx)
	if err != nil {
		return nil, err
	}
	if transaction.Status(t.Status) != transaction.StatusPendingUserTransferStart || t.AmountIn == nil {
		return conflict, nil
	}

	scenario := sandbox.Scenario(req.Body.Scenario)
	update := transaction.Update{Scenario: ptr(string(scenario))}
	to := transaction.StatusPendingAnchor
	switch scenario {
	case sandbox.ScenarioKYCRejected:
		to, update.Message = transaction.StatusError, ptr("KYC rejected (sandbox scenario).")
	case sandbox.ScenarioPaymentNotReceived:
		to, update.Message = transaction.StatusExpired, ptr("Payment not received (sandbox scenario).")
	case sandbox.ScenarioDelayed:
		update.NextAttemptAt = ptr(time.Now().Add(sandbox.DelayedFor))
	default:
		update.NextAttemptAt = ptr(time.Now())
	}

	t, err = h.transactions.Transition(ctx, t.ID, to, update)
	if errors.Is(err, transaction.ErrInvalidTransition) {
		return conflict, nil
	}
	if err != nil {
		return nil, err
	}
	return api.SimulateWidgetPayment200JSONResponse(h.widgetView(t)), nil
}

// widgetTransaction loads the transaction of the widget session.
func (h *Handlers) widgetTransaction(ctx context.Context) (db.Transaction, error) {
	id, _ := widgetauth.TransactionFrom(ctx)
	return h.transactions.Get(ctx, id)
}

// widgetView adds the confirmed quote and, while the user still has to pay,
// the simulated payment instructions.
func (h *Handlers) widgetView(t db.Transaction) api.WidgetTransaction {
	view := api.WidgetTransaction{Transaction: h.sep24Transaction(t)}
	if t.FiatCurrency == nil || t.AmountIn == nil {
		return view
	}
	q, err := sandbox.NewQuote(*t.FiatCurrency, trimFiat(*t.AmountIn))
	if err != nil {
		return view
	}
	quote := apiQuote(q)
	view.Quote = &quote
	if transaction.Status(t.Status) == transaction.StatusPendingUserTransferStart {
		view.PaymentInstructions = &api.PaymentInstructions{
			Reference:    "LND-" + strings.ToUpper(t.ID.String()[:8]),
			Amount:       q.AmountIn,
			FiatCurrency: api.FiatCurrency(q.FiatCurrency),
			Description:  "Simulated payment: no real money moves. Pay with a test card to continue.",
		}
	}
	return view
}

func apiQuote(q sandbox.Quote) api.Quote {
	return api.Quote{
		FiatCurrency: api.FiatCurrency(q.FiatCurrency),
		AmountIn:     q.AmountIn,
		Rate:         q.Rate,
		Fee:          q.Fee,
		AmountOut:    q.AmountOut,
		AssetCode:    sandbox.AssetCode,
	}
}

// quoteError drops the "invalid quote: " prefix for the user.
func quoteError(err error) string {
	return strings.TrimPrefix(err.Error(), sandbox.ErrInvalidQuote.Error()+": ")
}

// trimFiat turns a stored numeric (e.g. "10000.5000000") into a fiat amount
// with 2 decimals ("10000.50").
func trimFiat(amount string) string {
	whole, frac, _ := strings.Cut(amount, ".")
	return whole + "." + (frac + "00")[:2]
}
