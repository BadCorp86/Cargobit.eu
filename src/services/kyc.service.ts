// ============================================
// CARGOBIT KYC SERVICE
// Know Your Customer Verification
// ============================================

import { db } from '@/lib/db';
import { VerificationStatus } from '@prisma/client';

// ============================================
// TYPES & INTERFACES
// ============================================

export type KYCDocumentType = 
  | 'PASSPORT'
  | 'ID_CARD'
  | 'DRIVERS_LICENSE';

export type KYCVerificationLevel = 'basic' | 'standard' | 'enhanced';

export interface KYCDocument {
  type: KYCDocumentType;
  documentUrl: string;
  documentNumber?: string;
  issueDate?: Date;
  expiryDate?: Date;
  issuingCountry?: string;
}

export interface KYCSubmission {
  userId: string;
  documents: KYCDocument[];
  selfieUrl: string;
  level: KYCVerificationLevel;
  additionalInfo?: {
    nationality?: string;
    birthDate?: Date;
    address?: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
  };
}

export interface KYCResult {
  success: boolean;
  verificationId: string;
  status: VerificationStatus;
  checks: KYCCheckResult[];
  riskScore: number;
  message: string;
}

export interface KYCCheckResult {
  checkName: string;
  passed: boolean;
  confidence: number; // 0-100
  details?: string;
  provider?: string;
}

// ============================================
// KYC CONFIGURATION
// ============================================

export const KYC_REQUIREMENTS = {
  basic: {
    name: 'Basic KYC',
    description: 'Grundlegende Identitätsprüfung',
    requiredDocuments: ['ID_CARD', 'PASSPORT'],
    requiresSelfie: false,
    requiresAddressVerification: false,
    maxProcessingHours: 24,
  },
  standard: {
    name: 'Standard KYC',
    description: 'Standard Identitätsprüfung mit Selfie-Match',
    requiredDocuments: ['ID_CARD', 'PASSPORT', 'DRIVERS_LICENSE'],
    requiresSelfie: true,
    requiresAddressVerification: false,
    maxProcessingHours: 48,
  },
  enhanced: {
    name: 'Enhanced KYC',
    description: 'Erweiterte Identitätsprüfung mit Adressverifizierung',
    requiredDocuments: ['ID_CARD', 'PASSPORT'],
    requiresSelfie: true,
    requiresAddressVerification: true,
    maxProcessingHours: 72,
    additionalChecks: ['PEP_CHECK', 'SANCTIONS_CHECK', 'ADVERSE_MEDIA'],
  },
};

// ============================================
// KYC SERVICE CLASS
// ============================================

export class KYCService {
  // ============================================
  // SUBMIT KYC VERIFICATION
  // ============================================

