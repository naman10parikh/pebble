// commands/doctor.ts — `pebble doctor`: the cheapest health gate that exists (OPINIONS S4).
// Runs `expo-doctor` (New-Arch + dep health) + Rule-0 version-check, then prints the 60s triage map.
// Source: PLAN §4 command tree / §5 acceptance step 3, brain/OPINIONS.md S4, brain/CLAUDE.md (60s triage).

import { expoDoctor } from "../wrappers/expo.js";
import { versionCheck } from "./version-check.js";

/**
 * CLI entry: run the health gate against the app in `cwd` (defaults to process.cwd()).
 * rc 0 only when expo-doctor passes. version-check drift is REPORTED (not failed) — doctor's
 * red signal is the toolchain health, not version drift (that's `pebble version-check`'s job).
 */
export function runDoctor(cwd?: string): number {
  console.log("pebble doctor — the cheapest gate (expo-doctor + Rule 0 + the 60s triage):");

  // 1. Rule 0 (advisory inside doctor): surface drift but do not fail the gate on it.
  const vc = versionCheck();
  if (vc.ok) {
    console.log(`  versions: rn ${vc.rn ?? "?"} · expo ${vc.expo ?? "?"} · eas-cli ${vc.easCli ?? "?"}` +
      `${vc.drift ? " (drift — run `pebble version-check`)" : " (no drift)"}`);
  } else {
    console.log("  versions: npm unreachable — Rule 0 skipped (run `pebble version-check` online).");
  }

  // 2. expo-doctor is the gate. rc≠0 = a real health problem (New-Arch incompat, bad dep tree).
  const res = expoDoctor(cwd);
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.code !== 0) {
    if (res.stderr) process.stderr.write(res.stderr);
    console.error(
      "  → expo-doctor FAILED. 60s triage: (1) clustered/no-code-change → EAS infra, check status; " +
        "(2) New-Arch blank screen → Fabric view-flattening (collapsable={false}); " +
        "(3) `eas update` smuggled a native change → rebuild+bump runtimeVersion. Query `pebble brain` for the scenario.",
    );
    return res.code;
  }
  console.log(`  → expo-doctor passed (${res.durationMs}ms). Health gate green.`);
  return 0;
}
