/**
 * CargoBit Platform - Seed Data
 *
 * Run with: bunx prisma db seed
 *
 * Creates:
 * - 10 Test Users (Shipper, Dispatcher, Driver, Admin, Support, Marketer)
 * - 5 Companies
 * - 10 Vehicles
 * - 8 Transports (various statuses)
 * - 5 Insurance Policies
 * - 5 Ad Campaigns
 * - Risk Rules
 */

import { PrismaClient, UserRole, UserStatus, CompanyType, CompanyStatus, VehicleType, VehicleStatus, TransportType, TransportStatus, InsuranceProvider, InsurancePolicyStatus, InsuranceTier, CampaignStatus, RiskLevel, PlanName } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

// ===========================================
// PASSWORDS
// ===========================================
const PASSWORDS = {
  admin: 'Admin123!@#',
  support: 'Support123!@#',
  shipper: 'Shipper123!@#',
  dispatcher: 'Dispatcher123!@#',
  driver: 'Driver123!@#',
  marketer: 'Marketer123!@#',
};

// ===========================================
// ADDRESSES
// ===========================================
const ADDRESSES = [
  { city: 'Berlin', country: 'DE', postalCode: '10115', street: 'Alexanderplatz', streetNumber: '1', latitude: 52.5219, longitude: 13.4132 },
  { city: 'Hamburg', country: 'DE', postalCode: '20095', street: 'Jungfernstieg', streetNumber: '1', latitude: 53.5526, longitude: 9.9932 },
  { city: 'München', country: 'DE', postalCode: '80331', street: 'Marienplatz', streetNumber: '1', latitude: 48.1374, longitude: 11.5755 },
  { city: 'Wien', country: 'AT', postalCode: '1010', street: 'Stephansplatz', streetNumber: '1', latitude: 48.2082, longitude: 16.3738 },
  { city: 'Zürich', country: 'CH', postalCode: '8001', street: 'Bahnhofstrasse', streetNumber: '1', latitude: 47.3769, longitude: 8.5417 },
  { city: 'Prag', country: 'CZ', postalCode: '11000', street: 'Staroměstské náměstí', streetNumber: '1', latitude: 50.0755, longitude: 14.4378 },
  { city: 'Amsterdam', country: 'NL', postalCode: '1012', street: 'Dam', streetNumber: '1', latitude: 52.3731, longitude: 4.8922 },
  { city: 'Paris', country: 'FR', postalCode: '75001', street: 'Rue de Rivoli', streetNumber: '1', latitude: 48.8566, longitude: 2.3522 },
];

// ===========================================
// MAIN SEED FUNCTION
// ===========================================
async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  await cleanDatabase();

  // Create Roles
  const roles = await createRoles();

  // Create Admin Users
  const admins = await createAdmins(roles);

  // Create Support Users
  const supportUsers = await createSupportUsers(roles);

  // Create Companies
  const companies = await createCompanies();

  // Create Shippers
  const shippers = await createShippers(roles, companies);

  // Create Dispatchers
  const dispatchers = await createDispatchers(roles, companies);

  // Create Drivers
  const drivers = await createDrivers(roles, companies);

  // Create Marketers
  const marketers = await createMarketers(roles, companies);

  // Create Vehicles
  const vehicles = await createVehicles(companies);

  // Create Addresses for Transports
  const transportAddresses = await createTransportAddresses();

  // Create Transports
  const transports = await createTransports(shippers, transportAddresses);

  // Create Offers
  await createOffers(transports, drivers, vehicles);

  // Create Insurance Quotes & Policies
  await createInsuranceData(transports, shippers);

  // Create Ad Campaigns
  await createAdCampaigns(companies, marketers);

  // Create Risk Rules
  await createRiskRules();

  // Create Plans
  await createPlans();

  // Create System Settings
  await createSystemSettings();

  console.log('✅ Seed completed successfully!');
}

