# pebble — Bootstrap Memory

> The facts pebble must hold **before any task.** ≤ ~1,500 words, mobile-critical only. This is NOT a copy
> of the brain — it is a pointer-rich bootstrap. **For depth, query `brain/*.md` via `pebble brain "<q>"`**
> (BM25 over the expertise brain). Vertical: **React Native · Expo · EAS only.** Identity: `identity/SOUL.md`.

## Rule 0 — the rule that overrides recall

Training memory is **one era behind: SDK 53 / RN 0.80.** Never quote a version from memory. Run:
`npm view react-native version` · `npm view expo dist-tags --json` · `npm view eas-cli version` **before**
quoting any version. npm `latest` can be *ahead* of the release blog. Wired as `pebble version-check`; the
nightly RSI loop diffs it vs `brain/TOOL-MATRIX.md` §1. (`brain/KNOWN-PITFALLS.md` §0/§9.)

## The era-delta (what training memory gets WRONG in 2026)

- **`newArchEnabled: false` is FALSE/dead** — RN 0.82+ can't disable New Arch; RN 0.83/SDK 55 removed legacy
  code; RN 0.85 has no bridge fallback. The world is **New-Architecture-only** (Fabric + TurboModules +
  Bridgeless). Never scaffold old-arch.
- **CodePush/AppCenter OTA is DEAD** (retired Mar 2025, New-Arch-incompatible) → **EAS Update** only.
- **Reanimated plugin moved** → `react-native-worklets/plugin` (v4 is New-Arch-only; APIs renamed).
- **Defaults flipped:** AsyncStorage→**MMKV**, Redux→**Zustand**, FlatList→**FlashList v2** (no
  `estimatedItemSize`), Flipper→**RN DevTools**, Expo Go→**dev builds**, eject→**CNG/Expo Modules API**.
- **iOS PWA push is asterisked** — home-screen-install-only, no silent/rich, EU-blocked, 7-day eviction,
  50MB cap. **Hermes is default both platforms**; first-party JSC removed in RN 0.81/SDK 54.
- Full table + detection/avoidance: `brain/KNOWN-PITFALLS.md` §0.

## The 5 breakage categories (the 60-second triage — BEFORE debugging app code)

Most 2026 failures are **not your React.** Triage in order:
1. **New-Arch native crashes** (SIGSEGV/SIGABRT or white screen, no JS trace) → New-Arch host/Fabric bug.
2. **`fingerprint` runtimeVersion DX traps** → Metro-dev-break (#43908), file-secret fail (#33852),
   non-determinism (#40898), `null` RV.
3. **pnpm-monorepo Metro resolution** (`getPackage` crash on isolated layout) → `nodeLinker: hoisted`.
4. **Incomplete upgrade codemods** (SDK-56 router codemod misses ~25% of imports, #46481) → grep + manual fix.
5. **Expo-Go push assumptions** (remote push removed from Expo Go SDK 53+) → dev build + FCM v1.

Triage map: timestamped/no-change/clustered build fail → **EAS infra** (not you); native SIGSEGV/white screen
→ **New-Arch** (not your React); OTA crash → **JS/native boundary** + #45772; CI-broke-but-local-fine →
`--environment` / Node 22 / case-sensitivity / eas-cli version / pnpm layout; push-not-arriving → Expo Go /
FCM v1. (`brain/KNOWN-PITFALLS.md` "60-second triage".)

## The OTA wall (the technical wall IS the policy wall)

OTA ships **JS/styles/assets ONLY** to an already-reviewed binary — it **cannot add native capability**
(cross it → "Native module cannot be null"). That line is **Apple Guideline 2.5.2** (no executing code that
changes features). EAS Update stays legal *because* it can't add native features. **Need new native capability
→ new binary + new review.**
- Use the **`fingerprint`** runtimeVersion policy (computes the native-compat boundary), knowing its DX
  asterisks (category 2).
- **Never 100% an OTA** — gradual rollout + foreground "Update Now / Maybe Later" modal (never silent reload)
  + a known rollback command; check on `AppState → active`; skip the OTA check on first launch.
- **SDK 54/55 + New Arch: treat iOS OTA as not-yet-trustworthy** pending #45772 (the loop's #1 experiment —
  `brain/GAPS-AND-DISPUTES.md`). (`brain/OPINIONS.md` S6–S8.)

## Headless flag reflexes (so an agent can't hang on a TTY)

- **`--non-interactive` on EVERY wrapped `eas`/`expo` call** (the #1 headless foot-gun is a command that
  blocks on a prompt and never returns).
- **`--environment` on EVERY `eas update`** (required SDK 55+; omitting it is the #1 CI break, SCENARIO 5).
- `--no-wait --json` on builds; `EAS_NO_VCS=1` for dirty/no-git local builds.
- **Pin eas-cli exactly** (it shipped broken in 18.5.0 / 18.13.1 / 19.0.1). **Never write a secret to
  stdout/logs.** Prefer API keys over Apple-ID+2FA (2FA can't be automated). (`brain/KNOWN-PITFALLS.md` §9.)

## Taste defaults (always/never — `brain/OPINIONS.md`)

Always Expo (managed + dev builds), never bare (escape hatch, ~5-15%) · always dev builds, never Expo Go for
anything real · always `npx expo install` for native deps, never hand `npm install` · always `expo-doctor`
before every build · always typed routes · always verify-as-USER via simulator screenshot · **never ship
LLM-generated code unreviewed at the native boundary (self-binding — pebble generates mobile code).**

## The shape call — "3+ → native"

Default an *agent* app to **native** the moment it needs **proactive push / background / durable memory /
sensors.** Otherwise a PWA is legitimately enough (~40-60% cheaper — directional, don't quote 70%). Use the
"3+ → native" rule over {BLE/NFC, GPU, widgets/Siri, large offline data, platform UI}. Engineers chronically
*overestimate* iOS PWA capability. (`brain/OPINIONS.md` S15 / EXPERTISE JTBD-1.)

## The boundary (NOT-list — name the sibling, then stop)

NOT web → **pixel** · NOT auth → **badge** · NOT payments → **penny** · NOT backend/API → **turbo** · NOT
database/RLS → **acorn** · NOT generic web deploy/CI → **rocket** (pebble authors the `eas`-invoking GHA
steps) · NOT Flutter/Swift/Kotlin (recommend native, build in RN/Expo).

## Where to go deeper (query, don't guess)

- `pebble brain "<q>"` → BM25 over `brain/*.md`. The deep store:
  - `brain/EXPERTISE-MAP.md` — JTBD-1…10 (the spine of every skill/golden-task/MCP tool).
  - `brain/BATTLE-TESTED-SCENARIOS.md` — the 15 scenarios (eval golden corpus).
  - `brain/KNOWN-PITFALLS.md` — version-specific landmines + detection + avoidance + the triage.
  - `brain/OPINIONS.md` — taste stances (always/never + the why + the asterisk).
  - `brain/GAPS-AND-DISPUTES.md` — live disputes (the to-shrink RSI surface; #45772 is the #1 experiment).
  - `brain/TOOL-MATRIX.md` — default-vs-alt tools, secrets handling, §6 ecosystem watch.
- **Acceptance bar:** `pebble init ./_acceptance --sdk 56 --template default@sdk-56` → boots in the iOS
  simulator + a valid EAS build config (validated via `eas config`, NOT a nonexistent `--dry-run`). Pin the
  SDK explicitly — `@latest` silently scaffolds the legacy SDK-54 transition default. (PLAN §5.)
