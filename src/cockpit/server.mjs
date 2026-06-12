#!/usr/bin/env node
// src/cockpit/server.mjs — pebble's cockpit HTTP server (G1).
//
// Stdlib-only Node `http` server on 127.0.0.1:7788 (no deps, never exposed). Does manual path dispatch,
// serves the vanilla-JS SPA (path-traversal guarded), and routes every JSON endpoint to a read over the
// repo's existing data — brain/*.md, logs/runs.jsonl, eval/* — or shells the SAME pebble CLI/eval the
// chairman runs (one core, two surfaces — EMPLOYEE-FIRST). Writes NOTHING the CLI doesn't (read-mostly).
//
// Design (the proven sentinel/talent-intel pattern, ported to Node stdlib per PLAN §10 / DECISIONS D3):
//   - REPO = two levels up from this file = ~/pebble.
//   - .env is NOT loaded here — the cockpit is read-mostly; only ask-the-employee shells `pebble brain`
//     (BM25, $0, no key) and `pebble decide` (pure rule, no key). No live secret is read or rendered.
//   - Error contract: a bad/oversized path → 400; missing file → 404; a sub-process failure → 502;
//     anything else → 500. JSON body { error: msg } on every API error.
//   - Endpoints are intentionally thin: the cockpit surfaces what the CLI already computes, it does not
//     re-implement brain ranking / eval grading / run aggregation (those live in one place each).
//
// Source: PLAN §10 (cockpit spec) · HARNESS-OVERRIDES §Cockpit · MASTER-TODOS G1/G2.

import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync, statSync, realpathSync } from "node:fs";
import { dirname, join, extname, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", ".."); // src/cockpit/server.mjs → repo root
const STATIC = join(HERE, "static");
const BRAIN_DIR = join(REPO, "brain");
const RUNS_LOG = join(REPO, "logs", "runs.jsonl");
const GOLDEN_DIR = join(REPO, "eval", "golden");
const CLI = join(REPO, "dist", "cli.js");
const RUNS_VIEW = join(REPO, "scripts", "runs-view.mjs");
const PORT = Number(process.env.PEBBLE_COCKPIT_PORT || 7788);
const MAX_QUERY = 400; // ask-the-employee / search query length cap (DoS + arg-injection guard)

// The 6 brain notes the brain-browser renders (PLAN §10 view 1 — the queryable expertise).
const BRAIN_NOTES = [
  "EXPERTISE-MAP.md",
  "BATTLE-TESTED-SCENARIOS.md",
  "KNOWN-PITFALLS.md",
  "OPINIONS.md",
  "GAPS-AND-DISPUTES.md",
  "TOOL-MATRIX.md",
];

const STATIC_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ---- response helpers ----
function sendJson(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": body.length });
  res.end(body);
}

function sendStatic(res, filePath) {
  const ext = extname(filePath);
  const body = readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": STATIC_TYPES[ext] || "application/octet-stream",
    "Content-Length": body.length,
    "Cache-Control": "no-store", // never let a stale JS/CSS cache hide an edit
  });
  res.end(body);
}

// ---- data readers (read-mostly; never write) ----

/** List the brain notes that actually exist on disk (for the browser's table of contents). */
function brainList() {
  return BRAIN_NOTES.filter((n) => existsSync(join(BRAIN_DIR, n))).map((name) => ({
    name,
    bytes: statSync(join(BRAIN_DIR, name)).size,
  }));
}

/** Return one brain note's raw markdown. Name is validated against the allow-list (no traversal). */
function brainNote(name) {
  if (!BRAIN_NOTES.includes(name)) throw new ApiError(404, `unknown brain note: ${name}`);
  const p = join(BRAIN_DIR, name);
  if (!existsSync(p)) throw new ApiError(404, `brain note not on disk: ${name}`);
  return { name, markdown: readFileSync(p, "utf8") };
}

/** Read + parse every run line (skips blank/corrupt, never throws) — same tolerance as runs-view.mjs. */
function readRuns() {
  if (!existsSync(RUNS_LOG)) return [];
  const out = [];
  for (const line of readFileSync(RUNS_LOG, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // one corrupt line must not break the view
    }
  }
  return out;
}

