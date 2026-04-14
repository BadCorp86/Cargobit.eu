// ============================================
// CARGOBIT SECURITY GATEWAY MICROSERVICE
// Hybrid Security Layer: Permission + Risk
// Port: 3004
// ============================================

import { serve } from "bun";

// ============================================
// TYPES & INTERFACES
// ============================================

type SystemRole = "ADMIN" | "SUPPORT" | "SHIPPER_COMPANY" | "SHIPPER_PRIVATE" | "DISPATCHER" | "DRIVER_SELF_EMPLOYED" | "MARKETER";
type RiskLevel = "GREEN" | "YELLOW" | "RED";

interface SecurityCheckRequest {
  userId: string;
  email?: string;
  role: SystemRole;
  companyId?: string;
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
  riskLevel?: RiskLevel;
  riskScore?: number;
  reason?: string;
  mitigations?: string[];
  supportTicketCreated?: boolean;
  triggeredRules?: string[];
  auditId?: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  result: string;
  riskScore?: number;
  riskLevel?: RiskLevel;
  reason?: string;
}

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
  YELLOW: ["DELAY_24H", "EXTRA_LOGGING", "SUPPORT_NOTIFICATION"],
  RED: ["MANUAL_REVIEW_REQUIRED", "SUPPORT_NOTIFICATION", "CREATE_TICKET"],
};

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

// ============================================
// RISK ENGINE CLIENT
// ============================================

const RISK_ENGINE_URL = "http://localhost:3003";

