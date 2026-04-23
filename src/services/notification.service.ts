// ============================================
// CARGOBIT NOTIFICATION SERVICE
// Enterprise Security Notification System
// Version: 1.0.0
// ============================================

import { db } from '@/lib/db';
import {
  NotificationPriority,
  NotificationChannelType,
  NotificationStatus,
  NotificationEntityType,
  SendNotificationRequest,
  SendNotificationResponse,
  NotificationEventResponse,
  CreateTemplateRequest,
  NotificationTemplate,
  TemplateData,
  DEFAULT_RATE_LIMITS,
  getDefaultRetryDelay,
  getMaxRetries,
  NOTIFICATION_ERROR_CODES,
} from '@/types/notification';

// ============================================
// RATE LIMITER (In-Memory for Single Instance)
// ============================================

class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    let timestamps = this.requests.get(key) || [];
    
    // Remove old timestamps
    timestamps = timestamps.filter(t => t > windowStart);
    
    if (timestamps.length >= maxRequests) {
      return false;
    }
    
    timestamps.push(now);
    this.requests.set(key, timestamps);
    return true;
  }

  getRetryAfter(key: string, windowMs: number): number {
    const timestamps = this.requests.get(key) || [];
    if (timestamps.length === 0) return 0;
    
    const oldestInWindow = Math.min(...timestamps);
    return oldestInWindow + windowMs - Date.now();
  }

  // Cleanup old entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const filtered = timestamps.filter(t => t > now - 3600000); // Keep last hour
      if (filtered.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, filtered);
      }
    }
  }
}

const rateLimiter = new RateLimiter();
// Cleanup every 5 minutes
setInterval(() => rateLimiter.cleanup(), 300000);

// ============================================
// TEMPLATE ENGINE
// ============================================

class TemplateEngine {
  /**
   * Renders a template with placeholder substitution
   */
  render(template: string, data: TemplateData): string {
    let result = template;
    
    // Replace all {{placeholder}} with values from data
    const placeholderRegex = /\{\{(\w+)\}\}/g;
    result = result.replace(placeholderRegex, (match, key) => {
      const value = data[key];
      if (value === undefined || value === null) {
        return match; // Keep placeholder if no value
      }
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return String(value);
    });
    
    return result;
  }

  /**
   * Validates that all required placeholders have values
   */
  validateTemplate(template: string, data: TemplateData): string[] {
    const missing: string[] = [];
    const placeholderRegex = /\{\{(\w+)\}\}/g;
    let match;
    
    while ((match = placeholderRegex.exec(template)) !== null) {
      const key = match[1];
      if (data[key] === undefined || data[key] === null) {
        if (!missing.includes(key)) {
          missing.push(key);
        }
      }
    }
    
    return missing;
  }
}

const templateEngine = new TemplateEngine();

// ============================================
// NOTIFICATION SERVICE CLASS
// ============================================

class NotificationService {
  // ============================================
  // CORE METHODS
  // ============================================

  /**
   * Queue a notification for delivery
   */
  async send(request: SendNotificationRequest): Promise<SendNotificationResponse> {
    try {
      const results: string[] = [];
      const errors: string[] = [];

      for (const channel of request.channels) {
        const result = await this.queueNotification({
          ...request,
          channel,
        });
        
        if (result.status === 'queued') {
          results.push(result.eventId!);
        } else {
          errors.push(result.message || 'Unknown error');
        }
      }

      if (results.length === 0) {
        return {
          status: 'error',
          message: errors.join('; '),
          errorCode: 'DELIVERY_FAILED',
        };
      }

      return {
        status: 'queued',
        eventId: results[0], // Return first event ID
      };
    } catch (error) {
      console.error('[NotificationService] Error in send:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'DELIVERY_FAILED',
      };
    }
  }

