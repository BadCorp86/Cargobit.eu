/**
 * CargoBit Security Config Service
 * 
 * Lädt und verwaltet die zentrale security-config.yaml
 * Bietet /authz/check Endpoint für Permission-Checks
 * 
 * @module @cargobit/security-config
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// =============================================================================
// TYPES
// =============================================================================

export interface SecurityConfig {
  roles: Record<string, RoleDefinition>;
  abac: ABACConfig;
  rateLimits: RateLimitConfig[];
  fraud: FraudConfig;
  audit: AuditConfig;
  retention: RetentionConfig;
}

export interface RoleDefinition {
  description: string;
  can: string[];
  cannot?: string[];
  whitelistedEndpoints?: string[];
}

export interface ABACConfig {
  rules: ABACRule[];
}

export interface ABACRule {
  name: string;
  appliesTo: string[];
  condition: string;
  description: string;
}

export interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowMs: number;
  scope: string;
  keyTemplate: string;
  description?: string;
}

export interface FraudConfig {
  carrierScore: {
    weights: {
      cancelRate: number;
      disputeRate: number;
      noShowRate: number;
      patternScore: number;
    };
    thresholds: {
      observe: number;
      suspect: number;
    };
    lookback: {
      cancelRateDays: number;
      disputeRateDays: number;
      noShowRateDays: number;
      patternScoreDays: number;
    };
    normalization: {
      cancelRateMax: number;
      disputeRateMax: number;
      noShowRateMax: number;
    };
  };
  bidScore: {
    weights: {
      dumping: number;
      spam: number;
      coordination: number;
    };
    dumping: {
      maxDiscountVsMarket: number;
      warnDiscountVsMarket: number;
      hardFloorEur: number;
      minPriceFactor: number;
    };
    spam: {
      maxBidsPerOrderPerHour: number;
      maxBidsPerMinuteGlobal: number;
      maxBidsPerCarrierPerDay: number;
    };
    coordination: {
      similarityWindowMinutes: number;
      similarityThreshold: number;
      minCarriersForCollusion: number;
      bidSpreadThreshold: number;
    };
  };
  totalScore: {
    alphaCarrier: number;
    penaltyFactor: number;
  };
  matching: {
    applyPenalty: boolean;
    capSuspectedScore: number;
    excludeFromAutoMatch: boolean;
  };
  events: {
    emitFraudSuspected: boolean;
    emitFraudFlagged: boolean;
    auditAllScores: boolean;
  };
}

export interface AuditConfig {
  events: string[];
  recordSchema: {
    requiredFields: string[];
    optionalFields: string[];
  };
  wormStore: {
    enabled: boolean;
    backend: string;
    immediateReplication: boolean;
    retentionYears: number;
  };
}

export interface RetentionConfig {
  policies: RetentionPolicy[];
  purgeJobs: {
    schedule: string;
    batchSize: number;
    dryRunFirst: boolean;
  };
}

export interface RetentionPolicy {
  category: string;
  retentionYears: number;
  archiveAfterYears?: number;
  gdprException: boolean;
  legalBasis?: string;
}

// =============================================================================
// AUTHORIZATION CHECK TYPES
// =============================================================================

export interface AuthzCheckRequest {
  subject: {
    id: string;
    role: string;
    companyId?: string;
  };
  action: string;
  resource: {
    type: string;
    id?: string;
    shipperId?: string;
    shipperCompanyId?: string;
    carrierId?: string;
    winnerId?: string;
    candidates?: string[];
    [key: string]: unknown;
  };
  context?: {
    endpoint?: string;
    ipAddress?: string;
  };
}

export interface AuthzCheckResult {
  allowed: boolean;
  reason?: string;
  matchedRule?: string;
  abacConditionMet?: boolean;
  configVersion: string;
}

// =============================================================================
// SECURITY CONFIG SERVICE
// =============================================================================

/**
 * Singleton Service für Security-Konfiguration
 */
export class SecurityConfigService {
  private static instance: SecurityConfigService;
  private config: SecurityConfig | null = null;
  private configPath: string;
  private configVersion: string;
  private lastLoaded: Date | null = null;
  private reloadInterval: NodeJS.Timeout | null = null;

