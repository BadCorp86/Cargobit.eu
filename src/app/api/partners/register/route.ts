import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

// Partner registration types
type PartnerType = 'INSURANCE' | 'ADVERTISER';

interface PartnerRegistrationData {
  email: string;
  password: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  partnerType: PartnerType;
  // Insurance-specific
  insuranceProducts?: string[];
  apiContact?: string;
  // Advertiser-specific
  advertisingBudget?: number;
  targetAudience?: string;
  // Terms
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const data: PartnerRegistrationData = await request.json();

    // Validate required fields
    if (!data.email || !data.password || !data.companyName || !data.contactPerson) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!data.acceptedTerms || !data.acceptedPrivacy) {
      return NextResponse.json(
        { error: 'Terms and privacy policy must be accepted' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hash(data.password, 12);

    // Create user with MARKETER role for partners
    const user = await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.contactPerson.split(' ')[0] || data.contactPerson,
        lastName: data.contactPerson.split(' ').slice(1).join(' ') || '',
        phone: data.phone,
        status: 'PENDING',
        roles: {
          create: {
            role: {
              connect: { name: 'MARKETER' },
            },
          },
        },
      },
    });

    // Create company
    const company = await db.company.create({
      data: {
        name: data.companyName,
        type: 'BOTH',
        country: 'DE',
        status: 'PENDING',
        companyUsers: {
          create: {
            userId: user.id,
            roleInCompany: 'owner',
          },
        },
      },
    });

    // Create partner application record
    const applicationData = {
      userId: user.id,
      companyId: company.id,
      partnerType: data.partnerType,
      status: 'PENDING_REVIEW',
      submittedAt: new Date().toISOString(),
      insuranceProducts: data.insuranceProducts,
      apiContact: data.apiContact,
      advertisingBudget: data.advertisingBudget,
      targetAudience: data.targetAudience,
    };

    await db.systemSetting.create({
      data: {
        key: `partner_application_${user.id}`,
        value: JSON.stringify(applicationData),
        description: `Partner application for ${data.companyName}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Partner registration submitted successfully',
      applicationId: user.id,
    });
  } catch (error) {
    console.error('Partner registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get partner application status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID required' },
        { status: 400 }
      );
    }

    const application = await db.systemSetting.findUnique({
      where: { key: `partner_application_${applicationId}` },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      application: JSON.parse(application.value),
    });
  } catch (error) {
    console.error('Get application error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
