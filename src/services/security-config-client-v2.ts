/**
 * CargoBit Security-Config-Client
 * 
 * Advanced client with:
 * - Circuit Breaker pattern
 * - Exponential backoff retry
 * - Cache fallback strategy
 * - Version-based updates
 * - Timeout handling
 * 
 * @module @cargobit/security-config-client
 * @version 2.0.0
 */

// =============================================================================
// TYPES
// =============================================================================

export interface RoleDefinition {
  description: string;
  can: string[];
  cannot?: string[];
  whitelistedEndpoints?: string[];
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
    weights: { cancelRate: number; disputeRate: number; noShowRate: number; patternScore: number };
    thresholds: { observe: number; suspect: number };
    lookback: { cancelRateDays: number; disputeRateDays: number; noShowRateDays: number; patternScoreDays: number };
    normalization: { cancelRateMax: number; disputeRateMax: number; noShowRateMax: number };
  };
  bidScore: {
    weights: { dumping: number; spam: number; coordination: number };
    dumping: { maxDiscountVsMarket: number; warnDiscountVsMarket: number; hardFloorEur: number; minPriceFactor: number };
    spam: { maxBidsPerOrderPerHour: number; maxBidsPerMinuteGlobal: number; maxBidsPerCarrierPerDay: number };
    coordination: { similarityWindowMinutes: number; similarityThreshold: number; minCarriersForCollusion: number; bidSpreadThreshold: number };
  };
  totalScore: { alphaCarrier: number; penaltyFactor: number };
  matching: { applyPenalty: boolean; capSuspectedScore: number; excludeFromAutoMatch: boolean };
  events: { emitFraudSuspected: boolean; emitFraudFlagged: boolean; auditAllScores: boolean };
}

export interface SecurityConfig {
  version: string;
  loadedAt: string;
  roles: Record<string, RoleDefinition>;
  abac: { rules: ABACRule[] };
  rateLimits: RateLimitConfig[];
  fraud: FraudConfig;
  audit: {
    events: string[];
    recordSchema: { requiredFields: string[]; optionalFields: string[] };
    wormStore: { enabled: boolean; backend: string; immediateReplication: boolean; retentionYears: number };
  };
  retention: {
    policies: Array<{
      category: string;
      retentionYears: number;
      archiveAfterYears?: number;
      gdprException: boolean;
      legalBasis?: string;
    }>;
    purgeJobs: { schedule: string; batchSize: number; dryRunFirst: boolean };
  };
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export type SecurityConfigErrorType =
  | 'CONFIG_NOT_FOUND'
  | 'SOURCE_UNAVAILABLE'
  | 'INVALID_CONFIG'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR';

export interface SecurityConfigError {
  type: SecurityConfigErrorType;
  message: string;
  retryAfterSeconds?: number;
  httpStatus: number;
}

export class SecurityConfigServiceError extends Error {
  public readonly type: SecurityConfigErrorType;
  public readonly httpStatus: number;
  public readonly retryAfterSeconds?: number;

  constructor(error: SecurityConfigError) {
    super(error.message);
    this.name = 'SecurityConfigServiceError';
    this.type = error.type;
    this.httpStatus = error.httpStatus;
    this.retryAfterSeconds = error.retryAfterSeconds;
  }

  static fromResponse(status: number, body: any): SecurityConfigServiceError {
    const errorMap: Record<number, SecurityConfigErrorType> = {
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'CONFIG_NOT_FOUND',
      422: 'INVALID_CONFIG',
      429: 'RATE_LIMITED',
      503: 'SOURCE_UNAVAILABLE',
    };

    return new SecurityConfigServiceError({
      type: errorMap[status] || 'NETWORK_ERROR',
      message: body?.message || body?.error || 'Unknown error',
      httpStatus: status,
      retryAfterSeconds: body?.retryAfterSeconds,
    });
  }
}

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
}

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;
  
  constructor(private config: CircuitBreakerConfig) {}
  
  canExecute(): boolean {
    if (this.state === 'closed') return true;
    
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.resetTimeoutMs) {
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
        return true;
      }
      return false;
    }
    
    // half-open
    return this.halfOpenAttempts < this.config.halfOpenMaxAttempts;
  }
  
  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
    this.halfOpenAttempts = 0;
  }
  
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        this.state = 'open';
      }
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }
  
  getState(): CircuitState {
    return this.state;
  }
  
  getStats(): { state: CircuitState; failureCount: number } {
    return { state: this.state, failureCount: this.failureCount };
  }
}

// =============================================================================
// CLIENT OPTIONS
// =============================================================================

