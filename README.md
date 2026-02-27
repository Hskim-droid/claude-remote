<div align="center">

# Claude Code Remote

**Web-based remote terminal for Claude Code CLI**

[![CI](https://github.com/Hskim-droid/claude-remote/actions/workflows/ci.yml/badge.svg)](https://github.com/Hskim-droid/claude-remote/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Version](https://img.shields.io/badge/version-0.1.0-brightgreen)](#)

[**English**](#english) | [**한국어**](#한국어)

</div>

---

<!-- ==================== ENGLISH ==================== -->

<a id="english"></a>

## English

Run [Claude Code](https://docs.anthropic.com/en/docs/claude-code) in the browser from anywhere. Cross-platform support for **Windows (WSL2)**, **Linux**, and **macOS**.

### Highlights

| | Feature | Description |
|---|---------|-------------|
| **Terminal Native** | Real Claude Code CLI — not an SDK wrapper |
| **Single Port** | node-pty + WebSocket on one port (8080) |
| **Session Persistence** | tmux sessions survive browser/network disconnects |
| **E2E Encryption** | AES-256-GCM for all terminal I/O |
| **Token Auth** | Auto-generated or env-configured, timing-safe comparison |
| **Cross-Platform** | Windows (WSL2), Linux, macOS |
| **Mobile Ready** | Fullscreen terminal, phone keyboard support, PWA installable |

### Architecture

```
┌─────────────────────────────────────┐
│  Browser (xterm.js 6.0 + WebGL)    │
│  ├─ index.html    (Dashboard)      │
│  └─ terminal.html (Fullscreen)     │
└──────────────┬──────────────────────┘
               │ WebSocket + REST API
┌──────────────▼──────────────────────┐
│  Node.js Express Server (:8080)    │
│  ├─ Helmet / CORS / Rate Limiting  │
│  ├─ Token Auth Middleware          │
│  ├─ REST API (/api/*)              │
│  ├─ WebSocket (/ws) + E2E Encrypt  │
│  └─ Session Store (JSON persist)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  node-pty → tmux → claude CLI      │
│  (Windows: via WSL2)               │
└─────────────────────────────────────┘
```

### Quick Start

#### Prerequisites

- **Node.js 20+**
- **tmux**
- **Claude Code CLI** (`claude`)
- Windows only: **WSL2** (Ubuntu recommended)

#### Install & Run

```bash
git clone https://github.com/Hskim-droid/claude-remote.git
cd claude-remote
npm install
npm start
```

Open `http://localhost:8080` and enter the auth token printed in the console.

<details>
<summary><b>Windows (WSL2) — Setup Wizard</b></summary>

The wizard handles everything automatically: environment check, dependency installation, `.env` configuration, Tailscale setup, and server startup.

```powershell
git clone https://github.com/Hskim-droid/claude-remote.git
cd claude-remote
powershell -ExecutionPolicy Bypass -File setup-wizard.ps1
```

The wizard will:
1. Verify WSL2 and start Ubuntu
2. Install tmux, Claude CLI inside WSL (if missing)
3. Run `npm install`
4. Create `.env` from defaults (if not present)
5. Configure [Tailscale](https://tailscale.com/) remote access (if installed)
6. Start the server and open the browser

Re-running is safe — already installed components are skipped.

</details>

<details>
<summary><b>Linux / macOS</b></summary>

```bash
bash install-deps.sh   # Linux: apt, macOS: brew
bash start.sh
```

</details>

<details>
<summary><b>Docker</b></summary>

```bash
docker compose up -d
```

</details>

### Configuration

Copy `.env.example` to `.env` and customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `AUTH_TOKEN` | *(auto-generated)* | Auth token (64-char hex) |
| `E2E_ENABLED` | `false` | Enable AES-256-GCM E2E encryption |
| `WSL_DISTRO` | `Ubuntu` | WSL distro name (Windows only) |
| `CORS_ORIGIN` | `http://localhost:PORT` | Allowed CORS origins (comma-separated) |
| `RATE_LIMIT_WINDOW` | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | `60` | Max requests per window |

### API

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/auth-status` | | Check if auth is required |
| GET | `/api/status` | Y | Platform info, tmux/claude status |
| GET | `/api/sessions` | Y | List sessions |
| POST | `/api/sessions` | Y | Create session |
| DELETE | `/api/sessions/:name` | Y | Kill session |
| GET | `/api/sessions/:name/key` | Y | E2E encryption key |
| GET | `/api/processes` | Y | Claude process list |
| WS | `/ws?session=NAME&token=TOKEN` | Y | Terminal WebSocket |

<details>
<summary><b>WebSocket Protocol</b></summary>

```jsonc
// Client → Server
{ "type": "input", "data": "ls -la\r" }
{ "type": "resize", "cols": 120, "rows": 40 }

// Server → Client (E2E disabled)
<raw terminal output>

// Server → Client (E2E enabled)
[12B IV][AES-256-GCM ciphertext][16B auth tag]
```

</details>

### Remote Access with Tailscale

1. Install [Tailscale](https://tailscale.com/)
2. Expose the server:
   ```bash
   tailscale serve --bg 8080
   ```
3. Access from anywhere via your Tailscale hostname

### SSH Access (Termius / any SSH client)

Connect directly via SSH for the most stable remote experience — no browser or WebSocket needed.

#### Prerequisites

- **OpenSSH Server** enabled on Windows (`sshd` service running)
- **Tailscale** or LAN access to the host machine

#### Setup

1. Install the session manager script into WSL:
   ```bash
   # From the project directory
   cp claude-manager.sh \\\\wsl.localhost\\Ubuntu\\home\\$USER\\claude-manager
   wsl -d Ubuntu -- chmod +x ~/claude-manager
   ```

2. (Optional) Auto-launch on SSH login — add to WSL `~/.bashrc`:
   ```bash
   if [ -n "$SSH_CONNECTION" ] && [ -z "$TMUX" ] && [ -x "$HOME/claude-manager" ]; then
       exec "$HOME/claude-manager"
   fi
   ```

#### Connect with Termius

| Field | Value |
|-------|-------|
| Host | Tailscale IP or LAN IP |
| Port | `22` |
| Username | Windows username |
| Auth | Windows password or SSH key |

On connect, the Claude Session Manager launches automatically:

```
╔══════════════════════════════════════╗
║   Claude Code Session Manager        ║
╚══════════════════════════════════════╝

  Active Sessions:

  [1] session-1  (1 window)  ○ detached
  [2] project-x  (1 window)  ○ detached

  [n] New session
  [q] Quit

  Select:
```

#### tmux Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+B` → `D` | Detach (return to manager, session stays alive) |
| `Ctrl+B` → `S` | Switch between sessions |
| `Ctrl+B` → `C` | New window in current session |

### Project Structure

```
server/
  main.ts            # Entry point (Express + WebSocket)
  api.ts             # REST API routes (sessions CRUD, status)
  auth.ts            # Token-based auth (Bearer / query param)
  config.ts          # Platform-aware config (env + defaults)
  crypto.ts          # AES-256-GCM E2E encryption
  executor.ts        # Cross-platform command execution (WSL / native)
  pty-manager.ts     # node-pty session management
  security.ts        # Input validation (session name, path, shell quote)
  session-store.ts   # Session persistence (JSON atomic write)

static/
  index.html         # Session manager dashboard
  terminal.html      # Fullscreen xterm.js terminal

tests/               # Vitest unit tests
  auth.test.ts
  config.test.ts
  crypto.test.ts
  security.test.ts
  session-store.test.ts
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript strict (ES2022, ESM) |
| Server | Express + ws (WebSocket) |
| Terminal | node-pty + tmux |
| Frontend | xterm.js 6.0 + WebGL (CDN, vanilla JS) |
| Encryption | AES-256-GCM (Node.js crypto + Web Crypto API) |
| Testing | Vitest |
| CI/CD | GitHub Actions (Node 20, 22) |
| Container | Docker + Docker Compose |

### Security

- All user input passes through `sanitizeSessionName()`, `sanitizePath()`, `shellQuote()`
- Filesystem access restricted by allow/block path lists
- OWASP security headers via Helmet
- Rate limiting: 60 req/min per IP
- CDN scripts use SRI integrity hashes
- `eval()`, `new Function()`, `exec(userInput)` are forbidden

### Cross-Platform Support

| Feature | Windows | Linux | macOS |
|---------|---------|-------|-------|
| Command execution | Via WSL2 | Native bash | Native bash |
| PTY connection | `wsl.exe` → tmux | Direct tmux | Direct tmux |
| Allowed paths | `/mnt/c/`, `/mnt/d/`, `/home/` | `/home/`, `/tmp/`, `/opt/` | `/Users/`, `/tmp/`, `/opt/` |
| Blocked paths | `/etc`, `/root`, `/sys`, `/proc`, `/dev` | Same | Same + `/System` |

### Development

```bash
npm run dev         # Dev mode (file watch)
npm run typecheck   # Type check
npm run lint        # Lint
npm test            # Run tests
npm run format      # Format code
```

### Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md). Bug reports and feature requests welcome via [Issues](https://github.com/Hskim-droid/claude-remote/issues).

---

<!-- ==================== KOREAN ==================== -->

<a id="한국어"></a>

## 한국어

[Claude Code](https://docs.anthropic.com/en/docs/claude-code)를 브라우저에서 어디서든 실행할 수 있는 웹 기반 원격 터미널입니다. **Windows (WSL2)**, **Linux**, **macOS**를 지원합니다.

### 주요 기능

| | 기능 | 설명 |
|---|------|------|
| **터미널 네이티브** | SDK 래핑이 아닌 실제 Claude Code CLI 실행 |
| **단일 포트** | node-pty + WebSocket을 포트 하나(8080)로 통합 |
| **세션 영속화** | tmux 기반으로 브라우저/네트워크 끊김에도 세션 유지 |
| **종단간 암호화** | AES-256-GCM으로 터미널 입출력 암호화 |
| **토큰 인증** | 자동 생성 또는 환경변수 설정, timing-safe 비교 |
| **크로스 플랫폼** | Windows (WSL2), Linux, macOS |
| **모바일 지원** | 풀스크린 터미널, 모바일 키보드 최적화, PWA 설치 가능 |

### 아키텍처

```
┌─────────────────────────────────────┐
│  브라우저 (xterm.js 6.0 + WebGL)    │
│  ├─ index.html    (세션 대시보드)    │
│  └─ terminal.html (풀스크린 터미널)  │
└──────────────┬──────────────────────┘
               │ WebSocket + REST API
┌──────────────▼──────────────────────┐
│  Node.js Express 서버 (:8080)       │
│  ├─ Helmet / CORS / Rate Limiting   │
│  ├─ 토큰 인증 미들웨어              │
│  ├─ REST API (/api/*)               │
│  ├─ WebSocket (/ws) + E2E 암호화    │
│  └─ 세션 스토어 (JSON 영속화)       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  node-pty → tmux → claude CLI       │
│  (Windows: WSL2 경유)               │
└─────────────────────────────────────┘
```

### 빠른 시작

#### 사전 요구사항

- **Node.js 20+**
- **tmux**
- **Claude Code CLI** (`claude`)
- Windows의 경우: **WSL2** (Ubuntu 권장)

#### 설치 및 실행

```bash
git clone https://github.com/Hskim-droid/claude-remote.git
cd claude-remote
npm install
npm start
```

`http://localhost:8080`에 접속 후 콘솔에 출력된 인증 토큰을 입력하세요.

<details>
<summary><b>Windows (WSL2) — 자동 설정 마법사</b></summary>

환경 확인, 의존성 설치, `.env` 설정, Tailscale 설정, 서버 시작을 자동으로 처리합니다.

```powershell
git clone https://github.com/Hskim-droid/claude-remote.git
cd claude-remote
powershell -ExecutionPolicy Bypass -File setup-wizard.ps1
```

마법사가 수행하는 작업:
1. WSL2 확인 및 Ubuntu 시작
2. WSL 내 tmux, Claude CLI 설치 (미설치 시)
3. `npm install` 실행
4. `.env` 기본값 생성 (미존재 시)
5. [Tailscale](https://tailscale.com/) 원격 접근 설정 (설치된 경우)
6. 서버 시작 및 브라우저 열기

재실행해도 안전합니다 — 이미 설치된 항목은 건너뜁니다.

</details>

<details>
<summary><b>Linux / macOS</b></summary>

```bash
bash install-deps.sh   # Linux: apt, macOS: brew
bash start.sh
```

</details>

<details>
<summary><b>Docker</b></summary>

```bash
docker compose up -d
```

</details>

### 환경변수

`.env.example`을 `.env`로 복사한 후 설정하세요:

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `8080` | 서버 포트 |
| `HOST` | `0.0.0.0` | 바인드 주소 |
| `AUTH_TOKEN` | *(자동 생성)* | 인증 토큰 (64자 hex) |
| `E2E_ENABLED` | `false` | AES-256-GCM 종단간 암호화 활성화 |
| `WSL_DISTRO` | `Ubuntu` | WSL 배포판 이름 (Windows 전용) |
| `CORS_ORIGIN` | `http://localhost:PORT` | CORS 허용 출처 (쉼표 구분) |
| `RATE_LIMIT_WINDOW` | `60000` | Rate limit 윈도우 (ms) |
| `RATE_LIMIT_MAX` | `60` | 윈도우당 최대 요청 수 |

### API 엔드포인트

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|:----:|------|
| GET | `/api/auth-status` | | 인증 필요 여부 확인 |
| GET | `/api/status` | O | 플랫폼 정보, tmux/claude 상태 |
| GET | `/api/sessions` | O | 세션 목록 조회 |
| POST | `/api/sessions` | O | 새 세션 생성 |
| DELETE | `/api/sessions/:name` | O | 세션 종료 |
| GET | `/api/sessions/:name/key` | O | E2E 암호화 키 조회 |
| GET | `/api/processes` | O | Claude 프로세스 목록 |
| WS | `/ws?session=NAME&token=TOKEN` | O | 터미널 WebSocket 연결 |

<details>
<summary><b>WebSocket 프로토콜</b></summary>

```jsonc
// 클라이언트 → 서버
{ "type": "input", "data": "ls -la\r" }
{ "type": "resize", "cols": 120, "rows": 40 }

// 서버 → 클라이언트 (E2E 비활성화 시)
<raw terminal output>

// 서버 → 클라이언트 (E2E 활성화 시)
[12B IV][AES-256-GCM 암호문][16B 인증 태그]
```

</details>

### Tailscale로 원격 접속

1. [Tailscale](https://tailscale.com/) 설치
2. 서버 노출:
   ```bash
   tailscale serve --bg 8080
   ```
3. Tailscale 호스트명으로 어디서든 접속

### SSH 접속 (Termius / SSH 클라이언트)

SSH로 직접 접속하면 브라우저나 WebSocket 없이 가장 안정적으로 사용할 수 있습니다.

#### 사전 요구사항

- Windows **OpenSSH 서버** 활성화 (`sshd` 서비스 실행 중)
- **Tailscale** 또는 LAN 접근 가능

#### 설정

1. 세션 관리자 스크립트를 WSL에 설치:
   ```bash
   # 프로젝트 디렉토리에서
   cp claude-manager.sh \\\\wsl.localhost\\Ubuntu\\home\\$USER\\claude-manager
   wsl -d Ubuntu -- chmod +x ~/claude-manager
   ```

2. (선택) SSH 접속 시 자동 실행 — WSL `~/.bashrc`에 추가:
   ```bash
   if [ -n "$SSH_CONNECTION" ] && [ -z "$TMUX" ] && [ -x "$HOME/claude-manager" ]; then
       exec "$HOME/claude-manager"
   fi
   ```

#### Termius 연결 설정

| 항목 | 값 |
|------|-----|
| Host | Tailscale IP 또는 LAN IP |
| Port | `22` |
| Username | Windows 사용자명 |
| Auth | Windows 비밀번호 또는 SSH 키 |

접속하면 Claude Session Manager가 자동 실행됩니다:

```
╔══════════════════════════════════════╗
║   Claude Code Session Manager        ║
╚══════════════════════════════════════╝

  Active Sessions:

  [1] session-1  (1 window)  ○ detached
  [2] project-x  (1 window)  ○ detached

  [n] New session
  [q] Quit

  Select:
```

#### tmux 단축키

| 키 | 동작 |
|----|------|
| `Ctrl+B` → `D` | 세션 분리 (매니저로 돌아감, 세션은 유지) |
| `Ctrl+B` → `S` | 세션 간 전환 |
| `Ctrl+B` → `C` | 현재 세션에 새 윈도우 생성 |

### 프로젝트 구조

```
server/
  main.ts            # 진입점 (Express + WebSocket 서버)
  api.ts             # REST API 라우트 (세션 CRUD, 상태 조회)
  auth.ts            # 토큰 기반 인증 (Bearer / 쿼리 파라미터)
  config.ts          # 플랫폼별 설정 (환경변수 + 기본값)
  crypto.ts          # AES-256-GCM 종단간 암호화
  executor.ts        # 크로스 플랫폼 명령 실행 (WSL / 네이티브)
  pty-manager.ts     # node-pty 세션 관리
  security.ts        # 입력 검증 (세션명, 경로, 쉘 인용)
  session-store.ts   # 세션 영속화 (JSON atomic write)

static/
  index.html         # 세션 관리 대시보드
  terminal.html      # 풀스크린 xterm.js 터미널

tests/               # Vitest 단위 테스트
  auth.test.ts
  config.test.ts
  crypto.test.ts
  security.test.ts
  session-store.test.ts
```

### 기술 스택

| 구분 | 기술 |
|------|------|
| 언어 | TypeScript strict (ES2022, ESM) |
| 서버 | Express + ws (WebSocket) |
| 터미널 | node-pty + tmux |
| 프론트엔드 | xterm.js 6.0 + WebGL (CDN, 바닐라 JS) |
| 암호화 | AES-256-GCM (Node.js crypto + Web Crypto API) |
| 테스트 | Vitest |
| CI/CD | GitHub Actions (Node 20, 22) |
| 컨테이너 | Docker + Docker Compose |

### 보안

- 모든 사용자 입력은 `sanitizeSessionName()`, `sanitizePath()`, `shellQuote()`를 거침
- 경로 허용/차단 목록으로 파일시스템 접근 제한
- Helmet으로 OWASP 보안 헤더 적용
- IP당 분당 60회 요청 제한
- CDN 스크립트에 SRI 무결성 해시 적용
- `eval()`, `new Function()`, `exec(userInput)` 사용 금지

### 크로스 플랫폼 지원

| 기능 | Windows | Linux | macOS |
|------|---------|-------|-------|
| 명령 실행 | WSL2 경유 | 네이티브 bash | 네이티브 bash |
| PTY 연결 | `wsl.exe` → tmux | 직접 tmux | 직접 tmux |
| 허용 경로 | `/mnt/c/`, `/mnt/d/`, `/home/` | `/home/`, `/tmp/`, `/opt/` | `/Users/`, `/tmp/`, `/opt/` |
| 차단 경로 | `/etc`, `/root`, `/sys`, `/proc`, `/dev` | 동일 | 동일 + `/System` |

### 개발

```bash
npm run dev         # 개발 모드 (파일 변경 감지)
npm run typecheck   # 타입 체크
npm run lint        # 린트
npm test            # 테스트 실행
npm run format      # 코드 포맷팅
```

### 기여

[CONTRIBUTING.md](docs/CONTRIBUTING.md)를 참고하세요. 버그 리포트와 기능 제안은 [Issues](https://github.com/Hskim-droid/claude-remote/issues)에서 환영합니다.

---

<div align="center">

**[MIT License](LICENSE)** | Made with Claude Code

</div>
