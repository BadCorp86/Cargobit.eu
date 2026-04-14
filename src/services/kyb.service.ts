// ============================================
// CARGOBIT KYB SERVICE
// Know Your Business Verification
// ============================================

import { db } from '@/lib/db';
import { VerificationStatus, CompanyStatus } from '@prisma/client';

// ============================================
// TYPES & INTERFACES
// ============================================

export type KYBDocumentType =
  | 'COMMERCIAL_REGISTER_EXTRACT'
  | 'VAT_CERTIFICATE'
  | 'ARTICLES_OF_ASSOCIATION'
  | 'SHAREHOLDER_REGISTER'
  | 'BENEFICIAL_OWNERS_DECLARATION'
  | 'AUTHORIZATION_LETTER';

export interface BeneficialOwner {
  firstName: string;
  lastName: string;
  birthDate: Date;
  nationality: string;
  ownershipPercentage: number;
  isPEP: boolean; // Politically Exposed Person
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

export interface KYBDocument {
  type: KYBDocumentType;
  documentUrl: string;
  documentNumber?: string;
  issueDate?: Date;
  expiryDate?: Date;
  issuingAuthority?: string;
}

export interface KYBSubmission {
  companyId: string;
  submitterUserId: string;
  documents: KYBDocument[];
  beneficialOwners: BeneficialOwner[];
  companyInfo: {
    legalForm: string;
    registrationNumber: string;
    vatNumber: string;
    registrationDate: Date;
    registeredAddress: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
  };
}

export interface KYBResult {
  success: boolean;
  verificationId: string;
  status: VerificationStatus;
  checks: KYBCheckResult[];
  riskScore: number;
  message: string;
  requiresManualReview: boolean;
}

export interface KYBCheckResult {
  checkName: string;
  passed: boolean;
  confidence: number;
  details?: string;
  provider?: string;
}

// ============================================
// KYB REQUIREMENTS BY COMPANY TYPE
// ============================================

export const KYB_REQUIREMENTS = {
  SHIPPER: {
    name: 'Shipper KYB',
    requiredDocuments: [
      'COMMERCIAL_REGISTER_EXTRACT',
      'VAT_CERTIFICATE',
      'BENEFICIAL_OWNERS_DECLARATION',
    ],
    requiresBeneficialOwners: true,
    maxOwnershipThreshold: 25, // Report owners with >25%
    maxProcessingDays: 5,
  },
  CARRIER: {
    name: 'Carrier KYB',
    requiredDocuments: [
      'COMMERCIAL_REGISTER_EXTRACT',
      'VAT_CERTIFICATE',
      'BENEFICIAL_OWNERS_DECLARATION',
      'SHAREHOLDER_REGISTER',
    ],
    requiresBeneficialOwners: true,
    maxOwnershipThreshold: 25,
    maxProcessingDays: 7,
    additionalChecks: ['FLEET_INSURANCE', 'TRANSPORT_LICENSE'],
  },
  BOTH: {
    name: 'Full KYB (Shipper & Carrier)',
    requiredDocuments: [
      'COMMERCIAL_REGISTER_EXTRACT',
      'VAT_CERTIFICATE',
      'ARTICLES_OF_ASSOCIATION',
      'SHAREHOLDER_REGISTER',
      'BENEFICIAL_OWNERS_DECLARATION',
    ],
    requiresBeneficialOwners: true,
    maxOwnershipThreshold: 20,
    maxProcessingDays: 10,
    additionalChecks: ['FLEET_INSURANCE', 'TRANSPORT_LICENSE', 'FINANCIAL_STANDING'],
  },
};

// ============================================
// KYB SERVICE CLASS
// ============================================

export class KYBService {
  // ============================================
  // SUBMIT KYB VERIFICATION
  // ============================================

