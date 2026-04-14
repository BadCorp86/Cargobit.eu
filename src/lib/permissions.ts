// ============================================
// CARGOBIT PERMISSION MIDDLEWARE
// API Route Protection
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  SystemRole, 
  Permission, 
  hasPermission, 
  hasAnyPermission,
  ROLE_VERIFICATION_REQUIREMENTS 
} from '@/types/permissions';

// ============================================
// INTERFACES
// ============================================

export interface AuthContext {
  userId: string;
  email: string;
  roles: SystemRole[];
  companyId?: string;
  companyRole?: 'owner' | 'admin' | 'member';
  isVerified: boolean;
  riskScore: number;
  activeSecurityFlags: number;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermission?: Permission;
  missingVerifications?: string[];
}

// ============================================
// AUTH CONTEXT EXTRACTION
// ============================================

export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  // In production, this would extract from JWT/session
  // For now, we'll use a header-based approach for development
  
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return null;
  }

  // Get user with roles and company
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: { role: true }
      },
      companyUsers: {
        include: { company: true }
      },
      securityFlags: {
        where: { active: true }
      }
    }
  });

  if (!user) {
    return null;
  }

  const roles = user.roles.map(ur => ur.role.name as SystemRole);
  const companyUser = user.companyUsers[0];
  
  // Calculate risk score based on flags and history
  const criticalFlags = user.securityFlags.filter(f => f.severity === 'CRITICAL').length;
  const highFlags = user.securityFlags.filter(f => f.severity === 'HIGH').length;
  const mediumFlags = user.securityFlags.filter(f => f.severity === 'MEDIUM').length;
  
  const riskScore = Math.min(100, 
    (criticalFlags * 25) + 
    (highFlags * 15) + 
    (mediumFlags * 5)
  );

  return {
    userId: user.id,
    email: user.email,
    roles,
    companyId: companyUser?.companyId,
    companyRole: companyUser?.roleInCompany as 'owner' | 'admin' | 'member',
    isVerified: user.businessVerified === 'VERIFIED',
    riskScore,
    activeSecurityFlags: user.securityFlags.length
  };
}

// ============================================
// PERMISSION MIDDLEWARE
// ============================================

export function requirePermission(...permissions: Permission[]) {
  return async (
    request: NextRequest,
    handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const authContext = await getAuthContext(request);
    
    if (!authContext) {
      return NextResponse.json({
        error: 'UnauthorizedError',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 });
    }

    // Check if user has any of the required permissions
    const hasAccess = authContext.roles.some(role => 
      hasAnyPermission(role, permissions)
    );

    if (!hasAccess) {
      return NextResponse.json({
        error: 'ForbiddenError',
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permissions
      }, { status: 403 });
    }

    // Check for high risk score
    if (authContext.riskScore >= 75) {
      return NextResponse.json({
        error: 'ForbiddenError',
        message: 'Account restricted due to security concerns',
        code: 'ACCOUNT_RESTRICTED'
      }, { status: 403 });
    }

    return handler(request, authContext);
  };
}

export function requireRole(...roles: SystemRole[]) {
  return async (
    request: NextRequest,
    handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const authContext = await getAuthContext(request);
    
    if (!authContext) {
      return NextResponse.json({
        error: 'UnauthorizedError',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 });
    }

    const hasRole = authContext.roles.some(role => roles.includes(role));
    
    if (!hasRole) {
      return NextResponse.json({
        error: 'ForbiddenError',
        message: 'Required role not found',
        code: 'INSUFFICIENT_ROLE',
        required: roles
      }, { status: 403 });
    }

    return handler(request, authContext);
  };
}

// ============================================
// RESOURCE OWNERSHIP CHECK
// ============================================

