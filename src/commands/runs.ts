// commands/runs.ts — `pebble runs [--last <n>]`: the Observability tail.
// Reads the SAME append-only logs/runs.jsonl the wrappers (B3) and the PostToolUse hook (B5) write,
// via the shared RUNS_LOG_PATH (one file, many surfaces). The richer aggregator is E3's runs-view.mjs;
// this is the always-present CLI surface (B2 wiring) so `pebble runs` works the moment a run is logged.
// Source: PLAN §4 command tree / §3.10, HARNESS-OVERRIDES §10.

import { existsSync, readFileSync } from "node:fs";
import { RUNS_LOG_PATH } from "../lib/logger.js";

interface RunLine {
  ts?: string;
  cmd?: string;
  model?: string;
  durationMs?: number;
  eas_build_id?: string;
  status?: string;
}

/** Read + parse the last `n` jsonl lines (skips blank/corrupt lines, never throws). */
export function readRuns(last = 20): RunLine[] {
  if (!existsSync(RUNS_LOG_PATH)) return [];
  const lines = readFileSync(RUNS_LOG_PATH, "utf8").split("\n").filter((l) => l.trim() !== "");
  const tail = last > 0 ? lines.slice(-last) : lines;
  const out: RunLine[] = [];
  for (const l of tail) {
    try {
      out.push(JSON.parse(l) as RunLine);
    } catch {
      // Intentionally skip: a corrupt line must not break the whole view.
    }
  }
  return out;
}

/** CLI entry: tail logs/runs.jsonl. rc 0 always (an empty log is a valid state, not an error). */
export function runRuns(last = 20): number {
  const rows = readRuns(last);
  if (rows.length === 0) {
    console.log(`pebble runs: no runs logged yet (${RUNS_LOG_PATH}). Run a wrapped command to populate it.`);
    return 0;
  }
  console.log(`pebble runs — last ${rows.length} (model · duration · build · status):`);
  for (const r of rows) {
    const parts = [
      r.ts ?? "?",
      r.cmd ?? "?",
      r.model ? `model=${r.model}` : "",
      r.durationMs !== undefined ? `${r.durationMs}ms` : "",
      r.eas_build_id ? `build=${r.eas_build_id}` : "",
      r.status ?? "?",
    ].filter((p) => p !== "");
    console.log(`  ${parts.join(" · ")}`);
  }
  return 0;
}
