/**
 * CargoBit Secrets Service
 * Secure storage and retrieval of API keys and secrets
 * 
 * KEY ROTATION FLOW:
 * 1. Save new key → stripe_secret_key_next
 * 2. Promote → stripe_secret_key_active = next, clear next
 * 3. Backend uses active for outgoing, accepts both for webhooks
 */

import { prisma } from '@/lib/db';
import { encrypt, decrypt } from './encryption.service';
import { logAdminAction } from './admin-auth.service';

// ============================================
// TYPES
// ============================================

export interface SecretKeys {
  active: string | null;
  next: string | null;
}

export interface StripeKeys {
  activeKey: string | null;
  nextKey: string | null;
}

// ============================================
// SECRET NAMES
// ============================================

export const SECRET_NAMES = {
  STRIPE_SECRET_KEY_ACTIVE: 'stripe_secret_key_active',
  STRIPE_SECRET_KEY_NEXT: 'stripe_secret_key_next',
  STRIPE_WEBHOOK_SECRET_ACTIVE: 'stripe_webhook_secret_active',
  STRIPE_WEBHOOK_SECRET_NEXT: 'stripe_webhook_secret_next',
} as const;

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Store a secret value (encrypted)
 */
export async function storeSecret(
  name: string,
  value: string,
  adminId?: string
): Promise<void> {
  const encryptedValue = encrypt(value);

  await prisma.secret.upsert({
    where: { name },
    update: {
      value: encryptedValue,
      lastRotatedAt: new Date(),
      rotatedBy: adminId,
    },
    create: {
      name,
      value: encryptedValue,
      lastRotatedAt: new Date(),
      rotatedBy: adminId,
    },
  });

  if (adminId) {
    await logAdminAction(adminId, 'secret_saved', 'secret', undefined, undefined, undefined, undefined, JSON.stringify({ name }));
  }
}

/**
 * Retrieve a secret value (decrypted)
 */
export async function getSecret(name: string): Promise<string | null> {
  const secret = await prisma.secret.findUnique({
    where: { name },
  });

  if (!secret) {
    return null;
  }

  try {
    return decrypt(secret.value);
  } catch (error) {
    console.error(`[Secrets] Failed to decrypt secret ${name}:`, error);
    return null;
  }
}

/**
 * Check if a secret exists
 */
export async function hasSecret(name: string): Promise<boolean> {
  const secret = await prisma.secret.findUnique({
    where: { name },
    select: { id: true },
  });
  return !!secret;
}

/**
 * Delete a secret
 */
export async function deleteSecret(name: string, adminId?: string): Promise<void> {
  await prisma.secret.delete({
    where: { name },
  });

  if (adminId) {
    await logAdminAction(adminId, 'secret_deleted', 'secret', undefined, undefined, undefined, JSON.stringify({ name }));
  }
}

// ============================================
// STRIPE KEY MANAGEMENT
// ============================================

/**
 * Load Stripe keys (active and next)
 */
export async function loadStripeKeys(): Promise<StripeKeys> {
  const [activeKey, nextKey] = await Promise.all([
    getSecret(SECRET_NAMES.STRIPE_SECRET_KEY_ACTIVE),
    getSecret(SECRET_NAMES.STRIPE_SECRET_KEY_NEXT),
  ]);

  return { activeKey, nextKey };
}

/**
 * Get the active Stripe key
 * This is used for outgoing API calls (PaymentIntent, Checkout, etc.)
 */
export async function getActiveStripeKey(): Promise<string> {
  const key = await getSecret(SECRET_NAMES.STRIPE_SECRET_KEY_ACTIVE);
  
  if (!key) {
    throw new Error('Stripe secret key not configured. Please set up via Admin UI.');
  }
  
  return key;
}

/**
 * Get all valid Stripe keys
 * This is used for webhook signature verification (accept both old and new)
 */
export async function getAllValidStripeKeys(): Promise<string[]> {
  const { activeKey, nextKey } = await loadStripeKeys();
  
  const keys: string[] = [];
  if (activeKey) keys.push(activeKey);
  if (nextKey) keys.push(nextKey);
  
  return keys;
}

/**
 * Rotate Stripe key - save to next slot
 * Use this to stage a new key before promotion
 */
export async function rotateStripeKey(
  newKey: string,
  adminId: string
): Promise<{ success: boolean; message: string }> {
  // Validate key format (basic check)
  if (!newKey.startsWith('sk_')) {
    return { success: false, message: 'Invalid Stripe key format. Key should start with "sk_"' };
  }

  // Store as next key
  await storeSecret(SECRET_NAMES.STRIPE_SECRET_KEY_NEXT, newKey, adminId);

  await logAdminAction(
    adminId,
    'stripe_key_rotated',
    'secret',
    undefined,
    undefined,
    undefined,
    undefined,
    JSON.stringify({ slot: 'next' })
  );

  return {
    success: true,
    message: 'New Stripe key stored as next. Test the key, then promote it to active.',
  };
}

