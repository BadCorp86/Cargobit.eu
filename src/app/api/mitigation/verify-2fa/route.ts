// ============================================
// MITIGATION API: POST /api/mitigation/verify-2fa
// 2FA-Mitigation abschließen
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { mitigationService } from '@/services/mitigation.service';
import { MITIGATION_ERROR_CODES } from '@/types/mitigation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.mitigationId) {
      return NextResponse.json(
        {
          error: MITIGATION_ERROR_CODES.MITIGATION_NOT_FOUND.code,
          message: 'mitigationId is required',
        },
        { status: 400 }
      );
    }

    if (!body.code) {
      return NextResponse.json(
        {
          error: MITIGATION_ERROR_CODES.INVALID_2FA_CODE.code,
          message: 'Verification code is required',
        },
        { status: 400 }
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(body.code)) {
      return NextResponse.json(
        {
          error: MITIGATION_ERROR_CODES.INVALID_2FA_CODE.code,
          message: 'Code must be 6 digits',
        },
        { status: 400 }
      );
    }

    const result = await mitigationService.verify2FA({
      mitigationId: body.mitigationId,
      code: body.code,
    });

    if (result.status === 'error') {
      return NextResponse.json(
        {
          error: MITIGATION_ERROR_CODES.MITIGATION_NOT_FOUND.code,
          message: result.message,
        },
        { status: 404 }
      );
    }

    if (result.status === 'failed') {
      const statusCode = result.remainingAttempts === 0 ? 403 : 400;
      return NextResponse.json(
        {
          status: result.status,
          message: result.message,
          remainingAttempts: result.remainingAttempts,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      status: result.status,
      message: result.message,
    });
  } catch (error) {
    console.error('[MitigationAPI] Error in POST /api/mitigation/verify-2fa:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to verify 2FA code',
      },
      { status: 500 }
    );
  }
}
