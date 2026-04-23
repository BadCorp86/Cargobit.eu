// ============================================
// CARGOBIT NOTIFICATION SERVICE TYPES
// Version: 1.0.0
// ============================================

// ============================================
// ENUMS
// ============================================

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum NotificationChannelType {
  SLACK = 'SLACK',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WEBHOOK = 'WEBHOOK',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  CANCELLED = 'CANCELLED',
}

export enum NotificationEntityType {
  USER = 'USER',
  COMPANY = 'COMPANY',
  TRANSACTION = 'TRANSACTION',
  TRANSPORT = 'TRANSPORT',
  WALLET = 'WALLET',
  VEHICLE = 'VEHICLE',
  OFFER = 'OFFER',
}

// ============================================
// EVENT TYPES
// ============================================

export const NOTIFICATION_EVENT_TYPES = {
  // Security Events
  HIGH_RISK_BLOCKED: 'HIGH_RISK_BLOCKED',
  HIGH_RISK_MITIGATION: 'HIGH_RISK_MITIGATION',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  FRAUD_ALERT: 'FRAUD_ALERT',
  SECURITY_FLAG_CREATED: 'SECURITY_FLAG_CREATED',
  
  // User Events
  USER_BLOCKED: 'USER_BLOCKED',
  USER_UNBLOCKED: 'USER_UNBLOCKED',
  USER_VERIFICATION_REQUIRED: 'USER_VERIFICATION_REQUIRED',
  
  // Support Events
  SUPPORT_TICKET_CREATED: 'SUPPORT_TICKET_CREATED',
  SUPPORT_TICKET_ESCALATED: 'SUPPORT_TICKET_ESCALATED',
  RISK_OVERRIDE: 'RISK_OVERRIDE',
  
  // Transaction Events
  PAYOUT_DELAYED: 'PAYOUT_DELAYED',
  PAYOUT_BLOCKED: 'PAYOUT_BLOCKED',
  HIGH_VALUE_TRANSACTION: 'HIGH_VALUE_TRANSACTION',
  
  // System Events
  SYSTEM_ALERT: 'SYSTEM_ALERT',
  RATE_LIMIT_WARNING: 'RATE_LIMIT_WARNING',
} as const;

export type NotificationEventType = typeof NOTIFICATION_EVENT_TYPES[keyof typeof NOTIFICATION_EVENT_TYPES];

// ============================================
// INTERFACES
// ============================================

export interface SendNotificationRequest {
  eventType: NotificationEventType;
  entityType: NotificationEntityType;
  entityId: string;
  priority?: NotificationPriority;
  channels: NotificationChannelType[];
  data: Record<string, unknown>;
}

export interface SendNotificationResponse {
  status: 'queued' | 'error';
  eventId?: string;
  message?: string;
  errorCode?: string;
}

export interface NotificationEventResponse {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  status: NotificationStatus;
  channel: NotificationChannelType;
  priority: NotificationPriority;
  payload?: Record<string, unknown>;
  createdAt: Date;
  sentAt?: Date;
  retryCount: number;
  errorMessage?: string;
}

export interface CreateTemplateRequest {
  eventType: NotificationEventType;
  channel: NotificationChannelType;
  subject?: string;
  body: string;
  active?: boolean;
}

export interface NotificationTemplate {
  id: string;
  eventType: string;
  channel: NotificationChannelType;
  subject?: string;
  body: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationChannelConfig {
  id: string;
  channel: NotificationChannelType;
  config: ChannelConfig;
  active: boolean;
  rateLimit: number;
  rateWindowSec: number;
}

// ============================================
// CHANNEL CONFIG INTERFACES
// ============================================

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName?: string;
}

export interface SmsConfig {
  provider: 'twilio' | 'sns' | 'messagebird';
  apiKey: string;
  apiSecret?: string;
  fromNumber: string;
}

export interface PushConfig {
  provider: 'fcm' | 'apns';
  serverKey?: string;
  certificate?: string;
}

export interface WebhookConfig {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  authentication?: {
    type: 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
  };
}

export type ChannelConfig = SlackConfig | EmailConfig | SmsConfig | PushConfig | WebhookConfig;

// ============================================
// RATE LIMIT CONFIG
// ============================================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  retryDelayMs: number;
}

