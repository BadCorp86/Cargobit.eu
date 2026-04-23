#!/usr/bin/env bun
// ============================================
// CARGOBIT SECURITY GATEWAY - TEST DATA SEEDER
// Seeds realistic mock data for testing
// Version: 1.0.0
// ============================================

import { db } from '../src/lib/db';

// ============================================
// MOCK PAYLOADS (User-Provided)
// ============================================

const MOCK_DATA = {
  // Users
  users: [
    { id: 'u_1001', email: 'shipper.green@cargobit.test', role: 'SHIPPER_COMPANY', companyId: 'c_2001' },
    { id: 'u_1002', email: 'shipper.yellow@cargobit.test', role: 'SHIPPER_COMPANY', companyId: 'c_2002' },
    { id: 'u_1003', email: 'shipper.red@cargobit.test', role: 'SHIPPER_COMPANY', companyId: 'c_2003' },
    { id: 'u_driver', email: 'driver@cargobit.test', role: 'DRIVER_SELF_EMPLOYED', companyId: null },
    { id: 'admin-001', email: 'admin@cargobit.test', role: 'ADMIN', companyId: null },
    { id: 'support-001', email: 'support@cargobit.test', role: 'SUPPORT', companyId: null },
    { id: 'dispatcher-001', email: 'dispatcher@cargobit.test', role: 'DISPATCHER', companyId: 'c_2004' },
  ],

  // Companies
  companies: [
    { id: 'c_2001', name: 'Green Shipping GmbH', kybStatus: 'VERIFIED', country: 'DE' },
    { id: 'c_2002', name: 'Yellow Transport AG', kybStatus: 'PENDING', country: 'DE' },
    { id: 'c_2003', name: 'Red Logistics Ltd', kybStatus: 'MISSING', country: 'CH' },
    { id: 'c_2004', name: 'Dispatcher Hub GmbH', kybStatus: 'VERIFIED', country: 'AT' },
  ],

  // Transactions
  transactions: [
    { id: 'tx_3001', amount: 1200, currency: 'EUR', status: 'PENDING', companyId: 'c_2001' },
    { id: 'tx_3002', amount: 18000, currency: 'EUR', status: 'PENDING', companyId: 'c_2002' },
    { id: 'tx_3003', amount: 52000, currency: 'EUR', status: 'BLOCKED', companyId: 'c_2003' },
  ],

  // Risk Scores
  riskScores: [
    { entityType: 'TRANSACTION', entityId: 'tx_3001', score: 14, riskLevel: 'GREEN', factorsCount: 0 },
    { entityType: 'TRANSACTION', entityId: 'tx_3002', score: 52, riskLevel: 'YELLOW', factorsCount: 2 },
    { entityType: 'TRANSACTION', entityId: 'tx_3003', score: 81, riskLevel: 'RED', factorsCount: 3 },
    { entityType: 'USER', entityId: 'u_1001', score: 10, riskLevel: 'GREEN', factorsCount: 0 },
    { entityType: 'USER', entityId: 'u_1002', score: 35, riskLevel: 'YELLOW', factorsCount: 1 },
    { entityType: 'USER', entityId: 'u_1003', score: 75, riskLevel: 'RED', factorsCount: 2 },
  ],

  // Risk Events (Triggered Rules)
  riskEvents: [
    { entityType: 'TRANSACTION', entityId: 'tx_3002', ruleName: 'user_new_iban', scoreDelta: 15 },
    { entityType: 'TRANSACTION', entityId: 'tx_3002', ruleName: 'kyc_pending', scoreDelta: 10 },
    { entityType: 'TRANSACTION', entityId: 'tx_3003', ruleName: 'tx_high_amount', scoreDelta: 20 },
    { entityType: 'TRANSACTION', entityId: 'tx_3003', ruleName: 'user_new_iban', scoreDelta: 15 },
    { entityType: 'TRANSACTION', entityId: 'tx_3003', ruleName: 'company_kyb_missing', scoreDelta: 25 },
  ],

  // Support Tickets
  supportTickets: [
    {
      id: 'st_9001',
      userId: 'u_1003',
      subject: 'Sicherheitsprüfung erforderlich: ACCEPT_OFFER',
      description: 'Automatisch erstellt durch Security Gateway. Risk Score: 81/100',
      category: 'FRAUD',
      priority: 'CRITICAL',
      status: 'OPEN',
    },
  ],

  // Notification Channels
  notificationChannels: [
    { channel: 'SLACK', config: JSON.stringify({ webhookUrl: 'https://hooks.slack.test.com/security' }), active: true },
    { channel: 'EMAIL', config: JSON.stringify({ smtpHost: 'smtp.test.com', fromEmail: 'security@cargobit.test' }), active: true },
    { channel: 'SMS', config: JSON.stringify({ provider: 'twilio', fromNumber: '+49123456789' }), active: true },
    { channel: 'WEBHOOK', config: JSON.stringify({ url: 'https://webhook.test.com/security' }), active: true },
  ],

  // Notification Templates
  notificationTemplates: [
    {
      eventType: 'HIGH_RISK_BLOCKED',
      channel: 'SLACK',
      subject: null,
      body: '🚨 *High-Risk erkannt – Aktion blockiert*\n• Entity: {{entityType}} {{entityId}}\n• Score: {{riskScore}}\n• User: {{userId}}\n• Zeit: {{timestamp}}',
      active: true,
    },
    {
      eventType: 'HIGH_RISK_BLOCKED',
      channel: 'EMAIL',
      subject: '⚠️ High-Risk Alert: {{entityType}} {{entityId}}',
      body: 'High-Risk Fall erkannt:\n\nEntity: {{entityType}} {{entityId}}\nRisk Score: {{riskScore}}\nTriggered Rules: {{triggeredRules}}\nTicket: {{ticketId}}\n\nBitte prüfen Sie den Fall im Support-Dashboard.',
      active: true,
    },
    {
      eventType: 'PAYOUT_DELAYED',
      channel: 'EMAIL',
      subject: '💰 Auszahlung verzögert',
      body: 'Ihre Auszahlung von {{amount}} {{currency}} wurde aus Sicherheitsgründen um {{delayMinutes}} Minuten verzögert.\n\nBei Fragen kontaktieren Sie unseren Support.',
      active: true,
    },
    {
      eventType: 'RISK_OVERRIDE',
      channel: 'SLACK',
      subject: null,
      body: '🔄 *Risk Override*\n• Entity: {{entityType}} {{entityId}}\n• Old Score: {{oldScore}}\n• New Score: {{newScore}}\n• Reason: {{reason}}\n• By: {{actorId}}',
      active: true,
    },
    {
      eventType: 'SUPPORT_TICKET_CREATED',
      channel: 'SLACK',
      subject: null,
      body: '🎫 *Neues Support-Ticket*\n• Ticket: {{ticketId}}\n• Category: {{category}}\n• Entity: {{entityType}} {{entityId}}',
      active: true,
    },
  ],

  // Mitigation Rules
  mitigationRules: [
    {
      mitigationType: 'DELAY',
      description: 'Delays action for specified time period',
      config: JSON.stringify({ delayMinutes: 1440 }),
      active: true,
      priority: 100,
    },
    {
      mitigationType: 'TWO_FACTOR',
      description: 'Requires 2FA verification',
      config: JSON.stringify({ codeLength: 6, codeExpiryMinutes: 10 }),
      active: true,
      priority: 90,
    },
    {
      mitigationType: 'GPS_CHECK',
      description: 'Verifies GPS location',
      config: JSON.stringify({ maxDistanceMeters: 1000 }),
      active: true,
      priority: 80,
    },
    {
      mitigationType: 'EXTRA_LOGGING',
      description: 'Enables enhanced logging',
      config: JSON.stringify({ logLevel: 'debug', retentionDays: 30 }),
      active: true,
      priority: 50,
    },
    {
      mitigationType: 'MANUAL_REVIEW',
      description: 'Requires manual review by support',
      config: JSON.stringify({ autoEscalateMinutes: 60 }),
      active: true,
      priority: 120,
    },
  ],
};

