'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Database,
  RefreshCw,
  Clock,
  Server,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Layers,
} from 'lucide-react';

// Feature View Types
interface FeatureView {
  name: string;
  entity: string;
  ttl: string;
  features: Feature[];
  refresh: string;
  status: 'active' | 'stale' | 'error';
  lastMaterialized: string;
}

interface Feature {
  name: string;
  type: string;
  description?: string;
}

// Mock data
const mockFeatureViews: FeatureView[] = [
  {
    name: 'customer_features',
    entity: 'customer_id',
    ttl: '1 day',
    refresh: 'daily',
    status: 'active',
    lastMaterialized: '2025-04-19T06:00:00Z',
    features: [
      { name: 'acceptance_rate_7d', type: 'FLOAT', description: '7-day acceptance rate' },
      { name: 'acceptance_rate_30d', type: 'FLOAT', description: '30-day acceptance rate' },
      { name: 'acceptance_rate_90d', type: 'FLOAT', description: '90-day acceptance rate' },
      { name: 'realized_margin_avg_30d', type: 'FLOAT', description: 'Avg realized margin (30d)' },
      { name: 'total_suggestions_30d', type: 'INT64', description: 'Total suggestions (30d)' },
      { name: 'tier_encoded', type: 'INT64', description: 'Customer tier encoding' },
      { name: 'credit_rating', type: 'FLOAT', description: 'Credit rating score' },
    ],
  },
  {
    name: 'driver_features',
    entity: 'driver_id',
    ttl: '1 day',
    refresh: 'daily',
    status: 'active',
    lastMaterialized: '2025-04-19T06:00:00Z',
    features: [
      { name: 'acceptance_rate_30d', type: 'FLOAT', description: '30-day acceptance rate' },
      { name: 'realized_margin_avg_30d', type: 'FLOAT', description: 'Avg realized margin (30d)' },
      { name: 'total_tours_30d', type: 'INT64', description: 'Total tours (30d)' },
      { name: 'rating', type: 'FLOAT', description: 'Driver rating (1-5)' },
      { name: 'experience_years', type: 'FLOAT', description: 'Years of experience' },
    ],
  },
  {
    name: 'lane_features',
    entity: 'lane_id',
    ttl: '7 days',
    refresh: 'daily',
    status: 'active',
    lastMaterialized: '2025-04-19T06:00:00Z',
    features: [
      { name: 'acceptance_rate_30d', type: 'FLOAT', description: '30-day acceptance rate' },
      { name: 'realized_margin_avg_90d', type: 'FLOAT', description: 'Avg margin (90d)' },
      { name: 'avg_distance_km', type: 'FLOAT', description: 'Average distance (km)' },
      { name: 'avg_duration_minutes', type: 'FLOAT', description: 'Average duration (min)' },
      { name: 'seasonality_score', type: 'FLOAT', description: 'Seasonality factor' },
    ],
  },
  {
    name: 'vehicle_features',
    entity: 'vehicle_id',
    ttl: '1 day',
    refresh: 'daily',
    status: 'active',
    lastMaterialized: '2025-04-19T06:00:00Z',
    features: [
      { name: 'volume_max_m3', type: 'FLOAT', description: 'Max volume (m³)' },
      { name: 'weight_max_kg', type: 'FLOAT', description: 'Max weight (kg)' },
      { name: 'utilization_rate_30d', type: 'FLOAT', description: 'Utilization rate (30d)' },
      { name: 'avg_margin_7d', type: 'FLOAT', description: 'Avg margin (7d)' },
    ],
  },
  {
    name: 'tour_context',
    entity: 'tour_id',
    ttl: '6 hours',
    refresh: 'continuous',
    status: 'active',
    lastMaterialized: '2025-04-19T10:30:00Z',
    features: [
      { name: 'remaining_capacity_m3', type: 'FLOAT', description: 'Remaining capacity (m³)' },
      { name: 'stops_remaining', type: 'INT64', description: 'Stops remaining' },
      { name: 'distance_remaining_km', type: 'FLOAT', description: 'Distance remaining (km)' },
      { name: 'eta_destination_minutes', type: 'FLOAT', description: 'ETA destination (min)' },
      { name: 'traffic_condition_encoded', type: 'INT64', description: 'Traffic condition' },
    ],
  },
];

const mockStoreStats = {
  onlineStore: {
    type: 'Redis',
    status: 'connected',
    host: 'redis.cargobit.io',
    port: 6379,
    keys: 15420,
    memoryUsed: '1.2 GB',
    latency: '2.5ms',
  },
  offlineStore: {
    type: 'S3/Parquet',
    bucket: 'cargobit-feature-store',
    size: '45.2 GB',
    lastUpdated: '2025-04-19T06:00:00Z',
  },
  registry: {
    type: 'PostgreSQL',
    status: 'connected',
    host: 'postgres.cargobit.io',
    featureViews: 5,
    entities: 5,
  },
};

const mockEntityStats = [
  { entity: 'customer_id', count: 12500, lastAccess: '2 min ago' },
  { entity: 'driver_id', count: 3200, lastAccess: '1 min ago' },
  { entity: 'lane_id', count: 850, lastAccess: '5 min ago' },
  { entity: 'vehicle_id', count: 2100, lastAccess: '3 min ago' },
  { entity: 'tour_id', count: 450, lastAccess: '30 sec ago' },
];

