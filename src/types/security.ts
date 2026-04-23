// ============================================
// CARGOBIT SECURITY GATEWAY API TYPES
// Version: 2.0 - Full API Suite
// ============================================

// ============================================
// BASE TYPES
// ============================================

export type SystemRole =
  | 'ADMIN'
  | 'SUPPORT'
  | 'SHIPPER_COMPANY'
  | 'SHIPPER_PRIVATE'
  | 'DISPATCHER'
  | 'DRIVER_SELF_EMPLOYED'
  | 'MARKETER';

export type RiskLevel = 'green' | 'yellow' | 'red';

export type SecurityDecision =
  | 'allowed'
  | 'allowed_with_mitigation'
  | 'permission_denied'
  | 'blocked';

export type SecurityEntityType = 'user' | 'company' | 'transaction' | 'transport' | 'wallet' | 'vehicle' | 'offer';

export type MitigationType =
  | 'delay'
  | '2fa'
  | 'gps_check'
  | 'extra_logging'
  | 'document_recheck'
  | 'manual_review'
  | 'amount_limit';

export type SecurityAction =
  | 'CREATE_TRANSPORT'
  | 'VIEW_TRANSPORT'
  | 'ACCEPT_OFFER'
  | 'ACCEPT_JOB'
  | 'MAKE_OFFER'
  | 'ASSIGN_DRIVER'
  | 'UPDATE_STATUS'
  | 'VIEW_WALLET'
  | 'INITIATE_PAYOUT'
  | 'MANAGE_VEHICLES'
  | 'MANAGE_USERS'
  | 'MANAGE_PLANS';

// ============================================
// ERROR CODES
// ============================================

export type SecurityErrorCode =
  // Permission Errors
  | 'PERMISSION_DENIED'
  | 'ROLE_NOT_ALLOWED'
  | 'INVALID_ROLE'
  // Risk Engine Errors
  | 'HIGH_RISK_BLOCKED'
  | 'RISK_ENGINE_UNAVAILABLE'
  | 'INVALID_RISK_CONTEXT'
  // Mitigation Errors
  | 'MITIGATION_REQUIRED'
  | 'MITIGATION_FAILED'
  | 'MITIGATION_ALREADY_APPLIED'
  | 'MITIGATION_NOT_FOUND'
  | 'MITIGATION_NOT_ACTIVE'
  | 'MAX_ATTEMPTS_EXCEEDED'
  | 'INVALID_2FA_CODE'
  | 'GPS_OUT_OF_RANGE'
  // Request Errors
  | 'INVALID_REQUEST'
  | 'INVALID_ACTION'
  | 'INVALID_ENTITY_TYPE'
  | 'MALFORMED_JSON'
  // Auth Errors
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  // Rate Limit Errors
  | 'RATE_LIMIT_EXCEEDED';

export interface ErrorCodeDefinition {
  code: SecurityErrorCode;
  category: 'permission' | 'risk' | 'mitigation' | 'request' | 'auth' | 'rate_limit';
  httpStatus: number;
  message: string;
  recoveryHint?: string;
}