// ============================================
// SEEDING FUNCTIONS
// ============================================

async function clearTestData() {
  console.log('🧹 Clearing existing test data...');

  try {
    // Delete in correct order (respecting foreign keys)
    await db.mitigationQueueItem.deleteMany();
    await db.mitigationEvent.deleteMany();
    await db.mitigationStatus.deleteMany();
    await db.mitigationRule.deleteMany();

    await db.notificationQueueItem.deleteMany();
    await db.notificationEvent.deleteMany();
    await db.notificationTemplate.deleteMany();
    await db.notificationChannel.deleteMany();

    await db.auditLog.deleteMany();
    await db.auditSession.deleteMany();
    await db.auditEntity.deleteMany();

    await db.riskEvent.deleteMany();
    await db.riskHistory.deleteMany();
    await db.riskScore.deleteMany();

    await db.supportTicket.deleteMany();

    console.log('✅ Test data cleared');
  } catch (error) {
    console.log('⚠️ Some tables may not exist yet, continuing...');
  }
}

async function seedCompanies() {
  console.log('🏢 Seeding companies...');

  for (const company of MOCK_DATA.companies) {
    try {
      await db.company.upsert({
        where: { id: company.id },
        create: company,
        update: company,
      });
    } catch (error) {
      console.log(`  ⚠️ Skipped company ${company.id}`);
    }
  }

  console.log('✅ Companies seeded');
}

async function seedUsers() {
  console.log('👤 Seeding users...');

  for (const user of MOCK_DATA.users) {
    try {
      await db.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          email: user.email,
          password: 'hashed_password_test',
          companyId: user.companyId,
        },
        update: {
          email: user.email,
          companyId: user.companyId,
        },
      });

      // Assign role
      const roleRecord = await db.role.findFirst({
        where: { name: user.role },
      });

      if (roleRecord) {
        await db.userRole.upsert({
          where: {
            userId_roleId: {
              userId: user.id,
              roleId: roleRecord.id,
            },
          },
          create: {
            userId: user.id,
            roleId: roleRecord.id,
          },
          update: {},
        });
      }
    } catch (error) {
      console.log(`  ⚠️ Skipped user ${user.id}`);
    }
  }

  console.log('✅ Users seeded');
}

