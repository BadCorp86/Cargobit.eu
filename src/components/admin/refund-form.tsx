/**
 * CargoBit Admin - Refund Form Component
 * 
 * Form for creating refunds with amount input and reason.
 */

'use client';

import React, { useState } from 'react';
import { Modal } from './modal';

// ============================================
// TYPES
// ============================================

interface RefundFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amountCents: number, reason: string, isFullRefund: boolean) => Promise<void>;
  payment: {
    id: string;
    paymentIntentId: string;
    amountCents: number;
    currency: string;
    refundedAmountCents: number;
  };
  loading?: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
  }).format(amountCents / 100);
}

function parseCurrencyInput(value: string): number {
  // Remove non-numeric characters except comma and dot
  const cleaned = value.replace(/[^\d.,]/g, '');
  // Replace comma with dot for parsing
  const normalized = cleaned.replace(',', '.');
  // Parse and convert to cents
  const amount = parseFloat(normalized) || 0;
  return Math.round(amount * 100);
}

// ============================================
// COMPONENT
// ============================================

export function RefundForm({ isOpen, onClose, onSubmit, payment, loading = false }: RefundFormProps) {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [amountInput, setAmountInput] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const maxRefundable = payment.amountCents - payment.refundedAmountCents;
  const refundAmountCents = refundType === 'full' 
    ? maxRefundable 
    : parseCurrencyInput(amountInput);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (refundType === 'partial' && refundAmountCents <= 0) {
      setError('Bitte geben Sie einen gültigen Betrag ein');
      return;
    }

    if (refundAmountCents > maxRefundable) {
      setError(`Der Betrag darf ${formatCurrency(maxRefundable, payment.currency)} nicht überschreiten`);
      return;
    }

    if (!reason.trim()) {
      setError('Bitte geben Sie einen Grund für die Erstattung an');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(refundAmountCents, reason.trim(), refundType === 'full');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erstattung fehlgeschlagen');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setError(null);
      setAmountInput('');
      setReason('');
      setRefundType('full');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Erstattung erstellen"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Info */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Payment Intent</p>
              <p className="font-mono text-sm">{payment.paymentIntentId}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Gesamtbetrag</p>
              <p className="font-semibold text-lg">{formatCurrency(payment.amountCents, payment.currency)}</p>
            </div>
          </div>
          {payment.refundedAmountCents > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Bereits erstattet: {formatCurrency(payment.refundedAmountCents, payment.currency)}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Erstattbar: {formatCurrency(maxRefundable, payment.currency)}
              </p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Refund Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Erstattungstyp
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="refundType"
                value="full"
                checked={refundType === 'full'}
                onChange={() => setRefundType('full')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Volle Erstattung ({formatCurrency(maxRefundable, payment.currency)})
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="refundType"
                value="partial"
                checked={refundType === 'partial'}
                onChange={() => setRefundType('partial')}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Teilweise
              </span>
            </label>
          </div>
        </div>

        {/* Amount (partial only) */}
        {refundType === 'partial' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Erstattungsbetrag
            </label>
            <div className="relative">
              <input
                type="text"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder={`Max: ${formatCurrency(maxRefundable, payment.currency)}`}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                {payment.currency}
              </span>
            </div>
            {refundAmountCents > 0 && (
              <p className="mt-1 text-sm text-gray-500">
                Eingabe: {formatCurrency(refundAmountCents, payment.currency)}
              </p>
            )}
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Grund der Erstattung
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">Bitte wählen...</option>
            <option value="customer_request">Auf Kundenwunsch</option>
            <option value="service_not_provided">Service nicht erbracht</option>
            <option value="partial_service">Teilweise Leistung</option>
            <option value="duplicate_charge">Doppelte Belastung</option>
            <option value="fraud">Betrugsverdacht</option>
            <option value="other">Sonstiges</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={submitting || maxRefundable <= 0}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Wird bearbeitet...
              </span>
            ) : (
              `${refundType === 'full' ? 'Vollständig' : 'Teilweise'} erstatten`
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================
// EXPORTS
// ============================================

export type { RefundFormProps };
