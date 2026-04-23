// ============================================
// CARGOBIT SECURITY GATEWAY API
// GET /api/security/risk/{entityType}/{entityId}
// Get Current Risk Status for Dashboard/Support
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { securityGatewayService } from '@/services/security-gateway.service';
import { SECURITY_ERROR_CODES, SecurityEntityType } from '@/types/security';

const VALID_ENTITY_TYPES: SecurityEntityType[] = [
  'user',
  'company',
  'transaction',
  'transport',
  'wallet',
  'vehicle',
  'offer',
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  try {
    const { entityType, entityId } = await params;

    // Validate entity type
    if (!VALID_ENTITY_TYPES.includes(entityType as SecurityEntityType)) {
      return NextResponse.json({
        errorCode: 'INVALID_ENTITY_TYPE',
        message: `Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
      }, { status: 400 });
    }

    // Validate entity ID
    if (!entityId || entityId.trim() === '') {
      return NextResponse.json({
        errorCode: 'INVALID_REQUEST',
        message: 'Entity ID is required',
      }, { status: 400 });
    }

    // Get risk status
    const result = await securityGatewayService.getRiskStatus(
      entityType as SecurityEntityType,
      entityId
    );

    if (!result) {
      return NextResponse.json({
        errorCode: 'INVALID_ENTITY_TYPE',
        message: 'No risk data found for this entity',
        entityType,
        entityId,
        score: 0,
        level: 'green',
        lastUpdated: new Date().toISOString(),
        triggeredRules: [],
      }, { status: 404 });
    }

    // Add caching headers
    const headers: Record<string, string> = {
      'Cache-Control': 'no-store, max-age=0',
      'X-Risk-Level': result.level,
      'X-Risk-Score': String(result.score),
    };

    return NextResponse.json(result, { headers });
  } catch (error) {
    console.error('[RiskStatus] Error:', error);
    return NextResponse.json({
      errorCode: 'INVALID_REQUEST',
      message: 'Internal server error',
    }, { status: 500 });
  }
}
