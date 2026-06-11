// commands/screenshot.ts — `pebble screenshot [--platform ios|android] [out.png]`.
// The verify-as-USER primitive (OPINIONS S17): boot the sim, capture, return the path — then READ it.
// macOS-only for iOS (Xcode); on a non-mac box it returns an honest failure, never hangs (Risk 1).
// Source: PLAN §4 command tree / §5 acceptance step 5, brain/TOOL-MATRIX.md §2, brain/OPINIONS.md S17.

import { simctlScreenshot } from "../wrappers/simctl.js";

export interface ScreenshotOptions {
  readonly platform: "ios" | "android";
  readonly out: string;
}

/** CLI entry: capture a sim/device screenshot to <out>. rc 0 on capture, rc 1 otherwise (no hang). */
export function runScreenshot(opts: ScreenshotOptions): number {
  const out = opts.out && opts.out.trim() !== "" ? opts.out : "screenshot.png";
  console.log(`pebble screenshot: capturing ${opts.platform} → ${out} (boot + capture; READ the file after)…`);
  const res = simctlScreenshot(opts.platform, out);
  if (res.ok) {
    console.log(`pebble screenshot: ${res.message} → ${res.path} (${res.durationMs}ms). Now READ it — "it builds" ≠ it renders.`);
    return 0;
  }
  console.error(`pebble screenshot: ${res.message}`);
  return 1;
}