  /**
   * Queue a single notification
   */
  private async queueNotification(params: {
    eventType: string;
    entityType: NotificationEntityType;
    entityId: string;
    priority: NotificationPriority;
    channel: NotificationChannelType;
    data: Record<string, unknown>;
  }): Promise<SendNotificationResponse> {
    // 1. Check rate limit
    const rateLimitKey = `${params.channel}:${params.eventType}`;
    const rateConfig = DEFAULT_RATE_LIMITS[params.channel];
    
    if (!rateLimiter.isAllowed(rateLimitKey, rateConfig.maxRequests, rateConfig.windowMs)) {
      // Schedule for retry
      const retryAfter = rateLimiter.getRetryAfter(rateLimitKey, rateConfig.windowMs);
      return this.scheduleForRetry(params, retryAfter);
    }

    // 2. Get template
    const template = await db.notificationTemplate.findFirst({
      where: {
        eventType: params.eventType,
        channel: params.channel as any,
        active: true,
      },
    });

    if (!template) {
      // Use fallback template
      return this.createWithFallbackTemplate(params);
    }

    // 3. Check channel config
    const channelConfig = await db.notificationChannel.findUnique({
      where: { channel: params.channel as any },
    });

    if (!channelConfig || !channelConfig.active) {
      return {
        status: 'error',
        message: NOTIFICATION_ERROR_CODES.CHANNEL_NOT_CONFIGURED.message,
        errorCode: NOTIFICATION_ERROR_CODES.CHANNEL_NOT_CONFIGURED.code,
      };
    }

    // 4. Render template
    const templateData: TemplateData = {
      ...params.data,
      entityType: params.entityType,
      entityId: params.entityId,
      timestamp: new Date().toISOString(),
    };

    const renderedBody = templateEngine.render(template.body, templateData);
    const renderedSubject = template.subject 
      ? templateEngine.render(template.subject, templateData) 
      : undefined;

    // 5. Create event
    const event = await db.notificationEvent.create({
      data: {
        eventType: params.eventType,
        entityType: params.entityType as any,
        entityId: params.entityId,
        priority: (params.priority || NotificationPriority.MEDIUM) as any,
        channel: params.channel as any,
        status: NotificationStatus.QUEUED,
        payload: JSON.stringify({
          subject: renderedSubject,
          body: renderedBody,
          data: params.data,
        }),
        templateId: template.id,
      },
    });

    // 6. Create queue item
    const maxRetries = getMaxRetries(params.priority || NotificationPriority.MEDIUM);
    await db.notificationQueueItem.create({
      data: {
        eventId: event.id,
        nextAttemptAt: new Date(),
        attempts: 0,
        maxAttempts: maxRetries,
      },
    });

    // 7. Try immediate delivery (async)
    this.processQueueItem(event.id).catch(err => {
      console.error('[NotificationService] Queue processing error:', err);
    });

    return {
      status: 'queued',
      eventId: event.id,
    };
  }

  /**
   * Schedule notification for retry after rate limit
   */
  private async scheduleForRetry(
    params: {
      eventType: string;
      entityType: NotificationEntityType;
      entityId: string;
      priority: NotificationPriority;
      channel: NotificationChannelType;
      data: Record<string, unknown>;
    },
    retryAfter: number
  ): Promise<SendNotificationResponse> {
    const event = await db.notificationEvent.create({
      data: {
        eventType: params.eventType,
        entityType: params.entityType as any,
        entityId: params.entityId,
        priority: (params.priority || NotificationPriority.MEDIUM) as any,
        channel: params.channel as any,
        status: NotificationStatus.PENDING,
        payload: JSON.stringify(params.data),
      },
    });

    const maxRetries = getMaxRetries(params.priority || NotificationPriority.MEDIUM);
    await db.notificationQueueItem.create({
      data: {
        eventId: event.id,
        nextAttemptAt: new Date(Date.now() + retryAfter + 30000), // +30s buffer
        attempts: 0,
        maxAttempts: maxRetries,
      },
    });

    return {
      status: 'queued',
      eventId: event.id,
    };
  }

  /**
   * Create notification with fallback template
   */
  private async createWithFallbackTemplate(params: {
    eventType: string;
    entityType: NotificationEntityType;
    entityId: string;
    priority: NotificationPriority;
    channel: NotificationChannelType;
    data: Record<string, unknown>;
  }): Promise<SendNotificationResponse> {
    const fallbackBody = this.getFallbackTemplate(params.eventType, params.channel);
    
    const templateData: TemplateData = {
      ...params.data,
      entityType: params.entityType,
      entityId: params.entityId,
      timestamp: new Date().toISOString(),
    };

    const renderedBody = templateEngine.render(fallbackBody, templateData);

    const event = await db.notificationEvent.create({
      data: {
        eventType: params.eventType,
        entityType: params.entityType as any,
        entityId: params.entityId,
        priority: (params.priority || NotificationPriority.MEDIUM) as any,
        channel: params.channel as any,
        status: NotificationStatus.QUEUED,
        payload: JSON.stringify({
          body: renderedBody,
          data: params.data,
        }),
      },
    });

    const maxRetries = getMaxRetries(params.priority || NotificationPriority.MEDIUM);
    await db.notificationQueueItem.create({
      data: {
        eventId: event.id,
        nextAttemptAt: new Date(),
        attempts: 0,
        maxAttempts: maxRetries,
      },
    });

    this.processQueueItem(event.id).catch(err => {
      console.error('[NotificationService] Queue processing error:', err);
    });

    return {
      status: 'queued',
      eventId: event.id,
    };
  }

