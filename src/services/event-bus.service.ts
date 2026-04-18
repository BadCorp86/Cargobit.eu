/**
 * CargoBit Event Bus Service
 * 
 * Provides event-driven communication between microservices.
 * Supports multiple backends: InMemory (dev/test), Kafka (production), NATS (alternative).
 * 
 * @module @cargobit/event-bus
 * @version 1.0.0
 */

import {
  IEventBus,
  IEventPublisher,
  IEventSubscriber,
  Topic,
  BaseEvent,
  CargoBitEvent,
  CORE_TOPICS,
} from '../types/events';

// =============================================================================
// INMEMORY EVENT BUS (Development/Testing)
// =============================================================================

/**
 * InMemory implementation of the Event Bus.
 * Suitable for development, testing, and single-process scenarios.
 * 
 * @example
 * ```typescript
 * const eventBus = new InMemoryEventBus();
 * 
 * // Subscribe to events
 * eventBus.subscribe('order.created', async (event) => {
 *   console.log('Order created:', event.payload.orderId);
 * });
 * 
 * // Publish events
 * await eventBus.publish({
 *   id: 'evt_123',
 *   topic: 'order.created',
 *   payload: { orderId: 'order_456', ... },
 *   timestamp: new Date().toISOString(),
 *   correlationId: 'trace_abc',
 *   source: 'order-service',
 *   version: '1.0.0',
 * });
 * ```
 */
export class InMemoryEventBus implements IEventBus {
  private handlers: Map<Topic, Set<(event: CargoBitEvent) => Promise<void>>>;
  private connected: boolean = false;
  private eventLog: CargoBitEvent[] = [];
  private maxLogSize: number;

  constructor(maxLogSize: number = 1000) {
    this.handlers = new Map();
    this.maxLogSize = maxLogSize;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.handlers.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Publish an event to all subscribers.
   */
  async publish<T extends Topic, P>(event: BaseEvent<T, P>): Promise<void> {
    if (!this.connected) {
      throw new Error('EventBus is not connected');
    }

    // Log event for debugging/testing
    this.eventLog.push(event as CargoBitEvent);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }

    // Get handlers for this topic
    const topicHandlers = this.handlers.get(event.topic);
    if (!topicHandlers || topicHandlers.size === 0) {
      return; // No subscribers
    }

    // Execute all handlers (non-blocking, fire-and-forget)
    const handlerPromises = Array.from(topicHandlers).map(async (handler) => {
      try {
        await handler(event as CargoBitEvent);
      } catch (error) {
        console.error(`Error in event handler for ${event.topic}:`, error);
        // In production, this would go to a dead-letter queue
      }
    });

    // Wait for all handlers to complete
    await Promise.allSettled(handlerPromises);
  }

  /**
   * Subscribe to a topic.
   */
  subscribe<T extends CargoBitEvent>(
    topic: Topic,
    handler: (event: T) => Promise<void>
  ): void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
    }
    this.handlers.get(topic)!.add(handler as (event: CargoBitEvent) => Promise<void>);
  }

  /**
   * Unsubscribe from a topic.
   */
  unsubscribe(topic: Topic): void {
    this.handlers.delete(topic);
  }

  /**
   * Get all published events (for testing/debugging).
   */
  getEventLog(): CargoBitEvent[] {
    return [...this.eventLog];
  }

  /**
   * Clear the event log.
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Get subscriber count for a topic.
   */
  getSubscriberCount(topic: Topic): number {
    return this.handlers.get(topic)?.size ?? 0;
  }
}

// =============================================================================
// KAFKA EVENT BUS (Production)
// =============================================================================

/**
 * Kafka configuration options.
 */
export interface KafkaEventBusConfig {
  /** Kafka broker addresses */
  brokers: string[];
  
  /** Client ID */
  clientId: string;
  
  /** Consumer group ID */
  groupId: string;
  
  /** SASL authentication (optional) */
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
  
  /** SSL configuration */
  ssl?: boolean | {
    ca?: Buffer;
    cert?: Buffer;
    key?: Buffer;
  };
  
  /** Topic prefix (for environment isolation) */
  topicPrefix?: string;
  
  /** Number of partitions per topic */
  partitions?: number;
  
