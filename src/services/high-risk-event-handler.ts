// ============================================
// CARGOBIT HIGH-RISK EVENT FLOW HANDLER
// Automatic actions when Risk Score is RED (61-100)
// ============================================

// ============================================
// TYPES
// ============================================

type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';
type EntityType = 'USER' | 'COMPANY' | 'TRANSACTION';

interface HighRiskEvent {
  correlationId: string;
  timestamp: Date;
  userId: string;
  userRole: string;
  action: string;
  entityType: EntityType;
  entityId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  triggeredRules: string[];
  context: Record<string, unknown>;
}

interface SupportTicket {
  id: string;
  createdAt: Date;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  source: 'automatic' | 'manual';
  assignedTo?: string;
  assignedTeam?: string;
  
  // Ticket details
  entityId: string;
  entityType: EntityType;
  userId: string;
  riskScore: number;
  triggeredRules: string[];
  action: string;
  context: Record<string, unknown>;
  
  // Resolution
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
}

interface EmailNotification {
  id: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  isHtml: boolean;
  template: string;
  data: Record<string, unknown>;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  error?: string;
}

interface SlackAlert {
  id: string;
  channel: string;
  message: string;
  blocks?: unknown[];
  attachments?: unknown[];
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  error?: string;
}

interface AuditLogEntry {
  id: string;
  correlationId: string;
  timestamp: Date;
  eventType: 'HIGH_RISK_BLOCKED' | 'SUPPORT_TICKET_CREATED' | 'NOTIFICATION_SENT' | 'MANUAL_OVERRIDE';
  userId: string;
  entityId: string;
  details: Record<string, unknown>;
}

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Support Ticket Settings
  SUPPORT: {
    DEFAULT_TEAM: 'security-support',
    DEFAULT_PRIORITY: 'high',
    CRITICAL_THRESHOLD: 85,  // Score >= 85 = critical priority
    AUTO_ASSIGN_ENABLED: true,
    FRESHDESK_ENABLED: true,
    FRESHDESK_DOMAIN: 'cargbit.freshdesk.com',
  },

  // Email Settings
  EMAIL: {
    FROM_ADDRESS: 'security@cargbit.com',
    SUPPORT_EMAIL: 'support@cargbit.com',
    SECURITY_EMAIL: 'security-team@cargbit.com',
    ENABLED: true,
    TEMPLATE_IDS: {
      HIGH_RISK_BLOCKED: 'template_high_risk_blocked',
      SUPPORT_TICKET_CREATED: 'template_support_ticket',
    },
  },

  // Slack Settings
  SLACK: {
    ENABLED: true,
    DEFAULT_CHANNEL: '#security-alerts',
    CRITICAL_CHANNEL: '#security-critical',
    WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
  },

  // SMS Settings (for critical cases)
  SMS: {
    ENABLED: false,
    PROVIDER: 'twilio',
    CRITICAL_ONLY: true,
    RECIPIENTS: ['+49123456789'],  // On-call security team
  },

  // Thresholds
  THRESHOLDS: {
    SMS_THRESHOLD: 90,  // Score >= 90 triggers SMS
    CRITICAL_AMOUNT: 50000,  // Amount >= 50.000€ triggers SMS
  },
};

// ============================================
// SUPPORT TICKET SERVICE
// ============================================

class SupportTicketService {
  private tickets: SupportTicket[] = [];

