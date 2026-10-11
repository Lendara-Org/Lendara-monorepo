-- +goose Up
-- Project API keys. Only the SHA-256 of the key is stored; the full key is
-- shown once, when the project is created.
CREATE TABLE api_keys (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid        NOT NULL REFERENCES projects (id),
    key_hash   bytea       NOT NULL UNIQUE,
    -- Start of the key (lnd_test_XXXX), to recognize it in the dashboard.
    key_prefix text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX api_keys_project_id_idx ON api_keys (project_id);

-- +goose Down
DROP TABLE api_keys;