  /** Replication factor */
  replicationFactor?: number;
}

/**
 * Kafka-based Event Bus for production deployments.
 * 
 * Requires: kafkajs package
 * 
 * @example
 * ```typescript
 * const eventBus = new KafkaEventBus({
 *   brokers: ['kafka-1:9092', 'kafka-2:9092'],
 *   clientId: 'pricing-service',
 *   groupId: 'pricing-service-consumers',
 *   topicPrefix: 'cargobit-prod-',
 * });
 * 
 * await eventBus.connect();
 * 
 * eventBus.subscribe('bid.validated', async (event) => {
 *   // Handle bid validation
 * });
 * ```
 */
export class KafkaEventBus implements IEventBus {
  private config: KafkaEventBusConfig;
  private connected: boolean = false;
  private producer: any = null; // KafkaJS Producer
  private consumer: any = null; // KafkaJS Consumer
  private admin: any = null;    // KafkaJS Admin
  private kafka: any = null;    // KafkaJS instance
  private handlers: Map<Topic, Set<(event: CargoBitEvent) => Promise<void>>>;
  private subscribedTopics: Set<Topic>;

  constructor(config: KafkaEventBusConfig) {
    this.config = config;
    this.handlers = new Map();
    this.subscribedTopics = new Set();
  }

  /**
   * Initialize Kafka connection and ensure topics exist.
   */
  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid requiring kafkajs in dev
      const { Kafka } = await import('kafkajs');

      this.kafka = new Kafka({
        clientId: this.config.clientId,
        brokers: this.config.brokers,
        sasl: this.config.sasl,
        ssl: this.config.ssl,
      });

      this.producer = this.kafka.producer();
      this.consumer = this.kafka.consumer({
        groupId: this.config.groupId,
      });
      this.admin = this.kafka.admin();

      await this.producer.connect();
      await this.consumer.connect();
      await this.admin.connect();

      // Ensure all core topics exist
      await this.ensureTopicsExist();

      this.connected = true;
      console.log(`KafkaEventBus connected to ${this.config.brokers.join(', ')}`);
    } catch (error) {
      console.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Kafka.
   */
  async disconnect(): Promise<void> {
    if (this.producer) await this.producer.disconnect();
    if (this.consumer) await this.consumer.disconnect();
    if (this.admin) await this.admin.disconnect();
    this.connected = false;
    this.handlers.clear();
    this.subscribedTopics.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get the full topic name with prefix.
   */
  private getFullTopicName(topic: Topic): string {
    const prefix = this.config.topicPrefix ?? '';
    return `${prefix}${topic}`;
  }

  /**
   * Ensure all required topics exist in Kafka.
   */
  private async ensureTopicsExist(): Promise<void> {
    const topics = Object.values(CORE_TOPICS).map((topic) => ({
      topic: this.getFullTopicName(topic),
      numPartitions: this.config.partitions ?? 3,
      replicationFactor: this.config.replicationFactor ?? 1,
    }));

    await this.admin.createTopics({
      topics,
      waitForLeaders: true,
    });
  }

  /**
   * Publish an event to Kafka.
   */
  async publish<T extends Topic, P>(event: BaseEvent<T, P>): Promise<void> {
    if (!this.connected || !this.producer) {
      throw new Error('KafkaEventBus is not connected');
    }

    const topic = this.getFullTopicName(event.topic);
    const key = event.correlationId; // Use correlation ID for partitioning

    await this.producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(event),
          headers: {
            source: event.source,
            version: event.version,
            timestamp: event.timestamp,
          },
        },
      ],
    });
  }

  /**
   * Subscribe to a Kafka topic.
   */
  subscribe<T extends CargoBitEvent>(
    topic: Topic,
    handler: (event: T) => Promise<void>
  ): void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
    }
    this.handlers.get(topic)!.add(handler as (event: CargoBitEvent) => Promise<void>);

    // Subscribe to the topic if not already subscribed
    if (!this.subscribedTopics.has(topic)) {
      this.subscribeToTopic(topic);
    }
  }

  /**
   * Subscribe to a Kafka topic and start consuming messages.
   */
  private async subscribeToTopic(topic: Topic): Promise<void> {
    if (!this.connected || !this.consumer) {
      throw new Error('KafkaEventBus is not connected');
    }

    const fullTopic = this.getFullTopicName(topic);
    await this.consumer.subscribe({
      topic: fullTopic,
      fromBeginning: false,
    });

    this.subscribedTopics.add(topic);

    // Start consuming if this is the first subscription
    if (this.subscribedTopics.size === 1) {
      this.startConsuming();
    }
  }

  /**
   * Start consuming messages from subscribed topics.
   */
  private async startConsuming(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ topic, message }: any) => {
        try {
          // Parse the event
          const event = JSON.parse(message.value.toString()) as CargoBitEvent;
          
          // Remove prefix from topic
          const topicWithoutPrefix = topic.replace(this.config.topicPrefix ?? '', '') as Topic;
          
          // Get handlers
          const handlers = this.handlers.get(topicWithoutPrefix);
          if (handlers) {
            for (const handler of handlers) {
              try {
                await handler(event);
              } catch (error) {
                console.error(`Error in Kafka handler for ${topic}:`, error);
              }
            }
          }
        } catch (error) {
          console.error('Error processing Kafka message:', error);
        }
      },
    });
  }

  /**
   * Unsubscribe from a topic.
   */
  unsubscribe(topic: Topic): void {
    this.handlers.delete(topic);
    this.subscribedTopics.delete(topic);
    // Note: Kafka doesn't support unsubscribing from individual topics
    // The consumer will continue to receive messages, but they'll be ignored
  }
}