// ===========================================
// CLEAN DATABASE
// ===========================================
async function cleanDatabase() {
  console.log('🧹 Cleaning database...');

  // Delete in correct order (respecting foreign keys)
  await prisma.riskHistory.deleteMany();
  await prisma.riskEvent.deleteMany();
  await prisma.riskScore.deleteMany();
  await prisma.campaignStats.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.insurancePolicy.deleteMany();
  await prisma.insuranceQuote.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.matchingCandidate.deleteMany();
  await prisma.matchingSession.deleteMany();
  await prisma.trackingPoint.deleteMany();
  await prisma.transportStatusHistory.deleteMany();
  await prisma.document.deleteMany();
  await prisma.transportDetail.deleteMany();
  await prisma.transport.deleteMany();
  await prisma.address.deleteMany();
  await prisma.driverVehicle.deleteMany();
  await prisma.driverPermission.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.payoutMethod.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.companyPlan.deleteMany();
  await prisma.companyUser.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.securityFlag.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.supportMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.userRoleRelation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.role.deleteMany();
  await prisma.riskRule.deleteMany();
  await prisma.riskThreshold.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.tollSystem.deleteMany();
  await prisma.borderCrossing.deleteMany();

  console.log('✅ Database cleaned');
}

// ===========================================
// CREATE ROLES
// ===========================================
async function createRoles() {
  console.log('👑 Creating roles...');

  const roles = {
    admin: await prisma.role.create({
      data: { name: UserRole.ADMIN, description: 'Administrator mit vollem Zugriff' }
    }),
    support: await prisma.role.create({
      data: { name: UserRole.SUPPORT, description: 'Support-Mitarbeiter' }
    }),
    shipperCompany: await prisma.role.create({
      data: { name: UserRole.SHIPPER_COMPANY, description: 'Versender (Unternehmen)' }
    }),
    shipperPrivate: await prisma.role.create({
      data: { name: UserRole.SHIPPER_PRIVATE, description: 'Versender (Privat)' }
    }),
    dispatcher: await prisma.role.create({
      data: { name: UserRole.DISPATCHER, description: 'Disponent / Spediteur' }
    }),
    driverSelfEmployed: await prisma.role.create({
      data: { name: UserRole.DRIVER_SELF_EMPLOYED, description: 'Selbstständiger Fahrer' }
    }),
    marketer: await prisma.role.create({
      data: { name: UserRole.MARKETER, description: 'Marketing-Manager' }
    }),
  };

  return roles;
}

// ===========================================
// CREATE ADMINS
// ===========================================
async function createAdmins(roles: any) {
  console.log('🔐 Creating admins...');

  const passwordHash = await bcrypt.hash(PASSWORDS.admin, SALT_ROUNDS);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@cargobit.eu',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+49 30 1234567',
      language: 'de',
      status: UserStatus.ACTIVE,
      roles: {
        create: [{ roleId: roles.admin.id }]
      }
    }
  });

  return [admin];
}

// ===========================================
// CREATE SUPPORT USERS
// ===========================================
async function createSupportUsers(roles: any) {
  console.log('🎧 Creating support users...');

  const passwordHash = await bcrypt.hash(PASSWORDS.support, SALT_ROUNDS);

  const support = await prisma.user.create({
    data: {
      email: 'support@cargobit.eu',
      passwordHash,
      firstName: 'Support',
      lastName: 'Team',
      phone: '+49 30 1234568',
      language: 'de',
      status: UserStatus.ACTIVE,
      roles: {
        create: [{ roleId: roles.support.id }]
      }
    }
  });

  return [support];
}

