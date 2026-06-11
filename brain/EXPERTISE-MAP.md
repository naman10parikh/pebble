---
title: "EXPERTISE-MAP — what pebble must master (June 2026)"
type: synthesis
created: "2026-06-11"
updated: "2026-06-11"
tags: [expertise, mobile, react-native, expo, eas, pebble]
sources:
  - "brain/research/raw/ecosystem-01-versions-matrix.md"
  - "brain/research/raw/ecosystem-02-react-native-new-arch.md"
  - "brain/research/raw/ecosystem-03-expo-sdk-deltas.md"
  - "brain/research/raw/ecosystem-04-expo-router.md"
  - "brain/research/raw/ecosystem-05-eas-build-submit-update.md"
  - "brain/research/raw/ecosystem-06-distribution-pipelines.md"
  - "brain/research/raw/ecosystem-07-push-notifications.md"
  - "brain/research/raw/ecosystem-08-decision-frameworks.md"
  - "brain/research/raw/ecosystem-09-starter-repos.md"
  - "brain/research/raw/ecosystem-10-github-issues.md"
  - "brain/research/raw/ecosystem-11-agent-operating-guide.md"
  - "brain/research/raw/field-store-review-ai-apps-2026.md"
  - "brain/research/raw/field-eas-build-failures-2026.md"
  - "brain/research/raw/field-ota-update-boundaries-2026.md"
  - "brain/research/raw/field-migration-war-stories-2026.md"
  - "brain/research/raw/field-pwa-vs-native-2026.md"
  - "brain/research/raw/field-taste-disagreements-2026.md"
related: ["[[MOC - pebble]]", "[[KNOWN-PITFALLS]]", "[[OPINIONS]]", "[[BATTLE-TESTED-SCENARIOS]]", "[[TOOL-MATRIX]]", "[[GAPS-AND-DISPUTES]]"]
summary: "Job-to-be-done map of the mobile/RN/Expo/EAS knowledge pebble must hold to be dangerous in June 2026 — every node cites its raw source."
---

# EXPERTISE-MAP — what pebble must master

> pebble is the Energy fleet's **Mobile employee** (closes audit gap C1). Its job: take a product idea
> to a shipped, store-compliant, OTA-maintainable iOS/Android app, and operate the real June-2026
> toolchain — **not the SDK-53 / RN-0.80 world its training memory anchored on.** Every node below is a
> thing pebble must *know cold*; each cites the raw research file it came from. **Versions are perishable
> — re-run `npm view` before quoting one (Rule 0).** The judgment that ages slowly lives in [[OPINIONS]],
> [[KNOWN-PITFALLS]], and [[BATTLE-TESTED-SCENARIOS]].

## The one-line era delta (read this first, every session)
Training anchored on **Expo SDK 53 / RN 0.80** with the New Architecture opt-in and the legacy bridge
still shippable. **That world is gone.** June 2026 = **Expo SDK 56 (RN 0.85)** latest, **RN 0.86.0** on
npm (2026-06-09); **Legacy Architecture removed in RN 0.83 / SDK 55** (no `newArchEnabled:false` escape
hatch); **Hermes V1 default (RN 0.84+)**; **CodePush dead**; **Expo Go demoted to a beginner tool**.
Treat anything in `brain/research/raw/` dated <6 months as authoritative over prior knowledge.
[raw: ecosystem-00-INDEX, ecosystem-01, field-taste-disagreements §C]

---

## JTBD-1 — Decide the right shape of the thing (RN vs PWA vs bare vs Flutter)
Before any code, pebble must pick the platform shape honestly. This is the highest-leverage decision; a
wrong call here is a 40-60% cost mistake or a capability dead end.

- **The "3+ → native" scoring rule.** Count needs from {Bluetooth/NFC, GPU perf, widgets/Siri/Live
  Activities, large-scale offline data, platform-specific UI}. ≥3 → native; 0-2 → keep evaluating PWA.
  [raw: field-pwa-vs-native §1 — magicbell]
