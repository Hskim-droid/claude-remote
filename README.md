# Claude Code Remote

A web-based remote terminal for [Claude Code](https://claude.ai/claude-code) using WSL2, tmux, and ttyd.

## Features

- **Terminal Native**: Real Claude Code CLI, not SDK wrapper
- **Session Persistence**: tmux sessions survive browser/network disconnects
- **Windows File Access**: Direct access to Windows files via `/mnt/c/`
- **PWA Support**: Install as app on mobile/desktop
- **Tailscale Ready**: Secure remote access anywhere

## Quick Start

### Prerequisites

- Windows 10/11 with WSL2
- Ubuntu (or other distro) in WSL2
- Node.js 18+
- tmux and ttyd in WSL

### Install WSL Dependencies

```bash
wsl -d Ubuntu -- sudo apt update
wsl -d Ubuntu -- sudo apt install -y tmux ttyd
```

### Install Claude Code in WSL

```bash
wsl -d Ubuntu -- npm install -g @anthropic-ai/claude-code
```

### Run

```powershell
.\start.ps1
```

Or manually:

```powershell
npm install
npm start
```

Open http://localhost:8080

## Configuration

Copy `.env.example` to `.env` and customize:

```env
# Server
PORT=8080

# WSL distro name
WSL_DISTRO=Ubuntu

# ttyd port
TTYD_PORT=7681

# Basic auth (optional)
TTYD_AUTH_USER=
TTYD_AUTH_PASS=
```

## Remote Access with Tailscale

1. Install [Tailscale](https://tailscale.com/) on Windows
2. Enable Tailscale Serve:

```powershell
tailscale serve --bg 8080
tailscale serve --bg --tcp 7681 tcp://localhost:7681
```

3. Access from anywhere via your Tailscale hostname

## Architecture

```
┌─────────────────────────────────────────┐
│  Browser                                │
│  └─ XTerm.js ←──WebSocket──→ ttyd      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Windows                                │
│  └─ Node.js Express (port 8080)        │
│      └─ API: sessions, status          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  WSL2 (Ubuntu)                          │
│  ├─ tmux (session management)          │
│  ├─ ttyd (web terminal, port 7681)     │
│  └─ claude (Claude Code CLI)           │
└─────────────────────────────────────────┘
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | System status |
| GET | `/api/sessions` | List tmux sessions |
| POST | `/api/sessions` | Create new session |
| DELETE | `/api/sessions/:name` | Kill session |
| POST | `/api/ttyd/start` | Connect ttyd to session |

## Security

- Session names: alphanumeric, hyphen, underscore only (max 32 chars)
- Path validation: allowed/blocked path lists
- Rate limiting: 60 requests/minute per IP
- Optional: ttyd basic authentication

## Project Structure

```
claude-remote/
├── server/
│   ├── main.js       # Entry point
│   ├── config.js     # Configuration
│   ├── api.js        # API routes
│   ├── wsl.js        # WSL commands
│   └── security.js   # Security utils
├── static/
│   ├── index.html    # UI (XTerm.js)
│   └── manifest.json # PWA manifest
├── start.ps1         # Windows launcher
└── package.json
```

## Troubleshooting

### ttyd not installed

```bash
wsl -d Ubuntu -- sudo apt install -y ttyd
```

### Claude Code not installed

```bash
wsl -d Ubuntu -- npm install -g @anthropic-ai/claude-code
```

### Port conflict

Edit `.env` file:
- `PORT`: API server (default 8080)
- `TTYD_PORT`: Terminal (default 7681)

## License

MIT
