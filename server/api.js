/**
 * API route handlers
 */

const express = require('express');
const config = require('./config');
const { sanitizeSessionName, sanitizePath, RateLimiter } = require('./security');
const wsl = require('./wsl');

const router = express.Router();
const rateLimiter = new RateLimiter(config.RATE_LIMIT_MAX, config.RATE_LIMIT_WINDOW);

// Cleanup rate limiter every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

/**
 * Rate limiting middleware
 */
router.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!rateLimiter.isAllowed(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
});

/**
 * GET /api/status - System status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await wsl.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/sessions - List sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await wsl.listSessions();
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/sessions - Create session
 */
router.post('/sessions', async (req, res) => {
  let { name, workingDir } = req.body || {};

  // Auto-generate name if not provided
  if (!name) {
    name = `claude-${Date.now()}`;
  }

  // Validate session name
  const safeName = sanitizeSessionName(name);
  if (!safeName) {
    return res.status(400).json({ error: 'Invalid session name (1-32 chars, alphanumeric/hyphen/underscore only)' });
  }

  // Validate working directory
  workingDir = workingDir || '/mnt/c/Users';
  const safePath = sanitizePath(workingDir);
  if (!safePath) {
    return res.status(400).json({ error: 'Invalid or blocked path' });
  }

  // Check if session already exists
  if (await wsl.sessionExists(safeName)) {
    return res.status(409).json({ error: 'Session already exists' });
  }

  // Create session
  const result = await wsl.createSession(safeName, safePath);
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  res.json({
    success: true,
    session: {
      name: safeName,
      workingDir: safePath,
    },
  });
});

/**
 * DELETE /api/sessions/:name - Delete session
 */
router.delete('/sessions/:name', async (req, res) => {
  const { name } = req.params;

  // Validate session name
  const safeName = sanitizeSessionName(name);
  if (!safeName) {
    return res.status(400).json({ error: 'Invalid session name' });
  }

  // Check if session exists
  if (!(await wsl.sessionExists(safeName))) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Kill session
  const result = await wsl.killSession(safeName);
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  res.json({ success: true });
});

/**
 * POST /api/ttyd/start - Start ttyd for session
 */
router.post('/ttyd/start', async (req, res) => {
  const { session } = req.body || {};

  if (!session) {
    return res.status(400).json({ error: 'Session name required' });
  }

  const safeName = sanitizeSessionName(session);
  if (!safeName) {
    return res.status(400).json({ error: 'Invalid session name' });
  }

  // Check if session exists
  if (!(await wsl.sessionExists(safeName))) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Start ttyd
  const result = await wsl.startTtyd(safeName);
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  res.json({
    success: true,
    port: result.port,
    url: `http://localhost:${result.port}`,
  });
});

module.exports = router;
