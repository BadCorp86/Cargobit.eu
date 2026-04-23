/**
 * Seed default pricing configuration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if default config exists
  const existing = await prisma.pricingConfig.findFirst({
    where: { name: 'default' }
  });
  
  if (!existing) {
    // Create default pricing config
    await prisma.pricingConfig.create({
      data: {
        name: 'default',
        description: 'Standard Pricing-Konfiguration mit Anti-Dumping',
        
        startFactor: 1.15,  // Start price is 15% above market
        minFactor: 0.65,    // Min price is 35% below market
        
        // Risk adjustments as JSON
        riskAdjustments: JSON.stringify({
          green: { mode: 'multiplier', value: 1.0 },
          yellow: { mode: 'multiplier', value: 1.10 },
          red: { mode: 'block' }
        }),
        
        isDefault: true,
        isActive: true
      }
    });
    
    console.log('✅ Default pricing config created');
  } else {
    console.log('ℹ️ Default pricing config already exists');
  }
  
  // Create conservative config for high-value orders
  const conservativeExisting = await prisma.pricingConfig.findFirst({
    where: { name: 'conservative' }
  });
  
  if (!conservativeExisting) {
    await prisma.pricingConfig.create({
      data: {
        name: 'conservative',
        description: 'Konservative Pricing-Konfiguration für Hochwert-Aufträge',
        
        startFactor: 1.20,  // Higher start price
        minFactor: 0.75,    // Higher minimum (less discount allowed)
        
        riskAdjustments: JSON.stringify({
          green: { mode: 'multiplier', value: 1.0 },
          yellow: { mode: 'multiplier', value: 1.15 },
          red: { mode: 'block' }
        }),
        
        isDefault: false,
        isActive: true
      }
    });
    
    console.log('✅ Conservative pricing config created');
  }
  
  // Create aggressive config for spot market
  const aggressiveExisting = await prisma.pricingConfig.findFirst({
    where: { name: 'aggressive' }
  });
  
  if (!aggressiveExisting) {
    await prisma.pricingConfig.create({
      data: {
        name: 'aggressive',
        description: 'Aggressive Pricing-Konfiguration für Spot-Market',
        
        startFactor: 1.10,  // Lower start price
        minFactor: 0.55,    // Allow more discount
        
        riskAdjustments: JSON.stringify({
          green: { mode: 'multiplier', value: 1.0 },
          yellow: { mode: 'multiplier', value: 1.05 },
          red: { mode: 'multiplier', value: 1.30 } // Allow red risk with high premium
        }),
        
        isDefault: false,
        isActive: true
      }
    });
    
    console.log('✅ Aggressive pricing config created');
  }
  
  console.log('\n💰 Pricing configurations seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
