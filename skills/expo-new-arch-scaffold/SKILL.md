---
name: expo-new-arch-scaffold
description: >-
  Scaffold a correct, modern, New-Architecture-only Expo app — pin the SDK explicitly, install native deps the right way, gate with expo-doctor, enable typed routes, wire for the Energy pnpm monorepo. Use when someone says "scaffold/start a React Native app", "set up a new Expo project", or runs `pebble init`. Encodes pebble's OPINIONS S1-S5 + the New-Arch-only reality.
trigger: >-
  "scaffold a React Native app", "start a new Expo project", "set up a mobile app", "create-expo-app", before/inside `pebble init`
model: opus (the scaffold encodes pebble's whole taste — a wrong arch/SDK pin is a multi-week sunk cost; the version-pin step in particular must NOT be a cheap-tier guess)
output: a scaffold plan + the exact commands run (with the EXPLICITLY pinned SDK) + the expo-doctor gate result + the monorepo notes, in the format at the bottom
---

# expo-new-arch-scaffold

> Standing up a modern app correctly in June 2026 is mostly about **refusing the era-one-behind defaults**:
> New-Architecture-only (no `newArchEnabled:false`), pin the SDK *explicitly* (don't trust `@latest`'s
> SDK-54 transition default), `expo install` for native deps, and `expo-doctor` as the cheapest gate. Stance
> source: `brain/OPINIONS.md` STANCE 1-5 + STANCE 11, `brain/KNOWN-PITFALLS.md` §0.1/§0.7/§0.8 + §5,
> `brain/EXPERTISE-MAP.md` JTBD-2/3.

## When to use
A coding agent, the cockpit, or a human starting a fresh React Native app, or `pebble init` running its
scaffold body. Run `mobile-shape-decision` **first** — only scaffold once the shape is `native`.

## The stance it encodes (OPINIONS S1-S5, verbatim intent)
- **S1 — Always start with Expo (managed + custom dev builds). Never start bare.** Consensus has hardened to
  ~85-95% Expo. Bare is a deliberate escape hatch (~5-15%), not a starting point.
- **S2 — Always use development builds. Never default to Expo Go for anything real.** Expo Go is "an
  educational tool for beginners"; remote push doesn't work in it (SDK 53+); it can't side-load older SDKs.
- **S3 — Always `npx expo install` for native deps. Never `npm install` a native lib by hand.** `expo install`
  resolves the SDK-correct, New-Arch-compatible version; hand-pinning is the #1 way to land an incompatible combo.
- **S4 — Always run `npx expo-doctor` before every build. The cheapest gate that exists.** Validates deps vs
  React Native Directory before they become a cryptic native crash on a paid cloud build.
- **S5 — Always enable typed routes in expo-router. Never ship untyped navigation.** Renamed/missing-route
  bugs become compile errors `tsc` catches before ship.

## Steps

### Step 1 — Rule 0: re-verify the SDK/RN/eas-cli versions before pinning anything (model: haiku)
**Never quote a version from memory** (KNOWN-PITFALLS §9). Run `npm view expo dist-tags --json` /
`npm view react-native version` / `npm view eas-cli version` (or `pebble version-check`) and use what npm
says. The brain's numbers are dated 2026-06-11; a major may have moved (live drift was already observed:
RN on npm was `0.86.0` vs the brain's `0.85.x` floor). The output of this step is the *actual* SDK number
to pin — not a recalled one.

### Step 2 — Scaffold with the SDK PINNED EXPLICITLY (model: opus)
This is the trap step — **do NOT rely on `create-expo-app@latest`'s default.** During the SDK-56 transition,
`create-expo-app@latest` with **no `--template`** silently scaffolds the **legacy SDK 54** default (re-verified
2026-06-11). To get the New-Arch-correct current SDK you MUST pass the template explicitly:
```
npx create-expo-app@latest <dir> --template default@sdk-<N>   # N = the number Step 1 returned
```
Never scaffold old-arch: no `newArchEnabled:false` (it's a no-op/removed on SDK 55+ — KNOWN-PITFALLS §0.1),
no JSC selection (first-party JSC removed RN 0.81/SDK 54 — §0.10), no `expo eject` plans (CNG + Expo Modules
API removed the eject trade-off — §0.7). For a clean modern app you often need **no template at all** beyond
the pinned SDK (OPINIONS S11) — don't bolt on a template's opinions you won't use.

### Step 3 — Install native deps the SDK-correct way (model: haiku)
Every native dep (and anything with a config plugin) goes through `npx expo install <pkg>`, never a raw
`npm install` (S3). After adding ANY native/config-plugin lib, run a **clean prebuild**
(`npx expo prebuild --clean`) — installing one config-plugin lib can break the New-Arch package list
(KNOWN-PITFALLS §3, expo/expo #41382). Scaffold pebble's storage/state defaults: **MMKV** (KV, 30x faster
than AsyncStorage) and **Zustand** (state, 90% less boilerplate than Redux) — both rebuttable (OPINIONS S12).

### Step 4 — Enable typed routes + structure the router (model: opus)
Enable typed routes in expo-router (S5). The exact SDK-56 config key is **unconfirmed in the corpus**
(`experiments.typedRoutes` is the historically stable key) — **verify against the live `docs.expo.dev/router`
before committing** (`brain/GAPS-AND-DISPUTES.md`). Don't architect critical data loading in a layout-level
loader yet (expo-router #46791, open at capture — KNOWN-PITFALLS §4).

### Step 5 — Gate with expo-doctor; wire the monorepo (model: haiku)
Run `npx expo-doctor` — the $0 pre-build gate (S4). It validates against React Native Directory but **won't**
catch a runtime Fabric-flattening null ref (that's a manual hunt). In the Energy pnpm monorepo specifically:
set **`nodeLinker: hoisted`** (pnpm's default isolated layout crashes Metro's `getPackage` on `expo>=55.0.10`
— KNOWN-PITFALLS §5), do **not** set `disableHierarchicalLookup:true`, pin a single `react`/`react-native`,
and on SDK 52+ **delete any manual `metro.config.js` `watchFolders`/`resolver.*`**. EAS assumes Yarn — copy
`byCedric/expo-monorepo-example`'s config to build on EAS with pnpm; budget for that friction *before* the
first cloud build.

## Output format
```
SCAFFOLD: <dir>
SDK PINNED: <N> (verified via npm/pebble version-check this run — NOT recalled)
COMMAND: npx create-expo-app@latest <dir> --template default@sdk-<N>
ARCH: New Architecture (no newArchEnabled flag, Hermes, Fabric)
NATIVE DEPS: <list> (all via `npx expo install`; clean prebuild done: yes/no)
ROUTER: expo-router, typed routes enabled (config key verified against live docs: yes/no)
DEFAULTS: MMKV (KV) + Zustand (state)  [rebuttable]
DOCTOR: <expo-doctor pass/fail + any flagged issues>
MONOREPO: nodeLinker=hoisted; single react/react-native pinned; manual metro config removed: yes/no
```

## Anti-patterns
- Pinning the SDK from memory or trusting `create-expo-app@latest`'s bare default (silently SDK 54 — the
  exact era-delta trap).
- Setting `newArchEnabled:false` (no-op/removed on SDK 55+) or planning to eject to bare for one native bit.
- `npm install`-ing a native lib instead of `expo install` (the #1 incompatible-combo cause).
- Skipping `expo-doctor` because "it builds locally" — the gate runs in seconds and saves cloud build minutes.
- Leaving pnpm on its default isolated layout in the monorepo (Metro `getPackage` crash).

## Cross-refs
`pebble init` runs this · `pebble doctor` is Step 5 · OPINIONS S1-S5/S11/S12 · KNOWN-PITFALLS §0.1/§0.7/§0.8/§3/§5 · GAPS-AND-DISPUTES (typed-routes key, Expo split) · `eas-headless-pipeline` (next: build it).