  /**
   * Create a support ticket for a high-risk event
   */
  async createTicket(event: HighRiskEvent): Promise<SupportTicket> {
    const ticketId = `st_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const ticket: SupportTicket = {
      id: ticketId,
      createdAt: new Date(),
      status: 'open',
      priority: this.determinePriority(event),
      source: 'automatic',
      assignedTeam: CONFIG.SUPPORT.DEFAULT_TEAM,
      
      entityId: event.entityId,
      entityType: event.entityType,
      userId: event.userId,
      riskScore: event.riskScore,
      triggeredRules: event.triggeredRules,
      action: event.action,
      context: event.context,
    };

    // Auto-assign if enabled
    if (CONFIG.SUPPORT.AUTO_ASSIGN_ENABLED) {
      ticket.assignedTo = await this.autoAssign(ticket);
    }

    this.tickets.push(ticket);

    // Create in Freshdesk if enabled
    if (CONFIG.SUPPORT.FRESHDESK_ENABLED) {
      await this.createInFreshdesk(ticket);
    }

    console.log(`[SupportTicketService] Created ticket ${ticketId} for ${event.entityId}`);
    return ticket;
  }

  /**
   * Determine ticket priority based on risk score and context
   */
  private determinePriority(event: HighRiskEvent): 'low' | 'medium' | 'high' | 'critical' {
    if (event.riskScore >= CONFIG.SUPPORT.CRITICAL_THRESHOLD) {
      return 'critical';
    }
    
    // Check for critical contexts
    const amount = event.context.amount as number | undefined;
    if (amount && amount >= CONFIG.THRESHOLDS.CRITICAL_AMOUNT) {
      return 'critical';
    }
    
    // Check for fraud-related rules
    const fraudRules = ['fraud_flags', 'identity_mismatch', 'suspicious_activity'];
    if (event.triggeredRules.some(rule => fraudRules.includes(rule))) {
      return 'critical';
    }
    
    return 'high';
  }

  /**
   * Auto-assign ticket to available support agent
   */
  private async autoAssign(ticket: SupportTicket): Promise<string> {
    // In production, this would query an assignment service
    // For now, return a placeholder
    return `agent_${ticket.priority}_${Math.floor(Math.random() * 5) + 1}`;
  }

  /**
   * Create ticket in Freshdesk
   */
  private async createInFreshdesk(ticket: SupportTicket): Promise<void> {
    const freshdeskPayload = {
      name: `High Risk Alert - ${ticket.entityType} ${ticket.entityId}`,
      description: this.generateTicketDescription(ticket),
      subject: `[High Risk] ${ticket.action} blocked - Score ${ticket.riskScore} - ${ticket.entityId}`,
      email: CONFIG.EMAIL.SUPPORT_EMAIL,
      priority: ticket.priority === 'critical' ? 4 : ticket.priority === 'high' ? 3 : 2,
      status: 2, // Open
      type: 'Security',
      tags: ['high-risk', 'automated', ticket.entityType.toLowerCase()],
      custom_fields: {
        cf_risk_score: ticket.riskScore,
        cf_entity_id: ticket.entityId,
        cf_entity_type: ticket.entityType,
        cf_triggered_rules: ticket.triggeredRules.join(', '),
        cf_correlation_id: ticket.id,
      },
    };

    try {
      const response = await fetch(
        `https://${CONFIG.SUPPORT.FRESHDESK_DOMAIN}/api/v2/tickets`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(process.env.FRESHDESK_API_KEY + ':X').toString('base64')}`,
          },
          body: JSON.stringify(freshdeskPayload),
        }
      );

      if (!response.ok) {
        console.error('[SupportTicketService] Freshdesk API error:', response.status);
      }
    } catch (error) {
      console.error('[SupportTicketService] Failed to create Freshdesk ticket:', error);
    }
  }

  /**
   * Generate ticket description
   */
  private generateTicketDescription(ticket: SupportTicket): string {
    return `
<h2>High Risk Alert - Automatic Block</h2>

<table>
  <tr><td><strong>Entity Type:</strong></td><td>${ticket.entityType}</td></tr>
  <tr><td><strong>Entity ID:</strong></td><td>${ticket.entityId}</td></tr>
  <tr><td><strong>User ID:</strong></td><td>${ticket.userId}</td></tr>
  <tr><td><strong>Action Blocked:</strong></td><td>${ticket.action}</td></tr>
  <tr><td><strong>Risk Score:</strong></td><td>${ticket.riskScore}</td></tr>
  <tr><td><strong>Priority:</strong></td><td>${ticket.priority.toUpperCase()}</td></tr>
</table>

<h3>Triggered Rules</h3>
<ul>
  ${ticket.triggeredRules.map(rule => `<li>${rule}</li>`).join('\n')}
</ul>

<h3>Context</h3>
<pre>${JSON.stringify(ticket.context, null, 2)}</pre>

<p><em>This ticket was created automatically by the CargoBit Security Gateway.</em></p>
    `.trim();
  }

  /**
   * Get ticket by ID
   */
  getTicket(ticketId: string): SupportTicket | undefined {
    return this.tickets.find(t => t.id === ticketId);
  }

  /**
   * Get all open tickets
   */
  getOpenTickets(): SupportTicket[] {
    return this.tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  }
}

// ============================================
// EMAIL NOTIFICATION SERVICE
// ============================================

