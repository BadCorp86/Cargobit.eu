/**
 * CargoBit Refund API
 * 
 * Endpoints:
 * - POST /api/refund - Process a refund
 * - GET /api/refund/calculate?transportId=xxx - Get refund calculations
 */

import { NextRequest, NextResponse } from 'next/server';
import { processRefund, calculateRefundAmounts, type RefundRequest } from '@/services/refund.service';
import { prisma } from '@/lib/db';

const PLATFORM_FEE_PERCENT = 3.5;

// ============================================
// POST /api/refund - Process refund
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const {
      transportId,
      type,
      amount,
      reason,
      creditToWallet,
    } = body as Omit<RefundRequest, 'initiatedBy'>;
    
    if (!transportId || !type || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: transportId, type, reason' },
        { status: 400 }
      );
    }
    
    if (!['full', 'partial', 'platform_fee_only'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid refund type. Must be: full, partial, or platform_fee_only' },
        { status: 400 }
      );
    }
    
    // TODO: Get userId from auth context
    // For now, use header or default
    const initiatedBy = request.headers.get('x-user-id') || 'system';
    
    // Process refund
    const result = await processRefund({
      transportId,
      type,
      amount,
      reason,
      initiatedBy,
      creditToWallet,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      refund: {
        id: result.refundId,
        amount: result.amount,
        currency: result.currency,
        stripeRefundId: result.stripeRefundId,
        creditedToWallet: result.creditedToWallet,
      },
    });
    
  } catch (error: any) {
    console.error('[API] Refund error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/refund/calculate?transportId=xxx
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transportId = searchParams.get('transportId');
    
    if (!transportId) {
      return NextResponse.json(
        { error: 'Missing transportId parameter' },
        { status: 400 }
      );
    }
    
    const calculations = await calculateRefundAmounts(transportId);
    
    if (!calculations) {
      return NextResponse.json(
        { error: 'No payment found for transport' },
        { status: 404 }
      );
    }
    
    // Get transport status
    const transport = await prisma.transport.findUnique({
      where: { id: transportId },
      select: { status: true },
    });
    
    return NextResponse.json({
      transportId,
      transportStatus: transport?.status,
      calculations: {
        totalPaid: calculations.totalPaid,
        platformFee: calculations.platformFee,
        platformFeePercent: PLATFORM_FEE_PERCENT,
        driverPayout: calculations.driverPayout,
        maxRefundable: calculations.maxRefundable,
      },
      refundOptions: [
        { type: 'full', amount: calculations.totalPaid, description: 'Full refund including platform fee' },
        { type: 'platform_fee_only', amount: calculations.platformFee, description: 'Refund platform fee only' },
        { type: 'partial', amount: null, description: 'Custom amount (specify in request)' },
      ],
    });
    
  } catch (error: any) {
    console.error('[API] Calculate refund error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
