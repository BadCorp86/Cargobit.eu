"use client";

import { useState, useCallback } from 'react';

// ============================================
// DEV AUTH HOOK
// For development and testing only
// ============================================

export type DevUserRole = 'ADMIN' | 'SUPPORT' | 'SHIPPER_COMPANY' | 'SHIPPER_PRIVATE' | 'DISPATCHER' | 'DRIVER_SELF_EMPLOYED' | 'MARKETER';

export interface DevUser {
  id: string;
  email: string;
  role: DevUserRole;
  companyId?: string;
}

const DEV_USERS: Record<string, DevUser> = {
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

const STORAGE_KEY = 'cargobit_dev_user';

export function useDevAuth() {
  const [currentUser, setCurrentUser] = useState<DevUser | null>(() => {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const login = useCallback((userType: string) => {
    const user = DEV_USERS[userType];
    if (!user) {
      console.error(`Unknown user type: ${userType}`);
      return false;
    }

    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
    return true;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (!currentUser) {
      return {
        'x-dev-mode': 'true',
        'x-user-id': '',
        'x-user-roles': '',
      };
    }

    return {
      'x-dev-mode': 'true',
      'x-user-id': currentUser.id,
      'x-user-email': currentUser.email,
      'x-user-roles': currentUser.role,
      'x-company-id': currentUser.companyId || '',
    };
  }, [currentUser]);

  const availableUsers = Object.keys(DEV_USERS);

  return {
    currentUser,
    isLoggedIn: !!currentUser,
    login,
    logout,
    getAuthHeaders,
    availableUsers,
  };
}

export default useDevAuth;
