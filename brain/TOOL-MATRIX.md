---
title: "TOOL-MATRIX — canonical tools, agent-access surface, and required secrets"
type: synthesis
created: "2026-06-11"
updated: "2026-06-11"
tags: [tools, matrix, cli, mcp, secrets, env, react-native, expo, eas, pebble]
sources:
  - "brain/research/raw/ecosystem-01-versions-matrix.md"
  - "brain/research/raw/ecosystem-05-eas-build-submit-update.md"
  - "brain/research/raw/ecosystem-06-distribution-pipelines.md"
  - "brain/research/raw/ecosystem-07-push-notifications.md"
  - "brain/research/raw/ecosystem-08-decision-frameworks.md"
  - "brain/research/raw/ecosystem-09-starter-repos.md"
  - "brain/research/raw/ecosystem-11-agent-operating-guide.md"
  - "brain/research/raw/field-eas-build-failures-2026.md"
  - "brain/research/raw/field-taste-disagreements-2026.md"
related: ["[[MOC - pebble]]", "[[EXPERTISE-MAP]]", "[[OPINIONS]]", "[[KNOWN-PITFALLS]]", "[[BATTLE-TESTED-SCENARIOS]]", "[[GAPS-AND-DISPUTES]]"]
summary: "The canonical June-2026 mobile toolbelt: default tool vs alternatives per job, the agent-access surface (CLI/API/MCP/skill), and the env vars/secrets — this is the source for the Wave-P Required-Secrets manifest."
---

# TOOL-MATRIX

> The canonical tools pebble operates, **what an agent can drive each through (CLI / API / MCP / skill)**,
> and the **secrets each needs.** §5 (Required Secrets) is the direct input to the **Wave-P Required-
> Secrets manifest.** Versions are npm ground truth at **2026-06-11** — **re-run `npm view` before quoting
> one (Rule 0; npm `latest` can be ahead of the blog).** [raw: ecosystem-01, ecosystem-11]

---

## §1 — Canonical tool selection (default vs alternatives, by job)

