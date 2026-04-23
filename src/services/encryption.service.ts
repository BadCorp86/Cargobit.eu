/**
 * CargoBit Encryption Service
 * AES-256 encryption for sensitive data (API keys, TOTP secrets)
 * 
 * Uses Fernet-compatible encryption (AES-128-CBC + HMAC-SHA256)
 * In Node.js, we use crypto module for AES-256-GCM which is secure and modern
 */

import * as crypto from 'crypto';

// ============================================
// CONFIGURATION
// ============================================

// FERNET_KEY should be a 32-byte key (256 bits) encoded in base64
// Generate with: crypto.randomBytes(32).toString('base64')
const ENCRYPTION_KEY = process.env.FERNET_KEY || process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.warn('[Encryption] No ENCRYPTION_KEY set - using development key');
}

// Derive a consistent key from the environment variable or use a development key
function getEncryptionKey(): Buffer {
  if (ENCRYPTION_KEY) {
    // If the key is base64 encoded, decode it
    try {
      const decoded = Buffer.from(ENCRYPTION_KEY, 'base64');
      if (decoded.length === 32) return decoded;
    } catch {
      // Fall through to hashing
    }
    // Otherwise hash the key string to get 32 bytes
    return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  }
  // Development fallback - DO NOT USE IN PRODUCTION
  return crypto.createHash('sha256').update('cargobit-dev-encryption-key-do-not-use-in-production').digest();
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16;

// ============================================
// ENCRYPTION FUNCTIONS
// ============================================

/**
 * Encrypt a string value using AES-256-GCM
 * Returns a base64 encoded string containing: salt:iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty plaintext');
  }

  const key = getEncryptionKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  // Derive a key for this specific encryption using the salt
  const derivedKey = crypto.createHmac('sha256', key)
    .update(salt)
    .digest();

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Format: salt:iv:authTag:ciphertext (all base64)
  return [
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext
  ].join(':');
}

/**
 * Decrypt a string value that was encrypted with encrypt()
 */
export function decrypt(encryptedValue: string): string {
  if (!encryptedValue) {
    throw new Error('Cannot decrypt empty value');
  }

  const parts = encryptedValue.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted value format');
  }

  const [saltB64, ivB64, authTagB64, ciphertext] = parts;

  const key = getEncryptionKey();
  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  // Derive the same key using the salt
  const derivedKey = crypto.createHmac('sha256', key)
    .update(salt)
    .digest();

  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Generate a secure random key for encryption
 * Use this to generate FERNET_KEY for production
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Hash a value using SHA-256 (for non-reversible storage)
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  return crypto.timingSafeEqual(
    Buffer.from(a, 'utf8'),
    Buffer.from(b, 'utf8')
  );
}

// ============================================
// EXPORTS
// ============================================

export const encryptionService = {
  encrypt,
  decrypt,
  generateEncryptionKey,
  hash,
  generateToken,
  secureCompare,
};
