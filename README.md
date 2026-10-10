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
make setup-testnet   # creates testnet accounts; paste the output into .env
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

## Deploy

**API + Postgres on [Railway](https://railway.com).** The service builds `apps/api/Dockerfile` (config in `apps/api/railway.toml`); migrations run with `goose` before each deploy.

1. New project → add a PostgreSQL database.
2. Add a service from this repo with root directory `/apps/api`.
3. Variables: the ones in `.env.example` under "API" and "Stellar testnet", plus:
   - `DATABASE_URL` and `GOOSE_DBSTRING` = `${{Postgres.DATABASE_URL}}`
   - `API_BASE_URL` = `https://<api-domain>`, `STELLAR_HOME_DOMAIN` = `<api-domain>`, `WEB_BASE_URL` = `https://<web-domain>`
   - A new `SEP10_JWT_SECRET` (`openssl rand -hex 32`). Don't set `PORT`: Railway sets it.
4. Generate a public domain for the service.

**Web on [Vercel](https://vercel.com).** Import the repo with root directory `apps/web` and set `NEXT_PUBLIC_API_BASE_URL` = `https://<api-domain>` and `ENABLE_EXPERIMENTAL_COREPACK=1` (so Vercel uses the pnpm version in `package.json`).

## Contributing

- Commit messages and PR titles follow [Conventional Commits](https://www.conventionalcommits.org): `type(scope): subject`.
  - Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`.
  - Scopes: `api`, `web`, `sdk`, `widget`, `demo`, `repo`.
- `pnpm install` sets up a commit hook that validates the message; CI validates the PR title.
- Before opening a PR: `make lint typecheck test build`.
