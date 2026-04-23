// ============================================
// MITIGATION API: POST /api/mitigation/apply
// Eine Mitigation anwenden
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { mitigationService } from '@/services/mitigation.service';
import {
  MitigationType,
  MitigationEntityType,
  MITIGATION_ERROR_CODES,
  ApplyMitigationRequest,
} from '@/types/mitigation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.entityType || !body.entityId) {
      return NextResponse.json(
        {
          error: MITIGATION_ERROR_CODES.INVALID_MITIGATION_TYPE.code,
          message: 'entityType and entityId are required',
        },
        { status: 400 }
      );
    }

    if (!body.action) {
      return NextResponse.json(
        {
          error: MITIGATION_ERROR_CODES.INVALID_MITIGATION_TYPE.code,
          message: 'action is required',
        },
        { status: 400 }
      );
    }

    if (!body.mitigationType) {
      return NextResponse.json(
        {
          error: MITIGATION_ERROR_CODES.INVALID_MITIGATION_TYPE.code,
          message: 'mitigationType is required',
        },
        { status: 400 }
      );
    }

    // Validate enums
    if (!Object.values(MitigationEntityType).includes(body.entityType)) {
      return NextResponse.json(
        {
          error: MITIGATION_ERROR_CODES.INVALID_MITIGATION_TYPE.code,
          message: `entityType must be one of: ${Object.values(MitigationEntityType).join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!Object.values(MitigationType).includes(body.mitigationType)) {
      return NextResponse.json(
        {
          error: MITIGATION_ERROR_CODES.INVALID_MITIGATION_TYPE.code,
          message: `mitigationType must be one of: ${Object.values(MitigationType).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Build request
    const applyRequest: ApplyMitigationRequest = {
      entityType: body.entityType,
      entityId: body.entityId,
      action: body.action,
      mitigationType: body.mitigationType,
      context: body.context || {},
    };

    // Apply mitigation
    const result = await mitigationService.apply(applyRequest);

    if (result.status === 'error') {
      let statusCode = 500;
      if (result.errorCode === MITIGATION_ERROR_CODES.MITIGATION_ALREADY_APPLIED.code) {
        statusCode = 409;
      } else if (result.errorCode === MITIGATION_ERROR_CODES.RULE_NOT_FOUND.code) {
        statusCode = 404;
      }

      return NextResponse.json(
        {
          error: result.errorCode,
          message: result.message,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      status: result.status,
      mitigationId: result.mitigationId,
      message: result.message,
      executeAt: result.executeAt,
    });
  } catch (error) {
    console.error('[MitigationAPI] Error in POST /api/mitigation/apply:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to apply mitigation',
      },
      { status: 500 }
    );
  }
}
