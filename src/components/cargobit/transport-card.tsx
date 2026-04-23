'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { RiskBadge, type RiskLevel } from './risk-badge';
import { ArrowRight, Calendar, Package, MapPin } from 'lucide-react';

interface TransportCardProps {
  id: string;
  route: {
    from: string;
    to: string;
  };
  risk: RiskLevel;
  status?: string;
  price?: number;
  currency?: string;
  date?: string;
  cargoType?: string;
  weight?: string;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function TransportCard({
  id,
  route,
  risk,
  status,
  price,
  currency = 'EUR',
  date,
  cargoType,
  weight,
  onClick,
  className,
  children,
}: TransportCardProps) {
  const riskBorderClass = {
    green: 'card-risk-green',
    yellow: 'card-risk-yellow',
    red: 'card-risk-red',
  };

  const formatPrice = (amount: number, curr: string) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: curr,
    }).format(amount);
  };

  return (
    <article
      className={cn(
        'transport-card cursor-pointer',
        riskBorderClass[risk],
        onClick && 'hover:border-primary/50',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm text-muted-foreground">#{id}</div>
          {status && (
            <div className="text-xs text-muted-foreground mt-0.5">{status}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge risk={risk} size="sm" />
          {price !== undefined && (
            <span className="text-lg font-semibold">
              {formatPrice(price, currency)}
            </span>
          )}
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{route.from}</span>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 text-right">
          <div className="flex items-center gap-2 justify-end">
            <span className="font-medium">{route.to}</span>
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {date && (
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{date}</span>
          </div>
        )}
        {cargoType && (
          <div className="flex items-center gap-1">
            <Package className="w-4 h-4" />
            <span>{cargoType}</span>
          </div>
        )}
        {weight && <span>{weight}</span>}
      </div>

      {/* Additional content */}
      {children}
    </article>
  );
}

// Compact version for lists
interface TransportCardCompactProps {
  id: string;
  route: {
    from: string;
    to: string;
  };
  risk: RiskLevel;
  price?: number;
  currency?: string;
  onClick?: () => void;
  className?: string;
}

export function TransportCardCompact({
  id,
  route,
  risk,
  price,
  currency = 'EUR',
  onClick,
  className,
}: TransportCardCompactProps) {
  const formatPrice = (amount: number, curr: string) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: curr,
    }).format(amount);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <RiskBadge risk={risk} showLabel={false} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {route.from} → {route.to}
        </div>
        <div className="text-xs text-muted-foreground">#{id}</div>
      </div>
      {price !== undefined && (
        <div className="text-sm font-semibold">{formatPrice(price, currency)}</div>
      )}
    </div>
  );
}

export default TransportCard;