/**
 * Promote the next key to active
 * Call this after testing the new key
 */
export async function promoteStripeKey(adminId: string): Promise<{ success: boolean; message: string }> {
  // Get the next key
  const nextKey = await getSecret(SECRET_NAMES.STRIPE_SECRET_KEY_NEXT);

  if (!nextKey) {
    return { success: false, message: 'No next key set. Please add a new key first.' };
  }

  // Move next to active
  await storeSecret(SECRET_NAMES.STRIPE_SECRET_KEY_ACTIVE, nextKey, adminId);

  // Clear next key
  await deleteSecret(SECRET_NAMES.STRIPE_SECRET_KEY_NEXT, adminId);

  await logAdminAction(
    adminId,
    'stripe_key_promoted',
    'secret',
    undefined,
    undefined,
    undefined,
    JSON.stringify({ previousActive: '***' }),
    JSON.stringify({ newActive: '***' })
  );

  return {
    success: true,
    message: 'Stripe key promoted to active. Backend will now use the new key.',
  };
}

/**
 * Get Stripe key status (masked)
 */
export async function getStripeKeyStatus(): Promise<{
  hasActiveKey: boolean;
  hasNextKey: boolean;
  activeKeyPreview: string | null;
  nextKeyPreview: string | null;
  lastRotatedAt: Date | null;
}> {
  const [activeSecret, nextSecret] = await Promise.all([
    prisma.secret.findUnique({
      where: { name: SECRET_NAMES.STRIPE_SECRET_KEY_ACTIVE },
    }),
    prisma.secret.findUnique({
      where: { name: SECRET_NAMES.STRIPE_SECRET_KEY_NEXT },
    }),
  ]);

  const maskKey = (key: string | null): string | null => {
    if (!key) return null;
    // Show first 7 chars and last 4 chars
    return `${key.substring(0, 7)}...${key.substring(key.length - 4)}`;
  };

  const activeKey = activeSecret ? await getSecret(SECRET_NAMES.STRIPE_SECRET_KEY_ACTIVE) : null;
  const nextKey = nextSecret ? await getSecret(SECRET_NAMES.STRIPE_SECRET_KEY_NEXT) : null;

  return {
    hasActiveKey: !!activeKey,
    hasNextKey: !!nextKey,
    activeKeyPreview: maskKey(activeKey),
    nextKeyPreview: maskKey(nextKey),
    lastRotatedAt: activeSecret?.lastRotatedAt || null,
  };
}

// ============================================
// STRIPE WEBHOOK SECRET MANAGEMENT
// ============================================

/**
 * Load Stripe webhook secrets
 */
export async function loadStripeWebhookSecrets(): Promise<SecretKeys> {
  const [active, next] = await Promise.all([
    getSecret(SECRET_NAMES.STRIPE_WEBHOOK_SECRET_ACTIVE),
    getSecret(SECRET_NAMES.STRIPE_WEBHOOK_SECRET_NEXT),
  ]);

  return { active, next };
}

/**
 * Get all valid webhook secrets (for signature verification)
 */
export async function getAllValidWebhookSecrets(): Promise<string[]> {
  const { active, next } = await loadStripeWebhookSecrets();
  
  const secrets: string[] = [];
  if (active) secrets.push(active);
  if (next) secrets.push(next);
  
  return secrets;
}

/**
 * Set webhook secret
 */
export async function setStripeWebhookSecret(
  secret: string,
  adminId: string,
  slot: 'active' | 'next' = 'active'
): Promise<void> {
  const name = slot === 'active'
    ? SECRET_NAMES.STRIPE_WEBHOOK_SECRET_ACTIVE
    : SECRET_NAMES.STRIPE_WEBHOOK_SECRET_NEXT;

  await storeSecret(name, secret, adminId);
}

// ============================================
// EXPORTS
// ============================================

export const secretsService = {
  // Core
  storeSecret,
  getSecret,
  hasSecret,
  deleteSecret,
  
  // Stripe Keys
  loadStripeKeys,
  getActiveStripeKey,
  getAllValidStripeKeys,
  rotateStripeKey,
  promoteStripeKey,
  getStripeKeyStatus,
  
  // Webhook Secrets
  loadStripeWebhookSecrets,
  getAllValidWebhookSecrets,
  setStripeWebhookSecret,
};
