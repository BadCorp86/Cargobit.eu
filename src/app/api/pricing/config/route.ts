/**
 * Pricing Configuration API
 * GET /api/pricing/config - List all configs
 * POST /api/pricing/config - Create new config
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  getActivePricingConfig, 
  upsertPricingConfig
} from '@/services/pricing-engine.service';
import { 
  PricingConfigData, 
  DEFAULT_PRICING_CONFIG 
} from '@/types/pricing-engine';

/**
 * GET /api/pricing/config
 * List all pricing configurations
 */
export async function GET() {
  try {
    const configs = await db.pricingConfig.findMany({
      where: { isActive: true },
      orderBy: { isDefault: 'desc' }
    });
    
    return NextResponse.json({
      configs: configs.map(config => ({
        id: config.id,
        name: config.name,
        description: config.description,
        
        // Price factors
        startFactor: config.startFactor,
        minFactor: config.minFactor,
        
        // Risk adjustments
        riskAdjustments: JSON.parse(config.riskAdjustments),
        
        // Status
        isActive: config.isActive,
        isDefault: config.isDefault,
        
        createdAt: config.createdAt
      })),
      
      // Include default config if no configs found
      default: configs.length === 0 ? DEFAULT_PRICING_CONFIG : undefined
    });
    
  } catch (error) {
    console.error('Error fetching pricing configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing configurations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pricing/config
 * Create or update pricing configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.startFactor || !body.minFactor) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          required: ['name', 'startFactor', 'minFactor'] 
        },
        { status: 400 }
      );
    }
    
    // Validate risk adjustments
    const riskAdjustments = body.riskAdjustments || DEFAULT_PRICING_CONFIG.riskAdjustments;
    
    // Validate factors are reasonable
    if (body.startFactor < 1.0 || body.startFactor > 2.0) {
      return NextResponse.json(
        { error: 'startFactor must be between 1.0 and 2.0' },
        { status: 400 }
      );
    }
    
    if (body.minFactor < 0.5 || body.minFactor > 1.0) {
      return NextResponse.json(
        { error: 'minFactor must be between 0.5 and 1.0' },
        { status: 400 }
      );
    }
    
    if (body.minFactor >= body.startFactor) {
      return NextResponse.json(
        { error: 'minFactor must be less than startFactor' },
        { status: 400 }
      );
    }
    
    // Create/update config (isDefault is handled separately in the service)
    const config = await upsertPricingConfig({
      name: body.name,
      description: body.description,
      startFactor: body.startFactor,
      minFactor: body.minFactor,
      riskAdjustments
    });
    
    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        name: config.name,
        startFactor: config.startFactor,
        minFactor: config.minFactor,
        riskAdjustments: config.riskAdjustments
      }
    });
    
  } catch (error) {
    console.error('Error creating pricing config:', error);
    return NextResponse.json(
      { error: 'Failed to create pricing configuration', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pricing/config
 * Update pricing configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id && !body.name) {
      return NextResponse.json(
        { error: 'Missing config id or name' },
        { status: 400 }
      );
    }
    
    // Find config
    const existing = await db.pricingConfig.findFirst({
      where: {
        OR: [
          { id: body.id },
          { name: body.name }
        ]
      }
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }
    
    // Update config
    const updated = await db.pricingConfig.update({
      where: { id: existing.id },
      data: {
        description: body.description,
        startFactor: body.startFactor ?? existing.startFactor,
        minFactor: body.minFactor ?? existing.minFactor,
        riskAdjustments: body.riskAdjustments 
          ? JSON.stringify(body.riskAdjustments) 
          : existing.riskAdjustments,
        isDefault: body.isDefault ?? existing.isDefault
      }
    });
    
    return NextResponse.json({
      success: true,
      config: {
        id: updated.id,
        name: updated.name,
        startFactor: updated.startFactor,
        minFactor: updated.minFactor
      }
    });
    
  } catch (error) {
    console.error('Error updating pricing config:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing configuration', message: (error as Error).message },
      { status: 500 }
    );
  }
}
