import { NextRequest, NextResponse } from 'next/server';
import { db } from './db';

// User interface for authenticated requests
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  companyName: string | null;
  isBlocked: boolean;
  membershipTier: string;
}

// Session token interface
interface SessionToken {
  userId: string;
  expiresAt: Date;
}

// Role hierarchy for permission checks
const roleHierarchy: Record<string, number> = {
  'ADMIN': 100,
  'SUPPORT': 50,
  'DISPATCHER': 30,
  'SHIPPER': 20,
  'DRIVER': 10,
};

/**
 * Extract session token from request headers or cookies
 */
function extractSessionToken(request: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies
  const cookieToken = request.cookies.get('session_token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // Check custom header for API clients
  const customToken = request.headers.get('x-session-token');
  if (customToken) {
    return customToken;
  }

  return null;
}

/**
 * Verify session token and get user
 */
async function verifySession(token: string): Promise<AuthUser | null> {
  try {
    // In production, this should validate against a sessions table or JWT
    // For now, we'll use a simple token format: userId.timestamp.signature
    const parts = token.split('.');
    if (parts.length < 1) {
      return null;
    }

    const userId = parts[0];

    // Get user from database
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        companyName: true,
        isBlocked: true,
        membershipTier: true,
      },
    });

    if (!user) {
      return null;
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return null;
    }

    // Check if user is active
    if (user.status !== 'ACTIVE' && user.status !== 'VERIFIED') {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

/**
 * Higher-order function to protect API routes with authentication
 */
export function withAuth(
  handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const token = extractSessionToken(request);

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No session token provided' },
        { status: 401 }
      );
    }

    const user = await verifySession(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    return handler(request, user);
  };
}

/**
 * Require specific role(s) for access
 */
export function requireRole(...allowedRoles: string[]) {
  return (
    handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse>
  ) => {
    return withAuth(async (request, user) => {
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Insufficient permissions' },
          { status: 403 }
        );
      }
      return handler(request, user);
    });
  };
}

/**
 * Require minimum role level (using hierarchy)
 */
export function requireMinRole(minRole: string) {
  return (
    handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse>
  ) => {
    return withAuth(async (request, user) => {
      const userLevel = roleHierarchy[user.role] || 0;
      const requiredLevel = roleHierarchy[minRole] || 0;

      if (userLevel < requiredLevel) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Insufficient role level' },
          { status: 403 }
        );
      }
      return handler(request, user);
    });
  };
}

/**
 * Check if user owns a resource or has admin/support access
 */
export function requireOwnerOrAdmin(
  getResourceOwnerId: (request: NextRequest) => Promise<string | null>
) {
  return (
    handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse>
  ) => {
    return withAuth(async (request, user) => {
      // Admin and Support can access any resource
      if (user.role === 'ADMIN' || user.role === 'SUPPORT') {
        return handler(request, user);
      }

      const resourceOwnerId = await getResourceOwnerId(request);

      if (!resourceOwnerId || resourceOwnerId !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'You do not have access to this resource' },
          { status: 403 }
        );
      }

      return handler(request, user);
    });
  };
}

/**
 * Generate a session token for a user
 */
export function generateSessionToken(userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `${userId}.${timestamp}.${random}`;
}

/**
 * Create session for user (call this after login)
 */
export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken(userId);
  // In production, store this in a sessions table with expiration
  return token;
}

/**
 * Auth helper for client-side requests
 */
export function getAuthHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Rate limiting helper (simple in-memory implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetAt < now) {
    // New window
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Add rate limiting to a handler
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  maxRequests: number = 100,
  windowMs: number = 60000
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Use IP or user ID as identifier
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const identifier = Array.isArray(ip) ? ip[0] : ip;

    const { allowed, remaining, resetAt } = checkRateLimit(
      identifier,
      maxRequests,
      windowMs
    );

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests', message: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetAt.toString(),
          },
        }
      );
    }

    const response = await handler(request);

    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', resetAt.toString());

    return response;
  };
}
