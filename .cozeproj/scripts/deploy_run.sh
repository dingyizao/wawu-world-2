#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_DIR"
export PORT="${PORT:-5000}"
exec ./node_modules/.bin/next start --hostname 0.0.0.0 --port "$PORT"
