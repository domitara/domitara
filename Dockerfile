# ---- Stage 1: Web Frontend ----
FROM node:22-alpine AS web-builder
WORKDIR /workspace
RUN corepack enable

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/docs/package.json ./apps/docs/
COPY packages/panel-core/package.json ./packages/panel-core/
RUN pnpm install --frozen-lockfile

# Build — Vite outputs to apps/api/internal/web/dist per vite.config.ts
COPY apps/web/ ./apps/web/
COPY packages/panel-core/ ./packages/panel-core/
RUN pnpm --filter @app/web build

# ---- Stage 2: Go API ----
FROM golang:1.25-alpine AS api-builder
ARG VERSION=dev
WORKDIR /app

COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download

COPY apps/api/ ./
COPY --from=web-builder /workspace/apps/api/internal/web/dist ./internal/web/dist

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w -X github.com/domitara/domitara/apps/api/internal/version.Version=${VERSION}" -o /bin/server ./cmd/server

# ---- Stage 3: Final ----
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
COPY --from=api-builder /bin/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
