# syntax=docker/dockerfile:1

# Build context: apps/api
FROM golang:1.27.2-alpine AS build
WORKDIR /src

COPY go.mod go.sum tools.mod tools.sum ./
RUN go mod download && go mod download -modfile=tools.mod

COPY . .
ENV CGO_ENABLED=0
RUN go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
 && go build -trimpath -ldflags="-s -w" -modfile=tools.mod -o /out/goose github.com/pressly/goose/v3/cmd/goose

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=build /out/api /out/goose ./
COPY migrations ./migrations
# goose reads these; GOOSE_DBSTRING comes from the platform (the database URL).
ENV GOOSE_DRIVER=postgres GOOSE_MIGRATION_DIR=/app/migrations
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/app/api"]
