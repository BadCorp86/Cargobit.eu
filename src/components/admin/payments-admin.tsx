'use client';

/**
 * CargoBit Payments Admin UI
 * 
 * Features:
 * - Payments list with filters
 * - Status badges (pending, succeeded, partial_refunded, refunded, failed)
 * - Payment detail view
 * - Refund dialog (full/partial)
 * - Audit trail panel
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ============================================
// TYPES
// ============================================

interface Payment {
  id: string;
  paymentIntentId: string;
  chargeId: string | null;
  jobId: string;
  bidId: string;
  shipperId: string;
  shipperName: string;
  shipperEmail: string;
  transporterId: string;
  transporterName: string;
  amountCents: number;
  amountEur: number;
  currency: string;
  platformFeeCents: number;
  transporterAmountCents: number;
  refundedCents: number;
  status: string;
  paymentType: string;
  createdAt: string;
  succeededAt: string | null;
}

interface PaymentDetail extends Payment {
  platformFeeEur: number;
  transporterAmountEur: number;
  refundedEur: number;
  shipper: { id: string; name: string; email: string };
  transporter: { id: string; name: string; email: string } | null;
  jobStatus: string;
  failedReason: string | null;
  refunds: Refund[];
  walletTransactions: WalletTransaction[];
  auditTrail: AuditEntry[];
}

interface Refund {
  id: string;
  refundId: string;
  amountEur: number;
  shipperRefundEur: number;
  platformFeeRefundEur: number;
  transporterDebitEur: number;
  refundType: string;
  status: string;
  reason: string | null;
  createdAt: string;
  processedAt: string | null;
}

interface WalletTransaction {
  id: string;
  walletOwnerType: string;
  walletOwnerId: string;
  type: string;
  amount: number;
  currency: string;
  description: string | null;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  dataAfter: any;
  createdAt: string;
}

// ============================================
// STATUS BADGE COMPONENT
// ============================================

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  succeeded: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  partial_refunded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  refunded: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  failed: 'bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  succeeded: 'Succeeded',
  partial_refunded: 'Partial Refund',
  refunded: 'Refunded',
  failed: 'Failed',
};

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase();
  const colorClass = STATUS_COLORS[normalizedStatus] || STATUS_COLORS.pending;
  const label = STATUS_LABELS[normalizedStatus] || status;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

// ============================================
// CURRENCY FORMATTER
// ============================================

function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// ============================================
// REFUND DIALOG COMPONENT
// ============================================

interface RefundDialogProps {
  payment: Payment;
  onClose: () => void;
  onRefund: (type: 'full' | 'partial', amountEur?: number, reason: string) => Promise<void>;
  loading: boolean;
}

function RefundDialog({ payment, onClose, onRefund, loading }: RefundDialogProps) {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState(payment.amountEur.toString());
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const maxRefundable = payment.amountEur - (payment.refundedCents / 100);
  
  const handleSubmit = async () => {
    setError(null);
    
    if (!reason.trim()) {
      setError('Bitte geben Sie einen Grund für den Refund an');
      return;
    }
    
    const amountEur = refundType === 'partial' ? parseFloat(amount) : undefined;
    
    if (refundType === 'partial' && (!amountEur || amountEur <= 0)) {
      setError('Bitte geben Sie einen gültigen Betrag ein');
      return;
    }
    
    if (refundType === 'partial' && amountEur > maxRefundable) {
      setError(`Betrag darf maximal ${formatCurrency(maxRefundable)} betragen`);
      return;
    }
    
    await onRefund(refundType, amountEur, reason);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold">Refund veranlassen</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Payment: {payment.paymentIntentId}
          </p>
        </div>
        
        <div className="px-6 py-4 space-y-4">
          {/* Payment Info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Gesamtbetrag:</span>
              <span className="font-medium">{formatCurrency(payment.amountEur)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500">Bereits refundiert:</span>
              <span className="font-medium">{formatCurrency(payment.refundedCents / 100)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500">Max. refundierbar:</span>
              <span className="font-medium text-green-600">{formatCurrency(maxRefundable)}</span>
            </div>
          </div>
          
          {/* Refund Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Refund-Typ</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="refundType"
                  value="full"
                  checked={refundType === 'full'}
                  onChange={() => setRefundType('full')}
                  className="mr-2"
                />
                Vollständig
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
                Teilweise
              </label>
            </div>
          </div>
          
          {/* Amount (for partial) */}
          {refundType === 'partial' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Betrag (EUR)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={maxRefundable}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder={`Max: ${maxRefundable.toFixed(2)}`}
              />
            </div>
          )}
          
          {/* Reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Grund *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              rows={3}
              placeholder="Grund für den Refund..."
              required
            />
          </div>
          
          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Wird verarbeitet...' : 'Refund ausführen'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PAYMENT DETAIL PANEL
// ============================================

interface PaymentDetailPanelProps {
  paymentId: string;
  onClose: () => void;
  onRefundClick: (payment: Payment) => void;
}

function PaymentDetailPanel({ paymentId, onClose, onRefundClick }: PaymentDetailPanelProps) {
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'refunds' | 'wallet' | 'audit'>('details');
  
  useEffect(() => {
    fetchPaymentDetail();
  }, [paymentId]);
  
  const fetchPaymentDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setPayment(data);
      }
    } catch (error) {
      console.error('Failed to fetch payment detail:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="fixed inset-y-0 right-0 w-[600px] bg-white dark:bg-gray-800 shadow-xl z-40 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!payment) {
    return (
      <div className="fixed inset-y-0 right-0 w-[600px] bg-white dark:bg-gray-800 shadow-xl z-40 flex items-center justify-center">
        <p className="text-gray-500">Payment not found</p>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-y-0 right-0 w-[600px] bg-white dark:bg-gray-800 shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Payment Details</h2>
          <p className="text-sm text-gray-500">{payment.paymentIntentId}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Tabs */}
      <div className="border-b dark:border-gray-700 px-6">
        <div className="flex gap-4">
          {[
            { id: 'details', label: 'Details' },
            { id: 'refunds', label: `Refunds (${payment.refunds.length})` },
            { id: 'wallet', label: 'Wallet' },
            { id: 'audit', label: 'Audit' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-1 text-sm font-medium border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Status */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
              <StatusBadge status={payment.status} />
            </div>
            
            {/* Amounts */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Gesamtbetrag</span>
                <span className="font-medium">{formatCurrency(payment.amountEur)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Plattform-Gebühr (3.5%)</span>
                <span>{formatCurrency(payment.platformFeeEur)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Transporteur</span>
                <span>{formatCurrency(payment.transporterAmountEur)}</span>
              </div>
              {payment.refundedEur > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Refundiert</span>
                  <span>-{formatCurrency(payment.refundedEur)}</span>
                </div>
              )}
            </div>
            
            {/* Stripe IDs */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">Stripe IDs</h3>
              <div className="text-sm space-y-1">
                <div><span className="text-gray-500">PaymentIntent:</span> {payment.paymentIntentId}</div>
                <div><span className="text-gray-500">Charge:</span> {payment.chargeId || '-'}</div>
              </div>
            </div>
            
            {/* People */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-500">Shipper</h3>
                <Link href={`/admin/users/${payment.shipper.id}`} className="text-blue-600 hover:underline">
                  {payment.shipper.name}
                </Link>
                <p className="text-xs text-gray-500">{payment.shipper.email}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-500">Transporteur</h3>
                {payment.transporter ? (
                  <>
                    <Link href={`/admin/users/${payment.transporter.id}`} className="text-blue-600 hover:underline">
                      {payment.transporter.name}
                    </Link>
                    <p className="text-xs text-gray-500">{payment.transporter.email}</p>
                  </>
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
              </div>
            </div>
            
            {/* Timestamps */}
            <div className="space-y-1 text-sm">
              <div><span className="text-gray-500">Erstellt:</span> {formatDate(payment.createdAt)}</div>
              {payment.succeededAt && (
                <div><span className="text-gray-500">Erfolgreich:</span> {formatDate(payment.succeededAt)}</div>
              )}
              {payment.failedReason && (
                <div className="text-red-600"><span className="text-gray-500">Fehler:</span> {payment.failedReason}</div>
              )}
            </div>
            
            {/* Refund Button */}
            {['succeeded', 'partial_refunded'].includes(payment.status.toLowerCase()) && (
              <button
                onClick={() => onRefundClick(payment)}
                className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                Refund veranlassen
              </button>
            )}
          </div>
        )}
        
        {activeTab === 'refunds' && (
          <div className="space-y-4">
            {payment.refunds.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Keine Refunds vorhanden</p>
            ) : (
              payment.refunds.map((refund) => (
                <div key={refund.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{formatCurrency(refund.amountEur)}</span>
                    <StatusBadge status={refund.status} />
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <div>Type: {refund.refundType}</div>
                    <div>Stripe ID: {refund.refundId}</div>
                    {refund.reason && <div>Grund: {refund.reason}</div>}
                    <div>Erstellt: {formatDate(refund.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {activeTab === 'wallet' && (
          <div className="space-y-3">
            {payment.walletTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Keine Wallet-Transaktionen</p>
            ) : (
              payment.walletTransactions.map((wt) => (
                <div key={wt.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">
                      {wt.walletOwnerType === 'platform' && 'Plattform'}
                      {wt.walletOwnerType === 'transporter' && 'Transporteur'}
                      {wt.walletOwnerType === 'shipper' && 'Shipper'}
                    </div>
                    <div className="text-xs text-gray-500">{wt.type}</div>
                  </div>
                  <div className={`font-medium ${wt.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {wt.amount >= 0 ? '+' : ''}{formatCurrency(wt.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {activeTab === 'audit' && (
          <div className="space-y-3">
            {payment.auditTrail.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Keine Audit-Einträge</p>
            ) : (
              payment.auditTrail.map((entry) => (
                <div key={entry.id} className="border-l-2 border-blue-500 pl-3 py-2">
                  <div className="font-medium text-sm">{entry.action}</div>
                  <div className="text-xs text-gray-500">{formatDate(entry.createdAt)}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PaymentsAdmin() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Detail panel
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  
  // Refund dialog
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  
  // Fetch payments
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('paymentIntentId', searchQuery);
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      
      const res = await fetch(`/api/admin/payments?${params}`, {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        setPayments(data.items);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, dateFrom, dateTo, offset]);
  
  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);
  
  // Handle refund
  const handleRefund = async (type: 'full' | 'partial', amountEur?: number, reason: string) => {
    if (!refundPayment) return;
    
    setRefundLoading(true);
    try {
      const res = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          jobId: refundPayment.jobId,
          type,
          amountEur,
          reason,
        }),
      });
      
      if (res.ok) {
        setRefundPayment(null);
        fetchPayments();
        if (selectedPaymentId) {
          // Refresh detail panel
          setSelectedPaymentId(null);
          setTimeout(() => setSelectedPaymentId(selectedPaymentId), 100);
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Refund fehlgeschlagen');
      }
    } catch (error) {
      console.error('Refund failed:', error);
      alert('Refund fehlgeschlagen');
    } finally {
      setRefundLoading(false);
    }
  };
  
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <div className="text-sm text-gray-500">{total} Payments total</div>
      </div>
      
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Alle</option>
              <option value="pending">Pending</option>
              <option value="succeeded">Succeeded</option>
              <option value="partial_refunded">Partial Refunded</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Suche (PI ID)</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="pi_..."
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          
          {/* Date from */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Von</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          
          {/* Date to */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Bis</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PaymentIntent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shipper
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Keine Payments gefunden
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedPaymentId(payment.id)}
                        className="text-blue-600 hover:underline font-mono text-sm"
                      >
                        {payment.paymentIntentId.slice(0, 20)}...
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/jobs/${payment.jobId}`}
                        className="text-blue-600 hover:underline font-mono text-sm"
                      >
                        {payment.jobId.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-sm">{payment.shipperName}</div>
                        <div className="text-xs text-gray-500">{payment.shipperEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium">{formatCurrency(payment.amountEur)}</div>
                        {payment.refundedCents > 0 && (
                          <div className="text-xs text-red-600">
                            -{formatCurrency(payment.refundedCents / 100)} refundiert
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => setSelectedPaymentId(payment.id)}
                        className="text-blue-600 hover:underline mr-3"
                      >
                        View
                      </button>
                      {['succeeded', 'partial_refunded'].includes(payment.status.toLowerCase()) && (
                        <button
                          onClick={() => setRefundPayment(payment)}
                          className="text-red-600 hover:underline"
                        >
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-3 py-1 border rounded disabled:opacity-50 dark:border-gray-600"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-3 py-1 border rounded disabled:opacity-50 dark:border-gray-600"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Detail Panel */}
      {selectedPaymentId && (
        <PaymentDetailPanel
          paymentId={selectedPaymentId}
          onClose={() => setSelectedPaymentId(null)}
          onRefundClick={(p) => {
            setSelectedPaymentId(null);
            setRefundPayment(p);
          }}
        />
      )}
      
      {/* Refund Dialog */}
      {refundPayment && (
        <RefundDialog
          payment={refundPayment}
          onClose={() => setRefundPayment(null)}
          onRefund={handleRefund}
          loading={refundLoading}
        />
      )}
    </div>
  );
}
