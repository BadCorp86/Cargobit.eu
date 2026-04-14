// ============================================
// CARGOBIT RISK API - Get Risk History
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { riskEngine } from '@/services/risk-engine.service';
import { db } from '@/lib/db';

/**
 * GET /api/risk/history?entityType=USER&entityId=xxx&limit=10
 * Get risk score history for an entity
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') as 'USER' | 'COMPANY' | 'TRANSACTION';
    const entityId = searchParams.get('entityId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!entityType || !entityId) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'entityType und entityId sind erforderlich',
        code: 'MISSING_PARAMETERS',
      }, { status: 400 });
    }

    const history = await riskEngine.getRiskHistory(entityType, entityId, limit);

    return NextResponse.json({
      success: true,
      data: history,
    });

  } catch (error) {
    console.error('Get risk history error:', error);
    return NextResponse.json({
      error: 'InternalError',
      message: 'Fehler beim Abrufen der Risk-Historie',
      code: 'FETCH_ERROR',
    }, { status: 500 });
  }
}
