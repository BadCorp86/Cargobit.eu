/**
 * CargoBit Payout DTOs
 * 
 * Data Transfer Objects for the Payout system.
 * Used by Admin API routes for payout management.
 */

import { PayoutStatus } from '@prisma/client';

// ============================================
// CREATE PAYOUT DTO
// ============================================

export interface PayoutCreateDto {
  /** User ID receiving the payout */
  userId: string;
  
  /** Amount in cents (minimum 1) */
  amountCents: number;
  
  /** Currency code (default: EUR) */
  currency?: string;
  
  /** Optional idempotency key for deduplication */
  idempotencyKey?: string;
  
  /** Optional description/notes */
  description?: string;
}

export function validatePayoutCreateDto(dto: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!dto || typeof dto !== 'object') {
    return { valid: false, errors: ['Invalid request body'] };
  }
  
  const body = dto as Record<string, unknown>;
  
  // userId validation
  if (!body.userId || typeof body.userId !== 'string') {
    errors.push('userId is required and must be a string');
  }
  
  // amountCents validation
  if (typeof body.amountCents !== 'number' || body.amountCents < 1) {
    errors.push('amountCents is required and must be a positive number');
  }
  
  // currency validation (optional)
  if (body.currency && typeof body.currency !== 'string') {
    errors.push('currency must be a string');
  }
  
  // idempotencyKey validation (optional)
  if (body.idempotencyKey && typeof body.idempotencyKey !== 'string') {
    errors.push('idempotencyKey must be a string');
  }
  
  return { valid: errors.length === 0, errors };
}

// ============================================
// PAYOUT SUMMARY DTO
// ============================================

export interface PayoutSummaryDto {
  id: string;
  userId: string;
  amountCents: number;
  currency: string;
  status: PayoutStatus;
  createdAt: Date;
  stripeTransferId?: string | null;
}

export function toPayoutSummaryDto(payout: {
  id: string;
  userId: string;
  amountCents: number;
  currency: string;
  status: PayoutStatus;
  createdAt: Date;
  stripeTransferId?: string | null;
}): PayoutSummaryDto {
  return {
    id: payout.id,
    userId: payout.userId,
    amountCents: payout.amountCents,
    currency: payout.currency,
    status: payout.status,
    createdAt: payout.createdAt,
    stripeTransferId: payout.stripeTransferId,
  };
}

// ============================================
// PAYOUT DETAIL DTO
// ============================================

export interface PayoutDetailDto extends PayoutSummaryDto {
  stripeAccountId?: string | null;
  failureReason?: string | null;
  failureCode?: string | null;
  idempotencyKey?: string | null;
  initiatedBy?: string | null;
  processedBy?: string | null;
  walletTransactionId?: string | null;
  processedAt?: Date | null;
  failedAt?: Date | null;
  cancelledAt?: Date | null;
  updatedAt: Date;
  walletTransactions?: WalletTransactionDto[];
  auditTrail?: PayoutAuditEventDto[];
}

export interface WalletTransactionDto {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description?: string | null;
  reference?: string | null;
  processedAt?: Date | null;
  createdAt: Date;
}

export interface PayoutAuditEventDto {
  id: string;
  eventType: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  adminId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export function toPayoutDetailDto(
  payout: {
    id: string;
    userId: string;
    amountCents: number;
    currency: string;
    status: PayoutStatus;
    stripeTransferId?: string | null;
    stripeAccountId?: string | null;
    failureReason?: string | null;
    failureCode?: string | null;
    idempotencyKey?: string | null;
    initiatedBy?: string | null;
    processedBy?: string | null;
    walletTransactionId?: string | null;
    processedAt?: Date | null;
    failedAt?: Date | null;
    cancelledAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    auditEvents?: Array<{
      id: string;
      eventType: string;
      oldStatus?: string | null;
      newStatus?: string | null;
      adminId?: string | null;
      metadata?: string | null;
      createdAt: Date;
    }>;
  },
  walletTransactions?: Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    description?: string | null;
    reference?: string | null;
    processedAt?: Date | null;
    createdAt: Date;
  }>
): PayoutDetailDto {
  return {
    id: payout.id,
    userId: payout.userId,
    amountCents: payout.amountCents,
    currency: payout.currency,
    status: payout.status,
    stripeTransferId: payout.stripeTransferId,
    stripeAccountId: payout.stripeAccountId,
    failureReason: payout.failureReason,
    failureCode: payout.failureCode,
    idempotencyKey: payout.idempotencyKey,
    initiatedBy: payout.initiatedBy,
    processedBy: payout.processedBy,
    walletTransactionId: payout.walletTransactionId,
    processedAt: payout.processedAt,
    failedAt: payout.failedAt,
    cancelledAt: payout.cancelledAt,
    createdAt: payout.createdAt,
    updatedAt: payout.updatedAt,
    walletTransactions: walletTransactions?.map(wt => ({
      id: wt.id,
      type: wt.type,
      amount: wt.amount,
      currency: wt.currency,
      description: wt.description,
      reference: wt.reference,
      processedAt: wt.processedAt,
      createdAt: wt.createdAt,
    })),
    auditTrail: payout.auditEvents?.map(ae => ({
      id: ae.id,
      eventType: ae.eventType,
      oldStatus: ae.oldStatus,
      newStatus: ae.newStatus,
      adminId: ae.adminId,
      metadata: ae.metadata ? JSON.parse(ae.metadata) : null,
      createdAt: ae.createdAt,
    })),
  };
}

// ============================================
// PAYOUT LIST QUERY DTO
// ============================================

export interface PayoutListQueryDto {
  /** Filter by status */
  status?: PayoutStatus;
  
  /** Filter by user ID */
  userId?: string;
  
  /** Result limit (default: 100, max: 1000) */
  limit?: number;
  
  /** Result offset for pagination */
  offset?: number;
  
  /** Sort order (default: desc) */
  order?: 'asc' | 'desc';
}

export function parsePayoutListQuery(query: Record<string, unknown>): PayoutListQueryDto {
  return {
    status: typeof query.status === 'string' ? (query.status as PayoutStatus) : undefined,
    userId: typeof query.userId === 'string' ? query.userId : undefined,
    limit: Math.min(Math.max(Number(query.limit) || 100, 1), 1000),
    offset: Math.max(Number(query.offset) || 0, 0),
    order: query.order === 'asc' ? 'asc' : 'desc',
  };
}

// ============================================
// PAYOUT RESULT DTOs
// ============================================

export interface PayoutCreateResultDto {
  success: boolean;
  payout?: PayoutSummaryDto;
  error?: string;
  duplicate?: boolean;
}

export interface PayoutListResultDto {
  payouts: PayoutSummaryDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface PayoutRetryResultDto {
  success: boolean;
  payout?: PayoutSummaryDto;
  error?: string;
}
