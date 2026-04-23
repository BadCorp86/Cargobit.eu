import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/webhook/insurance/cancelled
 *
 * Webhook endpoint called by insurance provider when a policy is cancelled
 *
 * This endpoint receives webhook notifications from insurance providers
 * when a policy has been cancelled (either by customer request or provider).
 *
 * Request Body:
 * - policyId: string - Platform policy ID
 * - providerPolicyNumber: string - Provider's policy number
 * - cancelledAt: string - ISO timestamp when policy was cancelled
 * - cancellationReason: string - Reason for cancellation
 * - refundAmount: number - Amount refunded (if applicable)
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
      providerPolicyNumber,
      cancelledAt,
      cancellationReason,
      refundAmount,
      provider,
    } = body;

    // Validation
    if (!policyId || !cancellationReason) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Pflichtfelder fehlen: policyId, cancellationReason',
          code: 'MISSING_REQUIRED_FIELDS',
        },
        { status: 400 }
      );
    }

    // In production:
    // 1. Verify signature using provider's secret
    // 2. Find policy in database
    // 3. Update policy status to CANCELLED
    // 4. Process refund if applicable
    // 5. Reverse commission if within cancellation period
    // 6. Log webhook receipt
    // 7. Send notification to customer

    const webhookLog = {
      webhookId: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event: 'policy.cancelled',
      policyId,
      providerPolicyNumber,
      provider,
      receivedAt: new Date().toISOString(),
      status: 'processed',
    };

    // Simulate processing
    const policyUpdate = {
      policyId,
      status: 'cancelled',
      cancelledAt: cancelledAt || new Date().toISOString(),
      cancellationReason,
      refundAmount: refundAmount || 0,
      commissionReversed: refundAmount && refundAmount > 0,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      webhook: webhookLog,
      policy: policyUpdate,
    });

  } catch (error) {
    console.error('Insurance cancelled webhook error:', error);
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