async function callRiskEngine(
  entityType: string,
  entityId: string,
  context: Record<string, unknown>
): Promise<{
  score: number;
  level: RiskLevel;
  triggeredRules: string[];
  recommendation: string;
}> {
  try {
    const response = await fetch(`${RISK_ENGINE_URL}/risk/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityType: entityType.toUpperCase(),
        entityId,
        context,
      }),
    });

    if (!response.ok) {
      // Return default low risk if risk engine unavailable
      return { score: 0, level: "GREEN", triggeredRules: [], recommendation: "ALLOW" };
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Risk Engine call failed:", error);
    // Return default low risk if risk engine unavailable
    return { score: 0, level: "GREEN", triggeredRules: [], recommendation: "ALLOW" };
  }
}

// ============================================
// CORE FUNCTIONS
// ============================================

function checkPermission(role: SystemRole, action: SecurityAction): boolean {
  return PERMISSION_MATRIX[role]?.[action] === true;
}

function createAuditLog(
  userId: string,
  action: string,
  result: string,
  riskScore?: number,
  riskLevel?: RiskLevel,
  reason?: string
): string {
  const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  auditLogs.push({
    id,
    timestamp: new Date(),
    userId,
    action,
    result,
    riskScore,
    riskLevel,
    reason,
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
  const id = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

// ============================================
// MAIN SECURITY CHECK
// ============================================

async function performSecurityCheck(request: SecurityCheckRequest): Promise<SecurityCheckResult> {
  const { userId, role, action, entity } = request;

  // Step 1: Permission Check (hard, binary)
  if (!checkPermission(role, action)) {
    const auditId = createAuditLog(userId, action, "permission_denied", undefined, undefined, `Role ${role} not allowed for ${action}`);
    return {
      allowed: false,
      decision: "permission_denied",
      reason: `Rolle '${role}' hat keine Berechtigung für '${action}'`,
      auditId,
    };
  }

  // Step 2: Risk Evaluation (dynamic)
  const entityType = entity.type.toUpperCase();
  const riskResult = await callRiskEngine(entityType, entity.id, entity.context || {});

  // Step 3: Decision based on risk level
  if (riskResult.level === "GREEN") {
    // Low risk - allow
    const auditId = createAuditLog(userId, action, "allowed", riskResult.score, riskResult.level);
    return {
      allowed: true,
      decision: "allowed",
      riskLevel: riskResult.level,
      riskScore: riskResult.score,
      triggeredRules: riskResult.triggeredRules,
      auditId,
    };
  }

  if (riskResult.level === "YELLOW") {
    // Medium risk - allow with mitigations
    const mitigations = MITIGATION_ACTIONS.YELLOW;
    const auditId = createAuditLog(userId, action, "allowed_with_mitigation", riskResult.score, riskResult.level);
    return {
      allowed: true,
      decision: "allowed_with_mitigation",
      riskLevel: riskResult.level,
      riskScore: riskResult.score,
      mitigations,
      triggeredRules: riskResult.triggeredRules,
      auditId,
    };
  }

  // High risk - block
  const ticketId = createSupportTicket(
    userId,
    action,
    riskResult.score,
    riskResult.level,
    `High risk detected for action ${action}`
  );
  const auditId = createAuditLog(userId, action, "blocked", riskResult.score, riskResult.level, "High risk");

  return {
    allowed: false,
    decision: "blocked",
    riskLevel: riskResult.level,
    riskScore: riskResult.score,
    reason: "Hohes Risiko erkannt - Aktion vorübergehend gesperrt",
    mitigations: MITIGATION_ACTIONS.RED,
    supportTicketCreated: true,
    triggeredRules: riskResult.triggeredRules,
    auditId,
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // POST /security/check - Main Hybrid Security Check
    if (path === "/security/check" && method === "POST") {
      const body = await request.json();
      const result = await performSecurityCheck(body as SecurityCheckRequest);
      return Response.json({ success: true, data: result }, { headers: corsHeaders });
    }

    // GET /security/permissions - Get permission matrix
    if (path === "/security/permissions" && method === "GET") {
      return Response.json({ success: true, data: PERMISSION_MATRIX }, { headers: corsHeaders });
    }

    // GET /security/permissions/:role - Get permissions for a role
    const rolePermsMatch = path.match(/^\/security\/permissions\/([A-Z_]+)$/);
    if (rolePermsMatch && method === "GET") {
      const role = rolePermsMatch[1] as SystemRole;
      const perms = PERMISSION_MATRIX[role];
      if (!perms) {
        return Response.json({ error: "Invalid role" }, { status: 400, headers: corsHeaders });
      }
      const allowedActions = Object.entries(perms)
        .filter(([_, allowed]) => allowed)
        .map(([action]) => action);
      return Response.json({ success: true, data: { role, allowedActions, permissions: perms } }, { headers: corsHeaders });
    }

    // GET /security/audit - Get audit logs
    if (path === "/security/audit" && method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "100", 10);
      const userId = url.searchParams.get("userId");
      let logs = auditLogs;
      if (userId) {
        logs = logs.filter((l) => l.userId === userId);
      }
      return Response.json({ success: true, data: logs.slice(-limit).reverse() }, { headers: corsHeaders });
    }

    // GET /security/tickets - Get support tickets
    if (path === "/security/tickets" && method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "100", 10);
      const status = url.searchParams.get("status");
      let tickets = supportTickets;
      if (status) {
        tickets = tickets.filter((t) => t.status === status);
      }
      return Response.json({ success: true, data: tickets.slice(-limit).reverse() }, { headers: corsHeaders });
    }

    // PUT /security/tickets/:id - Update ticket status
    const ticketUpdateMatch = path.match(/^\/security\/tickets\/(.+)$/);
    if (ticketUpdateMatch && method === "PUT") {
      const ticketId = ticketUpdateMatch[1];
      const body = await request.json();
      const ticket = supportTickets.find((t) => t.id === ticketId);
      if (!ticket) {
        return Response.json({ error: "Ticket not found" }, { status: 404, headers: corsHeaders });
      }
      if (body.status) {
        ticket.status = body.status;
      }
      return Response.json({ success: true, data: ticket }, { headers: corsHeaders });
    }

    // GET /security/mitigations - Get mitigation definitions
    if (path === "/security/mitigations" && method === "GET") {
      return Response.json({ success: true, data: MITIGATION_ACTIONS }, { headers: corsHeaders });
    }

    // Health check
    if (path === "/health") {
      return Response.json({ status: "ok", service: "security-gateway", port: 3004 }, { headers: corsHeaders });
    }

    return Response.json({ error: "Not Found" }, { status: 404, headers: corsHeaders });
  } catch (error) {
    console.error("Security Gateway Error:", error);
    return Response.json(
      { error: "Internal Server Error", message: String(error) },
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
║       CARGOBIT SECURITY GATEWAY MICROSERVICE             ║
║       Hybrid Security Layer: Permission + Risk           ║
║       Port: ${PORT}                                         ║
╠══════════════════════════════════════════════════════════╣
║  Endpoints:                                              ║
║  • POST /security/check       - Hybrid Security Check    ║
║  • GET  /security/permissions - Permission Matrix        ║
║  • GET  /security/audit       - Audit Logs               ║
║  • GET  /security/tickets     - Support Tickets          ║
║  • GET  /security/mitigations - Mitigation Definitions   ║
╚══════════════════════════════════════════════════════════╝
`);

serve({
  port: PORT,
  fetch: handleRequest,
});
