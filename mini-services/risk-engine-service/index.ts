// ============================================
// CARGOBIT RISK ENGINE MICROSERVICE
// Port: 3003
// ============================================

import { serve } from "bun";

// ============================================
// TYPES & INTERFACES
// ============================================

type RiskEntityType = "USER" | "COMPANY" | "TRANSACTION";
type RiskLevel = "GREEN" | "YELLOW" | "RED";

interface RiskCondition {
  field: string;
  equals?: string | number | boolean;
  not_equals?: string | number | boolean;
  greater_than?: number;
  less_than?: number;
  greater_than_or_equal?: number;
  less_than_or_equal?: number;
  contains_any?: (string | number)[];
  and?: RiskCondition[];
  or?: RiskCondition[];
}

interface RiskRule {
  id: string;
  name: string;
  description: string;
  entityType: RiskEntityType;
  category: string;
  condition: RiskCondition;
  weight: number;
  priority: number;
  active: boolean;
}

interface RiskContext {
  [key: string]: unknown;
}

interface RiskEvaluationResult {
  score: number;
  level: RiskLevel;
  triggeredRules: string[];
  recommendation: "ALLOW" | "ALLOW_WITH_MITIGATION" | "BLOCK";
}

interface RiskScoreRecord {
  entityType: RiskEntityType;
  entityId: string;
  score: number;
  level: RiskLevel;
  lastUpdated: Date;
}

