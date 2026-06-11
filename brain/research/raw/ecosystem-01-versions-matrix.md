# ecosystem-01 — Canonical Tool Versions + 6-Month Changelog Deltas

> **All version numbers below are npm ground truth, captured via `npm view <pkg> version` on
> 2026-06-11.** Re-run before quoting in production — these are perishable.

## The npm-verified version table (2026-06-11)

| Package | `latest` on npm | Notes / dist-tags |
|---|---|---|
| `react-native` | **0.86.0** | published 2026-06-09; `next`=0.86.0-rc.3, `nightly`=0.87.0-nightly-20260608 |
| `expo` | **56.0.11** | = SDK 56; `sdk-56`, `sdk-55`=55.0.26, `sdk-54`=54.0.35, `canary`=57.0.0-canary |
| `expo-router` | **56.2.10** | versioned in lockstep with SDK 56 |
| `eas-cli` | **20.1.0** | the EAS command-line tool (separate release cadence from SDK) |
| `@expo/cli` | **56.1.15** | the local `npx expo` CLI (bundled with the `expo` package) |
| `expo-notifications` | **56.0.17** | |
| `expo-updates` | **56.0.19** | the OTA runtime library |
| `expo-dev-client` | **56.0.20** | custom dev client |
| `expo-application` | **56.0.3** | |
| `@react-navigation/native` | **7.3.1** | React Navigation v7 line |
| `react-native-reanimated` | **4.4.1** | **v4 = New-Architecture-only** (see gotcha below) |
| `react-native-screens` | **4.25.2** | |
| `react-native-gesture-handler` | **3.0.1** | **major bump to v3** since training (was v2.x) |
| `react-native-safe-area-context` | **5.8.0** | RN's own `SafeAreaView` is deprecated → use this |
| `@shopify/flash-list` | **2.3.2** | **FlashList v2 is a rewrite** (no `estimatedItemSize` needed) |

### How `expo` package version maps to "SDK version"

The `expo` npm package major === the SDK number. `expo@56.x` = "SDK 56". Sub-packages
(`expo-router`, `expo-notifications`, …) are *also* majored to the SDK (so `expo-router@56.x`
pairs with SDK 56). This is why you almost never pin sub-packages by hand — `npx expo install`
picks the SDK-correct version for you.

## Release-date timeline (npm `time` field, authoritative)

**React Native** (`npm view react-native time`):
| Version | Published |
|---|---|
| 0.82.0 | 2025-10-08 |
| 0.83.0 | 2025-12-10 |
| 0.84.0 | 2026-02-11 |
| 0.85.0 | 2026-04-07 |
| 0.86.0 | **2026-06-09** |

**Expo SDK** (`npm view expo time`, first stable of each major):
| SDK | First stable | Bundles |
|---|---|---|
| 54.0.0 | 2025-09-10 | RN 0.81 + React 19.1 |
| 55.0.0 | 2026-02-25 | RN 0.83 + React 19.2 |
| 56.0.0 | **2026-05-20** | RN 0.85 + React 19.2 |

> Cadence: Expo ships ~2 majors/year, trailing an RN minor by ~1. SDK 57 is in `canary`
> (`57.0.0-canary-…`) as of June 2026, expected ~Sept/Oct 2026 (will likely bundle RN 0.86).

## 6-month changelog deltas (Dec 2025 → Jun 2026), per tool

