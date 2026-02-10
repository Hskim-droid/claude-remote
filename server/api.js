/**
 * API route handlers
 */

const express = require('express');
const sessions = require('./sessions');
const wsl = require('./wsl');
const config = require('./config');

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
    try {
        const deps = await wsl.checkDependencies();
        res.json({
            status: 'ok',
            dependencies: deps,
            config: {
                wslDistro: config.wslDistro,
                ttydPort: config.ttydPort,
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/sessions
 * List all sessions
 */
router.get('/sessions', async (req, res) => {
    try {
        await sessions.syncSessions();
        const allSessions = sessions.getAllSessions();
        res.json(allSessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/sessions
 * Create new session
 * Body: { name: string, workDir: string }
 */
router.post('/sessions', async (req, res) => {
    try {
        const { name, workDir } = req.body;

        if (!name || !workDir) {
            return res.status(400).json({ error: 'name and workDir are required' });
        }

        const session = await sessions.createSession(name, workDir);
        res.status(201).json(session);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/sessions/:name
 * Get session by name
 */
router.get('/sessions/:name', (req, res) => {
    try {
        const session = sessions.getSession(req.params.name);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/sessions/:name
 * Delete session
 */
router.delete('/sessions/:name', async (req, res) => {
    try {
        await sessions.deleteSession(req.params.name);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/sessions/:name/connect
 * Connect to session (start ttyd)
 */
router.post('/sessions/:name/connect', async (req, res) => {
    try {
        const port = req.body.port || config.ttydPort;
        const session = await sessions.connectSession(req.params.name, port);
        res.json({
            ...session,
            ttydUrl: `http://${req.hostname}:${port}`,
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/claude-projects
 * Discover existing Claude Code projects
 */
router.get('/claude-projects', async (req, res) => {
    try {
        const projects = await wsl.discoverClaudeSessions();
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/tmux-sessions
 * List raw tmux sessions
 */
router.get('/tmux-sessions', async (req, res) => {
    try {
        const tmuxSessions = await wsl.listTmuxSessions();
        res.json(tmuxSessions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
