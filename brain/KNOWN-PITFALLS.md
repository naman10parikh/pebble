---
title: "KNOWN-PITFALLS — version-specific gotchas with detection + avoidance"
type: synthesis
created: "2026-06-11"
updated: "2026-06-11"
tags: [pitfalls, gotchas, detection, react-native, expo, eas, pebble]
sources:
  - "brain/research/raw/ecosystem-01-versions-matrix.md"
  - "brain/research/raw/ecosystem-02-react-native-new-arch.md"
  - "brain/research/raw/ecosystem-03-expo-sdk-deltas.md"
  - "brain/research/raw/ecosystem-04-expo-router.md"
  - "brain/research/raw/ecosystem-05-eas-build-submit-update.md"
  - "brain/research/raw/ecosystem-07-push-notifications.md"
  - "brain/research/raw/ecosystem-08-decision-frameworks.md"
  - "brain/research/raw/ecosystem-10-github-issues.md"
  - "brain/research/raw/ecosystem-11-agent-operating-guide.md"
  - "brain/research/raw/field-eas-build-failures-2026.md"
  - "brain/research/raw/field-ota-update-boundaries-2026.md"
  - "brain/research/raw/field-migration-war-stories-2026.md"
  - "brain/research/raw/field-taste-disagreements-2026.md"
related: ["[[MOC - pebble]]", "[[EXPERTISE-MAP]]", "[[BATTLE-TESTED-SCENARIOS]]", "[[OPINIONS]]", "[[TOOL-MATRIX]]", "[[GAPS-AND-DISPUTES]]"]
summary: "The version-specific landmines of June-2026 RN/Expo/EAS, each with a detection signal and an avoidance move — including the 2025→2026 invalidations that make training memory dangerous."
---

# KNOWN-PITFALLS

> A pitfall is a thing that **looks fine until it isn't.** Each entry: **the trap → how to DETECT it →
> how to AVOID it**, with the version it bites at and its source. The 2025→2026 invalidations (§0) are the
> most dangerous because pebble's *training memory* will actively suggest the now-wrong thing.

---

## §0 — The 2025→2026 invalidations (training memory is one era behind — trust THIS, not recall)

These are not "gotchas you might hit"; they are **facts your prior knowledge gets wrong.** [raw:
field-taste-disagreements §C, field-migration §1, field-ota §6, ecosystem-01/02/03]

