'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Activity,
  Brain,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Gauge,
} from 'lucide-react';

// Types
interface ModelMetrics {
  version: string;
  stage: string;
  ndcg_1: number;
  ndcg_3: number;
  ndcg_5: number;
  ndcg_10: number;
  train_samples: number;
  valid_samples: number;
  best_iteration: number;
  created_at: string;
}

interface ScoringStats {
  total_requests: number;
  heuristic_only: number;
  hybrid: number;
  avg_latency_ms: number;
  acceptance_rate: number;
  shadow_mode: boolean;
}

interface FeatureImportance {
  feature: string;
  importance: number;
  direction: 'positive' | 'negative';
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  model_version: string | null;
  mode: string;
  uptime_seconds: number;
  shap_enabled: boolean;
}

// Mock data for demo
const mockModelMetrics: ModelMetrics = {
  version: '15',
  stage: 'Production',
  ndcg_1: 0.72,
  ndcg_3: 0.68,
  ndcg_5: 0.71,
  ndcg_10: 0.73,
  train_samples: 125000,
  valid_samples: 31250,
  best_iteration: 342,
  created_at: '2025-04-18T14:30:00Z',
};

const mockScoringStats: ScoringStats = {
  total_requests: 48592,
  heuristic_only: 43733,
  hybrid: 4859,
  avg_latency_ms: 5.2,
  acceptance_rate: 0.23,
  shadow_mode: true,
};

const mockFeatureImportance: FeatureImportance[] = [
  { feature: 'revenueScore', importance: 0.35, direction: 'positive' },
  { feature: 'customerAcceptanceRate30d', importance: 0.22, direction: 'positive' },
  { feature: 'driverAcceptanceRate30d', importance: 0.18, direction: 'positive' },
  { feature: 'serviceLevelScore', importance: 0.12, direction: 'positive' },
  { feature: 'laneAcceptanceRate30d', importance: 0.08, direction: 'positive' },
  { feature: 'riskScore', importance: 0.05, direction: 'negative' },
];

const mockHealth: HealthStatus = {
  status: 'healthy',
  model_version: '15',
  mode: 'shadow',
  uptime_seconds: 345600,
  shap_enabled: true,
};

const mockNdcgHistory = [
  { date: '2025-04-12', ndcg: 0.71 },
  { date: '2025-04-13', ndcg: 0.70 },
  { date: '2025-04-14', ndcg: 0.72 },
  { date: '2025-04-15', ndcg: 0.71 },
  { date: '2025-04-16', ndcg: 0.73 },
  { date: '2025-04-17', ndcg: 0.72 },
  { date: '2025-04-18', ndcg: 0.73 },
];

const mockAlerts = [
  {
    id: 1,
    type: 'warning',
    message: 'NDCG@10 dropped below 0.70 for 2 consecutive days',
    timestamp: '2025-04-17T10:30:00Z',
    resolved: false,
  },
  {
    id: 2,
    type: 'info',
    message: 'Model v15 promoted to Production',
    timestamp: '2025-04-18T14:30:00Z',
    resolved: true,
  },
];

