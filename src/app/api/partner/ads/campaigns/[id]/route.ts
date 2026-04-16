import { NextRequest, NextResponse } from 'next/server';
import { withPartnerAuth, PARTNER_SCOPES } from '@/lib/partner-auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/partner/ads/campaigns/[id]
 * Get a single ad campaign
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await withPartnerAuth(request, [PARTNER_SCOPES.ADS_READ]);

  if ('error' in authResult) {
    return authResult.error;
  }

  const { session } = authResult;
  const { id } = await params;

  try {
    const campaign = await db.partnerAdCampaign.findFirst({
      where: { id, partnerId: session.partnerId },
      include: {
        dailyStats: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({
      campaign: {
        ...campaign,
        targeting: campaign.targeting ? JSON.parse(campaign.targeting) : null,
        languageTarget: campaign.languageTarget ? JSON.parse(campaign.languageTarget) : null,
      },
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/partner/ads/campaigns/[id]
 * Update an ad campaign
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authResult = await withPartnerAuth(request, [PARTNER_SCOPES.ADS_WRITE]);

  if ('error' in authResult) {
    return authResult.error;
  }

  const { session } = authResult;
  const { id } = await params;

  try {
    const body = await request.json();

    // Verify ownership
    const existing = await db.partnerAdCampaign.findFirst({
      where: { id, partnerId: session.partnerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    
    const allowedFields = [
      'name', 'description', 'slot', 'bannerUrl', 'bannerAlt', 'targetUrl',
      'callToAction', 'budgetEur', 'pricingModel', 'cpcEur', 'cpmEur', 'cpaEur',
      'startDate', 'endDate', 'status',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle JSON fields
    if (body.targeting !== undefined) {
      updateData.targeting = body.targeting ? JSON.stringify(body.targeting) : null;
    }
    if (body.languageTarget !== undefined) {
      updateData.languageTarget = body.languageTarget ? JSON.stringify(body.languageTarget) : null;
    }

    // Handle dates
    if (body.startDate) {
      updateData.startDate = new Date(body.startDate);
    }
    if (body.endDate) {
      updateData.endDate = new Date(body.endDate);
    }

    const campaign = await db.partnerAdCampaign.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/partner/ads/campaigns/[id]
 * Delete an ad campaign
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await withPartnerAuth(request, [PARTNER_SCOPES.ADS_WRITE]);

  if ('error' in authResult) {
    return authResult.error;
  }

  const { session } = authResult;
  const { id } = await params;

  try {
    const existing = await db.partnerAdCampaign.findFirst({
      where: { id, partnerId: session.partnerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Delete campaign and its stats
    await db.partnerAdCampaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
