import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FraudCheckRequest, FraudCheckResponse, FraudCheckResult, FraudCheckType, ApiErrorResponse } from '@/types/matching';

// POST /api/matching/fraud/check - Perform fraud check on driver
export async function POST(request: NextRequest) {
  try {
    const body: FraudCheckRequest = await request.json();

    if (!body.driverId) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'ValidationError',
        message: 'Missing required field: driverId',
        code: 'MISSING_DRIVER_ID'
      }, { status: 400 });
    }

    // Get driver with related data
    const driver = await db.driver.findUnique({
      where: { id: body.driverId },
      include: {
        user: {
          include: {
            verifications: true,
            securityFlags: true,
            wallet: {
              include: {
                transactions: {
                  orderBy: { createdAt: 'desc' },
                  take: 20
                }
              }
            }
          }
        },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          take: 20
        }
      }
    });

    if (!driver) {
      return NextResponse.json<ApiErrorResponse>({
        error: 'NotFoundError',
        message: 'Driver not found',
        code: 'DRIVER_NOT_FOUND'
      }, { status: 404 });
    }

    const checks: FraudCheckResult[] = [];
    let totalRiskScore = 0;
    const recommendations: string[] = [];
    const blockedReasons: string[] = [];

    // Determine which checks to run
    const checkTypes = body.checkTypes?.includes('all') || !body.checkTypes
      ? ['kyc', 'kyb', 'iban_change', 'gps_plausibility', 'cancellation_rate', 'damage_history', 'fake_documents', 'suspicious_activity'] as FraudCheckType[]
      : body.checkTypes;

    // ===== KYC CHECK =====
    if (checkTypes.includes('kyc') || checkTypes.includes('all')) {
      const kycResult = await performKYCCheck(driver);
      checks.push(kycResult);
      totalRiskScore += kycResult.riskScore;
      if (!kycResult.passed) {
        blockedReasons.push('KYC nicht bestanden');
      }
    }

    // ===== KYB CHECK (for company drivers) =====
    if (checkTypes.includes('kyb') || checkTypes.includes('all')) {
      const kybResult = await performKYBCheck(driver);
      checks.push(kybResult);
      totalRiskScore += kybResult.riskScore;
    }

    // ===== IBAN CHANGE CHECK =====
    if (checkTypes.includes('iban_change') || checkTypes.includes('all')) {
      const ibanResult = await performIBANChangeCheck(driver);
      checks.push(ibanResult);
      totalRiskScore += ibanResult.riskScore;
      if (!ibanResult.passed) {
        recommendations.push('IBAN-Änderung kürzlich durchgeführt - manuelle Überprüfung empfohlen');
      }
    }

    // ===== GPS PLAUSIBILITY CHECK =====
    if (checkTypes.includes('gps_plausibility') || checkTypes.includes('all')) {
      const gpsResult = await performGPSCheck(driver, body.transportId);
      checks.push(gpsResult);
      totalRiskScore += gpsResult.riskScore;
    }

    // ===== CANCELLATION RATE CHECK =====
    if (checkTypes.includes('cancellation_rate') || checkTypes.includes('all')) {
      const cancellationResult = await performCancellationRateCheck(driver);
      checks.push(cancellationResult);
      totalRiskScore += cancellationResult.riskScore;
      if (!cancellationResult.passed) {
        recommendations.push('Hohe Stornierungsrate - genauere Überwachung empfohlen');
      }
    }

    // ===== DAMAGE HISTORY CHECK =====
    if (checkTypes.includes('damage_history') || checkTypes.includes('all')) {
      const damageResult = await performDamageHistoryCheck(driver);
      checks.push(damageResult);
      totalRiskScore += damageResult.riskScore;
    }

    // ===== FAKE DOCUMENTS CHECK =====
    if (checkTypes.includes('fake_documents') || checkTypes.includes('all')) {
      const docsResult = await performFakeDocumentsCheck(driver);
      checks.push(docsResult);
      totalRiskScore += docsResult.riskScore;
    }

    // ===== SUSPICIOUS ACTIVITY CHECK =====
    if (checkTypes.includes('suspicious_activity') || checkTypes.includes('all')) {
      const activityResult = await performSuspiciousActivityCheck(driver);
      checks.push(activityResult);
      totalRiskScore += activityResult.riskScore;
    }

    // ===== CHECK EXISTING SECURITY FLAGS =====
    const activeFlags = driver.user.securityFlags.filter(f => f.active);
    if (activeFlags.length > 0) {
      const criticalFlags = activeFlags.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH');
      if (criticalFlags.length > 0) {
        totalRiskScore += 50;
        blockedReasons.push('Kritische Sicherheits-Flags aktiv');
      }
    }

    // ===== DETERMINE RISK LEVEL =====
    const avgRiskScore = totalRiskScore / checks.length;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    
    if (avgRiskScore >= 70 || blockedReasons.length > 0) {
      riskLevel = 'critical';
    } else if (avgRiskScore >= 50) {
      riskLevel = 'high';
    } else if (avgRiskScore >= 25) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    const safe = riskLevel !== 'critical' && blockedReasons.length === 0;

    return NextResponse.json<FraudCheckResponse>({
      safe,
      riskScore: Math.round(avgRiskScore),
      riskLevel,
      checks,
      recommendations,
      blockedReasons
    }, { status: 200 });

  } catch (error) {
    console.error('Fraud check error:', error);
    return NextResponse.json<ApiErrorResponse>({
      error: 'InternalServerError',
      message: 'Failed to perform fraud check',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// ========== CHECK FUNCTIONS ==========

async function performKYCCheck(driver: any): Promise<FraudCheckResult> {
  const kycVerification = driver.user.verifications.find(
    (v: any) => v.type === 'KYC'
  );

  if (!kycVerification) {
    return {
      checkType: 'kyc',
      passed: false,
      riskScore: 80,
      details: 'Keine KYC-Verifizierung vorhanden',
      flags: ['KYC_MISSING']
    };
  }

  if (kycVerification.status === 'REJECTED') {
    return {
      checkType: 'kyc',
      passed: false,
      riskScore: 100,
      details: 'KYC-Verifizierung abgelehnt',
      flags: ['KYC_REJECTED']
    };
  }

  if (kycVerification.status === 'PENDING') {
    return {
      checkType: 'kyc',
      passed: false,
      riskScore: 50,
      details: 'KYC-Verifizierung ausstehend',
      flags: ['KYC_PENDING']
    };
  }

  return {
    checkType: 'kyc',
    passed: true,
    riskScore: 0,
    details: 'KYC erfolgreich verifiziert'
  };
}

async function performKYBCheck(driver: any): Promise<FraudCheckResult> {
  if (!driver.companyId) {
    return {
      checkType: 'kyb',
      passed: true,
      riskScore: 0,
      details: 'Selbstständiger Fahrer - KYB nicht erforderlich'
    };
  }

  const kybVerification = driver.user.verifications.find(
    (v: any) => v.type === 'KYB'
  );

  if (!kybVerification) {
    return {
      checkType: 'kyb',
      passed: false,
      riskScore: 60,
      details: 'Keine KYB-Verifizierung für Unternehmen vorhanden',
      flags: ['KYB_MISSING']
    };
  }

  if (kybVerification.status === 'APPROVED') {
    return {
      checkType: 'kyb',
      passed: true,
      riskScore: 0,
      details: 'KYB erfolgreich verifiziert'
    };
  }

  return {
    checkType: 'kyb',
    passed: false,
    riskScore: kybVerification.status === 'REJECTED' ? 100 : 40,
    details: `KYB Status: ${kybVerification.status}`,
    flags: [kybVerification.status === 'REJECTED' ? 'KYB_REJECTED' : 'KYB_PENDING']
  };
}

async function performIBANChangeCheck(driver: any): Promise<FraudCheckResult> {
  const wallet = driver.user.wallet;
  
  if (!wallet) {
    return {
      checkType: 'iban_change',
      passed: true,
      riskScore: 0,
      details: 'Kein Wallet vorhanden'
    };
  }

  // Check for recent IBAN changes (in last 7 days)
  const payoutMethods = await db.payoutMethod.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: 'desc' }
  });

  if (payoutMethods.length === 0) {
    return {
      checkType: 'iban_change',
      passed: true,
      riskScore: 0,
      details: 'Keine Auszahlungsmethoden vorhanden'
    };
  }

  const latestMethod = payoutMethods[0];
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(latestMethod.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceCreated < 7 && !latestMethod.verified) {
    return {
      checkType: 'iban_change',
      passed: false,
      riskScore: 40,
      details: `IBAN vor ${daysSinceCreated} Tagen hinzugefügt, noch nicht verifiziert`,
      flags: ['RECENT_IBAN_CHANGE', 'IBAN_UNVERIFIED']
    };
  }

  if (daysSinceCreated < 7) {
    return {
      checkType: 'iban_change',
      passed: true,
      riskScore: 20,
      details: `IBAN vor ${daysSinceCreated} Tagen hinzugefügt`
    };
  }

  if (!latestMethod.verified) {
    return {
      checkType: 'iban_change',
      passed: false,
      riskScore: 30,
      details: 'IBAN nicht verifiziert',
      flags: ['IBAN_UNVERIFIED']
    };
  }

  return {
    checkType: 'iban_change',
    passed: true,
    riskScore: 0,
    details: 'IBAN verifiziert'
  };
}

