// wrappers/eas.ts — deterministic eas-cli wrappers. Every call is headless-safe via flags.wrapEas.
// Source: brain/TOOL-MATRIX.md §3 (the non-interactive cookbook), KNOWN-PITFALLS §9.

import { wrapEas } from "../lib/flags.js";
import { runWrapped, type RunResult } from "../lib/exec.js";

export type Platform = "ios" | "android" | "all";

/** `eas build` — fires the cloud build (--non-interactive --no-wait --json injected). Returns raw result. */
export function easBuild(platform: Platform, profile: string, cwd?: string): RunResult {
  const cmd = wrapEas(["build", "--platform", platform, "--profile", profile]);
  return runWrapped(cmd, { cwd, logCmd: `build --platform ${platform} --profile ${profile}` });
}

/** `eas submit` — submits the latest build. Knowledge-graded in MVP (paid creds — see CHAIRMAN-CHECKLIST). */
export function easSubmit(platform: "ios" | "android", cwd?: string): RunResult {
  const cmd = wrapEas(["submit", "--platform", platform, "--latest"]);
  return runWrapped(cmd, { cwd, logCmd: `submit --platform ${platform}` });
}

/**
 * `eas update` — OTA. `--environment` is MANDATORY (SDK 55+); wrapEas throws if missing
 * (caught before spawn — the #1 CI break, SCENARIO 5).
 */
export function easUpdate(
  channel: string,
  environment: string,
  message: string,
  cwd?: string,
): RunResult {
  const cmd = wrapEas([
    "update",
    "--channel",
    channel,
    "--environment",
    environment,
    "--message",
    message,
  ]);
  return runWrapped(cmd, { cwd, logCmd: `update --channel ${channel} --environment ${environment}` });
}

/** `eas config` — validate app.json + eas.json offline (the $0 acceptance verb; NOT a nonexistent --dry-run). */
export function easConfig(platform: Platform, cwd?: string): RunResult {
  const cmd = wrapEas(["config", "--platform", platform]);
  return runWrapped(cmd, { cwd, logCmd: `config --platform ${platform}` });
}
