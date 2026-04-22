/**
 * CargoBit Admin API DTOs
 * 
 * TypeScript type definitions for all Admin API endpoints.
 * Matches OpenAPI spec: /download/openapi-admin-api.yaml
 */

// ============================================
// COMMON TYPES
// ============================================

export type AdminRole = 'ADMIN' | 'FINANCE' | 'SUPPORT';

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'PARTIAL_REFUNDED' | 'REFUNDED' | 'FAILED';

export type PaymentType = 'CARD' | 'BANK_TRANSFER' | 'WALLET';

export type RefundType = 'FULL' | 'PARTIAL' | 'PLATFORM_FEE_ONLY';

export type RefundStatus = 'PENDING' | 'PROCESSED' | 'FAILED';

export type DisputeStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type TransactionType = 'DEPOSIT' | 'PAYOUT' | 'FEE' | 'COMMISSION' | 'PAYMENT_IN' | 'PAYMENT_OUT' | 'REFUND';

export type WalletOwnerType = 'platform' | 'transporter' | 'shipper' | 'company';

// ============================================
// ERROR RESPONSE
// ============================================

export interface ErrorResponse {
  error: string;
  message?: string;
  details?: Record<string, unknown>;
}

// ============================================
// AUTH DTOs
// ============================================

export interface AdminLoginStep1Request {
  email: string;
  password: string;
}

export interface AdminLoginStep1Response {
  requires_2fa: boolean;
  email: string;
}

export interface AdminLoginStep2Request {
  email: string;
  code: string;
}

export interface AdminLoginTokenResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
  admin: AdminUserDTO;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qr_code_url: string;
  backup_codes: string[];
}

// ============================================
// ADMIN USER DTOs
// ============================================

