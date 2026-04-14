// ============================================
// CARGOBIT SECURITY GATEWAY MICROSERVICE v2.0
// Hybrid Security Layer: Permission + Risk
// With Error Codes, Auth, Rate-Limits, Fallback
// Port: 3004
// ============================================

import { serve } from "bun";

// ============================================
// TYPES & INTERFACES
// ============================================

type SystemRole = "ADMIN" | "SUPPORT" | "SHIPPER_COMPANY" | "SHIPPER_PRIVATE" | "DISPATCHER" | "DRIVER_SELF_EMPLOYED" | "MARKETER";
type RiskLevel = "GREEN" | "YELLOW" | "RED";

interface SecurityCheckRequest {
  requestId?: string;  // Correlation ID
  user: {
    id: string;
    role: SystemRole;
    companyId?: string;
    email?: string;
  };
  action: SecurityAction;
  entity: {
    type: "user" | "company" | "transaction" | "transport" | "wallet" | "vehicle";
    id: string;
    context?: Record<string, unknown>;
  };
}

interface SecurityCheckResult {
  allowed: boolean;
  decision: "allowed" | "allowed_with_mitigation" | "blocked" | "permission_denied";
  risk?: {
    score: number;
    level: RiskLevel;
    triggeredRules: string[];
  };
  mitigations?: string[];
  supportTicketId?: string;
  correlationId?: string;
  errorCode?: SecurityErrorCode;
  message?: string;
}

interface ErrorResponse {
  allowed: false;
  decision: "permission_denied" | "blocked" | "error";
  errorCode: SecurityErrorCode;
  message: string;
  correlationId?: string;
}

type SecurityErrorCode =
  | "PERMISSION_DENIED"
  | "HIGH_RISK_BLOCKED"
  | "SECURITY_SERVICE_UNAVAILABLE"
  | "INVALID_REQUEST"
  | "RATE_LIMIT_EXCEEDED"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR";

type SecurityAction =
  | "CREATE_TRANSPORT"
  | "VIEW_TRANSPORT"
  | "ACCEPT_OFFER"
  | "ACCEPT_JOB"
  | "MAKE_OFFER"
  | "ASSIGN_DRIVER"
  | "UPDATE_STATUS"
  | "VIEW_WALLET"
  | "INITIATE_PAYOUT"
  | "MANAGE_VEHICLES"
  | "MANAGE_USERS"
  | "MANAGE_PLANS";

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  correlationId?: string;
  clientId?: string;
  userId: string;
  action: string;
  result: string;
  errorCode?: SecurityErrorCode;
  riskScore?: number;
  riskLevel?: RiskLevel;
  reason?: string;
}

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Rate limiting
  RATE_LIMITS: {
    DEFAULT: { requests: 100, windowMs: 10000 },      // 100 req / 10s
    SENSITIVE: { requests: 20, windowMs: 10000 },     // 20 req / 10s for sensitive actions
  },

  // Sensitive actions that have stricter rate limits
  SENSITIVE_ACTIONS: ["INITIATE_PAYOUT", "ACCEPT_OFFER", "ASSIGN_DRIVER"],

  // Fallback behavior when Risk Engine is unavailable
  FALLBACK_MODE: "PERMISSION_ONLY" as "PERMISSION_ONLY" | "BLOCK_ALL",  // Allow with permission-only check or block everything

  // Service tokens for internal services
  VALID_SERVICE_TOKENS: new Set([
    "srv_transport_service_token_xxx",
    "srv_wallet_service_token_yyy",
    "srv_matching_service_token_zzz",
    // Add more service tokens as needed
  ]),

  // Risk Engine URL
  RISK_ENGINE_URL: "http://localhost:3003",

  // Risk Engine timeout (ms)
  RISK_ENGINE_TIMEOUT: 2000,
};

// ============================================
// ERROR CODE DEFINITIONS
// ============================================

