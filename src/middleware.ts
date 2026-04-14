// ============================================
// CARGOBIT MIDDLEWARE
// Route Protection & Security
// ============================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================
// ROUTE CONFIGURATION
// ============================================

interface RouteConfig {
  requiresAuth: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

const ROUTE_PROTECTION: Record<string, RouteConfig> = {
  // Public routes
  '/api/auth/login': { requiresAuth: false, riskLevel: 'MEDIUM', rateLimit: { requests: 10, windowMs: 60000 } },
  '/api/auth/register': { requiresAuth: false, riskLevel: 'MEDIUM', rateLimit: { requests: 5, windowMs: 60000 } },
  '/api/auth/reset-password': { requiresAuth: false, riskLevel: 'HIGH', rateLimit: { requests: 3, windowMs: 60000 } },
  
  // User routes
  '/api/user': { requiresAuth: true, riskLevel: 'LOW' },
  '/api/user/profile': { requiresAuth: true, riskLevel: 'LOW' },
  
  // Transport routes
  '/api/transports': { requiresAuth: true, riskLevel: 'MEDIUM' },
  '/api/transports/[id]': { requiresAuth: true, riskLevel: 'MEDIUM' },
  '/api/transports/[id]/assign': { requiresAuth: true, requiredRoles: ['DISPATCHER', 'ADMIN'], riskLevel: 'HIGH' },
  '/api/transports/[id]/status': { requiresAuth: true, requiredRoles: ['DRIVER_SELF_EMPLOYED', 'DISPATCHER', 'ADMIN'], riskLevel: 'MEDIUM' },
  
  // Wallet routes
  '/api/wallet': { requiresAuth: true, riskLevel: 'HIGH' },
  '/api/wallet/payout': { requiresAuth: true, riskLevel: 'HIGH', rateLimit: { requests: 5, windowMs: 3600000 } },
  '/api/wallet/deposit': { requiresAuth: true, riskLevel: 'MEDIUM' },
  
  // Admin routes
  '/api/admin': { requiresAuth: true, requiredRoles: ['ADMIN'], riskLevel: 'HIGH' },
  '/api/admin/users': { requiresAuth: true, requiredRoles: ['ADMIN'], riskLevel: 'HIGH' },
  '/api/admin/verification': { requiresAuth: true, requiredRoles: ['ADMIN', 'SUPPORT'], riskLevel: 'HIGH' },
  
  // Support routes
  '/api/support': { requiresAuth: true, requiredRoles: ['SUPPORT', 'ADMIN'], riskLevel: 'MEDIUM' },
  '/api/tickets': { requiresAuth: true, riskLevel: 'LOW' },
  
  // Matching routes
  '/api/matching': { requiresAuth: true, riskLevel: 'MEDIUM' },
  '/api/matching/start': { requiresAuth: true, requiredRoles: ['SHIPPER_COMPANY', 'SHIPPER_PRIVATE', 'DISPATCHER'], riskLevel: 'MEDIUM' },
  '/api/matching/assign': { requiresAuth: true, requiredRoles: ['DISPATCHER'], riskLevel: 'HIGH' },
  
  // Marketing routes
  '/api/campaigns': { requiresAuth: true, requiredRoles: ['MARKETER', 'ADMIN'], riskLevel: 'MEDIUM' },
  
  // Verification routes
  '/api/verification/kyc': { requiresAuth: true, riskLevel: 'HIGH', rateLimit: { requests: 3, windowMs: 3600000 } },
  '/api/verification/kyb': { requiresAuth: true, riskLevel: 'HIGH', rateLimit: { requests: 3, windowMs: 3600000 } },
};

// ============================================
// RATE LIMITING
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(
  identifier: string,
  config: { requests: number; windowMs: number }
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: config.requests - 1, resetAt };
  }

  if (entry.count >= config.requests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.requests - entry.count, resetAt: entry.resetAt };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function matchRoute(pathname: string, pattern: string): boolean {
  // Convert pattern to regex
  const regexPattern = pattern
    .replace(/\[.*?\]/g, '[^/]+')
    .replace(/\//g, '\\/');
  
  const regex = new RegExp(`^${regexPattern}(/.*)?$`);
  return regex.test(pathname);
}

function getRouteConfig(pathname: string): RouteConfig | null {
  for (const [pattern, config] of Object.entries(ROUTE_PROTECTION)) {
    if (matchRoute(pathname, pattern)) {
      return config;
    }
  }
  
  // Default for unmatched routes
  return { requiresAuth: true, riskLevel: 'MEDIUM' };
}

// ============================================
// MAIN MIDDLEWARE
// ============================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const config = getRouteConfig(pathname);

  // CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    
    response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Session-Token');
    response.headers.set('Access-Control-Max-Age', '86400');
    
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return response;
    }
  }

  // Skip if no config found (shouldn't happen)
  if (!config) {
    return NextResponse.next();
  }

  // Rate limiting
  if (config.rateLimit) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const identifier = `${ip}:${pathname}`;
    const rateLimit = checkRateLimit(identifier, config.rateLimit);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'TooManyRequests',
          message: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(config.rateLimit.requests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimit.resetAt),
            'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }
  }

  // Authentication check
  if (config.requiresAuth) {
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '') ||
                         request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          error: 'UnauthorizedError',
          message: 'Authentifizierung erforderlich',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }

    // Validate session (would normally check against database)
    // For now, we trust the token header in development
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        {
          error: 'UnauthorizedError',
          message: 'Ungültige Sitzung',
          code: 'INVALID_SESSION',
        },
        { status: 401 }
      );
    }

    // Role check
    if (config.requiredRoles && config.requiredRoles.length > 0) {
      const userRoles = request.headers.get('x-user-roles')?.split(',') || [];
      const hasRole = config.requiredRoles.some(role => userRoles.includes(role));

      if (!hasRole) {
        return NextResponse.json(
          {
            error: 'ForbiddenError',
            message: 'Unzureichende Berechtigungen',
            code: 'INSUFFICIENT_ROLE',
            required: config.requiredRoles,
          },
          { status: 403 }
        );
      }
    }

    // Add security headers for authenticated routes
    const response = NextResponse.next();
    
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    return response;
  }

  // Security headers for all responses
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  
  return response;
}

// ============================================
// CONFIGURATION
// ============================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};

// ============================================
// HELPER EXPORTS FOR API ROUTES
// ============================================

export function getAuthUser(request: NextRequest): { userId: string; roles: string[] } | null {
  const userId = request.headers.get('x-user-id');
  const roles = request.headers.get('x-user-roles')?.split(',') || [];

  if (!userId) return null;

  return { userId, roles };
}

export function requireAuth(request: NextRequest): { userId: string; roles: string[] } {
  const user = getAuthUser(request);
  
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  return user;
}

export function requireRole(request: NextRequest, roles: string[]): { userId: string; roles: string[] } {
  const user = requireAuth(request);
  
  const hasRole = roles.some(role => user.roles.includes(role));
  
  if (!hasRole) {
    throw new Error('FORBIDDEN');
  }

  return user;
}
