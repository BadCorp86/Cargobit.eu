/**
 * CargoBit Event Types & Payloads
 * 
 * This module defines all event types, topics, and payloads for the
 * event-driven CargoBit transport platform architecture.
 * 
 * @module @cargobit/events
 * @version 1.0.0
 */

// =============================================================================
// TOPIC REGISTRY
// =============================================================================

/**
 * Core event topics used across the CargoBit platform.
 * Topics follow the pattern: {domain}.{action}
 */
export const CORE_TOPICS = {
  // Order domain
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_PUBLISHED: 'order.published',

  // Pricing domain
  PRICING_CALCULATED: 'pricing.calculated',
  PRICING_UPDATED: 'pricing.updated',

  // Bidding domain
  BID_SUBMITTED: 'bid.submitted',
  BID_STORED: 'bid.stored',
  BID_VALIDATED: 'bid.validated',
  BID_WITHDRAWN: 'bid.withdrawn',
  BID_ACCEPTED: 'bid.accepted',
  BID_REJECTED: 'bid.rejected',

  // Matching domain
  MATCHING_COMPLETED: 'matching.completed',
  MATCHING_FAILED: 'matching.failed',

  // Execution domain
  EXECUTION_CREATED: 'execution.created',
  EXECUTION_STATUS_CHANGED: 'execution.status_changed',
  EXECUTION_POD_UPLOADED: 'execution.pod_uploaded',
  EXECUTION_COMPLETED: 'execution.completed',

  // Carrier domain
  CARRIER_STATS_UPDATED: 'carrier.stats.updated',
  CARRIER_CAPACITY_UPDATED: 'carrier.capacity.updated',
  CARRIER_PROFILE_UPDATED: 'carrier.profile.updated',

  // Risk domain
  RISK_UPDATED: 'risk.updated',
  RISK_LEVEL_CHANGED: 'risk.level_changed',

  // Fraud domain
  FRAUD_SUSPECTED: 'fraud.suspected',
  FRAUD_FLAGGED: 'fraud.flagged',

  // Audit domain
  AUDIT_RECORD_CREATED: 'audit.record_created',

  // Notification domain
  NOTIFICATION_SENT: 'notification.sent',
} as const;

export type Topic = typeof CORE_TOPICS[keyof typeof CORE_TOPICS];

// =============================================================================
// BASE EVENT STRUCTURE
// =============================================================================

/**
 * Base event structure for all CargoBit events.
 * All events include metadata for tracing and correlation.
 */
export interface BaseEvent<T extends Topic, P> {
  /** Unique event identifier (ULID format recommended) */
  id: string;
  
  /** Event topic */
  topic: T;
  
  /** Event payload */
  payload: P;
  
  /** ISO 8601 timestamp */
  timestamp: string;
  
  /** Correlation ID for tracing across services */
  correlationId: string;
  
  /** Service that published the event */
  source: string;
  
  /** Event schema version */
  version: string;
  
  /** Optional metadata */
  metadata?: EventMetadata;
}

export interface EventMetadata {
  /** ID of the user who triggered the event */
  userId?: string;
  
  /** Type of actor (user, system, service) */
  actorType?: 'user' | 'system' | 'service';
  
  /** Actor ID */
  actorId?: string;
  
  /** IP address (for user-initiated events) */
  ipAddress?: string;
  
  /** User agent */
  userAgent?: string;
  
  /** Session ID */
  sessionId?: string;
  
  /** Additional context */
  context?: Record<string, unknown>;
}

// =============================================================================
// ORDER EVENTS
// =============================================================================

export interface OrderCreatedPayload {
  orderId: string;
  shipperId: string;
  shipperCompanyId?: string;
  
  // Route
  pickupAddress: Address;
  deliveryAddress: Address;
  distanceKm?: number;
  isInternational: boolean;
  transitCountries?: string[];
  
  // Schedule
  pickupDatetime: string;
  deliveryDatetime?: string;
  
  // Cargo
  transportType: TransportType;
  weightKg?: number;
  volumeM3?: number;
  
  // Requirements
  vehicleRequirements?: VehicleRequirements;
  driverRequirements?: DriverRequirements;
  
  // Pricing
  shipperBudget?: number;
  currency: string;
  
  // Status
  status: OrderStatus;
}

export interface OrderUpdatedPayload {
  orderId: string;
  changedFields: string[];
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
}

