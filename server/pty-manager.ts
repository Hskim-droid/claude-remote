/**
 * PTY session manager
 * Replaces ttyd with in-process node-pty for direct terminal access.
 * Standard approach used by VS Code, Theia, code-server, and Wetty.
 */

import os from 'node:os';
import * as pty from 'node-pty';
import config from './config.js';

const isWindows = os.platform() === 'win32';

export interface PtySession {
  pty: pty.IPty;
  sessionName: string;
  onData: (callback: (data: string) => void) => void;
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  destroy: () => void;
}

/**
 * Attach to a tmux session via node-pty
 */
export function attachSession(sessionName: string): PtySession {
  let shell: string;
  let args: string[];

  if (isWindows) {
    // On Windows, spawn WSL which runs tmux inside
    shell = 'wsl.exe';
    args = ['-d', config.WSL_DISTRO, '--', 'tmux', 'attach', '-t', sessionName];
  } else {
    shell = 'tmux';
    args = ['attach', '-t', sessionName];
  }

  const ptyProcess = pty.spawn(shell, args, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: isWindows ? undefined : os.homedir(),
    env: isWindows ? undefined : (process.env as Record<string, string>),
  });

  return {
    pty: ptyProcess,
    sessionName,
    onData: (callback: (data: string) => void) => {
      ptyProcess.onData(callback);
    },
    write: (data: string) => {
      ptyProcess.write(data);
    },
    resize: (cols: number, rows: number) => {
      try {
        ptyProcess.resize(Math.max(1, cols), Math.max(1, rows));
      } catch {
        // Ignore resize errors on dead PTY
      }
    },
    destroy: () => {
      try {
        ptyProcess.kill();
      } catch {
        // Already dead
      }
    },
  };
}
