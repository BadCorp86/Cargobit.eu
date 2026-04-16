/**
 * Partner Authentication Service
 * Handles API-Key authentication and JWT with Partner Scopes
 */

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Partner Scopes
export const PARTNER_SCOPES = {
  INSURANCE_READ: 'insurance:read',
  INSURANCE_WRITE: 'insurance:write',
  ADS_READ: 'ads:read',
  ADS_WRITE: 'ads:write',
  BILLING_READ: 'billing:read',
} as const;

export type PartnerScope = typeof PARTNER_SCOPES[keyof typeof PARTNER_SCOPES];

// Partner Session
export interface PartnerSession {
  partnerId: string;
  partnerName: string;
  partnerType: 'INSURANCE' | 'ADS';
  apiKeyId: string;
  apiKeyName: string;
  scopes: PartnerScope[];
  isTestMode: boolean;
}

// Generate API Key
export function generateApiKey(prefix: string = 'cb_partner'): string {
  const randomBytes = crypto.randomBytes(32);
  const key = randomBytes.toString('base64url');
  return `${prefix}_${key}`;
}

// Hash API Key for storage
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Get API Key prefix for display
export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 12) + '...';
}

// Verify API Key and return partner session
export async function verifyPartnerApiKey(
  apiKey: string
): Promise<PartnerSession | null> {
  try {
    const hashedKey = hashApiKey(apiKey);
    
    const keyRecord = await db.partnerApiKey.findUnique({
      where: { apiKey: hashedKey },
      include: { partner: true },
    });

    if (!keyRecord || keyRecord.status !== 'ACTIVE') {
      return null;
    }

    // Check expiration
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      await db.partnerApiKey.update({
        where: { id: keyRecord.id },
        data: { status: 'EXPIRED' },
      });
      return null;
    }

    // Update last used
    await db.partnerApiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // Parse scopes
    const scopes = JSON.parse(keyRecord.scopes || '[]') as PartnerScope[];

    return {
      partnerId: keyRecord.partnerId,
      partnerName: keyRecord.partner.name,
      partnerType: keyRecord.partner.type as 'INSURANCE' | 'ADS',
      apiKeyId: keyRecord.id,
      apiKeyName: keyRecord.name,
      scopes,
      isTestMode: keyRecord.isTestKey,
    };
  } catch (error) {
    console.error('Error verifying partner API key:', error);
    return null;
  }
}

// Check if partner has required scope
export function hasScope(session: PartnerSession, requiredScope: PartnerScope): boolean {
  return session.scopes.includes(requiredScope);
}

// Check multiple scopes (any match)
export function hasAnyScope(session: PartnerSession, scopes: PartnerScope[]): boolean {
  return scopes.some(scope => session.scopes.includes(scope));
}

// Middleware for Partner API Routes
export async function withPartnerAuth(
  request: NextRequest,
  requiredScopes: PartnerScope[]
): Promise<{ session: PartnerSession } | { error: NextResponse }> {
  // Get API Key from header
  const apiKey = request.headers.get('x-api-key') || 
                 request.headers.get('authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return {
      error: NextResponse.json(
        { error: 'API key required', code: 'MISSING_API_KEY' },
        { status: 401 }
      ),
    };
  }

  const session = await verifyPartnerApiKey(apiKey);

  if (!session) {
    return {
      error: NextResponse.json(
        { error: 'Invalid or expired API key', code: 'INVALID_API_KEY' },
        { status: 401 }
      ),
    };
  }

  // Check scopes
  if (!hasAnyScope(session, requiredScopes)) {
    return {
      error: NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_SCOPE', required: requiredScopes },
        { status: 403 }
      ),
    };
  }

  return { session };
}

// Create Partner API Key
export async function createPartnerApiKey(
  partnerId: string,
  name: string,
  scopes: PartnerScope[],
  isTestKey: boolean = true,
  expiresAt?: Date
): Promise<{ apiKey: string; apiKeyPrefix: string }> {
  const rawKey = generateApiKey();
  const hashedKey = hashApiKey(rawKey);
  const prefix = getApiKeyPrefix(rawKey);

  await db.partnerApiKey.create({
    data: {
      partnerId,
      name,
      apiKey: hashedKey,
      apiKeyPrefix: prefix,
      scopes: JSON.stringify(scopes),
      isTestKey,
      expiresAt,
    },
  });

  return { apiKey: rawKey, apiKeyPrefix: prefix };
}

// Revoke API Key
export async function revokePartnerApiKey(
  apiKeyId: string,
  reason?: string
): Promise<void> {
  await db.partnerApiKey.update({
    where: { id: apiKeyId },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });
}

// Rate limiting (simple in-memory, should use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  partnerId: string,
  limit: number = 300,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = partnerId;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}
