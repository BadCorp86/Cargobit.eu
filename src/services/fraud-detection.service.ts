// ============================================
// CARGOBIT FRAUD DETECTION SERVICE
// Real-time Anti-Fraud Monitoring
// ============================================

import { db } from '@/lib/db';
import { SecurityFlagSeverity } from '@prisma/client';

// ============================================
// TYPES & INTERFACES
// ============================================

export type FraudCheckType =
  | 'LOGIN_PATTERN'
  | 'TRANSACTION_CHECK'
  | 'GPS_PLAUSIBILITY'
  | 'DOCUMENT_FRAUD'
  | 'VELOCITY_CHECK'
  | 'BEHAVIORAL_ANOMALY'
  | 'ACCOUNT_TAKEOVER'
  | 'COLLUSION_DETECTION';

export interface FraudCheckResult {
  type: FraudCheckType;
  passed: boolean;
  riskScore: number; // 0-100
  flags: FraudFlag[];
  recommendation: 'ALLOW' | 'FLAG' | 'BLOCK' | 'MANUAL_REVIEW';
  details: string;
}

export interface FraudFlag {
  code: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  metadata?: Record<string, unknown>;
}

export interface LoginContext {
  userId: string;
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  city?: string;
}

export interface TransactionContext {
  userId: string;
  type: 'PAYOUT' | 'DEPOSIT' | 'TRANSPORT_PAYMENT' | 'REFUND';
  amount: number;
  currency: string;
  walletId: string;
  targetIban?: string;
  targetWalletId?: string;
  metadata?: Record<string, unknown>;
}

export interface GPSCheckContext {
  transportId: string;
  driverId: string;
  reportedLocation: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  previousLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
}

// ============================================
// FRAUD DETECTION RULES
// ============================================

export const FRAUD_RULES = {
  // Login Pattern Rules
  LOGIN_VELOCITY: {
    name: 'Login Velocity',
    description: 'Erkennt ungewöhnlich viele Login-Versuche',
    thresholds: {
      attemptsPerHour: 10,
      attemptsPerDay: 50,
    },
    severity: 'MEDIUM' as const,
  },
  IMPOSSIBLE_TRAVEL: {
    name: 'Impossible Travel',
    description: 'Erkennt unmögliche geografische Bewegungen',
    maxSpeedKmh: 900, // Max flight speed
    severity: 'HIGH' as const,
  },
  NEW_LOCATION: {
    name: 'New Location',
    description: 'Login von neuem Standort erkannt',
    severity: 'LOW' as const,
  },
  
  // Transaction Rules
  UNUSUAL_AMOUNT: {
    name: 'Unusual Amount',
    description: 'Transaktionsbetrag ungewöhnlich hoch',
    thresholds: {
      multiplier: 3, // 3x average
      absoluteLimit: 10000,
    },
    severity: 'MEDIUM' as const,
  },
  NEW_IBAN: {
    name: 'New IBAN',
    description: 'Auszahlung auf neue IBAN',
    riskPeriodHours: 48,
    severity: 'MEDIUM' as const,
  },
  RAPID_PAYOUT: {
    name: 'Rapid Payout',
    description: 'Schnelle Auszahlung nach Einzahlung',
    minDepositAgeHours: 24,
    severity: 'HIGH' as const,
  },
  
  // GPS Rules
  GPS_SPOOFING: {
    name: 'GPS Spoofing',
    description: 'Verdacht auf GPS-Manipulation',
    severity: 'CRITICAL' as const,
  },
  IMPOSSIBLE_ROUTE: {
    name: 'Impossible Route',
    description: 'Unmögliche Routenzeit',
    severity: 'HIGH' as const,
  },
};

// ============================================
// FRAUD DETECTION SERVICE
// ============================================

export class FraudDetectionService {
  // ============================================
  // LOGIN PATTERN CHECK
  // ============================================