export interface AdminUserDTO {
  id: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
  is_2fa_enabled: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface CreateAdminUserRequest {
  email: string;
  password: string;
  role: AdminRole;
}

export interface UpdateAdminUserRequest {
  role?: AdminRole;
  is_active?: boolean;
}

// ============================================
// PAYMENT DTOs
// ============================================

export interface PaymentSummaryDTO {
  id: string;
  job_id: string;
  bid_id?: string;
  shipper_id: string;
  shipper_name: string;
  shipper_email: string;
  transporter_id?: string;
  transporter_name?: string;
  payment_intent_id: string;
  charge_id?: string | null;
  amount_cents: number;
  amount_eur: number;
  currency: string;
  platform_fee_cents: number;
  transporter_amount_cents: number;
  refunded_cents: number;
  status: PaymentStatus;
  payment_type: PaymentType;
  created_at: string;
  succeeded_at?: string | null;
}

export interface PaymentListResponse {
  items: PaymentSummaryDTO[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface PaymentDetailDTO {
  id: string;
  job_id: string;
  bid_id?: string;
  payment_intent_id: string;
  charge_id?: string | null;
  amount_cents: number;
  amount_eur: number;
  currency: string;
  platform_fee_cents: number;
  platform_fee_eur: number;
  transporter_amount_cents: number;
  transporter_amount_eur: number;
  refunded_cents: number;
  refunded_eur: number;
  status: PaymentStatus;
  payment_type: PaymentType;
  stripe_customer_id?: string | null;
  
  shipper: {
    id: string;
    name: string;
    email: string;
  };
  
  transporter?: {
    id: string;
    name: string;
    email: string;
  } | null;
  
  job_status: string;
  
  created_at: string;
  succeeded_at?: string | null;
  failed_at?: string | null;
  failed_reason?: string | null;
  
  refunds: RefundDTO[];
  wallet_transactions: WalletTransactionDTO[];
  audit_trail: AuditEntryDTO[];
}

// ============================================
// REFUND DTOs
// ============================================

export interface RefundDTO {
  id: string;
  refund_id: string;
  amount_cents: number;
  amount_eur: number;
  shipper_refund_cents: number;
  shipper_refund_eur: number;
  platform_fee_refund_cents: number;
  platform_fee_refund_eur: number;
  transporter_debit_cents: number;
  transporter_debit_eur: number;
  refund_type: RefundType;
  status: RefundStatus;
  reason?: string | null;
  created_at: string;
  processed_at?: string | null;
}

export interface RefundRequest {
  jobId: string;
  type: 'full' | 'partial' | 'platform_fee_only';
  amountEur?: number | null;
  reason: string;
}

export interface RefundResponse {
  status: string;
  refund_id: string;
  stripe_refund_id?: string;
  amount_cents: number;
  amount_eur: number;
  currency: string;
  refund_status: string;
  processed_by?: {
    id: string;
    email: string;
    role: AdminRole;
  };
}

export interface RefundCalculationResponse {
  job_id: string;
  payment_status?: string;
  total_paid_eur: number;
  platform_fee_eur: number;
  transporter_amount_eur: number;
  already_refunded_eur: number;
  max_refundable_eur: number;
  breakdown_cents: {
    total_paid_cents: number;
    platform_fee_cents: number;
    transporter_amount_cents: number;
    already_refunded_cents: number;
    max_refundable_cents: number;
  };
}

// ============================================
// WALLET TRANSACTION DTO
// ============================================

export interface WalletTransactionDTO {
  id: string;
  wallet_owner_type: WalletOwnerType;
  wallet_owner_id?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description?: string | null;
  created_at: string;
}

// ============================================
// AUDIT ENTRY DTO
// ============================================

export interface AuditEntryDTO {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  data_after?: Record<string, unknown> | null;
  created_at: string;
}

// ============================================
// DISPUTE DTOs
// ============================================

export interface DisputeSummaryDTO {
  id: string;
  job_id: string;
  created_by: string;
  reason: string;
  status: DisputeStatus;
  created_at: string;
}

export interface DisputeListResponse {
  items: DisputeSummaryDTO[];
  total: number;
}

export interface DisputeMessageDTO {
  id?: string;
  sender: 'admin' | 'support' | 'user';
  sender_id?: string;
  message: string;
  created_at: string;
}

export interface DisputeDetailDTO {
  id: string;
  job_id: string;
  created_by: string;
  reason: string;
  status: DisputeStatus;
  resolution?: string | null;
  refund_amount_cents?: number | null;
  created_at: string;
  resolved_at?: string | null;
  messages: DisputeMessageDTO[];
}

export interface ResolveDisputeRequest {
  action: 'refund_full' | 'refund_partial' | 'reject';
  resolution: string;
  refund_amount_eur?: number | null;
}

// ============================================
// API QUERY PARAMS
// ============================================

export interface PaymentListParams {
  status?: PaymentStatus;
  shipperId?: string;
  jobId?: string;
  paymentIntentId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface DisputeListParams {
  status?: DisputeStatus;
  limit?: number;
  offset?: number;
}

// ============================================
// EXPORT ALL
// ============================================

export type {
  AdminRole,
  PaymentStatus,
  PaymentType,
  RefundType,
  RefundStatus,
  DisputeStatus,
  TransactionType,
  WalletOwnerType,
  ErrorResponse,
  AdminLoginStep1Request,
  AdminLoginStep1Response,
  AdminLoginStep2Request,
  AdminLoginTokenResponse,
  TwoFactorSetupResponse,
  AdminUserDTO,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  PaymentSummaryDTO,
  PaymentListResponse,
  PaymentDetailDTO,
  RefundDTO,
  RefundRequest,
  RefundResponse,
  RefundCalculationResponse,
  WalletTransactionDTO,
  AuditEntryDTO,
  DisputeSummaryDTO,
  DisputeListResponse,
  DisputeMessageDTO,
  DisputeDetailDTO,
  ResolveDisputeRequest,
  PaymentListParams,
  DisputeListParams,
};
