/**
 * Mock Stripe API Helper
 * 
 * Provides utilities for mocking Stripe API responses in tests.
 * This complements the existing Prisma mock with Stripe-specific mocking.
 */

// ============================================
// TYPES
// ============================================

export interface MockStripeConfig {
  shouldSucceed: boolean;
  delay?: number;
  refundStatus?: 'succeeded' | 'pending' | 'failed' | 'canceled';
  chargeStatus?: 'succeeded' | 'pending' | 'failed';
}

export interface MockStripeCharge {
  id: string;
  amount: number;
  currency: string;
  captured: boolean;
  refunded: boolean;
  refunds: {
    data: MockStripeRefund[];
    has_more: boolean;
    total_count: number;
  };
  payment_intent: string | null;
  status: string;
  created: number;
  metadata: Record<string, any>;
}

export interface MockStripeRefund {
  id: string;
  object: 'refund';
  amount: number;
  charge: string;
  created: number;
  currency: string;
  reason: string | null;
  receipt_number: string | null;
  status: 'succeeded' | 'pending' | 'failed' | 'canceled';
  source_transfer_reversal: string | null;
}

export interface MockStripePaymentIntent {
  id: string;
  object: 'payment_intent';
  amount: number;
  amount_capturable: number;
  amount_received: number;
  created: number;
  currency: string;
  status: 'succeeded' | 'processing' | 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'canceled' | 'failed';
  latest_charge: string | null;
  charges: {
    data: MockStripeCharge[];
  };
  metadata: Record<string, any>;
  last_payment_error: { message: string } | null;
}

// ============================================
// MOCK DATA STORE
// ============================================

class MockStripeDataStore {
  charges: Map<string, MockStripeCharge> = new Map();
  paymentIntents: Map<string, MockStripePaymentIntent> = new Map();
  refunds: Map<string, MockStripeRefund> = new Map();
  config: MockStripeConfig = { shouldSucceed: true };

  reset(config?: MockStripeConfig): void {
    this.charges.clear();
    this.paymentIntents.clear();
    this.refunds.clear();
    this.config = config || { shouldSucceed: true };
  }

  // Charge methods
  addCharge(charge: Partial<MockStripeCharge>): MockStripeCharge {
    const id = charge.id || `ch_mock_${Date.now()}`;
    const fullCharge: MockStripeCharge = {
      id,
      amount: charge.amount ?? 10000,
      currency: charge.currency || 'eur',
      captured: charge.captured ?? true,
      refunded: charge.refunded ?? false,
      refunds: charge.refunds ?? { data: [], has_more: false, total_count: 0 },
      payment_intent: charge.payment_intent ?? null,
      status: charge.status || 'succeeded',
      created: charge.created ?? Math.floor(Date.now() / 1000),
      metadata: charge.metadata || {},
    };
    this.charges.set(id, fullCharge);
    return fullCharge;
  }

  getCharge(chargeId: string): MockStripeCharge | undefined {
    return this.charges.get(chargeId);
  }

  addRefundToCharge(chargeId: string, refund: Partial<MockStripeRefund>): MockStripeRefund | null {
    const charge = this.charges.get(chargeId);
    if (!charge) return null;

    const refundId = refund.id || `re_mock_${Date.now()}`;
    const fullRefund: MockStripeRefund = {
      id: refundId,
      object: 'refund',
      amount: refund.amount ?? charge.amount,
      charge: chargeId,
      created: refund.created ?? Math.floor(Date.now() / 1000),
      currency: refund.currency || 'eur',
      reason: refund.reason ?? 'requested_by_customer',
      receipt_number: refund.receipt_number ?? null,
      status: refund.status || this.config.refundStatus || 'succeeded',
      source_transfer_reversal: refund.source_transfer_reversal ?? null,
    };

    // Add refund to charge
    charge.refunds.data.push(fullRefund);
    charge.refunds.total_count = charge.refunds.data.length;
    charge.refunded = charge.refunds.data.some(r => r.status === 'succeeded');

    this.refunds.set(refundId, fullRefund);
    return fullRefund;
  }

  // PaymentIntent methods
  addPaymentIntent(pi: Partial<MockStripePaymentIntent>): MockStripePaymentIntent {
    const id = pi.id || `pi_mock_${Date.now()}`;
    const fullPI: MockStripePaymentIntent = {
      id,
      object: 'payment_intent',
      amount: pi.amount ?? 10000,
      amount_capturable: pi.amount_capturable ?? 0,
      amount_received: pi.amount_received ?? 0,
      created: pi.created ?? Math.floor(Date.now() / 1000),
      currency: pi.currency || 'eur',
      status: pi.status || 'succeeded',
      latest_charge: pi.latest_charge ?? null,
      charges: pi.charges ?? { data: [] },
      metadata: pi.metadata || {},
      last_payment_error: pi.last_payment_error ?? null,
    };
    this.paymentIntents.set(id, fullPI);
    return fullPI;
  }

  getPaymentIntent(piId: string): MockStripePaymentIntent | undefined {
    return this.paymentIntents.get(piId);
  }
}

// Singleton instance
export const mockStripeData = new MockStripeDataStore();

// ============================================
// MOCK FETCH IMPLEMENTATION
// ============================================

/**
 * Creates a mock fetch function that intercepts Stripe API calls.
 * Use this to mock global.fetch in tests.
 */
