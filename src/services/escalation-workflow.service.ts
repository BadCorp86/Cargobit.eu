// ============================================
// CARGOBIT ESCALATION WORKFLOW SERVICE
// Support Actions: Release, Verification, Escalate, Block
// ============================================

// ============================================
// TYPES
// ============================================

type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_USER"
  | "RESOLVED"
  | "ESCALATED"
  | "CLOSED_PERMANENT"
  | "CLOSED_CLEARED";

type VerificationType =
  | "DOCUMENT_UPLOAD"
  | "SELFIE_VERIFICATION"
  | "COMPANY_DOCUMENTS"
  | "IBAN_VERIFICATION";

type EscalationAction = "block" | "escalate";

interface SupportAction {
  type: "RELEASE" | "VERIFICATION_REQUEST" | "BLOCK" | "ESCALATE" | "CLEAR";
  ticketId: string;
  actor: string;
  reason: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface VerificationRequest {
  ticketId: string;
  type: VerificationType;
  requiredDocuments?: string[];
  comment: string;
  requestedBy: string;
  expiresAt: Date;
}

interface TicketUpdate {
  ticketId: string;
  status: TicketStatus;
  reason?: string;
  updatedBy: string;
  metadata?: Record<string, unknown>;
}

interface NotificationPayload {
  type: "email" | "slack" | "sms" | "push" | "in_app";
  recipient: string;
  subject: string;
  message: string;
  actionUrl?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
}

interface AuditLogEntry {
  id: string;
  ticketId: string;
  timestamp: Date;
  action: string;
  actor: string;
  details?: string;
  previousState?: TicketStatus;
  newState?: TicketStatus;
}

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Verification timeout (48 hours)
  VERIFICATION_TIMEOUT_HOURS: 48,

  // Notification channels per action type
  NOTIFICATION_CHANNELS: {
    RELEASE: ["email", "in_app", "push"] as const,
    VERIFICATION_REQUEST: ["email", "in_app", "push", "sms"] as const,
    BLOCK: ["email", "in_app"] as const,
    ESCALATE: ["slack", "email"] as const,
    CLEAR: ["email", "in_app", "push"] as const,
  },

  // Email templates
  TEMPLATES: {
    ACCOUNT_BLOCKED: {
      de: {
        subject: "Dein CargoBit-Konto wurde gesperrt",
        body: "Dein Konto wurde aus Sicherheitsgründen gesperrt. Bitte kontaktiere den Support unter support@cargobit.com, wenn du Fragen hast.",
      },
      en: {
        subject: "Your CargoBit account has been locked",
        body: "Your account has been locked for security reasons. Please contact support at support@cargobit.com if you have questions.",
      },
    },
    ACTION_RELEASED: {
      de: {
        subject: "Deine Aktion wurde freigegeben",
        body: "Deine Aktion wurde nach Prüfung freigegeben. Du kannst sie jetzt erneut ausführen.",
      },
      en: {
        subject: "Your action has been released",
        body: "Your action has been released after review. You can now retry it.",
      },
    },
    VERIFICATION_REQUIRED: {
      de: {
        subject: "Verifikation erforderlich",
        body: "Für deine letzte Aktion ist eine zusätzliche Verifikation erforderlich. Bitte lade die angeforderten Dokumente hoch.",
      },
      en: {
        subject: "Verification required",
        body: "Additional verification is required for your recent action. Please upload the requested documents.",
      },
    },
  },

  // Slack channels
  SLACK_CHANNELS: {
    ESCALATION: "#compliance-cases",
    CRITICAL: "#security-critical",
  },
};

// ============================================
// IN-MEMORY STORAGE (Replace with Database in production)
// ============================================

const auditLogs: AuditLogEntry[] = [];
const verificationRequests: Map<string, VerificationRequest> = new Map();
const ticketStatuses: Map<string, TicketStatus> = new Map();

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createAuditLog(
  ticketId: string,
  action: string,
  actor: string,
  details?: string,
  previousState?: TicketStatus,
  newState?: TicketStatus
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: generateId("audit"),
    ticketId,
    timestamp: new Date(),
    action,
    actor,
    details,
    previousState,
    newState,
  };
  auditLogs.push(entry);
  return entry;
}

async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  console.log(`[Notification] Sending ${payload.type} to ${payload.recipient}`);
  console.log(`  Subject: ${payload.subject}`);
  console.log(`  Message: ${payload.message}`);
  // In production, integrate with actual notification services
  return true;
}

async function sendMultiChannelNotifications(
  channels: readonly ("email" | "slack" | "sms" | "push" | "in_app")[],
  recipient: string,
  subject: string,
  message: string,
  actionUrl?: string
): Promise<void> {
  for (const channel of channels) {
    await sendNotification({
      type: channel,
      recipient: channel === "slack" ? CONFIG.SLACK_CHANNELS.ESCALATION : recipient,
      subject,
      message,
      actionUrl,
    });
  }
}

