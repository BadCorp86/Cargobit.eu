/**
 * CargoBit Admin - Users List Page
 * 
 * Displays all users with blocking capability.
 */

'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import { DataTable, Column } from '@/components/admin/data-table';
import { FilterBar } from '@/components/admin/filter-bar';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmModal } from '@/components/admin/modal';

// ============================================
// TYPES
// ============================================

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: 'active' | 'pending' | 'blocked' | 'suspended';
  companyId?: string;
  companyName?: string;
  createdAt: string;
  lastLoginAt?: string;
}

// ============================================
// USERS LIST PAGE
// ============================================

export default function UsersListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (filters.status) params.set('status', filters.status);
        if (filters.role) params.set('role', filters.role);

        const res = await fetch(`/api/admin/users?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        setUsers(data.users || data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        // Mock data for demo
        setUsers([
          {
            id: 'user_1',
            email: 'shipper@example.com',
            firstName: 'Max',
            lastName: 'Mustermann',
            role: 'SHIPPER_COMPANY',
            status: 'active',
            companyName: 'Mustermann Logistics GmbH',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          },
          {
            id: 'user_2',
            email: 'driver@example.com',
            firstName: 'Anna',
            lastName: 'Schmidt',
            role: 'DRIVER_SELF_EMPLOYED',
            status: 'active',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'user_3',
            email: 'suspicious@example.com',
            firstName: 'Unbekannt',
            role: 'SHIPPER_PRIVATE',
            status: 'blocked',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
          },
          {
            id: 'user_4',
            email: 'new@example.com',
            firstName: 'Neuer',
            lastName: 'Benutzer',
            role: 'SHIPPER_PRIVATE',
            status: 'pending',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [searchQuery, filters]);

  const handleBlockUser = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedUser.status === 'blocked' ? 'active' : 'blocked',
          reason: blockReason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Action failed');
      }

      // Update local state
      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, status: selectedUser.status === 'blocked' ? 'active' : 'blocked' }
          : u
      ));

      setShowBlockModal(false);
      setSelectedUser(null);
      setBlockReason('');
    } catch (err: any) {
      console.error('Failed to update user:', err);
      alert(err.message || 'Fehler beim Aktualisieren des Benutzers');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      'SHIPPER_COMPANY': 'Shipper (Firma)',
      'SHIPPER_PRIVATE': 'Shipper (Privat)',
      'DRIVER_SELF_EMPLOYED': 'Fahrer',
      'DISPATCHER': 'Dispatcher',
      'ADMIN': 'Admin',
      'SUPPORT': 'Support',
    };
    return labels[role] || role;
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">
            {row.firstName || row.lastName 
              ? `${row.firstName || ''} ${row.lastName || ''}`.trim() 
              : '-'}
          </p>
          <p className="text-sm text-gray-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rolle',
      sortable: true,
      render: (row) => (
        <span className="text-sm">{getRoleLabel(row.role)}</span>
      ),
    },
    {
      key: 'companyName',
      header: 'Firma',
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.companyName || '-'}
        </span>
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
      key: 'lastLoginAt',
      header: 'Letzter Login',
      sortable: true,
      render: (row) => row.lastLoginAt 
        ? new Date(row.lastLoginAt).toLocaleDateString('de-DE')
        : '-',
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center space-x-2">
          {row.status !== 'blocked' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(row);
                setShowBlockModal(true);
              }}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Sperren
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(row);
                setShowBlockModal(true);
              }}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              Entsperren
            </button>
          )}
        </div>
      ),
    },
  ];

  const filterOptions = [
    {
      name: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Aktiv' },
        { value: 'pending', label: 'Ausstehend' },
        { value: 'blocked', label: 'Gesperrt' },
        { value: 'suspended', label: 'Suspendiert' },
      ],
    },
    {
      name: 'role',
      label: 'Rolle',
      options: [
        { value: 'SHIPPER_COMPANY', label: 'Shipper (Firma)' },
        { value: 'SHIPPER_PRIVATE', label: 'Shipper (Privat)' },
        { value: 'DRIVER_SELF_EMPLOYED', label: 'Fahrer' },
        { value: 'DISPATCHER', label: 'Dispatcher' },
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
              Benutzer
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Verwalten Sie alle registrierten Benutzer
            </p>
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          onSearch={setSearchQuery}
          onFilter={setFilters}
          searchPlaceholder="Name, Email suchen..."
          filters={filterOptions}
          dateRange
        />

        {/* Users Table */}
        <DataTable
          columns={columns}
          data={users}
          keyField="id"
          loading={loading}
          emptyMessage="Keine Benutzer gefunden"
        />
      </div>

      {/* Block/Unblock Modal */}
      <ConfirmModal
        isOpen={showBlockModal}
        onClose={() => {
          setShowBlockModal(false);
          setSelectedUser(null);
          setBlockReason('');
        }}
        onConfirm={handleBlockUser}
        title={selectedUser?.status === 'blocked' ? 'Benutzer entsperren' : 'Benutzer sperren'}
        message={
          selectedUser?.status === 'blocked'
            ? `Möchten Sie ${selectedUser.email} wirklich entsperren?`
            : `Möchten Sie ${selectedUser?.email} wirklich sperren?`
        }
        confirmLabel={selectedUser?.status === 'blocked' ? 'Entsperren' : 'Sperren'}
        variant={selectedUser?.status === 'blocked' ? 'info' : 'danger'}
        loading={submitting}
      />
    </AdminLayout>
  );
}
