#!/bin/bash
# Claude Code Remote - Start Script (Linux / macOS)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TTYD_PORT=7681
API_PORT=8080

echo "=================================================="
echo "  Claude Code Remote - Starting"
echo "=================================================="

# Detect OS
OS="$(uname -s)"
case "$OS" in
    Linux*)  PLATFORM="Linux";;
    Darwin*) PLATFORM="macOS";;
    *)       PLATFORM="Unknown ($OS)";;
esac
echo "Platform: $PLATFORM"

# [1/4] Check dependencies
echo ""
echo "[1/4] Checking dependencies..."

MISSING=0

if command -v tmux &> /dev/null; then
    echo "  tmux: $(tmux -V)"
else
    echo "  tmux: NOT INSTALLED"
    MISSING=1
fi

if command -v ttyd &> /dev/null; then
    echo "  ttyd: $(ttyd --version 2>/dev/null || echo 'installed')"
else
    echo "  ttyd: NOT INSTALLED"
    MISSING=1
fi

if command -v node &> /dev/null; then
    echo "  node: $(node --version)"
else
    echo "  node: NOT INSTALLED"
    MISSING=1
fi

if command -v claude &> /dev/null; then
    echo "  claude: installed"
else
    echo "  claude: NOT INSTALLED (optional)"
fi

if [ $MISSING -eq 1 ]; then
    echo ""
    echo "Missing dependencies. Run: bash install-deps.sh"
    exit 1
fi

# [2/4] Cleanup
echo ""
echo "[2/4] Cleaning up existing processes..."
pkill -f "ttyd.*$TTYD_PORT" 2>/dev/null || true
pkill -f "node.*claude-remote/server" 2>/dev/null || true
echo "  Done"

# [3/4] Install npm dependencies
echo ""
echo "[3/4] Checking npm dependencies..."
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo "  Installing dependencies..."
    cd "$SCRIPT_DIR" && npm install
else
    echo "  Dependencies already installed"
fi

# [4/4] Start server
echo ""
echo "[4/4] Starting server..."
cd "$SCRIPT_DIR"
node server/main.js &
SERVER_PID=$!

sleep 2

echo ""
echo "=================================================="
echo "  Started!"
echo "=================================================="
echo ""
echo "  UI:       http://localhost:$API_PORT"
echo "  Terminal: http://localhost:$TTYD_PORT (after connecting)"
echo "  PID:      $SERVER_PID"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

# Open browser
if [ "$PLATFORM" = "macOS" ]; then
    read -p "Open browser? (Y/n) " OPEN
    if [ "$OPEN" != "n" ] && [ "$OPEN" != "N" ]; then
        open "http://localhost:$API_PORT"
    fi
elif [ "$PLATFORM" = "Linux" ]; then
    if command -v xdg-open &> /dev/null; then
        read -p "Open browser? (Y/n) " OPEN
        if [ "$OPEN" != "n" ] && [ "$OPEN" != "N" ]; then
            xdg-open "http://localhost:$API_PORT" 2>/dev/null || true
        fi
    fi
fi

# Wait for server
wait $SERVER_PID
