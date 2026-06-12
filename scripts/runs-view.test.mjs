// scripts/runs-view.test.mjs — unit-tests the Observability aggregator's logic (E3).
// Pure functions (aggregate/render) tested on synthetic rows — no disk, no network. Runs under `node --test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregate, render } from "./runs-view.mjs";

const ROWS = [
  { ts: "t1", cmd: "doctor", durationMs: 100, status: "ok" },
  { ts: "t2", cmd: "eas build --platform ios", durationMs: 200, status: "ok" },
  { ts: "t3", cmd: "eas submit --platform android", durationMs: 0, status: "error" },
  { ts: "t4", cmd: "build --platform all --profile preview", durationMs: 50, status: "blocked", model: "fable" },
];

test("aggregate groups by command verb and counts statuses", () => {
  const agg = aggregate(ROWS);
  const byCmd = Object.fromEntries(agg.map((a) => [a.cmd, a]));
  // "eas" verb appears twice (build + submit) → count 2, one ok one error.
  assert.equal(byCmd.eas.count, 2);
  assert.equal(byCmd.eas.ok, 1);
  assert.equal(byCmd.eas.error, 1);
  assert.equal(byCmd.eas.totalMs, 200);
  // "doctor" once, ok.
  assert.equal(byCmd.doctor.count, 1);
  assert.equal(byCmd.doctor.ok, 1);
  // "build" once, blocked, carries the model.
  assert.equal(byCmd.build.blocked, 1);
  assert.ok(byCmd.build.models.has("fable"));
});

test("aggregate sorts by count descending", () => {
  const agg = aggregate(ROWS);
  for (let i = 1; i < agg.length; i++) assert.ok(agg[i - 1].count >= agg[i].count);
});

test("render prints a table with a totals footer", () => {
  const out = render(ROWS);
  assert.match(out, /4 runs across 3 command\(s\)/);
  assert.match(out, /totals: 4 runs/);
  assert.match(out, /ok 2 \/ err 1 \/ blocked 1/);
});

test("render on an empty log is a friendly message, not a crash", () => {
  const out = render([]);
  assert.match(out, /no runs logged yet/);
});
