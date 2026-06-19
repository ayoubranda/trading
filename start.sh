#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  ⬡  Elite Trading Intelligence"
echo "  ─────────────────────────────"
echo ""

# ── Backend ──────────────────────────────────────────────────
echo "▶ Installing Python dependencies..."
pip install -q -r "$ROOT/backend/requirements.txt"

echo "▶ Starting backend (http://localhost:8000)..."
cd "$ROOT/backend"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd "$ROOT"

# ── Frontend ─────────────────────────────────────────────────
echo "▶ Installing frontend dependencies..."
cd "$ROOT/frontend"
npm install --silent

echo "▶ Starting frontend (http://localhost:3000)..."
npm run dev &
FRONTEND_PID=$!
cd "$ROOT"

echo ""
echo "  ✓ Backend  → http://localhost:8000"
echo "  ✓ Frontend → http://localhost:3000"
echo ""
echo "  Open http://localhost:3000 in your browser."
echo "  Press Ctrl+C to stop both servers."
echo ""

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