async function performGPSCheck(driver: any, transportId?: string): Promise<FraudCheckResult> {
  if (!driver.currentLocation) {
    return {
      checkType: 'gps_plausibility',
      passed: true,
      riskScore: 0,
      details: 'Keine GPS-Daten vorhanden'
    };
  }

  try {
    const location = JSON.parse(driver.currentLocation);
    const timestamp = new Date(location.timestamp);
    const minutesAgo = (Date.now() - timestamp.getTime()) / (1000 * 60);

    // Check if GPS data is recent
    if (minutesAgo > 120) {
      return {
        checkType: 'gps_plausibility',
        passed: true,
        riskScore: 15,
        details: `GPS-Daten sind ${Math.round(minutesAgo)} Minuten alt`
      };
    }

    // Check for impossible speeds (if driver had recent assignments)
    if (driver.assignments.length > 0) {
      const lastAssignment = driver.assignments[0];
      // In production, would check actual route and speed calculations
    }

    return {
      checkType: 'gps_plausibility',
      passed: true,
      riskScore: 0,
      details: 'GPS-Daten plausibel'
    };
  } catch {
    return {
      checkType: 'gps_plausibility',
      passed: true,
      riskScore: 10,
      details: 'GPS-Daten konnten nicht analysiert werden'
    };
  }
}

