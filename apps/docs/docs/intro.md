---
sidebar_position: 1
slug: /
---

# Introduction

Domitara is a self-hosted home inventory and management application — a modern replacement for Homebox.

![Domitara dashboard](/img/web/dashboard.png)

## Features

- **[Inventory tracking](./features/inventory)** — Catalog everything you own with photos, documents, purchase info, serial numbers, and free-form custom fields
- **[Locations & Labels](./features/locations-labels)** — Organize items by a room/container tree, and tag them with color-coded labels
- **[Asset IDs](./features/asset-ids)** — Auto-generated codes for physical items, ready for printed labels
- **[Maintenance](./features/maintenance)** — Reminders, recurring schedules, and a log of completed work — see [schedule ideas](./features/maintenance-schedules) for what to track
- **[Electrical panels](./features/electrical-panels)** — Map circuit breakers, subpanels, and floor plan areas, and print a breaker directory
- **[Homes & Members](./features/homes)** — Track multiple properties, invite members, and store home-level photos and documents
- **[Mobile app](./mobile)** — Native Android companion app (Kotlin / Jetpack Compose)
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