export const SECURITY_ERROR_CODES: Record<SecurityErrorCode, ErrorCodeDefinition> = {
  // Permission Errors
  PERMISSION_DENIED: {
    code: 'PERMISSION_DENIED',
    category: 'permission',
    httpStatus: 403,
    message: 'User role does not have permission for this action',
    recoveryHint: 'Check if the role is allowed for this action. Consult the permission matrix.',
  },
  ROLE_NOT_ALLOWED: {
    code: 'ROLE_NOT_ALLOWED',
    category: 'permission',
    httpStatus: 403,
    message: 'This role is explicitly excluded from this action',
    recoveryHint: 'Use a different role or contact admin for role extension.',
  },
  INVALID_ROLE: {
    code: 'INVALID_ROLE',
    category: 'permission',
    httpStatus: 400,
    message: 'Unknown or invalid role specified',
    recoveryHint: 'Use a valid role: ADMIN, SUPPORT, SHIPPER_COMPANY, SHIPPER_PRIVATE, DISPATCHER, DRIVER_SELF_EMPLOYED, MARKETER.',
  },
  // Risk Engine Errors
  HIGH_RISK_BLOCKED: {
    code: 'HIGH_RISK_BLOCKED',
    category: 'risk',
    httpStatus: 403,
    message: 'Action blocked due to high risk. Case forwarded to support.',
    recoveryHint: 'User must contact support or change contextual risk factors.',
  },
  RISK_ENGINE_UNAVAILABLE: {
    code: 'RISK_ENGINE_UNAVAILABLE',
    category: 'risk',
    httpStatus: 503,
    message: 'Risk Engine temporarily unavailable. Please retry.',
    recoveryHint: 'Retry after a short wait. Contact ops if the problem persists.',
  },
  INVALID_RISK_CONTEXT: {
    code: 'INVALID_RISK_CONTEXT',
    category: 'risk',
    httpStatus: 400,
    message: 'Invalid or incomplete risk context data',
    recoveryHint: 'Provide complete context data for risk evaluation.',
  },
  // Mitigation Errors
  MITIGATION_REQUIRED: {
    code: 'MITIGATION_REQUIRED',
    category: 'mitigation',
    httpStatus: 403,
    message: 'Mitigation required before action can proceed',
    recoveryHint: 'Complete the required mitigation steps.',
  },
  MITIGATION_FAILED: {
    code: 'MITIGATION_FAILED',
    category: 'mitigation',
    httpStatus: 500,
    message: 'Mitigation execution failed',
    recoveryHint: 'Contact support with correlation ID.',
  },
  MITIGATION_ALREADY_APPLIED: {
    code: 'MITIGATION_ALREADY_APPLIED',
    category: 'mitigation',
    httpStatus: 400,
    message: 'This mitigation is already active for this entity',
  },
  MITIGATION_NOT_FOUND: {
    code: 'MITIGATION_NOT_FOUND',
    category: 'mitigation',
    httpStatus: 404,
    message: 'Mitigation not found',
  },
  MITIGATION_NOT_ACTIVE: {
    code: 'MITIGATION_NOT_ACTIVE',
    category: 'mitigation',
    httpStatus: 400,
    message: 'Mitigation is no longer active',
  },
  MAX_ATTEMPTS_EXCEEDED: {
    code: 'MAX_ATTEMPTS_EXCEEDED',
    category: 'mitigation',
    httpStatus: 403,
    message: 'Maximum verification attempts exceeded',
  },
  INVALID_2FA_CODE: {
    code: 'INVALID_2FA_CODE',
    category: 'mitigation',
    httpStatus: 400,
    message: 'Invalid 2FA code provided',
  },
  GPS_OUT_OF_RANGE: {
    code: 'GPS_OUT_OF_RANGE',
    category: 'mitigation',
    httpStatus: 400,
    message: 'GPS location is not within expected range',
  },
  // Request Errors
  INVALID_REQUEST: {
    code: 'INVALID_REQUEST',
    category: 'request',
    httpStatus: 400,
    message: 'Invalid request format or missing required fields',
    recoveryHint: 'Include all required fields.',
  },
  INVALID_ACTION: {
    code: 'INVALID_ACTION',
    category: 'request',
    httpStatus: 400,
    message: 'Unknown action specified',
    recoveryHint: 'Use a valid action: CREATE_TRANSPORT, ACCEPT_OFFER, INITIATE_PAYOUT, etc.',
  },
  INVALID_ENTITY_TYPE: {
    code: 'INVALID_ENTITY_TYPE',
    category: 'request',
    httpStatus: 400,
    message: 'Invalid entity type specified',
    recoveryHint: 'Use a valid entity type: user, company, transaction, transport, wallet, vehicle.',
  },
  MALFORMED_JSON: {
    code: 'MALFORMED_JSON',
    category: 'request',
    httpStatus: 400,
    message: 'Failed to parse JSON body',
    recoveryHint: 'Fix JSON syntax and retry.',
  },
  // Auth Errors
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    category: 'auth',
    httpStatus: 401,
    message: 'Authentication required',
    recoveryHint: 'Add a valid JWT Bearer token in the Authorization header.',
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    category: 'auth',
    httpStatus: 403,
    message: 'Insufficient permissions',
    recoveryHint: 'Use a token with the required scopes.',
  },
  // Rate Limit Errors
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    category: 'rate_limit',
    httpStatus: 429,
    message: 'Rate limit exceeded. Please slow down your requests.',
    recoveryHint: 'Wait for Retry-After seconds and reduce request frequency.',
  },
};