const ERROR_MESSAGES: Record<SecurityErrorCode, { httpStatus: number; message: string }> = {
  PERMISSION_DENIED: {
    httpStatus: 403,
    message: "User role does not have permission for this action",
  },
  HIGH_RISK_BLOCKED: {
    httpStatus: 403,
    message: "Action blocked due to high risk. Case forwarded to support.",
  },
  SECURITY_SERVICE_UNAVAILABLE: {
    httpStatus: 503,
    message: "Security service temporarily unavailable. Please retry.",
  },
  INVALID_REQUEST: {
    httpStatus: 400,
    message: "Invalid request format or missing required fields",
  },
  RATE_LIMIT_EXCEEDED: {
    httpStatus: 429,
    message: "Rate limit exceeded. Please slow down your requests.",
  },
  UNAUTHORIZED: {
    httpStatus: 401,
    message: "Missing or invalid service token",
  },
  INTERNAL_ERROR: {
    httpStatus: 500,
    message: "Internal server error. Please contact support.",
  },
};

// ============================================
// PERMISSION MATRIX
// ============================================

const PERMISSION_MATRIX: Record<SystemRole, Record<SecurityAction, boolean>> = {
  ADMIN: {
    CREATE_TRANSPORT: false,
    VIEW_TRANSPORT: true,
    ACCEPT_OFFER: false,
    ACCEPT_JOB: false,
    MAKE_OFFER: false,
    ASSIGN_DRIVER: false,
    UPDATE_STATUS: false,
    VIEW_WALLET: true,
    INITIATE_PAYOUT: true,
    MANAGE_VEHICLES: false,
    MANAGE_USERS: true,
    MANAGE_PLANS: true,
  },
  SUPPORT: {
    CREATE_TRANSPORT: false,
    VIEW_TRANSPORT: true,
    ACCEPT_OFFER: false,
    ACCEPT_JOB: false,
    MAKE_OFFER: false,
    ASSIGN_DRIVER: false,
    UPDATE_STATUS: false,
    VIEW_WALLET: true,
    INITIATE_PAYOUT: false,
    MANAGE_VEHICLES: false,
    MANAGE_USERS: false,
    MANAGE_PLANS: false,
  },
  SHIPPER_COMPANY: {
    CREATE_TRANSPORT: true,
    VIEW_TRANSPORT: true,
    ACCEPT_OFFER: true,
    ACCEPT_JOB: false,
    MAKE_OFFER: false,
    ASSIGN_DRIVER: false,
    UPDATE_STATUS: false,
    VIEW_WALLET: true,
    INITIATE_PAYOUT: true,
    MANAGE_VEHICLES: false,
    MANAGE_USERS: false,
    MANAGE_PLANS: false,
  },
  SHIPPER_PRIVATE: {
    CREATE_TRANSPORT: true,
    VIEW_TRANSPORT: true,
    ACCEPT_OFFER: true,
    ACCEPT_JOB: false,
    MAKE_OFFER: false,
    ASSIGN_DRIVER: false,
    UPDATE_STATUS: false,
    VIEW_WALLET: true,
    INITIATE_PAYOUT: true,
    MANAGE_VEHICLES: false,
    MANAGE_USERS: false,
    MANAGE_PLANS: false,
  },
  DISPATCHER: {
    CREATE_TRANSPORT: false,
    VIEW_TRANSPORT: true,
    ACCEPT_OFFER: false,
    ACCEPT_JOB: false,
    MAKE_OFFER: true,
    ASSIGN_DRIVER: true,
    UPDATE_STATUS: true,
    VIEW_WALLET: true,
    INITIATE_PAYOUT: false,
    MANAGE_VEHICLES: true,
    MANAGE_USERS: false,
    MANAGE_PLANS: false,
  },
  DRIVER_SELF_EMPLOYED: {
    CREATE_TRANSPORT: false,
    VIEW_TRANSPORT: true,
    ACCEPT_OFFER: false,
    ACCEPT_JOB: true,
    MAKE_OFFER: true,
    ASSIGN_DRIVER: false,
    UPDATE_STATUS: true,
    VIEW_WALLET: false,
    INITIATE_PAYOUT: false,
    MANAGE_VEHICLES: false,
    MANAGE_USERS: false,
    MANAGE_PLANS: false,
  },
  MARKETER: {
    CREATE_TRANSPORT: false,
    VIEW_TRANSPORT: false,
    ACCEPT_OFFER: false,
    ACCEPT_JOB: false,
    MAKE_OFFER: false,
    ASSIGN_DRIVER: false,
    UPDATE_STATUS: false,
    VIEW_WALLET: false,
    INITIATE_PAYOUT: false,
    MANAGE_VEHICLES: false,
    MANAGE_USERS: false,
    MANAGE_PLANS: false,
  },
};