function getTicketStatus(ticketId: string): TicketStatus {
  return ticketStatuses.get(ticketId) || "OPEN";
}

function setTicketStatus(ticketId: string, status: TicketStatus): void {
  ticketStatuses.set(ticketId, status);
}

// ============================================
// SUPPORT ACTION HANDLERS
// ============================================

/**
 * Release a blocked action - Allow the user to proceed
 */
export async function releaseTicket(
  ticketId: string,
  releasedBy: string,
  reason: string
): Promise<{
  success: boolean;
  ticket: { id: string; status: TicketStatus };
  notifications: { channels: string[]; sent: boolean };
}> {
  console.log(`[EscalationService] Releasing ticket ${ticketId} by ${releasedBy}`);

  const previousStatus = getTicketStatus(ticketId);

  // Update ticket status
  setTicketStatus(ticketId, "RESOLVED");

  // Create audit log
  createAuditLog(
    ticketId,
    "RELEASED",
    releasedBy,
    reason,
    previousStatus,
    "RESOLVED"
  );

  // Send notifications to user
  const channels = CONFIG.NOTIFICATION_CHANNELS.RELEASE;
  await sendMultiChannelNotifications(
    channels,
    "user", // In production, get actual user ID from ticket
    CONFIG.TEMPLATES.ACTION_RELEASED.de.subject,
    CONFIG.TEMPLATES.ACTION_RELEASED.de.body,
    "/retry-action" // Action URL for retry
  );

  return {
    success: true,
    ticket: { id: ticketId, status: "RESOLVED" },
    notifications: { channels: [...channels], sent: true },
  };
}

/**
 * Request additional verification from user
 */
export async function requestVerification(
  ticketId: string,
  type: VerificationType,
  requiredDocuments: string[] | undefined,
  comment: string,
  requestedBy: string
): Promise<{
  success: boolean;
  verification: VerificationRequest;
  ticket: { id: string; status: TicketStatus };
}> {
  console.log(`[EscalationService] Requesting ${type} verification for ticket ${ticketId}`);

  const previousStatus = getTicketStatus(ticketId);

  // Create verification request
  const expiresAt = new Date(Date.now() + CONFIG.VERIFICATION_TIMEOUT_HOURS * 60 * 60 * 1000);
  const verification: VerificationRequest = {
    ticketId,
    type,
    requiredDocuments,
    comment,
    requestedBy,
    expiresAt,
  };

  verificationRequests.set(ticketId, verification);

  // Update ticket status
  setTicketStatus(ticketId, "WAITING_FOR_USER");

  // Create audit log
  createAuditLog(
    ticketId,
    "VERIFICATION_REQUESTED",
    requestedBy,
    `${type}: ${comment}`,
    previousStatus,
    "WAITING_FOR_USER"
  );

  // Send notifications to user
  const channels = CONFIG.NOTIFICATION_CHANNELS.VERIFICATION_REQUEST;
  await sendMultiChannelNotifications(
    channels,
    "user",
    CONFIG.TEMPLATES.VERIFICATION_REQUIRED.de.subject,
    CONFIG.TEMPLATES.VERIFICATION_REQUIRED.de.body,
    `/verification/${ticketId}`
  );

  return {
    success: true,
    verification,
    ticket: { id: ticketId, status: "WAITING_FOR_USER" },
  };
}

/**
 * Block user account permanently
 */
export async function blockUser(
  ticketId: string,
  blockedBy: string,
  reason: string
): Promise<{
  success: boolean;
  ticket: { id: string; status: TicketStatus };
  user: { status: string };
}> {
  console.log(`[EscalationService] Blocking user for ticket ${ticketId}`);

  const previousStatus = getTicketStatus(ticketId);

  // Update ticket status
  setTicketStatus(ticketId, "CLOSED_PERMANENT");

  // Create audit log
  createAuditLog(
    ticketId,
    "BLOCKED_PERMANENT",
    blockedBy,
    reason,
    previousStatus,
    "CLOSED_PERMANENT"
  );

  // Send notifications to user
  const channels = CONFIG.NOTIFICATION_CHANNELS.BLOCK;
  await sendMultiChannelNotifications(
    channels,
    "user",
    CONFIG.TEMPLATES.ACCOUNT_BLOCKED.de.subject,
    CONFIG.TEMPLATES.ACCOUNT_BLOCKED.de.body
  );

  return {
    success: true,
    ticket: { id: ticketId, status: "CLOSED_PERMANENT" },
    user: { status: "BLOCKED" },
  };
}

/**
 * Escalate case to Compliance team
 */
