// ============================================
// CARGOBIT RISK SCORING SYSTEM
// Multi-dimensional risk assessment
// ============================================

import { db } from '@/lib/db';

// ============================================
// TYPES & INTERFACES
// ============================================

export type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';

export interface RiskScore {
  score: number;           // 0-100
  level: RiskLevel;
  factors: RiskFactor[];
  recommendation: 'ALLOW' | 'ALLOW_WITH_LOGGING' | 'ALLOW_WITH_DELAY' | 'BLOCK' | 'MANUAL_REVIEW';
}

export interface RiskFactor {
  name: string;
  impact: number;          // Positive = increases risk, Negative = decreases risk
  description: string;
  category: 'USER' | 'COMPANY' | 'TRANSACTION' | 'BEHAVIOR' | 'DOCUMENT';
}

export interface UserRiskContext {
  userId: string;
  kycComplete: boolean;
  kycLevel?: 'basic' | 'standard' | 'enhanced';
  accountAgeDays: number;
  failedLogins7d: number;
  distinctCountries30d: number;
  newIbanHours?: number;
  cancelRate30d: number;
  ratingAvg: number;
  totalTransports: number;
  activeSecurityFlags: number;
  lastFraudFlagDays?: number;
}

export interface CompanyRiskContext {
  companyId: string;
  kybComplete: boolean;
  companyAgeDays: number;
  openFraudTickets: number;
  damageRate: number;
  highValueTransports: number;
  totalVolume: number;
  avgTransportValue: number;
}

export interface TransactionRiskContext {
  transactionType: 'PAYOUT' | 'TRANSPORT_ACCEPT' | 'HIGH_VALUE_TRANSPORT' | 'INTERNATIONAL' | 'HAZMAT';
  amount: number;
  currency: string;
  isNewIban: boolean;
  isInternational: boolean;
  isHazmat: boolean;
  isRecurringPartner: boolean;
  hasEscrow: boolean;
  hasInsurance: boolean;
  tunnelCodes?: string[];
  adrExpired?: boolean;
}

// ============================================
// RISK THRESHOLDS
// ============================================

export const RISK_THRESHOLDS = {
  GREEN: {
    min: 0,
    max: 30,
    level: 'GREEN' as RiskLevel,
    recommendation: 'ALLOW' as const,
  },
  YELLOW: {
    min: 31,
    max: 60,
    level: 'YELLOW' as RiskLevel,
    recommendation: 'ALLOW_WITH_LOGGING' as const,
    delayHours: 24, // For payouts
  },
  RED: {
    min: 61,
    max: 100,
    level: 'RED' as RiskLevel,
    recommendation: 'BLOCK' as const,
    requiresManualReview: true,
  },
};

// ============================================
// USER RISK SCORE FACTORS
// ============================================

export const USER_RISK_FACTORS = {
  // Negative factors (increase risk)
  KYC_INCOMPLETE: { name: 'KYC_UNVOLLSTAENDIG', impact: 20, category: 'USER' as const },
  NEW_IBAN: { name: 'NEUE_IBAN_UNTER_48H', impact: 15, category: 'USER' as const },
  HIGH_CANCEL_RATE: { name: 'VIELE_STORNOS', impact: 10, category: 'BEHAVIOR' as const },
  UNUSUAL_LOGIN_PATTERN: { name: 'UNGEEWOHNLICHE_LOGINS', impact: 10, category: 'BEHAVIOR' as const },
  MULTIPLE_FAILED_LOGINS: { name: 'MEHRERE_FEHLGESCHLAGENE_LOGINS', impact: 8, category: 'BEHAVIOR' as const },
  NEW_ACCOUNT: { name: 'NEUES_KONTO_UNTER_7_TAGEN', impact: 5, category: 'USER' as const },
  ACTIVE_SECURITY_FLAG: { name: 'AKTIVE_SICHERHEITS_FLAG', impact: 25, category: 'DOCUMENT' as const },
  RECENT_FRAUD_FLAG: { name: 'KUERZLICHER_BETRUGSVERDACHT', impact: 30, category: 'BEHAVIOR' as const },
  LOW_RATING: { name: 'NIEDRIGE_BEWERTUNG', impact: 10, category: 'BEHAVIOR' as const },
  MANY_COUNTRY_CHANGES: { name: 'VIELE_LAENDERWECHSEL', impact: 12, category: 'BEHAVIOR' as const },
  
  // Positive factors (decrease risk)
  LONG_HISTORY: { name: 'LANGE_HISTORIE_OHNE_PROBLEME', impact: -10, category: 'USER' as const },
  HIGH_RATING: { name: 'HOHE_DURCHSCHNITTSBEWERTUNG', impact: -10, category: 'BEHAVIOR' as const },
  MANY_COMPLETED_TRANSPORTS: { name: 'VIELE_ABGESCHLOSSENE_TRANSPORTE', impact: -5, category: 'USER' as const },
  ENHANCED_KYC: { name: 'ERWEITERTES_KYC_ABGESCHLOSSEN', impact: -8, category: 'DOCUMENT' as const },
};

