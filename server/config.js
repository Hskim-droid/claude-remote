/**
 * Configuration management
 */

require('dotenv').config();

const config = {
  // Server
  HOST: process.env.HOST || '0.0.0.0',
  PORT: parseInt(process.env.PORT) || 8080,

  // WSL
  WSL_DISTRO: process.env.WSL_DISTRO || 'Ubuntu',

  // ttyd
  TTYD_PORT: parseInt(process.env.TTYD_PORT) || 7681,
  TTYD_AUTH_USER: process.env.TTYD_AUTH_USER || '',
  TTYD_AUTH_PASS: process.env.TTYD_AUTH_PASS || '',

  // Security
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 60,
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 60,

  // Paths
  ALLOWED_PATHS: (process.env.ALLOWED_PATHS || '/mnt/c/,/mnt/d/,/home/').split(',').map(p => p.trim()),
  BLOCKED_PATHS: (process.env.BLOCKED_PATHS || '/etc,/root,/sys,/proc,/dev').split(',').map(p => p.trim()),
};

module.exports = config;
