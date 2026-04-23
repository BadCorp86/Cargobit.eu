// ============================================
// CARGOBIT SECURITY GATEWAY SDK - TYPES
// Version: 1.2.0
// Based on OpenAPI 3.0.3 Specification
// ============================================

// ============================================
// ENUMS
// ============================================

export type Role =
  | 'ADMIN'
  | 'SUPPORT'
  | 'SHIPPER_COMPANY'
  | 'SHIPPER_PRIVATE'
  | 'DISPATCHER'
  | 'DRIVER_SELF_EMPLOYED'
  | 'MARKETER';

export type EntityType =
  | 'user'
  | 'company'
  | 'transaction'
  | 'transport'
  | 'wallet'
  | 'vehicle'
  | 'offer';

export type RiskLevel = 'green' | 'yellow' | 'red';

export type Decision =
  | 'allowed'
  | 'allowed_with_mitigation'
  | 'permission_denied'
  | 'blocked';

export type MitigationType =
  | 'delay'
  | '2fa'
  | 'gps_check'
  | 'extra_logging'
  | 'document_recheck'
  | 'manual_review'
  | 'amount_limit';

// ============================================
// CONTEXT TYPES
// ============================================

export interface UserContext {
  id: string;
  role: Role;
  companyId?: string;
  email?: string;
}

export interface EntityContext {
  type: EntityType;
  id: string;
  context?: Record<string, unknown>;
}

export interface RiskInfo {
  score?: number;
  level?: RiskLevel;
  triggeredRules?: string[];
}

// ============================================
// REQUEST TYPES
// ============================================

export interface SecurityCheckRequest {
  requestId: string;
  user: UserContext;
  action: string;
  entity: EntityContext;
}

export interface PermissionValidateRequest {
  user: UserContext;
  action: string;
}

export interface RiskOverrideRequest {
  entityType: EntityType;
  entityId: string;
  newLevel: RiskLevel;
  newScore?: number;
  reason: string;
  actorId: string;
  expiresAt?: string;
}