// ===========================================
// CREATE COMPANIES
// ===========================================
async function createCompanies() {
  console.log('🏢 Creating companies...');

  const companies = await Promise.all([
    prisma.company.create({
      data: {
        name: 'Logistik Berlin GmbH',
        type: CompanyType.CARRIER,
        vatNumber: 'DE123456789',
        registrationNumber: 'HRB 12345',
        country: 'DE',
        status: CompanyStatus.ACTIVE,
      }
    }),
    prisma.company.create({
      data: {
        name: 'Spedition Hamburg AG',
        type: CompanyType.CARRIER,
        vatNumber: 'DE987654321',
        registrationNumber: 'HRB 54321',
        country: 'DE',
        status: CompanyStatus.ACTIVE,
      }
    }),
    prisma.company.create({
      data: {
        name: 'Transport München KG',
        type: CompanyType.BOTH,
        vatNumber: 'DE111222333',
        registrationNumber: 'HRA 11111',
        country: 'DE',
        status: CompanyStatus.ACTIVE,
      }
    }),
    prisma.company.create({
      data: {
        name: 'Versender Wien GmbH',
        type: CompanyType.SHIPPER,
        vatNumber: 'ATU12345678',
        registrationNumber: 'FN 123456',
        country: 'AT',
        status: CompanyStatus.ACTIVE,
      }
    }),
    prisma.company.create({
      data: {
        name: 'Allianz Versicherung AG',
        type: CompanyType.SHIPPER,
        vatNumber: 'DE999888777',
        registrationNumber: 'HRB 99999',
        country: 'DE',
        status: CompanyStatus.ACTIVE,
      }
    }),
  ]);

  return companies;
}

// ===========================================
// CREATE SHIPPERS
// ===========================================
async function createShippers(roles: any, companies: any[]) {
  console.log('📦 Creating shippers...');

  const passwordHash = await bcrypt.hash(PASSWORDS.shipper, SALT_ROUNDS);

  const shippers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'shipper1@cargobit.eu',
        passwordHash,
        firstName: 'Max',
        lastName: 'Mustermann',
        phone: '+49 30 1111111',
        language: 'de',
        status: UserStatus.ACTIVE,
        roles: { create: [{ roleId: roles.shipperCompany.id }] },
        companyUsers: {
          create: [{ companyId: companies[0].id, roleInCompany: 'member' }]
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'shipper2@cargobit.eu',
        passwordHash,
        firstName: 'Anna',
        lastName: 'Schmidt',
        phone: '+49 40 2222222',
        language: 'de',
        status: UserStatus.ACTIVE,
        roles: { create: [{ roleId: roles.shipperPrivate.id }] },
      }
    }),
    prisma.user.create({
      data: {
        email: 'shipper3@cargobit.eu',
        passwordHash,
        firstName: 'Thomas',
        lastName: 'Weber',
        phone: '+43 1 3333333',
        language: 'de',
        status: UserStatus.ACTIVE,
        roles: { create: [{ roleId: roles.shipperCompany.id }] },
        companyUsers: {
          create: [{ companyId: companies[3].id, roleInCompany: 'owner' }]
        }
      }
    }),
  ]);

  return shippers;
}

// ===========================================
// CREATE DISPATCHERS
// ===========================================
async function createDispatchers(roles: any, companies: any[]) {
  console.log('📋 Creating dispatchers...');

  const passwordHash = await bcrypt.hash(PASSWORDS.dispatcher, SALT_ROUNDS);

  const dispatchers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'dispatcher1@cargobit.eu',
        passwordHash,
        firstName: 'Peter',
        lastName: 'Müller',
        phone: '+49 30 4444444',
        language: 'de',
        status: UserStatus.ACTIVE,
        roles: { create: [{ roleId: roles.dispatcher.id }] },
        companyUsers: {
          create: [{ companyId: companies[0].id, roleInCompany: 'admin' }]
        }
      }
    }),
    prisma.user.create({
      data: {
        email: 'dispatcher2@cargobit.eu',
        passwordHash,
        firstName: 'Sara',
        lastName: 'Fischer',
        phone: '+49 40 5555555',
        language: 'de',
        status: UserStatus.ACTIVE,
        roles: { create: [{ roleId: roles.dispatcher.id }] },
        companyUsers: {
          create: [{ companyId: companies[1].id, roleInCompany: 'admin' }]
        }
      }
    }),
  ]);

  return dispatchers;
}

