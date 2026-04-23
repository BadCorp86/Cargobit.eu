// ============================================
// AUDIT API: GET /api/audit/entity/[entityType]/[entityId]
// Alle Audit-Events für ein Entity abrufen
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { auditService } from '@/services/audit.service';
import { AuditEntityType } from '@/types/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  try {
    const { entityType, entityId } = await params;

    // Validate entityType
    if (!Object.values(AuditEntityType).includes(entityType.toUpperCase() as AuditEntityType)) {
      return NextResponse.json(
        {
          error: 'INVALID_ENTITY_TYPE',
          message: `entityType must be one of: ${Object.values(AuditEntityType).join(', ')}`,
          validTypes: Object.values(AuditEntityType),
        },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Validate limit
    if (limit > 1000) {
      return NextResponse.json(
        {
          error: 'LIMIT_TOO_HIGH',
          message: 'Maximum limit is 1000',
        },
        { status: 400 }
      );
    }

    const result = await auditService.getEntityEvents(
      entityType.toUpperCase() as AuditEntityType,
      entityId,
      { limit, offset }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[AuditAPI] Error in GET /api/audit/entity:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve audit events',
      },
      { status: 500 }
    );
  }
}
