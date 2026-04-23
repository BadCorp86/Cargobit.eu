// ============================================
// CARGOBIT STRIPE WEBHOOK HANDLER
// POST /api/stripe/webhook
// Handles: payment_intent.succeeded, subscription events, payout events
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============================================
// WEBHOOK EVENT TYPES
// ============================================
// payment_intent.succeeded → Credit wallet
// customer.subscription.created → Update subscription status
// customer.subscription.updated → Update subscription status
// customer.subscription.deleted → Downgrade to free
// payout.paid → Mark payout as completed
// payout.failed → Mark payout as failed

// Mock Stripe signature verification
const verifyWebhookSignature = (payload: string, signature: string): boolean => {
  // In production: Use Stripe SDK to verify signature
  return signature?.startsWith('whsec_') || true;
};

// ============================================
// BUSINESS LOGIC: Credit Wallet
// ============================================
async function creditWallet(userId: string, amountCents: number, reference: string, metadata?: any) {
  // Get or create wallet
  let wallet = await db.wallet.findFirst({
    where: { ownerUserId: userId },
  });

  if (!wallet) {
    wallet = await db.wallet.create({
      data: {
        ownerUserId: userId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
      },
    });
  }

  // Check for duplicate transaction
  const existingTx = await db.walletTransaction.findFirst({
    where: { reference },
  });

  if (existingTx) {
    console.log('[WEBHOOK] Duplicate transaction, skipping:', reference);
    return { success: true, duplicate: true };
  }

  // Create transaction and update balance in a transaction
  const result = await db.$transaction(async (tx) => {
    // Create succeeded transaction
    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet!.id,
        type: 'DEPOSIT',
        amount: amountCents / 100,
        currency: 'EUR',
        description: metadata?.description || 'Guthaben aufgeladen',
        reference,
        processedAt: new Date(),
      },
    });

    // Update wallet balance
    await tx.wallet.update({
      where: { id: wallet!.id },
      data: {
        balance: { increment: amountCents / 100 },
        totalDeposited: { increment: amountCents / 100 },
      },
    });

    return transaction;
  });

  // Create notification
  await db.notification.create({
    data: {
      userId,
      type: 'WALLET_TOPUP',
      title: 'Guthaben aufgeladen',
      message: `Ihr Guthaben wurde um ${(amountCents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} aufgeladen.`,
      data: JSON.stringify({ amount: amountCents / 100, reference }),
    },
  });

  console.log('[WEBHOOK] Wallet credited:', { userId, amountCents, reference });
  return { success: true, transactionId: result.id };
}

// ============================================
// BUSINESS LOGIC: Update Subscription
// ============================================
async function updateSubscriptionStatus(
  userId: string, 
  plan: string, 
  stripeSubscriptionId: string,
  status: string,
  currentPeriodEnd: Date
) {
  // Get user's company
  const companyUser = await db.companyUser.findFirst({
    where: { userId },
  });

  if (!companyUser) {
    console.log('[WEBHOOK] No company found for user:', userId);
    return { success: false, reason: 'no_company' };
  }

  // Get plan from DB
  const planRecord = await db.plan.findFirst({
    where: { name: plan.toUpperCase() as any },
  });

  if (!planRecord) {
    console.log('[WEBHOOK] Plan not found:', plan);
    return { success: false, reason: 'plan_not_found' };
  }

  // Create or update company plan
  await db.companyPlan.upsert({
    where: {
      id: `${companyUser.companyId}_${planRecord.id}`,
    },
    create: {
      companyId: companyUser.companyId,
      planId: planRecord.id,
      validFrom: new Date(),
      validTo: currentPeriodEnd,
    },
    update: {
      validFrom: new Date(),
      validTo: currentPeriodEnd,
    },
  });

  // Create notification
  await db.notification.create({
    data: {
      userId,
      type: 'SUBSCRIPTION_UPDATED',
      title: 'Abonnement aktualisiert',
      message: `Ihr Abonnement wurde auf ${plan} geändert.`,
      data: JSON.stringify({ plan, status, validTo: currentPeriodEnd }),
    },
  });

  console.log('[WEBHOOK] Subscription updated:', { userId, plan, status, validTo: currentPeriodEnd });
  return { success: true };
}

// ============================================
// BUSINESS LOGIC: Mark Payout as Paid
// ============================================
async function markPayoutAsPaid(payoutId: string, stripePayoutId: string) {
  // Find pending payout transaction
  const transaction = await db.walletTransaction.findFirst({
    where: {
      reference: payoutId,
      type: 'PAYOUT',
    },
  });

  if (!transaction) {
    console.log('[WEBHOOK] Payout transaction not found:', payoutId);
    return { success: false, reason: 'not_found' };
  }

  // Update transaction
  await db.walletTransaction.update({
    where: { id: transaction.id },
    data: {
      processedAt: new Date(),
      reference: stripePayoutId,
    },
  });

  // Get wallet for notification
  const wallet = await db.wallet.findUnique({
    where: { id: transaction.walletId },
  });

  if (wallet?.ownerUserId) {
    await db.notification.create({
      data: {
        userId: wallet.ownerUserId,
        type: 'PAYOUT_COMPLETED',
        title: 'Auszahlung abgeschlossen',
        message: `Ihre Auszahlung von ${Math.abs(transaction.amount).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} wurde erfolgreich bearbeitet.`,
        data: JSON.stringify({ amount: transaction.amount, payoutId }),
      },
    });
  }

  console.log('[WEBHOOK] Payout marked as paid:', { payoutId, stripePayoutId });
  return { success: true };
}

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature)) {
      return NextResponse.json({
        error: 'InvalidSignature',
        message: 'Webhook signature verification failed',
      }, { status: 400 });
    }

    const event = JSON.parse(payload);
    console.log('[WEBHOOK] Received event:', event.type);

    // ============================================
    // HANDLE: payment_intent.succeeded
    // ============================================
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const userId = pi.metadata?.userId;
      const amountCents = pi.amount;

      if (userId && pi.metadata?.type === 'wallet_topup') {
        await creditWallet(userId, amountCents, pi.id, {
          description: 'Guthaben aufgeladen via Stripe',
        });
      }
    }

    // ============================================
    // HANDLE: customer.subscription.created
    // ============================================
    if (event.type === 'customer.subscription.created') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;
      const plan = subscription.metadata?.plan;
      const status = subscription.status;
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

      if (userId && plan) {
        await updateSubscriptionStatus(userId, plan, subscription.id, status, currentPeriodEnd);
      }
    }

    // ============================================
    // HANDLE: customer.subscription.updated
    // ============================================
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;
      const plan = subscription.metadata?.plan || subscription.items?.data?.[0]?.price?.metadata?.plan;
      const status = subscription.status;
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

      if (userId && plan) {
        await updateSubscriptionStatus(userId, plan, subscription.id, status, currentPeriodEnd);
      }
    }

    // ============================================
    // HANDLE: customer.subscription.deleted
    // ============================================
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.userId;

      if (userId) {
        // Downgrade to free plan
        await updateSubscriptionStatus(userId, 'free', subscription.id, 'canceled', new Date());
      }
    }

    // ============================================
    // HANDLE: payout.paid
    // ============================================
    if (event.type === 'payout.paid') {
      const payout = event.data.object;
      await markPayoutAsPaid(payout.id, payout.id);
    }

    // ============================================
    // HANDLE: payout.failed
    // ============================================
    if (event.type === 'payout.failed') {
      const payout = event.data.object;
      
      // Mark transaction as failed
      const transaction = await db.walletTransaction.findFirst({
        where: { reference: payout.id, type: 'PAYOUT' },
      });

      if (transaction) {
        await db.walletTransaction.update({
          where: { id: transaction.id },
          data: {
            failedAt: new Date(),
            failureReason: payout.failure_message || 'Unknown error',
          },
        });

        // Refund the amount back to wallet
        await db.wallet.update({
          where: { id: transaction.walletId },
          data: {
            balance: { increment: Math.abs(transaction.amount) },
            totalWithdrawn: { decrement: Math.abs(transaction.amount) },
          },
        });
      }
    }

    // Return success
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return NextResponse.json({
      error: 'InternalServerError',
      message: 'Webhook processing failed',
    }, { status: 500 });
  }
}
