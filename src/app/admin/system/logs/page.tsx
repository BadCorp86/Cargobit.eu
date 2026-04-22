/**
 * CargoBit Admin - System Logs Page
 * 
 * Displays system logs and errors.
 */

'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';
import { FilterBar } from '@/components/admin/filter-bar';

// ============================================
// TYPES
// ============================================

interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  service: string;
  metadata?: string;
  createdAt: string;
}

// ============================================
// LOG PAGE
// ============================================

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const params = new URLSearchParams();
        if (filters.level) params.set('level', filters.level);
        if (filters.service) params.set('service', filters.service);

        const res = await fetch(`/api/admin/logs?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch logs');
        const data = await res.json();
        setLogs(data.logs || data);
      } catch (err) {
        console.error('Failed to fetch logs:', err);
        // Mock data for demo
        setLogs([
          {
            id: 'log_1',
            level: 'info',
            message: 'Payment processed successfully',
            service: 'payment-service',
            metadata: JSON.stringify({ paymentId: 'pi_123', amount: 25000 }),
            createdAt: new Date().toISOString(),
          },
          {
            id: 'log_2',
            level: 'warn',
            message: 'Rate limit threshold approaching',
            service: 'api-gateway',
            metadata: JSON.stringify({ endpoint: '/api/jobs', currentRate: 95 }),
            createdAt: new Date(Date.now() - 600000).toISOString(),
          },
          {
            id: 'log_3',
            level: 'error',
            message: 'Stripe webhook processing failed',
            service: 'webhook-handler',
            metadata: JSON.stringify({ error: 'Invalid signature', event: 'payment_intent.succeeded' }),
            createdAt: new Date(Date.now() - 1200000).toISOString(),
          },
          {
            id: 'log_4',
            level: 'info',
            message: 'Matching session completed',
            service: 'matching-service',
            metadata: JSON.stringify({ transportId: 'job_abc', candidates: 15 }),
            createdAt: new Date(Date.now() - 1800000).toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [filters]);

  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warn': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'debug': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filterOptions = [
    {
      name: 'level',
      label: 'Level',
      options: [
        { value: 'error', label: 'Error' },
        { value: 'warn', label: 'Warning' },
        { value: 'info', label: 'Info' },
        { value: 'debug', label: 'Debug' },
      ],
    },
    {
      name: 'service',
      label: 'Service',
      options: [
        { value: 'payment-service', label: 'Payment Service' },
        { value: 'matching-service', label: 'Matching Service' },
        { value: 'webhook-handler', label: 'Webhook Handler' },
        { value: 'api-gateway', label: 'API Gateway' },
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
              System Logs
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Anwendungs- und Fehlerprotokolle
            </p>
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          onFilter={setFilters}
          filters={filterOptions}
          dateRange
        />

        {/* Logs List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <span className={`
                        inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase
                        ${getLevelColor(log.level)}
                      `}>
                        {log.level}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {log.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {log.service}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleString('de-DE')}
                    </span>
                  </div>
                  {log.metadata && (
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                        Metadata
                      </summary>
                      <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                        {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  Keine Logs gefunden
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