### React Native: 0.83 → 0.86
- **0.83 (2025-12-10):** React 19.2; "first RN release with **no user-facing breaking changes**";
  big RN DevTools improvements; Web Performance + Intersection Observer APIs (canary). Source:
  [reactnative.dev/blog/2025/12/10/0.83](https://reactnative.dev/blog) ·
  [drcsystems RN 0.83](https://www.drcsystems.com/blogs/whats-new-in-react-native-0-83-latest-features-you-should-know/).
- **0.84 (2026-02-11):** **Hermes V1 becomes the default JS engine** (perf win across the board);
  **precompiled iOS binaries by default**; further Legacy-Architecture removal on iOS+Android;
  **min Node bumped to 22**. Source: [reactnative.dev/blog 0.84](https://reactnative.dev/blog).
- **0.85 (2026-04-07):** **New Animation Backend**; **Jest preset moved to a dedicated package**
  (breaking — must install separately); **TLS support in Metro**; `StyleSheet.absoluteFillObject`
  **removed** (breaking); drops EOL Node versions. Source: [reactnative.dev/blog 0.85](https://reactnative.dev/blog) ·
  [reactnativecrossroads 0.85 dive](https://reactnativecrossroads.com/posts/react-native-085-changelog-dive/).
- **0.86 (2026-06-09):** Published to npm `latest` but **full release blog/GitHub-release not yet
  posted** as of 2026-06-11 (only RCs are GitHub-tagged; CHANGELOG.md has it). Confirmed deltas:
  `Pressable` `android_ripple` now accepts `PlatformColor` + alpha (Android); RN DevTools Hermes V1
  bump fixing missing JS samples in the Performance panel on Apple platforms; CocoaPods RCTDefines.h
  prebuilt-umbrella loading fix. Source:
  [facebook/react-native CHANGELOG.md](https://github.com/facebook/react-native/blob/main/CHANGELOG.md) ·
  [reactwg/react-native-releases #1311](https://github.com/reactwg/react-native-releases/issues/1311) (2026).
  **AGENT GOTCHA:** `npm view react-native version` can be *ahead* of the blog. Don't conclude
  "0.86 doesn't exist" from a blog check alone — npm is the source of truth for availability.

### Expo SDK: 54 → 55 → 56
- **SDK 54 (2025-09-10):** RN 0.81 + React 19.1. **Last SDK that supports Legacy Architecture.**
  First-party JSC support removed from RN. `expo-file-system` legacy API → `expo-file-system/legacy`.
  **Reanimated v4 = New-Arch-only.** Precompiled iOS XCFrameworks ship alongside source (RNTester
  clean build ~120s→~10s on M4 Max). Min Xcode 16.1 (26 recommended). Min Node 20.19.4. RN's
  `SafeAreaView` deprecated. Source: [expo.dev/changelog/sdk-54](https://expo.dev/changelog/sdk-54).
- **SDK 55 (2026-02-25):** RN 0.83 + React 19.2. **Legacy Architecture removed; `newArchEnabled`
  config option eliminated from app.json.** `eas update` now **requires `--environment`** flag.
  `expo-av` removed from Expo Go (use `expo-video` + `expo-audio`). **Edge-to-edge mandatory on
  Android 16+** (`edgeToEdgeEnabled` removed). Min Xcode **26**. Min Node `^20.19.4/^22.13.0/^24.3.0/^25.0.0`.
  New: `expo-brownfield`, `expo-widgets` (iOS widgets + Live Activities, alpha), `expo-server`
  (replaces `@expo/server`), `expo-contacts/next`, `expo-media-library/next`, `expo-calendar/next`.
  **Hermes bytecode diffing → ~75% smaller OTA update downloads (opt-in).** Hermes v1 opt-in
  (requires building RN from source on SDK 55). New default template uses Native Tabs + `/src`.
  Source: [expo.dev/changelog/sdk-55](https://expo.dev/changelog/sdk-55).
- **SDK 56 (2026-05-20):** RN 0.85 + React 19.2. **Expo UI (SwiftUI iOS + Jetpack Compose Android)
  stabilized** and added to the default `create-expo-app` template; native UI primitives available
  in Expo Go. Drop-in replacements for `@gorhom/bottom-sheet`, `@react-native-community/datetimepicker`,
  masked-view, menu, pager-view, picker, segmented-control, slider. **Prebuilt XCFrameworks for
  complex Expo modules → median clean iOS build ~-1 min (~16%).** Opt-in `android.usePrecompiledHeaders`
  → `:app:buildCMakeDebug` 17m10s→6m06s. **Inline modules** (define Expo native modules inside your
  project). Source: [expo.dev/changelog/sdk-56](https://expo.dev/changelog/sdk-56) ·
  [Onix React "What's New in SDK 56"](https://medium.com/@onix_react/whats-new-in-expo-sdk-56-63f704fc8426) (May 2026).

### EAS CLI: now at 20.1.0
- `eas-cli` releases on its own cadence (not tied to SDK). Major version 20 line as of June 2026.
- The big EAS-platform deltas in this window were **server-side**, not CLI-version-gated: Expo MCP
  Server (query EAS builds + TestFlight crashes), the official `expo/skills` agent-skills repo, and
  Hermes bytecode diffing for Updates. See `ecosystem-05` + `ecosystem-11`. Source:
  [expo.dev/changelog/sdk-55](https://expo.dev/changelog/sdk-55).

### Supporting libraries (the ones that break builds)
- **react-native-reanimated 4.4.1** — **v4 dropped Legacy Architecture entirely.** If a project is
  pre-New-Arch, reanimated v4 will not run. (This is the single most common "why won't it build"
  on older projects.) Source: [expo.dev/changelog/sdk-54](https://expo.dev/changelog/sdk-54).
- **react-native-gesture-handler 3.0.1** — major v3 (was v2.x in my training). Pairs with reanimated v4.
- **@shopify/flash-list 2.3.2** — **FlashList v2 is a ground-up rewrite for the New Architecture**;
  it **no longer needs `estimatedItemSize`** (auto-sizing). Migrating v1→v2 removes that prop.
- **react-native-safe-area-context 5.8.0** — the canonical safe-area provider now that RN's built-in
  `SafeAreaView` is deprecated.
- **@react-navigation/native 7.3.1** — React Navigation v7 (static API + improved typing). Note Expo
  Router is built *on top of* React Navigation, so for Expo apps you typically use expo-router, not
  raw React Navigation.

## "Could not confirm" in this file
- The **full** RN 0.86.0 changelog (the release blog had not been published at capture time; only
  the npm tarball + partial CHANGELOG.md fragments + RC notes were available).
- Exact `eas-cli` 20.x changelog deltas by patch (EAS CLI doesn't publish a marketing changelog per
  patch the way SDKs do; deltas tracked in the GitHub repo's CHANGELOG).
