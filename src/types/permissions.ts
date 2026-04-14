// ============================================
// CARGOBIT PERMISSION SYSTEM
// Role-Based Access Control (RBAC)
// ============================================

// ============================================
// ROLE DEFINITIONS
// ============================================

export type SystemRole = 
  | 'ADMIN'
  | 'SUPPORT'
  | 'SHIPPER_COMPANY'
  | 'SHIPPER_PRIVATE'
  | 'DISPATCHER'
  | 'DRIVER_SELF_EMPLOYED'
  | 'MARKETER';

// ============================================
// PERMISSION DEFINITIONS
// ============================================

export type Permission = 
  // User Management
  | 'user:read'
  | 'user:write'
  | 'user:delete'
  | 'user:assign_role'
  | 'user:verify'
  
  // Company Management
  | 'company:read'
  | 'company:write'
  | 'company:delete'
  | 'company:manage_members'
  | 'company:manage_plans'
  
  // Transport Management
  | 'transport:create'
  | 'transport:read'
  | 'transport:read_own'
  | 'transport:write'
  | 'transport:write_own'
  | 'transport:delete'
  | 'transport:delete_own'
  | 'transport:assign_driver'
  | 'transport:update_status'
  
  // Vehicle Management
  | 'vehicle:create'
  | 'vehicle:read'
  | 'vehicle:write'
  | 'vehicle:delete'
  
  // Driver Management
  | 'driver:create'
  | 'driver:read'
  | 'driver:write'
  | 'driver:delete'
  
  // Matching System
  | 'matching:start'
  | 'matching:read'
  | 'matching:assign'
  | 'matching:configure'
  
  // Offer System
  | 'offer:create'
  | 'offer:read'
  | 'offer:accept'
  | 'offer:reject'
  
  // Wallet & Finance
  | 'wallet:read'
  | 'wallet:read_own'
  | 'wallet:deposit'
  | 'wallet:withdraw'
  | 'wallet:withdraw_own'
  | 'wallet:manage_payout_methods'
  | 'wallet:view_all_transactions'
  | 'wallet:manage_commissions'
  
  // Verification
  | 'verification:read'
  | 'verification:approve'
  | 'verification:reject'
  
  // Security
  | 'security:read_flags'
  | 'security:create_flag'
  | 'security:resolve_flag'
  | 'security:block_user'
  | 'security:unblock_user'
  
  // Support
  | 'support:create_ticket'
  | 'support:read_tickets'
  | 'support:manage_tickets'
  
  // Marketing
  | 'marketing:create_campaign'
  | 'marketing:read_campaigns'
  | 'marketing:manage_campaigns'
  | 'marketing:view_stats'
  
  // System Administration
  | 'system:configure'
  | 'system:view_logs'
  | 'system:manage_plans'
  | 'system:manage_tolls'
  | 'system:manage_borders';

// ============================================
// ROLE TO PERMISSION MAPPING
// ============================================

export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  ADMIN: [
    // User Management
    'user:read', 'user:write', 'user:delete', 'user:assign_role', 'user:verify',
    // Company Management
    'company:read', 'company:write', 'company:delete', 'company:manage_members', 'company:manage_plans',
    // Transport (read only, no creation)
    'transport:read', 'transport:read_own',
    // Vehicle & Driver (read only)
    'vehicle:read', 'driver:read',
    // Matching
    'matching:read', 'matching:configure',
    // Wallet
    'wallet:read', 'wallet:view_all_transactions', 'wallet:manage_commissions',
    // Verification
    'verification:read', 'verification:approve', 'verification:reject',
    // Security
    'security:read_flags', 'security:create_flag', 'security:resolve_flag',
    'security:block_user', 'security:unblock_user',
    // Support
    'support:read_tickets', 'support:manage_tickets',
    // Marketing
    'marketing:read_campaigns', 'marketing:view_stats',
    // System
    'system:configure', 'system:view_logs', 'system:manage_plans',
    'system:manage_tolls', 'system:manage_borders',
  ],
  
  SUPPORT: [
    // User Management (read only)
    'user:read',
    // Company Management (read only)
    'company:read',
    // Transport
    'transport:read', 'transport:read_own',
    // Vehicle & Driver (read only)
    'vehicle:read', 'driver:read',
    // Verification
    'verification:read',
    // Security
    'security:read_flags', 'security:create_flag',
    'security:block_user', 'security:unblock_user',
    // Support
    'support:read_tickets', 'support:manage_tickets',
    // Wallet (read only)
    'wallet:read',
  ],
  
  SHIPPER_COMPANY: [
    // Transport
    'transport:create', 'transport:read_own', 'transport:write_own',
    'transport:delete_own', 'transport:assign_driver',
    // Offers
    'offer:read', 'offer:accept', 'offer:reject',
    // Wallet
    'wallet:read_own', 'wallet:deposit', 'wallet:withdraw_own',
    'wallet:manage_payout_methods',
    // Support
    'support:create_ticket', 'support:read_tickets',
    // Verification
    'verification:read',
  ],
  
  SHIPPER_PRIVATE: [
    // Transport
    'transport:create', 'transport:read_own', 'transport:write_own',
    'transport:delete_own',
    // Offers
    'offer:read', 'offer:accept', 'offer:reject',
    // Wallet
    'wallet:read_own', 'wallet:deposit', 'wallet:withdraw_own',
    'wallet:manage_payout_methods',
    // Support
    'support:create_ticket', 'support:read_tickets',
    // Verification
    'verification:read',
  ],
  
  DISPATCHER: [
    // Company (own)
    'company:read', 'company:manage_members',
    // Transport
    'transport:read', 'transport:read_own', 'transport:write_own',
    'transport:assign_driver', 'transport:update_status',
    // Vehicle
    'vehicle:create', 'vehicle:read', 'vehicle:write', 'vehicle:delete',
    // Driver
    'driver:create', 'driver:read', 'driver:write', 'driver:delete',
    // Matching
    'matching:read', 'matching:assign',
    // Offers
    'offer:create', 'offer:read',
    // Wallet
    'wallet:read_own', 'wallet:view_all_transactions',
    // Support
    'support:create_ticket', 'support:read_tickets',
    // Verification
    'verification:read',
  ],
  
  DRIVER_SELF_EMPLOYED: [
    // Transport
    'transport:read_own', 'transport:update_status',
    // Offers
    'offer:create', 'offer:read',
    // Matching
    'matching:read',
    // Wallet
    'wallet:read_own', 'wallet:withdraw_own', 'wallet:manage_payout_methods',
    // Support
    'support:create_ticket', 'support:read_tickets',
    // Verification
    'verification:read',
  ],
  
  MARKETER: [
    // Marketing
    'marketing:create_campaign', 'marketing:read_campaigns',
    'marketing:manage_campaigns', 'marketing:view_stats',
    // Company
    'company:read',
    // Wallet (for campaign payments)
    'wallet:read_own', 'wallet:deposit',
    // Support
    'support:create_ticket', 'support:read_tickets',
  ],
};

