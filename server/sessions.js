/**
 * Session management
 */

const wsl = require('./wsl');
const config = require('./config');
const { sanitizeSessionName, sanitizePath } = require('./security');

// In-memory session store
const sessions = new Map();

// Port allocation (base port + offset for each session)
const BASE_TTYD_PORT = config.ttydPort;
const usedPorts = new Set();

/**
 * Get next available port
 * @returns {number}
 */
function getAvailablePort() {
    let port = BASE_TTYD_PORT;
    while (usedPorts.has(port)) {
        port++;
    }
    usedPorts.add(port);
    return port;
}

/**
 * Release port
 * @param {number} port
 */
function releasePort(port) {
    usedPorts.delete(port);
}

/**
 * Session object structure
 * @typedef {Object} Session
 * @property {string} name - Session name
 * @property {string} workDir - Working directory
 * @property {number} ttydPort - ttyd port
 * @property {boolean} active - Is session active
 * @property {Date} createdAt - Creation time
 * @property {Date} lastAccess - Last access time
 */

/**
 * Get all sessions
 * @returns {Array<Session>}
 */
function getAllSessions() {
    return Array.from(sessions.values());
}

/**
 * Get session by name
 * @param {string} name - Session name
 * @returns {Session|null}
 */
function getSession(name) {
    return sessions.get(name) || null;
}

/**
 * Create new session (creates tmux + starts ttyd = ready to use)
 * @param {string} name - Session name
 * @param {string} workDir - Working directory
 * @returns {Promise<Session>}
 */
async function createSession(name, workDir) {
    // Validate inputs
    const safeName = sanitizeSessionName(name);
    if (!safeName) {
        throw new Error('Invalid session name (alphanumeric, hyphen, underscore only)');
    }

    const safePath = sanitizePath(workDir);
    if (!safePath) {
        throw new Error('Invalid path (must be in allowed paths like /mnt/c/)');
    }

    // Check if session already exists
    if (sessions.has(safeName)) {
        throw new Error('Session already exists');
    }

    // Check if tmux session already exists
    if (await wsl.tmuxSessionExists(safeName)) {
        throw new Error('tmux session already exists');
    }

    // Allocate port
    const port = getAvailablePort();

    try {
        // Create tmux session with claude
        await wsl.createTmuxSession(safeName, safePath);

        // Start ttyd immediately (so session is ready to use)
        await wsl.startTtyd(safeName, port);

        // Create session object
        const session = {
            name: safeName,
            workDir: safePath,
            ttydPort: port,
            active: true,
            createdAt: new Date(),
            lastAccess: new Date(),
        };

        sessions.set(safeName, session);
        return session;
    } catch (error) {
        // Cleanup on failure
        releasePort(port);
        try {
            await wsl.killTmuxSession(safeName);
        } catch {
            // Ignore cleanup errors
        }
        throw error;
    }
}

/**
 * Delete session
 * @param {string} name - Session name
 * @returns {Promise<void>}
 */
async function deleteSession(name) {
    const safeName = sanitizeSessionName(name);
    if (!safeName) {
        throw new Error('Invalid session name');
    }

    const session = sessions.get(safeName);
    if (!session) {
        throw new Error('Session not found');
    }

    // Kill ttyd on this session's port
    if (session.ttydPort) {
        try {
            await wsl.killTtydOnPort(session.ttydPort);
        } catch {
            // Ignore if already dead
        }
        releasePort(session.ttydPort);
    }

    // Kill tmux session
    try {
        await wsl.killTmuxSession(safeName);
    } catch {
        // Ignore if already dead
    }

    sessions.delete(safeName);
}

/**
 * Connect to session (start ttyd)
 * @param {string} name - Session name
 * @param {number} port - ttyd port (optional, auto-assigned if not provided)
 * @returns {Promise<Session>}
 */
async function connectSession(name, port) {
    const safeName = sanitizeSessionName(name);
    if (!safeName) {
        throw new Error('Invalid session name');
    }

    let session = sessions.get(safeName);

    // If session not in memory, check if tmux session exists
    if (!session) {
        const exists = await wsl.tmuxSessionExists(safeName);
        if (!exists) {
            throw new Error('Session not found');
        }

        // Create session object for existing tmux session
        session = {
            name: safeName,
            workDir: '~',
            ttydPort: null,
            active: false,
            createdAt: new Date(),
            lastAccess: new Date(),
        };
        sessions.set(safeName, session);
    }

    // Determine port to use
    let targetPort = port;
    if (!targetPort) {
        // If session already has a port, reuse it; otherwise allocate new
        if (session.ttydPort) {
            targetPort = session.ttydPort;
        } else {
            targetPort = getAvailablePort();
        }
    }

    // Start ttyd
    await wsl.startTtyd(safeName, targetPort);

    // Update session
    session.ttydPort = targetPort;
    session.active = true;
    session.lastAccess = new Date();

    return session;
}

/**
 * Sync sessions with tmux
 * @returns {Promise<void>}
 */
async function syncSessions() {
    const tmuxSessions = await wsl.listTmuxSessions();

    // Add any tmux sessions not in memory
    for (const name of tmuxSessions) {
        if (!sessions.has(name)) {
            sessions.set(name, {
                name,
                workDir: '~',
                ttydPort: null,
                active: false,
                createdAt: new Date(),
                lastAccess: new Date(),
            });
        }
    }

    // Mark sessions as inactive and release ports if tmux session is gone
    for (const [name, session] of sessions) {
        if (!tmuxSessions.includes(name)) {
            session.active = false;
            if (session.ttydPort) {
                releasePort(session.ttydPort);
                session.ttydPort = null;
            }
        }
    }
}

module.exports = {
    getAllSessions,
    getSession,
    createSession,
    deleteSession,
    connectSession,
    syncSessions,
};