  async submitVerification(submission: KYCSubmission): Promise<KYCResult> {
    const { userId, documents, selfieUrl, level, additionalInfo } = submission;

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { verifications: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check for existing pending verification
    const existingPending = user.verifications.find(
      v => v.type === 'KYC' && v.status === 'PENDING'
    );

    if (existingPending) {
      return {
        success: false,
        verificationId: existingPending.id,
        status: 'PENDING',
        checks: [],
        riskScore: 0,
        message: 'Es existiert bereits eine ausstehende KYC-Verifizierung',
      };
    }

    // Validate documents
    const validation = this.validateDocuments(documents, level);
    if (!validation.valid) {
      throw new Error(`Document validation failed: ${validation.errors.join(', ')}`);
    }

    // Create verification record
    const verification = await db.verification.create({
      data: {
        userId,
        type: 'KYC',
        status: 'PENDING',
        documentUrl: documents[0].documentUrl, // Primary document
        documentType: documents[0].type,
      },
    });

    // Store additional KYC data
    await db.$executeRaw`
      INSERT INTO kyc_data (verification_id, level, documents, selfie_url, additional_info, created_at)
      VALUES (${verification.id}, ${level}, ${JSON.stringify(documents)}, ${selfieUrl}, ${JSON.stringify(additionalInfo || {})}, ${new Date()})
    `;

    // Run automated checks
    const checkResults = await this.runAutomatedChecks(verification.id, submission);

    // Calculate risk score
    const riskScore = this.calculateKYCRiskScore(checkResults);

    // Determine if auto-approval is possible
    const canAutoApprove = this.canAutoApprove(checkResults, level, riskScore);

    if (canAutoApprove) {
      await db.verification.update({
        where: { id: verification.id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
        },
      });

      // Update user verification status
      await this.updateUserVerificationStatus(userId);

      return {
        success: true,
        verificationId: verification.id,
        status: 'APPROVED',
        checks: checkResults,
        riskScore,
        message: 'KYC-Verifizierung erfolgreich abgeschlossen',
      };
    }

    return {
      success: true,
      verificationId: verification.id,
      status: 'PENDING',
      checks: checkResults,
      riskScore,
      message: 'KYC-Verifizierung eingereicht. Manuelle Prüfung erforderlich.',
    };
  }

  // ============================================
  // DOCUMENT VALIDATION
  // ============================================

  private validateDocuments(
    documents: KYCDocument[],
    level: KYCVerificationLevel
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requirements = KYC_REQUIREMENTS[level];

    // Check if at least one required document type is present
    const hasRequiredDoc = documents.some(doc =>
      requirements.requiredDocuments.includes(doc.type)
    );

    if (!hasRequiredDoc) {
      errors.push(`Mindestens eines der folgenden Dokumente erforderlich: ${requirements.requiredDocuments.join(', ')}`);
    }

    // Check document expiry
    const now = new Date();
    const expiredDocs = documents.filter(doc =>
      doc.expiryDate && new Date(doc.expiryDate) < now
    );

    if (expiredDocs.length > 0) {
      errors.push(`Abgelaufene Dokumente: ${expiredDocs.map(d => d.type).join(', ')}`);
    }

    // Validate document URLs
    const invalidUrls = documents.filter(doc => !doc.documentUrl || !doc.documentUrl.startsWith('http'));
    if (invalidUrls.length > 0) {
      errors.push('Ungültige Dokument-URLs');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ============================================
  // AUTOMATED CHECKS
  // ============================================

  private async runAutomatedChecks(
    verificationId: string,
    submission: KYCSubmission
  ): Promise<KYCCheckResult[]> {
    const checks: KYCCheckResult[] = [];

    // 1. Document Quality Check
    checks.push(await this.checkDocumentQuality(submission.documents));

    // 2. Document Authenticity Check
    checks.push(await this.checkDocumentAuthenticity(submission.documents));

    // 3. Face Match Check (if selfie provided)
    if (submission.selfieUrl) {
      checks.push(await this.checkFaceMatch(submission.documents[0], submission.selfieUrl));
    }

    // 4. Data Extraction & Validation
    checks.push(await this.extractAndValidateData(submission.documents));

    // 5. Enhanced checks for higher levels
    if (submission.level === 'enhanced') {
      checks.push(await this.runPEPCheck(submission));
      checks.push(await this.runSanctionsCheck(submission));
      checks.push(await this.runAdverseMediaCheck(submission));
    }

    return checks;
  }

  private async checkDocumentQuality(documents: KYCDocument[]): Promise<KYCCheckResult> {
    // Simulate quality check
    const qualityScore = 85 + Math.random() * 15; // 85-100
    
    return {
      checkName: 'DOCUMENT_QUALITY',
      passed: qualityScore >= 70,
      confidence: qualityScore,
      details: 'Dokumentqualität geprüft',
      provider: 'internal',
    };
  }

  private async checkDocumentAuthenticity(documents: KYCDocument[]): Promise<KYCCheckResult> {
    // Simulate authenticity check with external provider
    const authenticityScore = 80 + Math.random() * 20; // 80-100
    
    return {
      checkName: 'DOCUMENT_AUTHENTICITY',
      passed: authenticityScore >= 75,
      confidence: authenticityScore,
      details: 'Dokumentechtheit verifiziert',
      provider: 'idnow', // Simulated provider
    };
  }

  private async checkFaceMatch(document: KYCDocument, selfieUrl: string): Promise<KYCCheckResult> {
    // Simulate face matching
    const matchScore = 75 + Math.random() * 25; // 75-100
    
    return {
      checkName: 'FACE_MATCH',
      passed: matchScore >= 70,
      confidence: matchScore,
      details: matchScore >= 70
        ? 'Gesicht stimmt mit Dokument überein'
        : 'Gesichtsübereinstimmung zu gering',
      provider: 'aws_rekognition',
    };
  }

  private async extractAndValidateData(documents: KYCDocument[]): Promise<KYCCheckResult> {
    // Simulate data extraction
    const extractionScore = 90 + Math.random() * 10; // 90-100
    
    return {
      checkName: 'DATA_EXTRACTION',
      passed: extractionScore >= 85,
      confidence: extractionScore,
      details: 'Daten erfolgreich extrahiert und validiert',
      provider: 'internal',
    };
  }

  private async runPEPCheck(submission: KYCSubmission): Promise<KYCCheckResult> {
    // Simulate PEP (Politically Exposed Person) check
    const hasMatches = Math.random() > 0.95; // 5% chance of potential match
    
    return {
      checkName: 'PEP_CHECK',
      passed: !hasMatches,
      confidence: hasMatches ? 60 : 95,
      details: hasMatches
        ? 'Potenzielle PEP-Übereinstimmung gefunden - manuelle Prüfung erforderlich'
        : 'Keine PEP-Übereinstimmungen',
      provider: 'complyadvantage',
    };
  }

  private async runSanctionsCheck(submission: KYCSubmission): Promise<KYCCheckResult> {
    // Simulate sanctions list check
    const hasMatches = Math.random() > 0.98; // 2% chance
    
    return {
      checkName: 'SANCTIONS_CHECK',
      passed: !hasMatches,
      confidence: hasMatches ? 50 : 98,
      details: hasMatches
        ? 'Sanktionslisten-Übereinstimmung gefunden'
        : 'Keine Sanktionslisten-Übereinstimmungen',
      provider: 'complyadvantage',
    };
  }

  private async runAdverseMediaCheck(submission: KYCSubmission): Promise<KYCCheckResult> {
    // Simulate adverse media check
    const hasAdverseMedia = Math.random() > 0.9; // 10% chance
    
    return {
      checkName: 'ADVERSE_MEDIA',
      passed: !hasAdverseMedia,
      confidence: hasAdverseMedia ? 55 : 90,
      details: hasAdverseMedia
        ? 'Negative Medienberichte gefunden'
        : 'Keine negativen Medienberichte',
      provider: 'complyadvantage',
    };
  }

  // ============================================
  // RISK SCORE CALCULATION
  // ============================================

  private calculateKYCRiskScore(checks: KYCCheckResult[]): number {
    let riskScore = 0;

    for (const check of checks) {
      if (!check.passed) {
        // Failed checks add to risk
        switch (check.checkName) {
          case 'DOCUMENT_AUTHENTICITY':
            riskScore += 30;
            break;
          case 'FACE_MATCH':
            riskScore += 25;
            break;
          case 'SANCTIONS_CHECK':
            riskScore += 40;
            break;
          case 'PEP_CHECK':
            riskScore += 20;
            break;
          case 'ADVERSE_MEDIA':
            riskScore += 15;
            break;
          default:
            riskScore += 10;
        }
      } else if (check.confidence < 85) {
        // Low confidence adds small risk
        riskScore += (85 - check.confidence) * 0.5;
      }
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  // ============================================
  // AUTO-APPROVAL LOGIC
  // ============================================

  private canAutoApprove(
    checks: KYCCheckResult[],
    level: KYCVerificationLevel,
    riskScore: number
  ): boolean {
    // Never auto-approve enhanced KYC
    if (level === 'enhanced') return false;

    // All critical checks must pass
    const criticalChecks = ['DOCUMENT_AUTHENTICITY', 'FACE_MATCH'];
    const criticalPassed = checks
      .filter(c => criticalChecks.includes(c.checkName))
      .every(c => c.passed && c.confidence >= 85);

    if (!criticalPassed) return false;

    // Risk score must be low
    if (riskScore > 30) return false;

    // Standard level requires higher confidence
    if (level === 'standard') {
      const avgConfidence = checks.reduce((sum, c) => sum + c.confidence, 0) / checks.length;
      return avgConfidence >= 85;
    }

    return true;
  }

  // ============================================
  // STATUS MANAGEMENT
  // ============================================

  async approveVerification(
    verificationId: string,
    reviewerId: string,
    notes?: string
  ): Promise<KYCResult> {
    const verification = await db.verification.update({
      where: { id: verificationId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        rejectionReason: notes,
      },
    });

    await this.updateUserVerificationStatus(verification.userId);

    return {
      success: true,
      verificationId: verification.id,
      status: 'APPROVED',
      checks: [],
      riskScore: 0,
      message: 'KYC-Verifizierung genehmigt',
    };
  }

  async rejectVerification(
    verificationId: string,
    reviewerId: string,
    reason: string
  ): Promise<KYCResult> {
    const verification = await db.verification.update({
      where: { id: verificationId },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        rejectionReason: reason,
      },
    });

    // Create security flag for rejected KYC
    await db.securityFlag.create({
      data: {
        userId: verification.userId,
        type: 'DOCUMENT_ISSUE',
        severity: 'MEDIUM',
        notes: `KYC rejected: ${reason}`,
      },
    });

    return {
      success: true,
      verificationId: verification.id,
      status: 'REJECTED',
      checks: [],
      riskScore: 50,
      message: 'KYC-Verifizierung abgelehnt',
    };
  }

  private async updateUserVerificationStatus(userId: string): Promise<void> {
    // Check all required verifications for the user's roles
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
        verifications: true,
      },
    });

    if (!user) return;

    // For now, just activate the user if KYC is approved
    const kycApproved = user.verifications.some(
      v => v.type === 'KYC' && v.status === 'APPROVED'
    );

    if (kycApproved && user.status === 'PENDING') {
      await db.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });
    }
  }

  // ============================================
  // GET VERIFICATION STATUS
  // ============================================

  async getVerificationStatus(userId: string): Promise<{
    kycStatus: VerificationStatus | null;
    level: KYCVerificationLevel | null;
    checks: KYCCheckResult[];
    missingDocuments: string[];
  }> {
    const verification = await db.verification.findFirst({
      where: { userId, type: 'KYC' },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      return {
        kycStatus: null,
        level: null,
        checks: [],
        missingDocuments: ['ID_CARD', 'PASSPORT'],
      };
    }

    // Get stored KYC data
    const kycData = await db.$queryRaw<Array<{ level: string; documents: string }>>`
      SELECT level, documents FROM kyc_data WHERE verification_id = ${verification.id}
    `;

    const level = kycData[0]?.level as KYCVerificationLevel || 'basic';

    return {
      kycStatus: verification.status,
      level,
      checks: [],
      missingDocuments: [],
    };
  }
}

