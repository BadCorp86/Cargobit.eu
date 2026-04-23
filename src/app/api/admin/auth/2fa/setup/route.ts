/**
 * Setup 2FA
 * GET /api/admin/auth/2fa/setup
 * 
 * Returns: { secret, otpAuthUrl } - for QR code generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/services/admin-auth.service';

export async function GET(request: NextRequest) {
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

    const result = await adminAuthService.setup2fa(admin.adminId);

    return NextResponse.json({
      success: true,
      secret: result.secret,
      otpAuthUrl: result.otpAuthUrl,
    });

  } catch (error) {
    console.error('[Admin Auth] 2FA setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
