-- name: CreateInteractiveToken :exec
INSERT INTO interactive_tokens (token_hash, transaction_id, expires_at) VALUES ($1, $2, $3);

-- name: ConsumeInteractiveToken :one
-- Marks an unused, unexpired token as used and returns its transaction.
UPDATE interactive_tokens
SET used_at = now()
WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
RETURNING transaction_id;
