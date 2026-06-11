# ecosystem-02 — React Native: Current State, New Architecture, Hermes V1

## The headline the agent must internalize

**The New Architecture is no longer "the future" — it is the only architecture.** Any mental model
that treats the bridge / old arch as a fallback is wrong as of 2026. There is no `newArchEnabled:
false` escape hatch in current Expo SDKs (55+) or RN (0.82+ removed the disable option; 0.83+
removed the legacy code).

## The Legacy-Architecture freeze → removal timeline (authoritative)

Source: [reactwg/react-native-new-architecture Discussion #290 "Freezing the Legacy Architecture"](https://github.com/reactwg/react-native-new-architecture/discussions/290)
and [react-native-community/discussions-and-proposals PR #929 (RFC0929)](https://github.com/react-native-community/discussions-and-proposals/pull/929).

| RN version | Date | Legacy-Arch status |
|---|---|---|
| 0.76 | 2024 | New Architecture becomes the **default** (still opt-out-able) |
| 0.80 | 2025-06-12 | Warnings/logs guide devs away from Legacy Arch; deprecation warnings for deep imports from `react-native` |
| **Frozen** | **2025-06-02** | No new dev/backports; PRs touching Legacy Arch closed (except security/critical); no longer tested in releases |
| 0.81 | 2025-08-12 | Legacy Arch drops to "best effort" testing only |
| **0.82** | 2025-10-08 | **First version to REMOVE the option to disable the New Architecture** (the `newArchEnabled=false` toggle is gone) |
| **0.83** | 2025-12-10 | Legacy Architecture **removed from the codebase**; pairs with Expo SDK 55 |
| 0.84 | 2026-02-11 | Further Legacy-Arch component removal on iOS+Android continues |

> **"Frozen" vs "removed":** *Frozen* (June 2025) = code still present but no dev/tests. *Disable
> option removed* (0.82) = you can no longer turn New Arch off. *Removed* (0.83) = the legacy code
> is deleted. These are three distinct milestones — don't conflate them.

> **Interop layers persist longer than the legacy core.** Old-arch *native modules* can still run
> via the interop layer even after the legacy renderer is gone — but this is a migration bridge,
> not a supported steady state. Libraries that haven't migrated will eventually break.

## Hermes V1 (the JS engine story)

- **RN 0.84 (2026-02-11): Hermes V1 became the default JavaScript engine.** This is a significant
  perf upgrade across all apps. Source: [reactnative.dev/blog 0.84](https://reactnative.dev/blog).
- On **Expo SDK 55**, Hermes v1 was **opt-in and required building RN from source**. By **SDK 56
  (RN 0.85)** the default-Hermes-V1 from RN 0.84 flows through. Source:
  [expo.dev/changelog/sdk-55](https://expo.dev/changelog/sdk-55).
- First-party **JSC (JavaScriptCore) support was removed from RN in 0.81 / Expo SDK 54.** Hermes is
  the path; JSC is community-maintained only. Source: [expo.dev/changelog/sdk-54](https://expo.dev/changelog/sdk-54).
- RN 0.86 (2026-06-09) shipped an RN-DevTools fix that **bumped Hermes V1 to fix missing JS samples
  in the Performance panel timeline on Apple platforms.** Source:
  [facebook/react-native CHANGELOG.md](https://github.com/facebook/react-native/blob/main/CHANGELOG.md).

## Precompiled iOS binaries (the build-speed story)

- **SDK 54 (RN 0.81):** XCFrameworks ship alongside source → RNTester clean build ~120s→~10s on M4
  Max (real-world varies). Opt-in initially.
- **RN 0.84:** **precompiled iOS binaries by default.**
- **SDK 56:** **prebuilt XCFrameworks for complex Expo modules** → median clean iOS build ~-1 min
  (~16%). Android `usePrecompiledHeaders` opt-in cut `:app:buildCMakeDebug` 17m10s→6m06s.
- **Why the agent cares:** EAS clean-build minutes cost real money and wall-clock time. Precompiled
  binaries are the biggest lever on build cost in this window. Source:
  [expo.dev/changelog/sdk-54](https://expo.dev/changelog/sdk-54),
  [expo.dev/changelog/sdk-56](https://expo.dev/changelog/sdk-56).

## How to check New-Architecture compatibility of a dependency

The canonical tool is the **React Native Directory** (`reactnative.directory`), surfaced through
**Expo Doctor**:

```sh
npx expo-doctor@latest
```

This validates your dependencies against React Native Directory's compatibility data and flags any
that are unmaintained / New-Arch-incompatible. You can configure exclusions in `package.json`.
Source: [docs.expo.dev/guides/new-architecture](https://docs.expo.dev/guides/new-architecture/).

> **Note:** the older `isNewArchitectureCompatible` flag terminology is no longer how the docs frame
> it; the React Native Directory metadata is the source of truth now (it tracks "New Arch" support +
> maintenance status per library).

## Other notable RN deltas in the window

- **RN 0.83 was "the first RN release with no user-facing breaking changes"** — a deliberate
  stabilization release after the New-Arch churn. Source: [reactnative.dev/blog 0.83](https://reactnative.dev/blog).
- **RN 0.85 New Animation Backend** + Metro TLS support; **`StyleSheet.absoluteFillObject` removed**
  (breaking); **Jest preset moved to a dedicated package** (must install separately — a real CI
  breakage source). Source: [reactnativecrossroads 0.85 dive](https://reactnativecrossroads.com/posts/react-native-085-changelog-dive/).
- **React Native came to Meta Quest** (2026-02-24 blog) — RN now targets a third platform class
  beyond iOS/Android. Source: [reactnative.dev/blog](https://reactnative.dev/blog).
- **Min Node creep:** RN 0.84 → Node 22 minimum; SDK 55 → `^20.19.4/^22.13.0/^24.3.0/^25.0.0`.
  An agent's build environment must satisfy these or installs fail.

## Practical implication for pebble (the Mobile harness)

1. **Never scaffold with old-arch assumptions.** No `newArchEnabled`, no JSC, no bridge.
2. **Pin to an Expo SDK, let `npx expo install` resolve native libs** — hand-pinning native deps is
   the #1 way to land an incompatible combination.
3. **Run `npx expo-doctor` before every build** — it is the cheapest gate against a New-Arch
   incompatibility surfacing as a cryptic native crash.
4. **Budget for Hermes V1 + precompiled binaries** when reasoning about build cost — they materially
   change the numbers from the pre-2026 world.

## "Could not confirm"
- Whether **all** legacy interop-layer removal completes in a specific named version (0.84 "continues"
  removal; an exact "interop fully gone" version was not pinned in the sources read).
