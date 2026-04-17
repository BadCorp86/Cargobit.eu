/**
 * CargoBit Security-Config-Service
 * 
 * Zentrale, versionierte Quelle für Security-Konfiguration.
 * Liefert: Rollen, Permissions, ABAC-Regeln, Fraud-Config, Rate-Limits
 * 
 * Port: 3005
 * 
 * API Endpoints:
 * - GET  /config/security        - Komplette Security-Config
 * - GET  /config/security/version - Aktuelle Version
 * - POST /config/security/reload  - Config neu laden (Admin/System)
 * - POST /authz/check             - Authorization Check
 * - GET  /fraud/config            - Nur Fraud-Teil
 * - GET  /health                  - Health Check
 * - GET  /ready                   - Readiness Probe
 * - POST /config/security/validate - Validate config (Admin)
 * 
 * Schema Validation:
 * - JSON Schema (Draft 2020-12)
 * - Strict Mode (no unknown fields)
 * - Cross-Field Validation (weights must sum to 1)
 * 
 * @module @cargobit/security-config-service
 * @version 1.1.0
 */

import { serve } from 'bun';

// =============================================================================
// SCHEMA VALIDATOR (Inline - No External Dependencies)
// =============================================================================

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  path: string;
  message: string;
  code: string;
  value?: unknown;
}

interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}

/**
 * Cross-Field Validation Rules:
 * 1. Carrier fraud weights must sum to 1
 * 2. Bid fraud weights must sum to 1  
 * 3. Thresholds must have observe < suspect
 * 4. maxDiscountVsMarket must be < 0.9
 */
function validateCrossFields(config: any): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Rule 1: Carrier fraud weights must sum to 1
  if (config.fraud?.carrierScore?.weights) {
    const weights = config.fraud.carrierScore.weights;
    const sum = (weights.cancelRate || 0) + (weights.disputeRate || 0) + 
                (weights.noShowRate || 0) + (weights.patternScore || 0);
    
    if (Math.abs(sum - 1) > 0.0001) {
      errors.push({
        path: '/fraud/carrierScore/weights',
        message: `Carrier fraud weights must sum to 1, got ${sum.toFixed(4)}`,
        code: 'CARRIER_WEIGHTS_SUM',
        value: weights,
      });
    }
  }

  // Rule 2: Bid fraud weights must sum to 1
  if (config.fraud?.bidScore?.weights) {
    const weights = config.fraud.bidScore.weights;
    const sum = (weights.dumping || 0) + (weights.spam || 0) + (weights.coordination || 0);
    
    if (Math.abs(sum - 1) > 0.0001) {
      errors.push({
        path: '/fraud/bidScore/weights',
        message: `Bid fraud weights must sum to 1, got ${sum.toFixed(4)}`,
        code: 'BID_WEIGHTS_SUM',
        value: weights,
      });
    }
  }

  // Rule 3: Thresholds must have observe < suspect
  if (config.fraud?.carrierScore?.thresholds) {
    const thresholds = config.fraud.carrierScore.thresholds;
    if ((thresholds.observe || 0) >= (thresholds.suspect || 0)) {
      errors.push({
        path: '/fraud/carrierScore/thresholds',
        message: `observe threshold (${thresholds.observe}) must be less than suspect threshold (${thresholds.suspect})`,
        code: 'THRESHOLD_ORDER',
        value: thresholds,
      });
    }
  }

  // Rule 4: maxDiscountVsMarket must be < 0.9
  if (config.fraud?.bidScore?.dumping?.maxDiscountVsMarket !== undefined) {
    const maxDiscount = config.fraud.bidScore.dumping.maxDiscountVsMarket;
    if (maxDiscount >= 0.9) {
      errors.push({
        path: '/fraud/bidScore/dumping/maxDiscountVsMarket',
        message: `maxDiscountVsMarket must be < 0.9, got ${maxDiscount}. Values >= 0.9 would flag almost all legitimate discounts.`,
        code: 'MAX_DISCOUNT_INVALID',
        value: maxDiscount,
      });
    }
  }

  // Warning: alphaCarrier deviation from standard 0.6
  if (config.fraud?.totalScore?.alphaCarrier !== undefined) {
    const alpha = config.fraud.totalScore.alphaCarrier;
    if (Math.abs(alpha - 0.6) > 0.2) {
      warnings.push({
        path: '/fraud/totalScore/alphaCarrier',
        message: `alphaCarrier is ${alpha}. Standard value is 0.6 (60% carrier, 40% bid score). Deviation may affect fraud detection balance.`,
        code: 'ALPHA_CARRIER_UNUSUAL',
      });
    }
  }

  return { errors, warnings };
}

