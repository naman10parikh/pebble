// router.ts — the internal routing layer (Dispatch · routing half, PLAN §3.8 / HARNESS-OVERRIDES §8).
// A single intent→JTBD→handler map shared by BOTH surfaces (CLI command actions + MCP callTool).
// "Routing" = assign a request to the right JTBD handler; "routine" = the nightly cron (D2, rsi.yml).
// No tmux, no panes, no swarm-orchestration focus-stealing here — this is a pure in-process dispatcher;
// pebble is a single-agent tool-employee (the grid focus-steal anti-pattern is intentionally absent).
// Source: PLAN §3.8, §4 (CLI ∥ MCP over one core), brain/EXPERTISE-MAP.md JTBD-1…10.

import { decideShape, type ShapeDecision } from "./commands/decide.js";
import { brainQuery } from "./commands/brain.js";
import { versionCheck, type VersionCheckResult } from "./commands/version-check.js";
import { REVIEW_CHECKLIST, type ReviewCheckItem } from "./commands/review-check.js";
import { scaffoldInit } from "./wrappers/scaffold.js";
import { expoDoctor } from "./wrappers/expo.js";
import { easBuild, easSubmit, easUpdate, type Platform } from "./wrappers/eas.js";
import { simctlScreenshot } from "./wrappers/simctl.js";
import { type RunResult } from "./lib/exec.js";

/** The JTBD a request maps to — the canonical handler ids both surfaces route through. */
export type Route =
  | "decide" // JTBD-1 shape call
  | "init" // JTBD-2 scaffold
  | "doctor" // JTBD-2 health gate
  | "build" // JTBD-4 eas build
  | "submit" // JTBD-4 eas submit
  | "update" // JTBD-5 OTA
  | "screenshot" // JTBD-10 verify-as-user
  | "review" // JTBD-6 store pre-flight
  | "brain" // memory query
  | "version"; // Rule 0

/** A normalized request: a verb (intent) + its arguments. Surface-agnostic. */
export interface PebbleRequest {
  readonly verb: string;
  readonly args?: Record<string, unknown>;
}

/** Which JTBD bucket a route belongs to (for observability / the cockpit, and to prove routing is real). */
export const ROUTE_TO_JTBD: Readonly<Record<Route, number>> = {
  decide: 1,
  init: 2,
  doctor: 2,
  build: 4,
  submit: 4,
  update: 5,
  screenshot: 10,
  review: 6,
  brain: 0, // cross-cutting memory layer (not a numbered JTBD)
  version: 0, // Rule 0 — cross-cutting
};

// Intent aliases → the canonical Route. The router accepts the natural verbs an agent or the CLI emits.
const VERB_ALIASES: Readonly<Record<string, Route>> = {
  decide: "decide",
  shape: "decide",
  "decide-shape": "decide",
  init: "init",
  scaffold: "init",
  create: "init",
  doctor: "doctor",
  health: "doctor",
  build: "build",
  submit: "submit",
  update: "update",
  ota: "update",
  screenshot: "screenshot",
  shot: "screenshot",
  review: "review",
  "review-check": "review",
  brain: "brain",
  query: "brain",
  version: "version",
  "version-check": "version",
};

/**
 * Resolve a request's verb to its canonical Route. Throws on an unknown verb (the caller — CLI or MCP —
 * maps that to its own error surface). Pure: no I/O, so the multi-step routing flow unit-tests deterministically.
 */
export function resolveRoute(req: PebbleRequest): Route {
  const key = (req.verb ?? "").trim().toLowerCase();
  const route = VERB_ALIASES[key];
  if (!route) {
    throw new Error(
      `pebble router: no handler for verb "${req.verb}". ` +
        `Known: ${[...new Set(Object.values(VERB_ALIASES))].join(", ")}.`,
    );
  }
  return route;
}

/** The result a dispatched route produces (a union over the handlers' return shapes). */
export type RouteResult =
  | { route: "decide"; jtbd: number; value: ShapeDecision }
  | { route: "brain"; jtbd: number; value: { ok: boolean; output: string } }
  | { route: "version"; jtbd: number; value: VersionCheckResult }
  | { route: "review"; jtbd: number; value: readonly ReviewCheckItem[] }
  | { route: Route; jtbd: number; value: RunResult }
  | { route: "screenshot"; jtbd: number; value: { ok: boolean; path: string } };

/**
 * Dispatch a request: resolve its route, then invoke the matching JTBD handler with the SAME core
 * the CLI and MCP call. This is the one place "a request → the right handler" lives.
 * Side-effecting handlers (init/build/...) shell the toolchain; pure ones (decide/brain/...) don't.
 */
export function dispatch(req: PebbleRequest): RouteResult {
  const route = resolveRoute(req);
  const jtbd = ROUTE_TO_JTBD[route];
  const a = req.args ?? {};

  switch (route) {
    case "decide":
      return { route, jtbd, value: decideShape(String(a.brief ?? "")) };
    case "brain":
      return { route, jtbd, value: brainQuery(String(a.q ?? a.query ?? ""), Number(a.k ?? 5)) };
    case "version":
      return { route, jtbd, value: versionCheck() };
    case "review":
      return { route, jtbd, value: REVIEW_CHECKLIST };
    case "init":
      return {
        route,
        jtbd,
        value: scaffoldInit(String(a.dir ?? "."), Number(a.sdk), a.template ? String(a.template) : undefined),
      };
    case "doctor":
      return { route, jtbd, value: expoDoctor(a.dir ? String(a.dir) : undefined) };
    case "build":
      return {
        route,
        jtbd,
        value: easBuild(String(a.platform) as Platform, String(a.profile), a.dir ? String(a.dir) : undefined),
      };
    case "submit":
      return {
        route,
        jtbd,
        value: easSubmit(String(a.platform) as "ios" | "android", a.dir ? String(a.dir) : undefined),
      };
    case "update":
      return {
        route,
        jtbd,
        value: easUpdate(String(a.channel), String(a.environment), String(a.message ?? ""), a.dir ? String(a.dir) : undefined),
      };
    case "screenshot": {
      const r = simctlScreenshot((a.platform as "ios" | "android") ?? "ios", String(a.path ?? "screenshot.png"));
      return { route, jtbd, value: { ok: r.ok, path: r.path } };
    }
    default: {
      // Exhaustiveness guard — every Route is handled above.
      const _never: never = route;
      throw new Error(`unrouted: ${String(_never)}`);
    }
  }
}
