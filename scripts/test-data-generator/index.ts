// ============================================
// CARGOBIT SECURITY GATEWAY - TEST DATA GENERATOR
// Version: 2.0 - Realistic Test Data Factory
// ============================================

import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TYPES
// ============================================

interface TestUser {
  id: string;
  role: string;
  companyId?: string;
  riskLevel: 'green' | 'yellow' | 'red';
  riskScore: number;
  email: string;
  phone: string;
  createdAt: string;
}

interface TestCompany {
  id: string;
  name: string;
  country: string;
  vatNumber: string;
  riskLevel: 'green' | 'yellow' | 'red';
  riskScore: number;
  kybStatus: 'verified' | 'pending' | 'failed';
  createdAt: string;
}

interface TestTransaction {
  id: string;
  userId: string;
  companyId: string;
  amount: number;
  currency: string;
  international: boolean;
  hazmat: boolean;
  payoutMethod: string;
  ibanAgeHours: number;
  riskLevel: 'green' | 'yellow' | 'red';
  riskScore: number;
  status: string;
  createdAt: string;
}

interface TestMitigation {
  id: string;
  entityType: string;
  entityId: string;
  type: 'delay' | '2fa' | 'gps_check' | 'extra_logging' | 'manual_review';
  status: 'pending' | 'waiting_for_user' | 'completed' | 'failed' | 'expired';
  params: Record<string, unknown>;
  createdAt: string;
  scheduledAt?: string;
  completedAt?: string;
}

interface TestSupportTicket {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  reason: string;
  status: 'open' | 'investigating' | 'resolved' | 'blocked' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  createdAt: string;
}

interface TestDataConfig {
  userCount: number;
  companyCount: number;
  transactionCount: number;
  mitigationCount: number;
  supportTicketCount: number;
  greenRatio: number; // 0.7 = 70%
  yellowRatio: number; // 0.2 = 20%
  redRatio: number; // 0.1 = 10%
}

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_CONFIG: TestDataConfig = {
  userCount: 100,
  companyCount: 20,
  transactionCount: 500,
  mitigationCount: 50,
  supportTicketCount: 20,
  greenRatio: 0.7,
  yellowRatio: 0.2,
  redRatio: 0.1,
};

const ROLES = [
  'SHIPPER_COMPANY',
  'DRIVER_SELF_EMPLOYED',
  'DISPATCHER',
  'ADMIN',
  'SUPPORT',
  'COMPLIANCE_OFFICER',
];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'PLN'];
const PAYOUT_METHODS = ['SEPA', 'SWIFT', 'PAYPAL', 'INTERNAL'];
const COUNTRIES = ['DE', 'NL', 'BE', 'AT', 'FR', 'PL', 'CZ', 'IT', 'ES', 'CH'];

// ============================================
// GENERATOR FUNCTIONS
// ============================================

function generateId(prefix: string, index: number): string {
  return `${prefix}_${String(index).padStart(4, '0')}`;
}

function getRiskLevel(random: number): 'green' | 'yellow' | 'red' {
  if (random < 0.7) return 'green';
  if (random < 0.9) return 'yellow';
  return 'red';
}

function getRiskScore(level: 'green' | 'yellow' | 'red'): number {
  switch (level) {
    case 'green':
      return faker.number.int({ min: 0, max: 29 });
    case 'yellow':
      return faker.number.int({ min: 30, max: 69 });
    case 'red':
      return faker.number.int({ min: 70, max: 100 });
  }
}

function generateUser(index: number, companyId?: string): TestUser {
  const riskLevel = getRiskLevel(Math.random());
  const role = faker.helpers.arrayElement(ROLES);

  return {
    id: generateId('u', index),
    role,
    companyId: role === 'ADMIN' || role === 'SUPPORT' || role === 'COMPLIANCE_OFFICER'
      ? undefined
      : companyId || generateId('c', faker.number.int({ min: 1, max: 20 })),
    riskLevel,
    riskScore: getRiskScore(riskLevel),
    email: faker.internet.email(),
    phone: faker.phone.number('+49###########'),
    createdAt: faker.date.past({ years: 2 }).toISOString(),
  };
}

function generateCompany(index: number): TestCompany {
  const riskLevel = getRiskLevel(Math.random());
  const country = faker.helpers.arrayElement(COUNTRIES);

  return {
    id: generateId('c', index),
    name: faker.company.name(),
    country,
    vatNumber: `${country}${faker.string.numeric(9)}`,
    riskLevel,
    riskScore: getRiskScore(riskLevel),
    kybStatus: faker.helpers.weightedArrayElement([
      { value: 'verified', weight: 70 },
      { value: 'pending', weight: 20 },
      { value: 'failed', weight: 10 },
    ]),
    createdAt: faker.date.past({ years: 3 }).toISOString(),
  };
}

