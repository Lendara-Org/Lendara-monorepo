package transaction

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/db"
)

var (
	// ErrNotFound means the transaction does not exist.
	ErrNotFound = errors.New("transaction not found")
	// ErrInvalidTransition means the state machine does not allow the move.
	ErrInvalidTransition = errors.New("invalid status transition")
	// ErrInvalidToken means the interactive token is unknown, used or expired.
	ErrInvalidToken = errors.New("invalid interactive token")
	// ErrStale means the transaction changed after the caller read it.
	ErrStale = errors.New("transaction changed since it was read")
)

// Store persists transactions, their status history and interactive tokens.
type Store struct {
	pool *pgxpool.Pool
}

// NewStore returns a Store backed by pool.
func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

// CreateParams are the fields known when a deposit starts. Kind and status
// are set by Create.
type CreateParams struct {
	ProjectID      *uuid.UUID
	AssetCode      string
	Sep10Subject   *string
	StellarAccount string
	Memo           *string
	MemoType       *string
	FiatCurrency   *string
	AmountIn       *string
}

// Create stores a new deposit in the incomplete status.
func (s *Store) Create(ctx context.Context, p CreateParams) (db.Transaction, error) {
	var created db.Transaction
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		var err error
		created, err = q.CreateTransaction(ctx, db.CreateTransactionParams{
			ProjectID:      p.ProjectID,
			Kind:           "deposit",
			Status:         string(StatusIncomplete),
			AssetCode:      p.AssetCode,
			Sep10Subject:   p.Sep10Subject,
			StellarAccount: p.StellarAccount,
			Memo:           p.Memo,
			MemoType:       p.MemoType,
			FiatCurrency:   p.FiatCurrency,
			AmountIn:       p.AmountIn,
		})
		if err != nil {
			return fmt.Errorf("insert transaction: %w", err)
		}
		return q.CreateTransactionEvent(ctx, db.CreateTransactionEventParams{
			TransactionID: created.ID,
			ToStatus:      created.Status,
		})
	})
	return created, err
}

// Get returns a transaction by ID.
func (s *Store) Get(ctx context.Context, id uuid.UUID) (db.Transaction, error) {
	t, err := db.New(s.pool).GetTransaction(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return db.Transaction{}, ErrNotFound
	}
	return t, err
}

// GetByStellarID returns the transaction paid by a Stellar transaction hash.
func (s *Store) GetByStellarID(ctx context.Context, hash string) (db.Transaction, error) {
	t, err := db.New(s.pool).GetTransactionByStellarID(ctx, &hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return db.Transaction{}, ErrNotFound
	}
	return t, err
}

// ListBySubject returns the transactions of a SEP-10 subject, newest first.
func (s *Store) ListBySubject(ctx context.Context, p db.ListTransactionsBySubjectParams) ([]db.Transaction, error) {
	return db.New(s.pool).ListTransactionsBySubject(ctx, p)
}

// ListByProject returns the transactions of a project, newest first.
func (s *Store) ListByProject(ctx context.Context, p db.ListTransactionsByProjectParams) ([]db.Transaction, error) {
	return db.New(s.pool).ListTransactionsByProject(ctx, p)
}

// Update holds the fields that may change together with the status.
type Update struct {
	// Message is shown to the user (SEP-24 `message`); nil clears it.
	Message *string
	// NextAttemptAt schedules the payment worker; nil clears it.
	NextAttemptAt *time.Time
	// Scenario and StellarTransactionID are kept when nil.
	Scenario             *string
	StellarTransactionID *string
}

// Transition moves a transaction to a new status, validating it against the
// state machine and recording the change in transaction_events.
func (s *Store) Transition(ctx context.Context, id uuid.UUID, to Status, u Update) (db.Transaction, error) {
	return s.transition(ctx, id, to, u, nil, nil)
}

// TransitionFrom is Transition for a caller acting on a copy it read earlier:
// it fails with ErrStale if the status or the Stellar hash changed since, so
// two workers holding the same row cannot both send its payment.
func (s *Store) TransitionFrom(ctx context.Context, seen db.Transaction, to Status, u Update) (db.Transaction, error) {
	return s.transition(ctx, seen.ID, to, u, &seen, nil)
}

