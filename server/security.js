/**
 * Security utilities
 */

const config = require('./config');

/**
 * Sanitize session name
 * @param {string} name
 * @returns {string|null}
 */
function sanitizeSessionName(name) {
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
 * @param {string} path
 * @returns {string|null}
 */
function sanitizePath(path) {
  if (!path || typeof path !== 'string') {
    return null;
  }

  // Normalize path
  let normalized = path.replace(/\\/g, '/');

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
 * @param {string} value
 * @returns {string}
 */
function shellQuote(value) {
  if (!value) return "''";
  // Escape single quotes and wrap in single quotes
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

/**
 * Simple rate limiter
 */
class RateLimiter {
  constructor(maxRequests = 60, windowSeconds = 60) {
    this.maxRequests = maxRequests;
    this.window = windowSeconds * 1000;
    this.requests = new Map();
  }

  isAllowed(ip) {
    const now = Date.now();

    if (!this.requests.has(ip)) {
      this.requests.set(ip, []);
    }

    const timestamps = this.requests.get(ip);

    // Remove old requests
    const valid = timestamps.filter(t => now - t < this.window);
    this.requests.set(ip, valid);

    if (valid.length >= this.maxRequests) {
      return false;
    }

    valid.push(now);
    return true;
  }

  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [ip, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter(t => now - t < this.window);
      if (valid.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, valid);
      }
    }
  }
}

module.exports = {
  sanitizeSessionName,
  sanitizePath,
  shellQuote,
  RateLimiter,
};
