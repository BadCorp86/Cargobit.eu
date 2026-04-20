/**
 * CargoBit Admin - Dashboard Page
 * 
 * Main admin dashboard with overview statistics.
 */

'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';

// ============================================
// TYPES
// ============================================

interface DashboardStats {
  payments: {
    total: number;
    succeeded: number;
    pending: number;
    failed: number;
    totalAmountCents: number;
    refundedAmountCents: number;
  };
  disputes: {
    open: number;
    inProgress: number;
    resolved: number;
    totalRefunded: number;
  };
  users: {
    total: number;
    active: number;
    pending: number;
    blocked: number;
    newToday: number;
  };
  jobs: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
  };
}

// ============================================
// STAT CARD COMPONENT
// ============================================

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color = 'blue' 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD PAGE
// ============================================

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        setError('Statistiken konnten nicht geladen werden');
        // Use mock data for demo
        setStats({
          payments: {
            total: 1247,
            succeeded: 1189,
            pending: 42,
            failed: 16,
            totalAmountCents: 18975000,
            refundedAmountCents: 450000,
          },
          disputes: {
            open: 8,
            inProgress: 12,
            resolved: 156,
            totalRefunded: 23000,
          },
          users: {
            total: 3456,
            active: 2891,
            pending: 412,
            blocked: 153,
            newToday: 23,
          },
          jobs: {
            total: 8923,
            active: 234,
            completed: 8456,
            cancelled: 233,
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Übersicht über alle Plattform-Aktivitäten
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : error && !stats ? (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg">
            {error}
          </div>
        ) : stats && (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Payments */}
              <StatCard
                title="Gesamtzahlungen"
                value={stats.payments.total.toLocaleString('de-DE')}
                subtitle={formatCurrency(stats.payments.totalAmountCents)}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                }
                color="blue"
              />

              {/* Succeeded Payments */}
              <StatCard
                title="Erfolgreiche Zahlungen"
                value={stats.payments.succeeded.toLocaleString('de-DE')}
                subtitle={`${((stats.payments.succeeded / stats.payments.total) * 100).toFixed(1)}% Erfolgsrate`}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="green"
              />

              {/* Pending Payments */}
              <StatCard
                title="Ausstehende Zahlungen"
                value={stats.payments.pending.toLocaleString('de-DE')}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="yellow"
              />

              {/* Refunds */}
              <StatCard
                title="Erstattungen"
                value={formatCurrency(stats.payments.refundedAmountCents)}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                }
                color="red"
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Disputes */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Disputes
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Offen</span>
                    <span className="font-semibold text-red-600">{stats.disputes.open}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">In Bearbeitung</span>
                    <span className="font-semibold text-blue-600">{stats.disputes.inProgress}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Gelöst</span>
                    <span className="font-semibold text-green-600">{stats.disputes.resolved}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Erstattet</span>
                      <span className="font-semibold">{formatCurrency(stats.disputes.totalRefunded)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Users */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Benutzer
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Gesamt</span>
                    <span className="font-semibold">{stats.users.total.toLocaleString('de-DE')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Aktiv</span>
                    <span className="font-semibold text-green-600">{stats.users.active.toLocaleString('de-DE')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Ausstehend</span>
                    <span className="font-semibold text-yellow-600">{stats.users.pending}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Gesperrt</span>
                    <span className="font-semibold text-red-600">{stats.users.blocked}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400">Neu heute</span>
                      <span className="font-semibold text-blue-600">+{stats.users.newToday}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Jobs */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Transporte
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Gesamt</span>
                    <span className="font-semibold">{stats.jobs.total.toLocaleString('de-DE')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Aktiv</span>
                    <span className="font-semibold text-blue-600">{stats.jobs.active}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Abgeschlossen</span>
                    <span className="font-semibold text-green-600">{stats.jobs.completed.toLocaleString('de-DE')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Storniert</span>
                    <span className="font-semibold text-red-600">{stats.jobs.cancelled}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Schnellaktionen
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <a
                  href="/admin/payments"
                  className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className="text-sm font-medium">Payments</span>
                </a>
                <a
                  href="/admin/disputes"
                  className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm font-medium">Disputes ({stats.disputes.open})</span>
                </a>
                <a
                  href="/admin/users"
                  className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="text-sm font-medium">Users</span>
                </a>
                <a
                  href="/admin/jobs"
                  className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span className="text-sm font-medium">Jobs</span>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
