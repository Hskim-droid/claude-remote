/**
 * Security utilities
 * - Input validation
 * - Path sanitization
 * - Rate limiting
 */

const path = require('path');
const config = require('./config');

/**
 * Validate and sanitize session name
 * @param {string} name - Session name to validate
 * @returns {string|null} - Sanitized name or null if invalid
 */
function sanitizeSessionName(name) {
    if (!name || typeof name !== 'string') {
        return null;
    }

    // 1-32 chars, alphanumeric + hyphen + underscore only
    const pattern = /^[a-zA-Z0-9_-]{1,32}$/;
    if (!pattern.test(name)) {
        return null;
    }

    return name;
}

/**
 * Validate and sanitize file path
 * @param {string} inputPath - Path to validate
 * @returns {string|null} - Sanitized path or null if invalid
 */
function sanitizePath(inputPath) {
    if (!inputPath || typeof inputPath !== 'string') {
        return null;
    }

    // Normalize path
    const normalized = path.posix.normalize(inputPath);

    // Block path traversal
    if (inputPath.includes('..') || normalized.includes('..')) {
        return null;
    }

    // Check allowed paths
    const isAllowed = config.allowedPaths.some(p => normalized.startsWith(p));
    if (!isAllowed) {
        return null;
    }

    // Check blocked paths
    const isBlocked = config.blockedPaths.some(p => normalized.startsWith(p));
    if (isBlocked) {
        return null;
    }

    return normalized;
}

/**
 * Escape string for shell command
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function shellEscape(str) {
    if (!str) return "''";
    // Use single quotes and escape any single quotes in the string
    return "'" + str.replace(/'/g, "'\\''") + "'";
}

/**
 * Simple rate limiter with automatic cleanup
 */
class RateLimiter {
    constructor(maxRequests = config.rateLimitMax, windowSeconds = config.rateLimitWindow) {
        this.maxRequests = maxRequests;
        this.windowMs = windowSeconds * 1000;
        this.requests = new Map(); // ip -> timestamps[]

        // Cleanup old entries every 5 minutes
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    /**
     * Check if request is allowed
     * @param {string} ip - Client IP
     * @returns {boolean} - True if allowed
     */
    isAllowed(ip) {
        const now = Date.now();

        if (!this.requests.has(ip)) {
            this.requests.set(ip, []);
        }

        const timestamps = this.requests.get(ip);

        // Remove old timestamps
        const validTimestamps = timestamps.filter(t => now - t < this.windowMs);

        if (validTimestamps.length >= this.maxRequests) {
            this.requests.set(ip, validTimestamps);
            return false;
        }

        validTimestamps.push(now);
        this.requests.set(ip, validTimestamps);
        return true;
    }

    /**
     * Cleanup old entries to prevent memory leak
     */
    cleanup() {
        const now = Date.now();
        for (const [ip, timestamps] of this.requests) {
            const valid = timestamps.filter(t => now - t < this.windowMs);
            if (valid.length === 0) {
                this.requests.delete(ip);
            } else {
                this.requests.set(ip, valid);
            }
        }
    }

    /**
     * Stop cleanup interval
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }

    /**
     * Express middleware
     */
    middleware() {
        return (req, res, next) => {
            const ip = req.ip || req.connection.remoteAddress;
            if (!this.isAllowed(ip)) {
                return res.status(429).json({ error: 'Too many requests' });
            }
            next();
        };
    }
}

module.exports = {
    sanitizeSessionName,
    sanitizePath,
    shellEscape,
    RateLimiter,
};
