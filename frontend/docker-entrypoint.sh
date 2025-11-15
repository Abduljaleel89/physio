#!/bin/sh
set -e

# Install dependencies if node_modules doesn't exist or is empty
if [ ! -d "node_modules" ] || [ "$(ls -A node_modules 2>/dev/null | wc -l)" -eq 0 ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start Next.js dev server
exec npm run dev

