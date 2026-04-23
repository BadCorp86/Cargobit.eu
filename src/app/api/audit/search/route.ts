// ============================================
// AUDIT API: GET /api/audit/search
// Filterbare Suche für Dashboard
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { auditService } from '@/services/audit.service';
import { AuditEntityType, AuditDecision, AuditRiskLevel } from '@/types/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const actorId = searchParams.get('actorId') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const entityTypeParam = searchParams.get('entityType');
    const action = searchParams.get('action') || undefined;
    const decisionParam = searchParams.get('decision');
    const riskLevelParam = searchParams.get('riskLevel');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Validate enums
    const entityType = entityTypeParam 
      ? validateEnum(entityTypeParam, AuditEntityType, 'entityType') 
      : undefined;
    const decision = decisionParam 
      ? validateEnum(decisionParam, AuditDecision, 'decision') 
      : undefined;
    const riskLevel = riskLevelParam 
      ? validateEnum(riskLevelParam, AuditRiskLevel, 'riskLevel') 
      : undefined;

    // Parse dates
    const from = fromParam ? parseDate(fromParam, 'from') : undefined;
    const to = toParam ? parseDate(toParam, 'to') : undefined;

    // Validate limit
    if (limit > 500) {
      return NextResponse.json(
        {
          error: 'LIMIT_TOO_HIGH',
          message: 'Maximum limit is 500',
        },
        { status: 400 }
      );
    }

    // Check if at least one filter is provided (for performance)
    if (!actorId && !entityId && !entityType && !action && !decision && !riskLevel && !from && !to) {
      // Allow unfiltered search but with lower default limit
      if (limit > 100) {
        return NextResponse.json(
          {
            error: 'FILTER_REQUIRED',
            message: 'Please provide at least one filter parameter for searches with limit > 100',
          },
          { status: 400 }
        );
      }
    }

    const result = await auditService.search({
      actorId,
      entityId,
      entityType,
      action,
      decision,
      riskLevel,
      from,
      to,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
        },
        { status: 400 }
      );
    }

    console.error('[AuditAPI] Error in GET /api/audit/search:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Failed to search audit logs',
      },
      { status: 500 }
    );
  }
}

// ============================================
// VALIDATION HELPERS
// ============================================

class ValidationError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateEnum<T extends string>(
  value: string,
  enumObj: Record<string, T>,
  fieldName: string
): T {
  const upperValue = value.toUpperCase();
  if (!Object.values(enumObj).includes(upperValue as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${Object.values(enumObj).join(', ')}`,
      `INVALID_${fieldName.toUpperCase()}`
    );
  }
  return upperValue as T;
}

function parseDate(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new ValidationError(
      `${fieldName} must be a valid ISO 8601 date`,
      `INVALID_${fieldName.toUpperCase()}`
    );
  }
  return date;
}