  /**
   * Get fallback template for event type
   */
  private getFallbackTemplate(eventType: string, channel: NotificationChannelType): string {
    const fallbacks: Record<string, Record<NotificationChannelType, string>> = {
      HIGH_RISK_BLOCKED: {
        SLACK: '🚨 *High-Risk erkannt – Aktion blockiert*\n• Entity: {{entityType}} {{entityId}}\n• Score: {{riskScore}}\n• Zeit: {{timestamp}}',
        EMAIL: 'High-Risk Fall: {{entityType}} {{entityId}} wurde blockiert. Score: {{riskScore}}',
        SMS: 'High-Risk: {{entityType}} {{entityId}} blockiert. Score: {{riskScore}}',
        PUSH: 'High-Risk Alert: {{entityType}} blockiert',
        WEBHOOK: '{"event":"HIGH_RISK_BLOCKED","entity":"{{entityId}}","score":{{riskScore}}}',
      },
      FRAUD_ALERT: {
        SLACK: '🚨 *Betrugsverdacht erkannt*\n• Entity: {{entityType}} {{entityId}}\n• Zeit: {{timestamp}}',
        EMAIL: 'Betrugsverdacht: {{entityType}} {{entityId}}',
        SMS: 'FRAUD ALERT: {{entityType}} {{entityId}}',
        PUSH: 'Betrugsverdacht erkannt',
        WEBHOOK: '{"event":"FRAUD_ALERT","entity":"{{entityId}}"}',
      },
      SUPPORT_TICKET_CREATED: {
        SLACK: '🎫 *Neues Support-Ticket*\n• Ticket: {{ticketId}}\n• Entity: {{entityType}} {{entityId}}',
        EMAIL: 'Neues Support-Ticket: {{ticketId}}',
        SMS: 'Neues Ticket: {{ticketId}}',
        PUSH: 'Neues Support-Ticket',
        WEBHOOK: '{"event":"SUPPORT_TICKET","ticket":"{{ticketId}}"}',
      },
    };

    return fallbacks[eventType]?.[channel] || 
      '{{eventType}}: {{entityType}} {{entityId}} - {{timestamp}}';
  }

  // ============================================
  // QUEUE PROCESSING
  // ============================================

  /**
   * Process a single queue item
   */
  async processQueueItem(eventId: string): Promise<boolean> {
    const queueItem = await db.notificationQueueItem.findFirst({
      where: { eventId },
      include: { event: true },
    });

    if (!queueItem || !queueItem.event) {
      return false;
    }

    const event = queueItem.event;
    
    // Check max attempts
    if (queueItem.attempts >= queueItem.maxAttempts) {
      await db.notificationEvent.update({
        where: { id: eventId },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: 'Max retry attempts reached',
        },
      });
      await db.notificationQueueItem.delete({
        where: { id: queueItem.id },
      });
      return false;
    }

    // Update attempt count
    await db.notificationQueueItem.update({
      where: { id: queueItem.id },
      data: { attempts: { increment: 1 } },
    });

    // Update event status
    await db.notificationEvent.update({
      where: { id: eventId },
      data: { status: NotificationStatus.RETRYING },
    });

    // Get channel config
    const channelConfig = await db.notificationChannel.findUnique({
      where: { channel: event.channel as any },
    });

    if (!channelConfig || !channelConfig.active) {
      await this.handleDeliveryFailure(eventId, queueItem.id, 'Channel not configured');
      return false;
    }

    // Parse payload
    const payload = event.payload ? JSON.parse(event.payload) : {};

    // Send notification
    try {
      const success = await this.deliverNotification(
        event.channel as NotificationChannelType,
        JSON.parse(channelConfig.config),
        payload
      );

      if (success) {
        await db.notificationEvent.update({
          where: { id: eventId },
          data: {
            status: NotificationStatus.SENT,
            sentAt: new Date(),
          },
        });
        await db.notificationQueueItem.delete({
          where: { id: queueItem.id },
        });
        return true;
      } else {
        throw new Error('Delivery returned false');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown delivery error';
      await this.handleDeliveryFailure(eventId, queueItem.id, errorMessage);
      return false;
    }
  }

