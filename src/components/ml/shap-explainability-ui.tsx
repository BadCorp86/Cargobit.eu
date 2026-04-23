"use client";

/**
 * CargoBit SHAP Explainability UI
 * ================================
 *
 * Interactive component for explaining ML predictions using SHAP values.
 * Provides waterfall charts, force plots, and feature importance visualizations.
 *
 * Features:
 * - Waterfall chart for individual predictions
 * - Feature importance bar chart
 * - Force plot visualization
 * - Decision path explanation
 * - Natural language explanation generation
 *
 * @author CargoBit ML Team
 * @version 3.0.0
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BarChart3Icon,
  InfoIcon,
  LightbulbIcon,
  SparklesIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface SHAPFeature {
  name: string;
  value: number;
  shapValue: number;
  displayValue?: string;
  description?: string;
}

interface SHAPExplanation {
  baseValue: number;
  outputValue: number;
  features: SHAPFeature[];
  modelVersion: string;
  timestamp: string;
}

interface SHAPExplainabilityUIProps {
  suggestionId: string;
  finalScore: number;
  shapExplanation?: SHAPExplanation;
  onRefresh?: () => void;
  className?: string;
}

// =============================================================================
// FEATURE DESCRIPTIONS
// =============================================================================

const FEATURE_DESCRIPTIONS: Record<string, { name: string; description: string; unit?: string }> = {
  revenueScore: {
    name: "Revenue Score",
    description: "Wirtschaftlichkeit basierend auf Preis-Umweg-Verhältnis",
    unit: "",
  },
  capacityUtilizationScore: {
    name: "Capacity Score",
    description: "Wie gut füllt der Auftrag die freie Kapazität",
    unit: "",
  },
  priorityScore: {
    name: "Priority Score",
    description: "Business-Priorität des Kunden (Premium/Normal/Low)",
    unit: "",
  },
  riskScore: {
    name: "Risk Score",
    description: "Risikobewertung basierend auf Kundenhistorie",
    unit: "",
  },
  serviceLevelScore: {
    name: "Service Level",
    description: "SLA-Relevanz und Kundensegment",
    unit: "",
  },
  co2Score: {
    name: "CO₂ Score",
    description: "CO₂-Effizienz durch Leerkilometer-Reduktion",
    unit: "",
  },
  customerAcceptanceRate30d: {
    name: "Customer Acceptance",
    description: "Akzeptanzrate des Kunden (30 Tage)",
    unit: "%",
  },
  driverAcceptanceRate30d: {
    name: "Driver Acceptance",
    description: "Akzeptanzrate des Fahrers (30 Tage)",
    unit: "%",
  },
  distancePickupToRouteKm: {
    name: "Pickup Distance",
    description: "Distanz zum Pickup-Standort",
    unit: "km",
  },
  etaToPickupMinutes: {
    name: "ETA Pickup",
    description: "Geschätzte Ankunftszeit zum Pickup",
    unit: "min",
  },
  freeVolumeM3: {
    name: "Free Volume",
    description: "Freies Volumen auf dem Fahrzeug",
    unit: "m³",
  },
  tourProgressPct: {
    name: "Tour Progress",
    description: "Fortschritt der aktuellen Tour",
    unit: "%",
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatFeatureName(feature: string): string {
  return FEATURE_DESCRIPTIONS[feature]?.name || feature;
}

function formatFeatureDescription(feature: string): string {
  return FEATURE_DESCRIPTIONS[feature]?.description || feature;
}

function formatValue(value: number, feature?: string): string {
  if (feature && FEATURE_DESCRIPTIONS[feature]?.unit === "%") {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (Math.abs(value) < 0.01) return value.toFixed(4);
  if (Math.abs(value) < 1) return value.toFixed(3);
  if (Math.abs(value) < 100) return value.toFixed(2);
  return value.toFixed(1);
}

function getContributionColor(shapValue: number): string {
  if (shapValue > 0.05) return "text-green-600";
  if (shapValue > 0) return "text-green-500";
  if (shapValue < -0.05) return "text-red-600";
  if (shapValue < 0) return "text-red-500";
  return "text-gray-500";
}

function getContributionBgColor(shapValue: number): string {
  if (shapValue > 0.05) return "bg-green-100";
  if (shapValue > 0) return "bg-green-50";
  if (shapValue < -0.05) return "bg-red-100";
  if (shapValue < 0) return "bg-red-50";
  return "bg-gray-50";
}

// =============================================================================
// WATERFALL CHART COMPONENT
// =============================================================================

interface WaterfallChartProps {
  features: SHAPFeature[];
  baseValue: number;
  outputValue: number;
}

function WaterfallChart({ features, baseValue, outputValue }: WaterfallChartProps) {
  const sortedFeatures = useMemo(() => {
    return [...features].sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));
  }, [features]);

  const maxContribution = useMemo(() => {
    return Math.max(
      ...sortedFeatures.map(f => Math.abs(f.shapValue)),
      Math.abs(baseValue - 0.5),
      Math.abs(outputValue - 0.5)
    );
  }, [sortedFeatures, baseValue, outputValue]);

  return (
    <div className="space-y-2">
      {/* Base Value */}
      <div className="flex items-center gap-2 text-sm">
        <div className="w-32 text-right text-gray-500">Base Value</div>
        <div className="flex-1 h-6 flex items-center">
          <div className="w-full bg-gray-100 rounded h-4 relative">
            <div
              className="absolute h-full bg-gray-400 rounded"
              style={{ width: `${(baseValue / 1) * 100}%` }}
            />
          </div>
        </div>
        <div className="w-16 text-right font-mono">{baseValue.toFixed(3)}</div>
      </div>

      <Separator className="my-2" />

      {/* Feature Contributions */}
      {sortedFeatures.slice(0, 8).map((feature, index) => {
        const isPositive = feature.shapValue >= 0;
        const width = Math.abs(feature.shapValue / maxContribution) * 100;

        return (
          <TooltipProvider key={feature.name}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-sm hover:bg-gray-50 rounded p-1 cursor-pointer">
                  <div className="w-32 text-right text-gray-700 truncate">
                    {formatFeatureName(feature.name)}
                  </div>
                  <div className="flex-1 h-6 flex items-center relative">
                    {/* Center line */}
                    <div className="absolute left-1/2 w-px h-full bg-gray-200" />
                    
                    {/* Contribution bar */}
                    <div
                      className={`absolute h-4 rounded ${
                        isPositive ? "bg-green-400 left-1/2" : "bg-red-400"
                      }`}
                      style={{
                        width: `${width}%`,
                        left: isPositive ? "50%" : `${50 - width}%`,
                      }}
                    />
                  </div>
                  <div className={`w-16 text-right font-mono ${getContributionColor(feature.shapValue)}`}>
                    {isPositive ? "+" : ""}{feature.shapValue.toFixed(4)}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-semibold">{formatFeatureName(feature.name)}</p>
                  <p className="text-xs text-gray-500">
                    {formatFeatureDescription(feature.name)}
                  </p>
                  <p className="text-xs">
                    Value: <span className="font-mono">{formatValue(feature.value, feature.name)}</span>
                  </p>
                  <p className="text-xs">
                    SHAP: <span className="font-mono">{feature.shapValue.toFixed(4)}</span>
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}

      <Separator className="my-2" />

      {/* Output Value */}
      <div className="flex items-center gap-2 text-sm font-medium">
        <div className="w-32 text-right text-gray-700">Final Score</div>
        <div className="flex-1 h-6 flex items-center">
          <div className="w-full bg-gray-100 rounded h-4 relative">
            <div
              className="absolute h-full bg-blue-500 rounded"
              style={{ width: `${(outputValue / 1) * 100}%` }}
            />
          </div>
        </div>
        <div className="w-16 text-right font-mono text-blue-600">{outputValue.toFixed(3)}</div>
      </div>
    </div>
  );
}

// =============================================================================
// FORCE PLOT COMPONENT
// =============================================================================

interface ForcePlotProps {
  features: SHAPFeature[];
  baseValue: number;
  outputValue: number;
}

function ForcePlot({ features, baseValue, outputValue }: ForcePlotProps) {
  const positiveFeatures = features.filter(f => f.shapValue > 0).sort((a, b) => b.shapValue - a.shapValue);
  const negativeFeatures = features.filter(f => f.shapValue < 0).sort((a, b) => a.shapValue - b.shapValue);

  const positiveSum = positiveFeatures.reduce((sum, f) => sum + f.shapValue, 0);
  const negativeSum = negativeFeatures.reduce((sum, f) => sum + f.shapValue, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        {/* Negative contributions (red) */}
        <div className="flex items-center gap-1">
          {negativeFeatures.slice(0, 4).map((feature, index) => (
            <TooltipProvider key={feature.name}>
              <Tooltip>
                <TooltipTrigger>
                  <div
                    className="bg-red-400 h-6 rounded flex items-center justify-center text-xs text-white px-1"
                    style={{ width: `${Math.abs(feature.shapValue / (positiveSum - negativeSum)) * 200}px` }}
                  >
                    {formatFeatureName(feature.name).substring(0, 3)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{formatFeatureName(feature.name)}: {feature.shapValue.toFixed(4)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* Center arrow */}
        <div className="flex flex-col items-center">
          <div className="text-lg font-bold text-blue-600">{outputValue.toFixed(3)}</div>
          <ArrowUpIcon className="w-4 h-4 text-gray-400" />
        </div>

        {/* Positive contributions (green) */}
        <div className="flex items-center gap-1">
          {positiveFeatures.slice(0, 4).map((feature, index) => (
            <TooltipProvider key={feature.name}>
              <Tooltip>
                <TooltipTrigger>
                  <div
                    className="bg-green-400 h-6 rounded flex items-center justify-center text-xs text-white px-1"
                    style={{ width: `${(feature.shapValue / (positiveSum - negativeSum)) * 200}px` }}
                  >
                    {formatFeatureName(feature.name).substring(0, 3)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{formatFeatureName(feature.name)}: +{feature.shapValue.toFixed(4)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {/* Scale */}
      <div className="flex justify-between text-xs text-gray-500 px-8">
        <span>{(baseValue - 0.2).toFixed(2)}</span>
        <span>{baseValue.toFixed(2)} (base)</span>
        <span>{(baseValue + 0.2).toFixed(2)}</span>
      </div>
    </div>
  );
}

// =============================================================================
// FEATURE IMPORTANCE BAR CHART
// =============================================================================

interface FeatureImportanceChartProps {
  features: SHAPFeature[];
}

function FeatureImportanceChart({ features }: FeatureImportanceChartProps) {
  const sortedFeatures = useMemo(() => {
    return [...features].sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));
  }, [features]);

  const maxImportance = Math.max(...sortedFeatures.map(f => Math.abs(f.shapValue)));

  return (
    <div className="space-y-3">
      {sortedFeatures.slice(0, 10).map((feature, index) => {
        const importance = Math.abs(feature.shapValue);
        const width = (importance / maxImportance) * 100;
        const isPositive = feature.shapValue >= 0;

        return (
          <div key={feature.name} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">{formatFeatureName(feature.name)}</span>
              <span className={`font-mono ${getContributionColor(feature.shapValue)}`}>
                {isPositive ? "+" : ""}{feature.shapValue.toFixed(4)}
              </span>
            </div>
            <Progress
              value={width}
              className={`h-2 ${isPositive ? "[&>div]:bg-green-400" : "[&>div]:bg-red-400"}`}
            />
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// NATURAL LANGUAGE EXPLANATION
// =============================================================================

interface NLEExplanationProps {
  features: SHAPFeature[];
  outputValue: number;
  baseValue: number;
}

function NLEExplanation({ features, outputValue, baseValue }: NLEExplanationProps) {
  const explanation = useMemo(() => {
    const sortedFeatures = [...features].sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));
    const topPositive = sortedFeatures.filter(f => f.shapValue > 0).slice(0, 3);
    const topNegative = sortedFeatures.filter(f => f.shapValue < 0).slice(0, 3);

    const diff = outputValue - baseValue;
    const direction = diff > 0 ? "höher" : "niedriger";

    const parts: string[] = [];

    // Overall direction
    if (Math.abs(diff) > 0.1) {
      parts.push(`Der Score ist ${direction} als der Durchschnitt (${baseValue.toFixed(2)}).`);
    } else {
      parts.push(`Der Score liegt nahe am Durchschnitt.`);
    }

    // Top positive factors
    if (topPositive.length > 0) {
      const positiveNames = topPositive.map(f => formatFeatureName(f.name)).join(", ");
      parts.push(`Die wichtigsten positiven Faktoren sind: ${positiveNames}.`);
    }

    // Top negative factors
    if (topNegative.length > 0) {
      const negativeNames = topNegative.map(f => formatFeatureName(f.name)).join(", ");
      parts.push(`Der Score wird reduziert durch: ${negativeNames}.`);
    }

    // Recommendation
    if (outputValue > 0.7) {
      parts.push("Empfehlung: Dieser Vorschlag hat eine hohe Akzeptanzwahrscheinlichkeit.");
    } else if (outputValue > 0.5) {
      parts.push("Empfehlung: Gute Chancen auf Akzeptanz, aber einige Risikofaktoren vorhanden.");
    } else {
      parts.push("Empfehlung: Niedrige Akzeptanzwahrscheinlichkeit - prüfen Sie Alternativen.");
    }

    return parts;
  }, [features, outputValue, baseValue]);

  return (
    <div className="space-y-3">
      {explanation.map((part, index) => (
        <p key={index} className="text-sm text-gray-600 leading-relaxed">
          {part}
        </p>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function SHAPExplainabilityUI({
  suggestionId,
  finalScore,
  shapExplanation,
  onRefresh,
  className,
}: SHAPExplainabilityUIProps) {
  const [activeTab, setActiveTab] = useState("waterfall");

  // Mock SHAP explanation if not provided
  const explanation: SHAPExplanation = useMemo(() => {
    if (shapExplanation) return shapExplanation;

    // Generate mock explanation
    return {
      baseValue: 0.5,
      outputValue: finalScore,
      features: [
        { name: "revenueScore", value: 0.75, shapValue: 0.08 },
        { name: "capacityUtilizationScore", value: 0.82, shapValue: 0.06 },
        { name: "customerAcceptanceRate30d", value: 0.68, shapValue: 0.05 },
        { name: "driverAcceptanceRate30d", value: 0.72, shapValue: 0.04 },
        { name: "riskScore", value: 0.85, shapValue: 0.03 },
        { name: "priorityScore", value: 0.50, shapValue: 0.00 },
        { name: "distancePickupToRouteKm", value: 12.5, shapValue: -0.02 },
        { name: "etaToPickupMinutes", value: 45, shapValue: -0.03 },
      ],
      modelVersion: "2.1.3",
      timestamp: new Date().toISOString(),
    };
  }, [shapExplanation, finalScore]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-purple-500" />
              ML Explainability
            </CardTitle>
            <CardDescription>
              SHAP-basierte Erklärung der ML-Entscheidung
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {explanation.outputValue.toFixed(3)}
            </div>
            <div className="text-xs text-gray-500">Final Score</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="waterfall">Waterfall</TabsTrigger>
            <TabsTrigger value="force">Force Plot</TabsTrigger>
            <TabsTrigger value="importance">Importance</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
          </TabsList>

          <TabsContent value="waterfall" className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <WaterfallChart
                features={explanation.features}
                baseValue={explanation.baseValue}
                outputValue={explanation.outputValue}
              />
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-400 rounded" />
                <span>Positive</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-400 rounded" />
                <span>Negative</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span>Output</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="force" className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-6">
              <ForcePlot
                features={explanation.features}
                baseValue={explanation.baseValue}
                outputValue={explanation.outputValue}
              />
            </div>
          </TabsContent>

          <TabsContent value="importance" className="space-y-4">
            <FeatureImportanceChart features={explanation.features} />
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <LightbulbIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                <NLEExplanation
                  features={explanation.features}
                  outputValue={explanation.outputValue}
                  baseValue={explanation.baseValue}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Model: {explanation.modelVersion}
            </Badge>
            <span>Base: {explanation.baseValue.toFixed(3)}</span>
          </div>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <BarChart3Icon className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// EXPORT
// =============================================================================

export default SHAPExplainabilityUI;
