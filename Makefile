.PHONY: install db-up db-down

install:
	pnpm install

db-up:
	docker compose up -d --wait postgres

db-down:
	docker compose down
