// ============================================
// CARGOBIT SECURITY GATEWAY API
// POST /api/security/check
// Core Hybrid Security Check (Permission + Risk + Mitigation)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { securityGatewayService } from '@/services/security-gateway.service';
import {
  SecurityCheckRequest,
  SECURITY_ERROR_CODES,
} from '@/types/security';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: SecurityCheckRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        allowed: false,
        decision: 'blocked',
        errorCode: 'MALFORMED_JSON',
        message: SECURITY_ERROR_CODES.MALFORMED_JSON.message,
        correlationId: `err_${Date.now()}`,
      }, { status: 400 });
    }

    // Validate required fields
    const missingFields: string[] = [];
    if (!body.requestId) missingFields.push('requestId');
    if (!body.user?.id) missingFields.push('user.id');
    if (!body.user?.role) missingFields.push('user.role');
    if (!body.action) missingFields.push('action');
    if (!body.entity?.type) missingFields.push('entity.type');
    if (!body.entity?.id) missingFields.push('entity.id');

    if (missingFields.length > 0) {
      return NextResponse.json({
        allowed: false,
        decision: 'blocked',
        errorCode: 'INVALID_REQUEST',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        correlationId: body.requestId || `err_${Date.now()}`,
      }, { status: 400 });
    }

    // Perform security check
    const result = await securityGatewayService.checkSecurity(body);

    // Determine HTTP status based on result
    let httpStatus = 200;
    if (!result.allowed && result.errorCode) {
      httpStatus = SECURITY_ERROR_CODES[result.errorCode]?.httpStatus || 403;
    }

    // Add security headers for mitigations
    const headers: Record<string, string> = {
      'X-Correlation-ID': result.correlationId,
    };

    if (result.mitigations && result.mitigations.length > 0) {
      headers['X-Security-Warning'] = 'mitigations_required';
      headers['X-Mitigations'] = result.mitigations.join(', ');
    }

    if (result.risk) {
      headers['X-Risk-Level'] = result.risk.level;
      headers['X-Risk-Score'] = String(result.risk.score);
    }

    return NextResponse.json(result, { status: httpStatus, headers });
  } catch (error) {
    console.error('[SecurityCheck] Error:', error);
    return NextResponse.json({
      allowed: false,
      decision: 'blocked',
      errorCode: 'INVALID_REQUEST',
      message: 'Internal server error',
      correlationId: `err_${Date.now()}`,
    }, { status: 500 });
  }
}
