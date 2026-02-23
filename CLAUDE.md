# claude-remote

Web-based remote terminal for Claude Code CLI.

## Architecture

- **Server**: Express + node-pty + WebSocket (ws library)
- **Frontend**: xterm.js 6.0 + WebGL addon (CDN, vanilla JS SPA)
- **Cross-platform**: Windows (WSL2 via wsl.exe), Linux, macOS
- **Session management**: tmux sessions, each running `claude` CLI
- **Protocol**: JSON over WebSocket (`{type:'input',data}`, `{type:'resize',cols,rows}`)

## File Structure

```
server/          # Backend (TypeScript strict, ESM)
  config.ts      # Platform-aware configuration (env + defaults)
  security.ts    # Input sanitization (session names, paths, shell quoting)
  executor.ts    # Cross-platform command execution (WSL on Windows)
  pty-manager.ts # node-pty session attachment (replaces ttyd)
  api.ts         # REST API routes (sessions CRUD, status)
  main.ts        # Entry point (Express + WebSocket server)

static/          # Frontend (vanilla JS, CDN dependencies)
  index.html     # Session manager dashboard
  terminal.html  # Fullscreen xterm.js terminal

tests/           # Vitest unit tests
  config.test.ts
  security.test.ts
```

## Coding Conventions

- TypeScript strict mode, ES2022 target, ESM only
- No CommonJS (`require`, `module.exports`) — use `import`/`export`
- Semicolons required, single quotes
- Explicit return types on exported functions
- Prettier: 100 char width, trailing commas ES5

## Security Rules

- ALL user input must pass through sanitize functions:
  - Session names: `sanitizeSessionName()` (alphanumeric, hyphen, underscore, max 32)
  - File paths: `sanitizePath()` (allowed/blocked list, no traversal)
  - Shell arguments: `shellQuote()` (single-quote wrapping)
- **NEVER** use: `eval()`, `new Function()`, `child_process.exec(userInput)`
- Environment variables accessed only through `config.ts`, never `process.env` directly in other files
- CDN scripts must have SRI integrity hashes + crossorigin="anonymous"
- CORS origin must never be `'*'` — configure specific origins via `CORS_ORIGIN` env var

## Principles

- Read the actual file before modifying it — never rely on summaries or assumptions
- Do not introduce changes that break existing tests (`npx vitest run` must pass)
- Prefer editing existing files over creating new ones
- Keep cross-platform compatibility: test that paths/commands work on win32, linux, darwin
