// commands/version-check.ts — `pebble version-check`: Rule 0 automated.
// `npm view` RN/expo/eas-cli → diff brain/TOOL-MATRIX.md §1 → report drift. NEVER quote a version from memory.
// Degrades gracefully offline (rc≠0 + honest message, never hangs). Source: brain/KNOWN-PITFALLS §9, TOOL-MATRIX §1/§3.

import { spawnSync } from "node:child_process";

// The brain's dated-2026-06-11 baseline (TOOL-MATRIX §1). version-check's job is to DETECT drift from these,
// not to trust them — npm is ground truth for availability (a major may have moved since the brain was written).
export const BRAIN_BASELINE = {
  // RN floor: brain header says "RN 0.85 floor"; npm `latest` can be ahead of the blog (KNOWN-PITFALLS §9).
  reactNativeFloorMinor: 85, // 0.85.x
  expoMajor: 56, // SDK 56
  easCli: "20.1.0", // pinned exactly (regressed in 18.5.0/18.13.1/19.0.1 — OPINIONS S9)
} as const;

export interface VersionCheckResult {
  readonly ok: boolean; // true if every npm view resolved (online)
  readonly drift: boolean; // true if any package moved past the brain baseline
  readonly rn?: string;
  readonly expo?: string;
  readonly easCli?: string;
  readonly notes: readonly string[];
}

function npmView(pkg: string, field: string): string | null {
  const res = spawnSync("npm", ["view", pkg, field], { encoding: "utf8", timeout: 30_000 });
  if (res.status !== 0) return null;
  const out = (res.stdout ?? "").trim();
  return out === "" ? null : out;
}

/** Parse a semver minor for `0.MINOR.patch` (RN). Returns null if unparseable. */
function rnMinor(version: string): number | null {
  const m = version.match(/^0\.(\d+)\./);
  return m ? Number(m[1]) : null;
}

function major(version: string): number | null {
  const m = version.match(/^(\d+)\./);
  return m ? Number(m[1]) : null;
}

/** Run Rule 0: pull live versions and diff the brain baseline. */
export function versionCheck(): VersionCheckResult {
  const rn = npmView("react-native", "version");
  const expo = npmView("expo", "dist-tags.latest");
  const easCli = npmView("eas-cli", "version");
  const notes: string[] = [];

  if (rn === null || expo === null || easCli === null) {
    notes.push(
      "offline or npm unreachable — could not reach the npm registry. Rule 0 requires network; " +
        "re-run online before pinning. (Never quote a version from memory.)",
    );
    return { ok: false, drift: false, rn: rn ?? undefined, expo: expo ?? undefined, easCli: easCli ?? undefined, notes };
  }

  let drift = false;

  const liveRnMinor = rnMinor(rn);
  if (liveRnMinor !== null && liveRnMinor > BRAIN_BASELINE.reactNativeFloorMinor) {
    drift = true;
    notes.push(
      `react-native drifted: brain floor 0.${BRAIN_BASELINE.reactNativeFloorMinor}.x, npm latest ${rn} ` +
        `(npm can be ahead of the release blog — KNOWN-PITFALLS §9). Re-read the changelog; update EXPERTISE-MAP/KNOWN-PITFALLS.`,
    );
  } else {
    notes.push(`react-native ${rn} at/below brain floor 0.${BRAIN_BASELINE.reactNativeFloorMinor}.x — OK.`);
  }

  const liveExpoMajor = major(expo);
  if (liveExpoMajor !== null && liveExpoMajor !== BRAIN_BASELINE.expoMajor) {
    drift = true;
    notes.push(
      `expo SDK drifted: brain SDK ${BRAIN_BASELINE.expoMajor}, npm latest ${expo}. ` +
        `Re-read expo.dev/changelog and re-pin pebble init's --sdk/--template.`,
    );
  } else {
    notes.push(`expo SDK ${expo} matches brain major ${BRAIN_BASELINE.expoMajor} — OK.`);
  }

  if (easCli !== BRAIN_BASELINE.easCli) {
    drift = true;
    notes.push(
      `eas-cli drifted: brain pin ${BRAIN_BASELINE.easCli}, npm latest ${easCli}. ` +
        `Deliberately re-test before bumping the pin (eas-cli regressed in 18.5.0/18.13.1/19.0.1 — OPINIONS S9).`,
    );
  } else {
    notes.push(`eas-cli ${easCli} matches the pinned ${BRAIN_BASELINE.easCli} — OK.`);
  }

  return { ok: true, drift, rn, expo, easCli, notes };
}

/** CLI entry. rc 0 when online (drift is reported, not failed); rc≠0 only when npm is unreachable. */
export function runVersionCheck(): number {
  const r = versionCheck();
  console.log("pebble version-check (Rule 0 — npm is ground truth, never memory):");
  if (r.rn) console.log(`  react-native: ${r.rn}`);
  if (r.expo) console.log(`  expo (SDK):   ${r.expo}`);
  if (r.easCli) console.log(`  eas-cli:      ${r.easCli}`);
  for (const n of r.notes) console.log(`  - ${n}`);
  if (!r.ok) {
    console.error("  → npm unreachable; cannot complete Rule 0.");
    return 1;
  }
  console.log(`  drift: ${r.drift ? "YES — brain refresh proposed" : "none — brain matches npm"}`);
  return 0;
}
