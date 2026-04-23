/**
 * Enable 2FA
 * POST /api/admin/auth/2fa/enable
 * 
 * Body: { code }
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/services/admin-auth.service';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_access_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const admin = await adminAuthService.verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    const success = await adminAuthService.enable2fa(admin.adminId, code);

    if (!success) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '2FA has been enabled for your account',
    });

  } catch (error) {
    console.error('[Admin Auth] 2FA enable error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