// =============================================================================
// NATS EVENT BUS (Alternative)
// =============================================================================

/**
 * NATS configuration options.
 */
export interface NatsEventBusConfig {
  /** NATS server URLs */
  servers: string[];
  
  /** Client name */
  name?: string;
  
  /** Queue group for load balancing */
  queue?: string;
  
  /** Authentication token */
  token?: string;
  
  /** User credentials */
  user?: string;
  pass?: string;
  
  /** Subject prefix (for environment isolation) */
  subjectPrefix?: string;
  
  /** Reconnect options */
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectTimeWait?: number;
}

/**
 * NATS-based Event Bus for production deployments.
 * 
 * Requires: nats package
 * 
 * @example
 * ```typescript
 * const eventBus = new NatsEventBus({
 *   servers: ['nats://nats-1:4222', 'nats://nats-2:4222'],
 *   name: 'matching-service',
 *   queue: 'matching-workers',
 *   subjectPrefix: 'cargobit.prod.',
 * });
 * 
 * await eventBus.connect();
 * ```
 */
export class NatsEventBus implements IEventBus {
  private config: NatsEventBusConfig;
  private connected: boolean = false;
  private nc: any = null;       // NATS connection
  private subs: Map<Topic, any> = new Map(); // Subscriptions
  private handlers: Map<Topic, Set<(event: CargoBitEvent) => Promise<void>>>;

  constructor(config: NatsEventBusConfig) {
    this.config = config;
    this.handlers = new Map();
  }

