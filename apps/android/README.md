# Domitara Android

Native **Android** client for Domitara, built with **Kotlin** and **Jetpack
Compose**. This replaces the former Expo/React Native app (`apps/mobile`). There
is no iOS app.

It talks to the same Go API (`apps/api`) over `/api/v1` with JWT bearer auth — no
backend changes are required. The server URL is chosen at login and, along with
the token, persisted on device (DataStore), so you stay signed in across
restarts.

## Stack

- Jetpack Compose + Material 3, Navigation-Compose
- MVVM (`ViewModel` + `StateFlow`), Kotlin coroutines
- Retrofit + OkHttp + kotlinx.serialization
- Coil (auth'd image loading), DataStore (session)
- Manual DI via `AppContainer` (no Hilt/KSP — keeps the build annotation-processor free)
- Toolchain: Gradle 9.3.1 + AGP 9.1.1 (built-in Kotlin 2.2.10), `compileSdk 36`, `minSdk 26`

## Prerequisites

- **JDK 17+** to run the build (AGP 9.1 minimum). The Gradle wrapper is included,
  so no system Gradle is needed.
- Android SDK with **platform 36** and an emulator or device. (CI and Android
  Studio provide this automatically.)

## Build & run

```bash
# From apps/android/ — install the debug app to a running emulator/device
./gradlew installDebug

# Or just assemble the APK
./gradlew assembleDebug

# Run the JVM unit tests (includes the panel-core geometry port)
./gradlew testDebugUnitTest
```

From the repo root you can also use [Task](https://taskfile.dev):
`task dev:android`, `task build:android`, `task test:android`.

## Connecting to the API

At login, enter your **Server URL**:

- **Android emulator** → `http://10.0.2.2:8080` (the emulator alias for the host's `localhost`)
- **Physical device** → your machine's LAN address, e.g. `http://192.168.1.50:8080`

Start the API first with `task dev:api` (and `task db:up && task db:seed` for data).

## Layout

```
app/src/main/java/com/domitara/
  data/        Retrofit service, DTOs, repositories, DataStore session, auth interceptor
  domain/      Kotlin port of the old packages/panel-core (computeSlots + geometry)
  di/          AppContainer (manual DI) + Compose wiring
  ui/          Compose screens + ViewModels, theme, navigation
```

## CI

`.github/workflows/android-checks.yml` runs `lintDebug testDebugUnitTest
assembleDebug` on every PR/push that touches `apps/android/`.