export default function FeatureStorePage() {
  const [selectedView, setSelectedView] = useState<string>(mockFeatureViews[0].name);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'stale':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'stale':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const selectedFeatureView = mockFeatureViews.find(v => v.name === selectedView);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Store</h1>
          <p className="text-muted-foreground">
            Feast Feature Store - Online & Offline Stores
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Store Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Online Store */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4" />
              Online Store (Redis)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className="bg-green-100 text-green-800">Connected</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Keys</span>
              <span className="text-sm font-medium">{mockStoreStats.onlineStore.keys.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Memory</span>
              <span className="text-sm font-medium">{mockStoreStats.onlineStore.memoryUsed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Latency</span>
              <span className="text-sm font-medium text-green-600">{mockStoreStats.onlineStore.latency}</span>
            </div>
          </CardContent>
        </Card>

        {/* Offline Store */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Offline Store (S3)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Bucket</span>
              <span className="text-sm font-medium">{mockStoreStats.offlineStore.bucket}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Size</span>
              <span className="text-sm font-medium">{mockStoreStats.offlineStore.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Last Updated</span>
              <span className="text-sm font-medium">
                {new Date(mockStoreStats.offlineStore.lastUpdated).toLocaleString('de-DE')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Registry */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Registry (PostgreSQL)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className="bg-green-100 text-green-800">Connected</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Feature Views</span>
              <span className="text-sm font-medium">{mockStoreStats.registry.featureViews}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Entities</span>
              <span className="text-sm font-medium">{mockStoreStats.registry.entities}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="views" className="space-y-4">
        <TabsList>
          <TabsTrigger value="views">Feature Views</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        {/* Feature Views Tab */}
        <TabsContent value="views" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Feature Views List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Feature Views</CardTitle>
                <CardDescription>
                  {mockFeatureViews.length} registered views
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {mockFeatureViews.map((view) => (
                  <div
                    key={view.name}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedView === view.name
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedView(view.name)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{view.name}</span>
                      {getStatusIcon(view.status)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {view.features.length} features
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        TTL: {view.ttl}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Feature View Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedFeatureView?.name}</CardTitle>
                    <CardDescription>
                      Entity: {selectedFeatureView?.entity}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(selectedFeatureView?.status || 'active')}>
                    {selectedFeatureView?.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Metadata */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">TTL</p>
                      <p className="font-medium">{selectedFeatureView?.ttl}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Refresh</p>
                      <p className="font-medium capitalize">{selectedFeatureView?.refresh}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Materialized</p>
                      <p className="font-medium">
                        {selectedFeatureView?.lastMaterialized
                          ? new Date(selectedFeatureView.lastMaterialized).toLocaleString('de-DE')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Features Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feature Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedFeatureView?.features.map((feature) => (
                        <TableRow key={feature.name}>
                          <TableCell className="font-medium">{feature.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{feature.type}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {feature.description}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Entities Tab */}
        <TabsContent value="entities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Entity Statistics</CardTitle>
              <CardDescription>
                Active entities in the feature store
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Active Count</TableHead>
                    <TableHead>Last Access</TableHead>
                    <TableHead>Features Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockEntityStats.map((entity) => {
                    const view = mockFeatureViews.find(v => v.entity === entity.entity);
                    return (
                      <TableRow key={entity.entity}>
                        <TableCell className="font-medium">{entity.entity}</TableCell>
                        <TableCell>{entity.count.toLocaleString()}</TableCell>
                        <TableCell>{entity.lastAccess}</TableCell>
                        <TableCell>{view?.features.length || 0} features</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Materialization Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Materialization Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockFeatureViews.map((view) => (
                  <div key={view.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{view.name}</span>
                      <span className="capitalize">{view.refresh}</span>
                    </div>
                    <Progress 
                      value={view.status === 'active' ? 100 : 50} 
                      className={`h-2 ${view.status === 'active' ? '[&>div]:bg-green-500' : '[&>div]:bg-yellow-500'}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Storage Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Storage Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Online Store (Redis)</span>
                    <span>{mockStoreStats.onlineStore.memoryUsed}</span>
                  </div>
                  <Progress value={24} className="h-2" />
                  <p className="text-xs text-muted-foreground">24% of 5GB limit</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Offline Store (S3)</span>
                    <span>{mockStoreStats.offlineStore.size}</span>
                  </div>
                  <Progress value={45} className="h-2" />
                  <p className="text-xs text-muted-foreground">45% of 100GB budget</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Feature Keys</span>
                    <span>{mockStoreStats.onlineStore.keys.toLocaleString()}</span>
                  </div>
                  <Progress value={15} className="h-2" />
                  <p className="text-xs text-muted-foreground">15% of 100K key limit</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Latency Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Online Serving Latency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {['p50', 'p75', 'p90', 'p95', 'p99'].map((percentile) => {
                  const values = { p50: 2.1, p75: 3.5, p90: 5.2, p95: 7.8, p99: 12.3 };
                  return (
                    <div key={percentile} className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase">{percentile}</p>
                      <p className="text-2xl font-bold">{values[percentile as keyof typeof values]}ms</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Target: p99 &lt; 10ms | Current: 12.3ms (over target)
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
