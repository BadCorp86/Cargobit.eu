/**
 * Test Fixtures and Data Generators for Payment Tests
 * 
 * Provides reusable test data builders for:
 * - Payments
 * - Wallets
 * - Wallet Transactions
 * - Stripe Events
 * - Stripe Refunds
 * - Notifications
 */

import { PaymentStatus } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface PaymentFixture {
  id: string;
  paymentIntentId: string | null;
  chargeId: string | null;
  shipperId: string;
  jobId: string | null;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  refundedCents: number;
  lastReconciledAt: Date | null;
  stripeRefundsJson: string | null;
  paidAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
}

export interface WalletFixture {
  id: string;
  ownerUserId: string;
  balance: number;
  currency: string;
  status: string;
  totalDeposited: number;
  totalWithdrawn: number;
}

export interface WalletTransactionFixture {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  currency: string;
  paymentId: string | null;
  relatedTransportId: string | null;
  description: string | null;
  reference: string | null;
  processedAt: Date | null;
  createdAt: Date;
}

export interface StripeEventFixture {
  id: string;
  type: string;
  payload: string | null;
  processed: boolean;
  processedAt: Date | null;
  errorCount: number;
  lastError: string | null;
  receivedAt: Date;
  createdAt: Date;
}

export interface StripeRefundFixture {
  id: string;
  stripeRefundId: string;
  paymentId: string;
  amountCents: number;
  reason: string | null;
  status: string;
  stripeCreatedAt: Date;
}

// ============================================
// ID GENERATOR
// ============================================

let idCounter = 0;

export function generateId(prefix: string = ''): string {
  idCounter++;
  return `${prefix}${idCounter.toString().padStart(8, '0')}-${Date.now()}`;
}

export function resetIdGenerator(): void {
  idCounter = 0;
}

// ============================================
// PAYMENT BUILDER
// ============================================

export function createPaymentFixture(
  overrides: Partial<PaymentFixture> = {}
): PaymentFixture {
  const id = overrides.id || generateId('pay_');
  const amountCents = overrides.amountCents || 10000; // 100 EUR default

  return {
    id,
    paymentIntentId: overrides.paymentIntentId ?? `pi_${id}`,
    chargeId: overrides.chargeId ?? null,
    shipperId: overrides.shipperId || 'user_default',
    jobId: overrides.jobId ?? null,
    amountCents,
    currency: overrides.currency || 'EUR',
    status: overrides.status || PaymentStatus.PENDING,
    refundedCents: overrides.refundedCents ?? 0,
    lastReconciledAt: overrides.lastReconciledAt ?? null,
    stripeRefundsJson: overrides.stripeRefundsJson ?? null,
    paidAt: overrides.paidAt ?? null,
    failedAt: overrides.failedAt ?? null,
    createdAt: overrides.createdAt || new Date(),
    ...overrides,
  };
}

export function createSucceededPaymentFixture(
  overrides: Partial<PaymentFixture> = {}
): PaymentFixture {
  const id = overrides.id || generateId('pay_');
  return createPaymentFixture({
    id,
    status: PaymentStatus.SUCCEEDED,
    chargeId: overrides.chargeId ?? `ch_${id}`,
    paidAt: overrides.paidAt ?? new Date(),
    ...overrides,
  });
}

export function createRefundedPaymentFixture(
  overrides: Partial<PaymentFixture> = {}
): PaymentFixture {
  const id = overrides.id || generateId('pay_');
  const amountCents = overrides.amountCents || 10000;
  return createPaymentFixture({
    id,
    status: PaymentStatus.REFUNDED,
    chargeId: overrides.chargeId ?? `ch_${id}`,
    refundedCents: overrides.refundedCents ?? amountCents,
    paidAt: overrides.paidAt ?? new Date(),
    ...overrides,
  });
}

export function createPartiallyRefundedPaymentFixture(
  overrides: Partial<PaymentFixture> = {}
): PaymentFixture {
  const id = overrides.id || generateId('pay_');
  return createPaymentFixture({
    id,
    status: PaymentStatus.PARTIALLY_REFUNDED,
    chargeId: overrides.chargeId ?? `ch_${id}`,
    refundedCents: overrides.refundedCents ?? 5000, // 50 EUR refunded
    paidAt: overrides.paidAt ?? new Date(),
    ...overrides,
  });
}

// ============================================
// WALLET BUILDER
// ============================================

export function createWalletFixture(
  overrides: Partial<WalletFixture> = {}
): WalletFixture {
  const id = overrides.id || generateId('wallet_');
  const balance = overrides.balance ?? 0;

  return {
    id,
    ownerUserId: overrides.ownerUserId || 'user_default',
    balance,
    currency: overrides.currency || 'EUR',
    status: overrides.status || 'ACTIVE',
    totalDeposited: overrides.totalDeposited ?? balance,
    totalWithdrawn: overrides.totalWithdrawn ?? 0,
    ...overrides,
  };
}

export function createWalletWithBalanceFixture(
  balance: number,
  overrides: Partial<WalletFixture> = {}
): WalletFixture {
  return createWalletFixture({
    balance,
    totalDeposited: balance,
    ...overrides,
  });
}

// ============================================
// WALLET TRANSACTION BUILDER
// ============================================

export function createWalletTransactionFixture(
  overrides: Partial<WalletTransactionFixture> = {}
): WalletTransactionFixture {
  return {
    id: overrides.id || generateId('wtx_'),
    walletId: overrides.walletId || 'wallet_default',
    type: overrides.type || 'PAYMENT_IN',
    amount: overrides.amount ?? 100,
    currency: overrides.currency || 'EUR',
    paymentId: overrides.paymentId ?? null,
    relatedTransportId: overrides.relatedTransportId ?? null,
    description: overrides.description ?? null,
    reference: overrides.reference ?? null,
    processedAt: overrides.processedAt ?? new Date(),
    createdAt: overrides.createdAt || new Date(),
    ...overrides,
  };
}

// ============================================
// STRIPE EVENT BUILDER
// ============================================

export function createStripeEventFixture(
  overrides: Partial<StripeEventFixture> = {}
): StripeEventFixture {
  return {
    id: overrides.id || generateId('evt_'),
    type: overrides.type || 'payment_intent.succeeded',
    payload: overrides.payload ?? null,
    processed: overrides.processed ?? false,
    processedAt: overrides.processedAt ?? null,
    errorCount: overrides.errorCount ?? 0,
    lastError: overrides.lastError ?? null,
    receivedAt: overrides.receivedAt || new Date(),
    createdAt: overrides.createdAt || new Date(),
    ...overrides,
  };
}

// ============================================
// STRIPE REFUND BUILDER
// ============================================

export function createStripeRefundFixture(
  overrides: Partial<StripeRefundFixture> = {}
): StripeRefundFixture {
  return {
    id: overrides.id || generateId('sr_'),
    stripeRefundId: overrides.stripeRefundId || generateId('re_'),
    paymentId: overrides.paymentId || 'pay_default',
    amountCents: overrides.amountCents ?? 10000,
    reason: overrides.reason ?? null,
    status: overrides.status || 'succeeded',
    stripeCreatedAt: overrides.stripeCreatedAt || new Date(),
    ...overrides,
  };
}

// ============================================
// STRIPE WEBHOOK EVENT BUILDER
// ============================================

export interface StripeWebhookEventPayload {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

export function createPaymentIntentSucceededEvent(
  overrides: {
    eventId?: string;
    paymentIntentId?: string;
    amount?: number;
    chargeId?: string;
    metadata?: Record<string, any>;
  } = {}
): StripeWebhookEventPayload {
  const piId = overrides.paymentIntentId || generateId('pi_');
  return {
    id: overrides.eventId || generateId('evt_'),
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: piId,
        amount: overrides.amount ?? 10000,
        currency: 'eur',
        status: 'succeeded',
        latest_charge: overrides.chargeId || `ch_${piId}`,
        metadata: overrides.metadata || {},
      },
    },
  };
}

export function createPaymentIntentFailedEvent(
  overrides: {
    eventId?: string;
    paymentIntentId?: string;
    amount?: number;
    errorMessage?: string;
    metadata?: Record<string, any>;
  } = {}
): StripeWebhookEventPayload {
  const piId = overrides.paymentIntentId || generateId('pi_');
  return {
    id: overrides.eventId || generateId('evt_'),
    type: 'payment_intent.payment_failed',
    data: {
      object: {
        id: piId,
        amount: overrides.amount ?? 10000,
        currency: 'eur',
        status: 'failed',
        last_payment_error: { message: overrides.errorMessage || 'Card declined' },
        metadata: overrides.metadata || {},
      },
    },
  };
}

