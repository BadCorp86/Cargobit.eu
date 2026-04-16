import { NextRequest, NextResponse } from 'next/server';
import { withPartnerAuth, PARTNER_SCOPES } from '@/lib/partner-auth';
import { db } from '@/lib/db';

/**
 * Partner Dashboard Data
 * GET /api/partner/dashboard
 * Returns KPIs based on partner type (Insurance vs Ads)
 */
export async function GET(request: NextRequest) {
  const authResult = await withPartnerAuth(request, [
    PARTNER_SCOPES.INSURANCE_READ,
    PARTNER_SCOPES.ADS_READ,
    PARTNER_SCOPES.BILLING_READ,
  ]);

  if ('error' in authResult) {
    return authResult.error;
  }

  const { session } = authResult;

  try {
    const partner = await db.partner.findUnique({
      where: { id: session.partnerId },
      include: {
        apiKeys: {
          where: { status: 'ACTIVE' },
          select: { id: true, name: true, apiKeyPrefix: true, isTestKey: true },
        },
      },
    });

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    let dashboardData: Record<string, unknown> = {
      partner: {
        id: partner.id,
        name: partner.name,
        type: partner.type,
        status: partner.status,
        testMode: partner.testMode,
        liveModeEnabled: partner.liveModeEnabled,
      },
      apiKeys: partner.apiKeys,
    };

    if (partner.type === 'INSURANCE') {
      // Insurance Partner Dashboard
      const [products, policies, billings] = await Promise.all([
        // Active products
        db.insuranceProduct.count({
          where: { partnerId: partner.id, isActive: true },
        }),
        // Total policies
        db.insurancePolicy.count({
          where: { partnerId: partner.id },
        }),
        // Policies this month
        db.insurancePolicy.count({
          where: {
            partnerId: partner.id,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
      ]);

      // Revenue this month
      const monthlyPolicies = await db.insurancePolicy.findMany({
        where: {
          partnerId: partner.id,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        select: { premiumEur: true, partnerCommission: true },
      });

      const monthlyRevenue = monthlyPolicies.reduce((sum, p) => sum + p.premiumEur, 0);
      const monthlyCommission = monthlyPolicies.reduce((sum, p) => sum + p.partnerCommission, 0);

      // Risk distribution
      const riskDistribution = await db.insurancePolicy.groupBy({
        by: ['riskLevel'],
        where: { partnerId: partner.id },
        _count: true,
      });

      dashboardData = {
        ...dashboardData,
        type: 'insurance',
        metrics: {
          activeProducts: products,
          totalPolicies: policies,
          monthlyPolicies,
          monthlyRevenue,
          monthlyCommission,
        },
        riskDistribution: riskDistribution.map(r => ({
          level: r.riskLevel || 'unknown',
          count: r._count,
        })),
      };
    } else if (partner.type === 'ADS') {
      // Ads Partner Dashboard
      const campaigns = await db.partnerAdCampaign.findMany({
        where: { partnerId: partner.id },
        select: {
          id: true,
          name: true,
          status: true,
          budgetEur: true,
          spentEur: true,
          totalImpressions: true,
          totalClicks: true,
          totalConversions: true,
        },
      });

      const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
      const totalBudget = campaigns.reduce((sum, c) => sum + c.budgetEur, 0);
      const totalSpent = campaigns.reduce((sum, c) => sum + c.spentEur, 0);
      const totalImpressions = campaigns.reduce((sum, c) => sum + c.totalImpressions, 0);
      const totalClicks = campaigns.reduce((sum, c) => sum + c.totalClicks, 0);
      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      dashboardData = {
        ...dashboardData,
        type: 'ads',
        metrics: {
          totalCampaigns: campaigns.length,
          activeCampaigns,
          totalBudget,
          totalSpent,
          totalImpressions,
          totalClicks,
          avgCTR: avgCTR.toFixed(2),
          remainingBudget: totalBudget - totalSpent,
        },
        campaigns: campaigns.slice(0, 5), // Top 5 campaigns
      };
    }

    // Add billing summary
    const openBillings = await db.partnerBilling.count({
      where: { partnerId: partner.id, status: 'OPEN' },
    });

    const totalOpenAmount = await db.partnerBilling.aggregate({
      where: { partnerId: partner.id, status: 'OPEN' },
      _sum: { totalEur: true },
    });

    dashboardData = {
      ...dashboardData,
      billing: {
        openInvoices: openBillings,
        openAmount: totalOpenAmount._sum.totalEur || 0,
      },
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard' },
      { status: 500 }
    );
  }
}
