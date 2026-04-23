import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WalletTransaction {
  id: string;
  type: 'DEPOSIT' | 'PAYOUT' | 'FEE' | 'COMMISSION' | 'PAYMENT_IN' | 'PAYMENT_OUT' | 'REFUND';
  amount: number;
  currency: string;
  description?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  relatedTransportId?: string;
}

export interface PayoutMethod {
  id: string;
  iban: string;
  holderName: string;
  bic?: string;
  isDefault: boolean;
  verified: boolean;
}

interface WalletState {
  balance: number;
  currency: string;
  totalDeposited: number;
  totalWithdrawn: number;
  transactions: WalletTransaction[];
  payoutMethods: PayoutMethod[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setBalance: (balance: number) => void;
  addTransaction: (transaction: WalletTransaction) => void;
  setTransactions: (transactions: WalletTransaction[]) => void;
  addPayoutMethod: (method: PayoutMethod) => void;
  removePayoutMethod: (id: string) => void;
  setDefaultPayoutMethod: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balance: 0,
      currency: 'EUR',
      totalDeposited: 0,
      totalWithdrawn: 0,
      transactions: [],
      payoutMethods: [],
      isLoading: false,
      error: null,

      setBalance: (balance) => set({ balance }),

      addTransaction: (transaction) =>
        set((state) => {
          const newBalance =
            transaction.type === 'DEPOSIT' || transaction.type === 'PAYMENT_IN'
              ? state.balance + transaction.amount
              : transaction.type === 'PAYOUT' || transaction.type === 'PAYMENT_OUT'
              ? state.balance - transaction.amount
              : state.balance;

          return {
            transactions: [transaction, ...state.transactions],
            balance: newBalance,
            totalDeposited:
              transaction.type === 'DEPOSIT'
                ? state.totalDeposited + transaction.amount
                : state.totalDeposited,
            totalWithdrawn:
              transaction.type === 'PAYOUT'
                ? state.totalWithdrawn + transaction.amount
                : state.totalWithdrawn,
          };
        }),

      setTransactions: (transactions) => set({ transactions }),

      addPayoutMethod: (method) =>
        set((state) => ({
          payoutMethods: method.isDefault
            ? [
                ...state.payoutMethods.map((m) => ({ ...m, isDefault: false })),
                method,
              ]
            : [...state.payoutMethods, method],
        })),

      removePayoutMethod: (id) =>
        set((state) => ({
          payoutMethods: state.payoutMethods.filter((m) => m.id !== id),
        })),

      setDefaultPayoutMethod: (id) =>
        set((state) => ({
          payoutMethods: state.payoutMethods.map((m) => ({
            ...m,
            isDefault: m.id === id,
          })),
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),
    }),
    {
      name: 'cargobit-wallet',
      partialize: (state) => ({
        balance: state.balance,
        currency: state.currency,
        totalDeposited: state.totalDeposited,
        totalWithdrawn: state.totalWithdrawn,
        payoutMethods: state.payoutMethods,
      }),
    }
  )
);
