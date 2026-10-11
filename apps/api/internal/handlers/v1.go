package handlers

import (
	"context"
	"errors"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/stellar/go-stellar-sdk/strkey"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/db"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/project"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/sandbox"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/transaction"
)

// Limits of GET /v1/transactions.
const (
	defaultV1ListLimit = 20
	maxV1ListLimit     = 100
	maxProjectName     = 100
)

// CreateProject creates a sandbox project and returns its API key once.
func (h *Handlers) CreateProject(ctx context.Context, req api.CreateProjectRequestObject) (api.CreateProjectResponseObject, error) {
	if req.Body == nil {
		return api.CreateProject400JSONResponse{BadRequestJSONResponse: api.BadRequestJSONResponse{Error: "request body is required"}}, nil
	}
	name := strings.TrimSpace(req.Body.Name)
	if name == "" || len([]rune(name)) > maxProjectName {
		return api.CreateProject400JSONResponse{BadRequestJSONResponse: api.BadRequestJSONResponse{Error: "name must be 1 to 100 characters"}}, nil
	}
	p, key, err := h.projects.Create(ctx, name)
	if err != nil {
		return nil, err
	}
	return api.CreateProject201JSONResponse{Project: apiProject(p), ApiKey: key}, nil
}

// GetProject returns the project of the API key.
func (h *Handlers) GetProject(ctx context.Context, _ api.GetProjectRequestObject) (api.GetProjectResponseObject, error) {
	id, _ := project.IDFrom(ctx)
	p, err := h.projects.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	return api.GetProject200JSONResponse(apiProject(p)), nil
}

// CreateSession creates an incomplete deposit for the project and returns
// the widget URL, with a one-time token.
func (h *Handlers) CreateSession(ctx context.Context, req api.CreateSessionRequestObject) (api.CreateSessionResponseObject, error) {
	badRequest := func(msg string) (api.CreateSessionResponseObject, error) {
		return api.CreateSession400JSONResponse{BadRequestJSONResponse: api.BadRequestJSONResponse{Error: msg}}, nil
	}
	if req.Body == nil {
		return badRequest("request body is required")
	}
	body := *req.Body
	if !strkey.IsValidEd25519PublicKey(body.Account) && !strkey.IsValidMuxedAccountEd25519PublicKey(body.Account) {
		return badRequest("account must be a valid G... or M... address")
	}

	memo, memoType := body.Memo, (*string)(body.MemoType)
	if memo != nil {
		if memoType == nil {
			memoType = ptr("text")
		}
		if err := validateMemo(*memo, *memoType); err != nil {
			return badRequest(err.Error())
		}
	} else if memoType != nil {
		return badRequest("memo_type requires memo")
	}

	// Currency and amount only prefill the widget; the user confirms them there.
	query := url.Values{}
	if body.FiatCurrency != nil {
		currency := string(*body.FiatCurrency)
		if _, ok := sandbox.Rates[currency]; !ok {
			return badRequest("fiat_currency must be CRC, ARS or CLP")
		}
		query.Set("fiat_currency", currency)
	}
	if body.Amount != nil {
		if body.FiatCurrency == nil {
			return badRequest("amount requires fiat_currency")
		}
		if _, err := sandbox.NewQuote(string(*body.FiatCurrency), *body.Amount); err != nil {
			return badRequest(quoteError(err))
		}
		query.Set("fiat_amount", *body.Amount)
	}

	projectID, _ := project.IDFrom(ctx)
	created, err := h.transactions.Create(ctx, transaction.CreateParams{
		ProjectID:      &projectID,
		AssetCode:      assetCode,
		StellarAccount: body.Account,
		Memo:           memo,
		MemoType:       memoType,
	})
	if err != nil {
		return nil, err
	}
	expiresAt := time.Now().Add(interactiveURLTTL).UTC()
	token, err := h.transactions.NewInteractiveToken(ctx, created.ID, interactiveURLTTL)
	if err != nil {
		return nil, err
	}
	query.Set("token", token)
	return api.CreateSession201JSONResponse{
		Id:        created.ID.String(),
		Url:       h.widgetURL(created.ID) + "?" + query.Encode(),
		ExpiresAt: expiresAt,
	}, nil
}

// ListTransactions lists the project's transactions, newest first.
func (h *Handlers) ListTransactions(ctx context.Context, req api.ListTransactionsRequestObject) (api.ListTransactionsResponseObject, error) {
	badRequest := func(msg string) (api.ListTransactionsResponseObject, error) {
		return api.ListTransactions400JSONResponse{BadRequestJSONResponse: api.BadRequestJSONResponse{Error: msg}}, nil
	}
	p := req.Params
	limit := defaultV1ListLimit
	if p.Limit != nil {
		if *p.Limit < 1 || *p.Limit > maxV1ListLimit {
			return badRequest("limit must be between 1 and 100")
		}
		limit = *p.Limit
	}

	projectID, _ := project.IDFrom(ctx)
	params := db.ListTransactionsByProjectParams{
		ProjectID: &projectID,
		// One extra row tells whether there is a next page.
		MaxResults: int32(limit + 1), //nolint:gosec // bounded by maxV1ListLimit
	}
	if p.Cursor != nil {
		cursor, err := uuid.Parse(*p.Cursor)
		if err != nil {
			return badRequest("cursor must be a next_cursor value")
		}
		params.Cursor = &cursor
	}

	list, err := h.transactions.ListByProject(ctx, params)
	if err != nil {
		return nil, err
	}
	resp := api.ListTransactions200JSONResponse{Data: make([]api.Sep24Transaction, 0, min(len(list), limit))}
	for i, t := range list {
		if i == limit {
			resp.NextCursor = ptr(list[i-1].ID.String())
			break
		}
		resp.Data = append(resp.Data, h.sep24Transaction(t))
	}
	return resp, nil
}

// GetTransaction returns one of the project's transactions.
func (h *Handlers) GetTransaction(ctx context.Context, req api.GetTransactionRequestObject) (api.GetTransactionResponseObject, error) {
	notFound := api.GetTransaction404JSONResponse{NotFoundJSONResponse: api.NotFoundJSONResponse{Error: "transaction not found"}}
	id, err := uuid.Parse(req.Id)
	if err != nil {
		return notFound, nil
	}
	t, err := h.transactions.Get(ctx, id)
	if errors.Is(err, transaction.ErrNotFound) {
		return notFound, nil
	}
	if err != nil {
		return nil, err
	}
	// Other projects' transactions are reported as not found.
	if projectID, _ := project.IDFrom(ctx); t.ProjectID == nil || *t.ProjectID != projectID {
		return notFound, nil
	}
	return api.GetTransaction200JSONResponse(h.sep24Transaction(t)), nil
}

func apiProject(p db.Project) api.Project {
	return api.Project{Id: p.ID, Name: p.Name, CreatedAt: p.CreatedAt.UTC()}
}
