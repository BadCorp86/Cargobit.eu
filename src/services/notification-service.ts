// ============================================
// CARGOBIT NOTIFICATION SERVICE
// Unified notification service for all channels
// ============================================

import { HighRiskEvent, SupportTicket } from './high-risk-event-handler';

// ============================================
// TYPES
// ============================================

export type NotificationChannel = 'email' | 'slack' | 'sms' | 'push' | 'webhook';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface NotificationPayload {
  id: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  recipient: string | string[];
  subject?: string;
  message: string;
  html?: string;
  data?: Record<string, unknown>;
  template?: string;
  scheduledFor?: Date;
  createdAt: Date;
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'opened';
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  isHtml: boolean;
  variables: string[];
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  slack: boolean;
  sms: boolean;
  push: boolean;
  criticalOnly: boolean;
  channels: {
    email?: string;
    phone?: string;
    slackUserId?: string;
  };
}

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  HIGH_RISK_BLOCKED: {
    id: 'tmpl_high_risk_blocked',
    name: 'High Risk Blocked',
    channel: 'email',
    subject: '[High Risk] Aktion blockiert – Score {{riskScore}} – {{entityType}} {{entityId}}',
    body: `
      <h2>High Risk Alert</h2>
      <p>Entity: {{entityType}} {{entityId}}</p>
      <p>User: {{userId}}</p>
      <p>Score: {{riskScore}}</p>
      <p>Action: {{action}}</p>
      <p>Rules: {{triggeredRules}}</p>
    `,
    isHtml: true,
    variables: ['riskScore', 'entityType', 'entityId', 'userId', 'action', 'triggeredRules'],
  },

  SUPPORT_TICKET_CREATED: {
    id: 'tmpl_support_ticket',
    name: 'Support Ticket Created',
    channel: 'email',
    subject: '[CargoBit] Neues Support-Ticket {{ticketId}}',
    body: `
      <h2>Neues Support-Ticket</h2>
      <p>Ticket-ID: {{ticketId}}</p>
      <p>Priorität: {{priority}}</p>
      <p>Entity: {{entityType}} {{entityId}}</p>
    `,
    isHtml: true,
    variables: ['ticketId', 'priority', 'entityType', 'entityId'],
  },

  SLACK_HIGH_RISK: {
    id: 'tmpl_slack_high_risk',
    name: 'Slack High Risk Alert',
    channel: 'slack',
    body: '🚨 High Risk: {{entityType}} {{entityId}} | Score: {{riskScore}} | Action: {{action}}',
    isHtml: false,
    variables: ['entityType', 'entityId', 'riskScore', 'action'],
  },

  SMS_CRITICAL: {
    id: 'tmpl_sms_critical',
    name: 'SMS Critical Alert',
    channel: 'sms',
    body: 'CARGOBIT ALERT: {{entityType}} {{entityId}} Score {{riskScore}} {{action}} blocked',
    isHtml: false,
    variables: ['entityType', 'entityId', 'riskScore', 'action'],
  },
};

// ============================================
// NOTIFICATION SERVICE
// ============================================

export class NotificationService {
  private notifications: NotificationPayload[] = [];
  private preferences: Map<string, NotificationPreferences> = new Map();

  constructor() {
    this.loadPreferences();
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Send a notification through the specified channel
   */
  async send(
    channel: NotificationChannel,
    recipient: string | string[],
    message: string,
    options: {
      subject?: string;
      html?: string;
      priority?: NotificationPriority;
      template?: string;
      data?: Record<string, unknown>;
    } = {}
  ): Promise<NotificationPayload> {
    const notification: NotificationPayload = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      channel,
      priority: options.priority || 'normal',
      recipient,
      subject: options.subject,
      message,
      html: options.html,
      data: options.data,
      template: options.template,
      createdAt: new Date(),
      status: 'pending',
    };

    this.notifications.push(notification);

    try {
      switch (channel) {
        case 'email':
          await this.sendEmail(notification);
          break;
        case 'slack':
          await this.sendSlack(notification);
          break;
        case 'sms':
          await this.sendSms(notification);
          break;
        case 'push':
          await this.sendPush(notification);
          break;
        case 'webhook':
          await this.sendWebhook(notification);
          break;
      }

      notification.status = 'sent';
      notification.sentAt = new Date();
    } catch (error) {
      notification.status = 'failed';
      notification.error = String(error);
      console.error(`[NotificationService] Failed to send ${channel} notification:`, error);
    }

    return notification;
  }

  /**
   * Send high-risk notification through multiple channels
   */
  async sendHighRiskNotifications(
    event: HighRiskEvent,
    ticket: SupportTicket
  ): Promise<{
    email: NotificationPayload;
    slack: NotificationPayload;
    sms?: NotificationPayload;
  }> {
    const channels: {
      email: NotificationPayload;
      slack: NotificationPayload;
      sms?: NotificationPayload;
    } = {
      email: await this.sendEmailNotification(event, ticket),
      slack: await this.sendSlackAlert(event, ticket),
    };

    // Send SMS for critical cases
    if (ticket.priority === 'critical' || event.riskScore >= 90) {
      channels.sms = await this.sendSmsAlert(event, ticket);
    }

    return channels;
  }

  /**
   * Send notification using a template
   */
  async sendFromTemplate(
    templateId: string,
    recipient: string | string[],
    variables: Record<string, string | number>
  ): Promise<NotificationPayload> {
    const template = NOTIFICATION_TEMPLATES[templateId];
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Replace variables in template
    let body = template.body;
    let subject = template.subject;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      body = body.replace(new RegExp(placeholder, 'g'), String(value));
      if (subject) {
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }

    return this.send(template.channel, recipient, body.trim(), {
      subject,
      html: template.isHtml ? body : undefined,
      template: templateId,
      data: variables,
    });
  }

