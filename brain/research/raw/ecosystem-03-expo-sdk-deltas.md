# ecosystem-03 — Expo SDK 54 → 55 → 56 Deltas (what actually changed)

> Window: Sept 2025 → June 2026. Three SDK majors. The agent's training likely stopped at SDK 53;
> everything here is news.

## SDK 54 (2025-09-10) — "the last off-ramp"

RN 0.81 + React 19.1. **The final SDK that supports the Legacy Architecture.** If a project must
stay on old arch, SDK 54 is the terminal version — there is no upgrade path that keeps it.

Breaking / notable:
- First-party **JSC removed** from RN (Hermes only, or community-JSC).
- `expo-file-system` legacy API moved to **`expo-file-system/legacy`** (the new FS API is the default
  import; old code must change its import path).
- **Reanimated v4 = New-Architecture-only** — pulling reanimated v4 into an old-arch project breaks it.
- **Precompiled iOS XCFrameworks** ship alongside source (huge clean-build speedup, opt-in).
- Min **Xcode 16.1** (26 recommended), min **Node 20.19.4**.
- RN's built-in **`SafeAreaView` deprecated** → use `react-native-safe-area-context`.
- `expo-av` removal *announced* for SDK 55.

Source: [expo.dev/changelog/sdk-54](https://expo.dev/changelog/sdk-54).

## SDK 55 (2026-02-25) — "the point of no return"

RN 0.83 + React 19.2. **Legacy Architecture removed. `newArchEnabled` config option deleted from
app.json.** New Architecture is mandatory and cannot be disabled.

Breaking / notable:
- **`eas update` now requires the `--environment` flag** — a non-interactive-script breakage; any
  CI/agent calling `eas update` without `--environment` fails. (See `ecosystem-05` + `ecosystem-11`.)
- **`expo-av` removed from Expo Go** → migrate to **`expo-video`** + **`expo-audio`**.
- **Edge-to-edge mandatory on Android 16+**; `edgeToEdgeEnabled` config removed (Google removed the
  opt-out in Android 16). Layouts must handle insets or content draws under system bars.
- App-config eval toolchain changed: **`app.config.ts` now uses your installed TypeScript** (could
  surface type errors that were previously swallowed).
- Min **Xcode 26**; min Node `^20.19.4 / ^22.13.0 / ^24.3.0 / ^25.0.0`.

New packages / APIs:
- **`expo-brownfield`** — add Expo to an existing native app (integrated + isolated approaches). Big
  for the "embed a pebble screen inside a host native app" story.
- **`expo-widgets`** — iOS home-screen widgets + Live Activities (alpha).
- **`expo-server`** — replaces `@expo/server`; deployment adapters.
- **`expo-contacts/next`, `expo-media-library/next`, `expo-calendar/next`** — new object-oriented APIs.
- **Hermes bytecode diffing** → **~75% smaller OTA update downloads** (opt-in on SDK 55).
- New default template: **Native Tabs API** + **`/src`** folder structure.
- Enhanced Expo Router: Colors API, Apple Zoom transitions, `Stack.Toolbar`, experimental SplitView.

Source: [expo.dev/changelog/sdk-55](https://expo.dev/changelog/sdk-55).

## SDK 56 (2026-05-20) — "Expo UI grows up + builds get faster"

RN 0.85 + React 19.2. Current latest (`expo@56.0.11` as of 2026-06-11).

Headline:
- **Expo UI stabilized.** The **SwiftUI (iOS)** and **Jetpack Compose (Android)** native-primitive
  APIs are now stable and in the **default `create-expo-app` template**; primitives available in
  Expo Go. Universal components: `Host, Row, Column, ScrollView, Text, TextInput, Button, Switch,
  Slider, Checkbox, BottomSheet`.
- **Drop-in community-library replacements** (use Expo UI instead of these third-party libs):
  `@gorhom/bottom-sheet`, `@react-native-community/datetimepicker`, masked-view, menu, pager-view,
  picker, segmented-control, slider.
- **Build speed:** prebuilt XCFrameworks for complex Expo modules → median clean iOS build **~-1 min
  (~16%)**. Opt-in **`android.usePrecompiledHeaders`** → `:app:buildCMakeDebug` **17m10s → 6m06s**.
- **Inline modules** — define Expo native modules **directly inside your project** (no separate
  package), lowering the bar to experiment with native code.

Source: [expo.dev/changelog/sdk-56](https://expo.dev/changelog/sdk-56) ·
[Onix React "What's New in SDK 56"](https://medium.com/@onix_react/whats-new-in-expo-sdk-56-63f704fc8426) (May 2026).

## ⚠️ The Expo Go App-Store policy shift (May 2026) — load-bearing for an agent

This is the single most important operational change for anyone scripting RN dev in 2026:

- **As of 2026-05-04, Expo Go for SDK 55 was stuck in Apple App Store approval with no timeline.**
- Expo now officially frames **Expo Go as "an educational tool for beginners"** and **discourages it
  for production.**
- **Expo Go on the App Store tracks only the latest fully-approved SDK** (SDK 54 at that time).
  Apple does not allow side-loading older app versions on iPhone, so you **cannot** install an older
  Expo Go to match an older SDK on a physical iPhone.
- To run **SDK 55 / 56** on iOS you must use: **TestFlight External Beta**, **`eas go` custom builds**,
  or the **iOS Simulator**.
- **Recommended path for any real project: development builds (`expo-dev-client`)**, not Expo Go.

Source: [expo.dev/changelog/expo-go-and-app-store-may-2026](https://expo.dev/changelog/expo-go-and-app-store-may-2026).

### Why this matters to the pebble harness
An agent that assumes "just open Expo Go to test" is operating on a 2024 mental model. On iOS with a
current SDK, **the default testing surface is a development build**, not Expo Go. The harness should
default to scaffolding a **dev client** and an EAS dev build, and only use Expo Go for the most
trivial SDK-54-era learning demos.

## Expo Go vs Development Build — the decision rule

| Situation | Use |
|---|---|
| Learning / tiny JS-only demo on SDK 54 | Expo Go (fine) |
| Any native lib not bundled in Expo Go | **Development build** (required) |
| Custom app name/icon, URL schemes, background modes, push on a real device | **Development build** |
| SDK 55/56 on a physical iPhone | **Development build** (Expo Go for new SDKs is gated by Apple review) |
| Production app | **Development build** → EAS Build → store |

> **After upgrading SDK, you MUST create a new development build** (the native layer changed). A stale
> dev client against a new JS bundle is a classic "white screen / native module not found" failure.
Source: [docs.expo.dev/develop/development-builds/introduction](https://docs.expo.dev/develop/development-builds/introduction/),
[expo.dev/blog/expo-go-vs-development-builds](https://expo.dev/blog/expo-go-vs-development-builds).

## "Could not confirm"
- Whether Expo Go for SDK 55/56 eventually cleared Apple review *after* 2026-05-04 (the changelog
  entry was a snapshot of an in-flight situation; a later resolution may exist but wasn't in the
  sources read).
