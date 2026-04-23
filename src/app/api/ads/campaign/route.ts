import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/ads/campaign
 * 
 * Create a new advertising campaign
 * 
 * Request Body:
 * - name: string (required) - Campaign name
 * - slot: string (required) - Target slot
 * - budget: number (required) - Total budget in EUR
 * - cpc: number (optional) - Cost per click
 * - cpm: number (optional) - Cost per 1000 impressions
 * - imageUrl: string (required) - Ad creative URL
 * - targetUrl: string (required) - Click target URL
 * - startDate: string (optional) - ISO date string
 * - endDate: string (optional) - ISO date string
 * - targeting: object (optional) - Targeting rules
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      name,
      slot,
      budget,
      cpc,
      cpm,
      imageUrl,
      targetUrl,
      startDate,
      endDate,
      targeting,
    } = body;

    // Validation
    if (!name || !slot || !budget || !imageUrl || !targetUrl) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Pflichtfelder fehlen: name, slot, budget, imageUrl, targetUrl',
          code: 'MISSING_REQUIRED_FIELDS',
        },
        { status: 400 }
      );
    }

    // Validate pricing model
    if (!cpc && !cpm) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Entweder CPC oder CPM muss angegeben werden',
          code: 'MISSING_PRICING_MODEL',
        },
        { status: 400 }
      );
    }

    // Validate budget
    if (budget < 50) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Mindestbudget: 50 €',
          code: 'BUDGET_TOO_LOW',
        },
        { status: 400 }
      );
    }

    // Generate campaign ID
    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create campaign
    const campaign = {
      campaignId,
      name,
      slot,
      budget,
      cpc: cpc || null,
      cpm: cpm || null,
      imageUrl,
      targetUrl,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      targeting: targeting || {},
      stats: {
        impressions: 0,
        clicks: 0,
        ctr: 0,
        spend: 0,
        remaining: budget,
      },
      reviewStatus: 'pending',
      estimatedDailyImpressions: Math.round(budget / (cpm ? cpm / 1000 : cpc * 0.03) / 30),
    };

    // In production:
    // 1. Store campaign in database
    // 2. Upload and validate creative
    // 3. Send for review
    // 4. Set up targeting rules
    // 5. Initialize analytics tracking

    return NextResponse.json(campaign, { status: 201 });

  } catch (error) {
    console.error('Campaign creation error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: 'Fehler beim Erstellen der Kampagne',
        code: 'CAMPAIGN_CREATION_FAILED',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ads/campaign
 * 
 * Get campaign details or list campaigns
 * 
 * Query Parameters:
 * - campaignId: string (optional) - Get specific campaign
 * - partnerId: string (optional) - List campaigns for partner
 * - status: string (optional) - Filter by status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const campaignId = searchParams.get('campaignId');
    const partnerId = searchParams.get('partnerId');
    const status = searchParams.get('status');

    if (campaignId) {
      // Return specific campaign
      const campaign = {
        campaignId,
        name: 'Allianz Transportversicherung',
        slot: 'marketplace-sidebar',
        budget: 500,
        cpc: 0.50,
        cpm: null,
        imageUrl: 'https://cdn.cargobit.io/ads/allianz-campaign.jpg',
        targetUrl: 'https://allianz.com/transport?ref=cargobit',
        status: 'active',
        createdAt: '2024-04-01T10:00:00Z',
        startDate: '2024-04-01T10:00:00Z',
        endDate: '2024-04-30T10:00:00Z',
        stats: {
          impressions: 45230,
          clicks: 1245,
          ctr: 2.75,
          spend: 622.50,
          remaining: -122.50, // Over budget
        },
      };

      return NextResponse.json(campaign);
    }

    // List campaigns
    const campaigns = [
      {
        campaignId: 'camp_001',
        name: 'Allianz Transport',
        slot: 'homepage-hero',
        status: 'active',
        budget: 1000,
        spend: 622.50,
        clicks: 1245,
      },
      {
        campaignId: 'camp_002',
        name: 'DHL Express',
        slot: 'marketplace-sidebar',
        status: 'active',
        budget: 500,
        spend: 428.00,
        clicks: 856,
      },
      {
        campaignId: 'camp_003',
        name: 'Shell Tankkarte',
        slot: 'dashboard-sidebar',
        status: 'paused',
        budget: 300,
        spend: 156.00,
        clicks: 312,
      },
    ];

    let filtered = [...campaigns];
    if (status) {
      filtered = filtered.filter(c => c.status === status);
    }

    return NextResponse.json({
      campaigns: filtered,
      total: filtered.length,
    });

  } catch (error) {
    console.error('Campaign fetch error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: 'Fehler beim Abrufen der Kampagnen',
        code: 'CAMPAIGN_FETCH_FAILED',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ads/campaign
 * 
 * Update a campaign
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, ...updates } = body;

    if (!campaignId) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Campaign-ID erforderlich',
          code: 'MISSING_CAMPAIGN_ID',
        },
        { status: 400 }
      );
    }

    // In production: update campaign in database

    return NextResponse.json({
      success: true,
      campaignId,
      updates,
      updatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Campaign update error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: 'Fehler beim Aktualisieren der Kampagne',
        code: 'CAMPAIGN_UPDATE_FAILED',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ads/campaign
 * 
 * Delete/archive a campaign
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Campaign-ID erforderlich',
          code: 'MISSING_CAMPAIGN_ID',
        },
        { status: 400 }
      );
    }

    // In production: archive campaign in database

    return NextResponse.json({
      success: true,
      campaignId,
      archived: true,
      archivedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Campaign deletion error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: 'Fehler beim Löschen der Kampagne',
        code: 'CAMPAIGN_DELETE_FAILED',
      },
      { status: 500 }
    );
  }
}
