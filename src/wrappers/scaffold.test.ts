// scaffold.test.ts — asserts the `pebble init` scaffold argv is headless + SDK-pinned (B3 invariant).
// create-expo-app has no --non-interactive; its anti-TTY-hang flag is --yes. The SDK MUST be pinned via
// the template (default@sdk-<n>), never left to create-expo-app@latest's transition default (V3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildScaffoldArgs, easJsonScaffold, depositEasJson } from "./scaffold.js";

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

// T-user finding: create-expo-app's default template ships NO eas.json, so `eas config` /
// `pebble build` failed "eas.json could not be found" on a fresh scaffold — the acceptance bar's
// second half. `pebble init` now deposits the canonical 4-profile config. Assert its shape (the same
// invariants the L1 grader checks on eval/fixtures/eas.json) + that the writer is idempotent.
test("easJsonScaffold has the 4-profile shape incl. a simulator-targeted 'sim' + pinned eas-cli", () => {
  const j = easJsonScaffold() as {
    cli?: { version?: string };
    build?: Record<string, { ios?: { simulator?: boolean } }>;
  };
  const profiles = Object.keys(j.build ?? {});
  for (const p of ["development", "preview", "sim", "production"]) {
    assert.ok(profiles.includes(p), `eas.json must have the '${p}' build profile`);
  }
  assert.ok(profiles.length >= 4, "eas.json must have >=4 build profiles");
  assert.equal(j.build?.sim?.ios?.simulator, true, "'sim' must target the iOS simulator");
  assert.equal(typeof j.cli?.version, "string", "cli.version must pin eas-cli (OPINIONS S9)");
});

test("depositEasJson writes eas.json into a fresh dir and is idempotent (never clobbers)", () => {
  const dir = mkdtempSync(join(tmpdir(), "pebble-eas-"));
  try {
    // fresh dir → writes, file now valid JSON with the 'sim' profile
    assert.equal(depositEasJson(dir), true, "should write into a dir with no eas.json");
    const target = join(dir, "eas.json");
    assert.ok(existsSync(target), "eas.json must exist after deposit");
    const parsed = JSON.parse(readFileSync(target, "utf8"));
    assert.equal(parsed.build.sim.ios.simulator, true, "deposited eas.json must carry the sim profile");
    // already-present (e.g. a non-default template shipped one) → leaves it untouched
    writeFileSync(target, '{"custom":true}\n', "utf8");
    assert.equal(depositEasJson(dir), false, "should NOT overwrite an existing eas.json");
    assert.equal(JSON.parse(readFileSync(target, "utf8")).custom, true, "existing eas.json must be preserved");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
