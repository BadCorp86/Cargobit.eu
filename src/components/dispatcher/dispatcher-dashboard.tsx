/**
 * CargoBit Dispatcher Dashboard
 * ==============================
 * 
 * Haupt-Dashboard für Dispatcher mit:
 * - Matching-Vorschläge mit Scores
 * - SHAP-Erklärungen für jede Entscheidung
 * - Config-Profil Auswahl
 * - Real-time Scoring Simulation
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  TrendingUp, 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  DollarSign,
  Leaf,
  AlertTriangle,
  CheckCircle,
  Info,
  Brain,
  Settings,
  RefreshCw,
  ChevronRight,
  BarChart3
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface ScoreComponent {
  name: string;
  score: number;
  weight: number;
  contribution: number;
  label: string;
  icon: React.ReactNode;
}

interface ShapContribution {
  feature: string;
  value: number;
  contribution: number;
  direction: 'positive' | 'negative' | 'neutral';
  description: string;
}

interface MatchingSuggestion {
  id: string;
  tourId: string;
  tourName: string;
  orderId: string;
  orderName: string;
  
  // Scores
  totalScore: number;
  heuristicScore: number;
  mlScore: number | null;
  
  // Components
  components: {
    revenue: { score: number; weight: number; contribution: number };
    capacityUtilization: { score: number; weight: number; contribution: number };
    priority: { score: number; weight: number; contribution: number };
    risk: { score: number; weight: number; contribution: number };
    serviceLevel: { score: number; weight: number; contribution: number };
    co2: { score: number; weight: number; contribution: number };
  };
  
  // SHAP
  shapContributions: ShapContribution[];
  
  // Details
  detourKm: number;
  pickupTime: string;
  deliveryTime: string;
  additionalRevenue: number;
  co2Saved: number;
  
  // Status
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  
  // ML Info
  mlEnabled: boolean;
  canaryMode: boolean;
}

interface ConfigProfile {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
}

interface DispatcherDashboardProps {
  dispatcherId?: string;
  tenantId?: string;
  onSuggestionAccept?: (suggestionId: string) => void;
  onSuggestionReject?: (suggestionId: string) => void;
}

// =============================================================================
// SCORE BADGE COMPONENT
// =============================================================================

const ScoreBadge: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const getColor = (s: number) => {
    if (s >= 0.7) return 'bg-green-500';
    if (s >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`w-12 h-12 rounded-full ${getColor(score)} flex items-center justify-center text-white font-bold text-sm`}>
        {(score * 100).toFixed(0)}
      </div>
      <span className="text-xs text-muted-foreground mt-1">{label}</span>
    </div>
  );
};

// =============================================================================
// SCORE BREAKDOWN COMPONENT
// =============================================================================

const ScoreBreakdown: React.FC<{ 
  components: MatchingSuggestion['components'];
  totalScore: number;
}> = ({ components, totalScore }) => {
  const items = [
    { key: 'revenue', label: 'Revenue', icon: <DollarSign className="h-4 w-4" />, ...components.revenue },
    { key: 'capacity', label: 'Capacity', icon: <Package className="h-4 w-4" />, ...components.capacityUtilization },
    { key: 'priority', label: 'Priority', icon: <TrendingUp className="h-4 w-4" />, ...components.priority },
    { key: 'risk', label: 'Risk', icon: <AlertTriangle className="h-4 w-4" />, ...components.risk },
    { key: 'serviceLevel', label: 'Service', icon: <CheckCircle className="h-4 w-4" />, ...components.serviceLevel },
    { key: 'co2', label: 'CO₂', icon: <Leaf className="h-4 w-4" />, ...components.co2 },
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-3">
          <div className="flex items-center gap-2 w-28">
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Progress 
                value={item.score * 100} 
                className="h-2 flex-1"
              />
              <span className="text-xs text-muted-foreground w-16 text-right">
                {(item.score * 100).toFixed(0)}% × {item.weight}
              </span>
            </div>
          </div>
          <span className="text-sm font-medium w-16 text-right">
            +{(item.contribution * 100).toFixed(1)}
          </span>
        </div>
      ))}
      <Separator />
      <div className="flex items-center justify-between font-medium">
        <span>Total Score</span>
        <span className={`text-lg ${(totalScore * 100).toFixed(0) >= 50 ? 'text-green-600' : 'text-red-600'}`}>
          {(totalScore * 100).toFixed(1)}
        </span>
      </div>
    </div>
  );
};

// =============================================================================
// SHAP EXPLAINABILITY PANEL
// =============================================================================

const ShapExplainabilityPanel: React.FC<{ 
  contributions: ShapContribution[];
  mlScore: number | null;
}> = ({ contributions, mlScore }) => {
  if (!contributions || contributions.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>ML-Erklärung nicht verfügbar</AlertTitle>
        <AlertDescription>
          Die SHAP-Erklärung ist nur verfügbar, wenn ML-Scoring aktiviert ist.
        </AlertDescription>
      </Alert>
    );
  }

  // Sort by absolute contribution
  const sortedContributions = [...contributions].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );

  const maxContribution = Math.max(
    ...sortedContributions.map(c => Math.abs(c.contribution))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          ML-Erklärung (SHAP)
        </h4>
        {mlScore !== null && (
          <Badge variant="outline" className="gap-1">
            ML Score: {(mlScore * 100).toFixed(1)}
          </Badge>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground">
        Diese Features haben den ML-Score am stärksten beeinflusst:
      </p>

      <div className="space-y-2">
        {sortedContributions.slice(0, 8).map((contrib, index) => {
          const normalizedWidth = Math.abs(contrib.contribution) / maxContribution * 100;
          
          return (
            <div key={index} className="flex items-center gap-3">
              <div className="w-32 text-sm truncate" title={contrib.description}>
                {contrib.feature}
              </div>
              <div className="flex-1 relative h-6">
                {/* Negative bar (left side) */}
                <div className="absolute left-0 right-1/2 h-full flex items-center justify-end">
                  {contrib.direction === 'negative' && (
                    <div 
                      className="h-4 bg-red-200 rounded-l"
                      style={{ width: `${normalizedWidth}%` }}
                    />
                  )}
                </div>
                {/* Center line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
                {/* Positive bar (right side) */}
                <div className="absolute left-1/2 right-0 h-full flex items-center">
                  {contrib.direction === 'positive' && (
                    <div 
                      className="h-4 bg-green-200 rounded-r"
                      style={{ width: `${normalizedWidth}%` }}
                    />
                  )}
                </div>
              </div>
              <div className="w-16 text-right text-sm">
                <span className={contrib.direction === 'positive' ? 'text-green-600' : 'text-red-600'}>
                  {contrib.contribution > 0 ? '+' : ''}{contrib.contribution.toFixed(3)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-200 rounded" />
          <span>Positiver Einfluss</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-200 rounded" />
          <span>Negativer Einfluss</span>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SUGGESTION CARD
// =============================================================================

const SuggestionCard: React.FC<{
  suggestion: MatchingSuggestion;
  onAccept?: () => void;
  onReject?: () => void;
  onDetailClick?: () => void;
}> = ({ suggestion, onAccept, onReject, onDetailClick }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{suggestion.tourName}</CardTitle>
            {suggestion.mlEnabled && (
              <Badge variant="outline" className="gap-1">
                <Brain className="h-3 w-3" />
                ML
                {suggestion.canaryMode && <span className="text-xs">(Shadow)</span>}
              </Badge>
            )}
          </div>
          <Badge className={getStatusColor(suggestion.status)}>
            {suggestion.status}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            {suggestion.orderName}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            +{suggestion.detourKm} km Umweg
          </span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Score Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <ScoreBadge score={suggestion.totalScore} label="Gesamt" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Heuristik:</span>
                <span className={getScoreColor(suggestion.heuristicScore)}>
                  {(suggestion.heuristicScore * 100).toFixed(1)}
                </span>
              </div>
              {suggestion.mlScore !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">ML:</span>
                  <span className={getScoreColor(suggestion.mlScore)}>
                    {(suggestion.mlScore * 100).toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-semibold text-green-600">
              +€{suggestion.additionalRevenue.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
              <Leaf className="h-3 w-3" />
              {suggestion.co2Saved.toFixed(1)} kg CO₂
            </div>
          </div>
        </div>

        {/* Time Info */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Pickup: {suggestion.pickupTime}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Delivery: {suggestion.deliveryTime}
          </div>
        </div>

        {/* Quick Score Breakdown */}
        <div className="grid grid-cols-6 gap-1 text-xs">
          {Object.entries(suggestion.components).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="h-1 bg-gray-200 rounded overflow-hidden mb-1">
                <div 
                  className="h-full bg-blue-500"
                  style={{ width: `${value.score * 100}%` }}
                />
              </div>
              <span className="text-muted-foreground capitalize">{key.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        {suggestion.status === 'pending' && (
          <div className="flex items-center gap-2 pt-2">
            <Button 
              onClick={onAccept}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Akzeptieren
            </Button>
            <Button 
              variant="outline"
              onClick={onReject}
              className="flex-1"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Ablehnen
            </Button>
            <Button 
              variant="ghost"
              onClick={onDetailClick}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// =============================================================================
// PROFILE SELECTOR
// =============================================================================

const ProfileSelector: React.FC<{
  profiles: ConfigProfile[];
  selectedProfile: string;
  onProfileChange: (profileId: string) => void;
}> = ({ profiles, selectedProfile, onProfileChange }) => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Scoring-Profil:</span>
      </div>
      <Select value={selectedProfile} onValueChange={onProfileChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Profil wählen" />
        </SelectTrigger>
        <SelectContent>
          {profiles.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              <div className="flex items-center gap-2">
                {profile.name}
                {profile.isDefault && (
                  <Badge variant="secondary" className="text-xs">Default</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const DispatcherDashboard: React.FC<DispatcherDashboardProps> = ({
  dispatcherId,
  tenantId,
  onSuggestionAccept,
  onSuggestionReject,
}) => {
  // State
  const [suggestions, setSuggestions] = useState<MatchingSuggestion[]>([]);
  const [profiles, setProfiles] = useState<ConfigProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('revenue_focused');
  const [selectedSuggestion, setSelectedSuggestion] = useState<MatchingSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('suggestions');

  // Fetch suggestions
  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        profile: selectedProfile,
        ...(tenantId && { tenant: tenantId }),
      });
      
      const response = await fetch(`/api/dispatcher/suggestions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      // Mock data for demo
      setSuggestions([
        {
          id: 'sg_1',
          tourId: 'tour_123',
          tourName: 'Tour DE-HH-01',
          orderId: 'order_456',
          orderName: 'Palettentransport Hamburg',
          totalScore: 0.72,
          heuristicScore: 0.72,
          mlScore: null,
          components: {
            revenue: { score: 0.8, weight: 0.35, contribution: 0.28 },
            capacityUtilization: { score: 0.65, weight: 0.20, contribution: 0.13 },
            priority: { score: 0.5, weight: 0.10, contribution: 0.05 },
            risk: { score: 0.8, weight: 0.10, contribution: 0.08 },
            serviceLevel: { score: 0.7, weight: 0.15, contribution: 0.105 },
            co2: { score: 0.75, weight: 0.10, contribution: 0.075 },
          },
          shapContributions: [],
          detourKm: 12,
          pickupTime: '08:30',
          deliveryTime: '14:00',
          additionalRevenue: 187.50,
          co2Saved: 4.2,
          status: 'pending',
          createdAt: new Date().toISOString(),
          mlEnabled: false,
          canaryMode: true,
        },
        {
          id: 'sg_2',
          tourId: 'tour_124',
          tourName: 'Tour DE-HH-02',
          orderId: 'order_457',
          orderName: 'Express-Lieferung Kiel',
          totalScore: 0.58,
          heuristicScore: 0.58,
          mlScore: null,
          components: {
            revenue: { score: 0.6, weight: 0.35, contribution: 0.21 },
            capacityUtilization: { score: 0.7, weight: 0.20, contribution: 0.14 },
            priority: { score: 0.8, weight: 0.10, contribution: 0.08 },
            risk: { score: 0.5, weight: 0.10, contribution: 0.05 },
            serviceLevel: { score: 0.5, weight: 0.15, contribution: 0.075 },
            co2: { score: 0.25, weight: 0.10, contribution: 0.025 },
          },
          shapContributions: [],
          detourKm: 18,
          pickupTime: '10:00',
          deliveryTime: '16:30',
          additionalRevenue: 245.00,
          co2Saved: 2.1,
          status: 'pending',
          createdAt: new Date().toISOString(),
          mlEnabled: false,
          canaryMode: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProfile, tenantId]);

  // Fetch profiles
  const fetchProfiles = useCallback(async () => {
    try {
      const response = await fetch('/api/config/profiles');
      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles || []);
        const defaultProfile = data.profiles?.find((p: ConfigProfile) => p.isDefault);
        if (defaultProfile) {
          setSelectedProfile(defaultProfile.id);
        }
      }
    } catch (error) {
      // Use default profiles if API unavailable
      setProfiles([
        { id: 'revenue_focused', name: 'Revenue-Fokus', description: 'Standard-Profil', isDefault: true },
        { id: 'premium_customers', name: 'Premium-Kunden', description: 'Premium-Priorisierung', isDefault: false },
        { id: 'sustainability', name: 'Nachhaltigkeit', description: 'CO₂-Fokus', isDefault: false },
        { id: 'risk_averse', name: 'Risikominimierung', description: 'Risiko-Fokus', isDefault: false },
      ]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchProfiles();
    fetchSuggestions();
  }, [fetchProfiles, fetchSuggestions]);

  // Handle accept
  const handleAccept = async (suggestionId: string) => {
    try {
      const response = await fetch(`/api/dispatcher/suggestions/${suggestionId}/accept`, {
        method: 'POST',
      });
      if (response.ok) {
        setSuggestions(prev => 
          prev.map(s => s.id === suggestionId ? { ...s, status: 'accepted' } : s)
        );
        onSuggestionAccept?.(suggestionId);
      }
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
    }
  };

  // Handle reject
  const handleReject = async (suggestionId: string) => {
    try {
      const response = await fetch(`/api/dispatcher/suggestions/${suggestionId}/reject`, {
        method: 'POST',
      });
      if (response.ok) {
        setSuggestions(prev => 
          prev.map(s => s.id === suggestionId ? { ...s, status: 'rejected' } : s)
        );
        onSuggestionReject?.(suggestionId);
      }
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
    }
  };

  // Stats
  const stats = {
    total: suggestions.length,
    pending: suggestions.filter(s => s.status === 'pending').length,
    avgScore: suggestions.length > 0 
      ? suggestions.reduce((sum, s) => sum + s.totalScore, 0) / suggestions.length 
      : 0,
    totalRevenue: suggestions
      .filter(s => s.status === 'accepted')
      .reduce((sum, s) => sum + s.additionalRevenue, 0),
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dispatcher Dashboard</h1>
          <p className="text-muted-foreground">
            Matching-Vorschläge mit ML-unterstütztem Scoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ProfileSelector
            profiles={profiles}
            selectedProfile={selectedProfile}
            onProfileChange={setSelectedProfile}
          />
          <Button variant="outline" onClick={fetchSuggestions}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vorschläge</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offen</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ø Score</p>
                <p className="text-2xl font-bold">{(stats.avgScore * 100).toFixed(1)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Zusatz-Umsatz</p>
                <p className="text-2xl font-bold">€{stats.totalRevenue.toFixed(0)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="suggestions">
            Vorschläge ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="detail">
            Detail-Ansicht
          </TabsTrigger>
          <TabsTrigger value="simulation">
            Scoring-Simulation
          </TabsTrigger>
        </TabsList>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : suggestions.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Keine Vorschläge</AlertTitle>
              <AlertDescription>
                Es gibt aktuell keine Matching-Vorschläge für Ihre Touren.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {suggestions
                .filter(s => s.status === 'pending')
                .sort((a, b) => b.totalScore - a.totalScore)
                .map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onAccept={() => handleAccept(suggestion.id)}
                    onReject={() => handleReject(suggestion.id)}
                    onDetailClick={() => {
                      setSelectedSuggestion(suggestion);
                      setActiveTab('detail');
                    }}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        {/* Detail Tab */}
        <TabsContent value="detail" className="space-y-6">
          {selectedSuggestion ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Detail: {selectedSuggestion.tourName} → {selectedSuggestion.orderName}
                </h2>
                <Button variant="outline" onClick={() => setActiveTab('suggestions')}>
                  Zurück zur Übersicht
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Score Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Score-Aufschlüsselung</CardTitle>
                    <CardDescription>
                      Heuristische Bewertung mit Gewichtung
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScoreBreakdown 
                      components={selectedSuggestion.components}
                      totalScore={selectedSuggestion.totalScore}
                    />
                  </CardContent>
                </Card>

                {/* SHAP Explainability */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ML-Erklärung</CardTitle>
                    <CardDescription>
                      SHAP-basierte Feature-Beiträge
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ShapExplainabilityPanel
                      contributions={selectedSuggestion.shapContributions}
                      mlScore={selectedSuggestion.mlScore}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              {selectedSuggestion.status === 'pending' && (
                <div className="flex justify-center gap-4">
                  <Button 
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      handleAccept(selectedSuggestion.id);
                      setSelectedSuggestion(null);
                      setActiveTab('suggestions');
                    }}
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Vorschlag akzeptieren
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      handleReject(selectedSuggestion.id);
                      setSelectedSuggestion(null);
                      setActiveTab('suggestions');
                    }}
                  >
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Vorschlag ablehnen
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Kein Vorschlag ausgewählt</AlertTitle>
              <AlertDescription>
                Wählen Sie einen Vorschlag aus der Übersicht, um Details anzuzeigen.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Simulation Tab */}
        <TabsContent value="simulation">
          <ScoringSimulation 
            selectedProfile={selectedProfile}
            profiles={profiles}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// =============================================================================
// SCORING SIMULATION COMPONENT
// =============================================================================

const ScoringSimulation: React.FC<{
  selectedProfile: string;
  profiles: ConfigProfile[];
}> = ({ selectedProfile, profiles }) => {
  const [orderData, setOrderData] = useState({
    price: 150,
    volumeM3: 5,
    priority: 'NORMAL',
    riskLevel: 'MEDIUM',
    serviceLevel: 'STANDARD',
  });

  const [tourData, setTourData] = useState({
    detourKm: 12,
    freeCapacityM3: 10,
  });

  const [result, setResult] = useState<{
    totalScore: number;
    heuristicScore: number;
    mlScore: number | null;
    components: any;
  } | null>(null);

  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const response = await fetch('/api/dispatcher/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: orderData,
          tour: tourData,
          profile: selectedProfile,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setResult(data);
      }
    } catch (error) {
      console.error('Simulation failed:', error);
      // Mock result for demo
      const revenueScore = Math.min(1, orderData.price / (tourData.detourKm + 1) / 10);
      const capacityScore = Math.min(1, orderData.volumeM3 / tourData.freeCapacityM3);
      const priorityMap: Record<string, number> = { PREMIUM: 1.0, HIGH: 0.8, NORMAL: 0.5, LOW: 0.2 };
      const riskMap: Record<string, number> = { VERY_LOW: 1.0, LOW: 0.8, MEDIUM: 0.5, HIGH: 0.2, VERY_HIGH: 0.0 };
      const serviceMap: Record<string, number> = { SLA_CRITICAL: 1.0, SLA_HIGH: 0.7, STANDARD: 0.3 };
      
      setResult({
        totalScore: revenueScore * 0.35 + capacityScore * 0.20 + priorityMap[orderData.priority] * 0.10 + riskMap[orderData.riskLevel] * 0.10 + serviceMap[orderData.serviceLevel] * 0.15 + Math.max(0, 1 - tourData.detourKm / 20) * 0.10,
        heuristicScore: revenueScore * 0.35 + capacityScore * 0.20 + priorityMap[orderData.priority] * 0.10 + riskMap[orderData.riskLevel] * 0.10 + serviceMap[orderData.serviceLevel] * 0.15 + Math.max(0, 1 - tourData.detourKm / 20) * 0.10,
        mlScore: null,
        components: {
          revenue: { score: revenueScore, weight: 0.35, contribution: revenueScore * 0.35 },
          capacityUtilization: { score: capacityScore, weight: 0.20, contribution: capacityScore * 0.20 },
          priority: { score: priorityMap[orderData.priority], weight: 0.10, contribution: priorityMap[orderData.priority] * 0.10 },
          risk: { score: riskMap[orderData.riskLevel], weight: 0.10, contribution: riskMap[orderData.riskLevel] * 0.10 },
          serviceLevel: { score: serviceMap[orderData.serviceLevel], weight: 0.15, contribution: serviceMap[orderData.serviceLevel] * 0.15 },
          co2: { score: Math.max(0, 1 - tourData.detourKm / 20), weight: 0.10, contribution: Math.max(0, 1 - tourData.detourKm / 20) * 0.10 },
        },
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scoring-Simulation</CardTitle>
        <CardDescription>
          Simulieren Sie den Score für verschiedene Szenarien
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-8">
          {/* Input */}
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-3">Auftragsdaten</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Preis (€)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 mt-1"
                    value={orderData.price}
                    onChange={(e) => setOrderData({ ...orderData, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Volumen (m³)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 mt-1"
                    value={orderData.volumeM3}
                    onChange={(e) => setOrderData({ ...orderData, volumeM3: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Priorität</label>
                  <select
                    className="w-full border rounded px-3 py-2 mt-1"
                    value={orderData.priority}
                    onChange={(e) => setOrderData({ ...orderData, priority: e.target.value })}
                  >
                    <option value="PREMIUM">Premium</option>
                    <option value="HIGH">Hoch</option>
                    <option value="NORMAL">Normal</option>
                    <option value="LOW">Niedrig</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Risiko-Level</label>
                  <select
                    className="w-full border rounded px-3 py-2 mt-1"
                    value={orderData.riskLevel}
                    onChange={(e) => setOrderData({ ...orderData, riskLevel: e.target.value })}
                  >
                    <option value="VERY_LOW">Sehr niedrig</option>
                    <option value="LOW">Niedrig</option>
                    <option value="MEDIUM">Mittel</option>
                    <option value="HIGH">Hoch</option>
                    <option value="VERY_HIGH">Sehr hoch</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Tourdaten</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Umweg (km)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 mt-1"
                    value={tourData.detourKm}
                    onChange={(e) => setTourData({ ...tourData, detourKm: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Freie Kapazität (m³)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2 mt-1"
                    value={tourData.freeCapacityM3}
                    onChange={(e) => setTourData({ ...tourData, freeCapacityM3: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={runSimulation}
              disabled={isSimulating}
              className="w-full"
            >
              {isSimulating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4 mr-2" />
              )}
              Simulation ausführen
            </Button>
          </div>

          {/* Output */}
          <div>
            <h4 className="font-medium mb-3">Ergebnis</h4>
            {result ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center py-4">
                  <ScoreBadge score={result.totalScore} label="Gesamt-Score" />
                </div>
                <ScoreBreakdown 
                  components={result.components}
                  totalScore={result.totalScore}
                />
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                Klicken Sie auf "Simulation ausführen", um das Ergebnis zu sehen.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DispatcherDashboard;