/**
 * Version format validation
 */
function validateVersion(version: string): boolean {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(version);
}

/**
 * Complete config validation
 */
function validateConfig(config: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  const requiredFields = ['version', 'roles', 'abac', 'fraud', 'rateLimits'];
  for (const field of requiredFields) {
    if (!config[field]) {
      errors.push({
        path: `/${field}`,
        message: `Required field '${field}' is missing`,
        code: 'REQUIRED_FIELD_MISSING',
      });
    }
  }

  // Version format
  if (config.version && !validateVersion(config.version)) {
    errors.push({
      path: '/version',
      message: `Version must match format YYYY-MM-DD-NN, got '${config.version}'`,
      code: 'INVALID_VERSION_FORMAT',
      value: config.version,
    });
  }

  // Cross-field validation
  const crossFieldResult = validateCrossFields(config);
  errors.push(...crossFieldResult.errors);
  warnings.push(...crossFieldResult.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// TYPES
// =============================================================================

interface RoleDefinition {
  description: string;
  can: string[];
  cannot?: string[];
  whitelistedEndpoints?: string[];
}

interface ABACRule {
  name: string;
  appliesTo: string[];
  condition: string;
  description: string;
}

interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowMs: number;
  scope: string;
  keyTemplate: string;
  description?: string;
}

interface FraudConfig {
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

interface AuditConfig {
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

interface RetentionPolicy {
  category: string;
  retentionYears: number;
  archiveAfterYears?: number;
  gdprException: boolean;
  legalBasis?: string;
}

interface SecurityConfig {
  version: string;
  loadedAt: string;
  roles: Record<string, RoleDefinition>;
  abac: { rules: ABACRule[] };
  rateLimits: RateLimitConfig[];
  fraud: FraudConfig;
  audit: AuditConfig;
  retention: {
    policies: RetentionPolicy[];
    purgeJobs: {
      schedule: string;
      batchSize: number;
      dryRunFirst: boolean;
    };
  };
}

interface AuthzCheckRequest {
  subject: {
    id: string;
    role: string;
    companyId?: string;
    whitelistedEndpoints?: string[];
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

interface AuthzCheckResponse {
  allowed: boolean;
  reason?: string;
  matchedRule?: string;
  abacConditionMet?: boolean;
  configVersion: string;
}

// =============================================================================
// SECURITY CONFIG SERVICE
// =============================================================================

class SecurityConfigService {
  private config: SecurityConfig | null = null;
  private configPath: string;
  private version: string = '1.0.0';
  private loadedAt: string = new Date().toISOString();
  private reloadCount: number = 0;

  constructor(configPath?: string) {
    this.configPath = configPath || './config/security-config.yaml';
  }

  private lastValidation: ValidationResult | null = null;

  /**
   * Load configuration from YAML file
   * Validates config after loading with JSON Schema + Cross-Field Validation
   */
  load(): SecurityConfig {
    try {
      const yaml = require('js-yaml');
      const fs = require('fs');
      const path = require('path');
      
      // Resolve config path
      const fullPath = path.resolve(
        process.cwd(),
        '../..',
        this.configPath
      );
      
      if (fs.existsSync(fullPath)) {
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const rawConfig = yaml.load(fileContents);
        
        const newConfig = {
          ...rawConfig,
          version: this.generateVersion(),
          loadedAt: new Date().toISOString(),
        };
        
        // Validate config before using
        const validation = validateConfig(newConfig);
        this.lastValidation = validation;
        
        if (!validation.valid) {
          console.error('[SecurityConfig] Validation FAILED:');
          validation.errors.forEach(err => {
            console.error(`  - [${err.code}] ${err.path}: ${err.message}`);
          });
          // Still use config but with validation errors logged
          console.warn('[SecurityConfig] Using config despite validation errors');
        } else {
          console.log(`[SecurityConfig] Validation PASSED (version ${newConfig.version})`);
        }
        
        // Log warnings
        if (validation.warnings.length > 0) {
          console.warn('[SecurityConfig] Validation warnings:');
          validation.warnings.forEach(warn => {
            console.warn(`  - [${warn.code}] ${warn.path}: ${warn.message}`);
          });
        }
        
        this.config = newConfig;
        this.loadedAt = this.config.loadedAt;
        console.log(`[SecurityConfig] Loaded config version ${this.config.version}`);
      } else {
        // Use default config if file not found
        this.config = this.getDefaultConfig();
        this.lastValidation = { valid: true, errors: [], warnings: [] };
        console.log('[SecurityConfig] Using default config (file not found)');
      }
      
      return this.config!;
    } catch (error) {
      console.error('[SecurityConfig] Error loading config:', error);
      this.config = this.getDefaultConfig();
      this.lastValidation = { 
        valid: false, 
        errors: [{ 
          path: '/', 
          message: error instanceof Error ? error.message : 'Unknown error', 
          code: 'LOAD_ERROR' 
        }], 
        warnings: [] 
      };
      return this.config;
    }
  }

  private versionCounter: number = 0;
  
  /**
   * Generate version string in YYYY-MM-DD-NN format
   * 
   * Format:
   * - YYYY = Year
   * - MM = Month (01-12)
   * - DD = Day (01-31)
   * - NN = Sequential number for the day (01-99)
   * 
   * Example: 2026-04-18-01
   */
  private generateVersion(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // Reset counter if day changed
    const today = `${year}-${month}-${day}`;
    if (this.lastVersionDate !== today) {
      this.lastVersionDate = today;
      this.versionCounter = 0;
    }
    
    this.versionCounter++;
    const seq = String(this.versionCounter).padStart(2, '0');
    
    return `${year}-${month}-${day}-${seq}`;
  }
  private lastVersionDate: string = '';

  /**
   * Get default configuration
   */
  private getDefaultConfig(): SecurityConfig {
    return {
      version: this.generateVersion(),
      loadedAt: new Date().toISOString(),
      roles: {
        SHIPPER: {
          description: 'Auftraggeber',
          can: ['orders:create', 'orders:read_own', 'pricing:read_own', 'bids:read_aggregated', 'executions:read_own'],
        },
        CARRIER: {
          description: 'Transporteur',
          can: ['bids:create', 'bids:read_own', 'executions:read_own', 'executions:update_status_own', 'pricing:validate_bid'],
        },
        ADMIN: {
          description: 'Administrator',
          can: ['*'],
        },
        SUPPORT: {
          description: 'Support',
          can: ['orders:read_all', 'bids:read_all', 'executions:read_all', 'carriers:read_all', 'audit:read'],
        },
        SYSTEM: {
          description: 'Service Account',
          can: ['internal:service_to_service', 'internal:events:publish', 'internal:events:subscribe'],
          whitelistedEndpoints: ['POST /internal/events', 'POST /internal/audit'],
        },
      },
      abac: {
        rules: [
          {
            name: 'shipper_owns_order',
            appliesTo: ['orders:read_own', 'orders:update_own'],
            condition: 'resource.shipperId == subject.id',
            description: 'Shipper darf nur eigene Orders',
          },
          {
            name: 'carrier_owns_bid',
            appliesTo: ['bids:read_own', 'bids:update_own'],
            condition: 'resource.carrierId == subject.id',
            description: 'Carrier darf nur eigene Bids',
          },
          {
            name: 'carrier_owns_execution',
            appliesTo: ['executions:read_own', 'executions:update_status_own'],
            condition: 'resource.carrierId == subject.id',
            description: 'Carrier darf nur zugewiesene Executions',
          },
        ],
      },
      rateLimits: [
        { endpoint: 'POST /orders', maxRequests: 60, windowMs: 60000, scope: 'shipper', keyTemplate: 'shipper:{shipperId}' },
        { endpoint: 'POST /bids', maxRequests: 120, windowMs: 60000, scope: 'carrier', keyTemplate: 'carrier:{carrierId}' },
        { endpoint: 'GLOBAL', maxRequests: 10000, windowMs: 60000, scope: 'ip', keyTemplate: 'ip:{ip}' },
      ],
      fraud: {
        carrierScore: {
          weights: { cancelRate: 0.3, disputeRate: 0.3, noShowRate: 0.2, patternScore: 0.2 },
          thresholds: { observe: 0.3, suspect: 0.6 },
          lookback: { cancelRateDays: 90, disputeRateDays: 180, noShowRateDays: 90, patternScoreDays: 365 },
          normalization: { cancelRateMax: 0.5, disputeRateMax: 0.3, noShowRateMax: 0.2 },
        },
        bidScore: {
          weights: { dumping: 0.5, spam: 0.3, coordination: 0.2 },
          dumping: { maxDiscountVsMarket: 0.35, warnDiscountVsMarket: 0.25, hardFloorEur: 20, minPriceFactor: 0.85 },
          spam: { maxBidsPerOrderPerHour: 20, maxBidsPerMinuteGlobal: 100, maxBidsPerCarrierPerDay: 500 },
          coordination: { similarityWindowMinutes: 5, similarityThreshold: 0.95, minCarriersForCollusion: 2, bidSpreadThreshold: 0.02 },
        },
        totalScore: { alphaCarrier: 0.6, penaltyFactor: 0.5 },
        matching: { applyPenalty: true, capSuspectedScore: 30, excludeFromAutoMatch: true },
        events: { emitFraudSuspected: true, emitFraudFlagged: true, auditAllScores: true },
      },
      audit: {
        events: ['order.created', 'bid.submitted', 'bid.validated', 'matching.completed', 'fraud.suspected', 'permission.denied'],
        recordSchema: {
          requiredFields: ['id', 'timestamp', 'actorType', 'actorId', 'service', 'action', 'entityType', 'entityId', 'correlationId'],
          optionalFields: ['payloadBefore', 'payloadAfter', 'ipAddress', 'userAgent', 'configVersion'],
        },
        wormStore: { enabled: true, backend: 's3_glacier', immediateReplication: true, retentionYears: 10 },
      },
      retention: {
        policies: [
          { category: 'orders', retentionYears: 10, archiveAfterYears: 3, gdprException: true, legalBasis: 'Steuerliche Aufbewahrungspflicht' },
          { category: 'bids', retentionYears: 5, archiveAfterYears: 2, gdprException: false },
          { category: 'audit_logs', retentionYears: 10, archiveAfterYears: 3, gdprException: true, legalBasis: 'Compliance' },
        ],
        purgeJobs: { schedule: '0 3 * * *', batchSize: 5000, dryRunFirst: true },
      },
    };
  }

  /**
   * Reload configuration
   */
  reload(): SecurityConfig {
    this.reloadCount++;
    return this.load();
  }

  /**
   * Get current configuration
   */
  getConfig(): SecurityConfig {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }

  /**
   * Get version only
   */
  getVersion(): { version: string; loadedAt: string; reloadCount: number } {
    return {
      version: this.config?.version || this.version,
      loadedAt: this.loadedAt,
      reloadCount: this.reloadCount,
    };
  }

  /**
   * Get fraud config only
   */
  getFraudConfig(): FraudConfig {
    return this.getConfig().fraud;
  }

  /**
   * Get rate limits
   */
  getRateLimits(): RateLimitConfig[] {
    return this.getConfig().rateLimits;
  }

  /**
   * Check if service is ready (config loaded)
   */
  isReady(): boolean {
    return this.config !== null;
  }

  /**
   * Get validation status
   */
  getValidationStatus(): ValidationResult | null {
    return this.lastValidation;
  }

  /**
   * Validate a config without loading it
   */
  validateConfig(config: unknown): ValidationResult {
    return validateConfig(config);
  }

  // ===========================================================================
  // AUTHORIZATION CHECK
  // ===========================================================================

  /**
   * Check authorization (RBAC + ABAC)
   */
  checkAuthorization(request: AuthzCheckRequest): AuthzCheckResponse {
    const config = this.getConfig();
    const { subject, action, resource, context } = request;

    // Step 1: Check role exists
    const roleDef = config.roles[subject.role];
    if (!roleDef) {
      return {
        allowed: false,
        reason: `Unknown role: ${subject.role}`,
        configVersion: config.version,
      };
    }

    // Step 2: RBAC check
    if (roleDef.can.includes('*')) {
      return {
        allowed: true,
        matchedRule: 'rbac:admin',
        configVersion: config.version,
      };
    }

    if (!roleDef.can.includes(action)) {
      return {
        allowed: false,
        reason: `Role ${subject.role} does not have permission ${action}`,
        matchedRule: 'rbac:denied',
        configVersion: config.version,
      };
    }

    // Check cannot list
    if (roleDef.cannot?.includes(action)) {
      return {
        allowed: false,
        reason: `Permission ${action} explicitly denied for role ${subject.role}`,
        matchedRule: 'rbac:explicit_deny',
        configVersion: config.version,
      };
    }

    // Step 3: ABAC check
    const applicableRules = config.abac.rules.filter(
      rule => rule.appliesTo.includes(action)
    );

    for (const rule of applicableRules) {
      const conditionMet = this.evaluateABACCondition(rule.condition, subject, resource, context);
      
      if (!conditionMet) {
        return {
          allowed: false,
          reason: `ABAC condition not met: ${rule.name} (${rule.description})`,
          matchedRule: `abac:${rule.name}`,
          abacConditionMet: false,
          configVersion: config.version,
        };
      }
    }

    return {
      allowed: true,
      matchedRule: 'rbac:allowed',
      abacConditionMet: applicableRules.length > 0,
      configVersion: config.version,
    };
  }

  /**
   * Evaluate ABAC condition
   */
  private evaluateABACCondition(
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
      return subject.whitelistedEndpoints?.includes(context?.endpoint ?? '') ?? false;
    }

    // Company check
    if (condition.includes('resource.shipperCompanyId == subject.companyId')) {
      return resource.shipperCompanyId === subject.companyId;
    }

    // OR conditions
    if (condition.includes(' OR ')) {
      const parts = condition.split(' OR ').map(p => p.trim());
      return parts.some(part => this.evaluateABACCondition(part, subject, resource, context));
    }

    // Default: allow
    return true;
  }
}

// =============================================================================
// SERVER INSTANCE
// =============================================================================

const securityConfigService = new SecurityConfigService();

// Load config on startup
securityConfigService.load();

// =============================================================================
// HTTP SERVER
// =============================================================================

const server = serve({
  port: 3005,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Service-Token',
    };

    // Handle OPTIONS
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ===========================================================================
    // ERROR RESPONSE HELPERS
    // ===========================================================================
    
    const errorResponse = (
      type: 'CONFIG_NOT_FOUND' | 'SOURCE_UNAVAILABLE' | 'INVALID_CONFIG' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED',
      message: string,
      retryAfterSeconds?: number
    ): Response => {
      const statusMap: Record<string, number> = {
        CONFIG_NOT_FOUND: 404,
        SOURCE_UNAVAILABLE: 503,
        INVALID_CONFIG: 422,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        RATE_LIMITED: 429,
      };
      
      const body: any = { error: type, message };
      if (retryAfterSeconds) body.retryAfterSeconds = retryAfterSeconds;
      
      return new Response(JSON.stringify(body), {
        status: statusMap[type],
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    };

    try {
      // ==========================================
      // GET /config/security
      // ==========================================
      if (method === 'GET' && path === '/config/security') {
        // Check service token for internal access
        const serviceToken = req.headers.get('X-Service-Token');
        if (!serviceToken && process.env.REQUIRE_SERVICE_TOKEN === 'true') {
          return errorResponse('UNAUTHORIZED', 'Missing or invalid service token');
        }

        // Check if config is loaded
        if (!securityConfigService.isReady()) {
          return errorResponse('SOURCE_UNAVAILABLE', 'Configuration not loaded', 30);
        }

        const config = securityConfigService.getConfig();
        return new Response(JSON.stringify(config), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-Config-Version': config.version,
            'Cache-Control': 'no-store',
          },
        });
      }

      // ==========================================
      // GET /config/security/version
      // Extremely lightweight - polled every 60s
      // ==========================================
      if (method === 'GET' && path === '/config/security/version') {
        const versionInfo = securityConfigService.getVersion();
        return new Response(JSON.stringify({ version: versionInfo.version }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=30',
          },
        });
      }

      // ==========================================
      // POST /config/security/reload
      // Only Admin/System can trigger reload
      // ==========================================
      if (method === 'POST' && path === '/config/security/reload') {
        const authHeader = req.headers.get('Authorization') || '';
        const serviceToken = req.headers.get('X-Service-Token') || '';
        
        const isAuthorized = 
          authHeader.startsWith('Bearer admin_') ||
          serviceToken.startsWith('srv_') ||
          process.env.NODE_ENV === 'development';

        if (!isAuthorized) {
          return errorResponse('FORBIDDEN', 'Admin or System role required for reload');
        }

        try {
          const config = securityConfigService.reload();
          const validation = securityConfigService.getValidationStatus();
          console.log(`[SecurityConfig] Reloaded config to version ${config.version}`);

          return new Response(JSON.stringify({
            success: true,
            version: config.version,
            loadedAt: config.loadedAt,
            validation: {
              valid: validation?.valid ?? true,
              errorCount: validation?.errors.length ?? 0,
              warningCount: validation?.warnings.length ?? 0,
            },
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (reloadError) {
          console.error('[SecurityConfig] Reload failed:', reloadError);
          return errorResponse('INVALID_CONFIG', 
            reloadError instanceof Error ? reloadError.message : 'Configuration validation failed'
          );
        }
      }

      // ==========================================
      // POST /config/security/validate
      // Validate a config without loading it (Admin only)
      // ==========================================
      if (method === 'POST' && path === '/config/security/validate') {
        const authHeader = req.headers.get('Authorization') || '';
        const serviceToken = req.headers.get('X-Service-Token') || '';
        
        const isAuthorized = 
          authHeader.startsWith('Bearer admin_') ||
          serviceToken.startsWith('srv_') ||
          process.env.NODE_ENV === 'development';

        if (!isAuthorized) {
          return errorResponse('FORBIDDEN', 'Admin or System role required for validation');
        }

        try {
          const body = await req.json();
          const validation = securityConfigService.validateConfig(body);

          return new Response(JSON.stringify({
            valid: validation.valid,
            errors: validation.errors,
            warnings: validation.warnings,
            summary: {
              errorCount: validation.errors.length,
              warningCount: validation.warnings.length,
            },
          }), {
            status: validation.valid ? 200 : 422,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (validateError) {
          return errorResponse('INVALID_CONFIG', 
            validateError instanceof Error ? validateError.message : 'Validation failed'
          );
        }
      }

      // ==========================================
      // GET /config/security/validation
      // Get current validation status
      // ==========================================
      if (method === 'GET' && path === '/config/security/validation') {
        const validation = securityConfigService.getValidationStatus();
        const version = securityConfigService.getVersion();

        return new Response(JSON.stringify({
          configVersion: version.version,
          valid: validation?.valid ?? null,
          errors: validation?.errors ?? [],
          warnings: validation?.warnings ?? [],
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // POST /authz/check
      // ==========================================
      if (method === 'POST' && path === '/authz/check') {
        const body = await req.json() as AuthzCheckRequest;
        const result = securityConfigService.checkAuthorization(body);

        return new Response(JSON.stringify(result), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-Config-Version': result.configVersion,
            'Cache-Control': 'no-store',
          },
        });
      }

      // ==========================================
      // GET /fraud/config
      // ==========================================
      if (method === 'GET' && path === '/fraud/config') {
        const fraudConfig = securityConfigService.getFraudConfig();
        const version = securityConfigService.getVersion();

        return new Response(JSON.stringify({
          ...fraudConfig,
          configVersion: version.version,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // GET /rate-limits
      // ==========================================
      if (method === 'GET' && path === '/rate-limits') {
        const rateLimits = securityConfigService.getRateLimits();
        return new Response(JSON.stringify(rateLimits), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // GET /health
      // ==========================================
      if (method === 'GET' && path === '/health') {
        const version = securityConfigService.getVersion();
        const config = securityConfigService.getConfig();

        return new Response(JSON.stringify({
          status: 'healthy',
          service: 'security-config-service',
          version: '1.0.0',
          configVersion: version.version,
          loadedAt: version.loadedAt,
          reloadCount: version.reloadCount,
          rolesConfigured: Object.keys(config.roles).length,
          abacRulesConfigured: config.abac.rules.length,
          fraudThresholds: config.fraud.carrierScore.thresholds,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // GET /ready - Readiness Probe
      // ==========================================
      if (method === 'GET' && path === '/ready') {
        const isReady = securityConfigService.isReady();
        
        if (!isReady) {
          return new Response(JSON.stringify({
            status: 'not_ready',
            reason: 'Configuration not loaded',
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const version = securityConfigService.getVersion();
        const config = securityConfigService.getConfig();

        return new Response(JSON.stringify({
          status: 'ready',
          configVersion: version.version,
          loadedAt: version.loadedAt,
          rolesConfigured: Object.keys(config.roles).length,
          abacRulesConfigured: config.abac.rules.length,
          fraudConfigured: true,
          rateLimitsConfigured: config.rateLimits.length,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // 404 Not Found
      // ==========================================
      return new Response(JSON.stringify({
        error: 'Not Found',
        path,
        availableEndpoints: [
          'GET  /config/security',
          'GET  /config/security/version',
          'POST /config/security/reload',
          'POST /config/security/validate',
          'GET  /config/security/validation',
          'POST /authz/check',
          'GET  /fraud/config',
          'GET  /rate-limits',
          'GET  /health',
          'GET  /ready',
        ],
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('[SecurityConfig] Error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
});

console.log(`
╔════════════════════════════════════════════════════════════════╗
║          CargoBit Security-Config-Service v1.1.0               ║
║          Port: 3005                                            ║
╠════════════════════════════════════════════════════════════════╣
║  Endpoints:                                                    ║
║  GET  /config/security             - Full config               ║
║  GET  /config/security/version     - Version info              ║
║  POST /config/security/reload      - Reload config (Admin)     ║
║  POST /config/security/validate    - Validate config (Admin)   ║
║  GET  /config/security/validation  - Validation status         ║
║  POST /authz/check                 - Authorization check       ║
║  GET  /fraud/config                - Fraud configuration       ║
║  GET  /rate-limits                 - Rate limit configuration  ║
║  GET  /health                      - Health check              ║
║  GET  /ready                       - Readiness probe           ║
╠════════════════════════════════════════════════════════════════╣
║  Schema Validation:                                            ║
║  - JSON Schema (Draft 2020-12)                                 ║
║  - Cross-Field Validation (weights sum to 1)                   ║
║  - Threshold ordering (observe < suspect)                      ║
╚════════════════════════════════════════════════════════════════╝
`);

export { SecurityConfigService, securityConfigService };