  async checkLoginPattern(context: LoginContext): Promise<FraudCheckResult> {
    const flags: FraudFlag[] = [];
    let riskScore = 0;

    // Get recent login history
    const recentLogins = await this.getRecentLogins(context.userId, 24);
    const olderLogins = await this.getRecentLogins(context.userId, 168); // 7 days

    // Check login velocity
    const hourlyAttempts = recentLogins.filter(l => 
      l.timestamp > new Date(Date.now() - 60 * 60 * 1000)
    ).length;

    if (hourlyAttempts > FRAUD_RULES.LOGIN_VELOCITY.thresholds.attemptsPerHour) {
      flags.push({
        code: 'HIGH_LOGIN_VELOCITY',
        severity: 'MEDIUM',
        description: `${hourlyAttempts} Login-Versuche in der letzten Stunde`,
        metadata: { hourlyAttempts },
      });
      riskScore += 20;
    }

    // Check for impossible travel
    if (context.latitude && context.longitude && olderLogins.length > 0) {
      const lastLogin = olderLogins[0];
      if (lastLogin.latitude && lastLogin.longitude && lastLogin.country) {
        const distanceKm = this.calculateDistance(
          context.latitude, context.longitude,
          lastLogin.latitude, lastLogin.longitude
        );
        
        const timeDiffHours = (Date.now() - lastLogin.timestamp.getTime()) / (1000 * 60 * 60);
        const speedKmh = distanceKm / timeDiffHours;

        if (speedKmh > FRAUD_RULES.IMPOSSIBLE_TRAVEL.maxSpeedKmh && timeDiffHours < 12) {
          flags.push({
            code: 'IMPOSSIBLE_TRAVEL',
            severity: 'HIGH',
            description: `Unmögliche Bewegung: ${distanceKm.toFixed(0)}km in ${timeDiffHours.toFixed(1)}h`,
            metadata: { distanceKm, timeDiffHours, speedKmh },
          });
          riskScore += 40;
        }
      }
    }

    // Check new location/country
    const knownCountries = new Set(olderLogins.map(l => l.country).filter(Boolean));
    if (context.country && !knownCountries.has(context.country)) {
      flags.push({
        code: 'NEW_LOCATION',
        severity: 'LOW',
        description: `Erster Login aus ${context.country}`,
        metadata: { country: context.country },
      });
      riskScore += 10;
    }

    // Check new device
    const knownDevices = new Set(olderLogins.map(l => l.deviceId).filter(Boolean));
    if (context.deviceId && !knownDevices.has(context.deviceId)) {
      flags.push({
        code: 'NEW_DEVICE',
        severity: 'LOW',
        description: 'Login von neuem Gerät',
        metadata: { deviceId: context.deviceId },
      });
      riskScore += 5;
    }

    // Store login attempt
    await this.storeLoginAttempt(context);

    // Determine recommendation
    const recommendation = this.getRecommendation(riskScore, flags);

    return {
      type: 'LOGIN_PATTERN',
      passed: riskScore < 40,
      riskScore,
      flags,
      recommendation,
      details: `${flags.length} Flag(s) erkannt`,
    };
  }

  // ============================================
  // TRANSACTION CHECK
  // ============================================

