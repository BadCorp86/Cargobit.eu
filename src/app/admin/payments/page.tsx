/**
 * CargoBit Admin - Payments List Page
 * 
 * Displays all payments with filtering and status badges.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/admin-layout';
import { DataTable, Column } from '@/components/admin/data-table';
import { FilterBar } from '@/components/admin/filter-bar';
import { StatusBadge } from '@/components/admin/status-badge';

// ============================================
// TYPES
// ============================================

interface Payment {
  id: string;
  paymentIntentId: string;
  jobId: string;
  shipperEmail: string;
  transporterEmail?: string;
  amountCents: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded' | 'partial_refund';
  refundedAmountCents: number;
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
// PAYMENTS LIST PAGE
// ============================================

export default function PaymentsListPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (filters.status) params.set('status', filters.status);
        
        const res = await fetch(`/api/admin/payments?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch payments');
        const data = await res.json();
        setPayments(data.payments || data);
      } catch (err) {
        console.error('Failed to fetch payments:', err);
        // Mock data for demo
        setPayments([
          {
            id: '1',
            paymentIntentId: 'pi_3QHxYZK8vLqD1234',
            jobId: 'job_abc123',
            shipperEmail: 'shipper@example.com',
            transporterEmail: 'transporter@example.com',
            amountCents: 25000,
            currency: 'EUR',
            status: 'succeeded',
            refundedAmountCents: 0,
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            paymentIntentId: 'pi_3QHxYZK8vLqD5678',
            jobId: 'job_def456',
            shipperEmail: 'customer@example.com',
            transporterEmail: 'driver@example.com',
            amountCents: 45000,
            currency: 'EUR',
            status: 'pending',
            refundedAmountCents: 0,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: '3',
            paymentIntentId: 'pi_3QHxYZK8vLqD9012',
            jobId: 'job_ghi789',
            shipperEmail: 'user@example.com',
            transporterEmail: 'carrier@example.com',
            amountCents: 12500,
            currency: 'EUR',
            status: 'refunded',
            refundedAmountCents: 12500,
            createdAt: new Date(Date.now() - 172800000).toISOString(),
          },
          {
            id: '4',
            paymentIntentId: 'pi_3QHxYZK8vLqD3456',
            jobId: 'job_jkl012',
            shipperEmail: 'business@example.com',
            amountCents: 89000,
            currency: 'EUR',
            status: 'partial_refund',
            refundedAmountCents: 25000,
            createdAt: new Date(Date.now() - 259200000).toISOString(),
          },
          {
            id: '5',
            paymentIntentId: 'pi_3QHxYZK8vLqD7890',
            jobId: 'job_mno345',
            shipperEmail: 'test@example.com',
            amountCents: 15000,
            currency: 'EUR',
            status: 'failed',
            refundedAmountCents: 0,
            createdAt: new Date(Date.now() - 345600000).toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [searchQuery, filters]);

  const columns: Column<Payment>[] = [
    {
      key: 'paymentIntentId',
      header: 'Payment Intent',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm">{row.paymentIntentId}</span>
      ),
    },
    {
      key: 'shipperEmail',
      header: 'Shipper',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-sm">{row.shipperEmail}</p>
          {row.transporterEmail && (
            <p className="text-xs text-gray-500">{row.transporterEmail}</p>
          )}
        </div>
      ),
    },
    {
      key: 'amountCents',
      header: 'Betrag',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">{formatCurrency(row.amountCents, row.currency)}</p>
          {row.refundedAmountCents > 0 && (
            <p className="text-xs text-orange-600">
              -{formatCurrency(row.refundedAmountCents, row.currency)} erstattet
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Erstellt',
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/admin/payments/${row.id}`);
          }}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Details
        </button>
      ),
    },
  ];

  const filterOptions = [
    {
      name: 'status',
      label: 'Status',
      options: [
        { value: 'succeeded', label: 'Erfolgreich' },
        { value: 'pending', label: 'Ausstehend' },
        { value: 'failed', label: 'Fehlgeschlagen' },
        { value: 'refunded', label: 'Erstattet' },
        { value: 'partial_refund', label: 'Teilerstattung' },
      ],
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Payments
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Verwalten Sie alle Zahlungen und Erstattungen
            </p>
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          onSearch={setSearchQuery}
          onFilter={setFilters}
          searchPlaceholder="Payment Intent, Email suchen..."
          filters={filterOptions}
          dateRange
        />

        {/* Payments Table */}
        <DataTable
          columns={columns}
          data={payments}
          keyField="id"
          loading={loading}
          onRowClick={(row) => router.push(`/admin/payments/${row.id}`)}
          emptyMessage="Keine Payments gefunden"
        />
      </div>
    </AdminLayout>
  );
}
