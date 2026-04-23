import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

/**
 * Admin Auth Verification
 *
 * Verifiziert JWT Tokens für Admin-Endpunkte.
 * Unterstützt:
 * - Authorization: Bearer <token>
 * - X-Admin-Token Header (für Service-to-Service)
 */

interface AdminAuthResult {
  valid: boolean;
  userId?: string;
  role?: string;
  error?: string;
}

interface DecodedToken {
  sub: string;
  role: string;
  permissions?: string[];
  iat: number;
  exp: number;
}

/**
 * Verifiziert Admin-Authentifizierung
 */
export async function verifyAdminAuth(request: NextRequest): Promise<AdminAuthResult> {
  try {
    // 1. Versuche Bearer Token aus Authorization Header
    const authHeader = request.headers.get('authorization');
    let token: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // 2. Fallback: X-Admin-Token Header (für interne Services)
    if (!token) {
      token = request.headers.get('x-admin-token');
    }

    // 3. Fallback: Query Parameter (nur für bestimmte Endpunkte)
    if (!token) {
      const url = new URL(request.url);
      token = url.searchParams.get('admin_token');
    }

    if (!token) {
      return {
        valid: false,
        error: 'No authentication token provided',
      };
    }

    // 4. Verifiziere JWT
    const jwtSecret = process.env.JWT_SECRET || process.env.AUTH_SECRET;

    if (!jwtSecret) {
      console.error('JWT_SECRET or AUTH_SECRET not configured');
      return {
        valid: false,
        error: 'Server configuration error',
      };
    }

    const decoded = jwt.verify(token, jwtSecret) as DecodedToken;

    // 5. Prüfe Admin-Rolle
    const adminRoles = ['admin', 'super_admin', 'finance_admin', 'support_lead'];

    if (!adminRoles.includes(decoded.role)) {
      return {
        valid: false,
        error: 'Insufficient permissions',
      };
    }

    // 6. Prüfe ob Token nicht abgelaufen ist
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      return {
        valid: false,
        error: 'Token expired',
      };
    }

    return {
      valid: true,
      userId: decoded.sub,
      role: decoded.role,
    };
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return {
        valid: false,
        error: 'Invalid token',
      };
    }

    if (error.name === 'TokenExpiredError') {
      return {
        valid: false,
        error: 'Token expired',
      };
    }

    console.error('Admin auth error:', error);
    return {
      valid: false,
      error: 'Authentication failed',
    };
  }
}

/**
 * Verifiziert Service-to-Service Auth (API Key)
 */
export async function verifyServiceAuth(request: NextRequest): Promise<boolean> {
  const serviceKey = request.headers.get('x-service-key');
  const expectedKey = process.env.SERVICE_API_KEY;

  if (!serviceKey || !expectedKey) {
    return false;
  }

  // Constant-time comparison
  return serviceKey.length === expectedKey.length &&
    serviceKey === expectedKey;
}

/**
 * Prüft ob Request von internem Service kommt
 */
export function isInternalRequest(request: NextRequest): boolean {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const clusterIp = process.env.CLUSTER_IP_RANGE || '10.';

  // Prüfe ob IP aus Cluster-Bereich kommt
  const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp;

  if (clientIp && clientIp.startsWith(clusterIp)) {
    return true;
  }

  // Prüfe Service-Key
  const serviceKey = request.headers.get('x-service-key');
  return !!serviceKey && serviceKey === process.env.SERVICE_API_KEY;
}

/**
 * Erstellt Admin JWT Token (für Tests)
 */
export function createAdminToken(
  userId: string,
  role: string = 'admin',
  expiresIn: string = '1h'
): string {
  const jwtSecret = process.env.JWT_SECRET || process.env.AUTH_SECRET || 'test-secret';

  return jwt.sign(
    {
      sub: userId,
      role,
      permissions: ['reconciliation:read', 'reconciliation:write'],
    },
    jwtSecret,
    { expiresIn }
  );
}
