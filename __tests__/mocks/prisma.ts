/**
 * Mock Prisma Client for Testing
 * 
 * Provides a fully typed mock for Prisma operations
 * that can be configured per-test.
 */

import { PaymentStatus } from '@prisma/client';

// Types for mock data
export interface MockPayment {
  id: string;
  paymentIntentId: string | null;
  chargeId: string | null;
  shipperId: string;
  jobId: string | null;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  refundedCents: number;
  lastReconciledAt: Date | null;
  stripeRefundsJson: string | null;
  paidAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
}

export interface MockWallet {
  id: string;
  ownerUserId: string;
  balance: number;
  currency: string;
  status: string;
  totalDeposited: number;
  totalWithdrawn: number;
}

export interface MockWalletTransaction {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  currency: string;
  paymentId: string | null;
  relatedTransportId: string | null;
  description: string | null;
  reference: string | null;
  processedAt: Date | null;
  createdAt: Date;
}

export interface MockStripeEvent {
  id: string;
  type: string;
  payload: string | null;
  processed: boolean;
  processedAt: Date | null;
  errorCount: number;
  lastError: string | null;
  receivedAt: Date;
  createdAt: Date;
}

export interface MockStripeRefund {
  id: string;
  stripeRefundId: string;
  paymentId: string;
  amountCents: number;
  reason: string | null;
  status: string;
  stripeCreatedAt: Date;
}

export interface MockRefund {
  id: string;
  paymentId: string;
  refundId: string;
  amountCents: number;
  reason: string | null;
  status: string;
  initiatedBy: string;
  processedAt: Date | null;
}

export interface MockNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface MockTransport {
  id: string;
  status: string;
  assignedAt: Date | null;
}

export interface MockPaymentAuditEvent {
  id: string;
  paymentId: string;
  eventType: string;
  oldStatus: string | null;
  newStatus: string;
  metadata: string | null;
  createdAt: Date;
}

// Mock data stores (can be reset between tests)
export class MockPrismaData {
  payments: MockPayment[] = [];
  wallets: MockWallet[] = [];
  walletTransactions: MockWalletTransaction[] = [];
  stripeEvents: MockStripeEvent[] = [];
  stripeRefunds: MockStripeRefund[] = [];
  refunds: MockRefund[] = [];
  notifications: MockNotification[] = [];
  transports: MockTransport[] = [];
  paymentAuditEvents: MockPaymentAuditEvent[] = [];
  auditLogs: any[] = [];

  reset() {
    this.payments = [];
    this.wallets = [];
    this.walletTransactions = [];
    this.stripeEvents = [];
    this.stripeRefunds = [];
    this.refunds = [];
    this.notifications = [];
    this.transports = [];
    this.paymentAuditEvents = [];
    this.auditLogs = [];
  }
}

// Singleton for mock data
export const mockData = new MockPrismaData();

