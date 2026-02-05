#!/bin/bash
# Claude Code Remote - WSL 의존성 설치 스크립트
# wsl -d Ubuntu -- bash /mnt/d/tools/claude-remote/install-wsl-deps.sh

set -e

echo "========================================"
echo "Claude Code Remote - WSL 의존성 설치"
echo "========================================"

# 패키지 업데이트
echo ""
echo "[1/4] 패키지 목록 업데이트..."
sudo apt update

# tmux 설치
echo ""
echo "[2/4] tmux 설치..."
if command -v tmux &> /dev/null; then
    echo "tmux 이미 설치됨: $(tmux -V)"
else
    sudo apt install -y tmux
    echo "tmux 설치 완료"
fi

# ttyd 설치
echo ""
echo "[3/4] ttyd 설치..."
if command -v ttyd &> /dev/null; then
    echo "ttyd 이미 설치됨: $(ttyd --version)"
else
    sudo apt install -y ttyd
    echo "ttyd 설치 완료"
fi

# Claude Code 설치 (Node.js 필요)
echo ""
echo "[4/4] Claude Code 설치..."
if command -v claude &> /dev/null; then
    echo "Claude Code 이미 설치됨"
else
    # Node.js 확인
    if ! command -v node &> /dev/null; then
        echo "Node.js 설치 중..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    fi

    echo "Claude Code 설치 중..."
    sudo npm install -g @anthropic-ai/claude-code
    echo "Claude Code 설치 완료"
fi

echo ""
echo "========================================"
echo "설치 완료!"
echo "========================================"
echo ""
echo "설치된 패키지:"
echo "  - tmux: $(tmux -V 2>/dev/null || echo '미설치')"
echo "  - ttyd: $(ttyd --version 2>/dev/null || echo '미설치')"
echo "  - node: $(node --version 2>/dev/null || echo '미설치')"
echo "  - claude: $(which claude 2>/dev/null || echo '미설치')"
echo ""
echo "이제 Windows에서 start.ps1을 실행하세요."
