/**
 * CargoBit Admin - System Settings Page
 * 
 * System configuration settings.
 */

'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/admin-layout';

// ============================================
// TYPES
// ============================================

interface SystemSettings {
  platformFeePercent: number;
  minPayoutAmount: number;
  maxPayoutAmount: number;
  payoutProcessingDays: number;
  disputeResolutionDays: number;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
}

// ============================================
// SETTINGS PAGE
// ============================================

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    platformFeePercent: 3.5,
    minPayoutAmount: 50,
    maxPayoutAmount: 50000,
    payoutProcessingDays: 3,
    disputeResolutionDays: 14,
    maintenanceMode: false,
    registrationEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              System Einstellungen
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Konfiguration der Plattform-Parameter
            </p>
          </div>
          {saved && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              Gespeichert!
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Fee Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Gebühren
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Plattformgebühr (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.platformFeePercent}
                    onChange={(e) => setSettings({ ...settings, platformFeePercent: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* Payout Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Auszahlungen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min. Auszahlungsbetrag (EUR)
                  </label>
                  <input
                    type="number"
                    value={settings.minPayoutAmount}
                    onChange={(e) => setSettings({ ...settings, minPayoutAmount: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max. Auszahlungsbetrag (EUR)
                  </label>
                  <input
                    type="number"
                    value={settings.maxPayoutAmount}
                    onChange={(e) => setSettings({ ...settings, maxPayoutAmount: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bearbeitungszeit (Tage)
                  </label>
                  <input
                    type="number"
                    value={settings.payoutProcessingDays}
                    onChange={(e) => setSettings({ ...settings, payoutProcessingDays: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* Dispute Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Disputes
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Automatische Lösung nach (Tage)
                </label>
                <input
                  type="number"
                  value={settings.disputeResolutionDays}
                  onChange={(e) => setSettings({ ...settings, disputeResolutionDays: parseInt(e.target.value) })}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                />
              </div>
            </div>

            {/* System Toggles */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                System
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Wartungsmodus</p>
                    <p className="text-sm text-gray-500">Plattform für Benutzer sperren</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      ${settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-700'}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Registrierung aktiv</p>
                    <p className="text-sm text-gray-500">Neue Registrierungen erlauben</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, registrationEnabled: !settings.registrationEnabled })}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      ${settings.registrationEnabled ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${settings.registrationEnabled ? 'translate-x-6' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Speichern...' : 'Einstellungen speichern'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
