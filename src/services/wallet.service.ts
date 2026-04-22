/**
 * CargoBit Wallet Service
 * 
 * Transactional wallet operations for payment processing.
 * All operations are idempotent and include audit trail.
 * 
 * Flow:
 * - creditWallet: Add funds (payment_intent.succeeded)
 * - debitWallet: Remove funds (refund processing)
 * - reverseCredit: Reverse a previous credit (charge.refunded)
 */

import { prisma } from '@/lib/db';
import { TransactionType } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface WalletCreditResult {
  success: boolean;
  transactionId?: string;
  walletBalance?: number;
  duplicate?: boolean;
  error?: string;
}

export interface WalletDebitResult {
  success: boolean;
  transactionId?: string;
  walletBalance?: number;
  error?: string;
}

export interface CreditWalletParams {
  userId: string;
  amountCents: number;
  reference: string;
  paymentId?: string;
  transportId?: string;
  description?: string;
  idempotencyKey?: string;
}

export interface DebitWalletParams {
  userId: string;
  amountCents: number;
  reference: string;
  paymentId?: string;
  transportId?: string;
  description?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function centsToEuros(cents: number): number {
  return cents / 100;
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Get or create wallet for a user
 */
export async function getOrCreateWallet(userId: string) {
  let wallet = await prisma.wallet.findFirst({
    where: { ownerUserId: userId },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        ownerUserId: userId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
      },
    });
    console.log('[WALLET] Created new wallet for user:', userId);
  }

  return wallet;
}

// ============================================
// SERVICE: CREDIT WALLET
// ============================================

/**
 * Credit wallet with idempotency protection.
 * Used for payment_intent.succeeded webhook.
 * 
 * @param params - Credit parameters
 * @returns Result with transaction ID and new balance
 */
export async function creditWallet(
  params: CreditWalletParams
): Promise<WalletCreditResult> {
  const { userId, amountCents, reference, paymentId, transportId, description } = params;

  console.log('[WALLET] Crediting wallet:', {
    userId,
    amountCents,
    reference,
    paymentId,
  });

  try {
    // Check for duplicate transaction (idempotency)
    const existingTx = await prisma.walletTransaction.findFirst({
      where: { reference },
    });

    if (existingTx) {
      console.log('[WALLET] Duplicate transaction, skipping:', reference);
      return {
        success: true,
        transactionId: existingTx.id,
        duplicate: true,
      };
    }

    // Get or create wallet
    const wallet = await getOrCreateWallet(userId);

    // Execute in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create wallet transaction
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.PAYMENT_IN,
          amount: centsToEuros(amountCents),
          currency: 'EUR',
          paymentId,
          relatedTransportId: transportId,
          description: description || 'Zahlung erhalten',
          reference,
          processedAt: new Date(),
        },
      });

      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: centsToEuros(amountCents) },
          totalDeposited: { increment: centsToEuros(amountCents) },
        },
      });

      return { transaction, wallet: updatedWallet };
    });

    // Create notification (outside transaction)
    await prisma.notification.create({
      data: {
        userId,
        type: 'WALLET_TOPUP',
        title: 'Zahlung erhalten',
        message: `Ihr Guthaben wurde um ${centsToEuros(amountCents).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} aufgeladen.`,
        data: JSON.stringify({ amount: centsToEuros(amountCents), reference, paymentId }),
      },
    }).catch(err => console.error('[WALLET] Failed to create notification:', err));

    console.log('[WALLET] Wallet credited:', {
      userId,
      amountCents,
      reference,
      newBalance: result.wallet.balance,
    });

    return {
      success: true,
      transactionId: result.transaction.id,
      walletBalance: result.wallet.balance,
    };
  } catch (error: any) {
    console.error('[WALLET] Error crediting wallet:', error);
    return {
      success: false,
      error: error.message || 'Failed to credit wallet',
    };
  }
}

// ============================================
// SERVICE: DEBIT WALLET
// ============================================

/**
 * Debit wallet (remove funds).
 * Used for refunds and payouts.
 * 
 * @param params - Debit parameters
 * @returns Result with transaction ID and new balance
 */
