-- name: CreateProject :one
INSERT INTO projects (name) VALUES ($1) RETURNING *;

-- name: GetProject :one
SELECT * FROM projects WHERE id = $1;

-- name: CreateAPIKey :exec
INSERT INTO api_keys (project_id, key_hash, key_prefix) VALUES ($1, $2, $3);

-- name: GetProjectIDByAPIKey :one
SELECT project_id FROM api_keys WHERE key_hash = $1;