async function seedRiskScores() {
  console.log('📊 Seeding risk scores...');

  for (const rs of MOCK_DATA.riskScores) {
    try {
      await db.riskScore.upsert({
        where: {
          entityType_entityId: {
            entityType: rs.entityType as any,
            entityId: rs.entityId,
          },
        },
        create: {
          ...rs,
          lastEventAt: new Date(),
        },
        update: {
          score: rs.score,
          riskLevel: rs.riskLevel as any,
          factorsCount: rs.factorsCount,
          lastEventAt: new Date(),
        },
      });
    } catch (error) {
      console.log(`  ⚠️ Skipped risk score for ${rs.entityId}`);
    }
  }

  console.log('✅ Risk scores seeded');
}

async function seedRiskEvents() {
  console.log('⚡ Seeding risk events...');

  for (const event of MOCK_DATA.riskEvents) {
    try {
      // Find the risk score for this entity
      const riskScore = await db.riskScore.findFirst({
        where: {
          entityType: event.entityType as any,
          entityId: event.entityId,
        },
      });

      if (riskScore) {
        await db.riskEvent.create({
          data: {
            ...event,
            entityType: event.entityType as any,
            riskScoreId: riskScore.id,
          },
        });
      }
    } catch (error) {
      console.log(`  ⚠️ Skipped risk event ${event.ruleName}`);
    }
  }

  console.log('✅ Risk events seeded');
}

async function seedSupportTickets() {
  console.log('🎫 Seeding support tickets...');

  for (const ticket of MOCK_DATA.supportTickets) {
    try {
      await db.supportTicket.upsert({
        where: { id: ticket.id },
        create: ticket,
        update: ticket,
      });
    } catch (error) {
      console.log(`  ⚠️ Skipped support ticket ${ticket.id}`);
    }
  }

  console.log('✅ Support tickets seeded');
}

async function seedNotificationChannels() {
  console.log('📡 Seeding notification channels...');

  for (const channel of MOCK_DATA.notificationChannels) {
    try {
      await db.notificationChannel.upsert({
        where: { channel: channel.channel as any },
        create: {
          channel: channel.channel as any,
          config: channel.config,
          active: channel.active,
          rateLimit: 100,
          rateWindowSec: 60,
        },
        update: {
          config: channel.config,
          active: channel.active,
        },
      });
    } catch (error) {
      console.log(`  ⚠️ Skipped notification channel ${channel.channel}`);
    }
  }

  console.log('✅ Notification channels seeded');
}

async function seedNotificationTemplates() {
  console.log('📝 Seeding notification templates...');

  for (const template of MOCK_DATA.notificationTemplates) {
    try {
      await db.notificationTemplate.create({
        data: template as any,
      });
    } catch (error) {
      console.log(`  ⚠️ Skipped notification template ${template.eventType}/${template.channel}`);
    }
  }

  console.log('✅ Notification templates seeded');
}

async function seedMitigationRules() {
  console.log('🛡️ Seeding mitigation rules...');

  for (const rule of MOCK_DATA.mitigationRules) {
    try {
      await db.mitigationRule.upsert({
        where: { mitigationType: rule.mitigationType as any },
        create: rule as any,
        update: rule as any,
      });
    } catch (error) {
      console.log(`  ⚠️ Skipped mitigation rule ${rule.mitigationType}`);
    }
  }

  console.log('✅ Mitigation rules seeded');
}

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function main() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 CARGOBIT SECURITY GATEWAY TEST DATA SEEDER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');
  const shouldSeed = !args.includes('--clear-only');

  try {
    if (shouldClear) {
      await clearTestData();
    }

    if (shouldSeed) {
      console.log('');
      console.log('📦 Seeding test data...');
      console.log('');

      await seedCompanies();
      await seedUsers();
      await seedRiskScores();
      await seedRiskEvents();
      await seedSupportTickets();
      await seedNotificationChannels();
      await seedNotificationTemplates();
      await seedMitigationRules();

      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ TEST DATA SEEDING COMPLETE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('📋 Summary:');
      console.log(`   • Users: ${MOCK_DATA.users.length}`);
      console.log(`   • Companies: ${MOCK_DATA.companies.length}`);
      console.log(`   • Transactions: ${MOCK_DATA.transactions.length}`);
      console.log(`   • Risk Scores: ${MOCK_DATA.riskScores.length}`);
      console.log(`   • Risk Events: ${MOCK_DATA.riskEvents.length}`);
      console.log(`   • Support Tickets: ${MOCK_DATA.supportTickets.length}`);
      console.log(`   • Notification Channels: ${MOCK_DATA.notificationChannels.length}`);
      console.log(`   • Notification Templates: ${MOCK_DATA.notificationTemplates.length}`);
      console.log(`   • Mitigation Rules: ${MOCK_DATA.mitigationRules.length}`);
      console.log('');
      console.log('🧪 Ready for testing!');
      console.log('');
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }

  await db.$disconnect();
}

// Run seeder
main();
