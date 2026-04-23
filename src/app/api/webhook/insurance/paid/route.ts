import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/webhook/insurance/paid
 *
 * Webhook endpoint called by insurance provider when a claim is paid
 *
 * This endpoint receives webhook notifications from insurance providers
 * when a claim has been processed and payment has been made.
 *
 * Request Body:
 * - policyId: string - Platform policy ID
 * - claimId: string - Claim ID (if applicable)
 * - providerClaimNumber: string - Provider's claim reference
 * - paidAmount: number - Amount paid out
 * - currency: string - Currency code (default: EUR)
 * - paidAt: string - ISO timestamp when payment was made
 * - paymentReference: string - Bank transaction reference
 * - provider: string - Insurance provider name
 *
 * Headers:
 * - X-Webhook-Signature: HMAC signature for verification
 * - X-Provider-ID: Provider identifier
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (in production)
    const signature = request.headers.get('X-Webhook-Signature');
    const providerId = request.headers.get('X-Provider-ID');

    if (!signature || !providerId) {
      return NextResponse.json(
        {
          error: 'UnauthorizedError',
          message: 'Fehlende Authentifizierung',
          code: 'MISSING_SIGNATURE',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      policyId,
      claimId,
      providerClaimNumber,
      paidAmount,
      currency = 'EUR',
      paidAt,
      paymentReference,
      provider,
    } = body;

    // Validation
    if (!policyId || !paidAmount) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Pflichtfelder fehlen: policyId, paidAmount',
          code: 'MISSING_REQUIRED_FIELDS',
        },
        { status: 400 }
      );
    }

    // In production:
    // 1. Verify signature using provider's secret
    // 2. Find policy in database
    // 3. Update claim status if claimId provided
    // 4. Record payment in transactions
    // 5. Update policy total claimed amount
    // 6. Log webhook receipt
    // 7. Send notification to customer

    const webhookLog = {
      webhookId: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event: 'claim.paid',
      policyId,
      claimId,
      providerClaimNumber,
      provider,
      receivedAt: new Date().toISOString(),
      status: 'processed',
    };

    // Simulate processing
    const paymentRecord = {
      policyId,
      claimId,
      paidAmount,
      currency,
      paidAt: paidAt || new Date().toISOString(),
      paymentReference: paymentReference || `PAY-${Date.now()}`,
      status: 'completed',
    };

    return NextResponse.json({
      success: true,
      webhook: webhookLog,
      payment: paymentRecord,
    });

  } catch (error) {
    console.error('Insurance paid webhook error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: 'Fehler bei der Verarbeitung des Webhooks',
        code: 'WEBHOOK_PROCESSING_FAILED',
      },
      { status: 500 }
    );
  }
}
