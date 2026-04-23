/**
 * CargoBit Stripe Connect Onboarding API
 * GET  /api/payout/connect          - Get connect status
 * POST /api/payout/connect          - Create connect account
 * GET  /api/payout/connect/refresh  - Refresh onboarding link
 */

import { NextRequest, NextResponse } from 'next/server';
import { payoutService } from '@/services/payout.service';

// ============================================
// GET /api/payout/connect - Get connect status
// ============================================

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get transporter's driver profile
    const { prisma } = await import('@/lib/db');
    
    const driver = await prisma.driver.findFirst({
      where: { userId },
      include: {
        user: true,
      },
    });
    
    if (!driver) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 400 }
      );
    }
    
    const status = await payoutService.getConnectStatus(driver.id);
    
    return NextResponse.json({
      ...status,
      email: driver.user.email,
    });
    
  } catch (error: any) {
    console.error('[API] GET /payout/connect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get connect status' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/payout/connect - Create connect account
// ============================================

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Get transporter's driver profile
    const { prisma } = await import('@/lib/db');
    
    const driver = await prisma.driver.findFirst({
      where: { userId },
      include: {
        user: {
          include: {
            companyUsers: {
              include: { company: true },
            },
          },
        },
      },
    });
    
    if (!driver) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 400 }
      );
    }
    
    // Check if already has an account
    const existingStatus = await payoutService.getConnectStatus(driver.id);
    
    if (existingStatus.hasAccount) {
      // Return existing onboarding URL if not complete
      if (!existingStatus.onboardingComplete) {
        const { prisma } = await import('@/lib/db');
        const setting = await prisma.systemSetting.findUnique({
          where: { key: `stripe_connect_${driver.id}` },
        });
        
        if (setting) {
          const { accountId } = JSON.parse(setting.value);
          
          // Create new account link
          const Stripe = (await import('stripe')).default;
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
            apiVersion: '2024-11-20.acacia',
          });
          
          const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${process.env.NEXT_PUBLIC_URL}/onboarding/transporter/stripe/refresh`,
            return_url: `${process.env.NEXT_PUBLIC_URL}/onboarding/transporter/stripe/complete`,
            type: 'account_onboarding',
          });
          
          return NextResponse.json({
            accountId,
            onboardingUrl: accountLink.url,
            message: 'Continue onboarding',
          });
        }
      }
      
      return NextResponse.json({
        accountId: existingStatus.accountId,
        onboardingUrl: null,
        message: 'Account already exists',
        status: existingStatus,
      });
    }
    
    // Create new connect account
    const company = driver.user.companyUsers[0]?.company;
    
    const result = await payoutService.createConnectAccount(
      driver.id,
      driver.user.email,
      company?.name,
      body.country || 'DE'
    );
    
    return NextResponse.json({
      success: true,
      accountId: result.accountId,
      onboardingUrl: result.onboardingUrl,
    });
    
  } catch (error: any) {
    console.error('[API] POST /payout/connect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create connect account' },
      { status: 500 }
    );
  }
}
