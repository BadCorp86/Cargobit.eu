// ============================================
// CARGOBIT RISK API - Risk Rules Management
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { riskEngine } from '@/services/risk-engine.service';
import { db } from '@/lib/db';

/**
 * GET /api/risk/rules
 * Get all active risk rules
 */
export async function GET(request: NextRequest) {
  try {
    const rules = riskEngine.getAllActiveRules();

    // Also get custom rules from database
    const dbRules = await db.riskRule.findMany({
      where: { active: true },
      orderBy: [{ entityType: 'asc' }, { priority: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      data: {
        configRules: rules,
        databaseRules: dbRules,
      },
    });

  } catch (error) {
    console.error('Get risk rules error:', error);
    return NextResponse.json({
      error: 'InternalError',
      message: 'Fehler beim Abrufen der Risk-Regeln',
      code: 'FETCH_ERROR',
    }, { status: 500 });
  }
}

/**
 * POST /api/risk/rules
 * Create a new custom risk rule
 * 
 * Body:
 * - name: string (unique identifier)
 * - description: string
 * - entityType: 'USER' | 'COMPANY' | 'TRANSACTION'
 * - category: string
 * - condition: object (JSON condition)
 * - weight: number
 * - priority: number (default 0)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, entityType, category, condition, weight, priority = 0 } = body;

    if (!name || !entityType || !condition || weight === undefined) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'name, entityType, condition und weight sind erforderlich',
        code: 'MISSING_PARAMETERS',
      }, { status: 400 });
    }

    // Check if rule already exists
    const existingRule = await db.riskRule.findUnique({
      where: { name },
    });

    if (existingRule) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'Eine Regel mit diesem Namen existiert bereits',
        code: 'RULE_EXISTS',
      }, { status: 400 });
    }

    const rule = await db.riskRule.create({
      data: {
        name,
        description: description || '',
        entityType,
        category: category || 'CUSTOM',
        condition: JSON.stringify(condition),
        weight,
        priority,
        active: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: rule,
      message: 'Risk-Regel erfolgreich erstellt',
    });

  } catch (error) {
    console.error('Create risk rule error:', error);
    return NextResponse.json({
      error: 'InternalError',
      message: 'Fehler beim Erstellen der Risk-Regel',
      code: 'CREATE_ERROR',
    }, { status: 500 });
  }
}

/**
 * PUT /api/risk/rules
 * Update an existing risk rule
 * 
 * Body:
 * - id: string (rule ID)
 * - updates: object with fields to update
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'id und updates sind erforderlich',
        code: 'MISSING_PARAMETERS',
      }, { status: 400 });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.condition !== undefined) updateData.condition = JSON.stringify(updates.condition);
    if (updates.weight !== undefined) updateData.weight = updates.weight;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.active !== undefined) updateData.active = updates.active;

    const rule = await db.riskRule.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: rule,
      message: 'Risk-Regel erfolgreich aktualisiert',
    });

  } catch (error) {
    console.error('Update risk rule error:', error);
    return NextResponse.json({
      error: 'InternalError',
      message: 'Fehler beim Aktualisieren der Risk-Regel',
      code: 'UPDATE_ERROR',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/risk/rules?id=xxx
 * Delete (deactivate) a risk rule
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        error: 'ValidationError',
        message: 'id ist erforderlich',
        code: 'MISSING_ID',
      }, { status: 400 });
    }

    // Soft delete by setting active = false
    const rule = await db.riskRule.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({
      success: true,
      data: rule,
      message: 'Risk-Regel erfolgreich deaktiviert',
    });

  } catch (error) {
    console.error('Delete risk rule error:', error);
    return NextResponse.json({
      error: 'InternalError',
      message: 'Fehler beim Löschen der Risk-Regel',
      code: 'DELETE_ERROR',
    }, { status: 500 });
  }
}
