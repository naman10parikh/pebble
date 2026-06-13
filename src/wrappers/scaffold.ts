// wrappers/scaffold.ts — the `pebble init` scaffold wrapper: headless `create-expo-app`.
// SDK is PINNED via the template (default@sdk-<n>) — NEVER rely on create-expo-app@latest's
// transition default (during the SDK-56 transition `@latest` can silently scaffold legacy SDK 54 — V3).
// Source: brain/TOOL-MATRIX.md §1 (scaffold), brain/OPINIONS.md S11 (no template needed on SDK 56), PLAN §5.

import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runWrapped, type RunResult } from "../lib/exec.js";

/** Build the headless create-expo-app argv for a pinned-SDK scaffold. Pure → unit-testable. */
export function buildScaffoldArgs(dir: string, sdk: number, template?: string): string[] {
  // `--yes` skips ALL prompts (the anti-TTY-hang reflex for create-expo-app, which has no --non-interactive).
  // Default the template to the SDK-pinned `default@sdk-<n>` so the SDK is explicit, never the transition default.
  const tmpl = template ?? `default@sdk-${sdk}`;
  return ["create-expo-app@latest", dir, "--template", tmpl, "--yes"];
}

/**
 * The canonical 4-profile EAS build config pebble deposits into a fresh scaffold.
 * `create-expo-app`'s default template ships NO eas.json, so `eas config` / `pebble build`
 * fail with "eas.json could not be found" on a fresh scaffold — half of the acceptance bar
 * ("an Expo app booting + a valid EAS build config", PLAN §5) is missing without this.
 * Pure (returns the object) so it stays the single source of truth and is unit-assertable;
 * mirrors `eval/fixtures/eas.json` (the shape the L1 grader checks). `cli.version` pins eas-cli
 * (OPINIONS S9); `sim` targets the iOS simulator (the acceptance screenshot profile).
 */
export function easJsonScaffold(): Record<string, unknown> {
  return {
    cli: { version: ">= 20.1.0", appVersionSource: "remote" },
    build: {
      development: { developmentClient: true, distribution: "internal", channel: "development" },
      preview: { distribution: "internal", channel: "preview" },
      sim: { extends: "preview", ios: { simulator: true }, channel: "preview" },
      production: { autoIncrement: true, channel: "production" },
    },
    submit: { production: {} },
  };
}

/**
 * Write the canonical `eas.json` into a scaffolded dir (idempotent: never clobbers an
 * existing eas.json, e.g. one a non-default template already shipped). Returns true if it
 * wrote the file, false if one was already present. Zero deps (node:fs).
 */
export function depositEasJson(dir: string): boolean {
  const target = join(dir, "eas.json");
  if (existsSync(target)) return false;
  writeFileSync(target, `${JSON.stringify(easJsonScaffold(), null, 2)}\n`, "utf8");
  return true;
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
