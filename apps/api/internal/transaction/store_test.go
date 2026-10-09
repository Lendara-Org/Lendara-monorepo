package transaction

import (
	"errors"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stellar/go-stellar-sdk/keypair"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/db"
)

// newStore connects to TEST_DATABASE_URL (migrated with `make migrate`).
func newStore(t *testing.T) *Store {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	pool, err := pgxpool.New(t.Context(), url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)
	return NewStore(pool)
}

func ptr[T any](v T) *T { return &v }

// createDeposit creates a deposit owned by a fresh random account.
func createDeposit(t *testing.T, s *Store, subject string) db.Transaction {
	t.Helper()
	created, err := s.Create(t.Context(), CreateParams{
		AssetCode:      "USDC",
		Sep10Subject:   &subject,
		StellarAccount: subject,
		AmountIn:       ptr("10000.50"),
	})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	return created
}

func TestStoreCreateAndGet(t *testing.T) {
	s := newStore(t)
	created := createDeposit(t, s, keypair.MustRandom().Address())

	got, err := s.Get(t.Context(), created.ID)
	if err != nil {
		t.Fatalf("Get() error = %v", err)
	}
	if got.Status != string(StatusIncomplete) || got.Kind != "deposit" {
		t.Errorf("status, kind = %s, %s; want incomplete, deposit", got.Status, got.Kind)
	}
	if got.AmountIn == nil || *got.AmountIn != "10000.5000000" {
		t.Errorf("amount_in = %v, want 10000.5000000", got.AmountIn)
	}

	if _, err := s.Get(t.Context(), uuid.New()); !errors.Is(err, ErrNotFound) {
		t.Errorf("Get(unknown) error = %v, want ErrNotFound", err)
	}
}

func TestStoreTransition(t *testing.T) {
	s := newStore(t)
	ctx := t.Context()
	created := createDeposit(t, s, keypair.MustRandom().Address())

	path := []Status{StatusPendingUserTransferStart, StatusPendingAnchor, StatusPendingStellar, StatusCompleted}
	for _, to := range path {
		if _, err := s.Transition(ctx, created.ID, to, Update{}); err != nil {
			t.Fatalf("Transition(%s) error = %v", to, err)
		}
	}

	done, err := s.Get(ctx, created.ID)
	if err != nil {
		t.Fatalf("Get() error = %v", err)
	}
	if done.Status != string(StatusCompleted) || done.CompletedAt == nil {
		t.Errorf("status = %s, completed_at = %v; want completed with a timestamp", done.Status, done.CompletedAt)
	}

	if _, err := s.Transition(ctx, created.ID, StatusError, Update{Message: ptr("too late")}); !errors.Is(err, ErrInvalidTransition) {
		t.Errorf("Transition(completed -> error) error = %v, want ErrInvalidTransition", err)
	}
	if _, err := s.Transition(ctx, uuid.New(), StatusError, Update{}); !errors.Is(err, ErrNotFound) {
		t.Errorf("Transition(unknown) error = %v, want ErrNotFound", err)
	}

	events, err := db.New(s.pool).ListTransactionEvents(ctx, created.ID)
	if err != nil {
		t.Fatalf("ListTransactionEvents() error = %v", err)
	}
	if len(events) != len(path)+1 {
		t.Fatalf("got %d events, want %d (creation + each transition)", len(events), len(path)+1)
	}
	if events[0].FromStatus != nil || events[0].ToStatus != string(StatusIncomplete) {
		t.Errorf("first event = %v -> %s, want nil -> incomplete", events[0].FromStatus, events[0].ToStatus)
	}
	if last := events[len(events)-1]; *last.FromStatus != string(StatusPendingStellar) || last.ToStatus != string(StatusCompleted) {
		t.Errorf("last event = %s -> %s, want pending_stellar -> completed", *last.FromStatus, last.ToStatus)
	}
}

func TestStoreConfirm(t *testing.T) {
	s := newStore(t)
	ctx := t.Context()
	created := createDeposit(t, s, keypair.MustRandom().Address())
	quote := Quote{FiatCurrency: "CRC", AmountIn: "10000.00", AmountOut: "19.1078431", AmountFee: "0.50"}

	confirmed, err := s.Confirm(ctx, created.ID, quote)
	if err != nil {
		t.Fatalf("Confirm() error = %v", err)
	}
	if confirmed.Status != string(StatusPendingUserTransferStart) {
		t.Errorf("status = %s, want pending_user_transfer_start", confirmed.Status)
	}
	if *confirmed.FiatCurrency != "CRC" || *confirmed.AmountOut != "19.1078431" || *confirmed.AmountFee != "0.5000000" {
		t.Errorf("quote = %s %s %s, want stored", *confirmed.FiatCurrency, *confirmed.AmountOut, *confirmed.AmountFee)
	}

	// A second confirmation is an invalid transition and changes nothing.
	if _, err := s.Confirm(ctx, created.ID, Quote{FiatCurrency: "BRL", AmountIn: "1", AmountOut: "1", AmountFee: "0"}); !errors.Is(err, ErrInvalidTransition) {
		t.Errorf("second Confirm() error = %v, want ErrInvalidTransition", err)
	}
	if got, _ := s.Get(ctx, created.ID); *got.FiatCurrency != "CRC" {
		t.Errorf("fiat_currency = %s after rejected confirm, want CRC", *got.FiatCurrency)
	}
}

