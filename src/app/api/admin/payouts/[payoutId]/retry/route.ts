/**
 * CargoBit Admin Payouts API - Retry
 * 
 * POST /api/admin/payouts/[payoutId]/retry - Retry a failed payout
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, checkPermission, AdminUser } from '@/lib/admin-rbac';
import { retryPayout } from '@/services/payout.service';

// ============================================
// POST /api/admin/payouts/[payoutId]/retry - Retry Payout
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ payoutId: string }> }
) {
  return withAdminAuth(request, async (admin: AdminUser) => {
    // Check permission
    if (!checkPermission(admin, 'payouts:create')) {
      return NextResponse.json(
        { error: 'Insufficient permissions - payouts:create required' },
        { status: 403 }
      );
    }

    try {
      const { payoutId } = await params;

      // Retry payout
      const result = await retryPayout(payoutId, admin.id);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to retry payout' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        payout: result.payout,
        message: 'Payout retry initiated',
      });
    } catch (error: any) {
      console.error('[API] Error retrying payout:', error);
      return NextResponse.json(
        { error: 'Failed to retry payout', details: error.message },
        { status: 500 }
      );
    }
  }, ['ADMIN', 'FINANCE']);
}