export interface OrderCancelledPayload {
  orderId: string;
  reason: string;
  cancelledBy: string;
  refundStatus?: 'pending' | 'processed' | 'not_applicable';
}

export interface OrderPublishedPayload {
  orderId: string;
  publishedAt: string;
  pricingRequested: boolean;
}

export type OrderCreatedEvent = BaseEvent<typeof CORE_TOPICS.ORDER_CREATED, OrderCreatedPayload>;
export type OrderUpdatedEvent = BaseEvent<typeof CORE_TOPICS.ORDER_UPDATED, OrderUpdatedPayload>;
export type OrderCancelledEvent = BaseEvent<typeof CORE_TOPICS.ORDER_CANCELLED, OrderCancelledPayload>;
export type OrderPublishedEvent = BaseEvent<typeof CORE_TOPICS.ORDER_PUBLISHED, OrderPublishedPayload>;

// =============================================================================
// PRICING EVENTS
// =============================================================================

export interface PricingCalculatedPayload {
  orderId: string;
  marketPrice: number;
  startPrice: number;
  minPrice: number;
  currency: string;
  
  // Cost breakdown
  costBreakdown: CostBreakdown;
  
  // Adjustments
  riskAdjustment: number;
  demandAdjustment: number;
  routeComplexityFactor: number;
  
  // Context
  validUntil: string;
  calculatedBy: 'rule' | 'ml' | 'hybrid';
  configVersion: string;
  
  // Market context
  marketContext?: {
    medianPrice: number;
    priceRange: { min: number; max: number };
    confidence: number;
    dataPoints: number;
  };
}

export interface CostBreakdown {
  baseCost: number;
  fuelCost: number;
  tollCost: number;
  laborCost: number;
  riskCost: number;
  total: number;
}

export interface PricingUpdatedPayload {
  configId: string;
  changes: Record<string, { previous: unknown; current: unknown }>;
  updatedBy: string;
  reason?: string;
}

export type PricingCalculatedEvent = BaseEvent<typeof CORE_TOPICS.PRICING_CALCULATED, PricingCalculatedPayload>;
export type PricingUpdatedEvent = BaseEvent<typeof CORE_TOPICS.PRICING_UPDATED, PricingUpdatedPayload>;

// =============================================================================
// BID EVENTS
// =============================================================================

export interface BidSubmittedPayload {
  bidId: string;
  orderId: string;
  carrierId: string;
  driverId: string;
  vehicleId: string;
  bidPrice: number;
  currency: string;
  message?: string;
  estimatedDuration?: number;
  
  // Context
  carrierContext?: {
    currentLocation?: GeoLocation;
    distanceToPickup?: number;
  };
  
  validUntil?: string;
}

export interface BidStoredPayload {
  bidId: string;
  orderId: string;
  carrierId: string;
  storedAt: string;
}

export interface BidValidatedPayload {
  bidId: string;
  orderId: string;
  carrierId: string;
  bidPrice: number;
  currency: string;
  
  // Validation result
  valid: boolean;
  reason: BidValidationReason;
  priceScore: number; // 0-1
  
  // Details
  details: {
    marketPrice: number;
    startPrice: number;
    minPrice: number;
    riskLevel: 'green' | 'yellow' | 'red';
    discountPct?: number;
  };
  
  warnings?: string[];
}

export type BidValidationReason = 
  | 'VALID'
  | 'BID_BELOW_MIN_PRICE'
  | 'BID_BELOW_HARD_FLOOR'
  | 'EXCEEDS_MAX_DISCOUNT'
  | 'RISK_BLOCKED'
  | 'ORDER_NOT_FOUND'
  | 'PRICING_EXPIRED';

export interface BidWithdrawnPayload {
  bidId: string;
  orderId: string;
  carrierId: string;
  reason?: string;
  withdrawnAt: string;
}

export interface BidAcceptedPayload {
  bidId: string;
  orderId: string;
  carrierId: string;
  acceptedBy: string;
  acceptedAt: string;
}

export interface BidRejectedPayload {
  bidId: string;
  orderId: string;
  carrierId: string;
  reason: string;
  rejectedBy: string;
  rejectedAt: string;
}