| # | What training memory says | The 2026 reality | Detect | Avoid |
|---|---|---|---|---|
| 0.1 | "Keep `newArchEnabled: false`" | **FALSE.** RN 0.82+ can't disable New Arch; RN 0.83 / SDK 55 **removed** the legacy code; RN 0.85 has **no bridge fallback**. | `app.json` has `newArchEnabled` key → it's a no-op/removed on SDK 55+ | Never scaffold old-arch. No bridge, no JSC-by-default, no `newArchEnabled`. |
| 0.2 | "Use CodePush/AppCenter for OTA" | **DEAD.** CodePush retired Mar 2025, **incompatible with New Arch**. | Any guide/config referencing CodePush/AppCenter | Use **EAS Update** only. |
| 0.3 | "Reanimated plugin = `react-native-reanimated/plugin`" | **CHANGED.** Reanimated 4 split worklets out; plugin is now **`react-native-worklets/plugin`**; many APIs renamed; v4 is New-Arch-only. | babel.config still names the reanimated plugin; "duplicate worklet instances" at runtime | Install `react-native-worklets`, switch the plugin, migrate API names. |
| 0.4 | "AsyncStorage is the default KV store" | **SUPERSEDED** by **MMKV** ("30x faster, synchronous"); New-Arch migrations rip AsyncStorage out. | `@react-native-async-storage` as the primary store | Prefer **MMKV** for KV; reserve AsyncStorage only where a lib needs it. |
| 0.5 | "FlatList is fine for everything" | **REFINED.** FlatList <300 items; FlashList default at 500+/jank; **FlashList v2 is a rewrite (no `estimatedItemSize`)**. | Jank on long lists; `estimatedItemSize` present after a v2 upgrade | FlatList for small lists; FlashList v2 for 500+; drop `estimatedItemSize` on v2. |
| 0.6 | "Flipper for debugging" | **DEAD.** | Flipper in the toolchain | Use **RN DevTools** / Hermes tooling. |
| 0.7 | "Eject to bare for native modules" | **OBSOLETE.** CNG + **Expo Modules API** + config plugins removed the eject trade-off. | Plans to `expo eject` / go bare for one native bit | Write native modules with **Expo Modules API**; use config plugins + custom dev builds. |
| 0.8 | "Just open Expo Go to test" | **DEMOTED.** Expo Go is "an educational tool for beginners"; tracks only the latest fully-approved SDK; can't side-load older SDKs on a physical iPhone. | Targeting SDK 55/56 on a real iPhone via Expo Go | Default to **development builds** (`expo-dev-client`); Expo Go only for trivial SDK-54-era demos. |
| 0.9 | "PWA push works on iOS now (since 2023)" | **ASTERISKED.** Yes since iOS 16.4 **but home-screen-install-only, no silent/rich push, EU-blocked (iOS 17.4+)**; 7-day eviction; 50MB cap. | Plan to rely on iOS PWA push for re-engagement | Native for proactive push/background/durable memory. |
| 0.10 | "Hermes vs JSC is a real decision" | **MOSTLY SETTLED.** Hermes default both platforms; **first-party JSC removed in RN 0.81/SDK 54**; Reanimated 4 dropped V8 support. | Config still selecting JSC/V8 | Default Hermes; treat JSC as community-only. |
| 0.11 | "AI apps are fine if they're useful" | **INSUFFICIENT.** Thin wrappers get 4.3-spammed; self-modifying apps get 2.5.2-pulled (Replit/Vibecode/"Anything"); 2026-06-09 adds "may be removed" teeth + UGC-removal duty. | Architecture that executes server-delivered features; thin-wrapper positioning | See [[OPINIONS]] §store-compliance; ship a fixed reviewed shell. |

---

## §1 — New Architecture runtime crashes (look like app bugs, aren't)

- **PITFALL: Bridgeless drops a polyfill you assumed was global.** Under New-Arch Bridgeless, polyfills
  like **FormData** may not be present at JS-bundle-eval time → `[runtime not ready]` crash, SIGABRT.
  - **Detect:** SIGABRT / `[runtime not ready]` at bundle eval, referencing a global you never imported.
  - **Avoid:** Don't assume globals at bundle-eval under Bridgeless; import/polyfill explicitly.
  - **Source:** expo/expo #45313 (2026-05-08). [raw: ecosystem-10]
- **PITFALL: New-Arch host-init concurrency = native SIGSEGV.** `EXPermissionsService.registerRequesters`
  is not thread-safe; concurrent `RCTHost` init crashes (SIGSEGV). Also Android **SIGSEGV in
  `expo::EventEmitter::emitEvent` on Fast Refresh** while RN DevTools is attached (a *dev-time* crash).
  - **Detect:** SIGSEGV in native frames during startup or Fast Refresh — not a JS stack trace.
  - **Avoid:** Don't mistake these for your code; they're New-Arch host/dev-tool bugs. Detach DevTools to
    isolate the Fast-Refresh one. **Five-category triage** (`ecosystem-10`) before deep-debugging app code.
  - **Source:** expo/expo #45314 (2026-05-03), #46605 (2026-06-09). [raw: ecosystem-10]
- **PITFALL: `Updates.reloadAsync()` teardown race.** Android `ConcurrentModificationException` in
  `SharedObject::NativeState` teardown during reload.
  - **Detect:** Crash specifically on the OTA reload path, Android.
  - **Avoid:** Prefer prompting a user-driven reload over silent rapid reloads; see the OTA scenarios.
  - **Source:** expo/expo #46596 (2026-06-05). [raw: ecosystem-10]

## §2 — `fingerprint` runtimeVersion: the recommended thing has sharp edges

