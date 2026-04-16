import { db } from '@/lib/db';
import { generateApiKey, hashApiKey, getApiKeyPrefix, PARTNER_SCOPES } from '@/lib/partner-auth';

async function seedPartners() {
  console.log('🌱 Seeding Partner Portal data...');

  // Create Insurance Partner
  const insurancePartner = await db.partner.create({
    data: {
      name: 'Allianz Transport',
      type: 'INSURANCE',
      contactEmail: 'partner@allianz-transport.de',
      contactPhone: '+49 89 123456',
      contactPerson: 'Max Mustermann',
      website: 'https://allianz-transport.de',
      vatNumber: 'DE123456789',
      country: 'DE',
      status: 'ACTIVE',
      testMode: false,
      liveModeEnabled: true,
      commissionRate: 12.5,
      rateLimitPerMin: 300,
      burstLimit: 100,
      approvedAt: new Date(),
    },
  });

  // Create API Key for Insurance Partner
  const insuranceApiKey = generateApiKey();
  await db.partnerApiKey.create({
    data: {
      partnerId: insurancePartner.id,
      name: 'Production API Key',
      apiKey: hashApiKey(insuranceApiKey),
      apiKeyPrefix: getApiKeyPrefix(insuranceApiKey),
      scopes: JSON.stringify([
        PARTNER_SCOPES.INSURANCE_READ,
        PARTNER_SCOPES.INSURANCE_WRITE,
        PARTNER_SCOPES.BILLING_READ,
      ]),
      isTestKey: false,
    },
  });

  console.log('✅ Insurance Partner created:');
  console.log(`   API Key: ${insuranceApiKey}`);

  // Create Insurance Products
  await db.insuranceProduct.createMany({
    data: [
      {
        partnerId: insurancePartner.id,
        name: 'Standard Cargo',
        description: 'Basis-Abdeckung für Standard-Transporte',
        coverageEur: 50000,
        deductibleEur: 500,
        basePremiumEur: 12.50,
        premiumType: 'fixed',
        riskModifiers: JSON.stringify({ yellow: 1.2, red: 1.5 }),
        coversTheft: true,
        coversDelay: false,
        coversDamage: true,
        coversHazmat: false,
        isActive: true,
      },
      {
        partnerId: insurancePartner.id,
        name: 'Premium Cargo',
        description: 'Erweiterte Abdeckung inkl. Verzögerungsschäden',
        coverageEur: 100000,
        deductibleEur: 250,
        basePremiumEur: 24.00,
        premiumType: 'fixed',
        riskModifiers: JSON.stringify({ yellow: 1.15, red: 1.35 }),
        coversTheft: true,
        coversDelay: true,
        coversDamage: true,
        coversHazmat: false,
        isActive: true,
      },
      {
        partnerId: insurancePartner.id,
        name: 'ADR Coverage',
        description: 'Spezial-Versicherung für Gefahrguttransporte',
        coverageEur: 200000,
        deductibleEur: 1000,
        basePremiumEur: 45.00,
        premiumType: 'fixed',
        riskModifiers: JSON.stringify({ yellow: 1.1, red: 1.25 }),
        coversTheft: true,
        coversDelay: true,
        coversDamage: true,
        coversHazmat: true,
        isActive: true,
      },
    ],
  });

  console.log('✅ Insurance Products created');

  // Create Ads Partner
  const adsPartner = await db.partner.create({
    data: {
      name: 'Spedition Schmidt',
      type: 'ADS',
      contactEmail: 'marketing@spedition-schmidt.de',
      contactPhone: '+49 201 987654',
      contactPerson: 'Anna Schmidt',
      website: 'https://spedition-schmidt.de',
      vatNumber: 'DE987654321',
      country: 'DE',
      status: 'ACTIVE',
      testMode: false,
      liveModeEnabled: true,
      commissionRate: 15.0,
      rateLimitPerMin: 300,
      burstLimit: 100,
      approvedAt: new Date(),
    },
  });

  // Create API Key for Ads Partner
  const adsApiKey = generateApiKey();
  await db.partnerApiKey.create({
    data: {
      partnerId: adsPartner.id,
      name: 'Production API Key',
      apiKey: hashApiKey(adsApiKey),
      apiKeyPrefix: getApiKeyPrefix(adsApiKey),
      scopes: JSON.stringify([
        PARTNER_SCOPES.ADS_READ,
        PARTNER_SCOPES.ADS_WRITE,
        PARTNER_SCOPES.BILLING_READ,
      ]),
      isTestKey: false,
    },
  });

  console.log('✅ Ads Partner created:');
  console.log(`   API Key: ${adsApiKey}`);

  // Create Ad Campaigns
  await db.partnerAdCampaign.createMany({
    data: [
      {
        partnerId: adsPartner.id,
        name: 'Q1 Branding Campaign',
        description: 'Hauptkampagne für das Q1 2026',
        slot: 'MARKETPLACE_SIDEBAR',
        targetUrl: 'https://spedition-schmidt.de/angebot',
        callToAction: 'Jetzt Angebot anfordern',
        budgetEur: 500,
        spentEur: 125.50,
        pricingModel: 'CPC',
        cpcEur: 0.50,
        targeting: JSON.stringify({ riskLevels: ['yellow', 'red'], roles: ['shipper'] }),
        status: 'ACTIVE',
        totalImpressions: 12000,
        totalClicks: 340,
        totalConversions: 12,
      },
      {
        partnerId: adsPartner.id,
        name: 'ADR Special',
        description: 'Spezial-Kampagne für Gefahrgut-Shipper',
        slot: 'LISTING_HIGHLIGHT',
        targetUrl: 'https://spedition-schmidt.de/adr',
        callToAction: 'ADR-Experten kontaktieren',
        budgetEur: 300,
        spentEur: 0,
        pricingModel: 'CPC',
        cpcEur: 0.75,
        targeting: JSON.stringify({ riskLevels: ['green'], roles: ['shipper'] }),
        status: 'DRAFT',
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
      },
    ],
  });

  console.log('✅ Ad Campaigns created');

  // Create Sample Billings
  await db.partnerBilling.createMany({
    data: [
      {
        partnerId: insurancePartner.id,
        invoiceNumber: 'INV-2026-001',
        type: 'INSURANCE',
        periodMonth: 3,
        periodYear: 2026,
        grossAmountEur: 5420.00,
        commissionEur: 677.50,
        netAmountEur: 4742.50,
        vatEur: 898.88,
        totalEur: 5641.38,
        status: 'PAID',
        paidAt: new Date('2026-04-05'),
        dueDate: new Date('2026-04-15'),
      },
      {
        partnerId: insurancePartner.id,
        invoiceNumber: 'INV-2026-002',
        type: 'INSURANCE',
        periodMonth: 4,
        periodYear: 2026,
        grossAmountEur: 6890.00,
        commissionEur: 861.25,
        netAmountEur: 6028.75,
        vatEur: 1145.46,
        totalEur: 7174.21,
        status: 'OPEN',
        dueDate: new Date('2026-04-30'),
      },
      {
        partnerId: adsPartner.id,
        invoiceNumber: 'ADV-2026-001',
        type: 'ADS',
        periodMonth: 3,
        periodYear: 2026,
        grossAmountEur: 125.50,
        commissionEur: 18.83,
        netAmountEur: 106.68,
        vatEur: 20.26,
        totalEur: 126.94,
        status: 'PAID',
        paidAt: new Date('2026-04-10'),
        dueDate: new Date('2026-04-15'),
      },
    ],
  });

  console.log('✅ Billings created');

  // Create Sample Policies
  await db.insurancePolicy.createMany({
    data: [
      {
        partnerId: insurancePartner.id,
        productId: (await db.insuranceProduct.findFirst({
          where: { partnerId: insurancePartner.id, name: 'Standard Cargo' },
        }))!.id,
        policyNumber: 'POL-2026-00001',
        status: 'active',
        coverageEur: 50000,
        premiumEur: 15.00,
        deductibleEur: 500,
        insuredName: 'Transport GmbH Müller',
        insuredEmail: 'mueller@transport.de',
        riskLevel: 'green',
        riskScore: 15,
        pickupCountry: 'DE',
        deliveryCountry: 'AT',
        cargoDescription: 'Elektronik-Komponenten',
        cargoValueEur: 35000,
        basePremium: 12.50,
        riskSurcharge: 0,
        totalPremium: 15.00,
        partnerCommission: 1.88,
        validFrom: new Date('2026-04-15'),
        validUntil: new Date('2026-04-17'),
      },
      {
        partnerId: insurancePartner.id,
        productId: (await db.insuranceProduct.findFirst({
          where: { partnerId: insurancePartner.id, name: 'Premium Cargo' },
        }))!.id,
        policyNumber: 'POL-2026-00002',
        status: 'active',
        coverageEur: 100000,
        premiumEur: 32.40,
        deductibleEur: 250,
        insuredName: 'Logistik Schmidt KG',
        insuredEmail: 'schmidt@logistik.de',
        riskLevel: 'yellow',
        riskScore: 35,
        pickupCountry: 'DE',
        deliveryCountry: 'PL',
        transitCountries: JSON.stringify(['CZ']),
        cargoDescription: 'Maschinenbauteile',
        cargoValueEur: 85000,
        basePremium: 24.00,
        riskSurcharge: 4.80,
        totalPremium: 32.40,
        partnerCommission: 4.05,
        validFrom: new Date('2026-04-16'),
        validUntil: new Date('2026-04-19'),
      },
    ],
  });

  console.log('✅ Policies created');

  console.log('\n🎉 Partner Portal seeding complete!');
  console.log('\n📋 Test Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Insurance Partner (Allianz Transport):');
  console.log(`  API Key: ${insuranceApiKey}`);
  console.log('');
  console.log('Ads Partner (Spedition Schmidt):');
  console.log(`  API Key: ${adsApiKey}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

seedPartners()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