- **The cost delta is real:** PWA ≈ **40-60% of dual-native** (one source: 3-10x cheaper; adding PWA to
  a site $0-5k vs native $30k-150k+). For ~70% of *content/service/SaaS/e-commerce* projects a PWA is
  "more than enough." [raw: field-pwa-vs-native §1 — magicbell/webscraft/mobiloud; the 70% figure is an
  unconfirmed blog estimate → [[GAPS-AND-DISPUTES]]]
- **The iOS PWA walls that force native** (memorize the numbers): push is **home-screen-install-only**,
  **no silent/rich push**, **EU-blocked since iOS 17.4**; **7-day cache eviction**; **50MB storage cap**;
  **no Background Sync/Fetch**; **no Web BLE/NFC/USB/Serial**; **no File System Access**. [raw:
  field-pwa-vs-native §4 — magicbell "PWA iOS Limitations 2026"]
- **The agent-app corollary:** a reactive, cloud-backed agent with no proactive-push / no background /
  no on-device / no durable-local-memory need → PWA is legitimately enough. The moment **proactive
  nudges, background work, durable local memory, or any sensor** matter → native, full stop. [raw:
  field-pwa-vs-native §5]
- **Flutter vs RN (one line):** Flutter wins on raw render perf (3D/games/custom-painted) but costs a
  new language (Dart) and forfeits JS/React reuse. For a React/TS org (the Energy fleet), **Expo RN is
  the lower-friction default.** [raw: ecosystem-08 §A]
- **When to NOT use RN at all:** games, video/photo editing, AR, anything pushing the GPU hard — RN's
  abstraction overhead matters there; go native. [raw: field-taste-disagreements §A — softaims/Shukla]

