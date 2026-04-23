// ============================================
// CARGOBIT AUDIT SERVICE TYPES
// Version: 1.0.0
// ============================================

// ============================================
// ENUMS
// ============================================

export enum AuditActorType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  SERVICE = 'SERVICE',
}

export enum AuditDecision {
  ALLOWED = 'ALLOWED',
  BLOCKED = 'BLOCKED',
  DENIED = 'DENIED',
  MITIGATION = 'MITIGATION',
}

export enum AuditEntityType {
  USER = 'USER',
  COMPANY = 'COMPANY',
  TRANSACTION = 'TRANSACTION',
  TRANSPORT = 'TRANSPORT',
  WALLET = 'WALLET',
  VEHICLE = 'VEHICLE',
  OFFER = 'OFFER',
}

export enum AuditRiskLevel {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  RED = 'RED',
}

// ============================================
// STANDARD AUDIT EVENTS
// ============================================

export const STANDARD_AUDIT_EVENTS = {
  // Authentication
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  
  // User Actions
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  CREATE_TRANSPORT: 'CREATE_TRANSPORT',
  UPDATE_STATUS: 'UPDATE_STATUS',
  
  // CRUD Operations
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  
  // Financial
  PAYOUT: 'PAYOUT',
} as const;

// ============================================
// SECURITY AUDIT EVENTS
// ============================================

export const SECURITY_AUDIT_EVENTS = {
  // Security Checks
  SECURITY_CHECK: 'SECURITY_CHECK',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // Risk Events
  RISK_BLOCKED: 'RISK_BLOCKED',
  RISK_MITIGATION: 'RISK_MITIGATION',
  
  // Support Actions
  SUPPORT_TICKET_CREATED: 'SUPPORT_TICKET_CREATED',
  USER_BLOCKED: 'USER_BLOCKED',
  USER_UNBLOCKED: 'USER_UNBLOCKED',
  RISK_OVERRIDE: 'RISK_OVERRIDE',
  
  // Fraud Detection
  FRAUD_ALERT: 'FRAUD_ALERT',
} as const;

export type StandardAuditEvent = typeof STANDARD_AUDIT_EVENTS[keyof typeof STANDARD_AUDIT_EVENTS];
export type SecurityAuditEvent = typeof SECURITY_AUDIT_EVENTS[keyof typeof SECURITY_AUDIT_EVENTS];
export type AuditEvent = StandardAuditEvent | SecurityAuditEvent;

// ============================================
// INTERFACES
// ============================================

export interface AuditLogEntry {
  id: string;
  
  // Actor Information
  actorType: AuditActorType;
  actorId?: string;
  userId?: string;
  
  // Action Details
  action: AuditEvent;
  decision?: AuditDecision;
  
  // Risk Information
  riskScore?: number;
  riskLevel?: AuditRiskLevel;
  
  // Entity Information
  entityType: AuditEntityType;
  entityId: string;
  
  // Metadata
  metadata?: Record<string, unknown>;
  dataBefore?: Record<string, unknown>;
  dataAfter?: Record<string, unknown>;
  
  // Request Context
  correlationId?: string;
  sourceService?: string;
  supportTicketId?: string;
  
  // Network Information
  ipAddress?: string;
  userAgent?: string;
  
  // Timestamp
  createdAt: Date;
}

