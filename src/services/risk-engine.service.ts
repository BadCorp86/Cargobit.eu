// ============================================
// CARGOBIT RISK ENGINE SERVICE
// Rule-based Risk Scoring with Database Persistence
// Version: 2.0
// ============================================

import { db } from '@/lib/db';
import riskRulesConfig from '@/schemas/risk-rules.json';

// ============================================
// TYPES & INTERFACES
// ============================================

export type RiskEntityType = 'USER' | 'COMPANY' | 'TRANSACTION';
export type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';

export interface RiskCondition {
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

export interface RiskRuleDefinition {
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

export interface RiskContext {
  // User context
  userId?: string;
  kyc_status?: 'missing' | 'pending' | 'approved';
  kyc_level?: 'basic' | 'standard' | 'enhanced';
  account_age_days?: number;
  iban_age_hours?: number;
  failed_logins_7d?: number;
  distinct_countries_30d?: number;
  cancellation_rate?: number;
  rating_avg?: number;
  rating_count?: number;
  completed_transports?: number;
  active_security_flags?: number;
  critical_security_flags?: number;
  fraud_flag_days?: number;

  // Company context
  companyId?: string;
  kyb_status?: 'missing' | 'pending' | 'approved';
  company_age_days?: number;
  company_age_years?: number;
  fraud_flags?: number;
  open_fraud_tickets?: number;
  damage_rate?: number;
  damage_count?: number;
  total_transports?: number;
  vat_verified?: boolean;

  // Transaction context
  transactionId?: string;
  amount?: number;
  currency?: string;
  international?: boolean;
  hazmat?: boolean;
  has_escrow?: boolean;
  has_insurance?: boolean;
  tunnel_codes?: string[];
  adr_expired?: boolean;
  license_expired?: boolean;
  driver_experience_years?: number;
  repeat_customer?: boolean;
  partner_verified?: boolean;

  // Metadata
  ipAddress?: string;
  userAgent?: string;
}

export interface RiskEvaluationResult {
  score: number;
  level: RiskLevel;
  recommendation: 'ALLOW' | 'ALLOW_WITH_MITIGATIONS' | 'BLOCK';
  triggeredRules: TriggeredRule[];
  mitigations: string[];
  metadata: {
    userScore?: number;
    companyScore?: number;
    transactionScore?: number;
    weights: { user: number; company: number; transaction: number };
  };
}

export interface TriggeredRule {
  id: string;
  name: string;
  description: string;
  weight: number;
  category: string;
}

// ============================================
// RISK ENGINE CLASS
// ============================================

export class RiskEngine {
  private config: typeof riskRulesConfig;
  private thresholds: typeof riskRulesConfig.riskThresholds;
  private weights: typeof riskRulesConfig.scoreWeights;

  constructor() {
    this.config = riskRulesConfig;
    this.thresholds = riskRulesConfig.riskThresholds;
    this.weights = riskRulesConfig.scoreWeights;
  }

  // ============================================
  // MAIN EVALUATION METHODS
  // ============================================

  /**
   * Evaluate risk for a user
   */
  async evaluateUserRisk(userId: string, context?: Partial<RiskContext>): Promise<RiskEvaluationResult> {
    // Get user data from database
    const userContext = await this.buildUserContext(userId, context);
    const rules = this.getUserRules();

    const triggeredRules = this.evaluateRules(rules, userContext);
    const score = this.calculateScore(triggeredRules);
    const level = this.determineLevel(score);

    // Persist to database
    await this.persistRiskScore('USER', userId, score, level, triggeredRules);

    return {
      score,
      level,
      recommendation: this.getRecommendation(level),
      triggeredRules,
      mitigations: this.getMitigations(level),
      metadata: {
        weights: this.weights as { user: number; company: number; transaction: number },
      },
    };
  }

  /**
   * Evaluate risk for a company
   */
  async evaluateCompanyRisk(companyId: string, context?: Partial<RiskContext>): Promise<RiskEvaluationResult> {
    const companyContext = await this.buildCompanyContext(companyId, context);
    const rules = this.getCompanyRules();

    const triggeredRules = this.evaluateRules(rules, companyContext);
    const score = this.calculateScore(triggeredRules);
    const level = this.determineLevel(score);

    await this.persistRiskScore('COMPANY', companyId, score, level, triggeredRules);

    return {
      score,
      level,
      recommendation: this.getRecommendation(level),
      triggeredRules,
      mitigations: this.getMitigations(level),
      metadata: {
        weights: this.weights as { user: number; company: number; transaction: number },
      },
    };
  }

