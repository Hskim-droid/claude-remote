import { describe, it, expect } from 'vitest';
import config from '../server/config.js';

describe('config', () => {
  it('has required fields', () => {
    expect(config.PLATFORM).toBeDefined();
    expect(config.HOST).toBeDefined();
    expect(config.PORT).toBeTypeOf('number');
    expect(config.RATE_LIMIT_MAX).toBeTypeOf('number');
    expect(config.RATE_LIMIT_WINDOW).toBeTypeOf('number');
    expect(config.ALLOWED_PATHS).toBeInstanceOf(Array);
    expect(config.BLOCKED_PATHS).toBeInstanceOf(Array);
    expect(config.DEFAULT_PATH).toBeDefined();
  });

  it('has valid port number', () => {
    expect(config.PORT).toBeGreaterThan(0);
    expect(config.PORT).toBeLessThanOrEqual(65535);
  });

  it('has non-empty allowed/blocked paths', () => {
    expect(config.ALLOWED_PATHS.length).toBeGreaterThan(0);
    expect(config.BLOCKED_PATHS.length).toBeGreaterThan(0);
  });

  it('detects platform correctly', () => {
    expect(['win32', 'linux', 'darwin']).toContain(config.PLATFORM);
  });
});
