---
name: ota-safety
description: >-
  Decide whether a change is SAFE to ship as an OTA update (and how to ship it without crashing users) — the JS/asset-only wall, the `fingerprint` runtimeVersion policy and its DX asterisks, gradual rollout, and the SDK 54/55 "treat iOS OTA as not-yet-trustworthy" dispute. Use for "is this OTA safe?", "can I ship this as a JS update?", or OTA planning.
trigger: >-
  "is this OTA safe?", "can I ship this as a JS/OTA update?", "push a JS update", "ship without a rebuild", OTA / eas-update planning, before `pebble update`
model: opus (the OTA wall is a correctness + store-compliance boundary — a wrong call crashes 100% of users or violates Guideline 2.5.2; never route this judgment to a cheap tier)
output: an OTA verdict (`ota-safe` | `needs-rebuild`) + the boundary reasoning + the rollout policy + the #45772 caveat, in the format at the bottom
---

# ota-safety

> OTA is the single sharpest knife pebble holds: it ships JS/assets to an already-reviewed binary in seconds
> — and it crashes 100% of users (or gets you pulled from the store) the instant you push across the native
> wall. This skill is the boundary check. Stance source: `brain/OPINIONS.md` STANCE 6-8,
> `brain/BATTLE-TESTED-SCENARIOS.md` SCENARIO 2/3, `brain/KNOWN-PITFALLS.md` §0.2/§2, `brain/EXPERTISE-MAP.md`
> JTBD-5.

## When to use
Before any `eas update` / `pebble update`, or whenever someone asks whether a change can ship without a
rebuild. Run this *before* `eas-headless-pipeline` actually pushes the update.

## The stance it encodes (OPINIONS S6-S8, verbatim intent)
- **S7 — OTA is for JS/asset iteration ONLY, never capability changes. The technical wall IS the policy
  wall.** OTA can only ship JS/styles/assets to an already-reviewed binary — it **cannot add native
  capability** (cross the line → "Native module cannot be null"). That same line is **Apple Guideline 2.5.2**:
  you may not download/install/execute code that introduces or changes features. **Aggressive on rollout
  cadence (with monitoring); never aggressive on what you push.**
- **S6 — Always use the `fingerprint` runtimeVersion policy. Never use `appVersion` for human-discipline
  targeting.** `fingerprint` hashes the native dep graph + plugins so EAS *refuses* to send native-needing JS
  to old binaries. `appVersion` is a manual discipline humans get wrong two documented ways (bump → reaches
  nobody; forget → "Native module cannot be null").
- **S8 — Never 100% an OTA. Always gradual rollout + a foreground modal + a known rollback command.**
  Auto-rollback only catches fast (<10s), early, pre-state-mutation JS crashes — *"not a full safety net."*

## Steps

### Step 1 — Classify the change: does it touch native? (model: opus)
The core boundary call. The change is **OTA-safe** only if it is **JS / styles / assets** against the
*currently shipped* native binary. It is **needs-rebuild** if it: adds/updates a native module or a
config-plugin lib, changes `app.json` native config (permissions, URL schemes, background modes), bumps a
dep with native code, or changes anything in `ios/`/`android/`. If a native module was added and smuggled as
an OTA, users hit **"Native module cannot be null"** (SCENARIO 3) — the fix is **rebuild + bump RV / use
`fingerprint`**, NOT "roll back the JS."

### Step 2 — Verify the runtimeVersion policy + its sharp edges (model: opus)
Use `fingerprint` (S6) — it computes the native-compat boundary so EAS won't mis-target. **But know the
documented DX costs** (KNOWN-PITFALLS §2) before defaulting it on every project:
- It can **break the Metro dev-server connection** (#43908).
- It **fails with file-based secrets** (#33852) — relevant to CI.
- It has been **non-deterministic** (#40898 on Expo 54.0.22), silently drifting RV and mis-targeting OTAs —
  **pin Expo patch versions** and verify fingerprint stability before trusting targeting.
- EAS can compute **`runtimeVersion: null`** (#3528) — assert RV is non-null in the build before publishing.

### Step 3 — If OTA-safe, ship with the rollout policy (model: opus)
Never 100% (S8). The concrete policy: roll to a **% and watch crash rate** before widening; show a foreground
**"Update Now / Maybe Later" modal** (never a silent reload — silent reload loses in-progress user input),
disabled while downloading; check on **every `AppState → active`**, not just launch; **skip the OTA check on
a user's first launch** (they'd see a phantom "Update Available"); keep `eas update … --republish` of the
prior bundle in a runbook as the known rollback command.

### Step 4 — Apply the SDK 54/55 + New-Arch caveat (model: opus)
**The live dispute:** on **SDK 54/55 + New Arch**, the expo-updates **error-recovery queue itself can crash
on activation** (#45772, SCENARIO 2) — iOS OTA is **not-yet-trustworthy** until it resolves. On that stack
specifically, consider shipping JS changes as **full builds** rather than OTAs. This stance is
**weakly-held-against-evidence** (`brain/GAPS-AND-DISPUTES.md` Part-E #1 — reproducing #45772 on the Energy
stack is the RSI loop's #1 experiment); if it's been settled since 2026-06-11, re-verify before refusing a
legitimate OTA. The matching anti-pattern to AVOID: seeing an iOS-OTA-activation crash and "switching the RV
policy" — that's not the cause; #45772 is.

## Output format
```
VERDICT: ota-safe | needs-rebuild
TOUCHES NATIVE: <yes (what) | no — JS/assets only>
RV POLICY: fingerprint (stability verified, RV non-null: yes/no) | <other + why>
ROLLOUT (if ota-safe): gradual % + foreground modal + skip-first-launch + republish rollback ready
SDK-54/55 CAVEAT: <applies → consider full build (#45772 unresolved) | N/A on this SDK>
WRONG-PATH AVOIDED: <e.g. "did NOT switch RV policy for the #45772 crash; did NOT roll back JS for a smuggled native module">
```

## Anti-patterns
- Pushing a native-touching change as an OTA → "Native module cannot be null" for 100% of users.
- Using `appVersion` runtimeVersion targeting and getting the bump wrong (reaches nobody, or hits old binaries).
- 100%-ing an OTA, or shipping it as a silent reload (loses in-progress input; auto-rollback isn't a safety net).
- Blaming the RV policy for the #45772 iOS-OTA-activation crash (wrong root cause).
- Trusting `fingerprint` targeting without pinning Expo patch versions (non-determinism drifts RV silently).

## Cross-refs
`pebble update` (which also enforces `--environment`) · `eas-headless-pipeline` (the push mechanics) ·
`store-review-preflight` (2.5.2 is the same wall) · OPINIONS S6-S8 · SCENARIO 2/3 · KNOWN-PITFALLS §0.2/§2 ·
GAPS-AND-DISPUTES (the #45772 OTA-trustworthiness dispute).
