/**
 * CargoBit Admin Refund DTOs
 * 
 * Data Transfer Objects for refund operations.
 * Supports full, partial, and platform-fee-only refunds.
 */

// ============================================
// REFUND REQUEST DTO
// ============================================

/**
 * Request DTO for creating a refund
 */
export class RefundRequestDto {
  /**
   * Job/Transport ID to refund
   */
  job_id: string;

  /**
   * Refund type
   * - full: Refund entire payment amount
   * - partial: Refund specific amount
   * - platform_fee_only: Refund only the platform fee
   */
  type: 'full' | 'partial' | 'platform_fee_only';

  /**
   * Amount in EUR (required for partial refunds)
   */
  amount_eur?: number;

  /**
   * Reason for the refund
   */
  reason: string;

  /**
   * Validate the DTO
   */
  validate(): string[] {
    const errors: string[] = [];

    if (!this.job_id) {
      errors.push('job_id ist erforderlich');
    }

    if (!this.type) {
      errors.push('type ist erforderlich');
    } else if (!['full', 'partial', 'platform_fee_only'].includes(this.type)) {
      errors.push('type muss sein: full, partial, oder platform_fee_only');
    }

    if (!this.reason) {
      errors.push('reason ist erforderlich');
    } else if (this.reason.length < 5) {
      errors.push('reason muss mindestens 5 Zeichen haben');
    }

    if (this.type === 'partial') {
      if (!this.amount_eur || this.amount_eur <= 0) {
        errors.push('amount_eur ist für partial Refund erforderlich und muss > 0 sein');
      }
    }

    return errors;
  }

  /**
   * Create from plain object
   */
  static fromObject(obj: Record<string, unknown>): RefundRequestDto {
    const dto = new RefundRequestDto();
    dto.job_id = String(obj.job_id || obj.jobId || '');
    dto.type = String(obj.type || 'full') as 'full' | 'partial' | 'platform_fee_only';
    dto.amount_eur = obj.amount_eur !== undefined ? Number(obj.amount_eur) : obj.amountEur !== undefined ? Number(obj.amountEur) : undefined;
    dto.reason = String(obj.reason || '');
    return dto;
  }
}

// ============================================
// REFUND RESPONSE DTO
// ============================================

/**
 * Response DTO for refund creation
 */
export class RefundResponseDto {
  /**
   * Status of the refund operation
   */
  status: 'refund_initiated' | 'refund_succeeded' | 'refund_failed';

  /**
   * Internal refund ID
   */
  refund_id: string;

  /**
   * Stripe refund ID
   */
  stripe_refund_id?: string;

  /**
   * Refund amount in cents
   */
  amount_cents: number;

  /**
   * Refund amount in EUR
   */
  amount_eur: number;

  /**
   * Currency code
   */
  currency: string;

  /**
   * Current refund status
   */
  refund_status: 'PENDING' | 'SUCCEEDED' | 'FAILED';

  /**
   * Admin who processed the refund
   */
  processed_by?: {
    id: string;
    email: string;
    role: string;
  };
}

// ============================================
// REFUND CALCULATION DTO
// ============================================

/**
 * Response DTO for refund calculation preview
 */
export class RefundCalculationDto {
  /**
   * Job ID
   */
  job_id: string;

  /**
   * Current payment status
   */
  payment_status: string;

  /**
   * Total amount paid in EUR
   */
  total_paid_eur: number;

  /**
   * Platform fee in EUR
   */
  platform_fee_eur: number;

  /**
   * Transporter amount in EUR
   */
  transporter_amount_eur: number;

  /**
   * Already refunded amount in EUR
   */
  already_refunded_eur: number;

  /**
   * Maximum refundable amount in EUR
   */
  max_refundable_eur: number;

  /**
   * Detailed breakdown in cents
   */
  breakdown_cents: {
    total_paid_cents: number;
    platform_fee_cents: number;
    transporter_amount_cents: number;
    already_refunded_cents: number;
    max_refundable_cents: number;
  };
}

// ============================================
// REFUND ENTRY DTO
// ============================================

/**
 * DTO for a single refund entry in payment detail
 */
export class RefundEntryDto {
  /**
   * Internal refund ID
   */
  id: string;

  /**
   * Stripe refund ID
   */
  stripe_refund_id?: string;

  /**
   * Refund amount in cents
   */
  amount_cents: number;

  /**
   * Refund amount in EUR
   */
  amount_eur: number;

  /**
   * Reason for the refund
   */
  reason: string;

  /**
   * Current status
   */
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';

  /**
   * When the refund was created
   */
  created_at: string;

  /**
   * When the refund was processed
   */
  processed_at?: string;

  /**
   * Admin who initiated the refund
   */
  initiated_by?: string;
}
