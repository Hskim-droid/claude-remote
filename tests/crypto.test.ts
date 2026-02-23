import { describe, it, expect } from 'vitest';
import {
  generateRawKey,
  keyToBase64Url,
  base64UrlToKey,
  encrypt,
  decrypt,
} from '../server/crypto.js';

describe('generateRawKey', () => {
  it('generates a 32-byte key', () => {
    const key = generateRawKey();
    expect(key.length).toBe(32);
  });

  it('generates unique keys', () => {
    const key1 = generateRawKey();
    const key2 = generateRawKey();
    expect(key1.equals(key2)).toBe(false);
  });
});

describe('keyToBase64Url / base64UrlToKey', () => {
  it('roundtrips a key', () => {
    const key = generateRawKey();
    const encoded = keyToBase64Url(key);
    const decoded = base64UrlToKey(encoded);
    expect(decoded.equals(key)).toBe(true);
  });

  it('produces URL-safe characters', () => {
    const key = generateRawKey();
    const encoded = keyToBase64Url(key);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it('rejects invalid key length', () => {
    expect(() => base64UrlToKey('AAAA')).toThrow('Invalid key length');
  });
});

describe('encrypt / decrypt', () => {
  it('roundtrips a string message', () => {
    const key = generateRawKey();
    const plaintext = 'Hello, E2E!';
    const encrypted = encrypt(key, plaintext);
    const decrypted = decrypt(key, encrypted);
    expect(decrypted.toString('utf-8')).toBe(plaintext);
  });

  it('roundtrips a Buffer message', () => {
    const key = generateRawKey();
    const plaintext = Buffer.from('binary data \x00\xff');
    const encrypted = encrypt(key, plaintext);
    const decrypted = decrypt(key, encrypted);
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it('roundtrips JSON message (typical use case)', () => {
    const key = generateRawKey();
    const msg = JSON.stringify({ type: 'output', data: 'ls -la\r\n' });
    const encrypted = encrypt(key, msg);
    const decrypted = decrypt(key, encrypted);
    const parsed = JSON.parse(decrypted.toString('utf-8'));
    expect(parsed.type).toBe('output');
    expect(parsed.data).toBe('ls -la\r\n');
  });

  it('produces different ciphertexts for same plaintext (random IV)', () => {
    const key = generateRawKey();
    const plaintext = 'same message';
    const enc1 = encrypt(key, plaintext);
    const enc2 = encrypt(key, plaintext);
    expect(enc1.equals(enc2)).toBe(false);
  });

  it('fails decryption with wrong key', () => {
    const key1 = generateRawKey();
    const key2 = generateRawKey();
    const encrypted = encrypt(key1, 'secret');
    expect(() => decrypt(key2, encrypted)).toThrow();
  });

  it('fails decryption with tampered ciphertext', () => {
    const key = generateRawKey();
    const encrypted = encrypt(key, 'secret');
    // Flip a byte in the ciphertext
    encrypted[15] ^= 0xff;
    expect(() => decrypt(key, encrypted)).toThrow();
  });

  it('fails decryption with truncated data', () => {
    const key = generateRawKey();
    const tooShort = Buffer.alloc(20);
    expect(() => decrypt(key, tooShort)).toThrow();
  });

  it('wire format: [12B IV][ciphertext][16B auth tag]', () => {
    const key = generateRawKey();
    const plaintext = 'test';
    const encrypted = encrypt(key, plaintext);
    // Minimum: 12 (IV) + plaintext.length + 16 (auth tag)
    expect(encrypted.length).toBeGreaterThanOrEqual(12 + 4 + 16);
    // First 12 bytes should be unique (random IV)
    const iv1 = encrypt(key, plaintext).subarray(0, 12);
    const iv2 = encrypt(key, plaintext).subarray(0, 12);
    expect(iv1.equals(iv2)).toBe(false);
  });

  it('handles empty plaintext', () => {
    const key = generateRawKey();
    const encrypted = encrypt(key, '');
    const decrypted = decrypt(key, encrypted);
    expect(decrypted.toString('utf-8')).toBe('');
  });

  it('handles large payloads', () => {
    const key = generateRawKey();
    const plaintext = 'A'.repeat(100_000);
    const encrypted = encrypt(key, plaintext);
    const decrypted = decrypt(key, encrypted);
    expect(decrypted.toString('utf-8')).toBe(plaintext);
  });
});
