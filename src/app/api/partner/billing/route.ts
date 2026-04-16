import { NextRequest, NextResponse } from 'next/server';
import { withPartnerAuth, PARTNER_SCOPES } from '@/lib/partner-auth';
import { db } from '@/lib/db';

/**
 * GET /api/partner/billing
 * List all billings for the partner
 */
export async function GET(request: NextRequest) {
  const authResult = await withPartnerAuth(request, [PARTNER_SCOPES.BILLING_READ]);

  if ('error' in authResult) {
    return authResult.error;
  }

  const { session } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const year = searchParams.get('year');

    const where: Record<string, unknown> = {
      partnerId: session.partnerId,
    };

    if (status) {
      where.status = status;
    }

    if (year) {
      where.periodYear = parseInt(year);
    }

    const billings = await db.partnerBilling.findMany({
      where,
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    // Parse JSON fields
    const parsedBillings = billings.map(b => ({
      ...b,
      lineItems: b.lineItems ? JSON.parse(b.lineItems) : null,
    }));

    // Calculate summary
    const summary = {
      totalInvoices: billings.length,
      openInvoices: billings.filter(b => b.status === 'OPEN').length,
      paidInvoices: billings.filter(b => b.status === 'PAID').length,
      totalOpenAmount: billings
        .filter(b => b.status === 'OPEN')
        .reduce((sum, b) => sum + b.totalEur, 0),
      totalPaidAmount: billings
        .filter(b => b.status === 'PAID')
        .reduce((sum, b) => sum + b.totalEur, 0),
    };

    return NextResponse.json({
      billings: parsedBillings,
      summary,
    });
  } catch (error) {
    console.error('Error fetching billings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billings' },
      { status: 500 }
    );
  }
}
