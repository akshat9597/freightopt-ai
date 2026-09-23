#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -x backend/.venv/bin/python ]; then python3 -m venv backend/.venv; fi
backend/.venv/bin/python -m pip install -r backend/requirements.txt
(cd frontend && npm install)
backend/.venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001 &
FREIGHTOPT_API_PID=$!
trap 'kill "$FREIGHTOPT_API_PID" 2>/dev/null || true' EXIT INT TERM
FREIGHTOPT_READY=0
for attempt in $(seq 1 180); do
  if ! kill -0 "$FREIGHTOPT_API_PID" 2>/dev/null; then echo 'Backend exited. Check the error above (port 8001 may be occupied).'; exit 1; fi
  if curl -fsS http://127.0.0.1:8001/api/health >/dev/null 2>&1; then FREIGHTOPT_READY=1; break; fi
  sleep 1
done
if [ "$FREIGHTOPT_READY" -ne 1 ]; then echo 'API initialization timed out. Review the training output above.'; exit 1; fi
printf '\nFreightOpt AI: http://127.0.0.1:5173 | API: http://127.0.0.1:8001/docs\n'
(cd frontend && npm run dev)
