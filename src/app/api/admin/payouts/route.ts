/**
 * CargoBit Admin Payouts API - List & Create
 * 
 * GET  /api/admin/payouts - List payouts with filters
 * POST /api/admin/payouts - Create a new payout
 * 
 * RBAC: Admin, Finance roles required
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, checkPermission, AdminUser } from '@/lib/admin-rbac';
import {
  listPayouts,
  createPayout,
} from '@/services/payout.service';
import {
  validatePayoutCreateDto,
  parsePayoutListQuery,
} from '@/dto/payout.dto';

// ============================================
// GET /api/admin/payouts - List Payouts
// ============================================

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (admin: AdminUser) => {
    // Check permission
    if (!checkPermission(admin, 'payouts:read')) {
      return NextResponse.json(
        { error: 'Insufficient permissions - payouts:read required' },
        { status: 403 }
      );
    }

    try {
      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const query = parsePayoutListQuery({
        status: searchParams.get('status'),
        userId: searchParams.get('userId'),
        limit: searchParams.get('limit'),
        offset: searchParams.get('offset'),
        order: searchParams.get('order'),
      });

      // Get payouts
      const result = await listPayouts(query);

      return NextResponse.json(result);
    } catch (error: any) {
      console.error('[API] Error listing payouts:', error);
      return NextResponse.json(
        { error: 'Failed to list payouts', details: error.message },
        { status: 500 }
      );
    }
  }, ['ADMIN', 'FINANCE']);
}

// ============================================
// POST /api/admin/payouts - Create Payout
// ============================================

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (admin: AdminUser) => {
    // Check permission
    if (!checkPermission(admin, 'payouts:create')) {
      return NextResponse.json(
        { error: 'Insufficient permissions - payouts:create required' },
        { status: 403 }
      );
    }

    try {
      // Parse and validate request body
      const body = await request.json();
      const validation = validatePayoutCreateDto(body);

      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.errors },
          { status: 400 }
        );
      }

      // Create payout
      const result = await createPayout(body, admin.id);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to create payout' },
          { status: 400 }
        );
      }

      // Return created payout
      return NextResponse.json(
        {
          payout: result.payout,
          duplicate: result.duplicate || false,
        },
        { status: result.duplicate ? 200 : 201 }
      );
    } catch (error: any) {
      console.error('[API] Error creating payout:', error);
      return NextResponse.json(
        { error: 'Failed to create payout', details: error.message },
        { status: 500 }
      );
    }
  }, ['ADMIN', 'FINANCE']);
}
