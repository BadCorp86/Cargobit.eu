/**
 * CargoBit Admin Payment DTOs
 * 
 * Data Transfer Objects for admin payment endpoints.
 * Includes Summary (List) and Detail views with all related data.
 */

// ============================================
// PAYMENT SUMMARY DTO (List View)
// ============================================

/**
 * Payment Summary DTO for list view
 * Used in GET /api/admin/payments
 */
export class PaymentSummaryDto {
  /**
   * Payment ID
   */
  id: string;

  /**
   * Job/Transport ID this payment is for
   */
  job_id: string;

  /**
   * Shipper user ID
   */
  shipper_id: string;

  /**
   * Shipper display name
   */
  shipper_name: string;

  /**
   * Shipper email
   */
  shipper_email: string;

  /**
   * Transporter user ID (if assigned)
   */
  transporter_id?: string;

  /**
   * Transporter display name
   */
  transporter_name?: string;

  /**
   * Stripe Payment Intent ID
   */
  payment_intent_id: string;

  /**
   * Stripe Charge ID
   */
  charge_id?: string;

  /**
   * Payment amount in cents
   */
  amount_cents: number;

  /**
   * Payment amount in EUR
   */
  amount_eur: number;

  /**
   * Currency code (EUR)
   */
  currency: string;

  /**
   * Platform fee in cents
   */
  platform_fee_cents: number;

  /**
   * Transporter amount in cents
   */
  transporter_amount_cents?: number;

  /**
   * Refunded amount in cents
   */
  refunded_cents: number;

  /**
   * Refunded amount in EUR
   */
  refunded_eur: number;

  /**
   * Payment status
   */
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'PARTIAL_REFUNDED' | 'CANCELLED';

  /**
   * Payment creation timestamp
   */
  created_at: string;

  /**
   * Payment success timestamp
   */
  paid_at?: string;

  /**
   * Payment failure timestamp
   */
  failed_at?: string;
}

/**
 * Payment List Response DTO
 */
export class PaymentListResponseDto {
  /**
   * List of payment summaries
   */
  items: PaymentSummaryDto[];

  /**
   * Total count of matching payments
   */
  total: number;

  /**
   * Current page limit
   */
  limit: number;

  /**
   * Current page offset
   */
  offset: number;

  /**
   * Whether more results exist
   */
  has_more: boolean;
}

// ============================================
// REFUND ENTRY DTO
// ============================================

/**
 * Refund Entry DTO for payment detail
 */
export class RefundEntryDto {
  /**
   * Refund ID
   */
  id: string;

  /**
   * Stripe Refund ID
   */
  refund_id: string;

  /**
   * Refund amount in cents
   */
  amount_cents: number;

  /**
   * Refund amount in EUR
   */
  amount_eur: number;

  /**
   * Refund reason
   */
  reason: string;

  /**
   * Refund status
   */
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';

  /**
   * Refund creation timestamp
   */
  created_at: string;

  /**
   * Refund processing timestamp
   */
  processed_at?: string;
}

// ============================================
// WALLET TRANSACTION DTO
// ============================================

/**
 * Wallet Transaction DTO for payment detail
 */
export class WalletTransactionDto {
  /**
   * Transaction ID
   */
  id: string;

  /**
   * Wallet ID
   */
  wallet_id: string;

  /**
   * Wallet owner type
   */
  wallet_owner_type: 'shipper' | 'transporter' | 'company' | 'platform';

  /**
   * Transaction type
   */
  type: 'DEPOSIT' | 'PAYOUT' | 'FEE' | 'COMMISSION' | 'PAYMENT_IN' | 'PAYMENT_OUT' | 'REFUND';

  /**
   * Transaction amount
   */
  amount: number;

  /**
   * Currency code
   */
  currency: string;

  /**
   * Transaction description
   */
  description?: string;

  /**
   * Transaction timestamp
   */
  created_at: string;
}

// ============================================
// AUDIT ENTRY DTO
// ============================================

/**
 * Audit Entry DTO for payment detail
 */
