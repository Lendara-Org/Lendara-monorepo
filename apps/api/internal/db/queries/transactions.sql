-- name: CreateTransaction :one
INSERT INTO transactions (
    project_id, kind, status, asset_code, sep10_subject, stellar_account,
    memo, memo_type, fiat_currency, amount_in
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
)
RETURNING *;

-- name: GetTransaction :one
SELECT * FROM transactions WHERE id = $1;

-- name: GetTransactionForUpdate :one
SELECT * FROM transactions WHERE id = $1 FOR UPDATE;

-- name: ListTransactionsBySubject :many
-- SEP-24 GET /transactions: newest first, paging_id is exclusive.
SELECT t.* FROM transactions t
WHERE t.sep10_subject = @sep10_subject
  AND t.asset_code = @asset_code
  AND (sqlc.narg(kind)::text IS NULL OR t.kind = sqlc.narg(kind))
  AND (sqlc.narg(no_older_than)::timestamptz IS NULL OR t.started_at >= sqlc.narg(no_older_than))
  AND (sqlc.narg(paging_id)::uuid IS NULL OR (t.started_at, t.id) < (
      SELECT p.started_at, p.id FROM transactions p WHERE p.id = sqlc.narg(paging_id)))
ORDER BY t.started_at DESC, t.id DESC
LIMIT @max_results;

-- name: UpdateTransactionStatus :one
UPDATE transactions
SET status       = @status,
    message      = sqlc.narg(message),
    updated_at   = now(),
    completed_at = CASE WHEN @status = 'completed' THEN now() ELSE completed_at END
WHERE id = @id
RETURNING *;

-- name: CreateTransactionEvent :exec
INSERT INTO transaction_events (transaction_id, from_status, to_status) VALUES ($1, $2, $3);

-- name: ListTransactionEvents :many
SELECT * FROM transaction_events WHERE transaction_id = $1 ORDER BY id;
