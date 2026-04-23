/**
 * Pricing API - Market Price Calculation
 * POST /api/pricing/market-price
 * 
 * Calculates or updates the market price for an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { computeMarketPrice, createOrderPricing } from '@/services/pricing-engine.service';
import { MarketPriceInput } from '@/types/pricing-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { orderId, route, distanceKm, weightKg, volumeM3, transportType, isInternational } = body;
    
    if (!orderId || !route || !distanceKm || !weightKg) {
      return NextResponse.json(
        { error: 'Missing required fields', required: ['orderId', 'route', 'distanceKm', 'weightKg'] },
        { status: 400 }
      );
    }
    
    // Parse origin/destination
    const originParts = (route.origin || '').split('-');
    const destParts = (route.destination || '').split('-');
    
    const input: MarketPriceInput = {
      orderId,
      origin: {
        country: originParts[0] || 'DE',
        postalCode: originParts[1],
        lat: body.originLat,
        lng: body.originLng
      },
      destination: {
        country: destParts[0] || 'DE',
        postalCode: destParts[1],
        lat: body.destinationLat,
        lng: body.destinationLng
      },
      distanceKm: parseFloat(distanceKm) || 0,
      weightKg: parseFloat(weightKg) || 0,
      volumeM3: volumeM3 ? parseFloat(volumeM3) : undefined,
      transportType,
      isInternational: isInternational || false,
      isHazmat: body.isHazmat || false,
      requiresCooling: body.requiresCooling || false
    };
    
    // Check if transport exists
    const transport = await db.transport.findUnique({
      where: { id: orderId },
      include: {
        transportDetail: true,
        pickupAddress: true,
        deliveryAddress: true
      }
    });
    
    if (!transport) {
      return NextResponse.json(
        { error: 'Transport not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    // Get risk level from associated risk score
    const shipperRisk = await db.riskScore.findFirst({
      where: {
        entityType: 'USER',
        entityId: transport.shipperUserId
      }
    });
    
    const riskLevel = shipperRisk?.riskLevel.toLowerCase() as 'green' | 'yellow' | 'red' || 'green';
    
    // Create pricing
    const pricingContext = await createOrderPricing(orderId, input, riskLevel);
    
    // Return market price result
    const result = await computeMarketPrice(input);
    
    return NextResponse.json({
      orderId,
      marketPrice: result.marketPrice,
      currency: result.currency,
      modelVersion: result.modelVersion,
      
      // Extended pricing info
      startPrice: pricingContext.adjustedStartPrice,
      minPrice: pricingContext.adjustedMinPrice,
      riskLevel: pricingContext.riskLevel,
      
      // Debug info (remove in production)
      features: body.debug ? result.features : undefined
    });
    
  } catch (error) {
    console.error('Error calculating market price:', error);
    return NextResponse.json(
      { error: 'Failed to calculate market price', message: (error as Error).message },
      { status: 500 }
    );
  }
}