export type BidSubmittedEvent = BaseEvent<typeof CORE_TOPICS.BID_SUBMITTED, BidSubmittedPayload>;
export type BidStoredEvent = BaseEvent<typeof CORE_TOPICS.BID_STORED, BidStoredPayload>;
export type BidValidatedEvent = BaseEvent<typeof CORE_TOPICS.BID_VALIDATED, BidValidatedPayload>;
export type BidWithdrawnEvent = BaseEvent<typeof CORE_TOPICS.BID_WITHDRAWN, BidWithdrawnPayload>;
export type BidAcceptedEvent = BaseEvent<typeof CORE_TOPICS.BID_ACCEPTED, BidAcceptedPayload>;
export type BidRejectedEvent = BaseEvent<typeof CORE_TOPICS.BID_REJECTED, BidRejectedPayload>;

// =============================================================================
// MATCHING EVENTS
// =============================================================================

export interface MatchingCompletedPayload {
  orderId: string;
  resultId: string;
  
  // Winner
  winner: MatchResult;
  
  // All candidates (ranked)
  allCandidates: MatchResult[];
  
  // Configuration snapshot
  config: MatchingConfigSnapshot;
  
  // Timing
  matchedAt: string;
  processingTimeMs: number;
  
  // Flags
  isAutoMatch: boolean;
  isOverride?: boolean;
  overriddenBy?: string;
  overrideReason?: string;
}

export interface MatchResult {
  carrierId: string;
  driverId: string;
  vehicleId: string;
  bidId: string;
  bidPrice: number;
  currency: string;
  
  // Scores
  score: number;
  priceScore: number;
  reliabilityScore: number;
  capacityScore: number;
  distanceScore: number;
  riskScore: number;
  
  // Ranking
  rank: number;
  
  // Explanation
  explanation: string[];
  warnings?: string[];
  
  // Auto-match eligibility
  autoMatchEligible: boolean;
}

export interface MatchingConfigSnapshot {
  version: string;
  weights: {
    price: number;
    reliability: number;
    capacity: number;
    distance: number;
    risk: number;
  };
  thresholds: {
    minScore: number;
    autoMatchGap: number;
    minBidsRequired: number;
  };
}

export interface MatchingFailedPayload {
  orderId: string;
  reason: MatchingFailureReason;
  details?: Record<string, unknown>;
  failedAt: string;
}

export type MatchingFailureReason = 
  | 'NO_VALID_BIDS'
  | 'ALL_BIDS_BELOW_THRESHOLD'
  | 'PRICING_NOT_AVAILABLE'
  | 'CARRIER_STATS_NOT_AVAILABLE'
  | 'INTERNAL_ERROR'
  | 'TIMEOUT';

export type MatchingCompletedEvent = BaseEvent<typeof CORE_TOPICS.MATCHING_COMPLETED, MatchingCompletedPayload>;
export type MatchingFailedEvent = BaseEvent<typeof CORE_TOPICS.MATCHING_FAILED, MatchingFailedPayload>;

// =============================================================================
// EXECUTION EVENTS
// =============================================================================

export interface ExecutionCreatedPayload {
  executionId: string;
  orderId: string;
  carrierId: string;
  driverId: string;
  vehicleId: string;
  
  // Pricing
  agreedPrice: number;
  currency: string;
  
  // Schedule
  scheduledPickup: string;
  estimatedDelivery?: string;
  
  // Match context
  matchResult?: {
    score: number;
    explanation: string[];
  };
  
  createdAt: string;
}

export interface ExecutionStatusChangedPayload {
  executionId: string;
  orderId: string;
  carrierId: string;
  
  // Status
  oldStatus: ExecutionStatus;
  newStatus: ExecutionStatus;
  
  // Location (if available)
  location?: GeoLocation;
  
  // Additional info
  notes?: string;
  
  // Timestamps
  timestamp: string;
  changedBy: string;
}

export interface ExecutionPodUploadedPayload {
  executionId: string;
  orderId: string;
  carrierId: string;
  
  // Document
  documentId: string;
  documentUrl: string;
  documentType: 'delivery_note' | 'photo' | 'signed_document';
  
  // Metadata
  signed: boolean;
  recipientName?: string;
  
  uploadedAt: string;
  uploadedBy: string;
}

export interface ExecutionCompletedPayload {
  executionId: string;
  orderId: string;
  carrierId: string;
  
  // Rating
  shipperRating?: number;
  shipperComment?: string;
  
  // Timing
  actualPickup?: string;
  actualDelivery?: string;
  completedAt: string;
  
  // Stats update
  onTime: boolean;
  delayMinutes?: number;
}

