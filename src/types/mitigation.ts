// ============================================
// CARGOBIT MITIGATION SERVICE TYPES
// Yellow Risk Mitigation System
// Version: 1.0.0
// ============================================

// ============================================
// ENUMS
// ============================================

export enum MitigationType {
  DELAY = 'DELAY',
  TWO_FACTOR = 'TWO_FACTOR',
  GPS_CHECK = 'GPS_CHECK',
  EXTRA_LOGGING = 'EXTRA_LOGGING',
  DOCUMENT_RECHECK = 'DOCUMENT_RECHECK',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  AMOUNT_LIMIT = 'AMOUNT_LIMIT',
}

export enum MitigationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum MitigationEntityType {
  USER = 'USER',
  COMPANY = 'COMPANY',
  TRANSACTION = 'TRANSACTION',
  TRANSPORT = 'TRANSPORT',
  WALLET = 'WALLET',
  VEHICLE = 'VEHICLE',
  OFFER = 'OFFER',
}

// ============================================
// INTERFACES
// ============================================

export interface ApplyMitigationRequest {
  entityType: MitigationEntityType;
  entityId: string;
  action: string;
  mitigationType: MitigationType;
  context: MitigationContext;
}

export interface MitigationContext {
  delayMinutes?: number;
  riskScore?: number;
  userId?: string;
  userEmail?: string;
  userPhone?: string;
  expectedGps?: { lat: number; lng: number; radiusMeters?: number };
  amount?: number;
  currency?: string;
  callbackAction?: string;
  callbackData?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ApplyMitigationResponse {
  status: 'pending' | 'completed' | 'error';
  mitigationId?: string;
  message?: string;
  errorCode?: string;
  executeAt?: Date;  // For DELAY mitigation
}

export interface Verify2FARequest {
  mitigationId: string;
  code: string;
}

export interface Verify2FAResponse {
  status: 'completed' | 'failed' | 'error';
  message: string;
  remainingAttempts?: number;
}

export interface VerifyGPSRequest {
  mitigationId: string;
  gps: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
}

export interface VerifyGPSResponse {
  status: 'completed' | 'failed' | 'error';
  message: string;
  distance?: number;
  remainingAttempts?: number;
}

export interface MitigationStatusResponse {
  entityType: string;
  entityId: string;
  mitigations: MitigationStatusItem[];
}

export interface MitigationStatusItem {
  id: string;
  mitigationType: MitigationType;
  status: MitigationStatus;
  action: string;
  createdAt: Date;
  expiresAt?: Date;
  completedAt?: Date;
  attempts: number;
  maxAttempts: number;
}

export interface MitigationRule {
  id: string;
  mitigationType: MitigationType;
  description?: string;
  config: MitigationRuleConfig;
  conditions?: MitigationRuleCondition;
  active: boolean;
  priority: number;
}

export interface MitigationRuleConfig {
  // DELAY config
  delayMinutes?: number;
  
  // 2FA config
  codeLength?: number;
  codeExpiryMinutes?: number;
  maxAttempts?: number;
  
  // GPS config
  maxDistanceMeters?: number;
  allowedCountries?: string[];
  
  // Amount limit config
  maxAmount?: number;
  currency?: string;
  
