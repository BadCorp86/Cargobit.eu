/**
 * CargoBit Stripe Payment Service
 * 
 * Service for creating and managing Stripe PaymentIntents for job payments.
 * 
 * Flow:
 * 1. Job → Accept → createPaymentIntent() → PaymentIntent created
 * 2. Payment record created with status PENDING
 * 3. Client collects payment via Stripe.js
 * 4. Webhook payment_intent.succeeded → Payment + Job updated
 */

import { prisma } from '@/lib/db';
import { PaymentStatus } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface CreatePaymentIntentRequest {
  jobId: string;
  shipperId: string;
  transporterId?: string;
  amountCents: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  paymentId?: string;
  amountCents?: number;
  currency?: string;
  status?: PaymentStatus;
  error?: string;
}

export interface PaymentIntentWebhookData {
  paymentIntentId: string;
  chargeId?: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, any>;
}

// ============================================
// CONFIGURATION
// ============================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const PLATFORM_FEE_PERCENT = 3.5; // 3.5% platform fee

// Stripe API base URL for direct API calls
const STRIPE_API_BASE = 'https://api.stripe.com/v1';

// ============================================
// HELPER: STRIPE API CALL
// ============================================

async function stripeApi<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  body?: Record<string, any>
): Promise<{ data?: T; error?: string }> {
  try {
    const url = endpoint.startsWith('http') 
      ? endpoint 
      : `${STRIPE_API_BASE}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    if (body && method === 'POST') {
      // Convert body to form-urlencoded format
      const formBody = Object.entries(body)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => {
          if (typeof v === 'object') {
            // Handle nested objects like metadata
            return Object.entries(v)
              .map(([nk, nv]) => `${k}[${nk}]=${encodeURIComponent(String(nv))}`)
              .join('&');
          }
          return `${k}=${encodeURIComponent(String(v))}`;
        })
        .join('&');
      options.body = formBody;
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      return { error: data.error?.message || 'Stripe API error' };
    }

    return { data };
  } catch (error: any) {
    return { error: error.message || 'Network error' };
  }
}

// ============================================
// SERVICE: CREATE PAYMENT INTENT
// ============================================

/**
 * Creates a Stripe PaymentIntent for a job payment.
 * 
 * This should be called when a shipper accepts an offer or confirms a job.
 * The returned client_secret is used by the frontend to confirm payment.
 */
export async function createPaymentIntent(
  request: CreatePaymentIntentRequest
): Promise<CreatePaymentIntentResult> {
  const { jobId, shipperId, transporterId, amountCents, currency = 'eur', description, metadata } = request;

  // Validate inputs
  if (!jobId || !shipperId || !amountCents) {
    return {
      success: false,
      error: 'Missing required fields: jobId, shipperId, amountCents',
    };
  }

  if (amountCents < 50) {
    return {
      success: false,
      error: 'Minimum amount is 50 cents (€0.50)',
    };
  }

  try {
    // Check if payment already exists for this job
    const existingPayment = await prisma.payment.findFirst({
      where: { jobId },
    });

    if (existingPayment && existingPayment.status !== PaymentStatus.FAILED) {
      // Return existing payment intent if still valid
      if (existingPayment.paymentIntentId && existingPayment.status === PaymentStatus.PENDING) {
        // Retrieve existing PaymentIntent to get fresh client_secret
        const piResult = await stripeApi<{ client_secret: string }>(
          `/payment_intents/${existingPayment.paymentIntentId}`,
          'GET'
        );

        if (piResult.data) {
          return {
            success: true,
            paymentIntentId: existingPayment.paymentIntentId,
            clientSecret: piResult.data.client_secret,
            paymentId: existingPayment.id,
            amountCents: existingPayment.amountCents,
            currency: existingPayment.currency,
            status: existingPayment.status,
          };
        }
      }

      return {
        success: false,
        error: `Payment already exists for job ${jobId} with status ${existingPayment.status}`,
      };
    }

    // Calculate platform fee
    const platformFeeCents = Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100));
    const transporterAmountCents = amountCents - platformFeeCents;

    // Create Stripe PaymentIntent
    const piResult = await stripeApi<{
      id: string;
      client_secret: string;
      amount: number;
      currency: string;
      status: string;
    }>(
      '/payment_intents',
      'POST',
      {
        amount: amountCents,
        currency,
        automatic_payment_methods: { enabled: 'true' },
        capture_method: 'automatic', // Immediate capture
        metadata: {
          job_id: jobId,
          shipper_id: shipperId,
          transporter_id: transporterId || '',
          platform_fee_cents: String(platformFeeCents),
          type: 'job_payment',
          ...metadata,
        },
        description: description || `CargoBit Transport Job ${jobId}`,
      }
    );

    if (piResult.error || !piResult.data) {
      console.error('[PAYMENT] Failed to create PaymentIntent:', piResult.error);
      return {
        success: false,
        error: piResult.error || 'Failed to create PaymentIntent',
      };
    }

    const paymentIntent = piResult.data;

    // Create Payment record in database
    const payment = await prisma.payment.create({
      data: {
        paymentIntentId: paymentIntent.id,
        jobId,
        shipperId,
        transporterId,
        amountCents,
        currency: currency.toUpperCase(),
        platformFeeCents,
        transporterAmountCents,
        status: PaymentStatus.PENDING,
        description,
        metadata: JSON.stringify({
          stripe_metadata: {
            job_id: jobId,
            shipper_id: shipperId,
            transporter_id: transporterId,
          },
        }),
      },
    });

    // Create audit event
    await prisma.paymentAuditEvent.create({
      data: {
        paymentId: payment.id,
        eventType: 'payment_intent_created',
        newStatus: 'PENDING',
        metadata: JSON.stringify({
          payment_intent_id: paymentIntent.id,
          amount_cents: amountCents,
          platform_fee_cents: platformFeeCents,
        }),
      },
    });

    console.log('[PAYMENT] PaymentIntent created:', {
      paymentIntentId: paymentIntent.id,
      paymentId: payment.id,
      jobId,
      amountCents,
    });

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
      amountCents,
      currency: currency.toUpperCase(),
      status: PaymentStatus.PENDING,
    };
  } catch (error: any) {
    console.error('[PAYMENT] Error creating PaymentIntent:', error);
    return {
      success: false,
      error: error.message || 'Internal server error',
    };
  }
}

// ============================================
// SERVICE: HANDLE WEBHOOK payment_intent.succeeded
// ============================================

/**
 * Handles the payment_intent.succeeded webhook event.
 * Updates Payment status, Job status, and creates audit events.
 * 
 * This is called from the Stripe webhook handler.
 */
export async function handlePaymentIntentSucceeded(
  data: PaymentIntentWebhookData
): Promise<{ success: boolean; error?: string }> {
  const { paymentIntentId, chargeId, amount, currency, metadata } = data;

  console.log('[PAYMENT] Processing payment_intent.succeeded:', {
    paymentIntentId,
    amount,
    metadata,
  });

  try {
    // Find payment by PaymentIntent ID
    const payment = await prisma.payment.findFirst({
      where: { paymentIntentId },
    });

    if (!payment) {
      // Check if this is a wallet topup (legacy)
      if (metadata?.type === 'wallet_topup' && metadata?.userId) {
        console.log('[PAYMENT] Wallet topup, handled separately');
        return { success: true };
      }

      // Log orphaned payment intent
      console.warn('[PAYMENT] Orphaned PaymentIntent - no matching payment found:', paymentIntentId);
      
      // Create orphan audit record
      await prisma.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'orphaned_payment',
          entityId: paymentIntentId,
          dataAfter: JSON.stringify({
            payment_intent_id: paymentIntentId,
            amount,
            currency,
            metadata,
          }),
        },
      });

      return { success: false, error: 'Payment not found for PaymentIntent' };
    }

    // Check if already processed (idempotency)
    if (payment.status === PaymentStatus.SUCCEEDED) {
      console.log('[PAYMENT] Payment already marked as succeeded:', payment.id);
      return { success: true };
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCEEDED,
        chargeId,
        paidAt: new Date(),
      },
    });

    // Create audit event
    await prisma.paymentAuditEvent.create({
      data: {
        paymentId: payment.id,
        eventType: 'payment_succeeded',
        oldStatus: payment.status,
        newStatus: 'SUCCEEDED',
        metadata: JSON.stringify({
          payment_intent_id: paymentIntentId,
          charge_id: chargeId,
          amount,
        }),
      },
    });

    // Update Job/Transport status if linked
    if (payment.jobId) {
      const transport = await prisma.transport.findUnique({
        where: { id: payment.jobId },
      });

      if (transport) {
        await prisma.transport.update({
          where: { id: payment.jobId },
          data: {
            status: 'ASSIGNED', // Job is now confirmed and paid
          },
        });

        // Create transport status history
        await prisma.transportStatusHistory.create({
          data: {
            transportId: payment.jobId,
            status: 'ASSIGNED',
            note: 'Payment confirmed - job ready for pickup',
          },
        });
      }
    }

    console.log('[PAYMENT] Payment succeeded:', {
      paymentId: payment.id,
      jobId: payment.jobId,
      amount,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[PAYMENT] Error processing payment_intent.succeeded:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// SERVICE: HANDLE WEBHOOK payment_intent.payment_failed
// ============================================

/**
 * Handles the payment_intent.payment_failed webhook event.
 * Updates Payment status and notifies relevant parties.
 */
export async function handlePaymentIntentFailed(
  data: PaymentIntentWebhookData & { failureMessage?: string }
): Promise<{ success: boolean; error?: string }> {
  const { paymentIntentId, failureMessage } = data;

  console.log('[PAYMENT] Processing payment_intent.payment_failed:', {
    paymentIntentId,
    failureMessage,
  });

  try {
    const payment = await prisma.payment.findFirst({
      where: { paymentIntentId },
    });

    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        failedAt: new Date(),
      },
    });

    // Create audit event
    await prisma.paymentAuditEvent.create({
      data: {
        paymentId: payment.id,
        eventType: 'payment_failed',
        oldStatus: payment.status,
        newStatus: 'FAILED',
        metadata: JSON.stringify({
          payment_intent_id: paymentIntentId,
          failure_message: failureMessage,
        }),
      },
    });

    // Create notification for shipper
    await prisma.notification.create({
      data: {
        userId: payment.shipperId,
        type: 'PAYMENT_FAILED',
        title: 'Zahlung fehlgeschlagen',
        message: `Ihre Zahlung für Job ${payment.jobId} konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.`,
        data: JSON.stringify({ jobId: payment.jobId, paymentId: payment.id }),
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('[PAYMENT] Error processing payment_intent.payment_failed:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// SERVICE: RETRIEVE PAYMENT INTENT
// ============================================

/**
 * Retrieves a PaymentIntent from Stripe for status checking.
 */
export async function retrievePaymentIntent(paymentIntentId: string) {
  return stripeApi<{
    id: string;
    status: string;
    amount: number;
    currency: string;
    client_secret: string;
    metadata: Record<string, string>;
  }>(`/payment_intents/${paymentIntentId}`, 'GET');
}

// ============================================
// SERVICE: CANCEL PAYMENT INTENT
// ============================================

/**
 * Cancels a PaymentIntent (for job cancellation).
 */
export async function cancelPaymentIntent(
  paymentIntentId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await stripeApi<{ status: string }>(
    `/payment_intents/${paymentIntentId}/cancel`,
    'POST'
  );

  if (result.error) {
    return { success: false, error: result.error };
  }

  // Update payment status in database
  await prisma.payment.updateMany({
    where: { paymentIntentId },
    data: {
      status: PaymentStatus.CANCELLED,
      cancelledAt: new Date(),
    },
  });

  return { success: true };
}