export const DEFAULT_RATE_LIMITS: Record<NotificationChannelType, RateLimitConfig> = {
  [NotificationChannelType.SLACK]: { maxRequests: 30, windowMs: 60000, retryDelayMs: 2000 },
  [NotificationChannelType.EMAIL]: { maxRequests: 50, windowMs: 60000, retryDelayMs: 1000 },
  [NotificationChannelType.SMS]: { maxRequests: 5, windowMs: 60000, retryDelayMs: 12000 },
  [NotificationChannelType.PUSH]: { maxRequests: 100, windowMs: 60000, retryDelayMs: 500 },
  [NotificationChannelType.WEBHOOK]: { maxRequests: 100, windowMs: 60000, retryDelayMs: 1000 },
};

// ============================================
// PRIORITY CONFIG
// ============================================

export const PRIORITY_CONFIG: Record<NotificationPriority, {
  level: number;
  description: string;
  examples: string[];
}> = {
  [NotificationPriority.LOW]: {
    level: 1,
    description: 'Info - Keine sofortige Aktion erforderlich',
    examples: ['Login', 'Profil-Update', 'Transport-Status'],
  },
  [NotificationPriority.MEDIUM]: {
    level: 2,
    description: 'Warnung - Beobachten',
    examples: ['Gelb-Mitigation', 'Neue IBAN', 'Unvollständige KYC'],
  },
  [NotificationPriority.HIGH]: {
    level: 3,
    description: 'Security - Sofort prüfen',
    examples: ['High-Risk Block', 'Fraud-Verdacht', 'Support-Ticket'],
  },
  [NotificationPriority.CRITICAL]: {
    level: 4,
    description: 'Sofort - Kritisch',
    examples: ['Payout > 100k', 'System-Kompromittierung', 'Massen-Fraud'],
  },
};

// ============================================
// TEMPLATE DATA INTERFACES
// ============================================

export interface TemplateData {
  // Common fields
  userId?: string;
  userEmail?: string;
  userName?: string;
  entityType?: string;
  entityId?: string;
  timestamp?: string;
  
  // Risk fields
  riskScore?: number;
  riskLevel?: string;
  triggeredRules?: string[];
  riskFactors?: string[];
  
  // Support fields
  ticketId?: string;
  ticketStatus?: string;
  supportAgent?: string;
  overrideReason?: string;
  
  // Transaction fields
  amount?: number;
  currency?: string;
  transactionType?: string;
  
  // Custom fields
  [key: string]: unknown;
}

// ============================================
// ERROR CODES
// ============================================

export const NOTIFICATION_ERROR_CODES = {
  TEMPLATE_NOT_FOUND: {
    code: 'TEMPLATE_NOT_FOUND',
    message: 'Kein Template für Event/Channel gefunden',
    httpStatus: 404,
  },
  CHANNEL_NOT_CONFIGURED: {
    code: 'CHANNEL_NOT_CONFIGURED',
    message: 'Slack/Mail/SMS nicht eingerichtet',
    httpStatus: 503,
  },
  INVALID_PAYLOAD: {
    code: 'INVALID_PAYLOAD',
    message: 'Pflichtfelder fehlen',
    httpStatus: 400,
  },
  DELIVERY_FAILED: {
    code: 'DELIVERY_FAILED',
    message: 'Provider-Fehler bei Zustellung',
    httpStatus: 502,
  },
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Zu viele Notifications',
    httpStatus: 429,
  },
  EVENT_NOT_FOUND: {
    code: 'EVENT_NOT_FOUND',
    message: 'Notification-Event nicht gefunden',
    httpStatus: 404,
  },
  TEMPLATE_ALREADY_EXISTS: {
    code: 'TEMPLATE_ALREADY_EXISTS',
    message: 'Template existiert bereits für diesen Event/Channel',
    httpStatus: 409,
  },
} as const;

export type NotificationErrorCode = typeof NOTIFICATION_ERROR_CODES[keyof typeof NOTIFICATION_ERROR_CODES]['code'];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getPriorityLevel(priority: NotificationPriority): number {
  return PRIORITY_CONFIG[priority].level;
}

export function getDefaultRetryDelay(priority: NotificationPriority): number {
  switch (priority) {
    case NotificationPriority.CRITICAL:
      return 5000; // 5s
    case NotificationPriority.HIGH:
      return 15000; // 15s
    case NotificationPriority.MEDIUM:
      return 30000; // 30s
    case NotificationPriority.LOW:
      return 60000; // 1min
    default:
      return 30000;
  }
}

export function getMaxRetries(priority: NotificationPriority): number {
  switch (priority) {
    case NotificationPriority.CRITICAL:
      return 10;
    case NotificationPriority.HIGH:
      return 5;
    case NotificationPriority.MEDIUM:
      return 3;
    case NotificationPriority.LOW:
      return 2;
    default:
      return 3;
  }
}
