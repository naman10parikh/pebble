#!/usr/bin/env bash
# scripts/serve.sh — launch the pebble cockpit (G1).
# Stdlib Node http server on localhost:7788. The cockpit shells `dist/cli.js` for brain/decide, so it
# builds the CLI first if dist/ is stale or missing. Read-mostly — writes nothing the CLI doesn't.
# Usage: bash scripts/serve.sh   (then open http://localhost:7788)
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

# The cockpit's ask-the-employee + brain views shell dist/cli.js — ensure it exists.
if [ ! -f "dist/cli.js" ]; then
  echo "[serve] dist/cli.js missing — building…"
  npm run build
fi

PORT="${PEBBLE_COCKPIT_PORT:-7788}"
echo "[serve] pebble cockpit → http://localhost:${PORT}"
exec node "$REPO/src/cockpit/server.mjs"
