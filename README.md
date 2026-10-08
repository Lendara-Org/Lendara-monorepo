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