// ===========================================
// CREATE DRIVERS
// ===========================================
async function createDrivers(roles: any, companies: any[]) {
  console.log('🚛 Creating drivers...');

  const passwordHash = await bcrypt.hash(PASSWORDS.driver, SALT_ROUNDS);

  const drivers = [];

  for (let i = 0; i < 5; i++) {
    const user = await prisma.user.create({
      data: {
        email: `driver${i + 1}@cargobit.eu`,
        passwordHash,
        firstName: `Fahrer${i + 1}`,
        lastName: `Test`,
        phone: `+49 17${i} 666666${i}`,
        language: 'de',
        status: UserStatus.ACTIVE,
        roles: { create: [{ roleId: roles.driverSelfEmployed.id }] },
        driver: {
          create: {
            companyId: companies[i % 3].id,
            licenseClass: 'CE',
            licenseNumber: `LIC${100000 + i}`,
            adrLicense: i % 2 === 0,
            adrClasses: i % 2 === 0 ? '["3", "6.1", "8"]' : null,
            internationalExperience: true,
            spokenLanguages: '["de", "en"]',
            yearsExperience: 5 + i,
            isAvailable: true,
          }
        }
      },
      include: { driver: true }
    });

    drivers.push(user);
  }

  return drivers;
}

// ===========================================
// CREATE MARKETERS
// ===========================================
async function createMarketers(roles: any, companies: any[]) {
  console.log('📢 Creating marketers...');

  const passwordHash = await bcrypt.hash(PASSWORDS.marketer, SALT_ROUNDS);

  const marketers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'marketer1@cargobit.eu',
        passwordHash,
        firstName: 'Lisa',
        lastName: 'Marketing',
        phone: '+49 30 7777777',
        language: 'de',
        status: UserStatus.ACTIVE,
        roles: { create: [{ roleId: roles.marketer.id }] },
        companyUsers: {
          create: [{ companyId: companies[4].id, roleInCompany: 'member' }]
        }
      }
    }),
  ]);

  return marketers;
}

// ===========================================
// CREATE VEHICLES
// ===========================================
async function createVehicles(companies: any[]) {
  console.log('🚚 Creating vehicles...');

  const vehicleTypes = [VehicleType.SPRINTER, VehicleType.KOEFFER, VehicleType.PLANE, VehicleType.CURTAINSIDER, VehicleType.REEFER];

  const vehicles = [];

  for (let i = 0; i < 10; i++) {
    const vehicle = await prisma.vehicle.create({
      data: {
        companyId: companies[i % 3].id,
        type: vehicleTypes[i % vehicleTypes.length],
        plateNumber: `B-CB ${1000 + i}`,
        brand: i % 2 === 0 ? 'Mercedes-Benz' : 'MAN',
        model: i % 2 === 0 ? 'Actros' : 'TGX',
        year: 2020 + (i % 5),
        lengthM: 7.5 + (i % 5) * 2,
        maxPayloadKg: 3500 + (i % 5) * 2000,
        palletSpaces: 15 + (i % 5) * 3,
        adrApproved: i % 3 === 0,
        coolingAvailable: i % 4 === 0,
        hasLift: true,
        status: VehicleStatus.ACTIVE,
      }
    });

    vehicles.push(vehicle);
  }

  return vehicles;
}

// ===========================================
// CREATE TRANSPORT ADDRESSES
// ===========================================
async function createTransportAddresses() {
  console.log('📍 Creating transport addresses...');

  const addresses = await Promise.all(
    ADDRESSES.map(addr =>
      prisma.address.create({
        data: {
          label: `Address ${addr.city}`,
          contactName: 'Test Contact',
          contactPhone: '+49 30 123456',
          street: addr.street,
          streetNumber: addr.streetNumber,
          postalCode: addr.postalCode,
          city: addr.city,
          country: addr.country,
          latitude: addr.latitude,
          longitude: addr.longitude,
        }
      })
    )
  );

  return addresses;
}

