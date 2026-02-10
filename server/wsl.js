/**
 * WSL command execution utilities
 */

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const net = require('net');
const config = require('./config');
const { shellEscape } = require('./security');

const execAsync = promisify(exec);

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a port is listening (accepts connections)
 * @param {number} port - Port to check
 * @param {string} host - Host to check (default: localhost)
 * @returns {Promise<boolean>}
 */
function isPortListening(port, host = 'localhost') {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(500);

        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });

        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });

        socket.connect(port, host);
    });
}

/**
 * Execute command in WSL
 * @param {string} command - Command to execute
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
async function wslExec(command) {
    const wslCommand = `wsl -d ${config.wslDistro} -- ${command}`;
    return execAsync(wslCommand);
}

/**
 * Check if tmux session exists
 * @param {string} sessionName - Session name
 * @returns {Promise<boolean>}
 */
async function tmuxSessionExists(sessionName) {
    try {
        await wslExec(`tmux has-session -t ${shellEscape(sessionName)}`);
        return true;
    } catch {
        return false;
    }
}

/**
 * List all tmux sessions
 * @returns {Promise<string[]>}
 */
async function listTmuxSessions() {
    try {
        const { stdout } = await wslExec('tmux list-sessions -F "#{session_name}"');
        return stdout.trim().split('\n').filter(Boolean);
    } catch {
        return [];
    }
}

/**
 * Create new tmux session with Claude Code
 * @param {string} sessionName - Session name
 * @param {string} workDir - Working directory
 * @returns {Promise<void>}
 */
async function createTmuxSession(sessionName, workDir) {
    const escapedName = shellEscape(sessionName);
    const escapedDir = shellEscape(workDir);

    // Create detached tmux session and run claude
    const command = `tmux new-session -d -s ${escapedName} -c ${escapedDir} 'claude'`;
    await wslExec(command);

    // Verify session was created
    await sleep(300);
    const exists = await tmuxSessionExists(sessionName);
    if (!exists) {
        throw new Error('Failed to create tmux session');
    }
}

/**
 * Kill tmux session
 * @param {string} sessionName - Session name
 * @returns {Promise<void>}
 */
async function killTmuxSession(sessionName) {
    const escapedName = shellEscape(sessionName);
    await wslExec(`tmux kill-session -t ${escapedName}`);
}

/**
 * Check if ttyd is running on specific port
 * @param {number} port - Port to check
 * @returns {Promise<boolean>}
 */
async function isTtydRunning(port) {
    try {
        const { stdout } = await wslExec(`pgrep -f "ttyd.*-p ${port}"`);
        return stdout.trim().length > 0;
    } catch {
        return false;
    }
}

/**
 * Kill ttyd process on specific port
 * @param {number} port - Port to kill
 * @returns {Promise<void>}
 */
async function killTtydOnPort(port) {
    try {
        await wslExec(`pkill -f "ttyd.*-p ${port}"`);
    } catch {
        // Ignore error if no process found
    }
}

/**
 * Kill all ttyd processes
 * @returns {Promise<void>}
 */
async function killAllTtyd() {
    try {
        await wslExec('pkill -f ttyd');
    } catch {
        // Ignore error if no process found
    }
}

/**
 * Start ttyd attached to tmux session
 * @param {string} sessionName - Session name
 * @param {number} port - Port to listen on
 * @returns {Promise<void>}
 */
async function startTtyd(sessionName, port = config.ttydPort) {
    // Kill existing ttyd on this port only (allow multiple sessions)
    await killTtydOnPort(port);
    await sleep(200);

    const escapedName = shellEscape(sessionName);

    // Build ttyd command
    let ttydCmd = `ttyd -p ${port} -W`;

    // Add authentication if configured
    if (config.ttydAuthUser && config.ttydAuthPass) {
        ttydCmd += ` -c ${shellEscape(config.ttydAuthUser)}:${shellEscape(config.ttydAuthPass)}`;
    }

    // Attach to tmux session
    ttydCmd += ` tmux attach-session -t ${escapedName}`;

    // Start ttyd using spawn with detached option
    // This properly backgrounds the process on Windows
    const child = spawn('wsl', ['-d', config.wslDistro, '--', ...ttydCmd.split(' ')], {
        detached: true,
        stdio: 'ignore',
    });
    child.unref();

    // Verify ttyd is listening (max 3 seconds)
    for (let i = 0; i < 6; i++) {
        await sleep(500);
        const listening = await isPortListening(port);
        if (listening) {
            return;
        }
    }
    throw new Error(`ttyd failed to start on port ${port}`);
}

/**
 * Discover existing Claude Code sessions from ~/.claude/projects
 * @returns {Promise<Array<{name: string, path: string}>>}
 */
async function discoverClaudeSessions() {
    try {
        const { stdout } = await wslExec('ls -1 ~/.claude/projects 2>/dev/null');
        const dirs = stdout.trim().split('\n').filter(Boolean);

        return dirs.map(dir => ({
            name: dir,
            path: `~/.claude/projects/${dir}`,
        }));
    } catch {
        return [];
    }
}

/**
 * Check if required tools are installed in WSL
 * @returns {Promise<{tmux: boolean, ttyd: boolean, claude: boolean}>}
 */
async function checkDependencies() {
    const check = async (cmd) => {
        try {
            await wslExec(`which ${cmd}`);
            return true;
        } catch {
            return false;
        }
    };

    return {
        tmux: await check('tmux'),
        ttyd: await check('ttyd'),
        claude: await check('claude'),
    };
}

module.exports = {
    sleep,
    isPortListening,
    wslExec,
    tmuxSessionExists,
    listTmuxSessions,
    createTmuxSession,
    killTmuxSession,
    isTtydRunning,
    killTtydOnPort,
    killAllTtyd,
    startTtyd,
    discoverClaudeSessions,
    checkDependencies,
};
