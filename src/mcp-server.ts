#!/usr/bin/env node
/**
 * pebble MCP Server — exposes the mobile employee's hands as structured JSON-RPC tools so
 * energy / Claude Code / sibling employees can call them over stdio WITHOUT scraping the CLI.
 *
 * ONE CORE, TWO SURFACES (EMPLOYEE-FIRST): every tool here wraps the EXACT function the CLI
 * calls — imported from ./index.js (the package's public surface). No logic is re-implemented.
 *
 * Transport: stdio line-delimited JSON-RPC 2.0 — the standard MCP pattern for local servers.
 * We avoid an MCP-SDK dependency (the agentbench fleet pattern) — the protocol over stdin/stdout
 * is a thin dispatch, and keeping zero new deps keeps `npm ci` cold-clean for the acceptance test.
 *
 * Tools (PLAN §4 MCP tool list):
 *   pebble_decide_shape · pebble_init · pebble_doctor · pebble_eas_build · pebble_eas_submit
 *   pebble_eas_update · pebble_screenshot · pebble_review_check · pebble_brain_query · pebble_version_check
 *
 * Registered in .mcp.json (C2) under `mcpServers.pebble`. Run standalone: node dist/mcp-server.js
 * Source: PLAN §4, §3.7; HARNESS-OVERRIDES §7; MASTER-TODOS C1.
 */

import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

// The SAME core the CLI consumes — pure decision cores + headless toolchain wrappers.
import {
  decideShape,
  REVIEW_CHECKLIST,
  versionCheck,
  brainQuery,
  easBuild,
  easSubmit,
  easUpdate,
  expoDoctor,
  simctlScreenshot,
  scaffoldInit,
  type Platform,
} from "./index.js";

// ---------------------------------------------------------------------------
// Minimal JSON-RPC 2.0 types (no SDK — agentbench pattern)
// ---------------------------------------------------------------------------