// ============================================
// MITIGATION DEFINITIONS
// ============================================

const MITIGATION_ACTIONS: Record<RiskLevel, string[]> = {
  GREEN: [],
  YELLOW: ["delay_payout_24h", "extra_logging", "support_notification"],
  RED: ["manual_review_required", "support_notification", "create_ticket"],
};

// ============================================
// HIGH-RISK EVENT HANDLER INTEGRATION
// ============================================

interface HighRiskEventResult {
  success: boolean;
  ticket: {
    id: string;
    priority: string;
  };
  notifications: {
    email: { id: string; status: string };
    slack: { id: string; status: string };
    sms: boolean;
  };
}

async function handleHighRiskEvent(request: SecurityCheckRequest, riskResult: { score: number; level: RiskLevel; triggeredRules: string[] }): Promise<HighRiskEventResult> {
  console.log(`[HighRiskHandler] Processing RED risk event for ${request.entity.id}`);
  
  // In production, this would call the HighRiskEventHandler service
  // For now, we simulate the flow locally
  
  const ticketId = createSupportTicket(
    request.user.id,
    request.action,
    riskResult.score,
    riskResult.level,
    `High risk detected: ${riskResult.triggeredRules.join(', ')}`
  );
  
  // Send notifications
  const emailSent = await sendEmailNotification(request, riskResult, ticketId);
  const slackSent = await sendSlackAlert(request, riskResult, ticketId);
  const smsSent = riskResult.score >= 90 ? await sendSmsAlert(request, riskResult, ticketId) : false;
  
  // Log audit
  createAuditLog(request.user.id, request.action, "high_risk_handled", {
    correlationId: request.requestId,
    errorCode: "HIGH_RISK_BLOCKED",
    riskScore: riskResult.score,
    riskLevel: riskResult.level,
    reason: "Automatic high-risk handling flow executed",
  });
  
  return {
    success: true,
    ticket: { id: ticketId, priority: riskResult.score >= 85 ? "critical" : "high" },
    notifications: {
      email: { id: `email_${Date.now()}`, status: emailSent ? "sent" : "failed" },
      slack: { id: `slack_${Date.now()}`, status: slackSent ? "sent" : "failed" },
      sms: smsSent,
    },
  };
}

async function sendEmailNotification(request: SecurityCheckRequest, risk: { score: number; level: RiskLevel; triggeredRules: string[] }, ticketId: string): Promise<boolean> {
  console.log(`[Email] Sending high-risk notification for ticket ${ticketId}`);
  console.log(`  To: security-team@cargbit.com`);
  console.log(`  Subject: [High Risk] Aktion blockiert – Score ${risk.score} – ${request.entity.type} ${request.entity.id}`);
  // Simulate sending
  return true;
}

async function sendSlackAlert(request: SecurityCheckRequest, risk: { score: number; level: RiskLevel; triggeredRules: string[] }, ticketId: string): Promise<boolean> {
  const channel = risk.score >= 85 ? "#security-critical" : "#security-alerts";
  console.log(`[Slack] Sending alert to ${channel}`);
  console.log(`  🚨 High Risk Detected`);
  console.log(`  ${request.entity.type}: ${request.entity.id}`);
  console.log(`  Score: ${risk.score}`);
  console.log(`  Rules: ${risk.triggeredRules.join(', ')}`);
  console.log(`  Action blocked: ${request.action}`);
  // Simulate sending
  return true;
}

