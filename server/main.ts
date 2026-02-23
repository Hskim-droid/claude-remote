/**
 * Claude Code Remote - Main Entry Point
 * Cross-platform web terminal (Windows/WSL2, Linux, macOS)
 */

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { WebSocketServer, type WebSocket } from 'ws';
import config from './config.js';
import apiRouter from './api.js';
import { attachSession } from './pty-manager.js';
import { sanitizeSessionName } from './security.js';
import { authMiddleware, wsVerifyClient, getAuthToken } from './auth.js';
import sessionStore from './session-store.js';
import * as executor from './executor.js';
import { base64UrlToKey, encrypt, decrypt } from './crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);

// --- Security middleware ---

// OWASP security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));

// CORS
const corsOrigins = config.CORS_ORIGIN
  ? config.CORS_ORIGIN.split(',').map(s => s.trim())
  : [`http://localhost:${config.PORT}`];

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
}));

// Rate limiting
app.use('/api', rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW * 1000,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Body parser
app.use(express.json());

// --- Authentication ---
app.use('/api', authMiddleware);

// --- Routes ---
app.use('/api', apiRouter);

// Static files
const staticPath = path.join(__dirname, '..', 'static');
app.use(express.static(staticPath));

// Terminal page route
app.get('/terminal', (_req, res) => {
  res.sendFile(path.join(staticPath, 'terminal.html'));
});

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// --- WebSocket server (node-pty) ---

const wss = new WebSocketServer({
  server,
  path: '/ws',
  verifyClient: wsVerifyClient,
});

// --- WebSocket ping/pong for dead connection detection ---
const PING_INTERVAL = 30000;
const PONG_TIMEOUT = 10000;

const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const extWs = ws as WebSocket & { isAlive?: boolean };
    if (extWs.isAlive === false) {
      ws.terminate();
      return;
    }
    extWs.isAlive = false;
    ws.ping();
  });
}, PING_INTERVAL);

wss.on('close', () => {
  clearInterval(pingInterval);
});

wss.on('connection', async (ws: WebSocket, req) => {
  // Mark connection as alive for ping/pong
  const extWs = ws as WebSocket & { isAlive?: boolean };
  extWs.isAlive = true;
  ws.on('pong', () => {
    extWs.isAlive = true;
  });

  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const sessionParam = url.searchParams.get('session');
  const safeName = sanitizeSessionName(sessionParam);

  if (!safeName) {
    ws.close(4400, 'Invalid session name');
    return;
  }

  // Verify session exists
  if (!(await executor.sessionExists(safeName))) {
    ws.close(4404, 'Session not found');
    return;
  }

  // Resolve E2E encryption key for this session
  let e2eKey: Buffer | null = null;
  if (config.E2E_ENABLED) {
    const keyStr = sessionStore.getSessionKey(safeName);
    if (keyStr) {
      try {
        e2eKey = base64UrlToKey(keyStr);
      } catch {
        ws.close(4500, 'Invalid encryption key');
        return;
      }
    }
  }

  // Attach PTY to tmux session
  let ptySession;
  try {
    ptySession = attachSession(safeName);
  } catch (err) {
    ws.close(4500, 'Failed to attach PTY');
    return;
  }

  // PTY → WebSocket (terminal output)
  ptySession.onData((data: string) => {
    if (ws.readyState === ws.OPEN) {
      if (e2eKey) {
        const payload = JSON.stringify({ type: 'output', data });
        ws.send(encrypt(e2eKey, payload));
      } else {
        ws.send(data);
      }
    }
  });

  // WebSocket → PTY (user input)
  ws.on('message', (raw: Buffer | string) => {
    try {
      let msg;
      if (e2eKey) {
        const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        const decrypted = decrypt(e2eKey, buf);
        msg = JSON.parse(decrypted.toString('utf-8'));
      } else {
        msg = JSON.parse(raw.toString());
      }

      if (msg.type === 'input' && typeof msg.data === 'string') {
        ptySession.write(msg.data);
      } else if (msg.type === 'resize' && typeof msg.cols === 'number' && typeof msg.rows === 'number') {
        ptySession.resize(msg.cols, msg.rows);
      }
    } catch {
      if (!e2eKey) {
        // Non-JSON: treat as raw input for backwards compatibility (plaintext mode only)
        ptySession.write(raw.toString());
      }
      // In E2E mode, silently drop malformed/tampered messages
    }
  });

  // Cleanup on disconnect
  ws.on('close', () => {
    ptySession.destroy();
  });

  ws.on('error', () => {
    ptySession.destroy();
  });

  // Handle PTY exit
  ptySession.pty.onExit(() => {
    if (ws.readyState === ws.OPEN) {
      ws.close(4000, 'PTY exited');
    }
  });
});

// --- Graceful shutdown ---
function shutdown(): void {
  console.log('\nShutting down...');
  sessionStore.flushAll();
  clearInterval(pingInterval);
  wss.close();
  server.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// --- Start server ---

const platformLabel: Record<string, string> = {
  win32: 'Windows (WSL2)',
  linux: 'Linux',
  darwin: 'macOS',
};

async function start(): Promise<void> {
  // Initialize auth token (auto-generates if not set)
  getAuthToken();

  // Reconcile sessions with tmux
  await sessionStore.reconcileSessions();

  server.listen(config.PORT, config.HOST, () => {
    console.log('='.repeat(50));
    console.log('Claude Code Remote - Server');
    console.log('='.repeat(50));
    console.log(`Platform:  ${platformLabel[config.PLATFORM] ?? config.PLATFORM}`);
    console.log(`UI:        http://localhost:${config.PORT}`);
    console.log(`WebSocket: ws://localhost:${config.PORT}/ws`);
    console.log(`Auth:      ${config.AUTH_TOKEN ? 'configured' : 'auto-generated'}`);
    console.log(`E2E:       ${config.E2E_ENABLED ? 'enabled (AES-256-GCM)' : 'disabled'}`);
    console.log('='.repeat(50));
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