export function createChargeRefundedEvent(
  overrides: {
    eventId?: string;
    chargeId?: string;
    amount?: number;
    refundId?: string;
    refundAmount?: number;
    reason?: string;
    isFullRefund?: boolean;
  } = {}
): StripeWebhookEventPayload {
  const chargeId = overrides.chargeId || generateId('ch_');
  const totalAmount = overrides.amount ?? 10000;
  const refundAmount = overrides.refundAmount ?? totalAmount;
  const isFull = overrides.isFullRefund ?? (refundAmount === totalAmount);

  return {
    id: overrides.eventId || generateId('evt_'),
    type: 'charge.refunded',
    data: {
      object: {
        id: chargeId,
        amount: totalAmount,
        currency: 'eur',
        refunded: isFull,
        refunds: {
          data: [{
            id: overrides.refundId || generateId('re_'),
            amount: refundAmount,
            reason: overrides.reason || 'requested_by_customer',
            status: 'succeeded',
            created: Math.floor(Date.now() / 1000),
          }],
        },
      },
    },
  };
}

export function createPartialRefundEvent(
  chargeId: string,
  refundAmount: number,
  totalAmount: number = 10000
): StripeWebhookEventPayload {
  return createChargeRefundedEvent({
    chargeId,
    amount: totalAmount,
    refundAmount,
    isFullRefund: false,
  });
}

// ============================================
// BATCH FIXTURE GENERATORS
// ============================================

export function createPaymentBatch(
  count: number,
  overrides: Partial<PaymentFixture> = {}
): PaymentFixture[] {
  return Array.from({ length: count }, (_, i) =>
    createPaymentFixture({
      ...overrides,
      id: overrides.id ? `${overrides.id}_${i}` : undefined,
      amountCents: overrides.amountCents ?? 10000 * (i + 1),
    })
  );
}

export function createWalletWithTransactionsFixture(
  userId: string,
  initialBalance: number,
  transactionCount: number
): {
  wallet: WalletFixture;
  transactions: WalletTransactionFixture[];
} {
  const wallet = createWalletFixture({
    ownerUserId: userId,
    balance: initialBalance,
    totalDeposited: initialBalance,
  });

  const transactions = Array.from({ length: transactionCount }, (_, i) =>
    createWalletTransactionFixture({
      walletId: wallet.id,
      type: i % 2 === 0 ? 'PAYMENT_IN' : 'REFUND',
      amount: i % 2 === 0 ? 100 : -50,
      reference: `tx_${i}`,
    })
  );

  return { wallet, transactions };
}

// ============================================
// SCENARIO FIXTURES
// ============================================

export function createSuccessfulPaymentScenario(): {
  payment: PaymentFixture;
  wallet: WalletFixture;
  event: StripeWebhookEventPayload;
} {
  const payment = createPaymentFixture({
    status: PaymentStatus.PENDING,
    amountCents: 15000,
  });

  const wallet = createWalletFixture({
    ownerUserId: payment.shipperId,
    balance: 0,
  });

  const event = createPaymentIntentSucceededEvent({
    paymentIntentId: payment.paymentIntentId!,
    amount: payment.amountCents,
  });

  return { payment, wallet, event };
}

export function createRefundScenario(): {
  payment: PaymentFixture;
  wallet: WalletFixture;
  event: StripeWebhookEventPayload;
} {
  const payment = createSucceededPaymentFixture({
    amountCents: 20000,
  });

  const wallet = createWalletFixture({
    ownerUserId: payment.shipperId,
    balance: 200,
    totalDeposited: 200,
  });

  const event = createChargeRefundedEvent({
    chargeId: payment.chargeId!,
    amount: payment.amountCents,
    refundAmount: 20000,
    isFullRefund: true,
  });

  return { payment, wallet, event };
}

export function createPartialRefundScenario(): {
  payment: PaymentFixture;
  wallet: WalletFixture;
  event: StripeWebhookEventPayload;
} {
  const payment = createSucceededPaymentFixture({
    amountCents: 10000,
  });

  const wallet = createWalletFixture({
    ownerUserId: payment.shipperId,
    balance: 100,
    totalDeposited: 100,
  });

  const event = createPartialRefundEvent(payment.chargeId!, 3000, 10000);

  return { payment, wallet, event };
}
