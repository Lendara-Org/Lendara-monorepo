-- +goose Up
CREATE TABLE transactions (
    id                     uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id             uuid          REFERENCES projects (id),
    kind                   text          NOT NULL CHECK (kind IN ('deposit')),
    status                 text          NOT NULL CHECK (status IN (
                               'incomplete', 'pending_user_transfer_start', 'pending_anchor',
                               'pending_trust', 'pending_stellar', 'completed', 'error', 'expired')),
    asset_code             text          NOT NULL,
    -- SEP-10 JWT subject (G..., M... or G...:memo) that owns the transaction. NULL for /v1 sessions.
    sep10_subject          text,
    -- Destination of the Stellar payment.
    stellar_account        text          NOT NULL,
    memo                   text,
    memo_type              text          CHECK (memo_type IN ('text', 'id', 'hash')),
    fiat_currency          text,
    amount_in              numeric(20, 7),
    amount_out             numeric(20, 7),
    amount_fee             numeric(20, 7),
    scenario               text,
    stellar_transaction_id text,
    message                text,
    started_at             timestamptz   NOT NULL DEFAULT now(),
    updated_at             timestamptz   NOT NULL DEFAULT now(),
    completed_at           timestamptz
);

CREATE INDEX transactions_sep10_subject_idx ON transactions (sep10_subject, asset_code, started_at DESC, id DESC);
CREATE INDEX transactions_project_id_idx ON transactions (project_id, started_at DESC, id DESC);

CREATE TABLE transaction_events (
    id             bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_id uuid        NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    from_status    text,
    to_status      text        NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX transaction_events_transaction_id_idx ON transaction_events (transaction_id, id);

-- One-time tokens in the SEP-24 interactive URL. Only the SHA-256 hash is stored.
CREATE TABLE interactive_tokens (
    token_hash     bytea       PRIMARY KEY,
    transaction_id uuid        NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
    expires_at     timestamptz NOT NULL,
    used_at        timestamptz
);

-- +goose Down
DROP TABLE interactive_tokens;
DROP TABLE transaction_events;
DROP TABLE transactions;
