/**
 * CargoBit Payout API Routes
 * GET  /api/payout              - Get payout history
 * POST /api/payout              - Request payout
 */

import { NextRequest, NextResponse } from 'next/server';
import { payoutService } from '@/services/payout.service';

// ============================================
// GET /api/payout - Get payout history and status
// ============================================

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Get transporter's driver profile
    const { prisma } = await import('@/lib/db');
    
    const driver = await prisma.driver.findFirst({
      where: { userId },
    });
    
    if (!driver) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 400 }
      );
    }
    
    // Get Connect status
    const connectStatus = await payoutService.getConnectStatus(driver.id);
    
    // Get payout history
    const payoutHistory = await payoutService.getPayoutHistory(driver.id, limit);
    
    // Get wallet balance
    const wallet = await prisma.wallet.findFirst({
      where: { ownerUserId: driver.id },
    });
    
    return NextResponse.json({
      stripeConnect: connectStatus,
      wallet: {
        balance: wallet?.balance ?? 0,
        currency: wallet?.currency ?? 'EUR',
        totalDeposited: wallet?.totalDeposited ?? 0,
        totalWithdrawn: wallet?.totalWithdrawn ?? 0,
      },
      payouts: payoutHistory,
      canPayout: connectStatus.payoutsEnabled && (wallet?.balance ?? 0) > 0,
    });
    
  } catch (error: any) {
    console.error('[API] GET /payout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payout data' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/payout - Request payout
// ============================================

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Get transporter's driver profile
    const { prisma } = await import('@/lib/db');
    
    const driver = await prisma.driver.findFirst({
      where: { userId },
    });
    
    if (!driver) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 400 }
      );
    }
    
    const result = await payoutService.createPayout({
      transporterId: driver.id,
      amount: parseFloat(body.amount),
      currency: body.currency || 'EUR',
      jobId: body.jobId,
    });
    
    return NextResponse.json({
      success: result.status === 'paid',
      payoutId: result.payoutId,
      status: result.status,
      amount: result.amount,
      fee: result.fee,
      netAmount: result.netAmount,
      stripeTransferId: result.stripeTransferId,
      estimatedArrival: result.estimatedArrival,
      error: result.error,
    });
    
  } catch (error: any) {
    console.error('[API] POST /payout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payout' },
      { status: 500 }
    );
  }
}