// ===========================================
// CREATE TRANSPORTS
// ===========================================
async function createTransports(shippers: any[], addresses: any[]) {
  console.log('📦 Creating transports...');

  const statuses = [
    TransportStatus.CREATED,
    TransportStatus.PUBLISHED,
    TransportStatus.ASSIGNED,
    TransportStatus.IN_TRANSIT,
    TransportStatus.PICKUP_DONE,
    TransportStatus.DELIVERY_DONE,
    TransportStatus.COMPLETED,
    TransportStatus.CANCELLED,
  ];

  const transports = [];

  for (let i = 0; i < 8; i++) {
    const pickupAddr = addresses[i % addresses.length];
    const deliveryAddr = addresses[(i + 3) % addresses.length];

    const transport = await prisma.transport.create({
      data: {
        shipperUserId: shippers[i % shippers.length].id,
        transportType: [TransportType.PALLET, TransportType.BULK, TransportType.CONTAINER][i % 3],
        status: statuses[i],
        pickupAddressId: pickupAddr.id,
        deliveryAddressId: deliveryAddr.id,
        pickupDatetime: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)),
        deliveryDatetime: new Date(Date.now() + ((i + 2) * 24 * 60 * 60 * 1000)),
        description: `Test Transport ${i + 1} - ${pickupAddr.city} → ${deliveryAddr.city}`,
        distanceKm: 500 + i * 100,
        estimatedDuration: 300 + i * 60,
        shipperBudget: 800 + i * 200,
        isInternational: pickupAddr.country !== deliveryAddr.country,
        transitCountries: pickupAddr.country !== deliveryAddr.country ? '["DE", "AT"]' : null,
      }
    });

    transports.push(transport);

    // Create transport detail
    await prisma.transportDetail.create({
      data: {
        transportId: transport.id,
        detailsJson: JSON.stringify({
          cargoDescription: `Cargo for transport ${i + 1}`,
          specialInstructions: 'Handle with care',
        }),
        weightKg: 5000 + i * 500,
        volumeM3: 30 + i * 5,
        isHazmat: i % 5 === 0,
        isFragile: i % 3 === 0,
      }
    });

    // Create status history
    await prisma.transportStatusHistory.create({
      data: {
        transportId: transport.id,
        status: statuses[i],
        changedBy: shippers[i % shippers.length].id,
        note: `Status changed to ${statuses[i]}`,
      }
    });
  }

  return transports;
}

// ===========================================
// CREATE OFFERS
// ===========================================
async function createOffers(transports: any[], drivers: any[], vehicles: any[]) {
  console.log('💰 Creating offers...');

  for (let i = 0; i < 5; i++) {
    await prisma.offer.create({
      data: {
        transportId: transports[i].id,
        driverId: drivers[i % drivers.length].driver!.id,
        vehicleId: vehicles[i % vehicles.length].id,
        price: 700 + i * 150,
        currency: 'EUR',
        message: `Angebot für Transport ${i + 1}`,
        estimatedDuration: 280 + i * 60,
        status: i < 2 ? 'ACCEPTED' : 'PENDING',
      }
    });
  }
}

// ===========================================
// CREATE INSURANCE DATA
// ===========================================
async function createInsuranceData(transports: any[], shippers: any[]) {
  console.log('🛡️ Creating insurance data...');

  for (let i = 0; i < 5; i++) {
    const quote = await prisma.insuranceQuote.create({
      data: {
        orderId: transports[i].id,
        customerId: shippers[i % shippers.length].id,
        cargoValueEur: 10000 + i * 5000,
        origin: 'Berlin',
        destination: i % 2 === 0 ? 'Wien' : 'München',
        weightKg: 5000 + i * 500,
        premiumEur: 50 + i * 20,
        coverageEur: 10000 + i * 5000,
        provider: [InsuranceProvider.ALLIANZ, InsuranceProvider.HDI, InsuranceProvider.AXA][i % 3],
        riskFactors: JSON.stringify(['Internationaler Transport', 'Ersttransport']),
        tiersJson: JSON.stringify([
          { tier: 'BASIS', premium: 50 + i * 20, coverage: 10000 + i * 5000, commissionRate: 0.15 },
          { tier: 'STANDARD', premium: 75 + i * 20, coverage: 20000 + i * 5000, commissionRate: 0.15 },
          { tier: 'PREMIUM', premium: 100 + i * 20, coverage: 40000 + i * 5000, commissionRate: 0.12 },
        ]),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }
    });

    if (i < 3) {
      await prisma.insurancePolicy.create({
        data: {
          quoteId: quote.id,
          orderId: transports[i].id,
          customerId: shippers[i % shippers.length].id,
          transportId: transports[i].id,
          policyNumber: `CB-2024-${String(1000 + i).padStart(6, '0')}`,
          provider: quote.provider,
          tier: [InsuranceTier.BASIS, InsuranceTier.STANDARD, InsuranceTier.PREMIUM][i],
          premiumEur: quote.premiumEur,
          coverageEur: quote.coverageEur,
          commissionEur: quote.premiumEur * 0.15,
          commissionRate: 0.15,
          status: InsurancePolicyStatus.ACTIVE,
          validFrom: new Date(),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }
      });
    }
  }
}

