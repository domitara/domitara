---
sidebar_position: 2
---

# Configuration

Domitara is configured entirely via environment variables. Copy `.env.example` to `.env` for local development, or set these as environment variables / Docker secrets in production.

## Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgres://user:pass@host:5432/domitara?sslmode=disable` |
| `JWT_SECRET` | Secret used to sign JWT session tokens. **Must be at least 32 characters.** Generate one with `openssl rand -hex 32`. |

## Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Port the HTTP server listens on |
| `ENV` | `development` | Set to `production` to enable secure cookies and hide API docs |
| `ALLOWED_ORIGINS` | *(empty)* | Comma-separated list of additional CORS origins to allow (e.g. `https://home.example.com`) |
| `SHOW_API_DOCS` | `false` | Set to `true` to expose `/openapi.json` and `/docs` in production |

## Production checklist

- Use a strong, randomly generated `JWT_SECRET` (at least 32 chars).
- Set `ENV=production` — this enables `Secure` on auth cookies and hides the OpenAPI schema endpoint.
- Run Postgres with a dedicated user that has only `SELECT`, `INSERT`, `UPDATE`, `DELETE` on the `domitara` database.
- Put the app behind a reverse proxy (nginx, Caddy, Traefik) that terminates TLS.
- Set `ALLOWED_ORIGINS` to your public domain so the CORS policy is tight.

## Example `.env`

```bash
DATABASE_URL=postgres://domitara:secret@localhost:5432/domitara?sslmode=disable
JWT_SECRET=a-very-long-random-string-you-generated-with-openssl
PORT=8080
ENV=production
ALLOWED_ORIGINS=https://home.example.com
```
