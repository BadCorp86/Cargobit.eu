/**
 * Pricing API - Bid Validation (Legacy endpoint)
 * POST /api/pricing/orders/[orderId]/bid
 * 
 * Validates a carrier bid against pricing context
 * Note: Use /api/pricing/orders/[orderId]/bid/validate for full OpenAPI compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCarrierBid } from '@/services/pricing-engine.service';

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    
    const { carrierId, bidPrice } = body;
    
    if (!carrierId || bidPrice === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields', required: ['carrierId', 'bidPrice'] },
        { status: 400 }
      );
    }
    
    // Validate bid
    const result = await validateCarrierBid({
      orderId,
      carrierId,
      bidPrice: parseFloat(bidPrice)
    });
    
    // Build response
    const response: Record<string, unknown> = {
      valid: result.valid,
      priceScore: result.priceScore,
      reason: result.reason
    };
    
    // Add pricing context if available
    if (result.marketPrice !== undefined) {
      response.marketPrice = result.marketPrice;
      response.minPrice = result.minPrice;
      response.startPrice = result.startPrice;
    }
    
    // Add feedback
    if (result.feedback) {
      response.feedback = result.feedback;
    }
    
    // Add hints for carrier
    if (!result.valid) {
      response.hints = {
        suggestion: result.reason === 'BID_BELOW_MIN_PRICE' 
          ? `Erhöhe dein Gebot auf mindestens €${result.minPrice?.toFixed(2)} um akzeptiert zu werden.`
          : undefined,
        marketContext: result.marketPrice 
          ? `Der Marktpreis für ähnliche Aufträge liegt bei ca. €${result.marketPrice.toFixed(2)}.`
          : undefined
      };
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error validating bid:', error);
    return NextResponse.json(
      { error: 'Failed to validate bid', message: (error as Error).message },
      { status: 500 }
    );
  }
}
