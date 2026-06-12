#!/usr/bin/env node
// eval/run.mjs — pebble's Hamel eval pyramid runner (the no-regression gate + acceptance shape gate).
//
//   --l1   Structural ($0, no token, no network): asserts the harness's REAL invariants + the eas.json
//          4-profile shape + SDK pin + no `newArchEnabled:false` + dsip.json valid. This is the
//          cold-reproducible shape gate F4 runs (acceptance.yml step 7) and the rsi.workflow.js no-regression check.
//   --l2   Behavior (binary, $0, no LLM): grades the 7 CI-blocking golden tasks {G3,G5,G6,G9,G11,G12,G14}
//          via grader-l2.mjs (pinned-answer keyword/anti-keyword assertions). Red-blocks in CI.
//   --l3   Trajectory (token-gated): delegates to judge-l3.mjs (E2) over the 7 nightly tasks
//          {G1,G2,G4,G7,G8,G10,G13}. Skips $0 with rc 0 when no ANTHROPIC_API_KEY/CLAUDE_CODE_OAUTH_TOKEN.
//   (no flag) Runs L1 + L2 (the $0 CI blockers). L3 is opt-in (--l3) because it costs tokens.
//
// Exit code: 0 = all selected levels passed; non-zero = a selected level had a failing task (red-blocking).
// Source: PLAN §6 / §9 / HARNESS-OVERRIDES §9; golden corpus = brain/BATTLE-TESTED-SCENARIOS.md.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gradeL2 } from "./grader-l2.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..");
const GOLDEN_DIR = join(HERE, "golden");
const FIXTURES_DIR = join(HERE, "fixtures");
const DIST_INDEX = join(REPO_ROOT, "dist", "index.js");

// The CI-blocking L2 set + the nightly L3 set, named verbatim from PLAN §6 (so a mis-tag is caught here).
const L2_IDS = new Set(["G03", "G05", "G06", "G09", "G11", "G12", "G14"]);
const L3_IDS = new Set(["G01", "G02", "G04", "G07", "G08", "G10", "G13"]);

/** Load + parse every golden task JSON. Sorted by id for stable output. */
function loadGolden() {
  const files = readdirSync(GOLDEN_DIR).filter((f) => f.endsWith(".json")).sort();
  return files.map((f) => JSON.parse(readFileSync(join(GOLDEN_DIR, f), "utf8")));
}

/** A single structural assertion. Pushes a {name, pass, detail} record. */
function assert(records, name, cond, detail = "") {
  records.push({ name, pass: Boolean(cond), detail });
}

