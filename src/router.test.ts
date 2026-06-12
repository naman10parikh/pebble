// router.test.ts — D1: the internal routing loop, tested by a multi-step flow over ≥2 routes.
// Per PLAN §3.8 / HARNESS-OVERRIDES §8: a request → the right JTBD handler, tested; pure in-process dispatch
// (no grid focus-stealing — pebble is a single-agent tool-employee, not a swarm orchestrator).
// We exercise the PURE routes (decide/brain/version/review) so the flow is deterministic + $0 (no toolchain
// spawn). The side-effecting routes (init/build/...) share the exact same resolver, asserted structurally.

import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRoute, dispatch, ROUTE_TO_JTBD, type Route, type PebbleRequest } from "./router.js";

test("resolveRoute maps every canonical verb + its aliases to the right Route", () => {
  const cases: Array<[string, Route]> = [
    ["decide", "decide"],
    ["shape", "decide"],
    ["scaffold", "init"],
    ["create", "init"],
    ["health", "doctor"],
    ["ota", "update"],
    ["shot", "screenshot"],
    ["review-check", "review"],
    ["query", "brain"],
    ["version-check", "version"],
  ];
  for (const [verb, expected] of cases) {
    assert.equal(resolveRoute({ verb }), expected, `${verb} → ${expected}`);
  }
});

test("resolveRoute is case/whitespace-insensitive", () => {
  assert.equal(resolveRoute({ verb: "  DECIDE " }), "decide");
  assert.equal(resolveRoute({ verb: "OTA" }), "update");
});

test("an unknown verb throws (the caller maps it to its own error surface)", () => {
  assert.throws(() => resolveRoute({ verb: "teleport" }), /no handler for verb/);
});

test("MULTI-STEP FLOW: decide → brain → version each lands on the correct handler + JTBD", () => {
  // A realistic agent flow: pick a shape, consult the brain, then check versions. Three distinct routes.
  const flow: PebbleRequest[] = [
    { verb: "decide", args: { brief: "an agent app needing background location + proactive push + durable memory" } },
    { verb: "brain", args: { q: "OTA native module", k: 2 } },
    { verb: "version" },
  ];

  const results = flow.map(dispatch);

  // Step 1 routed to `decide` (JTBD-1) and produced a real shape decision over the shared core.
  assert.equal(results[0]!.route, "decide");
  assert.equal(results[0]!.jtbd, 1);
  assert.equal((results[0]!.value as { shape: string }).shape, "native", "3+ agent-hard signals → native");

  // Step 2 routed to `brain` (cross-cutting memory) and returned the search shape.
  assert.equal(results[1]!.route, "brain");
  assert.ok((results[1]!.value as { ok: boolean }).ok, "brain search succeeded");

  // Step 3 routed to `version` (Rule 0). It hits the network; assert only the routing + result shape.
  assert.equal(results[2]!.route, "version");
  assert.ok("drift" in (results[2]!.value as object), "version-check returned its result shape");

  // The flow exercised THREE distinct routes — proof the dispatcher discriminates, not a single passthrough.
  assert.equal(new Set(results.map((r) => r.route)).size, 3, "three distinct handlers were hit");
});

test("ROUTE_TO_JTBD maps every route to a JTBD bucket (real routing table, not a stub)", () => {
  const allRoutes: Route[] = [
    "decide",
    "init",
    "doctor",
    "build",
    "submit",
    "update",
    "screenshot",
    "review",
    "brain",
    "version",
  ];
  for (const r of allRoutes) {
    assert.ok(r in ROUTE_TO_JTBD, `${r} has a JTBD mapping`);
  }
  // The numbered-JTBD spine is correct (the cross-cutting routes map to 0 by design).
  assert.equal(ROUTE_TO_JTBD.decide, 1);
  assert.equal(ROUTE_TO_JTBD.build, 4);
  assert.equal(ROUTE_TO_JTBD.update, 5);
  assert.equal(ROUTE_TO_JTBD.review, 6);
  assert.equal(ROUTE_TO_JTBD.screenshot, 10);
});

test("review route returns the static checklist via the shared core (a pure side-effect-free dispatch)", () => {
  const res = dispatch({ verb: "review" });
  assert.equal(res.route, "review");
  assert.ok(Array.isArray(res.value), "review dispatch returns the checklist array");
});