// ============================================
// COMPANY RISK SCORE FACTORS
// ============================================

export const COMPANY_RISK_FACTORS = {
  // Negative factors
  KYB_MISSING: { name: 'KYB_FEHLT', impact: 20, category: 'COMPANY' as const },
  OPEN_FRAUD_TICKETS: { name: 'OFFENE_BETRUGS_TICKETS', impact: 15, category: 'COMPANY' as const },
  HIGH_DAMAGE_RATE: { name: 'VIELE_SCHADENSMELDUNGEN', impact: 10, category: 'COMPANY' as const },
  NEW_COMPANY: { name: 'NEUES_UNTERNEHMEN', impact: 8, category: 'COMPANY' as const },
  
  // Positive factors
  LONG_COMPANY_HISTORY: { name: 'LANGJAHRIGE_HISTORIE', impact: -10, category: 'COMPANY' as const },
  HIGH_VOLUME_NO_ISSUES: { name: 'HOHE_VOLUMINA_OHNE_AUFFAELLIGKEITEN', impact: -10, category: 'COMPANY' as const },
};

// ============================================
// TRANSACTION RISK SCORE FACTORS
// ============================================

export const TRANSACTION_RISK_FACTORS = {
  // Negative factors
  HIGH_AMOUNT: { name: 'HOHER_BETRAG', impact: 20, category: 'TRANSACTION' as const },
  NEW_IBAN_HIGH_AMOUNT: { name: 'NEUE_IBAN_HOHER_BETRAG', impact: 15, category: 'TRANSACTION' as const },
  INTERNATIONAL_HAZMAT: { name: 'INTERNATIONAL_GEFAHRGUT', impact: 10, category: 'TRANSACTION' as const },
  CRITICAL_TUNNEL_CODE: { name: 'KRITISCHER_TUNNELCODE', impact: 15, category: 'TRANSACTION' as const },
  ADR_EXPIRED: { name: 'ADR_ABGELAUFEN', impact: 20, category: 'DOCUMENT' as const },
  NO_ESCROW: { name: 'KEIN_ESCROW', impact: 5, category: 'TRANSACTION' as const },
  NO_INSURANCE: { name: 'KEINE_VERSICHERUNG', impact: 5, category: 'TRANSACTION' as const },
  
  // Positive factors
  RECURRING_PARTNER: { name: 'WIEDERKEHRENDER_PARTNER', impact: -10, category: 'TRANSACTION' as const },
  SECURED_PAYMENT: { name: 'ABGESICHERTE_ZAHLUNG', impact: -10, category: 'TRANSACTION' as const },
  HAS_ESCROW: { name: 'ESCROW_AKTIV', impact: -5, category: 'TRANSACTION' as const },
  HAS_INSURANCE: { name: 'VERSICHERUNG_AKTIV', impact: -5, category: 'TRANSACTION' as const },
};