  /**
   * Evaluate risk for a transaction
   */
  async evaluateTransactionRisk(
    transactionId: string,
    context: Partial<RiskContext>
  ): Promise<RiskEvaluationResult> {
    const rules = this.getTransactionRules();
    const triggeredRules = this.evaluateRules(rules, context);
    const score = this.calculateScore(triggeredRules);
    const level = this.determineLevel(score);

    await this.persistRiskScore('TRANSACTION', transactionId, score, level, triggeredRules);

    return {
      score,
      level,
      recommendation: this.getRecommendation(level),
      triggeredRules,
      mitigations: this.getMitigations(level),
      metadata: {
        weights: this.weights as { user: number; company: number; transaction: number },
      },
    };
  }

  /**
   * Combined risk evaluation (User + Company + Transaction)
   */
  async evaluateCombinedRisk(
    userId: string,
    companyId: string | null,
    transactionContext: Partial<RiskContext>
  ): Promise<RiskEvaluationResult> {
    // Evaluate individual scores
    const userResult = await this.evaluateUserRisk(userId);
    const companyResult = companyId ? await this.evaluateCompanyRisk(companyId) : null;
    const transactionResult = await this.evaluateTransactionRisk(
      transactionContext.transactionId || 'temp',
      transactionContext
    );

    // Calculate weighted combined score
    let combinedScore = userResult.score * this.weights.user +
                        transactionResult.score * this.weights.transaction;

    if (companyResult) {
      combinedScore += companyResult.score * this.weights.company;
    } else {
      // Redistribute company weight if no company
      combinedScore = userResult.score * (this.weights.user + this.weights.company * 0.5) +
                      transactionResult.score * (this.weights.transaction + this.weights.company * 0.5);
    }

    combinedScore = Math.max(0, Math.min(100, combinedScore));
    const level = this.determineLevel(combinedScore);

    // Combine all triggered rules
    const allTriggeredRules = [
      ...userResult.triggeredRules.map(r => ({ ...r, category: `USER_${r.category}` })),
      ...(companyResult?.triggeredRules || []).map(r => ({ ...r, category: `COMPANY_${r.category}` })),
      ...transactionResult.triggeredRules.map(r => ({ ...r, category: `TX_${r.category}` })),
    ];

    return {
      score: combinedScore,
      level,
      recommendation: this.getRecommendation(level),
      triggeredRules: allTriggeredRules,
      mitigations: this.getMitigations(level),
      metadata: {
        userScore: userResult.score,
        companyScore: companyResult?.score,
        transactionScore: transactionResult.score,
        weights: this.weights as { user: number; company: number; transaction: number },
      },
    };
  }

  // ============================================
  // RULE EVALUATION
  // ============================================

  private evaluateRules(rules: RiskRuleDefinition[], context: Partial<RiskContext>): TriggeredRule[] {
    const triggered: TriggeredRule[] = [];

    // Sort by priority (higher first)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (!rule.active) continue;

      if (this.evaluateCondition(rule.condition, context)) {
        triggered.push({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          weight: rule.weight,
          category: rule.category,
        });
      }
    }

    return triggered;
  }

  private evaluateCondition(condition: RiskCondition, context: Partial<RiskContext>): boolean {
    // Handle AND conditions
    if (condition.and) {
      return condition.and.every(c => this.evaluateCondition(c, context));
    }

    // Handle OR conditions
    if (condition.or) {
      return condition.or.some(c => this.evaluateCondition(c, context));
    }

    // Get field value from context
    const fieldValue = context[condition.field as keyof RiskContext];

    // Handle undefined/null
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    // Evaluate simple conditions
    if (condition.equals !== undefined) {
      return fieldValue === condition.equals;
    }

    if (condition.not_equals !== undefined) {
      return fieldValue !== condition.not_equals;
    }

    if (condition.greater_than !== undefined && typeof fieldValue === 'number') {
      return fieldValue > condition.greater_than;
    }

    if (condition.less_than !== undefined && typeof fieldValue === 'number') {
      return fieldValue < condition.less_than;
    }

    if (condition.greater_than_or_equal !== undefined && typeof fieldValue === 'number') {
      return fieldValue >= condition.greater_than_or_equal;
    }

    if (condition.less_than_or_equal !== undefined && typeof fieldValue === 'number') {
      return fieldValue <= condition.less_than_or_equal;
    }

    if (condition.contains_any !== undefined && Array.isArray(fieldValue)) {
      return condition.contains_any.some(item => fieldValue.includes(item as never));
    }

    return false;
  }

