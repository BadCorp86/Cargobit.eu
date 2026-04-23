import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/ads/render
 * 
 * Get ad to display in a specific slot
 * 
 * Query Parameters:
 * - slot: string (required) - Slot identifier (homepage-hero, marketplace-sidebar, etc.)
 * - userId: string (optional) - User ID for targeting
 * - riskLevel: string (optional) - Risk level for contextual targeting
 * - origin: string (optional) - Transport origin for route-based targeting
 * - destination: string (optional) - Transport destination for route-based targeting
 * 
 * Response:
 * - adId: string - Ad identifier
 * - imageUrl: string - Ad image URL
 * - targetUrl: string - Click target URL
 * - impressionId: string - Unique impression ID for tracking
 * - provider: string - Advertiser name
 * - alt: string - Alt text for accessibility
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const slot = searchParams.get('slot');
    const userId = searchParams.get('userId');
    const riskLevel = searchParams.get('riskLevel');
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');

    // Validation
    if (!slot) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Slot-Parameter erforderlich',
          code: 'MISSING_SLOT',
        },
        { status: 400 }
      );
    }

    // Generate impression ID
    const impressionId = `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Mock ad inventory based on slot and targeting
    const adInventory: Record<string, Array<{
      adId: string;
      provider: string;
      imageUrl: string;
      targetUrl: string;
      alt: string;
      targeting?: { riskLevels?: string[]; routes?: string[] };
    }>> = {
      'homepage-hero': [
        {
          adId: 'ad_allianz_001',
          provider: 'Allianz',
          imageUrl: 'https://cdn.cargobit.io/ads/allianz-transport-hero.jpg',
          targetUrl: 'https://allianz.com/transport?ref=cargobit',
          alt: 'Allianz Transportversicherung - Schützen Sie Ihre Fracht',
          targeting: { riskLevels: ['yellow', 'red'] },
        },
        {
          adId: 'ad_dhl_001',
          provider: 'DHL Express',
          imageUrl: 'https://cdn.cargobit.io/ads/dhl-express-hero.jpg',
          targetUrl: 'https://dhl.com/express?ref=cargobit',
          alt: 'DHL Express - Internationale Versandlösungen',
        },
      ],
      'marketplace-sidebar': [
        {
          adId: 'ad_hdi_001',
          provider: 'HDI',
          imageUrl: 'https://cdn.cargobit.io/ads/hdi-insurance-sidebar.jpg',
          targetUrl: 'https://hdi.de/transport?ref=cargobit',
          alt: 'HDI Frachtversicherung ab 9,90€',
          targeting: { riskLevels: ['green', 'yellow'] },
        },
        {
          adId: 'ad_shell_001',
          provider: 'Shell',
          imageUrl: 'https://cdn.cargobit.io/ads/shell-fuel-sidebar.jpg',
          targetUrl: 'https://shell.de/fuelcard?ref=cargobit',
          alt: 'Shell Tankkarte - 10% Rabatt',
        },
      ],
      'order-detail-sidebar': [
        {
          adId: 'ad_allianz_002',
          provider: 'Allianz',
          imageUrl: 'https://cdn.cargobit.io/ads/allianz-detail.jpg',
          targetUrl: 'https://allianz.com/quote?ref=cargobit',
          alt: 'Jetzt Frachtversicherung abschließen',
        },
        {
          adId: 'ad_axa_001',
          provider: 'AXA',
          imageUrl: 'https://cdn.cargobit.io/ads/axa-coverage.jpg',
          targetUrl: 'https://axa.de/cargo?ref=cargobit',
          alt: 'AXA Cargo-Vollschutz',
          targeting: { riskLevels: ['red'] },
        },
      ],
      'dashboard-sidebar': [
        {
          adId: 'ad_shell_002',
          provider: 'Shell',
          imageUrl: 'https://cdn.cargobit.io/ads/shell-dashboard.jpg',
          targetUrl: 'https://shell.de/business?ref=cargobit',
          alt: 'Shell Business Card - Exklusive Konditionen',
        },
        {
          adId: 'ad_telefonica_001',
          provider: 'Telefónica',
          imageUrl: 'https://cdn.cargobit.io/ads/telefonica-connect.jpg',
          targetUrl: 'https://telefonica.de/fleet?ref=cargobit',
          alt: 'Telefónica Fleet Connect - Fahrzeug-Tracking',
        },
      ],
    };

    // Get ads for slot
    const availableAds = adInventory[slot] || [];

    if (availableAds.length === 0) {
      return NextResponse.json(
        {
          error: 'NotFoundError',
          message: 'Keine Anzeigen für diesen Slot verfügbar',
          code: 'NO_ADS_AVAILABLE',
        },
        { status: 404 }
      );
    }

    // Apply targeting
    let selectedAds = [...availableAds];

    // Risk level targeting
    if (riskLevel) {
      const targetedAds = selectedAds.filter(
        ad => !ad.targeting?.riskLevels || ad.targeting.riskLevels.includes(riskLevel)
      );
      if (targetedAds.length > 0) {
        selectedAds = targetedAds;
      }
    }

    // Route targeting (simplified)
    if (origin || destination) {
      // Could filter by origin/destination here
    }

    // Select ad (round-robin or weighted by CTR in production)
    const selectedAd = selectedAds[Math.floor(Math.random() * selectedAds.length)];

    // In production: log impression to analytics
    // await logImpression(impressionId, selectedAd.adId, slot, userId);

    return NextResponse.json({
      adId: selectedAd.adId,
      imageUrl: selectedAd.imageUrl,
      targetUrl: selectedAd.targetUrl,
      impressionId,
      provider: selectedAd.provider,
      alt: selectedAd.alt,
    });

  } catch (error) {
    console.error('Ad render error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: 'Fehler beim Abrufen der Anzeige',
        code: 'AD_RENDER_FAILED',
      },
      { status: 500 }
    );
  }
}
