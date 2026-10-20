# AGENTS.md — pebble (the Energy mobile employee)

> This file tells a coding agent (Claude Code, energy, a sibling Energy employee) **how to use pebble**.
> pebble is the fleet's **mobile employee** — React Native · Expo · EAS, operated **headlessly as an agent**,
> not a human at a TTY. Tagline: *"the small thing you ship to a pocket."* — powered by Energy.

## What pebble is

A **tool-employee** consumed by coding agents and by the chairman's local cockpit — there is **no reachability
face** (nobody messages pebble on WhatsApp/email). Its surfaces are the **`pebble` CLI**, its **MCP server**, and
the cockpit. Given a product idea, pebble: picks the right *shape* (native/PWA/bare/Flutter), scaffolds a
**New-Architecture-correct** Expo app, routes it with expo-router, builds & ships via **EAS** headlessly,
maintains it via **OTA within the wall** (JS/assets only, never native capability), and survives **App-Store
review**.

Full persona: [`identity/SOUL.md`](identity/SOUL.md). Real operating rules: [`CLAUDE.md`](CLAUDE.md). The
queryable expertise (dated 2026-06-11): [`brain/`](brain/) — **query it with `pebble brain "<q>"` before you
guess.**

## ⚠️ Read this before you ask pebble for a version

**Rule 0 — never quote a version from memory.** pebble's (and your) training memory is **one era behind**:
it anchored on Expo **SDK 53 / RN 0.80** with the legacy bridge still shippable. **That world is gone.** June 2026
is **SDK 56 / RN 0.85** (RN 0.86.0 already on npm), Legacy Architecture **removed** in RN 0.83 / SDK 55 (no
`newArchEnabled:false` escape hatch), Hermes V1 default, CodePush dead, Expo Go demoted to a beginner tool. Run
`pebble version-check` (which shells `npm view`) before pinning anything. (`brain/KNOWN-PITFALLS.md` §0, §9.)

## Install in one step

```bash
npx -y -p github:naman10parikh/pebble pebble --help        # the CLI
npx -y -p github:naman10parikh/pebble pebble-mcp           # the MCP server (stdio)
claude mcp add --transport stdio pebble -- npx -y -p github:naman10parikh/pebble pebble-mcp
```

In Claude Code, `/plugin install pebble --marketplace naman10parikh/pebble` brings the 5 skills, the two personas,
the headless-flag hook and the MCP server together.

## How to call pebble

### CLI (`pebble <cmd>`)

Every wrapped `eas`/`expo` call injects `--non-interactive` (anti-TTY-hang); `--help`/`--version` exit 0;
non-zero on failure; pebble never writes a secret to stdout/logs.

| Command | What it does |
| --- | --- |
| `pebble init [dir] --sdk <n> [--template default@sdk-<n>]` | Scaffold a New-Arch Expo app (SDK pinned explicitly), in an isolated FS; boots in the sim. |
| `pebble doctor` | `expo-doctor` + Rule-0 version check + the 60-second triage — the cheapest gate that exists. |
| `pebble decide "<brief>"` | The shape call (RN/PWA/bare/Flutter) via the **"3+ → native"** rule; prints the rationale. |
| `pebble build --platform <ios\|android\|all> --profile <p>` | Headless `eas build` (`--non-interactive --no-wait --json` injected); returns a build id. |
| `pebble submit --platform <ios\|android> --latest` | Headless `eas submit` (ASC API key / Play service-account; warns on the manual first-Play-upload wall). |
| `pebble update --channel <c> --environment <e> -m "<msg>"` | OTA via `eas update` (**`--environment` ENFORCED**); blocks if a native change is detected. |
| `pebble screenshot [--platform ios\|android] [out.png]` | The verify-as-USER primitive: `simctl`/`adb` screenshot → a path you READ. |
| `pebble review-check` | Store-rejection pre-flight: 2.5.2 self-mod scan · consent modal · age rating · UGC duty. |
| `pebble brain "<query>"` | BM25 over `brain/*.md` — taste/pitfalls/scenarios before you guess. |
| `pebble runs [--last <n>]` | Observability: tail/aggregate `logs/runs.jsonl` (model · duration · cost · build id). |
| `pebble version-check` | Rule 0 only: `npm view` RN/expo/eas-cli → diff `brain/TOOL-MATRIX.md`. |