export function createMockStripeFetch(config?: MockStripeConfig): jest.Mock {
  mockStripeData.reset(config);

  return jest.fn(async (url: string, options?: RequestInit) => {
    const method = options?.method || 'GET';
    const path = url.replace('https://api.stripe.com/v1', '');

    // Add simulated delay if configured
    if (mockStripeData.config.delay) {
      await new Promise(resolve => setTimeout(resolve, mockStripeData.config.delay));
    }

    // Handle errors
    if (!mockStripeData.config.shouldSucceed) {
      return {
        ok: false,
        status: 500,
        json: async () => ({
          error: { message: 'Stripe API error' },
        }),
      };
    }

    // GET /charges/:id
    if (method === 'GET' && path.match(/^\/charges\/ch_/)) {
      const chargeId = path.split('/')[2];
      const charge = mockStripeData.getCharge(chargeId);

      if (!charge) {
        return {
          ok: false,
          status: 404,
          json: async () => ({
            error: { message: `No such charge: '${chargeId}'` },
          }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => charge,
      };
    }

    // POST /refunds
    if (method === 'POST' && path === '/refunds') {
      const body = new URLSearchParams(options?.body as string);
      const chargeId = body.get('charge');
      const amount = parseInt(body.get('amount') || '0');

      if (!chargeId) {
        return {
          ok: false,
          status: 400,
          json: async () => ({
            error: { message: 'Missing required parameter: charge' },
          }),
        };
      }

      const refund = mockStripeData.addRefundToCharge(chargeId, {
        amount: amount || undefined,
      });

      return {
        ok: true,
        status: 200,
        json: async () => refund,
      };
    }

    // GET /payment_intents/:id
    if (method === 'GET' && path.match(/^\/payment_intents\/pi_/)) {
      const piId = path.split('/')[2];
      const pi = mockStripeData.getPaymentIntent(piId);

      if (!pi) {
        return {
          ok: false,
          status: 404,
          json: async () => ({
            error: { message: `No such payment_intent: '${piId}'` },
          }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => pi,
      };
    }

    // Default: not found
    return {
      ok: false,
      status: 404,
      json: async () => ({
        error: { message: `Unhandled mock endpoint: ${method} ${path}` },
      }),
    };
  });
}

// ============================================
// HELPER FUNCTIONS FOR COMMON SCENARIOS
// ============================================

/**
 * Setup a successful payment scenario with mock Stripe data.
 */
export function setupSuccessfulPaymentScenario(
  paymentIntentId: string,
  amountCents: number,
  chargeId?: string
): { charge: MockStripeCharge; paymentIntent: MockStripePaymentIntent } {
  const chId = chargeId || `ch_${paymentIntentId.replace('pi_', '')}`;

  const charge = mockStripeData.addCharge({
    id: chId,
    amount: amountCents,
    payment_intent: paymentIntentId,
    refunded: false,
  });

  const paymentIntent = mockStripeData.addPaymentIntent({
    id: paymentIntentId,
    amount: amountCents,
    status: 'succeeded',
    latest_charge: chId,
    charges: { data: [charge] },
  });

  return { charge, paymentIntent };
}

/**
 * Setup a refunded payment scenario.
 */
export function setupRefundedPaymentScenario(
  chargeId: string,
  totalAmount: number,
  refundAmount: number
): MockStripeRefund {
  mockStripeData.addCharge({
    id: chargeId,
    amount: totalAmount,
    refunded: refundAmount >= totalAmount,
  });

  return mockStripeData.addRefundToCharge(chargeId, {
    amount: refundAmount,
  })!;
}

/**
 * Setup a partially refunded payment scenario.
 */
export function setupPartialRefundScenario(
  chargeId: string,
  totalAmount: number,
  refundAmount: number
): { charge: MockStripeCharge; refund: MockStripeRefund } {
  const charge = mockStripeData.addCharge({
    id: chargeId,
    amount: totalAmount,
    refunded: false,
  });

  const refund = mockStripeData.addRefundToCharge(chargeId, {
    amount: refundAmount,
  })!;

  return { charge, refund };
}

/**
 * Setup multiple refunds on a single charge.
 */
export function setupMultipleRefundScenario(
  chargeId: string,
  totalAmount: number,
  refundAmounts: number[]
): MockStripeRefund[] {
  mockStripeData.addCharge({
    id: chargeId,
    amount: totalAmount,
  });

  const refunds: MockStripeRefund[] = [];
  for (const amount of refundAmounts) {
    const refund = mockStripeData.addRefundToCharge(chargeId, { amount });
    if (refund) refunds.push(refund);
  }

  return refunds;
}

/**
 * Setup a failed payment scenario.
 */
export function setupFailedPaymentScenario(
  paymentIntentId: string,
  amountCents: number,
  errorMessage: string = 'Card declined'
): MockStripePaymentIntent {
  return mockStripeData.addPaymentIntent({
    id: paymentIntentId,
    amount: amountCents,
    status: 'failed',
    last_payment_error: { message: errorMessage },
  });
}

// ============================================
// JEST SETUP/TEARDOWN HELPERS
// ============================================

const originalFetch = global.fetch;

/**
 * Setup Stripe mock for a test suite.
 * Call this in beforeEach or at the start of a test file.
 */
export function setupStripeMock(config?: MockStripeConfig): jest.Mock {
  const mockFetch = createMockStripeFetch(config);
  global.fetch = mockFetch;
  return mockFetch;
}

/**
 * Teardown Stripe mock after tests.
 * Call this in afterEach or at the end of a test file.
 */
export function teardownStripeMock(): void {
  global.fetch = originalFetch;
  mockStripeData.reset();
}

/**
 * Reset Stripe mock data between tests.
 */
export function resetStripeMock(config?: MockStripeConfig): void {
  mockStripeData.reset(config);
}