// ListDue returns up to limit transactions whose next payment attempt is due.
func (s *Store) ListDue(ctx context.Context, limit int32) ([]db.Transaction, error) {
	return db.New(s.pool).ListDueTransactions(ctx, limit)
}

// Reschedule sets the next payment attempt without changing the status.
func (s *Store) Reschedule(ctx context.Context, id uuid.UUID, at time.Time) error {
	return db.New(s.pool).SetNextAttempt(ctx, db.SetNextAttemptParams{ID: id, NextAttemptAt: &at})
}

// Quote holds the amounts of a confirmed deposit: fiat in, USDC out and fee.
type Quote struct {
	FiatCurrency string
	AmountIn     string
	AmountOut    string
	AmountFee    string
}

// Confirm stores the quote the user accepted and moves the deposit from
// incomplete to pending_user_transfer_start.
func (s *Store) Confirm(ctx context.Context, id uuid.UUID, q Quote) (db.Transaction, error) {
	return s.transition(ctx, id, StatusPendingUserTransferStart, Update{}, nil, func(tx *db.Queries) error {
		return tx.SetTransactionQuote(ctx, db.SetTransactionQuoteParams{
			ID:           id,
			FiatCurrency: &q.FiatCurrency,
			AmountIn:     &q.AmountIn,
			AmountOut:    &q.AmountOut,
			AmountFee:    &q.AmountFee,
		})
	})
}

// transition locks the transaction, checks it still matches seen (if any),
// validates the move, runs update (if any) and changes the status, all in one
// database transaction.
func (s *Store) transition(ctx context.Context, id uuid.UUID, to Status, u Update, seen *db.Transaction, update func(*db.Queries) error) (db.Transaction, error) {
	var updated db.Transaction
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		current, err := q.GetTransactionForUpdate(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return fmt.Errorf("lock transaction: %w", err)
		}
		if seen != nil && (current.Status != seen.Status || !sameHash(current.StellarTransactionID, seen.StellarTransactionID)) {
			return ErrStale
		}
		if err := CheckTransition(Status(current.Status), to); err != nil {
			return err
		}
		if update != nil {
			if err := update(q); err != nil {
				return fmt.Errorf("update transaction: %w", err)
			}
		}
		updated, err = q.UpdateTransactionStatus(ctx, db.UpdateTransactionStatusParams{
			ID:                   id,
			Status:               string(to),
			Message:              u.Message,
			NextAttemptAt:        u.NextAttemptAt,
			Scenario:             u.Scenario,
			StellarTransactionID: u.StellarTransactionID,
		})
		if err != nil {
			return fmt.Errorf("update status: %w", err)
		}
		return q.CreateTransactionEvent(ctx, db.CreateTransactionEventParams{
			TransactionID: id,
			FromStatus:    &current.Status,
			ToStatus:      updated.Status,
		})
	})
	return updated, err
}

func sameHash(a, b *string) bool {
	return a == nil && b == nil || a != nil && b != nil && *a == *b
}

// NewInteractiveToken returns a random one-time token for the SEP-24
// interactive URL of a transaction, valid for ttl.
func (s *Store) NewInteractiveToken(ctx context.Context, transactionID uuid.UUID, ttl time.Duration) (string, error) {
	token := rand.Text() // 128 random bits, base32.
	err := db.New(s.pool).CreateInteractiveToken(ctx, db.CreateInteractiveTokenParams{
		TokenHash:     hashToken(token),
		TransactionID: transactionID,
		ExpiresAt:     time.Now().Add(ttl),
	})
	if err != nil {
		return "", fmt.Errorf("store interactive token: %w", err)
	}
	return token, nil
}

// ConsumeInteractiveToken marks a token as used and returns its transaction
// ID. A token works only once and only before it expires.
func (s *Store) ConsumeInteractiveToken(ctx context.Context, token string) (uuid.UUID, error) {
	id, err := db.New(s.pool).ConsumeInteractiveToken(ctx, hashToken(token))
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.UUID{}, ErrInvalidToken
	}
	return id, err
}

func hashToken(token string) []byte {
	sum := sha256.Sum256([]byte(token))
	return sum[:]
}
