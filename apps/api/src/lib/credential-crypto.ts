/**
 * AES-256-GCM symmetric encryption for storing MCP server credentials.
 *
 * Key source: DB_ENCRYPTION_KEY env var (32-byte hex string).
 * Format stored in DB:  "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 *
 * Why AES-256-GCM?
 * - Authenticated encryption: detects any tampering of the ciphertext.
 * - 256-bit key: well above the minimum for production secrets.
 * - Random 12-byte IV per encryption: same plaintext never produces the same ciphertext.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes is the NIST recommended IV length for GCM

function getKey(): Buffer {
  const raw = process.env.DB_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('DB_ENCRYPTION_KEY environment variable is not set. Cannot encrypt/decrypt MCP credentials.');
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new Error(`DB_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Got ${key.length} bytes.`);
  }
  return key;
}

/**
 * Encrypt a plain-text string (usually JSON.stringify'd credentials).
 * Returns a single DB-safe string: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encryptCredentials(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypt a value previously returned by encryptCredentials().
 * Returns the original plaintext string.
 */
export function decryptCredentials(stored: string): string {
  const key = getKey();
  const parts = stored.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted credential format. Expected "<iv>:<authTag>:<ciphertext>".');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}
