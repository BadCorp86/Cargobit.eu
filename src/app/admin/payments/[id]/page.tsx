/**
 * CargoBit Admin - Payment Detail Page
 * 
 * Detailed view of a single payment with refund capability.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/admin-layout';
import { StatusBadge } from '@/components/admin/status-badge';
import { WalletTransactions } from '@/components/admin/wallet-transactions';
import { AuditTrail } from '@/components/admin/audit-trail';
import { RefundForm } from '@/components/admin/refund-form';
import { ConfirmModal } from '@/components/admin/modal';

// ============================================
// TYPES
// ============================================

interface PaymentDetail {
  id: string;
  paymentIntentId: string;
  chargeId?: string;
  jobId: string;
  shipper: {
    id: string;
    email: string;
    name?: string;
  };
  transporter?: {
    id: string;
    email: string;
    name?: string;
  };
  amountCents: number;
  platformFeeCents: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded' | 'partial_refund';
  refundedAmountCents: number;
  refunds: Array<{
    id: string;
    amountCents: number;
    reason: string;
    status: string;
    createdAt: string;
  }>;
  walletTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    description?: string;
    reference?: string;
    processedAt?: string;
    failedAt?: string;
    createdAt: string;
  }>;
  auditTrail: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId?: string;
    adminEmail: string;
    dataBefore?: string;
    dataAfter?: string;
    ipAddress?: string;
    createdAt: string;
  }>;
  stripeFeeCents: number;
  createdAt: string;
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

// ============================================
// PAYMENT DETAIL PAGE
// ============================================

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.id as string;

  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const res = await fetch(`/api/admin/payments/${paymentId}`);
        if (!res.ok) throw new Error('Payment not found');
        const data = await res.json();
        setPayment(data);
      } catch (err) {
        console.error('Failed to fetch payment:', err);
        setError('Payment konnte nicht geladen werden');
        // Mock data for demo
        setPayment({
          id: paymentId,
          paymentIntentId: 'pi_3QHxYZK8vLqD1234',
          chargeId: 'ch_3QHxYZK8vLqD5678',
          jobId: 'job_abc123',
          shipper: {
            id: 'user_123',
            email: 'shipper@example.com',
            name: 'Max Mustermann',
          },
          transporter: {
            id: 'user_456',
            email: 'transporter@example.com',
            name: 'Anna Schmidt',
          },
          amountCents: 25000,
          platformFeeCents: 875, // 3.5%
          currency: 'EUR',
          status: 'succeeded',
          refundedAmountCents: 0,
          refunds: [],
          walletTransactions: [
            {
              id: 'tx_1',
              type: 'PAYMENT_IN',
              amount: 25000,
              currency: 'EUR',
              description: 'Payment for job_abc123',
              reference: 'pi_3QHxYZK8vLqD1234',
              processedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
            {
              id: 'tx_2',
              type: 'FEE',
              amount: 875,
              currency: 'EUR',
              description: 'Platform fee (3.5%)',
              processedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
          ],
          auditTrail: [
            {
              id: 'audit_1',
              action: 'payment_view',
              entityType: 'payment',
              entityId: paymentId,
              adminEmail: 'admin@cargobit.eu',
              ipAddress: '192.168.1.1',
              createdAt: new Date().toISOString(),
            },
          ],
          stripeFeeCents: 88, // ~2.9% + 0.30€
          createdAt: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [paymentId]);

  const handleRefund = async (amountCents: number, reason: string, isFullRefund: boolean) => {
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents,
          reason,
          isFullRefund,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Refund failed');
      }

      // Refresh payment data
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      throw new Error(err.message || 'Erstattung fehlgeschlagen');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  if (error && !payment) {
    return (
      <AdminLayout>
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </AdminLayout>
    );
  }

  if (!payment) return null;

  const canRefund = payment.status === 'succeeded' && 
    payment.amountCents > payment.refundedAmountCents;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/payments')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Payment Details
              </h1>
              <p className="text-gray-500 dark:text-gray-400 font-mono text-sm">
                {payment.paymentIntentId}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {canRefund && (
              <button
                onClick={() => setShowRefundForm(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                Erstattung erstellen
              </button>
            )}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Payment Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Summary Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Zahlungsübersicht
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Betrag</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(payment.amountCents, payment.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <StatusBadge status={payment.status} size="lg" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Erstellt</p>
                  <p className="font-medium">
                    {new Date(payment.createdAt).toLocaleString('de-DE')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Job ID</p>
                  <p className="font-mono text-sm">{payment.jobId}</p>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Gebührenaufschlüsselung
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Plattformgebühr (3.5%)</span>
                    <span className="font-medium">{formatCurrency(payment.platformFeeCents, payment.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Stripe-Gebühr</span>
                    <span className="font-medium">{formatCurrency(payment.stripeFeeCents, payment.currency)}</span>
                  </div>
                  {payment.refundedAmountCents > 0 && (
                    <div className="flex justify-between text-sm text-orange-600">
                      <span>Erstattet</span>
                      <span className="font-medium">-{formatCurrency(payment.refundedAmountCents, payment.currency)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stripe Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Stripe Informationen
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Payment Intent</span>
                  <span className="font-mono text-sm">{payment.paymentIntentId}</span>
                </div>
                {payment.chargeId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Charge ID</span>
                    <span className="font-mono text-sm">{payment.chargeId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Wallet Transactions */}
            <WalletTransactions transactions={payment.walletTransactions} />
          </div>

          {/* Right Column - Participants & Refunds */}
          <div className="space-y-6">
            {/* Participants */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Beteiligte
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Shipper</p>
                  <p className="font-medium">{payment.shipper.name || payment.shipper.email}</p>
                  <p className="text-sm text-gray-500">{payment.shipper.email}</p>
                </div>
                {payment.transporter && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Transporter</p>
                    <p className="font-medium">{payment.transporter.name || payment.transporter.email}</p>
                    <p className="text-sm text-gray-500">{payment.transporter.email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Refunds */}
            {payment.refunds.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Erstattungen
                </h3>
                <div className="space-y-3">
                  {payment.refunds.map((refund) => (
                    <div key={refund.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-orange-600">
                          {formatCurrency(refund.amountCents, payment.currency)}
                        </span>
                        <span className="text-xs text-gray-500">{refund.status}</span>
                      </div>
                      <p className="text-sm text-gray-500">{refund.reason}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(refund.createdAt).toLocaleString('de-DE')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Trail */}
            <AuditTrail entries={payment.auditTrail} />
          </div>
        </div>
      </div>

      {/* Refund Form Modal */}
      {payment && (
        <RefundForm
          isOpen={showRefundForm}
          onClose={() => setShowRefundForm(false)}
          onSubmit={handleRefund}
          payment={{
            id: payment.id,
            paymentIntentId: payment.paymentIntentId,
            amountCents: payment.amountCents,
            currency: payment.currency,
            refundedAmountCents: payment.refundedAmountCents,
          }}
        />
      )}
    </AdminLayout>
  );
}
