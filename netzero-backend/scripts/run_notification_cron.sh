#!/usr/bin/env bash
# Simple cron script to run NetZero notification analysis.
# Place this under the project's venv-capable environment and schedule via crontab.

set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV_PY="$BASE_DIR/venv/bin/python"

if [ ! -x "$VENV_PY" ]; then
  echo "Python executable not found at $VENV_PY" >&2
  exit 2
fi

cd "$BASE_DIR"

# Run simulation-based analysis (safe default). Use --send to attempt real email sends.
"$VENV_PY" manage.py run_notification_analysis --simulate
