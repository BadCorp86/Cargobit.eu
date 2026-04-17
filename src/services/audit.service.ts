/**
 * CargoBit Audit Service
 * 
 * Centralized audit logging for all business-critical decisions.
 * Provides WORM (Write Once, Read Many) audit trail with correlation support.
 * 
 * @module @cargobit/audit-service
 * @version 1.0.0
 */

import {
  IEventBus,
  BaseEvent,
  Topic,
  CargoBitEvent,
  CORE_TOPICS,
  EventMetadata,
} from '../types/events';

// =============================================================================
// AUDIT RECORD SCHEMA
// =============================================================================

/**
 * Generic audit record for all business-critical decisions.
 */
export interface AuditRecord {
  /** Unique audit record identifier (ULID format) */
  id: string;
  
  /** ISO 8601 timestamp */
  timestamp: string;
  
  /** Type of actor that triggered the action */
  actorType: 'user' | 'system' | 'service';
  
  /** ID of the actor (user ID, carrier ID, or service name) */
  actorId: string;
  
  /** Service that created the audit record */
  service: string;
  
  /** Action performed (SCREAMING_SNAKE_CASE) */
  action: AuditAction;
  
  /** Type of entity affected */
  entityType: EntityType;
  
  /** ID of the entity affected */
  entityId: string;
  
  /** State before the action (null for creates) */
  payloadBefore: unknown | null;
  
  /** State after the action */
  payloadAfter: unknown | null;
  
  /** Correlation ID for cross-service tracing */
  correlationId: string;
  
  /** Additional metadata */
  metadata?: AuditMetadata;
  
  /** Retention category */
  retentionCategory: RetentionCategory;
}

export type AuditAction =
  // Order actions
  | 'ORDER_CREATED'
  | 'ORDER_UPDATED'
  | 'ORDER_CANCELLED'
  | 'ORDER_PUBLISHED'
  // Pricing actions
  | 'PRICING_CALCULATED'
  | 'PRICING_CONFIG_UPDATED'
  | 'BID_VALIDATED'
  // Bidding actions
  | 'BID_SUBMITTED'
  | 'BID_UPDATED'
  | 'BID_CANCELLED'
  | 'BID_ACCEPTED'
  | 'BID_REJECTED'
  // Matching actions
  | 'MATCHING_COMPLETED'
  | 'MATCHING_OVERRIDE'
  | 'MATCHING_FAILED'
  // Execution actions
  | 'EXECUTION_CREATED'
  | 'EXECUTION_STATUS_CHANGED'
  | 'EXECUTION_POD_UPLOADED'
  | 'EXECUTION_COMPLETED'
  | 'EXECUTION_CANCELLED'
  // Carrier actions
  | 'CARRIER_STATS_UPDATED'
  | 'CARRIER_CAPACITY_UPDATED'
  // Risk actions
  | 'RISK_SCORE_UPDATED'
  | 'FRAUD_FLAGGED'
  // Admin actions
  | 'ADMIN_LOGIN'
  | 'ADMIN_CONFIG_CHANGE'
  | 'ADMIN_OVERRIDE';

export type EntityType =
  | 'order'
  | 'pricing'
  | 'bid'
  | 'matching_result'
  | 'execution'
  | 'carrier'
  | 'carrier_stats'
  | 'risk_score'
  | 'document'
  | 'config'
  | 'user';

export type RetentionCategory =
  | 'short_term'   // 2-3 years
  | 'medium_term'  // 5-7 years
  | 'long_term'    // 7-10 years
  | 'permanent';   // Never deleted

export interface AuditMetadata {
  /** IP address of the actor */
  ipAddress?: string;
  
  /** User agent string */
  userAgent?: string;
  
  /** Session ID */
  sessionId?: string;
  
  /** Request ID */
  requestId?: string;
  
  /** Additional context */
  context?: Record<string, unknown>;
}

// =============================================================================
// AUDIT STORE INTERFACE
// =============================================================================

/**
 * Interface for audit storage backends.
 * Implementations: PostgreSQLAuditStore, S3AuditStore, etc.
 */
export interface IAuditStore {
  /**
   * Append an audit record. Must be append-only (no updates/deletes).
   */
  append(record: AuditRecord): Promise<void>;
  
  /**
   * Query audit records by entity.
   */
  queryByEntity(entityType: EntityType, entityId: string): Promise<AuditRecord[]>;
  