## JTBD-2 — Stand up a correct, modern project (the New-Architecture-only world)
- **New Architecture is the ONLY architecture.** No `newArchEnabled:false`, no bridge, no JSC-by-default.
  Any mental model treating old-arch as a fallback is wrong. [raw: ecosystem-02 — RFC0929 / WG #290]
- **The freeze→removal timeline** (don't conflate the three milestones): **frozen 2025-06-02** (code
  present, no dev/tests) → **0.82 (2025-10-08) disable-option removed** → **0.83 (2025-12-10) legacy code
  deleted** (pairs with SDK 55). [raw: ecosystem-02]
- **Scaffold the modern default:** `npx create-expo-app@latest` → SDK-56 template already ships
  **expo-router + Expo UI primitives + `/src`**. Often no third-party template needed. [raw: ecosystem-09]
- **Pin to an SDK, let `npx expo install` resolve native libs** — hand-`npm install`ing a native dep is
  the #1 way to land a New-Arch-incompatible combo. [raw: ecosystem-02 §practical, ecosystem-11]
- **Gate every project with `npx expo-doctor@latest`** — validates deps against React Native Directory
  (the source of truth for New-Arch + maintenance status; the old `isNewArchitectureCompatible` framing
  is gone). [raw: ecosystem-02 §compat]
- **Best starter if you want one:** `obytes/react-native-template-obytes` (Expo + pnpm + TS + NativeWind
  + expo-router + EAS + GH Actions; everything *configured*, not just installed) — best fit for the
  Energy pnpm/TS/EAS stack. [raw: ecosystem-09 #1, 4,216★ pushed 2026-06-02]

## JTBD-3 — Route and structure the app (expo-router)
- **The filesystem under `app/` IS the route tree.** Files = routes; `_layout.tsx` = stack/tabs for a
  dir; `+`-prefixed files handle edge cases (`+not-found`, `+html`, `+native-intent`, `+middleware`).
  [raw: ecosystem-04 — docs.expo.dev/router]
- **Route groups `(parens)` are the key primitive** — organizational, stripped from the URL; this is how
  you gate `(auth)` vs `(app)` stacks. Redirect with `<Redirect href>` or `router.replace()`. [raw:
  ecosystem-04 §auth-gate]
- **Dynamic + catch-all segments:** `[userId].tsx` (→ `useLocalSearchParams()`), `[...rest].tsx`. Prefer
  `useLocalSearchParams` over `useGlobalSearchParams` (the latter re-renders on any param change — an
  over-render foot-gun). [raw: ecosystem-04 §reading-params]
- **Enable typed routes by default** — turns renamed/missing-route bugs into compile errors `tsc` catches
  before ship. [raw: ecosystem-04 §typed-routes; exact SDK-56 config key unconfirmed → [[GAPS-AND-DISPUTES]]]
- **Known-broken right now (don't architect on these):** loaders in `_layout` files (#46791, open today);
  the SDK-56 router codemod misses ~25% of import sites (#46481). [raw: ecosystem-10 §expo-router]

## JTBD-4 — Build & ship (EAS Build / Submit), as an agent in a headless context
The recurring agent failure mode is **hanging on a TTY prompt** or **authing wrong headless**. This JTBD
is muscle memory; the full command set lives in [[TOOL-MATRIX]] and `ecosystem-11`.

- **Auth headless via `EXPO_TOKEN`** (personal access token) — THE way an agent authenticates EAS. For
  iOS prefer an **App Store Connect API Key** over Apple-ID+2FA (2FA can't be automated). [raw: ecosystem-11]
- **The non-interactive flag reflexes:** `--non-interactive` on *every* eas command (prevents hangs),
  `--no-wait` (fire build, poll later), `--json` (parse build id/status), `EAS_NO_VCS=1` (local build in
  a dirty/no-git tree). [raw: ecosystem-11 §cheatsheet]
- **`eas.json` profiles** = `development` (`developmentClient:true`) / `preview` / `production`;
  `distribution:"internal"` installs on devices without a store; `channel` ties a build to an Update
  channel. [raw: ecosystem-05 §profiles]
- **Submit pipelines:** iOS → App Store Connect → **TestFlight in ~10-15 min, NOT auto-released**; Android
  → Play track (`internal`/`alpha`/`beta`/`production`) via a **service-account JSON**. **Google requires
  one MANUAL first upload** before API submits work — an agent cannot bootstrap a brand-new Play listing.
  [raw: ecosystem-06 §submit]
- **Build-speed levers (real money on EAS minutes):** precompiled iOS binaries (RN 0.84 default; SDK 56
  prebuilt complex modules ≈ -16% clean iOS build); Android `usePrecompiledHeaders` cut
  `:app:buildCMakeDebug` 17m10s → 6m06s. [raw: ecosystem-02 §precompiled, ecosystem-05]
- **You do NOT own the Xcode/Node version on managed EAS** — EAS derives Xcode from your SDK and you
  cannot pin it (`image` field rejected). Plan native-module upgrades around EAS's assignment. [raw:
  field-eas-build-failures §3 — #3616]

## JTBD-5 — Maintain in production via OTA (EAS Update) — within the wall
This is the highest-stakes operational skill. **The technical wall and the policy wall are the same wall.**

- **OTA moves JS/styles/assets ONLY — never native code or features.** If a change touches
  `package.json` deps, `app.config.js` plugins, or `ios/`/`android/` → it's a **binary release**, not an
  OTA. Cross it and the app crashes with **"Native module cannot be null."** [raw: field-ota §1 — Abdullahi]
- **`runtimeVersion` is the safety gate; prefer the `fingerprint` policy** — it hashes the native dep
  graph + plugins, so EAS *refuses* to send JS that needs absent native code to old binaries. (Trade-off:
  more native rebuilds + a real Metro-dev-server DX gotcha — see [[KNOWN-PITFALLS]].) [raw: ecosystem-05
  §runtimeVersion, field-ota §2]
- **Channels vs branches:** a *channel* is a property on a build ("which updates do I accept"); a *branch*
  is created on publish; `eas update:configure` wires channels onto preview/production profiles. [raw:
  ecosystem-05 §channels]
- **The mandatory flag:** since **SDK 55, `eas update` REQUIRES `--environment`** — the #1 EAS-Update CI
  breakage in 2026. [raw: ecosystem-05, ecosystem-03 §SDK55, ecosystem-11]
- **Auto-rollback has a 10-second wall** — it only catches fatal JS errors within ~10s of first render,
  before state mutation. Crashes >10s in, or after a bad AsyncStorage/SQLite migration, are **not
  covered**; "in many cases users will still see a crash." Never treat rollback as a seatbelt. [raw:
  field-ota §4 — Expo error-recovery docs]
- **The safe OTA playbook:** gradual rollout always; known rollback/republish command in a runbook;
  foreground "Update Now/Later" modal (never silent reload — it loses in-progress input); check on every
  `AppState→active` (not just launch); skip the OTA check on a user's first launch. [raw: field-ota §5]

## JTBD-6 — Ship an AI/agent app that survives review (the rejection minefield)
This file's single highest-risk JTBD — a wrong assumption gets the app **rejected or pulled**, not slow.

- **You don't get rejected for "being AI" — you get rejected for how the AI app *behaves* against generic
  rules** (2.5.2, 4.2/4.2.6, 4.3, 1.2, 5.1.1). As of **2026-06-09 there is still NO AI-specific
  guideline.** [raw: field-store-review §1 — MacRumors 2026-06-09]
- **Guideline 2.5.2 is the load-bearing wall.** Apps "may not download, install, or execute code which
  introduces or changes features or functionality." **Content/data can change; executable code and
  features cannot — unless they run in WebKit.** This is why OTA stays legal and why vibe-coding apps got
  pulled. [raw: field-store-review §2, ecosystem-06 §OTA-line]
- **The canonical cautionary tale (know the timeline):** "Anything" (co-founder Dhruv Amin) launched
  Nov 2025; Apple silently blocked its updates Dec 2025; **Replit + Vibecode** updates blocked
  2026-03-18; "Anything" **pulled 2026-03-26**, **returned 2026-04-03** (reinstatement of Replit/Vibecode
  unconfirmed → [[GAPS-AND-DISPUTES]]). Amin's fix — preview generated code in a *web browser* instead of
  the native bundle — was *also* blocked. [raw: field-store-review §2]
- **The Nov-2025 + 2026 AI-relevant guideline changes:** **5.1.2(i)** consent modal naming provider + data
  types BEFORE any user data leaves for a third-party AI; **4.7 / 4.7.2 / 4.7.5** mini-apps in scope;
  **age tiers 13+/16+/18+** with AI-unpredictable-content accounting (answer the age questions or
  submission is interrupted); **4.3(b)** "may be removed" teeth for low-effort/saturated apps;
  **1.2** you are responsible for removing violating UGC (an agent surface relaying content = UGC). [raw:
  ecosystem-06 §guideline-changes, field-store-review §1/§3]
- **Appeal mechanics that work:** one appeal per rejection; escalate 4.3 to the **App Review Board** with
  a written *differentiation* memo (a judgment call — cosmetic resubmits lose). [raw: field-store-review §3]
- **The pre-submission checklist:** consent modal · honest (conservative) age rating · no self-modifying
  code · disclose automated decisions · accurate privacy nutrition labels · first Play upload by hand ·
  ASC API key for non-interactive iOS submit. [raw: ecosystem-06 §checklist]

## JTBD-7 — Push notifications (the dev-build reality)
- **Two architectures:** (A) **Expo Push Service** — one API over FCM v1 + APNs, uses an
  `ExponentPushToken[…]` (default for Expo apps); (B) raw FCM v1 + APNs (more control, lose uniformity).
  [raw: ecosystem-07 §architectures]
- **Gotcha 1 — remote push is removed from Expo Go (SDK 53+); a dev build is required.** Local/in-app
  notifications still work in Expo Go. Combined with the Expo-Go App-Store demotion: **to test push you
  need a development build, full stop.** (Even Expo's own docs were stale-wrong about this — #41118.)
  [raw: ecosystem-07 §gotcha1, ecosystem-10 §push]
- **Gotcha 2 — FCM v1 is mandatory for Android** (OAuth via a Firebase service-account JSON). A project
  assuming the legacy server key will not deliver. [raw: ecosystem-07 §gotcha2]
- **Token lifecycle:** Expo push tokens rotate — re-fetch on launch and update the server; a token is
  tied to a specific build/credentials (an Expo-Go token won't work in a dev build). [raw: ecosystem-07
  §lifecycle]

## JTBD-8 — Operate the New-Architecture toolchain & supporting libraries
- **The libs that break builds:** **Reanimated v4 = New-Arch-only** (single most common "why won't it
  build" on old projects; requires `react-native-worklets`); **gesture-handler v3**; **FlashList v2** is
  a rewrite (no `estimatedItemSize`); RN's `SafeAreaView` deprecated → `react-native-safe-area-context`.
  [raw: ecosystem-01 §supporting-libs]
- **State/storage taste:** **Zustand** over Redux (90% less boilerplate); **MMKV** over AsyncStorage (30x
  faster, synchronous; New-Arch migrations actively rip AsyncStorage out). [raw: field-taste §A — Andy G]
- **Tooling that died:** **Flipper is dead** → RN DevTools / Hermes tooling; **CodePush is dead** → EAS
  Update; **eject-to-bare is obsolete** → CNG + Expo Modules API + config plugins. [raw: field-taste §C]
- **The five 2026 breakage categories** (check these before deep-debugging app code): (1) New-Arch native
  crashes (SIGSEGV/SIGABRT) that look like app bugs, (2) `fingerprint` runtimeVersion DX traps, (3)
  pnpm-monorepo Metro resolution, (4) incomplete upgrade codemods, (5) Expo-Go push assumptions. [raw:
  ecosystem-10 §meta-lesson]

## JTBD-9 — Live inside the Energy pnpm monorepo
- **Reference:** `byCedric/expo-monorepo-example` (991★, pushed 2026-06-10, by an Expo team member) — the
  pnpm-hoisted, EAS-buildable structure to copy. [raw: ecosystem-08 §B, ecosystem-09 #4]
- **pnpm needs `nodeLinker: hoisted`** (default isolated/symlink layout breaks RN tooling); do NOT set
  `disableHierarchicalLookup:true`; pin single `react`/`react-native` versions. **SDK 52+ auto-configures
  Metro** — delete manual `watchFolders`/`resolver.*` if migrating an old project. [raw: ecosystem-08 §B]
- **Budget for "EAS Build assumes Yarn, not pnpm"** friction up front — confirmed in issues (#44500
  Metro `getPackage` crash on expo≥55.0.10 in a pnpm monorepo). [raw: ecosystem-08 §B, ecosystem-10 §metro]

## JTBD-10 — Verify as a USER (the agent's QA primitives) & self-improve
- **`xcrun simctl io booted screenshot out.png` is the agent's QA primitive** — satisfies "test as a user,
  screenshot, READ it" for mobile, exactly as the web harness screenshots prod. `simctl install/launch/
  openurl` are the hands; Android: `adb install` / `adb exec-out screencap -p` / `adb shell am start`.
  [raw: ecosystem-11 §simulator]
- **E2E:** **Maestro** (YAML flows on sim + dev build) is the de-facto mobile E2E tool; Detox is the older
  gray-box option. [raw: ecosystem-11 §E2E]
- **Vendor `expo/skills`** (2,052★, pushed today) — the **official Expo AI-agent skills for Claude Code**
  to drive Expo + EAS; reference rather than re-derive. Wire the **Expo MCP Server** to read build status
  + TestFlight crashes without scraping. [raw: ecosystem-09, ecosystem-11 §agent-tooling] → see [[TOOL-MATRIX]]
- **Pre-flight checklist before any build/ship:** confirm versions (`npm view`) → `expo-doctor` →
  EXPO_TOKEN/creds present → `--non-interactive` (+`--no-wait`/`--json`) on every command → `--environment`
  on `eas update` → after build `build:run` → `simctl screenshot` → **read it** → before OTA, did anything
  native change? If yes, rebuild + bump runtimeVersion, don't OTA. [raw: ecosystem-11 §pre-flight]

---

## How this map stays alive (anti-staleness)
1. **Versions die; judgment ages slowly.** This map points at the *durable* knowledge in [[KNOWN-PITFALLS]],
   [[OPINIONS]], [[BATTLE-TESTED-SCENARIOS]]; for any number, re-run `npm view` / re-check the live doc.
2. **Issues over docs when something breaks** — docs show the happy path; `ecosystem-10` + the field files
   show what actually crashes.
3. **What pebble must resolve by its own experiment** (not yet answered by the corpus) is enumerated in
   [[GAPS-AND-DISPUTES]] — chief among them: run pebble's own EAS build on the Energy stack and record
   whether SDK-54/55 + New-Arch OTA (#45772) reproduces.