  // ============================================
  // SCORE CALCULATION
  // ============================================

  private calculateScore(triggeredRules: TriggeredRule[]): number {
    let score = 0;

    for (const rule of triggeredRules) {
      score += rule.weight;
    }

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
  }

  private determineLevel(score: number): RiskLevel {
    if (score <= this.thresholds.green.max) return 'GREEN';
    if (score <= this.thresholds.yellow.max) return 'YELLOW';
    return 'RED';
  }

  private getRecommendation(level: RiskLevel): 'ALLOW' | 'ALLOW_WITH_MITIGATIONS' | 'BLOCK' {
    switch (level) {
      case 'GREEN':
        return 'ALLOW';
      case 'YELLOW':
        return 'ALLOW_WITH_MITIGATIONS';
      case 'RED':
        return 'BLOCK';
    }
  }

  private getMitigations(level: RiskLevel): string[] {
    return this.thresholds[level.toLowerCase() as keyof typeof this.thresholds]?.mitigations || [];
  }

  // ============================================
  // RULE GETTERS
  // ============================================

  private getUserRules(): RiskRuleDefinition[] {
    return this.config.userRiskRules as RiskRuleDefinition[];
  }

  private getCompanyRules(): RiskRuleDefinition[] {
    return this.config.companyRiskRules as RiskRuleDefinition[];
  }

  private getTransactionRules(): RiskRuleDefinition[] {
    return this.config.transactionRiskRules as RiskRuleDefinition[];
  }

  // ============================================
  // CONTEXT BUILDERS
  // ============================================

