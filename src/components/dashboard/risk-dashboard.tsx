'use client';

// ============================================
// CARGOBIT RISK MONITORING DASHBOARD
// Security Cockpit für Admin/Support/Compliance
// ============================================

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';

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
  recentEvents: RiskEvent[];
}

interface RiskEvent {
  id: string;
  entityType: 'USER' | 'COMPANY' | 'TRANSACTION';
  entityId: string;
  ruleName: string;
  weight: number;
  timestamp: string;
}

interface HighRiskEntity {
  id: string;
  type: 'USER' | 'COMPANY' | 'TRANSACTION';
  name: string;
  score: number;
  level: RiskLevel;
  lastEvent: string;
}

interface RuleImpact {
  ruleId: string;
  ruleName: string;
  triggerCount: number;
  avgWeight: number;
  totalImpact: number;
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

const getRiskBadgeVariant = (level: RiskLevel): 'default' | 'secondary' | 'destructive' => {
  switch (level) {
    case 'GREEN':
      return 'default';
    case 'YELLOW':
      return 'secondary';
    case 'RED':
      return 'destructive';
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

// ============================================
// API FUNCTIONS
// ============================================

const RISK_ENGINE_PORT = 3003;

async function fetchRiskStats(): Promise<RiskStats | null> {
  try {
    const response = await fetch(`/risk/stats?XTransformPort=${RISK_ENGINE_PORT}`);
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Failed to fetch risk stats:', error);
    return null;
  }
}

async function fetchRiskEvents(limit: number = 50): Promise<RiskEvent[]> {
  try {
    const response = await fetch(`/risk/events?limit=${limit}&XTransformPort=${RISK_ENGINE_PORT}`);
    const data = await response.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Failed to fetch risk events:', error);
    return [];
  }
}

// ============================================
// COMPONENTS
// ============================================

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && trendValue && (
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
            )}
            {trendValue}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RiskLevelGauge({ stats }: { stats: RiskStats | null }) {
  if (!stats) return null;

  const total = stats.byLevel.green + stats.byLevel.yellow + stats.byLevel.red;
  const greenPct = total > 0 ? (stats.byLevel.green / total) * 100 : 0;
  const yellowPct = total > 0 ? (stats.byLevel.yellow / total) * 100 : 0;
  const redPct = total > 0 ? (stats.byLevel.red / total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Global Risk Overview
        </CardTitle>
        <CardDescription>Verteilung der Risk-Scores</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Green */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">GREEN (0-30)</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {stats.byLevel.green} ({greenPct.toFixed(1)}%)
              </span>
            </div>
            <Progress value={greenPct} className="h-2 bg-muted [&>div]:bg-green-500" />
          </div>

          {/* Yellow */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">YELLOW (31-60)</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {stats.byLevel.yellow} ({yellowPct.toFixed(1)}%)
              </span>
            </div>
            <Progress value={yellowPct} className="h-2 bg-muted [&>div]:bg-yellow-500" />
          </div>

          {/* Red */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">RED (61-100)</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {stats.byLevel.red} ({redPct.toFixed(1)}%)
              </span>
            </div>
            <Progress value={redPct} className="h-2 bg-muted [&>div]:bg-red-500" />
          </div>
        </div>

        {/* Entity Type Breakdown */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Nach Entity-Typ</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold">{stats.byType.user}</div>
              <div className="text-xs text-muted-foreground">Users</div>
            </div>
            <div className="text-center">
              <Building2 className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold">{stats.byType.company}</div>
              <div className="text-xs text-muted-foreground">Companies</div>
            </div>
            <div className="text-center">
              <Truck className="h-5 w-5 mx-auto mb-1 text-orange-500" />
              <div className="text-lg font-bold">{stats.byType.transaction}</div>
              <div className="text-xs text-muted-foreground">Transactions</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentEventsTable({ events }: { events: RiskEvent[] }) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Letzte Risk-Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Keine Events vorhanden
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Letzte Risk-Events
        </CardTitle>
        <CardDescription>Die zuletzt ausgelösten Risiko-Ereignisse</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entity</TableHead>
              <TableHead>Regel</TableHead>
              <TableHead className="text-right">Gewicht</TableHead>
              <TableHead>Zeit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.slice(0, 10).map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {event.entityType === 'USER' && <Users className="h-4 w-4 text-blue-500" />}
                    {event.entityType === 'COMPANY' && <Building2 className="h-4 w-4 text-purple-500" />}
                    {event.entityType === 'TRANSACTION' && <Truck className="h-4 w-4 text-orange-500" />}
                    <span className="font-mono text-sm">{event.entityId}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{event.ruleName}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className={event.weight > 0 ? 'text-red-500' : 'text-green-500'}>
                    {event.weight > 0 ? '+' : ''}{event.weight}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(event.timestamp)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RuleImpactAnalysis({ events }: { events: RiskEvent[] }) {
  // Aggregate rule impacts
  const ruleImpacts: Record<string, { count: number; totalWeight: number; name: string }> = {};

  events.forEach((event) => {
    if (!ruleImpacts[event.ruleName]) {
      ruleImpacts[event.ruleName] = { count: 0, totalWeight: 0, name: event.ruleName };
    }
    ruleImpacts[event.ruleName].count++;
    ruleImpacts[event.ruleName].totalWeight += event.weight;
  });

  const sortedRules = Object.values(ruleImpacts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Rule Impact
        </CardTitle>
        <CardDescription>Am häufigsten ausgelöste Regeln</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedRules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Keine Regeln ausgelöst
          </div>
        ) : (
          <div className="space-y-3">
            {sortedRules.map((rule, index) => (
              <div key={rule.name} className="flex items-center gap-3">
                <div className="w-6 text-sm text-muted-foreground">#{index + 1}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{rule.name}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{rule.count}x</span>
                      <span className={rule.totalWeight > 0 ? 'text-red-500' : 'text-green-500'}>
                        {rule.totalWeight > 0 ? '+' : ''}{rule.totalWeight}
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={(rule.count / sortedRules[0].count) * 100}
                    className="h-1.5"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

export function RiskDashboard() {
  const [stats, setStats] = useState<RiskStats | null>(null);
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const refreshData = async () => {
    setLoading(true);
    const [statsData, eventsData] = await Promise.all([
      fetchRiskStats(),
      fetchRiskEvents(100),
    ]);
    setStats(statsData);
    setEvents(eventsData);
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Risk Monitoring Dashboard
          </h1>
          <p className="text-muted-foreground">
            Security Cockpit für Admin/Support/Compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Letzte Aktualisierung: {formatDate(lastRefresh.toISOString())}
          </span>
          <Button onClick={refreshData} disabled={loading}>
            {loading ? 'Laden...' : 'Aktualisieren'}
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Gesamt Entities"
          value={stats?.total || 0}
          icon={Activity}
          color="text-blue-500"
        />
        <StatCard
          title="GREEN Entities"
          value={stats?.byLevel.green || 0}
          icon={CheckCircle2}
          color="text-green-500"
        />
        <StatCard
          title="YELLOW Entities"
          value={stats?.byLevel.yellow || 0}
          icon={AlertCircle}
          color="text-yellow-500"
        />
        <StatCard
          title="RED Entities"
          value={stats?.byLevel.red || 0}
          icon={AlertTriangle}
          color="text-red-500"
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RiskLevelGauge stats={stats} />
        <RuleImpactAnalysis events={events} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="users">High-Risk Users</TabsTrigger>
          <TabsTrigger value="companies">High-Risk Companies</TabsTrigger>
          <TabsTrigger value="transactions">High-Risk Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <RecentEventsTable events={events} />
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>High-Risk Users</CardTitle>
              <CardDescription>Benutzer mit hohem Risk-Score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Wähle einen User aus der Recent Events Liste für Details
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies">
          <Card>
            <CardHeader>
              <CardTitle>High-Risk Companies</CardTitle>
              <CardDescription>Unternehmen mit hohem Risk-Score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Wähle eine Company aus der Recent Events Liste für Details
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>High-Risk Transactions</CardTitle>
              <CardDescription>Transaktionen mit hohem Risk-Score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Wähle eine Transaction aus der Recent Events Liste für Details
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default RiskDashboard;