/** The §6 golden tasks as the eval-scores view's table source (id/title/level/ci_block/scenario/jtbd). */
function goldenTasks() {
  if (!existsSync(GOLDEN_DIR)) return [];
  return readdirSync(GOLDEN_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const t = JSON.parse(readFileSync(join(GOLDEN_DIR, f), "utf8"));
      return {
        id: t.id,
        title: t.title,
        scenario: t.scenario,
        jtbd: t.jtbd,
        hamel_level: t.hamel_level,
        ci_block: t.ci_block === true,
      };
    });
}

// ---- sub-process shells (the CLI/eval are the single source of truth; cockpit only surfaces them) ----

/** Shell a built pebble CLI command. Returns {ok, code, stdout, stderr}. Never throws on non-zero. */
function shellCli(args, timeoutMs = 60000) {
  if (!existsSync(CLI)) throw new ApiError(502, "dist/cli.js not built — run `npm run build`");
  const res = spawnSync("node", [CLI, ...args], { cwd: REPO, encoding: "utf8", timeout: timeoutMs });
  if (res.error) throw new ApiError(502, `cli failed: ${res.error.message}`);
  return { ok: res.status === 0, code: res.status ?? -1, stdout: res.stdout || "", stderr: res.stderr || "" };
}

/** Validate a free-text query: non-empty, length-capped. Returns the trimmed query or throws 400. */
function safeQuery(raw) {
  const q = String(raw ?? "").trim();
  if (q === "") throw new ApiError(400, "empty query");
  if (q.length > MAX_QUERY) throw new ApiError(400, `query too long (>${MAX_QUERY} chars)`);
  return q;
}

/** Run the eval pyramid (L1+L2, $0) and parse the summary. Shells eval/run.mjs — the one grader. */
function evalScores() {
  // eval/ is a standalone runner (the CLI has no eval subcommand). Parse its printed summary — the
  // SAME deterministic text CI reads — rather than re-implementing orchestration here.
  const runMjs = join(REPO, "eval", "run.mjs");
  if (!existsSync(runMjs)) throw new ApiError(502, "eval/run.mjs not present");
  const res = spawnSync("node", [runMjs, "--l1", "--l2"], { cwd: REPO, encoding: "utf8", timeout: 60000 });
  const out = (res.stdout || "") + (res.stderr || "");
  return parseEvalOutput(out, res.status === 0);
}

/** Parse eval/run.mjs's deterministic text summary into structured L1/L2 + per-task rows. */
function parseEvalOutput(out, exit0) {
  const lines = out.split("\n");
  const l1Line = lines.find((l) => /^\s*L1:\s*\d+\/\d+/.test(l)) || "";
  const l2Line = lines.find((l) => /^\s*L2:\s*\d+\/\d+/.test(l)) || "";
  const l1m = l1Line.match(/L1:\s*(\d+)\/(\d+)/);
  const l2m = l2Line.match(/L2:\s*(\d+)\/(\d+)/);
  // Per-L2-task rows: "  PASS  G03  (rootCause:Y fix:Y avoidsWrong:Y)"
  const l2tasks = [];
  for (const l of lines) {
    const m = l.match(/^\s*(PASS|FAIL)\s+(G\d{2})\s+\(([^)]*)\)/);
    if (m) l2tasks.push({ id: m[2], pass: m[1] === "PASS", criteria: m[3].trim() });
  }
  return {
    exit0,
    l1: l1m ? { pass: Number(l1m[1]), total: Number(l1m[2]), green: l1m[1] === l1m[2] } : null,
    l2: l2m ? { pass: Number(l2m[1]), total: Number(l2m[2]), green: l2m[1] === l2m[2] } : null,
    l2tasks,
    raw: out,
  };
}

