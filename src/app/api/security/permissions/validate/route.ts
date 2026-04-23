// ============================================
// CARGOBIT SECURITY GATEWAY API
// POST /api/security/permissions/validate
// Quick Permission Check (no Risk evaluation)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { securityGatewayService } from '@/services/security-gateway.service';
import {
  PermissionValidateRequest,
  SECURITY_ERROR_CODES,
} from '@/types/security';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: PermissionValidateRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        allowed: false,
        errorCode: 'MALFORMED_JSON',
        message: SECURITY_ERROR_CODES.MALFORMED_JSON.message,
      }, { status: 400 });
    }

    // Validate required fields
    if (!body.user?.id || !body.user?.role || !body.action) {
      return NextResponse.json({
        allowed: false,
        errorCode: 'INVALID_REQUEST',
        message: 'Missing required fields: user.id, user.role, action',
      }, { status: 400 });
    }

    // Perform permission validation
    const result = securityGatewayService.validatePermission(body);

    // Determine HTTP status
    let httpStatus = 200;
    if (!result.allowed && result.errorCode) {
      httpStatus = SECURITY_ERROR_CODES[result.errorCode]?.httpStatus || 403;
    }

    return NextResponse.json(result, { status: httpStatus });
  } catch (error) {
    console.error('[PermissionValidate] Error:', error);
    return NextResponse.json({
      allowed: false,
      errorCode: 'INVALID_REQUEST',
      message: 'Internal server error',
    }, { status: 500 });
  }
}
