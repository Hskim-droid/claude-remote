/**
 * E2E encryption module (AES-256-GCM)
 * Uses Node.js crypto API for server-side encryption/decryption.
 * Client-side uses Web Crypto API with identical wire format.
 *
 * Wire format: [12-byte IV][ciphertext + 16-byte auth tag]
 */

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Generate a random 256-bit key
 */
export function generateRawKey(): Buffer {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Encode a key buffer to URL-safe base64
 */
export function keyToBase64Url(key: Buffer): string {
  return key.toString('base64url');
}

/**
 * Decode a URL-safe base64 string to a key buffer
 */
export function base64UrlToKey(encoded: string): Buffer {
  const buf = Buffer.from(encoded, 'base64url');
  if (buf.length !== KEY_LENGTH) {
    throw new Error(`Invalid key length: expected ${KEY_LENGTH}, got ${buf.length}`);
  }
  return buf;
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns: [12-byte IV][ciphertext + 16-byte auth tag]
 */
export function encrypt(key: Buffer, plaintext: Buffer | string): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const input = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf-8') : plaintext;
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, encrypted, authTag]);
}

/**
 * Decrypt AES-256-GCM ciphertext.
 * Input format: [12-byte IV][ciphertext + 16-byte auth tag]
 */
export function decrypt(key: Buffer, data: Buffer): Buffer {
  if (data.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Encrypted data too short');
  }

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(data.length - AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH, data.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