  /**
   * Handle delivery failure
   */
  private async handleDeliveryFailure(
    eventId: string,
    queueItemId: string,
    errorMessage: string
  ): Promise<void> {
    const queueItem = await db.notificationQueueItem.findUnique({
      where: { id: queueItemId },
    });

    if (!queueItem) return;

    await db.notificationEvent.update({
      where: { id: eventId },
      data: {
        status: NotificationStatus.RETRYING,
        retryCount: { increment: 1 },
        errorMessage,
      },
    });

    // Schedule retry
    const event = await db.notificationEvent.findUnique({
      where: { id: eventId },
    });

    const retryDelay = event 
      ? getDefaultRetryDelay(event.priority as NotificationPriority)
      : 30000;

    await db.notificationQueueItem.update({
      where: { id: queueItemId },
      data: {
        nextAttemptAt: new Date(Date.now() + retryDelay),
      },
    });
  }

  /**
   * Deliver notification via channel
   */
  private async deliverNotification(
    channel: NotificationChannelType,
    config: Record<string, unknown>,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    switch (channel) {
      case NotificationChannelType.SLACK:
        return this.deliverToSlack(config as any, payload);
      case NotificationChannelType.EMAIL:
        return this.deliverToEmail(config as any, payload);
      case NotificationChannelType.SMS:
        return this.deliverToSms(config as any, payload);
      case NotificationChannelType.WEBHOOK:
        return this.deliverToWebhook(config as any, payload);
      case NotificationChannelType.PUSH:
        // Push notifications would be implemented here
        console.log('[NotificationService] Push notification (simulated):', payload);
        return true;
      default:
        console.warn('[NotificationService] Unknown channel:', channel);
        return false;
    }
  }