export type ExecutionCreatedEvent = BaseEvent<typeof CORE_TOPICS.EXECUTION_CREATED, ExecutionCreatedPayload>;
export type ExecutionStatusChangedEvent = BaseEvent<typeof CORE_TOPICS.EXECUTION_STATUS_CHANGED, ExecutionStatusChangedPayload>;
export type ExecutionPodUploadedEvent = BaseEvent<typeof CORE_TOPICS.EXECUTION_POD_UPLOADED, ExecutionPodUploadedPayload>;
export type ExecutionCompletedEvent = BaseEvent<typeof CORE_TOPICS.EXECUTION_COMPLETED, ExecutionCompletedPayload>;

// =============================================================================
// CARRIER EVENTS
// =============================================================================

export interface CarrierStatsUpdatedPayload {
  carrierId: string;
  
  // Updated stats
  updatedStats: Partial<CarrierStats>;
  
  // Full snapshot (optional)
  fullSnapshot?: CarrierStats;
  
  updatedAt: string;
}

export interface CarrierStats {
  // Reliability
  onTimeRate: number;
  cancelRate: number;
  disputeRate: number;
  
  // Performance
  completedOrders: number;
  totalDistanceKm: number;
  avgDeliveryTime: number;
  
  // Quality
  damageRate: number;
  claimRate: number;
  avgRating: number;
  
  // Response
  avgResponseTime: number;
  acceptanceRate: number;
  
  // Trends
  trendOnTime: number;
  trendRating: number;
}

export interface CarrierCapacityUpdatedPayload {
  carrierId: string;
  
  // Capacity
  capacity: {
    maxWeightKg: number;
    maxVolumeM3: number;
    vehicleTypes: string[];
    
    // Special capabilities
    hasAdr: boolean;
    hasCooling: boolean;
    hasLift: boolean;
    hasCrane: boolean;
    
    // Availability
    isAvailable: boolean;
    availableFrom?: string;
    availableUntil?: string;
    
    // Location
    currentLocation?: GeoLocation;
  };
  
  updatedAt: string;
}

export interface CarrierProfileUpdatedPayload {
  carrierId: string;
  changes: Record<string, { previous: unknown; current: unknown }>;
  updatedBy: string;
  updatedAt: string;
}

export type CarrierStatsUpdatedEvent = BaseEvent<typeof CORE_TOPICS.CARRIER_STATS_UPDATED, CarrierStatsUpdatedPayload>;
export type CarrierCapacityUpdatedEvent = BaseEvent<typeof CORE_TOPICS.CARRIER_CAPACITY_UPDATED, CarrierCapacityUpdatedPayload>;
export type CarrierProfileUpdatedEvent = BaseEvent<typeof CORE_TOPICS.CARRIER_PROFILE_UPDATED, CarrierProfileUpdatedPayload>;

// =============================================================================
// RISK EVENTS
// =============================================================================

export interface RiskUpdatedPayload {
  entityType: 'order' | 'carrier' | 'route';
  entityId: string;
  
  // Score change
  oldScore: number;
  newScore: number;
  
  // Level change
  oldLevel: RiskLevel;
  newLevel: RiskLevel;
  
  // Contributing factors
  factors: RiskFactor[];
  
  updatedAt: string;
}

export type RiskLevel = 'green' | 'yellow' | 'red';

export interface RiskFactor {
  name: string;
  impact: number;
  description?: string;
}

export interface RiskLevelChangedPayload {
  entityType: 'order' | 'carrier' | 'route';
  entityId: string;
  oldLevel: RiskLevel;
  newLevel: RiskLevel;
  reason: string;
  changedAt: string;
}

export type RiskUpdatedEvent = BaseEvent<typeof CORE_TOPICS.RISK_UPDATED, RiskUpdatedPayload>;
export type RiskLevelChangedEvent = BaseEvent<typeof CORE_TOPICS.RISK_LEVEL_CHANGED, RiskLevelChangedPayload>;

// =============================================================================
// FRAUD EVENTS
// =============================================================================

export interface FraudSuspectedPayload {
  /** ID of the entity flagged for fraud */
  entityId: string;
  
  /** Type of entity (carrier, bid, order) */
  entityType: 'carrier' | 'bid' | 'order';
  
  /** Carrier ID associated with fraud */
  carrierId: string;
  
  /** Bid ID if applicable */
  bidId?: string;
  
  /** Order ID if applicable */
  orderId?: string;
  
