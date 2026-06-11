// exec.ts — spawn a wrapped toolchain command, time it, log it. The CLI's hands.
// Uses flags.ts to guarantee --non-interactive (anti-TTY-hang) and logger.ts for Observability.

import { spawnSync } from "node:child_process";
import { logRun, type RunStatus } from "./logger.js";
import { type WrappedCommand } from "./flags.js";

export interface RunResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
}

export interface RunOptions {
  /** Working directory for the child process. */
  readonly cwd?: string;
  /** Label written to logs/runs.jsonl (defaults to "<bin> <args[0]>"). */
  readonly logCmd?: string;
  /** When false, skip the runs.jsonl append (e.g. dry/help paths). Default true. */
  readonly log?: boolean;
  /** Run via `npx <bin>` instead of a bare `<bin>` (eas/expo ship through npx). Default true. */
  readonly viaNpx?: boolean;
  /** Extra env (merged over process.env). Secrets are passed to the child but never logged. */
  readonly env?: NodeJS.ProcessEnv;
}

/**
 * Execute a WrappedCommand synchronously. Times the call, appends a runs.jsonl line,
 * and returns the result. Never throws on a non-zero exit — returns the code so the
 * caller decides. The TTY-hang foot-gun cannot reappear: flags.ts already injected
 * --non-interactive before this runs, and spawnSync never opens an interactive TTY.
 */
export function runWrapped(cmd: WrappedCommand, opts: RunOptions = {}): RunResult {
  const viaNpx = opts.viaNpx ?? true;
  const bin = viaNpx ? "npx" : cmd.bin;
  const args = viaNpx ? [cmd.bin, ...cmd.args] : [...cmd.args];
  const logCmd = opts.logCmd ?? `${cmd.bin} ${cmd.args[0] ?? ""}`.trim();

  const start = Date.now();
  const res = spawnSync(bin, args, {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const durationMs = Date.now() - start;

  const code = res.status ?? (res.error ? 127 : 0);
  const status: RunStatus = code === 0 ? "ok" : "error";

  if (opts.log !== false) {
    logRun({ cmd: logCmd, durationMs, status });
  }

  return {
    code,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? (res.error ? res.error.message : ""),
    durationMs,
  };
}
