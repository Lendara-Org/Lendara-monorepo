-include .env
export

API_DIR := apps/api
GO_TOOL := go tool -modfile=tools.mod
GOOSE   := $(GO_TOOL) goose -dir migrations postgres "$(DATABASE_URL)"

.PHONY: install db-up db-down dev-api migrate migrate-down migrate-reset migrate-status \
	lint lint-js lint-api lint-openapi codegen codegen-api codegen-sdk typecheck test test-js test-api vuln-api build build-js build-api

install:
	pnpm install

db-up:
	docker compose up -d --wait postgres

db-down:
	docker compose down

dev-api:
	cd $(API_DIR) && go run ./cmd/api

migrate:
	cd $(API_DIR) && $(GOOSE) up

migrate-down:
	cd $(API_DIR) && $(GOOSE) down

migrate-reset:
	cd $(API_DIR) && $(GOOSE) reset

migrate-status:
	cd $(API_DIR) && $(GOOSE) status

lint: lint-js lint-api lint-openapi

lint-js:
	pnpm lint

lint-openapi:
	pnpm exec redocly lint openapi.yaml

lint-api:
	cd $(API_DIR) && go mod tidy -diff
	cd $(API_DIR) && $(GO_TOOL) golangci-lint run ./...

typecheck:
	pnpm typecheck

test: test-js test-api

test-js:
	pnpm test

test-api:
	cd $(API_DIR) && go test -race -cover ./...

vuln-api:
	cd $(API_DIR) && $(GO_TOOL) govulncheck ./...

codegen: codegen-api codegen-sdk

codegen-api:
	cd $(API_DIR) && $(GO_TOOL) oapi-codegen -config oapi-codegen.yaml ../../openapi.yaml

codegen-sdk:
	pnpm --filter @lendara/sdk codegen

build: build-js build-api

build-js:
	pnpm build

build-api:
	cd $(API_DIR) && go build ./...