export async function debitWallet(
  params: DebitWalletParams
): Promise<WalletDebitResult> {
  const { userId, amountCents, reference, paymentId, transportId, description } = params;

  console.log('[WALLET] Debiting wallet:', {
    userId,
    amountCents,
    reference,
    paymentId,
  });

  try {
    // Check for duplicate transaction (idempotency)
    const existingTx = await prisma.walletTransaction.findFirst({
      where: { reference },
    });

    if (existingTx) {
      console.log('[WALLET] Duplicate transaction, skipping:', reference);
      return {
        success: true,
        transactionId: existingTx.id,
      };
    }

    // Get wallet
    const wallet = await prisma.wallet.findFirst({
      where: { ownerUserId: userId },
    });

    if (!wallet) {
      return {
        success: false,
        error: 'Wallet not found for user',
      };
    }

    // Execute in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create wallet transaction (negative amount for debit)
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.REFUND,
          amount: -centsToEuros(amountCents), // Negative for debit
          currency: 'EUR',
          paymentId,
          relatedTransportId: transportId,
          description: description || 'Rückerstattung',
          reference,
          processedAt: new Date(),
        },
      });

      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: centsToEuros(amountCents) },
          totalWithdrawn: { increment: centsToEuros(amountCents) },
        },
      });

      return { transaction, wallet: updatedWallet };
    });

    console.log('[WALLET] Wallet debited:', {
      userId,
      amountCents,
      reference,
      newBalance: result.wallet.balance,
    });

    return {
      success: true,
      transactionId: result.transaction.id,
      walletBalance: result.wallet.balance,
    };
  } catch (error: any) {
    console.error('[WALLET] Error debiting wallet:', error);
    return {
      success: false,
      error: error.message || 'Failed to debit wallet',
    };
  }
}

// ============================================
// SERVICE: REVERSE CREDIT (REFUND)
// ============================================

/**
 * Reverse a previous credit for refund processing.
 * Creates a negative transaction to reverse the original credit.
 * 
 * @param params - Reverse parameters
 * @returns Result with transaction ID and new balance
 */
export async function reverseCredit(
  params: {
    userId: string;
    amountCents: number;
    originalReference: string;
    paymentId?: string;
    transportId?: string;
    description?: string;
  }
): Promise<WalletDebitResult> {
  const { userId, amountCents, originalReference, paymentId, transportId, description } = params;

  // Create unique reference for the reversal
  const reversalReference = `refund_${originalReference}`;

  console.log('[WALLET] Reversing credit:', {
    userId,
    amountCents,
    originalReference,
    reversalReference,
  });

  return debitWallet({
    userId,
    amountCents,
    reference: reversalReference,
    paymentId,
    transportId,
    description: description || `Rückerstattung - ${description || 'Stornierung'}`,
  });
}

// ============================================
// SERVICE: GET WALLET BALANCE
// ============================================

/**
 * Get current wallet balance for a user.
 */
export async function getWalletBalance(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findFirst({
    where: { ownerUserId: userId },
  });
  return wallet?.balance || 0;
}

// ============================================
// SERVICE: GET WALLET TRANSACTIONS
// ============================================

/**
 * Get paginated wallet transactions for a user.
 */
export async function getWalletTransactions(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    type?: TransactionType;
  }
) {
  const wallet = await prisma.wallet.findFirst({
    where: { ownerUserId: userId },
  });

  if (!wallet) {
    return [];
  }

  return prisma.walletTransaction.findMany({
    where: {
      walletId: wallet.id,
      ...(options?.type && { type: options.type }),
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  });
}

// ============================================
// SERVICE: CHECK IF WALLET HAS SUFFICIENT BALANCE
// ============================================

/**
 * Check if user has sufficient wallet balance.
 */
export async function hasSufficientBalance(
  userId: string,
  amountCents: number
): Promise<boolean> {
  const balance = await getWalletBalance(userId);
  return balance >= centsToEuros(amountCents);
}