interface RiskEventRecord {
  id: string;
  entityType: RiskEntityType;
  entityId: string;
  ruleId: string;
  ruleName: string;
  weight: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface RiskHistoryRecord {
  id: string;
  entityType: RiskEntityType;
  entityId: string;
  oldScore: number;
  newScore: number;
  scoreChange: number;
  oldLevel: RiskLevel;
  newLevel: RiskLevel;
  triggeredRules: string[];
  timestamp: Date;
}

// ============================================
// IN-MEMORY STORAGE (replace with DB in production)
// ============================================

const riskScores: Map<string, RiskScoreRecord> = new Map();
const riskEvents: RiskEventRecord[] = [];
const riskHistory: RiskHistoryRecord[] = [];
const customRules: Map<string, RiskRule> = new Map();

// ============================================
// CONFIGURATION
// ============================================

const RISK_THRESHOLDS = {
  GREEN: { min: 0, max: 30, recommendation: "ALLOW" as const },
  YELLOW: { min: 31, max: 60, recommendation: "ALLOW_WITH_MITIGATION" as const },
  RED: { min: 61, max: 100, recommendation: "BLOCK" as const },
};

const DEFAULT_RULES: RiskRule[] = [
  // User Rules
  {
    id: "user_kyc_missing",
    name: "KYC_UNVOLLSTAENDIG",
    description: "KYC-Verifizierung nicht abgeschlossen",
    entityType: "USER",
    category: "DOCUMENT",
    condition: { field: "kyc_status", equals: "missing" },
    weight: 20,
    priority: 10,
    active: true,
  },
  {
    id: "user_new_iban",
    name: "NEUE_IBAN",
    description: "Neue IBAN in den letzten 48h",
    entityType: "USER",
    category: "USER",
    condition: { field: "iban_age_hours", less_than: 48 },
    weight: 15,
    priority: 8,
    active: true,
  },
  {
    id: "user_many_cancellations",
    name: "VIELE_STORNOS",
    description: "Hohe Stornorate",
    entityType: "USER",
    category: "BEHAVIOR",
    condition: { field: "cancellation_rate", greater_than: 0.3 },
    weight: 10,
    priority: 7,
    active: true,
  },
  {
    id: "user_security_flag",
    name: "SECURITY_FLAG",
    description: "Aktive Sicherheits-Flags",
    entityType: "USER",
    category: "SECURITY",
    condition: { field: "active_security_flags", greater_than: 0 },
    weight: 25,
    priority: 15,
    active: true,
  },
  {
    id: "user_fraud_flag",
    name: "FRAUD_FLAG",
    description: "Betrugsverdacht",
    entityType: "USER",
    category: "SECURITY",
    condition: { field: "fraud_flag_days", less_than: 90 },
    weight: 30,
    priority: 18,
    active: true,
  },
  {
    id: "user_high_rating",
    name: "HOHE_BEWERTUNG",
    description: "Exzellente Bewertung",
    entityType: "USER",
    category: "BEHAVIOR",
    condition: { field: "rating_avg", greater_than: 4.7 },
    weight: -10,
    priority: 3,
    active: true,
  },
  {
    id: "user_low_rating",
    name: "NIEDRIGE_BEWERTUNG",
    description: "Niedrige Bewertung",
    entityType: "USER",
    category: "BEHAVIOR",
    condition: { field: "rating_avg", less_than: 3.0 },
    weight: 10,
    priority: 5,
    active: true,
  },
  {
    id: "user_long_history",
    name: "LANGE_HISTORIE",
    description: "Konto laenger als 1 Jahr",
    entityType: "USER",
    category: "USER",
    condition: { field: "account_age_days", greater_than: 365 },
    weight: -10,
    priority: 2,
    active: true,
  },

  // Company Rules
  {
    id: "company_kyb_missing",
    name: "KYB_FEHLT",
    description: "KYB-Verifizierung fehlt",
    entityType: "COMPANY",
    category: "DOCUMENT",
    condition: { field: "kyb_status", equals: "missing" },
    weight: 20,
    priority: 10,
    active: true,
  },
  {
    id: "company_fraud_flags",
    name: "FRAUD_FLAGS",
    description: "Aktive Fraud-Flags",
    entityType: "COMPANY",
    category: "SECURITY",
    condition: { field: "fraud_flags", greater_than: 0 },
    weight: 25,
    priority: 15,
    active: true,
  },
  {
    id: "company_damage_rate",
    name: "HOHE_SCHADENSRATE",
    description: "Hohe Schadensrate",
    entityType: "COMPANY",
    category: "COMPANY",
    condition: { field: "damage_rate", greater_than: 0.05 },
    weight: 10,
    priority: 7,
    active: true,
  },
  {
    id: "company_good_history",
    name: "LANGJAHRIGE_HISTORIE",
    description: "Unternehmen laenger als 3 Jahre",
    entityType: "COMPANY",
    category: "COMPANY",
    condition: { field: "company_age_years", greater_than: 3 },
    weight: -10,
    priority: 2,
    active: true,
  },

  // Transaction Rules
  {
    id: "tx_high_amount",
    name: "HOHER_BETRAG",
    description: "Betrag ueber 50.000 EUR",
    entityType: "TRANSACTION",
    category: "TRANSACTION",
    condition: { field: "amount", greater_than: 50000 },
    weight: 20,
    priority: 10,
    active: true,
  },
  {
    id: "tx_very_high_amount",
    name: "SEHR_HOHER_BETRAG",
    description: "Betrag ueber 100.000 EUR",
    entityType: "TRANSACTION",
    category: "TRANSACTION",
    condition: { field: "amount", greater_than: 100000 },
    weight: 25,
    priority: 12,
    active: true,
  },
  {
    id: "tx_intl_hazmat",
    name: "INTERNATIONAL_GEFAHRGUT",
    description: "International + Gefahrgut",
    entityType: "TRANSACTION",
    category: "TRANSACTION",
    condition: {
      and: [
        { field: "international", equals: true },
        { field: "hazmat", equals: true },
      ],
    },
    weight: 20,
    priority: 10,
    active: true,
  },
  {
    id: "tx_new_iban_high",
    name: "NEUE_IBAN_HOHER_BETRAG",
    description: "Neue IBAN mit hohem Betrag",
    entityType: "TRANSACTION",
    category: "TRANSACTION",
    condition: {
      and: [
        { field: "iban_age_hours", less_than: 48 },
        { field: "amount", greater_than: 25000 },
      ],
    },
    weight: 15,
    priority: 11,
    active: true,
  },
  {
    id: "tx_tunnel_code",
    name: "KRITISCHER_TUNNELCODE",
    description: "Kritische Tunnelcodes",
    entityType: "TRANSACTION",
    category: "TRANSACTION",
    condition: { field: "tunnel_codes", contains_any: ["C/D", "D", "E"] },
    weight: 15,
    priority: 8,
    active: true,
  },
  {
    id: "tx_adr_expired",
    name: "ADR_ABGELAUFEN",
    description: "ADR-Zertifizierung abgelaufen",
    entityType: "TRANSACTION",
    category: "DOCUMENT",
    condition: { field: "adr_expired", equals: true },
    weight: 20,
    priority: 15,
    active: true,
  },
  {
    id: "tx_repeat_customer",
    name: "WIEDERKEHRENDER_KUNDE",
    description: "Wiederkehrender Kunde",
    entityType: "TRANSACTION",
    category: "TRANSACTION",
    condition: { field: "repeat_customer", equals: true },
    weight: -10,
    priority: 2,
    active: true,
  },
  {
    id: "tx_escrow",
    name: "ESCROW_AKTIV",
    description: "Escrow-Zahlung aktiv",
    entityType: "TRANSACTION",
    category: "TRANSACTION",
    condition: { field: "has_escrow", equals: true },
    weight: -5,
    priority: 2,
    active: true,
  },
  {
    id: "tx_insurance",
    name: "VERSICHERUNG_AKTIV",
    description: "Transportversicherung aktiv",
    entityType: "TRANSACTION",
    category: "TRANSACTION",
    condition: { field: "has_insurance", equals: true },
    weight: -5,
    priority: 2,
    active: true,
  },
];

// ============================================
// CORE FUNCTIONS
// ============================================

function getRulesForEntityType(entityType: RiskEntityType): RiskRule[] {
  const defaultRules = DEFAULT_RULES.filter((r) => r.entityType === entityType && r.active);
  const customRulesList = Array.from(customRules.values()).filter(
    (r) => r.entityType === entityType && r.active
  );
  return [...defaultRules, ...customRulesList].sort((a, b) => b.priority - a.priority);
}

function evaluateCondition(condition: RiskCondition, context: RiskContext): boolean {
  // Handle AND
  if (condition.and) {
    return condition.and.every((c) => evaluateCondition(c, context));
  }

  // Handle OR
  if (condition.or) {
    return condition.or.some((c) => evaluateCondition(c, context));
  }

  const fieldValue = context[condition.field];

  if (fieldValue === undefined || fieldValue === null) {
    return false;
  }

  if (condition.equals !== undefined) {
    return fieldValue === condition.equals;
  }
  if (condition.not_equals !== undefined) {
    return fieldValue !== condition.not_equals;
  }
  if (condition.greater_than !== undefined && typeof fieldValue === "number") {
    return fieldValue > condition.greater_than;
  }
  if (condition.less_than !== undefined && typeof fieldValue === "number") {
    return fieldValue < condition.less_than;
  }
  if (condition.greater_than_or_equal !== undefined && typeof fieldValue === "number") {
    return fieldValue >= condition.greater_than_or_equal;
  }
  if (condition.less_than_or_equal !== undefined && typeof fieldValue === "number") {
    return fieldValue <= condition.less_than_or_equal;
  }
  if (condition.contains_any !== undefined && Array.isArray(fieldValue)) {
    return condition.contains_any.some((item) => fieldValue.includes(item as never));
  }

  return false;
}

function determineLevel(score: number): RiskLevel {
  if (score <= RISK_THRESHOLDS.GREEN.max) return "GREEN";
  if (score <= RISK_THRESHOLDS.YELLOW.max) return "YELLOW";
  return "RED";
}

function getRecommendation(level: RiskLevel): "ALLOW" | "ALLOW_WITH_MITIGATION" | "BLOCK" {
  return RISK_THRESHOLDS[level].recommendation;
}

function getStorageKey(entityType: RiskEntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

// ============================================
// MAIN EVALUATION FUNCTION
// ============================================

function evaluateRisk(
  entityType: RiskEntityType,
  entityId: string,
  context: RiskContext
): RiskEvaluationResult {
  const rules = getRulesForEntityType(entityType);
  const triggeredRules: string[] = [];
  let score = 0;

  for (const rule of rules) {
    if (evaluateCondition(rule.condition, context)) {
      score += rule.weight;
      triggeredRules.push(rule.id);

      // Save event
      const event: RiskEventRecord = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        entityType,
        entityId,
        ruleId: rule.id,
        ruleName: rule.name,
        weight: rule.weight,
        timestamp: new Date(),
        metadata: { context },
      };
      riskEvents.push(event);
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));
  const level = determineLevel(score);

  // Update stored score
  const key = getStorageKey(entityType, entityId);
  const oldRecord = riskScores.get(key);
  const oldScore = oldRecord?.score || 0;
  const oldLevel = oldRecord?.level || "GREEN";

  riskScores.set(key, {
    entityType,
    entityId,
    score,
    level,
    lastUpdated: new Date(),
  });

  // Save history if changed
  if (score !== oldScore) {
    riskHistory.push({
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entityType,
      entityId,
      oldScore,
      newScore: score,
      scoreChange: score - oldScore,
      oldLevel,
      newLevel: level,
      triggeredRules,
      timestamp: new Date(),
    });
  }

  return {
    score,
    level,
    triggeredRules,
    recommendation: getRecommendation(level),
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
    // POST /risk/evaluate
    if (path === "/risk/evaluate" && method === "POST") {
      const body = await request.json();
      const { entityType, entityId, context } = body;

      if (!entityType || !entityId) {
        return Response.json(
          { error: "entityType und entityId erforderlich" },
          { status: 400, headers: corsHeaders }
        );
      }

      const result = evaluateRisk(entityType as RiskEntityType, entityId, context || {});
      return Response.json({ success: true, data: result }, { headers: corsHeaders });
    }

    // GET /risk/score/:entityType/:entityId
    const scoreMatch = path.match(/^\/risk\/score\/(USER|COMPANY|TRANSACTION)\/(.+)$/);
    if (scoreMatch && method === "GET") {
      const entityType = scoreMatch[1] as RiskEntityType;
      const entityId = scoreMatch[2];
      const key = getStorageKey(entityType, entityId);
      const record = riskScores.get(key);

      if (!record) {
        return Response.json(
          { success: true, data: null, message: "Kein Score gefunden" },
          { headers: corsHeaders }
        );
      }

      return Response.json({ success: true, data: record }, { headers: corsHeaders });
    }

    // GET /risk/history/:entityType/:entityId
    const historyMatch = path.match(/^\/risk\/history\/(USER|COMPANY|TRANSACTION)\/(.+)$/);
    if (historyMatch && method === "GET") {
      const entityType = historyMatch[1] as RiskEntityType;
      const entityId = historyMatch[2];
      const limit = parseInt(url.searchParams.get("limit") || "10", 10);

      const history = riskHistory
        .filter((h) => h.entityType === entityType && h.entityId === entityId)
        .slice(-limit)
        .reverse();

      return Response.json({ success: true, data: history }, { headers: corsHeaders });
    }

    // GET /risk/rules
    if (path === "/risk/rules" && method === "GET") {
      const entityType = url.searchParams.get("entityType") as RiskEntityType | null;
      let rules = [...DEFAULT_RULES, ...Array.from(customRules.values())];
      if (entityType) {
        rules = rules.filter((r) => r.entityType === entityType);
      }
      return Response.json({ success: true, data: rules }, { headers: corsHeaders });
    }

    // POST /risk/rules
    if (path === "/risk/rules" && method === "POST") {
      const body = await request.json();
      const { id, name, description, entityType, category, condition, weight, priority = 0 } = body;

      if (!id || !name || !entityType || !condition || weight === undefined) {
        return Response.json(
          { error: "id, name, entityType, condition und weight erforderlich" },
          { status: 400, headers: corsHeaders }
        );
      }

      if (DEFAULT_RULES.some((r) => r.id === id) || customRules.has(id)) {
        return Response.json({ error: "Regel existiert bereits" }, { status: 400, headers: corsHeaders });
      }

      const rule: RiskRule = {
        id,
        name,
        description: description || "",
        entityType,
        category: category || "CUSTOM",
        condition,
        weight,
        priority,
        active: true,
      };

      customRules.set(id, rule);
      return Response.json({ success: true, data: rule }, { headers: corsHeaders });
    }

    // PUT /risk/rules/:id
    const ruleUpdateMatch = path.match(/^\/risk\/rules\/(.+)$/);
    if (ruleUpdateMatch && method === "PUT") {
      const ruleId = ruleUpdateMatch[1];
      const body = await request.json();

      // Can only update custom rules
      const rule = customRules.get(ruleId);
      if (!rule) {
        return Response.json({ error: "Regel nicht gefunden oder ist System-Regel" }, { status: 404, headers: corsHeaders });
      }

      const updated = {
        ...rule,
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.condition !== undefined && { condition: body.condition }),
        ...(body.weight !== undefined && { weight: body.weight }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.active !== undefined && { active: body.active }),
      };

      customRules.set(ruleId, updated);
      return Response.json({ success: true, data: updated }, { headers: corsHeaders });
    }

    // DELETE /risk/rules/:id
    if (ruleUpdateMatch && method === "DELETE") {
      const ruleId = ruleUpdateMatch[1];
      const rule = customRules.get(ruleId);
      if (!rule) {
        return Response.json({ error: "Regel nicht gefunden oder ist System-Regel" }, { status: 404, headers: corsHeaders });
      }
      customRules.delete(ruleId);
      return Response.json({ success: true, message: "Regel gelöscht" }, { headers: corsHeaders });
    }

    // GET /risk/events (recent events)
    if (path === "/risk/events" && method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "100", 10);
      const events = riskEvents.slice(-limit).reverse();
      return Response.json({ success: true, data: events }, { headers: corsHeaders });
    }

