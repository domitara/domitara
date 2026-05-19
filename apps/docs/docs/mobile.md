---
sidebar_position: 3
---

# Mobile App

Domitara ships a native iOS and Android companion app built with Expo (React Native). It connects to your self-hosted Domitara server and provides on-the-go access to your inventory.

## Features

- Browse items, locations, and labels
- Scan QR asset labels with the device camera
- View and log maintenance records
- Map electrical panel breakers with the panel SVG viewer

## Getting started (development)

### Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io) (`corepack enable`)
- Expo Go app on your device, **or** a configured iOS simulator / Android emulator
- A running Domitara API (see [Installation](./getting-started/installation))

### Run locally

```bash
# From the repo root
pnpm install

# Start the Expo dev server (uses tunnel mode)
pnpm --filter @domitara/mobile start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS), or press `i`/`a` to open a simulator.

## Building with EAS

Production and preview builds are handled by [Expo Application Services (EAS)](https://docs.expo.dev/eas/).

### Setup

1. Install the EAS CLI: `npm install -g eas-cli`
2. Log in: `eas login`
3. Link the project: `eas init` (run once, inside `apps/mobile/`)

### Build profiles

| Profile | Description |
|---------|-------------|
| `development` | Debug build with dev client; iOS simulator-compatible |
| `preview` | Internal distribution build for testing on real devices |
| `production` | App Store / Play Store release build |

```bash
# From apps/mobile/
eas build --profile preview --platform all
```

### CI builds

The `expo-build` GitHub Actions workflow triggers automatically when `apps/mobile/` or `packages/panel-core/` changes:

- **Pull requests** → `development` profile
- **Pushes to `main`** → `preview` profile
- **Manual dispatch** → choose any profile

The workflow requires an `EXPO_TOKEN` secret in your GitHub repository settings. Generate one at [expo.dev/accounts](https://expo.dev/accounts) → Settings → Access Tokens.

## Connecting to your server

On first launch the app prompts for your server URL (e.g. `https://home.example.com`). Use HTTPS in production; plain HTTP works on the local network during development.