export interface CreateAuditLogRequest {
  actorType?: AuditActorType;
  actorId?: string;
  action: AuditEvent;
  decision?: AuditDecision;
  riskScore?: number;
  riskLevel?: AuditRiskLevel;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  sourceService?: string;
  supportTicketId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateAuditLogResponse {
  status: 'ok' | 'error';
  auditId: string;
  message?: string;
}

export interface AuditEntityResponse {
  entity: {
    type: AuditEntityType;
    id: string;
  };
  events: AuditLogEntry[];
  total: number;
  lastRiskScore?: number;
}

export interface AuditSearchParams {
  actorId?: string;
  entityId?: string;
  entityType?: AuditEntityType;
  action?: AuditEvent;
  decision?: AuditDecision;
  riskLevel?: AuditRiskLevel;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditSearchResponse {
  events: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditStatsResponse {
  totalEvents: number;
  highRiskEvents: number;
  mediumRiskEvents: number;
  lowRiskEvents: number;
  eventsLast24h: number;
  eventsLast7d: number;
  eventsLast30d: number;
  topActions: Array<{
    action: string;
    count: number;
  }>;
  topDecisions: Array<{
    decision: string;
    count: number;
  }>;
  riskLevelDistribution: {
    green: number;
    yellow: number;
    red: number;
    unknown: number;
  };
  sourceServiceDistribution: Array<{
    service: string;
    count: number;
  }>;
}

// ============================================
// AUDIT EVENT METADATA INTERFACES
// ============================================

export interface SecurityCheckMetadata {
  triggeredRules: string[];
  mitigations?: string[];
  originalAction: string;
  userRoles: string[];
  companyId?: string;
}

export interface PermissionDeniedMetadata {
  requiredPermission: string;
  userRoles: string[];
  attemptedAction: string;
}

export interface RiskBlockedMetadata {
  triggeredRules: string[];
  riskScore: number;
  riskFactors: string[];
  supportTicketId?: string;
}

export interface RiskMitigationMetadata {
  triggeredRules: string[];
  riskScore: number;
  mitigationsApplied: string[];
  delayUntil?: string;
}

export interface UserBlockedMetadata {
  reason: string;
  blockedBy: string;
  previousFlags: number;
  relatedTicketId?: string;
}

export interface RiskOverrideMetadata {
  originalScore: number;
  overrideReason: string;
  overriddenBy: string;
  newStatus: string;
}

export interface TransactionMetadata {
  amount: number;
  currency: string;
  transportId?: string;
  isInternational?: boolean;
  isHazmat?: boolean;
}

// ============================================
// RETENTION CONFIGURATION
// ============================================

export interface RetentionPolicy {
  riskLevel: AuditRiskLevel;
  retentionYears: number;
  description: string;
}

export const RETENTION_POLICIES: RetentionPolicy[] = [
  { riskLevel: AuditRiskLevel.RED, retentionYears: 5, description: 'High-Risk Events: 5 Jahre' },
  { riskLevel: AuditRiskLevel.YELLOW, retentionYears: 2, description: 'Medium-Risk Events: 2 Jahre' },
  { riskLevel: AuditRiskLevel.GREEN, retentionYears: 1, description: 'Low-Risk Events: 1 Jahr' },
];

export const SESSION_LOG_RETENTION_DAYS = 90;

// ============================================
// AUDIT EVENT DESCRIPTIONS (UI Copywriting)
// ============================================

export const AUDIT_EVENT_DESCRIPTIONS: Record<AuditEvent, { de: string; en: string }> = {
  // Standard Events
  LOGIN: { de: 'Benutzer eingeloggt', en: 'User logged in' },
  LOGOUT: { de: 'Benutzer ausgeloggt', en: 'User logged out' },
  UPDATE_PROFILE: { de: 'Profil aktualisiert', en: 'Profile updated' },
  CREATE_TRANSPORT: { de: 'Transport erstellt', en: 'Transport created' },
  UPDATE_STATUS: { de: 'Status geändert', en: 'Status changed' },
  CREATE: { de: 'Objekt erstellt', en: 'Object created' },
  UPDATE: { de: 'Objekt aktualisiert', en: 'Object updated' },
  DELETE: { de: 'Objekt gelöscht', en: 'Object deleted' },
  STATUS_CHANGE: { de: 'Status geändert', en: 'Status changed' },
  PAYOUT: { de: 'Auszahlung initiiert', en: 'Payout initiated' },
  
  // Security Events
  SECURITY_CHECK: { de: 'Sicherheitsprüfung durchgeführt', en: 'Security check performed' },
  PERMISSION_DENIED: { de: 'Berechtigung verweigert', en: 'Permission denied' },
  RISK_BLOCKED: { de: 'Aktion aufgrund hohen Risikos blockiert', en: 'Action blocked due to high risk' },
  RISK_MITIGATION: { de: 'Risikominderung angewendet', en: 'Risk mitigation applied' },
  SUPPORT_TICKET_CREATED: { de: 'Support-Ticket erstellt', en: 'Support ticket created' },
  USER_BLOCKED: { de: 'Benutzer gesperrt', en: 'User blocked' },
  USER_UNBLOCKED: { de: 'Benutzer freigeschaltet', en: 'User unblocked' },
  RISK_OVERRIDE: { de: 'Risk-Override durch Support', en: 'Risk override by support' },
  FRAUD_ALERT: { de: 'Betrugsverdacht erkannt', en: 'Fraud alert detected' },
};

// ============================================
// DECISION DESCRIPTIONS
// ============================================

export const AUDIT_DECISION_DESCRIPTIONS: Record<AuditDecision, { de: string; en: string }> = {
  ALLOWED: { de: 'Erlaubt', en: 'Allowed' },
  BLOCKED: { de: 'Blockiert', en: 'Blocked' },
  DENIED: { de: 'Verweigert', en: 'Denied' },
  MITIGATION: { de: 'Mitigations angewendet', en: 'Mitigations applied' },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getAuditEventDescription(event: AuditEvent, language: 'de' | 'en' = 'de'): string {
  return AUDIT_EVENT_DESCRIPTIONS[event]?.[language] || event;
}

export function getAuditDecisionDescription(decision: AuditDecision, language: 'de' | 'en' = 'de'): string {
  return AUDIT_DECISION_DESCRIPTIONS[decision]?.[language] || decision;
}

export function isSecurityEvent(event: AuditEvent): boolean {
  return Object.values(SECURITY_AUDIT_EVENTS).includes(event as SecurityAuditEvent);
}

export function isStandardEvent(event: AuditEvent): boolean {
  return Object.values(STANDARD_AUDIT_EVENTS).includes(event as StandardAuditEvent);
}
