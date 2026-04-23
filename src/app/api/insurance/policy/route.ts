import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/insurance/policy
 * 
 * Create a new insurance policy
 * 
 * Request Body:
 * - quoteId: string (required) - Quote ID from /insurance/quote
 * - orderId: string (required) - Transport order ID
 * - customerId: string (required) - Customer ID
 * - tier: string (optional) - Selected tier (basis, standard, premium)
 * 
 * Response:
 * - policyId: string - Unique policy identifier
 * - provider: string - Insurance provider name
 * - premium: number - Premium amount
 * - commission: number - Platform commission
 * - status: string - Policy status
 * - pdfUrl: string - URL to policy document
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { quoteId, orderId, customerId, tier = 'standard' } = body;

    // Validation
    if (!quoteId || !orderId || !customerId) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Pflichtfelder fehlen: quoteId, orderId, customerId',
          code: 'MISSING_REQUIRED_FIELDS',
        },
        { status: 400 }
      );
    }

    // Validate quote ID format (simplified)
    if (!quoteId.startsWith('q_')) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Ungültige Quote-ID',
          code: 'INVALID_QUOTE_ID',
        },
        { status: 400 }
      );
    }

    // In production, would validate quote exists and is not expired
    // For demo, we create the policy directly

    // Generate policy ID
    const policyId = `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Mock premium calculation (would come from quote in production)
    const tierMultipliers: Record<string, number> = {
      basis: 0.4,
      standard: 1,
      premium: 2,
    };
    
    const basePremium = 24.90;
    const premium = Math.round(basePremium * tierMultipliers[tier] * 100) / 100;

    // Calculate commission (15% for standard, 12% for premium, 18% for basis)
    const commissionRates: Record<string, number> = {
      basis: 0.18,
      standard: 0.15,
      premium: 0.12,
    };
    const commission = Math.round(premium * commissionRates[tier] * 100) / 100;

    // Determine provider
    const providers: Record<string, string> = {
      basis: 'HDI',
      standard: 'Allianz',
      premium: 'AXA',
    };

    // Coverage amounts
    const coverages: Record<string, number> = {
      basis: 10000,
      standard: 50000,
      premium: 100000,
    };

    // Create policy
    const policy = {
      policyId,
      quoteId,
      orderId,
      customerId,
      provider: providers[tier],
      premium,
      commission,
      coverage: coverages[tier],
      status: 'active',
      tier,
      createdAt: new Date().toISOString(),
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      pdfUrl: `https://api.cargobit.io/insurance/policies/${policyId}/pdf`,
      policyNumber: `CB-2024-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    };

    // In production:
    // 1. Store policy in database
    // 2. Trigger webhook to insurance provider
    // 3. Generate PDF document
    // 4. Send confirmation email

    return NextResponse.json(policy, { status: 201 });

  } catch (error) {
    console.error('Policy creation error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: 'Fehler beim Erstellen der Police',
        code: 'POLICY_CREATION_FAILED',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/insurance/policy
 * 
 * Get a specific policy by ID
 * 
 * Query Parameters:
 * - policyId: string (required) - Policy ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const policyId = searchParams.get('policyId');

    if (!policyId) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Policy-ID erforderlich',
          code: 'MISSING_POLICY_ID',
        },
        { status: 400 }
      );
    }

    // Mock policy data
    const policy = {
      policyId,
      orderId: 'TR-12345',
      customerId: 'cust_123',
      provider: 'Allianz',
      premium: 24.90,
      commission: 3.74,
      coverage: 50000,
      status: 'active',
      tier: 'standard',
      createdAt: new Date().toISOString(),
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      pdfUrl: `https://api.cargobit.io/insurance/policies/${policyId}/pdf`,
      policyNumber: `CB-2024-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    };

    return NextResponse.json(policy);

  } catch (error) {
    console.error('Policy fetch error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: 'Fehler beim Abrufen der Police',
        code: 'POLICY_FETCH_FAILED',
      },
      { status: 500 }
    );
  }
}