function generateTransaction(index: number, users: TestUser[], companies: TestCompany[]): TestTransaction {
  const user = faker.helpers.arrayElement(users.filter((u) => u.companyId));
  const company = companies.find((c) => c.id === user?.companyId) || companies[0];

  const amount = faker.number.int({ min: 100, max: 100000 });
  const international = Math.random() < 0.15;
  const hazmat = Math.random() < 0.05;

  // Risk calculation
  let riskScore = 0;
  if (amount > 50000) riskScore += 30;
  else if (amount > 10000) riskScore += 10;
  if (international) riskScore += 15;
  if (hazmat) riskScore += 5;
  if (faker.number.int({ min: 0, max: 48 }) < 24) riskScore += 20; // New IBAN

  const riskLevel = riskScore >= 70 ? 'red' : riskScore >= 30 ? 'yellow' : 'green';

  return {
    id: generateId('tx', index),
    userId: user?.id || 'u_0001',
    companyId: company?.id || 'c_0001',
    amount,
    currency: faker.helpers.arrayElement(CURRENCIES),
    international,
    hazmat,
    payoutMethod: faker.helpers.arrayElement(PAYOUT_METHODS),
    ibanAgeHours: faker.number.int({ min: 1, max: 720 }),
    riskLevel,
    riskScore,
    status: faker.helpers.weightedArrayElement([
      { value: 'pending', weight: 30 },
      { value: 'completed', weight: 50 },
      { value: 'blocked', weight: 10 },
      { value: 'cancelled', weight: 10 },
    ]),
    createdAt: faker.date.recent({ days: 30 }).toISOString(),
  };
}

function generateMitigation(index: number, transactions: TestTransaction[]): TestMitigation {
  const transaction = faker.helpers.arrayElement(transactions.filter((t) => t.riskLevel !== 'green'));

  const type = faker.helpers.arrayElement(['delay', '2fa', 'gps_check', 'extra_logging', 'manual_review'] as const);
  const status = faker.helpers.arrayElement(['pending', 'waiting_for_user', 'completed', 'failed', 'expired'] as const);

  const params: Record<string, unknown> = {};
  switch (type) {
    case 'delay':
      params.delayMinutes = faker.helpers.arrayElement([60, 1440, 2880, 4320]);
      break;
    case '2fa':
      params.userPhone = faker.phone.number('+49###########');
      break;
    case 'gps_check':
      params.expectedGps = {
        lat: faker.location.latitude(),
        lng: faker.location.longitude(),
      };
      break;
  }

  const createdAt = faker.date.recent({ days: 7 }).toISOString();
  const scheduledAt = type === 'delay'
    ? new Date(new Date(createdAt).getTime() + (params.delayMinutes as number) * 60000).toISOString()
    : undefined;
  const completedAt = status === 'completed'
    ? faker.date.soon({ refDate: createdAt, days: 1 }).toISOString()
    : undefined;

  return {
    id: generateId('m', index),
    entityType: 'transaction',
    entityId: transaction?.id || generateId('tx', index),
    type,
    status,
    params,
    createdAt,
    scheduledAt,
    completedAt,
  };
}

function generateSupportTicket(index: number, transactions: TestTransaction[]): TestSupportTicket {
  const redTransactions = transactions.filter((t) => t.riskLevel === 'red');
  const transaction = faker.helpers.arrayElement(redTransactions.length > 0 ? redTransactions : transactions);

  return {
    id: generateId('st', index),
    userId: transaction?.userId || generateId('u', index),
    entityType: 'transaction',
    entityId: transaction?.id || generateId('tx', index),
    reason: faker.helpers.arrayElement([
      'High risk score triggered',
      'International transaction review',
      'KYB verification required',
      'Manual compliance review',
      'Fraud alert escalation',
    ]),
    status: faker.helpers.arrayElement(['open', 'investigating', 'resolved', 'blocked', 'closed'] as const),
    priority: faker.helpers.weightedArrayElement([
      { value: 'low', weight: 10 },
      { value: 'medium', weight: 40 },
      { value: 'high', weight: 35 },
      { value: 'critical', weight: 15 },
    ]),
    assignedTo: Math.random() > 0.3 ? 'support-001' : undefined,
    createdAt: faker.date.recent({ days: 14 }).toISOString(),
  };
}

// ============================================
// MAIN GENERATOR
// ============================================

interface GeneratedTestData {
  users: TestUser[];
  companies: TestCompany[];
  transactions: TestTransaction[];
  mitigations: TestMitigation[];
  supportTickets: TestSupportTicket[];
  summary: {
    generatedAt: string;
    config: TestDataConfig;
    distribution: {
      green: number;
      yellow: number;
      red: number;
    };
  };
}

