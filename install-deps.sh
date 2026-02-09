#!/bin/bash
# Claude Code Remote - Dependency Installation Script
# Supports: Linux (apt), macOS (brew), WSL

set -e

echo "=================================================="
echo "  Claude Code Remote - Install Dependencies"
echo "=================================================="

# Detect OS
OS="$(uname -s)"
case "$OS" in
    Linux*)  PLATFORM="Linux";;
    Darwin*) PLATFORM="macOS";;
    *)       echo "Unsupported OS: $OS"; exit 1;;
esac

echo "Platform: $PLATFORM"

# Check if running in WSL
IS_WSL=0
if [ -f /proc/version ] && grep -qi microsoft /proc/version 2>/dev/null; then
    IS_WSL=1
    echo "Environment: WSL"
fi

# ---- Linux (apt) ----
if [ "$PLATFORM" = "Linux" ]; then
    echo ""
    echo "[1/4] Updating package list..."
    sudo apt update

    echo ""
    echo "[2/4] Installing tmux..."
    if command -v tmux &> /dev/null; then
        echo "  Already installed: $(tmux -V)"
    else
        sudo apt install -y tmux
        echo "  Installed"
    fi

    echo ""
    echo "[3/4] Installing ttyd..."
    if command -v ttyd &> /dev/null; then
        echo "  Already installed"
    else
        sudo apt install -y ttyd
        echo "  Installed"
    fi

    echo ""
    echo "[4/4] Installing Node.js & Claude Code..."
    if command -v node &> /dev/null; then
        echo "  Node.js already installed: $(node --version)"
    else
        echo "  Installing Node.js 20.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
        echo "  Installed: $(node --version)"
    fi

    if command -v claude &> /dev/null; then
        echo "  Claude Code already installed"
    else
        echo "  Installing Claude Code..."
        sudo npm install -g @anthropic-ai/claude-code
        echo "  Installed"
    fi
fi

# ---- macOS (brew) ----
if [ "$PLATFORM" = "macOS" ]; then
    # Check Homebrew
    if ! command -v brew &> /dev/null; then
        echo ""
        echo "Homebrew not found. Install it first:"
        echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
        exit 1
    fi

    echo ""
    echo "[1/4] Updating Homebrew..."
    brew update

    echo ""
    echo "[2/4] Installing tmux..."
    if command -v tmux &> /dev/null; then
        echo "  Already installed: $(tmux -V)"
    else
        brew install tmux
        echo "  Installed"
    fi

    echo ""
    echo "[3/4] Installing ttyd..."
    if command -v ttyd &> /dev/null; then
        echo "  Already installed"
    else
        brew install ttyd
        echo "  Installed"
    fi

    echo ""
    echo "[4/4] Installing Node.js & Claude Code..."
    if command -v node &> /dev/null; then
        echo "  Node.js already installed: $(node --version)"
    else
        brew install node@20
        echo "  Installed: $(node --version)"
    fi

    if command -v claude &> /dev/null; then
        echo "  Claude Code already installed"
    else
        echo "  Installing Claude Code..."
        npm install -g @anthropic-ai/claude-code
        echo "  Installed"
    fi
fi

echo ""
echo "=================================================="
echo "  Installation complete!"
echo "=================================================="
echo ""
echo "  tmux:   $(tmux -V 2>/dev/null || echo 'not installed')"
echo "  ttyd:   $(ttyd --version 2>/dev/null || echo 'installed')"
echo "  node:   $(node --version 2>/dev/null || echo 'not installed')"
echo "  claude: $(which claude 2>/dev/null || echo 'not installed')"
echo ""
if [ "$IS_WSL" -eq 1 ]; then
    echo "Now run start.ps1 on Windows, or start.sh in WSL."
else
    echo "Now run: bash start.sh"
fi
