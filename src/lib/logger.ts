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

/** Strings that must never reach the log (defense-in-depth — wrappers already avoid passing secrets). */
const SECRET_KEYS = ["EXPO_TOKEN", "ANTHROPIC_API_KEY", "E2B_API_KEY", "sk-", "bb_"];

function scrub(value: string): string {
  let out = value;
  for (const key of SECRET_KEYS) {
    if (out.includes(key)) out = "[redacted]";
  }
  return out;
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