class EmailNotificationService {
  private notifications: EmailNotification[] = [];

  /**
   * Send high-risk blocked email notification
   */
  async sendHighRiskNotification(event: HighRiskEvent, ticket: SupportTicket): Promise<EmailNotification> {
    const notificationId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const notification: EmailNotification = {
      id: notificationId,
      to: [CONFIG.EMAIL.SECURITY_EMAIL],
      cc: [CONFIG.EMAIL.SUPPORT_EMAIL],
      subject: `[High Risk] Aktion blockiert – Score ${event.riskScore} – ${event.entityType} ${event.entityId}`,
      body: this.generateEmailBody(event, ticket),
      isHtml: true,
      template: CONFIG.EMAIL.TEMPLATE_IDS.HIGH_RISK_BLOCKED,
      data: { event, ticket },
      status: 'pending',
    };

    this.notifications.push(notification);

    // Send email (in production, use a proper email service)
    try {
      await this.sendEmail(notification);
      notification.status = 'sent';
      notification.sentAt = new Date();
      console.log(`[EmailNotificationService] Sent notification ${notificationId}`);
    } catch (error) {
      notification.status = 'failed';
      notification.error = String(error);
      console.error('[EmailNotificationService] Failed to send notification:', error);
    }

    return notification;
  }

  /**
   * Generate email body
   */
  private generateEmailBody(event: HighRiskEvent, ticket: SupportTicket): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #1F2D3D; }
    .header { background: #E74C3C; color: white; padding: 20px; }
    .content { padding: 20px; }
    .score { font-size: 48px; font-weight: bold; color: #E74C3C; }
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .info-table td { padding: 8px; border-bottom: 1px solid #E0E6ED; }
    .info-table td:first-child { font-weight: bold; width: 150px; color: #6B7C93; }
    .rules-list { background: #F7F9FB; padding: 15px; border-radius: 8px; }
    .rules-list li { margin: 5px 0; }
    .btn { background: #2D8CFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #E0E6ED; color: #6B7C93; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚨 High Risk Detected</h1>
    <p>Aktion wurde automatisch blockiert</p>
  </div>
  
  <div class="content">
    <table class="info-table">
      <tr><td>Entity</td><td><strong>${event.entityType}</strong> ${event.entityId}</td></tr>
      <tr><td>User</td><td>${event.userId} (${event.userRole})</td></tr>
      <tr><td>Action Blocked</td><td><strong>${event.action}</strong></td></tr>
      <tr><td>Risk Score</td><td><span class="score">${event.riskScore}</span></td></tr>
      <tr><td>Support Ticket</td><td><a href="https://${CONFIG.SUPPORT.FRESHDESK_DOMAIN}/a/tickets/${ticket.id}">${ticket.id}</a></td></tr>
      <tr><td>Priority</td><td><strong>${ticket.priority.toUpperCase()}</strong></td></tr>
    </table>
    
    <h3>Triggered Rules</h3>
    <div class="rules-list">
      <ul>
        ${event.triggeredRules.map(rule => `<li><code>${rule}</code></li>`).join('\n')}
      </ul>
    </div>
    
    <h3>Context</h3>
    <pre style="background: #F7F9FB; padding: 15px; border-radius: 8px; overflow-x: auto;">
${JSON.stringify(event.context, null, 2)}
    </pre>
    
    <p style="margin-top: 20px;">
      <a class="btn" href="https://${CONFIG.SUPPORT.FRESHDESK_DOMAIN}/a/tickets/${ticket.id}">
        Ticket in Freshdesk öffnen
      </a>
    </p>
  </div>
  
  <div class="footer">
    <p>This notification was sent automatically by CargoBit Security Gateway.</p>
    <p>Correlation ID: ${event.correlationId}</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Send email via email provider (placeholder)
   */
  private async sendEmail(notification: EmailNotification): Promise<void> {
    // In production, integrate with SendGrid, AWS SES, or similar
    // For now, just log
    console.log('[EmailNotificationService] Sending email:', {
      to: notification.to,
      subject: notification.subject,
    });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// ============================================
// SLACK NOTIFICATION SERVICE
// ============================================

class SlackNotificationService {
  private alerts: SlackAlert[] = [];

  /**
   * Send Slack alert for high-risk event
   */
  async sendHighRiskAlert(event: HighRiskEvent, ticket: SupportTicket): Promise<SlackAlert> {
    const alertId = `slack_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Determine channel based on priority
    const channel = ticket.priority === 'critical' 
      ? CONFIG.SLACK.CRITICAL_CHANNEL 
      : CONFIG.SLACK.DEFAULT_CHANNEL;

    const alert: SlackAlert = {
      id: alertId,
      channel,
      message: this.generateSlackMessage(event, ticket),
      blocks: this.generateSlackBlocks(event, ticket),
      status: 'pending',
    };

    this.alerts.push(alert);

    // Send to Slack
    if (CONFIG.SLACK.ENABLED && CONFIG.SLACK.WEBHOOK_URL) {
      try {
        await this.sendToSlack(alert);
        alert.status = 'sent';
        alert.sentAt = new Date();
        console.log(`[SlackNotificationService] Sent alert ${alertId} to ${channel}`);
      } catch (error) {
        alert.status = 'failed';
        alert.error = String(error);
        console.error('[SlackNotificationService] Failed to send alert:', error);
      }
    }

    return alert;
  }

  /**
   * Generate Slack message text
   */
  private generateSlackMessage(event: HighRiskEvent, ticket: SupportTicket): string {
    return `🚨 High Risk Detected
${event.entityType}: ${event.entityId}
Score: ${event.riskScore}
Rules: ${event.triggeredRules.join(', ')}
Action blocked: ${event.action}`;
  }

  /**
   * Generate Slack Block Kit blocks
   */
  private generateSlackBlocks(event: HighRiskEvent, ticket: SupportTicket): unknown[] {
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 High Risk Detected',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Entity:*\n${event.entityType} \`${event.entityId}\``,
          },
          {
            type: 'mrkdwn',
            text: `*User:*\n\`${event.userId}\` (${event.userRole})`,
          },
          {
            type: 'mrkdwn',
            text: `*Risk Score:*\n*${event.riskScore}*`,
          },
          {
            type: 'mrkdwn',
            text: `*Action Blocked:*\n${event.action}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Triggered Rules:*\n${event.triggeredRules.map(r => `• \`${r}\``).join('\n')}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Ticket',
              emoji: true,
            },
            url: `https://${CONFIG.SUPPORT.FRESHDESK_DOMAIN}/a/tickets/${ticket.id}`,
            style: 'primary',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Dashboard',
              emoji: true,
            },
            url: `https://admin.cargbit.com/risk/${event.entityId}`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Priority: *${ticket.priority.toUpperCase()}* | Ticket: \`${ticket.id}\` | ${new Date().toISOString()}`,
          },
        ],
      },
    ];
  }

