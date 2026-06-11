// commands/init.ts — `pebble init [dir] --sdk <n> [--template default@sdk-<n>]`.
// Scaffolds a New-Arch Expo app on a PINNED SDK in an isolated FS (the acceptance test's step 2).
// Source: PLAN §4 command tree / §5 acceptance, brain/TOOL-MATRIX.md §1.

import { scaffoldInit } from "../wrappers/scaffold.js";

export interface InitOptions {
  readonly sdk: number;
  readonly template?: string;
}

/** CLI entry: scaffold into <dir>. rc = the scaffold tool's exit code. */
export function runInit(dir: string, opts: InitOptions): number {
  if (!dir || dir.trim() === "") {
    console.error("pebble init: provide a target dir, e.g. pebble init ./my-app --sdk 56");
    return 1;
  }
  if (!Number.isInteger(opts.sdk) || opts.sdk <= 0) {
    console.error("pebble init: --sdk <n> is required and must be a positive integer (e.g. --sdk 56).");
    return 1;
  }
  console.log(
    `pebble init: scaffolding "${dir}" on Expo SDK ${opts.sdk} ` +
      `(template ${opts.template ?? `default@sdk-${opts.sdk}`}, headless --yes)…`,
  );
  const res = scaffoldInit(dir, opts.sdk, opts.template);
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.code !== 0 && res.stderr) process.stderr.write(res.stderr);
  console.log(
    res.code === 0
      ? `pebble init: scaffold complete (${res.durationMs}ms). Next: cd ${dir} && pebble doctor.`
      : `pebble init: scaffold failed (rc ${res.code}). create-expo-app needs network; re-run online.`,
  );
  return res.code;
}
