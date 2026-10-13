#!/bin/bash
# Cloud-session setup: install npm deps so `npm run dev` / `npm run build` work immediately.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Chromium is preinstalled at /opt/pw-browsers; never download browsers.
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
# npm ci (not npm install) so the committed lockfile is never rewritten; skip when already in sync.
if [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  npm ci --no-audit --no-fund
fi
