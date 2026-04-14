'use client';

// ============================================
// CARGOBIT RISK DASHBOARD - RISK OVERVIEW
// Startseite mit KPI-Leiste, Top High-Risk, Trend, Events
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AlertTriangle,
  Shield,
  Users,
  Building2,
  Truck,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3,
  Eye,
  Flag,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';
type EntityType = 'USER' | 'COMPANY' | 'TRANSACTION';

interface RiskStats {
  total: number;
  byLevel: {
    green: number;
    yellow: number;
    red: number;
  };
  byType: {
    user: number;
    company: number;
    transaction: number;
  };
  newHighRiskToday: number;
  recentEvents: RiskEvent[];
}

interface RiskEvent {
  id: string;
  entityType: EntityType;
  entityId: string;
  ruleName: string;
  weight: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface HighRiskEntity {
  id: string;
  type: EntityType;
  name: string;
  score: number;
  level: RiskLevel;
  lastEvent: string;
  lastUpdated: string;
}

interface TrendData {
  date: string;
  green: number;
  yellow: number;
  red: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getRiskColor = (level: RiskLevel) => {
  switch (level) {
    case 'GREEN':
      return 'bg-green-500';
    case 'YELLOW':
      return 'bg-yellow-500';
    case 'RED':
      return 'bg-red-500';
  }
};

const getRiskTextColor = (level: RiskLevel) => {
  switch (level) {
    case 'GREEN':
      return 'text-green-600';
    case 'YELLOW':
      return 'text-yellow-600';
    case 'RED':
      return 'text-red-600';
  }
};

const getRiskBgLight = (level: RiskLevel) => {
  switch (level) {
    case 'GREEN':
      return 'bg-green-50 border-green-200';
    case 'YELLOW':
      return 'bg-yellow-50 border-yellow-200';
    case 'RED':
      return 'bg-red-50 border-red-200';
  }
};

const getEntityIcon = (type: EntityType) => {
  switch (type) {
    case 'USER':
      return Users;
    case 'COMPANY':
      return Building2;
    case 'TRANSACTION':
      return Truck;
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ============================================
// MOCK DATA GENERATOR
// ============================================

function generateMockData(): { stats: RiskStats; highRiskEntities: HighRiskEntity[]; trend: TrendData[] } {
  // Generate high-risk entities
  const entities: HighRiskEntity[] = [
    { id: 'usr_7a8b9c', type: 'USER', name: 'Max Mustermann', score: 78, level: 'RED', lastEvent: 'user_fraud_flag', lastUpdated: new Date().toISOString() },
    { id: 'cmp_1x2y3z', type: 'COMPANY', name: 'Logistics GmbH', score: 72, level: 'RED', lastEvent: 'company_fraud_flags', lastUpdated: new Date(Date.now() - 3600000).toISOString() },
    { id: 'tx_4q5w6e', type: 'TRANSACTION', name: 'TX-2024-001234', score: 85, level: 'RED', lastEvent: 'tx_high_amount + tx_intl_hazmat', lastUpdated: new Date(Date.now() - 7200000).toISOString() },
    { id: 'usr_2d3f4g', type: 'USER', name: 'Anna Schmidt', score: 65, level: 'RED', lastEvent: 'user_kyc_missing + user_new_iban', lastUpdated: new Date(Date.now() - 10800000).toISOString() },
    { id: 'cmp_5h6j7k', type: 'COMPANY', name: 'Transport AG', score: 58, level: 'YELLOW', lastEvent: 'company_damage_rate', lastUpdated: new Date(Date.now() - 14400000).toISOString() },
    { id: 'usr_8l9m0n', type: 'USER', name: 'Thomas Weber', score: 55, level: 'YELLOW', lastEvent: 'user_many_cancellations', lastUpdated: new Date(Date.now() - 18000000).toISOString() },
    { id: 'tx_1o2p3q', type: 'TRANSACTION', name: 'TX-2024-001235', score: 62, level: 'YELLOW', lastEvent: 'tx_new_iban_high', lastUpdated: new Date(Date.now() - 21600000).toISOString() },
    { id: 'cmp_4r5s6t', type: 'COMPANY', name: 'Spedition Müller', score: 48, level: 'YELLOW', lastEvent: 'company_kyb_missing', lastUpdated: new Date(Date.now() - 25200000).toISOString() },
  ];

  // Generate trend data (last 30 days)
  const trend: TrendData[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    trend.push({
      date: date.toISOString().split('T')[0],
      green: 800 + Math.floor(Math.random() * 100),
      yellow: 120 + Math.floor(Math.random() * 30),
      red: 30 + Math.floor(Math.random() * 15),
    });
  }

  // Generate recent events
  const events: RiskEvent[] = [
    { id: 'evt_1', entityType: 'USER', entityId: 'usr_7a8b9c', ruleName: 'user_fraud_flag', weight: 30, timestamp: new Date().toISOString() },
    { id: 'evt_2', entityType: 'TRANSACTION', entityId: 'tx_4q5w6e', ruleName: 'tx_high_amount', weight: 20, timestamp: new Date(Date.now() - 300000).toISOString() },
    { id: 'evt_3', entityType: 'COMPANY', entityId: 'cmp_1x2y3z', ruleName: 'company_fraud_flags', weight: 25, timestamp: new Date(Date.now() - 600000).toISOString() },
    { id: 'evt_4', entityType: 'USER', entityId: 'usr_2d3f4g', ruleName: 'user_kyc_missing', weight: 20, timestamp: new Date(Date.now() - 900000).toISOString() },
    { id: 'evt_5', entityType: 'TRANSACTION', entityId: 'tx_4q5w6e', ruleName: 'tx_intl_hazmat', weight: 20, timestamp: new Date(Date.now() - 1200000).toISOString() },
    { id: 'evt_6', entityType: 'USER', entityId: 'usr_2d3f4g', ruleName: 'user_new_iban', weight: 15, timestamp: new Date(Date.now() - 1500000).toISOString() },
    { id: 'evt_7', entityType: 'USER', entityId: 'usr_abc123', ruleName: 'user_high_rating', weight: -10, timestamp: new Date(Date.now() - 1800000).toISOString() },
    { id: 'evt_8', entityType: 'COMPANY', entityId: 'cmp_xyz789', ruleName: 'company_good_history', weight: -10, timestamp: new Date(Date.now() - 2100000).toISOString() },
  ];

  const stats: RiskStats = {
    total: 1284,
    byLevel: { green: 1105, yellow: 142, red: 37 },
    byType: { user: 856, company: 234, transaction: 194 },
    newHighRiskToday: 5,
    recentEvents: events,
  };

  return { stats, highRiskEntities: entities, trend };
}

// ============================================
// KPI CARD COMPONENT
// ============================================

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color,
  onClick,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? '' : 'cursor-default'}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-full ${color || 'bg-muted'}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        {trend && trendValue && (
          <div className="mt-3 flex items-center text-sm">
            {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-red-500 mr-1" />}
            {trend === 'down' && <ArrowDownRight className="h-4 w-4 text-green-500 mr-1" />}
            {trend === 'neutral' && <Minus className="h-4 w-4 text-muted-foreground mr-1" />}
            <span className={trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-green-500' : 'text-muted-foreground'}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// RISK TREND CHART (Simple SVG)
// ============================================

function RiskTrendChart({ data, selectedType }: { data: TrendData[]; selectedType: string }) {
  const maxValue = Math.max(...data.flatMap(d => [d.green, d.yellow, d.red]));
  const chartHeight = 200;
  const chartWidth = 600;
  const padding = 40;
  const graphWidth = chartWidth - padding * 2;
  const graphHeight = chartHeight - padding * 2;

  const getX = (index: number) => padding + (index / (data.length - 1)) * graphWidth;
  const getY = (value: number) => padding + graphHeight - (value / maxValue) * graphHeight;

  const greenPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.green)}`).join(' ');
  const yellowPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.yellow)}`).join(' ');
  const redPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.red)}`).join(' ');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Risk Trend
          </CardTitle>
          <CardDescription>Entwicklung der Risk-Scores (letzte 30 Tage)</CardDescription>
        </div>
        <Select value={selectedType} onValueChange={() => {}}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Entities</SelectItem>
            <SelectItem value="user">Users</SelectItem>
            <SelectItem value="company">Companies</SelectItem>
            <SelectItem value="transaction">Transactions</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(pct => (
            <line
              key={pct}
              x1={padding}
              y1={getY(maxValue * pct / 100)}
              x2={chartWidth - padding}
              y2={getY(maxValue * pct / 100)}
              stroke="#e5e7eb"
              strokeDasharray="4"
            />
          ))}

          {/* Lines */}
          <path d={greenPath} fill="none" stroke="#22c55e" strokeWidth="2" />
          <path d={yellowPath} fill="none" stroke="#eab308" strokeWidth="2" />
          <path d={redPath} fill="none" stroke="#ef4444" strokeWidth="2" />

          {/* Legend */}
          <circle cx={padding + 20} cy={chartHeight - 15} r="4" fill="#22c55e" />
          <text x={padding + 30} y={chartHeight - 11} className="text-xs fill-muted-foreground">GREEN</text>
          <circle cx={padding + 100} cy={chartHeight - 15} r="4" fill="#eab308" />
          <text x={padding + 110} y={chartHeight - 11} className="text-xs fill-muted-foreground">YELLOW</text>
          <circle cx={padding + 190} cy={chartHeight - 15} r="4" fill="#ef4444" />
          <text x={padding + 200} y={chartHeight - 11} className="text-xs fill-muted-foreground">RED</text>
        </svg>
      </CardContent>
    </Card>
  );
}

// ============================================
// HIGH RISK ENTITIES TABLE
// ============================================

function HighRiskEntitiesTable({
  entities,
  onSelectEntity,
}: {
  entities: HighRiskEntity[];
  onSelectEntity: (entity: HighRiskEntity) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Top High-Risk Entities
            </CardTitle>
            <CardDescription>Entities mit höchstem Risk-Score</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Suchen..." className="pl-8 w-48" />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Name / ID</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Last Event</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.map((entity) => {
              const EntityIcon = getEntityIcon(entity.type);
              return (
                <TableRow key={entity.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <EntityIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{entity.type.toLowerCase()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{entity.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{entity.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={entity.level === 'RED' ? 'destructive' : entity.level === 'YELLOW' ? 'secondary' : 'default'}
                    >
                      {entity.level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold ${getRiskTextColor(entity.level)}`}>
                      {entity.score}
                    </span>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {entity.lastEvent}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(entity.lastUpdated)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => onSelectEntity(entity)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============================================
// RECENT EVENTS TABLE
// ============================================

function RecentEventsTable({ events }: { events: RiskEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Risk Events
            </CardTitle>
            <CardDescription>Die zuletzt ausgelösten Risiko-Ereignisse</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            View All
            <ExternalLink className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead className="text-right">Weight</TableHead>
              <TableHead>Risk Level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {formatTime(event.timestamp)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {React.createElement(getEntityIcon(event.entityType), {
                      className: 'h-4 w-4 text-muted-foreground',
                    })}
                    <span className="font-mono text-sm">{event.entityId}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {event.ruleName}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-bold ${event.weight > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {event.weight > 0 ? '+' : ''}{event.weight}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      event.weight >= 20
                        ? 'border-red-300 text-red-600'
                        : event.weight >= 10
                        ? 'border-yellow-300 text-yellow-600'
                        : 'border-green-300 text-green-600'
                    }
                  >
                    {event.weight >= 20 ? 'HIGH' : event.weight >= 10 ? 'MEDIUM' : 'LOW'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

export function RiskOverviewDashboard() {
  const [stats, setStats] = useState<RiskStats | null>(null);
  const [highRiskEntities, setHighRiskEntities] = useState<HighRiskEntity[]>([]);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedType, setSelectedType] = useState('all');
  const [selectedEntity, setSelectedEntity] = useState<HighRiskEntity | null>(null);

  const refreshData = useCallback(() => {
    setLoading(true);
    // In production: fetch from API
    const { stats: s, highRiskEntities: e, trend: t } = generateMockData();
    setStats(s);
    setHighRiskEntities(e);
    setTrend(t);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Risk Overview
          </h1>
          <p className="text-muted-foreground">
            Security Cockpit für Admin, Support & Compliance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDate(lastRefresh.toISOString())}
          </span>
          <Button onClick={refreshData} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Risk Entities"
          value={stats?.total || 0}
          subtitle="Users, Companies, Transactions mit aktivem Score"
          icon={Activity}
          color="bg-blue-500"
        />
        <KPICard
          title="High Risk (Red)"
          value={stats?.byLevel.red || 0}
          subtitle="Score ≥ 61"
          icon={AlertTriangle}
          color="bg-red-500"
          trend="up"
          trendValue="+5 vs. gestern"
        />
        <KPICard
          title="Medium Risk (Yellow)"
          value={stats?.byLevel.yellow || 0}
          subtitle="Score 31–60"
          icon={AlertCircle}
          color="bg-yellow-500"
          trend="neutral"
          trendValue="±0 vs. gestern"
        />
        <KPICard
          title="New High-Risk Today"
          value={stats?.newHighRiskToday || 0}
          subtitle="seit 00:00"
          icon={Flag}
          color="bg-orange-500"
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <HighRiskEntitiesTable
          entities={highRiskEntities}
          onSelectEntity={setSelectedEntity}
        />
        <RiskTrendChart data={trend} selectedType={selectedType} />
      </div>

      {/* Recent Events */}
      <RecentEventsTable events={stats?.recentEvents || []} />

      {/* Entity Detail Modal */}
      {selectedEntity && (
        <Dialog open={!!selectedEntity} onOpenChange={() => setSelectedEntity(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {React.createElement(getEntityIcon(selectedEntity.type), { className: 'h-5 w-5' })}
                Risk Profile: {selectedEntity.name}
              </DialogTitle>
              <DialogDescription>
                ID: {selectedEntity.id} • Type: {selectedEntity.type}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`text-5xl font-bold ${getRiskTextColor(selectedEntity.level)}`}>
                    {selectedEntity.score}
                  </div>
                  <div>
                    <Badge
                      variant={selectedEntity.level === 'RED' ? 'destructive' : 'secondary'}
                      className="text-lg px-3 py-1"
                    >
                      {selectedEntity.level}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Last updated: {formatDate(selectedEntity.lastUpdated)}
                    </p>
                  </div>
                </div>
                <Button variant="destructive">
                  <Flag className="h-4 w-4 mr-1" />
                  Security Flag setzen
                </Button>
              </div>

              <div className={`p-4 rounded-lg border ${getRiskBgLight(selectedEntity.level)}`}>
                <h4 className="font-medium mb-2">Last Triggered Rules</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedEntity.lastEvent.split(' + ').map((rule, i) => (
                    <Badge key={i} variant="outline">
                      {rule}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Risk Factors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>User Risk</span>
                        <span className="font-mono">35</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Company Risk</span>
                        <span className="font-mono">22</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Transaction Risk</span>
                        <span className="font-mono">21</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Eye className="h-4 w-4 mr-2" />
                      View Full History
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Shield className="h-4 w-4 mr-2" />
                      Manage Security Flags
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default RiskOverviewDashboard;