export function generateTestData(config: Partial<TestDataConfig> = {}): GeneratedTestData {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  console.log('🔧 Generating test data...');
  console.log(`   Users: ${finalConfig.userCount}`);
  console.log(`   Companies: ${finalConfig.companyCount}`);
  console.log(`   Transactions: ${finalConfig.transactionCount}`);
  console.log(`   Mitigations: ${finalConfig.mitigationCount}`);
  console.log(`   Support Tickets: ${finalConfig.supportTicketCount}`);

  // Generate companies first (users reference them)
  const companies: TestCompany[] = [];
  for (let i = 1; i <= finalConfig.companyCount; i++) {
    companies.push(generateCompany(i));
  }
  console.log(`✅ Generated ${companies.length} companies`);

  // Generate users
  const users: TestUser[] = [];
  for (let i = 1; i <= finalConfig.userCount; i++) {
    const companyIndex = ((i - 1) % finalConfig.companyCount) + 1;
    users.push(generateUser(i, generateId('c', companyIndex)));
  }
  console.log(`✅ Generated ${users.length} users`);

  // Generate transactions
  const transactions: TestTransaction[] = [];
  for (let i = 1; i <= finalConfig.transactionCount; i++) {
    transactions.push(generateTransaction(i, users, companies));
  }
  console.log(`✅ Generated ${transactions.length} transactions`);

  // Generate mitigations
  const mitigations: TestMitigation[] = [];
  for (let i = 1; i <= finalConfig.mitigationCount; i++) {
    mitigations.push(generateMitigation(i, transactions));
  }
  console.log(`✅ Generated ${mitigations.length} mitigations`);

  // Generate support tickets
  const supportTickets: TestSupportTicket[] = [];
  for (let i = 1; i <= finalConfig.supportTicketCount; i++) {
    supportTickets.push(generateSupportTicket(i, transactions));
  }
  console.log(`✅ Generated ${supportTickets.length} support tickets`);

  // Calculate distribution
  const greenCount = users.filter((u) => u.riskLevel === 'green').length;
  const yellowCount = users.filter((u) => u.riskLevel === 'yellow').length;
  const redCount = users.filter((u) => u.riskLevel === 'red').length;

  console.log('\n📊 Risk Level Distribution (Users):');
  console.log(`   Green: ${greenCount} (${((greenCount / users.length) * 100).toFixed(1)}%)`);
  console.log(`   Yellow: ${yellowCount} (${((yellowCount / users.length) * 100).toFixed(1)}%)`);
  console.log(`   Red: ${redCount} (${((redCount / users.length) * 100).toFixed(1)}%)`);

  return {
    users,
    companies,
    transactions,
    mitigations,
    supportTickets,
    summary: {
      generatedAt: new Date().toISOString(),
      config: finalConfig,
      distribution: {
        green: greenCount,
        yellow: yellowCount,
        red: redCount,
      },
    },
  };
}

// ============================================
// OUTPUT FORMATTERS
// ============================================

export function toJson(data: GeneratedTestData): string {
  return JSON.stringify(data, null, 2);
}

export function toK6TestData(data: GeneratedTestData): string {
  // Format for K6 load tests
  const k6Data = {
    users: data.users.map((u) => ({
      id: u.id,
      role: u.role,
      companyId: u.companyId,
      riskLevel: u.riskLevel,
    })),
    transactions: data.transactions.slice(0, 100).map((t) => ({
      id: t.id,
      amount: t.amount,
      international: t.international,
      riskLevel: t.riskLevel,
    })),
  };

  return `// Auto-generated K6 test data
// Generated: ${data.summary.generatedAt}

export const TEST_USERS = ${JSON.stringify(k6Data.users, null, 2)};

export const TEST_TRANSACTIONS = ${JSON.stringify(k6Data.transactions, null, 2)};
`;
}

export function toLocustTestData(data: GeneratedTestData): string {
  // Format for Locust load tests
  return `# Auto-generated Locust test data
# Generated: ${data.summary.generatedAt}

TEST_USERS = ${JSON.stringify(data.users.slice(0, 50).map((u) => ({
    id: u.id,
    role: u.role,
    riskLevel: u.riskLevel,
  })), null, 2)}

TEST_TRANSACTIONS = ${JSON.stringify(data.transactions.slice(0, 50).map((t) => ({
    id: t.id,
    amount: t.amount,
    riskLevel: t.riskLevel,
  })), null, 2)}
`;
}

// ============================================
// CLI EXECUTION
// ============================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const outputDir = args[0] || './test-data';

  // Parse config from args
  const config: Partial<TestDataConfig> = {};
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '') as keyof TestDataConfig;
    const value = args[i + 1];
    if (key && value) {
      (config as Record<string, string | number>)[key] = parseInt(value) || value;
    }
  }

  const data = generateTestData(config);

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write files
  fs.writeFileSync(path.join(outputDir, 'test-data.json'), toJson(data));
  fs.writeFileSync(path.join(outputDir, 'k6-test-data.js'), toK6TestData(data));
  fs.writeFileSync(path.join(outputDir, 'locust-test-data.py'), toLocustTestData(data));

  console.log(`\n✅ Test data written to ${outputDir}/`);
}