// ============================================
// RESOURCE ACCESS TYPES
// ============================================

export type ResourceType = 
  | 'user'
  | 'company'
  | 'transport'
  | 'vehicle'
  | 'driver'
  | 'wallet'
  | 'offer'
  | 'matching_session'
  | 'verification'
  | 'security_flag'
  | 'support_ticket'
  | 'campaign';

export interface ResourceAccess {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  scope: 'all' | 'company' | 'own' | 'none';
}

// ============================================
// PERMISSION CHECK FUNCTIONS
// ============================================

export function hasPermission(role: SystemRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function hasAnyPermission(role: SystemRole, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return permissions.some(p => rolePermissions.includes(p));
}

export function hasAllPermissions(role: SystemRole, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return permissions.every(p => rolePermissions.includes(p));
}

// ============================================
// KYC/KYB REQUIREMENTS
// ============================================

export interface VerificationRequirement {
  type: 'KYC' | 'KYB' | 'DRIVER_LICENSE' | 'ADR' | 'VEHICLE';
  required: boolean;
  level?: 'basic' | 'standard' | 'enhanced';
  restrictsFeature?: string[];
}

export const ROLE_VERIFICATION_REQUIREMENTS: Record<SystemRole, VerificationRequirement[]> = {
  ADMIN: [
    { type: 'KYC', required: true, level: 'enhanced' },
  ],
  SUPPORT: [
    { type: 'KYC', required: true, level: 'standard' },
  ],
  SHIPPER_COMPANY: [
    { type: 'KYC', required: true, level: 'standard' },
    { type: 'KYB', required: true, level: 'standard', restrictsFeature: ['high_value_transports', 'international'] },
  ],
  SHIPPER_PRIVATE: [
    { type: 'KYC', required: true, level: 'standard', restrictsFeature: ['high_value_transports'] },
  ],
  DISPATCHER: [
    { type: 'KYC', required: true, level: 'standard' },
    { type: 'KYB', required: false },
  ],
  DRIVER_SELF_EMPLOYED: [
    { type: 'KYC', required: true, level: 'standard' },
    { type: 'DRIVER_LICENSE', required: true, restrictsFeature: ['international', 'hazmat'] },
    { type: 'ADR', required: false, restrictsFeature: ['hazmat'] },
  ],
  MARKETER: [
    { type: 'KYC', required: true, level: 'basic' },
  ],
};

// ============================================
// RISK SCORE THRESHOLDS
// ============================================

export interface RiskThreshold {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  minScore: number;
  maxScore: number;
  restrictions: string[];
  requiresManualReview: boolean;
}

export const RISK_THRESHOLDS: RiskThreshold[] = [
  {
    level: 'LOW',
    minScore: 0,
    maxScore: 25,
    restrictions: [],
    requiresManualReview: false,
  },
  {
    level: 'MEDIUM',
    minScore: 26,
    maxScore: 50,
    restrictions: ['transaction_limits', 'payout_delay'],
    requiresManualReview: false,
  },
  {
    level: 'HIGH',
    minScore: 51,
    maxScore: 75,
    restrictions: ['transaction_limits', 'payout_manual_review', 'new_iban_block'],
    requiresManualReview: true,
  },
  {
    level: 'CRITICAL',
    minScore: 76,
    maxScore: 100,
    restrictions: ['account_restricted', 'payout_blocked', 'manual_review_required'],
    requiresManualReview: true,
  },
];

// ============================================
// SECURITY FLAG TYPES
// ============================================

export type SecurityFlagType = 
  | 'FRAUD_SUSPECTED'
  | 'PAYMENT_ISSUE'
  | 'DOCUMENT_ISSUE'
  | 'SUSPICIOUS_ACTIVITY'
  | 'MULTIPLE_FAILED_LOGINS'
  | 'UNUSUAL_LOGIN_LOCATION'
  | 'NEW_DEVICE_DETECTED'
  | 'IMPOSSIBLE_TRAVEL'
  | 'HIGH_CANCEL_RATE'
  | 'HIGH_DAMAGE_RATE'
  | 'SUSPICIOUS_TRANSACTIONS'
  | 'FAKE_DOCUMENTS';

export type SecurityFlagSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityFlagConfig {
  type: SecurityFlagType;
  defaultSeverity: SecurityFlagSeverity;
  autoExpire: boolean;
  expireAfterDays?: number;
  autoAction?: 'none' | 'temp_block' | 'require_2fa' | 'manual_review';
}

export const SECURITY_FLAG_CONFIGS: Record<SecurityFlagType, SecurityFlagConfig> = {
  FRAUD_SUSPECTED: {
    type: 'FRAUD_SUSPECTED',
    defaultSeverity: 'HIGH',
    autoExpire: false,
    autoAction: 'manual_review',
  },
  PAYMENT_ISSUE: {
    type: 'PAYMENT_ISSUE',
    defaultSeverity: 'MEDIUM',
    autoExpire: true,
    expireAfterDays: 90,
    autoAction: 'none',
  },
  DOCUMENT_ISSUE: {
    type: 'DOCUMENT_ISSUE',
    defaultSeverity: 'MEDIUM',
    autoExpire: true,
    expireAfterDays: 30,
    autoAction: 'none',
  },
  SUSPICIOUS_ACTIVITY: {
    type: 'SUSPICIOUS_ACTIVITY',
    defaultSeverity: 'MEDIUM',
    autoExpire: true,
    expireAfterDays: 60,
    autoAction: 'require_2fa',
  },
  MULTIPLE_FAILED_LOGINS: {
    type: 'MULTIPLE_FAILED_LOGINS',
    defaultSeverity: 'LOW',
    autoExpire: true,
    expireAfterDays: 7,
    autoAction: 'none',
  },
  UNUSUAL_LOGIN_LOCATION: {
    type: 'UNUSUAL_LOGIN_LOCATION',
    defaultSeverity: 'LOW',
    autoExpire: true,
    expireAfterDays: 14,
    autoAction: 'require_2fa',
  },
  NEW_DEVICE_DETECTED: {
    type: 'NEW_DEVICE_DETECTED',
    defaultSeverity: 'LOW',
    autoExpire: true,
    expireAfterDays: 30,
    autoAction: 'none',
  },
  IMPOSSIBLE_TRAVEL: {
    type: 'IMPOSSIBLE_TRAVEL',
    defaultSeverity: 'HIGH',
    autoExpire: false,
    autoAction: 'temp_block',
  },
  HIGH_CANCEL_RATE: {
    type: 'HIGH_CANCEL_RATE',
    defaultSeverity: 'MEDIUM',
    autoExpire: true,
    expireAfterDays: 180,
    autoAction: 'none',
  },
  HIGH_DAMAGE_RATE: {
    type: 'HIGH_DAMAGE_RATE',
    defaultSeverity: 'MEDIUM',
    autoExpire: true,
    expireAfterDays: 365,
    autoAction: 'none',
  },
  SUSPICIOUS_TRANSACTIONS: {
    type: 'SUSPICIOUS_TRANSACTIONS',
    defaultSeverity: 'HIGH',
    autoExpire: false,
    autoAction: 'manual_review',
  },
  FAKE_DOCUMENTS: {
    type: 'FAKE_DOCUMENTS',
    defaultSeverity: 'CRITICAL',
    autoExpire: false,
    autoAction: 'manual_review',
  },
};

// ============================================
// AUDIT LOG ACTIONS
// ============================================

export type AuditAction = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PAYOUT'
  | 'FRAUD_ALERT'
  | 'ROLE_CHANGE'
  | 'VERIFICATION_APPROVE'
  | 'VERIFICATION_REJECT'
  | 'USER_BLOCK'
  | 'USER_UNBLOCK'
  | 'IBAN_CHANGE'
  | 'PLAN_CHANGE'
  | 'DOCUMENT_UPLOAD';

export interface AuditLogEntry {
  id: string;
  entityType: ResourceType;
  entityId: string;
  action: AuditAction;
  performedBy: string;
  dataBefore?: Record<string, unknown>;
  dataAfter?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ============================================
// EXPORTS
// ============================================

export type {
  Permission,
  ResourceAccess,
  VerificationRequirement,
  RiskThreshold,
  SecurityFlagConfig,
  AuditLogEntry,
};