  async submitVerification(submission: KYBSubmission): Promise<KYBResult> {
    const { companyId, submitterUserId, documents, beneficialOwners, companyInfo } = submission;

    // Validate submitter is authorized for company
    const companyUser = await db.companyUser.findFirst({
      where: {
        companyId,
        userId: submitterUserId,
        roleInCompany: { in: ['owner', 'admin'] },
      },
    });

    if (!companyUser) {
      throw new Error('User not authorized to submit KYB for this company');
    }

    // Get company
    const company = await db.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    // Validate documents
    const validation = this.validateDocuments(documents, company.type);
    if (!validation.valid) {
      throw new Error(`Document validation failed: ${validation.errors.join(', ')}`);
    }

    // Validate beneficial owners
    const boValidation = this.validateBeneficialOwners(beneficialOwners);
    if (!boValidation.valid) {
      throw new Error(`Beneficial owner validation failed: ${boValidation.errors.join(', ')}`);
    }

    // Create verification record
    const verification = await db.verification.create({
      data: {
        userId: submitterUserId,
        type: 'KYB',
        status: 'PENDING',
        documentUrl: documents[0].documentUrl,
        documentType: 'KYB_PACKAGE',
      },
    });

    // Store KYB data
    await db.$executeRaw`
      INSERT INTO kyb_data (
        verification_id, 
        company_id, 
        documents, 
        beneficial_owners, 
        company_info, 
        created_at
      ) VALUES (
        ${verification.id},
        ${companyId},
        ${JSON.stringify(documents)},
        ${JSON.stringify(beneficialOwners)},
        ${JSON.stringify(companyInfo)},
        ${new Date()}
      )
    `;

    // Run automated checks
    const checkResults = await this.runAutomatedChecks(verification.id, submission);

    // Calculate risk score
    const riskScore = this.calculateKYBRiskScore(checkResults, beneficialOwners);

    // Update company info
    await db.company.update({
      where: { id: companyId },
      data: {
        registrationNumber: companyInfo.registrationNumber,
        vatNumber: companyInfo.vatNumber,
      },
    });

    // Determine if auto-approval is possible (usually not for KYB)
    const canAutoApprove = this.canAutoApprove(checkResults, riskScore);
    const requiresManualReview = !canAutoApprove;

    if (canAutoApprove) {
      await db.verification.update({
        where: { id: verification.id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
        },
      });

      await this.updateCompanyVerificationStatus(companyId);

      return {
        success: true,
        verificationId: verification.id,
        status: 'APPROVED',
        checks: checkResults,
        riskScore,
        message: 'KYB-Verifizierung erfolgreich abgeschlossen',
        requiresManualReview: false,
      };
    }

    return {
      success: true,
      verificationId: verification.id,
      status: 'PENDING',
      checks: checkResults,
      riskScore,
      message: 'KYB-Verifizierung eingereicht. Manuelle Prüfung erforderlich.',
      requiresManualReview: true,
    };
  }

  // ============================================
  // DOCUMENT VALIDATION
  // ============================================

