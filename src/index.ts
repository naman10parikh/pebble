// index.ts — the package's public surface (`main` in package.json). Named exports only.
// The CLI (cli.ts), the MCP server (C1), and the cockpit (G) all consume THIS — one core, many surfaces.
// Source: PLAN §4 (CLI ∥ MCP over the same core), MASTER-TODOS B2.

// Pure decision/knowledge cores (no I/O — safe for any surface to import).
export { decideShape, type Shape, type ShapeDecision } from "./commands/decide.js";
export { REVIEW_CHECKLIST, type ReviewCheckItem } from "./commands/review-check.js";
export { versionCheck, BRAIN_BASELINE, type VersionCheckResult } from "./commands/version-check.js";
export { brainQuery, type BrainHit } from "./commands/brain.js";
export { readRuns } from "./commands/runs.js";

// Headless toolchain wrappers (the employee's hands) + the flag invariants they rely on.
export {
  injectNonInteractive,
  assertUpdateEnvironment,
  wrapEas,
  wrapExpo,
  type WrappedCommand,
} from "./lib/flags.js";
export { runWrapped, type RunResult, type RunOptions } from "./lib/exec.js";
export { logRun, RUNS_LOG_PATH, type RunRecord, type RunStatus } from "./lib/logger.js";
export { easBuild, easSubmit, easUpdate, easConfig, type Platform } from "./wrappers/eas.js";
export { expoInstall, expoDoctor, expoExport, expoPrebuildClean } from "./wrappers/expo.js";
export { simctlScreenshot, type ScreenshotResult } from "./wrappers/simctl.js";
export { scaffoldInit, buildScaffoldArgs } from "./wrappers/scaffold.js";

// The commander program builder (introspectable surface; CLI entry guards its own argv parse).
export { buildProgram } from "./cli.js";
