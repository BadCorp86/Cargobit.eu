import { NextRequest, NextResponse } from 'next/server';
import { calculateAIRecommendedPrice } from '@/lib/membership-data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { distance, weight, priority, vehicleType } = body;

    // Validate required parameters
    if (typeof distance !== 'number' || typeof weight !== 'number') {
      return NextResponse.json(
        { error: 'Missing required parameters: distance (number) and weight (number)' },
        { status: 400 }
      );
    }

    if (distance < 0 || weight < 0) {
      return NextResponse.json(
        { error: 'distance and weight must be non-negative numbers' },
        { status: 400 }
      );
    }

    const validPriorities = ['standard', 'express', 'overnight'];
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: `priority must be one of: ${validPriorities.join(', ')}` },
        { status: 400 }
      );
    }

    const recommendation = calculateAIRecommendedPrice({
      distance,
      weight,
      priority: priority || 'standard',
      vehicleType: vehicleType || undefined,
    });

    return NextResponse.json({
      success: true,
      data: recommendation,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
