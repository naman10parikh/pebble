---
title: "OPINIONS — pebble's taste stances (always/never, with the why and the asterisks)"
type: synthesis
created: "2026-06-11"
updated: "2026-06-11"
tags: [opinions, taste, decisions, react-native, expo, eas, pebble]
sources:
  - "brain/research/raw/ecosystem-02-react-native-new-arch.md"
  - "brain/research/raw/ecosystem-03-expo-sdk-deltas.md"
  - "brain/research/raw/ecosystem-04-expo-router.md"
  - "brain/research/raw/ecosystem-05-eas-build-submit-update.md"
  - "brain/research/raw/ecosystem-06-distribution-pipelines.md"
  - "brain/research/raw/ecosystem-08-decision-frameworks.md"
  - "brain/research/raw/ecosystem-09-starter-repos.md"
  - "brain/research/raw/ecosystem-11-agent-operating-guide.md"
  - "brain/research/raw/field-ota-update-boundaries-2026.md"
  - "brain/research/raw/field-store-review-ai-apps-2026.md"
  - "brain/research/raw/field-pwa-vs-native-2026.md"
  - "brain/research/raw/field-taste-disagreements-2026.md"
related: ["[[MOC - pebble]]", "[[EXPERTISE-MAP]]", "[[KNOWN-PITFALLS]]", "[[BATTLE-TESTED-SCENARIOS]]", "[[GAPS-AND-DISPUTES]]", "[[TOOL-MATRIX]]"]
summary: "pebble's explicit, defensible taste — each stance is 'always X / never Y, because Z (source)', with the honest DX asterisk where the right call has a cost. Distilled from attributed engineer opinions + production postmortems, not vibes."
---

# OPINIONS — pebble's taste

> Taste is what separates a dangerous mobile engineer from a tutorial-follower. Each stance below is a
> **defensible default with a named reason and an honest asterisk** — taken from attributed practitioners
> (Siddhant Shukla, Andy G, Jack Rosa, Abiodun Abdullahi, magicbell, pkgpulse) and primary docs, never
> invented. Where the field genuinely disagrees, the stance points to [[GAPS-AND-DISPUTES]] rather than
> pretending consensus. **Defaults are rebuttable** — state the reason you're overriding.

---

## STANCE 1 — Always start with Expo (managed + custom dev builds). Never start bare.
- **Because:** EAS Build/Submit/Update, dev clients, config plugins, and New-Arch-correct dependency
  resolution remove ~all the native-toolchain pain that historically justified bare. Shukla: *"begin with
  Expo… Don't let anyone convince you that bare React Native is the 'real' way."* The consensus has
  hardened to **~95% Expo / ~5% bare** (rubyroidlabs) or **~85/15** (Andy G).
- **Asterisk (the honest cost):** Jack Rosa's dissent is real — you can end up *"fighting against Expo's
  conventions"* and Expo-only devs *"lack the deep native knowledge"* to debug at the native boundary.
  So: **default Expo with eyes open** — retain native debugging skill and keep an exit path (CNG means you
  *can* leave). Bare is a deliberate escape hatch, not a starting point.
- **Source:** [raw: field-taste §A/§B-Disagreement1, ecosystem-08 §A]. The 95/5-vs-85/15 split is the only
  live numeric disagreement → [[GAPS-AND-DISPUTES]].

## STANCE 2 — Always use development builds. Never default to Expo Go for anything real.
- **Because:** Expo Go is officially demoted to *"an educational tool for beginners,"* tracks only the
  latest fully-approved SDK, can't side-load older SDKs on a physical iPhone, and **remote push doesn't
  work in it (SDK 53+).** A dev build is required for native libs, custom name/icon/URL-schemes, background
  modes, and real-device push.
- **Asterisk:** Expo Go is genuinely fine for a trivial JS-only SDK-54-era *learning* demo — don't
  over-rebuild for a throwaway. But the harness default is **scaffold a dev client + an EAS dev build.**
- **Source:** [raw: ecosystem-03 §Expo-Go-shift/§decision-rule, ecosystem-07]

## STANCE 3 — Always `npx expo install` for native deps. Never `npm install` a native lib by hand.
- **Because:** `expo install` resolves the **SDK-correct, New-Arch-compatible** version. Hand-pinning a
  native dep is the **#1 way to land an incompatible combo** that surfaces as a cryptic native crash.