  /**
   * Send to Slack via webhook
   */
  private async sendToSlack(alert: SlackAlert): Promise<void> {
    const response = await fetch(CONFIG.SLACK.WEBHOOK_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: alert.channel,
        text: alert.message,
        blocks: alert.blocks,
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }
  }
}

// ============================================
// SMS NOTIFICATION SERVICE
// ============================================

class SmsNotificationService {
  /**
   * Send SMS for critical high-risk events
   */
  async sendCriticalAlert(event: HighRiskEvent, ticket: SupportTicket): Promise<boolean> {
    if (!CONFIG.SMS.ENABLED) {
      return false;
    }

    // Check if SMS should be sent (critical only or threshold met)
    if (CONFIG.SMS.CRITICAL_ONLY && ticket.priority !== 'critical') {
      return false;
    }

    const message = `CARGOBIT CRITICAL ALERT
${event.entityType} ${event.entityId}
Score: ${event.riskScore}
Action: ${event.action} BLOCKED
Ticket: ${ticket.id}
Rules: ${event.triggeredRules.slice(0, 3).join(', ')}
`;

    // Send to all recipients
    const results = await Promise.all(
      CONFIG.SMS.RECIPIENTS.map(recipient => this.sendSms(recipient, message))
    );

    return results.every(r => r);
  }

  /**
   * Send SMS via provider
   */
  private async sendSms(to: string, message: string): Promise<boolean> {
    console.log(`[SmsNotificationService] Sending SMS to ${to}: ${message.substring(0, 50)}...`);
    
    // In production, integrate with Twilio, AWS SNS, or similar
    // For now, just log
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return true;
  }
}

// ============================================
// AUDIT LOG SERVICE
// ============================================

class AuditLogService {
  private logs: AuditLogEntry[] = [];

