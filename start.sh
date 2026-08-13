#!/usr/bin/env bash
# OMEDB — start backend + frontend
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> Starting FastAPI backend on port 8000..."
cd "$ROOT/backend"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "==> Starting Vite frontend..."
cd "$ROOT"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "  Backend API : http://localhost:8000"
echo "  API Docs    : http://localhost:8000/docs"
echo "  Frontend    : http://localhost:5173"
echo ""
echo "  Frontend: add .env.local with VITE_API_BASE_URL=http://localhost:<port> if the API is not on 8000."
echo "  Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
