/**
 * Session state persistence and ghost session recovery.
 * Patterns from Claudeman: atomic writes, backup files, tmux reconciliation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as executor from './executor.js';
import config from './config.js';
import { generateRawKey, keyToBase64Url } from './crypto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_PATH = path.join(DATA_DIR, 'sessions.json');
const BACKUP_PATH = STORE_PATH + '.bak';
const SAVE_DEBOUNCE_MS = 500;

export interface StoredSession {
  name: string;
  workingDir: string;
  createdAt: string;
  status: 'running' | 'dead';
  encryptionKey?: string;
}

interface StoreData {
  sessions: Record<string, StoredSession>;
}

export interface ReconcileResult {
  alive: string[];
  dead: string[];
  discovered: string[];
}

class SessionStore {
  private data: StoreData = { sessions: {} };
  private dirty = false;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.ensureDataDir();
    this.data = this.load();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  /**
   * Load state from file with backup fallback
   */
  private load(): StoreData {
    for (const filepath of [STORE_PATH, BACKUP_PATH]) {
      try {
        if (fs.existsSync(filepath)) {
          const raw = fs.readFileSync(filepath, 'utf-8');
          const parsed = JSON.parse(raw) as StoreData;
          if (filepath === BACKUP_PATH) {
            console.log('Session store: recovered from backup');
          }
          return { sessions: parsed.sessions ?? {} };
        }
      } catch {
        console.error(`Session store: failed to load ${filepath}`);
      }
    }
    return { sessions: {} };
  }

  /**
   * Debounced save — batches rapid state changes
   */
  save(): void {
    this.dirty = true;
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.doSave();
    }, SAVE_DEBOUNCE_MS);
  }

  /**
   * Atomic write: backup existing → write temp → rename
   */
  private doSave(): void {
    if (!this.dirty) return;

    const tempPath = STORE_PATH + '.tmp';

    try {
      const json = JSON.stringify(this.data, null, 2);

      // Backup current file
      if (fs.existsSync(STORE_PATH)) {
        fs.copyFileSync(STORE_PATH, BACKUP_PATH);
      }

      // Atomic write
      fs.writeFileSync(tempPath, json, 'utf-8');
      fs.renameSync(tempPath, STORE_PATH);
      this.dirty = false;
    } catch (err) {
      console.error('Session store: save failed', err);
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch { /* ignore */ }
    }
  }

  /**
   * Flush pending writes immediately (for shutdown)
   */
  flushAll(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    if (this.dirty) {
      this.doSave();
    }
  }

  /**
   * Add or update a session record.
   * When E2E is enabled, generates an encryption key for new sessions.
   */
  setSession(name: string, workingDir: string): void {
    const existing = this.data.sessions[name];
    this.data.sessions[name] = {
      name,
      workingDir,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      status: 'running',
      encryptionKey: existing?.encryptionKey ??
        (config.E2E_ENABLED ? keyToBase64Url(generateRawKey()) : undefined),
    };
    this.save();
  }

  /**
   * Get the encryption key for a session (base64url encoded)
   */
  getSessionKey(name: string): string | undefined {
    return this.data.sessions[name]?.encryptionKey;
  }

  /**
   * Remove a session record
   */
  removeSession(name: string): void {
    delete this.data.sessions[name];
    this.save();
  }

  /**
   * Get all stored sessions
   */
  getSessions(): Record<string, StoredSession> {
    return { ...this.data.sessions };
  }

  /**
   * Reconcile stored sessions with actual tmux sessions.
   * - Stored + tmux running → alive
   * - Stored + tmux missing → dead (remove)
   * - tmux running + not stored → discovered (adopt as ghost)
   */
  async reconcileSessions(): Promise<ReconcileResult> {
    const alive: string[] = [];
    const dead: string[] = [];
    const discovered: string[] = [];

    // Get actual tmux sessions
    const tmuxSessions = await executor.listSessions();
    const tmuxNames = new Set(tmuxSessions.map(s => s.name));

    // Check stored sessions against tmux
    for (const [name, session] of Object.entries(this.data.sessions)) {
      if (tmuxNames.has(name)) {
        alive.push(name);
        session.status = 'running';
      } else {
        dead.push(name);
      }
    }

    // Remove dead sessions
    for (const name of dead) {
      delete this.data.sessions[name];
    }

    // Discover ghost sessions (in tmux but not in store)
    for (const tmuxSession of tmuxSessions) {
      if (!this.data.sessions[tmuxSession.name]) {
        this.data.sessions[tmuxSession.name] = {
          name: tmuxSession.name,
          workingDir: '',
          createdAt: new Date(parseInt(tmuxSession.created) * 1000).toISOString(),
          status: 'running',
        };
        discovered.push(tmuxSession.name);
      }
    }

    if (dead.length > 0 || discovered.length > 0) {
      this.save();
    }

    console.log(
      `Session reconcile: ${alive.length} alive, ${dead.length} dead, ${discovered.length} discovered`
    );

    return { alive, dead, discovered };
  }
}

// Singleton instance
const sessionStore = new SessionStore();
export default sessionStore;
