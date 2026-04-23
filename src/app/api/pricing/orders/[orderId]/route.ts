/**
 * Pricing API - Get Order Pricing
 * GET /api/pricing/orders/[orderId]
 * 
 * Returns pricing context for an order
 * Currency is always included in response
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrderPricing } from '@/services/pricing-engine.service';
import { DEFAULT_CURRENCY } from '@/types/pricing-engine';

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = await params;
    
    const pricing = await getOrderPricing(orderId);
    
    if (!pricing) {
      return NextResponse.json(
        {
          error: {
            code: 'PRICING_NOT_FOUND',
            details: {
              orderId,
              currency: DEFAULT_CURRENCY
            }
          }
        },
        { status: 404 }
      );
    }
    
    const currency = pricing.currency || DEFAULT_CURRENCY;
    
    return NextResponse.json({
      orderId: pricing.orderId,
      
      // All prices rounded to cents
      marketPrice: pricing.marketPrice,
      startPrice: pricing.adjustedStartPrice,
      minPrice: pricing.adjustedMinPrice,
      riskLevel: pricing.riskLevel,
      
      // Currency always included
      currency,
      
      // Unadjusted prices (for transparency)
      baseStartPrice: pricing.startPrice,
      baseMinPrice: pricing.minPrice,
      
      configVersion: pricing.configVersion,
      
      // Risk adjustment explanation
      riskAdjustment: {
        level: pricing.riskLevel,
        applied: pricing.riskLevel !== 'green',
        factor: pricing.riskLevel === 'yellow' ? 1.10 : 1.0,
        blocked: pricing.riskLevel === 'red',
        explanation: pricing.riskLevel === 'red' 
          ? 'Gebote für diesen Auftrag sind aufgrund von Risiko-Bewertung gesperrt.'
          : pricing.riskLevel === 'yellow'
            ? `Preise wurden aufgrund von Risiko-Bewertung um 10% angehoben.`
            : 'Keine Risiko-Anpassung.'
      }
    });
    
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json(
      {
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
