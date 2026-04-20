// Jest Setup File
// This file runs before each test file

// Mock environment variables for testing
process.env.DATABASE_URL = 'file:./test.db';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.NODE_ENV = 'test';

// Extend Jest matchers
expect.extend({
  toBeValidUuid(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be a valid UUID`
        : `expected ${received} to be a valid UUID`,
    };
  },
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUuid(): R;
    }
  }
}

// Silence console logs in tests unless VERBOSE is set
if (!process.env.VERBOSE) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  };
}
