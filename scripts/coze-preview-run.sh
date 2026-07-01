#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"
export PORT="${PORT:-5000}"
exec ./node_modules/.bin/next dev --hostname 0.0.0.0 --port "$PORT"
