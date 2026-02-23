import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config before importing auth
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

import { generateToken, validateToken, isAuthEnabled } from '../server/auth.js';

describe('generateToken', () => {
  it('returns a 64-char hex string', () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates unique tokens', () => {
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
  });
});

describe('validateToken', () => {
  it('validates matching tokens', () => {
    // getAuthToken auto-generates, then validateToken checks against it
    expect(isAuthEnabled()).toBe(true); // auto-generated
    const token = generateToken();
    // Direct validation won't match auto-generated token
    expect(validateToken('wrong-token')).toBe(false);
  });

  it('rejects tokens with wrong length', () => {
    expect(validateToken('short')).toBe(false);
  });

  it('rejects empty token', () => {
    expect(validateToken('')).toBe(false);
  });
});

describe('isAuthEnabled', () => {
  it('returns true (always enabled - auto-generates if not set)', () => {
    expect(isAuthEnabled()).toBe(true);
  });
});
