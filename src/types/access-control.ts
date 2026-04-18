// ============================================
// CARGOBIT ACCESS CONTROL MATRIX
// RBAC + ABAC Hybrid Permission System
// ============================================

// ============================================
// ROLE DEFINITIONS (as per User Spec)
// ============================================

export type DomainRole = 
  | 'SHIPPER'      // Auftraggeber
  | 'CARRIER'      // Transporteur
  | 'ADMIN'        // System-Administrator
  | 'SUPPORT'      // Support-Mitarbeiter
  | 'SYSTEM';      // Interne Services (Service Accounts)

export type ActorType = 'user' | 'system';

// ============================================
// DOMAIN RESOURCES
// ============================================

export type ResourceDomain = 
  | 'orders_pricing'
  | 'bidding_matching'
  | 'execution';

// type Action = string; // Actions are defined per domain

// ============================================
// ORDERS & PRICING DOMAIN ACTIONS
// ============================================

export interface OrdersPricingAction {
  action: 
    | 'ORDER_CREATE'           // POST /orders
    | 'ORDER_READ_OWN'         // Eigene Orders lesen
    | 'ORDER_READ_OTHER'       // Fremde Orders lesen
    | 'PRICING_CONTEXT_READ'   // Pricing-Kontext für eigene Order
    | 'PRICING_CONFIG_READ'    // Pricing-Config lesen
    | 'PRICING_CONFIG_WRITE';  // Pricing-Config ändern
  
  /** Who can perform this action */
  allowed: {
    shipper: boolean;
    carrier: boolean;
    admin: boolean;
    support: boolean;
    system: boolean;
  };
  
  /** Additional ABAC conditions */
  abacCondition?: ABACCondition;
}

export const ORDERS_PRICING_MATRIX: OrdersPricingAction[] = [
  {
    action: 'ORDER_CREATE',
    allowed: { shipper: true, carrier: false, admin: true, support: false, system: true },
  },
  {
    action: 'ORDER_READ_OWN',
    allowed: { shipper: true, carrier: false, admin: true, support: true, system: true },
    abacCondition: {
      type: 'OWNERSHIP',
      attribute: 'shipperId',
      description: 'shipperId == subjectId',
    },
  },
  {
    action: 'ORDER_READ_OTHER',
    allowed: { shipper: false, carrier: false, admin: true, support: true, system: true },
  },
  {
    action: 'PRICING_CONTEXT_READ',
    allowed: { shipper: true, carrier: false, admin: true, support: true, system: true },
    abacCondition: {
      type: 'OWNERSHIP',
      attribute: 'order.shipperId',
      description: 'order.shipperId == subjectId',
    },
  },
  {
    action: 'PRICING_CONFIG_READ',
    allowed: { shipper: false, carrier: false, admin: true, support: true, system: true },
  },
  {
    action: 'PRICING_CONFIG_WRITE',
    allowed: { shipper: false, carrier: false, admin: true, support: false, system: true },
  },
];

// ============================================
// BIDDING & MATCHING DOMAIN ACTIONS
// ============================================

export interface BiddingMatchingAction {
  action:
    | 'BID_CREATE'             // POST /bids
    | 'BID_READ_OWN'           // Eigene Bids lesen
    | 'BIDS_READ_AGGREGATED'   // Aggregierte Bids zu Order (anonym)
    | 'MATCHING_RESULT_READ';  // Matching-Ergebnis lesen
  
  allowed: {
    shipper: boolean;
    carrier: boolean;
    admin: boolean;
    support: boolean;
    system: boolean;
  };
  
  abacCondition?: ABACCondition;
}

export const BIDDING_MATCHING_MATRIX: BiddingMatchingAction[] = [
  {
    action: 'BID_CREATE',
    allowed: { shipper: false, carrier: true, admin: true, support: false, system: true },
  },
  {
    action: 'BID_READ_OWN',
    allowed: { shipper: false, carrier: true, admin: true, support: true, system: true },
    abacCondition: {
      type: 'OWNERSHIP',
      attribute: 'carrierId',
      description: 'carrierId == subjectId',
    },
  },
  {
    action: 'BIDS_READ_AGGREGATED',
    allowed: { shipper: true, carrier: false, admin: true, support: true, system: true },
    description: 'Carrier-Identitäten anonymisiert',
  },
  {
    action: 'MATCHING_RESULT_READ',
    allowed: { shipper: true, carrier: true, admin: true, support: true, system: true },
    abacCondition: {
      type: 'CONDITIONAL',
      attribute: 'matchingResult.winnerId',
      description: 'Carrier nur, wenn carrierId == subjectId (d.h. er ist im Ergebnis)',
      carrierCondition: 'carrierId == subjectId',
    },
  },
];

