/**
 * Seed Script for Admin Users
 * 
 * Creates initial admin users with different roles.
 * 
 * Run with: npx ts-node scripts/seed-admin-users.ts
 */

import { PrismaClient, AdminRole } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// ============================================
// PASSWORD HASHING
// ============================================

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

// ============================================
// GENERATE TOTP SECRET
// ============================================

function generateTotpSecret(): string {
  return crypto.randomBytes(20).toString('base32').substring(0, 32);
}

// ============================================
// SEED ADMIN USERS
// ============================================

async function seedAdminUsers() {
  console.log('🌱 Seeding admin users...\n');
  
  const adminUsers = [
    {
      email: 'admin@cargobit.eu',
      password: 'Admin123!@#',
      role: AdminRole.ADMIN,
      is2faEnabled: false,
    },
    {
      email: 'finance@cargobit.eu',
      password: 'Finance123!@#',
      role: AdminRole.FINANCE,
      is2faEnabled: false,
    },
    {
      email: 'support@cargobit.eu',
      password: 'Support123!@#',
      role: AdminRole.SUPPORT,
      is2faEnabled: false,
    },
  ];
  
  for (const userData of adminUsers) {
    const existing = await prisma.adminUser.findUnique({
      where: { email: userData.email },
    });
    
    if (existing) {
      console.log(`⏭️  Admin user already exists: ${userData.email} (${existing.role})`);
      continue;
    }
    
    const passwordHash = await hashPassword(userData.password);
    const totpSecret = generateTotpSecret();
    
    const admin = await prisma.adminUser.create({
      data: {
        email: userData.email,
        passwordHash,
        role: userData.role,
        is2faEnabled: userData.is2faEnabled,
        totpSecret,
        isActive: true,
      },
    });
    
    console.log(`✅ Created admin user: ${admin.email} (${admin.role})`);
  }
  
  console.log('\n✅ Done!');
  console.log('\n📋 Test Credentials:');
  console.log('┌─────────────────────────┬─────────────────┬───────────────┐');
  console.log('│ Email                   │ Password        │ Role          │');
  console.log('├─────────────────────────┼─────────────────┼───────────────┤');
  console.log('│ admin@cargobit.eu       │ Admin123!@#     │ ADMIN         │');
  console.log('│ finance@cargobit.eu     │ Finance123!@#   │ FINANCE       │');
  console.log('│ support@cargobit.eu     │ Support123!@#   │ SUPPORT       │');
  console.log('└─────────────────────────┴─────────────────┴───────────────┘');
}

// ============================================
// MAIN
// ============================================

async function main() {
  try {
    await seedAdminUsers();
  } catch (error) {
    console.error('❌ Error seeding admin users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
