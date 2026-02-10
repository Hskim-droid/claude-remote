/**
 * Configuration management
 * Loads from environment variables with sensible defaults
 */

require('dotenv').config();

const config = {
    // Server
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT, 10) || 8080,

    // WSL
    wslDistro: process.env.WSL_DISTRO || 'Ubuntu',

    // ttyd
    ttydPort: parseInt(process.env.TTYD_PORT, 10) || 7681,
    ttydAuthUser: process.env.TTYD_AUTH_USER || '',
    ttydAuthPass: process.env.TTYD_AUTH_PASS || '',

    // Security
    allowedPaths: (process.env.ALLOWED_PATHS || '/mnt/c/,/mnt/d/,/home/').split(','),
    blockedPaths: (process.env.BLOCKED_PATHS || '/etc,/root,/sys,/proc,/dev').split(','),
    sessionNameMaxLength: parseInt(process.env.SESSION_NAME_MAX_LENGTH, 10) || 32,

    // Rate limiting
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 60,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 60,
};

module.exports = config;