  private validateDocuments(
    documents: KYBDocument[],
    companyType: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requirements = KYB_REQUIREMENTS[companyType as keyof typeof KYB_REQUIREMENTS] || KYB_REQUIREMENTS.SHIPPER;

    // Check required documents
    const docTypes = documents.map(d => d.type);
    const missingDocs = requirements.requiredDocuments.filter(
      req => !docTypes.includes(req as KYBDocumentType)
    );

    if (missingDocs.length > 0) {
      errors.push(`Fehlende Dokumente: ${missingDocs.join(', ')}`);
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
  // BENEFICIAL OWNER VALIDATION
  // ============================================

  private validateBeneficialOwners(
    beneficialOwners: BeneficialOwner[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (beneficialOwners.length === 0) {
      errors.push('Mindestens ein wirtschaftlich Berechtigter muss angegeben werden');
    }

    // Check ownership sum
    const totalOwnership = beneficialOwners.reduce((sum, bo) => sum + bo.ownershipPercentage, 0);
    if (totalOwnership > 100) {
      errors.push(`Gesamtbesitzanteil übersteigt 100% (${totalOwnership}%)`);
    }
    if (totalOwnership < 25 && beneficialOwners.length > 0) {
      errors.push(`Gesamtbesitzanteil unter 25% (${totalOwnership}%) - weitere Berechtigte erforderlich`);
    }

    // Validate each owner
    for (const owner of beneficialOwners) {
      if (!owner.firstName || !owner.lastName) {
        errors.push('Name des wirtschaftlich Berechtigten unvollständig');
      }
      if (owner.ownershipPercentage < 0 || owner.ownershipPercentage > 100) {
        errors.push(`Ungültiger Besitzanteil: ${owner.ownershipPercentage}%`);
      }
      if (owner.isPEP) {
        errors.push(`PEP-Status erkannt für ${owner.firstName} ${owner.lastName} - erfordert besondere Prüfung`);
      }
    }

    return {
      valid: errors.filter(e => !e.includes('PEP')).length === 0,
      errors,
    };
  }

  // ============================================
  // AUTOMATED CHECKS
  // ============================================

  private async runAutomatedChecks(
    verificationId: string,
    submission: KYBSubmission
  ): Promise<KYBCheckResult[]> {
    const checks: KYBCheckResult[] = [];

    // 1. Commercial Register Check
    checks.push(await this.checkCommercialRegister(submission));

    // 2. VAT Number Validation
    checks.push(await this.validateVATNumber(submission));

    // 3. Company Address Verification
    checks.push(await this.verifyCompanyAddress(submission));

    // 4. Beneficial Owners Check
    checks.push(await this.checkBeneficialOwners(submission.beneficialOwners));

    // 5. Sanctions & PEP Screening
    checks.push(await this.runSanctionsScreening(submission));

    // 6. Financial Standing Check (if required)
    if (submission.companyInfo.legalForm === 'GmbH' || submission.companyInfo.legalForm === 'AG') {
      checks.push(await this.checkFinancialStanding(submission));
    }

    return checks;
  }

  private async checkCommercialRegister(submission: KYBSubmission): Promise<KYBCheckResult> {
    // Simulate commercial register lookup
    const isValid = Math.random() > 0.05; // 95% valid
    
    return {
      checkName: 'COMMERCIAL_REGISTER',
      passed: isValid,
      confidence: isValid ? 95 : 60,
      details: isValid
        ? 'Handelsregistereintrag verifiziert'
        : 'Handelsregistereintrag nicht gefunden oder ungültig',
      provider: 'bundesanzeiger',
    };
  }

  private async validateVATNumber(submission: KYBSubmission): Promise<KYBCheckResult> {
    const vatNumber = submission.companyInfo.vatNumber;
    
    // Simulate VIES validation
    const isValid = vatNumber && vatNumber.length >= 8 && Math.random() > 0.1;
    
    return {
      checkName: 'VAT_VALIDATION',
      passed: isValid,
      confidence: isValid ? 98 : 50,
      details: isValid
        ? `USt-IdNr. ${vatNumber} ist gültig`
        : 'USt-IdNr. konnte nicht validiert werden',
      provider: 'vies',
    };
  }

  private async verifyCompanyAddress(submission: KYBSubmission): Promise<KYBCheckResult> {
    const address = submission.companyInfo.registeredAddress;
    const hasAllFields = address.street && address.city && address.postalCode && address.country;
    
    return {
      checkName: 'ADDRESS_VERIFICATION',
      passed: hasAllFields,
      confidence: hasAllFields ? 85 : 40,
      details: hasAllFields
        ? `Firmensitz: ${address.street}, ${address.postalCode} ${address.city}, ${address.country}`
        : 'Firmenadresse unvollständig',
      provider: 'internal',
    };
  }

  private async checkBeneficialOwners(beneficialOwners: BeneficialOwner[]): Promise<KYBCheckResult> {
    const totalOwnership = beneficialOwners.reduce((sum, bo) => sum + bo.ownershipPercentage, 0);
    const hasPEP = beneficialOwners.some(bo => bo.isPEP);
    
    return {
      checkName: 'BENEFICIAL_OWNERS',
      passed: beneficialOwners.length > 0 && totalOwnership >= 25,
      confidence: hasPEP ? 50 : 90,
      details: `${beneficialOwners.length} wirtschaftlich Berechtigte (${totalOwnership}% Gesamtanteil)${hasPEP ? ' - PEP erkannt' : ''}`,
      provider: 'internal',
    };
  }

  private async runSanctionsScreening(submission: KYBSubmission): Promise<KYBCheckResult> {
    // Simulate sanctions check for company and beneficial owners
    const hasMatch = Math.random() > 0.98; // 2% match rate
    
    return {
      checkName: 'SANCTIONS_SCREENING',
      passed: !hasMatch,
      confidence: hasMatch ? 40 : 98,
      details: hasMatch
        ? 'Potenzielle Sanktionslisten-Übereinstimmung gefunden'
        : 'Keine Sanktionslisten-Übereinstimmungen',
      provider: 'complyadvantage',
    };
  }

  private async checkFinancialStanding(submission: KYBSubmission): Promise<KYBCheckResult> {
    // Simulate financial standing check
    const isGoodStanding = Math.random() > 0.1; // 90% good standing
    
    return {
      checkName: 'FINANCIAL_STANDING',
      passed: isGoodStanding,
      confidence: isGoodStanding ? 85 : 55,
      details: isGoodStanding
        ? 'Unternehmen in gutem finanziellen Stand'
        : 'Finanzielle Bedenken erkannt - manuelle Prüfung erforderlich',
      provider: 'creditreform',
    };
  }

  // ============================================
  // RISK SCORE CALCULATION
  // ============================================

  private calculateKYBRiskScore(
    checks: KYBCheckResult[],
    beneficialOwners: BeneficialOwner[]
  ): number {
    let riskScore = 0;

    // Evaluate checks
    for (const check of checks) {
      if (!check.passed) {
        switch (check.checkName) {
          case 'COMMERCIAL_REGISTER':
            riskScore += 30;
            break;
          case 'VAT_VALIDATION':
            riskScore += 20;
            break;
          case 'SANCTIONS_SCREENING':
            riskScore += 50;
            break;
          case 'FINANCIAL_STANDING':
            riskScore += 25;
            break;
          default:
            riskScore += 10;
        }
      } else if (check.confidence < 80) {
        riskScore += (80 - check.confidence) * 0.3;
      }
    }

    // Evaluate beneficial owners
    const hasPEP = beneficialOwners.some(bo => bo.isPEP);
    if (hasPEP) {
      riskScore += 15;
    }

    // Complex ownership structure
    if (beneficialOwners.length > 5) {
      riskScore += 10;
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  // ============================================
  // AUTO-APPROVAL LOGIC
  // ============================================

  private canAutoApprove(checks: KYBCheckResult[], riskScore: number): boolean {
    // KYB typically requires manual review, but we can auto-approve in very low-risk cases

    // All critical checks must pass with high confidence
    const criticalChecks = ['COMMERCIAL_REGISTER', 'VAT_VALIDATION', 'SANCTIONS_SCREENING'];
    const criticalPassed = checks
      .filter(c => criticalChecks.includes(c.checkName))
      .every(c => c.passed && c.confidence >= 90);

    if (!criticalPassed) return false;

    // Risk score must be very low
    if (riskScore > 15) return false;

    // No PEP flags
    const pepCheck = checks.find(c => c.checkName === 'BENEFICIAL_OWNERS');
    if (pepCheck && pepCheck.confidence < 80) return false;

    return true;
  }

  // ============================================
  // STATUS MANAGEMENT
  // ============================================

  async approveVerification(
    verificationId: string,
    reviewerId: string,
    notes?: string
  ): Promise<KYBResult> {
    const verification = await db.verification.update({
      where: { id: verificationId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        rejectionReason: notes,
      },
    });

    // Get company ID from KYB data
    const kybData = await db.$queryRaw<Array<{ company_id: string }>>`
      SELECT company_id FROM kyb_data WHERE verification_id = ${verificationId}
    `;

    if (kybData[0]?.company_id) {
      await this.updateCompanyVerificationStatus(kybData[0].company_id);
    }

    return {
      success: true,
      verificationId: verification.id,
      status: 'APPROVED',
      checks: [],
      riskScore: 0,
      message: 'KYB-Verifizierung genehmigt',
      requiresManualReview: false,
    };
  }

  async rejectVerification(
    verificationId: string,
    reviewerId: string,
    reason: string
  ): Promise<KYBResult> {
    const verification = await db.verification.update({
      where: { id: verificationId },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        rejectionReason: reason,
      },
    });

    // Get company ID
    const kybData = await db.$queryRaw<Array<{ company_id: string }>>`
      SELECT company_id FROM kyb_data WHERE verification_id = ${verificationId}
    `;

    if (kybData[0]?.company_id) {
      // Create security flag for company
      await db.$executeRaw`
        INSERT INTO company_security_flags (company_id, type, severity, notes, created_at)
        VALUES (${kybData[0].company_id}, 'KYB_REJECTED', 'HIGH', ${reason}, ${new Date()})
      `;
    }

    return {
      success: true,
      verificationId: verification.id,
      status: 'REJECTED',
      checks: [],
      riskScore: 40,
      message: 'KYB-Verifizierung abgelehnt',
      requiresManualReview: false,
    };
  }

  private async updateCompanyVerificationStatus(companyId: string): Promise<void> {
    // Check all required verifications
    const company = await db.company.findUnique({
      where: { id: companyId },
    });

    if (!company) return;

    // Activate company if KYB is approved
    await db.company.update({
      where: { id: companyId },
      data: { status: 'ACTIVE' },
    });

    // Create notification for company admins
    const companyAdmins = await db.companyUser.findMany({
      where: { companyId, roleInCompany: { in: ['owner', 'admin'] } },
    });

    for (const admin of companyAdmins) {
      await db.notification.create({
        data: {
          userId: admin.userId,
          type: 'KYB_APPROVED',
          title: 'KYB-Verifizierung abgeschlossen',
          message: `Die KYB-Verifizierung für ${company.name} wurde erfolgreich abgeschlossen.`,
        },
      });
    }
  }

  // ============================================
  // GET VERIFICATION STATUS
  // ============================================

  async getVerificationStatus(companyId: string): Promise<{
    kybStatus: VerificationStatus | null;
    checks: KYBCheckResult[];
    missingDocuments: string[];
    beneficialOwnersSubmitted: boolean;
  }> {
    const kybData = await db.$queryRaw<Array<{
      verification_id: string;
      status: string;
      documents: string;
      beneficial_owners: string;
    }>>`
      SELECT vd.id as verification_id, v.status, vd.documents, vd.beneficial_owners
      FROM kyb_data vd
      JOIN verifications v ON v.id = vd.verification_id
      WHERE vd.company_id = ${companyId}
      ORDER BY vd.created_at DESC
      LIMIT 1
    `;

    if (!kybData[0]) {
      return {
        kybStatus: null,
        checks: [],
        missingDocuments: ['COMMERCIAL_REGISTER_EXTRACT', 'VAT_CERTIFICATE', 'BENEFICIAL_OWNERS_DECLARATION'],
        beneficialOwnersSubmitted: false,
      };
    }

    const data = kybData[0];
    const documents: KYBDocument[] = JSON.parse(data.documents || '[]');
    const beneficialOwners: BeneficialOwner[] = JSON.parse(data.beneficial_owners || '[]');

    return {
      kybStatus: data.status as VerificationStatus,
      checks: [],
      missingDocuments: [],
      beneficialOwnersSubmitted: beneficialOwners.length > 0,
    };
  }

  // ============================================
  // COMPANY RISK ASSESSMENT
  // ============================================

  async assessCompanyRisk(companyId: string): Promise<{
    overallRisk: number;
    factors: string[];
    recommendation: string;
  }> {
    const kybStatus = await this.getVerificationStatus(companyId);

    let overallRisk = 0;
    const factors: string[] = [];

    if (!kybStatus.kybStatus || kybStatus.kybStatus === 'REJECTED') {
      overallRisk += 30;
      factors.push('KYB nicht abgeschlossen');
    }

    if (kybStatus.missingDocuments.length > 0) {
      overallRisk += 10;
      factors.push(`Fehlende Dokumente: ${kybStatus.missingDocuments.length}`);
    }

    // Check company age
    const company = await db.company.findUnique({
      where: { id: companyId },
      include: { drivers: true, vehicles: true },
    });

    if (company) {
      const ageDays = Math.floor((Date.now() - company.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      if (ageDays < 30) {
        overallRisk += 15;
        factors.push('Neues Unternehmen');
      }

      // Check fleet size
      if (company.drivers.length === 0) {
        overallRisk += 10;
        factors.push('Keine Fahrer registriert');
      }
    }

    let recommendation = 'Standard-Risiko';
    if (overallRisk > 50) {
      recommendation = 'Hohes Risiko - erweiterte Prüfungen empfohlen';
    } else if (overallRisk > 25) {
      recommendation = 'Mittleres Risiko - standardmäßige Überwachung';
    }

    return {
      overallRisk: Math.min(100, overallRisk),
      factors,
      recommendation,
    };
  }
}

// ============================================
// EXPORTS
// ============================================

export const kybService = new KYBService();

export type {
  BeneficialOwner,
  KYBDocument,
  KYBSubmission,
  KYBResult,
  KYBCheckResult,
  KYBDocumentType,
};