// ---- router ----
async function handleApi(url, res) {
  const path = url.pathname;
  const q = url.searchParams;

  if (path === "/api/status") {
    return sendJson(res, 200, {
      name: "pebble",
      tagline: "the small thing you ship to a pocket.",
      port: PORT,
      brain_notes: brainList().length,
      runs: readRuns().length,
      golden: goldenTasks().length,
      cli_built: existsSync(CLI),
    });
  }

  // View 1 — brain browser
  if (path === "/api/brain/list") return sendJson(res, 200, { notes: brainList() });
  if (path === "/api/brain/note") return sendJson(res, 200, brainNote(q.get("name") || ""));
  if (path === "/api/brain/search") {
    const query = safeQuery(q.get("q"));
    const r = shellCli(["brain", query]);
    return sendJson(res, 200, { query, output: r.stdout, ok: r.ok });
  }

  // View 2 — run log
  if (path === "/api/runs") {
    const runs = readRuns();
    // Aggregate via the SAME function runs-view.mjs exports (one aggregator, two surfaces).
    const { aggregate } = await import(pathToFileURL(RUNS_VIEW).href);
    const agg = aggregate(runs).map((a) => ({
      cmd: a.cmd,
      count: a.count,
      totalMs: a.totalMs,
      avgMs: a.count ? Math.round(a.totalMs / a.count) : 0,
      ok: a.ok,
      error: a.error,
      blocked: a.blocked,
      models: [...a.models],
    }));
    return sendJson(res, 200, { runs, aggregate: agg });
  }

  // View 3 — eval scores
  if (path === "/api/eval") {
    const scores = evalScores();
    return sendJson(res, 200, { ...scores, golden: goldenTasks() });
  }

  // View 4 — ask-the-employee (routes to pebble; cites brain). `mode=decide` runs the shape rule.
  if (path === "/api/ask") {
    const query = safeQuery(q.get("q"));
    const mode = q.get("mode") === "decide" ? "decide" : "brain";
    if (mode === "decide") {
      const r = shellCli(["decide", query]);
      return sendJson(res, 200, { query, mode, answer: r.stdout, ok: r.ok, citations: extractCitations(r.stdout) });
    }
    // Default: BM25 over the brain — the answer is the ranked brain hits, mechanically cited.
    const r = shellCli(["brain", query]);
    return sendJson(res, 200, { query, mode, answer: r.stdout, ok: r.ok, citations: extractCitations(r.stdout) });
  }

  throw new ApiError(404, `no such endpoint: ${path}`);
}

/** Pull every `brain/<note>.md` reference out of a CLI answer (the mechanical citation set, G2 verify). */
function extractCitations(text) {
  const set = new Set();
  for (const m of String(text).matchAll(/brain\/[\w-]+\.md/g)) set.add(m[0]);
  return [...set];
}

function handleStatic(path, res) {
  // Default route → the SPA shell.
  const rel = path === "/" ? "index.html" : path.replace(/^\/+/, "");
  // Path-traversal guard: resolve under STATIC, reject anything that escapes it.
  const resolved = normalize(join(STATIC, rel));
  if (!resolved.startsWith(STATIC)) throw new ApiError(400, "bad path");
  if (!existsSync(resolved) || !statSync(resolved).isFile()) throw new ApiError(404, `not found: ${path}`);
  return sendStatic(res, resolved);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(url, res);
    } else {
      handleStatic(url.pathname, res);
    }
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    sendJson(res, status, { error: err instanceof Error ? err.message : String(err) });
  }
});

// Only bind to loopback — the cockpit is the chairman's local window, never exposed.
// Robust entrypoint check: resolve argv[1] to an absolute real path (it may arrive relative, e.g.
// `node src/cockpit/server.mjs`), then compare to this module's absolute file path.
const thisFile = fileURLToPath(import.meta.url);
const argvFile = process.argv[1] ? realpathSync(resolve(process.argv[1])) : "";
const isMain = argvFile !== "" && realpathSync(thisFile) === argvFile;
if (isMain) {
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`pebble cockpit → http://localhost:${PORT}  (Ctrl-C to stop)`);
  });
}

export { server, brainList, brainNote, readRuns, goldenTasks, extractCitations, parseEvalOutput };
