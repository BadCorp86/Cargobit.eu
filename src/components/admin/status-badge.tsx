/**
 * CargoBit Admin - Status Badge Component
 * 
 * Reusable status badge with role-based colors.
 */

import React from 'react';

// ============================================
// TYPES
// ============================================

type PaymentStatus = 'succeeded' | 'pending' | 'failed' | 'refunded' | 'partial_refund';
type DisputeStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type JobStatus = 'created' | 'published' | 'assigned' | 'in_transit' | 'completed' | 'cancelled';
type UserStatus = 'active' | 'pending' | 'blocked' | 'suspended';

type StatusType = PaymentStatus | DisputeStatus | JobStatus | UserStatus | string;

interface StatusBadgeProps {
  status: StatusType;
  type?: 'payment' | 'dispute' | 'job' | 'user' | 'default';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ============================================
// STATUS CONFIGURATIONS
// ============================================

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  // Payment statuses
  succeeded: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', label: 'Erfolgreich' },
  pending: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200', label: 'Ausstehend' },
  failed: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', label: 'Fehlgeschlagen' },
  refunded: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', label: 'Erstattet' },
  partial_refund: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-800 dark:text-orange-200', label: 'Teilerstattung' },
  
  // Dispute statuses
  open: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', label: 'Offen' },
  in_progress: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', label: 'In Bearbeitung' },
  resolved: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', label: 'Gelöst' },
  closed: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', label: 'Geschlossen' },
  
  // Job/Transport statuses
  created: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', label: 'Erstellt' },
  published: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', label: 'Veröffentlicht' },
  assigned: { bg: 'bg-indigo-100 dark:bg-indigo-900', text: 'text-indigo-800 dark:text-indigo-200', label: 'Zugewiesen' },
  in_transit: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-200', label: 'Unterwegs' },
  completed: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', label: 'Abgeschlossen' },
  cancelled: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', label: 'Storniert' },
  
  // User statuses
  active: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', label: 'Aktiv' },
  blocked: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', label: 'Gesperrt' },
  suspended: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-800 dark:text-orange-200', label: 'Suspendiert' },
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

// ============================================
// COMPONENT
// ============================================

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-800 dark:text-gray-200',
    label: status,
  };

  return (
    <span className={`
      inline-flex items-center font-medium rounded-full
      ${config.bg} ${config.text} ${SIZE_CLASSES[size]}
      ${className}
    `}>
      {config.label}
    </span>
  );
}

// ============================================
// EXPORTS
// ============================================

export type { StatusBadgeProps, StatusType, PaymentStatus, DisputeStatus, JobStatus, UserStatus };
