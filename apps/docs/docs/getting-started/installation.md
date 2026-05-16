---
sidebar_position: 1
---

# Installation

## Prerequisites

- A PostgreSQL 15+ database
- Docker (recommended) **or** Go 1.23+ and Node.js 22+ to build from source

## Docker Compose (recommended)

Create a `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your-db-password
      POSTGRES_DB: domitara
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d domitara"]
      interval: 5s
      timeout: 5s
      retries: 5

  domitara:
    image: ghcr.io/domitara/domitara:latest
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://postgres:your-db-password@postgres:5432/domitara?sslmode=disable
      JWT_SECRET: replace-with-a-long-random-secret-at-least-32-chars
      ENV: production
    ports:
      - "8080:8080"

volumes:
  postgres_data:
```

Then run:

```bash
docker compose up -d
```

Open `http://localhost:8080` and complete the first-run setup wizard to create your admin account.

## Docker run (single container)

If you already have a Postgres instance:

```bash
docker run -d \
  --name domitara \
  -e DATABASE_URL="postgres://user:password@host:5432/domitara?sslmode=disable" \
  -e JWT_SECRET="replace-with-a-long-random-secret-at-least-32-chars" \
  -e ENV=production \
  -p 8080:8080 \
  ghcr.io/domitara/domitara:latest
```

The server runs database migrations automatically on startup.

## Building from source

```bash
# Clone the repo
git clone https://github.com/domitara/domitara.git
cd domitara

# Install JS dependencies
corepack enable
pnpm install

# Build the web frontend (output goes into apps/api/internal/web/dist)
pnpm --filter @app/web build

# Build the Go binary (embeds the web assets)
cd apps/api
go build -o /usr/local/bin/domitara ./cmd/server

# Run
DATABASE_URL=postgres://... JWT_SECRET=... domitara
```

## Available image tags

| Tag | Description |
|-----|-------------|
| `latest` | Latest stable release |
| `x.y.z` | Specific version |
| `x.y.z-amd64` | Architecture-specific build |
| `x.y.z-arm64` | Architecture-specific build |

Images are published to `ghcr.io/domitara/domitara` on every release.
