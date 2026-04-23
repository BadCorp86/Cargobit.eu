/**
 * CargoBit Frontend Test Setup
 * =============================
 * 
 * Global setup for Vitest tests:
 * - DOM matchers
 * - Mocks
 * - Test utilities
 */

import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// =============================================================================
// Cleanup
// =============================================================================

afterEach(() => {
  cleanup();
});

// =============================================================================
// Mocks
// =============================================================================

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock ResizeObserver
const mockResizeObserver = vi.fn();
mockResizeObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.ResizeObserver = mockResizeObserver;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock fetch
global.fetch = vi.fn();

// =============================================================================
// Test Data
// =============================================================================

// Sample suggestion for tests
export const mockSuggestion = {
  id: 'sg_test_001',
  tourId: 'tour_test_001',
  tourName: 'Test Tour Hamburg',
  orderId: 'order_test_001',
  orderName: 'Testauftrag',
  
  totalScore: 0.72,
  heuristicScore: 0.72,
  mlScore: null,
  
  components: {
    revenue: { score: 0.85, weight: 0.35, contribution: 0.2975 },
    capacityUtilization: { score: 0.70, weight: 0.20, contribution: 0.14 },
    priority: { score: 0.50, weight: 0.10, contribution: 0.05 },
    risk: { score: 0.80, weight: 0.10, contribution: 0.08 },
    serviceLevel: { score: 0.70, weight: 0.15, contribution: 0.105 },
    co2: { score: 0.50, weight: 0.10, contribution: 0.05 },
  },
  
  shapContributions: [],
  detourKm: 12,
  pickupTime: '08:30',
  deliveryTime: '14:00',
  additionalRevenue: 187.50,
  co2Saved: 4.2,
  
  status: 'pending' as const,
  createdAt: new Date().toISOString(),
  mlEnabled: false,
  canaryMode: true,
};

// Sample profiles for tests
export const mockProfiles = [
  {
    id: 'revenue_focused',
    name: 'Revenue-Fokus',
    description: 'Standard-Profil',
    isDefault: true,
  },
  {
    id: 'premium_customers',
    name: 'Premium-Kunden',
    description: 'Premium-Priorisierung',
    isDefault: false,
  },
  {
    id: 'sustainability',
    name: 'Nachhaltigkeit',
    description: 'CO₂-Fokus',
    isDefault: false,
  },
  {
    id: 'risk_averse',
    name: 'Risikominimierung',
    description: 'Risiko-Fokus',
    isDefault: false,
  },
];

// Sample order data
export const mockOrderData = {
  price: 150,
  volumeM3: 5,
  priority: 'NORMAL',
  riskLevel: 'MEDIUM',
  serviceLevel: 'STANDARD',
};

// Sample tour data
export const mockTourData = {
  detourKm: 12,
  freeCapacityM3: 10,
};

// =============================================================================
// Mock API Responses
// =============================================================================

export const mockApiResponses = {
  suggestions: {
    success: true,
    suggestions: [mockSuggestion],
    total: 1,
    profile: 'revenue_focused',
  },
  
  profiles: mockProfiles,
  
  simulation: {
    success: true,
    totalScore: 0.52,
    heuristicScore: 0.52,
    mlScore: null,
    components: mockSuggestion.components,
    shapContributions: [],
    recommendations: ['Hoher Score - Vorschlag empfohlen zur Annahme'],
  },
  
  accept: {
    success: true,
    suggestionId: 'sg_test_001',
    status: 'accepted',
    acceptedAt: new Date().toISOString(),
  },
  
  reject: {
    success: true,
    suggestionId: 'sg_test_001',
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

export function mockFetchResponse(data: any, ok = true) {
  return {
    ok,
    status: ok ? 200 : 400,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

export function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    json: vi.fn(),
    text: vi.fn(),
    ...overrides,
  } as unknown as Request;
}

// =============================================================================
// Custom Matchers
// =============================================================================

expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be within range ${floor} - ${ceiling}`
          : `expected ${received} to be within range ${floor} - ${ceiling}`,
    };
  },
});
