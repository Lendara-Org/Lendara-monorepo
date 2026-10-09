package handlers

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/oapi-codegen/runtime"
	"github.com/stellar/go-stellar-sdk/strkey"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/api"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/db"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/sandbox"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/sep10"
	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/transaction"
)

// SEP-24 settings of the sandbox. Asset and limits live in package sandbox.
const (
	assetCode          = sandbox.AssetCode
	depositMinAmount   = float64(sandbox.MinDeposit)
	depositMaxAmount   = float64(sandbox.MaxDeposit)
	interactiveURLTTL  = 15 * time.Minute
	defaultListLimit   = 50
	maxListLimit       = 200
	maxMultipartFields = 32
)

// amountPattern is a positive decimal with up to 7 places (Stellar precision).
var amountPattern = regexp.MustCompile(`^[0-9]+(\.[0-9]{1,7})?$`)

// GetSep24Info describes the supported assets, limits and features.
func (*Handlers) GetSep24Info(context.Context, api.GetSep24InfoRequestObject) (api.GetSep24InfoResponseObject, error) {
	minAmount, maxAmount, disabled := depositMinAmount, depositMaxAmount, false
	info := api.GetSep24Info200JSONResponse{
		Deposit:  map[string]api.Sep24AssetInfo{assetCode: {Enabled: true, MinAmount: &minAmount, MaxAmount: &maxAmount}},
		Withdraw: map[string]api.Sep24AssetInfo{},
	}
	info.Fee = &struct {
		AuthenticationRequired *bool `json:"authentication_required,omitempty"`
		Enabled                *bool `json:"enabled,omitempty"`
	}{Enabled: &disabled}
	info.Features = &struct {
		AccountCreation   *bool `json:"account_creation,omitempty"`
		ClaimableBalances *bool `json:"claimable_balances,omitempty"`
	}{AccountCreation: &disabled, ClaimableBalances: &disabled}
	return info, nil
}

// PostSep24DepositInteractive creates an incomplete deposit and returns the
// URL of the interactive widget, with a one-time token.
func (h *Handlers) PostSep24DepositInteractive(ctx context.Context, req api.PostSep24DepositInteractiveRequestObject) (api.PostSep24DepositInteractiveResponseObject, error) {
	badRequest := func(msg string) (api.PostSep24DepositInteractiveResponseObject, error) {
		return api.PostSep24DepositInteractive400JSONResponse{BadRequestJSONResponse: api.BadRequestJSONResponse{Error: msg}}, nil
	}

	body, err := depositBody(req)
	if err != nil {
		return badRequest(err.Error())
	}
	if body.AssetCode != assetCode {
		return badRequest(fmt.Sprintf("asset_code %q is not supported", body.AssetCode))
	}
	if body.AssetIssuer != nil && *body.AssetIssuer != h.issuer {
		return badRequest("asset_issuer does not match the USDC issuer in stellar.toml")
	}

	subject, _ := sep10.SubjectFrom(ctx)
	// SEP-24: account and memo default to the ones authenticated with SEP-10.
	account, subjectMemo, _ := strings.Cut(subject, ":")
	if body.Account != nil {
		account = *body.Account
	}
	if !strkey.IsValidEd25519PublicKey(account) && !strkey.IsValidMuxedAccountEd25519PublicKey(account) {
		return badRequest("account must be a valid G... or M... address")
	}

	memo, memoType := body.Memo, (*string)(body.MemoType)
	if memo == nil && subjectMemo != "" && body.Account == nil {
		memo, memoType = &subjectMemo, ptr("id")
	}
	if memo != nil {
		if memoType == nil {
			memoType = ptr("text")
		}
		if err := validateMemo(*memo, *memoType); err != nil {
			return badRequest(err.Error())
		}
	}

	if body.Amount != nil {
		if err := validateAmount(body.Amount.String()); err != nil {
			return badRequest(err.Error())
		}
	}

	created, err := h.transactions.Create(ctx, transaction.CreateParams{
		AssetCode:      assetCode,
		Sep10Subject:   &subject,
		StellarAccount: account,
		Memo:           memo,
		MemoType:       memoType,
	})
	if err != nil {
		return nil, err
	}
	token, err := h.transactions.NewInteractiveToken(ctx, created.ID, interactiveURLTTL)
	if err != nil {
		return nil, err
	}

	query := url.Values{"token": {token}}
	if body.Amount != nil {
		// Prefills the widget; the user confirms the amount there.
		query.Set("amount", body.Amount.String())
	}
	if body.Lang != nil {
		query.Set("lang", *body.Lang)
	}
	return api.PostSep24DepositInteractive200JSONResponse{
		Type: api.InteractiveCustomerInfoNeeded,
		Id:   created.ID.String(),
		Url:  h.widgetURL(created.ID) + "?" + query.Encode(),
	}, nil
}

