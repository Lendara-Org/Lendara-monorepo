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
```

## Contributing

- Commit messages and PR titles follow [Conventional Commits](https://www.conventionalcommits.org): `type(scope): subject`.
  - Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `ci`.
  - Scopes: `api`, `web`, `sdk`, `widget`, `demo`, `repo`.
- `pnpm install` sets up a commit hook that validates the message; CI validates the PR title.
- Before opening a PR: `make lint typecheck test build`.