interface McpRequest {
  jsonrpc: "2.0";
  id: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

interface McpResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function respond(id: number | string | null, result: unknown): void {
  const msg: McpResponse = { jsonrpc: "2.0", id, result };
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function respondError(id: number | string | null, code: number, message: string): void {
  const msg: McpResponse = { jsonrpc: "2.0", id, error: { code, message } };
  process.stdout.write(JSON.stringify(msg) + "\n");
}

/** Wrap a structured result as MCP tool-call content (text summary + structuredContent). */
function toolResult(summary: string, structured: unknown): unknown {
  return { content: [{ type: "text", text: summary }], structuredContent: structured };
}

// ---------------------------------------------------------------------------
// Tool catalog — names + JSON-Schema arg sketches (PLAN §4 MCP tool list)
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "pebble_decide_shape",
    description:
      "The shape call (native/PWA/bare/Flutter) for a product brief via the '3+ → native' rule + the agent-app corollary + the iOS PWA walls. Pure, no side effects, no creds. Encodes OPINIONS S15 / SCENARIO 14.",
    inputSchema: {
      type: "object",
      properties: {
        brief: { type: "string", description: "Free-text product brief, e.g. 'an app that needs BLE + background location + push'." },
        needs: { type: "array", items: { type: "string" }, description: "Optional explicit capability needs, appended to the brief." },
      },
      required: ["brief"],
    },
  },
  {
    name: "pebble_brain_query",
    description:
      "BM25 search over pebble's expertise brain (brain/*.md) — taste/pitfalls/scenarios. Returns ranked file+line hits. Query this BEFORE guessing a mobile fact.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Search query, e.g. 'OTA native module' or 'fingerprint runtimeVersion'." },
        k: { type: "integer", description: "Max hits to return (default 5).", minimum: 1 },
      },
      required: ["q"],
    },
  },
  {
    name: "pebble_version_check",
    description:
      "Rule 0 automated: npm view react-native/expo/eas-cli → diff the brain baseline → report drift. NEVER quote a mobile version from memory. Needs network; degrades honestly offline.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "pebble_review_check",
    description:
      "Store-rejection pre-flight checklist: Guideline 2.5.2 (no self-modifying code) / 4.3 (thin-wrapper) / 5.1.x consent / age rating / 1.2 UGC duty. Knowledge-graded (a checklist to reason over), no creds.",
    inputSchema: { type: "object", properties: { dir: { type: "string", description: "Optional app dir (advisory; the checklist is static)." } }, required: [] },
  },
  {
    name: "pebble_init",
    description:
      "Scaffold a New-Architecture Expo app on a PINNED SDK (never @latest's transition default) via headless create-expo-app. Runs the real toolchain; network at runtime. Returns the scaffold result.",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "Target directory for the scaffold." },
        sdk: { type: "integer", description: "Expo SDK major to pin (e.g. 56).", minimum: 1 },
        template: { type: "string", description: "Optional template; defaults to default@sdk-<n>." },
      },
      required: ["dir", "sdk"],
    },
  },
  {
    name: "pebble_doctor",
    description:
      "Run expo-doctor (the cheapest health gate) headlessly in a project dir. Validates deps against React Native Directory before a paid cloud build. Network at runtime.",
    inputSchema: { type: "object", properties: { dir: { type: "string", description: "Project directory (defaults to cwd)." } }, required: [] },
  },
  {
    name: "pebble_eas_build",
    description:
      "Headless eas build (--non-interactive --no-wait --json injected). Fires a cloud build and returns immediately. Requires EXPO_TOKEN in env (never passed as an arg).",
    inputSchema: {
      type: "object",
      properties: {
        platform: { type: "string", enum: ["ios", "android", "all"], description: "Build target." },
        profile: { type: "string", description: "eas.json build profile (e.g. preview, sim, production)." },
        dir: { type: "string", description: "Project directory (defaults to cwd)." },
      },
      required: ["platform", "profile"],
    },
  },
  {
    name: "pebble_eas_submit",
    description:
      "Headless eas submit of the latest build. Knowledge-graded in MVP: needs paid Apple/Play creds (CHAIRMAN-CHECKLIST). Warns on a brand-new Play listing (one manual first upload required).",
    inputSchema: {
      type: "object",
      properties: {
        platform: { type: "string", enum: ["ios", "android"], description: "Submit target." },
        dir: { type: "string", description: "Project directory (defaults to cwd)." },
      },
      required: ["platform"],
    },
  },
  {
    name: "pebble_eas_update",
    description:
      "OTA via eas update — --environment is ENFORCED (mandatory SDK 55+; omitting it is the #1 CI break). Rejects native-touching changes (those need a binary release, not an OTA). Requires EXPO_TOKEN in env.",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Release channel." },
        environment: { type: "string", description: "MANDATORY (production | preview | development)." },
        message: { type: "string", description: "Update message." },
        dir: { type: "string", description: "Project directory (defaults to cwd)." },
      },
      required: ["channel", "environment", "message"],
    },
  },
  {
    name: "pebble_screenshot",
    description:
      "The verify-as-USER primitive: boot a simulator + screenshot (simctl on iOS / adb on Android). macOS-only for iOS (Xcode). 'It builds' means nothing — READ the screenshot.",
    inputSchema: {
      type: "object",
      properties: {
        platform: { type: "string", enum: ["ios", "android"], description: "Simulator platform (default ios)." },
        path: { type: "string", description: "Output PNG path (default screenshot.png)." },
      },
      required: [],
    },
  },
] as const;

// ---------------------------------------------------------------------------
// Tool dispatch — each calls the SAME core the CLI calls
// ---------------------------------------------------------------------------

type Args = Record<string, unknown>;

