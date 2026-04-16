import { NextRequest, NextResponse } from 'next/server';
import { withPartnerAuth, PARTNER_SCOPES } from '@/lib/partner-auth';
import { db } from '@/lib/db';

/**
 * GET /api/partner/insurance/policies
 * List all insurance policies for the partner
 */
export async function GET(request: NextRequest) {
  const authResult = await withPartnerAuth(request, [PARTNER_SCOPES.INSURANCE_READ]);

  if ('error' in authResult) {
    return authResult.error;
  }

  const { session } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {
      partnerId: session.partnerId,
    };

    if (status) {
      where.status = status;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt = { ...where.createdAt, gte: new Date(from) };
      if (to) where.createdAt = { ...where.createdAt, lte: new Date(to) };
    }

    const [policies, total] = await Promise.all([
      db.insurancePolicy.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.insurancePolicy.count({ where }),
    ]);

    // Parse JSON fields
    const parsedPolicies = policies.map(p => ({
      ...p,
      transitCountries: p.transitCountries ? JSON.parse(p.transitCountries) : null,
    }));

    return NextResponse.json({
      policies: parsedPolicies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching policies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch policies' },
      { status: 500 }
    );
  }
}
