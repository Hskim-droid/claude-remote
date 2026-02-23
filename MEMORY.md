# Development Decisions Log

Key decisions made during the v0.1.0 modernization (6-phase rewrite).

## ttyd → node-pty (Phase 3)

**Problem**: ttyd was an external binary spawned as a child process, with a hand-rolled HTTP/WebSocket proxy forwarding traffic. This is non-standard — no major project (VS Code, Theia, code-server) uses this pattern.

**Decision**: Replace with node-pty, which provides in-process PTY. WebSocket server (ws) connects directly to node-pty. This is the standard approach used by VS Code terminal, Theia, Wetty.

**Impact**: Removed `startTtyd()`, ttyd port config, `POST /api/ttyd/start` endpoint, ttyd binary dependency.

## WebSocket Protocol Change (Phase 3)

**Before** (ttyd protocol):
- Auth: `ws.send(JSON.stringify({AuthToken:''}))`
- Input: `'0' + data` (prefix byte)
- Resize: `'1' + JSON.stringify({columns,rows})`

**After** (direct JSON):
- Input: `{type:'input', data}`
- Resize: `{type:'resize', cols, rows}`
- Output: raw PTY data (no wrapper)

## Platform-specific Path Defaults (Phase 1)

Each platform has different safe default paths:
- **win32**: `/mnt/c/,/mnt/d/,/home/` (WSL mount points)
- **linux**: `/home/,/tmp/,/opt/,/var/`
- **darwin**: `/Users/,/tmp/,/opt/,/var/`

All platforms block: `/etc,/root,/sys,/proc,/dev`

## xterm.js 5 → 6 (Phase 5)

Package names changed from `xterm` to `@xterm/xterm` (scoped packages). Addon names also changed. Added WebGL addon for GPU-accelerated rendering with canvas fallback.

## Test Platform Dependency Issue

`sanitizePath('/tmp/work')` test failed on Windows because `/tmp/` is not in win32 allowed paths. **Fix**: Use `/home/` paths in tests since `/home/` is in all platform defaults.

**Lesson**: Always use platform-agnostic test data, or mock config for platform-specific tests.

## CommonJS → ESM (Phase 1)

All `require()` replaced with `import`. All `module.exports` replaced with `export`/`export default`. `package.json` got `"type": "module"`. TypeScript with `module: "ES2022"`.

## Custom RateLimiter → express-rate-limit (Phase 2)

Removed hand-rolled `RateLimiter` class from security.ts. Replaced with battle-tested `express-rate-limit` middleware in main.ts. Simpler, more reliable, industry standard.

---

# TODO (다음 세션에서 이어서)

## 완료된 작업

### 6단계 현대화 (전부 완료)
- [x] Phase 1: TypeScript + ESM 전환
- [x] Phase 2: 보안 강화 (helmet, CORS, rate-limit, SRI)
- [x] Phase 3: node-pty 아키텍처 (ttyd 제거)
- [x] Phase 4: Vitest 테스트 (20/20 pass)
- [x] Phase 5: xterm.js 6.0 + WebGL
- [x] Phase 6: Docker + CI

### manager-orchestrator 개념 적용 (전부 완료)
- [x] CLAUDE.md 생성 (아키텍처, 파일 경계, 컨벤션, 보안 규칙, FSoT 원칙)
- [x] MEMORY.md 생성 (의사결정 로그)
- [x] Hook: tsc auto-validate (PostToolUse, Edit|Write)
- [x] Hook: vitest auto-test (PostToolUse, Edit|Write)
- [x] Hook: security-scan.sh (eval, Function, 하드코딩 비밀값, exec 탐지)
- [x] Hook: context-status.sh (UserPromptSubmit, 빌드/테스트/git 상태 주입)
- [x] .claude/settings.json에 모든 hooks 등록 완료

## 아직 안 한 작업

### 검증 필요
- [ ] `npx vitest run` 재확인 (마지막 실행이 중단됨)
- [ ] `npx tsc --noEmit` — 마지막 실행 통과 확인됨, 재확인 권장
- [ ] security-scan.sh 실제 동작 테스트 (eval 포함 코드 작성 후 차단되는지)
- [ ] context-status.sh 실제 동작 테스트 (프롬프트 제출 시 상태 표시되는지)

### 커밋 대기
- [ ] 전체 변경사항 git commit (6단계 현대화 + hooks 전부 미커밋 상태)
  - 삭제: server/*.js (6개), server/wsl.js
  - 신규: server/*.ts (6개), tests/ (2개), CLAUDE.md, MEMORY.md
  - 신규: .claude/settings.json, .claude/hooks/ (2개 스크립트)
  - 수정: package.json, static/*.html, .eslintrc.json, .env.example, Dockerfile 등
  - 불필요 파일 삭제: `nul` (빈 파일, 실수로 생성됨)

### 선택적 추가 작업
- [ ] CHANGELOG.md 업데이트 (v0.1.0 TypeScript rewrite 기록)
- [ ] README.md 업데이트 (TypeScript, node-pty, Docker 반영)
- [ ] tests/api.test.ts 추가 (API 통합 테스트 — plan에 있었으나 미구현)
- [ ] tests/pty-manager.test.ts 추가 (PTY 유닛 테스트 — plan에 있었으나 미구현)
