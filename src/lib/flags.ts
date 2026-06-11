// flags.ts — the headless flag-injection invariants (the #1 anti-TTY-hang core).
// PURE functions: no process spawning, so they unit-test in isolation.
// Source: brain/KNOWN-PITFALLS.md §9 (hanging on a TTY prompt; omitting --environment),
//         brain/TOOL-MATRIX.md §2-§3 (the non-interactive cookbook).

/** A normalized command + argv pair ready to spawn. */
export interface WrappedCommand {
  readonly bin: string;
  readonly args: readonly string[];
}

const NON_INTERACTIVE = "--non-interactive";
const ENVIRONMENT = "--environment";

/**
 * Inject `--non-interactive` into any eas/expo argv if absent.
 * This is the invariant an agent CANNOT skip — a wrapped eas/expo call without it
 * blocks forever on a TTY prompt (KNOWN-PITFALLS §9). Idempotent.
 */
export function injectNonInteractive(args: readonly string[]): string[] {
  if (args.includes(NON_INTERACTIVE)) return [...args];
  return [...args, NON_INTERACTIVE];
}

/**
 * `eas update` FAILS on SDK 55+ without `--environment` (KNOWN-PITFALLS §9, SCENARIO 5).
 * pebble's policy (PLAN §14 Q8) is fail-safe: always require it. Throws if the caller
 * tried to run `update` without naming an environment — caught BEFORE spawning.
 */
export function assertUpdateEnvironment(args: readonly string[]): void {
  const isUpdate = args[0] === "update";
  if (!isUpdate) return;
  const hasEnv =
    args.includes(ENVIRONMENT) ||
    args.some((a) => a.startsWith(`${ENVIRONMENT}=`));
  if (!hasEnv) {
    throw new Error(
      "pebble: `eas update` requires --environment (mandatory on SDK 55+). " +
        "Omitting it is the #1 CI break (SCENARIO 5). Pass --environment <env>.",
    );
  }
}

/**
 * Build a headless-safe eas-cli argv. Injects --non-interactive always; enforces
 * --environment on `update`; injects --no-wait --json on `build` (fire+poll, never block).
 * Returns the WrappedCommand the exec layer spawns.
 */
export function wrapEas(args: readonly string[]): WrappedCommand {
  assertUpdateEnvironment(args);
  let out = injectNonInteractive(args);
  if (args[0] === "build") {
    if (!out.includes("--no-wait")) out = [...out, "--no-wait"];
    if (!out.includes("--json")) out = [...out, "--json"];
  }
  return { bin: "eas", args: out };
}

/** Build a headless-safe `npx expo …` argv. Injects --non-interactive always. */
export function wrapExpo(args: readonly string[]): WrappedCommand {
  return { bin: "expo", args: injectNonInteractive(args) };
}
