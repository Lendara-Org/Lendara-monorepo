.PHONY: install db-up db-down lint typecheck test build

install:
	pnpm install

db-up:
	docker compose up -d --wait postgres

db-down:
	docker compose down

lint:
	pnpm lint

typecheck:
	pnpm typecheck

test:
	pnpm test

build:
	pnpm build
