# ecosystem-05 — EAS Build / Submit / Update (OTA)

> `eas-cli@20.1.0` (npm-verified 2026-06-11). EAS = Expo Application Services: cloud Build,
> store Submit, and Update (OTA). The CLI releases on its own cadence, independent of the SDK.

## The three services in one sentence each

- **EAS Build** — compiles your iOS/Android native app in the cloud from a **build profile** in `eas.json`.
- **EAS Submit** — uploads a built binary to **TestFlight / App Store Connect** and **Google Play Console**.
- **EAS Update** — pushes **JS + asset** OTA updates to installed builds via **channels/branches**,
  *without* a native rebuild (when the runtime version matches).

## eas.json build profiles

The three canonical profiles (`development` / `preview` / `production`). Minimal representative file:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

Key fields:
- **`developmentClient: true`** → produces a build that contains the **expo-dev-client** runtime
  (the dev menu / JS-bundle-loading dev build). Only on the `development` profile.
- **`distribution`**: `"internal"` = installable directly on devices (ad hoc / enterprise / internal
  link) **without** going through a store; `"store"` = signed for store submission.
- **`channel`**: ties the build to an **EAS Update channel** (see below). `eas update:configure`
  auto-sets `channel` on the `preview` and `production` profiles.

Source: [docs.expo.dev/build/eas-json](https://docs.expo.dev/build/eas-json/).

## EAS Update: channels, branches, runtimeVersion

### Channel vs Branch
- A **channel** is a property *on a build* that says "which updates do I accept." Publishing to the
  `preview` channel updates preview builds without touching production.
- A **branch** is created when you publish; the channel name locates the correct branch. (Analogy in
  the docs: like a Git branch — every published update is a "commit" on a branch.)
- **Channels map to build profiles:** `eas update:configure` writes the `channel` onto the `preview`
  and `production` profiles so a `preview` build pulls `preview`-channel updates.

Source: [docs.expo.dev/eas-update/getting-started](https://docs.expo.dev/eas-update/getting-started/).

### runtimeVersion — the OTA safety gate
`runtimeVersion` guarantees a JS update is **compatible with a build's native layer**. An OTA update
is only delivered to builds whose `runtimeVersion` matches. **Policies** (auto-derive it):

| Policy | Behavior |
|---|---|
| `appVersion` | RV tracks the app version string; bumps when you change `version` |
| `nativeVersion` | RV tracks the native build number |
| `sdkVersion` | RV tracks the Expo SDK version |
| **`fingerprint`** | **RV increments whenever *anything that affects the native runtime* changes** — maximal safety |

**Use `fingerprint`** when you want incompatible OTA updates to be "extremely unlikely" — it forces a
new native build whenever a native dependency changes, so a JS-only update can never land on a build
that lacks the native code it needs. Trade-off: you rebuild natively more often. Source:
[docs.expo.dev/eas-update/runtime-versions](https://docs.expo.dev/eas-update/runtime-versions/).

> **The OTA failure mode an agent must prevent:** if two builds share `runtimeVersion "1.0.0"` but
> one was built *before* a new native lib was added, an OTA update that uses that native lib will
> reach the older build and crash. `fingerprint` policy prevents exactly this by changing the RV when
> native deps change. Source: [docs.expo.dev/eas-update/runtime-versions](https://docs.expo.dev/eas-update/runtime-versions/).

### Publishing an OTA update (the command — note the mandatory flag)

```sh
eas update --channel production --message "Fix checkout crash" --environment production
```

**⚠️ Since Expo SDK 55, `eas update` REQUIRES `--environment`.** A script/agent that omits it will
fail. This is the #1 EAS-Update CI breakage in the 2026 window. Source:
[expo.dev/changelog/sdk-55](https://expo.dev/changelog/sdk-55).

### Hermes bytecode diffing (SDK 55+)
OTA download sizes dropped **~75%** via Hermes bytecode diffing (opt-in on SDK 55). Materially cheaper
+ faster updates for users on metered connections. Source:
[expo.dev/changelog/sdk-55](https://expo.dev/changelog/sdk-55).

## What an OTA update CAN and CANNOT change

| Can change via OTA (no rebuild) | Requires a native rebuild |
|---|---|
| JS/TS application code | Adding/removing a native module |
| Images and other JS-bundled assets | Changing app name, icon, bundle id |
| Most React component changes | Native permissions / `Info.plist` / `AndroidManifest` |
| Config that lives in JS | Bumping the Expo SDK / RN version |

If you change anything in the right column, an OTA update is **not** enough — you must `eas build`
again and (usually) bump the runtime version.

## Build-speed levers (2026)
- **Precompiled iOS binaries / XCFrameworks** (RN 0.84 default; SDK 56 prebuilt complex modules) cut
  clean iOS build minutes substantially — directly lowers EAS Build cost.
- **`android.usePrecompiledHeaders`** (SDK 56, opt-in) cut `:app:buildCMakeDebug` 17m→6m.
- **Use `--no-wait`** to fire a build and not block; poll status separately (see `ecosystem-11`).

Source: [expo.dev/changelog/sdk-56](https://expo.dev/changelog/sdk-56).

## EAS + AI tooling (relevant to an agent harness)
- **Expo MCP Server** — query EAS services and **TestFlight crashes** programmatically (SDK 55 era).
- **`expo/skills`** — an official Expo repo of **agent skills for Claude Code / AI agents** to drive
  Expo/EAS. The pebble harness should ingest this directly. Source:
  [expo.dev/changelog/sdk-55](https://expo.dev/changelog/sdk-55). (See `ecosystem-09` + `ecosystem-11`.)

## "Could not confirm"
- The exact list of `eas-cli@20.x` per-patch changes (EAS CLI doesn't ship a marketing changelog;
  the GitHub repo CHANGELOG is the source).
- Whether `--environment` is required on **all** `eas update` invocations or only when an
  environment-scoped config exists (the SDK 55 note says "requires"; verify against current
  `docs.expo.dev/eas-update` before hard-coding it into every script).
