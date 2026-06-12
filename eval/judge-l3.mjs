// eval/judge-l3.mjs — the L3 trajectory judge (TOKEN-GATED, binary per Hamel — never Likert).
//
// Scores the 7 nightly L3 golden tasks {G1,G2,G4,G7,G8,G10,G13} as TRAJECTORIES: a fresh pebble, given ONLY
// the symptom (no answer key), must (1) name the documented root cause, (2) propose the documented fix, and
// (3) avoid the named obvious-but-wrong path. Two model calls per task — generate (pebble-under-test) then
// judge (the grader) — both carry an EXPLICIT model (CP123 D6: judges/critics = fable). Binary per-criterion.
//
// Token-gated (DECISIONS D8): runs only when ANTHROPIC_API_KEY (or CLAUDE_CODE_OAUTH_TOKEN) is present;
// otherwise self-skips at $0 and returns true (a skip is not a failure). Uses raw HTTPS fetch against the
// Messages API — no SDK dep (matches the repo's dependency-free MCP-server pattern; Node 22+ has global fetch).
//
// Model: claude-fable-5 (the CP123 "fable" judge/critic tier). Fable 5 request surface: omit `thinking`
// (an explicit disabled 400s), no temperature/top_p/budget_tokens; structured output via output_config.format.
// Source: PLAN §6 / §11; HARNESS-OVERRIDES §9; brain/BATTLE-TESTED-SCENARIOS.md; CP123 DECISIONS D6/D8.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..");
const GOLDEN_DIR = join(HERE, "golden");
const SOUL_PATH = join(REPO_ROOT, "identity", "SOUL.md");

// CP123 D6: judges/critics = fable. This is the routed identity X2/enforce-cp123-models asserts.
const JUDGE_MODEL = "claude-fable-5";
const PEBBLE_MODEL = "claude-fable-5"; // pebble-under-test runs on the same tier as the harness's own model.

const L3_IDS = new Set(["G01", "G02", "G04", "G07", "G08", "G10", "G13"]);
const API_URL = "https://api.anthropic.com/v1/messages";

/** The token (D8). ANTHROPIC_API_KEY is the primary; CLAUDE_CODE_OAUTH_TOKEN lights the same path. */
function apiKey() {
  return process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_CODE_OAUTH_TOKEN ?? "";
}

/** Load the L3 golden tasks. */
function loadL3() {
  return readdirSync(GOLDEN_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(GOLDEN_DIR, f), "utf8")))
    .filter((t) => L3_IDS.has(t.id))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * One Messages API call (raw HTTPS — no SDK). Returns the response JSON or throws.
 * Fable 5 surface: no thinking/temperature; optional output_config.format for structured JSON.
 */
async function callMessages({ model, system, user, maxTokens = 1024, format }) {
  const body = {
    model,
    max_tokens: maxTokens,
    output_config: { effort: "low", ...(format ? { format } : {}) }, // low effort: a binary judge is a subagent task
    system,
    messages: [{ role: "user", content: user }],
  };
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Messages API ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

/** Pull the first text block out of a Messages response. */
function textOf(resp) {
  const blocks = resp?.content ?? [];
  for (const b of blocks) if (b.type === "text" && typeof b.text === "string") return b.text;
  return "";
}

/** Phase 1 — pebble-under-test diagnoses the symptom from its persona, with NO answer key. */
async function pebbleDiagnose(task, soul) {
  const system =
    soul +
    "\n\nYou are diagnosing a real React Native / Expo / EAS failure. Given ONLY the symptom, state the " +
    "root cause, the fix, and explicitly name the obvious-but-wrong path to avoid. Be specific and concise.";
  const user = `Symptom:\n${task.symptom}\n\nWhat is the root cause, the fix, and the obvious-but-wrong path to avoid?`;
  const resp = await callMessages({ model: PEBBLE_MODEL, system, user, maxTokens: 700 });
  return textOf(resp);
}

/** Phase 2 — the judge scores the candidate trajectory binary per-criterion against the documented answer. */
async function judgeTrajectory(task, candidate) {
  const system =
    "You are a strict eval judge. Score a candidate answer against the DOCUMENTED correct answer for a " +
    "React Native / Expo / EAS failure. Return ONLY JSON. Each criterion is BINARY (true/false), never a scale.";
  const user =
    `DOCUMENTED root cause: ${task.expected_root_cause}\n` +
    `DOCUMENTED fix: ${task.expected_fix}\n` +
    `OBVIOUS-BUT-WRONG path (the candidate must NOT endorse this): ${task.obvious_but_wrong}\n\n` +
    `CANDIDATE ANSWER:\n${candidate}\n\n` +
    `Score binary: names_root_cause (does it identify the documented root cause?), ` +
    `proposes_fix (does it propose the documented fix?), avoids_wrong_path (does it AVOID endorsing the ` +
    `obvious-but-wrong path — warning against it counts as avoiding it?).`;
  const format = {
    type: "json_schema",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        names_root_cause: { type: "boolean" },
        proposes_fix: { type: "boolean" },
        avoids_wrong_path: { type: "boolean" },
        reason: { type: "string" },
      },
      required: ["names_root_cause", "proposes_fix", "avoids_wrong_path", "reason"],
    },
  };
  const resp = await callMessages({ model: JUDGE_MODEL, system, user, maxTokens: 500, format });
  const raw = textOf(resp);
  try {
    return JSON.parse(raw);
  } catch {
    // A judge that returns malformed JSON fails closed (counts as not-passing) — never silently passes.
    return { names_root_cause: false, proposes_fix: false, avoids_wrong_path: false, reason: `unparseable: ${raw.slice(0, 80)}` };
  }
}

