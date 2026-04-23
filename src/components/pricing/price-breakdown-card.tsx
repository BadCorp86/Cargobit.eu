/**
 * CargoBit PriceBreakdownCard Component
 * Displays transparent cost breakdown for shippers
 * 
 * Shows: Market Price, Start Price, Cost Breakdown (Base, Fuel, Toll, Labor, Risk)
 * Goal: Transparenz, Vertrauen, "das System verarscht mich nicht"
 */

'use client';

import * as React from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Fuel, 
  Road, 
  Clock, 
  AlertTriangle,
  Truck,
  Thermometer,
  Flame,
  Globe,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================
// TYPES
// ============================================

export interface CostBreakdownData {
  baseCost: number;
  fuelCost: number;
  tollCost: number;
  laborCost: number;
  riskCost: number;
  coolingCost?: number;
  hazmatCost?: number;
  internationalCost?: number;
  subtotal: number;
  total: number;
  currency: string;
}

export interface PriceBreakdownCardProps {
  marketPrice: number;
  startPrice: number;
  minPrice?: number;
  costBreakdown: CostBreakdownData;
  riskLevel: 'green' | 'yellow' | 'red';
  currency?: string;
  
  // Additional context
  distanceKm?: number;
  weightKg?: number;
  isInternational?: boolean;
  isHazmat?: boolean;
  requiresCooling?: boolean;
  
