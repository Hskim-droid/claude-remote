/**
 * Configuration management
 */

import os from 'node:os';
import 'dotenv/config';

const platform = os.platform(); // 'win32', 'linux', 'darwin'

interface PlatformDefaults {
  allowedPaths: string;
  blockedPaths: string;
  defaultPath: string;
}

const platformDefaults: Record<string, PlatformDefaults> = {
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

const defaults = platformDefaults[platform] ?? platformDefaults.linux;

export interface Config {
  PLATFORM: string;
  HOST: string;
  PORT: number;
  WSL_DISTRO: string;
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW: number;
  ALLOWED_PATHS: string[];
  BLOCKED_PATHS: string[];
  DEFAULT_PATH: string;
  CORS_ORIGIN: string;
  AUTH_TOKEN: string;
  E2E_ENABLED: boolean;
}

const config: Config = {
  PLATFORM: platform,
  HOST: process.env.HOST ?? '0.0.0.0',
  PORT: parseInt(process.env.PORT ?? '8080', 10),
  WSL_DISTRO: process.env.WSL_DISTRO ?? 'Ubuntu',
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX ?? '60', 10),
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW ?? '60', 10),
  ALLOWED_PATHS: (process.env.ALLOWED_PATHS ?? defaults.allowedPaths).split(',').map(p => p.trim()),
  BLOCKED_PATHS: (process.env.BLOCKED_PATHS ?? defaults.blockedPaths).split(',').map(p => p.trim()),
  DEFAULT_PATH: process.env.DEFAULT_PATH ?? defaults.defaultPath,
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '',
  AUTH_TOKEN: process.env.AUTH_TOKEN ?? '',
  E2E_ENABLED: process.env.E2E_ENABLED === 'true',
};

export default config;