export async function checkResourceOwnership(
  authContext: AuthContext,
  resourceType: 'transport' | 'vehicle' | 'driver' | 'wallet' | 'offer',
  resourceId: string
): Promise<boolean> {
  // Admin can access everything
  if (authContext.roles.includes('ADMIN')) {
    return true;
  }

  switch (resourceType) {
    case 'transport': {
      const transport = await db.transport.findUnique({
        where: { id: resourceId },
        select: { shipperUserId: true, driverId: true }
      });
      
      if (!transport) return false;
      
      // Check if user is shipper
      if (transport.shipperUserId === authContext.userId) return true;
      
      // Check if user is assigned driver
      if (transport.driverId) {
        const driver = await db.driver.findUnique({
          where: { id: transport.driverId },
          select: { userId: true }
        });
        if (driver?.userId === authContext.userId) return true;
      }
      
      // Check company ownership
      if (authContext.companyId) {
        const companyTransport = await db.transport.findFirst({
          where: {
            id: resourceId,
            shipperCompanyId: authContext.companyId
          }
        });
        if (companyTransport) return true;
      }
      
      return false;
    }
    
    case 'vehicle': {
      if (!authContext.companyId) return false;
      
      const vehicle = await db.vehicle.findUnique({
        where: { id: resourceId },
        select: { companyId: true }
      });
      
      return vehicle?.companyId === authContext.companyId;
    }
    
    case 'driver': {
      // Check if it's the driver's own record
      const driver = await db.driver.findUnique({
        where: { id: resourceId },
        select: { userId: true, companyId: true }
      });
      
      if (!driver) return false;
      
      if (driver.userId === authContext.userId) return true;
      
      if (authContext.companyId && driver.companyId === authContext.companyId) {
        return true;
      }
      
      return false;
    }
    
    case 'wallet': {
      const wallet = await db.wallet.findUnique({
        where: { id: resourceId },
        select: { ownerUserId: true, ownerCompanyId: true }
      });
      
      if (!wallet) return false;
      
      if (wallet.ownerUserId === authContext.userId) return true;
      
      if (authContext.companyId && wallet.ownerCompanyId === authContext.companyId) {
        return true;
      }
      
      return false;
    }
    
    case 'offer': {
      const offer = await db.offer.findUnique({
        where: { id: resourceId },
        include: {
          transport: { select: { shipperUserId: true } },
          driver: { select: { userId: true } }
        }
      });
      
      if (!offer) return false;
      
      if (offer.transport.shipperUserId === authContext.userId) return true;
      if (offer.driver.userId === authContext.userId) return true;
      
      return false;
    }
    
    default:
      return false;
  }
}

// ============================================
// VERIFICATION REQUIREMENTS CHECK
// ============================================

export async function checkVerificationRequirements(
  authContext: AuthContext,
  feature: string
): Promise<PermissionCheckResult> {
  const missingVerifications: string[] = [];
  
  for (const role of authContext.roles) {
    const requirements = ROLE_VERIFICATION_REQUIREMENTS[role] || [];
    
    for (const req of requirements) {
      if (req.restrictsFeature?.includes(feature)) {
        // Check if verification is complete
        const verification = await db.verification.findFirst({
          where: {
            userId: authContext.userId,
            type: req.type,
            status: 'APPROVED'
          }
        });
        
        if (!verification) {
          missingVerifications.push(req.type);
        }
      }
    }
  }
  
  if (missingVerifications.length > 0) {
    return {
      allowed: false,
      reason: `Verification required: ${missingVerifications.join(', ')}`,
      missingVerifications
    };
  }
  
  return { allowed: true };
}

// ============================================
// RATE LIMITING
// ============================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  maxRequests: number = 100,
  windowMs: number = 60000
) {
  return async (
    request: NextRequest,
    identifier?: string
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> => {
    const authContext = await getAuthContext(request);
    const key = identifier || authContext?.userId || request.headers.get('x-forwarded-for') || 'anonymous';
    
    const now = Date.now();
    const record = rateLimitStore.get(key);
    
    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
    }
    
    if (record.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetAt: record.resetAt };
    }
    
    record.count++;
    return { allowed: true, remaining: maxRequests - record.count, resetAt: record.resetAt };
  };
}

// ============================================
// AUDIT LOGGING
// ============================================

export async function logAuditEvent(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  dataBefore?: Record<string, unknown>;
  dataAfter?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await db.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action as any,
      entityType: params.entityType,
      entityId: params.entityId,
      dataBefore: params.dataBefore ? JSON.stringify(params.dataBefore) : null,
      dataAfter: params.dataAfter ? JSON.stringify(params.dataAfter) : null,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    }
  });
}

// ============================================
// EXPORTS
// ============================================

export type { AuthContext, PermissionCheckResult };
