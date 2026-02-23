/**
 * Security utilities
 */

import config from './config.js';

/**
 * Sanitize session name
 */
export function sanitizeSessionName(name: string | undefined | null): string | null {
  if (!name || typeof name !== 'string') {
    return null;
  }

  // 1-32 chars, alphanumeric + hyphen + underscore only
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(name)) {
    return null;
  }

  return name;
}

/**
 * Sanitize and validate path
 */
export function sanitizePath(inputPath: string | undefined | null): string | null {
  if (!inputPath || typeof inputPath !== 'string') {
    return null;
  }

  // Normalize path
  const normalized = inputPath.replace(/\\/g, '/');

  // Block path traversal
  if (normalized.includes('..')) {
    return null;
  }

  // Check allowed paths
  const isAllowed = config.ALLOWED_PATHS.some(p => normalized.startsWith(p));
  if (!isAllowed) {
    return null;
  }

  // Check blocked paths
  const isBlocked = config.BLOCKED_PATHS.some(p => normalized.startsWith(p));
  if (isBlocked) {
    return null;
  }

  return normalized;
}

/**
 * Quote string for shell command
 */
export function shellQuote(value: string | undefined | null): string {
  if (!value) return "''";
  // Escape single quotes and wrap in single quotes
  return "'" + value.replace(/'/g, "'\\''") + "'";
}
