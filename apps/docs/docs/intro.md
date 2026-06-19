---
sidebar_position: 1
slug: /
---

# Introduction

Domitara is a self-hosted home inventory and management application — a modern replacement for Homebox.

## Features

- **Inventory tracking** — Catalog everything you own with photos, purchase info, and serial numbers
- **Locations** — Organize items by room and storage location
- **Labels** — Tag items for quick filtering
- **Asset IDs** — Generate and print QR code labels for physical items
- **Maintenance** — Log and schedule maintenance for appliances and equipment
- **Electrical panels** — Map circuit breakers and document your panel layouts
- **Mobile app** — Native Android companion app (Kotlin / Jetpack Compose)
- **Multi-user** — Admin and member roles with per-user access

## Quick start

The fastest way to run Domitara is with Docker:

```bash
docker run -d \
  -e DATABASE_URL=postgres://... \
  -e JWT_SECRET=your-secret \
  -p 8080:8080 \
  ghcr.io/domitara/domitara:latest
```

See [Installation](./getting-started/installation) for the full setup guide.