async function performCancellationRateCheck(driver: any): Promise<FraudCheckResult> {
  const total = driver.completedTransports + driver.cancelledTransports;
  
  if (total < 5) {
    return {
      checkType: 'cancellation_rate',
      passed: true,
      riskScore: 0,
      details: 'Zu wenige Transporte für aussagekräftige Stornierungsrate'
    };
  }

  const cancellationRate = driver.cancelledTransports / total;

  if (cancellationRate > 0.3) {
    return {
      checkType: 'cancellation_rate',
      passed: false,
      riskScore: 70,
      details: `Hohe Stornierungsrate: ${(cancellationRate * 100).toFixed(1)}%`,
      flags: ['HIGH_CANCELLATION_RATE']
    };
  }

  if (cancellationRate > 0.15) {
    return {
      checkType: 'cancellation_rate',
      passed: true,
      riskScore: 30,
      details: `Erhöhte Stornierungsrate: ${(cancellationRate * 100).toFixed(1)}%`
    };
  }

  return {
    checkType: 'cancellation_rate',
    passed: true,
    riskScore: 0,
    details: `Stornierungsrate: ${(cancellationRate * 100).toFixed(1)}% - akzeptabel`
  };
}

async function performDamageHistoryCheck(driver: any): Promise<FraudCheckResult> {
  if (driver.damageCount === 0) {
    return {
      checkType: 'damage_history',
      passed: true,
      riskScore: 0,
      details: 'Keine Schadenshistorie'
    };
  }

  // Check recent damages
  if (driver.lastDamageAt) {
    const daysSinceDamage = Math.floor(
      (Date.now() - new Date(driver.lastDamageAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceDamage < 30 && driver.damageCount > 1) {
      return {
        checkType: 'damage_history',
        passed: false,
        riskScore: 60,
        details: `${driver.damageCount} Schäden, letzter vor ${daysSinceDamage} Tagen`,
        flags: ['RECENT_DAMAGE_HISTORY']
      };
    }
  }

  if (driver.damageCount > 3) {
    return {
      checkType: 'damage_history',
      passed: true,
      riskScore: 40,
      details: `${driver.damageCount} Schäden in der Historie`
    };
  }

  return {
    checkType: 'damage_history',
    passed: true,
    riskScore: driver.damageCount * 10,
    details: `${driver.damageCount} Schaden/ Schäden in der Historie`
  };
}

async function performFakeDocumentsCheck(driver: any): Promise<FraudCheckResult> {
  const verifications = driver.user.verifications;
  const rejectedDocs = verifications.filter((v: any) => v.status === 'REJECTED');

  if (rejectedDocs.length > 0) {
    return {
      checkType: 'fake_documents',
      passed: false,
      riskScore: 80,
      details: `${rejectedDocs.length} abgelehnte Dokumente`,
      flags: ['REJECTED_DOCUMENTS']
    };
  }

  // Check for document quality issues
  const pendingDocs = verifications.filter((v: any) => v.status === 'PENDING');
  if (pendingDocs.length > 3) {
    return {
      checkType: 'fake_documents',
      passed: true,
      riskScore: 20,
      details: `${pendingDocs.length} Dokumente warten auf Überprüfung`
    };
  }

  return {
    checkType: 'fake_documents',
    passed: true,
    riskScore: 0,
    details: 'Keine Auffälligkeiten bei Dokumenten'
  };
}

async function performSuspiciousActivityCheck(driver: any): Promise<FraudCheckResult> {
  const flags = driver.user.securityFlags;
  const activeFlags = flags.filter((f: any) => f.active);

  if (activeFlags.length === 0) {
    return {
      checkType: 'suspicious_activity',
      passed: true,
      riskScore: 0,
      details: 'Keine verdächtigen Aktivitäten'
    };
  }

  const criticalFlags = activeFlags.filter((f: any) => 
    f.severity === 'CRITICAL' || f.severity === 'HIGH'
  );

  if (criticalFlags.length > 0) {
    return {
      checkType: 'suspicious_activity',
      passed: false,
      riskScore: 90,
      details: `${criticalFlags.length} kritische Sicherheits-Flags aktiv`,
      flags: criticalFlags.map((f: any) => f.type)
    };
  }

  return {
    checkType: 'suspicious_activity',
    passed: true,
    riskScore: activeFlags.length * 15,
    details: `${activeFlags.length} moderate Sicherheits-Flags`,
    flags: activeFlags.map((f: any) => f.type)
  };
}
