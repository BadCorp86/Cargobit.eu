'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type RiskLevel = 'green' | 'yellow' | 'red';

interface RiskBadgeProps {
  risk: RiskLevel;
  showLabel?: boolean;
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const riskConfig = {
  green: {
    label: 'Niedrig',
    labelEn: 'Low Risk',
    dotClass: 'bg-[var(--color-risk-green)]',
    badgeClass: 'risk-badge-green',
  },
  yellow: {
    label: 'Mittel',
    labelEn: 'Medium Risk',
    dotClass: 'bg-[var(--color-risk-yellow)]',
    badgeClass: 'risk-badge-yellow',
  },
  red: {
    label: 'Hoch',
    labelEn: 'High Risk',
    dotClass: 'bg-[var(--color-risk-red)]',
    badgeClass: 'risk-badge-red',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function RiskBadge({
  risk,
  showLabel = true,
  showDot = true,
  size = 'md',
  className,
}: RiskBadgeProps) {
  const config = riskConfig[risk];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.badgeClass,
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label={`Risk level: ${config.label}`}
    >
      {showDot && (
        <span
          className={cn('w-2 h-2 rounded-full', config.dotClass)}
          aria-hidden="true"
        />
      )}
      {showLabel && config.label}
    </span>
  );
}

// Simple dot-only version for compact displays
export function RiskDot({ risk, className }: { risk: RiskLevel; className?: string }) {
  const config = riskConfig[risk];

  return (
    <span
      className={cn('w-3 h-3 rounded-full', config.dotClass, className)}
      role="status"
      aria-label={`Risk level: ${config.label}`}
    />
  );
}

// Progress bar version for risk visualization
interface RiskBarProps {
  risk: RiskLevel;
  value?: number;
  showValue?: boolean;
  className?: string;
}

export function RiskBar({ risk, value, showValue = false, className }: RiskBarProps) {
  const config = riskConfig[risk];
  const barColors = {
    green: 'bg-[var(--color-risk-green)]',
    yellow: 'bg-[var(--color-risk-yellow)]',
    red: 'bg-[var(--color-risk-red)]',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-300', barColors[risk])}
          style={{ width: value ? `${value}%` : '100%' }}
        />
      </div>
      {showValue && value !== undefined && (
        <span className="text-sm text-muted-foreground">{value}%</span>
      )}
    </div>
  );
}

export default RiskBadge;