  // Fraud Scores
  carrierFraudScore: number;
  bidFraudScore: number;
  totalFraudScore: number;
  
  // Level
  fraudLevel: 'unauffaellig' | 'beobachten' | 'fraud_suspected';
  
  // Breakdown
  breakdown: {
    carrier: {
      cancelRate: number;
      disputeRate: number;
      noShowRate: number;
      patternScore: number;
    };
    bid: {
      dumpingScore: number;
      spamScore: number;
      coordinationScore: number;
    };
  };
  
  // Recommendations
  recommendations: string[];
  
  // Config Version
  configVersion: string;
  
  // Timestamp
  detectedAt: string;
  
  // Correlation
  correlationId: string;
}

export interface FraudFlaggedPayload {
  /** ID of the flagged entity */
  entityId: string;
  entityType: 'carrier' | 'bid' | 'order';
  carrierId: string;
  
  // Fraud Score
  totalFraudScore: number;
  fraudLevel: 'unauffaellig' | 'beobachten' | 'fraud_suspected';
  
  // Flag reason
  flagReason: string;
  
  // Manual review
  requiresManualReview: boolean;
  
  // Actions taken
  actionsTaken: string[];
  
  // Config Version
  configVersion: string;
  
  // Timestamp
  flaggedAt: string;
  correlationId: string;
}

export type FraudSuspectedEvent = BaseEvent<typeof CORE_TOPICS.FRAUD_SUSPECTED, FraudSuspectedPayload>;
export type FraudFlaggedEvent = BaseEvent<typeof CORE_TOPICS.FRAUD_FLAGGED, FraudFlaggedPayload>;

// =============================================================================
// AUDIT EVENTS
// =============================================================================

export interface AuditRecordCreatedPayload {
  auditId: string;
  timestamp: string;
  
  // Actor
  actorType: 'user' | 'system' | 'service';
  actorId: string;
  
  // Action
  service: string;
  action: string;
  
  // Entity
  entityType: string;
  entityId: string;
  
  // Payload
  payloadBefore: unknown;
  payloadAfter: unknown;
  
  // Correlation
  correlationId: string;
  
  // Metadata
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };
}

export type AuditRecordCreatedEvent = BaseEvent<typeof CORE_TOPICS.AUDIT_RECORD_CREATED, AuditRecordCreatedPayload>;

// =============================================================================
// NOTIFICATION EVENTS
// =============================================================================

export interface NotificationSentPayload {
  notificationId: string;
  recipientId: string;
  recipientType: 'shipper' | 'carrier' | 'admin';
  
  // Content
  type: string;
  channel: 'email' | 'push' | 'sms' | 'in_app';
  subject?: string;
  
  // Status
  status: 'sent' | 'delivered' | 'failed';
  error?: string;
  
  // Context
  relatedEntityType?: string;
  relatedEntityId?: string;
  
  sentAt: string;
}

export type NotificationSentEvent = BaseEvent<typeof CORE_TOPICS.NOTIFICATION_SENT, NotificationSentPayload>;

// =============================================================================
// SHARED TYPES
// =============================================================================

export interface Address {
  street?: string;
  city?: string;
  postalCode?: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  timestamp?: string;
  accuracy?: number;
}

export type TransportType = 
  | 'FTL'
  | 'LTL'
  | 'FTL_HAZMAT'
  | 'LTL_HAZMAT'
  | 'FTL_TEMP'
  | 'LTL_TEMP';

export type OrderStatus = 
  | 'DRAFT'
  | 'PUBLISHED'
  | 'PRICED'
  | 'BIDDING'
  | 'ASSIGNED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type ExecutionStatus = 
  | 'CREATED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'POD_SUBMITTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface VehicleRequirements {
  vehicleType?: string;
  minWeight?: number;
  minVolume?: number;
  hasAdr?: boolean;
  hasCooling?: boolean;
  temperatureRange?: { min: number; max: number };
  hasLift?: boolean;
  hasCrane?: boolean;
}

export interface DriverRequirements {
  languages?: string[];
  certifications?: string[];
  experience?: number;
}

// =============================================================================
// EVENT UNION TYPES
// =============================================================================

/**
 * Union type of all CargoBit events.
 * Use for type-safe event handling.
 */
