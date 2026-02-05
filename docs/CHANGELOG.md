# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