// Helper to generate IDs
let idCounter = 0;
export function generateId(prefix = ''): string {
  idCounter++;
  return `${prefix}${idCounter.toString().padStart(8, '0')}-${Date.now()}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

// Create the mock prisma client
export const mockPrisma = {
  // Payment operations
  payment: {
    findFirst: jest.fn(async ({ where }: any) => {
      return mockData.payments.find(p => {
        if (where.paymentIntentId && p.paymentIntentId !== where.paymentIntentId) return false;
        if (where.chargeId && p.chargeId !== where.chargeId) return false;
        if (where.id && p.id !== where.id) return false;
        return true;
      }) || null;
    }),
    findUnique: jest.fn(async ({ where, include }: any) => {
      const payment = mockData.payments.find(p => p.id === where.id);
      if (!payment) return null;
      if (include?.stripeRefunds) {
        return {
          ...payment,
          stripeRefunds: mockData.stripeRefunds.filter(sr => sr.paymentId === payment.id),
        };
      }
      return payment;
    }),
    findMany: jest.fn(async ({ where, orderBy, take, select }: any) => {
      let results = [...mockData.payments];
      
      // Apply filters
      if (where) {
        if (where.OR) {
          results = results.filter(p => 
            where.OR.some((condition: any) => 
              Object.entries(condition).every(([key, value]) => p[key as keyof MockPayment] === value)
            )
          );
        }
        if (where.chargeId) {
          if (where.chargeId.not === null) {
            results = results.filter(p => p.chargeId !== null);
          }
        }
      }
      
      // Apply ordering
      if (orderBy?.createdAt === 'desc') {
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      
      // Apply limit
      if (take) {
        results = results.slice(0, take);
      }
      
      // Apply select
      if (select) {
        return results.map(p => {
          const selected: any = {};
          for (const key of Object.keys(select)) {
            selected[key] = p[key as keyof MockPayment];
          }
          return selected;
        });
      }
      
      return results;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const index = mockData.payments.findIndex(p => p.id === where.id);
      if (index === -1) throw new Error('Payment not found');
      
      const payment = mockData.payments[index];
      mockData.payments[index] = {
        ...payment,
        ...data,
        // Handle conditional fields explicitly
        status: data.status ?? payment.status,
        refundedCents: data.refundedCents ?? payment.refundedCents,
        chargeId: data.chargeId ?? payment.chargeId,
        paidAt: data.paidAt ?? payment.paidAt,
        failedAt: data.failedAt ?? payment.failedAt,
        lastReconciledAt: data.lastReconciledAt ?? payment.lastReconciledAt,
        stripeRefundsJson: data.stripeRefundsJson ?? payment.stripeRefundsJson,
      };
      
      return mockData.payments[index];
    }),
    create: jest.fn(async ({ data }: any) => {
      const payment: MockPayment = {
        id: generateId('pay_'),
        paymentIntentId: data.paymentIntentId || null,
        chargeId: data.chargeId || null,
        shipperId: data.shipperId,
        jobId: data.jobId || null,
        amountCents: data.amountCents,
        currency: data.currency || 'EUR',
        status: data.status || PaymentStatus.PENDING,
        refundedCents: 0,
        lastReconciledAt: null,
        stripeRefundsJson: null,
        paidAt: null,
        failedAt: null,
        createdAt: new Date(),
        ...data,
      };
      mockData.payments.push(payment);
      return payment;
    }),
    count: jest.fn(async ({ where }: any = {}) => {
      let results = [...mockData.payments];
      if (where) {
        // Handle simple status filter
        if (where.status) {
          results = results.filter(p => p.status === where.status);
        }
        // Handle OR conditions
        if (where.OR) {
          results = results.filter(p => 
            where.OR.some((condition: any) => 
              Object.entries(condition).every(([key, value]) => p[key as keyof MockPayment] === value)
            )
          );
        }
        // Handle chargeId filter
        if (where.chargeId) {
          if (where.chargeId.not === null) {
            results = results.filter(p => p.chargeId !== null);
          }
        }
        // Handle lastReconciledAt filter
        if (where.lastReconciledAt !== undefined) {
          if (where.lastReconciledAt === null) {
            results = results.filter(p => p.lastReconciledAt === null);
          } else if (where.lastReconciledAt.not === null) {
            results = results.filter(p => p.lastReconciledAt !== null);
          }
        }
      }
      return results.length;
    }),
  },

  // Wallet operations
  wallet: {
    findFirst: jest.fn(async ({ where }: any) => {
      return mockData.wallets.find(w => {
        if (where.ownerUserId && w.ownerUserId !== where.ownerUserId) return false;
        return true;
      }) || null;
    }),
    create: jest.fn(async ({ data }: any) => {
      const wallet: MockWallet = {
        id: generateId('wallet_'),
        ownerUserId: data.ownerUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
        ...data,
      };
      mockData.wallets.push(wallet);
      return wallet;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const index = mockData.wallets.findIndex(w => 
        w.id === where.id || w.ownerUserId === where.ownerUserId
      );
      if (index === -1) throw new Error('Wallet not found');
      
      const wallet = mockData.wallets[index];
      if (data.balance?.increment) {
        wallet.balance += data.balance.increment;
      }
      if (data.balance?.decrement) {
        wallet.balance -= data.balance.decrement;
      }
      if (data.totalDeposited?.increment) {
        wallet.totalDeposited += data.totalDeposited.increment;
      }
      if (data.totalWithdrawn?.increment) {
        wallet.totalWithdrawn += data.totalWithdrawn.increment;
      }
      
      return wallet;
    }),
  },

  // WalletTransaction operations
  walletTransaction: {
    findFirst: jest.fn(async ({ where }: any) => {
      return mockData.walletTransactions.find(t => {
        if (where.reference && t.reference !== where.reference) return false;
        return true;
      }) || null;
    }),
    findMany: jest.fn(async ({ where, orderBy, take, skip }: any) => {
      let results = [...mockData.walletTransactions];
      if (where?.walletId) {
        results = results.filter(t => t.walletId === where.walletId);
      }
      if (where?.type) {
        results = results.filter(t => t.type === where.type);
      }
      if (orderBy?.createdAt === 'desc') {
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      if (skip) results = results.slice(skip);
      if (take) results = results.slice(0, take);
      return results;
    }),
    create: jest.fn(async ({ data }: any) => {
      const transaction: MockWalletTransaction = {
        id: generateId('wtx_'),
        walletId: data.walletId,
        type: data.type,
        amount: data.amount,
        currency: data.currency || 'EUR',
        paymentId: data.paymentId || null,
        relatedTransportId: data.relatedTransportId || null,
        description: data.description || null,
        reference: data.reference || null,
        processedAt: data.processedAt || null,
        createdAt: new Date(),
      };
      mockData.walletTransactions.push(transaction);
      return transaction;
    }),
  },

  // StripeEvent operations
  stripeEvent: {
    findUnique: jest.fn(async ({ where }: any) => {
      return mockData.stripeEvents.find(e => e.id === where.id) || null;
    }),
    create: jest.fn(async ({ data }: any) => {
      const existing = mockData.stripeEvents.find(e => e.id === data.id);
      if (existing) {
        const error: any = new Error('Unique constraint violation');
        error.code = 'P2002';
        throw error;
      }
      const event: MockStripeEvent = {
        id: data.id,
        type: data.type,
        payload: data.payload || null,
        processed: data.processed ?? false,
        processedAt: null,
        errorCount: 0,
        lastError: null,
        receivedAt: new Date(),
        createdAt: new Date(),
      };
      mockData.stripeEvents.push(event);
      return event;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const index = mockData.stripeEvents.findIndex(e => e.id === where.id);
      if (index === -1) throw new Error('Event not found');
      
      const event = mockData.stripeEvents[index];
      if (data.processed !== undefined) event.processed = data.processed;
      if (data.processedAt) event.processedAt = data.processedAt;
      if (data.errorCount?.increment) event.errorCount += data.errorCount.increment;
      if (data.lastError) event.lastError = data.lastError;
      
      return event;
    }),
  },

  // StripeRefund operations
  stripeRefund: {
    upsert: jest.fn(async ({ where, create, update }: any) => {
      let refund = mockData.stripeRefunds.find(r => r.stripeRefundId === where.stripeRefundId);
      if (refund) {
        Object.assign(refund, update);
        return refund;
      }
      refund = {
        id: generateId('sr_'),
        stripeRefundId: create.stripeRefundId,
        paymentId: create.paymentId,
        amountCents: create.amountCents,
        reason: create.reason || null,
        status: create.status || 'succeeded',
        stripeCreatedAt: create.stripeCreatedAt || new Date(),
      };
      mockData.stripeRefunds.push(refund);
      return refund;
    }),
    create: jest.fn(async ({ data }: any) => {
      const refund: MockStripeRefund = {
        id: generateId('sr_'),
        stripeRefundId: data.stripeRefundId,
        paymentId: data.paymentId,
        amountCents: data.amountCents,
        reason: data.reason || null,
        status: data.status || 'succeeded',
        stripeCreatedAt: data.stripeCreatedAt || new Date(),
      };
      mockData.stripeRefunds.push(refund);
      return refund;
    }),
  },

  // Refund operations
  refund: {
    findFirst: jest.fn(async ({ where }: any) => {
      return mockData.refunds.find(r => {
        if (where.paymentId && r.paymentId !== where.paymentId) return false;
        if (where.status && r.status !== where.status) return false;
        return true;
      }) || null;
    }),
    upsert: jest.fn(async ({ where, create, update }: any) => {
      let refund = mockData.refunds.find(r => r.refundId === where.refundId);
      if (refund) {
        Object.assign(refund, update);
        return refund;
      }
      refund = {
        id: generateId('refund_'),
        paymentId: create.paymentId,
        refundId: create.refundId,
        amountCents: create.amountCents,
        reason: create.reason || null,
        status: create.status || 'PENDING',
        initiatedBy: create.initiatedBy || 'system',
        processedAt: create.processedAt || null,
      };
      mockData.refunds.push(refund);
      return refund;
    }),
  },

  // Notification operations
  notification: {
    create: jest.fn(async ({ data }: any) => {
      const notification: MockNotification = {
        id: generateId('notif_'),
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || null,
        isRead: false,
        createdAt: new Date(),
      };
      mockData.notifications.push(notification);
      return notification;
    }),
  },

  // Transport operations
  transport: {
    findUnique: jest.fn(async ({ where }: any) => {
      return mockData.transports.find(t => t.id === where.id) || null;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const index = mockData.transports.findIndex(t => t.id === where.id);
      if (index === -1) throw new Error('Transport not found');
      
      mockData.transports[index] = {
        ...mockData.transports[index],
        ...data,
      };
      return mockData.transports[index];
    }),
  },

  // TransportStatusHistory operations
  transportStatusHistory: {
    create: jest.fn(async ({ data }: any) => {
      return { id: generateId('tsh_'), ...data };
    }),
  },

  // PaymentAuditEvent operations
  paymentAuditEvent: {
    create: jest.fn(async ({ data }: any) => {
      const auditEvent: MockPaymentAuditEvent = {
        id: generateId('pae_'),
        paymentId: data.paymentId,
        eventType: data.eventType,
        oldStatus: data.oldStatus || null,
        newStatus: data.newStatus,
        metadata: data.metadata || null,
        createdAt: new Date(),
      };
      mockData.paymentAuditEvents.push(auditEvent);
      return auditEvent;
    }),
  },

  // AuditLog operations
  auditLog: {
    create: jest.fn(async ({ data }: any) => {
      mockData.auditLogs.push({ id: generateId('audit_'), ...data });
      return { id: generateId('audit_'), ...data };
    }),
  },

  // Transaction helper
  $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => {
    // Execute callback with the same mock prisma
    return callback(mockPrisma);
  }),
};

// Export the mock for module mocking
export default mockPrisma;
