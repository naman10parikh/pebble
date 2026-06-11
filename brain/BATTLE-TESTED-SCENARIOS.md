---
title: "BATTLE-TESTED-SCENARIOS — real failures pebble must already know how to fix"
type: synthesis
created: "2026-06-11"
updated: "2026-06-11"
tags: [scenarios, golden-tasks, eval, troubleshooting, pebble]
sources:
  - "brain/research/raw/field-eas-build-failures-2026.md"
  - "brain/research/raw/field-ota-update-boundaries-2026.md"
  - "brain/research/raw/field-migration-war-stories-2026.md"
  - "brain/research/raw/field-store-review-ai-apps-2026.md"
  - "brain/research/raw/ecosystem-10-github-issues.md"
  - "brain/research/raw/ecosystem-03-expo-sdk-deltas.md"
  - "brain/research/raw/ecosystem-05-eas-build-submit-update.md"
  - "brain/research/raw/ecosystem-07-push-notifications.md"
  - "brain/research/raw/ecosystem-08-decision-frameworks.md"
related: ["[[MOC - pebble]]", "[[EXPERTISE-MAP]]", "[[KNOWN-PITFALLS]]", "[[OPINIONS]]", "[[GAPS-AND-DISPUTES]]"]
summary: "≥14 real, dated, primary-sourced production/migration/review failures with diagnosis + resolution — the Wave-S golden eval corpus. Each is a trajectory task: given the symptom, does pebble reach the right root cause and fix?"
---

# BATTLE-TESTED-SCENARIOS

> These are **real, dated, primary-sourced** failures — not hypotheticals. Each is written as a golden
> eval task: **a fresh pebble session, given the SYMPTOM only, must reach the ROOT CAUSE and the FIX.**
> The eval grader (`eval/`, Hamel L3 trajectory) scores whether pebble (a) identifies the right cause
> from the symptom, (b) proposes the documented fix, and (c) does NOT chase the obvious-but-wrong lead.
> Each scenario names the obvious-but-wrong path so the grader can penalize it. Sources carry URL + date.

---

## SCENARIO 1 — "All my EAS builds suddenly fail at 'Prepare project' and I changed nothing"
- **Symptom (verbatim log):** `tar -C /home/expo/workingdir/build --strip-components 1 -zxf
  /home/expo/workingdir/project.tar.gz exited with non-zero code: 2`. 15+ consecutive builds fail from a
  specific timestamp; the *last good build hours earlier used identical code*. (EAS CLI 18.4.0, SDK 54,
  Windows 11, `EAS_NO_VCS=1`, ~839KB archive.)
- **Obvious-but-wrong path (penalize):** debug your repo — clear cache, edit `.easignore`, reinstall
  node_modules, try image variants. The reporter tried all of these; local `tar` worked fine. None fixed it.
- **Root cause:** **EAS infra / build-VM image regression**, not your code. A clustered, timestamped,
  no-code-change failure with a same-day spike in the tracker is an EAS-side break. `EAS_NO_VCS=1` +
  Windows + large archive recurs in these reports.
- **Resolution:** Check EAS status + the `expo/eas-cli` tracker for a same-day cluster BEFORE touching the
  repo. Confirm it started at a timestamp with no code change. Wait for the infra fix / roll back the
  build image; do not burn the afternoon on your bundle.
- **Source:** expo/eas-cli #3529 (antoinevds, 2026-03-23); sibling #3532 (2026-03-24, free plan), #3449
  (2026-03-03, "Failed to restore metadata: File exists"). [raw: field-eas-build-failures §1]

## SCENARIO 2 — "OTA updates crash 100% of the time on first launch after download (SDK 54/55)"
- **Symptom:** A JS-only OTA consistently crashes on iOS at **bundle activation** on first launch after
  download. `Exception Type: EXC_CRASH (SIGABRT)`, `Triggered by Thread: 15 (Dispatch queue:
  expo.controller.errorRecoveryQueue)`, Foundation `Data.write(to:options:)` in adjacent traces. Repro:
  TestFlight install → reinstall → publish JS-only OTA → keep app open ~60s to download → force-kill →
  reopen → crash within ~30s. Dashboard: "Known launches: 1, Known crashes: 1," reverts to embedded bundle.
