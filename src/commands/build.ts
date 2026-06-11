// commands/build.ts — `pebble build` / `pebble submit` / `pebble update`: the EAS hands.
// Thin command bodies over the headless wrappers (eas.ts). Every call is --non-interactive;
// build fires + polls (--no-wait --json); update ENFORCES --environment (the gate throws on omission).
// Source: PLAN §4 command tree, brain/TOOL-MATRIX.md §3, brain/KNOWN-PITFALLS.md §9 (SCENARIO 5).

import { easBuild, easSubmit, easUpdate, type Platform } from "../wrappers/eas.js";

function emit(res: { code: number; stdout: string; stderr: string; durationMs: number }, ok: string): number {
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.code !== 0 && res.stderr) process.stderr.write(res.stderr);
  console.log(res.code === 0 ? ok : `pebble: EAS call failed (rc ${res.code}). Needs EXPO_TOKEN + network.`);
  return res.code;
}

/** `pebble build --platform <ios|android|all> --profile <p>` — fires the cloud build, returns the id (via --json). */
export function runBuild(platform: Platform, profile: string, cwd?: string): number {
  console.log(`pebble build: firing eas build --platform ${platform} --profile ${profile} (headless, --no-wait)…`);
  return emit(easBuild(platform, profile, cwd), "pebble build: fired. Poll status with `pebble runs` / `eas build:list`.");
}

/** `pebble submit --platform <ios|android> --latest` — store submit (paid creds; warns on 1st Play upload). */
export function runSubmit(platform: "ios" | "android", cwd?: string): number {
  console.log(`pebble submit: eas submit --platform ${platform} --latest (needs ASC API key / Play service-account)…`);
  return emit(easSubmit(platform, cwd), "pebble submit: submitted the latest build.");
}

/**
 * `pebble update --channel <c> --environment <e> -m "<msg>"` — OTA.
 * `--environment` is MANDATORY (SDK 55+): the wrapper THROWS before spawn if it's missing
 * (the #1 CI break — SCENARIO 5). We surface that as a clean rc 1 + message, never a stack trace.
 */
export function runUpdate(channel: string, environment: string, message: string, cwd?: string): number {
  if (!environment || environment.trim() === "") {
    console.error(
      "pebble update: --environment is REQUIRED (mandatory on SDK 55+). Omitting it is the #1 CI break " +
        "(SCENARIO 5). Pass --environment <production|preview|development>.",
    );
    return 1;
  }
  console.log(`pebble update: eas update --channel ${channel} --environment ${environment} (headless)…`);
  return emit(easUpdate(channel, environment, message, cwd), "pebble update: OTA published.");
}
