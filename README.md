# Claude Code Remote

A cross-platform web-based remote terminal for [Claude Code](https://claude.ai/claude-code) using tmux and ttyd.

Supports **Windows (WSL2)**, **Linux**, and **macOS**.

## Features

- **Terminal Native**: Real Claude Code CLI, not SDK wrapper
- **Session Persistence**: tmux sessions survive browser/network disconnects
- **Cross-Platform**: Windows (WSL2), Linux, macOS
- **PWA Support**: Install as app on mobile/desktop
- **Mobile Friendly**: Fullscreen terminal with phone keyboard support
- **Tailscale Ready**: Secure remote access anywhere

## Quick Start

### Windows (WSL2) — Setup Wizard

The setup wizard handles everything automatically: environment check, dependency installation, `.env` configuration, Tailscale setup, and server startup.

```powershell
git clone https://github.com/Hskim-droid/claude-remote.git
cd claude-remote
powershell -ExecutionPolicy Bypass -File setup-wizard.ps1
```

**Prerequisites**: [Node.js 18+](https://nodejs.org/), WSL2 with Ubuntu (`wsl --install -d Ubuntu`)

The wizard will:
1. Verify WSL2 and start Ubuntu
2. Install tmux, ttyd, Claude CLI inside WSL (if missing)
3. Run `npm install`
4. Create `.env` from defaults (if not present)
5. Configure [Tailscale](https://tailscale.com/) remote access (if installed)
6. Start the server and open the browser

Re-running the wizard is safe — already installed components are skipped.

### Linux

```bash
# Install dependencies
bash install-deps.sh

# Start
bash start.sh
```

### macOS

```bash
# Install dependencies (requires Homebrew)
bash install-deps.sh

# Start
bash start.sh
```

### Windows (WSL2) — Manual

```powershell
# Install WSL dependencies
wsl -d Ubuntu -- bash install-deps.sh

# Start
.\start.ps1
```

### Manual Start (all platforms)

```bash
npm install
npm start
```

Open http://localhost:8080

## How It Works

1. **Session Manager** (http://localhost:8080) - Create and manage terminal sessions
2. **Terminal** - Opens in a new window, fullscreen, no UI clutter
3. Each session runs Claude Code inside tmux for persistence

## Configuration

Copy `.env.example` to `.env` and customize:

```env
PORT=8080            # API server port
TTYD_PORT=7681       # Terminal WebSocket port
WSL_DISTRO=Ubuntu    # Windows only: WSL distro name

# Optional basic auth
TTYD_AUTH_USER=
TTYD_AUTH_PASS=

# Paths are auto-detected per platform
# Override if needed:
# ALLOWED_PATHS=/home/,/tmp/
# DEFAULT_PATH=/home/
```

## Remote Access with Tailscale

1. Install [Tailscale](https://tailscale.com/)
2. Enable Tailscale Serve:

```bash
tailscale serve --bg 8080
tailscale serve --bg --tcp 7681 tcp://localhost:7681
```

3. Access from anywhere via your Tailscale hostname

## Architecture

```
┌─────────────────────────────────────────┐
│  Browser                                │
│  ├─ Session Manager (port 8080)        │
│  └─ Terminal (XTerm.js ←→ ttyd)        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Node.js Express (port 8080)           │
│  └─ API: sessions, status, ttyd       │
│  └─ Platform auto-detect              │
│      ├─ Windows → WSL subprocess      │
│      ├─ Linux   → native bash         │
│      └─ macOS   → native bash         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  tmux + ttyd + Claude Code CLI         │
│  (native or via WSL2)                  │
└─────────────────────────────────────────┘
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | System status (includes platform, default_path) |
| GET | `/api/sessions` | List tmux sessions |
| POST | `/api/sessions` | Create new session |
| DELETE | `/api/sessions/:name` | Kill session |
| POST | `/api/ttyd/start` | Connect ttyd to session |

## Project Structure

```
claude-remote/
├── server/
│   ├── main.js         # Entry point
│   ├── config.js       # Configuration (platform-aware)
│   ├── api.js          # API routes
│   ├── executor.js     # Cross-platform command execution
│   ├── wsl.js          # Legacy WSL-only executor
│   └── security.js     # Security utils
├── static/
│   ├── index.html      # Session manager UI
│   ├── terminal.html   # Fullscreen terminal
│   └── manifest.json   # PWA manifest
├── setup-wizard.ps1    # Windows one-click installer
├── start.sh            # Linux/macOS launcher
├── start.ps1           # Windows launcher
├── install-deps.sh     # Linux/macOS dependency installer
├── install-wsl-deps.sh # WSL dependency installer
└── package.json
```

## Security

- Session names: alphanumeric, hyphen, underscore only (max 32 chars)
- Path validation: allowed/blocked path lists (platform-aware defaults)
- Rate limiting: 60 requests/minute per IP
- Optional: ttyd basic authentication

## Troubleshooting

### Dependencies not installed

```bash
# Linux/macOS
bash install-deps.sh

# Windows WSL
wsl -d Ubuntu -- bash install-deps.sh
```

### Port conflict

Edit `.env` file:
- `PORT`: API server (default 8080)
- `TTYD_PORT`: Terminal (default 7681)

### macOS: ttyd not found after install

```bash
brew install ttyd
```

## License

MIT