  async checkTransaction(context: TransactionContext): Promise<FraudCheckResult> {
    const flags: FraudFlag[] = [];
    let riskScore = 0;

    // Get transaction history
    const wallet = await db.wallet.findUnique({
      where: { id: context.walletId },
      include: {
        transactions: {
          where: {
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!wallet) {
      return {
        type: 'TRANSACTION_CHECK',
        passed: false,
        riskScore: 100,
        flags: [{ code: 'WALLET_NOT_FOUND', severity: 'CRITICAL', description: 'Wallet nicht gefunden' }],
        recommendation: 'BLOCK',
        details: 'Wallet nicht gefunden',
      };
    }

    // Check unusual amount
    const avgAmount = wallet.transactions.length > 0
      ? wallet.transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / wallet.transactions.length
      : context.amount;

    if (context.amount > avgAmount * FRAUD_RULES.UNUSUAL_AMOUNT.thresholds.multiplier &&
        context.amount > FRAUD_RULES.UNUSUAL_AMOUNT.thresholds.absoluteLimit) {
      flags.push({
        code: 'UNUSUAL_AMOUNT',
        severity: 'MEDIUM',
        description: `Betrag ${context.amount}€ ist ${((context.amount / avgAmount)).toFixed(1)}x höher als Durchschnitt`,
        metadata: { amount: context.amount, averageAmount: avgAmount },
      });
      riskScore += 15;
    }

    // Check new IBAN for payouts
    if (context.type === 'PAYOUT' && context.targetIban) {
      const isNewIban = await this.isNewIban(context.userId, context.targetIban);
      if (isNewIban) {
        flags.push({
          code: 'NEW_IBAN',
          severity: 'MEDIUM',
          description: 'Auszahlung auf neue IBAN',
          metadata: { iban: this.maskIban(context.targetIban) },
        });
        riskScore += 20;
      }
    }

    // Check rapid payout after deposit
    if (context.type === 'PAYOUT') {
      const recentDeposit = wallet.transactions.find(t =>
        t.type === 'DEPOSIT' &&
        t.createdAt > new Date(Date.now() - FRAUD_RULES.RAPID_PAYOUT.minDepositAgeHours * 60 * 60 * 1000)
      );

      if (recentDeposit) {
        flags.push({
          code: 'RAPID_PAYOUT',
          severity: 'HIGH',
          description: 'Auszahlung kurz nach Einzahlung',
          metadata: { depositAmount: recentDeposit.amount },
        });
        riskScore += 30;
      }
    }

    // Check velocity (many transactions in short time)
    const last24hTransactions = wallet.transactions.filter(t =>
      t.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    if (last24hTransactions.length > 20) {
      flags.push({
        code: 'HIGH_VELOCITY',
        severity: 'MEDIUM',
        description: `${last24hTransactions.length} Transaktionen in 24h`,
        metadata: { count: last24hTransactions.length },
      });
      riskScore += 15;
    }

    // Check user risk score
    const user = await db.user.findUnique({
      where: { id: context.userId },
      include: { securityFlags: { where: { active: true } } },
    });

    if (user) {
      const criticalFlags = user.securityFlags.filter(f => f.severity === 'CRITICAL').length;
      if (criticalFlags > 0) {
        flags.push({
          code: 'USER_HAS_CRITICAL_FLAGS',
          severity: 'CRITICAL',
          description: `${criticalFlags} kritische Sicherheits-Flag(s)`,
        });
        riskScore += 40;
      }
    }

    const recommendation = this.getRecommendation(riskScore, flags);

    return {
      type: 'TRANSACTION_CHECK',
      passed: riskScore < 50,
      riskScore,
      flags,
      recommendation,
      details: `${flags.length} Flag(s) erkannt`,
    };
  }

  // ============================================
  // GPS PLAUSIBILITY CHECK
  // ============================================

  async checkGPSPlausibility(context: GPSCheckContext): Promise<FraudCheckResult> {
    const flags: FraudFlag[] = [];
    let riskScore = 0;

    // Check for GPS spoofing indicators
    const spoofingIndicators = await this.detectGPSSpoofing(context);
    if (spoofingIndicators.detected) {
      flags.push({
        code: 'GPS_SPOOFING_DETECTED',
        severity: 'CRITICAL',
        description: spoofingIndicators.reason,
        metadata: spoofingIndicators.metadata,
      });
      riskScore += 50;
    }

    // Check route plausibility if previous location exists
    if (context.previousLocation) {
      const distanceKm = this.calculateDistance(
        context.reportedLocation.latitude, context.reportedLocation.longitude,
        context.previousLocation.latitude, context.previousLocation.longitude
      );

      const timeDiffHours = (context.reportedLocation.timestamp.getTime() - 
        context.previousLocation.timestamp.getTime()) / (1000 * 60 * 60);

      // Maximum realistic speed for truck is ~90 km/h
      const maxRealisticSpeed = 120; // Including some buffer
      const calculatedSpeed = distanceKm / timeDiffHours;

      if (calculatedSpeed > maxRealisticSpeed && timeDiffHours > 0) {
        flags.push({
          code: 'IMPOSSIBLE_ROUTE',
          severity: 'HIGH',
          description: `Unmögliche Geschwindigkeit: ${calculatedSpeed.toFixed(0)} km/h`,
          metadata: { distanceKm, timeDiffHours, calculatedSpeed },
        });
        riskScore += 35;
      }
    }

    // Check against known route
    const transport = await db.transport.findUnique({
      where: { id: context.transportId },
      include: {
        pickupAddress: true,
        deliveryAddress: true,
        trackingPoints: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    if (transport && transport.pickupAddress.latitude && transport.deliveryAddress.latitude) {
      // Check if location is roughly on route
      const routeDeviation = this.calculateRouteDeviation(
        context.reportedLocation.latitude,
        context.reportedLocation.longitude,
        transport
      );

      if (routeDeviation > 50) { // More than 50km off route
        flags.push({
          code: 'ROUTE_DEVIATION',
          severity: 'MEDIUM',
          description: `${routeDeviation.toFixed(0)}km von Route abgewichen`,
          metadata: { routeDeviation },
        });
        riskScore += 15;
      }
    }

    const recommendation = this.getRecommendation(riskScore, flags);

    return {
      type: 'GPS_PLAUSIBILITY',
      passed: riskScore < 40,
      riskScore,
      flags,
      recommendation,
      details: `${flags.length} Flag(s) erkannt`,
    };
  }

  // ============================================
  // BEHAVIORAL ANOMALY DETECTION
  // ============================================

  async detectBehavioralAnomaly(userId: string): Promise<FraudCheckResult> {
    const flags: FraudFlag[] = [];
    let riskScore = 0;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        transportsAsShipper: {
          where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        },
        driver: {
          include: {
            assignments: {
              where: { assignedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            },
          },
        },
      },
    });

    if (!user) {
      return {
        type: 'BEHAVIORAL_ANOMALY',
        passed: false,
        riskScore: 100,
        flags: [],
        recommendation: 'BLOCK',
        details: 'User not found',
      };
    }

    // Check cancellation rate
    if (user.driver) {
      const totalAssignments = user.driver.assignments.length;
      const cancelledAssignments = await db.transport.count({
        where: {
          driverId: user.driver.id,
          status: 'CANCELLED',
          cancelledAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });

      if (totalAssignments > 5) {
        const cancelRate = cancelledAssignments / totalAssignments;
        if (cancelRate > 0.3) {
          flags.push({
            code: 'HIGH_CANCEL_RATE',
            severity: 'MEDIUM',
            description: `Stornorate: ${(cancelRate * 100).toFixed(1)}%`,
            metadata: { cancelRate, totalAssignments },
          });
          riskScore += 15;
        }
      }
    }

    // Check activity pattern
    const lastActivity = await this.getLastActivity(userId);
    if (lastActivity && lastActivity.daysSince > 90) {
      flags.push({
        code: 'DORMANT_ACCOUNT_REACTIVATED',
        severity: 'LOW',
        description: `Konto nach ${lastActivity.daysSince} Tagen reaktiviert`,
      });
      riskScore += 10;
    }

    const recommendation = this.getRecommendation(riskScore, flags);

    return {
      type: 'BEHAVIORAL_ANOMALY',
      passed: riskScore < 30,
      riskScore,
      flags,
      recommendation,
      details: `${flags.length} Anomalie(n) erkannt`,
    };
  }

  // ============================================
  // CREATE SECURITY FLAG
  // ============================================

  async createSecurityFlag(params: {
    userId: string;
    type: string;
    severity: SecurityFlagSeverity;
    notes: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await db.securityFlag.create({
      data: {
        userId: params.userId,
        type: params.type as any,
        severity: params.severity,
        notes: params.notes,
      },
    });

    // Create notification for support team
    const supportUsers = await db.user.findMany({
      where: {
        roles: {
          some: {
            role: { name: 'SUPPORT' },
          },
        },
      },
    });

    for (const support of supportUsers) {
      await db.notification.create({
        data: {
          userId: support.id,
          type: 'SECURITY_FLAG',
          title: `Sicherheits-Flag: ${params.type}`,
          message: params.notes,
          data: JSON.stringify(params.metadata || {}),
        },
      });
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async getRecentLogins(userId: string, hours: number): Promise<Array<{
    timestamp: Date;
    ipAddress: string;
    deviceId?: string;
    latitude?: number;
    longitude?: number;
    country?: string;
  }>> {
    // In production, this would query a login_history table
    // For now, we'll use audit logs
    const logs = await db.auditLog.findMany({
      where: {
        userId,
        action: 'LOGIN',
        createdAt: { gte: new Date(Date.now() - hours * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map(log => ({
      timestamp: log.createdAt,
      ipAddress: log.ipAddress || '',
      country: undefined, // Would be extracted from IP
      latitude: undefined,
      longitude: undefined,
    }));
  }

  private async storeLoginAttempt(context: LoginContext): Promise<void> {
    await db.auditLog.create({
      data: {
        userId: context.userId,
        action: 'LOGIN',
        entityType: 'user',
        entityId: context.userId,
        dataBefore: null,
        dataAfter: JSON.stringify({
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          deviceId: context.deviceId,
          country: context.country,
          city: context.city,
        }),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });
  }

  private async isNewIban(userId: string, iban: string): Promise<boolean> {
    const existing = await db.payoutMethod.findFirst({
      where: {
        wallet: { ownerUserId: userId },
        iban: iban,
        createdAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
    });
    return !existing;
  }

  private maskIban(iban: string): string {
    if (iban.length < 8) return iban;
    return iban.substring(0, 4) + '****' + iban.substring(iban.length - 4);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private async detectGPSSpoofing(context: GPSCheckContext): Promise<{
    detected: boolean;
    reason?: string;
    metadata?: Record<string, unknown>;
  }> {
    // Simulated spoofing detection logic
    // In production, this would check for:
    // - Rooted/jailbroken device
    // - Mock location enabled
    // - GPS signal inconsistencies
    // - Known spoofing apps installed

    return { detected: false };
  }

  private calculateRouteDeviation(
    lat: number,
    lon: number,
    transport: { pickupAddress: { latitude: number | null; longitude: number | null }; deliveryAddress: { latitude: number | null; longitude: number | null } }
  ): number {
    if (!transport.pickupAddress.latitude || !transport.deliveryAddress.latitude) {
      return 0;
    }

    // Simplified: calculate distance to direct line between pickup and delivery
    const pickupLat = transport.pickupAddress.latitude;
    const pickupLon = transport.pickupAddress.longitude;
    const deliveryLat = transport.deliveryAddress.latitude;
    const deliveryLon = transport.deliveryAddress.longitude;

    // Distance to pickup
    const distToPickup = this.calculateDistance(lat, lon, pickupLat, pickupLon);
    // Distance to delivery
    const distToDelivery = this.calculateDistance(lat, lon, deliveryLat, deliveryLon);
    // Direct distance
    const directDist = this.calculateDistance(pickupLat, pickupLon, deliveryLat, deliveryLon);

    // Triangle inequality deviation
    const deviation = Math.abs(distToPickup + distToDelivery - directDist) / 2;

    return deviation;
  }

  private async getLastActivity(userId: string): Promise<{ daysSince: number } | null> {
    const lastLog = await db.auditLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastLog) return null;

    const daysSince = Math.floor((Date.now() - lastLog.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    return { daysSince };
  }

  private getRecommendation(riskScore: number, flags: FraudFlag[]): FraudCheckResult['recommendation'] {
    const hasCritical = flags.some(f => f.severity === 'CRITICAL');
    const hasHigh = flags.some(f => f.severity === 'HIGH');

    if (hasCritical || riskScore >= 60) return 'BLOCK';
    if (hasHigh || riskScore >= 40) return 'MANUAL_REVIEW';
    if (riskScore >= 20) return 'FLAG';
    return 'ALLOW';
  }
}

// ============================================
// EXPORTS
// ============================================

export const fraudDetectionService = new FraudDetectionService();

export type {
  FraudCheckResult,
  FraudFlag,
  LoginContext,
  TransactionContext,
  GPSCheckContext,
  FraudCheckType,
};
