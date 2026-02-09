/**
 * Configuration management
 */

const os = require('os');
require('dotenv').config();

const platform = os.platform(); // 'win32', 'linux', 'darwin'

// Platform-specific defaults
const platformDefaults = {
  win32: {
    allowedPaths: '/mnt/c/,/mnt/d/,/home/',
    blockedPaths: '/etc,/root,/sys,/proc,/dev',
    defaultPath: '/mnt/c/Users',
  },
  linux: {
    allowedPaths: '/home/,/tmp/,/opt/,/var/',
    blockedPaths: '/etc,/root,/sys,/proc,/dev',
    defaultPath: '/home/',
  },
  darwin: {
    allowedPaths: '/Users/,/tmp/,/opt/,/var/',
    blockedPaths: '/etc,/root,/sys,/proc,/dev,/System',
    defaultPath: '/Users/',
  },
};

const defaults = platformDefaults[platform] || platformDefaults.linux;

const config = {
  // Platform
  PLATFORM: platform,

  // Server
  HOST: process.env.HOST || '0.0.0.0',
  PORT: parseInt(process.env.PORT) || 8080,

  // WSL (Windows only)
  WSL_DISTRO: process.env.WSL_DISTRO || 'Ubuntu',

  // ttyd
  TTYD_PORT: parseInt(process.env.TTYD_PORT) || 7681,
  TTYD_AUTH_USER: process.env.TTYD_AUTH_USER || '',
  TTYD_AUTH_PASS: process.env.TTYD_AUTH_PASS || '',

  // Security
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 60,
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 60,

  // Paths
  ALLOWED_PATHS: (process.env.ALLOWED_PATHS || defaults.allowedPaths).split(',').map(p => p.trim()),
  BLOCKED_PATHS: (process.env.BLOCKED_PATHS || defaults.blockedPaths).split(',').map(p => p.trim()),
  DEFAULT_PATH: process.env.DEFAULT_PATH || defaults.defaultPath,
};

module.exports = config;