  /**
   * Query audit records by correlation ID.
   */
  queryByCorrelationId(correlationId: string): Promise<AuditRecord[]>;
  
  /**
   * Query audit records by time range.
   */
  queryByTimeRange(from: Date, to: Date, options?: QueryOptions): Promise<AuditRecord[]>;
  
  /**
   * Query audit records by actor.
   */
  queryByActor(actorType: 'user' | 'system' | 'service', actorId: string): Promise<AuditRecord[]>;
  
  /**
   * Get retention policy for a category.
   */
  getRetentionPolicy(category: RetentionCategory): RetentionPolicy;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  actions?: AuditAction[];
  services?: string[];
  sortOrder?: 'asc' | 'desc';
}

export interface RetentionPolicy {
  category: RetentionCategory;
  retentionYears: number;
  archiveAfterYears?: number;
  deleteAfterRetention: boolean;
}

// =============================================================================
// IN-MEMORY AUDIT STORE (Development/Testing)
// =============================================================================

/**
 * In-memory implementation of audit store for development and testing.
 */
export class InMemoryAuditStore implements IAuditStore {
  private records: AuditRecord[] = [];
  private retentionPolicies: Map<RetentionCategory, RetentionPolicy>;

  constructor() {
    // Default retention policies
    this.retentionPolicies = new Map([
      ['short_term', { category: 'short_term', retentionYears: 3, deleteAfterRetention: true }],
      ['medium_term', { category: 'medium_term', retentionYears: 7, archiveAfterYears: 3, deleteAfterRetention: false }],
      ['long_term', { category: 'long_term', retentionYears: 10, archiveAfterYears: 5, deleteAfterRetention: false }],
      ['permanent', { category: 'permanent', retentionYears: Infinity, deleteAfterRetention: false }],
    ]);
  }

  async append(record: AuditRecord): Promise<void> {
    // Append-only: just push to the array
    this.records.push(record);
  }

  async queryByEntity(entityType: EntityType, entityId: string): Promise<AuditRecord[]> {
    return this.records.filter(
      (r) => r.entityType === entityType && r.entityId === entityId
    );
  }

  async queryByCorrelationId(correlationId: string): Promise<AuditRecord[]> {
    return this.records.filter((r) => r.correlationId === correlationId);
  }

  async queryByTimeRange(from: Date, to: Date, options?: QueryOptions): Promise<AuditRecord[]> {
    let results = this.records.filter((r) => {
      const timestamp = new Date(r.timestamp);
      return timestamp >= from && timestamp <= to;
    });

    if (options?.actions) {
      results = results.filter((r) => options!.actions!.includes(r.action));
    }

    if (options?.services) {
      results = results.filter((r) => options!.services!.includes(r.service));
    }

    if (options?.sortOrder === 'desc') {
      results.reverse();
    }

    if (options?.offset) {
      results = results.slice(options.offset);
    }

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async queryByActor(actorType: 'user' | 'system' | 'service', actorId: string): Promise<AuditRecord[]> {
    return this.records.filter(
      (r) => r.actorType === actorType && r.actorId === actorId
    );
  }

  getRetentionPolicy(category: RetentionCategory): RetentionPolicy {
    return this.retentionPolicies.get(category)!;
  }

  // Test helpers
  getAllRecords(): AuditRecord[] {
    return [...this.records];
  }

  clear(): void {
    this.records = [];
  }
}

// =============================================================================
// AUDIT SERVICE
// =============================================================================

/**
 * Audit action to retention category mapping.
 */
const ACTION_RETENTION_MAP: Record<AuditAction, RetentionCategory> = {
  // Orders - long term (contractual/tax)
  ORDER_CREATED: 'long_term',
  ORDER_UPDATED: 'long_term',
  ORDER_CANCELLED: 'long_term',
  ORDER_PUBLISHED: 'long_term',
  
  // Pricing - medium term
  PRICING_CALCULATED: 'medium_term',
  PRICING_CONFIG_UPDATED: 'permanent', // Config changes are permanent
  BID_VALIDATED: 'medium_term',
  
  // Bidding - medium term
  BID_SUBMITTED: 'medium_term',
  BID_UPDATED: 'medium_term',
  BID_CANCELLED: 'medium_term',
  BID_ACCEPTED: 'long_term',
  BID_REJECTED: 'medium_term',
  
  // Matching - short term (debug)
  MATCHING_COMPLETED: 'long_term',
  MATCHING_OVERRIDE: 'permanent', // Admin overrides are permanent
  MATCHING_FAILED: 'short_term',
  
  // Execution - long term (transport proof)
  EXECUTION_CREATED: 'long_term',
  EXECUTION_STATUS_CHANGED: 'long_term',
  EXECUTION_POD_UPLOADED: 'long_term',
  EXECUTION_COMPLETED: 'long_term',
  EXECUTION_CANCELLED: 'long_term',
  
  // Carrier - medium term
  CARRIER_STATS_UPDATED: 'medium_term',
  CARRIER_CAPACITY_UPDATED: 'medium_term',
  
  // Risk - medium term
  RISK_SCORE_UPDATED: 'medium_term',
  FRAUD_FLAGGED: 'permanent',
  
  // Admin - permanent
  ADMIN_LOGIN: 'medium_term',
  ADMIN_CONFIG_CHANGE: 'permanent',
  ADMIN_OVERRIDE: 'permanent',
};

/**
 * Main Audit Service.
 * 
 * Subscribes to all business events and creates audit records.
 * Provides query interface for compliance and debugging.
 * 
 * @example
 * ```typescript
 * const auditStore = new PostgreSQLAuditStore(connectionString);
 * const auditService = new AuditService(eventBus, auditStore, 'audit-service');
 * 
 * await auditService.start();
 * 
 * // Query audit trail for an order
 * const records = await auditService.getEntityHistory('order', 'order_123');
 * ```
 */
export class AuditService {
  private eventBus: IEventBus;
  private store: IAuditStore;
  private serviceName: string;
  private running: boolean = false;
  private subscriptions: Topic[] = [];

