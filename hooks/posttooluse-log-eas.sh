#!/usr/bin/env bash
# posttooluse-log-eas.sh — pebble's mobile-specific PostToolUse observability hook.
#
# After any Bash call that invoked `eas build` / `eas submit` / `eas update`, append one line to
# logs/runs.jsonl in the SHARED logger schema (PLAN §3.10 / HARNESS-OVERRIDES §10):
#   { "ts": ISO, "cmd": "eas build …", "durationMs": N, "eas_build_id"?: "…", "status": "ok|error|blocked" }
# This is the same append-only file src/lib/logger.ts writes — the cockpit run-log + scripts/runs-view.mjs
# read it. Non-state-changing reads are ignored to keep the log focused on real mobile invocations.
#
# Input: JSON on stdin: { "tool_name", "tool_input": { "command" }, "tool_response": { ... } }.
# Env fallback (CLAUDE_TOOL_NAME / CLAUDE_TOOL_INPUT_COMMAND) so it's testable via a piped payload OR env.
# NEVER writes a secret — only the eas subcommand verb is logged, never the full argv (tokens stay out).
#
# Source: brain/TOOL-MATRIX.md §3, HARNESS-OVERRIDES.md §10 (Observability — real lines from real runs).

set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
RUNS_LOG="$PROJECT_DIR/logs/runs.jsonl"

# --- read the hook payload (stdin JSON preferred; env fallback) ---
PAYLOAD=""
if [ ! -t 0 ]; then
  PAYLOAD="$(cat 2>/dev/null || true)"
fi

if [ -n "$PAYLOAD" ] && command -v jq >/dev/null 2>&1; then
  TOOL_NAME="$(jq -r '.tool_name // empty' <<<"$PAYLOAD" 2>/dev/null || true)"
  COMMAND="$(jq -r '.tool_input.command // empty' <<<"$PAYLOAD" 2>/dev/null || true)"
  DURATION="$(jq -r '.tool_response.durationMs // .tool_response.duration_ms // empty' <<<"$PAYLOAD" 2>/dev/null || true)"
  EXIT_CODE="$(jq -r '.tool_response.exit_code // .tool_response.exitCode // empty' <<<"$PAYLOAD" 2>/dev/null || true)"
elif [ -n "$PAYLOAD" ]; then
  TOOL_NAME="$(printf '%s' "$PAYLOAD" | sed -n 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
  COMMAND="$(printf '%s' "$PAYLOAD" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' | head -1)"
  DURATION=""
  EXIT_CODE=""
else
  TOOL_NAME="${CLAUDE_TOOL_NAME:-}"
  COMMAND="${CLAUDE_TOOL_INPUT_COMMAND:-}"
  DURATION=""
  EXIT_CODE=""
fi

# Only log Bash tool calls; anything else → no-op.
case "$TOOL_NAME" in
  Bash|bash|"") : ;;
  *) exit 0 ;;
esac
[ -z "$COMMAND" ] && exit 0

# Only log real EAS build/submit/update invocations (the cost-bearing mobile actions).
if ! printf '%s' "$COMMAND" | grep -Eq '(^|[^a-zA-Z0-9_-])eas(-cli)?[[:space:]]+(build|submit|update)([^a-zA-Z0-9_-]|$)'; then
  exit 0
fi

# Derive the cmd verb: "eas <build|submit|update> --platform <x>" — verb + platform only, NEVER the token argv.
SUB="$(printf '%s' "$COMMAND" | grep -Eo 'eas(-cli)?[[:space:]]+(build|submit|update)' | head -1 | sed -E 's/eas(-cli)?[[:space:]]+/eas /')"
PLATFORM="$(printf '%s' "$COMMAND" | sed -n 's/.*--platform[ =]\([a-zA-Z]*\).*/\1/p' | head -1)"
CMD="$SUB"
[ -n "$PLATFORM" ] && CMD="$SUB --platform $PLATFORM"

# Status from exit code (blocked is for the PreToolUse gate; here it's ok/error).
STATUS="ok"
[ -n "$EXIT_CODE" ] && [ "$EXIT_CODE" != "0" ] && STATUS="error"

# Duration: from the payload if present, else 0 (a PostToolUse hook can't time the call itself).
DUR="${DURATION:-0}"
case "$DUR" in (''|*[!0-9]*) DUR=0 ;; esac

# Try to capture an EAS build id if the tool response surfaced one (build --json prints {"id": "..."}).
BUILD_ID=""
if [ -n "$PAYLOAD" ]; then
  BUILD_ID="$(printf '%s' "$PAYLOAD" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([0-9a-fA-F-]\{8,\}\)".*/\1/p' | head -1)"
fi

TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

# Build the JSON line in the EXACT shared schema, omitting eas_build_id/model when absent.
if [ -n "$BUILD_ID" ]; then
  LINE="{\"ts\":\"$TS\",\"cmd\":\"$CMD\",\"durationMs\":$DUR,\"eas_build_id\":\"$BUILD_ID\",\"status\":\"$STATUS\"}"
else
  LINE="{\"ts\":\"$TS\",\"cmd\":\"$CMD\",\"durationMs\":$DUR,\"status\":\"$STATUS\"}"
fi

mkdir -p "$(dirname "$RUNS_LOG")"
printf '%s\n' "$LINE" >> "$RUNS_LOG"
exit 0