  private async buildUserContext(userId: string, additionalContext?: Partial<RiskContext>): Promise<RiskContext> {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        verifications: true,
        securityFlags: { where: { active: true } },
        roles: { include: { role: true } },
      },
    });

    if (!user) {
      return { userId };
    }

    // Calculate derived fields
    const accountAgeDays = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));

    const kycVerification = user.verifications.find(v => v.type === 'KYC');
    let kycStatus: 'missing' | 'pending' | 'approved' = 'missing';
    if (kycVerification) {
      kycStatus = kycVerification.status === 'APPROVED' ? 'approved' : 'pending';
    }

    const criticalFlags = user.securityFlags.filter(f => f.severity === 'CRITICAL').length;
    const activeFlags = user.securityFlags.length;

    // Get driver stats if applicable
    const driver = await db.driver.findUnique({
      where: { userId },
      select: {
        ratingAvg: true,
        ratingCount: true,
        completedTransports: true,
        cancelledTransports: true,
      },
    });

    let ratingAvg = 0;
    let ratingCount = 0;
    let completedTransports = 0;
    let cancellationRate = 0;

    if (driver) {
      ratingAvg = driver.ratingAvg;
      ratingCount = driver.ratingCount;
      completedTransports = driver.completedTransports;
      const total = driver.completedTransports + driver.cancelledTransports;
      cancellationRate = total > 0 ? driver.cancelledTransports / total : 0;
    }

    return {
      userId,
      kyc_status: kycStatus,
      account_age_days: accountAgeDays,
      active_security_flags: activeFlags,
      critical_security_flags: criticalFlags,
      rating_avg: ratingAvg,
      rating_count: ratingCount,
      completed_transports: completedTransports,
      cancellation_rate: cancellationRate,
      ...additionalContext,
    };
  }

  private async buildCompanyContext(companyId: string, additionalContext?: Partial<RiskContext>): Promise<RiskContext> {
    const company = await db.company.findUnique({
      where: { id: companyId },
      include: {
        drivers: {
          select: {
            damageCount: true,
            completedTransports: true,
          },
        },
      },
    });

    if (!company) {
      return { companyId };
    }

    const companyAgeDays = Math.floor((Date.now() - company.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const companyAgeYears = companyAgeDays / 365;

    // Check KYB
    const kybVerification = await db.verification.findFirst({
      where: { type: 'KYB' },
    });

    let kybStatus: 'missing' | 'pending' | 'approved' = 'missing';
    if (kybVerification) {
      kybStatus = kybVerification.status === 'APPROVED' ? 'approved' : 'pending';
    }

    // Calculate damage rate
    const totalTransports = company.drivers.reduce((sum, d) => sum + d.completedTransports, 0);
    const totalDamages = company.drivers.reduce((sum, d) => sum + d.damageCount, 0);
    const damageRate = totalTransports > 0 ? totalDamages / totalTransports : 0;

    // Check for fraud tickets
    const openFraudTickets = await db.supportTicket.count({
      where: {
        category: 'FRAUD',
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });

    return {
      companyId,
      kyb_status: kybStatus,
      company_age_days: companyAgeDays,
      company_age_years: companyAgeYears,
      damage_rate: damageRate,
      damage_count: totalDamages,
      total_transports: totalTransports,
      open_fraud_tickets: openFraudTickets,
      vat_verified: !!company.vatNumber,
      ...additionalContext,
    };
  }

  // ============================================
  // DATABASE PERSISTENCE
  // ============================================

  private async persistRiskScore(
    entityType: RiskEntityType,
    entityId: string,
    score: number,
    level: RiskLevel,
    triggeredRules: TriggeredRule[]
  ): Promise<void> {
    try {
      // Upsert risk score
      const existingScore = await db.riskScore.findUnique({
        where: {
          entityType_entityId: {
            entityType,
            entityId,
          },
        },
      });

      const oldScore = existingScore?.score || 0;
      const oldLevel = existingScore?.riskLevel || 'GREEN';

      // Create or update risk score
      const riskScore = await db.riskScore.upsert({
        where: {
          entityType_entityId: {
            entityType,
            entityId,
          },
        },
        create: {
          entityType,
          entityId,
          score,
          riskLevel: level,
          factorsCount: triggeredRules.length,
          lastEventAt: new Date(),
        },
        update: {
          score,
          riskLevel: level,
          factorsCount: triggeredRules.length,
          lastEventAt: new Date(),
        },
      });

      // Create risk events for each triggered rule
      for (const rule of triggeredRules) {
        await db.riskEvent.create({
          data: {
            entityType,
            entityId,
            ruleName: rule.id,
            ruleCategory: rule.category,
            weight: rule.weight,
            riskScoreId: riskScore.id,
          },
        });
      }

      // Create history entry if score changed
      if (score !== oldScore) {
        await db.riskHistory.create({
          data: {
            entityType,
            entityId,
            oldScore,
            newScore: score,
            scoreChange: score - oldScore,
            oldLevel,
            newLevel: level,
            reason: `${triggeredRules.length} Regel(n) ausgelöst`,
            riskScoreId: riskScore.id,
          },
        });
      }
    } catch (error) {
      console.error('Failed to persist risk score:', error);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get current risk score for an entity
   */
  async getRiskScore(entityType: RiskEntityType, entityId: string): Promise<{
    score: number;
    level: RiskLevel;
    lastUpdated: Date;
  } | null> {
    const riskScore = await db.riskScore.findUnique({
      where: {
        entityType_entityId: {
          entityType,
          entityId,
        },
      },
    });

    if (!riskScore) return null;

    return {
      score: riskScore.score,
      level: riskScore.riskLevel,
      lastUpdated: riskScore.updatedAt,
    };
  }

  /**
   * Get risk history for an entity
   */
  async getRiskHistory(
    entityType: RiskEntityType,
    entityId: string,
    limit: number = 10
  ): Promise<Array<{
    oldScore: number;
    newScore: number;
    scoreChange: number;
    oldLevel: string;
    newLevel: string;
    reason: string | null;
    createdAt: Date;
  }>> {
    const history = await db.riskHistory.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return history;
  }

  /**
   * Get all active risk rules from config
   */
  getAllActiveRules(): { user: RiskRuleDefinition[]; company: RiskRuleDefinition[]; transaction: RiskRuleDefinition[] } {
    return {
      user: this.getUserRules().filter(r => r.active),
      company: this.getCompanyRules().filter(r => r.active),
      transaction: this.getTransactionRules().filter(r => r.active),
    };
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const riskEngine = new RiskEngine();

// ============================================
// EXPORTS
// ============================================

export type {
  RiskContext,
  RiskEvaluationResult,
  TriggeredRule,
  RiskRuleDefinition,
  RiskCondition,
};
