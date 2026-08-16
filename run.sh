#!/usr/bin/env bash
# Run dashboard + agent (needs .env filled — see GUIDE.md)
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck disable=SC1091
source .venv/bin/activate
python -m src.dashboard &
DASH_PID=$!
trap 'kill $DASH_PID 2>/dev/null || true' EXIT
python -m src.agent
