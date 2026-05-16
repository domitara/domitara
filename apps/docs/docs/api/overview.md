---
sidebar_position: 1
---

# API Overview

Domitara exposes a REST API at `/api/v1`. All request and response bodies are JSON.

## Authentication

The API supports two authentication methods:

- **Cookie (browser)** — A `POST /api/v1/auth/login` sets an httpOnly `token` cookie. Subsequent requests from the browser send this cookie automatically.
- **Bearer token (API clients)** — Pass the JWT from the login response as `Authorization: Bearer <token>`.

Most endpoints require authentication. The `/health`, `/api/v1/system/status`, and `/api/v1/system/setup` endpoints are public.

## Interactive docs

When `SHOW_API_DOCS=true` (or in development), the full OpenAPI schema and Swagger UI are available at:

- `GET /openapi.json` — OpenAPI 3.1 schema
- `GET /docs` — Swagger UI

## Endpoints

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Liveness check, returns `{"status":"ok"}` |

### System

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/system/status` | — | Returns `{"setup_complete": bool}` — used by the frontend to redirect to setup on first run |
| POST | `/api/v1/system/setup` | — | Creates the first admin account. Fails with 403 if setup is already complete. |

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/login` | — | Accepts `{email, password}`, returns user and sets auth cookies |
| POST | `/api/v1/auth/logout` | — | Clears auth cookies |
| GET | `/api/v1/auth/me` | Required | Returns the current user |
| PATCH | `/api/v1/auth/me` | Required | Update name or password for the current user |

### Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/dashboard` | Required | Returns aggregate counts: items, locations, labels, total value |

### Locations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/locations` | Required | List all locations with item counts |
| POST | `/api/v1/locations` | Required | Create a location |
| GET | `/api/v1/locations/{id}` | Required | Get a single location |
| PUT | `/api/v1/locations/{id}` | Required | Replace a location |
| DELETE | `/api/v1/locations/{id}` | Required | Delete a location |

### Labels

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/labels` | Required | List all labels |
| POST | `/api/v1/labels` | Required | Create a label |
| PUT | `/api/v1/labels/{id}` | Required | Update a label |
| DELETE | `/api/v1/labels/{id}` | Required | Delete a label |

### Items

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/items` | Required | List items; filter by `?location_id=` or `?label_id=` |
| POST | `/api/v1/items` | Required | Create an item |
| GET | `/api/v1/items/{id}` | Required | Get a single item with labels |
| PUT | `/api/v1/items/{id}` | Required | Replace an item |
| DELETE | `/api/v1/items/{id}` | Required | Delete an item |

### Maintenance

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/maintenance` | Required | List maintenance logs; filter by `?item_id=` |
| POST | `/api/v1/maintenance` | Required | Create a maintenance log |
| DELETE | `/api/v1/maintenance/{id}` | Required | Delete a maintenance log |

### Admin

These endpoints require the `admin` role.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/admin/users` | Admin | List all users |
| PUT | `/api/v1/admin/users/{id}` | Admin | Update a user's name or role |
| DELETE | `/api/v1/admin/users/{id}` | Admin | Delete a user (cannot delete yourself) |

## Rate limits

- All endpoints: 100 requests/minute per IP
- `POST /api/v1/auth/login`: 5 requests/minute per IP
