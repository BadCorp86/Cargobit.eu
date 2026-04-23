/**
 * CargoBit BidInputWithValidation Component
 * Carrier bidding interface with live validation feedback
 * 
 * Features:
 * - Live price validation against min/start prices
 * - Color-coded feedback (green/yellow/red)
 * - Integration with Pricing Service /bid/validate endpoint
 * 
 * Goal: Fairness, Leitplanken, aber trotzdem Spielraum
 */

'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Info, 
  Loader2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface PricingContext {
  marketPrice: number;
  startPrice: number;
  minPrice: number;
  currency: string;
  riskLevel: 'green' | 'yellow' | 'red';
}

export interface BidValidationResult {
  valid: boolean;
  priceScore?: number;
  feedback?: {
    status: 'excellent' | 'good' | 'acceptable' | 'too_low' | 'rejected';
    message: string;
  };
  marketPrice?: number;
  minPrice?: number;
  startPrice?: number;
}

export interface BidInputWithValidationProps {
  orderId: string;
  carrierId: string;
  pricingContext: PricingContext;
  
  // Callbacks
  onValidate?: (bid: number) => Promise<BidValidationResult>;
  onSubmit?: (bid: number) => Promise<void>;
  onChange?: (bid: number) => void;
  
  // Display options
  showMarketComparison?: boolean;
  showRecommendedRange?: boolean;
  disabled?: boolean;
  className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatCurrency(value: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function getFeedbackColor(status: BidValidationResult['feedback']['status']): string {
  switch (status) {
    case 'excellent':
      return 'text-green-600';
    case 'good':
      return 'text-green-500';
    case 'acceptable':
      return 'text-yellow-600';
    case 'too_low':
      return 'text-amber-500';
    case 'rejected':
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
}

function getFeedbackIcon(status: BidValidationResult['feedback']['status']): React.ReactNode {
  switch (status) {
    case 'excellent':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'good':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'acceptable':
      return <CheckCircle2 className="h-4 w-4 text-yellow-600" />;
    case 'too_low':
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
}

function getFeedbackBgColor(status: BidValidationResult['feedback']['status']): string {
  switch (status) {
    case 'excellent':
      return 'bg-green-50 border-green-200';
    case 'good':
      return 'bg-green-50 border-green-200';
    case 'acceptable':
      return 'bg-yellow-50 border-yellow-200';
    case 'too_low':
      return 'bg-amber-50 border-amber-200';
    case 'rejected':
      return 'bg-red-50 border-red-200';
    default:
      return 'bg-muted/50';
  }
}

// ============================================
// COMPONENT
// ============================================

export function BidInputWithValidation({
  orderId,
  carrierId,
  pricingContext,
  onValidate,
  onSubmit,
  onChange,
  showMarketComparison = true,
  showRecommendedRange = true,
  disabled = false,
  className
}: BidInputWithValidationProps) {
  const [bidValue, setBidValue] = useState<string>('');
  const [bidNumber, setBidNumber] = useState<number | null>(null);
  const [validation, setValidation] = useState<BidValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const { marketPrice, startPrice, minPrice, currency } = pricingContext;

  // Calculate recommended range (show min to start, not exact values)
  const recommendedMin = Math.round(minPrice * 1.1); // Slightly above min
  const recommendedMax = startPrice;

  // Handle input change with debounced validation
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBidValue(value);

    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue <= 0) {
      setBidNumber(null);
      setValidation(null);
      return;
    }

    setBidNumber(numValue);
    onChange?.(numValue);

    // Debounce validation
    const timer = setTimeout(async () => {
      if (onValidate) {
        setIsValidating(true);
        try {
          const result = await onValidate(numValue);
          setValidation(result);
        } catch (error) {
          setValidation({
            valid: false,
            feedback: {
              status: 'rejected',
              message: 'Validierung fehlgeschlagen. Bitte versuchen Sie es erneut.'
            }
          });
        } finally {
          setIsValidating(false);
        }
      } else {
        // Local validation fallback
        setValidation(performLocalValidation(numValue, pricingContext));
      }
    }, 300);

    setDebounceTimer(timer);
  }, [debounceTimer, onValidate, onChange, pricingContext]);

  // Handle submit
  const handleSubmit = async () => {
    if (!bidNumber || !validation?.valid) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit?.(bidNumber);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate price comparison
  const priceVsMarket = bidNumber !== null 
    ? ((bidNumber - marketPrice) / marketPrice) * 100 
    : null;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Dein Gebot</CardTitle>
        <CardDescription>
          Gib deinen Preis für diesen Transport ein
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Market Context Info */}
        {showMarketComparison && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
            <div>
              <p className="text-muted-foreground">Üblicher Preis</p>
              <p className="font-semibold">{formatCurrency(marketPrice, currency)}</p>
            </div>
            {showRecommendedRange && (
              <div className="text-right">
                <p className="text-muted-foreground">Empfohlener Bereich</p>
                <p className="font-medium text-primary">
                  {formatCurrency(recommendedMin, currency)} – {formatCurrency(recommendedMax, currency)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Bid Input */}
        <div className="space-y-2">
          <Label htmlFor="bid-input" className="flex items-center gap-2">
            Dein Preis
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Wie kommt der Preis zustande? Berücksichtigt: Diesel, Maut, Fahrzeit, Risiko & historische Daten.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          
          <div className="relative">
            <Input
              id="bid-input"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={bidValue}
              onChange={handleInputChange}
              disabled={disabled || isSubmitting}
              className={cn(
                "pr-16 text-lg font-medium",
                validation && validation.feedback && (
                  validation.valid 
                    ? "border-green-300 focus-visible:ring-green-500" 
                    : "border-red-300 focus-visible:ring-red-500"
                )
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              {currency}
            </span>
            {isValidating && (
              <Loader2 className="absolute right-16 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Feedback */}
        {validation && validation.feedback && (
          <div className={cn(
            "flex items-start gap-2 p-3 rounded-lg border transition-colors",
            getFeedbackBgColor(validation.feedback.status)
          )}>
            {getFeedbackIcon(validation.feedback.status)}
            <div className="flex-1">
              <p className={cn("text-sm font-medium", getFeedbackColor(validation.feedback.status))}>
                {validation.feedback.message}
              </p>
              {validation.priceScore !== undefined && validation.valid && (
                <p className="text-xs text-muted-foreground mt-1">
                  Wettbewerbs-Score: {Math.round(validation.priceScore * 100)}%
                </p>
              )}
            </div>
          </div>
        )}

        {/* Price Comparison */}
        {bidNumber !== null && priceVsMarket !== null && (
          <div className="flex items-center gap-2 text-sm">
            {priceVsMarket < 0 ? (
              <>
                <TrendingDown className="h-4 w-4 text-green-500" />
                <span className="text-green-600">
                  {formatPercent(priceVsMarket)} unter Marktpreis
                </span>
              </>
            ) : priceVsMarket > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <span className="text-amber-600">
                  {formatPercent(priceVsMarket)} über Marktpreis
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">
                Entspricht dem Marktpreis
              </span>
            )}
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!bidNumber || !validation?.valid || disabled || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gebot wird abgegeben...
            </>
          ) : (
            'Gebot abgeben'
          )}
        </Button>

        {/* Price Indicator Bar */}
        {bidNumber !== null && (
          <PriceIndicatorBar
            bidPrice={bidNumber}
            minPrice={minPrice}
            marketPrice={marketPrice}
            startPrice={startPrice}
            currency={currency}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface PriceIndicatorBarProps {
  bidPrice: number;
  minPrice: number;
  marketPrice: number;
  startPrice: number;
  currency: string;
}

function PriceIndicatorBar({ bidPrice, minPrice, marketPrice, startPrice, currency }: PriceIndicatorBarProps) {
  // Calculate position percentage (clamped)
  const range = startPrice - minPrice;
  let position = 0;
  
  if (range > 0) {
    position = ((bidPrice - minPrice) / range) * 100;
    position = Math.max(0, Math.min(100, position));
  }

  // Determine color zone
  const getZoneColor = () => {
    if (bidPrice < minPrice) return 'bg-red-500';
    if (bidPrice <= marketPrice * 0.85) return 'bg-green-500';
    if (bidPrice <= marketPrice) return 'bg-green-400';
    if (bidPrice <= startPrice) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        {/* Color zones */}
        <div className="absolute inset-0 flex">
          <div className="w-[35%] bg-green-200" />
          <div className="w-[30%] bg-yellow-200" />
          <div className="w-[35%] bg-red-200" />
        </div>
        
        {/* Position marker */}
        <div 
          className={cn("absolute top-0 bottom-0 w-1", getZoneColor())}
          style={{ left: `${position}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatCurrency(minPrice, currency)}</span>
        <span>{formatCurrency(marketPrice, currency)}</span>
        <span>{formatCurrency(startPrice, currency)}</span>
      </div>
    </div>
  );
}

// ============================================
// LOCAL VALIDATION FALLBACK
// ============================================

function performLocalValidation(
  bidPrice: number, 
  context: PricingContext
): BidValidationResult {
  const { marketPrice, startPrice, minPrice } = context;

  if (bidPrice < minPrice) {
    return {
      valid: false,
      feedback: {
        status: 'rejected',
        message: `Zu niedrig – wird abgelehnt (unter Mindestpreis von ${formatCurrency(minPrice, context.currency)}).`
      },
      minPrice,
      marketPrice,
      startPrice
    };
  }

  const range = startPrice - minPrice;
  let priceScore = 0;
  
  if (range > 0) {
    priceScore = 1 - (bidPrice - minPrice) / range;
  }

  let feedback: BidValidationResult['feedback'];

  if (priceScore >= 0.8) {
    feedback = {
      status: 'excellent',
      message: 'Ausgezeichneter Preis! Sehr wettbewerbsfähig.'
    };
  } else if (priceScore >= 0.6) {
    feedback = {
      status: 'good',
      message: 'Guter Preis im erwarteten Bereich.'
    };
  } else if (priceScore >= 0.4) {
    feedback = {
      status: 'acceptable',
      message: 'Preis im erwarteten Bereich.'
    };
  } else {
    feedback = {
      status: 'too_low',
      message: 'Sehr niedrig – könnte abgelehnt werden.'
    };
  }

  return {
    valid: true,
    priceScore,
    feedback,
    minPrice,
    marketPrice,
    startPrice
  };
}

// ============================================
// EXPORTS
// ============================================

export default BidInputWithValidation;
