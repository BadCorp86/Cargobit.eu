/**
 * CargoBit Security Config Client
 * 
 * Client für Domain-Services zum Abrufen der Security-Config.
 * Implementiert Caching & Versioning Pattern.
 * 
 * VERWENDUNG:
 * - Beim Service-Start: GET /config/security → im Memory-Cache halten
 * - Periodisch (z.B. alle 60s): GET /config/security/version
 * - Wenn version != cachedVersion → GET /config/security neu laden
 * 
 * @module @cargobit/security-config-client
 * @version 1.0.0
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

export interface SecurityConfig {
  version: string;
  loadedAt: string;
  roles: Record<string, RoleDefinition>;
  abac: { rules: ABACRule[] };
  rateLimits: RateLimitConfig[];
  fraud: FraudConfig;
  audit: {
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
  };
  retention: {
    policies: Array<{
      category: string;
      retentionYears: number;
      archiveAfterYears?: number;
      gdprException: boolean;
      legalBasis?: string;
    }>;
    purgeJobs: {
      schedule: string;
      batchSize: number;
      dryRunFirst: boolean;
    };
  };
}

export interface SecurityConfigClientOptions {
  /** URL des Security-Config-Service */
  baseUrl: string;
  
  /** Service-Token für Authentifizierung */
  serviceToken?: string;
  
  /** Check-Interval in ms (default: 60000) */
  checkIntervalMs?: number;
  
  /** Request timeout in ms (default: 5000) */
  timeoutMs?: number;
  
  /** Max retries for failed requests (default: 3) */
  maxRetries?: number;
  
  /** Enable debug logging */
  debug?: boolean;
}

export interface ClientState {
  status: 'uninitialized' | 'loading' | 'ready' | 'error';
  lastCheck: Date | null;
  lastUpdate: Date | null;
  errorCount: number;
  lastError: string | null;
}

// =============================================================================
// SECURITY CONFIG CLIENT
// =============================================================================

/**
 * Client für Security-Config-Service mit Caching & Versioning
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
 * // In Services:
 * const config = client.getConfig();
 * const fraudConfig = client.getFraudConfig();
 * ```
 */
export class SecurityConfigClient {
  private baseUrl: string;
  private serviceToken?: string;
  private checkIntervalMs: number;
  private timeoutMs: number;
  private maxRetries: number;
  private debug: boolean;
  
  private cache: SecurityConfig | null = null;
  private version: string | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  
  private state: ClientState = {
    status: 'uninitialized',
    lastCheck: null,
    lastUpdate: null,
    errorCount: 0,
    lastError: null,
  };
  
  private listeners: Array<(state: ClientState) => void> = [];

  constructor(options: SecurityConfigClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.serviceToken = options.serviceToken;
    this.checkIntervalMs = options.checkIntervalMs ?? 60000;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.maxRetries = options.maxRetries ?? 3;
    this.debug = options.debug ?? false;
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Initialize client - load config and start periodic checks
   */
  async init(): Promise<void> {
    this.log('Initializing SecurityConfigClient...');
    this.updateState({ status: 'loading' });

    try {
      await this.reload();
      this.updateState({ status: 'ready', lastUpdate: new Date() });
      
      // Start periodic version check
      this.intervalId = setInterval(() => this.checkForUpdate(), this.checkIntervalMs);
      
      this.log(`Initialized successfully. Version: ${this.version}`);
    } catch (error) {
      this.updateState({
        status: 'error',
        lastError: error instanceof Error ? error.message : 'Unknown error',
        errorCount: this.state.errorCount + 1,
      });
      throw error;
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
    return this.state.status === 'ready' && this.cache !== null;
  }

  /**
   * Get current client state
   */
  getState(): ClientState {
    return { ...this.state };
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
   * Get full security config (throws if not loaded)
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
    
    // Check wildcard patterns (e.g., 'orders:*')
    const permissionParts = permission.split(':');
    for (const perm of roleDef.can) {
      const permParts = perm.split(':');
      if (permParts[0] === permissionParts[0] && permParts[1] === '*') {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get rate limit for an endpoint
   */
  getRateLimitForEndpoint(endpoint: string): RateLimitConfig | null {
    const rateLimits = this.getRateLimits();
    
    // Exact match
    const exact = rateLimits.find(rl => rl.endpoint === endpoint);
    if (exact) return exact;
    
    // Pattern match (e.g., /pricing/:orderId/bid/validate)
    for (const rl of rateLimits) {
      const pattern = rl.endpoint.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(endpoint)) {
        return rl;
      }
    }
    
    // Global fallback
    return rateLimits.find(rl => rl.endpoint === 'GLOBAL') || null;
  }

  // ===========================================================================
  // INTERNAL METHODS
  // ===========================================================================

  /**
   * Check if config version has changed
   */
  private async checkForUpdate(): Promise<void> {
    try {
      this.log('Checking for config updates...');
      this.updateState({ lastCheck: new Date() });

      const response = await this.fetchWithRetry(
        `${this.baseUrl}/config/security/version`,
        { method: 'GET' }
      );

      const data = await response.json();
      const newVersion = data.version;

      if (newVersion !== this.version) {
        this.log(`Config version changed: ${this.version} → ${newVersion}`);
        await this.reload();
      } else {
        this.log('Config version unchanged');
      }

      // Reset error count on success
      if (this.state.errorCount > 0) {
        this.updateState({ errorCount: 0, lastError: null });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.log(`Check failed: ${errorMsg}`);
      this.updateState({
        errorCount: this.state.errorCount + 1,
        lastError: errorMsg,
      });
      
      // If too many errors, try to reload
      if (this.state.errorCount >= this.maxRetries) {
        this.log('Too many errors, attempting reload...');
        try {
          await this.reload();
        } catch (reloadError) {
          this.log(`Reload failed: ${reloadError}`);
        }
      }
    }
  }

  /**
   * Reload full config from service
   */
  private async reload(): Promise<void> {
    this.log('Reloading config...');
    
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/config/security`,
      { method: 'GET' }
    );

    const config: SecurityConfig = await response.json();
    
    this.cache = config;
    this.version = config.version;
    
    this.log(`Config reloaded. Version: ${this.version}`);
    this.updateState({ lastUpdate: new Date() });
  }

  /**
   * Fetch with retry and timeout
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries: number = this.maxRetries
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (retries > 0) {
        this.log(`Request failed, retrying... (${retries} left)`);
        await this.delay(1000);
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Update state and notify listeners
   */
  private updateState(partial: Partial<ClientState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Debug logging
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[SecurityConfigClient] ${new Date().toISOString()} ${message}`);
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let defaultClient: SecurityConfigClient | null = null;

/**
 * Get or create the default SecurityConfigClient singleton
 */
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

/**
 * Initialize the default client (convenience function)
 */
export async function initSecurityConfigClient(
  options: SecurityConfigClientOptions
): Promise<SecurityConfigClient> {
  const client = getSecurityConfigClient(options);
  await client.init();
  return client;
}

// =============================================================================
// DECORATORS FOR SERVICE INTEGRATION
// =============================================================================

/**
 * Decorator to ensure config is loaded before method execution
 */
export function RequireConfig(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): void {
  const originalMethod = descriptor.value;
  
  descriptor.value = async function (...args: any[]) {
    const client = getSecurityConfigClient();
    if (!client.isReady()) {
      throw new Error('SecurityConfig not ready. Ensure client is initialized.');
    }
    return originalMethod.apply(this, args);
  };
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

export default SecurityConfigClient;
