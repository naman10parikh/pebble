# pebble — Ecosystem Research INDEX (CP123 Wave-R)

> **Researcher:** ECOSYSTEM agent · **Date:** 2026-06-11 · **Repo:** `~/pebble`
> **Mission:** Map the June-2026 state of the art for React Native / Expo / EAS / mobile-app
> distribution so the pebble Mobile domain-expert harness operates the real toolchain, not a
> stale-from-training one. Every claim is cited (URL + date). Versions are npm-verified ground
> truth (`npm view <pkg> version`), not memory.

## The one-paragraph "what changed since my training" delta

My training memory anchored on **Expo SDK 53 / RN 0.80** with the New Architecture as an opt-in
default and the legacy bridge still shippable. **That world is gone.** As of 2026-06-11 the latest
is **Expo SDK 56 (RN 0.85)** and **RN 0.86.0** (released 2026-06-09). The **Legacy Architecture was
removed from the React Native codebase in RN 0.83 / Expo SDK 55** — New Architecture is now the
*only* architecture; there is no `newArchEnabled: false` escape hatch anymore. **Hermes V1** landed
(RN 0.84+). **Expo UI** (SwiftUI + Jetpack Compose native primitives) stabilized in SDK 56 and is
now in the default template. EAS added **prebuilt XCFrameworks** and Android precompiled-headers
that cut clean build times materially. Treat anything in this folder dated <6 months as authoritative
over my prior knowledge.

## Files in this folder

| # | File | Covers |
|---|------|--------|
| 00 | `ecosystem-00-INDEX.md` | This index + the training-delta + top findings |
| 01 | `ecosystem-01-versions-matrix.md` | npm-verified versions + 6-month changelog deltas for every canonical tool |
| 02 | `ecosystem-02-react-native-new-arch.md` | RN current state, New Architecture, Hermes V1, legacy removal timeline |
| 03 | `ecosystem-03-expo-sdk-deltas.md` | Expo SDK 54→55→56 deltas, Expo UI, Expo Go policy changes |
| 04 | `ecosystem-04-expo-router.md` | expo-router layouts, typed routes, the load-bearing routing flows |
| 05 | `ecosystem-05-eas-build-submit-update.md` | EAS Build profiles, Submit, Update (OTA) channels/runtime-versions |
| 06 | `ecosystem-06-distribution-pipelines.md` | TestFlight / Play Console pipelines, store review gotchas for AI apps |
| 07 | `ecosystem-07-push-notifications.md` | expo-notifications vs native, the Expo Go SDK 53+ removal, FCMv1/APNs |
| 08 | `ecosystem-08-decision-frameworks.md` | RN-vs-PWA-vs-bare-vs-Flutter trade-off matrix; monorepo RN setups |
| 09 | `ecosystem-09-starter-repos.md` | Best starter/template/example repos (stars, last commit, why) |
| 10 | `ecosystem-10-github-issues.md` | Top GitHub issues revealing real-world breakage (high-engagement) |
| 11 | `ecosystem-11-agent-operating-guide.md` | What an AGENT needs: EAS CLI commands, non-interactive flags, simulator automation |

## How to read this as the pebble harness

1. **Versions are perishable.** `ecosystem-01` is a snapshot; the agent must re-run `npm view`
   before quoting a version in production work. The *deltas* and *gotchas* age more slowly.
2. **The agent-operating guide (`ecosystem-11`) is the load-bearing file** for actually doing work —
   it has the non-interactive flags that prevent an agent from hanging on a TTY prompt.
3. **Issues (`ecosystem-10`) over docs** when something breaks — docs describe the happy path,
   issues describe what actually happens.

## Source-freshness policy

Preferred: official Expo changelog (`expo.dev/changelog`), `reactnative.dev/blog`, GitHub repos
(`expo/expo`, `facebook/react-native`, `reactwg/react-native-new-architecture`), npm registry.
Secondary (clearly labeled): LogRocket / Medium practitioner posts — used only for synthesis,
never as the sole source for a version claim.