    // GET /risk/stats (dashboard stats)
    if (path === "/risk/stats" && method === "GET") {
      const allScores = Array.from(riskScores.values());
      const stats = {
        total: allScores.length,
        byLevel: {
          green: allScores.filter((s) => s.level === "GREEN").length,
          yellow: allScores.filter((s) => s.level === "YELLOW").length,
          red: allScores.filter((s) => s.level === "RED").length,
        },
        byType: {
          user: allScores.filter((s) => s.entityType === "USER").length,
          company: allScores.filter((s) => s.entityType === "COMPANY").length,
          transaction: allScores.filter((s) => s.entityType === "TRANSACTION").length,
        },
        recentEvents: riskEvents.slice(-10).reverse(),
      };
      return Response.json({ success: true, data: stats }, { headers: corsHeaders });
    }

    // Health check
    if (path === "/health") {
      return Response.json({ status: "ok", service: "risk-engine", port: 3003 }, { headers: corsHeaders });
    }

    return Response.json({ error: "Not Found" }, { status: 404, headers: corsHeaders });
  } catch (error) {
    console.error("Risk Engine Error:", error);
    return Response.json(
      { error: "Internal Server Error", message: String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ============================================
// START SERVER
// ============================================

const PORT = 3003;

console.log(`
╔══════════════════════════════════════════════════════════╗
║       CARGOBIT RISK ENGINE MICROSERVICE                  ║
║       Port: ${PORT}                                         ║
╠══════════════════════════════════════════════════════════╣
║  Endpoints:                                              ║
║  • POST /risk/evaluate       - Berechne Risk Score       ║
║  • GET  /risk/score/:type/:id - Hole aktuellen Score     ║
║  • GET  /risk/history/:type/:id - Hole Historie          ║
║  • GET  /risk/rules          - Hole alle Regeln          ║
║  • POST /risk/rules          - Erstelle neue Regel       ║
║  • GET  /risk/events         - Letzte Events             ║
║  • GET  /risk/stats          - Dashboard Statistiken     ║
╚══════════════════════════════════════════════════════════╝
`);

serve({
  port: PORT,
  fetch: handleRequest,
});
