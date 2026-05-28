#!/bin/bash

# Barangay Management System - Complete Startup Script
# This script starts both frontend and backend with proper port configuration

echo "╔════════════════════════════════════════╗"
echo "║  Barangay Management System Startup    ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Kill any existing processes on the ports
echo "Cleaning up any existing processes..."
fuser -k 5001/tcp 2>/dev/null
fuser -k 3000/tcp 2>/dev/null
sleep 1

# Start backend with PM2
echo "Starting backend on port 5001..."
cd /root
pm2 start pm2/ecosystem.config.js

# Wait for backend to be ready
sleep 2

# Check backend status
echo ""
echo "Checking backend health..."
HEALTH_CHECK=$(curl -s http://localhost:5001/health)
if [[ $HEALTH_CHECK == *"ok"* ]]; then
    echo "✅ Backend is running successfully on port 5001"
else
    echo "❌ Backend health check failed"
fi

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  SERVER CONFIGURATION                  ║"
echo "╠════════════════════════════════════════╣"
echo "║  Backend: http://localhost:5001        ║"
echo "║  Frontend: http://localhost:5173       ║"
echo "║  Database: PostgreSQL (localhost:5432) ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "PM2 Status:"
pm2 status
