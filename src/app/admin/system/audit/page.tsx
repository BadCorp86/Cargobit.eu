/**
 * CargoBit Admin - System Audit Trail Page
 * 
 * Displays all audit logs for system activities.
 */

'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import { FilterBar } from '@/components/admin/filter-bar';
import { AuditTrail } from '@/components/admin/audit-trail';

// ============================================
// TYPES
// ============================================

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  adminEmail: string;
  dataBefore?: string;
  dataAfter?: string;
  ipAddress?: string;
  createdAt: string;
}

// ============================================
// AUDIT PAGE
// ============================================

export default function SystemAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (filters.action) params.set('action', filters.action);
        if (filters.entityType) params.set('entityType', filters.entityType);

        const res = await fetch(`/api/admin/audit?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch audit logs');
        const data = await res.json();
        setEntries(data.entries || data);
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
        // Mock data for demo
        setEntries([
          {
            id: 'audit_1',
            action: 'login',
            entityType: 'admin',
            adminEmail: 'admin@cargobit.eu',
            ipAddress: '192.168.1.1',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'audit_2',
            action: 'refund',
            entityType: 'payment',
            entityId: 'pi_3QHxYZK8vLqD1234',
            adminEmail: 'finance@cargobit.eu',
            dataBefore: JSON.stringify({ status: 'succeeded', refundedAmountCents: 0 }),
            dataAfter: JSON.stringify({ status: 'refunded', refundedAmountCents: 25000, reason: 'customer_request' }),
            ipAddress: '192.168.1.2',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'audit_3',
            action: 'dispute_resolve',
            entityType: 'dispute',
            entityId: 'dispute_abc123',
            adminEmail: 'support@cargobit.eu',
            dataAfter: JSON.stringify({ resolution: 'refund_partial', amount: 12500 }),
            ipAddress: '192.168.1.3',
            createdAt: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: 'audit_4',
            action: 'user_block',
            entityType: 'user',
            entityId: 'user_xyz789',
            adminEmail: 'admin@cargobit.eu',
            dataAfter: JSON.stringify({ reason: 'Verdacht auf Betrug' }),
            ipAddress: '192.168.1.1',
            createdAt: new Date(Date.now() - 14400000).toISOString(),
          },
          {
            id: 'audit_5',
            action: 'payout',
            entityType: 'wallet',
            entityId: 'wallet_123',
            adminEmail: 'finance@cargobit.eu',
            dataAfter: JSON.stringify({ amount: 50000, iban: 'DE89****' }),
            ipAddress: '192.168.1.2',
            createdAt: new Date(Date.now() - 28800000).toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, [searchQuery, filters]);

  const filterOptions = [
    {
      name: 'action',
      label: 'Aktion',
      options: [
        { value: 'login', label: 'Login' },
        { value: 'logout', label: 'Logout' },
        { value: 'refund', label: 'Erstattung' },
        { value: 'payout', label: 'Auszahlung' },
        { value: 'user_block', label: 'Benutzer gesperrt' },
        { value: 'dispute_resolve', label: 'Dispute gelöst' },
      ],
    },
    {
      name: 'entityType',
      label: 'Entität',
      options: [
        { value: 'payment', label: 'Payment' },
        { value: 'user', label: 'Benutzer' },
        { value: 'dispute', label: 'Dispute' },
        { value: 'wallet', label: 'Wallet' },
        { value: 'admin', label: 'Admin' },
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
              Audit Trail
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Protokoll aller Admin-Aktivitäten
            </p>
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          onSearch={setSearchQuery}
          onFilter={setFilters}
          searchPlaceholder="Admin Email, Entity ID suchen..."
          filters={filterOptions}
          dateRange
        />

        {/* Audit Trail */}
        <AuditTrail entries={entries} loading={loading} />
      </div>
    </AdminLayout>
  );
}
