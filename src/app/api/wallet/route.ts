import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Wallet fee percentages for DISPATCHERS only (not drivers!)
const WALLET_FEES = {
  FREE: 0.03,         // 3%
  STARTER: 0.03,      // 3%
  PROFESSIONAL: 0.025, // 2.5%
  ENTERPRISE: 0.02,   // 2%
};

// Calculate wallet fee based on membership tier (for dispatchers only)
function calculateWalletFee(amount: number, membershipTier: string, userRole: string): number {
  // Drivers don't pay wallet fees!
  if (userRole === 'DRIVER') {
    return 0;
  }
  
  // Only DISPATCHERS pay wallet fees
  if (userRole !== 'DISPATCHER') {
    return 0;
  }

  const feeRate = WALLET_FEES[membershipTier as keyof typeof WALLET_FEES] || 0.03;
  return amount * feeRate;
}

// GET - List wallet transactions or get wallet balance
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user with wallet balance
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        membershipTier: true,
        walletBalance: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build filter conditions
    const where: any = { userId };
    
    if (type) {
      where.type = type;
    }
    
    if (status) {
      where.status = status;
    }

    // Get transactions with pagination
    const [transactions, total] = await Promise.all([
      db.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.walletTransaction.count({ where })
    ]);

    // Calculate summary stats
    const stats = await db.walletTransaction.aggregate({
      where: { userId, status: 'completed' },
      _sum: {
        amount: true,
        platformFee: true,
        walletFee: true,
      },
      _count: true,
    });

    return NextResponse.json({
      user,
      wallet: {
        balance: user.walletBalance,
        pendingWithdrawals: 0, // Calculate from pending transactions if needed
      },
      transactions,
      stats: {
        totalTransactions: stats._count,
        totalAmount: stats._sum.amount || 0,
        totalPlatformFees: stats._sum.platformFee || 0,
        totalWalletFees: stats._sum.walletFee || 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });

  } catch (error) {
    console.error('Wallet GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet data' }, { status: 500 });
  }
}

// POST - Create wallet transaction (deposit, withdrawal request)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      type,
      amount,
      currency,
      referenceType,
      referenceId,
      paymentMethod,
      bankAccount,
      bankName,
      description,
    } = body;

    // Validate required fields
    if (!userId || !type || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate fees
    let platformFee = 0;
    let walletFee = 0;
    let netAmount = amount;

    switch (type) {
      case 'payout':
        // Calculate wallet fee for dispatcher payouts
        walletFee = calculateWalletFee(amount, user.membershipTier, user.role);
        netAmount = amount - walletFee;
        
        // Check if user has enough balance
        if (user.walletBalance < amount) {
          return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        }
        break;

      case 'fee':
        // Platform fee from shipment
        platformFee = amount;
        netAmount = -amount;
        break;

      case 'deposit':
        // No fees for deposits
        netAmount = amount;
        break;

      case 'withdrawal':
        // Calculate wallet fee
        walletFee = calculateWalletFee(amount, user.membershipTier, user.role);
        netAmount = amount - walletFee;
        
        if (user.walletBalance < amount) {
          return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        }
        break;
    }

    // Create transaction
    const transaction = await db.walletTransaction.create({
      data: {
        userId,
        type,
        amount: netAmount,
        currency: currency || 'EUR',
        referenceType,
        referenceId,
        status: type === 'deposit' ? 'completed' : 'pending',
        paymentMethod,
        bankAccount,
        bankName,
        platformFee,
        walletFee,
        description,
      }
    });

    // Update wallet balance for deposits and payouts
    if (type === 'deposit') {
      await db.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: netAmount } }
      });
    } else if (type === 'payout' || type === 'withdrawal') {
      // Deduct from balance immediately for pending withdrawals
      await db.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: amount } }
      });
    }

    return NextResponse.json(transaction, { status: 201 });

  } catch (error) {
    console.error('Wallet POST error:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}

// PUT - Update transaction status (approve/reject withdrawal)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'Transaction ID and action required' }, { status: 400 });
    }

    const transaction = await db.walletTransaction.findUnique({
      where: { id },
      include: { user: true }
    });
    
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    let data: any = {};
    let userUpdate: any = null;

    switch (action) {
      case 'complete':
        data = {
          status: 'completed',
          processedAt: new Date(),
        };
        break;

      case 'reject':
        data = { status: 'cancelled' };
        // Refund the amount back to wallet
        if (['payout', 'withdrawal'].includes(transaction.type)) {
          userUpdate = {
            walletBalance: { increment: transaction.amount + transaction.walletFee }
          };
        }
        break;

      case 'fail':
        data = { status: 'failed' };
        // Refund the amount back to wallet
        if (['payout', 'withdrawal'].includes(transaction.type)) {
          userUpdate = {
            walletBalance: { increment: transaction.amount + transaction.walletFee }
          };
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update transaction
    const updatedTransaction = await db.walletTransaction.update({
      where: { id },
      data,
    });

    // Update user balance if needed
    if (userUpdate) {
      await db.user.update({
        where: { id: transaction.userId },
        data: userUpdate
      });
    }

    return NextResponse.json(updatedTransaction);

  } catch (error) {
    console.error('Wallet PUT error:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}
