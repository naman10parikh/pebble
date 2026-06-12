---
name: eas-headless-pipeline
description: Build, submit, and OTA-update a React Native app through EAS HEADLESSLY — the way an agent (not a human at a TTY) must drive it. Encodes the non-interactive flag reflexes, EXPO_TOKEN auth, the mandatory `--environment` on `eas update`, exact eas-cli pinning, and the manual-first-Play-upload wall. Use for "build/submit/OTA this", any `eas` command, or wiring a CI mobile job.
trigger: "build this app", "submit to the store", "ship an OTA / JS update", any `eas build`/`eas submit`/`eas update`, a CI mobile job, `pebble build`/`pebble submit`/`pebble update`
model: opus (the headless flag reflexes are load-bearing — a missing flag is a hung agent or a broken CI pipeline; the version-pin call must not be a cheap-tier guess)
output: the exact headless EAS commands (with every reflex flag injected) + the auth/secret plan + the eas-cli pin + any submit walls flagged, in the format at the bottom
---

# eas-headless-pipeline

> EAS is pebble's release pipeline, but a human runs `eas` interactively and an **agent cannot** — every
> `eas`/`expo` call must be headless or it hangs forever on a TTY prompt. This skill is the reflex set that
> makes the toolchain agent-safe. Stance source: `brain/TOOL-MATRIX.md` §2-§3, `brain/OPINIONS.md` STANCE 9,
> `brain/KNOWN-PITFALLS.md` §3/§8/§9, `brain/EXPERTISE-MAP.md` JTBD-4/5.

## When to use
Any time pebble (or an agent through pebble) builds, submits, or OTA-updates via EAS — interactively or in
CI. The CLI wrappers (`pebble build/submit/update`) already inject these reflexes; this skill is the
reasoning they automate, and the reference when authoring a raw `eas`-invoking GitHub Actions job.

## The reflexes it encodes (KNOWN-PITFALLS §9 + TOOL-MATRIX §3, non-negotiable)
- **`--non-interactive` on EVERY `eas`/`expo` command.** Without it, the command blocks on a prompt and the
  agent run never returns (the #1 headless foot-gun). This is the invariant an agent cannot skip.
- **`--no-wait` on `eas build`** — fire the build, return the build id, poll separately. Never block the agent
  for the full cloud-build duration.
- **`--json` on build** — machine-readable output (no scraping a human-formatted log).
- **`--environment <env>` MANDATORY on `eas update`** — `eas update` FAILS on SDK 55+ without it
  (SCENARIO 5; the #1 "works locally, breaks in CI" cause). pebble's policy is fail-safe: **always include
  it** (PLAN §14 Q8) — the cost of the extra flag is zero, the cost of omitting it is a broken pipeline.
- **`EAS_NO_VCS=1`** for local builds in a dirty / no-git tree.

## Steps

### Step 1 — Auth headlessly with EXPO_TOKEN, never an interactive login (model: haiku)
Set `EXPO_TOKEN` in the environment (gitignored `.env` locally; `gh secret set EXPO_TOKEN` for CI). It is the
ONE free, no-2FA secret the build path needs. **Never** rely on `eas login` (interactive). For iOS *submit*
prefer an **App Store Connect API Key** over Apple-ID+2FA — 2FA cannot be automated in a headless runner
(KNOWN-PITFALLS §8). Never write the token to stdout or a log line.

### Step 2 — Pin eas-cli EXACTLY before any CI run (model: haiku)
eas-cli **shipped broken in multiple 2026 point releases** (18.5.0 broke `device:create`; 18.13.1 broke iOS
build with a JSON parse error; 19.0.1 couldn't install itself on cloud workers) — OPINIONS S9. Pin it exactly
(`"eas-cli":"x.y.z"` / `npx eas-cli@<pinned>`); a silent bump must not break the pipeline overnight. Re-verify
the pinned version is current-enough with Rule 0 (`npm view eas-cli version`) — pinned, but not stale for a year.

### Step 3 — Build headlessly (model: opus)
```
EAS_NO_VCS=<1 if dirty/no-git> eas build --platform <ios|android|all> --profile <p> --non-interactive --no-wait --json
```
Capture the returned **build id** — that's the handle for status polling (via the Expo MCP Server / `eas
build:list`), not a blocking wait. If the build fails at "Prepare project" with no code change and the failure
is clustered, it's an **EAS infra regression** (SCENARIO 1) — check status.expo.dev, don't debug the repo.
Gradle "daemon disappeared" = huge bundle → use the `large` resource class + Expo Atlas (KNOWN-PITFALLS §3).

### Step 4 — Submit, flagging the walls (model: opus)
```
eas submit --platform <ios|android> --latest --non-interactive
```
**Flag the first-Play-upload wall:** Google requires **one MANUAL first upload** in Play Console before API
submits work — an API submit on a never-before-uploaded app fails (KNOWN-PITFALLS §8). TestFlight does **not**
auto-release to production — after TestFlight you must manually submit for App Review (~10-15 min to appear).
iOS submit via ASC API key (not 2FA). These paid/manual steps are **knowledge-graded**, not autonomously run.

### Step 5 — OTA update with --environment ENFORCED (model: opus)
```
eas update --channel <c> --environment <e> --message "<msg>" --non-interactive
```
`--environment` is **mandatory** (Step's reflex). Before pushing, confirm the change is **JS/assets only** —
if it touches native capability, it's NOT an OTA (hand off to `ota-safety` and rebuild). Pin Expo patch
versions so the `fingerprint` runtimeVersion is stable (non-determinism mis-targets OTAs — KNOWN-PITFALLS §2).

## Output format
```
ACTION: build | submit | update
COMMAND: <the exact headless command, every reflex flag present>
AUTH: EXPO_TOKEN (env/gh-secret) [+ ASC API key for iOS submit]  — never logged
EAS-CLI PIN: <x.y.z> (verified current-enough via npm view: yes/no)
FLAGS ASSERTED: --non-interactive ✓ [--no-wait ✓ --json ✓ on build] [--environment <e> ✓ on update]
WALLS FLAGGED: <none | first-Play-upload manual | TestFlight≠production | 2FA→ASC-key | infra-regression>
RESULT: <build id | submit status | update branch>
```

## Anti-patterns
- Any `eas`/`expo` call missing `--non-interactive` (hangs the agent) — the single most common failure.
- Omitting `--environment` on `eas update` (the #1 CI break on SDK 55+).
- Letting eas-cli float in CI (a broken point release breaks you overnight).
- Blocking on a full cloud build instead of `--no-wait` + poll-by-build-id.
- Trying to bootstrap a brand-new Play listing via API (needs one manual first upload).
- Writing EXPO_TOKEN / an ASC key to stdout or a log.

## Cross-refs
`pebble build/submit/update` inject these reflexes · `ota-safety` (is the update even OTA-legal?) ·
`store-review-preflight` (before submit) · OPINIONS S9 · KNOWN-PITFALLS §3/§8/§9 · TOOL-MATRIX §3/§5 ·
vendor `expo/skills` (don't re-derive EAS workflows — OPINIONS S18).
