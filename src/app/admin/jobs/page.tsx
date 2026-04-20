/**
 * CargoBit Admin - Jobs List Page
 * 
 * Displays all transport jobs.
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

interface Job {
  id: string;
  status: 'created' | 'published' | 'assigned' | 'in_transit' | 'completed' | 'cancelled';
  shipperEmail: string;
  transporterEmail?: string;
  pickupCity: string;
  pickupCountry: string;
  deliveryCity: string;
  deliveryCountry: string;
  price: number;
  currency: string;
  createdAt: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// ============================================
// JOBS LIST PAGE
// ============================================

export default function JobsListPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (filters.status) params.set('status', filters.status);

        const res = await fetch(`/api/admin/jobs?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch jobs');
        const data = await res.json();
        setJobs(data.jobs || data);
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
        // Mock data for demo
        setJobs([
          {
            id: 'job_1',
            status: 'in_transit',
            shipperEmail: 'shipper@example.com',
            transporterEmail: 'driver@example.com',
            pickupCity: 'Berlin',
            pickupCountry: 'DE',
            deliveryCity: 'München',
            deliveryCountry: 'DE',
            price: 450,
            currency: 'EUR',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'job_2',
            status: 'assigned',
            shipperEmail: 'customer@example.com',
            transporterEmail: 'carrier@example.com',
            pickupCity: 'Hamburg',
            pickupCountry: 'DE',
            deliveryCity: 'Wien',
            deliveryCountry: 'AT',
            price: 890,
            currency: 'EUR',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: 'job_3',
            status: 'completed',
            shipperEmail: 'business@example.com',
            transporterEmail: 'transporter@example.com',
            pickupCity: 'Frankfurt',
            pickupCountry: 'DE',
            deliveryCity: 'Paris',
            deliveryCountry: 'FR',
            price: 1200,
            currency: 'EUR',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
          },
          {
            id: 'job_4',
            status: 'published',
            shipperEmail: 'user@example.com',
            pickupCity: 'Köln',
            pickupCountry: 'DE',
            deliveryCity: 'Amsterdam',
            deliveryCountry: 'NL',
            price: 380,
            currency: 'EUR',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [searchQuery, filters]);

  const columns: Column<Job>[] = [
    {
      key: 'id',
      header: 'Job ID',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm">{row.id}</span>
      ),
    },
    {
      key: 'route',
      header: 'Route',
      render: (row) => (
        <div>
          <p className="text-sm">{row.pickupCity}, {row.pickupCountry}</p>
          <p className="text-xs text-gray-500">→ {row.deliveryCity}, {row.deliveryCountry}</p>
        </div>
      ),
    },
    {
      key: 'shipperEmail',
      header: 'Shipper',
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm">{row.shipperEmail}</p>
          {row.transporterEmail && (
            <p className="text-xs text-gray-500">{row.transporterEmail}</p>
          )}
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Preis',
      sortable: true,
      render: (row) => (
        <span className="font-medium">{formatCurrency(row.price, row.currency)}</span>
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
            router.push(`/admin/jobs/${row.id}`);
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
        { value: 'created', label: 'Erstellt' },
        { value: 'published', label: 'Veröffentlicht' },
        { value: 'assigned', label: 'Zugewiesen' },
        { value: 'in_transit', label: 'Unterwegs' },
        { value: 'completed', label: 'Abgeschlossen' },
        { value: 'cancelled', label: 'Storniert' },
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
              Transporte
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Übersicht aller Transportaufträge
            </p>
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          onSearch={setSearchQuery}
          onFilter={setFilters}
          searchPlaceholder="Job ID, Email, Stadt suchen..."
          filters={filterOptions}
          dateRange
        />

        {/* Jobs Table */}
        <DataTable
          columns={columns}
          data={jobs}
          keyField="id"
          loading={loading}
          onRowClick={(row) => router.push(`/admin/jobs/${row.id}`)}
          emptyMessage="Keine Transporte gefunden"
        />
      </div>
    </AdminLayout>
  );
}
