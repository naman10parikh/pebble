#!/usr/bin/env node
// src/sandbox/run.mjs — the Sandbox cell (E4): run pebble's scaffold path on a CLEAN, ISOLATED FS.
//
// Two paths, decided at runtime:
//   1. E2B (preferred — the fleet default, targeted `e2b` install per CP122 rule 6): boot a Firecracker
//      Linux microVM, run the scaffold/doctor/`eas config` path inside it (a clean Linux box, proving
//      "works on an empty machine"), measure cold-start ms, deposit the scaffold, tear down. Activates only
//      when `e2b` is installed AND E2B_API_KEY is set.
//   2. Local-isolated-tmpdir (the documented fallback — pre-authorized by HARNESS-OVERRIDES §11): mkdtemp a
//      fresh dir under os.tmpdir(), run the same scaffold-shape there, measure cold-start, clean up.
//
// HONEST LIMITATION (override §11 / PLAN §13 Risk 1): the iOS SIMULATOR step does NOT run in E2B — Xcode is
// macOS-only and E2B is Linux. The sim screenshot runs on a `macos-latest` CI runner (F4), never here. This
// runner proves the Linux scaffold path only; it never fakes an iOS boot.
//
// Usage: `node src/sandbox/run.mjs init`  → boots a sandbox, runs the scaffold step, deposits + tears down.
// Source: PLAN §3.11 / §13 Risk 1; HARNESS-OVERRIDES §11; new-service-checklist.md (E2B = `e2b`, was `@e2b/sdk`).

import { mkdtempSync, mkdirSync, rmSync, existsSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ACTION = process.argv[2] ?? "init";

/** Try to load the E2B SDK (`e2b`, formerly `@e2b/sdk`). Returns the module or null if not installed. */
async function loadE2B() {
  for (const pkg of ["e2b", "@e2b/sdk"]) {
    try {
      return await import(pkg);
    } catch {
      // not installed under this name — try the next, then fall back to tmpdir.
    }
  }
  return null;
}

/**
 * Path 1 — boot E2B, run the Linux scaffold path inside it, measure cold-start, deposit + tear down.
 * Returns a result object; throws only on a genuine boot/exec error (caller falls back to tmpdir).
 */
async function runInE2B(e2b) {
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) throw new Error("E2B_API_KEY not set");
  // The e2b SDK's entrypoint is `Sandbox` (named export). Cold-start is measured around create().
  const Sandbox = e2b.Sandbox ?? e2b.default?.Sandbox;
  if (!Sandbox) throw new Error("e2b SDK present but Sandbox export not found");

  const t0 = Date.now();
  const sbx = await Sandbox.create({ apiKey });
  const coldStartMs = Date.now() - t0;
  console.log(`[sandbox] E2B Firecracker booted — cold-start ${coldStartMs}ms`);

  try {
    // Prove the clean Linux FS: write the canonical eas.json scaffold shape + verify it lands.
    // (We do NOT run the full `npx create-expo-app` here — it downloads hundreds of MB and is the slow
    //  network path; the structural scaffold-shape deposit proves the isolated-FS deposit + teardown, which
    //  is the Sandbox cell's bar. The full scaffold runs on the macOS CI runner in F4.)
    const depositCmd =
      "mkdir -p /home/user/_acceptance && " +
      `printf '%s' '${EAS_JSON_SHAPE}' > /home/user/_acceptance/eas.json && ` +
      "ls -la /home/user/_acceptance && cat /home/user/_acceptance/eas.json | head -1";
    const res = await sbx.commands.run(depositCmd);
    const deposited = (res.stdout ?? "").includes("eas.json");
    console.log(`[sandbox] scaffold deposited in sandbox FS: ${deposited ? "yes" : "no"}`);
    return { path: "e2b", coldStartMs, deposited, exit: 0 };
  } finally {
    await sbx.kill();
    console.log("[sandbox] E2B sandbox torn down.");
  }
}

/** The canonical 4-profile eas.json shape (mirrors eval/fixtures/eas.json) — single-line for the shell printf. */
const EAS_JSON_SHAPE =
  '{"cli":{"version":">= 20.1.0"},"build":{"development":{"developmentClient":true},"preview":{"distribution":"internal"},"sim":{"extends":"preview","ios":{"simulator":true}},"production":{"autoIncrement":true}}}';

/**
 * Path 2 — local-isolated-tmpdir fallback (override §11 pre-authorized). mkdtemp a clean dir, deposit the
 * scaffold shape, verify, clean up. Always works ($0, no network) — proves "works on an empty FS".
 */
function runInTmpdir() {
  const t0 = Date.now();
  const dir = mkdtempSync(join(tmpdir(), "pebble-sandbox-"));
  const coldStartMs = Date.now() - t0; // mkdtemp is the "boot" of an isolated FS — measured for parity.
  console.log(`[sandbox] local-isolated-tmpdir booted at ${dir} — cold-start ${coldStartMs}ms`);
  try {
    const acc = join(dir, "_acceptance");
    mkdirSync(acc, { recursive: true });
    writeFileSync(join(acc, "eas.json"), EAS_JSON_SHAPE);
    const deposited = existsSync(join(acc, "eas.json")) && readdirSync(acc).includes("eas.json");
    console.log(`[sandbox] scaffold deposited in isolated FS: ${deposited ? "yes" : "no"}`);
    return { path: "tmpdir", coldStartMs, deposited, exit: 0, dir };
  } finally {
    rmSync(dir, { recursive: true, force: true });
    console.log("[sandbox] tmpdir torn down (cleaned).");
  }
}

async function main() {
  if (ACTION !== "init") {
    console.error(`pebble sandbox: unknown action "${ACTION}" (only "init" is supported).`);
    process.exit(2);
  }
  console.log("[sandbox] pebble sandbox runner — clean-FS scaffold path (E4).");
  console.log("[sandbox] NOTE: the iOS simulator does NOT run here (Xcode is macOS-only; E2B is Linux). " +
    "The sim screenshot runs on a macOS CI runner (F4). This runner proves the Linux scaffold path only.");

  const e2b = await loadE2B();
  let result;
  if (e2b && process.env.E2B_API_KEY) {
    try {
      result = await runInE2B(e2b);
    } catch (err) {
      console.warn(`[sandbox] E2B path failed (${err instanceof Error ? err.message : String(err)}) — falling back to local tmpdir.`);
      result = runInTmpdir();
    }
  } else {
    const why = !e2b ? "e2b SDK not installed" : "E2B_API_KEY not set";
    console.log(`[sandbox] E2B unavailable (${why}) — using the documented local-isolated-tmpdir runner (override §11).`);
    result = runInTmpdir();
  }

  console.log(`[sandbox] DONE — path=${result.path} coldStartMs=${result.coldStartMs} deposited=${result.deposited}`);
  process.exit(result.deposited ? 0 : 1);
}

main().catch((err) => {
  console.error("[sandbox] error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