async function sendSmsAlert(request: SecurityCheckRequest, risk: { score: number; level: RiskLevel; triggeredRules: string[] }, ticketId: string): Promise<boolean> {
  console.log(`[SMS] Sending critical alert for ticket ${ticketId}`);
  console.log(`  To: on-call security team`);
  // Simulate sending
  return true;
}

// ============================================
// STORAGE
// ============================================

const auditLogs: AuditLogEntry[] = [];
const supportTickets: Array<{
  id: string;
  userId: string;
  action: string;
  riskScore: number;
  riskLevel: RiskLevel;
  reason: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: Date;
}> = [];

// Rate limit tracking
const rateLimitStore: Map<string, { count: number; resetAt: number }> = new Map();

// Risk engine availability
let riskEngineAvailable = true;
let lastRiskEngineCheck = 0;

// ============================================
// RATE LIMITING
// ============================================

function checkRateLimit(clientId: string, action: SecurityAction): { allowed: boolean; retryAfter?: number } {
  const isSensitive = CONFIG.SENSITIVE_ACTIONS.includes(action);
  const limits = isSensitive ? CONFIG.RATE_LIMITS.SENSITIVE : CONFIG.RATE_LIMITS.DEFAULT;
  const key = `${clientId}:${action}`;
  const now = Date.now();

  const current = rateLimitStore.get(key);

  if (!current || now > current.resetAt) {
    // Window expired or first request
    rateLimitStore.set(key, { count: 1, resetAt: now + limits.windowMs });
    return { allowed: true };
  }

  if (current.count >= limits.requests) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count++;
  return { allowed: true };
}

// ============================================
// AUTHENTICATION
// ============================================

function validateServiceToken(authHeader: string | null): { valid: boolean; clientId?: string } {
  if (!authHeader) {
    return { valid: false };
  }

  // Extract Bearer token
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { valid: false };
  }

  const token = match[1];

  if (CONFIG.VALID_SERVICE_TOKENS.has(token)) {
    // Extract client ID from token (simplified)
    return { valid: true, clientId: token.split("_")[1] || "unknown" };
  }

  return { valid: false };
}

// ============================================
// RISK ENGINE CLIENT WITH FALLBACK
// ============================================

