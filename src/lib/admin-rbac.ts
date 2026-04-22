/**
 * CargoBit Admin RBAC Middleware
 * 
 * Reusable middleware for checking admin roles and permissions.
 * 
 * Usage:
 * ```typescript
 * import { withAdminAuth, requireRoles } from '@/lib/admin-rbac';
 * 
 * export async function GET(request: NextRequest) {
 *   return withAdminAuth(request, async (admin) => {
 *     // admin is validated and has at least SUPPORT role
 *     return NextResponse.json({ data: 'sensitive' });
 *   });
 * }
 * 
 * export async function POST(request: NextRequest) {
 *   return withAdminAuth(request, async (admin) => {
 *     // Check specific permission
 *     if (!hasPermission(admin.role, 'refunds:create')) {
 *       return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
 *     }
 *     // Process refund...
 *   }, ['admin', 'finance']); // Only admin and finance can access
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService, hasPermission, AdminRole } from '@/services/admin-auth.service';
import * as jwt from 'jsonwebtoken';

// ============================================
// TYPES
// ============================================

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  is2faEnabled: boolean;
}

export interface DecodedAdminToken {
  sub: string;      // Admin ID
  role: AdminRole;
  iat: number;
  exp: number;
}

// ============================================
// CONFIGURATION
// ============================================

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'cargobit-admin-secret-change-in-production';

// ============================================
// HELPER: GET TOKEN FROM REQUEST
// ============================================

function getTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookie
  const sessionCookie = request.cookies.get('admin_session');
  if (sessionCookie) {
    return sessionCookie.value;
  }
  
  return null;
}

// ============================================
// HELPER: VERIFY TOKEN
// ============================================

export async function verifyAdminToken(token: string): Promise<AdminUser | null> {
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as DecodedAdminToken;
    
    // Verify admin exists and is active
    const admin = await adminAuthService.verifyToken(token);
    if (!admin) return null;
    
    return admin;
  } catch {
    return null;
  }
}

// ============================================
// MIDDLEWARE: WITH ADMIN AUTH
// ============================================

/**
 * Middleware wrapper for admin-protected routes.
 * 
 * @param request - Next.js request object
 * @param handler - Handler function that receives the verified admin user
 * @param allowedRoles - Optional array of roles that can access (default: all roles)
 * @returns NextResponse
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: (admin: AdminUser) => Promise<NextResponse>,
  allowedRoles?: AdminRole[]
): Promise<NextResponse> {
  // Get token
  const token = getTokenFromRequest(request);
  
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized - No token provided' },
      { status: 401 }
    );
  }
  
  // Verify token
  const admin = await verifyAdminToken(token);
  
  if (!admin) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid token' },
      { status: 401 }
    );
  }
  
  // Check role if specified
  if (allowedRoles && !allowedRoles.includes(admin.role)) {
    return NextResponse.json(
      { error: 'Forbidden - Insufficient role' },
      { status: 403 }
    );
  }
  
  // Call handler with verified admin
  return handler(admin);
}

// ============================================
// MIDDLEWARE: REQUIRE ROLE
// ============================================

/**
 * Create a role-checking middleware.
 * 
 * @param allowedRoles - Array of roles that can access
 * @returns Middleware function
 */
export function requireRoles(...allowedRoles: AdminRole[]) {
  return (role: AdminRole): boolean => {
    return allowedRoles.includes(role);
  };
}

// ============================================
// MIDDLEWARE: REQUIRE PERMISSION
// ============================================

/**
 * Check if admin has a specific permission.
 * 
 * @param admin - Admin user object
 * @param permission - Permission string (e.g., 'refunds:create')
 * @returns boolean
 */
export function checkPermission(admin: AdminUser, permission: string): boolean {
  return hasPermission(admin.role, permission);
}

// ============================================
// CONVENIENCE EXPORTS
// ============================================

// Re-export from service
export { hasPermission, ROLE_PERMISSIONS } from '@/services/admin-auth.service';
export { AdminRole };
