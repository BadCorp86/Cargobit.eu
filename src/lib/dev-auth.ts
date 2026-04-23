// ============================================
// CARGOBIT DEV AUTH UTILITIES
// For development and testing purposes only
// ============================================

export interface DevUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'SUPPORT' | 'SHIPPER_COMPANY' | 'SHIPPER_PRIVATE' | 'DISPATCHER' | 'DRIVER_SELF_EMPLOYED' | 'MARKETER';
  companyId?: string;
}

// Test users for development
export const DEV_USERS: Record<string, DevUser> = {
  admin: {
    id: 'dev_user_admin',
    email: 'admin@cargobit.dev',
    role: 'ADMIN',
  },
  support: {
    id: 'dev_user_support',
    email: 'support@cargobit.dev',
    role: 'SUPPORT',
  },
  shipper: {
    id: 'dev_user_shipper',
    email: 'shipper@cargobit.dev',
    role: 'SHIPPER_COMPANY',
    companyId: 'dev_company_1',
  },
  dispatcher: {
    id: 'dev_user_dispatcher',
    email: 'dispatcher@cargobit.dev',
    role: 'DISPATCHER',
    companyId: 'dev_company_2',
  },
  driver: {
    id: 'dev_user_driver',
    email: 'driver@cargobit.dev',
    role: 'DRIVER_SELF_EMPLOYED',
  },
  marketer: {
    id: 'dev_user_marketer',
    email: 'marketer@cargobit.dev',
    role: 'MARKETER',
  },
};

/**
 * Generate auth headers for development testing
 * Usage: const headers = { ...getDevAuthHeaders('admin'), 'Content-Type': 'application/json' }
 */
export function getDevAuthHeaders(userType: keyof typeof DEV_USERS = 'admin'): Record<string, string> {
  const user = DEV_USERS[userType];
  if (!user) {
    throw new Error(`Unknown dev user type: ${userType}`);
  }

  return {
    'x-dev-mode': 'true',
    'x-user-id': user.id,
    'x-user-email': user.email,
    'x-user-roles': user.role,
    'x-company-id': user.companyId || '',
  };
}

/**
 * Generate fetch options with dev auth headers
 */
export function getDevFetchOptions(
  userType: keyof typeof DEV_USERS = 'admin',
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown
): RequestInit {
  const headers: Record<string, string> = {
    ...getDevAuthHeaders(userType),
    'Content-Type': 'application/json',
  };

  return {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };
}

/**
 * Example usage:
 * 
 * // In a React component or test file:
 * import { getDevAuthHeaders, getDevFetchOptions } from '@/lib/dev-auth';
 * 
 * // Using headers directly:
 * fetch('/api/risk/tickets', {
 *   headers: getDevAuthHeaders('support')
 * });
 * 
 * // Using fetch options:
 * fetch('/api/risk/override', getDevFetchOptions('support', 'POST', {
 *   ticketId: 'st_123',
 *   reason: 'Manual verification complete',
 *   overrideBy: 'support_agent_1'
 * }));
 */

export default {
  DEV_USERS,
  getDevAuthHeaders,
  getDevFetchOptions,
};