// ============================================
// RISK SCORING FUNCTIONS
// ============================================

export function calculateRiskLevel(score: number): RiskLevel {
  if (score <= 30) return 'GREEN';
  if (score <= 60) return 'YELLOW';
  return 'RED';
}

export function getRiskRecommendation(score: number): RiskScore['recommendation'] {
  if (score <= 30) return 'ALLOW';
  if (score <= 45) return 'ALLOW_WITH_LOGGING';
  if (score <= 60) return 'ALLOW_WITH_DELAY';
  return 'BLOCK';
}

// ============================================
// USER RISK SCORE CALCULATION
// ============================================

export async function calculateUserRiskScore(userId: string): Promise<RiskScore> {
  const factors: RiskFactor[] = [];
  let totalScore = 0;

  // Fetch user data
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      verifications: true,
      securityFlags: { where: { active: true } },
      roles: { include: { role: true } },
    },
  });

  if (!user) {
    return {
      score: 100,
      level: 'RED',
      factors: [{ name: 'USER_NOT_FOUND', impact: 100, description: 'Benutzer nicht gefunden', category: 'USER' }],
      recommendation: 'BLOCK',
    };
  }

  // Check KYC completion
  const kycVerification = user.verifications.find(v => v.type === 'KYC' && v.status === 'APPROVED');
  if (!kycVerification) {
    factors.push({
      ...USER_RISK_FACTORS.KYC_INCOMPLETE,
      description: 'KYC-Verifizierung nicht abgeschlossen',
    });
    totalScore += USER_RISK_FACTORS.KYC_INCOMPLETE.impact;
  } else if (kycVerification.status === 'APPROVED') {
    // Positive factor for enhanced KYC
    factors.push({
      ...USER_RISK_FACTORS.ENHANCED_KYC,
      description: 'KYC erfolgreich verifiziert',
    });
    totalScore += USER_RISK_FACTORS.ENHANCED_KYC_KYC.impact;
  }

  // Check account age
  const accountAgeDays = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  if (accountAgeDays < 7) {
    factors.push({
      ...USER_RISK_FACTORS.NEW_ACCOUNT,
      description: `Konto erst ${accountAgeDays} Tage alt`,
    });
    totalScore += USER_RISK_FACTORS.NEW_ACCOUNT.impact;
  } else if (accountAgeDays > 365) {
    // Positive: Long history
    factors.push({
      ...USER_RISK_FACTORS.LONG_HISTORY,
      description: `Konto seit ${Math.floor(accountAgeDays / 365)} Jahren aktiv`,
    });
    totalScore += USER_RISK_FACTORS.LONG_HISTORY.impact;
  }

  // Check security flags
  const activeFlags = user.securityFlags.filter(f => f.active);
  if (activeFlags.length > 0) {
    factors.push({
      ...USER_RISK_FACTORS.ACTIVE_SECURITY_FLAG,
      description: `${activeFlags.length} aktive Sicherheits-Flag(s)`,
    });
    totalScore += USER_RISK_FACTORS.ACTIVE_SECURITY_FLAG.impact;
  }

  // Check for recent fraud flags
  const recentFraudFlag = activeFlags.find(f => 
    f.type === 'FRAUD_SUSPECTED' && 
    f.createdAt > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  );
  if (recentFraudFlag) {
    factors.push({
      ...USER_RISK_FACTORS.RECENT_FRAUD_FLAG,
      description: 'Kürzlicher Betrugsverdacht',
    });
    totalScore += USER_RISK_FACTORS.RECENT_FRAUD_FLAG.impact;
  }

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

  if (driver) {
    // Rating check
    if (driver.ratingAvg >= 4.5 && driver.ratingCount >= 10) {
      factors.push({
        ...USER_RISK_FACTORS.HIGH_RATING,
        description: `Hohe Bewertung: ${driver.ratingAvg.toFixed(1)}/5.0`,
      });
      totalScore += USER_RISK_FACTORS.HIGH_RATING.impact;
    } else if (driver.ratingAvg < 3.0 && driver.ratingCount >= 5) {
      factors.push({
        ...USER_RISK_FACTORS.LOW_RATING,
        description: `Niedrige Bewertung: ${driver.ratingAvg.toFixed(1)}/5.0`,
      });
      totalScore += USER_RISK_FACTORS.LOW_RATING.impact;
    }

    // Cancel rate
    const totalOrders = driver.completedTransports + driver.cancelledTransports;
    if (totalOrders > 0) {
      const cancelRate = driver.cancelledTransports / totalOrders;
      if (cancelRate > 0.2) {
        factors.push({
          ...USER_RISK_FACTORS.HIGH_CANCEL_RATE,
          description: `Stornorate: ${(cancelRate * 100).toFixed(1)}%`,
        });
        totalScore += USER_RISK_FACTORS.HIGH_CANCEL_RATE.impact;
      }
    }

    // Many completed transports (positive)
    if (driver.completedTransports >= 50) {
      factors.push({
        ...USER_RISK_FACTORS.MANY_COMPLETED_TRANSPORTS,
        description: `${driver.completedTransports} erfolgreiche Transporte`,
      });
      totalScore += USER_RISK_FACTORS.MANY_COMPLETED_TRANSPORTS.impact;
    }
  }

  // Clamp score to 0-100
  totalScore = Math.max(0, Math.min(100, totalScore));

  return {
    score: totalScore,
    level: calculateRiskLevel(totalScore),
    factors,
    recommendation: getRiskRecommendation(totalScore),
  };
}

