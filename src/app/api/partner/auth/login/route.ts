import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPartnerApiKey } from '@/lib/partner-auth';

/**
 * Partner Login via API Key
 * POST /api/partner/auth/login
 * Headers: x-api-key: <api_key>
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key') || 
                   request.headers.get('authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required', code: 'MISSING_API_KEY' },
        { status: 401 }
      );
    }

    const session = await verifyPartnerApiKey(apiKey);

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired API key', code: 'INVALID_API_KEY' },
        { status: 401 }
      );
    }

    // Get full partner details
    const partner = await db.partner.findUnique({
      where: { id: session.partnerId },
      select: {
        id: true,
        name: true,
        type: true,
        contactEmail: true,
        status: true,
        testMode: true,
        liveModeEnabled: true,
        webhookUrl: true,
      },
    });

    if (!partner || partner.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Partner not active', code: 'PARTNER_INACTIVE' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        partnerId: session.partnerId,
        partnerName: session.partnerName,
        partnerType: session.partnerType,
        scopes: session.scopes,
        isTestMode: session.isTestMode,
      },
      partner,
    });
  } catch (error) {
    console.error('Partner auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', code: 'AUTH_ERROR' },
      { status: 500 }
    );
  }
}
