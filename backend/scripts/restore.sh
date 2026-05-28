#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
if [ -z "$1" ]; then
  echo "Usage: ./backend/scripts/restore.sh <backup-file.sql>"
  exit 1
fi
node scripts/restore.js "$1"