- **Obvious-but-wrong path (penalize):** "switch the runtimeVersion policy" or "enable the anti-bricking
  measures." The bug occurs **regardless of fingerprint OR appVersion policy**, and **persists with
  anti-bricking both enabled and disabled** — the **error-recovery queue itself is what crashes.**
- **Root cause:** A New-Architecture teardown/IO bug in `expo-updates` error recovery on SDK 54
  (expo-updates@29.0.17) **and** SDK 55 (expo-updates@55.0.22), RN 0.83.6, Hermes + New Arch. Issue still
  open at capture, labeled "incomplete issue: missing or invalid repro" (not yet fixed by Expo).
- **Resolution:** On SDK 54/55 + New Arch, **treat iOS OTA as not-yet-trustworthy.** Workaround per the
  reporter: "all JS changes require full `eas build` releases." If you must OTA, gate behind gradual
  rollout + crash monitoring and watch the activation crash rate; be ready to republish/abandon OTA.
- **Source:** expo/expo #45772 (dev-yenin, 2026-05-14); flavors #42112 (SDK55 dev-client boot crash),
  #26231. [raw: field-ota §3] — **pebble's own experiment to resolve in [[GAPS-AND-DISPUTES]]: does this
  reproduce on the Energy stack's pinned SDK?**

## SCENARIO 3 — "I shipped an OTA and the app crashes with 'Native module cannot be null'"
- **Symptom:** App was fine; after an `eas update`, users crash on launch with **"Native module cannot be
  null."**
- **Obvious-but-wrong path (penalize):** roll back JS / blame the new feature's React code.
- **Root cause:** The OTA's JS **imported a native module that isn't in the installed binary** — the
  change touched `package.json` deps / an `app.config.js` plugin / `ios|android/`, i.e. it was a **binary
  release smuggled out as an OTA.** Either the runtimeVersion didn't change (so EAS let the JS reach an old
  binary) or `version` wasn't bumped for the new binary.
- **Resolution:** Restore the matching binary OR rebuild + bump runtimeVersion. **Prevent it** with the
  **`fingerprint` runtimeVersion policy** — it hashes the native graph so EAS refuses to send native-needing
  JS to old binaries. Abdullahi's rule: *"Change `version` only when shipping a new binary; OTAs carry the
  same `version` as the binary they patch."*
- **Source:** Abiodun Abdullahi, "The Realities of OTA Updates with Expo," Medium, 2026-04. [raw: field-ota §1/§2]

## SCENARIO 4 — "VisionCamera V5 won't compile on EAS and I can't pin the Xcode version"
- **Symptom (verbatim):** `Rename failed: …/VisionCamera.build/Objects-normal/arm64/
  AVCaptureSession+addAudioInput-e3ea27bd.o.tmp -> AVCaptureSession+addAudioInput.o: No such file or
  directory`. Adding the `image` field to `eas.json` to pin Xcode is **rejected by eas-cli 18.7.0 with
  "image is not allowed."**
- **Obvious-but-wrong path (penalize):** keep fighting the Xcode flags / patch VisionCamera locally.
- **Root cause:** **EAS auto-assigns Xcode 26 beta for SDK 54**, and NitroModules + Xcode-26-beta's
  object-file-rename handling are incompatible. **You do not control the Xcode version on managed EAS** —
  it's derived from the SDK, and the pin is rejected.
- **Resolution:** Two levers only: (a) **downgrade Expo SDK** (SDK 53 forces Xcode 16.2 and compiles), or
  (b) wait for the module to support the new Xcode. **Plan native-module upgrades around EAS's Xcode
  assignment, not the other way around.**