export interface MitigationApplyRequest {
  entityType: EntityType;
  entityId: string;
  action: string;
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

// ============================================
// RESPONSE TYPES
// ============================================

export interface SecurityCheckResponse {
  allowed: boolean;
  decision: Decision;
  risk?: RiskInfo | null;
  mitigations?: MitigationType[];
  errorCode?: string;
  message?: string;
  supportTicketId?: string;
  correlationId?: string;
}

export interface PermissionValidateResponse {
  allowed: boolean;
  errorCode?: string;
  message?: string;
}

export interface RiskOverrideResponse {
  status: 'ok' | 'error';
  message?: string;
  risk?: RiskInfo;
  errorCode?: string;
}

export interface MitigationApplyResponse {
  status: 'pending' | 'completed' | 'error';
  mitigationId?: string;
  message?: string;
  executeAt?: string;
  errorCode?: string;
}

export interface RiskStatusResponse {
  entityType: EntityType;
  entityId: string;
  score?: number;
  level?: RiskLevel;
  lastUpdated?: string;
  triggeredRules?: string[];
  override?: {
    active: boolean;
    reason?: string;
    actorId?: string;
    expiresAt?: string;
  };
}

export interface ErrorResponse {
  errorCode?: string;
  message?: string;
  correlationId?: string;
  details?: Record<string, unknown>;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  port: number;
  dependencies?: {
    riskEngine?: 'healthy' | 'unhealthy' | 'unavailable';
    database?: 'connected' | 'disconnected';
  };
  uptime?: number;
}

// ============================================
// SECURITY ERROR CODES
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

export const SECURITY_ERROR_CODES: Record<SecurityErrorCode, {
  category: 'permission' | 'risk' | 'mitigation' | 'request' | 'auth' | 'rate_limit';
  httpStatus: number;
  message: string;
  recoveryHint?: string;
}> = {
  // Permission Errors
  PERMISSION_DENIED: {
    category: 'permission',
    httpStatus: 403,
    message: 'User role does not have permission for this action',
    recoveryHint: 'Check if the role is allowed for this action. Consult the permission matrix.',
  },
  ROLE_NOT_ALLOWED: {
    category: 'permission',
    httpStatus: 403,
    message: 'This role is explicitly excluded from this action',
    recoveryHint: 'Use a different role or contact admin for role extension.',
  },
  INVALID_ROLE: {
    category: 'permission',
    httpStatus: 400,
    message: 'Unknown or invalid role specified',
    recoveryHint: 'Use a valid role: ADMIN, SUPPORT, SHIPPER_COMPANY, SHIPPER_PRIVATE, DISPATCHER, DRIVER_SELF_EMPLOYED, MARKETER.',
  },
  // Risk Engine Errors
  HIGH_RISK_BLOCKED: {
    category: 'risk',
    httpStatus: 403,
    message: 'Action blocked due to high risk. Case forwarded to support.',
    recoveryHint: 'User must contact support or change contextual risk factors.',
  },
  RISK_ENGINE_UNAVAILABLE: {
    category: 'risk',
    httpStatus: 503,
    message: 'Risk Engine temporarily unavailable. Please retry.',
    recoveryHint: 'Retry after a short wait. Contact ops if the problem persists.',
  },
  INVALID_RISK_CONTEXT: {
    category: 'risk',
    httpStatus: 400,
    message: 'Invalid or incomplete risk context data',
    recoveryHint: 'Provide complete context data for risk evaluation.',
  },
  // Mitigation Errors
  MITIGATION_REQUIRED: {
    category: 'mitigation',
    httpStatus: 403,
    message: 'Mitigation required before action can proceed',
    recoveryHint: 'Complete the required mitigation steps.',
  },
  MITIGATION_FAILED: {
    category: 'mitigation',
    httpStatus: 500,
    message: 'Mitigation execution failed',
    recoveryHint: 'Contact support with correlation ID.',
  },
  MITIGATION_ALREADY_APPLIED: {
    category: 'mitigation',
    httpStatus: 400,
    message: 'This mitigation is already active for this entity',
  },
  MITIGATION_NOT_FOUND: {
    category: 'mitigation',
    httpStatus: 404,
    message: 'Mitigation not found',
  },
  MITIGATION_NOT_ACTIVE: {
    category: 'mitigation',
    httpStatus: 400,
    message: 'Mitigation is no longer active',
  },
  MAX_ATTEMPTS_EXCEEDED: {
    category: 'mitigation',
    httpStatus: 403,
    message: 'Maximum verification attempts exceeded',
  },
  INVALID_2FA_CODE: {
    category: 'mitigation',
    httpStatus: 400,
    message: 'Invalid 2FA code provided',
  },
  GPS_OUT_OF_RANGE: {
    category: 'mitigation',
    httpStatus: 400,
    message: 'GPS location is not within expected range',
  },
  // Request Errors
  INVALID_REQUEST: {
    category: 'request',
    httpStatus: 400,
    message: 'Invalid request format or missing required fields',
    recoveryHint: 'Include all required fields.',
  },
  INVALID_ACTION: {
    category: 'request',
    httpStatus: 400,
    message: 'Unknown action specified',
    recoveryHint: 'Use a valid action: CREATE_TRANSPORT, ACCEPT_OFFER, INITIATE_PAYOUT, etc.',
  },
  INVALID_ENTITY_TYPE: {
    category: 'request',
    httpStatus: 400,
    message: 'Invalid entity type specified',
    recoveryHint: 'Use a valid entity type: user, company, transaction, transport, wallet, vehicle.',
  },
  MALFORMED_JSON: {
    category: 'request',
    httpStatus: 400,
    message: 'Failed to parse JSON body',
    recoveryHint: 'Fix JSON syntax and retry.',
  },
  // Auth Errors
  UNAUTHORIZED: {
    category: 'auth',
    httpStatus: 401,
    message: 'Authentication required',
    recoveryHint: 'Add a valid JWT Bearer token in the Authorization header.',
  },
  FORBIDDEN: {
    category: 'auth',
    httpStatus: 403,
    message: 'Insufficient permissions',
    recoveryHint: 'Use a token with the required scopes.',
  },
  // Rate Limit Errors
  RATE_LIMIT_EXCEEDED: {
    category: 'rate_limit',
    httpStatus: 429,
    message: 'Rate limit exceeded. Please slow down your requests.',
    recoveryHint: 'Wait for Retry-After seconds and reduce request frequency.',
  },
};