export async function escalateToCompliance(
  ticketId: string,
  escalatedBy: string,
  reason: string
): Promise<{
  success: boolean;
  ticket: { id: string; status: TicketStatus };
  compliance: { assigned: boolean; channel: string };
}> {
  console.log(`[EscalationService] Escalating ticket ${ticketId} to Compliance`);

  const previousStatus = getTicketStatus(ticketId);

  // Update ticket status
  setTicketStatus(ticketId, "ESCALATED");

  // Create audit log
  createAuditLog(
    ticketId,
    "ESCALATED",
    escalatedBy,
    reason,
    previousStatus,
    "ESCALATED"
  );

  // Send notifications to compliance team
  const channels = CONFIG.NOTIFICATION_CHANNELS.ESCALATE;
  await sendMultiChannelNotifications(
    channels,
    CONFIG.SLACK_CHANNELS.ESCALATION,
    `[Compliance Case] Ticket ${ticketId} requires review`,
    `Escalated by ${escalatedBy}: ${reason}`,
    `/compliance/cases/${ticketId}`
  );

  return {
    success: true,
    ticket: { id: ticketId, status: "ESCALATED" },
    compliance: { assigned: true, channel: CONFIG.SLACK_CHANNELS.ESCALATION },
  };
}

/**
 * Clear case after Compliance review
 */
export async function clearAfterReview(
  ticketId: string,
  clearedBy: string,
  reason: string
): Promise<{
  success: boolean;
  ticket: { id: string; status: TicketStatus };
  user: { status: string; riskScoreReduced: boolean };
}> {
  console.log(`[EscalationService] Clearing ticket ${ticketId} after Compliance review`);

  const previousStatus = getTicketStatus(ticketId);

  // Update ticket status
  setTicketStatus(ticketId, "CLOSED_CLEARED");

  // Create audit log
  createAuditLog(
    ticketId,
    "CLEARED",
    clearedBy,
    reason,
    previousStatus,
    "CLOSED_CLEARED"
  );

  // Send notifications to user
  const channels = CONFIG.NOTIFICATION_CHANNELS.CLEAR;
  await sendMultiChannelNotifications(
    channels,
    "user",
    CONFIG.TEMPLATES.ACTION_RELEASED.de.subject,
    CONFIG.TEMPLATES.ACTION_RELEASED.de.body,
    "/retry-action"
  );

  return {
    success: true,
    ticket: { id: ticketId, status: "CLOSED_CLEARED" },
    user: { status: "ACTIVE", riskScoreReduced: true },
  };
}

/**
 * Get audit trail for a ticket
 */
export function getAuditTrail(ticketId: string): AuditLogEntry[] {
  return auditLogs
    .filter((entry) => entry.ticketId === ticketId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Get all tickets by status
 */
export function getTicketsByStatus(status: TicketStatus): string[] {
  const tickets: string[] = [];
  ticketStatuses.forEach((s, ticketId) => {
    if (s === status) {
      tickets.push(ticketId);
    }
  });
  return tickets;
}

/**
 * Handle verification completion (called when user submits documents)
 */
export async function handleVerificationCompletion(
  ticketId: string,
  documents: { type: string; url: string }[]
): Promise<{
  success: boolean;
  ticket: { id: string; status: TicketStatus };
}> {
  console.log(`[EscalationService] Verification completed for ticket ${ticketId}`);

  const previousStatus = getTicketStatus(ticketId);

  // Update ticket status back to IN_PROGRESS for review
  setTicketStatus(ticketId, "IN_PROGRESS");

  // Create audit log
  createAuditLog(
    ticketId,
    "VERIFICATION_SUBMITTED",
    "user",
    `Documents submitted: ${documents.map((d) => d.type).join(", ")}`,
    previousStatus,
    "IN_PROGRESS"
  );

  // Notify support team
  await sendNotification({
    type: "slack",
    recipient: "#security-alerts",
    subject: `Verification submitted for ticket ${ticketId}`,
    message: "User has submitted verification documents. Ready for review.",
  });

  return {
    success: true,
    ticket: { id: ticketId, status: "IN_PROGRESS" },
  };
}

/**
 * Process verification timeout (48h)
 */
export async function processVerificationTimeout(): Promise<void> {
  const now = new Date();
  verificationRequests.forEach(async (request, ticketId) => {
    if (request.expiresAt < now) {
      console.log(`[EscalationService] Verification timeout for ticket ${ticketId}`);

      // Auto-escalate expired verifications
      await escalateToCompliance(
        ticketId,
        "system",
        "Verification timeout - User did not respond within 48 hours"
      );
    }
  });
}

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

export const EscalationWorkflowService = {
  releaseTicket,
  requestVerification,
  blockUser,
  escalateToCompliance,
  clearAfterReview,
  getAuditTrail,
  getTicketsByStatus,
  handleVerificationCompletion,
  processVerificationTimeout,
};

export default EscalationWorkflowService;
