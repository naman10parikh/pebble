# pebble

> *"the small thing you ship to a pocket."* — powered by Energy

**pebble is the Energy fleet's mobile employee** — a recursively self-improving, agent-native harness for
**React Native · Expo · EAS**, operated **headlessly as an agent**, not a human at a TTY. Give it a product
idea and it picks the right *shape* (native/PWA/bare), scaffolds a **New-Architecture-correct** Expo app, builds
& ships via **EAS**, maintains it via **OTA within the wall**, and survives **App-Store review** — from real
June-2026 postmortems, not a tutorial.

pebble is a **tool-employee**: consumed by coding agents (Claude Code, energy, a sibling employee) and the
chairman's local cockpit. Its surfaces are the **`pebble` CLI**, an **MCP server**, and the cockpit — there is
no chat/WhatsApp face.

## ⚠️ Rule 0 — never quote a version from memory

pebble's training memory is **one era behind** (Expo SDK 53 / RN 0.80 with the legacy bridge). **That world is
gone.** June 2026 is **SDK 56 / RN 0.85**, Legacy Architecture removed in RN 0.83 / SDK 55, Hermes V1 default,
CodePush dead, Expo Go demoted. `pebble version-check` shells `npm view` so a version claim is never a guess.

## Install

```sh
npm ci && npm run build         # build the CLI + MCP server (Node ≥ 22)
node dist/cli.js --help         # or `pebble --help` once linked
```

As a Claude Code plugin: add this directory via **Settings → Plugins → Add local plugin** (or
`claude plugin install pebble`). Bundles the CLI, the MCP server, 5 mobile skills, the mobile hooks, and 2
mobile sub-agents (manifest: [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json)).

Provide **`EXPO_TOKEN`** (free, from [expo.dev](https://expo.dev)) for the full EAS path; without it, pebble
still does shape decisions, scaffolds, doctor, and brain queries.

## The hands (`pebble <cmd>`)

Every wrapped `eas`/`expo` call injects `--non-interactive` (anti-TTY-hang); `--environment` is enforced on
`eas update`; secrets never reach stdout/logs.

| Command | What it does |
| --- | --- |
| `pebble decide "<brief>"` | The shape call (RN/PWA/bare/Flutter) via the **"3+ → native"** rule. |
| `pebble init [dir] --sdk <n> --template default@sdk-<n>` | Scaffold a New-Arch Expo app (SDK pinned), boots in the sim. |
| `pebble doctor` | `expo-doctor` + Rule-0 version check + the 60-second triage. |
| `pebble build` / `pebble submit` / `pebble update` | Headless EAS build / submit / OTA. |
| `pebble screenshot` | The verify-as-USER primitive: `simctl`/`adb` screenshot → READ it. |
| `pebble review-check` | Store-rejection pre-flight (Guideline 2.5.2/4.3/5.1.2(i)). |
| `pebble brain "<q>"` | BM25 over the expertise brain. |
| `pebble runs` · `pebble version-check` | Observability tail · Rule-0 drift check. |

Full surface — CLI + MCP tools + NOT-list: [`AGENTS.md`](AGENTS.md). Agent-readable map: [`llms.txt`](llms.txt).

## The acceptance test (the operational "done" bar)

[`.github/workflows/acceptance.yml`](.github/workflows/acceptance.yml) (red-blocking, `macos-latest`):
`pebble version-check` → `pebble init ./_acceptance --sdk 56 --template default@sdk-56` → `pebble doctor` →
`eas config --platform ios --non-interactive` → `pebble screenshot --platform ios ./_acceptance/boot.png` →
`test -s boot.png`. Degrades to structural-only (scaffold + doctor + L1 shape gate still red-block) without
`EXPO_TOKEN`. Full contract: [`PLAN.md`](PLAN.md) §5.

## What's inside

- **`brain/`** — the dated (2026-06-11) expertise: [`OPINIONS.md`](brain/OPINIONS.md) (taste stances),
  [`KNOWN-PITFALLS.md`](brain/KNOWN-PITFALLS.md) (version landmines + the 60s triage),
  [`BATTLE-TESTED-SCENARIOS.md`](brain/BATTLE-TESTED-SCENARIOS.md) (15 postmortems),
  [`TOOL-MATRIX.md`](brain/TOOL-MATRIX.md), [`EXPERTISE-MAP.md`](brain/EXPERTISE-MAP.md).
- **`skills/`** — 5 executable procedures (shape decision · New-Arch scaffold · headless EAS · OTA safety ·
  store-review pre-flight).
- **`.claude/agents/`** — `build-doctor` (EAS-failure triage; the highest-reuse fleet persona) + `store-reviewer`.
- **`eval/`** — the Hamel pyramid (L1 structural · L2 binary golden tasks · L3 trajectory judge).
- **`dsip.json` + `workflows/rsi.workflow.js`** — the deterministic nightly self-improvement loop.

## See also

Part of the **Energy** fleet of agent-native domain employees: **pixel** (web/frontend), **turbo** (backend),
**acorn** (database), **badge** (auth), **penny** (payments), **rocket** (deploy + CI). pebble owns the mobile
half; when a brief crosses a boundary it names the right sibling and stops.

License: MIT.