  /**
   * Log a high-risk event
   */
  log(event: HighRiskEvent, type: AuditLogEntry['eventType'], details: Record<string, unknown>): string {
    const logId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const entry: AuditLogEntry = {
      id: logId,
      correlationId: event.correlationId,
      timestamp: new Date(),
      eventType: type,
      userId: event.userId,
      entityId: event.entityId,
      details,
    };

    this.logs.push(entry);
    console.log(`[AuditLogService] ${type}: ${logId}`);
    
    return logId;
  }

  /**
   * Get logs by correlation ID
   */
  getLogsByCorrelationId(correlationId: string): AuditLogEntry[] {
    return this.logs.filter(l => l.correlationId === correlationId);
  }
}

// ============================================
// MAIN HIGH-RISK EVENT HANDLER
// ============================================

export class HighRiskEventHandler {
  private supportTicketService: SupportTicketService;
  private emailService: EmailNotificationService;
  private slackService: SlackNotificationService;
  private smsService: SmsNotificationService;
  private auditLogService: AuditLogService;

  constructor() {
    this.supportTicketService = new SupportTicketService();
    this.emailService = new EmailNotificationService();
    this.slackService = new SlackNotificationService();
    this.smsService = new SmsNotificationService();
    this.auditLogService = new AuditLogService();
  }

  /**
   * Handle a high-risk event (RED score)
   * This is the main entry point when Risk Engine returns level = RED
   */
  async handle(event: HighRiskEvent): Promise<{
    success: boolean;
    ticket: SupportTicket;
    notifications: {
      email: EmailNotification;
      slack: SlackAlert;
      sms: boolean;
    };
    auditLogs: string[];
  }> {
    console.log(`[HighRiskEventHandler] Processing high-risk event: ${event.correlationId}`);

    const auditLogs: string[] = [];

    // Step 1: Log the blocked action
    auditLogs.push(
      this.auditLogService.log(event, 'HIGH_RISK_BLOCKED', {
        action: event.action,
        riskScore: event.riskScore,
        triggeredRules: event.triggeredRules,
      })
    );

    // Step 2: Create Support Ticket
    const ticket = await this.supportTicketService.createTicket(event);
    auditLogs.push(
      this.auditLogService.log(event, 'SUPPORT_TICKET_CREATED', {
        ticketId: ticket.id,
        priority: ticket.priority,
      })
    );

    // Step 3: Send Email Notification
    const emailNotification = await this.emailService.sendHighRiskNotification(event, ticket);

    // Step 4: Send Slack Alert
    const slackAlert = await this.slackService.sendHighRiskAlert(event, ticket);

    // Step 5: Send SMS for critical cases
    const smsSent = await this.smsService.sendCriticalAlert(event, ticket);

    // Log notifications
    auditLogs.push(
      this.auditLogService.log(event, 'NOTIFICATION_SENT', {
        email: emailNotification.id,
        slack: slackAlert.id,
        sms: smsSent,
      })
    );

    return {
      success: true,
      ticket,
      notifications: {
        email: emailNotification,
        slack: slackAlert,
        sms: smsSent,
      },
      auditLogs,
    };
  }

  /**
   * Get support ticket by ID
   */
  getTicket(ticketId: string): SupportTicket | undefined {
    return this.supportTicketService.getTicket(ticketId);
  }

  /**
   * Get all open tickets
   */
  getOpenTickets(): SupportTicket[] {
    return this.supportTicketService.getOpenTickets();
  }
}

// ============================================
// USER FEEDBACK MESSAGES
// ============================================

export const USER_FEEDBACK = {
  /**
   * Message shown to user when action is blocked (RED)
   */
  BLOCKED: 'Diese Aktion wurde aus Sicherheitsgründen blockiert. Unser Team prüft den Fall.',
  
  /**
   * Message shown when action is allowed with mitigation (YELLOW)
   */
  MITIGATION: 'Diese Aktion wurde ausgeführt, aber zusätzliche Sicherheitsmaßnahmen wurden angewendet.',
  
  /**
   * Message shown when action is allowed (GREEN) - usually no message
   */
  ALLOWED: null,
};

// ============================================
// EXPORTS
// ============================================

export {
  SupportTicketService,
  EmailNotificationService,
  SlackNotificationService,
  SmsNotificationService,
  AuditLogService,
};

export type {
  HighRiskEvent,
  SupportTicket,
  EmailNotification,
  SlackAlert,
  AuditLogEntry,
};