  // Topics to audit
  private static AUDITED_TOPICS: Topic[] = [
    CORE_TOPICS.ORDER_CREATED,
    CORE_TOPICS.ORDER_UPDATED,
    CORE_TOPICS.ORDER_CANCELLED,
    CORE_TOPICS.ORDER_PUBLISHED,
    CORE_TOPICS.PRICING_CALCULATED,
    CORE_TOPICS.PRICING_UPDATED,
    CORE_TOPICS.BID_SUBMITTED,
    CORE_TOPICS.BID_VALIDATED,
    CORE_TOPICS.BID_WITHDRAWN,
    CORE_TOPICS.BID_ACCEPTED,
    CORE_TOPICS.BID_REJECTED,
    CORE_TOPICS.MATCHING_COMPLETED,
    CORE_TOPICS.MATCHING_FAILED,
    CORE_TOPICS.EXECUTION_CREATED,
    CORE_TOPICS.EXECUTION_STATUS_CHANGED,
    CORE_TOPICS.EXECUTION_POD_UPLOADED,
    CORE_TOPICS.EXECUTION_COMPLETED,
    CORE_TOPICS.CARRIER_STATS_UPDATED,
    CORE_TOPICS.CARRIER_CAPACITY_UPDATED,
    CORE_TOPICS.RISK_UPDATED,
  ];

  constructor(eventBus: IEventBus, store: IAuditStore, serviceName: string = 'audit-service') {
    this.eventBus = eventBus;
    this.store = store;
    this.serviceName = serviceName;
  }

  /**
   * Start the audit service and subscribe to events.
   */
  async start(): Promise<void> {
    if (this.running) return;

    // Subscribe to all audited topics
    for (const topic of AuditService.AUDITED_TOPICS) {
      this.eventBus.subscribe(topic, this.handleEvent.bind(this));
      this.subscriptions.push(topic);
    }

    this.running = true;
    console.log(`AuditService started, listening to ${this.subscriptions.length} topics`);
  }

  /**
   * Stop the audit service.
   */
  async stop(): Promise<void> {
    for (const topic of this.subscriptions) {
      this.eventBus.unsubscribe(topic);
    }
    this.subscriptions = [];
    this.running = false;
  }

  /**
   * Handle incoming event and create audit record.
   */
  private async handleEvent(event: CargoBitEvent): Promise<void> {
    try {
      const record = this.createAuditRecord(event);
      await this.store.append(record);
      
      // Also publish audit event for downstream consumers
      // (This is optional - some architectures prefer direct DB queries)
    } catch (error) {
      console.error(`Failed to create audit record for ${event.topic}:`, error);
      // In production: send to dead-letter queue
    }
  }

