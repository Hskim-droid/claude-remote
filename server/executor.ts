/**
 * Cross-platform command executor
 * Windows: runs commands via WSL
 * Linux/macOS: runs commands natively via bash
 */

import os from 'node:os';
import { spawn } from 'node:child_process';
import config from './config.js';
import { shellQuote } from './security.js';

const isWindows = os.platform() === 'win32';

export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface SessionInfo {
  name: string;
  created: string;
  attached: boolean;
}

export interface ProcessInfo {
  pid: number | null;
  type: 'tmux' | 'native';
  name: string;
  connectable: boolean;
}

/**
 * Run a shell command (platform-aware)
 */
export function runCommand(cmd: string, timeout = 30000): Promise<CommandResult> {
  return new Promise((resolve) => {
    let proc;

    if (isWindows) {
      const args = ['-d', config.WSL_DISTRO, '--', 'bash', '-c', cmd];
      proc = spawn('wsl', args, { windowsHide: true });
    } else {
      proc = spawn('bash', ['-c', cmd], { env: { ...process.env, PATH: process.env.PATH } });
    }

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill();
    }, timeout);

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code: number | null) => {
      clearTimeout(timer);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: killed ? -1 : (code ?? 0),
      });
    });

    proc.on('error', (err: Error) => {
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
 * Run a native Windows command (not through WSL)
 */
export function runNativeCommand(cmd: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    const proc = spawn('powershell', ['-NoProfile', '-Command', cmd], { windowsHide: true });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    proc.on('close', (code: number | null) => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code: code ?? 0 });
    });

    proc.on('error', (err: Error) => {
      resolve({ stdout: '', stderr: err.message, code: -1 });
    });
  });
}

/**
 * Check if a command exists
 */
export async function commandExists(cmd: string): Promise<boolean> {
  const result = await runCommand(`which ${shellQuote(cmd)}`);
  return result.code === 0;
}

/**
 * Check if tmux session exists
 */
export async function sessionExists(name: string): Promise<boolean> {
  const result = await runCommand(`tmux has-session -t ${shellQuote(name)} 2>/dev/null && echo 'exists'`);
  return result.stdout.includes('exists');
}

/**
 * List tmux sessions
 */
export async function listSessions(): Promise<SessionInfo[]> {
  const result = await runCommand(
    "tmux list-sessions -F '#{session_name}:#{session_created}:#{session_attached}' 2>/dev/null || echo ''"
  );

  const sessions: SessionInfo[] = [];
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
 */
export async function createSession(name: string, workingDir: string): Promise<{ success: boolean; error?: string }> {
  const cmd = `cd ${shellQuote(workingDir)} && tmux new-session -d -s ${shellQuote(name)} 'claude'`;
  const result = await runCommand(cmd);

  if (result.code !== 0) {
    return { success: false, error: result.stderr || 'Failed to create session' };
  }
  return { success: true };
}

/**
 * Kill tmux session
 */
export async function killSession(name: string): Promise<{ success: boolean; error?: string }> {
  const result = await runCommand(`tmux kill-session -t ${shellQuote(name)}`);

  if (result.code !== 0) {
    return { success: false, error: result.stderr || 'Failed to kill session' };
  }
  return { success: true };
}

/**
 * Get system status
 */
export async function getStatus(): Promise<{
  tmux: boolean;
  claude: boolean;
  platform: string;
  default_path: string;
}> {
  const [tmux, claude] = await Promise.all([
    commandExists('tmux'),
    commandExists('claude'),
  ]);

  return {
    tmux,
    claude,
    platform: config.PLATFORM,
    default_path: config.DEFAULT_PATH,
  };
}

/**
 * List all running Claude processes (tmux + standalone)
 */
export async function listClaudeProcesses(): Promise<ProcessInfo[]> {
  const processes: ProcessInfo[] = [];
  const tmuxSessions = await listSessions();

  // tmux-managed sessions
  for (const s of tmuxSessions) {
    processes.push({
      pid: null,
      type: 'tmux',
      name: s.name,
      connectable: true,
    });
  }

  // Windows native Claude processes
  if (isWindows) {
    const winResult = await runNativeCommand(
      "Get-Process -Name 'claude*' -ErrorAction SilentlyContinue | Select-Object -Property Id,ProcessName | ConvertTo-Json -Compress"
    );
    try {
      let winProcs = JSON.parse(winResult.stdout || '[]');
      if (!Array.isArray(winProcs)) winProcs = [winProcs];
      for (const p of winProcs) {
        if (p && p.Id) {
          processes.push({
            pid: p.Id,
            type: 'native',
            name: `Windows (PID ${p.Id})`,
            connectable: false,
          });
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  return processes;
}
