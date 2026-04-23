import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationService, OpenPayout, ReconciliationDiff } from '../services/reconciliation.service';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client');

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let mockPrisma: any;

  beforeEach(async () => {
    // Create mock for PrismaClient
    mockPrisma = {
      payout: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payoutEvent: {
        create: jest.fn(),
      },
      auditEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    (PrismaClient as any).mockImplementation(() => mockPrisma);

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReconciliationService],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listOpenPayouts', () => {
    it('should return an array of open payouts', async () => {
      // Arrange
      const mockPayouts = [
        {
          id: 'payout-1',
          amountCents: 10000,
          currency: 'EUR',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          stripeTransferId: 'tr_123',
          userId: 'user-1',
          companyId: 'company-1',
          metadata: {},
        },
        {
          id: 'payout-2',
          amountCents: 20000,
          currency: 'EUR',
          status: 'processing',
          createdAt: new Date(),
          updatedAt: new Date(),
          stripeTransferId: null,
          userId: 'user-2',
          companyId: null,
          metadata: {},
        },
      ];

      mockPrisma.payout.findMany.mockResolvedValue(mockPayouts);

      // Act
      const result = await service.listOpenPayouts();

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('amount_cents');
      expect(result[0]).toHaveProperty('status');
      expect(result[0]).toHaveProperty('diff');
      expect(mockPrisma.payout.findMany).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      // Arrange
      mockPrisma.payout.findMany.mockResolvedValue([]);

      // Act
      await service.listOpenPayouts({
        status: 'pending',
        limit: 10,
      });

      // Assert
      expect(mockPrisma.payout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          orderBy: { created_at: 'desc' },
        })
      );
    });

    it('should return empty array when no open payouts exist', async () => {
      // Arrange
      mockPrisma.payout.findMany.mockResolvedValue([]);

      // Act
      const result = await service.listOpenPayouts();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('markPayout', () => {
    it('should mark a payout as resolved', async () => {
      // Arrange
      const mockPayout = {
        id: 'payout-1',
        status: 'pending',
        metadata: {},
      };

      const mockUpdatedPayout = {
        ...mockPayout,
        status: 'paid',
        updatedAt: new Date(),
      };

      const mockEvent = {
        id: 'event-1',
        type: 'manual_mark',
        createdAt: new Date(),
      };

      mockPrisma.payout.findUnique.mockResolvedValue(mockPayout);
      mockPrisma.payout.update.mockResolvedValue(mockUpdatedPayout);
      mockPrisma.payoutEvent.create.mockResolvedValue(mockEvent);
      mockPrisma.auditEvent.create.mockResolvedValue({});

      // Act
      const result = await service.markPayout(
        'payout-1',
        { status: 'resolved', note: 'Test note' },
        'admin-user'
      );

      // Assert
      expect(result.ok).toBe(true);
      expect(result.payout.status).toBe('paid');
      expect(result.event.type).toBe('manual_mark');
      expect(mockPrisma.payout.update).toHaveBeenCalled();
      expect(mockPrisma.payoutEvent.create).toHaveBeenCalled();
      expect(mockPrisma.auditEvent.create).toHaveBeenCalled();
    });

    it('should mark a payout as needs_review', async () => {
      // Arrange
      const mockPayout = {
        id: 'payout-1',
        status: 'pending',
        metadata: {},
      };

      mockPrisma.payout.findUnique.mockResolvedValue(mockPayout);
      mockPrisma.payout.update.mockResolvedValue({
        ...mockPayout,
        updatedAt: new Date(),
      });
      mockPrisma.payoutEvent.create.mockResolvedValue({ id: 'event-1' });
      mockPrisma.auditEvent.create.mockResolvedValue({});

      // Act
      const result = await service.markPayout(
        'payout-1',
        { status: 'needs_review', note: 'Review required' },
        'admin-user'
      );

      // Assert
      expect(result.ok).toBe(true);
      // Status should remain unchanged for needs_review
      expect(mockPrisma.payout.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              markStatus: 'needs_review',
            }),
          }),
        })
      );
    });

    it('should throw error if payout not found', async () => {
      // Arrange
      mockPrisma.payout.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.markPayout('non-existent', { status: 'resolved' }, 'admin-user')
      ).rejects.toThrow('not found');
    });
  });

  describe('generateReport', () => {
    it('should generate a reconciliation report', async () => {
      // Arrange
      const mockPayouts = [
        { id: '1', status: 'pending', amount_cents: 10000, diff: 0 },
        { id: '2', status: 'pending', amount_cents: 20000, diff: 5 },
        { id: '3', status: 'processing', amount_cents: 30000, diff: 0 },
      ];

      mockPrisma.payout.findMany.mockResolvedValue(
        mockPayouts.map((p) => ({
          ...p,
          amountCents: p.amount_cents,
          currency: 'EUR',
          createdAt: new Date(),
          updatedAt: new Date(),
          stripeTransferId: null,
          userId: 'user-1',
          companyId: null,
        }))
      );

      // Act
      const report = await service.generateReport();

      // Assert
      expect(report).toHaveProperty('total_open');
      expect(report).toHaveProperty('total_amount_cents');
      expect(report).toHaveProperty('by_status');
      expect(report).toHaveProperty('diffs_found');
      expect(report).toHaveProperty('generated_at');
      expect(report.total_open).toBe(3);
      expect(report.total_amount_cents).toBe(60000);
    });
  });

  describe('runReconciliation', () => {
    it('should process open payouts and return results', async () => {
      // Arrange
      mockPrisma.payout.findMany.mockResolvedValue([
        {
          id: 'payout-1',
          amountCents: 10000,
          currency: 'EUR',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          stripeTransferId: 'tr_123',
          userId: 'user-1',
          companyId: null,
        },
      ]);

      // Act
      const result = await service.runReconciliation();

      // Assert
      expect(result).toHaveProperty('processed');
      expect(result).toHaveProperty('diffs');
      expect(result).toHaveProperty('errors');
      expect(result.processed).toBe(1);
      expect(Array.isArray(result.diffs)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});
