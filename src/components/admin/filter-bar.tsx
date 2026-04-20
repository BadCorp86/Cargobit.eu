/**
 * CargoBit Admin - Filter Bar Component
 * 
 * Reusable filter bar with search, date range, and status filters.
 */

'use client';

import React, { useState } from 'react';

// ============================================
// TYPES
// ============================================

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  onSearch?: (query: string) => void;
  onFilter?: (filters: Record<string, string>) => void;
  searchPlaceholder?: string;
  filters?: {
    name: string;
    label: string;
    options: FilterOption[];
  }[];
  dateRange?: boolean;
  onDateRangeChange?: (from: Date | null, to: Date | null) => void;
}

// ============================================
// COMPONENT
// ============================================

export function FilterBar({
  onSearch,
  onFilter,
  searchPlaceholder = 'Suchen...',
  filters = [],
  dateRange = false,
  onDateRangeChange,
}: FilterBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleFilterChange = (name: string, value: string) => {
    const newFilters = { ...activeFilters, [name]: value };
    setActiveFilters(newFilters);
    onFilter?.(newFilters);
  };

  const handleDateChange = () => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    onDateRangeChange?.(from, to);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActiveFilters({});
    setDateFrom('');
    setDateTo('');
    onSearch?.('');
    onFilter?.({});
    onDateRangeChange?.(null, null);
  };

  const hasActiveFilters = Object.values(activeFilters).some(v => v) || searchQuery || dateFrom || dateTo;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <svg 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Suchen
        </button>

        {(filters.length > 0 || dateRange) && (
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`
              px-4 py-2 rounded-lg transition-colors flex items-center space-x-2
              ${showFilters ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filter</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </button>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Zurücksetzen
          </button>
        )}
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {filters.map((filter) => (
            <div key={filter.name}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {filter.label}
              </label>
              <select
                value={activeFilters[filter.name] || ''}
                onChange={(e) => handleFilterChange(filter.name, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Alle</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {dateRange && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Von Datum
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setTimeout(handleDateChange, 0);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bis Datum
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setTimeout(handleDateChange, 0);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// EXPORTS
// ============================================

export type { FilterBarProps, FilterOption };