// ============================================
// EXECUTION DOMAIN ACTIONS
// ============================================

export interface ExecutionAction {
  action:
    | 'EXECUTION_READ_OWN'     // Execution lesen (eigene Order)
    | 'EXECUTION_STATUS_UPDATE'// Status updaten
    | 'POD_UPLOAD';            // POD hochladen
  
  allowed: {
    shipper: boolean;
    carrier: boolean;
    admin: boolean;
    support: boolean;
    system: boolean;
  };
  
  abacCondition?: ABACCondition;
}

export const EXECUTION_MATRIX: ExecutionAction[] = [
  {
    action: 'EXECUTION_READ_OWN',
    allowed: { shipper: true, carrier: true, admin: true, support: true, system: true },
    abacCondition: {
      type: 'OWNERSHIP',
      attribute: 'order.shipperId OR execution.carrierId',
      description: 'shipperId == subjectId OR carrierId == subjectId',
    },
  },
  {
    action: 'EXECUTION_STATUS_UPDATE',
    allowed: { shipper: false, carrier: true, admin: true, support: true, system: true },
    abacCondition: {
      type: 'OWNERSHIP',
      attribute: 'execution.carrierId',
      description: 'carrierId == subjectId',
    },
  },
  {
    action: 'POD_UPLOAD',
    allowed: { shipper: false, carrier: true, admin: true, support: true, system: true },
    abacCondition: {
      type: 'OWNERSHIP',
      attribute: 'execution.carrierId',
      description: 'carrierId == subjectId',
    },
  },
];

// ============================================
// ABAC CONDITIONS
// ============================================

export interface ABACCondition {
  type: 'OWNERSHIP' | 'CONDITIONAL' | 'ATTRIBUTE_MATCH' | 'TIME_BASED';
  attribute: string;
  description: string;
  carrierCondition?: string;
  additionalChecks?: string[];
}

// ============================================
// META RULES (ABAC)
// ============================================

export interface ABACRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  appliesTo: DomainRole[];
}

export const ABAC_META_RULES: ABACRule[] = [
  {
    id: 'ABAC_001',
    name: 'Shipper Ownership',
    description: 'Shipper sieht nur Orders, Pricing, Execution, die order.shipperId == subjectId',
    condition: 'resource.shipperId === subject.id',
    appliesTo: ['SHIPPER'],
  },
  {
    id: 'ABAC_002',
    name: 'Carrier Ownership',
    description: 'Carrier sieht nur Bids & Executions, die carrierId == subjectId',
    condition: 'resource.carrierId === subject.id',
    appliesTo: ['CARRIER'],
  },
  {
    id: 'ABAC_003',
    name: 'Support Read-Only',
    description: 'Support: read-only auf fast alles, kein Mutieren von Pricing-Config',
    condition: 'action.type !== "WRITE" && resource !== "pricing_config"',
    appliesTo: ['SUPPORT'],
  },
  {
    id: 'ABAC_004',
    name: 'System Whitelist',
    description: 'System-Rollen (Service-Accounts) sind explizit whitelisted pro Endpoint',
    condition: 'endpoint in subject.whitelistedEndpoints',
    appliesTo: ['SYSTEM'],
  },
];

// ============================================
// PERMISSION CHECK FUNCTIONS
// ============================================

export interface PermissionCheckContext {
  subject: {
    id: string;
    role: DomainRole;
    type: ActorType;
    whitelistedEndpoints?: string[];
  };
  resource: {
    type: string;
    id: string;
    shipperId?: string;
    carrierId?: string;
    [key: string]: unknown;
  };
  action: string;
  domain: ResourceDomain;
}

export interface PermissionDecision {
  allowed: boolean;
  reason?: string;
  matchedRule?: string;
  abacConditionMet?: boolean;
}

/**
 * Check permission against the Access Control Matrix
 */