export interface SecurityConfigClientOptions {
  /** URL des Security-Config-Service */
  baseUrl: string;
  
  /** Service-Token für Authentifizierung */
  serviceToken?: string;
  
  /** Version check interval in ms (default: 60000) */
  checkIntervalMs?: number;
  
  /** Timeout für /version endpoint (default: 300ms) */
  versionTimeoutMs?: number;
  
  /** Timeout für /config/security endpoint (default: 800ms) */
  configTimeoutMs?: number;
  
  /** Max retries for version check (default: 3) */
  versionMaxRetries?: number;
  
  /** Max retries for config fetch (default: 2) */
  configMaxRetries?: number;
  
  /** Initial backoff for retries in ms (default: 200) */
  initialBackoffMs?: number;
  
  /** Circuit breaker config */
  circuitBreaker?: {
    failureThreshold?: number;
    resetTimeoutMs?: number;
  };
  
  /** Enable debug logging */
  debug?: boolean;
  
  /** Callback when config changes */
  onConfigChange?: (newConfig: SecurityConfig, oldVersion: string) => void;
  
  /** Callback on errors */
  onError?: (error: SecurityConfigServiceError) => void;
  
  /** Callback when using cached fallback */
  onFallback?: (reason: string) => void;
}

// =============================================================================
// CLIENT STATE
// =============================================================================

export interface ClientState {
  status: 'uninitialized' | 'loading' | 'ready' | 'error' | 'circuit_open';
  version: string | null;
  lastCheck: Date | null;
  lastUpdate: Date | null;
  lastError: SecurityConfigError | null;
  errorCount: number;
  circuitState: CircuitState;
  usingCachedVersion: boolean;
}

// =============================================================================
// SECURITY CONFIG CLIENT
// =============================================================================

/**
 * Advanced Security-Config-Client mit Circuit-Breaker und Fallback
 * 
 * FEATURES:
 * - Circuit Breaker: Öffnet nach 5 aufeinanderfolgenden Fehlern
 * - Exponential Backoff: 200ms → 400ms → 800ms
 * - Cache Fallback: Niemals blockieren, immer mit Cache arbeiten
 * - Version-basiertes Update: Nur bei Änderung neu laden
 * 
 * USAGE:
 * ```typescript
 * const client = new SecurityConfigClient({
 *   baseUrl: 'http://security-config-service.core.svc.cluster.local:3005',
 *   serviceToken: process.env.SERVICE_TOKEN,
 * });
 * 
 * await client.init();
 * 
 * // Fraud-Scoring
 * const fraudConfig = client.getFraudConfig();
 * const carrierScore = computeCarrierFraudScore(stats, fraudConfig);
 * ```
 */
export class SecurityConfigClient {
  private baseUrl: string;
  private serviceToken?: string;
  private checkIntervalMs: number;
  private versionTimeoutMs: number;
  private configTimeoutMs: number;
  private versionMaxRetries: number;
  private configMaxRetries: number;
  private initialBackoffMs: number;
  private debug: boolean;
  
  private cache: SecurityConfig | null = null;
  private version: string | null = null;
  private intervalId: Timer | null = null;
  
  private circuitBreaker: CircuitBreaker;
  private state: ClientState = {
    status: 'uninitialized',
    version: null,
    lastCheck: null,
    lastUpdate: null,
    lastError: null,
    errorCount: 0,
    circuitState: 'closed',
    usingCachedVersion: false,
  };
  
  private listeners: Array<(state: ClientState) => void> = [];
  private onConfigChange?: (newConfig: SecurityConfig, oldVersion: string) => void;
  private onError?: (error: SecurityConfigServiceError) => void;
  private onFallback?: (reason: string) => void;