  [key: string]: unknown;
}

export interface MitigationRuleCondition {
  riskScoreMin?: number;
  riskScoreMax?: number;
  actions?: string[];
  entityTypes?: string[];
  triggeredRules?: string[];
}

// ============================================
// ERROR CODES
// ============================================

export const MITIGATION_ERROR_CODES = {
  MITIGATION_NOT_FOUND: {
    code: 'MITIGATION_NOT_FOUND',
    message: 'Mitigation ID existiert nicht',
    httpStatus: 404,
  },
  MITIGATION_NOT_ACTIVE: {
    code: 'MITIGATION_NOT_ACTIVE',
    message: 'Mitigation ist abgelaufen oder bereits abgeschlossen',
    httpStatus: 400,
  },
  INVALID_2FA_CODE: {
    code: 'INVALID_2FA_CODE',
    message: 'Der eingegebene Code ist falsch',
    httpStatus: 400,
  },
  GPS_OUT_OF_RANGE: {
    code: 'GPS_OUT_OF_RANGE',
    message: 'Standort ist nicht im erlaubten Bereich',
    httpStatus: 400,
  },
  DELAY_NOT_EXPIRED: {
    code: 'DELAY_NOT_EXPIRED',
    message: 'Die Wartezeit ist noch nicht abgelaufen',
    httpStatus: 400,
  },
  INVALID_MITIGATION_TYPE: {
    code: 'INVALID_MITIGATION_TYPE',
    message: 'Unbekannter Mitigation-Typ',
    httpStatus: 400,
  },
  MITIGATION_ALREADY_APPLIED: {
    code: 'MITIGATION_ALREADY_APPLIED',
    message: 'Diese Mitigation wurde bereits angewendet',
    httpStatus: 409,
  },
  MAX_ATTEMPTS_EXCEEDED: {
    code: 'MAX_ATTEMPTS_EXCEEDED',
    message: 'Maximale Anzahl an Versuchen überschritten',
    httpStatus: 403,
  },
  RULE_NOT_FOUND: {
    code: 'RULE_NOT_FOUND',
    message: 'Keine aktive Regel für diesen Mitigation-Typ gefunden',
    httpStatus: 404,
  },
} as const;

export type MitigationErrorCode = typeof MITIGATION_ERROR_CODES[keyof typeof MITIGATION_ERROR_CODES]['code'];

// ============================================
// PRIORITIES
// ============================================

export const MITIGATION_PRIORITIES: Record<MitigationType, {
  level: number;
  description: string;
  retryable: boolean;
  maxAttempts: number;
}> = {
  [MitigationType.DELAY]: {
    level: 1,
    description: 'Zeitverzögerung - Keine Interaktion erforderlich',
    retryable: false,
    maxAttempts: 1,
  },
  [MitigationType.EXTRA_LOGGING]: {
    level: 2,
    description: 'Erweitertes Logging - Automatisch',
    retryable: false,
    maxAttempts: 1,
  },
  [MitigationType.GPS_CHECK]: {
    level: 3,
    description: 'GPS-Verifikation erforderlich',
    retryable: true,
    maxAttempts: 2,
  },
  [MitigationType.TWO_FACTOR]: {
    level: 4,
    description: '2FA-Verifikation erforderlich',
    retryable: true,
    maxAttempts: 3,
  },
  [MitigationType.DOCUMENT_RECHECK]: {
    level: 3,
    description: 'Dokumente erneut prüfen',
    retryable: false,
    maxAttempts: 1,
  },
  [MitigationType.MANUAL_REVIEW]: {
    level: 5,
    description: 'Manuelle Prüfung durch Support',
    retryable: false,
    maxAttempts: 1,
  },
  [MitigationType.AMOUNT_LIMIT]: {
    level: 2,
    description: 'Betragsbegrenzung',
    retryable: false,
    maxAttempts: 1,
  },
};

// ============================================
// DEFAULT CONFIGURATIONS
// ============================================

export const DEFAULT_MITIGATION_CONFIGS: Record<MitigationType, MitigationRuleConfig> = {
  [MitigationType.DELAY]: {
    delayMinutes: 1440, // 24h
  },
  [MitigationType.TWO_FACTOR]: {
    codeLength: 6,
    codeExpiryMinutes: 10,
    maxAttempts: 3,
  },
  [MitigationType.GPS_CHECK]: {
    maxDistanceMeters: 1000, // 1km radius
    allowedCountries: ['DE', 'AT', 'CH', 'NL', 'BE', 'FR', 'PL', 'CZ'],
  },
  [MitigationType.EXTRA_LOGGING]: {
    // No config needed
  },
  [MitigationType.DOCUMENT_RECHECK]: {
    // Config set by rule
  },
  [MitigationType.MANUAL_REVIEW]: {
    // Config set by rule
  },
  [MitigationType.AMOUNT_LIMIT]: {
    maxAmount: 50000,
    currency: 'EUR',
  },
};

// ============================================
// UI MESSAGES
// ============================================

export const MITIGATION_UI_MESSAGES: Record<MitigationType, {
  de: {
    title: string;
    description: string;
    action: string;
  };
  en: {
    title: string;
    description: string;
    action: string;
  };
}> = {
  [MitigationType.DELAY]: {
    de: {
      title: 'Aktion verzögert',
      description: 'Diese Aktion wird aus Sicherheitsgründen verzögert.',
      action: 'Voraussichtliche Freigabe: {{executeAt}}',
    },
    en: {
      title: 'Action Delayed',
      description: 'This action is delayed for security reasons.',
      action: 'Expected release: {{executeAt}}',
    },
  },
  [MitigationType.TWO_FACTOR]: {
    de: {
      title: 'Verifizierung erforderlich',
      description: 'Bitte gib den Sicherheitscode ein, den wir dir gesendet haben.',
      action: 'Code eingeben',
    },
    en: {
      title: 'Verification Required',
      description: 'Please enter the security code we sent you.',
      action: 'Enter Code',
    },
  },
  [MitigationType.GPS_CHECK]: {
    de: {
      title: 'Standort bestätigen',
      description: 'Bitte bestätige deinen aktuellen Standort, um fortzufahren.',
      action: 'Standort freigeben',
    },
    en: {
      title: 'Confirm Location',
      description: 'Please confirm your current location to continue.',
      action: 'Share Location',
    },
  },
  [MitigationType.EXTRA_LOGGING]: {
    de: {
      title: 'Erweiterte Überwachung',
      description: 'Diese Aktion wird zusätzlich protokolliert.',
      action: 'Fortfahren',
    },
    en: {
      title: 'Enhanced Monitoring',
      description: 'This action is being logged with additional detail.',
      action: 'Continue',
    },
  },
  [MitigationType.DOCUMENT_RECHECK]: {
    de: {
      title: 'Dokumentenprüfung',
      description: 'Ihre Dokumente werden erneut geprüft.',
      action: 'Fortfahren',
    },
    en: {
      title: 'Document Review',
      description: 'Your documents are being reviewed.',
      action: 'Continue',
    },
  },
  [MitigationType.MANUAL_REVIEW]: {
    de: {
      title: 'Manuelle Prüfung',
      description: 'Diese Aktion erfordert eine manuelle Prüfung durch unser Team.',
      action: 'Prüfung anfordern',
    },
    en: {
      title: 'Manual Review',
      description: 'This action requires manual review by our team.',
      action: 'Request Review',
    },
  },
  [MitigationType.AMOUNT_LIMIT]: {
    de: {
      title: 'Betragsbegrenzung',
      description: 'Der Betrag überschreitet das Limit für diese Aktion.',
      action: 'Betrag anpassen',
    },
    en: {
      title: 'Amount Limit',
      description: 'The amount exceeds the limit for this action.',
      action: 'Adjust Amount',
    },
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getMitigationPriority(type: MitigationType): number {
  return MITIGATION_PRIORITIES[type]?.level || 0;
}

export function isMitigationRetryable(type: MitigationType): boolean {
  return MITIGATION_PRIORITIES[type]?.retryable || false;
}

export function getMaxAttempts(type: MitigationType): number {
  return MITIGATION_PRIORITIES[type]?.maxAttempts || 1;
}

export function getUIMessage(
  type: MitigationType,
  language: 'de' | 'en' = 'de'
): { title: string; description: string; action: string } {
  return MITIGATION_UI_MESSAGES[type]?.[language] || MITIGATION_UI_MESSAGES[type].en;
}
