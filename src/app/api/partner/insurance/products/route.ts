import { NextRequest, NextResponse } from 'next/server';
import { withPartnerAuth, PARTNER_SCOPES } from '@/lib/partner-auth';
import { db } from '@/lib/db';

/**
 * GET /api/partner/insurance/products
 * List all insurance products for the partner
 */
export async function GET(request: NextRequest) {
  const authResult = await withPartnerAuth(request, [PARTNER_SCOPES.INSURANCE_READ]);

  if ('error' in authResult) {
    return authResult.error;
  }

  const { session } = authResult;

  try {
    const products = await db.insuranceProduct.findMany({
      where: { partnerId: session.partnerId },
      orderBy: { createdAt: 'desc' },
    });

    // Parse JSON fields
    const parsedProducts = products.map(p => ({
      ...p,
      riskModifiers: p.riskModifiers ? JSON.parse(p.riskModifiers) : null,
      routeModifiers: p.routeModifiers ? JSON.parse(p.routeModifiers) : null,
      cargoModifiers: p.cargoModifiers ? JSON.parse(p.cargoModifiers) : null,
      additionalOptions: p.additionalOptions ? JSON.parse(p.additionalOptions) : null,
    }));

    return NextResponse.json({ products: parsedProducts });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/partner/insurance/products
 * Create a new insurance product
 */
export async function POST(request: NextRequest) {
  const authResult = await withPartnerAuth(request, [PARTNER_SCOPES.INSURANCE_WRITE]);

  if ('error' in authResult) {
    return authResult.error;
  }

  const { session } = authResult;

  try {
    const body = await request.json();
    const {
      name,
      description,
      productCode,
      coverageEur,
      deductibleEur,
      basePremiumEur,
      premiumType,
      riskModifiers,
      routeModifiers,
      cargoModifiers,
      coversTheft,
      coversDelay,
      coversDamage,
      coversHazmat,
      additionalOptions,
    } = body;

    if (!name || !coverageEur || !basePremiumEur) {
      return NextResponse.json(
        { error: 'Name, coverage, and base premium are required' },
        { status: 400 }
      );
    }

    const product = await db.insuranceProduct.create({
      data: {
        partnerId: session.partnerId,
        name,
        description,
        productCode,
        coverageEur,
        deductibleEur: deductibleEur || 0,
        basePremiumEur,
        premiumType: premiumType || 'fixed',
        riskModifiers: riskModifiers ? JSON.stringify(riskModifiers) : null,
        routeModifiers: routeModifiers ? JSON.stringify(routeModifiers) : null,
        cargoModifiers: cargoModifiers ? JSON.stringify(cargoModifiers) : null,
        coversTheft: coversTheft ?? true,
        coversDelay: coversDelay ?? false,
        coversDamage: coversDamage ?? true,
        coversHazmat: coversHazmat ?? false,
        additionalOptions: additionalOptions ? JSON.stringify(additionalOptions) : null,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
