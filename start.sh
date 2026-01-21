#!/bin/bash
# MEP Design Studio - Unified Startup
# Usage: ./start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "  MEP Design Studio - Starting..."
echo "=========================================="

# Kill any existing processes on our ports
echo "[1/4] Cleaning up existing processes..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start backend
echo "[2/4] Starting Flask backend on :5000..."
cd engine
python -m api.app &
BACKEND_PID=$!
echo "       Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo "[3/4] Waiting for backend health check..."
for i in {1..30}; do
    if curl -s http://localhost:5000/api/v1/health > /dev/null 2>&1; then
        echo "       Backend ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "       ERROR: Backend failed to start!"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

# Start frontend
echo "[4/4] Starting Vite frontend on :3000..."
cd frontend
npm run dev &
FRONTEND_PID=$!
echo "       Frontend PID: $FRONTEND_PID"

echo ""
echo "=========================================="
echo "  MEP Design Studio Running!"
echo "=========================================="
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:5000"
echo "  Health:   http://localhost:5000/api/v1/health"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "=========================================="

# Trap Ctrl+C to kill both processes
trap "echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for either to exit
wait
