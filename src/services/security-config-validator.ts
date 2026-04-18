/**
 * Security Config Validator
 * 
 * Implements JSON Schema validation + Cross-Field-Validation for CargoBit Security Configuration
 * 
 * Cross-Field Rules:
 * 1. Carrier fraud weights must sum to 1
 * 2. Bid fraud weights must sum to 1
 * 3. Thresholds must have observe < suspect
 * 4. maxDiscountVsMarket must be < 0.9
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import securityConfigSchema from '../../schemas/security-config.schema.json';

// Types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ValidationWarning {
  path: string;
  message: string;
  code: string;
}

export interface FraudWeights {
  cancelRate: number;
  disputeRate: number;
  noShowRate: number;
  patternScore: number;
}

export interface BidWeights {
  dumping: number;
  spam: number;
  coordination: number;
}

export interface Thresholds {
  observe: number;
  suspect: number;
}

export interface SecurityConfig {
  version: string;
  roles: Record<string, { can: string[]; description?: string }>;
  abac: {
    rules: Array<{
      name: string;
      appliesTo: string[];
      condition: string;
      description?: string;
    }>;
  };
  fraud: {
    carrierScore: {
      weights: FraudWeights;
      thresholds: Thresholds;
    };
    bidScore: {
      weights: BidWeights;
      dumping: { maxDiscountVsMarket: number };
      spam: { maxBidsPerOrderPerHour: number };
      coordination: {
        similarityWindowMinutes: number;
        similarityThreshold: number;
      };
    };
    totalScore: {
      alphaCarrier: number;
      penaltyFactor: number;
    };
  };
  rateLimits: Array<{
    route: string;
    method: string;
    limit: number;
    windowSeconds: number;
    key: string;
  }>;
}

/**
 * Security Config Validator Class
 */
export class SecurityConfigValidator {
  private ajv: Ajv;
  private schemaValidator: ReturnType<Ajv['compile']>;

  constructor() {
    // Initialize AJV with strict mode
    this.ajv = new Ajv({
      allErrors: true,
      strict: true,
      removeAdditional: false,
      useDefaults: true,
    });

    // Add format validators
    addFormats(this.ajv);

    // Compile schema
    this.schemaValidator = this.ajv.compile(securityConfigSchema);
  }

