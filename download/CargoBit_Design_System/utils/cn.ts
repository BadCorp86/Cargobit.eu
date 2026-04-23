/**
 * CargoBit Design System - Utility Functions
 * Version: 1.0.0
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind CSS classes
 * Uses clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format currency for German locale
 */
export function formatCurrency(
  amount: number,
  currency: string = 'EUR',
  locale: string = 'de-DE'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
}

/**
 * Format date for German locale
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options
  }).format(d);
}

/**
 * Get risk level color class
 */
export function getRiskColor(risk: 'green' | 'yellow' | 'red'): string {
  const colors = {
    green: 'bg-risk-green',
    yellow: 'bg-risk-yellow',
    red: 'bg-risk-red'
  };
  return colors[risk];
}

/**
 * Get risk level text color class
 */
export function getRiskTextColor(risk: 'green' | 'yellow' | 'red'): string {
  const colors = {
    green: 'text-risk-green',
    yellow: 'text-risk-yellow',
    red: 'text-risk-red'
  };
  return colors[risk];
}