export type CargoBitEvent =
  | OrderCreatedEvent
  | OrderUpdatedEvent
  | OrderCancelledEvent
  | OrderPublishedEvent
  | PricingCalculatedEvent
  | PricingUpdatedEvent
  | BidSubmittedEvent
  | BidStoredEvent
  | BidValidatedEvent
  | BidWithdrawnEvent
  | BidAcceptedEvent
  | BidRejectedEvent
  | MatchingCompletedEvent
  | MatchingFailedEvent
  | ExecutionCreatedEvent
  | ExecutionStatusChangedEvent
  | ExecutionPodUploadedEvent
  | ExecutionCompletedEvent
  | CarrierStatsUpdatedEvent
  | CarrierCapacityUpdatedEvent
  | CarrierProfileUpdatedEvent
  | RiskUpdatedEvent
  | RiskLevelChangedEvent
  | FraudSuspectedEvent
  | FraudFlaggedEvent
  | AuditRecordCreatedEvent
  | NotificationSentEvent;

// =============================================================================
// EVENT TYPE GUARDS
// =============================================================================

export function isOrderEvent(event: CargoBitEvent): event is OrderCreatedEvent | OrderUpdatedEvent | OrderCancelledEvent | OrderPublishedEvent {
  return event.topic.startsWith('order.');
}

export function isPricingEvent(event: CargoBitEvent): event is PricingCalculatedEvent | PricingUpdatedEvent {
  return event.topic.startsWith('pricing.');
}

export function isBidEvent(event: CargoBitEvent): event is BidSubmittedEvent | BidStoredEvent | BidValidatedEvent | BidWithdrawnEvent | BidAcceptedEvent | BidRejectedEvent {
  return event.topic.startsWith('bid.');
}

export function isMatchingEvent(event: CargoBitEvent): event is MatchingCompletedEvent | MatchingFailedEvent {
  return event.topic.startsWith('matching.');
}

export function isExecutionEvent(event: CargoBitEvent): event is ExecutionCreatedEvent | ExecutionStatusChangedEvent | ExecutionPodUploadedEvent | ExecutionCompletedEvent {
  return event.topic.startsWith('execution.');
}

export function isCarrierEvent(event: CargoBitEvent): event is CarrierStatsUpdatedEvent | CarrierCapacityUpdatedEvent | CarrierProfileUpdatedEvent {
  return event.topic.startsWith('carrier.');
}

export function isRiskEvent(event: CargoBitEvent): event is RiskUpdatedEvent | RiskLevelChangedEvent {
  return event.topic.startsWith('risk.');
}

export function isFraudEvent(event: CargoBitEvent): event is FraudSuspectedEvent | FraudFlaggedEvent {
  return event.topic.startsWith('fraud.');
}

// =============================================================================
// EVENT PUBLISHER INTERFACE
// =============================================================================

/**
 * Interface for event publishers.
 * Implementations: InMemoryEventBus, KafkaEventBus, NATSEventBus
 */
export interface IEventPublisher {
  publish<T extends Topic, P>(event: BaseEvent<T, P>): Promise<void>;
}

/**
 * Interface for event subscribers.
 */
export interface IEventSubscriber {
  subscribe<T extends CargoBitEvent>(
    topic: Topic,
    handler: (event: T) => Promise<void>
  ): void;
  
  unsubscribe(topic: Topic): void;
}

/**
 * Combined interface for full event bus functionality.
 */
export interface IEventBus extends IEventPublisher, IEventSubscriber {
  /**
   * Initialize the event bus connection.
   */
  connect(): Promise<void>;
  
  /**
   * Disconnect from the event bus.
   */
  disconnect(): Promise<void>;
  
  /**
   * Check if the event bus is connected.
   */
  isConnected(): boolean;
}

// =============================================================================
// EVENT FACTORY
// =============================================================================

/**
 * Factory for creating events with consistent metadata.
 */
export class EventFactory {
  private source: string;
  private version: string;

  constructor(source: string, version: string = '1.0.0') {
    this.source = source;
    this.version = version;
  }

  /**
   * Generate a ULID for event IDs.
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36).padStart(10, '0');
    const random = Math.random().toString(36).substring(2, 12);
    return `${timestamp}${random}`;
  }

  /**
   * Create a new event with standard metadata.
   */
  create<T extends Topic, P>(
    topic: T,
    payload: P,
    correlationId: string,
    metadata?: EventMetadata
  ): BaseEvent<T, P> {
    return {
      id: this.generateId(),
      topic,
      payload,
      timestamp: new Date().toISOString(),
      correlationId,
      source: this.source,
      version: this.version,
      metadata,
    };
  }
}
