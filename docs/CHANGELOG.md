# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2] - 2025-02-10

### Added
- Cross-platform support: Linux and macOS (native bash execution)
- `server/executor.js`: Platform abstraction layer (WSL on Windows, native on Linux/macOS)
- `static/terminal.html`: Fullscreen terminal page (no UI clutter)
- `start.sh`: Linux/macOS start script
- `install-deps.sh`: Universal dependency installer (apt/brew)
- Platform-aware default paths and configuration
- Session manager page with card-based UI
- Custom delete confirmation modal (replaces native confirm())
- Auto-generated sequential session names (session-1, session-2, ...)
- Dynamic TTYD port loading from API
- Status indicators with labels (tmux, ttyd, claude)
- Mobile-optimized terminal with touch keyboard support
- Reconnect button on connection loss

### Changed
- UI redesigned: 2-page architecture (session manager + fullscreen terminal)
- Terminal opens in new window/tab for distraction-free experience
- Session list now shows cards with Open/Delete actions
- `server/api.js` uses `executor.js` instead of `wsl.js` directly
- `server/config.js` auto-detects platform and sets appropriate defaults
- Version bumped to 0.0.2

### Removed
- Single-page terminal+session-chip layout
- Theme toggle (terminal is always dark for readability)
- Native browser confirm() dialogs

## [1.0.0] - 2025-02-05

### Added
- Initial release
- Node.js Express server
- XTerm.js terminal integration
- tmux session management
- ttyd WebSocket connection
- PWA support with manifest
- Dark/Light theme toggle
- Mobile responsive UI
- Security features:
  - Session name validation
  - Path validation (allowed/blocked lists)
  - Rate limiting
  - Shell command escaping
- Configuration via .env file
- Auto-start scripts for Windows

### Security
- Input sanitization for session names
- Path traversal prevention
- Rate limiting (60 req/min per IP)
