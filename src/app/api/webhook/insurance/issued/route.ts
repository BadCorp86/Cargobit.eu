import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/webhook/insurance/issued
 *
 * Webhook endpoint called by insurance provider when a policy is issued
 *
 * This endpoint receives webhook notifications from insurance providers
 * when a policy has been successfully issued.
 *
 * Request Body:
 * - policyId: string - Platform policy ID
 * - providerPolicyNumber: string - Provider's policy number
 * - pdfUrl: string - URL to the policy PDF
 * - certificateUrl: string - URL to the insurance certificate
 * - issuedAt: string - ISO timestamp when policy was issued
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
      pdfUrl,
      certificateUrl,
      issuedAt,
      provider,
    } = body;

    // Validation
    if (!policyId || !providerPolicyNumber) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Pflichtfelder fehlen: policyId, providerPolicyNumber',
          code: 'MISSING_REQUIRED_FIELDS',
        },
        { status: 400 }
      );
    }

    // In production:
    // 1. Verify signature using provider's secret
    // 2. Find policy in database
    // 3. Update policy status to ACTIVE
    // 4. Store PDF URL and certificate URL
    // 5. Log webhook receipt
    // 6. Send notification to customer

    const webhookLog = {
      webhookId: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event: 'policy.issued',
      policyId,
      providerPolicyNumber,
      provider,
      receivedAt: new Date().toISOString(),
      status: 'processed',
    };

    // Simulate processing
    const policyUpdate = {
      policyId,
      status: 'active',
      providerPolicyNumber,
      pdfUrl,
      certificateUrl,
      issuedAt: issuedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      webhook: webhookLog,
      policy: policyUpdate,
    });

  } catch (error) {
    console.error('Insurance issued webhook error:', error);
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