// ===========================================
// CREATE AD CAMPAIGNS
// ===========================================
async function createAdCampaigns(companies: any[], marketers: any[]) {
  console.log('📣 Creating ad campaigns...');

  const campaigns = [
    { name: 'Allianz Q2 Frachtversicherung', position: 'marketplace-sidebar', budget: 5000 },
    { name: 'HDI Express-Versicherung', position: 'order-detail', budget: 3000 },
    { name: 'Transportversicherung Deluxe', position: 'homepage-hero', budget: 10000 },
    { name: 'Gefahrgut-Spezial', position: 'listing-highlight', budget: 2500 },
    { name: 'International Cover', position: 'dashboard-widget', budget: 4000 },
  ];

  for (let i = 0; i < campaigns.length; i++) {
    await prisma.campaign.create({
      data: {
        companyId: companies[4].id,
        userId: marketers[0].id,
        name: campaigns[i].name,
        description: `Marketing campaign ${i + 1}`,
        position: campaigns[i].position,
        bannerUrl: `https://cdn.cargobit.eu/ads/campaign-${i + 1}.jpg`,
        targetUrl: `https://partner.cargobit.eu/campaign/${i + 1}`,
        budget: campaigns[i].budget,
        spentAmount: campaigns[i].budget * 0.3,
        status: CampaignStatus.ACTIVE,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    });
  }
}

// ===========================================
// CREATE RISK RULES
// ===========================================
async function createRiskRules() {
  console.log('⚠️ Creating risk rules...');

  const rules = [
    // User Rules
    { name: 'user_kyc_missing', entityType: 'USER', category: 'DOCUMENT', weight: 20, description: 'KYC nicht abgeschlossen' },
    { name: 'user_new_iban', entityType: 'USER', category: 'PAYMENT', weight: 15, description: 'Neue IBAN < 48h' },
    { name: 'user_high_cancel_rate', entityType: 'USER', category: 'BEHAVIOR', weight: 10, description: 'Hohe Stornierungsrate' },
    { name: 'user_low_rating', entityType: 'USER', category: 'BEHAVIOR', weight: 15, description: 'Rating < 3.5' },
    { name: 'user_good_history', entityType: 'USER', category: 'BEHAVIOR', weight: -10, description: 'Lange Historie ohne Probleme' },

    // Company Rules
    { name: 'company_kyb_missing', entityType: 'COMPANY', category: 'DOCUMENT', weight: 25, description: 'KYB nicht abgeschlossen' },
    { name: 'company_fraud_flag', entityType: 'COMPANY', category: 'SECURITY', weight: 40, description: 'Fraud-Flag aktiv' },
    { name: 'company_high_damage_rate', entityType: 'COMPANY', category: 'OPERATION', weight: 15, description: 'Hohe Schadensrate' },

    // Transaction Rules
    { name: 'tx_high_amount', entityType: 'TRANSACTION', category: 'FINANCIAL', weight: 20, description: 'Betrag > 50.000€' },
    { name: 'tx_international_hazmat', entityType: 'TRANSACTION', category: 'OPERATION', weight: 20, description: 'International + Gefahrgut' },
    { name: 'tx_new_route', entityType: 'TRANSACTION', category: 'OPERATION', weight: 10, description: 'Neue Route' },
    { name: 'tx_escrow_used', entityType: 'TRANSACTION', category: 'FINANCIAL', weight: -5, description: 'Escrow verwendet' },
  ];

  for (const rule of rules) {
    await prisma.riskRule.create({
      data: {
        name: rule.name,
        description: rule.description,
        entityType: rule.entityType as any,
        category: rule.category,
        condition: JSON.stringify({}),
        weight: rule.weight,
        active: true,
        priority: 0,
      }
    });
  }

  // Create Risk Thresholds
  await prisma.riskThreshold.createMany({
    data: [
      { name: 'green', minValue: 0, maxValue: 30, allowAction: true, mitigations: '[]' },
      { name: 'yellow', minValue: 31, maxValue: 60, allowAction: true, requireDelay: true, delayHours: 24, require2FA: true, mitigations: '["DELAY_24H", "EXTRA_LOGGING"]' },
      { name: 'red', minValue: 61, maxValue: 100, allowAction: false, createTicket: true, notifySupport: true, mitigations: '["SUPPORT_NOTIFICATION", "BLOCK_ACTION"]' },
    ]
  });
}

// ===========================================
// CREATE PLANS
// ===========================================
async function createPlans() {
  console.log('📊 Creating plans...');

  await prisma.plan.createMany({
    data: [
      {
        name: PlanName.FREE,
        monthlyFee: 0,
        commissionPercent: 14,
        walletFeePercent: 3.5,
        featuresJson: JSON.stringify({ maxTransports: 10, support: 'email', insurance: false, ads: false }),
      },
      {
        name: PlanName.STARTER,
        monthlyFee: 29,
        yearlyFee: 290,
        commissionPercent: 10,
        walletFeePercent: 2.5,
        featuresJson: JSON.stringify({ maxTransports: 50, support: 'email', insurance: true, ads: false }),
      },
      {
        name: PlanName.PROFESSIONAL,
        monthlyFee: 99,
        yearlyFee: 990,
        commissionPercent: 7,
        walletFeePercent: 2.0,
        featuresJson: JSON.stringify({ maxTransports: 200, support: 'phone', insurance: true, ads: true }),
      },
      {
        name: PlanName.ENTERPRISE,
        monthlyFee: 299,
        yearlyFee: 2990,
        commissionPercent: 5,
        walletFeePercent: 1.5,
        featuresJson: JSON.stringify({ maxTransports: -1, support: 'dedicated', insurance: true, ads: true }),
      },
    ]
  });
}

// ===========================================
// CREATE SYSTEM SETTINGS
// ===========================================
async function createSystemSettings() {
  console.log('⚙️ Creating system settings...');

  await prisma.systemSetting.createMany({
    data: [
      { key: 'platform_name', value: 'CargoBit', description: 'Platform display name' },
      { key: 'platform_version', value: '1.0.0', description: 'Current platform version' },
      { key: 'default_currency', value: 'EUR', description: 'Default currency for prices' },
      { key: 'default_language', value: 'de', description: 'Default platform language' },
      { key: 'commission_rate_default', value: '14', description: 'Default commission rate (%)' },
      { key: 'insurance_commission_rate', value: '15', description: 'Insurance commission rate (%)' },
      { key: 'ads_cpm_default', value: '5.00', description: 'Default CPM for ads (EUR)' },
      { key: 'ads_cpc_default', value: '0.50', description: 'Default CPC for ads (EUR)' },
      { key: 'max_transport_value', value: '500000', description: 'Maximum transport value (EUR)' },
      { key: 'min_payout_amount', value: '50', description: 'Minimum payout amount (EUR)' },
    ]
  });
}

// ===========================================
// RUN SEED
// ===========================================
main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
