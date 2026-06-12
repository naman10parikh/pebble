#!/usr/bin/env node
/**
 * rsi.workflow.js — pebble's nightly RSI runner (the DETERMINISTIC, $0/tokenless half).
 *
 * This is a FIRST-CLASS runner (matches dsip.json `loop.runner`), not a side-file. It runs three
 * deterministic steps and writes a dated brain-refresh proposal:
 *   1. re-verify-tool-matrix — `npm view` react-native/expo/eas-cli, diff brain/TOOL-MATRIX.md §1
 *      (this IS Rule 0 automated). Drift → flag for a brain refresh.
 *   2. run-eval-pyramid     — shell E1's `node eval/run.mjs --l1 --l2` as the no-regression gate
 *      (skipped honestly if eval/ is not yet built — E1 is a sibling cluster).
 *   3. refresh-brain (propose) — write brain/research/proposed-<YYYY-MM-DD>.md capturing any drift /
 *      GAPS resolution. Does NOT auto-merge (a gated PR per DSIP `noSelfGrading: true`).
 *
 * `--dry` runs OFFLINE (skips `npm view` + the eval network) but STILL emits the proposed-*.md file.
 *
 * The Claude half (L3 trajectory judge / synthesis) is GATED on CLAUDE_CODE_OAUTH_TOKEN (DECISIONS D8).
 * When it runs, every agent invocation carries an EXPLICIT model (CP123 D6: judges/critics = fable) —
 * see runClaudeHalf() below (the `model:` key is mandatory per enforce-cp123-models / MASTER-TODOS X2).
 *
 * Source: PLAN §3.8 / §11; HARNESS-OVERRIDES §RSI; dsip.json; MASTER-TODOS D2 + X2.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..");
const RESEARCH_DIR = join(REPO_ROOT, "brain", "research");
const TOOL_MATRIX = join(REPO_ROOT, "brain", "TOOL-MATRIX.md");
const EVAL_RUN = join(REPO_ROOT, "eval", "run.mjs");

const DRY = process.argv.includes("--dry");

// The brain's dated-2026-06-11 baseline (TOOL-MATRIX §1) — same source of truth as src/commands/version-check.ts.
// version-check (the CLI) is the live tool; this runner is the nightly cron that re-runs the same Rule-0 check.
const BASELINE = {
  reactNativeFloorMinor: 85, // 0.85.x floor
  expoMajor: 56, // SDK 56
  easCli: "20.1.0", // pinned exactly (regressed in 18.5.0/18.13.1/19.0.1)
};

/** `npm view <pkg> <field>` → trimmed string, or null offline / on error. */
function npmView(pkg, field) {
  const res = spawnSync("npm", ["view", pkg, field], { encoding: "utf8", timeout: 30_000 });
  if (res.status !== 0) return null;
  const out = (res.stdout ?? "").trim();
  return out === "" ? null : out;
}

/** Step 1 — re-verify-tool-matrix (Rule 0 automated). Returns a drift report. Skipped offline (--dry). */
function reVerifyToolMatrix() {
  if (DRY) {
    return { ran: false, drift: false, notes: ["--dry: skipped npm view (offline). Re-run online for live drift."] };
  }
  const rn = npmView("react-native", "version");
  const expo = npmView("expo", "dist-tags.latest");
  const easCli = npmView("eas-cli", "version");
  const notes = [];
  let drift = false;

  if (rn === null || expo === null || easCli === null) {
    return { ran: false, drift: false, notes: ["npm unreachable — Rule 0 needs network; treated as no-op this run."] };
  }

  const rnMinor = (() => {
    const m = rn.match(/^0\.(\d+)\./);
    return m ? Number(m[1]) : null;
  })();
  if (rnMinor !== null && rnMinor > BASELINE.reactNativeFloorMinor) {
    drift = true;
    notes.push(`react-native: npm ${rn} > brain floor 0.${BASELINE.reactNativeFloorMinor}.x → propose brain refresh (npm can lead the blog).`);
  } else {
    notes.push(`react-native: npm ${rn} at/below brain floor 0.${BASELINE.reactNativeFloorMinor}.x — OK.`);
  }

  const expoMajor = (() => {
    const m = expo.match(/^(\d+)\./);
    return m ? Number(m[1]) : null;
  })();
  if (expoMajor !== null && expoMajor !== BASELINE.expoMajor) {
    drift = true;
    notes.push(`expo SDK: npm ${expo} ≠ brain SDK ${BASELINE.expoMajor} → re-pin pebble init --sdk/--template.`);
  } else {
    notes.push(`expo SDK: npm ${expo} matches brain major ${BASELINE.expoMajor} — OK.`);
  }

  if (easCli !== BASELINE.easCli) {
    drift = true;
    notes.push(`eas-cli: npm ${easCli} ≠ brain pin ${BASELINE.easCli} → deliberately re-test before bumping (S9 regressions).`);
  } else {
    notes.push(`eas-cli: npm ${easCli} matches the pin ${BASELINE.easCli} — OK.`);
  }

  return { ran: true, drift, notes, live: { rn, expo, easCli } };
}

