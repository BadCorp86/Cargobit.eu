/**
 * Jest Setup
 * CargoBit Payment System
 *
 * Global setup for Jest test environment.
 */

// Extend Jest matchers
expect.extend({});

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/cargobit_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock';

// Global beforeAll hook
beforeAll(() => {
  // Any global setup
});

// Global afterAll hook
afterAll(() => {
  // Any global teardown
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Suppress console errors in tests (optional)
// Uncomment if you want cleaner test output
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };
