// ============================================
// CARGOBIT SECURITY GATEWAY - E2E GLOBAL SETUP
// Version: 1.0
// ============================================

import { FullConfig, request } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Starting E2E test global setup...');

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3004';

  // Create API context
  const apiContext = await request.newContext({
    baseURL,
  });

  // Health check
  try {
    console.log(`📡 Checking health at ${baseURL}/api/security/health...`);
    const healthResponse = await apiContext.get('/api/security/health');

    if (!healthResponse.ok()) {
      throw new Error(`Health check failed: ${healthResponse.status()}`);
    }

    const health = await healthResponse.json();
    console.log(`✅ Health check passed: ${JSON.stringify(health)}`);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    throw error;
  }

  // Seed test data
  try {
    console.log('🌱 Seeding test data...');
    const seedResponse = await apiContext.post('/api/test/seed', {
      data: {
        users: ['u_1001', 'u_1002', 'u_1003'],
        transactions: ['tx_3001', 'tx_3002', 'tx_3003'],
      },
    });

    // It's okay if seed endpoint doesn't exist
    if (seedResponse.ok()) {
      console.log('✅ Test data seeded');
    } else {
      console.log('⚠️ Seed endpoint not available, using existing data');
    }
  } catch {
    console.log('⚠️ Seed endpoint not available, using existing data');
  }

  // Store auth tokens if needed
  const authStorage = {
    origins: [
      {
        origin: baseURL,
        localStorage: [
          {
            name: 'test-mode',
            value: 'true',
          },
        ],
      },
    ],
  };

  // Save storage state
  const { storageState } = config.projects[0].use;
  if (typeof storageState === 'string') {
    const fs = await import('fs/promises');
    await fs.mkdir('test-results', { recursive: true });
    await fs.writeFile(storageState, JSON.stringify(authStorage));
  }

  console.log('✅ Global setup complete');

  await apiContext.dispose();
}

export default globalSetup;
