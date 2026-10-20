#!/usr/bin/env node
// cli.ts — the `pebble` binary entrypoint (the mobile employee's hands).
// Commander-based wiring of the §4 command tree. Each command delegates to a body in commands/
// (B4: brain/decide/version-check) or a wrapper-backed body (B3: init/doctor/build/submit/update/
// screenshot/review-check/runs). This file is the WIRING + arg parsing + help only.
// Source: PLAN §4 CLI command tree, HARNESS-OVERRIDES §4, MASTER-TODOS B2.

import { readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Command } from "commander";

import { runInit } from "./commands/init.js";
import { runDoctor } from "./commands/doctor.js";
import { runDecide } from "./commands/decide.js";
import { runBuild, runSubmit, runUpdate } from "./commands/build.js";
import { runScreenshot } from "./commands/screenshot.js";
import { runReviewCheck } from "./commands/review-check.js";
import { runBrain } from "./commands/brain.js";
import { runRuns } from "./commands/runs.js";
import { runVersionCheck } from "./commands/version-check.js";
import type { Platform } from "./wrappers/eas.js";

// Read the version from package.json so `--version` is the real semver (never a hardcoded string).
function readVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    // dist/cli.js → repo root is one level up from dist/.
    const pkgPath = join(here, "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** Validate an --sdk value, exit non-zero on a bad one (keeps the parse honest). */
function parseSdk(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    console.error(`pebble: --sdk must be a positive integer (got "${raw}").`);
    process.exit(1);
  }
  return n;
}

/** Build the commander program. Exported so tests/MCP can introspect the surface without spawning. */
export function buildProgram(): Command {
  const program = new Command();
  program
    .name("pebble")
    .description("Energy mobile employee — React Native + Expo + EAS, operated headlessly as an agent")
    .version(readVersion(), "-v, --version", "print pebble's version");

  // init — scaffold a New-Arch Expo app on a PINNED SDK (the acceptance test's step 2).
  program
    .command("init [dir]")
    .description("Scaffold a New-Arch Expo app (pinned SDK), in an isolated FS")
    .option("--sdk <n>", "Expo SDK major to pin (e.g. 56)", parseSdk)
    .option("--template <name>", "scaffold template (defaults to default@sdk-<n>)")
    .action((dir: string | undefined, opts: { sdk?: number; template?: string }) => {
      if (opts.sdk === undefined) {
        console.error("pebble init: --sdk <n> is required (e.g. pebble init ./app --sdk 56).");
        process.exit(1);
      }
      process.exit(runInit(dir ?? ".", { sdk: opts.sdk, template: opts.template }));
    });

  // doctor — the cheapest health gate (expo-doctor + Rule 0 + the 60s triage).
  program
    .command("doctor")
    .description("Run expo-doctor + Rule-0 version check + the 60s triage; the cheapest gate")
    .action(() => process.exit(runDoctor()));

  // decide — the shape call (RN/PWA/bare/Flutter) via the "3+ → native" rule.
  program
    .command("decide <brief...>")
    .description('The shape call via the "3+ → native" rule; prints rationale')
    .action((brief: string[]) => process.exit(runDecide(brief.join(" "))));

  // build — headless eas build (--non-interactive --no-wait --json injected).
  program
    .command("build")
    .description("Headless eas build (--non-interactive --no-wait --json injected); returns a build id")
    .requiredOption("--platform <p>", "ios | android | all")
    .requiredOption("--profile <p>", "eas.json build profile (e.g. preview, sim)")
    .action((opts: { platform: string; profile: string }) =>
      process.exit(runBuild(opts.platform as Platform, opts.profile)),
    );

  // submit — headless eas submit (store creds; warns on 1st Play upload).
  program
    .command("submit")
    .description("Headless eas submit of the latest build (ASC API key / Play service-account)")
    .requiredOption("--platform <p>", "ios | android")
    .option("--latest", "submit the latest build (default)", true)
    .action((opts: { platform: string }) => process.exit(runSubmit(opts.platform as "ios" | "android")));

  // update — OTA via eas update (--environment ENFORCED; blocks on a native change).
  program
    .command("update")
    .description("OTA via eas update (--environment ENFORCED — the #1 CI break if omitted)")
    .requiredOption("--channel <c>", "release channel")
    .option("--environment <e>", "MANDATORY on SDK 55+ (production | preview | development)")
    .option("-m, --message <msg>", "update message", "")
    .action((opts: { channel: string; environment?: string; message: string }) =>
      process.exit(runUpdate(opts.channel, opts.environment ?? "", opts.message)),
    );

  // screenshot — the verify-as-USER primitive (simctl/adb).
  program
    .command("screenshot [out]")
    .description("Verify AS A USER: simctl/adb boot + screenshot → path (READ it)")
    .option("--platform <p>", "ios | android", "ios")
    .action((out: string | undefined, opts: { platform: string }) =>
      process.exit(runScreenshot({ platform: opts.platform as "ios" | "android", out: out ?? "screenshot.png" })),
    );

  // review-check — store-rejection pre-flight (2.5.2 / 4.3 / age rating / UGC).
  program
    .command("review-check")
    .description("Store-rejection pre-flight: 2.5.2 self-mod · consent · age rating · UGC duty")
    .action(() => process.exit(runReviewCheck()));

  // brain — BM25 over brain/*.md (taste/pitfalls/scenarios before you guess).
  program
    .command("brain <query...>")
    .description("BM25 over brain/*.md — taste/pitfalls/scenarios before you guess")
    .option("--limit <n>", "max hits", (v) => Number(v), 5)
    .action((query: string[], opts: { limit: number }) =>
      process.exit(runBrain(query.join(" "), opts.limit)),
    );

  // runs — Observability: tail/aggregate logs/runs.jsonl.
  program
    .command("runs")
    .description("Observability: tail logs/runs.jsonl (model · duration · build id · status)")
    .option("--last <n>", "show the last n runs", (v) => Number(v), 20)
    .action((opts: { last: number }) => process.exit(runRuns(opts.last)));

  // version-check — Rule 0 only: npm view RN/expo/eas-cli → diff brain/TOOL-MATRIX.md.
  program
    .command("version-check")
    .description("Rule 0 only: npm view RN/expo/eas-cli → diff brain/TOOL-MATRIX.md")
    .action(() => process.exit(runVersionCheck()));

  return program;
}

// Only parse argv when run as the actual entrypoint (not when imported by a test/MCP).
// Compare this module's URL to argv[1]'s real file URL. npm runs a bin through a symlink
// (node_modules/.bin/pebble), so resolve it first; without that, an installed `pebble` printed nothing.
const isEntrypoint = ((): boolean => {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false; // Intentionally silent: an unresolvable argv[1] means we were not run directly.
  }
})();
if (isEntrypoint) {
  buildProgram().parseAsync(process.argv).catch((err: unknown) => {
    console.error("pebble:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
