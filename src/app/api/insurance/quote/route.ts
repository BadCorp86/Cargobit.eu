import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/insurance/quote
 * 
 * Calculate insurance premium in real-time
 * 
 * Query Parameters:
 * - orderId: string (required) - Transport order ID
 * - value: number (required) - Cargo value in EUR
 * - origin: string (required) - Origin country/city
 * - destination: string (required) - Destination country/city
 * - weight: number (optional) - Cargo weight in kg
 * 
 * Response:
 * - premium: number - Calculated premium in EUR
 * - currency: string - Currency code
 * - coverage: number - Maximum coverage amount
 * - provider: string - Insurance provider name
 * - quoteId: string - Unique quote identifier
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const orderId = searchParams.get('orderId');
    const value = parseFloat(searchParams.get('value') || '0');
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const weight = parseFloat(searchParams.get('weight') || '0');

    // Validation
    if (!orderId || !value || !origin || !destination) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Pflichtfelder fehlen: orderId, value, origin, destination',
          code: 'MISSING_REQUIRED_FIELDS',
        },
        { status: 400 }
      );
    }

    if (value < 100 || value > 500000) {
      return NextResponse.json(
        {
          error: 'ValidationError',
          message: 'Warenwert muss zwischen 100 € und 500.000 € liegen',
          code: 'VALUE_OUT_OF_RANGE',
        },
        { status: 400 }
      );
    }

    // Calculate premium based on risk factors
    // Base rate: 0.5% of cargo value
    let baseRate = 0.005;
    
    // Risk factors
    const riskFactors: { factor: string; multiplier: number }[] = [];
    
    // Distance/route risk (simplified)
    const internationalRoutes = ['CH', 'AT', 'PL', 'CZ', 'FR', 'IT', 'ES', 'NL', 'BE'];
    const isInternational = internationalRoutes.some(
      code => origin.includes(code) || destination.includes(code)
    );
    if (isInternational) {
      baseRate *= 1.2;
      riskFactors.push({ factor: 'international_route', multiplier: 1.2 });
    }

    // Weight factor
    if (weight > 5000) {
      baseRate *= 1.1;
      riskFactors.push({ factor: 'heavy_cargo', multiplier: 1.1 });
    }

    // High value factor
    if (value > 50000) {
      baseRate *= 1.15;
      riskFactors.push({ factor: 'high_value', multiplier: 1.15 });
    }

    // Calculate premium
    const premium = Math.max(9.90, Math.round(value * baseRate * 100) / 100);
    
    // Determine provider based on coverage needs
    let provider = 'HDI';
    let coverage = Math.min(value * 1.1, 50000);
    
    if (value > 50000) {
      provider = 'Allianz';
      coverage = Math.min(value * 1.1, 100000);
    }
    if (value > 100000) {
      provider = 'AXA';
      coverage = Math.min(value * 1.1, 500000);
    }

    // Generate quote ID
    const quoteId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Response
    const response = {
      premium,
      currency: 'EUR',
      coverage: Math.round(coverage),
      provider,
      quoteId,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h validity
      riskFactors,
      tiers: [
        {
          name: 'Basis',
          premium: Math.round(premium * 0.4 * 100) / 100,
          coverage: Math.round(coverage * 0.2),
          features: ['Grundschutz', 'Transportschäden', 'Diebstahl'],
        },
        {
          name: 'Standard',
          premium: Math.round(premium * 100) / 100,
          coverage: Math.round(coverage),
          features: ['Vollschutz', 'Transportschäden', 'Diebstahl', 'Wasserschäden', 'Keine Selbstbeteiligung'],
          recommended: true,
        },
        {
          name: 'Premium',
          premium: Math.round(premium * 2 * 100) / 100,
          coverage: Math.round(coverage * 2),
          features: ['Komplettschutz', 'Alle Schäden', 'Weltweit', 'Express-Abwicklung', '24/7 Support'],
        },
      ],
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Insurance quote error:', error);
    return NextResponse.json(
      {
        error: 'InternalServerError',
        message: 'Fehler bei der Prämienberechnung',
        code: 'QUOTE_CALCULATION_FAILED',
      },
      { status: 500 }
    );
  }
}
