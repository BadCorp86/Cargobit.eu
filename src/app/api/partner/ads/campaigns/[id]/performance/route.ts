import { NextRequest, NextResponse } from 'next/server';
import { withPartnerAuth, PARTNER_SCOPES } from '@/lib/partner-auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/partner/ads/campaigns/[id]/performance
 * Get performance metrics for a campaign
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await withPartnerAuth(request, [PARTNER_SCOPES.ADS_READ]);

  if ('error' in authResult) {
    return authResult.error;
  }

  const { session } = authResult;
  const { id } = await params;

  try {
    // Verify ownership
    const campaign = await db.partnerAdCampaign.findFirst({
      where: { id, partnerId: session.partnerId },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get query parameters for date range
    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    
    const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toStr ? new Date(toStr) : new Date();

    // Get daily stats
    const dailyStats = await db.partnerAdStat.findMany({
      where: {
        campaignId: id,
        date: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate aggregated metrics
    const totalImpressions = dailyStats.reduce((sum, s) => sum + s.impressions, 0);
    const totalClicks = dailyStats.reduce((sum, s) => sum + s.clicks, 0);
    const totalConversions = dailyStats.reduce((sum, s) => sum + s.conversions, 0);
    const totalCost = dailyStats.reduce((sum, s) => sum + s.costEur, 0);

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const cpc = totalClicks > 0 ? totalCost / totalClicks : 0;

    return NextResponse.json({
      campaignId: id,
      period: { from, to },
      summary: {
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        cost: totalCost,
        ctr: ctr.toFixed(4),
        conversionRate: conversionRate.toFixed(2),
        cpc: cpc.toFixed(2),
        remainingBudget: campaign.budgetEur - campaign.spentEur,
      },
      daily: dailyStats.map(s => ({
        date: s.date,
        impressions: s.impressions,
        clicks: s.clicks,
        conversions: s.conversions,
        cost: s.costEur,
      })),
    });
  } catch (error) {
    console.error('Error fetching performance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance' },
      { status: 500 }
    );
  }
}