  async connect(): Promise<void> {
    try {
      const { connect } = await import('nats');

      this.nc = await connect({
        servers: this.config.servers,
        name: this.config.name,
        token: this.config.token,
        user: this.config.user,
        pass: this.config.pass,
        reconnect: this.config.reconnect ?? true,
        maxReconnectAttempts: this.config.maxReconnectAttempts ?? -1,
        reconnectTimeWait: this.config.reconnectTimeWait ?? 2000,
      });

      this.connected = true;
      console.log(`NatsEventBus connected to ${this.config.servers.join(', ')}`);
    } catch (error) {
      console.error('Failed to connect to NATS:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.nc) {
      // Close all subscriptions
      for (const sub of this.subs.values()) {
        sub.unsubscribe();
      }
      this.subs.clear();
      
      await this.nc.close();
    }
    this.connected = false;
    this.handlers.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get the full subject name with prefix.
   */
  private getFullSubject(topic: Topic): string {
    const prefix = this.config.subjectPrefix ?? '';
    return `${prefix}${topic}`;
  }

  /**
   * Publish an event to NATS.
   */
  async publish<T extends Topic, P>(event: BaseEvent<T, P>): Promise<void> {
    if (!this.connected || !this.nc) {
      throw new Error('NatsEventBus is not connected');
    }

    const subject = this.getFullSubject(event.topic);
    this.nc.publish(subject, JSON.stringify(event));
  }

  /**
   * Subscribe to a NATS subject.
   */
  subscribe<T extends CargoBitEvent>(
    topic: Topic,
    handler: (event: T) => Promise<void>
  ): void {
    if (!this.connected || !this.nc) {
      throw new Error('NatsEventBus is not connected');
    }

    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
    }
    this.handlers.get(topic)!.add(handler as (event: CargoBitEvent) => Promise<void>);

    // Create NATS subscription if not exists
    if (!this.subs.has(topic)) {
      const subject = this.getFullSubject(topic);
      
      const sub = this.nc.subscribe(subject, {
        queue: this.config.queue,
        callback: async (err: Error | null, msg: any) => {
          if (err) {
            console.error(`NATS subscription error for ${topic}:`, err);
            return;
          }

          try {
            const event = JSON.parse(msg.data) as CargoBitEvent;
            const handlers = this.handlers.get(topic);
            if (handlers) {
              for (const h of handlers) {
                try {
                  await h(event);
                } catch (error) {
                  console.error(`Error in NATS handler for ${topic}:`, error);
                }
              }
            }
          } catch (error) {
            console.error('Error processing NATS message:', error);
          }
        },
      });

      this.subs.set(topic, sub);
    }
  }

  /**
   * Unsubscribe from a subject.
   */
  unsubscribe(topic: Topic): void {
    const sub = this.subs.get(topic);
    if (sub) {
      sub.unsubscribe();
      this.subs.delete(topic);
    }
    this.handlers.delete(topic);
  }
}

// =============================================================================
// EVENT BUS FACTORY
// =============================================================================

export type EventBusType = 'memory' | 'kafka' | 'nats';

export interface EventBusFactoryConfig {
  type: EventBusType;
  source: string;
  kafka?: KafkaEventBusConfig;
  nats?: NatsEventBusConfig;
}

/**
 * Factory for creating the appropriate Event Bus implementation.
 */
export class EventBusFactory {
  /**
   * Create an Event Bus based on configuration.
   */
  static async create(config: EventBusFactoryConfig): Promise<IEventBus> {
    let eventBus: IEventBus;

    switch (config.type) {
      case 'kafka':
        if (!config.kafka) {
          throw new Error('Kafka configuration required for Kafka event bus');
        }
        eventBus = new KafkaEventBus({
          ...config.kafka,
          clientId: config.kafka.clientId ?? config.source,
        });
        break;

      case 'nats':
        if (!config.nats) {
          throw new Error('NATS configuration required for NATS event bus');
        }
        eventBus = new NatsEventBus(config.nats);
        break;

      case 'memory':
      default:
        eventBus = new InMemoryEventBus();
        break;
    }

    await eventBus.connect();
    return eventBus;
  }

  /**
   * Create an Event Bus from environment variables.
   */
  static async createFromEnv(source: string): Promise<IEventBus> {
    const type = (process.env.EVENT_BUS_TYPE as EventBusType) ?? 'memory';

    return EventBusFactory.create({
      type,
      source,
      kafka: {
        brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
        clientId: process.env.KAFKA_CLIENT_ID ?? source,
        groupId: process.env.KAFKA_GROUP_ID ?? `${source}-consumers`,
        topicPrefix: process.env.KAFKA_TOPIC_PREFIX,
        sasl: process.env.KAFKA_SASL_MECHANISM ? {
          mechanism: process.env.KAFKA_SASL_MECHANISM as 'plain' | 'scram-sha-256' | 'scram-sha-512',
          username: process.env.KAFKA_SASL_USERNAME ?? '',
          password: process.env.KAFKA_SASL_PASSWORD ?? '',
        } : undefined,
        ssl: process.env.KAFKA_SSL === 'true',
      },
      nats: {
        servers: (process.env.NATS_SERVERS ?? 'localhost:4222').split(','),
        name: process.env.NATS_NAME ?? source,
        queue: process.env.NATS_QUEUE,
        subjectPrefix: process.env.NATS_SUBJECT_PREFIX,
        token: process.env.NATS_TOKEN,
        user: process.env.NATS_USER,
        pass: process.env.NATS_PASS,
      },
    });
  }
}

// =============================================================================
// EVENT BUS DECORATOR: WITH RETRY
// =============================================================================

/**
 * Decorator that adds retry logic to an Event Bus.
 */
export class RetryEventBus implements IEventBus {
  private inner: IEventBus;
  private maxRetries: number;
  private retryDelay: number;

