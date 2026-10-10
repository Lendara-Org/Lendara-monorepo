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

Live sandbox: web at https://lendara-monorepo-fixh.vercel.app, API at https://lendaraweb-production.up.railway.app.

### API + Postgres on [Railway](https://railway.com)

The service builds `apps/api/Dockerfile`. The image includes `goose`, which runs the migrations before each deploy.

1. New project → **+ Create → Database → PostgreSQL**.
2. Add a service from this repo. In its **Settings**:
   - **Root Directory:** `/apps/api`
   - **Dockerfile Path:** `/apps/api/Dockerfile`
   - **Custom Start Command:** empty (the image's entrypoint runs the API)
   - **Pre-deploy Command:** `/app/goose up`
   - **Healthcheck Path:** `/health`
3. **Variables** (raw editor):

   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   GOOSE_DBSTRING=${{Postgres.DATABASE_URL}}
   PORT=8080
   API_BASE_URL=https://<api-domain>
   STELLAR_HOME_DOMAIN=<api-domain>
   WEB_BASE_URL=https://<web-domain>
   SEP10_JWT_SECRET=<openssl rand -hex 32>
   STELLAR_ISSUER_PUBLIC_KEY=<G...>
   STELLAR_DISTRIBUTION_SECRET=<S...>
   STELLAR_SIGNING_SECRET=<S...>
   ```

   The issuer secret is only needed by `make setup-testnet`; don't upload it.
4. **Settings → Networking → Generate Domain** on port `8080`.

On the free plan services must be serverless: the API and Postgres sleep when idle, so the first request after a while takes a few seconds.

### Web on [Vercel](https://vercel.com)

Import the repo with root directory `apps/web` and set:

```
NEXT_PUBLIC_API_BASE_URL=https://<api-domain>
ENABLE_EXPERIMENTAL_COREPACK=1
```

Corepack makes Vercel use the pnpm version in `package.json`. `NEXT_PUBLIC_*` values are inlined at build time: redeploy after changing them.

## Contributing

- Commit messages and PR titles follow [Conventional Commits](https://www.conventionalcommits.org): `type(scope): subject`.
  - Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`.
  - Scopes: `api`, `web`, `sdk`, `widget`, `demo`, `repo`.
- `pnpm install` sets up a commit hook that validates the message; CI validates the PR title.
- Before opening a PR: `make lint typecheck test build`.