// GetSep24Transaction returns one transaction of the authenticated account.
func (h *Handlers) GetSep24Transaction(ctx context.Context, req api.GetSep24TransactionRequestObject) (api.GetSep24TransactionResponseObject, error) {
	notFound := api.GetSep24Transaction404JSONResponse{NotFoundJSONResponse: api.NotFoundJSONResponse{Error: "transaction not found"}}
	p := req.Params

	var (
		t   db.Transaction
		err error
	)
	switch {
	case p.Id != nil:
		id, parseErr := uuid.Parse(*p.Id)
		if parseErr != nil {
			return notFound, nil
		}
		t, err = h.transactions.Get(ctx, id)
	case p.StellarTransactionId != nil:
		t, err = h.transactions.GetByStellarID(ctx, *p.StellarTransactionId)
	case p.ExternalTransactionId != nil:
		// The sandbox has no external (fiat rail) IDs.
		return notFound, nil
	default:
		return api.GetSep24Transaction400JSONResponse{BadRequestJSONResponse: api.BadRequestJSONResponse{
			Error: "one of id, stellar_transaction_id or external_transaction_id is required",
		}}, nil
	}
	if errors.Is(err, transaction.ErrNotFound) {
		return notFound, nil
	}
	if err != nil {
		return nil, err
	}

	// Other accounts' transactions are reported as not found.
	if subject, _ := sep10.SubjectFrom(ctx); t.Sep10Subject == nil || *t.Sep10Subject != subject {
		return notFound, nil
	}
	return api.GetSep24Transaction200JSONResponse{Transaction: h.sep24Transaction(t)}, nil
}

// GetSep24Transactions lists the authenticated account's transactions.
func (h *Handlers) GetSep24Transactions(ctx context.Context, req api.GetSep24TransactionsRequestObject) (api.GetSep24TransactionsResponseObject, error) {
	badRequest := func(msg string) (api.GetSep24TransactionsResponseObject, error) {
		return api.GetSep24Transactions400JSONResponse{BadRequestJSONResponse: api.BadRequestJSONResponse{Error: msg}}, nil
	}
	p := req.Params
	subject, _ := sep10.SubjectFrom(ctx)

	params := db.ListTransactionsBySubjectParams{
		Sep10Subject: &subject,
		AssetCode:    p.AssetCode,
		NoOlderThan:  p.NoOlderThan,
		Kind:         (*string)(p.Kind),
		MaxResults:   defaultListLimit,
	}
	if p.Limit != nil {
		if *p.Limit < 1 {
			return badRequest("limit must be at least 1")
		}
		params.MaxResults = int32(min(*p.Limit, maxListLimit)) //nolint:gosec // bounded by maxListLimit
	}
	if p.PagingId != nil {
		id, err := uuid.Parse(*p.PagingId)
		if err != nil {
			return badRequest("paging_id must be a transaction id")
		}
		params.PagingID = &id
	}

	list, err := h.transactions.ListBySubject(ctx, params)
	if err != nil {
		return nil, err
	}
	resp := api.GetSep24Transactions200JSONResponse{Transactions: make([]api.Sep24Transaction, 0, len(list))}
	for _, t := range list {
		resp.Transactions = append(resp.Transactions, h.sep24Transaction(t))
	}
	return resp, nil
}

