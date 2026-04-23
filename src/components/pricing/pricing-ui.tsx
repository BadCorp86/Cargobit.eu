'use client';

/**
 * CargoBit Pricing Display Components
 * UI for Shipper and Carrier pricing flows
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle,
  CheckCircle,
  DollarSign,
  Info,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Ban,
  Target,
  Shield
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface PricingContext {
  orderId: string;
  marketPrice: number;
  startPrice: number;
  minPrice: number;
  riskLevel: 'green' | 'yellow' | 'red';
  adjustedStartPrice: number;
  adjustedMinPrice: number;
  configVersion: string;
  currency?: string; // Always included from API
}

interface BidValidationResult {
  valid: boolean;
  priceScore?: number;
  reason?: string;
  error?: {
    code: string;
    details?: Record<string, unknown>;
  };
  feedback?: {
    status: 'excellent' | 'good' | 'acceptable' | 'too_low' | 'rejected';
    message: string;
  };
  marketPrice?: number;
  minPrice?: number;
  startPrice?: number;
  currency?: string;
}

// ============================================
// PRICING INFO CARD (for Shipper)
// ============================================

interface PricingInfoCardProps {
  pricing: PricingContext;
  showMarketPrice?: boolean;
}

export function PricingInfoCard({ pricing, showMarketPrice = false }: PricingInfoCardProps) {
  const currency = pricing.currency || 'EUR';
  const currencySymbol = currency === 'EUR' ? '€' : currency;
  
  const riskColors = {
    green: 'bg-green-100 text-green-800 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    red: 'bg-red-100 text-red-800 border-red-300'
  };
  
  const riskLabels = {
    green: 'Normal',
    yellow: 'Erhöhtes Risiko',
    red: 'Gesperrt'
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Preisinformationen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Level Banner */}
        <div className={`p-3 rounded-lg ${riskColors[pricing.riskLevel]} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="font-medium">Risikostatus: {riskLabels[pricing.riskLevel]}</span>
          </div>
          {pricing.riskLevel === 'red' && (
            <Badge variant="destructive">
              <Ban className="w-3 h-3 mr-1" />
              Gesperrt
            </Badge>
          )}
        </div>
        
        {/* Market Price (optional) */}
        {showMarketPrice && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Target className="w-4 h-4" />
                Marktpreis (intern)
              </span>
              <span className="font-bold">{currencySymbol}{pricing.marketPrice.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Basierend auf ähnlichen Aufträgen in dieser Route
            </p>
          </div>
        )}
        
        {/* Price Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Startpreis</div>
            <div className="text-lg font-bold text-blue-600">
              {currencySymbol}{pricing.adjustedStartPrice.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Empfohlener Preis
            </div>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Mindestpreis</div>
            <div className="text-lg font-bold text-green-600">
              {currencySymbol}{pricing.adjustedMinPrice.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Anti-Dumping Grenze
            </div>
          </div>
        </div>
        
        {/* Info Box */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          <Info className="w-4 h-4 mt-0.5" />
          <div>
            <p className="font-medium">Preisspanne</p>
            <p className="text-xs mt-1">
              Gebote liegen typischerweise zwischen dem Startpreis und Mindestpreis. 
              Niedrigere Gebote werden abgelehnt (Anti-Dumping).
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// BID INPUT COMPONENT (for Carrier)
// ============================================

interface BidInputProps {
  orderId: string;
  pricing: PricingContext;
  carrierId: string;
  onBidSubmit?: (bidPrice: number, validation: BidValidationResult) => void;
}

export function BidInput({ orderId, pricing, carrierId, onBidSubmit }: BidInputProps) {
  const currency = pricing.currency || 'EUR';
  const currencySymbol = currency === 'EUR' ? '€' : currency;
  
  const [bidPrice, setBidPrice] = useState<string>('');
  const [validation, setValidation] = useState<BidValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  // Live validation on input change
  const validateBidLive = async (price: number) => {
    if (!price || price <= 0) {
      setValidation(null);
      return;
    }
    
    setIsValidating(true);
    
    try {
      const response = await fetch(`/api/pricing/orders/${orderId}/bid/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrierId,
          bidPrice: price
        })
      });
      
      const result = await response.json();
      setValidation(result);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };
  
  const handlePriceChange = (value: string) => {
    setBidPrice(value);
    
    const price = parseFloat(value);
    if (!isNaN(price) && price > 0) {
      setTimeout(() => validateBidLive(price), 300);
    }
  };
  
  const handleSubmit = async () => {
    const price = parseFloat(bidPrice);
    if (isNaN(price) || price <= 0) return;
    
    setIsValidating(true);
    
    try {
      const response = await fetch(`/api/pricing/orders/${orderId}/bid/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrierId,
          bidPrice: price
        })
      });
      
      const result = await response.json();
      setValidation(result);
      
      if (result.valid && onBidSubmit) {
        onBidSubmit(price, result);
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsValidating(false);
    }
  };
  
  // Get feedback status styling
  const getFeedbackStyle = () => {
    if (!validation) return '';
    
    switch (validation.feedback?.status) {
      case 'excellent':
        return 'border-green-500 bg-green-50';
      case 'good':
        return 'border-blue-500 bg-blue-50';
      case 'acceptable':
        return 'border-gray-500 bg-gray-50';
      case 'too_low':
        return 'border-yellow-500 bg-yellow-50';
      case 'rejected':
        return 'border-red-500 bg-red-50';
      default:
        return '';
    }
  };
  
  // Render price score bar
  const renderPriceScore = () => {
    if (!validation?.priceScore) return null;
    
    const score = validation.priceScore;
    const percentage = Math.round(score * 100);
    
    return (
      <div className="space-y-1 mt-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Preis-Score</span>
          <span className="font-medium">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Dein Gebot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Range Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-2 bg-muted rounded">
            <div className="text-muted-foreground">Mindestpreis</div>
            <div className="font-bold">{currencySymbol}{pricing.adjustedMinPrice.toFixed(2)}</div>
          </div>
          <div className="p-2 bg-muted rounded">
            <div className="text-muted-foreground">Startpreis</div>
            <div className="font-bold">{currencySymbol}{pricing.adjustedStartPrice.toFixed(2)}</div>
          </div>
        </div>
        
        {/* Input */}
        <div className="space-y-2">
          <Label htmlFor="bidPrice">Dein Preis ({currencySymbol})</Label>
          <div className="relative">
            <Input
              id="bidPrice"
              type="number"
              step="0.01"
              min={pricing.adjustedMinPrice}
              max={pricing.adjustedStartPrice * 1.5}
              value={bidPrice}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder={`${pricing.adjustedMinPrice.toFixed(2)} - ${pricing.adjustedStartPrice.toFixed(2)}`}
              className={validation ? getFeedbackStyle() : ''}
            />
          </div>
        </div>
        
        {/* Validation Feedback */}
        {validation && (
          <div className={`p-3 rounded-lg ${getFeedbackStyle()}`}>
            <div className="flex items-start gap-2">
              {validation.valid ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div>
                <p className="font-medium">{validation.feedback?.message}</p>
                {validation.reason === 'BID_BELOW_MIN_PRICE' && (
                  <p className="text-sm mt-1 opacity-80">
                    Erhöhe dein Gebot auf mindestens {currencySymbol}{validation.minPrice?.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
            {validation.valid && renderPriceScore()}
          </div>
        )}
        
        {/* Warning for red risk */}
        {pricing.riskLevel === 'red' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
            <Ban className="w-4 h-4" />
            <span>
              Gebote für diesen Auftrag sind aufgrund von Risiko-Bewertung gesperrt.
            </span>
          </div>
        )}
        
        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={!validation?.valid || isValidating || pricing.riskLevel === 'red'}
          className="w-full"
        >
          {isValidating ? 'Validiere...' : 'Gebot abgeben'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// PRICING STATS COMPONENT
// ============================================

interface PricingStatsProps {
  stats: {
    totalOrders: number;
    avgMarketPrice: number;
    avgBidPrice: number;
    bidSuccessRate: number;
    avgPriceScore: number;
    riskDistribution: {
      green: number;
      yellow: number;
      red: number;
    };
  };
}

export function PricingStats({ stats }: PricingStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{stats.totalOrders}</div>
          <div className="text-sm text-muted-foreground">Aufträge mit Pricing</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">€{stats.avgMarketPrice.toFixed(0)}</div>
          <div className="text-sm text-muted-foreground">Ø Marktpreis</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">{(stats.bidSuccessRate * 100).toFixed(0)}%</div>
            {stats.bidSuccessRate > 0.7 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </div>
          <div className="text-sm text-muted-foreground">Gebot-Akzeptanz</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{(stats.avgPriceScore * 100).toFixed(0)}%</div>
          <div className="text-sm text-muted-foreground">Ø Preis-Score</div>
        </CardContent>
      </Card>
      
      {/* Risk Distribution */}
      <Card className="col-span-2 md:col-span-4">
        <CardContent className="pt-4">
          <div className="text-sm font-medium mb-2">Risiko-Verteilung</div>
          <div className="flex gap-2">
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Green: {stats.riskDistribution.green}
            </Badge>
            <Badge variant="default" className="bg-yellow-100 text-yellow-800">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Yellow: {stats.riskDistribution.yellow}
            </Badge>
            <Badge variant="default" className="bg-red-100 text-red-800">
              <Ban className="w-3 h-3 mr-1" />
              Red: {stats.riskDistribution.red}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default { PricingInfoCard, BidInput, PricingStats };
