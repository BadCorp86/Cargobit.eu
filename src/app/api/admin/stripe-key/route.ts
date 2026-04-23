/**
 * Stripe Key Management
 * GET /api/admin/stripe-key - Get key status
 * POST /api/admin/stripe-key - Save active key
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/services/admin-auth.service';
import { secretsService } from '@/services/secrets.service';

/**
 * Get Stripe key status
 */
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

    const status = await secretsService.getStripeKeyStatus();

    return NextResponse.json({
      success: true,
      ...status,
    });

  } catch (error) {
    console.error('[Admin] Stripe key status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Save Stripe key directly to active slot
 * Used for initial setup
 */
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
    const { key } = body;

    if (!key || !key.startsWith('sk_')) {
      return NextResponse.json(
        { error: 'Invalid Stripe key format. Key should start with "sk_"' },
        { status: 400 }
      );
    }

    // Store as active key
    await secretsService.storeSecret(
      'stripe_secret_key_active',
      key,
      admin.adminId
    );

    return NextResponse.json({
      success: true,
      message: 'Stripe key saved successfully',
    });

  } catch (error) {
    console.error('[Admin] Stripe key save error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
