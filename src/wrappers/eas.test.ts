// wrappers/eas.test.ts — asserts the eas wrappers honor the headless invariants at the wrapper boundary.
// We test the argv the wrappers build via the shared flags layer (no real network spawn in a unit test).
import { test } from "node:test";
import assert from "node:assert/strict";
import { wrapEas } from "../lib/flags.js";

// The wrappers in eas.ts construct argv through wrapEas; re-deriving the same argv here proves the
// invariants the wrappers rely on. (B3 verify: --non-interactive on every eas argv; --environment on update.)

test("the build argv pebble fires carries --non-interactive --no-wait --json", () => {
  const w = wrapEas(["build", "--platform", "ios", "--profile", "preview"]);
  assert.ok(w.args.includes("--non-interactive"));
  assert.ok(w.args.includes("--no-wait"));
  assert.ok(w.args.includes("--json"));
});

test("the update argv pebble fires requires --environment (gate throws otherwise)", () => {
  // easUpdate() always passes --environment, so this never throws in the real wrapper;
  // the gate exists to catch any future caller that forgets it.
  assert.throws(() => wrapEas(["update", "--channel", "production", "--message", "x"]), /--environment/);
  const ok = wrapEas([
    "update",
    "--channel",
    "production",
    "--environment",
    "production",
    "--message",
    "x",
  ]);
  assert.ok(ok.args.includes("--non-interactive"));
  assert.ok(ok.args.includes("--environment"));
});

test("the config argv (the $0 acceptance verb) is headless-safe", () => {
  const w = wrapEas(["config", "--platform", "ios"]);
  assert.ok(w.args.includes("--non-interactive"));
  assert.equal(w.bin, "eas");
});