| Job | **Default** | Alternatives (when) | Never (2026) | Source |
|---|---|---|---|---|
| Framework | **Expo (managed RN) + custom dev builds** | Bare RN (deliberate escape hatch, ~5-15%); Flutter (raw render perf, costs Dart); PWA (reactive/cloud-only, 40-60% cheaper) | Old-arch RN; `newArchEnabled:false` | field-taste §A/B, ecosystem-08 |
| Scaffold | **`npx create-expo-app@latest`** (SDK-56: expo-router + Expo UI + `/src`) | `obytes` template (configured stack, Energy-aligned); `create-t3-turbo` (web+mobile+API) | stale templates (e.g. ixartz, ~10mo stale) | ecosystem-09 |
| Routing | **expo-router** (typed routes on) | raw React Navigation v7 (only if you must drop down — currently gated, #46480) | untyped navigation | ecosystem-04 |
| Native deps install | **`npx expo install`** | — | hand `npm install <native-lib>` | ecosystem-02/11 |
| Dep health gate | **`npx expo-doctor@latest`** (→ React Native Directory) | — | shipping without it | ecosystem-02 |
| JS engine | **Hermes V1** (default RN 0.84+) | community JSC (rare) | assuming JSC default; V8 (dropped) | ecosystem-02 |
| Animations | **Reanimated 4** (+ `react-native-worklets`) | — | Reanimated 4 on pre-Fabric apps | ecosystem-01, field-migration §4 |
| Gestures | **gesture-handler v3** | — | v2 API w/ Reanimated 4 | ecosystem-01 |
| Lists | **FlatList <500; FlashList v2 at 500+/jank** | LegendList (New-Arch perf ceiling) | blind list-lib swap; `estimatedItemSize` on FlashList v2 | field-taste §A, ecosystem-01 |
| Safe area | **react-native-safe-area-context** | — | RN's deprecated `SafeAreaView` | ecosystem-01 |
| State | **Zustand** | Redux (large invested team) | Redux reflexively | field-taste §A |
| KV storage | **MMKV** (30x faster, sync) | AsyncStorage (only if a lib needs it) | AsyncStorage as default | field-taste §A |
| Build | **EAS Build** (cloud) | `--local` / `npx expo run:ios|android` (offline) | unpinned eas-cli in CI | ecosystem-05/11, field-eas §2 |
| Submit | **EAS Submit** | — | API-bootstrap a brand-new Play listing | ecosystem-06 |
| OTA | **EAS Update** (fingerprint RV policy) | — | CodePush/AppCenter (DEAD) | ecosystem-05, field-ota §6 |
| Push | **Expo Push Service** (FCM v1 + APNs) | raw FCM v1 + APNs / `@react-native-firebase/messaging` | legacy FCM server key; testing push in Expo Go | ecosystem-07 |
| Debugging | **RN DevTools** (Hermes) | — | Flipper (DEAD) | field-taste §C |
| E2E testing | **Maestro** (YAML, sim + dev build) | Detox (older gray-box) | — | ecosystem-11 |
| Agent QA primitive | **`xcrun simctl io booted screenshot`** / `adb exec-out screencap -p` | — | declaring success on "it builds" | ecosystem-11 |
| Monorepo | **pnpm + `nodeLinker: hoisted`** (+ Turborepo) | Bun/npm/Yarn | `disableHierarchicalLookup:true`; manual Metro config on SDK 52+ | ecosystem-08 |

---

## §2 — Agent-access surface (how pebble *drives* each tool: CLI / API / MCP / skill)

### CLIs (the primary surface — all must run `--non-interactive`)
- **`eas-cli` (20.1.0)** — `build` / `submit` / `update` / `credentials` / `env:list` / `build:list` /
  `build:view` / `build:run` / `device:create`. **Headless flags:** `--non-interactive` (always),
  `--no-wait`, `--json`, `--profile`, `--platform ios|android|all`, `--local`, `--latest`. **Pin exactly
  in CI** (regressed in 18.5.0/18.13.1/19.0.1). [raw: ecosystem-11, field-eas-build-failures §2]
- **`@expo/cli` (`npx expo …`, 56.1.15)** — `install`, `start`, `run:ios|run:android`, `export`
  (reproduce bundling locally to catch case/resolution bugs), `prebuild --clean` (after adding native libs).
  [raw: ecosystem-11, field-eas-build-failures §4]
- **`npx expo-doctor@latest`** — New-Arch/dep health gate. [raw: ecosystem-02]
- **`npx @expo/fingerprint`** — compute the runtime fingerprint (had non-determinism on 54.0.22 — verify
  stability). [raw: ecosystem-10]
- **`npm view`** — version ground truth (`react-native version`, `expo dist-tags --json`, `eas-cli version`).
  [raw: ecosystem-11]

### Agent QA / device primitives (the agent's "hands" and "eyes")
- **iOS Simulator (`xcrun simctl`)** — `list devices`, `boot "iPhone 16"`, `install booted App.app`,
  `launch booted <bundle.id>`, **`io booted screenshot out.png`** (the verify-as-user primitive),
  `openurl booted "myapp://path"` (deep-link test). [raw: ecosystem-11 §simulator]
- **Android Emulator (`adb` / `emulator`)** — `emulator -list-avds`/`-avd <name>`, `adb install app.apk`,
  `adb shell am start -n <pkg>/.MainActivity`, **`adb exec-out screencap -p > out.png`**,
  `adb shell am start -a android.intent.action.VIEW -d "myapp://path"`. [raw: ecosystem-11]

### MCP (wire into `.mcp.json`)
- **Expo MCP Server** — query **EAS build status + TestFlight crashes** programmatically (no scraping).
  SDK-55-era. The agent's structured read path for build/crash state. [raw: ecosystem-05, ecosystem-11]

### Skills (vendorable, official)
- **`expo/skills`** — the **official Expo AI-agent skills repo for Claude Code** to drive Expo + EAS
  (2,052★, pushed 2026-06-11). **Vendor/reference these rather than re-deriving EAS workflows.** Pin the
  version you vendor (moves fast). [raw: ecosystem-09, ecosystem-11 §agent-tooling] → [[OPINIONS]] Stance 18

### Reference repos (copy structure, don't reinvent)
- **`byCedric/expo-monorepo-example`** (991★, 2026-06-10) — pnpm-hoisted, EAS-buildable monorepo.
- **`obytes/react-native-template-obytes`** (4,216★, 2026-06-02) — fully-configured production starter.
- **`expo/examples`** (3,641★) — per-API lookup. **`expo/expo`** (50,000★) — where all issues live.
  [raw: ecosystem-09]

### Raw HTTP (fallback)
- **Expo Push API** — `POST https://exp.host/--/api/v2/push/send` `{ to, title, body, data }`. [raw: ecosystem-07]
- **App Store Connect API / Google Play Developer API** — reached via EAS Submit; direct use is the escape
  hatch. [raw: ecosystem-06]

---

## §3 — The non-interactive command cookbook (copy-paste, agent-safe)
```sh
# 0. version ground truth (Rule 0 — never quote from memory)
npm view react-native version
npm view expo dist-tags --json
npm view eas-cli version

# 1. scaffold + validate
npx create-expo-app@latest my-app
npx expo install <pkg>            # native deps ONLY via expo install
npx expo-doctor@latest            # New-Arch + dep health gate
npx expo export                   # reproduce bundling locally (catches case/resolution bugs)

# 2. build (cloud: fire + poll, never block)
EXPO_TOKEN=$TOK npx eas-cli build --platform all --profile preview --non-interactive --no-wait --json
npx eas-cli build:list --limit 1 --json --non-interactive
npx eas-cli build:view <BUILD_ID> --json

# 2b. build (local, no cloud, dirty/no-git tree)
EAS_NO_VCS=1 npx eas-cli build --platform ios --profile development --local --non-interactive

# 3. submit
npx eas-cli submit --platform ios --latest --non-interactive       # needs ascAppId + ASC API key
npx eas-cli submit --platform android --latest --non-interactive   # service-account JSON; 1st upload manual

# 4. OTA (note the MANDATORY --environment since SDK 55)
npx eas-cli update --channel production --message "Fix X" --environment production --non-interactive

# 5. verify AS A USER (the QA primitive)
npx eas-cli build:run --platform ios --latest        # install on booted simulator
xcrun simctl io booted screenshot out.png            # ... then READ out.png
```
[raw: ecosystem-11 — the load-bearing agent file]

---

## §4 — Default `eas.json` shape (with the simulator profile for agent QA)
```json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview":     { "distribution": "internal" },
    "production":  { "autoIncrement": true },
    "sim":         { "developmentClient": true, "distribution": "internal", "ios": { "simulator": true } }
  }
}
```
`developmentClient:true` → embeds expo-dev-client; `distribution:"internal"` → installs without a store;
`channel` (added by `eas update:configure`) ties a build to an Update channel. **`ios.simulator:true` lets
the agent build a simulator-installable dev build it can screenshot.** (Verify the `simulator` key wasn't
renamed on SDK 56 → [[GAPS-AND-DISPUTES]] Part-C.) [raw: ecosystem-05, ecosystem-11]

---

## §5 — REQUIRED SECRETS (the Wave-P manifest source)

> These are the env vars/secrets pebble needs to operate the toolchain headlessly. **Prefer API keys over
> Apple-ID+2FA (2FA can't be automated).** Never log tokens; never put them in URLs. This table is the
> direct input to the Wave-P Required-Secrets manifest.

| Secret / env var | Purpose | Surface that needs it | Obtain | Required for |
|---|---|---|---|---|
| **`EXPO_TOKEN`** | Headless EAS auth (personal access token) — **THE agent auth path** | eas-cli (all) | Expo account → Access Tokens | any EAS build/submit/update |
| **`EXPO_ASC_API_KEY_PATH`** | App Store Connect API Key file path (CI-friendly, no 2FA) | eas submit iOS / credentials repair | App Store Connect → Users & Access → Keys | iOS submit/credentials |
| **`EXPO_ASC_KEY_ID`** | ASC API Key ID | iOS submit/credentials | ASC Keys page | iOS submit/credentials |
| **`EXPO_ASC_ISSUER_ID`** | ASC API Key issuer id | iOS submit/credentials | ASC Keys page | iOS submit/credentials |
| **`EXPO_APPLE_TEAM_ID`** | Apple Developer team id | iOS signing | Apple Developer account | iOS build/submit |
| **`EXPO_APPLE_TEAM_TYPE`** | Apple team type | iOS signing | Apple Developer account | iOS build/submit |
| **`ascAppId`** (eas.json) | App Store Connect app id | eas submit iOS | App Store Connect app record | iOS submit |
| **Google service-account JSON** (path in eas.json submit) | Play Console upload auth | eas submit Android | Google Cloud → Service Accounts (Play perms) | Android submit (after 1 manual upload) |
| **FCM v1 service-account JSON** | Android push delivery (OAuth) | Expo Push / EAS credentials | Firebase project → Service accounts | Android push |
| **`google-services.json`** | Firebase Android config | app build | Firebase project | Android push/Firebase |
| **APNs key** (`.p8`, uploaded to EAS) | iOS push delivery | Expo Push / EAS credentials | Apple Developer → Keys → APNs | iOS push |
| **`EAS_NO_VCS=1`** (env, not a secret) | Local build in dirty/no-git tree | eas build --local | n/a | local builds |

**Handling rules:** for EAS Build, gitignored secret files are **not uploaded** — base64-encode and
recreate via build hooks ([[KNOWN-PITFALLS]] §3); be aware `fingerprint` + file-based secrets interact
badly (#33852). [raw: ecosystem-11 §auth, ecosystem-06, ecosystem-07, ecosystem-10]

---

## §6 — Ecosystem watch (the `externalIntelligence` source for dsip.json)
`dsip.json` declares external-intelligence from a "vertical ecosystem watch." The canonical watch surfaces:
- **npm registry** — `npm view` for RN/expo/eas-cli (versions are perishable; npm is truth for availability).
- **Changelogs** — `expo.dev/changelog` (SDK deltas), `reactnative.dev/blog` (RN releases; can lag npm).
- **Issue trackers** — `expo/expo` + `expo/eas-cli` (what actually breaks; **`facebook/react-native` gh
  search returned 422 at capture — browse by reactions instead**, → [[GAPS-AND-DISPUTES]] Part E).
- **WG repos** — `reactwg/react-native-new-architecture`, `reactwg/react-native-releases`.
- **`expo/skills`** — re-pull for new agent skills (pushed daily-ish).
- **X / practitioner blogs** — secondary, clearly labeled; never the sole source for a version claim.
[raw: ecosystem-00 §source-freshness, ecosystem-11, ecosystem-10]

---

## Re-verification cadence
Per `dsip.json` `re-verify-tool-matrix` (nightly when armed): re-run §3 step 0 (`npm view`) and diff the
versions in §1 against this file; if an SDK/RN major moved, re-read the new changelog and update
[[EXPERTISE-MAP]] + [[KNOWN-PITFALLS]]. **This matrix is a snapshot — its job is to be re-verified, not
trusted indefinitely.**
