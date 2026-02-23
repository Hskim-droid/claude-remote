import { describe, it, expect } from 'vitest';
import { sanitizeSessionName, sanitizePath, shellQuote } from '../server/security.js';

describe('sanitizeSessionName', () => {
  it('accepts valid names', () => {
    expect(sanitizeSessionName('session-1')).toBe('session-1');
    expect(sanitizeSessionName('test_name')).toBe('test_name');
    expect(sanitizeSessionName('abc123')).toBe('abc123');
    expect(sanitizeSessionName('A')).toBe('A');
  });

  it('accepts max length name (32 chars)', () => {
    const name = 'a'.repeat(32);
    expect(sanitizeSessionName(name)).toBe(name);
  });

  it('rejects names exceeding 32 chars', () => {
    expect(sanitizeSessionName('a'.repeat(33))).toBeNull();
  });

  it('rejects empty or null', () => {
    expect(sanitizeSessionName('')).toBeNull();
    expect(sanitizeSessionName(null)).toBeNull();
    expect(sanitizeSessionName(undefined)).toBeNull();
  });

  it('rejects special characters', () => {
    expect(sanitizeSessionName('session@1')).toBeNull();
    expect(sanitizeSessionName('session 1')).toBeNull();
    expect(sanitizeSessionName('session/1')).toBeNull();
    expect(sanitizeSessionName('session.1')).toBeNull();
    expect(sanitizeSessionName('../etc')).toBeNull();
    expect(sanitizeSessionName('$(cmd)')).toBeNull();
  });
});

describe('sanitizePath', () => {
  it('accepts allowed paths', () => {
    // /home/ is in allowed paths on all platforms (win32, linux, darwin)
    expect(sanitizePath('/home/user')).toBe('/home/user');
    expect(sanitizePath('/home/work/project')).toBe('/home/work/project');
  });

  it('rejects path traversal', () => {
    expect(sanitizePath('/home/../etc/passwd')).toBeNull();
    expect(sanitizePath('/home/user/../../root')).toBeNull();
  });

  it('rejects blocked paths', () => {
    expect(sanitizePath('/etc/passwd')).toBeNull();
    expect(sanitizePath('/root/.ssh')).toBeNull();
    expect(sanitizePath('/proc/1/status')).toBeNull();
  });

  it('rejects paths not in allowed list', () => {
    expect(sanitizePath('/usr/bin/node')).toBeNull();
    expect(sanitizePath('/sbin/init')).toBeNull();
  });

  it('normalizes backslashes', () => {
    expect(sanitizePath('/home\\user')).toBe('/home/user');
  });

  it('rejects null/empty', () => {
    expect(sanitizePath(null)).toBeNull();
    expect(sanitizePath('')).toBeNull();
    expect(sanitizePath(undefined)).toBeNull();
  });
});

describe('shellQuote', () => {
  it('wraps simple values in single quotes', () => {
    expect(shellQuote('hello')).toBe("'hello'");
    expect(shellQuote('/home/user')).toBe("'/home/user'");
  });

  it('escapes single quotes', () => {
    expect(shellQuote("it's")).toBe("'it'\\''s'");
  });

  it('handles empty/null values', () => {
    expect(shellQuote('')).toBe("''");
    expect(shellQuote(null)).toBe("''");
    expect(shellQuote(undefined)).toBe("''");
  });

  it('prevents command injection', () => {
    const malicious = '$(rm -rf /)';
    const quoted = shellQuote(malicious);
    expect(quoted).toBe("'$(rm -rf /)'");
    // Inside single quotes, $ and () are literal
  });

  it('handles backtick injection', () => {
    const quoted = shellQuote('`whoami`');
    expect(quoted).toBe("'`whoami`'");
  });
});
