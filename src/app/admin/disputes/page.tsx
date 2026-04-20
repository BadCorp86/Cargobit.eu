/**
 * CargoBit Admin - Disputes List Page
 * 
 * Displays all disputes with resolution capability.
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

interface Dispute {
  id: string;
  jobId: string;
  shipperEmail: string;
  transporterEmail: string;
  reason: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolution?: string;
  refundAmountCents?: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// DISPUTES LIST PAGE
// ============================================

export default function DisputesListPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (filters.status) params.set('status', filters.status);

        const res = await fetch(`/api/admin/disputes?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch disputes');
        const data = await res.json();
        setDisputes(data.disputes || data);
      } catch (err) {
        console.error('Failed to fetch disputes:', err);
        // Mock data for demo
        setDisputes([
          {
            id: 'dispute_1',
            jobId: 'job_abc123',
            shipperEmail: 'shipper@example.com',
            transporterEmail: 'transporter@example.com',
            reason: 'Waren beschädigt angekommen',
            status: 'open',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'dispute_2',
            jobId: 'job_def456',
            shipperEmail: 'customer@example.com',
            transporterEmail: 'driver@example.com',
            reason: 'Verspätete Lieferung',
            status: 'in_progress',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'dispute_3',
            jobId: 'job_ghi789',
            shipperEmail: 'user@example.com',
            transporterEmail: 'carrier@example.com',
            reason: 'Falsche Fracht geliefert',
            status: 'resolved',
            resolution: 'refund_full',
            refundAmountCents: 12500,
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, [searchQuery, filters]);

  const columns: Column<Dispute>[] = [
    {
      key: 'id',
      header: 'Dispute ID',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm">{row.id.slice(0, 12)}...</span>
      ),
    },
    {
      key: 'jobId',
      header: 'Job ID',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm">{row.jobId}</span>
      ),
    },
    {
      key: 'participants',
      header: 'Beteiligte',
      render: (row) => (
        <div>
          <p className="text-sm font-medium">{row.shipperEmail}</p>
          <p className="text-xs text-gray-500">vs. {row.transporterEmail}</p>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Grund',
      render: (row) => (
        <p className="text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
          {row.reason}
        </p>
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
      render: (row) => new Date(row.createdAt).toLocaleDateString('de-DE'),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/admin/disputes/${row.id}`);
          }}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Bearbeiten
        </button>
      ),
    },
  ];

  const filterOptions = [
    {
      name: 'status',
      label: 'Status',
      options: [
        { value: 'open', label: 'Offen' },
        { value: 'in_progress', label: 'In Bearbeitung' },
        { value: 'resolved', label: 'Gelöst' },
        { value: 'closed', label: 'Geschlossen' },
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
              Disputes
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Verwalten Sie Konflikte zwischen Shippern und Transportern
            </p>
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          onSearch={setSearchQuery}
          onFilter={setFilters}
          searchPlaceholder="Dispute ID, Job ID, Email suchen..."
          filters={filterOptions}
          dateRange
        />

        {/* Disputes Table */}
        <DataTable
          columns={columns}
          data={disputes}
          keyField="id"
          loading={loading}
          onRowClick={(row) => router.push(`/admin/disputes/${row.id}`)}
          emptyMessage="Keine Disputes gefunden"
        />
      </div>
    </AdminLayout>
  );
}
