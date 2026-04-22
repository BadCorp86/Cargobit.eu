/**
 * CargoBit Admin Payouts API - Detail, Cancel, Retry
 * 
 * GET    /api/admin/payouts/[payoutId] - Get payout detail
 * DELETE /api/admin/payouts/[payoutId] - Cancel pending payout
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, checkPermission, AdminUser } from '@/lib/admin-rbac';
import {
  getPayout,
  cancelPayout,
} from '@/services/payout.service';

// ============================================
// GET /api/admin/payouts/[payoutId] - Get Payout Detail
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ payoutId: string }> }
) {
  return withAdminAuth(request, async (admin: AdminUser) => {
    // Check permission
    if (!checkPermission(admin, 'payouts:read')) {
      return NextResponse.json(
        { error: 'Insufficient permissions - payouts:read required' },
        { status: 403 }
      );
    }

    try {
      const { payoutId } = await params;

      // Get payout detail
      const payout = await getPayout(payoutId);

      if (!payout) {
        return NextResponse.json(
          { error: 'Payout not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(payout);
    } catch (error: any) {
      console.error('[API] Error getting payout:', error);
      return NextResponse.json(
        { error: 'Failed to get payout', details: error.message },
        { status: 500 }
      );
    }
  }, ['ADMIN', 'FINANCE']);
}

// ============================================
// DELETE /api/admin/payouts/[payoutId] - Cancel Payout
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ payoutId: string }> }
) {
  return withAdminAuth(request, async (admin: AdminUser) => {
    // Check permission
    if (!checkPermission(admin, 'payouts:cancel')) {
      return NextResponse.json(
        { error: 'Insufficient permissions - payouts:cancel required' },
        { status: 403 }
      );
    }

    try {
      const { payoutId } = await params;

      // Cancel payout
      const result = await cancelPayout(payoutId, admin.id);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to cancel payout' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Payout cancelled successfully',
      });
    } catch (error: any) {
      console.error('[API] Error cancelling payout:', error);
      return NextResponse.json(
        { error: 'Failed to cancel payout', details: error.message },
        { status: 500 }
      );
    }
  }, ['ADMIN', 'FINANCE']);
}
