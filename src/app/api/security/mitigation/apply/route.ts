// ============================================
// CARGOBIT SECURITY GATEWAY API
// POST /api/security/mitigation/apply
// Trigger Mitigation Service
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { securityGatewayService } from '@/services/security-gateway.service';
import {
  SecurityMitigationApplyRequest,
  SECURITY_ERROR_CODES,
  MitigationType,
} from '@/types/security';

const VALID_MITIGATION_TYPES: MitigationType[] = [
  'delay',
  '2fa',
  'gps_check',
  'extra_logging',
  'document_recheck',
  'manual_review',
  'amount_limit',
];

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: SecurityMitigationApplyRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        status: 'error',
        errorCode: 'MALFORMED_JSON',
        message: SECURITY_ERROR_CODES.MALFORMED_JSON.message,
      }, { status: 400 });
    }

    // Validate required fields
    const missingFields: string[] = [];
    if (!body.entityType) missingFields.push('entityType');
    if (!body.entityId) missingFields.push('entityId');
    if (!body.action) missingFields.push('action');
    if (!body.mitigationType) missingFields.push('mitigationType');

    if (missingFields.length > 0) {
      return NextResponse.json({
        status: 'error',
        errorCode: 'INVALID_REQUEST',
        message: `Missing required fields: ${missingFields.join(', ')}`,
      }, { status: 400 });
    }

    // Validate mitigation type
    if (!VALID_MITIGATION_TYPES.includes(body.mitigationType)) {
      return NextResponse.json({
        status: 'error',
        errorCode: 'INVALID_REQUEST',
        message: `Invalid mitigation type. Must be one of: ${VALID_MITIGATION_TYPES.join(', ')}`,
      }, { status: 400 });
    }

    // Apply mitigation
    const result = await securityGatewayService.applyMitigation(body);

    // Determine HTTP status
    let httpStatus = 200;
    if (result.status === 'error' && result.errorCode) {
      httpStatus = SECURITY_ERROR_CODES[result.errorCode]?.httpStatus || 500;
    }

    // Add headers for pending mitigations
    const headers: Record<string, string> = {};
    if (result.mitigationId) {
      headers['X-Mitigation-ID'] = result.mitigationId;
    }
    if (result.executeAt) {
      headers['X-Execute-At'] = result.executeAt;
    }

    return NextResponse.json(result, { status: httpStatus, headers });
  } catch (error) {
    console.error('[MitigationApply] Error:', error);
    return NextResponse.json({
      status: 'error',
      errorCode: 'MITIGATION_FAILED',
      message: 'Internal server error',
    }, { status: 500 });
  }
}
