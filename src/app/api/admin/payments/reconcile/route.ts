// ============================================
// CARGOBIT ADMIN RECONCILIATION API
// POST /api/admin/payments/reconcile
// GET /api/admin/payments/reconcile/stats
// ============================================
// 
// Admin endpoints for manual refund reconciliation.
// 
// Required Role: admin, finance
// 
// Features:
// - Single payment reconciliation
// - Batch reconciliation
// - Discrepancy detection
// - Reconciliation stats
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAdminAuth, AdminRole } from '@/lib/admin-rbac';
import {
  reconcilePayment,
  reconcileAllRecent,
  findDiscrepancies,
  getReconciliationStats,
} from '@/services/refund-reconciliation.service';

// Allowed roles for reconciliation endpoints
const ALLOWED_ROLES: AdminRole[] = ['admin', 'finance'];

// ============================================
// GET: RECONCILIATION STATS
// ============================================

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (admin) => {
    // Check role
    if (!ALLOWED_ROLES.includes(admin.role)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    try {
      const { searchParams } = new URL(request.url);
      const action = searchParams.get('action');

      // Action: Get discrepancies
      if (action === 'discrepancies') {
        const limit = parseInt(searchParams.get('limit') || '50');
        const discrepancies = await findDiscrepancies(limit);

        return NextResponse.json({
          success: true,
          count: discrepancies.length,
          discrepancies,
        });
      }

      // Default: Get stats
      const stats = await getReconciliationStats();

      return NextResponse.json({
        success: true,
        stats,
      });
    } catch (error: any) {
      console.error('[ADMIN RECONCILE] Error:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: error.message },
        { status: 500 }
      );
    }
  }, ALLOWED_ROLES);
}

// ============================================
// POST: RUN RECONCILIATION
// ============================================

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (admin) => {
    // Check role
    if (!ALLOWED_ROLES.includes(admin.role)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    try {
      const body = await request.json().catch(() => ({}));
      const { action, paymentId, limit } = body;

      // Action: Reconcile single payment
      if (action === 'single' && paymentId) {
        const result = await reconcilePayment(paymentId);

        // Create admin audit log
        await db.auditLog.create({
          data: {
            userId: admin.id,
            action: 'UPDATE',
            entityType: 'payment_reconciliation',
            entityId: paymentId,
            dataAfter: JSON.stringify(result),
          },
        });

        return NextResponse.json({
          success: result.status !== 'error',
          result,
        });
      }

      // Action: Batch reconciliation
      if (action === 'batch') {
        const batchLimit = limit || 100;
        const result = await reconcileAllRecent(batchLimit);

        // Create admin audit log
        await db.auditLog.create({
          data: {
            userId: admin.id,
            action: 'UPDATE',
            entityType: 'batch_reconciliation',
            entityId: 'batch',
            dataAfter: JSON.stringify({
              total: result.total,
              reconciled: result.reconciled,
              errors: result.errors,
            }),
          },
        });

        return NextResponse.json({
          success: true,
          result,
        });
      }

      // Action: Find discrepancies only
      if (action === 'find_discrepancies') {
        const discrepancyLimit = limit || 50;
        const discrepancies = await findDiscrepancies(discrepancyLimit);

        return NextResponse.json({
          success: true,
          count: discrepancies.length,
          discrepancies,
        });
      }

      return NextResponse.json(
        { error: 'BadRequest', message: 'Invalid action. Use: single, batch, or find_discrepancies' },
        { status: 400 }
      );
    } catch (error: any) {
      console.error('[ADMIN RECONCILE] Error:', error);
      return NextResponse.json(
        { error: 'InternalServerError', message: error.message },
        { status: 500 }
      );
    }
  }, ALLOWED_ROLES);
}
