// scaffold.test.ts — asserts the `pebble init` scaffold argv is headless + SDK-pinned (B3 invariant).
// create-expo-app has no --non-interactive; its anti-TTY-hang flag is --yes. The SDK MUST be pinned via
// the template (default@sdk-<n>), never left to create-expo-app@latest's transition default (V3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildScaffoldArgs } from "./scaffold.js";

test("buildScaffoldArgs injects --yes (the create-expo-app anti-TTY-hang reflex)", () => {
  const args = buildScaffoldArgs("./my-app", 56);
  assert.ok(args.includes("--yes"), "scaffold argv must carry --yes (no interactive prompt)");
});

test("buildScaffoldArgs pins the SDK via the default@sdk-<n> template when none given", () => {
  const args = buildScaffoldArgs("./my-app", 56);
  const i = args.indexOf("--template");
  assert.ok(i >= 0, "must pass --template");
  assert.equal(args[i + 1], "default@sdk-56", "SDK must be pinned in the template, not the @latest default");
});

test("buildScaffoldArgs honors an explicit template override", () => {
  const args = buildScaffoldArgs("./my-app", 56, "obytes");
  const i = args.indexOf("--template");
  assert.equal(args[i + 1], "obytes");
});

test("buildScaffoldArgs targets create-expo-app@latest and the given dir", () => {
  const args = buildScaffoldArgs("./_acceptance", 56);
  assert.equal(args[0], "create-expo-app@latest");
  assert.ok(args.includes("./_acceptance"));
});