  /**
   * Create an audit record from an event.
   */
  private createAuditRecord(event: CargoBitEvent): AuditRecord {
    const action = this.topicToAction(event.topic);
    const entityType = this.topicToEntityType(event.topic);
    const entityId = this.extractEntityId(event);
    const retentionCategory = ACTION_RETENTION_MAP[action] ?? 'medium_term';

    return {
      id: this.generateId(),
      timestamp: event.timestamp,
      actorType: event.metadata?.actorType ?? 'system',
      actorId: event.metadata?.actorId ?? event.source,
      service: event.source,
      action,
      entityType,
      entityId,
      payloadBefore: null, // Events only have "after" state
      payloadAfter: this.sanitizePayload(event.payload),
      correlationId: event.correlationId,
      metadata: {
        ipAddress: event.metadata?.ipAddress,
        userAgent: event.metadata?.userAgent,
        sessionId: event.metadata?.sessionId,
        context: event.metadata?.context,
      },
      retentionCategory,
    };
  }

  /**
   * Generate a ULID for audit records.
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36).padStart(10, '0');
    const random = Math.random().toString(36).substring(2, 12);
    return `audit_${timestamp}${random}`;
  }

  /**
   * Map topic to audit action.
   */
  private topicToAction(topic: Topic): AuditAction {
    const mapping: Record<Topic, AuditAction> = {
      [CORE_TOPICS.ORDER_CREATED]: 'ORDER_CREATED',
      [CORE_TOPICS.ORDER_UPDATED]: 'ORDER_UPDATED',
      [CORE_TOPICS.ORDER_CANCELLED]: 'ORDER_CANCELLED',
      [CORE_TOPICS.ORDER_PUBLISHED]: 'ORDER_PUBLISHED',
      [CORE_TOPICS.PRICING_CALCULATED]: 'PRICING_CALCULATED',
      [CORE_TOPICS.PRICING_UPDATED]: 'PRICING_CONFIG_UPDATED',
      [CORE_TOPICS.BID_SUBMITTED]: 'BID_SUBMITTED',
      [CORE_TOPICS.BID_STORED]: 'BID_SUBMITTED',
      [CORE_TOPICS.BID_VALIDATED]: 'BID_VALIDATED',
      [CORE_TOPICS.BID_WITHDRAWN]: 'BID_CANCELLED',
      [CORE_TOPICS.BID_ACCEPTED]: 'BID_ACCEPTED',
      [CORE_TOPICS.BID_REJECTED]: 'BID_REJECTED',
      [CORE_TOPICS.MATCHING_COMPLETED]: 'MATCHING_COMPLETED',
      [CORE_TOPICS.MATCHING_FAILED]: 'MATCHING_FAILED',
      [CORE_TOPICS.EXECUTION_CREATED]: 'EXECUTION_CREATED',
      [CORE_TOPICS.EXECUTION_STATUS_CHANGED]: 'EXECUTION_STATUS_CHANGED',
      [CORE_TOPICS.EXECUTION_POD_UPLOADED]: 'EXECUTION_POD_UPLOADED',
      [CORE_TOPICS.EXECUTION_COMPLETED]: 'EXECUTION_COMPLETED',
      [CORE_TOPICS.CARRIER_STATS_UPDATED]: 'CARRIER_STATS_UPDATED',
      [CORE_TOPICS.CARRIER_CAPACITY_UPDATED]: 'CARRIER_CAPACITY_UPDATED',
      [CORE_TOPICS.CARRIER_PROFILE_UPDATED]: 'CARRIER_STATS_UPDATED',
      [CORE_TOPICS.RISK_UPDATED]: 'RISK_SCORE_UPDATED',
      [CORE_TOPICS.RISK_LEVEL_CHANGED]: 'RISK_SCORE_UPDATED',
      [CORE_TOPICS.AUDIT_RECORD_CREATED]: 'ORDER_CREATED', // Should not happen
      [CORE_TOPICS.NOTIFICATION_SENT]: 'ORDER_CREATED', // Should not happen
    };
    
    return mapping[topic] ?? 'ORDER_CREATED';
  }

