// wrappers/expo.ts — deterministic `npx expo …` wrappers. Headless-safe via flags.wrapExpo.
// Source: brain/TOOL-MATRIX.md §2-§3, OPINIONS S3 (expo install for native deps), S4 (expo-doctor gate).

import { wrapExpo } from "../lib/flags.js";
import { runWrapped, type RunResult } from "../lib/exec.js";

/** `npx expo install <pkg>` — the ONLY correct way to add a native dep (resolves SDK-correct version, OPINIONS S3). */
export function expoInstall(pkg: string, cwd?: string): RunResult {
  const cmd = wrapExpo(["install", pkg]);
  return runWrapped(cmd, { cwd, logCmd: `expo install ${pkg}` });
}

/** `npx expo-doctor` — the cheapest health gate (OPINIONS S4). Shelled directly (not via expo subcommand). */
export function expoDoctor(cwd?: string): RunResult {
  // expo-doctor is its own package, run headless via npx; no --non-interactive flag exists for it,
  // but it is non-interactive by nature. Log under the canonical "doctor" cmd.
  return runWrapped({ bin: "expo-doctor@latest", args: [] }, { cwd, logCmd: "doctor" });
}

/** `npx expo export` — reproduce bundling locally (catches case-sensitivity + resolution bugs, SCENARIO 6). */
export function expoExport(cwd?: string): RunResult {
  const cmd = wrapExpo(["export"]);
  return runWrapped(cmd, { cwd, logCmd: "expo export" });
}

/** `npx expo prebuild --clean` — required after adding any native/config-plugin lib (KNOWN-PITFALLS §3). */
export function expoPrebuildClean(cwd?: string): RunResult {
  const cmd = wrapExpo(["prebuild", "--clean"]);
  return runWrapped(cmd, { cwd, logCmd: "expo prebuild --clean" });
}
