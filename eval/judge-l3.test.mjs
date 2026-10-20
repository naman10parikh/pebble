// The L3 judge sends nothing unless it is told which model to use (PEBBLE_L3_MODEL): the Messages API needs a model
// name, and pebble never picks one. fetch is replaced first, so this test never reaches the network.
import { test } from "node:test";
import assert from "node:assert/strict";

test("L3 skips and sends nothing with a key but no PEBBLE_L3_MODEL", async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => {
    calls.push(args);
    throw new Error("offline");
  };
  process.env.ANTHROPIC_API_KEY = "test-key";
  delete process.env.PEBBLE_L3_MODEL;
  try {
    const { runL3 } = await import("./judge-l3.mjs");
    assert.equal(await runL3(), true);
    assert.equal(calls.length, 0);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.ANTHROPIC_API_KEY;
  }
});
