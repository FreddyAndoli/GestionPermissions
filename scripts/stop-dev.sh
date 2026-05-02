#!/usr/bin/env bash
set -e

echo "=== Stopping Permission Manager ==="

if [ -f .backend.pid ]; then
  kill $(cat .backend.pid) 2>/dev/null || true
  rm .backend.pid
  echo "Backend stopped"
fi

if [ -f .frontend.pid ]; then
  kill $(cat .frontend.pid) 2>/dev/null || true
  rm .frontend.pid
  echo "Frontend stopped"
fi

echo "All services stopped"