  /**
   * Map topic to entity type.
   */
  private topicToEntityType(topic: Topic): EntityType {
    if (topic.startsWith('order.')) return 'order';
    if (topic.startsWith('pricing.')) return 'pricing';
    if (topic.startsWith('bid.')) return 'bid';
    if (topic.startsWith('matching.')) return 'matching_result';
    if (topic.startsWith('execution.')) return 'execution';
    if (topic.startsWith('carrier.')) return 'carrier';
    if (topic.startsWith('risk.')) return 'risk_score';
    return 'order';
  }

  /**
   * Extract entity ID from event payload.
   */
  private extractEntityId(event: CargoBitEvent): string {
    const payload = event.payload as Record<string, unknown>;
    return (
      payload.orderId ??
      payload.bidId ??
      payload.executionId ??
      payload.carrierId ??
      payload.entityId ??
      event.id
    ) as string;
  }

  /**
   * Sanitize payload - remove sensitive data.
   */
  private sanitizePayload(payload: unknown): unknown {
    if (typeof payload !== 'object' || payload === null) {
      return payload;
    }

    const sanitized = { ...payload as Record<string, unknown> };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  // =========================================================================
  // QUERY INTERFACE
  // =========================================================================

  /**
   * Get audit history for an entity.
   */
  async getEntityHistory(entityType: EntityType, entityId: string): Promise<AuditRecord[]> {
    return this.store.queryByEntity(entityType, entityId);
  }

  /**
   * Get complete transaction trail by correlation ID.
   */
  async getTransactionTrail(correlationId: string): Promise<AuditRecord[]> {
    return this.store.queryByCorrelationId(correlationId);
  }

  /**
   * Query audit records by time range.
   */
  async queryByTimeRange(
    from: Date,
    to: Date,
    options?: QueryOptions
  ): Promise<AuditRecord[]> {
    return this.store.queryByTimeRange(from, to, options);
  }

  /**
   * Get user activity history.
   */
  async getUserActivity(
    userId: string,
    from?: Date,
    to?: Date
  ): Promise<AuditRecord[]> {
    const records = await this.store.queryByActor('user', userId);
    
    if (from || to) {
      return records.filter((r) => {
        const timestamp = new Date(r.timestamp);
        if (from && timestamp < from) return false;
        if (to && timestamp > to) return false;
        return true;
      });
    }
    
    return records;
  }

  /**
   * Get retention policy for a category.
   */
  getRetentionPolicy(category: RetentionCategory): RetentionPolicy {
    return this.store.getRetentionPolicy(category);
  }
}

// =============================================================================
// AUDIT CLIENT (For Services)
// =============================================================================

/**
 * Client for services to create custom audit records.
 * 
 * @example
 * ```typescript
 * const auditClient = new AuditClient(auditStore, 'pricing-service');
 * 
 * await auditClient.audit({
 *   action: 'BID_VALIDATED',
 *   entityType: 'bid',
 *   entityId: 'bid_123',
 *   payloadBefore: { valid: false },
 *   payloadAfter: { valid: true, priceScore: 0.85 },
 *   correlationId: 'trace_abc',
 *   actorType: 'system',
 *   actorId: 'pricing-service',
 * });
 * ```
 */
export class AuditClient {
  private store: IAuditStore;
  private serviceName: string;

  constructor(store: IAuditStore, serviceName: string) {
    this.store = store;
    this.serviceName = serviceName;
  }

  /**
   * Create an audit record manually.
   */
  async audit(options: {
    action: AuditAction;
    entityType: EntityType;
    entityId: string;
    payloadBefore?: unknown;
    payloadAfter?: unknown;
    correlationId: string;
    actorType?: 'user' | 'system' | 'service';
    actorId?: string;
    metadata?: AuditMetadata;
  }): Promise<AuditRecord> {
    const retentionCategory = ACTION_RETENTION_MAP[options.action] ?? 'medium_term';

    const record: AuditRecord = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      actorType: options.actorType ?? 'system',
      actorId: options.actorId ?? this.serviceName,
      service: this.serviceName,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      payloadBefore: options.payloadBefore ?? null,
      payloadAfter: options.payloadAfter ?? null,
      correlationId: options.correlationId,
      metadata: options.metadata,
      retentionCategory,
    };

    await this.store.append(record);
    return record;
  }

  private generateId(): string {
    const timestamp = Date.now().toString(36).padStart(10, '0');
    const random = Math.random().toString(36).substring(2, 12);
    return `audit_${timestamp}${random}`;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  AuditService,
  AuditClient,
  InMemoryAuditStore,
  ACTION_RETENTION_MAP,
};
