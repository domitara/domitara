---
sidebar_position: 3
---

# Mobile App

Domitara ships a native **Android** companion app built with **Kotlin** and
**Jetpack Compose**. It connects to your self-hosted Domitara server and provides
on-the-go access to your inventory. (There is no iOS app.)

## Features

- Browse items, locations, and labels
- View and log maintenance records
- Map electrical panel breakers with the panel viewer
- Manage home details, photos, documents, and members

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
