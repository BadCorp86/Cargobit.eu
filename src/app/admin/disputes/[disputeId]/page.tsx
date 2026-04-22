/**
 * CargoBit Admin - Dispute Detail Page
 * 
 * Detailed view and resolution of a dispute.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/admin-layout';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmModal } from '@/components/admin/modal';

// ============================================
// TYPES
// ============================================

interface Message {
  id: string;
  senderId: string;
  senderEmail: string;
  senderRole: 'shipper' | 'transporter' | 'admin';
  message: string;
  attachments?: string[];
  createdAt: string;
}

interface DisputeDetail {
  id: string;
  jobId: string;
  shipper: {
    id: string;
    email: string;
    name?: string;
  };
  transporter: {
    id: string;
    email: string;
    name?: string;
  };
  reason: string;
  description?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolution?: 'refund_full' | 'refund_partial' | 'reject' | 'other';
  resolutionNote?: string;
  refundAmountCents?: number;
  paymentAmountCents: number;
  currency: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
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

function getRoleLabel(role: string): string {
  switch (role) {
    case 'shipper': return 'Shipper';
    case 'transporter': return 'Transporter';
    case 'admin': return 'Admin';
    default: return role;
  }
}

// ============================================
// DISPUTE DETAIL PAGE
// ============================================

export default function DisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.disputeId as string;

  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolutionType, setResolutionType] = useState<'refund_full' | 'refund_partial' | 'reject' | 'other'>('reject');
  const [partialAmount, setPartialAmount] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const fetchDispute = async () => {
      try {
        const res = await fetch(`/api/admin/disputes/${disputeId}`);
        if (!res.ok) throw new Error('Dispute not found');
        const data = await res.json();
        setDispute(data);
      } catch (err) {
        console.error('Failed to fetch dispute:', err);
        setError('Dispute konnte nicht geladen werden');
        // Mock data for demo
        setDispute({
          id: disputeId,
          jobId: 'job_abc123',
          shipper: {
            id: 'user_123',
            email: 'shipper@example.com',
            name: 'Max Mustermann',
          },
          transporter: {
            id: 'user_456',
            email: 'transporter@example.com',
            name: 'Anna Schmidt',
          },
          reason: 'Waren beschädigt angekommen',
          description: 'Die Ware wurde in beschädigtem Zustand geliefert. Mehrere Kartons waren aufgerissen und der Inhalt beschädigt.',
          status: 'open',
          paymentAmountCents: 25000,
          currency: 'EUR',
          messages: [
            {
              id: 'msg_1',
              senderId: 'user_123',
              senderEmail: 'shipper@example.com',
              senderRole: 'shipper',
              message: 'Ich möchte eine Erstattung, da die Ware beschädigt ist.',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'msg_2',
              senderId: 'user_456',
              senderEmail: 'transporter@example.com',
              senderRole: 'transporter',
              message: 'Die Ware wurde ordnungsgemäß geladen und transportiert. Die Beschädigung muss bereits vor dem Transport entstanden sein.',
              createdAt: new Date(Date.now() - 3600000).toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDispute();
  }, [disputeId]);

  const handleResolve = async () => {
    if (!dispute) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution: resolutionType,
          refundAmountCents: resolutionType === 'refund_partial' 
            ? Math.round(parseFloat(partialAmount) * 100) 
            : resolutionType === 'refund_full' 
              ? dispute.paymentAmountCents 
              : 0,
          note: resolutionNote,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Resolution failed');
      }

      router.push('/admin/disputes');
    } catch (err: any) {
      console.error('Failed to resolve dispute:', err);
      alert(err.message || 'Fehler beim Auflösen des Disputes');
    } finally {
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  if (error && !dispute) {
    return (
      <AdminLayout>
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </AdminLayout>
    );
  }

  if (!dispute) return null;

  const canResolve = dispute.status === 'open' || dispute.status === 'in_progress';

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/disputes')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Dispute Details
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Job: {dispute.jobId}
              </p>
            </div>
          </div>
          <StatusBadge status={dispute.status} size="lg" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Message Thread */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Konversation
              </h3>

              {/* Messages */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {dispute.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderRole === 'admin' ? 'justify-center' : msg.senderRole === 'shipper' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`
                      max-w-md p-4 rounded-lg
                      ${msg.senderRole === 'admin' 
                        ? 'bg-blue-50 dark:bg-blue-900/30' 
                        : msg.senderRole === 'shipper' 
                          ? 'bg-gray-100 dark:bg-gray-700' 
                          : 'bg-green-50 dark:bg-green-900/30'
                      }
                    `}>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`
                          text-xs font-medium px-2 py-0.5 rounded
                          ${msg.senderRole === 'admin' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200' 
                            : msg.senderRole === 'shipper' 
                              ? 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200' 
                              : 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                          }
                        `}>
                          {getRoleLabel(msg.senderRole)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.createdAt).toLocaleString('de-DE')}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Resolution Panel */}
          <div className="space-y-6">
            {/* Participants Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Beteiligte
              </h3>
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Shipper</p>
                  <p className="font-medium">{dispute.shipper.name || dispute.shipper.email}</p>
                  <p className="text-sm text-gray-500">{dispute.shipper.email}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Transporter</p>
                  <p className="font-medium">{dispute.transporter.name || dispute.transporter.email}</p>
                  <p className="text-sm text-gray-500">{dispute.transporter.email}</p>
                </div>
              </div>
            </div>

            {/* Dispute Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Grund</p>
                  <p className="font-medium">{dispute.reason}</p>
                </div>
                {dispute.description && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Beschreibung</p>
                    <p className="text-sm">{dispute.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Zahlungsbetrag</p>
                  <p className="font-medium">{formatCurrency(dispute.paymentAmountCents, dispute.currency)}</p>
                </div>
              </div>
            </div>

            {/* Resolution Form */}
            {canResolve && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Dispute auflösen
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Entscheidung
                    </label>
                    <select
                      value={resolutionType}
                      onChange={(e) => setResolutionType(e.target.value as any)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    >
                      <option value="reject">Ablehnen (Keine Erstattung)</option>
                      <option value="refund_full">Volle Erstattung</option>
                      <option value="refund_partial">Teilerstattung</option>
                      <option value="other">Sonstige Lösung</option>
                    </select>
                  </div>

                  {resolutionType === 'refund_partial' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Erstattungsbetrag (EUR)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        placeholder={`Max: ${formatCurrency(dispute.paymentAmountCents, dispute.currency)}`}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bemerkung
                    </label>
                    <textarea
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      rows={3}
                      placeholder="Optionale Bemerkung zur Entscheidung..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    />
                  </div>

                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={submitting}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Dispute auflösen
                  </button>
                </div>
              </div>
            )}

            {/* Existing Resolution */}
            {dispute.status === 'resolved' && dispute.resolution && (
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                  Gelöst
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Entscheidung: {dispute.resolution === 'refund_full' ? 'Volle Erstattung' : 
                    dispute.resolution === 'refund_partial' ? 'Teilerstattung' : 
                    dispute.resolution === 'reject' ? 'Abgelehnt' : 'Sonstige'}
                </p>
                {dispute.refundAmountCents && (
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Erstattet: {formatCurrency(dispute.refundAmountCents, dispute.currency)}
                  </p>
                )}
                {dispute.resolutionNote && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    {dispute.resolutionNote}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleResolve}
        title="Dispute auflösen"
        message={`Möchten Sie diesen Dispute wirklich ${
          resolutionType === 'refund_full' ? 'mit voller Erstattung' :
          resolutionType === 'refund_partial' ? 'mit Teilerstattung' :
          resolutionType === 'reject' ? 'ohne Erstattung' : 'anders'
        } auflösen?`}
        confirmLabel="Auflösen"
        variant={resolutionType === 'reject' ? 'warning' : 'info'}
        loading={submitting}
      />
    </AdminLayout>
  );
}
