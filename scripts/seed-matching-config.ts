/**
 * Seed default matching configuration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check if default config exists
  const existing = await prisma.matchingConfig.findFirst({
    where: { name: 'default' }
  });
  
  if (!existing) {
    // Create default matching config
    await prisma.matchingConfig.create({
      data: {
        name: 'default',
        description: 'Standard-Matching-Konfiguration',
        
        // Default weights
        weightPrice: 0.25,
        weightDistance: 0.15,
        weightReliability: 0.25,
        weightCapacity: 0.15,
        weightRisk: 0.20,
        
        // Thresholds
        minScore: 0.6,
        autoMatchGap: 0.1,
        
        // Features
        enableAutoMatch: false,
        enableNewCarrierPenalty: true,
        newCarrierPenalty: 0.3,
        
        // Risk settings
        riskRedCap: 0.3,
        riskYellowPenalty: 0.1,
        
        isDefault: true,
        isActive: true
      }
    });
    
    console.log('✅ Default matching config created');
  } else {
    console.log('ℹ️ Default matching config already exists');
  }
  
  // Create B2B config
  const b2bExisting = await prisma.matchingConfig.findFirst({
    where: { name: 'b2b' }
  });
  
  if (!b2bExisting) {
    await prisma.matchingConfig.create({
      data: {
        name: 'b2b',
        description: 'B2B-Konfiguration mit Fokus auf Zuverlässigkeit',
        
        // B2B prioritizes reliability and risk
        weightPrice: 0.15,
        weightDistance: 0.10,
        weightReliability: 0.35,
        weightCapacity: 0.15,
        weightRisk: 0.25,
        
        // Higher thresholds for B2B
        minScore: 0.7,
        autoMatchGap: 0.15,
        
        enableAutoMatch: false,
        enableNewCarrierPenalty: true,
        newCarrierPenalty: 0.25,
        
        riskRedCap: 0.2,
        riskYellowPenalty: 0.15,
        
        isDefault: false,
        isActive: true
      }
    });
    
    console.log('✅ B2B matching config created');
  }
  
  // Create spot market config
  const spotExisting = await prisma.matchingConfig.findFirst({
    where: { name: 'spot_market' }
  });
  
  if (!spotExisting) {
    await prisma.matchingConfig.create({
      data: {
        name: 'spot_market',
        description: 'Spot-Market-Konfiguration mit Fokus auf Preis',
        
        // Spot market prioritizes price
        weightPrice: 0.40,
        weightDistance: 0.15,
        weightReliability: 0.15,
        weightCapacity: 0.15,
        weightRisk: 0.15,
        
        // Lower thresholds for spot
        minScore: 0.5,
        autoMatchGap: 0.1,
        
        enableAutoMatch: true,
        enableNewCarrierPenalty: false,
        newCarrierPenalty: 0.4,
        
        riskRedCap: 0.35,
        riskYellowPenalty: 0.05,
        
        isDefault: false,
        isActive: true
      }
    });
    
    console.log('✅ Spot market matching config created');
  }
  
  console.log('\n📊 Matching configurations seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
