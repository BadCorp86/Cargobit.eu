import { NextRequest, NextResponse } from 'next/server';
import { withPartnerAuth, PARTNER_SCOPES } from '@/lib/partner-auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/partner/insurance/products/[id]
 * Get a single insurance product
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await withPartnerAuth(request, [PARTNER_SCOPES.INSURANCE_READ]);

  if ('error' in authResult) {
    return authResult.error;
  }

  const { session } = authResult;
  const { id } = await params;

  try {
    const product = await db.insuranceProduct.findFirst({
      where: { id, partnerId: session.partnerId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      product: {
        ...product,
        riskModifiers: product.riskModifiers ? JSON.parse(product.riskModifiers) : null,
        routeModifiers: product.routeModifiers ? JSON.parse(product.routeModifiers) : null,
        cargoModifiers: product.cargoModifiers ? JSON.parse(product.cargoModifiers) : null,
        additionalOptions: product.additionalOptions ? JSON.parse(product.additionalOptions) : null,
      },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/partner/insurance/products/[id]
 * Update an insurance product
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authResult = await withPartnerAuth(request, [PARTNER_SCOPES.INSURANCE_WRITE]);

  if ('error' in authResult) {
    return authResult.error;
  }

  const { session } = authResult;
  const { id } = await params;

  try {
    const body = await request.json();

    // Verify ownership
    const existing = await db.insuranceProduct.findFirst({
      where: { id, partnerId: session.partnerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    
    const allowedFields = [
      'name', 'description', 'productCode', 'coverageEur', 'deductibleEur',
      'basePremiumEur', 'premiumType', 'coversTheft', 'coversDelay',
      'coversDamage', 'coversHazmat', 'isActive',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle JSON fields
    if (body.riskModifiers !== undefined) {
      updateData.riskModifiers = body.riskModifiers ? JSON.stringify(body.riskModifiers) : null;
    }
    if (body.routeModifiers !== undefined) {
      updateData.routeModifiers = body.routeModifiers ? JSON.stringify(body.routeModifiers) : null;
    }
    if (body.cargoModifiers !== undefined) {
      updateData.cargoModifiers = body.cargoModifiers ? JSON.stringify(body.cargoModifiers) : null;
    }
    if (body.additionalOptions !== undefined) {
      updateData.additionalOptions = body.additionalOptions ? JSON.stringify(body.additionalOptions) : null;
    }

    const product = await db.insuranceProduct.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/partner/insurance/products/[id]
 * Deactivate an insurance product
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await withPartnerAuth(request, [PARTNER_SCOPES.INSURANCE_WRITE]);

  if ('error' in authResult) {
    return authResult.error;
  }

  const { session } = authResult;
  const { id } = await params;

  try {
    const existing = await db.insuranceProduct.findFirst({
      where: { id, partnerId: session.partnerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Soft delete by deactivating
    await db.insuranceProduct.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
