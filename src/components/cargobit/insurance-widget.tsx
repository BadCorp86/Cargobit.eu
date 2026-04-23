'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Shield, Check, Info, Star } from 'lucide-react';

interface InsuranceWidgetProps {
  title?: string;
  description?: string;
  coverage?: string;
  price?: number;
  currency?: string;
  variant?: 'blue' | 'gold';
  onAccept?: () => void;
  onInfo?: () => void;
  className?: string;
  compact?: boolean;
}

export function InsuranceWidget({
  title = 'Frachtversicherung',
  description = 'Schützen Sie Ihre Ware gegen Verlust und Beschädigung',
  coverage = 'Deckung bis 50.000 €',
  price,
  currency = 'EUR',
  variant = 'blue',
  onAccept,
  onInfo,
  className,
  compact = false,
}: InsuranceWidgetProps) {
  const formatPrice = (amount: number, curr: string) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: curr,
    }).format(amount);
  };

  const variantClasses = {
    blue: 'insurance-widget',
    gold: 'insurance-widget insurance-widget-gold',
  };

  const buttonVariant = {
    blue: 'default' as const,
    gold: 'default' as const,
  };

  const iconColor = {
    blue: 'text-[var(--color-insurance-blue)]',
    gold: 'text-[var(--color-insurance-gold)]',
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border bg-card',
          variant === 'blue' ? 'border-[var(--color-insurance-blue)]' : 'border-[var(--color-insurance-gold)]',
          className
        )}
      >
        <Shield className={cn('w-5 h-5', iconColor[variant])} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{coverage}</div>
        </div>
        {price !== undefined && (
          <div className="text-sm font-semibold">{formatPrice(price, currency)}</div>
        )}
        {onAccept && (
          <Button size="sm" variant={buttonVariant[variant]} onClick={onAccept}>
            Hinzufügen
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(variantClasses[variant], className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-2 rounded-lg',
            variant === 'blue'
              ? 'bg-[var(--color-insurance-blue)]/10'
              : 'bg-[var(--color-insurance-gold)]/10'
          )}
        >
          <Shield className={cn('w-6 h-6', iconColor[variant])} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{title}</h4>
            {variant === 'gold' && (
              <Star className="w-4 h-4 text-[var(--color-insurance-gold)] fill-current" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>

      {/* Coverage */}
      <div className="flex items-center gap-2 text-sm">
        <Check className="w-4 h-4 text-green-500" />
        <span>{coverage}</span>
      </div>

      {/* Features */}
      <ul className="text-xs text-muted-foreground space-y-1">
        <li className="flex items-center gap-2">
          <Check className="w-3 h-3 text-green-500" />
          Schadenbearbeitung innerhalb 48h
        </li>
        <li className="flex items-center gap-2">
          <Check className="w-3 h-3 text-green-500" />
          Weltweite Deckung
        </li>
        <li className="flex items-center gap-2">
          <Check className="w-3 h-3 text-green-500" />
          Keine Selbstbeteiligung
        </li>
      </ul>

      {/* Price and Action */}
      <div className="flex items-center justify-between pt-2 border-t border-current/10">
        {price !== undefined && (
          <div>
            <div className="text-lg font-bold">{formatPrice(price, currency)}</div>
            <div className="text-xs text-muted-foreground">einmalig</div>
          </div>
        )}
        <div className="flex gap-2">
          {onInfo && (
            <Button variant="outline" size="sm" onClick={onInfo}>
              <Info className="w-4 h-4 mr-1" />
              Details
            </Button>
          )}
          {onAccept && (
            <Button size="sm" onClick={onAccept}>
              Versicherung abschließen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Premium insurance tier card
interface InsuranceTierProps {
  name: string;
  price: number;
  currency?: string;
  coverage: string;
  features: string[];
  recommended?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function InsuranceTier({
  name,
  price,
  currency = 'EUR',
  coverage,
  features,
  recommended = false,
  onSelect,
  className,
}: InsuranceTierProps) {
  const formatPrice = (amount: number, curr: string) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: curr,
    }).format(amount);
  };

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border-2 transition-all',
        recommended
          ? 'border-[var(--color-insurance-gold)] bg-[var(--color-insurance-gold-light)]'
          : 'border-border bg-card',
        onSelect && 'cursor-pointer hover:shadow-lg',
        className
      )}
      onClick={onSelect}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--color-insurance-gold)] text-white text-xs font-medium rounded-full">
          Empfohlen
        </div>
      )}

      <div className="text-center mb-4">
        <h4 className="font-semibold text-lg">{name}</h4>
        <div className="text-2xl font-bold mt-1">{formatPrice(price, currency)}</div>
        <div className="text-sm text-muted-foreground">{coverage}</div>
      </div>

      <ul className="space-y-2 mb-4">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {onSelect && (
        <Button className="w-full" variant={recommended ? 'default' : 'outline'} onClick={onSelect}>
          Auswählen
        </Button>
      )}
    </div>
  );
}

export default InsuranceWidget;
