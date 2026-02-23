# Claude Code Remote

크로스 플랫폼 웹 기반 원격 터미널로, Claude Code CLI를 브라우저에서 실행할 수 있습니다.

## 주요 특징

- **네이티브 CLI 실행** - SDK 래핑이 아닌 실제 Claude Code CLI를 그대로 실행
- **세션 영속화** - tmux 기반으로 브라우저를 닫거나 네트워크가 끊겨도 세션 유지
- **크로스 플랫폼** - Windows (WSL2), Linux, macOS 지원
- **종단간 암호화** - AES-256-GCM으로 터미널 입출력 암호화
- **토큰 인증** - 자동 생성 또는 환경변수 설정, timing-safe 비교
- **단일 포트** - node-pty 기반 WebSocket 통합으로 포트 하나(8080)만 사용
- **모바일 지원** - 풀스크린 터미널, 모바일 키보드 최적화, PWA 설치 가능

## 아키텍처

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

## 기술 스택

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

## 파일 구조

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
  session-store.ts   # 세션 영속화 (JSON atomic write, 고스트 복구)

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

## 설치 및 실행

### 사전 요구사항

- Node.js 20 이상
- tmux
- Claude Code CLI (`claude`)
- Windows의 경우 WSL2 (Ubuntu 권장)

### 빠른 시작

```bash
# 의존성 설치
npm install

# 서버 실행 (기본 포트 8080)
npm start

# 개발 모드 (파일 변경 감지)
npm run dev
```

브라우저에서 `http://localhost:8080` 접속 후, 콘솔에 출력된 인증 토큰을 입력하면 됩니다.

### Docker

```bash
docker compose up -d
```

### Windows (WSL2)

```powershell
# 자동 설정 스크립트
.\startup-all.ps1
```

## 환경변수

`.env` 파일 또는 환경변수로 설정합니다.

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `8080` | 서버 포트 |
| `HOST` | `0.0.0.0` | 바인드 주소 |
| `AUTH_TOKEN` | (자동 생성) | 인증 토큰 (64자 hex) |
| `E2E_ENABLED` | `false` | 종단간 암호화 활성화 |
| `WSL_DISTRO` | `Ubuntu` | WSL 배포판 이름 (Windows) |
| `CORS_ORIGIN` | `http://localhost:8080` | CORS 허용 출처 |
| `RATE_LIMIT_WINDOW` | `60000` | Rate limit 윈도우 (ms) |
| `RATE_LIMIT_MAX` | `60` | 윈도우당 최대 요청 수 |

## API 엔드포인트

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/auth-status` | X | 인증 필요 여부 확인 |
| GET | `/api/status` | O | tmux/claude 설치 상태, 플랫폼 정보 |
| GET | `/api/sessions` | O | 세션 목록 조회 |
| POST | `/api/sessions` | O | 새 세션 생성 |
| DELETE | `/api/sessions/:name` | O | 세션 종료 |
| GET | `/api/sessions/:name/key` | O | E2E 암호화 키 조회 |
| GET | `/api/processes` | O | Claude 프로세스 목록 |
| WS | `/ws?session=NAME&token=TOKEN` | O | 터미널 WebSocket 연결 |

## WebSocket 프로토콜

```jsonc
// 클라이언트 → 서버
{ "type": "input", "data": "ls -la\r" }
{ "type": "resize", "cols": 120, "rows": 40 }

// 서버 → 클라이언트 (E2E 비활성화 시)
<raw terminal output>

// 서버 → 클라이언트 (E2E 활성화 시)
[12B IV][AES-256-GCM 암호문][16B 인증 태그]
```

## 보안

- 모든 사용자 입력은 `sanitizeSessionName()`, `sanitizePath()`, `shellQuote()`를 거침
- 경로 허용/차단 목록으로 파일시스템 접근 제한
- Helmet으로 OWASP 보안 헤더 적용
- IP당 분당 60회 요청 제한
- CDN 스크립트에 SRI 무결성 해시 적용
- `eval()`, `new Function()`, `exec(userInput)` 사용 금지

## 개발

```bash
# 타입 체크
npm run typecheck

# 린트
npm run lint

# 테스트
npm test

# 포맷팅
npm run format
```

## 크로스 플랫폼 지원

| 기능 | Windows | Linux | macOS |
|------|---------|-------|-------|
| 명령 실행 | WSL2 경유 | 네이티브 bash | 네이티브 bash |
| PTY 연결 | `wsl.exe → tmux` | 직접 tmux | 직접 tmux |
| 허용 경로 | `/mnt/c/`, `/mnt/d/`, `/home/` | `/home/`, `/tmp/`, `/opt/` | `/Users/`, `/tmp/`, `/opt/` |
| 차단 경로 | `/etc`, `/root`, `/sys`, `/proc`, `/dev` | 동일 | 동일 + `/System` |

## 라이선스

MIT