  /**
   * Get notification by ID
   */
  getNotification(id: string): NotificationPayload | undefined {
    return this.notifications.find(n => n.id === id);
  }

  /**
   * Get notifications by status
   */
  getNotificationsByStatus(status: NotificationPayload['status']): NotificationPayload[] {
    return this.notifications.filter(n => n.status === status);
  }

  /**
   * Update user notification preferences
   */
  updatePreferences(userId: string, prefs: Partial<NotificationPreferences>): void {
    const existing = this.preferences.get(userId) || {
      userId,
      email: true,
      slack: true,
      sms: false,
      push: true,
      criticalOnly: false,
    };

    this.preferences.set(userId, { ...existing, ...prefs });
  }

  /**
   * Get user notification preferences
   */
  getPreferences(userId: string): NotificationPreferences | undefined {
    return this.preferences.get(userId);
  }

  // ============================================
  // PRIVATE METHODS - CHANNEL IMPLEMENTATIONS
  // ============================================

  private async sendEmail(notification: NotificationPayload): Promise<void> {
    console.log(`[NotificationService] Sending email to ${notification.recipient}:`, notification.subject);

    // In production, integrate with:
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // - Postmark

    const emailPayload = {
      to: Array.isArray(notification.recipient) ? notification.recipient : [notification.recipient],
      subject: notification.subject || 'Notification',
      text: notification.message,
      html: notification.html,
    };

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('[NotificationService] Email sent successfully');
  }

  private async sendSlack(notification: NotificationPayload): Promise<void> {
    console.log(`[NotificationService] Sending Slack message to ${notification.recipient}`);

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const slackPayload = {
      channel: Array.isArray(notification.recipient) ? notification.recipient[0] : notification.recipient,
      text: notification.message,
      blocks: notification.data?.blocks,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }
  }

  private async sendSms(notification: NotificationPayload): Promise<void> {
    console.log(`[NotificationService] Sending SMS to ${notification.recipient}`);

    // In production, integrate with:
    // - Twilio
    // - AWS SNS
    // - Vonage
    // - MessageBird

    const smsPayload = {
      to: Array.isArray(notification.recipient) ? notification.recipient[0] : notification.recipient,
      message: notification.message,
    };

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('[NotificationService] SMS sent successfully');
  }

  private async sendPush(notification: NotificationPayload): Promise<void> {
    console.log(`[NotificationService] Sending push notification to ${notification.recipient}`);

    // In production, integrate with:
    // - Firebase Cloud Messaging
    // - AWS SNS
    // - OneSignal
    // - Pusher

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('[NotificationService] Push notification sent successfully');
  }

  private async sendWebhook(notification: NotificationPayload): Promise<void> {
    console.log(`[NotificationService] Sending webhook to ${notification.recipient}`);

    const response = await fetch(Array.isArray(notification.recipient) ? notification.recipient[0] : notification.recipient, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: notification.message,
        data: notification.data,
        timestamp: notification.createdAt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status}`);
    }
  }

  // ============================================
  // CONVENIENCE METHODS
  // ============================================

  private async sendEmailNotification(event: HighRiskEvent, ticket: SupportTicket): Promise<NotificationPayload> {
    const template = NOTIFICATION_TEMPLATES.HIGH_RISK_BLOCKED;
    
    return this.sendFromTemplate('HIGH_RISK_BLOCKED', 
      ['security-team@cargbit.com', 'support@cargbit.com'],
      {
        riskScore: event.riskScore,
        entityType: event.entityType,
        entityId: event.entityId,
        userId: event.userId,
        action: event.action,
        triggeredRules: event.triggeredRules.join(', '),
        ticketId: ticket.id,
        priority: ticket.priority,
      }
    );
  }

  private async sendSlackAlert(event: HighRiskEvent, ticket: SupportTicket): Promise<NotificationPayload> {
    const channel = ticket.priority === 'critical' ? '#security-critical' : '#security-alerts';
    
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 High Risk Detected',
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Entity:*\n${event.entityType} \`${event.entityId}\`` },
          { type: 'mrkdwn', text: `*Score:*\n*${event.riskScore}*` },
          { type: 'mrkdwn', text: `*Action:*\n${event.action}` },
          { type: 'mrkdwn', text: `*Priority:*\n${ticket.priority.toUpperCase()}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Rules:* ${event.triggeredRules.map(r => `\`${r}\``).join(', ')}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Ticket' },
            url: `https://cargbit.freshdesk.com/a/tickets/${ticket.id}`,
            style: 'primary',
          },
        ],
      },
    ];

    return this.send('slack', channel, `High Risk: ${event.entityId}`, {
      priority: ticket.priority === 'critical' ? 'critical' : 'high',
      data: { blocks },
    });
  }

  private async sendSmsAlert(event: HighRiskEvent, ticket: SupportTicket): Promise<NotificationPayload> {
    return this.sendFromTemplate('SMS_CRITICAL', 
      process.env.ON_CALL_PHONE || '+49123456789',
      {
        entityType: event.entityType,
        entityId: event.entityId,
        riskScore: event.riskScore,
        action: event.action,
      }
    );
  }

  private loadPreferences(): void {
    // In production, load from database
    // For now, set defaults
    this.preferences.set('default', {
      userId: 'default',
      email: true,
      slack: true,
      sms: false,
      push: true,
      criticalOnly: false,
    });
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const notificationService = new NotificationService();

// ============================================
// EXPORTS
// ============================================

export { NOTIFICATION_TEMPLATES };