- **Asterisk:** Pure JS-only dev deps (eslint, types) are fine via your package manager. The rule is about
  **native** deps and anything with a config plugin.
- **Source:** [raw: ecosystem-02 §practical, ecosystem-11]

## STANCE 4 — Always run `npx expo-doctor` before every build. It's the cheapest gate that exists.
- **Because:** It validates deps against **React Native Directory** (the source of truth for New-Arch +
  maintenance status) and catches incompatibilities *before* they become a cryptic native crash on a paid
  cloud build. Free; seconds; saves build minutes and debugging hours.
- **Asterisk:** It's a gate, not a guarantee — it won't catch a runtime Fabric-flattening null ref (that's
  a manual hunt, see [[KNOWN-PITFALLS]] §7).
- **Source:** [raw: ecosystem-02 §compat, ecosystem-11 §pre-flight]

## STANCE 5 — Always enable typed routes in expo-router. Never ship untyped navigation.
- **Because:** Typed routes turn renamed/missing-route bugs into **compile errors `tsc` catches before
  ship** instead of runtime crashes — a whole bug class deleted for one config flag.
- **Asterisk:** The exact SDK-56 config key for enabling typed routes is **unconfirmed in the corpus**
  (`experiments.typedRoutes` is the historically stable key) — verify against the live `docs.expo.dev/
  router` before scaffolding. → [[GAPS-AND-DISPUTES]]
- **Source:** [raw: ecosystem-04 §typed-routes]

## STANCE 6 — Always use the `fingerprint` runtimeVersion policy for OTA. Never use `appVersion` for human-discipline targeting.
- **Because:** `fingerprint` **computes the native-compat boundary for you** — it hashes the native dep
  graph + plugins so EAS *refuses* to send native-needing JS to old binaries. The `appVersion` policy makes
  targeting a manual discipline humans get wrong in exactly two documented ways: (1) bumping `version` for
  an OTA scopes it to a runtime no user has yet (reaches nobody), (2) forgetting to bump it lets an OTA hit
  an old binary → **"Native module cannot be null."**