func TestStoreListDue(t *testing.T) {
	s := newStore(t)
	ctx := t.Context()
	due, later := createDeposit(t, s, keypair.MustRandom().Address()), createDeposit(t, s, keypair.MustRandom().Address())
	for _, tx := range []db.Transaction{due, later} {
		if _, err := s.Transition(ctx, tx.ID, StatusPendingUserTransferStart, Update{}); err != nil {
			t.Fatalf("Transition() error = %v", err)
		}
	}
	past, future := time.Now().Add(-time.Second), time.Now().Add(time.Hour)
	if _, err := s.Transition(ctx, due.ID, StatusPendingAnchor, Update{NextAttemptAt: &past, Scenario: ptr("approved")}); err != nil {
		t.Fatalf("Transition() error = %v", err)
	}
	if _, err := s.Transition(ctx, later.ID, StatusPendingAnchor, Update{NextAttemptAt: &future}); err != nil {
		t.Fatalf("Transition() error = %v", err)
	}

	isDue := func(id uuid.UUID) bool {
		t.Helper()
		list, err := s.ListDue(ctx, 1000)
		if err != nil {
			t.Fatalf("ListDue() error = %v", err)
		}
		for _, tx := range list {
			if tx.ID == id {
				return true
			}
		}
		return false
	}
	if !isDue(due.ID) || isDue(later.ID) {
		t.Errorf("due = %v, later = %v; want only the past attempt", isDue(due.ID), isDue(later.ID))
	}
	if err := s.Reschedule(ctx, due.ID, future); err != nil {
		t.Fatalf("Reschedule() error = %v", err)
	}
	if isDue(due.ID) {
		t.Error("rescheduled transaction is still due")
	}

	// Scenario is kept when a later update leaves it nil.
	got, err := s.Transition(ctx, due.ID, StatusError, Update{})
	if err != nil {
		t.Fatalf("Transition() error = %v", err)
	}
	if got.Scenario == nil || *got.Scenario != "approved" || got.NextAttemptAt != nil {
		t.Errorf("scenario, next_attempt_at = %v, %v; want kept and cleared", got.Scenario, got.NextAttemptAt)
	}
}

func TestStoreListBySubject(t *testing.T) {
	s := newStore(t)
	ctx := t.Context()
	subject := keypair.MustRandom().Address()
	first := createDeposit(t, s, subject)
	second := createDeposit(t, s, subject)
	createDeposit(t, s, keypair.MustRandom().Address()) // someone else's

	list := func(p db.ListTransactionsBySubjectParams) []db.Transaction {
		t.Helper()
		p.Sep10Subject, p.AssetCode = &subject, "USDC"
		if p.MaxResults == 0 {
			p.MaxResults = 10
		}
		got, err := s.ListBySubject(ctx, p)
		if err != nil {
			t.Fatalf("ListBySubject() error = %v", err)
		}
		return got
	}

	if got := list(db.ListTransactionsBySubjectParams{}); len(got) != 2 || got[0].ID != second.ID {
		t.Errorf("list = %d transactions, want 2 newest first", len(got))
	}
	if got := list(db.ListTransactionsBySubjectParams{PagingID: &second.ID}); len(got) != 1 || got[0].ID != first.ID {
		t.Errorf("list after paging_id = %v, want only the older one", got)
	}
	if got := list(db.ListTransactionsBySubjectParams{MaxResults: 1}); len(got) != 1 {
		t.Errorf("limit 1 returned %d transactions", len(got))
	}
	if got := list(db.ListTransactionsBySubjectParams{NoOlderThan: ptr(time.Now().Add(time.Hour))}); len(got) != 0 {
		t.Errorf("no_older_than in the future returned %d transactions", len(got))
	}
	if got := list(db.ListTransactionsBySubjectParams{Kind: ptr("withdrawal")}); len(got) != 0 {
		t.Errorf("kind=withdrawal returned %d transactions", len(got))
	}
}

func TestStoreInteractiveToken(t *testing.T) {
	s := newStore(t)
	ctx := t.Context()
	created := createDeposit(t, s, keypair.MustRandom().Address())

	token, err := s.NewInteractiveToken(ctx, created.ID, time.Minute)
	if err != nil {
		t.Fatalf("NewInteractiveToken() error = %v", err)
	}
	id, err := s.ConsumeInteractiveToken(ctx, token)
	if err != nil || id != created.ID {
		t.Fatalf("ConsumeInteractiveToken() = %v, %v; want %v", id, err, created.ID)
	}
	if _, err := s.ConsumeInteractiveToken(ctx, token); !errors.Is(err, ErrInvalidToken) {
		t.Errorf("second use error = %v, want ErrInvalidToken", err)
	}

	expired, err := s.NewInteractiveToken(ctx, created.ID, -time.Second)
	if err != nil {
		t.Fatalf("NewInteractiveToken() error = %v", err)
	}
	if _, err := s.ConsumeInteractiveToken(ctx, expired); !errors.Is(err, ErrInvalidToken) {
		t.Errorf("expired token error = %v, want ErrInvalidToken", err)
	}
	if _, err := s.ConsumeInteractiveToken(ctx, "unknown"); !errors.Is(err, ErrInvalidToken) {
		t.Errorf("unknown token error = %v, want ErrInvalidToken", err)
	}
}
