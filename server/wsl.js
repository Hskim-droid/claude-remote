/**
 * WSL command execution
 */

const { spawn } = require('child_process');
const config = require('./config');
const { shellQuote } = require('./security');

/**
 * Run command in WSL
 * @param {string} cmd
 * @param {number} timeout
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
function runCommand(cmd, timeout = 30000) {
  return new Promise((resolve) => {
    const args = ['-d', config.WSL_DISTRO, '--', 'bash', '-c', cmd];

    const proc = spawn('wsl', args, {
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill();
    }, timeout);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: killed ? -1 : (code || 0),
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        stdout: '',
        stderr: err.message,
        code: -1,
      });
    });
  });
}

/**
 * Check if a command exists in WSL
 * @param {string} cmd
 * @returns {Promise<boolean>}
 */
async function commandExists(cmd) {
  const result = await runCommand(`which ${shellQuote(cmd)}`);
  return result.code === 0;
}

/**
 * Check if tmux session exists
 * @param {string} name
 * @returns {Promise<boolean>}
 */
async function sessionExists(name) {
  const result = await runCommand(`tmux has-session -t ${shellQuote(name)} 2>/dev/null && echo 'exists'`);
  return result.stdout.includes('exists');
}

/**
 * List tmux sessions
 * @returns {Promise<Array<{name: string, created: string, attached: boolean}>>}
 */
async function listSessions() {
  const result = await runCommand(
    "tmux list-sessions -F '#{session_name}:#{session_created}:#{session_attached}' 2>/dev/null || echo ''"
  );

  const sessions = [];
  for (const line of result.stdout.split('\n')) {
    if (line && line.includes(':')) {
      const parts = line.split(':');
      if (parts.length >= 3) {
        sessions.push({
          name: parts[0],
          created: parts[1],
          attached: parts[2] === '1',
        });
      }
    }
  }
  return sessions;
}

/**
 * Create new tmux session with Claude
 * @param {string} name
 * @param {string} workingDir
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function createSession(name, workingDir) {
  const cmd = `cd ${shellQuote(workingDir)} && tmux new-session -d -s ${shellQuote(name)} 'claude'`;
  const result = await runCommand(cmd);

  if (result.code !== 0) {
    return { success: false, error: result.stderr || 'Failed to create session' };
  }
  return { success: true };
}

/**
 * Kill tmux session
 * @param {string} name
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function killSession(name) {
  const result = await runCommand(`tmux kill-session -t ${shellQuote(name)}`);

  if (result.code !== 0) {
    return { success: false, error: result.stderr || 'Failed to kill session' };
  }
  return { success: true };
}

/**
 * Start ttyd for a session
 * @param {string} sessionName
 * @returns {Promise<{success: boolean, port?: number, error?: string}>}
 */
async function startTtyd(sessionName) {
  // Kill existing ttyd
  await runCommand("pkill -f 'ttyd.*tmux attach' 2>/dev/null || true");

  // Build ttyd command
  let ttydCmd = `ttyd -p ${config.TTYD_PORT} -W`;

  // Add auth if configured
  if (config.TTYD_AUTH_USER && config.TTYD_AUTH_PASS) {
    ttydCmd += ` -c ${shellQuote(config.TTYD_AUTH_USER)}:${shellQuote(config.TTYD_AUTH_PASS)}`;
  }

  ttydCmd += ` tmux attach -t ${shellQuote(sessionName)}`;

  // Start in background
  await runCommand(`nohup ${ttydCmd} > /tmp/ttyd.log 2>&1 &`);

  // Wait and verify
  await new Promise(resolve => setTimeout(resolve, 500));

  const check = await runCommand(`pgrep -f 'ttyd.*${config.TTYD_PORT}' && echo 'running'`);

  if (check.stdout.includes('running')) {
    return { success: true, port: config.TTYD_PORT };
  }
  return { success: false, error: 'Failed to start ttyd' };
}

/**
 * Get system status
 * @returns {Promise<object>}
 */
async function getStatus() {
  const [tmux, ttyd, claude, ttydRunning] = await Promise.all([
    commandExists('tmux'),
    commandExists('ttyd'),
    commandExists('claude'),
    runCommand(`pgrep -f 'ttyd.*${config.TTYD_PORT}' && echo 'running'`),
  ]);

  return {
    tmux,
    ttyd,
    claude,
    ttyd_running: ttydRunning.stdout.includes('running'),
    ttyd_port: config.TTYD_PORT,
  };
}

module.exports = {
  runCommand,
  commandExists,
  sessionExists,
  listSessions,
  createSession,
  killSession,
  startTtyd,
  getStatus,
};