// ============================================
// COMPANY RISK SCORE CALCULATION
// ============================================

export async function calculateCompanyRiskScore(companyId: string): Promise<RiskScore> {
  const factors: RiskFactor[] = [];
  let totalScore = 0;

  const company = await db.company.findUnique({
    where: { id: companyId },
    include: {
      drivers: {
        select: { damageCount: true, completedTransports: true },
      },
      vehicles: { select: { id: true } },
    },
  });

  if (!company) {
    return {
      score: 100,
      level: 'RED',
      factors: [{ name: 'COMPANY_NOT_FOUND', impact: 100, description: 'Unternehmen nicht gefunden', category: 'COMPANY' }],
      recommendation: 'BLOCK',
    };
  }

  // Check KYB
  const kybVerification = await db.verification.findFirst({
    where: {
      type: 'KYB',
      status: 'APPROVED',
    },
  });

  if (!kybVerification) {
    factors.push({
      ...COMPANY_RISK_FACTORS.KYB_MISSING,
      description: 'KYB-Verifizierung fehlt',
    });
    totalScore += COMPANY_RISK_FACTORS.KYB_MISSING.impact;
  }

  // Company age
  const companyAgeDays = Math.floor((Date.now() - company.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  if (companyAgeDays < 30) {
    factors.push({
      ...COMPANY_RISK_FACTORS.NEW_COMPANY,
      description: `Unternehmen erst ${companyAgeDays} Tage alt`,
    });
    totalScore += COMPANY_RISK_FACTORS.NEW_COMPANY.impact;
  } else if (companyAgeDays > 730) { // 2 years
    factors.push({
      ...COMPANY_RISK_FACTORS.LONG_COMPANY_HISTORY,
      description: `Unternehmen seit ${Math.floor(companyAgeDays / 365)} Jahren aktiv`,
    });
    totalScore += COMPANY_RISK_FACTORS.LONG_COMPANY_HISTORY.impact;
  }

  // Check for fraud tickets
  const fraudTickets = await db.supportTicket.count({
    where: {
      category: 'FRAUD',
      status: { in: ['OPEN', 'IN_PROGRESS'] },
    },
  });

  if (fraudTickets > 0) {
    factors.push({
      ...COMPANY_RISK_FACTORS.OPEN_FRAUD_TICKETS,
      description: `${fraudTickets} offene Betrugs-Ticket(s)`,
    });
    totalScore += COMPANY_RISK_FACTORS.OPEN_FRAUD_TICKETS.impact;
  }

  // Damage rate
  const totalDriverTransports = company.drivers.reduce((sum, d) => sum + d.completedTransports, 0);
  const totalDamages = company.drivers.reduce((sum, d) => sum + d.damageCount, 0);
  if (totalDriverTransports > 0) {
    const damageRate = totalDamages / totalDriverTransports;
    if (damageRate > 0.05) {
      factors.push({
        ...COMPANY_RISK_FACTORS.HIGH_DAMAGE_RATE,
        description: `Schadensrate: ${(damageRate * 100).toFixed(1)}%`,
      });
      totalScore += COMPANY_RISK_FACTORS.HIGH_DAMAGE_RATE.impact;
    }
  }

  // High volume without issues (positive)
  if (totalDriverTransports > 100 && totalDamages === 0) {
    factors.push({
      ...COMPANY_RISK_FACTORS.HIGH_VOLUME_NO_ISSUES,
      description: `${totalDriverTransports} Transporte ohne Schäden`,
    });
    totalScore += COMPANY_RISK_FACTORS.HIGH_VOLUME_NO_ISSUES.impact;
  }

  // Clamp score
  totalScore = Math.max(0, Math.min(100, totalScore));

  return {
    score: totalScore,
    level: calculateRiskLevel(totalScore),
    factors,
    recommendation: getRiskRecommendation(totalScore),
  };
}

// ============================================
// TRANSACTION RISK SCORE CALCULATION
// ============================================

export function calculateTransactionRiskScore(context: TransactionRiskContext): RiskScore {
  const factors: RiskFactor[] = [];
  let totalScore = 0;

  // High amount check (configurable threshold)
  const HIGH_VALUE_THRESHOLD = 50000; // 50,000 EUR
  if (context.amount > HIGH_VALUE_THRESHOLD) {
    factors.push({
      ...TRANSACTION_RISK_FACTORS.HIGH_AMOUNT,
      description: `Betrag: ${context.amount.toLocaleString()} ${context.currency}`,
    });
    totalScore += TRANSACTION_RISK_FACTORS.HIGH_AMOUNT.impact;
  }

  // New IBAN + high amount
  if (context.isNewIban && context.amount > HIGH_VALUE_THRESHOLD / 2) {
    factors.push({
      ...TRANSACTION_RISK_FACTORS.NEW_IBAN_HIGH_AMOUNT,
      description: 'Neue IBAN mit hohem Betrag',
    });
    totalScore += TRANSACTION_RISK_FACTORS.NEW_IBAN_HIGH_AMOUNT.impact;
  }

  // International + Hazmat
  if (context.isInternational && context.isHazmat) {
    factors.push({
      ...TRANSACTION_RISK_FACTORS.INTERNATIONAL_HAZMAT,
      description: 'Internationaler Gefahrgut-Transport',
    });
    totalScore += TRANSACTION_RISK_FACTORS.INTERNATIONAL_HAZMAT.impact;
  }

  // ADR expired
  if (context.adrExpired) {
    factors.push({
      ...TRANSACTION_RISK_FACTORS.ADR_EXPIRED,
      description: 'ADR-Zertifizierung abgelaufen',
    });
    totalScore += TRANSACTION_RISK_FACTORS.ADR_EXPIRED.impact;
  }

  // Critical tunnel codes
  const criticalTunnelCodes = ['C/D', 'D', 'E'];
  if (context.tunnelCodes?.some(code => criticalTunnelCodes.includes(code))) {
    factors.push({
      ...TRANSACTION_RISK_FACTORS.CRITICAL_TUNNEL_CODE,
      description: `Kritische Tunnelcodes: ${context.tunnelCodes.join(', ')}`,
    });
    totalScore += TRANSACTION_RISK_FACTORS.CRITICAL_TUNNEL_CODE.impact;
  }

  // Recurring partner (positive)
  if (context.isRecurringPartner) {
    factors.push({
      ...TRANSACTION_RISK_FACTORS.RECURRING_PARTNER,
      description: 'Wiederkehrender Geschäftspartner',
    });
    totalScore += TRANSACTION_RISK_FACTORS.RECURRING_PARTNER.impact;
  }

  // Secured payment (positive)
  if (context.hasEscrow) {
    factors.push({
      ...TRANSACTION_RISK_FACTORS.HAS_ESCROW,
      description: 'Escrow-Zahlung aktiv',
    });
    totalScore += TRANSACTION_RISK_FACTORS.HAS_ESCROW.impact;
  }

  if (context.hasInsurance) {
    factors.push({
      ...TRANSACTION_RISK_FACTORS.HAS_INSURANCE,
      description: 'Transportversicherung aktiv',
    });
    totalScore += TRANSACTION_RISK_FACTORS.HAS_INSURANCE.impact;
  }

  // No escrow/insurance (negative)
  if (!context.hasEscrow && context.amount > 10000) {
    factors.push({
      ...TRANSACTION_RISK_FACTORS.NO_ESCROW,
      description: 'Kein Escrow bei hohem Betrag',
    });
    totalScore += TRANSACTION_RISK_FACTORS.NO_ESCROW.impact;
  }

  // Clamp score
  totalScore = Math.max(0, Math.min(100, totalScore));

  return {
    score: totalScore,
    level: calculateRiskLevel(totalScore),
    factors,
    recommendation: getRiskRecommendation(totalScore),
  };
}

// ============================================
// COMBINED RISK SCORE
// ============================================

export interface CombinedRiskScore extends RiskScore {
  userScore: RiskScore;
  companyScore: RiskScore | null;
  transactionScore: RiskScore;
  weights: {
    user: number;
    company: number;
    transaction: number;
  };
}

export async function calculateCombinedRiskScore(
  userId: string,
  companyId: string | null,
  transactionContext: TransactionRiskContext
): Promise<CombinedRiskScore> {
  // Calculate individual scores
  const userScore = await calculateUserRiskScore(userId);
  const companyScore = companyId ? await calculateCompanyRiskScore(companyId) : null;
  const transactionScore = calculateTransactionRiskScore(transactionContext);

  // Weights
  const weights = {
    user: 0.4,
    company: 0.3,
    transaction: 0.3,
  };

  // Calculate combined score
  let combinedScore = userScore.score * weights.user + transactionScore.score * weights.transaction;
  
  if (companyScore) {
    combinedScore += companyScore.score * weights.company;
  } else {
    // Redistribute company weight to user
    combinedScore = userScore.score * (weights.user + weights.company * 0.5) + 
                   transactionScore.score * (weights.transaction + weights.company * 0.5);
  }

  // Clamp score
  combinedScore = Math.max(0, Math.min(100, combinedScore));

  // Combine all factors
  const allFactors: RiskFactor[] = [
    ...userScore.factors.map(f => ({ ...f, category: 'USER' as const })),
    ...(companyScore?.factors || []).map(f => ({ ...f, category: 'COMPANY' as const })),
    ...transactionScore.factors.map(f => ({ ...f, category: 'TRANSACTION' as const })),
  ];

  return {
    score: combinedScore,
    level: calculateRiskLevel(combinedScore),
    factors: allFactors,
    recommendation: getRiskRecommendation(combinedScore),
    userScore,
    companyScore,
    transactionScore,
    weights,
  };
}

// ============================================
// EXPORTS
// ============================================

export type {
  RiskScore,
  RiskFactor,
  UserRiskContext,
  CompanyRiskContext,
  TransactionRiskContext,
  CombinedRiskScore,
};

export {
  RISK_THRESHOLDS,
  USER_RISK_FACTORS,
  COMPANY_RISK_FACTORS,
  TRANSACTION_RISK_FACTORS,
};
