/**
 * Authentication module
 * Token-based auth for HTTP and WebSocket connections.
 * Patterns from claude-code-web (Bearer token) and ttyd (verifyClient).
 */

import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { IncomingMessage } from 'node:http';
import config from './config.js';

let activeToken: string = config.AUTH_TOKEN;

/**
 * Generate a cryptographically secure token
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get the active auth token, auto-generating one if not configured
 */
export function getAuthToken(): string {
  if (!activeToken) {
    activeToken = generateToken();
    console.log('');
    console.log('Auth token (auto-generated):');
    console.log(`  ${activeToken}`);
    console.log('');
    console.log('Set AUTH_TOKEN env var to use a fixed token.');
    console.log('');
  }
  return activeToken;
}

/**
 * Check if authentication is enabled
 */
export function isAuthEnabled(): boolean {
  return !!getAuthToken();
}

/**
 * Extract token from request (Bearer header or query param)
 */
function extractToken(req: Request | IncomingMessage): string | null {
  // Check Authorization header
  const authHeader = 'headers' in req ? req.headers.authorization : undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check query parameter
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  return url.searchParams.get('token');
}

/**
 * Validate a token against the active token using timing-safe comparison
 */
export function validateToken(provided: string): boolean {
  const expected = getAuthToken();
  if (!expected) return true;
  if (provided.length !== expected.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

/**
 * Express middleware for HTTP route authentication.
 * Skips auth for /api/auth-status endpoint.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Always allow auth-status check
  if (req.path === '/auth-status') {
    next();
    return;
  }

  const token = extractToken(req);

  if (!token || !validateToken(token)) {
    res.status(401).json({ error: 'Unauthorized', message: 'Valid authentication token required' });
    return;
  }

  next();
}

/**
 * WebSocket verifyClient callback for ws library.
 * Validates token during HTTP upgrade before connection is established.
 */
export function wsVerifyClient(info: { req: IncomingMessage }): boolean {
  const url = new URL(info.req.url ?? '/', `http://${info.req.headers.host ?? 'localhost'}`);
  const token = url.searchParams.get('token');

  if (!token) return false;
  return validateToken(token);
}