- **Asterisk (real DX costs — know them, don't be surprised):** `fingerprint` means **more native
  rebuilds**, can **break the Metro dev-server connection** (#43908), **fails with file-based secrets**
  (#33852), and has had **non-determinism** that silently drifts your RV (#40898). The stance still holds —
  the safety beats the friction — but wire it knowing these. See [[KNOWN-PITFALLS]] §2.
- **Source:** [raw: ecosystem-05 §runtimeVersion, field-ota §2, ecosystem-10]

## STANCE 7 — OTA is for JS/asset iteration ONLY, never capability changes. The technical wall IS the policy wall.
- **Because:** OTA can *only* ship JS/styles/assets to an already-reviewed binary — it **cannot add native
  capability** (cross the line → "Native module cannot be null"). That same line is **Apple Guideline
  2.5.2**: you may not "download, install, or execute code which introduces or changes features." EAS
  Update stays legal *precisely because* it can't add native features. The vibe-coding pulls (Replit,
  Vibecode, "Anything") prove the enforcement is live. **The moment you'd need new native capability →
  new binary + new review.**
- **Asterisk (the aggressiveness dial vs the boundary):** Shukla is right that OTA-without-review is *why
  people love Expo* — so **be aggressive on rollout cadence (with monitoring), never aggressive on what you
  push.** The cadence is a risk tradeoff; the JS-only boundary is non-negotiable. This is the synthesis of
  the genuine OTA disagreement → [[GAPS-AND-DISPUTES]] Disagreement-2.
- **Source:** [raw: field-ota §1, field-store-review §2, field-taste §B-Disagreement2]

## STANCE 8 — Never 100% an OTA. Always gradual rollout + a foreground modal + a known rollback command.
- **Because:** Auto-rollback only catches **fast, early (<10s), pre-state-mutation** JS crashes — *"not a
  full safety net; in many cases users will still see a crash."* On SDK 54/55 + New Arch, the
  **error-recovery queue itself can crash on activation** (#45772). Abdullahi's postmortems: silent reload
  loses in-progress user input; long-backgrounded users never cold-start so never get the fix; first-launch
  users see phantom "Update Available."
- **The concrete policy:** roll to a % and watch crash rate before widening; **foreground "Update Now /
  Maybe Later" modal** (never silent reload), disabled while downloading; check on every
  `AppState → active` (not just launch); **skip the OTA check on a user's first launch**; keep
  `eas update … --republish` of the prior bundle in a runbook.
- **Asterisk:** On SDK 54/55 + New Arch specifically, treat iOS OTA as **not-yet-trustworthy** until #45772
  resolves — consider shipping JS changes as full builds. → [[GAPS-AND-DISPUTES]]
- **Source:** [raw: field-ota §3/§4/§5]

## STANCE 9 — Pin eas-cli exactly in CI. Never let it float.
- **Because:** eas-cli **shipped broken in multiple 2026 point releases** — 18.5.0 (broke `device:create`),
  18.13.1 (iOS build JSON parse error), 19.0.1 (couldn't install itself on cloud workers). A silent bump
  must not break your pipeline overnight.
- **Asterisk:** Pinning means you must *deliberately* upgrade and re-test — schedule it; don't go stale for
  a year either (you'll miss the `--environment`-style server-coupled changes).
- **Source:** [raw: field-eas-build-failures §2]

## STANCE 10 — Plan native-module upgrades around EAS's Xcode/Node assignment, not the reverse.
- **Because:** On managed EAS you **do not control the Xcode version** — it's derived from your SDK and the
  `image` pin is rejected (`"image is not allowed"`). VisionCamera V5/NitroModules failed on EAS's forced
  **Xcode 26 beta for SDK 54** with no opt-out; the only levers were downgrade-SDK or wait-for-the-module.
- **Asterisk:** A bare/self-hosted-runner path *does* let you own the toolchain — that's a legitimate reason
  some teams keep an exit path (Stance 1's asterisk).
- **Source:** [raw: field-eas-build-failures §3]

## STANCE 11 — Default the starter to obytes; reach for create-t3-turbo only for shared web+mobile+API.
- **Because:** `obytes/react-native-template-obytes` (4,216★, pushed 2026-06-02) has **every tool actually
  configured** (Expo + pnpm + TS + NativeWind + expo-router + EAS + GH Actions + TanStack Query +
  react-hook-form + Zustand + MMKV + i18next) and **aligns with the Energy fleet's pnpm/TS/EAS stack.**
  `create-t3-turbo` (6,058★) is the right call *only* when you need a shared backend + web + mobile
  (tRPC end-to-end) in one Turborepo.
- **Asterisk:** For a clean modern app you often need **no template at all** — `npx create-expo-app@latest`
  already ships expo-router + Expo UI + `/src` on SDK 56. Don't add a template's opinions you won't use.
- **Source:** [raw: ecosystem-09 #1/#2, ecosystem-09 §just-start]

## STANCE 12 — Storage: MMKV by default. State: Zustand by default. Never reach for AsyncStorage/Redux reflexively.
- **Because:** **MMKV is "30x faster and synchronous"** (Andy G) and New-Arch migrations actively rip
  AsyncStorage out; **Zustand is "90% less boilerplate"** than Redux at app scale.
- **Asterisk:** AsyncStorage stays where a specific lib requires it; Redux is fine on a large team already
  invested in it — these are *defaults*, not bans.
- **Source:** [raw: field-taste §A]

## STANCE 13 — Lists: FlatList until it hurts, FlashList v2 at 500+/jank. Never blind-swap list libraries.
- **Because:** *"FlatList will never go away… millions of production apps rely on it"* — reach for FlashList
  at **500+ items or visible jank** (migration ≈ 15 min). **But don't skip memoization before upgrading** —
  *"skipping straight to a new list library can hide item-component bugs that memoization and stable keys
  would have caught."*
- **Asterisk:** FlashList **v2 dropped `estimatedItemSize`** (auto-sizing); on v1, a wrong
  `estimatedItemSize` *guts* the perf win (teams chronically underestimate item height). Mixed item types
  need `getItemType` or you get recycle glitches.
- **Source:** [raw: field-taste §A, ecosystem-01]

## STANCE 14 — Never ship LLM-generated mobile code unreviewed at the native boundary.
- **Because:** Shukla: *"'I'll just ship the generated code' has burned me enough times that I don't do it
  anymore."* The native boundary is exactly where **Fabric view-flattening null refs** and **TurboModule
  nulls** cause *silent* failures (white screen, dead ActionSheet) with no stack trace. (Directly relevant:
  pebble itself generates mobile code.)
- **Asterisk:** Generate aggressively — the stance is *review at the native boundary*, not *don't use AI.*
  Pure-JS UI generated code is lower-risk than anything touching native modules/refs.
- **Source:** [raw: field-taste §A]

## STANCE 15 — Default an *agent* app to native the moment it needs proactive push / background / durable memory / sensors. Otherwise a PWA is legitimately enough (and 40-60% cheaper).
- **Because:** A reactive, cloud-backed agent (server-side inference, no hardware) is the *exact* profile a
  PWA covers — and it's **40-60% cheaper.** But iOS PWA push is **home-screen-install-only, no silent/rich,
  EU-blocked**; **no Background Sync/Fetch**; **7-day cache eviction + 50MB cap** means a PWA can't hold
  durable local memory. For an agent whose value is **persistent memory or proactive nudges**, that's
  disqualifying. Use the **"3+ → native"** rule over {BLE/NFC, GPU, widgets/Siri, large offline data,
  platform UI}.
- **Asterisk:** Engineers chronically *overestimate* iOS PWA capability (magicbell). Don't let
  "Apple opened iOS to PWAs" talk you into a PWA for a proactive/background/sensor use case. The 70%-PWA-is-
  enough figure is an unconfirmed estimate → [[GAPS-AND-DISPUTES]].
- **Source:** [raw: field-pwa-vs-native §1/§4/§5, field-taste §A]

## STANCE 16 — For an AI app on the store: ship a fixed, reviewed native shell; be visibly differentiated; disclose every data flow.
- **Because:** You don't get rejected for *being* AI — you get rejected for *behavior* against generic
  rules. **Never** execute server-delivered code that changes features (2.5.2 — Replit/Vibecode/"Anything"
  pulled). **Always** have a concrete demonstrable unique feature ready (4.3 spams thin wrappers — and the
  winning appeal is a *differentiation memo* to the App Review Board, one appeal per rejection). **Always**
  show a consent modal naming the provider + data types **before** any user data leaves for a third-party
  AI (5.1.2(i)); pick a **conservative age rating** accounting for AI-unpredictable content; ship
  moderation/reporting if the agent surfaces UGC (1.2 puts removal on you); keep privacy nutrition labels
  accurate.
- **Asterisk:** As of **2026-06-09 there is no AI-specific guideline** — but the generic teeth ("may be
  removed," UGC-removal duty) tightened. If generated code *must* run dynamically, run it in **WebKit/a
  WebView**, never the native runtime.
- **Source:** [raw: field-store-review §1/§2/§3, ecosystem-06]

## STANCE 17 — Always verify as a USER via simulator screenshots. "It builds" means nothing.
- **Because:** `xcrun simctl io booted screenshot out.png` (+ `adb exec-out screencap -p` on Android) is the
  agent's QA primitive — it satisfies "test as a user, take a screenshot, READ it" for mobile, exactly as
  the web harness screenshots prod. Many 2026 failures are **silent** (white screen, no error) — only a
  screenshot catches them.
- **Asterisk:** Screenshots catch render bugs, not flows — pair with **Maestro** (YAML E2E on sim + dev
  build) for user-flow coverage.
- **Source:** [raw: ecosystem-11 §simulator/§E2E]

## STANCE 18 — Vendor `expo/skills` + the Expo MCP Server. Never re-derive EAS workflows from scratch.
- **Because:** `expo/skills` (2,052★, pushed today) is the **official Expo AI-agent skills repo built for
  Claude Code** to drive Expo + EAS; the Expo MCP Server reads build status + TestFlight crashes
  programmatically. Re-deriving these wastes tokens and drifts from Expo's tested path.
- **Asterisk:** Pin/track the version you vendor — it moves fast (pushed *today* at capture). See [[TOOL-MATRIX]].
- **Source:** [raw: ecosystem-09, ecosystem-11 §agent-tooling]

---

## The meta-stance (how pebble holds opinions)
**Strong opinions, source-cited, weakly held against evidence.** Every stance here names *why* and *who
said so*; when pebble overrides a default it must state the reason. The two stances most likely to flip on
new data are **#1 (the 95/5-vs-85/15 Expo split)** and **#8 (OTA trustworthiness on SDK 54/55 + New Arch,
pending #45772)** — both tracked in [[GAPS-AND-DISPUTES]]. **Aggressive on research/exploration; surgical on
edits** (the fleet's Karpathy discipline) — these opinions govern *what to build*, not license to
over-build.
