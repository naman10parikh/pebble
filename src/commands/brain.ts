// commands/brain.ts — `pebble brain "<q>"` shells the A4 BM25 engine over brain/*.md.
// One ranking engine (scripts/memory-search.sh), two surfaces (CLI here + cockpit later). EMPLOYEE-FIRST.
// Source: PLAN §4, HARNESS-OVERRIDES §2.

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");
const SEARCH_SCRIPT = join(REPO_ROOT, "scripts", "memory-search.sh");

export interface BrainHit {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

/** Run the BM25 search and return raw stdout. The script already ranks brain/*.md on top (A4). */
export function brainQuery(query: string, limit = 5): { ok: boolean; output: string } {
  const res = spawnSync("bash", [SEARCH_SCRIPT, query, "--limit", String(limit)], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  if (res.status !== 0) {
    return {
      ok: false,
      output: `pebble brain: search failed: ${res.stderr || res.error?.message || "unknown error"}`,
    };
  }
  return { ok: true, output: res.stdout };
}

/** CLI entry: print the ranked brain hits for a query. */
export function runBrain(query: string, limit = 5): number {
  if (!query || query.trim() === "") {
    console.error('pebble brain: provide a query, e.g. pebble brain "OTA native module"');
    return 1;
  }
  const { ok, output } = brainQuery(query, limit);
  process.stdout.write(output);
  return ok ? 0 : 1;
}
