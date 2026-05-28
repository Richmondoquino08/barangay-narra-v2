#!/bin/bash
# Barangay System Startup Script
# Usage: bash /home/enovo/barangay-narra/barangay-system/start.sh

echo "Starting Barangay Narra Management System..."

# Start PostgreSQL
sudo service postgresql start 2>/dev/null || true

# Kill any previous instances
pkill -f "node app.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Start backend
cd /home/enovo/barangay-narra/barangay-system/backend
nohup node app.js > /tmp/backend.log 2>&1 &
echo "Backend starting..."
sleep 3

# Check backend
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "Backend OK -> http://localhost:3000"
else
  echo "Backend ERROR - check /tmp/backend.log:"
  cat /tmp/backend.log
  exit 1
fi

# Start frontend
cd /home/enovo/barangay-narra/barangay-system/frontend
nohup npm run dev -- --host 0.0.0.0 > /tmp/frontend.log 2>&1 &
echo "Frontend starting..."
sleep 5

FRONTEND_PORT=$(grep -oP 'Local:\s+http://localhost:\K[0-9]+' /tmp/frontend.log 2>/dev/null | head -1)
[ -z "$FRONTEND_PORT" ] && FRONTEND_PORT="5173"

echo ""
echo "======================================"
echo "  BARANGAY NARRA SYSTEM IS RUNNING"
echo "======================================"
echo "  Open this in your browser:"
echo "  http://localhost:$FRONTEND_PORT"
echo ""
echo "  Login credentials:"
echo "  Email   : admin@barangay.gov.ph"
echo "  Password: Admin@2024"
echo "======================================"