  /**
   * Deliver to Slack
   */
  private async deliverToSlack(
    config: { webhookUrl: string; channel?: string; username?: string },
    payload: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: payload.body,
          channel: config.channel,
          username: config.username || 'CargoBit Security',
          icon_emoji: ':warning:',
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[NotificationService] Slack delivery error:', error);
      return false;
    }
  }

  /**
   * Deliver to Email (simulated - would use nodemailer in production)
   */
  private async deliverToEmail(
    config: { smtpHost: string; fromEmail: string },
    payload: Record<string, unknown>
  ): Promise<boolean> {
    // In production, this would use nodemailer or similar
    console.log('[NotificationService] Email delivery (simulated):', {
      from: config.fromEmail,
      subject: payload.subject,
      body: payload.body,
    });
    return true;
  }

  /**
   * Deliver to SMS (simulated - would use Twilio in production)
   */
  private async deliverToSms(
    config: { provider: string; fromNumber: string },
    payload: Record<string, unknown>
  ): Promise<boolean> {
    // In production, this would use Twilio, SNS, etc.
    console.log('[NotificationService] SMS delivery (simulated):', {
      from: config.fromNumber,
      body: payload.body,
    });
    return true;
  }

  /**
   * Deliver to Webhook
   */
  private async deliverToWebhook(
    config: { url: string; method?: string; headers?: Record<string, string> },
    payload: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const response = await fetch(config.url, {
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      console.error('[NotificationService] Webhook delivery error:', error);
      return false;
    }
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  /**
   * Get notification event by ID
   */
  async getEvent(eventId: string): Promise<NotificationEventResponse | null> {
    const event = await db.notificationEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) return null;

    return {
      id: event.id,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      status: event.status as NotificationStatus,
      channel: event.channel as NotificationChannelType,
      priority: event.priority as NotificationPriority,
      payload: event.payload ? JSON.parse(event.payload) : undefined,
      createdAt: event.createdAt,
      sentAt: event.sentAt || undefined,
      retryCount: event.retryCount,
      errorMessage: event.errorMessage || undefined,
    };
  }

  /**
   * Get pending queue items for processing
   */
  async getPendingQueueItems(limit: number = 100): Promise<string[]> {
    const items = await db.notificationQueueItem.findMany({
      where: {
        nextAttemptAt: { lte: new Date() },
      },
      orderBy: { nextAttemptAt: 'asc' },
      take: limit,
      select: { eventId: true },
    });

    return items.map(item => item.eventId);
  }

  // ============================================
  // TEMPLATE METHODS
  // ============================================

  /**
   * Create a notification template
   */
  async createTemplate(request: CreateTemplateRequest): Promise<NotificationTemplate> {
    const template = await db.notificationTemplate.create({
      data: {
        eventType: request.eventType,
        channel: request.channel as any,
        subject: request.subject,
        body: request.body,
        active: request.active ?? true,
      },
    });

    return {
      id: template.id,
      eventType: template.eventType,
      channel: template.channel as NotificationChannelType,
      subject: template.subject || undefined,
      body: template.body,
      active: template.active,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  /**
   * Get all templates
   */
  async getTemplates(options?: {
    eventType?: string;
    channel?: NotificationChannelType;
    active?: boolean;
  }): Promise<NotificationTemplate[]> {
    const where: any = {};
    
    if (options?.eventType) {
      where.eventType = options.eventType;
    }
    if (options?.channel) {
      where.channel = options.channel;
    }
    if (options?.active !== undefined) {
      where.active = options.active;
    }

    const templates = await db.notificationTemplate.findMany({
      where,
      orderBy: [{ eventType: 'asc' }, { channel: 'asc' }],
    });

    return templates.map(t => ({
      id: t.id,
      eventType: t.eventType,
      channel: t.channel as NotificationChannelType,
      subject: t.subject || undefined,
      body: t.body,
      active: t.active,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    data: Partial<CreateTemplateRequest>
  ): Promise<NotificationTemplate | null> {
    const template = await db.notificationTemplate.update({
      where: { id: templateId },
      data: {
        subject: data.subject,
        body: data.body,
        active: data.active,
      },
    });

    return {
      id: template.id,
      eventType: template.eventType,
      channel: template.channel as NotificationChannelType,
      subject: template.subject || undefined,
      body: template.body,
      active: template.active,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  // ============================================
  // CHANNEL CONFIG METHODS
  // ============================================

  /**
   * Configure a notification channel
   */
  async configureChannel(params: {
    channel: NotificationChannelType;
    config: Record<string, unknown>;
    rateLimit?: number;
    rateWindowSec?: number;
    active?: boolean;
  }): Promise<void> {
    await db.notificationChannel.upsert({
      where: { channel: params.channel as any },
      create: {
        channel: params.channel as any,
        config: JSON.stringify(params.config),
        rateLimit: params.rateLimit || DEFAULT_RATE_LIMITS[params.channel].maxRequests,
        rateWindowSec: params.rateWindowSec || DEFAULT_RATE_LIMITS[params.channel].windowMs / 1000,
        active: params.active ?? true,
      },
      update: {
        config: JSON.stringify(params.config),
        rateLimit: params.rateLimit,
        rateWindowSec: params.rateWindowSec,
        active: params.active ?? true,
      },
    });
  }

  /**
   * Get channel configurations
   */
  async getChannels(): Promise<Array<{
    id: string;
    channel: NotificationChannelType;
    active: boolean;
    rateLimit: number;
    rateWindowSec: number;
  }>> {
    const channels = await db.notificationChannel.findMany();
    
    return channels.map(c => ({
      id: c.id,
      channel: c.channel as NotificationChannelType,
      active: c.active,
      rateLimit: c.rateLimit,
      rateWindowSec: c.rateWindowSec,
    }));
  }

  // ============================================
  // CONVENIENCE METHODS
  // ============================================

  /**
   * Send high-risk blocked notification
   */
  async notifyHighRiskBlocked(params: {
    entityType: NotificationEntityType;
    entityId: string;
    userId: string;
    riskScore: number;
    triggeredRules: string[];
    ticketId?: string;
  }): Promise<SendNotificationResponse> {
    return this.send({
      eventType: 'HIGH_RISK_BLOCKED',
      entityType: params.entityType,
      entityId: params.entityId,
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannelType.SLACK, NotificationChannelType.EMAIL],
      data: {
        userId: params.userId,
        riskScore: params.riskScore,
        triggeredRules: params.triggeredRules,
        ticketId: params.ticketId,
      },
    });
  }

  /**
   * Send fraud alert notification
   */
  async notifyFraudAlert(params: {
    entityType: NotificationEntityType;
    entityId: string;
    userId: string;
    reason: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }): Promise<SendNotificationResponse> {
    return this.send({
      eventType: 'FRAUD_ALERT',
      entityType: params.entityType,
      entityId: params.entityId,
      priority: params.severity as NotificationPriority,
      channels: [NotificationChannelType.SLACK, NotificationChannelType.EMAIL, NotificationChannelType.SMS],
      data: {
        userId: params.userId,
        reason: params.reason,
      },
    });
  }

  /**
   * Send support ticket notification
   */
  async notifySupportTicket(params: {
    ticketId: string;
    entityType: NotificationEntityType;
    entityId: string;
    userId: string;
    reason: string;
  }): Promise<SendNotificationResponse> {
    return this.send({
      eventType: 'SUPPORT_TICKET_CREATED',
      entityType: params.entityType,
      entityId: params.entityId,
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannelType.SLACK, NotificationChannelType.EMAIL],
      data: {
        ticketId: params.ticketId,
        userId: params.userId,
        reason: params.reason,
      },
    });
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const notificationService = new NotificationService();
export default notificationService;
