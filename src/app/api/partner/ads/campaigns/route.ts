import { NextRequest, NextResponse } from 'next/server';
import { withPartnerAuth, PARTNER_SCOPES } from '@/lib/partner-auth';
import { db } from '@/lib/db';

/**
 * GET /api/partner/ads/campaigns
 * List all ad campaigns for the partner
 */
export async function GET(request: NextRequest) {
  const authResult = await withPartnerAuth(request, [PARTNER_SCOPES.ADS_READ]);

  if ('error' in authResult) {
    return authResult.error;
  }

  const { session } = authResult;

  try {
    const campaigns = await db.partnerAdCampaign.findMany({
      where: { partnerId: session.partnerId },
      orderBy: { createdAt: 'desc' },
    });

    // Parse JSON fields
    const parsedCampaigns = campaigns.map(c => ({
      ...c,
      targeting: c.targeting ? JSON.parse(c.targeting) : null,
      languageTarget: c.languageTarget ? JSON.parse(c.languageTarget) : null,
    }));

    return NextResponse.json({ campaigns: parsedCampaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/partner/ads/campaigns
 * Create a new ad campaign
 */
export async function POST(request: NextRequest) {
  const authResult = await withPartnerAuth(request, [PARTNER_SCOPES.ADS_WRITE]);

  if ('error' in authResult) {
    return authResult.error;
  }

  const { session } = authResult;

  try {
    const body = await request.json();
    const {
      name,
      description,
      slot,
      bannerUrl,
      bannerAlt,
      targetUrl,
      callToAction,
      budgetEur,
      pricingModel,
      cpcEur,
      cpmEur,
      cpaEur,
      targeting,
      languageTarget,
      startDate,
      endDate,
    } = body;

    if (!name || !targetUrl || !budgetEur) {
      return NextResponse.json(
        { error: 'Name, target URL, and budget are required' },
        { status: 400 }
      );
    }

    const campaign = await db.partnerAdCampaign.create({
      data: {
        partnerId: session.partnerId,
        name,
        description,
        slot: slot || 'MARKETPLACE_SIDEBAR',
        bannerUrl,
        bannerAlt,
        targetUrl,
        callToAction,
        budgetEur,
        spentEur: 0,
        pricingModel: pricingModel || 'CPC',
        cpcEur,
        cpmEur,
        cpaEur,
        targeting: targeting ? JSON.stringify(targeting) : null,
        languageTarget: languageTarget ? JSON.stringify(languageTarget) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: 'DRAFT',
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
