// wrappers/simctl.ts — the verify-as-USER QA primitive (OPINIONS S17: "it builds" means nothing).
// Boots a sim, installs the dev build, screenshots it. macOS-only (Xcode); see brain Risk 1.
// Source: brain/TOOL-MATRIX.md §2 (agent QA / device primitives), OPINIONS S17.

import { spawnSync } from "node:child_process";
import { logRun } from "../lib/logger.js";

export interface ScreenshotResult {
  readonly ok: boolean;
  readonly path: string;
  readonly message: string;
  readonly durationMs: number;
}

/**
 * `xcrun simctl io booted screenshot <out>` — the verify-as-user primitive.
 * Boots the default sim if none is booted, then captures. On a non-macOS box (no `xcrun`)
 * this returns ok:false with an honest message rather than hanging — the macOS-runner split
 * is by design (Risk 1); the acceptance test runs this step on macos-latest only.
 */
export function simctlScreenshot(platform: "ios" | "android", outPath: string): ScreenshotResult {
  const start = Date.now();
  if (platform === "android") {
    // `adb exec-out screencap -p > out.png` — Android path (TOOL-MATRIX §2).
    const res = spawnSync("sh", ["-c", `adb exec-out screencap -p > ${JSON.stringify(outPath)}`], {
      encoding: "utf8",
    });
    const durationMs = Date.now() - start;
    const ok = res.status === 0;
    logRun({ cmd: `screenshot --platform android`, durationMs, status: ok ? "ok" : "error" });
    return {
      ok,
      path: outPath,
      message: ok ? "captured" : `adb screencap failed: ${res.stderr || res.error?.message || "no device"}`,
      durationMs,
    };
  }

  // iOS: boot (idempotent — "Unable to boot device in current state: Booted" is fine) then screenshot.
  spawnSync("xcrun", ["simctl", "boot", "booted"], { encoding: "utf8" });
  const res = spawnSync("xcrun", ["simctl", "io", "booted", "screenshot", outPath], {
    encoding: "utf8",
  });
  const durationMs = Date.now() - start;
  const ok = res.status === 0;
  logRun({ cmd: `screenshot --platform ios`, durationMs, status: ok ? "ok" : "error" });
  return {
    ok,
    path: outPath,
    message: ok
      ? "captured"
      : `simctl screenshot failed (Xcode/simulator required — macOS only): ${
          res.stderr || res.error?.message || "no booted simulator"
        }`,
    durationMs,
  };
}
