// Package project stores sandbox projects and their API keys.
package project

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Lendara-Org/Lendara-monorepo/apps/api/internal/db"
)

// KeyPrefix starts every sandbox API key.
const KeyPrefix = "lnd_test_"

// shownKeyChars is how much of a key is stored in clear to recognize it.
const shownKeyChars = len(KeyPrefix) + 4

var (
	// ErrNotFound means the project does not exist.
	ErrNotFound = errors.New("project not found")
	// ErrInvalidKey means the API key is malformed or unknown.
	ErrInvalidKey = errors.New("invalid API key")
)

// Store persists projects and API keys.
type Store struct {
	pool *pgxpool.Pool
}

// NewStore returns a Store backed by pool.
func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

// Create stores a project with a new API key and returns both. Only the
// key's hash is stored, so the key can't be shown again.
func (s *Store) Create(ctx context.Context, name string) (db.Project, string, error) {
	key := KeyPrefix + rand.Text() // 128 random bits, base32.
	var created db.Project
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := db.New(tx)
		var err error
		if created, err = q.CreateProject(ctx, name); err != nil {
			return fmt.Errorf("insert project: %w", err)
		}
		return q.CreateAPIKey(ctx, db.CreateAPIKeyParams{
			ProjectID: created.ID,
			KeyHash:   hashKey(key),
			KeyPrefix: key[:shownKeyChars],
		})
	})
	if err != nil {
		return db.Project{}, "", err
	}
	return created, key, nil
}

// Get returns a project by ID.
func (s *Store) Get(ctx context.Context, id uuid.UUID) (db.Project, error) {
	p, err := db.New(s.pool).GetProject(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return db.Project{}, ErrNotFound
	}
	return p, err
}

// Authenticate returns the ID of the project that owns key.
func (s *Store) Authenticate(ctx context.Context, key string) (uuid.UUID, error) {
	if !strings.HasPrefix(key, KeyPrefix) {
		return uuid.UUID{}, ErrInvalidKey
	}
	id, err := db.New(s.pool).GetProjectIDByAPIKey(ctx, hashKey(key))
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.UUID{}, ErrInvalidKey
	}
	return id, err
}

// API keys are 128-bit random, so a plain SHA-256 is enough (no need for a
// slow password hash).
func hashKey(key string) []byte {
	sum := sha256.Sum256([]byte(key))
	return sum[:]
}

type idKey struct{}

// WithID returns a context carrying the authenticated project ID.
func WithID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, idKey{}, id)
}

// IDFrom returns the project ID stored by WithID.
func IDFrom(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(idKey{}).(uuid.UUID)
	return id, ok
}