export function checkPermission(context: PermissionCheckContext): PermissionDecision {
  const { subject, resource, action, domain } = context;
  
  // Get the correct matrix
  let matrix: (OrdersPricingAction | BiddingMatchingAction | ExecutionAction)[] = [];
  switch (domain) {
    case 'orders_pricing':
      matrix = ORDERS_PRICING_MATRIX;
      break;
    case 'bidding_matching':
      matrix = BIDDING_MATCHING_MATRIX;
      break;
    case 'execution':
      matrix = EXECUTION_MATRIX;
      break;
  }
  
  // Find the action in the matrix
  const actionRule = matrix.find(a => a.action === action);
  if (!actionRule) {
    return {
      allowed: false,
      reason: `Action ${action} not found in ${domain} matrix`,
    };
  }
  
  // Check role-based permission
  const roleKey = subject.role.toLowerCase() as keyof typeof actionRule.allowed;
  const isAllowed = actionRule.allowed[roleKey];
  
  if (!isAllowed) {
    return {
      allowed: false,
      reason: `Role ${subject.role} not allowed for action ${action}`,
    };
  }
  
  // Check ABAC conditions if present
  if (actionRule.abacCondition) {
    const abacResult = evaluateABACCondition(subject, resource, actionRule.abacCondition);
    if (!abacResult.met) {
      return {
        allowed: false,
        reason: abacResult.reason,
        abacConditionMet: false,
      };
    }
  }
  
  // Apply meta rules
  const metaRuleResult = applyABACMetaRules(context);
  if (!metaRuleResult.allowed) {
    return metaRuleResult;
  }
  
  return {
    allowed: true,
    matchedRule: `${domain}:${action}`,
    abacConditionMet: true,
  };
}

/**
 * Evaluate ABAC condition
 */
function evaluateABACCondition(
  subject: PermissionCheckContext['subject'],
  resource: PermissionCheckContext['resource'],
  condition: ABACCondition
): { met: boolean; reason?: string } {
  switch (condition.type) {
    case 'OWNERSHIP': {
      // Check if subject owns the resource
      const attributes = condition.attribute.split(' OR ');
      
      for (const attr of attributes) {
        const trimmedAttr = attr.trim();
        
        if (trimmedAttr === 'shipperId' || trimmedAttr === 'order.shipperId') {
          if (resource.shipperId === subject.id) {
            return { met: true };
          }
        }
        
        if (trimmedAttr === 'carrierId' || trimmedAttr === 'execution.carrierId') {
          if (resource.carrierId === subject.id) {
            return { met: true };
          }
        }
      }
      
      return {
        met: false,
        reason: `Ownership condition not met: ${condition.description}`,
      };
    }
    
    case 'CONDITIONAL': {
      // For carriers, check if they're in the result
      if (subject.role === 'CARRIER' && condition.carrierCondition) {
        // Check if carrierId matches subjectId in matching result
        if (resource.carrierId === subject.id || resource.winnerId === subject.id) {
          return { met: true };
        }
        return {
          met: false,
          reason: 'Carrier not in matching result',
        };
      }
      return { met: true };
    }
    
    default:
      return { met: true };
  }
}

/**
 * Apply ABAC meta rules
 */
function applyABACMetaRules(context: PermissionCheckContext): PermissionDecision {
  const { subject, action } = context;
  
  for (const rule of ABAC_META_RULES) {
    if (!rule.appliesTo.includes(subject.role)) continue;
    
    // Apply specific meta rules
    switch (rule.id) {
      case 'ABAC_003': {
        // Support cannot mutate pricing_config
        if (subject.role === 'SUPPORT' && 
            action === 'PRICING_CONFIG_WRITE') {
          return {
            allowed: false,
            reason: 'Support cannot modify pricing config',
            matchedRule: rule.id,
          };
        }
        break;
      }
      
      case 'ABAC_004': {
        // System accounts must be whitelisted
        if (subject.role === 'SYSTEM' && subject.whitelistedEndpoints) {
          const endpoint = `${context.domain}:${action}`;
          if (!subject.whitelistedEndpoints.includes(endpoint)) {
            return {
              allowed: false,
              reason: `System account not whitelisted for ${endpoint}`,
              matchedRule: rule.id,
            };
          }
        }
        break;
      }
    }
  }
  
  return { allowed: true };
}

// ============================================
// COMPILED ACCESS MATRIX (Quick Reference)
// ============================================

export const ACCESS_CONTROL_MATRIX = {
  orders_pricing: {
    matrix: ORDERS_PRICING_MATRIX,
    description: 'Orders & Pricing Domain',
  },
  bidding_matching: {
    matrix: BIDDING_MATCHING_MATRIX,
    description: 'Bidding & Matching Domain',
  },
  execution: {
    matrix: EXECUTION_MATRIX,
    description: 'Execution Domain',
  },
  metaRules: ABAC_META_RULES,
};

// ============================================
// EXPORTS
// ============================================

export type {
  DomainRole,
  ActorType,
  ResourceDomain,
  PermissionCheckContext,
  PermissionDecision,
  ABACCondition,
  ABACRule,
};
