// logger.ts — the SHARED Observability appender (cross-cluster: B3 wrappers, B5 hook, E3 view all use this).
// Append-only logs/runs.jsonl, one JSON line per run. NEVER writes a secret.
// Schema (PLAN §3.10 / HARNESS-OVERRIDES §10): { ts, cmd, model?, durationMs, eas_build_id?, status }.

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// dist/lib/logger.js → repo root is two levels up; src/lib/logger.ts → also two up. Both resolve correctly.
const REPO_ROOT = join(HERE, "..", "..");
const RUNS_LOG = join(REPO_ROOT, "logs", "runs.jsonl");

export type RunStatus = "ok" | "error" | "blocked";

export interface RunRecord {
  /** ISO timestamp; defaulted to now if omitted. */
  ts?: string;
  /** The pebble subcommand, e.g. "doctor" or "build --platform ios". */
  cmd: string;
  /** Model used, if this run spawned an agent. Omitted for pure-CLI runs. */
  model?: string;
  /** Wall-clock duration in ms. */
  durationMs: number;
  /** EAS build id when the run produced one. */
  eas_build_id?: string;
  status: RunStatus;
}

/**
 * Secret patterns that must never reach the log (defense-in-depth — wrappers already avoid passing
 * secrets). Two shapes:
 *   - env-var names: redact the VALUE after `NAME=` (the name itself is not a secret).
 *   - bare-prefix tokens (sk-…, bb_…): the whole run of non-whitespace from the prefix is the secret.
 */
const SECRET_ENV_NAMES = ["EXPO_TOKEN", "ANTHROPIC_API_KEY", "E2B_API_KEY"];
const SECRET_PREFIXES = ["sk-", "bb_"];

/**
 * Redact secret SUBSTRINGS only, preserving the leading verb so the runs.jsonl rollup can still
 * bucket the command (e.g. `update --channel x` survives even if a token rode along). The safety
 * property is unchanged — no secret VALUE ever lands in the log; we just stop nuking the whole cmd.
 */
function scrub(value: string): string {
  let out = value;
  // `NAME=<value>` → `NAME=[redacted]` (value is the secret; the name is safe to keep).
  for (const name of SECRET_ENV_NAMES) {
    out = out.replace(new RegExp(`(${name})=\\S*`, "g"), "$1=[redacted]");
    // A bare mention with no `=value` (shouldn't happen, but be safe): drop the token only.
    out = out.replace(new RegExp(`(?<![\\w=])${name}(?![\\w=])`, "g"), "[redacted]");
  }
  // Bare-prefix tokens (sk-…, bb_…): redact the prefix + following non-whitespace run.
  for (const prefix of SECRET_PREFIXES) {
    out = out.replace(new RegExp(`${escapeRe(prefix)}\\S*`, "g"), "[redacted]");
  }
  return out;
}

/** Escape a literal string for use inside a RegExp (the prefixes contain `-`). */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Append one run record to logs/runs.jsonl. Best-effort: a logging failure must never crash a command. */
export function logRun(record: RunRecord): void {
  const line =
    JSON.stringify({
      ts: record.ts ?? new Date().toISOString(),
      cmd: scrub(record.cmd),
      ...(record.model ? { model: record.model } : {}),
      durationMs: Math.round(record.durationMs),
      ...(record.eas_build_id ? { eas_build_id: record.eas_build_id } : {}),
      status: record.status,
    }) + "\n";
  try {
    mkdirSync(dirname(RUNS_LOG), { recursive: true });
    appendFileSync(RUNS_LOG, line);
  } catch (err) {
    // Intentionally non-fatal: observability is best-effort, never a blocker.
    console.warn("[pebble/logger] could not append run log:", (err as Error).message);
  }
}

/** Absolute path to the runs log — shared so scripts/runs-view.mjs and the cockpit read the same file. */
export const RUNS_LOG_PATH = RUNS_LOG;
