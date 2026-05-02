#!/usr/bin/env bash
set -e

echo "=== Starting Permission Manager (manual mode) ==="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required but not installed. Aborting." >&2; exit 1; }

echo "Starting backend..."
cd backend
npm install > /dev/null 2>&1
nohup npm run dev > ../backend.log 2>&1 &
echo $! > ../.backend.pid
cd ..

echo "Starting frontend..."
cd frontend
npm install > /dev/null 2>&1
nohup npm run dev > ../frontend.log 2>&1 &
echo $! > ../.frontend.pid
cd ..

echo ""
echo "Services started:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:4000"
echo "  API:      http://localhost:4000/api/v1"
echo ""
echo "Logs: backend.log, frontend.log"
echo "Run ./scripts/stop-dev.sh to stop"
