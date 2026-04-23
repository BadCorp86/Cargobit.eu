// ============================================
// AUDIT API: POST /api/audit/log
// Erstellt einen neuen Audit-Log-Eintrag
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { auditService } from '@/services/audit.service';
import {
  AuditActorType,
  AuditDecision,
  AuditEntityType,
  AuditRiskLevel,
  CreateAuditLogRequest,
} from '@/types/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.action) {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST',
          message: 'action is required',
        },
        { status: 400 }
      );
    }

    if (!body.entityType || !body.entityId) {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST',
          message: 'entityType and entityId are required',
        },
        { status: 400 }
      );
    }

    // Validate enums
    if (body.entityType && !Object.values(AuditEntityType).includes(body.entityType)) {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST',
          message: `entityType must be one of: ${Object.values(AuditEntityType).join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (body.decision && !Object.values(AuditDecision).includes(body.decision)) {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST',
          message: `decision must be one of: ${Object.values(AuditDecision).join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (body.riskLevel && !Object.values(AuditRiskLevel).includes(body.riskLevel)) {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST',
          message: `riskLevel must be one of: ${Object.values(AuditRiskLevel).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Build audit log request
    const auditRequest: CreateAuditLogRequest = {
      actorType: body.actorType || AuditActorType.USER,
      actorId: body.actorId,
      action: body.action,
      decision: body.decision,
      riskScore: body.riskScore,
      riskLevel: body.riskLevel,
      entityType: body.entityType,
      entityId: body.entityId,
      metadata: body.metadata,
      correlationId: body.correlationId,
      sourceService: body.sourceService,
      supportTicketId: body.supportTicketId,
      ipAddress: body.ipAddress || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: body.userAgent || request.headers.get('user-agent') || undefined,
    };

    const result = await auditService.log(auditRequest);

    if (result.status === 'error') {
      return NextResponse.json(
        {
          error: 'AUDIT_LOG_FAILED',
          message: result.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      auditId: result.auditId,
    });
  } catch (error) {
    console.error('[AuditAPI] Error in POST /api/audit/log:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to create audit log',
      },
      { status: 500 }
    );
  }
}

// Batch logging endpoint
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!Array.isArray(body.events)) {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST',
          message: 'events array is required',
        },
        { status: 400 }
      );
    }

    const result = await auditService.logBatch(body.events);

    return NextResponse.json({
      status: 'ok',
      success: result.success,
      failed: result.failed,
    });
  } catch (error) {
    console.error('[AuditAPI] Error in PUT /api/audit/log:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to create audit logs',
      },
      { status: 500 }
    );
  }
}
