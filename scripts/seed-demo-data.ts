/**
 * Seed Script for Demo Data
 * 
 * Creates sample payments and disputes for admin UI testing.
 * 
 * Run with: npx ts-node scripts/seed-demo-data.ts
 */

import { PrismaClient, PaymentStatus, DisputeStatus, DisputeReason } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// CREATE DEMO USERS
// ============================================

async function createDemoUsers() {
  console.log('👥 Creating demo users...');

  // Check if users already exist
  const existingUsers = await prisma.user.findMany();
  if (existingUsers.length > 0) {
    console.log(`⏭️  Users already exist (${existingUsers.length} found)`);
    return existingUsers;
  }

  const users = await Promise.all([
    prisma.$
 * Creates demo payments and disputes for testing.
 * 
 * Run with: npx ts-node scripts/seed-demo-data.ts
 */

import { PrismaClient, PaymentStatus, RefundStatus, DisputeStatus, DisputeReason, DisputeResolution, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// HELPER FUNCTIONS
// ============================================

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysAgo));
  return date;
}

// ============================================
// SEED PAYMENTS
// ============================================

async function seedPayments() {
  console.log('💰 Seeding payments...');
  
  // Get existing users
  const users = await prisma.user.findMany({ take: 10 });
  
  if (users.length < 2) {
    console.log('⚠️  Not enough users found. Creating demo users first...');
    return;
  }
  
  const statuses: PaymentStatus[] = [
    PaymentStatus.SUCCEEDED,
    PaymentStatus.SUCCEEDED,
    PaymentStatus.SUCCEEDED,
    PaymentStatus.PENDING,
    PaymentStatus.FAILED,
    PaymentStatus.REFUNDED,
    PaymentStatus.PARTIALLY_REFUNDED,
  ];
  
  const payments = [];
  
  for (let i = 0; i < 15; i++) {
    const shipper = randomElement(users);
    let transporter = randomElement(users);
    while (transporter.id === shipper.id) {
      transporter = randomElement(users);
    }
    
    const amountCents = randomInt(5000, 200000); // 50€ - 2000€
    const platformFeeCents = Math.round(amountCents * 0.035); // 3.5%
    const status = randomElement(statuses);
    
    const payment = await prisma.payment.create({
      data: {
        paymentIntentId: `pi_${Date.now()}_${randomInt(1000, 9999)}`,
        chargeId: status === PaymentStatus.SUCCEEDED ? `ch_${Date.now()}_${randomInt(1000, 9999)}` : null,
        jobId: `job_demo_${i + 1}`,
        shipperId: shipper.id,
        transporterId: transporter.id,
        amountCents,
        currency: 'EUR',
        platformFeeCents,
        transporterAmountCents: Math.round(amountCents - platformFeeCents),
        status,
        description: `Demo payment ${i + 1}`,
        paidAt: status === PaymentStatus.SUCCEEDED ? randomDate(30) : null,
        createdAt: randomDate(60),
      },
    });
    
    payments.push(payment);
    console.log(`  ✓ Created payment: ${payment.paymentIntentId} (${status})`);
  }
  
  // Create some refunds
  const succeededPayments = payments.filter(p => p.status === PaymentStatus.SUCCEEDED || p.status === PaymentStatus.PARTIALLY_REFUNDED);
  
  for (const payment of succeededPayments.slice(0, 3)) {
    const refundAmount = payment.status === PaymentStatus.REFUNDED 
      ? payment.amountCents 
      : randomInt(1000, Math.floor(payment.amountCents / 2));
    
    await prisma.refund.create({
      data: {
        paymentId: payment.id,
        refundId: `re_${Date.now()}_${randomInt(1000, 9999)}`,
        amountCents: refundAmount,
        reason: randomElement(['customer_request', 'service_not_provided', 'partial_service', 'duplicate_charge']),
        status: RefundStatus.SUCCEEDED,
        initiatedBy: 'demo_admin',
        processedAt: randomDate(10),
        createdAt: randomDate(10),
      },
    });
    
    console.log(`  ✓ Created refund for payment: ${payment.paymentIntentId}`);
  }
  
  return payments;
}

// ============================================
// SEED DISPUTES
// ============================================

async function seedDisputes() {
  console.log('📮 Seeding disputes...');
  
  const users = await prisma.user.findMany({ take: 10 });
  
  if (users.length < 2) {
    console.log('⚠️  Not enough users found.');
    return;
  }
  
  const statuses: DisputeStatus[] = [
    DisputeStatus.OPEN,
    DisputeStatus.IN_PROGRESS,
    DisputeStatus.RESOLVED,
    DisputeStatus.RESOLVED,
    DisputeStatus.CLOSED,
  ];
  
  const reasons: DisputeReason[] = [
    DisputeReason.DAMAGE,
    DisputeReason.DELAY,
    DisputeReason.LOST_CARGO,
    DisputeReason.WRONG_DELIVERY,
    DisputeReason.QUALITY_ISSUE,
    DisputeReason.PRICE_DISPUTE,
    DisputeReason.DRIVER_BEHAVIOR,
  ];
  
  const resolutions: DisputeResolution[] = [
    DisputeResolution.REFUND_FULL,
    DisputeResolution.REFUND_PARTIAL,
    DisputeResolution.REJECT,
  ];
  
  for (let i = 0; i < 8; i++) {
    const creator = randomElement(users);
    const status = randomElement(statuses);
    const reason = randomElement(reasons);
    
    const dispute = await prisma.dispute.create({
      data: {
        jobId: `job_demo_${randomInt(1, 20)}`,
        createdById: creator.id,
        againstId: randomElement(users.filter(u => u.id !== creator.id))?.id,
        reason,
        subject: getSubjectForReason(reason),
        description: getDescriptionForReason(reason),
        disputedAmountCents: randomInt(5000, 50000),
        status,
        resolution: status === DisputeStatus.RESOLVED ? randomElement(resolutions) : null,
        resolutionText: status === DisputeStatus.RESOLVED ? 'Dispute resolved by admin' : null,
        refundAmountCents: status === DisputeStatus.RESOLVED ? randomInt(5000, 50000) : null,
        resolvedAt: status === DisputeStatus.RESOLVED ? randomDate(10) : null,
        createdAt: randomDate(30),
      },
    });
    
    // Add some messages
    const numMessages = randomInt(2, 5);
    for (let j = 0; j < numMessages; j++) {
      await prisma.disputeMessage.create({
        data: {
          disputeId: dispute.id,
          senderId: j % 2 === 0 ? creator.id : dispute.againstId || creator.id,
          senderType: j % 3 === 0 ? 'ADMIN' : (j % 2 === 0 ? 'USER' : 'DRIVER'),
          message: getRandomMessage(j),
          isInternal: j % 4 === 0,
          createdAt: new Date(dispute.createdAt.getTime() + j * 3600000),
        },
      });
    }
    
    console.log(`  ✓ Created dispute: ${dispute.id.slice(0, 8)}... (${status})`);
  }
}

// ============================================
// HELPER: GET CONTENT
// ============================================

function getSubjectForReason(reason: DisputeReason): string {
  const subjects: Record<DisputeReason, string> = {
    [DisputeReason.DAMAGE]: 'Ware bei Lieferung beschädigt',
    [DisputeReason.DELAY]: 'Verspätete Lieferung',
    [DisputeReason.LOST_CARGO]: 'Fracht nicht angekommen',
    [DisputeReason.WRONG_DELIVERY]: 'Falsche Lieferadresse',
    [DisputeReason.QUALITY_ISSUE]: 'Qualitätsprobleme',
    [DisputeReason.PRICE_DISPUTE]: 'Preisuneinigkeit',
    [DisputeReason.DRIVER_BEHAVIOR]: 'Fahrerverhalten',
    [DisputeReason.OTHER]: 'Sonstiges Problem',
  };
  return subjects[reason];
}

function getDescriptionForReason(reason: DisputeReason): string {
  const descriptions: Record<DisputeReason, string> = {
    [DisputeReason.DAMAGE]: 'Die Ware wurde beschädigt geliefert. Verpackung war beschädigt und der Inhalt hat sichtbare Schäden.',
    [DisputeReason.DELAY]: 'Die Lieferung kam 3 Tage später als vereinbart. Dies hat zu Problemen bei der Weiterverarbeitung geführt.',
    [DisputeReason.LOST_CARGO]: 'Die Fracht wurde nie geliefert. Der Transporteur kann den Verbleib nicht erklären.',
    [DisputeReason.WRONG_DELIVERY]: 'Die Ware wurde an eine falsche Adresse geliefert. Der Empfänger hat die Annahme verweigert.',
    [DisputeReason.QUALITY_ISSUE]: 'Die Qualität der Transportleistung entsprach nicht den vereinbarten Standards.',
    [DisputeReason.PRICE_DISPUTE]: 'Es gibt Unstimmigkeiten über den endgültigen Preis der Transportleistung.',
    [DisputeReason.DRIVER_BEHAVIOR]: 'Der Fahrer verhielt sich unprofessionell und unhöflich.',
    [DisputeReason.OTHER]: 'Es gibt ein sonstiges Problem mit diesem Transport.',
  };
  return descriptions[reason];
}

function getRandomMessage(index: number): string {
  const messages = [
    'Ich möchte diesen Fall zur Prüfung vorlegen.',
    'Die Behauptungen stimmen nicht so. Der Transport wurde korrekt durchgeführt.',
    'Können Sie bitte Beweise für die Beschädigung bereitstellen?',
    'Hier sind Fotos der beschädigten Ware.',
    'Wir haben bereits versucht, uns direkt zu einigen.',
    'Der Kunde wurde über den Verzögerungsgrund informiert.',
    'Ich bitte um eine schnelle Klärung dieses Falls.',
    'Vielen Dank für die Prüfung.',
  ];
  return messages[index % messages.length];
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('🌱 Starting demo data seed...\n');
  
  try {
    await seedPayments();
    console.log('');
    await seedDisputes();
    
    console.log('\n✅ Demo data seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
