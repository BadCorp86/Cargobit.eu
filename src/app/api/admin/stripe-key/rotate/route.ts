/**
 * Rotate Stripe Key
 * POST /api/admin/stripe-key/rotate
 * 
 * Body: { newKey }
 * Stores new key in "next" slot for testing before promotion
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/services/admin-auth.service';
import { secretsService } from '@/services/secrets.service';

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
    const { newKey } = body;

    if (!newKey) {
      return NextResponse.json(
        { error: 'New key is required' },
        { status: 400 }
      );
    }

    const result = await secretsService.rotateStripeKey(newKey, admin.adminId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });

  } catch (error) {
    console.error('[Admin] Stripe key rotation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