export default function MLMonitoringPage() {
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics>(mockModelMetrics);
  const [scoringStats, setScoringStats] = useState<ScoringStats>(mockScoringStats);
  const [featureImportance, setFeatureImportance] = useState<FeatureImportance[]>(mockFeatureImportance);
  const [health, setHealth] = useState<HealthStatus>(mockHealth);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Format uptime
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString('de-DE');
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get stage color
  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Production':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Staging':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Archived':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Simulate refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ML Monitoring</h1>
          <p className="text-muted-foreground">
            Suggestion Scoring Model Performance & Health
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge 
            variant="outline" 
            className={`${getStageColor(modelMetrics.stage)} px-3 py-1`}
          >
            Model v{modelMetrics.version} - {modelMetrics.stage}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {mockAlerts.filter(a => !a.resolved).length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Alert</AlertTitle>
          <AlertDescription>
            {mockAlerts.find(a => !a.resolved)?.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="deployment">Deployment</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Health Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Service Health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(health.status)}`} />
                  <span className="text-2xl font-bold capitalize">{health.status}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Uptime: {formatUptime(health.uptime_seconds)}
                </p>
              </CardContent>
            </Card>

            {/* NDCG@10 */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>NDCG@10</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">{(modelMetrics.ndcg_10 * 100).toFixed(1)}%</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Threshold: 65.0%
                </p>
              </CardContent>
            </Card>

            {/* Avg Latency */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Latency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold">{scoringStats.avg_latency_ms.toFixed(1)}ms</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Target: &lt;10ms
                </p>
              </CardContent>
            </Card>

            {/* Total Requests */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Requests (24h)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold">{formatNumber(scoringStats.total_requests)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Hybrid: {((scoringStats.hybrid / scoringStats.total_requests) * 100).toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Model Info & Scoring Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Model */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Current Model
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Version</p>
                    <p className="font-medium">v{modelMetrics.version}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stage</p>
                    <Badge variant="outline" className={getStageColor(modelMetrics.stage)}>
                      {modelMetrics.stage}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Train Samples</p>
                    <p className="font-medium">{formatNumber(modelMetrics.train_samples)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valid Samples</p>
                    <p className="font-medium">{formatNumber(modelMetrics.valid_samples)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Best Iteration</p>
                    <p className="font-medium">{modelMetrics.best_iteration}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">SHAP Enabled</p>
                    <p className="font-medium">{health.shap_enabled ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {new Date(modelMetrics.created_at).toLocaleString('de-DE')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Deployment Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Deployment Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium capitalize">{health.mode}</span>
                  {health.mode === 'shadow' && (
                    <Badge variant="secondary">ML logged but not used</Badge>
                  )}
                  {health.mode === 'canary' && (
                    <Badge variant="outline">10% traffic</Badge>
                  )}
                  {health.mode === 'production' && (
                    <Badge className="bg-green-500">Full traffic</Badge>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Blend Factor</span>
                    <span className="font-medium">α = 0.8</span>
                  </div>
                  <Progress value={80} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Score_final = 0.8 × Heuristic + 0.2 × ML
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Heuristic Requests</span>
                    <span className="font-medium">
                      {((scoringStats.heuristic_only / scoringStats.total_requests) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={(scoringStats.heuristic_only / scoringStats.total_requests) * 100} 
                    className="h-2" 
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Hybrid Requests</span>
                    <span className="font-medium">
                      {((scoringStats.hybrid / scoringStats.total_requests) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={(scoringStats.hybrid / scoringStats.total_requests) * 100} 
                    className="h-2" 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* NDCG Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>NDCG Metrics</CardTitle>
              <CardDescription>
                Normalized Discounted Cumulative Gain at different cutoff points
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'NDCG@1', value: modelMetrics.ndcg_1 },
                  { label: 'NDCG@3', value: modelMetrics.ndcg_3 },
                  { label: 'NDCG@5', value: modelMetrics.ndcg_5 },
                  { label: 'NDCG@10', value: modelMetrics.ndcg_10 },
                ].map((metric) => (
                  <div key={metric.label} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{metric.label}</span>
                      <span className="text-sm font-bold">{(metric.value * 100).toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={metric.value * 100} 
                      className={`h-3 ${metric.value >= 0.65 ? '[&>div]:bg-green-500' : '[&>div]:bg-yellow-500'}`}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Threshold: 65%</span>
                      <span className={metric.value >= 0.65 ? 'text-green-500' : 'text-yellow-500'}>
                        {metric.value >= 0.65 ? 'PASS' : 'WARN'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* NDCG Trend */}
          <Card>
            <CardHeader>
              <CardTitle>NDCG@10 Trend (7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-2">
                {mockNdcgHistory.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className={`w-full rounded-t transition-all ${
                        day.ndcg >= 0.65 ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                      style={{ height: `${day.ndcg * 100}%` }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short' })}
                    </span>
                    <span className="text-xs font-medium">{(day.ndcg * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Latency Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Latency Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { range: '<5ms', count: 35000, pct: 72 },
                  { range: '5-10ms', count: 10000, pct: 21 },
                  { range: '10-25ms', count: 3000, pct: 6 },
                  { range: '25-50ms', count: 500, pct: 1 },
                  { range: '>50ms', count: 92, pct: 0.2 },
                ].map((bucket) => (
                  <div key={bucket.range} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{bucket.range}</span>
                      <span>{formatNumber(bucket.count)} ({bucket.pct}%)</span>
                    </div>
                    <Progress value={bucket.pct} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          {/* Feature Importance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Feature Importance (SHAP)
              </CardTitle>
              <CardDescription>
                Top contributing features to the ML score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {featureImportance.map((feature, index) => (
                  <div key={feature.feature} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium w-4">{index + 1}.</span>
                        <span className="text-sm">{feature.feature}</span>
                        {feature.direction === 'positive' ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <span className="text-sm font-bold">
                        {(feature.importance * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={feature.importance * 100} 
                      className={`h-2 ${feature.direction === 'positive' ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Feature Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Heuristic Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• revenueScore</li>
                  <li>• capacityScore</li>
                  <li>• priorityScore</li>
                  <li>• riskScore</li>
                  <li>• serviceLevelScore</li>
                  <li>• co2Score</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Historical Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• customerAcceptanceRate30d</li>
                  <li>• driverAcceptanceRate30d</li>
                  <li>• laneAcceptanceRate30d</li>
                  <li>• customerAvgMargin30d</li>
                  <li>• driverAvgMargin30d</li>
                  <li>• laneAvgMargin30d</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Context Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• hourOfDay</li>
                  <li>• isWeekend</li>
                  <li>• weatherEncoded</li>
                  <li>• trafficEncoded</li>
                  <li>• customerTierEncoded</li>
                  <li>• driverRating</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deployment Tab */}
        <TabsContent value="deployment" className="space-y-6">
          {/* Deployment Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle>Deployment Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {['shadow', 'canary', 'production'].map((stage, index) => (
                  <div key={stage} className="flex items-center">
                    <div 
                      className={`flex flex-col items-center p-4 rounded-lg border ${
                        health.mode === stage 
                          ? 'border-green-500 bg-green-50' 
                          : index < ['shadow', 'canary', 'production'].indexOf(health.mode)
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        health.mode === stage 
                          ? 'bg-green-500 text-white' 
                          : index < ['shadow', 'canary', 'production'].indexOf(health.mode)
                            ? 'bg-green-200 text-green-700'
                            : 'bg-gray-200 text-gray-500'
                      }`}>
                        {index < ['shadow', 'canary', 'production'].indexOf(health.mode) ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className="text-sm font-medium mt-2 capitalize">{stage}</span>
                      <span className="text-xs text-muted-foreground">
                        {stage === 'shadow' && 'ML logged only'}
                        {stage === 'canary' && '10% ML traffic'}
                        {stage === 'production' && 'Full ML traffic'}
                      </span>
                    </div>
                    {index < 2 && (
                      <div className={`w-16 h-1 mx-2 rounded ${
                        index < ['shadow', 'canary', 'production'].indexOf(health.mode)
                          ? 'bg-green-500'
                          : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Promotion Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Promotion Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Current Mode: Shadow</h4>
                  <p className="text-sm text-muted-foreground">
                    ML scores are logged but not used in production
                  </p>
                </div>
                <Button variant="outline">
                  Promote to Canary
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
                <div>
                  <h4 className="font-medium">Canary Mode</h4>
                  <p className="text-sm text-muted-foreground">
                    10% of traffic will use ML-enhanced scoring
                  </p>
                </div>
                <Button variant="outline" disabled>
                  Promote to Production
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
                <div>
                  <h4 className="font-medium">Production Mode</h4>
                  <p className="text-sm text-muted-foreground">
                    All traffic uses hybrid scoring
                  </p>
                </div>
                <Button variant="outline" disabled>
                  Already in Production
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Model History */}
          <Card>
            <CardHeader>
              <CardTitle>Model History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { version: '15', stage: 'Production', ndcg: 0.73, date: '2025-04-18' },
                  { version: '14', stage: 'Archived', ndcg: 0.71, date: '2025-04-11' },
                  { version: '13', stage: 'Archived', ndcg: 0.70, date: '2025-04-04' },
                  { version: '12', stage: 'Archived', ndcg: 0.68, date: '2025-03-28' },
                ].map((model) => (
                  <div 
                    key={model.version} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-medium">v{model.version}</span>
                      <Badge variant="outline" className={getStageColor(model.stage)}>
                        {model.stage}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        NDCG@10: {(model.ndcg * 100).toFixed(0)}%
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {model.date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
