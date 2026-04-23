// ============================================
// CARGOBIT SECURITY GATEWAY API
// POST /api/security/risk/override
// Manual Risk Override for Support/Compliance
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { securityGatewayService } from '@/services/security-gateway.service';
import {
  RiskOverrideRequest,
  SECURITY_ERROR_CODES,
  RiskLevel,
} from '@/types/security';

const VALID_RISK_LEVELS: RiskLevel[] = ['green', 'yellow', 'red'];

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: RiskOverrideRequest;
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
    if (!body.newLevel) missingFields.push('newLevel');
    if (!body.reason) missingFields.push('reason');
    if (!body.actorId) missingFields.push('actorId');

    if (missingFields.length > 0) {
      return NextResponse.json({
        status: 'error',
        errorCode: 'INVALID_REQUEST',
        message: `Missing required fields: ${missingFields.join(', ')}`,
      }, { status: 400 });
    }

    // Validate risk level
    if (!VALID_RISK_LEVELS.includes(body.newLevel)) {
      return NextResponse.json({
        status: 'error',
        errorCode: 'INVALID_REQUEST',
        message: `Invalid risk level. Must be one of: ${VALID_RISK_LEVELS.join(', ')}`,
      }, { status: 400 });
    }

    // Validate score range if provided
    if (body.newScore !== undefined && (body.newScore < 0 || body.newScore > 100)) {
      return NextResponse.json({
        status: 'error',
        errorCode: 'INVALID_RISK_CONTEXT',
        message: 'Score must be between 0 and 100',
      }, { status: 400 });
    }

    // Perform risk override
    const result = await securityGatewayService.overrideRisk(body);

    // Determine HTTP status
    let httpStatus = 200;
    if (result.status === 'error' && result.errorCode) {
      httpStatus = SECURITY_ERROR_CODES[result.errorCode]?.httpStatus || 500;
    }

    return NextResponse.json(result, { status: httpStatus });
  } catch (error) {
    console.error('[RiskOverride] Error:', error);
    return NextResponse.json({
      status: 'error',
      errorCode: 'INVALID_REQUEST',
      message: 'Internal server error',
    }, { status: 500 });
  }
}
