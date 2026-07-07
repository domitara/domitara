---
sidebar_position: 3
---

# Mobile App

Domitara ships a native **Android** companion app built with **Kotlin** and
**Jetpack Compose**. It connects to your self-hosted Domitara server and provides
on-the-go access to your inventory. (There is no iOS app.)

![Android dashboard](/img/mobile/dashboard.png)

## Features

- Bottom navigation for **Dashboard**, **Items**, **Search**, **Locations**, and **Labels**,
  plus a menu drawer for **Home**, **Maintenance**, **Electrical Panels**, and **Asset IDs**
- Browse, add, and edit items — including photos, notes, and custom fields — with live
  server-side search
- Browse locations and labels, and drill into either to see the items inside
- View reminders, recurring [maintenance schedules](./features/maintenance), and completed
  logs
- Map electrical panel breakers with the panel viewer
- Manage home details, photos, documents, members, and floor plans

![Android maintenance screen](/img/mobile/maintenance.png)

## Feature parity with the web app

The Android app mirrors the web app closely, with a couple of known gaps as of this writing:

- **Admin Settings** (instance-wide settings, user management) is web-only — there's no admin
  surface on Android yet.
- **Asset IDs** on Android is a placeholder screen ("QR code scanning is coming soon"); the web
  app's [Asset IDs](./features/asset-ids) screen is currently the functional one.
- **Creating a new home** (the setup wizard) is web-only; Android can switch between homes you
  already have but not create one.

Everything else — items, locations, labels, maintenance, electrical panels, and home
photos/documents/members — works the same on both.

## Getting started (development)

### Prerequisites

- JDK 17 or 21 (the Android Gradle Plugin does not yet support newer JDKs)
- Android SDK with platform 35 and an emulator or physical device
- A running Domitara API (see [Installation](./getting-started/installation))

The project lives at `apps/android/` and uses the Gradle wrapper, so you do not
need a system-wide Gradle install.

### Run locally

```bash
# From apps/android/ — build & install the debug app to a running emulator/device
./gradlew installDebug
```

Or from the repo root with [Task](https://taskfile.dev):

```bash
task dev:android
```

When the app prompts for a **Server URL**, point it at your API:

- **Android emulator** → `http://10.0.2.2:8080` (the emulator's alias for the host machine's `localhost`)
- **Physical device** → your machine's LAN address, e.g. `http://192.168.1.50:8080`

Plain HTTP works on the local network during development; use HTTPS in production.

## Building a release

```bash
# From apps/android/
./gradlew assembleRelease
```

A signed release build additionally requires a keystore and signing config (not
committed). The `android-checks` GitHub Actions workflow runs `lint`, `test`,
and `assembleDebug` on every pull request that touches `apps/android/`.

## Connecting to your server

On first launch the app prompts for your server URL, email, and password. The
token is persisted on device, so you stay signed in across restarts. Use HTTPS
in production; plain HTTP works on the local network during development.
