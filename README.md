# Lendara Sandbox

Embeddable fiat → USDC on-ramp for Stellar (testnet only, simulated fiat rails).

## Requirements

- Node.js 20+ with Corepack (pins pnpm from `packageManager`)
- Go 1.22+
- Docker with Compose

## Local setup

```bash
cp .env.example .env
make install
make db-up
make migrate
make dev-api   # http://localhost:8080/health
```

## Common commands

| Command | What it does |
|---|---|
| `make lint` | Lint JS/TS and Go (`golangci-lint`, `go mod tidy -diff`) |
| `make test` | Run all tests (Go integration tests need `TEST_DATABASE_URL`) |
| `make vuln-api` | Scan Go dependencies with `govulncheck` |
| `make migrate` / `make migrate-down` | Apply / roll back the latest DB migration |

Go tools (`goose`, `golangci-lint`, `govulncheck`) are pinned in `apps/api/tools.mod` and run with `go tool`; nothing to install globally.

## Contributing

- Commit messages and PR titles follow [Conventional Commits](https://www.conventionalcommits.org): `type(scope): subject`.
  - Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`.
  - Scopes: `api`, `web`, `sdk`, `widget`, `demo`, `repo`.
- `pnpm install` sets up a commit hook that validates the message; CI validates the PR title.
- Before opening a PR: `make lint typecheck test build`.