export class AuditEntryDto {
  /**
   * Audit event ID
   */
  id: string;

  /**
   * Event type (created, status_change, refund, etc.)
   */
  event_type: string;

  /**
   * Previous status
   */
  old_status?: string;

  /**
   * New status
   */
  new_status?: string;

  /**
   * Admin who performed the action
   */
  admin?: {
    id: string;
    email: string;
  };

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;

  /**
   * Event timestamp
   */
  created_at: string;
}

// ============================================
// USER INFO DTO
// ============================================

/**
 * User Info DTO for payment detail
 */
export class UserInfoDto {
  /**
   * User ID
   */
  id: string;

  /**
   * Display name
   */
  name: string;

  /**
   * Email address
   */
  email: string;
}

// ============================================
// PAYMENT DETAIL DTO
// ============================================

/**
 * Payment Detail DTO for individual payment view
 * Used in GET /api/admin/payments/{id}
 */
export class PaymentDetailDto {
  // ============================================
  // BASIC INFO
  // ============================================

  /**
   * Payment ID
   */
  id: string;

  /**
   * Stripe Payment Intent ID
   */
  payment_intent_id: string;

  /**
   * Stripe Charge ID
   */
  charge_id?: string;

  /**
   * Job/Transport ID
   */
  job_id: string;

  /**
   * Currency code
   */
  currency: string;

  /**
   * Payment status
   */
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'PARTIAL_REFUNDED' | 'CANCELLED';

  /**
   * Payment description
   */
  description?: string;

  /**
   * Payment metadata
   */
  metadata?: Record<string, unknown>;

  // ============================================
  // AMOUNTS
  // ============================================

  /**
   * Total payment amount in cents
   */
  amount_cents: number;

  /**
   * Total payment amount in EUR
   */
  amount_eur: number;

  /**
   * Platform fee in cents
   */
  platform_fee_cents: number;

  /**
   * Platform fee in EUR
   */
  platform_fee_eur: number;

  /**
   * Transporter amount in cents
   */
  transporter_amount_cents?: number;

  /**
   * Transporter amount in EUR
   */
  transporter_amount_eur?: number;

  /**
   * Total refunded amount in cents
   */
  refunded_cents: number;

  /**
   * Total refunded amount in EUR
   */
  refunded_eur: number;

  /**
   * Refundable amount in cents
   */
  refundable_cents: number;

  /**
   * Refundable amount in EUR
   */
  refundable_eur: number;

  // ============================================
  // PEOPLE
  // ============================================

  /**
   * Shipper info
   */
  shipper: UserInfoDto;

  /**
   * Transporter info (if assigned)
   */
  transporter?: UserInfoDto;

  // ============================================
  // TIMESTAMPS
  // ============================================

  /**
   * Creation timestamp
   */
  created_at: string;

  /**
   * Payment success timestamp
   */
  paid_at?: string;

  /**
   * Payment failure timestamp
   */
  failed_at?: string;

  /**
   * Payment cancellation timestamp
   */
  cancelled_at?: string;

  // ============================================
  // RELATED DATA
  // ============================================

  /**
   * List of refunds
   */
  refunds: RefundEntryDto[];

  /**
   * List of wallet transactions
   */
  wallet_transactions: WalletTransactionDto[];

  /**
   * Audit trail
   */
  audit_trail: AuditEntryDto[];
}

// ============================================
// QUERY PARAMS DTO
// ============================================

/**
 * Payment List Query Parameters
 */
export class PaymentListQueryDto {
  /**
   * Filter by status
   */
  status?: string;

  /**
   * Filter by shipper ID
   */
  shipperId?: string;

  /**
   * Filter by job ID
   */
  jobId?: string;

  /**
   * Search by payment intent, charge ID, etc.
   */
  search?: string;

  /**
   * Date range start (ISO string)
   */
  from?: string;

  /**
   * Date range end (ISO string)
   */
  to?: string;

  /**
   * Page limit (default: 100)
   */
  limit?: number;

  /**
   * Page offset (default: 0)
   */
  offset?: number;
}
