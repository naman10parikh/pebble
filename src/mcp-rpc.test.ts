// mcp-rpc.test.ts — the CONTRACT layer at the REAL JSON-RPC 2.0 WIRE (PLAN §9 "Contract (MCP JSON-RPC)" row).
//
// The existing mcp-server.test.ts drives the in-process `callTool`/`TOOLS` shortcut. That proves the tool
// LOGIC, but NOT the protocol an MCP client actually speaks: the JSON-RPC envelope (jsonrpc:"2.0", matching
// `id`), the method dispatch (initialize / tools/list / tools/call), and the structured error CODES (-32601 /
// -32602) the server emits on stdout while STAYING ALIVE. This test drives `handleRequest` — the real wire
// entrypoint — by capturing what it writes to process.stdout, so a regression in the envelope or the error
// codes is caught here (it would NOT be caught by the callTool-level test).
//
// Source: PLAN §9 (Contract row: "tools/list returns the §4 tools with correct schemas; each tool's args
// validate; errors are structured (not crashes)"); src/mcp-server.ts handleRequest/respond/respondError.

import { test } from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "./mcp-server.js";

interface RpcResponse {
  jsonrpc: string;
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
}

/**
 * Drive one JSON-RPC request through the REAL wire handler, capturing the line it writes to stdout.
 * Returns the parsed response, or null for a notification (no write). Mirrors how a stdio MCP client reads.
 */
function rpc(req: unknown): RpcResponse | null {
  const orig = process.stdout.write.bind(process.stdout);
  let captured = "";
  // Narrow override of write for the duration of the call (restored in finally). Cast through unknown so the
  // simplified (chunk)=>boolean signature satisfies the overloaded Writable.write type without `any`.
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    captured += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    return true;
  }) as unknown as typeof process.stdout.write;
  try {
    handleRequest(req as Parameters<typeof handleRequest>[0]);
  } finally {
    process.stdout.write = orig;
  }
  const line = captured.trim();
  if (line === "") return null;
  return JSON.parse(line) as RpcResponse;
}

test("WIRE initialize: returns a 2.0 envelope with serverInfo + the matching id", () => {
  const res = rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
  assert.ok(res, "initialize must produce a response");
  assert.equal(res!.jsonrpc, "2.0", "JSON-RPC version echoed");
  assert.equal(res!.id, 1, "the response id matches the request id");
  const result = res!.result as { serverInfo?: { name?: string }; capabilities?: { tools?: unknown } };
  assert.equal(result.serverInfo?.name, "pebble", "serverInfo names pebble");
  assert.ok(result.capabilities?.tools !== undefined, "advertises the tools capability");
});

test("WIRE tools/list: the envelope carries all 10 §4 tools incl. the two DONE-bar names", () => {
  const res = rpc({ jsonrpc: "2.0", id: "list-1", method: "tools/list" });
  assert.ok(res, "tools/list must produce a response");
  assert.equal(res!.jsonrpc, "2.0");
  assert.equal(res!.id, "list-1", "string ids round-trip too");
  const tools = (res!.result as { tools: Array<{ name: string; inputSchema: { type: string } }> }).tools;
  assert.equal(tools.length, 10, "exactly 10 MCP tools on the wire (PLAN §4)");
  const names = tools.map((t) => t.name);
  assert.ok(names.includes("pebble_decide_shape"), "pebble_decide_shape on the wire");
  assert.ok(names.includes("pebble_eas_build"), "pebble_eas_build on the wire");
  // Every tool exposes a JSON-Schema object (a client validates args against this).
  for (const t of tools) assert.equal(t.inputSchema.type, "object", `${t.name} exposes an object schema`);
});

test("WIRE tools/call: a pure tool round-trips structuredContent over the envelope", () => {
  const res = rpc({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "pebble_decide_shape",
      arguments: { brief: "an agent app needing background location + proactive push + durable local memory" },
    },
  });
  assert.ok(res, "tools/call must produce a response");
  assert.equal(res!.error, undefined, "a valid call has no error member");
  const result = res!.result as { content: Array<{ type: string }>; structuredContent: { shape: string } };
  assert.ok(Array.isArray(result.content) && result.content[0]?.type === "text", "content[] carries a text block");
  assert.equal(result.structuredContent.shape, "native", "3+ agent-hard signals → native (over the wire)");
});

test("WIRE tools/call: missing required arg → a structured -32602 error, server STAYS ALIVE", () => {
  // pebble_eas_build requires `profile`; omitting it must be a JSON-RPC error (NOT a thrown crash).
  const res = rpc({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "pebble_eas_build", arguments: { platform: "ios" } },
  });
  assert.ok(res, "an error is still a response (the server did not crash)");
  assert.equal(res!.result, undefined, "no result on an error");
  assert.equal(res!.error?.code, -32602, "invalid params → -32602 (the JSON-RPC code, not a stack trace)");
  assert.match(res!.error!.message, /required/, "the error message names the missing arg");

  // Prove liveness: a valid request right after the error still gets a clean response.
  const after = rpc({ jsonrpc: "2.0", id: 4, method: "tools/list" });
  assert.equal((after!.result as { tools: unknown[] }).tools.length, 10, "the server kept serving after the error");
});

test("WIRE tools/call: an unknown tool name → -32602 structured error (mapped, not crashed)", () => {
  const res = rpc({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "pebble_teleport", arguments: {} },
  });
  assert.equal(res!.error?.code, -32602, "Unknown tool is routed to -32602 (the regex maps it)");
  assert.match(res!.error!.message, /Unknown tool/);
});

test("WIRE unknown method → -32601 Method not found, server alive", () => {
  const res = rpc({ jsonrpc: "2.0", id: 6, method: "resources/list" });
  assert.equal(res!.error?.code, -32601, "an unsupported method is -32601, not a crash");
  assert.match(res!.error!.message, /Method not found/);
});

test("WIRE notifications/initialized is a no-op (a notification yields no response line)", () => {
  const res = rpc({ jsonrpc: "2.0", id: null, method: "notifications/initialized" });
  assert.equal(res, null, "a notification produces no wire response (correct JSON-RPC behavior)");
});
