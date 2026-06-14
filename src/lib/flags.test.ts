// flags.test.ts — asserts the anti-TTY-hang invariants (HARNESS-OVERRIDES §4 / B3 verify).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  injectNonInteractive,
  assertUpdateEnvironment,
  wrapEas,
  wrapExpo,
} from "./flags.js";

test("injectNonInteractive adds the flag when absent", () => {
  assert.deepEqual(injectNonInteractive(["build"]), ["build", "--non-interactive"]);
});

test("injectNonInteractive is idempotent (no double-add)", () => {
  const once = injectNonInteractive(["build"]);
  assert.deepEqual(injectNonInteractive(once), once);
});

test("wrapEas injects --non-interactive on EVERY eas call", () => {
  for (const sub of [
    ["build", "--platform", "ios"],
    ["submit", "--platform", "ios", "--latest"],
    ["update", "--channel", "x", "--environment", "production"],
    ["build:list", "--limit", "1"],
  ]) {
    const w = wrapEas(sub);
    assert.ok(w.args.includes("--non-interactive"), `missing on: ${sub.join(" ")}`);
    assert.equal(w.bin, "eas");
  }
});

test("wrapExpo injects --non-interactive on EVERY expo call", () => {
  for (const sub of [["install", "expo-router"], ["export"], ["prebuild", "--clean"]]) {
    const w = wrapExpo(sub);
    assert.ok(w.args.includes("--non-interactive"), `missing on: ${sub.join(" ")}`);
    assert.equal(w.bin, "expo");
  }
});

test("wrapEas build injects --no-wait and --json (fire+poll, never block)", () => {
  const w = wrapEas(["build", "--platform", "all", "--profile", "preview"]);
  assert.ok(w.args.includes("--no-wait"));
  assert.ok(w.args.includes("--json"));
});

test("assertUpdateEnvironment THROWS when eas update omits --environment (SCENARIO 5)", () => {
  assert.throws(() => assertUpdateEnvironment(["update", "--channel", "x"]), /--environment/);
});

test("assertUpdateEnvironment passes when --environment present (flag or key=val form)", () => {
  assert.doesNotThrow(() => assertUpdateEnvironment(["update", "--channel", "x", "--environment", "prod"]));
  assert.doesNotThrow(() => assertUpdateEnvironment(["update", "--environment=prod"]));
});

// SCENARIO-5 hole (Wave T council MAJOR): a PRESENT-but-EMPTY --environment must throw too — it
// shells `eas update --environment ""`, the exact CI break the gate exists to prevent. The check
// lives in the shared core so BOTH the CLI and the MCP tool inherit it ("one core, two surfaces").
test("assertUpdateEnvironment THROWS on empty/whitespace --environment value (SCENARIO 5 hole)", () => {
  assert.throws(() => assertUpdateEnvironment(["update", "--channel", "x", "--environment", ""]), /non-empty --environment/);
  assert.throws(() => assertUpdateEnvironment(["update", "--channel", "x", "--environment", "   "]), /non-empty --environment/);
  assert.throws(() => assertUpdateEnvironment(["update", "--environment="]), /non-empty --environment/);
  // A trailing --environment flag with no following token is empty too.
  assert.throws(() => assertUpdateEnvironment(["update", "--channel", "x", "--environment"]), /non-empty --environment/);
});

test("wrapEas update with empty --environment throws (gate fires before spawn — both surfaces)", () => {
  assert.throws(() => wrapEas(["update", "--channel", "x", "--environment", "", "--message", "y"]), /non-empty --environment/);
});

test("assertUpdateEnvironment ignores non-update commands", () => {
  assert.doesNotThrow(() => assertUpdateEnvironment(["build", "--platform", "ios"]));
});

test("wrapEas update without --environment throws (the gate fires before spawn)", () => {
  assert.throws(() => wrapEas(["update", "--channel", "x"]), /--environment/);
});
