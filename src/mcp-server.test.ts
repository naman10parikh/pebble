// mcp-server.test.ts — C1 contract tests (MCP JSON-RPC surface).
// Per PLAN §9 Testing contract / Contract (MCP JSON-RPC) row: tools/list returns the §4 tools,
// each tool's args validate, errors are STRUCTURED (not crashes). Drives the exported dispatch
// (callTool / TOOLS) directly — no process spawn needed (the cli.ts entrypoint-guard pattern).

import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS, callTool } from "./mcp-server.js";

test("tools/list exposes all 10 §4 tools including the two named in the DONE bar", () => {
  // Widen to string[] so .includes() accepts arbitrary expected names (TOOLS is `as const`).
  const names: string[] = TOOLS.map((t) => t.name);
  assert.equal(names.length, 10, "exactly 10 MCP tools (PLAN §4)");
  // The two the override/MASTER-TODOS verify explicitly require.
  assert.ok(names.includes("pebble_decide_shape"), "pebble_decide_shape present");
  assert.ok(names.includes("pebble_eas_build"), "pebble_eas_build present");
  // The full §4 set.
  for (const expected of [
    "pebble_init",
    "pebble_doctor",
    "pebble_eas_submit",
    "pebble_eas_update",
    "pebble_screenshot",
    "pebble_review_check",
    "pebble_brain_query",
    "pebble_version_check",
  ]) {
    assert.ok(names.includes(expected), `${expected} present`);
  }
});

test("every tool declares an object inputSchema with a required array", () => {
  for (const t of TOOLS) {
    assert.equal(t.inputSchema.type, "object", `${t.name} schema is an object`);
    assert.ok(Array.isArray(t.inputSchema.required), `${t.name} has a required[]`);
    assert.ok(t.description.length > 20, `${t.name} has a real description`);
  }
});

test("pebble_decide_shape is pure + deterministic over the same core as the CLI", () => {
  const res = callTool("pebble_decide_shape", {
    brief: "an agent app needing background location + proactive push + durable local memory",
  }) as { structuredContent: { shape: string; signals: string[] } };
  assert.equal(res.structuredContent.shape, "native", "3+ agent-hard signals → native");
  assert.ok(res.structuredContent.signals.length >= 3, "captured ≥3 native signals");
});

test("pebble_brain_query returns the { ok, hits[] } shape", () => {
  const res = callTool("pebble_brain_query", { q: "OTA native module", k: 3 }) as {
    structuredContent: { ok: boolean; hits: Array<{ file: string; score: number; text: string }> };
  };
  assert.equal(res.structuredContent.ok, true, "search succeeded");
  assert.ok(Array.isArray(res.structuredContent.hits), "hits is an array");
});

test("pebble_review_check returns the static store-rejection checklist (knowledge-graded, no creds)", () => {
  const res = callTool("pebble_review_check", {}) as {
    structuredContent: { risks: unknown[]; blocking: boolean };
  };
  assert.ok(Array.isArray(res.structuredContent.risks), "risks array present");
  assert.equal(res.structuredContent.blocking, false, "advisory, not blocking");
});

test("missing required args throw a structured (catchable) error — not a crash", () => {
  // The dispatch throws; the JSON-RPC layer maps this to a -32602 error and keeps the server alive.
  assert.throws(
    () => callTool("pebble_eas_build", { platform: "ios" }),
    /required/,
    "missing 'profile' is rejected with a clear message",
  );
  assert.throws(
    () => callTool("pebble_eas_update", { channel: "prod", environment: "production" }),
    /required/,
    "missing 'message' is rejected (and --environment is the enforced one)",
  );
});

// Wave T council MAJOR: a PRESENT-but-EMPTY `environment` over MCP must NOT slip past the SCENARIO-5
// gate (it previously returned a success-shaped {ok:false} after shelling `eas update --environment ""`).
// The shared-core guard now throws here too — same protection as the CLI surface.
test("pebble_eas_update with an empty environment is REJECTED (SCENARIO-5 hole, both surfaces)", () => {
  assert.throws(
    () => callTool("pebble_eas_update", { channel: "x", environment: "", message: "y" }),
    /non-empty --environment/,
    "empty environment must throw (not return a success-shaped result)",
  );
  assert.throws(
    () => callTool("pebble_eas_update", { channel: "x", environment: "   ", message: "y" }),
    /non-empty --environment/,
    "whitespace-only environment must throw too",
  );
});

test("an unknown tool name throws (mapped to a structured JSON-RPC error upstream)", () => {
  assert.throws(() => callTool("pebble_nonexistent", {}), /Unknown tool/);
});