function str(args: Args, key: string): string | undefined {
  const v = args[key];
  return typeof v === "string" ? v : undefined;
}
function int(args: Args, key: string): number | undefined {
  const v = args[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Invoke a tool by name. Throws on bad args/unknown tool — caller maps to a structured JSON-RPC error. */
function callTool(name: string, args: Args): unknown {
  switch (name) {
    case "pebble_decide_shape": {
      const brief = str(args, "brief");
      if (brief === undefined) throw new Error("pebble_decide_shape: 'brief' (string) is required.");
      const needs = Array.isArray(args.needs) ? (args.needs as unknown[]).filter((n) => typeof n === "string").join(" ") : "";
      const d = decideShape(needs ? `${brief} ${needs}` : brief);
      return toolResult(`shape: ${d.shape}\nrationale: ${d.rationale}`, d);
    }
    case "pebble_brain_query": {
      const q = str(args, "q");
      if (q === undefined) throw new Error("pebble_brain_query: 'q' (string) is required.");
      const k = int(args, "k") ?? 5;
      const { ok, output } = brainQuery(q, k);
      return toolResult(output, { ok, hits: parseHits(output) });
    }
    case "pebble_version_check": {
      const r = versionCheck();
      return toolResult(r.notes.join("\n"), { rn: r.rn, expo: r.expo, eas_cli: r.easCli, drift: r.drift, ok: r.ok });
    }
    case "pebble_review_check": {
      return toolResult(
        REVIEW_CHECKLIST.map((i) => `[${i.guideline}] ${i.id}: ${i.check}`).join("\n"),
        { risks: REVIEW_CHECKLIST, blocking: false },
      );
    }
    case "pebble_init": {
      const dir = str(args, "dir");
      const sdk = int(args, "sdk");
      if (dir === undefined || sdk === undefined) throw new Error("pebble_init: 'dir' (string) and 'sdk' (integer) are required.");
      const res = scaffoldInit(dir, sdk, str(args, "template"));
      return toolResult(res.code === 0 ? `scaffolded ${dir} (SDK ${sdk})` : `scaffold failed: ${res.stderr}`, {
        ok: res.code === 0,
        sdk,
        durationMs: res.durationMs,
      });
    }
    case "pebble_doctor": {
      const res = expoDoctor(str(args, "dir"));
      return toolResult(res.code === 0 ? "expo-doctor passed" : `expo-doctor issues:\n${res.stdout || res.stderr}`, {
        passed: res.code === 0,
        durationMs: res.durationMs,
      });
    }
    case "pebble_eas_build": {
      const platform = str(args, "platform");
      const profile = str(args, "profile");
      if (platform === undefined || profile === undefined) throw new Error("pebble_eas_build: 'platform' and 'profile' are required.");
      const res = easBuild(platform as Platform, profile, str(args, "dir"));
      return toolResult(res.code === 0 ? `eas build fired (${platform}/${profile})` : `eas build failed: ${res.stderr}`, {
        status: res.code === 0 ? "ok" : "error",
        durationMs: res.durationMs,
      });
    }
    case "pebble_eas_submit": {
      const platform = str(args, "platform");
      if (platform !== "ios" && platform !== "android") throw new Error("pebble_eas_submit: 'platform' must be 'ios' | 'android'.");
      const res = easSubmit(platform, str(args, "dir"));
      return toolResult(res.code === 0 ? `eas submit fired (${platform})` : `eas submit failed: ${res.stderr}`, {
        status: res.code === 0 ? "ok" : "error",
        warning: "First Play upload must be manual; iOS needs an ASC API key (CHAIRMAN-CHECKLIST).",
        durationMs: res.durationMs,
      });
    }
    case "pebble_eas_update": {
      const channel = str(args, "channel");
      const environment = str(args, "environment");
      const message = str(args, "message");
      if (channel === undefined || environment === undefined || message === undefined) {
        throw new Error("pebble_eas_update: 'channel', 'environment', and 'message' are required (--environment is mandatory SDK 55+).");
      }
      const res = easUpdate(channel, environment, message, str(args, "dir"));
      return toolResult(res.code === 0 ? `eas update published (${channel}/${environment})` : `eas update failed: ${res.stderr}`, {
        ok: res.code === 0,
        branch: channel,
        durationMs: res.durationMs,
      });
    }
    case "pebble_screenshot": {
      const platform = (str(args, "platform") as "ios" | "android" | undefined) ?? "ios";
      const path = str(args, "path") ?? "screenshot.png";
      const res = simctlScreenshot(platform, path);
      return toolResult(res.ok ? `screenshot saved: ${res.path}` : `screenshot failed: ${res.message}`, {
        path: res.path,
        ok: res.ok,
        durationMs: res.durationMs,
      });
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Parse the BM25 script's human-readable output into structured hits (best-effort).
 * memory-search.sh emits `[N] <file> (score: <n>)` headers, each followed by indented
 * context lines between `---` fences. We capture file + score + a flattened snippet.
 */
function parseHits(output: string): Array<{ file: string; score: number; text: string }> {
  const hits: Array<{ file: string; score: number; text: string }> = [];
  const lines = output.split("\n");
  let current: { file: string; score: number; text: string } | null = null;
  for (const raw of lines) {
    const header = raw.match(/^\[\d+\]\s+(\S+\.md)\s+\(score:\s*(\d+)\)/);
    if (header) {
      if (current) hits.push(current);
      current = { file: header[1]!, score: Number(header[2]), text: "" };
      continue;
    }
    // Indented context lines (4+ spaces), excluding the `---` fences, are the snippet.
    if (current && /^\s{4,}/.test(raw) && raw.trim() !== "---") {
      current.text += (current.text ? " " : "") + raw.trim();
    }
  }
  if (current) hits.push(current);
  return hits;
}

// ---------------------------------------------------------------------------
// JSON-RPC method dispatch
// ---------------------------------------------------------------------------

function handleRequest(req: McpRequest): void {
  const { id, method, params } = req;

  if (method === "initialize") {
    respond(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "pebble", version: "0.1.0" },
    });
    return;
  }

  if (method === "notifications/initialized") {
    // Notification (no id) — nothing to return.
    return;
  }

  if (method === "tools/list") {
    respond(id, { tools: TOOLS });
    return;
  }

  if (method === "tools/call") {
    const p = (params ?? {}) as { name?: string; arguments?: Args };
    const name = p.name;
    const args = p.arguments ?? {};
    if (typeof name !== "string") {
      respondError(id, -32602, "tools/call: 'name' is required.");
      return;
    }
    try {
      respond(id, callTool(name, args));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // -32602 for bad/unknown tool args, -32603 otherwise — structured, server stays alive.
      const code = /required|must be|Unknown tool/.test(message) ? -32602 : -32603;
      respondError(id, code, message);
    }
    return;
  }

  // Unknown method — error but keep the server alive.
  respondError(id, -32601, `Method not found: ${method}`);
}

// ---------------------------------------------------------------------------
// Main — line-delimited JSON-RPC over stdin (only when run as the entrypoint)
// ---------------------------------------------------------------------------

/** Wire stdin → JSON-RPC dispatch. Guarded so importing this module (tests) never opens stdin. */
function startStdioServer(): void {
  const rl = createInterface({ input: process.stdin, terminal: false });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      handleRequest(JSON.parse(trimmed) as McpRequest);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      respondError(null, -32700, `Parse error: ${message}`);
    }
  });
}

// Only open stdin when this file is the actual process entrypoint (node dist/mcp-server.js).
// Importing it (the contract test, a future cockpit) must NOT open stdin — that would hang `node --test`.
const isEntrypoint =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntrypoint) {
  startStdioServer();
}

// Exported so a contract test can drive the dispatch without spawning a process.
export { TOOLS, callTool, handleRequest, startStdioServer };
