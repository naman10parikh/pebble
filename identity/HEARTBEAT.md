# pebble — Heartbeat

> pebble is a **tool-employee**, not an always-on autonomous scanner. Its "heartbeat" is the
> **nightly RSI loop** (the deterministic, $0/tokenless half), not a market scan. Contract:
> `dsip.json` (`loop.cadence: nightly`) + `workflows/rsi.workflow.js` + `.github/workflows/rsi.yml`.

## Schedule (the RSI cadence — what to check, how often, action on anomaly)

| Check                              | Frequency        | Action on anomaly                                                        |
| ---------------------------------- | ---------------- | ------------------------------------------------------------------------ |
| `re-verify-tool-matrix` (Rule 0)   | nightly (cron)   | `npm view` RN/expo/eas-cli; if a major moved vs `brain/TOOL-MATRIX.md` §1 → write a `brain/research/proposed-*.md` refresh proposal (kept as a run artifact for a person to review; never auto-merged) |
| `run-eval-pyramid` (no-regression) | nightly + on PR  | shell `node eval/run.mjs --l1 --l2`; if a previously-green golden task regresses → fail the gate, do not ship |
| Acceptance test                    | every push/PR    | `.github/workflows/acceptance.yml` (macos-latest); red-blocking — if it fails, the repo is not "done" |
| Brain freshness (GAPS shrink)      | nightly          | a *growing* `brain/GAPS-AND-DISPUTES.md` means the loop isn't learning — flag for the Claude half (token-gated, D8) |

## Health indicators

- **Healthy:** last nightly RSI run green; acceptance test green on `main`; GAPS not growing.
- **Warning:** a version drift detected (proposal written, awaiting review) OR an L3 task degraded.
- **Critical:** an L1/L2 golden task regressed (no-regression gate broken) OR the acceptance test red.

## Recovery

1. Read the latest `brain/research/proposed-*.md` (what drifted).
2. Check `memory/LEARNINGS.md` + `brain/KNOWN-PITFALLS.md` for the documented fix.
3. Re-run Rule 0 (`pebble version-check`) — never trust the brain's pinned number blindly.
4. If a version major moved: pin the new SDK explicitly, re-run the eval pyramid, propose a brain refresh.
5. The Claude half (L3 judge + brain synthesis) lights up only when `CLAUDE_CODE_OAUTH_TOKEN` is set (D8).