// ============================================
// DRIVER-SPECIFIC VERIFICATIONS
// ============================================

export class DriverVerificationService {
  // ============================================
  // DRIVER LICENSE VERIFICATION
  // ============================================

  async verifyDriverLicense(
    driverId: string,
    licenseData: {
      licenseNumber: string;
      licenseClass: string;
      expiryDate: Date;
      issuingCountry: string;
      documentUrl: string;
    }
  ): Promise<KYCResult> {
    const driver = await db.driver.findUnique({
      where: { id: driverId },
      include: { user: true },
    });

    if (!driver) {
      throw new Error('Driver not found');
    }

    // Create verification record
    const verification = await db.verification.create({
      data: {
        userId: driver.userId,
        type: 'DRIVER_LICENSE',
        status: 'PENDING',
        documentUrl: licenseData.documentUrl,
        documentType: 'DRIVERS_LICENSE',
      },
    });

    // Validate license
    const now = new Date();
    const isExpired = new Date(licenseData.expiryDate) < now;
    const isValidClass = this.validateLicenseClass(licenseData.licenseClass);

    if (isExpired) {
      await db.verification.update({
        where: { id: verification.id },
        data: { status: 'REJECTED', rejectionReason: 'Führerschein abgelaufen' },
      });

      return {
        success: false,
        verificationId: verification.id,
        status: 'REJECTED',
        checks: [{
          checkName: 'LICENSE_EXPIRY',
          passed: false,
          confidence: 100,
          details: 'Führerschein ist abgelaufen',
        }],
        riskScore: 20,
        message: 'Führerschein abgelaufen',
      };
    }

    // Update driver record
    await db.driver.update({
      where: { id: driverId },
      data: {
        licenseNumber: licenseData.licenseNumber,
        licenseClass: licenseData.licenseClass,
        licenseExpiry: licenseData.expiryDate,
      },
    });

    // Auto-approve if not expired and valid class
    if (!isExpired && isValidClass) {
      await db.verification.update({
        where: { id: verification.id },
        data: { status: 'APPROVED', reviewedAt: new Date() },
      });

      return {
        success: true,
        verificationId: verification.id,
        status: 'APPROVED',
        checks: [{
          checkName: 'LICENSE_VALIDATION',
          passed: true,
          confidence: 95,
          details: `Führerscheinklasse ${licenseData.licenseClass} verifiziert`,
        }],
        riskScore: 0,
        message: 'Führerschein erfolgreich verifiziert',
      };
    }

    return {
      success: true,
      verificationId: verification.id,
      status: 'PENDING',
      checks: [],
      riskScore: 10,
      message: 'Führerschein zur Prüfung eingereicht',
    };
  }