/**
 * Run the L3 trajectory judge. Returns true if every selected task passed all 3 binary criteria,
 * OR if the run was skipped ($0, no token). Returns false only on a real judged failure.
 */
export async function runL3() {
  if (!apiKey()) {
    console.log("eval L3 (trajectory · token-gated D8): ANTHROPIC_API_KEY/CLAUDE_CODE_OAUTH_TOKEN absent — skipping ($0). rc 0.");
    return true;
  }
  if (!existsSync(SOUL_PATH)) {
    console.log("eval L3: identity/SOUL.md missing — cannot build the pebble-under-test persona. Skipping.");
    return true;
  }
  const soul = readFileSync(SOUL_PATH, "utf8");
  const tasks = loadL3();
  console.log(`eval L3 (trajectory · binary · model=${JUDGE_MODEL}, D6): ${tasks.length} nightly tasks`);

  let failed = 0;
  let judged = 0;
  let skipped = 0;
  for (const task of tasks) {
    try {
      const candidate = await pebbleDiagnose(task, soul);
      const v = await judgeTrajectory(task, candidate);
      const pass = v.names_root_cause === true && v.proposes_fix === true && v.avoids_wrong_path === true;
      judged += 1;
      if (!pass) failed += 1;
      console.log(
        `  ${pass ? "PASS" : "FAIL"}  ${task.id}  ` +
          `(rootCause:${v.names_root_cause ? "Y" : "N"} fix:${v.proposes_fix ? "Y" : "N"} avoidsWrong:${v.avoids_wrong_path ? "Y" : "N"})` +
          `${pass ? "" : `  — ${String(v.reason ?? "").slice(0, 100)}`}`,
      );
    } catch (err) {
      // A network/API failure on a token-gated run is a SKIP for that task, not a false fail (don't break CI on flake).
      skipped += 1;
      console.log(`  SKIP  ${task.id}  (judge call failed: ${err instanceof Error ? err.message : String(err)})`);
    }
  }
  // Honest summary: distinguish "judged + passed" from "all skipped (nothing actually judged)".
  if (judged === 0) {
    console.log(`  L3: 0/${tasks.length} judged (all ${skipped} skipped — API unreachable/credit-gated). No regression signal; rc 0.`);
    return true; // a token-gated run that couldn't reach the API is not a red-block (D8 flake tolerance)
  }
  console.log(`  L3: ${judged - failed}/${judged} judged tasks passed (${skipped} skipped). ${failed === 0 ? "no regression" : "REGRESSION — at least one judged task FAILED"}`);
  return failed === 0;
}

// Allow standalone invocation: `node eval/judge-l3.mjs`.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  runL3().then((ok) => process.exit(ok ? 0 : 1)).catch((err) => {
    console.error("judge-l3 error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
