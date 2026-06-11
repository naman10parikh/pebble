// wrappers/scaffold.ts — the `pebble init` scaffold wrapper: headless `create-expo-app`.
// SDK is PINNED via the template (default@sdk-<n>) — NEVER rely on create-expo-app@latest's
// transition default (during the SDK-56 transition `@latest` can silently scaffold legacy SDK 54 — V3).
// Source: brain/TOOL-MATRIX.md §1 (scaffold), brain/OPINIONS.md S11 (no template needed on SDK 56), PLAN §5.

import { runWrapped, type RunResult } from "../lib/exec.js";

/** Build the headless create-expo-app argv for a pinned-SDK scaffold. Pure → unit-testable. */
export function buildScaffoldArgs(dir: string, sdk: number, template?: string): string[] {
  // `--yes` skips ALL prompts (the anti-TTY-hang reflex for create-expo-app, which has no --non-interactive).
  // Default the template to the SDK-pinned `default@sdk-<n>` so the SDK is explicit, never the transition default.
  const tmpl = template ?? `default@sdk-${sdk}`;
  return ["create-expo-app@latest", dir, "--template", tmpl, "--yes"];
}

/**
 * `pebble init <dir> --sdk <n> [--template …]` — scaffold a New-Arch Expo app on a PINNED SDK.
 * Runs via npx, headless (`--yes`), into an isolated dir. The full acceptance wiring (eas.json
 * generation + sim boot) is F4's; this is the deterministic scaffold step it builds on.
 */
export function scaffoldInit(dir: string, sdk: number, template?: string, cwd?: string): RunResult {
  const args = buildScaffoldArgs(dir, sdk, template);
  // bin is the first arg (create-expo-app@latest); pass the rest as its argv. viaNpx prepends `npx`.
  return runWrapped(
    { bin: args[0]!, args: args.slice(1) },
    { cwd, logCmd: `init ${dir} --sdk ${sdk}`, viaNpx: true },
  );
}