// sep24Transaction maps a stored transaction to the SEP-24 schema.
func (h *Handlers) sep24Transaction(t db.Transaction) api.Sep24Transaction {
	out := api.Sep24Transaction{
		Id:     t.ID.String(),
		Kind:   api.Sep24TransactionKind(t.Kind),
		Status: api.Sep24TransactionStatus(t.Status),
		// SEP-24 dates are UTC ISO 8601.
		StartedAt:            t.StartedAt.UTC(),
		UpdatedAt:            ptr(t.UpdatedAt.UTC()),
		MoreInfoUrl:          ptr(h.widgetURL(t.ID)),
		AmountIn:             t.AmountIn,
		AmountOut:            t.AmountOut,
		AmountFee:            t.AmountFee,
		AmountOutAsset:       ptr(fmt.Sprintf("stellar:%s:%s", t.AssetCode, h.issuer)),
		StellarTransactionId: t.StellarTransactionID,
		Message:              t.Message,
		To:                   &t.StellarAccount,
		DepositMemo:          t.Memo,
		DepositMemoType:      t.MemoType,
	}
	if t.CompletedAt != nil {
		out.CompletedAt = ptr(t.CompletedAt.UTC())
	}
	if t.FiatCurrency != nil {
		out.AmountInAsset = ptr("iso4217:" + *t.FiatCurrency)
	}
	return out
}

func (h *Handlers) widgetURL(id uuid.UUID) string {
	return h.webBaseURL + "/widget/" + id.String()
}

// depositBody returns the request body for any of the content types SEP-24
// allows: JSON, URL-encoded form or multipart form.
func depositBody(req api.PostSep24DepositInteractiveRequestObject) (api.Sep24DepositRequest, error) {
	switch {
	case req.JSONBody != nil:
		return *req.JSONBody, nil
	case req.FormdataBody != nil:
		return *req.FormdataBody, nil
	case req.MultipartBody != nil:
		form, err := readMultipart(req.MultipartBody)
		if err != nil {
			return api.Sep24DepositRequest{}, err
		}
		var body api.Sep24DepositRequest
		if err := runtime.BindForm(&body, form, nil, nil); err != nil {
			return api.Sep24DepositRequest{}, fmt.Errorf("invalid form: %w", err)
		}
		return body, nil
	default:
		return api.Sep24DepositRequest{}, errors.New("request body is required")
	}
}

// readMultipart reads the text fields of a multipart form. Files are not expected.
func readMultipart(r *multipart.Reader) (url.Values, error) {
	form := url.Values{}
	for range maxMultipartFields {
		part, err := r.NextPart()
		if errors.Is(err, io.EOF) {
			return form, nil
		}
		if err != nil {
			return nil, fmt.Errorf("invalid multipart body: %w", err)
		}
		value, err := io.ReadAll(io.LimitReader(part, 4096))
		if err != nil {
			return nil, fmt.Errorf("invalid multipart body: %w", err)
		}
		form.Add(part.FormName(), string(value))
	}
	return nil, errors.New("too many form fields")
}

func validateAmount(amount string) error {
	if !amountPattern.MatchString(amount) {
		return errors.New("amount must be a positive number with up to 7 decimals")
	}
	v, err := strconv.ParseFloat(amount, 64)
	if err != nil || v < depositMinAmount || v > depositMaxAmount {
		return fmt.Errorf("amount must be between %g and %g", depositMinAmount, depositMaxAmount)
	}
	return nil
}

// validateMemo checks a memo against Stellar's memo rules for its type.
func validateMemo(memo, memoType string) error {
	switch memoType {
	case "id":
		if _, err := strconv.ParseUint(memo, 10, 64); err != nil {
			return errors.New("memo of type id must be an unsigned 64-bit integer")
		}
	case "text":
		if len(memo) > 28 {
			return errors.New("memo of type text must be at most 28 bytes")
		}
	case "hash":
		if b, err := base64.StdEncoding.DecodeString(memo); err != nil || len(b) != 32 {
			return errors.New("memo of type hash must be 32 bytes, base64-encoded")
		}
	default:
		return errors.New("memo_type must be text, id or hash")
	}
	return nil
}

func ptr[T any](v T) *T { return &v }
