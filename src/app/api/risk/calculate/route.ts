// ============================================
// CARGOBIT RISK API - Calculate Risk Score
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { riskEngine, RiskContext } from '@/services/risk-engine.service';
import { performHybridSecurityCheck, SecurityContext, ActionContext } from '@/lib/hybrid-security';

/**
 * POST /api/risk/calculate
 * Calculate risk score for user, company, or transaction
 * 
 * Body:
 * - type: 'user' | 'company' | 'transaction' | 'combined'
 * - entityId: string
 * - context: Partial<RiskContext>
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, entityId, context = {} } = body;

    if (!type || !entityId) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'type und entityId sind erforderlich',
        code: 'MISSING_PARAMETERS',
      }, { status: 400 });
    }

    let result;

    switch (type) {
      case 'user':
        result = await riskEngine.evaluateUserRisk(entityId, context);
        break;

      case 'company':
        result = await riskEngine.evaluateCompanyRisk(entityId, context);
        break;

      case 'transaction':
        result = await riskEngine.evaluateTransactionRisk(entityId, context);
        break;

      case 'combined':
        const { userId, companyId, transactionContext } = body;
        if (!userId) {
          return NextResponse.json({
            error: 'ValidationError',
            message: 'userId ist für combined erforderlich',
            code: 'MISSING_USER_ID',
          }, { status: 400 });
        }
        result = await riskEngine.evaluateCombinedRisk(
          userId,
          companyId || null,
          transactionContext || context
        );
        break;

      default:
        return NextResponse.json({
          error: 'ValidationError',
          message: 'Ungültiger type. Erlaubt: user, company, transaction, combined',
          code: 'INVALID_TYPE',
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        score: result.score,
        level: result.level,
        recommendation: result.recommendation,
        triggeredRules: result.triggeredRules,
        mitigations: result.mitigations,
        metadata: result.metadata,
      },
    });

  } catch (error) {
    console.error('Risk calculation error:', error);
    return NextResponse.json({
      error: 'InternalError',
      message: 'Fehler bei der Risikoberechnung',
      code: 'CALCULATION_ERROR',
    }, { status: 500 });
  }
}

/**
 * GET /api/risk/calculate?entityType=USER&entityId=xxx
 * Get current risk score for an entity
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') as 'USER' | 'COMPANY' | 'TRANSACTION';
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'entityType und entityId sind erforderlich',
        code: 'MISSING_PARAMETERS',
      }, { status: 400 });
    }

    const riskScore = await riskEngine.getRiskScore(entityType, entityId);

    if (!riskScore) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'Kein Risk Score für diese Entity gefunden',
      });
    }

    return NextResponse.json({
      success: true,
      data: riskScore,
    });

  } catch (error) {
    console.error('Get risk score error:', error);
    return NextResponse.json({
      error: 'InternalError',
      message: 'Fehler beim Abrufen des Risk Scores',
      code: 'FETCH_ERROR',
    }, { status: 500 });
  }
}