  constructor(inner: IEventBus, maxRetries: number = 3, retryDelay: number = 1000) {
    this.inner = inner;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  async connect(): Promise<void> {
    return this.inner.connect();
  }

  async disconnect(): Promise<void> {
    return this.inner.disconnect();
  }

  isConnected(): boolean {
    return this.inner.isConnected();
  }

  async publish<T extends Topic, P>(event: BaseEvent<T, P>): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.inner.publish(event);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Publish attempt ${attempt + 1} failed:`, error);
        
        if (attempt < this.maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  subscribe<T extends CargoBitEvent>(
    topic: Topic,
    handler: (event: T) => Promise<void>
  ): void {
    // Wrap handler with retry logic
    const retryHandler = async (event: T) => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          return await handler(event);
        } catch (error) {
          lastError = error as Error;
          console.warn(`Handler attempt ${attempt + 1} failed for ${topic}:`, error);
          
          if (attempt < this.maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, this.retryDelay * (attempt + 1)));
          }
        }
      }

      // All retries failed - in production, send to dead-letter queue
      console.error(`All retry attempts failed for ${topic}:`, lastError);
      throw lastError;
    };

    this.inner.subscribe(topic, retryHandler);
  }

  unsubscribe(topic: Topic): void {
    this.inner.unsubscribe(topic);
  }
}

// =============================================================================
// EVENT BUS DECORATOR: WITH LOGGING
// =============================================================================

/**
 * Decorator that adds logging to an Event Bus.
 */
export class LoggingEventBus implements IEventBus {
  private inner: IEventBus;
  private logger: (level: string, message: string, data?: any) => void;

  constructor(
    inner: IEventBus,
    logger: (level: string, message: string, data?: any) => void = console.log
  ) {
    this.inner = inner;
    this.logger = logger;
  }

  async connect(): Promise<void> {
    this.logger('info', 'EventBus connecting...');
    await this.inner.connect();
    this.logger('info', 'EventBus connected');
  }

  async disconnect(): Promise<void> {
    this.logger('info', 'EventBus disconnecting...');
    await this.inner.disconnect();
    this.logger('info', 'EventBus disconnected');
  }

  isConnected(): boolean {
    return this.inner.isConnected();
  }

  async publish<T extends Topic, P>(event: BaseEvent<T, P>): Promise<void> {
    this.logger('debug', `Publishing event: ${event.topic}`, {
      id: event.id,
      correlationId: event.correlationId,
      source: event.source,
    });
    
    try {
      await this.inner.publish(event);
      this.logger('debug', `Event published: ${event.topic}`);
    } catch (error) {
      this.logger('error', `Failed to publish event: ${event.topic}`, { error });
      throw error;
    }
  }

  subscribe<T extends CargoBitEvent>(
    topic: Topic,
    handler: (event: T) => Promise<void>
  ): void {
    this.logger('info', `Subscribing to topic: ${topic}`);
    
    this.inner.subscribe(topic, async (event: T) => {
      this.logger('debug', `Received event: ${topic}`, {
        id: event.id,
        correlationId: event.correlationId,
      });
      
      try {
        await handler(event);
        this.logger('debug', `Handled event: ${topic}`);
      } catch (error) {
        this.logger('error', `Error handling event: ${topic}`, { error });
        throw error;
      }
    });
  }

  unsubscribe(topic: Topic): void {
    this.logger('info', `Unsubscribing from topic: ${topic}`);
    this.inner.unsubscribe(topic);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  InMemoryEventBus,
  KafkaEventBus,
  NatsEventBus,
  EventBusFactory,
  RetryEventBus,
  LoggingEventBus,
};