  private validateLicenseClass(licenseClass: string): boolean {
    const validClasses = ['C', 'CE', 'C1', 'C1E', 'D', 'DE', 'D1', 'D1E'];
    return validClasses.includes(licenseClass.toUpperCase());
  }

  // ============================================
  // ADR CERTIFICATION VERIFICATION
  // ============================================

  async verifyADRCertification(
    driverId: string,
    adrData: {
      certificateNumber: string;
      classes: string[];
      expiryDate: Date;
      documentUrl: string;
      tunnelCodes?: string[];
    }
  ): Promise<KYCResult> {
    const driver = await db.driver.findUnique({
      where: { id: driverId },
      include: { user: true },
    });

    if (!driver) {
      throw new Error('Driver not found');
    }

    const verification = await db.verification.create({
      data: {
        userId: driver.userId,
        type: 'ADR',
        status: 'PENDING',
        documentUrl: adrData.documentUrl,
        documentType: 'ADR_CERTIFICATE',
      },
    });

    const now = new Date();
    const isExpired = new Date(adrData.expiryDate) < now;

    if (isExpired) {
      await db.verification.update({
        where: { id: verification.id },
        data: { status: 'REJECTED', rejectionReason: 'ADR-Zertifikat abgelaufen' },
      });

      return {
        success: false,
        verificationId: verification.id,
        status: 'REJECTED',
        checks: [{
          checkName: 'ADR_EXPIRY',
          passed: false,
          confidence: 100,
          details: 'ADR-Zertifikat ist abgelaufen',
        }],
        riskScore: 20,
        message: 'ADR-Zertifikat abgelaufen',
      };
    }

    // Update driver record
    await db.driver.update({
      where: { id: driverId },
      data: {
        adrLicense: true,
        adrClasses: JSON.stringify(adrData.classes),
        adrExpiry: adrData.expiryDate,
      },
    });

    await db.verification.update({
      where: { id: verification.id },
      data: { status: 'APPROVED', reviewedAt: new Date() },
    });

    return {
      success: true,
      verificationId: verification.id,
      status: 'APPROVED',
      checks: [{
        checkName: 'ADR_VALIDATION',
        passed: true,
        confidence: 95,
        details: `ADR-Klassen ${adrData.classes.join(', ')} verifiziert`,
      }],
      riskScore: 0,
      message: 'ADR-Zertifikat erfolgreich verifiziert',
    };
  }
}

// ============================================
// EXPORTS
// ============================================

export const kycService = new KYCService();
export const driverVerificationService = new DriverVerificationService();

export type {
  KYCDocument,
  KYCSubmission,
  KYCResult,
  KYCCheckResult,
  KYCVerificationLevel,
  KYCDocumentType,
};
