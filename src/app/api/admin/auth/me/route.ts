/**
 * CargoBit Admin - Get Current Admin User
 * 
 * GET /api/admin/auth/me
 * 
 * Returns the current authenticated admin user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-rbac';

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (admin) => {
    return NextResponse.json({
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        is2faEnabled: admin.is2faEnabled,
      },
    });
  });
}
