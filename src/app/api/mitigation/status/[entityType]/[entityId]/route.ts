// ============================================
// MITIGATION API: GET /api/mitigation/status/[entityType]/[entityId]
// Aktive Mitigations abrufen
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { mitigationService } from '@/services/mitigation.service';
import { MitigationEntityType, MITIGATION_ERROR_CODES } from '@/types/mitigation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  try {
    const { entityType, entityId } = await params;

    // Validate entityType
    if (!Object.values(MitigationEntityType).includes(entityType.toUpperCase() as MitigationEntityType)) {
      return NextResponse.json(
        {
          error: MITIGATION_ERROR_CODES.INVALID_MITIGATION_TYPE.code,
          message: `entityType must be one of: ${Object.values(MitigationEntityType).join(', ')}`,
          validTypes: Object.values(MitigationEntityType),
        },
        { status: 400 }
      );
    }

    const result = await mitigationService.getStatus(
      entityType.toUpperCase() as MitigationEntityType,
      entityId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[MitigationAPI] Error in GET /api/mitigation/status:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve mitigation status',
      },
      { status: 500 }
    );
  }
}
