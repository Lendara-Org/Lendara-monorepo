-- +goose Up
-- When the payment worker should next look at a pending_anchor or
-- pending_trust transaction. NULL means it is not waiting for the worker.
ALTER TABLE transactions ADD COLUMN next_attempt_at timestamptz;

CREATE INDEX transactions_due_idx ON transactions (next_attempt_at)
    WHERE status IN ('pending_anchor', 'pending_trust');

-- +goose Down
DROP INDEX transactions_due_idx;
ALTER TABLE transactions DROP COLUMN next_attempt_at;
