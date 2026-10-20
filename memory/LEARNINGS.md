# pebble — LEARNINGS (append-only)

Every error → root cause → rule. Auto-compressed when >500 lines (memory-compress.sh).

## 2026-10-19 — the nightly loop had never passed
**What broke:** all 128 runs of `.github/workflows/rsi.yml` since June failed, every night.
**Root cause:** the workflow checked out the repo and ran `workflows/rsi.workflow.js`, which runs the eval pyramid against `dist/`; `dist/` is not committed and the workflow never ran `npm ci && npm run build`. The proposal file was also written into the runner and thrown away.
**Rule:** a scheduled job runs the same install and build as CI before it runs anything that reads `dist/`, and it keeps its output (the dated proposal) as an artifact. "The cron is enabled" is not evidence; a green run is.

## 2026-10-19 — what the plugin may run in a stranger's project
**Rule:** the plugin's `hooks/hooks.json` carries only the headless-flag gate, which acts on `eas` and `expo` commands alone. The EAS run logger stays in this repo's `.claude/settings.json`, because it writes `logs/runs.jsonl` into whatever project is open. The plugin no longer ships energy's inherited slash commands.

## 2026-10-19 — the acceptance pin aged out
**What broke:** the acceptance workflow failed at `pebble doctor`: expo-doctor now flags SDK 56 for a Hermes V1 memory regression (fixed in expo 57.0.9).
**Rule:** Rule 0 applies to pebble's own gates. The acceptance scaffold follows npm's current SDK (58 on 19 October, doctor 20/20); the brain and the scaffold skill still describe SDK 56 until a person reviews the loop's refresh proposal.