- **Source:** expo/eas-cli #3616 (2026-04-17; eas-cli 18.7.0, SDK 54, vision-camera 5.0.1). [raw:
  field-eas-build-failures §3]

## SCENARIO 5 — "`eas update` works locally but silently breaks in CI"
- **Symptom:** `eas update` succeeds on a dev's laptop; the same command in the CI/agent pipeline fails (or
  in older scripts, hangs).
- **Obvious-but-wrong path (penalize):** blame CI auth / network / the channel name.
- **Root cause:** **Since Expo SDK 55, `eas update` REQUIRES the `--environment` flag.** A script written
  pre-55 omits it and fails — the #1 EAS-Update CI breakage of 2026. (Separately, any eas command without
  `--non-interactive` will *hang* on a TTY prompt in a headless runner.)
- **Resolution:** `eas update --channel <ch> --message "…" --environment <env> --non-interactive`. Add
  `--environment` to every update call and `--non-interactive` to every eas command in CI.
- **Source:** expo.dev/changelog/sdk-55; ecosystem-11 agent guide. [raw: ecosystem-05, ecosystem-03 §SDK55, ecosystem-11]

## SCENARIO 6 — "Build works on my Mac, fails on EAS with 'Unable to resolve module ./src/Routes'"
- **Symptom:** `Metro encountered an error: Unable to resolve module ./src/Routes` /
  `Task :app:bundleReleaseJsAndAssets FAILED` on the EAS builder; builds fine locally on macOS.
- **Obvious-but-wrong path (penalize):** assume a missing dependency / reinstall node_modules.
- **Root cause:** **Filename case differs in Git vs filesystem** (`routes.js` committed but `Routes.js`
  on disk). macOS is **case-insensitive** so it works locally; the **EAS Linux builder is case-sensitive**
  so it fails. The single most common "works on my Mac, fails on EAS" trap.
- **Resolution:** Run `npx expo export` locally — it reproduces the resolution and catches the case
  mismatch for free before a cloud build. Fix the casing in Git (`git mv` to correct the tracked name).
- **Source:** Expo docs, "Troubleshoot build errors and crashes." [raw: field-eas-build-failures §4]

## SCENARIO 7 — "Apple pulled / blocked updates to my AI app — what did I actually violate?"
- **Symptom:** Apple silently blocks your updates, then pulls the app. You're told you violated
  **Guideline 2.5.2.** (Real cases: "Anything"/Dhruv Amin, Replit, Vibecode — Dec 2025 → Mar 2026.)
- **Obvious-but-wrong path (penalize):** "it's because the app uses AI / an LLM." There is **no
  AI-specific guideline as of 2026-06-09.** Also wrong: Amin's attempted fix of previewing generated code
  in a *web browser* — **Apple blocked that update too.**
- **Root cause:** **2.5.2** — the app "downloads, installs, or executes code which introduces or changes
  features or functionality." Your app delivered **new executable behavior/features post-review** (let
  users generate apps/tools that then RUN inside the native container). Content/data may change; executable
  code and features may not, unless they run in WebKit.
- **Resolution:** **Ship a fixed, reviewed native shell.** Use OTA only for JS/asset iteration *within the
  advertised purpose*. Do **not** architect "the app rewrites itself from a server-sent program." If
  dynamic generated code must run, run it in a **WebView/browser**, never the native runtime. Appeal once;
  escalate to the App Review Board with a differentiation memo, not cosmetic tweaks.
- **Source:** MacRumors 2026-03-30 + 2026-06-09; AppleInsider 2026-03-18; appnatively. [raw:
  field-store-review §2, ecosystem-06]

