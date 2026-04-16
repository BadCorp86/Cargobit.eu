import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

/**
 * Partner Registration (Self-Service)
 * POST /api/partner/onboarding
 * Public endpoint for partners to register
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      type,
      contactEmail,
      contactPhone,
      contactPerson,
      website,
      vatNumber,
      registrationNumber,
      country,
      address,
    } = body;

    // Validate required fields
    if (!name || !type || !contactEmail) {
      return NextResponse.json(
        { error: 'Name, type, and contact email are required' },
        { status: 400 }
      );
    }

    if (!['INSURANCE', 'ADS'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be INSURANCE or ADS' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await db.partner.findFirst({
      where: { contactEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A partner with this email already exists' },
        { status: 400 }
      );
    }

    // Create partner in PENDING status
    const partner = await db.partner.create({
      data: {
        name,
        type,
        contactEmail,
        contactPhone,
        contactPerson,
        website,
        vatNumber,
        registrationNumber,
        country,
        address,
        status: 'PENDING',
        testMode: true,
        liveModeEnabled: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Registration submitted successfully. Our team will review your application.',
      partner: {
        id: partner.id,
        name: partner.name,
        type: partner.type,
        status: partner.status,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error registering partner:', error);
    return NextResponse.json(
      { error: 'Failed to register partner' },
      { status: 500 }
    );
  }
}

/**
 * Admin: Approve/Reject Partner
 * PUT /api/partner/onboarding
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { partnerId, action, reason, approvedBy } = body;

    if (!partnerId || !action || !['approve', 'reject', 'suspend'].includes(action)) {
      return NextResponse.json(
        { error: 'Partner ID and valid action required' },
        { status: 400 }
      );
    }

    const partner = await db.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {};

    if (action === 'approve') {
      updateData = {
        status: 'ACTIVE',
        approvedAt: new Date(),
        approvedBy,
        liveModeEnabled: true,
      };

      // Create initial test API key
      const { generateApiKey, hashApiKey, getApiKeyPrefix, PARTNER_SCOPES } = await import('@/lib/partner-auth');
      
      const rawKey = generateApiKey();
      const hashedKey = hashApiKey(rawKey);
      const prefix = getApiKeyPrefix(rawKey);

      // Generate scopes based on partner type
      const scopes = partner.type === 'INSURANCE'
        ? [PARTNER_SCOPES.INSURANCE_READ, PARTNER_SCOPES.INSURANCE_WRITE, PARTNER_SCOPES.BILLING_READ]
        : [PARTNER_SCOPES.ADS_READ, PARTNER_SCOPES.ADS_WRITE, PARTNER_SCOPES.BILLING_READ];

      await db.partnerApiKey.create({
        data: {
          partnerId,
          name: 'Test API Key',
          apiKey: hashedKey,
          apiKeyPrefix: prefix,
          scopes: JSON.stringify(scopes),
          isTestKey: true,
        },
      });

      const updatedPartner = await db.partner.update({
        where: { id: partnerId },
        data: updateData,
      });

      return NextResponse.json({
        success: true,
        message: 'Partner approved successfully',
        partner: updatedPartner,
        apiKey: rawKey, // Only shown once!
      });
    } else if (action === 'reject') {
      updateData = {
        status: 'REJECTED',
        statusReason: reason,
      };
    } else if (action === 'suspend') {
      updateData = {
        status: 'SUSPENDED',
        statusReason: reason,
      };
    }

    const updatedPartner = await db.partner.update({
      where: { id: partnerId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Partner ${action}ed successfully`,
      partner: updatedPartner,
    });
  } catch (error) {
    console.error('Error updating partner status:', error);
    return NextResponse.json(
      { error: 'Failed to update partner status' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/partner/onboarding
 * Admin: List pending partners
 */
export async function GET(request: NextRequest) {
  try {
    const pendingPartners = await db.partner.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ partners: pendingPartners });
  } catch (error) {
    console.error('Error fetching pending partners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending partners' },
      { status: 500 }
    );
  }
}