async function checkRiskEngineHealth(): Promise<boolean> {
  const now = Date.now();
  // Only check every 30 seconds
  if (now - lastRiskEngineCheck < 30000) {
    return riskEngineAvailable;
  }

  lastRiskEngineCheck = now;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    const response = await fetch(`${CONFIG.RISK_ENGINE_URL}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    riskEngineAvailable = response.ok;
    return riskEngineAvailable;
  } catch {
    riskEngineAvailable = false;
    return false;
  }
}

async function callRiskEngine(
  entityType: string,
  entityId: string,
  context: Record<string, unknown>
): Promise<{
  score: number;
  level: RiskLevel;
  triggeredRules: string[];
  recommendation: string;
  available: boolean;
}> {
  const isAvailable = await checkRiskEngineHealth();

  if (!isAvailable) {
    console.warn("Risk Engine unavailable, using fallback");
    return {
      score: 0,
      level: "GREEN",
      triggeredRules: [],
      recommendation: "ALLOW",
      available: false,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.RISK_ENGINE_TIMEOUT);

    const response = await fetch(`${CONFIG.RISK_ENGINE_URL}/risk/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: entityType.toUpperCase(),
        entityId,
        context,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Risk Engine returned ${response.status}`);
    }

    const data = await response.json();
    return { ...data.data, available: true };
  } catch (error) {
    console.error("Risk Engine call failed:", error);
    riskEngineAvailable = false;
    return {
      score: 0,
      level: "GREEN",
      triggeredRules: [],
      recommendation: "ALLOW",
      available: false,
    };
  }
}

// ============================================
// CORE FUNCTIONS
// ============================================

function checkPermission(role: SystemRole, action: SecurityAction): boolean {
  return PERMISSION_MATRIX[role]?.[action] === true;
}

function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createAuditLog(
  userId: string,
  action: string,
  result: string,
  options: {
    correlationId?: string;
    clientId?: string;
    errorCode?: SecurityErrorCode;
    riskScore?: number;
    riskLevel?: RiskLevel;
    reason?: string;
  } = {}
): string {
  const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  auditLogs.push({
    id,
    timestamp: new Date(),
    ...options,
    userId,
    action,
    result,
  });
  return id;
}

function createSupportTicket(
  userId: string,
  action: string,
  riskScore: number,
  riskLevel: RiskLevel,
  reason: string
): string {
  const id = `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  supportTickets.push({
    id,
    userId,
    action,
    riskScore,
    riskLevel,
    reason,
    status: "open",
    createdAt: new Date(),
  });
  return id;
}

function createErrorResponse(
  errorCode: SecurityErrorCode,
  correlationId?: string,
  additionalMessage?: string
): ErrorResponse {
  const errorInfo = ERROR_MESSAGES[errorCode];
  return {
    allowed: false,
    decision: errorCode === "PERMISSION_DENIED" ? "permission_denied" : errorCode === "HIGH_RISK_BLOCKED" ? "blocked" : "error",
    errorCode,
    message: additionalMessage || errorInfo.message,
    correlationId,
  };
}

// ============================================
// MAIN SECURITY CHECK
// ============================================

async function performSecurityCheck(
  request: SecurityCheckRequest,
  clientId: string
): Promise<SecurityCheckResult | ErrorResponse> {
  const correlationId = request.requestId || generateCorrelationId();

  // Validate request
  if (!request.user?.id || !request.user?.role || !request.action || !request.entity?.type || !request.entity?.id) {
    return createErrorResponse("INVALID_REQUEST", correlationId, "Missing required fields: user.id, user.role, action, entity.type, entity.id");
  }

  const { user, action, entity } = request;

  // Step 1: Permission Check (hard, binary)
  if (!checkPermission(user.role, action)) {
    createAuditLog(user.id, action, "permission_denied", {
      correlationId,
      clientId,
      errorCode: "PERMISSION_DENIED",
      reason: `Role ${user.role} not allowed for ${action}`,
    });
    return {
      allowed: false,
      decision: "permission_denied",
      errorCode: "PERMISSION_DENIED",
      message: `Role '${user.role}' is not allowed to perform action '${action}'.`,
      correlationId,
    };
  }

  // Step 2: Risk Evaluation (dynamic)
  const entityType = entity.type.toUpperCase();
  const riskResult = await callRiskEngine(entityType, entity.id, entity.context || {});

  // Handle fallback mode when Risk Engine is unavailable
  if (!riskResult.available && CONFIG.FALLBACK_MODE === "BLOCK_ALL") {
    createAuditLog(user.id, action, "blocked", {
      correlationId,
      clientId,
      errorCode: "SECURITY_SERVICE_UNAVAILABLE",
      reason: "Risk Engine unavailable",
    });
    return {
      allowed: false,
      decision: "blocked",
      errorCode: "SECURITY_SERVICE_UNAVAILABLE",
      message: "Security service temporarily unavailable. Please retry.",
      correlationId,
    };
  }

  // Step 3: Decision based on risk level
  if (riskResult.level === "GREEN") {
    // Low risk - allow
    createAuditLog(user.id, action, "allowed", {
      correlationId,
      clientId,
      riskScore: riskResult.score,
      riskLevel: riskResult.level,
    });
    return {
      allowed: true,
      decision: "allowed",
      risk: {
        score: riskResult.score,
        level: riskResult.level,
        triggeredRules: riskResult.triggeredRules,
      },
      correlationId,
    };
  }

  if (riskResult.level === "YELLOW") {
    // Medium risk - allow with mitigations
    createAuditLog(user.id, action, "allowed_with_mitigation", {
      correlationId,
      clientId,
      riskScore: riskResult.score,
      riskLevel: riskResult.level,
    });
    return {
      allowed: true,
      decision: "allowed_with_mitigation",
      risk: {
        score: riskResult.score,
        level: riskResult.level,
        triggeredRules: riskResult.triggeredRules,
      },
      mitigations: MITIGATION_ACTIONS.YELLOW,
      correlationId,
    };
  }

  // High risk - block and trigger event flow
  console.log(`[SecurityGateway] HIGH RISK detected for ${user.id} - triggering event flow...`);
  
  // Execute high-risk event flow (ticket, email, slack, sms)
  const eventResult = await handleHighRiskEvent(request, {
    score: riskResult.score,
    level: riskResult.level,
    triggeredRules: riskResult.triggeredRules,
  });
  
  createAuditLog(user.id, action, "blocked", {
    correlationId,
    clientId,
    errorCode: "HIGH_RISK_BLOCKED",
    riskScore: riskResult.score,
    riskLevel: riskResult.level,
    reason: "High risk score - automatic event flow executed",
  });

  return {
    allowed: false,
    decision: "blocked",
    risk: {
      score: riskResult.score,
      level: riskResult.level,
      triggeredRules: riskResult.triggeredRules,
    },
    errorCode: "HIGH_RISK_BLOCKED",
    message: "Action blocked due to high risk. Case forwarded to support.",
    supportTicketId: eventResult.ticket.id,
    correlationId,
    eventFlow: {
      ticket: eventResult.ticket,
      notifications: eventResult.notifications,
    },
  };
}

// ============================================
// HTTP HANDLERS
// ============================================

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Service-Token",
  };

  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============================================
    // POST /security/check - Main Hybrid Security Check
    // ============================================
    if (path === "/security/check" && method === "POST") {
      // Validate service token
      const authHeader = request.headers.get("Authorization") || request.headers.get("X-Service-Token");
      const { valid, clientId } = validateServiceToken(authHeader);

      if (!valid) {
        return Response.json(
          createErrorResponse("UNAUTHORIZED"),
          { status: 401, headers: corsHeaders }
        );
      }

      // Parse request
      let body: SecurityCheckRequest;
      try {
        body = await request.json();
      } catch {
        return Response.json(
          createErrorResponse("INVALID_REQUEST"),
          { status: 400, headers: corsHeaders }
        );
      }

      // Check rate limit
      const rateLimitResult = checkRateLimit(clientId!, body.action);
      if (!rateLimitResult.allowed) {
        return Response.json(
          createErrorResponse("RATE_LIMIT_EXCEEDED", body.requestId, `Retry after ${rateLimitResult.retryAfter} seconds`),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Retry-After": String(rateLimitResult.retryAfter),
              "X-RateLimit-Remaining": "0",
            },
          }
        );
      }

      // Perform security check
      const result = await performSecurityCheck(body, clientId!);

      // Determine HTTP status based on result
      let httpStatus = 200;
      if (!result.allowed) {
        if (result.errorCode) {
          httpStatus = ERROR_MESSAGES[result.errorCode]?.httpStatus || 403;
        }
      }

      return Response.json(result, { status: httpStatus, headers: corsHeaders });
    }

    // ============================================
    // GET /security/health - Service health check
    // ============================================
    if (path === "/security/health") {
      const riskEngineHealthy = await checkRiskEngineHealth();
      return Response.json({
        status: "ok",
        service: "security-gateway",
        port: 3004,
        dependencies: {
          riskEngine: riskEngineHealthy ? "healthy" : "unavailable",
        },
        fallbackMode: CONFIG.FALLBACK_MODE,
      }, { headers: corsHeaders });
    }

    // ============================================
    // GET /security/permissions - Get permission matrix
    // ============================================
    if (path === "/security/permissions" && method === "GET") {
      return Response.json({ success: true, data: PERMISSION_MATRIX }, { headers: corsHeaders });
    }

    // ============================================
    // GET /security/error-codes - Get error code definitions
    // ============================================
    if (path === "/security/error-codes" && method === "GET") {
      return Response.json({ success: true, data: ERROR_MESSAGES }, { headers: corsHeaders });
    }

    // ============================================
    // GET /security/audit - Get audit logs
    // ============================================
    if (path === "/security/audit" && method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "100", 10);
      const userId = url.searchParams.get("userId");
      let logs = auditLogs;
      if (userId) {
        logs = logs.filter((l) => l.userId === userId);
      }
      return Response.json({ success: true, data: logs.slice(-limit).reverse() }, { headers: corsHeaders });
    }

    // ============================================
    // GET /security/tickets - Get support tickets
    // ============================================
    if (path === "/security/tickets" && method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "100", 10);
      const status = url.searchParams.get("status");
      let tickets = supportTickets;
      if (status) {
        tickets = tickets.filter((t) => t.status === status);
      }
      return Response.json({ success: true, data: tickets.slice(-limit).reverse() }, { headers: corsHeaders });
    }

    // ============================================
    // GET /security/mitigations - Get mitigation definitions
    // ============================================
    if (path === "/security/mitigations" && method === "GET") {
      return Response.json({ success: true, data: MITIGATION_ACTIONS }, { headers: corsHeaders });
    }

    // ============================================
    // GET /security/rate-limits - Get rate limit config
    // ============================================
    if (path === "/security/rate-limits" && method === "GET") {
      return Response.json({
        success: true,
        data: {
          default: CONFIG.RATE_LIMITS.DEFAULT,
          sensitive: CONFIG.RATE_LIMITS.SENSITIVE,
          sensitiveActions: CONFIG.SENSITIVE_ACTIONS,
        },
      }, { headers: corsHeaders });
    }

    // Health check
    if (path === "/health") {
      return Response.json({ status: "ok", service: "security-gateway", port: 3004 }, { headers: corsHeaders });
    }

    return Response.json({ error: "Not Found" }, { status: 404, headers: corsHeaders });
  } catch (error) {
    console.error("Security Gateway Error:", error);
    return Response.json(
      createErrorResponse("INTERNAL_ERROR", undefined, String(error)),
      { status: 500, headers: corsHeaders }
    );
  }
}