## SCENARIO 8 — "My useful AI app keeps getting 4.3-rejected even after big improvements"
- **Symptom:** Repeated **Guideline 4.3(a)** rejections ("indistinguishable from what's already widely
  available" / duplicate) with little actionable feedback — even after substantial changes, especially in
  saturated categories (VPN, the AI-wrapper crowd).
- **Obvious-but-wrong path (penalize):** resubmit more cosmetic UI changes and hope.
- **Root cause:** 4.3 is a **judgment call about differentiation**, and AI makes mass-production trivial,
  so Apple leans on it hard. Cosmetic resubmits don't move a differentiation judgment.
- **Resolution:** Appeal **once per rejection**; if technical changes fail, **escalate to the App Review
  Board with a written case for the app's concrete, demonstrable unique value/feature.** The winning move
  is a documented differentiation argument, not another code change. Have a real unique feature ready
  before you submit a thin wrapper at all.
- **Source:** appnatively 2026; Apple Developer Forums threads 771794 / 771167 / 112848. [raw:
  field-store-review §3]

## SCENARIO 9 — "New-Arch migration: the app builds and launches to a blank white screen, no error"
- **Symptom:** After enabling the New Architecture, the app builds and launches but renders a **blank
  white screen with zero diagnostics** — no crash, no stack trace. Sometimes paired with **refs always
  null**, `ref.current.measure()` no longer working, or `ActionSheetIOS` broken.
- **Obvious-but-wrong path (penalize):** grep for a JS error / assume a bundling failure (there's nothing
  to grep — that's the trap).
- **Root cause:** **Fabric's view flattening** — Fabric removes "unnecessary" `View` wrappers from the
  native hierarchy when they don't affect layout, so refs pointing at those wrappers become null. Plus
  React-18-concurrent race conditions exposed by Fabric (listeners not cleaning up on fast transitions).
- **Resolution:** Put `collapsable={false}` on views you must keep in the native tree (or restructure to
  ref a view that survives flattening). Add proper `useEffect` cleanup + `AbortController` for async ops.
  Audit every third-party native module on `reactnative.directory` + its GitHub "new architecture" issues
  before enabling. **Expect silent failures, not stack traces** — budget time to hunt these.
- **Source:** Janani Umapathy, "RN Migration: Every Issue I Faced…" (Dev Genius). [raw: field-migration §3]

## SCENARIO 10 — "Reanimated 4 compiles, but my animations feel wrong / 'duplicate worklet instances'"
- **Symptom:** Two distinct flavors. (a) Build error / runtime **"duplicate worklet instances."** (b)
  Compiles fine, but springs **feel different** than before (too fast/slow).
- **Obvious-but-wrong path (penalize):** tweak animation params blindly until it "looks right" without
  knowing the semantics changed.
- **Root cause:** Reanimated **4.x is New-Arch-only** and split worklets into the separate
  **`react-native-worklets`** package; (a) is a Reanimated/worklets **version mismatch**; (b) is the
  **`withSpring` semantics change** — `restDisplacementThreshold`/`restSpeedThreshold` collapsed to one
  `energyThreshold`, and `duration` is now **perceptual: multiply old durations by 1.5** for equivalent
  feel. Coupling rule: you can't adopt Reanimated 4 until Fabric is done.
- **Resolution:** Install `react-native-worklets` at the version matching your Reanimated 4.x and rebuild
  native; switch the babel plugin `'react-native-reanimated/plugin'` → `'react-native-worklets/plugin'`;
  migrate renamed APIs (`runOnJS→scheduleOnRN`, `runOnUI→scheduleOnUI`, …); **multiply old `withSpring`
  durations by 1.5** and re-QA feel (a design-QA regression a build error won't catch). Sequence upgrades:
  **Fabric → Reanimated 4 → RN 0.85**, in that order.
- **Source:** Software Mansion, "Migrating from Reanimated 3.x to 4.x" + compatibility table. [raw:
  field-migration §4]

## SCENARIO 11 — "After upgrading to RN 0.85, my CI test job breaks"
- **Symptom:** Tests that passed on the prior RN suddenly fail to run in CI after the **RN 0.85**
  (2026-04-07) upgrade; or a build fails referencing `StyleSheet.absoluteFillObject`; or `npm install`
  fails on the CI image.
- **Obvious-but-wrong path (penalize):** assume your test code regressed.
- **Root cause(s):** RN 0.85 **extracted the Jest preset** into `@react-native/jest-preset` (a very common
  *silent* CI breakage — the preset just isn't there anymore); **`StyleSheet.absoluteFillObject` was
  removed** (→ `StyleSheet.absoluteFill`); RN 0.84 bumped **min Node to 22** (older CI images fail
  install; Node 21/23 explicitly unsupported on 0.85).
- **Resolution:** Install + configure `@react-native/jest-preset` separately and update the Jest config;
  migrate `absoluteFillObject` → `absoluteFill`; bump the CI Node image to ≥22 (and off 21/23). Re-read the
  0.85 removed-APIs list (`CatalystInstanceImpl`, `ReactTextUpdate` now internal) if native code reaches
  into internals.
- **Source:** bacancytechnology "React Native 0.85" (2026-04-07); reactnativecrossroads 0.85 dive. [raw:
  field-migration §5, ecosystem-10 §RN-changelog]

## SCENARIO 12 — "Push notifications work in some tutorials' Expo Go but never for me"
- **Symptom:** You wire `expo-notifications`, test in **Expo Go**, and **no remote push ever arrives**
  (Android especially). The docs in places imply Expo Go can receive push.
- **Obvious-but-wrong path (penalize):** keep debugging tokens/permissions inside Expo Go — you'll burn a
  cycle on something that *cannot work there.*
- **Root cause:** **Remote (push) notifications were removed from Expo Go in SDK 53+** — a development
  build is required. (Expo's own docs were inconsistent about this — confirmed in #41118.) Separately,
  **Android requires FCM v1** (a Firebase service-account JSON); a project on the legacy server key won't
  deliver.
- **Resolution:** Build a **development build** (`eas build --profile development`) and test push there —
  never in Expo Go. Set up Android FCM v1 (service-account JSON uploaded to EAS credentials +
  `google-services.json`) and an iOS APNs key. Local/in-app notifications are fine to keep testing in Expo
  Go. Re-fetch the (rotating) push token on launch and store it server-side.
- **Source:** docs.expo.dev/push-notifications; expo/expo #41118 (2026-06-08); Expo FCM-v1 migration blog.
  [raw: ecosystem-07, ecosystem-10 §push]

## SCENARIO 13 — "pnpm monorepo: Metro crashes with 'Cannot read properties of undefined (getPackage)'"
- **Symptom:** In the Energy-style pnpm monorepo, `expo-router` + Metro crash:
  `Cannot read properties of undefined (reading getPackage)` on `expo>=55.0.10`; or
  `Unable to resolve module expo-router/entry` inside the monorepo.
- **Obvious-but-wrong path (penalize):** rewrite `metro.config.js` with manual `watchFolders` /
  `resolver.*` overrides (on SDK 52+ that's the *old* fix and can make it worse — Metro auto-configures now).
- **Root cause:** **pnpm's default isolated/symlink node_modules layout breaks RN/Metro tooling**, which
  expects a flatter tree. This is confirmed in issues, not theoretical (#44500).
- **Resolution:** Set **`nodeLinker: hoisted`** (pnpm-workspace.yaml); do **not** set
  `disableHierarchicalLookup:true`; **pin single `react`/`react-native` versions**. On SDK 52+ **delete**
  manual `watchFolders`/`resolver.nodeModulesPath`/`extraNodeModules`/`disableHierarchicalLookup` from
  `metro.config.js`, then `npx expo start --clear`. Copy `byCedric/expo-monorepo-example`'s structure.
  **Budget for "EAS Build assumes Yarn" friction** separately.
- **Source:** expo/expo #44500 (2026-04-09), #28775; docs.expo.dev/guides/monorepos; callstack. [raw:
  ecosystem-08 §B, ecosystem-10 §metro]

## SCENARIO 14 — "We have to ship in 3 weeks — should this be a PWA or native? (and an agent app?)"
- **Symptom:** A product/cost decision under time pressure. Someone insists "a PWA can do everything now,
  Apple opened iOS to PWAs."
- **Obvious-but-wrong path (penalize):** accept the PWA-overconfidence claim and ship a PWA for a use case
  that needs proactive push / background / durable local memory / sensors.
- **Root cause / framing:** The PWA gap narrowed but iOS still has hard walls: push is
  **home-screen-install-only, no silent/rich, EU-blocked (iOS 17.4+)**; **7-day cache eviction**; **50MB
  cap**; **no Background Sync/Fetch**; **no BLE/NFC**. Engineers chronically *overestimate* iOS PWA capability.
- **Resolution:** Apply the **"3+ → native"** rule over {BLE/NFC, GPU perf, widgets/Siri, large offline
  data, platform-specific UI}. For an **agent** app specifically, go native the moment **proactive
  notifications, background work, durable local memory (MMKV/SQLite), or any sensor** matter — iOS PWA
  cannot do those. Otherwise (reactive, cloud-backed, no background/proactive need) a PWA is legitimately
  enough and **40-60% cheaper.**
- **Source:** magicbell PWA guides 2026; webscraft; mobiloud. [raw: field-pwa-vs-native §1/§4/§5]

## SCENARIO 15 — "After running the SDK-56 upgrade codemod, the app still has broken imports"
- **Symptom:** You ran the official `sdk-56-expo-router-react-navigation-replace` codemod; the app still
  has unresolved/old imports in scattered files.
- **Obvious-but-wrong path (penalize):** trust the codemod ran clean and look elsewhere for the bug.
- **Root cause:** The **official SDK-56 codemod misses imports in ~25% of import sites** (#46481, open).
  Codemods in this window are incomplete.
- **Resolution:** **Manually verify imports after any codemod** — grep for the old import paths across the
  tree; fix the ~1-in-4 the codemod skipped. Treat upgrade codemods as a first pass, never the final word.
- **Source:** expo/expo #46481 (2026-06-02). [raw: ecosystem-10 §expo-router]

---

## Coverage map (so eval/ can tier these)
| # | Domain | Failure class | Maps to JTBD |
|---|---|---|---|
| 1 | EAS Build | infra/tar regression | JTBD-4 |
| 2 | OTA | New-Arch activation crash (#45772) | JTBD-5 |
| 3 | OTA | native-module-null boundary cross | JTBD-5 |
| 4 | EAS Build | Xcode coupling you can't pin | JTBD-4/8 |
| 5 | EAS Update | `--environment` CI break | JTBD-5 |
| 6 | EAS Build | case-sensitivity Mac-vs-Linux | JTBD-4 |
| 7 | Store review | 2.5.2 self-modifying code pull | JTBD-6 |
| 8 | Store review | 4.3 differentiation rejection | JTBD-6 |
| 9 | Migration | Fabric view-flattening null refs | JTBD-2/8 |
| 10 | Migration | Reanimated 4 worklets + withSpring×1.5 | JTBD-8 |
| 11 | Migration | RN 0.85 Jest preset / removed APIs | JTBD-8 |
| 12 | Push | Expo Go remote-push removed / FCM v1 | JTBD-7 |
| 13 | Monorepo | pnpm Metro resolution | JTBD-9 |
| 14 | Decision | PWA-vs-native (agent app) | JTBD-1 |
| 15 | Upgrade | incomplete SDK-56 codemod | JTBD-2/3 |

> **Grader note:** for each, the L3 trajectory score is high only if pebble (1) names the documented root
> cause, (2) proposes the documented fix, and (3) explicitly avoids the named obvious-but-wrong path. A
> generic "try clearing cache / reinstall" answer scores *low* on scenarios 1, 9, 12, 13.