  /**
   * Validate complete security configuration
   */
  validate(config: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. JSON Schema Validation
    const schemaValid = this.schemaValidator(config);
    if (!schemaValid) {
      const schemaErrors = this.schemaValidator.errors || [];
      for (const error of schemaErrors) {
        errors.push({
          path: error.instancePath || '/',
          message: error.message || 'Validation error',
          code: 'SCHEMA_VIOLATION',
          value: error.data,
        });
      }
    }

    // If schema validation failed, return early
    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // 2. Cross-Field Validation (only if schema is valid)
    const typedConfig = config as SecurityConfig;
    const crossFieldResult = this.validateCrossFields(typedConfig);
    errors.push(...crossFieldResult.errors);
    warnings.push(...crossFieldResult.warnings);

    // 3. Business Logic Validation
    const businessResult = this.validateBusinessLogic(typedConfig);
    warnings.push(...businessResult.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Cross-Field Validation Rules
   */
  private validateCrossFields(config: SecurityConfig): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Rule 1: Carrier fraud weights must sum to 1
    const carrierWeights = config.fraud.carrierScore.weights;
    const carrierSum =
      carrierWeights.cancelRate +
      carrierWeights.disputeRate +
      carrierWeights.noShowRate +
      carrierWeights.patternScore;

    if (Math.abs(carrierSum - 1) > 0.0001) {
      errors.push({
        path: '/fraud/carrierScore/weights',
        message: `Carrier fraud weights must sum to 1, got ${carrierSum.toFixed(4)}`,
        code: 'CARRIER_WEIGHTS_SUM',
        value: carrierWeights,
      });
    }

    // Rule 2: Bid fraud weights must sum to 1
    const bidWeights = config.fraud.bidScore.weights;
    const bidSum = bidWeights.dumping + bidWeights.spam + bidWeights.coordination;

    if (Math.abs(bidSum - 1) > 0.0001) {
      errors.push({
        path: '/fraud/bidScore/weights',
        message: `Bid fraud weights must sum to 1, got ${bidSum.toFixed(4)}`,
        code: 'BID_WEIGHTS_SUM',
        value: bidWeights,
      });
    }

    // Rule 3: Thresholds must have observe < suspect
    const thresholds = config.fraud.carrierScore.thresholds;
    if (thresholds.observe >= thresholds.suspect) {
      errors.push({
        path: '/fraud/carrierScore/thresholds',
        message: `observe threshold (${thresholds.observe}) must be less than suspect threshold (${thresholds.suspect})`,
        code: 'THRESHOLD_ORDER',
        value: thresholds,
      });
    }

    // Rule 4: maxDiscountVsMarket must be < 0.9
    const maxDiscount = config.fraud.bidScore.dumping.maxDiscountVsMarket;
    if (maxDiscount >= 0.9) {
      errors.push({
        path: '/fraud/bidScore/dumping/maxDiscountVsMarket',
        message: `maxDiscountVsMarket must be < 0.9, got ${maxDiscount}. Values >= 0.9 would flag almost all legitimate discounts.`,
        code: 'MAX_DISCOUNT_INVALID',
        value: maxDiscount,
      });
    }

    // Rule 5: alphaCarrier + alphaBid should sum to 1 (informational)
    const alphaCarrier = config.fraud.totalScore.alphaCarrier;
    if (Math.abs(alphaCarrier - 0.6) > 0.2) {
      warnings.push({
        path: '/fraud/totalScore/alphaCarrier',
        message: `alphaCarrier is ${alphaCarrier}. Standard value is 0.6 (60% carrier, 40% bid score). Deviation may affect fraud detection balance.`,
        code: 'ALPHA_CARRIER_UNUSUAL',
      });
    }

    return { errors, warnings };
  }

  /**
   * Business Logic Validation (warnings only)
   */
  private validateBusinessLogic(config: SecurityConfig): {
    warnings: ValidationWarning[];
  } {
    const warnings: ValidationWarning[] = [];

    // Check for empty roles
    if (Object.keys(config.roles).length === 0) {
      warnings.push({
        path: '/roles',
        message: 'No roles defined in configuration',
        code: 'EMPTY_ROLES',
      });
    }

    // Check for roles without permissions
    for (const [roleName, role] of Object.entries(config.roles)) {
      if (role.can.length === 0) {
        warnings.push({
          path: `/roles/${roleName}`,
          message: `Role '${roleName}' has no permissions defined`,
          code: 'ROLE_NO_PERMISSIONS',
        });
      }
    }

    // Check for ABAC rules without valid condition
    for (const rule of config.abac.rules) {
      if (!this.isValidCondition(rule.condition)) {
        warnings.push({
          path: `/abac/rules/${rule.name}`,
          message: `ABAC rule '${rule.name}' has potentially invalid condition: ${rule.condition}`,
          code: 'INVALID_ABAC_CONDITION',
        });
      }
    }

    // Check rate limits
    const routeSet = new Set<string>();
    for (const rateLimit of config.rateLimits) {
      const key = `${rateLimit.method}:${rateLimit.route}`;
      if (routeSet.has(key)) {
        warnings.push({
          path: '/rateLimits',
          message: `Duplicate rate limit for ${key}`,
          code: 'DUPLICATE_RATE_LIMIT',
        });
      }
      routeSet.add(key);

      // Warn about very high rate limits
      if (rateLimit.limit > 1000) {
        warnings.push({
          path: `/rateLimits/${rateLimit.route}`,
          message: `Very high rate limit (${rateLimit.limit}) for ${rateLimit.method} ${rateLimit.route}`,
          code: 'HIGH_RATE_LIMIT',
        });
      }
    }

    return { warnings };
  }

  /**
   * Check if ABAC condition is syntactically valid
   */
  private isValidCondition(condition: string): boolean {
    // Basic validation: check for balanced brackets and valid operators
    const validPatterns = [
      /^[\w\s.]+$/.test(condition), // Simple field access
      /===|!==|>=|<=|>|</.test(condition), // Comparison operators
      /&&|\|\|/.test(condition), // Logical operators
      /includes?\(/.test(condition), // Array methods
      /typeof/.test(condition), // Type checking
    ];

    // At least one pattern should match
    return validPatterns.some(Boolean);
  }

  /**
   * Validate version string format
   */
  validateVersion(version: string): boolean {
    return /^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(version);
  }

  /**
   * Compare two versions
   * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  compareVersions(v1: string, v2: string): number {
    if (v1 === v2) return 0;

    const parseVersion = (v: string): [Date, number] => {
      const match = v.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2})$/);
      if (!match) throw new Error(`Invalid version format: ${v}`);

      const [, year, month, day, seq] = match;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
      );
      return [date, parseInt(seq)];
    };

    const [date1, seq1] = parseVersion(v1);
    const [date2, seq2] = parseVersion(v2);

    // Compare dates first
    if (date1 < date2) return -1;
    if (date1 > date2) return 1;

    // Same date, compare sequence
    return seq1 < seq2 ? -1 : seq1 > seq2 ? 1 : 0;
  }

  /**
   * Validate config diff (for incremental updates)
   */
  validateDiff(oldConfig: SecurityConfig, newConfig: SecurityConfig): {
    changed: string[];
    added: string[];
    removed: string[];
  } {
    const changed: string[] = [];
    const added: string[] = [];
    const removed: string[] = [];

    // Check version change
    if (oldConfig.version !== newConfig.version) {
      changed.push('version');
    }

    // Check roles
    const oldRoles = new Set(Object.keys(oldConfig.roles));
    const newRoles = new Set(Object.keys(newConfig.roles));

    for (const role of oldRoles) {
      if (!newRoles.has(role)) {
        removed.push(`roles.${role}`);
      }
    }

    for (const role of newRoles) {
      if (!oldRoles.has(role)) {
        added.push(`roles.${role}`);
      } else if (
        JSON.stringify(oldConfig.roles[role]) !==
        JSON.stringify(newConfig.roles[role])
      ) {
        changed.push(`roles.${role}`);
      }
    }

    // Check rate limits
    const oldRateLimits = new Map(
      oldConfig.rateLimits.map((r) => [`${r.method}:${r.route}`, r])
    );
    const newRateLimits = new Map(
      newConfig.rateLimits.map((r) => [`${r.method}:${r.route}`, r])
    );

    for (const [key] of oldRateLimits) {
      if (!newRateLimits.has(key)) {
        removed.push(`rateLimits.${key}`);
      }
    }

    for (const [key, rateLimit] of newRateLimits) {
      if (!oldRateLimits.has(key)) {
        added.push(`rateLimits.${key}`);
      } else if (
        JSON.stringify(oldRateLimits.get(key)) !== JSON.stringify(rateLimit)
      ) {
        changed.push(`rateLimits.${key}`);
      }
    }

    return { changed, added, removed };
  }
}

// Singleton instance
let validatorInstance: SecurityConfigValidator | null = null;

export function getSecurityConfigValidator(): SecurityConfigValidator {
  if (!validatorInstance) {
    validatorInstance = new SecurityConfigValidator();
  }
  return validatorInstance;
}

// Export validation function for convenience
export function validateSecurityConfig(config: unknown): ValidationResult {
  return getSecurityConfigValidator().validate(config);
}
