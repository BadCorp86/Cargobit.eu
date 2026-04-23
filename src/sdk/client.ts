// ============================================
// CARGOBIT SECURITY GATEWAY SDK - CLIENT
// Version: 1.2.0
// Based on OpenAPI 3.0.3 Specification
// ============================================

import {
  UserContext,
  EntityContext,
  SecurityCheckRequest,
  SecurityCheckResponse,
  PermissionValidateResponse,
  RiskOverrideRequest,
  RiskOverrideResponse,
  MitigationApplyRequest,
  MitigationApplyResponse,
  RiskStatusResponse,
  HealthCheckResponse,
  EntityType,
  RiskLevel,
  MitigationType,
} from './types';

// ============================================
// CLIENT OPTIONS
// ============================================

export interface SecurityGatewayClientOptions {
  baseUrl: string;
  tokenProvider: () => Promise<string>;
  timeout?: number;
  retries?: number;
}

// ============================================
// CLIENT CLASS
// ============================================

export class SecurityGatewayClient {
  private readonly baseUrl: string;
  private readonly tokenProvider: () => Promise<string>;
  private readonly timeout: number;
  private readonly retries: number;

  constructor(options: SecurityGatewayClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.tokenProvider = options.tokenProvider;
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
  }

  // ============================================
  // CORE API METHODS
  // ============================================

  /**
   * Perform a full security check (Permission + Risk + Mitigation)
   */
  async securityCheck(payload: SecurityCheckRequest): Promise<SecurityCheckResponse> {
    return this.request<SecurityCheckResponse>('/security/check', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Validate if a user role is allowed to perform an action (quick check, no risk)
   */
  async validatePermissions(input: {
    user: UserContext;
    action: string;
  }): Promise<PermissionValidateResponse> {
    return this.request<PermissionValidateResponse>('/security/permissions/validate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Override risk level/score for an entity (Support/Compliance only)
   */
  async overrideRisk(input: {
    entityType: EntityType;
    entityId: string;
    newLevel: RiskLevel;
    newScore?: number;
    reason: string;
    actorId: string;
    expiresAt?: string;
  }): Promise<RiskOverrideResponse> {
    return this.request<RiskOverrideResponse>('/security/risk/override', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Apply a mitigation for a given action/entity
   */
  async applyMitigation(input: {
    entityType: EntityType;
    entityId: string;
    action: string;
    mitigationType: MitigationType;
    context?: Record<string, unknown>;
  }): Promise<MitigationApplyResponse> {
    return this.request<MitigationApplyResponse>('/security/mitigation/apply', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Get current risk status for an entity
   */
  async getRiskStatus(input: {
    entityType: EntityType;
    entityId: string;
  }): Promise<RiskStatusResponse> {
    return this.request<RiskStatusResponse>(
      `/security/risk/${input.entityType}/${input.entityId}`,
      { method: 'GET' }
    );
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/security/health', {
      method: 'GET',
      auth: false,
    });
  }

  // ============================================
  // INTERNAL METHODS
  // ============================================

  private async request<T>(
    path: string,
    options: {
      method: string;
      body?: string;
      auth?: boolean;
    }
  ): Promise<T> {
    const { method, body, auth = true } = options;

    let lastError: Error | null = null;
    let attempts = 0;

    while (attempts < this.retries) {
      attempts++;

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };

        if (auth) {
          const token = await this.tokenProvider();
          headers['Authorization'] = `Bearer ${token}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            return errorData as T;
          }

          // Retry on server errors (5xx)
          lastError = new Error(
            `HTTP ${response.status}: ${errorData.message || response.statusText}`
          );
          
          if (attempts < this.retries) {
            await this.delay(1000 * attempts);
            continue;
          }
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on abort errors
        if ((error as Error).name === 'AbortError') {
          throw new Error('Request timeout');
        }

        if (attempts < this.retries) {
          await this.delay(1000 * attempts);
          continue;
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createSecurityGatewayClient(
  options: SecurityGatewayClientOptions
): SecurityGatewayClient {
  return new SecurityGatewayClient(options);
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default SecurityGatewayClient;
