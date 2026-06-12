#!/usr/bin/env bash
# pretooluse-mobile-gate.sh — pebble's mobile-specific PreToolUse gate.
#
# Blocks the two #1 headless foot-guns BEFORE the command runs:
#   1. an `eas`/`expo` call missing `--non-interactive`  (hangs the agent on a TTY prompt — KNOWN-PITFALLS §9)
#   2. an `eas update` missing `--environment`           (FAILS on SDK 55+ — SCENARIO 5, the #1 CI break)
#
# Convention: a PreToolUse hook that exits 2 BLOCKS the tool call; stderr is shown to the model.
# Exit 0 = allow. (Claude Code PreToolUse exit-code protocol.)
#
# Input: the hook receives a JSON payload on stdin: { "tool_name": "...", "tool_input": { "command": "..." } }.
# We parse the command out of stdin; if stdin is empty (e.g. a manual test that sets env), we fall back to
# CLAUDE_TOOL_NAME / CLAUDE_TOOL_INPUT_COMMAND so the gate is testable both ways.
#
# Source of the invariants: brain/KNOWN-PITFALLS.md §9, brain/OPINIONS.md S7, brain/TOOL-MATRIX.md §3.

set -uo pipefail

# --- read the hook payload (stdin JSON preferred; env fallback) ---
PAYLOAD=""
if [ ! -t 0 ]; then
  PAYLOAD="$(cat 2>/dev/null || true)"
fi

if [ -n "$PAYLOAD" ] && command -v jq >/dev/null 2>&1; then
  TOOL_NAME="$(jq -r '.tool_name // empty' <<<"$PAYLOAD" 2>/dev/null || true)"
  COMMAND="$(jq -r '.tool_input.command // empty' <<<"$PAYLOAD" 2>/dev/null || true)"
elif [ -n "$PAYLOAD" ]; then
  # jq-free fallback: grep the command field out of the raw JSON.
  TOOL_NAME="$(printf '%s' "$PAYLOAD" | sed -n 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
  COMMAND="$(printf '%s' "$PAYLOAD" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' | head -1)"
else
  TOOL_NAME="${CLAUDE_TOOL_NAME:-}"
  COMMAND="${CLAUDE_TOOL_INPUT_COMMAND:-}"
fi

# Only gate Bash tool calls (the surface that shells eas/expo). Anything else → allow.
case "$TOOL_NAME" in
  Bash|bash|"") : ;;   # "" allows direct CLI-piped tests
  *) exit 0 ;;
esac

# Nothing to inspect → allow.
[ -z "$COMMAND" ] && exit 0

# Only gate commands that actually invoke the mobile toolchain.
case "$COMMAND" in
  *eas\ *|*eas-cli*|*expo\ *|*"@expo/cli"*) : ;;
  *) exit 0 ;;
esac

# --- RULE 1 (checked first — most specific): `eas update` must carry --environment (SDK 55+) ---
# Ordered before the --non-interactive rule so an `eas update` missing both reports the environment
# violation (the SDK-55 CI break is the sharper, update-specific failure mode).
if printf '%s' "$COMMAND" | grep -Eq '(^|[^a-zA-Z0-9_-])eas(-cli)?[[:space:]]+update([^a-zA-Z0-9_-]|$)'; then
  if ! printf '%s' "$COMMAND" | grep -q -- '--environment'; then
    echo "pebble PreToolUse BLOCK: \`eas update\` is missing --environment." >&2
    echo "  eas update FAILS on SDK 55+ without it — omitting it is the #1 CI break (SCENARIO 5)." >&2
    echo "  Add --environment <env> (pebble's policy is fail-safe: always include it — PLAN §14 Q8)." >&2
    echo "  Command: $COMMAND" >&2
    exit 2
  fi
fi

# --- RULE 2: every eas/expo call must carry --non-interactive ---
if printf '%s' "$COMMAND" | grep -Eq '(^|[^a-zA-Z0-9_-])(eas|eas-cli|expo)([^a-zA-Z0-9_-]|$)'; then
  if ! printf '%s' "$COMMAND" | grep -q -- '--non-interactive'; then
    echo "pebble PreToolUse BLOCK: an eas/expo command is missing --non-interactive." >&2
    echo "  Without it, the call hangs forever on a TTY prompt (the #1 headless foot-gun — KNOWN-PITFALLS §9)." >&2
    echo "  Add --non-interactive (pebble's wrappers inject it automatically; raw calls must include it)." >&2
    echo "  Command: $COMMAND" >&2
    exit 2
  fi
fi

exit 0