  constructor(options: SecurityConfigClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.serviceToken = options.serviceToken;
    this.checkIntervalMs = options.checkIntervalMs ?? 60000;
    this.versionTimeoutMs = options.versionTimeoutMs ?? 300;
    this.configTimeoutMs = options.configTimeoutMs ?? 800;
    this.versionMaxRetries = options.versionMaxRetries ?? 3;
    this.configMaxRetries = options.configMaxRetries ?? 2;
    this.initialBackoffMs = options.initialBackoffMs ?? 200;
    this.debug = options.debug ?? false;
    this.onConfigChange = options.onConfigChange;
    this.onError = options.onError;
    this.onFallback = options.onFallback;
    
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: options.circuitBreaker?.failureThreshold ?? 5,
      resetTimeoutMs: options.circuitBreaker?.resetTimeoutMs ?? 60000,
      halfOpenMaxAttempts: 1,
    });
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Initialize client - load config and start periodic checks
   * 
   * STARTUP FLOW:
   * 1. GET /config/security
   * 2. Validate config
   * 3. Fill cache
   * 4. Service is ready
   * 
   * THROWS: Wenn Cache leer und Config nicht geladen werden kann
   */
  async init(): Promise<void> {
    this.log('Initializing SecurityConfigClient...');
    this.updateState({ status: 'loading' });

    try {
      // First load - blocking if fails
      await this.reload();
      
      this.updateState({ 
        status: 'ready', 
        lastUpdate: new Date(),
        usingCachedVersion: false,
      });
      
      // Start periodic version checks
      this.intervalId = setInterval(() => this.checkForUpdate(), this.checkIntervalMs);
      
      this.log(`Initialized successfully. Version: ${this.version}`);
    } catch (error) {
      this.log(`Initialization failed: ${error}`);
      
      const secError = this.normalizeError(error);
      this.updateState({
        status: 'error',
        lastError: secError,
        errorCount: this.state.errorCount + 1,
      });
      
      // Cache leer + Fehler = Startup blockieren
      if (!this.cache) {
        throw new Error(
          `SecurityConfig initialization failed and no cache available: ${secError.message}`
        );
      }
      
      // Mit Cache weitermachen
      this.log('Using cached config due to initialization error');
      this.updateState({ 
        status: 'ready', 
        usingCachedVersion: true 
      });
      
      // Start interval anyway
      this.intervalId = setInterval(() => this.checkForUpdate(), this.checkIntervalMs);
    }
  }

  /**
   * Stop periodic checks and cleanup
   */
  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.log('SecurityConfigClient stopped');
  }

  /**
   * Check if client is ready
   */
  isReady(): boolean {
    return (this.state.status === 'ready' || this.state.status === 'circuit_open') 
           && this.cache !== null;
  }

  /**
   * Get current client state
   */
  getState(): ClientState {
    return { 
      ...this.state, 
      circuitState: this.circuitBreaker.getState() 
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: ClientState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // ===========================================================================
  // CONFIG ACCESS
  // ===========================================================================

  /**
   * Get full security config
   * 
   * GOLDEN RULE: Niemals null zurückgeben wenn Cache existiert
   */
  getConfig(): SecurityConfig {
    if (!this.cache) {
      throw new Error('SecurityConfig not loaded. Call init() first.');
    }
    return this.cache;
  }

  /**
   * Get config version
   */
  getVersion(): string {
    return this.version ?? 'unknown';
  }

  /**
   * Get fraud configuration only
   */
  getFraudConfig(): FraudConfig {
    return this.getConfig().fraud;
  }

  /**
   * Get roles configuration
   */
  getRoles(): Record<string, RoleDefinition> {
    return this.getConfig().roles;
  }

  /**
   * Get ABAC rules
   */
  getABACRules(): ABACRule[] {
    return this.getConfig().abac.rules;
  }

  /**
   * Get rate limits
   */
  getRateLimits(): RateLimitConfig[] {
    return this.getConfig().rateLimits;
  }

  /**
   * Check if a role has a specific permission
   */
  hasPermission(role: string, permission: string): boolean {
    const roles = this.getRoles();
    const roleDef = roles[role];
    
    if (!roleDef) return false;
    if (roleDef.can.includes('*')) return true;
    if (roleDef.can.includes(permission)) return true;
    if (roleDef.cannot?.includes(permission)) return false;
    
    // Check wildcard patterns
    const permissionParts = permission.split(':');
    for (const perm of roleDef.can) {
      const permParts = perm.split(':');
      if (permParts[0] === permissionParts[0] && permParts[1] === '*') {
        return true;
      }
    }
    
    return false;
  }

  // ===========================================================================
  // VERSION CHECK & UPDATE
  // ===========================================================================

  /**
   * Periodic version check
   * 
   * RUNTIME FLOW:
   * 1. GET /config/security/version (mit Circuit-Breaker Check)
   * 2. Wenn Version ≠ Cache → GET /config/security
   * 3. Validieren → Cache ersetzen
   * 4. Fraud-Scoring Komponenten neu initialisieren
   */
  private async checkForUpdate(): Promise<void> {
    // Circuit Breaker check
    if (!this.circuitBreaker.canExecute()) {
      if (this.state.circuitState !== 'open') {
        this.log('Circuit breaker is OPEN - using cached config');
        this.updateState({ 
          circuitState: 'open',
          status: 'circuit_open',
          usingCachedVersion: true,
        });
        
        this.onFallback?.('Circuit breaker open - using cached config');
      }
      return;
    }
    
    try {
      this.log('Checking for config updates...');
      this.updateState({ lastCheck: new Date() });

      // Get version with retry
      const newVersion = await this.fetchVersionWithRetry();
      
      // Reset error count on success
      if (this.state.errorCount > 0) {
        this.circuitBreaker.recordSuccess();
        this.updateState({ 
          errorCount: 0, 
          lastError: null,
          circuitState: 'closed',
        });
      }

      // Check if version changed
      if (newVersion !== this.version) {
        this.log(`Config version changed: ${this.version} → ${newVersion}`);
        await this.reload();
      } else {
        this.log('Config version unchanged');
        this.updateState({ usingCachedVersion: false });
      }
      
    } catch (error) {
      const secError = this.normalizeError(error);
      this.log(`Version check failed: ${secError.message}`);
      
      this.circuitBreaker.recordFailure();
      
      this.updateState({
        errorCount: this.state.errorCount + 1,
        lastError: secError,
        circuitState: this.circuitBreaker.getState(),
        usingCachedVersion: true,
      });
      
      this.onError?.(secError);
      
      // Fallback: Mit Cache weiterarbeiten
      this.onFallback?.(`Version check failed: ${secError.type}`);
      this.log('Using cached config due to version check failure');
    }
  }

  /**
   * Fetch version with retry and exponential backoff
   */
  private async fetchVersionWithRetry(): Promise<string> {
    const maxRetries = this.versionMaxRetries;
    let backoff = this.initialBackoffMs;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(
          `${this.baseUrl}/config/security/version`,
          { method: 'GET' },
          this.versionTimeoutMs
        );
        
        if (!response.ok) {
          throw SecurityConfigServiceError.fromResponse(
            response.status, 
            await response.json().catch(() => ({}))
          );
        }
        
        const data = await response.json();
        return data.version;
        
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        this.log(`Version fetch attempt ${attempt + 1} failed, retrying in ${backoff}ms`);
        await this.delay(backoff);
        backoff *= 2; // Exponential backoff
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  /**
   * Reload full config from service
   */
  private async reload(): Promise<void> {
    this.log('Reloading config...');
    
    const maxRetries = this.configMaxRetries;
    let backoff = this.initialBackoffMs * 2; // Start with higher backoff for config
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(
          `${this.baseUrl}/config/security`,
          { method: 'GET' },
          this.configTimeoutMs
        );
        
        if (!response.ok) {
          const error = SecurityConfigServiceError.fromResponse(
            response.status,
            await response.json().catch(() => ({}))
          );
          
          // INVALID_CONFIG = Blocker, kein Retry
          if (error.type === 'INVALID_CONFIG') {
            this.log('Config validation failed on server - keeping old version');
            throw error;
          }
          
          throw error;
        }
        
        const config: SecurityConfig = await response.json();
        
        // Validate config
        this.validateConfig(config);
        
        // Store old version for callback
        const oldVersion = this.version;
        
        // Update cache
        this.cache = config;
        this.version = config.version;
        
        this.log(`Config reloaded successfully. Version: ${this.version}`);
        this.updateState({ 
          lastUpdate: new Date(),
          usingCachedVersion: false,
        });
        
        // Notify listeners of config change
        if (oldVersion && oldVersion !== config.version && this.onConfigChange) {
          this.onConfigChange(config, oldVersion);
        }
        
        return;
        
      } catch (error) {
        // INVALID_CONFIG = Reload verweigern, alte Version behalten
        if (error instanceof SecurityConfigServiceError && error.type === 'INVALID_CONFIG') {
          throw error;
        }
        
        if (attempt === maxRetries) {
          // Cache behalten + Warn-Log
          this.log(`Config fetch failed after ${maxRetries} attempts - keeping cached version`);
          throw error;
        }
        
        this.log(`Config fetch attempt ${attempt + 1} failed, retrying in ${backoff}ms`);
        await this.delay(backoff);
        backoff *= 2;
      }
    }
  }

  /**
   * Validate config structure
   */
  private validateConfig(config: SecurityConfig): void {
    const required = ['version', 'roles', 'abac', 'fraud', 'rateLimits'];
    
    for (const field of required) {
      if (!(field in config)) {
        throw new SecurityConfigServiceError({
          type: 'INVALID_CONFIG',
          message: `Missing required field: ${field}`,
          httpStatus: 422,
        });
      }
    }
    
    // Validate version format (YYYY-MM-DD-NN)
    const versionPattern = /^\d{4}-\d{2}-\d{2}-\d{2}$/;
    if (!versionPattern.test(config.version)) {
      throw new SecurityConfigServiceError({
        type: 'INVALID_CONFIG',
        message: `Invalid version format: ${config.version}. Expected: YYYY-MM-DD-NN`,
        httpStatus: 422,
      });
    }
  }

  // ===========================================================================
  // HTTP HELPERS
  // ===========================================================================

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.serviceToken) {
      headers['X-Service-Token'] = this.serviceToken;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new SecurityConfigServiceError({
          type: 'TIMEOUT',
          message: `Request timed out after ${timeoutMs}ms`,
          httpStatus: 0,
        });
      }
      throw new SecurityConfigServiceError({
        type: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error',
        httpStatus: 0,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Normalize any error to SecurityConfigServiceError
   */
  private normalizeError(error: unknown): SecurityConfigServiceError {
    if (error instanceof SecurityConfigServiceError) {
      return error;
    }
    
    if (error instanceof Error) {
      return new SecurityConfigServiceError({
        type: 'NETWORK_ERROR',
        message: error.message,
        httpStatus: 0,
      });
    }
    
    return new SecurityConfigServiceError({
      type: 'NETWORK_ERROR',
      message: 'Unknown error',
      httpStatus: 0,
    });
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  private updateState(partial: Partial<ClientState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(listener => listener(this.getState()));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(message: string): void {
    if (this.debug) {
      console.log(`[SecurityConfigClient] ${new Date().toISOString()} ${message}`);
    }
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let defaultClient: SecurityConfigClient | null = null;

export function getSecurityConfigClient(
  options?: SecurityConfigClientOptions
): SecurityConfigClient {
  if (!defaultClient && options) {
    defaultClient = new SecurityConfigClient(options);
  }
  if (!defaultClient) {
    throw new Error('SecurityConfigClient not initialized. Call getSecurityConfigClient(options) first.');
  }
  return defaultClient;
}

export async function initSecurityConfigClient(
  options: SecurityConfigClientOptions
): Promise<SecurityConfigClient> {
  const client = getSecurityConfigClient(options);
  await client.init();
  return client;
}

// =============================================================================
// CONVENIENCE FUNCTIONS FOR FRAUD SCORING
// =============================================================================

/**
 * Compute Carrier Fraud Score using config
 */
export function computeCarrierFraudScore(
  stats: {
    cancelRatePercent: number;
    disputeRatePercent: number;
    noShowRatePercent: number;
    patternScore: number;
  },
  config: FraudConfig
): number {
  const { weights, normalization } = config.carrierScore;
  
  const cancelRate = Math.min(stats.cancelRatePercent / 100 / normalization.cancelRateMax, 1);
  const disputeRate = Math.min(stats.disputeRatePercent / 100 / normalization.disputeRateMax, 1);
  const noShowRate = Math.min(stats.noShowRatePercent / 100 / normalization.noShowRateMax, 1);
  
  return Math.min(Math.max(
    weights.cancelRate * cancelRate +
    weights.disputeRate * disputeRate +
    weights.noShowRate * noShowRate +
    weights.patternScore * stats.patternScore,
    0
  ), 1);
}

/**
 * Compute Bid Fraud Score using config
 */
export function computeBidFraudScore(
  bid: {
    bidPrice: number;
    marketPrice: number;
    dumpingScore: number;
    spamScore: number;
    coordinationScore: number;
  },
  config: FraudConfig
): number {
  const { weights } = config.bidScore;
  
  return Math.min(Math.max(
    weights.dumping * bid.dumpingScore +
    weights.spam * bid.spamScore +
    weights.coordination * bid.coordinationScore,
    0
  ), 1);
}

/**
 * Compute Total Fraud Score
 */
export function computeTotalFraudScore(
  carrierScore: number,
  bidScore: number,
  config: FraudConfig
): number {
  const alpha = config.totalScore.alphaCarrier;
  return alpha * carrierScore + (1 - alpha) * bidScore;
}

/**
 * Apply Fraud Penalty to Matching Score
 */
export function applyFraudPenalty(
  baseScore: number,
  fraudScore: number,
  config: FraudConfig
): { adjustedScore: number; penaltyApplied: number } {
  const penalty = config.totalScore.penaltyFactor * fraudScore;
  const adjustedScore = baseScore * (1 - penalty);
  
  return {
    adjustedScore: Math.max(0, adjustedScore),
    penaltyApplied: penalty,
  };
}

export default SecurityConfigClient;