### MCP server (JSON-RPC over stdio)

Same core as the CLI (one core, two surfaces). Its bin is `pebble-mcp`; the root [`.mcp.json`](.mcp.json) starts it
straight from GitHub as `pebble`, and `.mcp.dev.json` starts the local build. `tools/list` returns:

```
pebble_decide_shape   { brief, needs? }                 → { shape, rationale, ios_pwa_walls? }
pebble_init           { dir, sdk, template? }           → { ok, sdk, files[], sim_boot }
pebble_doctor         { dir? }                           → { passed, issues[], versions{} }
pebble_eas_build      { platform, profile }             → { build_id, status, url? }
pebble_eas_submit     { platform }                      → { status, warning? }   # manual-first-Play-upload
pebble_eas_update     { channel, environment, message } → { ok, branch }         # rejects native-touching diffs
pebble_screenshot     { platform?, path? }              → { path }
pebble_review_check   { dir? }                           → { risks[], blocking }  # 2.5.2/4.3/5.1.2(i)
pebble_brain_query    { q, k? }                          → { hits:[{file,line,text}] }
pebble_version_check  {}                                 → { rn, expo, eas_cli, drift }
```

### Skills (invokable from energy)

Repo-authored mobile skills under [`skills/`](skills/) — each encodes a named `brain/OPINIONS.md` /
`brain/KNOWN-PITFALLS.md` stance as an executable procedure:

- **`mobile-shape-decision`** — the "3+ → native" rule + the iOS PWA walls (OPINIONS S15).
- **`expo-new-arch-scaffold`** — New-Arch-only scaffold, explicit SDK pin, `expo-doctor` gate (OPINIONS S1–S5).
- **`eas-headless-pipeline`** — the `--non-interactive`/`--environment` reflexes, eas-cli pinning (TOOL-MATRIX §3).
- **`ota-safety`** — the OTA wall, `fingerprint` RV policy + asterisks, the #45772 dispute (OPINIONS S6–S8).
- **`store-review-preflight`** — Guideline 2.5.2/4.3/5.1.2(i) pre-flight (OPINIONS S16).

### Sub-agents (callable via `Agent`)

Mobile-domain personas under [`.claude/agents/`](.claude/agents/): **`build-doctor`** (triages an EAS failure via
the 60-second triage + the 5 breakage categories — the highest-reuse fleet persona) and **`store-reviewer`**
(audits a config vs Guideline 2.5.2/4.3/5.1.2(i)).

## What pebble REFUSES (the boundary — name the right sibling and stop)

- **NOT web.** Next.js / Tailwind / shadcn / responsive-web shells are **pixel's** vertical. pebble does RN +
  Expo + EAS *only*; Expo Web output is an RN-render bonus, not a web offering. (When a brief is "web + mobile +
  shared API," pebble owns the mobile half and names pixel for web.)
- **NOT auth-provider wiring** (Clerk/BetterAuth) → **badge**. pebble *consumes* an auth SDK in an RN app; it
  doesn't own auth expertise.
- **NOT payments wiring** (Stripe) → **penny**.
- **NOT backend/API design** → **turbo**. **NOT database/schema/RLS** → **acorn**.
- **NOT generic web deploy/CI** → **rocket**. pebble authors the `eas`-invoking GitHub-Actions steps; rocket owns
  the surrounding workflow conventions + Vercel/web deploy.
- **NOT building in Flutter/Dart or native-only Swift/Kotlin.** pebble *knows when to recommend* them (the shape
  call) but builds in RN/Expo.
- **NEVER cross the OTA wall** (ship native capability as an OTA) and **NEVER quote a version from memory**
  (Rule 0).

## The acceptance test (the operational "done" bar)

`.github/workflows/acceptance.yml` (red-blocking, `macos-latest`): `pebble version-check` → `pebble init
./_acceptance --sdk 56 --template default@sdk-56` → `pebble doctor` → `eas config --platform ios
--non-interactive` → `pebble screenshot --platform ios ./_acceptance/boot.png` → `test -s boot.png`. Degrades to
structural-only (scaffold + doctor + L1 shape gate still red-block) when `EXPO_TOKEN` is unprovisioned.
