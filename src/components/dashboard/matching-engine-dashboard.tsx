'use client';

/**
 * CargoBit Matching Engine Dashboard
 * Displays matching results with explainability
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  Star,
  TrendingUp,
  TrendingDown,
  Shield,
  Truck,
  Euro,
  Info,
  Zap,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface ScoreComponents {
  priceScore: number;
  distanceScore: number;
  reliabilityScore: number;
  capacityScore: number;
  riskScore: number;
}

interface MatchExplanation {
  topReasons: string[];
  details: {
    price?: { summary: string; score: number };
    distance?: { summary: string; score: number };
    reliability?: { summary: string; score: number };
    capacity?: { summary: string; score: number };
    risk?: { summary: string; score: number };
  };
}

interface MatchResult {
  rank: number;
  carrierId: string;
  driverId: string;
  driverName?: string;
  vehicleType?: string;
  totalScore: number;
  scores: ScoreComponents;
  explanation: MatchExplanation;
  warnings: string[];
  autoMatchEligible: boolean;
  offeredPrice?: number;
  priceComparison?: { vsMedian: number; vsBudget: number };
  distanceInfo?: { toPickupKm: number; detourKm: number; detourPercent: number };
  reliabilityInfo?: { onTimeRate: number; cancelRate: number; rating: number; completedOrders: number };
}

interface MatchingConfig {
  id: string;
  name: string;
  weights: {
    price: number;
    distance: number;
    reliability: number;
    capacity: number;
    risk: number;
  };
}

// ============================================
// SCORE BAR COMPONENT
// ============================================

interface ScoreBarProps {
  label: string;
  score: number;
  weight: number;
  icon: React.ReactNode;
  color?: string;
  detail?: string;
}

function ScoreBar({ label, score, weight, icon, color = 'bg-blue-500', detail }: ScoreBarProps) {
  const percentage = Math.round(score * 100);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">
            (Gewichtung: {Math.round(weight * 100)}%)
          </span>
        </div>
        <span className="font-bold">{percentage}%</span>
      </div>
      <div className="relative">
        <Progress value={percentage} className="h-2" />
        <div 
          className={`absolute top-0 left-0 h-2 rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {detail && (
        <p className="text-xs text-muted-foreground">{detail}</p>
      )}
    </div>
  );
}

// ============================================
// MATCH CARD COMPONENT
// ============================================

interface MatchCardProps {
  match: MatchResult;
  weights: { price: number; distance: number; reliability: number; capacity: number; risk: number };
  isExpanded: boolean;
  onToggle: () => void;
}

function MatchCard({ match, weights, isExpanded, onToggle }: MatchCardProps) {
  const scoreColor = match.totalScore >= 0.8 ? 'text-green-600' : 
                     match.totalScore >= 0.6 ? 'text-yellow-600' : 'text-red-600';
  
  const scoreBg = match.totalScore >= 0.8 ? 'bg-green-100' : 
                  match.totalScore >= 0.6 ? 'bg-yellow-100' : 'bg-red-100';
  
  return (
    <Card className={`${match.rank === 1 ? 'ring-2 ring-green-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${scoreBg} flex items-center justify-center`}>
              <span className={`text-lg font-bold ${scoreColor}`}>
                #{match.rank}
              </span>
            </div>
            <div>
              <CardTitle className="text-lg">
                {match.driverName || `Fahrer ${match.driverId.slice(-6)}`}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {match.vehicleType && (
                  <span className="flex items-center gap-1">
                    <Truck className="w-4 h-4" />
                    {match.vehicleType}
                  </span>
                )}
                {match.autoMatchEligible && (
                  <Badge variant="default" className="bg-green-600">
                    <Zap className="w-3 h-3 mr-1" />
                    Auto-Match
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${scoreColor}`}>
              {Math.round(match.totalScore * 100)}%
            </div>
            <div className="text-sm text-muted-foreground">Match-Score</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Top Reasons */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Top Gründe für diesen Match
          </h4>
          <ul className="space-y-1">
            {match.explanation.topReasons.map((reason, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
        
        {/* Warnings */}
        {match.warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-yellow-600">
              <AlertCircle className="w-4 h-4" />
              Hinweise
            </h4>
            <ul className="space-y-1">
              {match.warnings.map((warning, idx) => (
                <li key={idx} className="text-sm text-yellow-700 flex items-start gap-2">
                  <span className="text-yellow-600 mt-0.5">!</span>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Expand Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onToggle}
          className="w-full"
        >
          {isExpanded ? (
            <>Weniger Details <ChevronUp className="w-4 h-4 ml-1" /></>
          ) : (
            <>Mehr Details <ChevronDown className="w-4 h-4 ml-1" /></>
          )}
        </Button>
        
        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold">Score-Aufschlüsselung</h4>
            <p className="text-xs text-muted-foreground">
              Score = w<sub>p</sub> × S<sub>price</sub> + w<sub>d</sub> × S<sub>distance</sub> + 
              w<sub>r</sub> × S<sub>reliability</sub> + w<sub>k</sub> × S<sub>capacity</sub> + 
              w<sub>s</sub> × S<sub>risk</sub>
            </p>
            
            <div className="space-y-3">
              <ScoreBar
                label="Preis"
                score={match.scores.priceScore}
                weight={weights.price}
                icon={<Euro className="w-4 h-4 text-green-600" />}
                color="bg-green-500"
                detail={match.explanation.details.price?.summary}
              />
              <ScoreBar
                label="Entfernung"
                score={match.scores.distanceScore}
                weight={weights.distance}
                icon={<MapPin className="w-4 h-4 text-blue-600" />}
                color="bg-blue-500"
                detail={match.explanation.details.distance?.summary}
              />
              <ScoreBar
                label="Zuverlässigkeit"
                score={match.scores.reliabilityScore}
                weight={weights.reliability}
                icon={<Star className="w-4 h-4 text-yellow-600" />}
                color="bg-yellow-500"
                detail={match.explanation.details.reliability?.summary}
              />
              <ScoreBar
                label="Kapazität"
                score={match.scores.capacityScore}
                weight={weights.capacity}
                icon={<Truck className="w-4 h-4 text-purple-600" />}
                color="bg-purple-500"
                detail={match.explanation.details.capacity?.summary}
              />
              <ScoreBar
                label="Risiko"
                score={match.scores.riskScore}
                weight={weights.risk}
                icon={<Shield className="w-4 h-4 text-orange-600" />}
                color="bg-orange-500"
                detail={match.explanation.details.risk?.summary}
              />
            </div>
            
            {/* Price & Distance Info */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              {match.priceComparison && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <Euro className="w-4 h-4" />
                    Preisvergleich
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>vs. Median:</span>
                      <span className={match.priceComparison.vsMedian < 0 ? 'text-green-600' : 'text-red-600'}>
                        {match.priceComparison.vsMedian > 0 ? '+' : ''}{match.priceComparison.vsMedian.toFixed(1)}%
                      </span>
                    </div>
                    {match.offeredPrice && (
                      <div className="font-bold text-sm">
                        €{match.offeredPrice.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {match.reliabilityInfo && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <Star className="w-4 h-4" />
                    Zuverlässigkeit
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Pünktlichkeit:</span>
                      <span className="font-bold">{Math.round(match.reliabilityInfo.onTimeRate * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bewertung:</span>
                      <span className="font-bold">{match.reliabilityInfo.rating.toFixed(1)} ⭐</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transporte:</span>
                      <span className="font-bold">{match.reliabilityInfo.completedOrders}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// WEIGHT TUNER COMPONENT
// ============================================

interface WeightTunerProps {
  weights: { price: number; distance: number; reliability: number; capacity: number; risk: number };
  onChange: (weights: typeof weights) => void;
}

function WeightTuner({ weights, onChange }: WeightTunerProps) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const isValid = Math.abs(total - 1) < 0.01;
  
  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    const newWeights = { ...weights, [key]: value / 100 };
    onChange(newWeights);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Gewichtungsanpassung</h4>
        <Badge variant={isValid ? 'default' : 'destructive'}>
          Summe: {(total * 100).toFixed(0)}%
        </Badge>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Preis (w<sub>p</sub>)</span>
            <span>{Math.round(weights.price * 100)}%</span>
          </div>
          <Slider
            value={[weights.price * 100]}
            onValueChange={([v]) => handleWeightChange('price', v)}
            max={50}
            step={5}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Entfernung (w<sub>d</sub>)</span>
            <span>{Math.round(weights.distance * 100)}%</span>
          </div>
          <Slider
            value={[weights.distance * 100]}
            onValueChange={([v]) => handleWeightChange('distance', v)}
            max={50}
            step={5}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Zuverlässigkeit (w<sub>r</sub>)</span>
            <span>{Math.round(weights.reliability * 100)}%</span>
          </div>
          <Slider
            value={[weights.reliability * 100]}
            onValueChange={([v]) => handleWeightChange('reliability', v)}
            max={50}
            step={5}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Kapazität (w<sub>k</sub>)</span>
            <span>{Math.round(weights.capacity * 100)}%</span>
          </div>
          <Slider
            value={[weights.capacity * 100]}
            onValueChange={([v]) => handleWeightChange('capacity', v)}
            max={50}
            step={5}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Risiko (w<sub>s</sub>)</span>
            <span>{Math.round(weights.risk * 100)}%</span>
          </div>
          <Slider
            value={[weights.risk * 100]}
            onValueChange={([v]) => handleWeightChange('risk', v)}
            max={50}
            step={5}
          />
        </div>
      </div>
      
      {!isValid && (
        <p className="text-sm text-yellow-600">
          ⚠️ Die Summe der Gewichtungen muss 100% betragen
        </p>
      )}
    </div>
  );
}

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

interface MatchingEngineDashboardProps {
  orderId?: string;
  initialMatches?: MatchResult[];
  initialConfig?: MatchingConfig;
}

export function MatchingEngineDashboard({ 
  orderId, 
  initialMatches = [],
  initialConfig 
}: MatchingEngineDashboardProps) {
  const [matches, setMatches] = useState<MatchResult[]>(initialMatches);
  const [config, setConfig] = useState<MatchingConfig>(initialConfig || {
    id: 'default',
    name: 'default',
    weights: { price: 0.25, distance: 0.15, reliability: 0.25, capacity: 0.15, risk: 0.20 }
  });
  const [loading, setLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showConfig, setShowConfig] = useState(false);
  
  const handleMatch = async () => {
    if (!orderId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/matching/orders/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configName: config.name })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches);
        if (data.config) {
          setConfig(prev => ({ ...prev, weights: data.config.weights }));
        }
      }
    } catch (error) {
      console.error('Matching failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Matching Engine</h2>
          <p className="text-muted-foreground">
            Intelligente Carrier-Empfehlungen mit Erklärbarkeit
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showConfig} onOpenChange={setShowConfig}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Konfiguration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Matching-Konfiguration</DialogTitle>
                <DialogDescription>
                  Passe die Gewichtungen an, um die Match-Ergebnisse zu optimieren.
                </DialogDescription>
              </DialogHeader>
              <WeightTuner 
                weights={config.weights}
                onChange={(w) => setConfig(prev => ({ ...prev, weights: w }))}
              />
            </DialogContent>
          </Dialog>
          
          {orderId && (
            <Button onClick={handleMatch} disabled={loading}>
              {loading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Berechne...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Matching starten
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Scoring Formula */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm">
            <Info className="w-4 h-4 text-blue-600" />
            <span className="font-medium">Scoring-Formel:</span>
            <code className="text-xs bg-background px-2 py-1 rounded">
              Score = w<sub>p</sub>·S<sub>price</sub> + w<sub>d</sub>·S<sub>distance</sub> + 
              w<sub>r</sub>·S<sub>reliability</sub> + w<sub>k</sub>·S<sub>capacity</sub> + 
              w<sub>s</sub>·S<sub>risk</sub>
            </code>
          </div>
        </CardContent>
      </Card>
      
      {/* Matches */}
      <div className="space-y-4">
        {matches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Keine Matches gefunden.</p>
              {orderId && (
                <Button onClick={handleMatch} className="mt-4">
                  Matching starten
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          matches.map(match => (
            <MatchCard
              key={match.carrierId}
              match={match}
              weights={config.weights}
              isExpanded={expandedCards.has(match.carrierId)}
              onToggle={() => toggleCard(match.carrierId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default MatchingEngineDashboard;