// ============================================
// START SERVER
// ============================================

const PORT = 3004;

console.log(`
╔══════════════════════════════════════════════════════════╗
║       CARGOBIT SECURITY GATEWAY MICROSERVICE v2.0        ║
║       Hybrid Security Layer: Permission + Risk           ║
║       Port: ${PORT}                                         ║
╠══════════════════════════════════════════════════════════╣
║  Features:                                               ║
║  • Error Codes (PERMISSION_DENIED, HIGH_RISK_BLOCKED,..) ║
║  • Service Token Auth                                    ║
║  • Rate Limiting (100/10s default, 20/10s sensitive)     ║
║  • Risk Engine Fallback                                  ║
╠══════════════════════════════════════════════════════════╣
║  Endpoints:                                              ║
║  • POST /security/check       - Hybrid Security Check    ║
║  • GET  /security/health      - Health + Dependencies    ║
║  • GET  /security/error-codes - Error Definitions        ║
║  • GET  /security/rate-limits - Rate Limit Config        ║
║  • GET  /security/permissions - Permission Matrix        ║
║  • GET  /security/audit       - Audit Logs               ║
║  • GET  /security/tickets     - Support Tickets          ║
╚══════════════════════════════════════════════════════════╝
`);

serve({
  port: PORT,
  fetch: handleRequest,
});
