/**
 * CargoBit Admin User Detail API
 * 
 * PATCH /api/admin/users/{userId} - Update admin user
 * DELETE /api/admin/users/{userId} - Deactivate admin user
 * 
 * RBAC: ADMIN role only
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AdminRole } from '@/lib/admin-rbac';
import { adminAuthService } from '@/services/admin-auth.service';
import { AdminRole as PrismaAdminRole } from '@prisma/client';

// ============================================
// PATCH: UPDATE ADMIN USER
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  return withAdminAuth(request, async (admin) => {
    const userId = params.userId;
    
    // Parse request
    let body: {
      role?: string;
      is_active?: boolean;
    };
    
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { role, is_active } = body;
    
    // At least one field must be provided
    if (!role && is_active === undefined) {
      return NextResponse.json(
        { error: 'At least one field must be provided: role or is_active' },
        { status: 400 }
      );
    }
    
    // Validate role
    if (role && !['ADMIN', 'FINANCE', 'SUPPORT'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: ADMIN, FINANCE, or SUPPORT' },
        { status: 400 }
      );
    }
    
    // Prevent self-demotion/deactivation
    if (userId === admin.id) {
      if (role && role !== admin.role) {
        return NextResponse.json(
          { error: 'Cannot change your own role' },
          { status: 400 }
        );
      }
      if (is_active === false) {
        return NextResponse.json(
          { error: 'Cannot deactivate yourself' },
          { status: 400 }
        );
      }
    }
    
    // Update role if provided
    if (role) {
      const success = await adminAuthService.updateAdminRole(
        userId,
        role as PrismaAdminRole,
        admin.id
      );
      
      if (!success) {
        return NextResponse.json(
          { error: 'Admin user not found' },
          { status: 404 }
        );
      }
    }
    
    // Update active status if provided
    if (is_active !== undefined) {
      if (is_active) {
        // Reactivate
        await adminAuthService.deactivateAdmin(userId, admin.id);
      } else {
        // Deactivate
        await adminAuthService.deactivateAdmin(userId, admin.id);
      }
    }
    
    return NextResponse.json({
      status: 'updated',
    });
  }, [AdminRole.ADMIN]); // ADMIN only
}

// ============================================
// DELETE: DEACTIVATE ADMIN USER
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  return withAdminAuth(request, async (admin) => {
    const userId = params.userId;
    
    // Prevent self-deactivation
    if (userId === admin.id) {
      return NextResponse.json(
        { error: 'Cannot deactivate yourself' },
        { status: 400 }
      );
    }
    
    // Deactivate admin
    const success = await adminAuthService.deactivateAdmin(userId, admin.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      status: 'deactivated',
    });
  }, [AdminRole.ADMIN]); // ADMIN only
}
