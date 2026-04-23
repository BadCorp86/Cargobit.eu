import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Get partner onboarding status and next steps
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Get user and company info
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        companyUsers: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get partner application
    const application = await db.systemSetting.findUnique({
      where: { key: `partner_application_${userId}` },
    });

    const applicationData = application ? JSON.parse(application.value) : null;

    // Determine onboarding steps
    const steps = {
      registration: {
        completed: true,
        title: 'Registrierung',
        description: 'Partnerkonto erstellt',
      },
      verification: {
        completed: user.status === 'ACTIVE',
        title: 'Verifizierung',
        description: 'E-Mail und Unternehmen verifiziert',
        pendingAction: user.status !== 'ACTIVE' ? 'Bitte bestätigen Sie Ihre E-Mail-Adresse' : null,
      },
      contract: {
        completed: applicationData?.contractSigned || false,
        title: 'Vertrag',
        description: 'Partnervertrag unterzeichnet',
        pendingAction: !applicationData?.contractSigned ? 'Vertrag zur Prüfung verfügbar' : null,
      },
      technicalSetup: {
        completed: applicationData?.technicalSetup || false,
        title: 'Technische Einrichtung',
        description: 'API-Zugang eingerichtet',
        pendingAction: !applicationData?.technicalSetup ? 'API-Dokumentation verfügbar' : null,
      },
      goLive: {
        completed: applicationData?.goLive || false,
        title: 'Go-Live',
        description: 'Partner ist aktiv',
      },
    };

    const completedSteps = Object.values(steps).filter((s) => s.completed).length;
    const totalSteps = Object.keys(steps).length;
    const progress = (completedSteps / totalSteps) * 100;

    return NextResponse.json({
      success: true,
      partner: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        company: user.companyUsers[0]?.company,
        partnerType: applicationData?.partnerType,
        status: applicationData?.status || 'PENDING',
      },
      onboarding: {
        steps,
        progress,
        completedSteps,
        totalSteps,
      },
    });
  } catch (error) {
    console.error('Get onboarding status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update partner onboarding step
export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    const { userId, step, value } = data;

    if (!userId || !step) {
      return NextResponse.json(
        { error: 'User ID and step required' },
        { status: 400 }
      );
    }

    // Get current application
    const application = await db.systemSetting.findUnique({
      where: { key: `partner_application_${userId}` },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    const applicationData = JSON.parse(application.value);

    // Update the specific step
    const stepUpdates: Record<string, string> = {
      contractSigned: 'contractSigned',
      technicalSetup: 'technicalSetup',
      goLive: 'goLive',
    };

    if (stepUpdates[step]) {
      applicationData[stepUpdates[step]] = value;
    }

    // Update application
    await db.systemSetting.update({
      where: { key: `partner_application_${userId}` },
      data: { value: JSON.stringify(applicationData) },
    });

    return NextResponse.json({
      success: true,
      message: 'Onboarding step updated',
    });
  } catch (error) {
    console.error('Update onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
