/**
 * CargoBit Admin - Wallet Transactions Component
 * 
 * Displays wallet transaction history with filtering.
 */

'use client';

import React from 'react';
import { StatusBadge } from './status-badge';

// ============================================
// TYPES
// ============================================

interface WalletTransaction {
  id: string;
  type: 'DEPOSIT' | 'PAYOUT' | 'FEE' | 'COMMISSION' | 'PAYMENT_IN' | 'PAYMENT_OUT' | 'REFUND';
  amount: number;
  currency: string;
  description?: string;
  reference?: string;
  processedAt?: string;
  failedAt?: string;
  failureReason?: string;
  createdAt: string;
}

interface WalletTransactionsProps {
  transactions: WalletTransaction[];
  loading?: boolean;
}

// ============================================
// TRANSACTION TYPE LABELS
// ============================================

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Einzahlung',
  PAYOUT: 'Auszahlung',
  FEE: 'Gebühr',
  COMMISSION: 'Kommission',
  PAYMENT_IN: 'Zahlungseingang',
  PAYMENT_OUT: 'Zahlungsausgang',
  REFUND: 'Erstattung',
};

const TYPE_COLORS: Record<string, string> = {
  DEPOSIT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  PAYOUT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  FEE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  COMMISSION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  PAYMENT_IN: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  PAYMENT_OUT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  REFUND: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100); // Assuming amount is in cents
}

function getAmountClass(type: string, amount: number): string {
  if (['DEPOSIT', 'PAYMENT_IN', 'REFUND'].includes(type)) {
    return 'text-green-600 dark:text-green-400';
  }
  if (['PAYOUT', 'PAYMENT_OUT', 'FEE', 'COMMISSION'].includes(type)) {
    return 'text-red-600 dark:text-red-400';
  }
  return 'text-gray-900 dark:text-gray-100';
}

// ============================================
// COMPONENT
// ============================================

export function WalletTransactions({ transactions, loading = false }: WalletTransactionsProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Wallet Transaktionen
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Wallet Transaktionen
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          Keine Transaktionen vorhanden
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Wallet Transaktionen
      </h3>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Typ
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Betrag
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Beschreibung
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Referenz
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Datum
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`
                    inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                    ${TYPE_COLORS[tx.type] || 'bg-gray-100 text-gray-800'}
                  `}>
                    {TYPE_LABELS[tx.type] || tx.type}
                  </span>
                </td>
                <td className={`px-4 py-3 whitespace-nowrap font-medium ${getAmountClass(tx.type, tx.amount)}`}>
                  {['DEPOSIT', 'PAYMENT_IN', 'REFUND'].includes(tx.type) ? '+' : '-'}
                  {formatCurrency(tx.amount, tx.currency)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                  {tx.description || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {tx.reference || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {tx.failedAt ? (
                    <span className="text-red-600 dark:text-red-400 text-sm">
                      Fehlgeschlagen
                    </span>
                  ) : tx.processedAt ? (
                    <span className="text-green-600 dark:text-green-400 text-sm">
                      Verarbeitet
                    </span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400 text-sm">
                      Ausstehend
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {new Date(tx.createdAt).toLocaleString('de-DE')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// EXPORTS
// ============================================

export type { WalletTransaction, WalletTransactionsProps };
