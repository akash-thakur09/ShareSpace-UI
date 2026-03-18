#!/bin/bash

# Development script to run both servers
# Requires 'concurrently' package

if ! command -v concurrently &> /dev/null; then
    echo "Installing concurrently..."
    npm install -g concurrently
fi

echo "🚀 Starting ShareSpace Backend Development Servers"
echo "=================================================="
echo ""
echo "API Server: http://localhost:4000"
echo "Yjs Server: ws://localhost:3001"
echo ""

concurrently \
  --names "API,YJS" \
  --prefix-colors "blue,green" \
  "npm run dev:api" \
  "npm run dev:yjs"
