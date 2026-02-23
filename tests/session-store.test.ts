import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Mock executor module
vi.mock('../server/executor.js', () => ({
  listSessions: vi.fn().mockResolvedValue([]),
}));

// Mock config
vi.mock('../server/config.js', () => ({
  default: {
    AUTH_TOKEN: '',
    PORT: 8080,
    HOST: '0.0.0.0',
    PLATFORM: 'linux',
    WSL_DISTRO: 'Ubuntu',
    RATE_LIMIT_MAX: 60,
    RATE_LIMIT_WINDOW: 60,
    ALLOWED_PATHS: ['/home/'],
    BLOCKED_PATHS: ['/etc'],
    DEFAULT_PATH: '/home/',
    CORS_ORIGIN: '',
  },
}));

describe('SessionStore', () => {
  const dataDir = path.join(__dirname, '..', 'data');
  const storePath = path.join(dataDir, 'sessions.json');
  const backupPath = storePath + '.bak';

  beforeEach(() => {
    // Clean up data files
    try { fs.unlinkSync(storePath); } catch { /* */ }
    try { fs.unlinkSync(backupPath); } catch { /* */ }
    try { fs.unlinkSync(storePath + '.tmp'); } catch { /* */ }
    // Reset module cache to get fresh instance
    vi.resetModules();
  });

  afterEach(() => {
    try { fs.unlinkSync(storePath); } catch { /* */ }
    try { fs.unlinkSync(backupPath); } catch { /* */ }
    try { fs.unlinkSync(storePath + '.tmp'); } catch { /* */ }
  });

  it('creates data directory if missing', async () => {
    const { default: store } = await import('../server/session-store.js');
    expect(fs.existsSync(dataDir)).toBe(true);
  });

  it('sets and gets sessions', async () => {
    const { default: store } = await import('../server/session-store.js');
    store.setSession('test-1', '/home/user');

    const sessions = store.getSessions();
    expect(sessions['test-1']).toBeDefined();
    expect(sessions['test-1'].name).toBe('test-1');
    expect(sessions['test-1'].workingDir).toBe('/home/user');
    expect(sessions['test-1'].status).toBe('running');
  });

  it('removes sessions', async () => {
    const { default: store } = await import('../server/session-store.js');
    store.setSession('test-1', '/home/user');
    store.removeSession('test-1');

    const sessions = store.getSessions();
    expect(sessions['test-1']).toBeUndefined();
  });

  it('flushes to disk', async () => {
    const { default: store } = await import('../server/session-store.js');
    store.setSession('test-1', '/home/user');
    store.flushAll();

    expect(fs.existsSync(storePath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    expect(data.sessions['test-1'].name).toBe('test-1');
  });

  it('preserves createdAt on update', async () => {
    const { default: store } = await import('../server/session-store.js');
    store.setSession('test-1', '/home/user');
    const firstCreated = store.getSessions()['test-1'].createdAt;

    // Update same session
    store.setSession('test-1', '/home/other');
    const secondCreated = store.getSessions()['test-1'].createdAt;

    expect(secondCreated).toBe(firstCreated);
    expect(store.getSessions()['test-1'].workingDir).toBe('/home/other');
  });

  it('returns copy of sessions (not reference)', async () => {
    const { default: store } = await import('../server/session-store.js');
    store.setSession('test-1', '/home/user');

    const sessions = store.getSessions();
    delete sessions['test-1'];

    // Original should still have it
    expect(store.getSessions()['test-1']).toBeDefined();
  });
});