  // Display options
  showDetails?: boolean;
  compact?: boolean;
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

function getRiskBadgeVariant(riskLevel: 'green' | 'yellow' | 'red'): 'default' | 'secondary' | 'destructive' {
  switch (riskLevel) {
    case 'green':
      return 'default';
    case 'yellow':
      return 'secondary';
    case 'red':
      return 'destructive';
    default:
      return 'default';
  }
}

function getRiskLabel(riskLevel: 'green' | 'yellow' | 'red'): string {
  switch (riskLevel) {
    case 'green':
      return 'Geringes Risiko';
    case 'yellow':
      return 'Mittleres Risiko';
    case 'red':
      return 'Hohes Risiko';
    default:
      return 'Unbekannt';
  }
}

function getRiskColor(riskLevel: 'green' | 'yellow' | 'red'): string {
  switch (riskLevel) {
    case 'green':
      return 'text-green-600';
    case 'yellow':
      return 'text-yellow-600';
    case 'red':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

// ============================================
// COMPONENT
// ============================================

export function PriceBreakdownCard({
  marketPrice,
  startPrice,
  minPrice,
  costBreakdown,
  riskLevel,
  currency = 'EUR',
  distanceKm,
  weightKg,
  isInternational = false,
  isHazmat = false,
  requiresCooling = false,
  showDetails = true,
  compact = false,
  className = ''
}: PriceBreakdownCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const hasAdditionalCosts = 
    (costBreakdown.coolingCost && costBreakdown.coolingCost > 0) ||
    (costBreakdown.hazmatCost && costBreakdown.hazmatCost > 0) ||
    (costBreakdown.internationalCost && costBreakdown.internationalCost > 0);

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Marktpreis</p>
              <p className="text-2xl font-bold">{formatCurrency(marketPrice, currency)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Empfohlener Startpreis</p>
              <p className="text-lg font-semibold text-primary">{formatCurrency(startPrice, currency)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Basierend auf Diesel, Maut, Fahrzeit & Risiko.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Empfohlener Preis
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Diese Schätzung basiert auf aktuellen Dieselpreisen, Mautdaten und typischen Fahrzeiten für diese Route.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription>
              Transparente Kostenaufschlüsselung für Ihre Route
            </CardDescription>
          </div>
          <Badge variant={getRiskBadgeVariant(riskLevel)} className="ml-2">
            {getRiskLabel(riskLevel)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Prices */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Marktpreis</p>
            <p className="text-2xl font-bold">{formatCurrency(marketPrice, currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Empfohlener Startpreis</p>
            <p className="text-xl font-semibold text-primary">{formatCurrency(startPrice, currency)}</p>
          </div>
        </div>

        {/* Cost Breakdown Accordion */}
        {showDetails && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="breakdown" className="border-none">
              <AccordionTrigger className="py-2 hover:no-underline">
                <span className="text-sm font-medium flex items-center gap-2">
                  Kostenaufschlüsselung anzeigen
                  <Badge variant="outline" className="ml-2">
                    {Object.keys(costBreakdown).filter(k => 
                      costBreakdown[k as keyof CostBreakdownData] && 
                      typeof costBreakdown[k as keyof CostBreakdownData] === 'number' && 
                      costBreakdown[k as keyof CostBreakdownData] > 0
                    ).length} Positionen
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {/* Base Cost */}
                  <CostItem
                    icon={<Truck className="h-4 w-4" />}
                    label="Basis"
                    value={costBreakdown.baseCost}
                    currency={currency}
                    tooltip="Grundpreis basierend auf Entfernung"
                  />
                  
                  {/* Fuel Cost */}
                  <CostItem
                    icon={<Fuel className="h-4 w-4" />}
                    label="Diesel"
                    value={costBreakdown.fuelCost}
                    currency={currency}
                    tooltip="Kraftstoffkosten basierend auf aktueller Dieselpreis"
                  />
                  
                  {/* Toll Cost */}
                  <CostItem
                    icon={<Road className="h-4 w-4" />}
                    label="Maut"
                    value={costBreakdown.tollCost}
                    currency={currency}
                    tooltip="Mautkosten für die Route (Toll Collect, ASFINAG, etc.)"
                  />
                  
                  {/* Labor Cost */}
                  <CostItem
                    icon={<Clock className="h-4 w-4" />}
                    label="Fahrzeit"
                    value={costBreakdown.laborCost}
                    currency={currency}
                    tooltip="Fahrerfahrzeit basierend auf Land und Strecke"
                  />
                  
                  {/* Additional Costs */}
                  {costBreakdown.coolingCost && costBreakdown.coolingCost > 0 && (
                    <CostItem
                      icon={<Thermometer className="h-4 w-4" />}
                      label="Kühlung"
                      value={costBreakdown.coolingCost}
                      currency={currency}
                      tooltip="Zuschlag für Kühltransport"
                    />
                  )}
                  
                  {costBreakdown.hazmatCost && costBreakdown.hazmatCost > 0 && (
                    <CostItem
                      icon={<Flame className="h-4 w-4" />}
                      label="Gefahrgut"
                      value={costBreakdown.hazmatCost}
                      currency={currency}
                      tooltip="Zuschlag für Gefahrguttransport"
                    />
                  )}
                  
                  {costBreakdown.internationalCost && costBreakdown.internationalCost > 0 && (
                    <CostItem
                      icon={<Globe className="h-4 w-4" />}
                      label="International"
                      value={costBreakdown.internationalCost}
                      currency={currency}
                      tooltip="Zuschlag für grenzüberschreitenden Transport"
                    />
                  )}
                  
                  {/* Risk Cost */}
                  {costBreakdown.riskCost > 0 && (
                    <CostItem
                      icon={<AlertTriangle className={`h-4 w-4 ${getRiskColor(riskLevel)}`} />}
                      label="Risikoaufschlag"
                      value={costBreakdown.riskCost}
                      currency={currency}
                      tooltip="Aufschlag basierend auf Risikoanalyse der Route"
                      highlight={riskLevel !== 'green'}
                    />
                  )}
                  
                  {/* Separator */}
                  <div className="border-t my-2" />
                  
                  {/* Total */}
                  <div className="flex items-center justify-between font-semibold text-base">
                    <span>Geschätzter Marktpreis</span>
                    <span>{formatCurrency(costBreakdown.total, currency)}</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Route Info */}
        {(distanceKm || weightKg) && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {distanceKm && (
              <span>{distanceKm.toFixed(0)} km</span>
            )}
            {weightKg && (
              <span>{weightKg.toFixed(0)} kg</span>
            )}
            {isInternational && (
              <Badge variant="outline" className="text-xs">International</Badge>
            )}
            {isHazmat && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Gefahrgut</Badge>
            )}
            {requiresCooling && (
              <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">Kühlung</Badge>
            )}
          </div>
        )}

        {/* Info Text */}
        <p className="text-xs text-muted-foreground">
          Diese Schätzung basiert auf aktuellen Dieselpreisen, Mautdaten und typischen Fahrzeiten für diese Route.
          Der tatsächliche Preis kann je nach Angebot und Nachfrage variieren.
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface CostItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  currency: string;
  tooltip?: string;
  highlight?: boolean;
}

function CostItem({ icon, label, value, currency, tooltip, highlight = false }: CostItemProps) {
  const content = (
    <div className={`flex items-center justify-between py-1 ${highlight ? 'text-amber-600' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium">{formatCurrency(value, currency)}</span>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

// ============================================
// EXPORTS
// ============================================

export default PriceBreakdownCard;
