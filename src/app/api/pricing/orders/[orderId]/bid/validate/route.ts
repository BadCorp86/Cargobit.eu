/**
 * Pricing API - Bid Validation
 * POST /api/pricing/orders/[orderId]/bid/validate
 * 
 * Validates a carrier bid against pricing context
 * Returns structured error with code and details for i18n support
 * 
 * Response format:
 * - valid: boolean
 * - error?: { code: string, details: Record<string, unknown> }
 * - priceScore?: number (0-1, used by Matching-Engine)
 * - currency: string (always included)
 * - marketPrice, minPrice, startPrice?: number
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCarrierBid } from '@/services/pricing-engine.service';
import { DEFAULT_CURRENCY } from '@/types/pricing-engine';

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
        {
          valid: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            details: {
              required: ['carrierId', 'bidPrice'],
              provided: { carrierId: !!carrierId, bidPrice: bidPrice !== undefined }
            }
          },
          currency: DEFAULT_CURRENCY
        },
        { status: 400 }
      );
    }
    
    const parsedBidPrice = parseFloat(bidPrice);
    if (isNaN(parsedBidPrice) || parsedBidPrice < 0) {
      return NextResponse.json(
        {
          valid: false,
          error: {
            code: 'INVALID_BID_PRICE',
            details: {
              bidPrice,
              reason: 'Bid price must be a positive number'
            }
          },
          currency: DEFAULT_CURRENCY
        },
        { status: 400 }
      );
    }
    
    // Validate bid
    const result = await validateCarrierBid({
      orderId,
      carrierId,
      bidPrice: parsedBidPrice
    });
    
    // Build structured response
    const response: Record<string, unknown> = {
      valid: result.valid,
      currency: result.currency || DEFAULT_CURRENCY
    };
    
    // Add structured error if invalid
    if (!result.valid && result.error) {
      response.error = result.error;
    }
    
    // Add priceScore (IMPORTANT: Used by Matching-Engine)
    if (result.priceScore !== undefined) {
      response.priceScore = result.priceScore;
    }
    
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
    
    // Add hints for carrier (UI-friendly)
    if (!result.valid && result.error) {
      response.hints = {
        suggestion: result.error.code === 'BID_BELOW_MIN_PRICE' && result.minPrice
          ? `Erhöhe dein Gebot auf mindestens ${result.currency} ${result.minPrice.toFixed(2)} um akzeptiert zu werden.`
          : undefined,
        marketContext: result.marketPrice 
          ? `Der Marktpreis für ähnliche Aufträge liegt bei ca. ${result.currency} ${result.marketPrice.toFixed(2)}.`
          : undefined
      };
    }
    
    // Return 200 even for invalid bids (client decides how to handle)
    // This allows for graceful UI feedback
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error validating bid:', error);
    return NextResponse.json(
      {
        valid: false,
        error: {
          code: 'INTERNAL_ERROR',
          details: {
            message: (error as Error).message
          }
        },
        currency: DEFAULT_CURRENCY
      },
      { status: 500 }
    );
  }
}