  private constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'config', 'security-config.yaml');
    this.configVersion = '1.0.0';
  }

  /**
   * Singleton Instance
   */
  static getInstance(configPath?: string): SecurityConfigService {
    if (!SecurityConfigService.instance) {
      SecurityConfigService.instance = new SecurityConfigService(configPath);
    }
    return SecurityConfigService.instance;
  }

  /**
   * Konfiguration laden
   */
  load(): SecurityConfig {
    try {
      const fileContents = fs.readFileSync(this.configPath, 'utf8');
      this.config = yaml.load(fileContents) as SecurityConfig;
      this.lastLoaded = new Date();
      console.log(`[SecurityConfig] Loaded config version ${this.configVersion} from ${this.configPath}`);
      return this.config;
    } catch (error) {
      console.error(`[SecurityConfig] Failed to load config:`, error);
      throw error;
    }
  }

  /**
   * Konfiguration neu laden (Hot Reload)
   */
  reload(): SecurityConfig {
    const oldVersion = this.configVersion;
    this.config = this.load();
    console.log(`[SecurityConfig] Reloaded config (was ${oldVersion})`);
    return this.config;
  }

  /**
   * Auto-Reload starten
   */
  startAutoReload(intervalMs: number = 60000): void {
    if (this.reloadInterval) {
      clearInterval(this.reloadInterval);
    }
    this.reloadInterval = setInterval(() => {
      try {
        this.reload();
      } catch (error) {
        console.error('[SecurityConfig] Auto-reload failed:', error);
      }
    }, intervalMs);
    console.log(`[SecurityConfig] Auto-reload enabled (every ${intervalMs}ms)`);
  }

  /**
   * Auto-Reload stoppen
   */
  stopAutoReload(): void {
    if (this.reloadInterval) {
      clearInterval(this.reloadInterval);
      this.reloadInterval = null;
    }
  }

  /**
   * Aktuelle Konfiguration abrufen
   */
  getConfig(): SecurityConfig {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }

  /**
   * Config-Version abrufen
   */
  getConfigVersion(): string {
    return this.configVersion;
  }

  // =========================================================================
  // RBAC CHECKS
  // =========================================================================

  /**
   * Prüfen ob Rolle Permission hat
   */
  hasPermission(role: string, permission: string): boolean {
    const config = this.getConfig();
    const roleDef = config.roles[role];
    
    if (!roleDef) {
      return false;
    }

    // Wildcard check
    if (roleDef.can.includes('*')) {
      return true;
    }

    // Check explicit permission
    if (roleDef.can.includes(permission)) {
      // Check cannot list
      if (roleDef.cannot?.includes(permission)) {
        return false;
      }
      return true;
    }

    // Check wildcard patterns (e.g., "orders:*")
    const [resource] = permission.split(':');
    const wildcardPermission = `${resource}:*`;
    if (roleDef.can.includes(wildcardPermission)) {
      if (roleDef.cannot?.includes(permission)) {
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Alle Permissions einer Rolle abrufen
   */
  getRolePermissions(role: string): string[] {
    const config = this.getConfig();
    const roleDef = config.roles[role];
    
    if (!roleDef) {
      return [];
    }

    if (roleDef.can.includes('*')) {
      return ['*'];
    }

    return roleDef.can.filter(p => !roleDef.cannot?.includes(p));
  }

  // =========================================================================
  // ABAC CHECKS
  // =========================================================================

  /**
   * ABAC-Bedingung evaluieren
   */
  evaluateABACCondition(
    condition: string,
    subject: AuthzCheckRequest['subject'],
    resource: AuthzCheckRequest['resource'],
    context?: AuthzCheckRequest['context']
  ): boolean {
    // DENY condition
    if (condition === 'DENY') {
      return false;
    }

    // Ownership checks
    if (condition.includes('resource.shipperId == subject.id')) {
      return resource.shipperId === subject.id;
    }

    if (condition.includes('resource.shipperCompanyId == subject.companyId')) {
      return resource.shipperCompanyId === subject.companyId;
    }

    if (condition.includes('resource.carrierId == subject.id')) {
      return resource.carrierId === subject.id;
    }

    if (condition.includes('resource.winnerId == subject.id')) {
      return resource.winnerId === subject.id;
    }

    if (condition.includes('resource.candidates CONTAINS subject.id')) {
      return resource.candidates?.includes(subject.id) ?? false;
    }

    // Whitelist check
    if (condition.includes('endpoint IN subject.whitelistedEndpoints')) {
      const roleDef = this.getConfig().roles[subject.role];
      return roleDef?.whitelistedEndpoints?.includes(context?.endpoint ?? '') ?? false;
    }

    // Compound conditions (OR)
    if (condition.includes(' OR ')) {
      const parts = condition.split(' OR ').map(p => p.trim());
      return parts.some(part => this.evaluateABACCondition(part, subject, resource, context));
    }

    // Default: allow
    return true;
  }

  // =========================================================================
  // AUTHORIZATION CHECK
  // =========================================================================

  /**
   * Vollständiger Authorization Check (RBAC + ABAC)
   */
  checkAuthorization(request: AuthzCheckRequest): AuthzCheckResult {
    const { subject, action, resource, context } = request;
    const config = this.getConfig();

    // Step 1: RBAC Check
    const hasRBAC = this.hasPermission(subject.role, action);
    
    if (!hasRBAC) {
      return {
        allowed: false,
        reason: `Role ${subject.role} does not have permission ${action}`,
        configVersion: this.configVersion,
      };
    }

    // Step 2: Find applicable ABAC rules
    const applicableRules = config.abac.rules.filter(
      rule => rule.appliesTo.includes(action)
    );

    // Step 3: Evaluate ABAC rules
    for (const rule of applicableRules) {
      const conditionMet = this.evaluateABACCondition(
        rule.condition,
        subject,
        resource,
        context
      );

      if (!conditionMet) {
        return {
          allowed: false,
          reason: `ABAC condition not met: ${rule.name} (${rule.description})`,
          matchedRule: rule.name,
          abacConditionMet: false,
          configVersion: this.configVersion,
        };
      }
    }

    // All checks passed
    return {
      allowed: true,
      abacConditionMet: applicableRules.length > 0,
      configVersion: this.configVersion,
    };
  }

  // =========================================================================
  // FRAUD CONFIG GETTERS
  // =========================================================================

  /**
   * Fraud-Config abrufen
   */
  getFraudConfig(): FraudConfig {
    return this.getConfig().fraud;
  }

  /**
   * Carrier-Score Gewichte
   */
  getCarrierScoreWeights(): FraudConfig['carrierScore']['weights'] {
    return this.getConfig().fraud.carrierScore.weights;
  }

  /**
   * Bid-Score Gewichte
   */
  getBidScoreWeights(): FraudConfig['bidScore']['weights'] {
    return this.getConfig().fraud.bidScore.weights;
  }

  /**
   * Fraud Thresholds
   */
  getFraudThresholds(): { observe: number; suspect: number } {
    return this.getConfig().fraud.carrierScore.thresholds;
  }

  /**
   * Total Score Parameter
   */
  getTotalScoreParams(): { alpha: number; penaltyFactor: number } {
    const { alphaCarrier, penaltyFactor } = this.getConfig().fraud.totalScore;
    return { alpha: alphaCarrier, penaltyFactor };
  }

  // =========================================================================
  // RATE LIMIT GETTERS
  // =========================================================================

  /**
   * Rate-Limit für Endpoint abrufen
   */
  getRateLimit(endpoint: string): RateLimitConfig | undefined {
    const config = this.getConfig();
    
    // Exact match
    let rateLimit = config.rateLimits.find(r => r.endpoint === endpoint);
    
    if (!rateLimit) {
      // Pattern match (e.g., /pricing/:orderId/bid/validate)
      rateLimit = config.rateLimits.find(r => {
        const pattern = r.endpoint.replace(/:\w+/g, '[^/]+');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(endpoint);
      });
    }

    return rateLimit;
  }

  // =========================================================================
  // AUDIT CONFIG GETTERS
  // =========================================================================

  /**
   * Audit-Events abrufen
   */
  getAuditEvents(): string[] {
    return this.getConfig().audit.events;
  }

  /**
   * Prüfen ob Event geloggt werden soll
   */
  shouldAuditEvent(event: string): boolean {
    return this.getConfig().audit.events.includes(event);
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const securityConfig = SecurityConfigService.getInstance();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Schneller Authz-Check
 */
export function checkAuthz(request: AuthzCheckRequest): AuthzCheckResult {
  return securityConfig.checkAuthorization(request);
}

/**
 * Prüfen ob Permission existiert
 */
export function can(role: string, permission: string): boolean {
  return securityConfig.hasPermission(role, permission);
}
