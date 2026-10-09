package handlers

import (
	"context"
	"errors"

	"github.com/stellar/go-stellar-sdk/network"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/sep10"
)

// GetSep10Challenge returns a challenge transaction for the client account.
func (h *Handlers) GetSep10Challenge(_ context.Context, req api.GetSep10ChallengeRequestObject) (api.GetSep10ChallengeResponseObject, error) {
	// client_domain is ignored: client domain verification is not supported (SEP-10 request parameters).
	p := req.Params
	tx, err := h.sep10.Challenge(p.Account, value(p.Memo), value(p.HomeDomain))
	if reqErr, ok := errors.AsType[*sep10.RequestError](err); ok {
		return api.GetSep10Challenge400JSONResponse{BadRequestJSONResponse: api.BadRequestJSONResponse{Error: reqErr.Error()}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.GetSep10Challenge200JSONResponse{Transaction: tx, NetworkPassphrase: network.TestNetworkPassphrase}, nil
}

// PostSep10Token exchanges a signed challenge for a session JWT.
func (h *Handlers) PostSep10Token(_ context.Context, req api.PostSep10TokenRequestObject) (api.PostSep10TokenResponseObject, error) {
	body := req.JSONBody
	if body == nil {
		body = req.FormdataBody
	}
	if body == nil || body.Transaction == "" {
		return api.PostSep10Token400JSONResponse{BadRequestJSONResponse: api.BadRequestJSONResponse{Error: "transaction is required"}}, nil
	}

	token, err := h.sep10.Token(body.Transaction)
	if reqErr, ok := errors.AsType[*sep10.RequestError](err); ok {
		return api.PostSep10Token400JSONResponse{BadRequestJSONResponse: api.BadRequestJSONResponse{Error: reqErr.Error()}}, nil
	}
	if err != nil {
		return nil, err
	}
	return api.PostSep10Token200JSONResponse{Token: token}, nil
}

func value(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
