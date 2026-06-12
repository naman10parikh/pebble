#!/usr/bin/env node
// scripts/runs-view.mjs — the Observability AGGREGATOR over logs/runs.jsonl (E3).
//
// `pebble runs` (src/commands/runs.ts) is the simple chronological TAIL; this is the richer roll-up the
// cockpit run-log view and the chairman read: per-command counts, total/avg duration, status breakdown,
// model + EAS-build-id surfaced. Reads the SAME append-only logs/runs.jsonl the B3 wrappers and the B5
// PostToolUse hook write (one file, many surfaces). Pure-CLI runs have no model (correct — they call no LLM);
// the table shows model only when a run actually carried one. NEVER prints a secret (the logger scrubs at write).
// Source: PLAN §3.10 / §10 cockpit run-log; HARNESS-OVERRIDES §10.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS_LOG = join(HERE, "..", "logs", "runs.jsonl");

/** Read + parse every jsonl line (skips blank/corrupt, never throws). */
export function readAllRuns(path = RUNS_LOG) {
  if (!existsSync(path)) return [];
  const out = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // Intentionally skip a corrupt line — one bad line must not break the whole view.
    }
  }
  return out;
}

/** Aggregate runs by their command verb (the first token of `cmd`, e.g. "build", "doctor", "eas"). */
export function aggregate(runs) {
  const byCmd = new Map();
  for (const r of runs) {
    const verb = String(r.cmd ?? "?").split(/\s+/)[0] || "?";
    const a = byCmd.get(verb) ?? { cmd: verb, count: 0, totalMs: 0, ok: 0, error: 0, blocked: 0, models: new Set() };
    a.count += 1;
    a.totalMs += Number(r.durationMs ?? 0);
    if (r.status === "ok") a.ok += 1;
    else if (r.status === "blocked") a.blocked += 1;
    else a.error += 1;
    if (r.model) a.models.add(r.model);
    byCmd.set(verb, a);
  }
  return [...byCmd.values()].sort((x, y) => y.count - x.count);
}

/** Render the aggregate table + a totals footer. Returns the printed string (also testable). */
export function render(runs) {
  if (runs.length === 0) {
    return `pebble runs-view: no runs logged yet (${RUNS_LOG}). Run a wrapped command (e.g. pebble doctor) to populate it.`;
  }
  const rows = aggregate(runs);
  const lines = [];
  lines.push(`pebble runs-view — ${runs.length} runs across ${rows.length} command(s) (${RUNS_LOG}):`);
  lines.push("  CMD            COUNT   TOTAL_MS    AVG_MS   OK  ERR  BLK   MODELS");
  for (const a of rows) {
    const avg = a.count > 0 ? Math.round(a.totalMs / a.count) : 0;
    const models = a.models.size ? [...a.models].join(",") : "-";
    lines.push(
      "  " +
        String(a.cmd).padEnd(13) +
        " " +
        String(a.count).padStart(5) +
        " " +
        String(a.totalMs).padStart(10) +
        " " +
        String(avg).padStart(9) +
        " " +
        String(a.ok).padStart(4) +
        " " +
        String(a.error).padStart(4) +
        " " +
        String(a.blocked).padStart(4) +
        "   " +
        models,
    );
  }
  const total = runs.length;
  const okTotal = runs.filter((r) => r.status === "ok").length;
  const errTotal = runs.filter((r) => r.status === "error").length;
  const blkTotal = runs.filter((r) => r.status === "blocked").length;
  const totalMs = runs.reduce((s, r) => s + Number(r.durationMs ?? 0), 0);
  lines.push(`  ── totals: ${total} runs · ${totalMs}ms · ok ${okTotal} / err ${errTotal} / blocked ${blkTotal}`);
  return lines.join("\n");
}

// CLI entry: print the table. rc 0 always (an empty log is a valid state, not an error).
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  console.log(render(readAllRuns()));
  process.exit(0);
}
