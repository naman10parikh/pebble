// eval/grader-l2.test.mjs — proves the L2 binary grader has TEETH (the eval is an immune system, not a
// rubber stamp). Runs natively under `node --test` (no compile — it's plain .mjs importing the .mjs grader).
// The key risk for a keyword grader is that it passes a WRONG answer or an answer that ENDORSES the wrong
// path; these tests assert it fails both, and that a correct answer naming the wrong path to WARN still passes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeL2 } from "./grader-l2.mjs";

const TASK = {
  id: "G_TEST",
  root_cause_keywords: ["fingerprint", "binary"],
  fix_keywords: ["rebuild"],
  avoid_keywords: ["roll back the js"],
};

test("a correct answer (root cause + fix + negated wrong-path) PASSES", () => {
  const r = gradeL2({
    ...TASK,
    pebble_answer:
      "Root cause: a binary release smuggled as an OTA. Fix: rebuild and bump runtimeVersion with the " +
      "fingerprint policy. Do NOT roll back the JS — that hides the boundary violation.",
  });
  assert.equal(r.pass, true, JSON.stringify(r));
  assert.deepEqual(r.criteria, { rootCause: true, fix: true, avoidsWrong: true });
});

test("an answer that ENDORSES the obvious-but-wrong path FAILS (grader has teeth)", () => {
  const r = gradeL2({
    ...TASK,
    // Names the keywords but tells you to roll back the JS WITHOUT negation → an endorsement, must fail.
    pebble_answer:
      "It's a binary mismatch with the fingerprint policy. Just roll back the JS and rebuild; you're fine.",
  });
  assert.equal(r.pass, false);
  assert.equal(r.criteria.avoidsWrong, false);
  assert.ok(r.leaked.includes("roll back the js"));
});

test("an answer MISSING a required root-cause keyword FAILS", () => {
  const r = gradeL2({
    ...TASK,
    // Has the fix + avoids the wrong path, but never names the binary/fingerprint root cause.
    pebble_answer: "Rebuild the app. Do NOT roll back the JS.",
  });
  assert.equal(r.pass, false);
  assert.equal(r.criteria.rootCause, false);
  assert.ok(r.missing.some((m) => m.startsWith("root:")));
});

test("an empty answer FAILS (no silent pass on a blank stance)", () => {
  const r = gradeL2({ ...TASK, pebble_answer: "" });
  assert.equal(r.pass, false);
});
