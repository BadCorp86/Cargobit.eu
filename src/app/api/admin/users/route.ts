/**
 * CargoBit Admin Users API
 * 
 * GET /api/admin/users - List all admin users
 * POST /api/admin/users - Create new admin user
 * 
 * RBAC: ADMIN role only
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAdminAuth, AdminRole } from '@/lib/admin-rbac';
import { adminAuthService } from '@/services/admin-auth.service';
import { AdminRole as PrismaAdminRole } from '@prisma/client';

// ============================================
// GET: LIST ADMIN USERS
// ============================================

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (admin) => {
    // Query admin users
    const adminUsers = await prisma.adminUser.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    // Format response
    const items = adminUsers.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      is_active: u.isActive,
      is_2fa_enabled: u.is2faEnabled,
      last_login_at: u.lastLoginAt,
      created_at: u.createdAt,
    }));
    
    return NextResponse.json(items);
  }, [AdminRole.ADMIN]); // ADMIN only
}

// ============================================
// POST: CREATE ADMIN USER
// ============================================

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (admin) => {
    // Parse request
    let body: {
      email: string;
      password: string;
      role: string;
    };
    
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { email, password, role } = body;
    
    // Validate input
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, role' },
        { status: 400 }
      );
    }
    
    if (!['ADMIN', 'FINANCE', 'SUPPORT'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be: ADMIN, FINANCE, or SUPPORT' },
        { status: 400 }
      );
    }
    
    // Validate password
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }
    
    // Check if email exists
    const existing = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }
    
    // Create admin user
    try {
      const newAdmin = await adminAuthService.createAdminUser(
        email,
        password,
        role as PrismaAdminRole,
        admin.id
      );
      
      return NextResponse.json({
        id: newAdmin.id,
        email: newAdmin.email,
        role: newAdmin.role,
        is_active: true,
        is_2fa_enabled: false,
        created_at: new Date().toISOString(),
      }, { status: 201 });
      
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to create admin user' },
        { status: 500 }
      );
    }
  }, [AdminRole.ADMIN]); // ADMIN only
}