// ============================================
// POST /security/check - REQUEST & RESPONSE
// ============================================

export interface SecurityCheckRequest {
  requestId: string;
  user: {
    id: string;
    role: SystemRole;
    companyId?: string;
    email?: string;
  };
  action: SecurityAction;
  entity: {
    type: SecurityEntityType;
    id: string;
    context?: Record<string, unknown>;
  };
}

export interface SecurityCheckResponse {
  allowed: boolean;
  decision: SecurityDecision;
  risk?: {
    score: number;
    level: RiskLevel;
    triggeredRules: string[];
  };
  mitigations?: MitigationType[];
  errorCode?: SecurityErrorCode;
  message?: string;
  supportTicketId?: string;
  correlationId: string;
}

// ============================================
// POST /security/permissions/validate - REQUEST & RESPONSE
// ============================================

export interface PermissionValidateRequest {
  user: {
    id: string;
    role: SystemRole;
  };
  action: SecurityAction;
}

export interface PermissionValidateResponse {
  allowed: boolean;
  errorCode?: SecurityErrorCode;
  message?: string;
}

// ============================================
// POST /security/risk/override - REQUEST & RESPONSE
// ============================================

export interface RiskOverrideRequest {
  entityType: SecurityEntityType;
  entityId: string;
  newLevel: RiskLevel;
  newScore?: number;
  reason: string;
  actorId: string;
  actorRole?: SystemRole;
  expiresAt?: string;
}

export interface RiskOverrideResponse {
  status: 'ok' | 'error';
  message?: string;
  risk?: {
    score: number;
    level: RiskLevel;
    lastUpdated: string;
  };
  errorCode?: SecurityErrorCode;
}

// ============================================
// POST /security/mitigation/apply - REQUEST & RESPONSE
// ============================================

export interface SecurityMitigationApplyRequest {
  entityType: SecurityEntityType;
  entityId: string;
  action: SecurityAction;
  mitigationType: MitigationType;
  context?: {
    userId?: string;
    userEmail?: string;
    userPhone?: string;
    amount?: number;
    currency?: string;
    expectedGps?: { lat: number; lng: number };
    delayMinutes?: number;
    callbackAction?: string;
    callbackData?: Record<string, unknown>;
    triggeredRules?: string[];
  };
}

export interface SecurityMitigationApplyResponse {
  status: 'pending' | 'completed' | 'error';
  mitigationId?: string;
  message?: string;
  executeAt?: string;
  errorCode?: SecurityErrorCode;
}

// ============================================
// GET /security/risk/{entityType}/{entityId} - RESPONSE
// ============================================

export interface RiskStatusResponse {
  entityType: SecurityEntityType;
  entityId: string;
  score: number;
  level: RiskLevel;
  lastUpdated: string;
  triggeredRules: string[];
  override?: {
    active: boolean;
    reason?: string;
    actorId?: string;
    expiresAt?: string;
  };
}

// ============================================
// SERVICE CONTEXT (Internal)
// ============================================

export interface SecurityServiceContext {
  requestId: string;
  clientId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}
