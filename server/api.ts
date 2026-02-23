/**
 * API route handlers
 */

import express, { type Request, type Response } from 'express';
import config from './config.js';
import { sanitizeSessionName, sanitizePath } from './security.js';
import { isAuthEnabled } from './auth.js';
import sessionStore from './session-store.js';
import * as executor from './executor.js';

const router = express.Router();

/**
 * GET /api/auth-status - Check if authentication is required
 * This endpoint is NOT protected by auth middleware.
 */
router.get('/auth-status', (_req: Request, res: Response) => {
  res.json({ authRequired: isAuthEnabled() });
});

/**
 * GET /api/status - System status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await executor.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/sessions - List sessions (tmux + stored metadata)
 */
router.get('/sessions', async (_req: Request, res: Response) => {
  try {
    const tmuxSessions = await executor.listSessions();
    const stored = sessionStore.getSessions();

    // Merge tmux live data with stored metadata
    const sessions = tmuxSessions.map(s => ({
      ...s,
      workingDir: stored[s.name]?.workingDir ?? '',
      createdAt: stored[s.name]?.createdAt ?? '',
    }));

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/processes - List all Claude processes (tmux + native)
 */
router.get('/processes', async (_req: Request, res: Response) => {
  try {
    const processes = await executor.listClaudeProcesses();
    res.json({ processes });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/sessions - Create session
 */
router.post('/sessions', async (req: Request, res: Response) => {
  let { name, workingDir } = req.body ?? {};

  // Auto-generate name if not provided
  if (!name) {
    const sessions = await executor.listSessions();
    const existing = sessions.map(s => s.name);
    let num = 1;
    while (existing.includes(`session-${num}`)) {
      num++;
    }
    name = `session-${num}`;
  }

  // Validate session name
  const safeName = sanitizeSessionName(name);
  if (!safeName) {
    res.status(400).json({ error: 'Invalid session name (1-32 chars, alphanumeric/hyphen/underscore only)' });
    return;
  }

  // Validate working directory
  workingDir = workingDir || config.DEFAULT_PATH;
  const safePath = sanitizePath(workingDir);
  if (!safePath) {
    res.status(400).json({ error: 'Invalid or blocked path' });
    return;
  }

  // Check if session already exists
  if (await executor.sessionExists(safeName)) {
    res.status(409).json({ error: 'Session already exists' });
    return;
  }

  // Create session
  const result = await executor.createSession(safeName, safePath);
  if (!result.success) {
    res.status(500).json({ error: result.error });
    return;
  }

  // Persist to session store
  sessionStore.setSession(safeName, safePath);

  const response: Record<string, unknown> = {
    success: true,
    session: {
      name: safeName,
      workingDir: safePath,
    },
  };

  // Include e2eUrl with encryption key in URL fragment when E2E is enabled
  if (config.E2E_ENABLED) {
    const key = sessionStore.getSessionKey(safeName);
    if (key) {
      response.e2eUrl = `/terminal?session=${encodeURIComponent(safeName)}#${key}`;
    }
  }

  res.json(response);
});

/**
 * GET /api/sessions/:name/key - Get encryption key for a session (E2E only)
 * Returns the key once; intended for authenticated clients needing to reconnect.
 */
router.get('/sessions/:name/key', async (req: Request, res: Response) => {
  if (!config.E2E_ENABLED) {
    res.status(404).json({ error: 'E2E encryption is not enabled' });
    return;
  }

  const safeName = sanitizeSessionName(req.params.name);
  if (!safeName) {
    res.status(400).json({ error: 'Invalid session name' });
    return;
  }

  if (!(await executor.sessionExists(safeName))) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const key = sessionStore.getSessionKey(safeName);
  if (!key) {
    res.status(404).json({ error: 'No encryption key for session' });
    return;
  }

  res.json({ key });
});

/**
 * DELETE /api/sessions/:name - Delete session
 */
router.delete('/sessions/:name', async (req: Request, res: Response) => {
  const { name } = req.params;

  const safeName = sanitizeSessionName(name);
  if (!safeName) {
    res.status(400).json({ error: 'Invalid session name' });
    return;
  }

  if (!(await executor.sessionExists(safeName))) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const result = await executor.killSession(safeName);
  if (!result.success) {
    res.status(500).json({ error: result.error });
    return;
  }

  // Remove from session store
  sessionStore.removeSession(safeName);

  res.json({ success: true });
});

export default router;