The `fingerprint` policy is the **right default for OTA safety** ([[OPINIONS]]) — but it bites in these
specific, documented ways. Know them before you set it on every project.

- **PITFALL: `fingerprint` breaks the Metro dev-server connection.** Setting RV policy to `fingerprint`
  can make the **dev server not connect to Metro.**
  - **Detect:** Dev client won't connect to Metro after switching to `fingerprint`.
  - **Avoid:** Be aware before defaulting every project to it; if dev-connect breaks, this is why.
  - **Source:** expo/expo #43908 (2026-03-13). [raw: ecosystem-10]
- **PITFALL: `fingerprint` fails with file-based secrets.** EAS fingerprint fails when using file-based
  secrets — relevant to any agent wiring CI secrets.
  - **Detect:** Fingerprint computation errors only in CI where secret files exist.
  - **Avoid:** Coordinate fingerprint + secret-file workflows; don't import gitignored secret files
    client-side (they're not uploaded — see §3).
  - **Source:** expo/expo #33852 (2026-06-05). [raw: ecosystem-10]
- **PITFALL: non-deterministic fingerprint → silent RV drift.** `npx @expo/fingerprint` was
  non-deterministic on Expo 54.0.22 — a changing fingerprint silently changes your runtimeVersion and can
  **mis-target OTA updates.**
  - **Detect:** RV changes between runs with no native change; OTAs reaching the wrong builds.
  - **Avoid:** Pin Expo patch versions; verify fingerprint stability before trusting OTA targeting.
  - **Source:** expo/expo #40898 (2026-05-11). [raw: ecosystem-10]
- **PITFALL: EAS computes `runtimeVersion: null`.** EAS sometimes calculates a null RV, breaking update
  targeting; SDK upgrades can also drop RV from a dev build (#34090 after SDK 52).
  - **Detect:** Build logs show "Runtime version calculated on EAS: null"; OTAs target nothing.
  - **Avoid:** Reconfigure RV after SDK upgrades; assert RV is non-null in the build before publishing.
  - **Source:** expo/eas-cli #3528 (2026-03-23), expo/expo #34090 (2025-09-01). [raw: field-eas-build-failures §1, ecosystem-10]

## §3 — EAS Build traps (your code is fine)

- **PITFALL: gitignored files aren't uploaded to the builder.** "None of these files exist" → anything in
  `.gitignore` is not uploaded to EAS.
  - **Detect:** Build can't find a file that exists locally and is gitignored.
  - **Avoid:** Don't import gitignored files client-side; base64-encode secrets + recreate via EAS Build
    hooks. [raw: field-eas-build-failures §4]
- **PITFALL: Gradle OOM from large bundles/text files.** "Gradle build daemon disappeared unexpectedly"
  = the JS-bundler process was killed, usually huge bundles / large text files treated as source.
  - **Detect:** Gradle daemon "disappeared" / killed mid-build.
  - **Avoid:** Use the `large` resource class in `eas.json`; analyze the bundle with **Expo Atlas**. [raw: field-eas-build-failures §4]
- **PITFALL: eas-cli point releases ship broken — pin it.** 2026 regressions: **18.5.0** broke
  `device:create`; **18.13.1** broke iOS build with a JSON parse error; **19.0.1** referenced itself on
  cloud workers but wasn't published to npm (`notarget`).
  - **Detect:** A pipeline that worked yesterday breaks after an unpinned eas-cli bump.
  - **Avoid:** **Pin eas-cli exactly in CI** (`"eas-cli":"x.y.z"`). A silent bump must not break you overnight.
  - **Source:** expo/eas-cli #3764, #3749, #3754 (May 2026). [raw: field-eas-build-failures §2]
- **PITFALL: submit jobs hardcode Node 20.** EAS `type: submit` jobs ran an unnecessary `npm ci` on
  **hardcoded Node 20**, intermittently failing Node-22+ projects.
  - **Detect:** Submit (not build) fails on a Node-22+ project with an npm-ci error.
  - **Avoid:** Be aware submit ran a Node-20 npm-ci; track the issue; pin/repro accordingly.
  - **Source:** expo/eas-cli #3589 (2026-04-09). [raw: field-eas-build-failures §3]
- **PITFALL: adding one config-plugin lib breaks the New-Arch package list.** Installing
  `expo-localization` on SDK 53 → `ExpoModulesPackageList references missing ExpoFetchModule`.
  - **Detect:** Android build fails referencing a missing module in the generated package list after adding
    a native lib.
  - **Avoid:** **Run a clean prebuild** (`npx expo prebuild --clean`) after adding any native/config-plugin lib.
  - **Source:** expo/expo #41382 (2026-06-08). [raw: ecosystem-10]

## §4 — expo-router current breakage (SDK 55/56, open at capture)

- **PITFALL: loaders don't work in `_layout` files** (#46791, open today). **Detect:** layout-level data
  loader returns nothing/errors. **Avoid:** don't architect critical data loading in a layout loader yet.
- **PITFALL: SDK-56 router codemod misses ~25% of imports** (#46481). **Detect:** stray old imports after
  the codemod. **Avoid:** grep + manually fix imports post-codemod (see [[BATTLE-TESTED-SCENARIOS]] #15).
- **PITFALL: JS top-tabs crash on fast back-navigation** (#46621). **Avoid:** debounce/guard rapid back nav.
- **PITFALL: empty space in FlatList inside Native Tabs** (#46284). **Avoid:** check insets/spacing in
  Native-Tabs list layouts.
- **Source:** expo/expo #46791/#46481/#46621/#46284 (June 2026, statuses may change — recheck). [raw: ecosystem-10]

## §5 — Monorepo / pnpm (the Energy-fleet context specifically)

- **PITFALL: pnpm's default layout breaks Metro/RN.** Symlinked isolated node_modules → Metro
  `getPackage` crash on `expo>=55.0.10`; `expo-router/entry` unresolved.
  - **Detect:** `Cannot read properties of undefined (reading getPackage)`; module-resolution failures only
    in the monorepo.
  - **Avoid:** `nodeLinker: hoisted`; **don't** set `disableHierarchicalLookup:true`; pin single
    `react`/`react-native`; on SDK 52+ delete manual `metro.config.js` `watchFolders`/`resolver.*`.
  - **Source:** expo/expo #44500 (2026-04-09), #28775; docs.expo.dev/guides/monorepos. [raw: ecosystem-08 §B, ecosystem-10]
- **PITFALL: EAS Build assumes Yarn, not pnpm.** EAS may not understand the pnpm layout.
  - **Detect:** Cloud build resolves deps differently than local pnpm.
  - **Avoid:** Copy `byCedric/expo-monorepo-example` (tuned to build on EAS with pnpm); budget for this
    friction *before* the first cloud build, not after.
  - **Source:** dev.to/callstack pnpm-workspaces guides. [raw: ecosystem-08 §B]

## §6 — Push notifications

- **PITFALL: testing remote push in Expo Go.** Remote push removed from Expo Go SDK 53+; even Expo's docs
  were stale-wrong (#41118).
  - **Detect:** No push ever arrives in Expo Go (Android).
  - **Avoid:** Test push **only in a development build.**
- **PITFALL: assuming the legacy FCM server key.** Android requires **FCM v1** (service-account JSON).
  - **Detect:** Android delivery silently fails despite a valid-looking setup.
  - **Avoid:** Set up FCM v1 service-account JSON in EAS credentials + `google-services.json`.
- **PITFALL: stale push tokens.** Tokens rotate and are build/credentials-specific (Expo-Go token ≠ dev-build token).
  - **Detect:** Sends "succeed" but never arrive after a rebuild/reinstall.
  - **Avoid:** Re-fetch `getExpoPushTokenAsync()` on launch; update server.
- **Source:** ecosystem-07; expo/expo #41118 (2026-06-08), #41146 (background fetch constrained). [raw: ecosystem-07, ecosystem-10]

## §7 — Migration coupling order (you cannot reorder these)

- **PITFALL: adopting Reanimated 4 before Fabric is done.** Reanimated 4 is New-Arch-only; it won't run on
  a pre-Fabric app.
  - **Detect:** Reanimated 4 fails on an old-arch project.
  - **Avoid:** Sequence: **Fabric → Reanimated 4 → RN 0.85**, in that order. [raw: field-migration §4/§7]
- **PITFALL: `withSpring` *feels* different after Reanimated 4 even though it compiles.** `duration` is now
  perceptual.
  - **Detect:** Springs too fast/slow post-upgrade; no build error.
  - **Avoid:** **Multiply old durations by 1.5**; re-QA animation feel (a design-QA, not a build, regression).
- **PITFALL: PropTypes silently removed by the New Arch.** Codegen enforces TS types instead.
  - **Detect:** PropTypes-based validation no longer fires.
  - **Avoid:** Move to TS types (Codegen path). [raw: field-migration §2]
- **PITFALL: stale native state after a half-measure prebuild.** SDK 53→54 needs a *completely fresh* dev build.
  - **Detect:** Mysterious failures after an SDK bump that "should have worked."
  - **Avoid:** Delete `android`/`ios`/`node_modules`, reinstall, `npx expo prebuild --clean`, rebuild. [raw: field-migration §6]

## §8 — Distribution / store bootstrap

- **PITFALL: trying to bootstrap a brand-new Play listing via API.** Google requires **one MANUAL first
  upload** before API submissions work.
  - **Detect:** API submit fails on a never-before-uploaded Play app.
  - **Avoid:** First AAB/APK by hand in Play Console; then API submits via service-account JSON. [raw: ecosystem-06]
- **PITFALL: Apple-ID + 2FA in CI.** 2FA cannot be automated.
  - **Detect:** iOS submit hangs/fails on a 2FA prompt in a headless runner.
  - **Avoid:** Use an **App Store Connect API Key** for non-interactive iOS submits. [raw: ecosystem-06, ecosystem-11]
- **PITFALL: expecting TestFlight to auto-release to production.** It does not.
  - **Detect:** Build sits in TestFlight; nothing reaches the store.
  - **Avoid:** Manually submit for App Review after TestFlight (~10-15 min to appear). [raw: ecosystem-06]

## §9 — Agent-operating traps (headless context)

- **PITFALL: hanging on a TTY prompt.** Any `eas`/`expo` command without `--non-interactive` blocks on a prompt.
  - **Detect:** A CI/agent run that never returns.
  - **Avoid:** `--non-interactive` on **every** command; `--no-wait` for builds; `EAS_NO_VCS=1` for local
    builds in a dirty/no-git tree. [raw: ecosystem-11]
- **PITFALL: omitting `--environment` on `eas update`.** Fails on SDK 55+. **Avoid:** always include it. [raw: ecosystem-05/11]
- **PITFALL: quoting a version from memory.** npm `latest` can be **ahead** of the release blog (RN 0.86
  was on npm 2 days before its post).
  - **Detect:** You "know" a version that `npm view` contradicts.
  - **Avoid:** **Rule 0** — `npm view react-native version` / `npm view expo dist-tags` before quoting any
    version. npm is the source of truth for *availability*. [raw: ecosystem-01, ecosystem-11]

---

## The 60-second pre-debug triage (use this BEFORE deep-diving any failure)
1. **Timestamped, no-code-change, clustered build failure?** → EAS infra (§3 / Scenario 1), not you.
2. **Native SIGSEGV/SIGABRT or a white screen with no JS trace?** → New-Arch crash or Fabric flattening
   (§1 / Scenario 9), not your React.
3. **OTA-related crash?** → check the JS/native boundary (§0.2/Scenario 3) and #45772 (Scenario 2).
4. **CI broke but local is fine?** → `--environment` (§9), Node 22 (§7/Scenario 11), case-sensitivity
   (Scenario 6), eas-cli version (§3), or pnpm layout (§5).
5. **Push not arriving?** → Expo Go (§6) or FCM v1 (§6).
Only after these five comes deep app-code debugging. [raw: ecosystem-10 §meta-lesson]
