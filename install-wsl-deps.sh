#!/bin/bash
# Claude Code Remote - WSL dependency installation script
# Run from WSL: bash install-wsl-deps.sh

set -e

echo "========================================"
echo "Claude Code Remote - WSL Dependencies"
echo "========================================"

# Update package list
echo ""
echo "[1/4] Updating package list..."
sudo apt update

# Install tmux
echo ""
echo "[2/4] Installing tmux..."
if command -v tmux &> /dev/null; then
    echo "tmux already installed: $(tmux -V)"
else
    sudo apt install -y tmux
    echo "tmux installed"
fi

# Install ttyd
echo ""
echo "[3/4] Installing ttyd..."
if command -v ttyd &> /dev/null; then
    echo "ttyd already installed: $(ttyd --version)"
else
    sudo apt install -y ttyd
    echo "ttyd installed"
fi

# Install Claude Code (requires Node.js)
echo ""
echo "[4/4] Installing Claude Code..."
if command -v claude &> /dev/null; then
    echo "Claude Code already installed"
else
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    fi

    echo "Installing Claude Code..."
    sudo npm install -g @anthropic-ai/claude-code
    echo "Claude Code installed"
fi

echo ""
echo "========================================"
echo "Installation complete!"
echo "========================================"
echo ""
echo "Installed packages:"
echo "  - tmux: $(tmux -V 2>/dev/null || echo 'not installed')"
echo "  - ttyd: $(ttyd --version 2>/dev/null || echo 'not installed')"
echo "  - node: $(node --version 2>/dev/null || echo 'not installed')"
echo "  - claude: $(which claude 2>/dev/null || echo 'not installed')"
echo ""
echo "Now run start.ps1 on Windows."