// ── L1: structural ($0) ────────────────────────────────────────────────────────────────────────
async function runL1() {
  const r = [];

  // The harness's REAL flag invariants — imported from the built dist (not re-implemented), so L1 fails
  // the moment B3's invariants regress. If dist isn't built, that's a hard L1 failure (build first).
  if (!existsSync(DIST_INDEX)) {
    assert(r, "dist built (npm run build ran)", false, `${DIST_INDEX} missing — run npm run build`);
    return r;
  }
  const core = await import(pathToFileURL(DIST_INDEX).href);

  // 1. --non-interactive injected on every wrapped eas/expo call (the anti-TTY-hang invariant).
  const easBuildArgs = core.wrapEas(["build", "--platform", "ios", "--profile", "sim"]).args;
  assert(r, "eas build injects --non-interactive", easBuildArgs.includes("--non-interactive"), easBuildArgs.join(" "));
  assert(r, "eas build injects --no-wait --json", easBuildArgs.includes("--no-wait") && easBuildArgs.includes("--json"));
  const expoArgs = core.wrapExpo(["doctor"]).args;
  assert(r, "expo call injects --non-interactive", expoArgs.includes("--non-interactive"), expoArgs.join(" "));
  const injected = core.injectNonInteractive(["update", "--channel", "x"]);
  assert(r, "injectNonInteractive is idempotent + appends", injected.filter((a) => a === "--non-interactive").length === 1);

  // 2. --environment ENFORCED on eas update (SCENARIO 5 — the #1 CI break). The gate must THROW without it.
  let threw = false;
  try {
    core.assertUpdateEnvironment(["update", "--channel", "x"]);
  } catch {
    threw = true;
  }
  assert(r, "eas update without --environment is rejected (gate throws)", threw, "SCENARIO 5 fail-safe");
  let okWithEnv = true;
  try {
    core.assertUpdateEnvironment(["update", "--channel", "x", "--environment", "production"]);
  } catch {
    okWithEnv = false;
  }
  assert(r, "eas update WITH --environment passes the gate", okWithEnv);

  // 3. SDK pin present — the scaffold pins the SDK via default@sdk-<n>, never the @latest transition default (V3).
  const scaffold = core.buildScaffoldArgs("./_x", 56);
  assert(r, "scaffold pins the SDK (default@sdk-56 template)", scaffold.includes("default@sdk-56"), scaffold.join(" "));
  assert(r, "scaffold is headless (--yes, no TTY hang)", scaffold.includes("--yes"));

  // 4. eas.json fixture = the 4-profile shape incl. `sim` (the override's structural bar).
  const easJson = JSON.parse(readFileSync(join(FIXTURES_DIR, "eas.json"), "utf8"));
  const profiles = Object.keys(easJson.build ?? {});
  assert(r, "eas.json has >=4 build profiles", profiles.length >= 4, `profiles: ${profiles.join(", ")}`);
  for (const p of ["development", "preview", "sim", "production"]) {
    assert(r, `eas.json has the '${p}' profile`, profiles.includes(p));
  }
  assert(r, "eas.json 'sim' profile targets the iOS simulator", easJson.build?.sim?.ios?.simulator === true);
  assert(r, "eas.json pins eas-cli (cli.version present)", typeof easJson.cli?.version === "string");

  // 5. No `newArchEnabled:false` — RN 0.82+ can't disable New Arch; the key is a removed no-op (invalidation 0.1).
  const appJsonRaw = readFileSync(join(FIXTURES_DIR, "app.json"), "utf8");
  assert(r, "app.json has no newArchEnabled:false (New Arch is default)", !/newArchEnabled"\s*:\s*false/.test(appJsonRaw));
  const appJson = JSON.parse(appJsonRaw);
  assert(r, "app.json uses the fingerprint runtimeVersion policy (OPINIONS S6)", appJson.expo?.runtimeVersion?.policy === "fingerprint");

  // 6. dsip.json valid JSON (RSI contract gate — darwin-check L0/L1 local substitute).
  let dsipOk = true;
  try {
    JSON.parse(readFileSync(join(REPO_ROOT, "dsip.json"), "utf8"));
  } catch {
    dsipOk = false;
  }
  assert(r, "dsip.json is valid JSON", dsipOk);

  // 7. Golden corpus integrity — >=10 tasks, and the L2/L3 tags match PLAN §6 verbatim (mis-tag = L1 fail).
  const golden = loadGolden();
  assert(r, "golden corpus has >=10 tasks", golden.length >= 10, `${golden.length} tasks`);
  const l2tagged = golden.filter((t) => t.hamel_level === "L2" && t.ci_block === true).map((t) => t.id).sort();
  const l3tagged = golden.filter((t) => t.hamel_level === "L3").map((t) => t.id).sort();
  assert(r, "the 7 L2-binary CI-block tasks match PLAN §6", JSON.stringify(l2tagged) === JSON.stringify([...L2_IDS].sort()), l2tagged.join(","));
  assert(r, "the 7 L3-nightly tasks match PLAN §6", JSON.stringify(l3tagged) === JSON.stringify([...L3_IDS].sort()), l3tagged.join(","));

  return r;
}

// ── L2: behavior (binary, $0) ──────────────────────────────────────────────────────────────────
function runL2() {
  const golden = loadGolden().filter((t) => L2_IDS.has(t.id));
  return golden.map((t) => gradeL2(t));
}

// ── orchestration ────────────────────────────────────────────────────────────────────────────────
function printL1(records) {
  console.log("eval L1 (structural · $0 · no token):");
  let pass = 0;
  for (const rec of records) {
    console.log(`  ${rec.pass ? "PASS" : "FAIL"}  ${rec.name}${rec.detail ? `  [${rec.detail}]` : ""}`);
    if (rec.pass) pass += 1;
  }
  const ok = pass === records.length;
  console.log(`  L1: ${pass}/${records.length} ${ok ? "— green" : "— RED (blocking)"}`);
  return ok;
}

function printL2(results) {
  console.log("eval L2 (behavior · binary · $0 · 7 CI-blocking golden tasks):");
  let pass = 0;
  for (const res of results) {
    const c = res.criteria;
    const flags = `rootCause:${c.rootCause ? "Y" : "N"} fix:${c.fix ? "Y" : "N"} avoidsWrong:${c.avoidsWrong ? "Y" : "N"}`;
    const extra = res.missing.length ? `  missing=[${res.missing.join(", ")}]` : (res.leaked.length ? `  leaked=[${res.leaked.join(", ")}]` : "");
    console.log(`  ${res.pass ? "PASS" : "FAIL"}  ${res.id}  (${flags})${extra}`);
    if (res.pass) pass += 1;
  }
  const ok = pass === results.length;
  console.log(`  L2: ${pass}/${results.length} ${ok ? "— green" : "— RED (blocking)"}`);
  return ok;
}

async function main() {
  const args = process.argv.slice(2);
  const wantL1 = args.includes("--l1");
  const wantL2 = args.includes("--l2");
  const wantL3 = args.includes("--l3");
  // Default (no level flag): the $0 CI blockers = L1 + L2.
  const none = !wantL1 && !wantL2 && !wantL3;
  const runL1Flag = wantL1 || none;
  const runL2Flag = wantL2 || none;

  let ok = true;

  if (runL1Flag) {
    const l1 = await runL1();
    if (!printL1(l1)) ok = false;
  }
  if (runL2Flag) {
    if (!printL2(runL2())) ok = false;
  }
  if (wantL3) {
    // L3 is token-gated; judge-l3.mjs (E2) self-skips $0 when no key is present and returns rc 0.
    const judgePath = join(HERE, "judge-l3.mjs");
    if (!existsSync(judgePath)) {
      console.log("eval L3: judge-l3.mjs not present (E2). Skipping.");
    } else {
      const { runL3 } = await import(pathToFileURL(judgePath).href);
      const l3ok = await runL3();
      if (l3ok === false) ok = false; // a real judged failure blocks; a $0 skip returns true
    }
  }

  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("eval/run.mjs error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