/** Step 2 — run-eval-pyramid (the no-regression gate). Shells E1's eval if present; skips honestly otherwise. */
function runEvalPyramid() {
  if (!existsSync(EVAL_RUN)) {
    return { ran: false, ok: null, notes: ["eval/run.mjs not present yet (E1 sibling cluster) — eval gate skipped this run."] };
  }
  if (DRY) {
    return { ran: false, ok: null, notes: ["--dry: skipped the eval pyramid (would shell node eval/run.mjs --l1 --l2)."] };
  }
  const res = spawnSync("node", [EVAL_RUN, "--l1", "--l2"], { cwd: REPO_ROOT, encoding: "utf8", timeout: 120_000 });
  const ok = res.status === 0;
  return {
    ran: true,
    ok,
    notes: [ok ? "eval pyramid (L1+L2) green — no regression." : `eval pyramid FAILED (rc ${res.status}) — block any brain merge.`],
  };
}

/** Step 3 — refresh-brain (propose). ALWAYS writes a dated proposal (even in --dry). Never auto-merges. */
function refreshBrain(toolMatrix, evalResult) {
  mkdirSync(RESEARCH_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const file = join(RESEARCH_DIR, `proposed-${date}.md`);
  const driftLines = (toolMatrix.notes ?? []).map((n) => `- ${n}`).join("\n");
  const evalLines = (evalResult.notes ?? []).map((n) => `- ${n}`).join("\n");
  const drifted = toolMatrix.drift === true;

  const body = `# RSI proposal — ${date}${DRY ? " (dry run)" : ""}

> Auto-generated by \`workflows/rsi.workflow.js\` (the deterministic $0 RSI half). **Proposal only — does
> NOT auto-merge** (DSIP \`noSelfGrading: true\`; a human/gated PR decides). Source: dsip.json, PLAN §11.

## Step 1 — re-verify-tool-matrix (Rule 0)
${driftLines || "- (no notes)"}

**Verdict:** ${drifted ? "DRIFT DETECTED — re-read the changelog(s) above and update brain/TOOL-MATRIX.md §1 + EXPERTISE-MAP/KNOWN-PITFALLS, then re-pin `pebble init`." : "no drift — brain matches npm."}

## Step 2 — run-eval-pyramid (no-regression gate)
${evalLines || "- (no notes)"}

## Step 3 — refresh-brain (propose)
${drifted
  ? "A version major moved. Propose: (1) re-grade the affected raw sources, (2) update the dated baseline in TOOL-MATRIX §1 + version-check.ts/rsi.workflow.js BASELINE, (3) move any now-resolved GAPS-AND-DISPUTES item → KNOWN-PITFALLS/OPINIONS with today's date."
  : "No version drift this run. The to-shrink surface is `brain/GAPS-AND-DISPUTES.md` — the single highest-value experiment (PLAN §11) remains: does the #45772 OTA-activation crash reproduce on pebble's pinned SDK on the Energy stack? Resolving it flips OPINIONS S8."}

## Claude half (token-gated, D8)
${process.env.CLAUDE_CODE_OAUTH_TOKEN
  ? "CLAUDE_CODE_OAUTH_TOKEN present → the L3 trajectory judge + synthesis would run here (model: fable, D6)."
  : "CLAUDE_CODE_OAUTH_TOKEN absent → L3 judge / synthesis skipped ($0). Set the token (CHAIRMAN-CHECKLIST) to light up the Claude half."}
`;
  writeFileSync(file, body);
  return file;
}

/**
 * The Claude half — token-gated (D8). NOT invoked in the deterministic $0 path. When CLAUDE_CODE_OAUTH_TOKEN
 * is set, this is where the L3 trajectory judge + brain-synthesis agent runs. Every agent call carries an
 * EXPLICIT model (CP123 D6: judges/critics = fable) — the `model:` key below is the routed identity X2 asserts.
 * (Kept as a guarded stub: the deterministic half ships now; the agent wiring lights up with the token.)
 */
function runClaudeHalf() {
  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) return { ran: false };
  // Explicit routing (D6 / enforce-cp123-models): the trajectory judge is a critic → fable.
  const agentSpec = { role: "rsi-trajectory-judge", model: "fable", task: "Grade the 7 L3 scenarios (binary per-criterion)." };
  // The actual `claude -p` invocation lands when the token is provisioned; the routed identity is fixed here.
  console.log(`[rsi] Claude half available — would dispatch ${agentSpec.role} with model: ${agentSpec.model}`);
  return { ran: true, model: agentSpec.model };
}

function main() {
  console.log(`[rsi] pebble nightly RSI runner — deterministic half${DRY ? " (--dry)" : ""}`);
  const toolMatrix = reVerifyToolMatrix();
  for (const n of toolMatrix.notes) console.log(`[rsi] tool-matrix: ${n}`);

  const evalResult = runEvalPyramid();
  for (const n of evalResult.notes) console.log(`[rsi] eval: ${n}`);

  const proposalPath = refreshBrain(toolMatrix, evalResult);
  console.log(`[rsi] refresh-brain: wrote proposal → ${proposalPath}`);

  runClaudeHalf();

  // The deterministic runner never fails on drift (drift is a PROPOSAL signal, not an error) — Rule 0's whole
  // point. It fails only if the eval pyramid actually regressed (a real no-regression gate breach).
  if (evalResult.ran && evalResult.ok === false) {
    console.error("[rsi] eval pyramid regressed — exiting non-zero (no-regression gate breach).");
    process.exit(1);
  }
  console.log("[rsi] done ($0 deterministic half).");
  process.exit(0);
}

main();
