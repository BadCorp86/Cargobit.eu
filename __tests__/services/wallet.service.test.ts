/**
 * Unit Tests for Wallet Service (Task 2.2)
 * 
 * Tests cover:
 * - creditWallet: Adding funds with idempotency
 * - debitWallet: Removing funds with idempotency
 * - reverseCredit: Reversing credits for refunds
 * - getWalletBalance: Balance retrieval
 * - hasSufficientBalance: Balance checking
 */

import {
  creditWallet,
  debitWallet,
  reverseCredit,
  getWalletBalance,
  getWalletTransactions,
  hasSufficientBalance,
  getOrCreateWallet,
  centsToEuros,
  eurosToCents,
} from '@/services/wallet.service';
import { mockPrisma, mockData, resetIdCounter } from '../mocks/prisma';

// Mock the db module
jest.mock('@/lib/db', () => ({
  prisma: require('../mocks/prisma').mockPrisma,
}));

describe('Wallet Service', () => {
  const testUserId = 'user_test123';
  const testAmountCents = 10000; // 100 EUR
  const testReference = 'pi_test123';

  beforeEach(() => {
    mockData.reset();
    resetIdCounter();
    jest.clearAllMocks();
  });

  // ============================================
  // HELPER FUNCTION TESTS
  // ============================================

  describe('Helper Functions', () => {
    test('centsToEuros converts cents to euros correctly', () => {
      expect(centsToEuros(10000)).toBe(100);
      expect(centsToEuros(5000)).toBe(50);
      expect(centsToEuros(1)).toBe(0.01);
      expect(centsToEuros(0)).toBe(0);
    });

    test('eurosToCents converts euros to cents correctly', () => {
      expect(eurosToCents(100)).toBe(10000);
      expect(eurosToCents(50)).toBe(5000);
      expect(eurosToCents(0.01)).toBe(1);
      expect(eurosToCents(0)).toBe(0);
    });

    test('eurosToCents handles floating point correctly', () => {
      expect(eurosToCents(99.99)).toBe(9999);
      expect(eurosToCents(0.5)).toBe(50);
    });
  });

  // ============================================
  // GET OR CREATE WALLET TESTS
  // ============================================

  describe('getOrCreateWallet', () => {
    test('returns existing wallet if found', async () => {
      // Setup: Create existing wallet
      mockData.wallets.push({
        id: 'wallet_existing',
        ownerUserId: testUserId,
        balance: 50,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 50,
      });

      const wallet = await getOrCreateWallet(testUserId);

      expect(wallet).toBeDefined();
      expect(wallet.id).toBe('wallet_existing');
      expect(wallet.balance).toBe(50);
      expect(mockPrisma.wallet.create).not.toHaveBeenCalled();
    });

    test('creates new wallet if not found', async () => {
      const wallet = await getOrCreateWallet(testUserId);

      expect(wallet).toBeDefined();
      expect(wallet.ownerUserId).toBe(testUserId);
      expect(wallet.balance).toBe(0);
      expect(wallet.currency).toBe('EUR');
      expect(wallet.status).toBe('ACTIVE');
    });
  });

  // ============================================
  // CREDIT WALLET TESTS
  // ============================================

  describe('creditWallet', () => {
    test('credits wallet successfully for new transaction', async () => {
      // Setup: Create wallet
      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const result = await creditWallet({
        userId: testUserId,
        amountCents: testAmountCents,
        reference: testReference,
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.walletBalance).toBe(100); // 100 EUR
      expect(result.duplicate).toBeUndefined();

      // Verify transaction was created
      expect(mockData.walletTransactions.length).toBe(1);
      expect(mockData.walletTransactions[0].type).toBe('PAYMENT_IN');
      expect(mockData.walletTransactions[0].amount).toBe(100);
    });

    test('returns duplicate=true for duplicate transaction', async () => {
      // Setup: Create wallet and existing transaction
      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      mockData.walletTransactions.push({
        id: 'tx_existing',
        walletId: 'wallet_test',
        type: 'PAYMENT_IN',
        amount: 100,
        currency: 'EUR',
        paymentId: null,
        relatedTransportId: null,
        description: 'Previous transaction',
        reference: testReference,
        processedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await creditWallet({
        userId: testUserId,
        amountCents: testAmountCents,
        reference: testReference,
      });

      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(true);
      expect(result.transactionId).toBe('tx_existing');

      // No new transaction should be created
      expect(mockData.walletTransactions.length).toBe(1);
    });

    test('creates wallet if it does not exist', async () => {
      const result = await creditWallet({
        userId: testUserId,
        amountCents: testAmountCents,
        reference: testReference,
      });

      expect(result.success).toBe(true);
      expect(mockData.wallets.length).toBe(1);
      expect(mockData.wallets[0].ownerUserId).toBe(testUserId);
    });

    test('handles credit with payment and transport IDs', async () => {
      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      const result = await creditWallet({
        userId: testUserId,
        amountCents: testAmountCents,
        reference: testReference,
        paymentId: 'payment_123',
        transportId: 'transport_456',
        description: 'Test payment',
      });

      expect(result.success).toBe(true);
      expect(mockData.walletTransactions[0].paymentId).toBe('payment_123');
      expect(mockData.walletTransactions[0].relatedTransportId).toBe('transport_456');
    });

    test('accumulates balance with multiple credits', async () => {
      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      // First credit
      await creditWallet({
        userId: testUserId,
        amountCents: 5000, // 50 EUR
        reference: 'ref_1',
      });

      // Second credit
      const result = await creditWallet({
        userId: testUserId,
        amountCents: 3000, // 30 EUR
        reference: 'ref_2',
      });

      expect(result.success).toBe(true);
      expect(result.walletBalance).toBe(80); // 50 + 30 EUR
    });

    test('creates notification after successful credit', async () => {
      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      await creditWallet({
        userId: testUserId,
        amountCents: testAmountCents,
        reference: testReference,
      });

      expect(mockData.notifications.length).toBe(1);
      expect(mockData.notifications[0].type).toBe('WALLET_TOPUP');
      expect(mockData.notifications[0].userId).toBe(testUserId);
    });
  });

  // ============================================
  // DEBIT WALLET TESTS
  // ============================================

  describe('debitWallet', () => {
    test('debits wallet successfully', async () => {
      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 200,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 200,
        totalWithdrawn: 0,
      });

      const result = await debitWallet({
        userId: testUserId,
        amountCents: 5000, // 50 EUR
        reference: 'debit_ref_1',
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.walletBalance).toBe(150);

      // Verify transaction was created with negative amount
      expect(mockData.walletTransactions.length).toBe(1);
      expect(mockData.walletTransactions[0].type).toBe('REFUND');
      expect(mockData.walletTransactions[0].amount).toBe(-50);
    });

    test('returns error if wallet not found', async () => {
      const result = await debitWallet({
        userId: 'nonexistent_user',
        amountCents: 5000,
        reference: 'debit_ref_2',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Wallet not found for user');
    });

    test('handles duplicate debit transaction', async () => {
      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 200,
        totalWithdrawn: 100,
      });

      mockData.walletTransactions.push({
        id: 'tx_existing',
        walletId: 'wallet_test',
        type: 'REFUND',
        amount: -50,
        currency: 'EUR',
        paymentId: null,
        relatedTransportId: null,
        description: 'Existing debit',
        reference: 'debit_duplicate',
        processedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await debitWallet({
        userId: testUserId,
        amountCents: 5000,
        reference: 'debit_duplicate',
      });

      expect(result.success).toBe(true);
      // Balance should remain unchanged
      expect(mockData.wallets[0].balance).toBe(100);
    });
  });

  // ============================================
  // REVERSE CREDIT TESTS
  // ============================================

  describe('reverseCredit', () => {
    test('reverses credit successfully', async () => {
      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      const result = await reverseCredit({
        userId: testUserId,
        amountCents: 5000, // 50 EUR
        originalReference: 'original_payment_123',
      });

      expect(result.success).toBe(true);
      expect(result.walletBalance).toBe(50);

      // Verify reversal transaction
      expect(mockData.walletTransactions.length).toBe(1);
      expect(mockData.walletTransactions[0].reference).toBe('refund_original_payment_123');
    });

    test('reversal creates unique reference', async () => {
      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      await reverseCredit({
        userId: testUserId,
        amountCents: 3000,
        originalReference: 'payment_abc',
      });

      // Same original reference should be idempotent
      const result2 = await reverseCredit({
        userId: testUserId,
        amountCents: 3000,
        originalReference: 'payment_abc',
      });

      expect(result2.success).toBe(true);
      // Only one transaction should exist for this reference
      const reversalTxs = mockData.walletTransactions.filter(
        t => t.reference === 'refund_payment_abc'
      );
      expect(reversalTxs.length).toBe(1);
    });
  });

  // ============================================
  // GET WALLET BALANCE TESTS
  // ============================================

  describe('getWalletBalance', () => {
    test('returns balance for existing wallet', async () => {
      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 123.45,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 200,
        totalWithdrawn: 76.55,
      });

      const balance = await getWalletBalance(testUserId);
      expect(balance).toBe(123.45);
    });

    test('returns 0 for non-existent wallet', async () => {
      const balance = await getWalletBalance('nonexistent_user');
      expect(balance).toBe(0);
    });
  });

  // ============================================
  // GET WALLET TRANSACTIONS TESTS
  // ============================================

  describe('getWalletTransactions', () => {
    beforeEach(() => {
      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      // Create multiple transactions
      for (let i = 0; i < 5; i++) {
        mockData.walletTransactions.push({
          id: `tx_${i}`,
          walletId: 'wallet_test',
          type: i % 2 === 0 ? 'PAYMENT_IN' : 'REFUND',
          amount: i % 2 === 0 ? 100 : -50,
          currency: 'EUR',
          paymentId: null,
          relatedTransportId: null,
          description: `Transaction ${i}`,
          reference: `ref_${i}`,
          processedAt: new Date(Date.now() - i * 1000),
          createdAt: new Date(Date.now() - i * 1000),
        });
      }
    });

    test('returns all transactions for wallet', async () => {
      const transactions = await getWalletTransactions(testUserId);
      expect(transactions.length).toBe(5);
    });

    test('respects limit parameter', async () => {
      const transactions = await getWalletTransactions(testUserId, { limit: 3 });
      expect(transactions.length).toBe(3);
    });

    test('respects offset parameter', async () => {
      const transactions = await getWalletTransactions(testUserId, { offset: 2 });
      expect(transactions.length).toBe(3);
    });

    test('filters by transaction type', async () => {
      const transactions = await getWalletTransactions(testUserId, { type: 'PAYMENT_IN' as any });
      expect(transactions.every(t => t.type === 'PAYMENT_IN')).toBe(true);
    });

    test('returns empty array if wallet not found', async () => {
      mockData.wallets = [];
      const transactions = await getWalletTransactions('nonexistent_user');
      expect(transactions).toEqual([]);
    });
  });

  // ============================================
  // HAS SUFFICIENT BALANCE TESTS
  // ============================================

  describe('hasSufficientBalance', () => {
    test('returns true when balance is sufficient', async () => {
      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 100,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 100,
        totalWithdrawn: 0,
      });

      const result = await hasSufficientBalance(testUserId, 5000); // 50 EUR
      expect(result).toBe(true);
    });

    test('returns true when balance equals amount', async () => {
      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 50,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 50,
        totalWithdrawn: 0,
      });

      const result = await hasSufficientBalance(testUserId, 5000); // 50 EUR
      expect(result).toBe(true);
    });

    test('returns false when balance is insufficient', async () => {
      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 30,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 30,
        totalWithdrawn: 0,
      });

      const result = await hasSufficientBalance(testUserId, 5000); // 50 EUR
      expect(result).toBe(false);
    });

    test('returns false for non-existent wallet', async () => {
      const result = await hasSufficientBalance('nonexistent_user', 5000);
      expect(result).toBe(false);
    });
  });

  // ============================================
  // TRANSACTIONAL INTEGRITY TESTS
  // ============================================

  describe('Transactional Integrity', () => {
    test('credit uses transaction for atomicity', async () => {
      mockData.wallets.push({
        id: 'wallet_test',
        ownerUserId: testUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
        totalDeposited: 0,
        totalWithdrawn: 0,
      });

      await creditWallet({
        userId: testUserId,
        amountCents: testAmountCents,
        reference: testReference,
      });

      // Transaction should have been called
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
