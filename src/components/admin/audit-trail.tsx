/**
 * CargoBit Admin - Audit Trail Component
 * 
 * Displays audit log entries with timeline view.
 */

'use client';

import React from 'react';
import { StatusBadge } from './status-badge';

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

interface AuditTrailProps {
  entries: AuditEntry[];
  loading?: boolean;
}

// ============================================
// ACTION LABELS
// ============================================

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  refund: 'Erstattung',
  payout: 'Auszahlung',
  user_block: 'Benutzer gesperrt',
  user_unblock: 'Benutzer entsperrt',
  dispute_resolve: 'Dispute gelöst',
  payment_view: 'Payment angesehen',
  settings_change: 'Einstellungen geändert',
  admin_created: 'Admin erstellt',
  admin_deactivated: 'Admin deaktiviert',
  role_updated: 'Rolle aktualisiert',
  '2fa_enabled': '2FA aktiviert',
  '2fa_disabled': '2FA deaktiviert',
};

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  logout: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  refund: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  payout: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  user_block: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  user_unblock: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  dispute_resolve: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

// ============================================
// COMPONENT
// ============================================

export function AuditTrail({ entries, loading = false }: AuditTrailProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Audit Trail
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Audit Trail
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          Keine Audit-Einträge vorhanden
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Audit Trail
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        {/* Entries */}
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <div key={entry.id} className="relative pl-10">
              {/* Timeline dot */}
              <div className={`
                absolute left-2 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800
                ${ACTION_COLORS[entry.action] || ACTION_COLORS.default}
              `} />

              {/* Content */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`
                    inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                    ${ACTION_COLORS[entry.action] || ACTION_COLORS.default}
                  `}>
                    {ACTION_LABELS[entry.action] || entry.action}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(entry.createdAt).toLocaleString('de-DE')}
                  </span>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{entry.adminEmail}</span>
                  {' – '}
                  <span className="text-gray-500">{entry.entityType}</span>
                  {entry.entityId && (
                    <span className="text-gray-400 ml-1">({entry.entityId.slice(0, 8)}...)</span>
                  )}
                </p>

                {entry.ipAddress && (
                  <p className="text-xs text-gray-400 mt-1">
                    IP: {entry.ipAddress}
                  </p>
                )}

                {/* Data changes */}
                {(entry.dataBefore || entry.dataAfter) && (
                  <details className="mt-2">
                    <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                      Details anzeigen
                    </summary>
                    <div className="mt-2 space-y-2">
                      {entry.dataBefore && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Vorher:</p>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                            {JSON.stringify(JSON.parse(entry.dataBefore), null, 2)}
                          </pre>
                        </div>
                      )}
                      {entry.dataAfter && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Nachher:</p>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                            {JSON.stringify(JSON.parse(entry.dataAfter), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXPORTS
// ============================================

export type { AuditEntry, AuditTrailProps };
