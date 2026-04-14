'use client';

// ============================================
// CARGOBIT RISK DASHBOARD - SCREEN 1: RISK OVERVIEW
// Main Dashboard with KPI Tiles, Charts, Tables
// ============================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
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
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  Eye,
  Flag,
  Ban,
  ChevronRight,
  Plus,
  Calendar,
  Download,
} from 'lucide-react';
import { colors, getRiskLevel, getRiskColor, getRiskBgColor, getRiskAction } from '@/lib/design-tokens';

// ============================================
// TYPES
// ============================================

type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';
type EntityType = 'USER' | 'COMPANY' | 'TRANSACTION';

interface RiskStats {
  total: number;
  byLevel: { green: number; yellow: number; red: number };
  byType: { user: number; company: number; transaction: number };
  trend: { date: string; green: number; yellow: number; red: number }[];
  recentEvents: RiskEvent[];
}

interface RiskEvent {
  id: string;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  ruleName: string;
  weight: number;
  timestamp: string;
}

interface HighRiskEntity {
  id: string;
  type: EntityType;
  name: string;
  score: number;
  level: RiskLevel;
  lastEvent: string;
  triggeredRules: string[];
}

interface RuleImpact {
  ruleId: string;
  ruleName: string;
  triggerCount: number;
  avgWeight: number;
  totalImpact: number;
}

// ============================================
// MOCK DATA FOR WIREFRAME
// ============================================

const mockStats: RiskStats = {
  total: 1247,
  byLevel: { green: 892, yellow: 298, red: 57 },
  byType: { user: 634, company: 412, transaction: 201 },
  trend: [
    { date: '2024-01-08', green: 850, yellow: 280, red: 45 },
    { date: '2024-01-09', green: 865, yellow: 275, red: 48 },
    { date: '2024-01-10', green: 870, yellow: 285, red: 52 },
    { date: '2024-01-11', green: 878, yellow: 290, red: 50 },
    { date: '2024-01-12', green: 885, yellow: 295, red: 53 },
    { date: '2024-01-13', green: 890, yellow: 292, red: 55 },
    { date: '2024-01-14', green: 892, yellow: 298, red: 57 },
  ],
  recentEvents: [],
};

const mockHighRiskEntities: HighRiskEntity[] = [
  { id: 'u_2847', type: 'USER', name: 'Max Mustermann', score: 81, level: 'RED', lastEvent: '2024-01-14T10:23:00', triggeredRules: ['new_iban', 'high_amount', 'fraud_flags'] },
  { id: 'c_0892', type: 'COMPANY', name: 'LogiTrans GmbH', score: 75, level: 'RED', lastEvent: '2024-01-14T09:45:00', triggeredRules: ['company_vat_mismatch', 'negative_reviews'] },
  { id: 't_4821', type: 'TRANSACTION', name: 'TX-4821', score: 88, level: 'RED', lastEvent: '2024-01-14T08:30:00', triggeredRules: ['high_amount', 'new_route', 'gps_mismatch'] },
  { id: 'u_1923', type: 'USER', name: 'Anna Schmidt', score: 67, level: 'RED', lastEvent: '2024-01-14T07:15:00', triggeredRules: ['multiple_failed_verifications'] },
  { id: 'c_1456', type: 'COMPANY', name: 'FastCargo AG', score: 62, level: 'RED', lastEvent: '2024-01-13T16:20:00', triggeredRules: ['company_address_change', 'payment_delay'] },
];

const mockRecentEvents: RiskEvent[] = [
  { id: 'e_1', entityType: 'USER', entityId: 'u_2847', entityName: 'Max Mustermann', ruleName: 'new_iban', weight: 15, timestamp: '2024-01-14T10:23:00' },
  { id: 'e_2', entityType: 'USER', entityId: 'u_2847', entityName: 'Max Mustermann', ruleName: 'high_amount', weight: 25, timestamp: '2024-01-14T10:22:00' },
  { id: 'e_3', entityType: 'COMPANY', entityId: 'c_0892', entityName: 'LogiTrans GmbH', ruleName: 'company_vat_mismatch', weight: 20, timestamp: '2024-01-14T09:45:00' },
  { id: 'e_4', entityType: 'TRANSACTION', entityId: 't_4821', entityName: 'TX-4821', ruleName: 'gps_mismatch', weight: 30, timestamp: '2024-01-14T08:30:00' },
  { id: 'e_5', entityType: 'USER', entityId: 'u_1923', entityName: 'Anna Schmidt', ruleName: 'multiple_failed_verifications', weight: 25, timestamp: '2024-01-14T07:15:00' },
];

// ============================================
// UI COMPONENTS
// ============================================

// KPI Tile Component
function KPITile({
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
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
  onClick?: () => void;
}) {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${onClick ? 'hover:border-[#2D8CFF]' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#6B7C93]">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#1F2D3D]">{value}</span>
              {subtitle && <span className="text-sm text-[#6B7C93]">{subtitle}</span>}
            </div>
            {trend && trendValue && (
              <div className="flex items-center gap-1 text-sm">
                {trend === 'up' && <TrendingUp className="h-4 w-4 text-[#2ECC71]" />}
                {trend === 'down' && <TrendingDown className="h-4 w-4 text-[#E74C3C]" />}
                <span className={trend === 'up' ? 'text-[#2ECC71]' : trend === 'down' ? 'text-[#E74C3C]' : 'text-[#6B7C93]'}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color || 'bg-[#F7F9FB]'}`}>
            <Icon className={`h-6 w-6 ${color ? 'text-white' : 'text-[#6B7C93]'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Risk Level Badge
function RiskBadge({ level, showLabel = true }: { level: RiskLevel; showLabel?: boolean }) {
  const styles = {
    GREEN: { bg: '#E8F8F0', color: '#2ECC71', label: 'GREEN' },
    YELLOW: { bg: '#FFF9E6', color: '#F1C40F', label: 'YELLOW' },
    RED: { bg: '#FDEDEC', color: '#E74C3C', label: 'RED' },
  };
  const style = styles[level];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: style.color }} />
      {showLabel && style.label}
    </span>
  );
}

// Entity Type Badge
function EntityTypeBadge({ type }: { type: EntityType }) {
  const styles = {
    USER: { bg: '#E8F4FD', color: '#2D8CFF', icon: Users },
    COMPANY: { bg: '#F3E8FD', color: '#8B5CF6', icon: Building2 },
    TRANSACTION: { bg: '#FEF3E8', color: '#F59E0B', icon: Truck },
  };
  const style = styles[type];
  const Icon = style.icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      <Icon className="h-3 w-3" />
      {type}
    </span>
  );
}

// Score Circle Component
function ScoreCircle({ score, size = 'medium' }: { score: number; size?: 'small' | 'medium' | 'large' }) {
  const level = getRiskLevel(score);
  const sizes = {
    small: 48,
    medium: 64,
    large: 96,
  };
  const fontSizes = {
    small: 14,
    medium: 18,
    large: 28,
  };
  const diameter = sizes[size];
  const radius = (diameter - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const strokeColor = getRiskColor(level);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: diameter, height: diameter }}>
      <svg className="absolute" width={diameter} height={diameter}>
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="#E0E6ED"
          strokeWidth="4"
        />
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          transform={`rotate(-90 ${diameter / 2} ${diameter / 2})`}
        />
      </svg>
      <span className="font-bold text-[#1F2D3D]" style={{ fontSize: fontSizes[size] }}>
        {score}
      </span>
    </div>
  );
}

// Risk Trend Chart (Simple CSS-based)
function RiskTrendChart({ data }: { data: typeof mockStats.trend }) {
  const maxValue = Math.max(...data.flatMap(d => [d.green, d.yellow, d.red]));
  
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#2ECC71]" />
          <span className="text-[#6B7C93]">GREEN</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#F1C40F]" />
          <span className="text-[#6B7C93]">YELLOW</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#E74C3C]" />
          <span className="text-[#6B7C93]">RED</span>
        </div>
      </div>
      
      {/* Chart Area */}
      <div className="relative h-48 flex items-end gap-2">
        {data.map((item, index) => {
          const greenHeight = (item.green / maxValue) * 100;
          const yellowHeight = (item.yellow / maxValue) * 100;
          const redHeight = (item.red / maxValue) * 100;
          
          return (
            <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: '160px' }}>
                <div 
                  className="w-full rounded-t bg-[#2ECC71] transition-all hover:opacity-80"
                  style={{ height: `${greenHeight}%` }}
                  title={`GREEN: ${item.green}`}
                />
                <div 
                  className="w-full bg-[#F1C40F] transition-all hover:opacity-80"
                  style={{ height: `${yellowHeight}%` }}
                  title={`YELLOW: ${item.yellow}`}
                />
                <div 
                  className="w-full rounded-b bg-[#E74C3C] transition-all hover:opacity-80"
                  style={{ height: `${redHeight}%` }}
                  title={`RED: ${item.red}`}
                />
              </div>
              <span className="text-xs text-[#6B7C93]">
                {new Date(item.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Top Risk Entities Table
function TopRiskEntitiesTable({ 
  entities, 
  onEntityClick 
}: { 
  entities: HighRiskEntity[];
  onEntityClick: (entity: HighRiskEntity) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#F7F9FB] hover:bg-[#F7F9FB]">
          <TableHead className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Entity</TableHead>
          <TableHead className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Risk Level</TableHead>
          <TableHead className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider text-right">Score</TableHead>
          <TableHead className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Last Event</TableHead>
          <TableHead className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entities.map((entity) => (
          <TableRow 
            key={entity.id}
            className="cursor-pointer hover:bg-[#F2F6FA]"
            onClick={() => onEntityClick(entity)}
          >
            <TableCell>
              <div className="flex items-center gap-3">
                <EntityTypeBadge type={entity.type} />
                <div>
                  <div className="font-medium text-[#1F2D3D]">{entity.name}</div>
                  <div className="text-xs text-[#6B7C93] font-mono">{entity.id}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <RiskBadge level={entity.level} />
            </TableCell>
            <TableCell className="text-right">
              <span className="font-bold text-[#1F2D3D]">{entity.score}</span>
            </TableCell>
            <TableCell>
              <span className="text-sm text-[#6B7C93]">
                {new Date(entity.lastEvent).toLocaleString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" className="text-[#2D8CFF]">
                <Eye className="h-4 w-4 mr-1" />
                Details
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Recent Events Table
function RecentEventsTable({ 
  events, 
  onEventClick 
}: { 
  events: RiskEvent[];
  onEventClick: (event: RiskEvent) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#F7F9FB] hover:bg-[#F7F9FB]">
          <TableHead className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Entity</TableHead>
          <TableHead className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Rule</TableHead>
          <TableHead className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider text-right">Weight</TableHead>
          <TableHead className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow 
            key={event.id}
            className="cursor-pointer hover:bg-[#F2F6FA]"
            onClick={() => onEventClick(event)}
          >
            <TableCell>
              <div className="flex items-center gap-3">
                <EntityTypeBadge type={event.entityType} />
                <div>
                  <div className="font-medium text-[#1F2D3D]">{event.entityName || event.entityId}</div>
                  <div className="text-xs text-[#6B7C93] font-mono">{event.entityId}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-[#6B7C93]">
                {event.ruleName}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <span className={`font-medium ${event.weight > 0 ? 'text-[#E74C3C]' : 'text-[#2ECC71]'}`}>
                {event.weight > 0 ? '+' : ''}{event.weight}
              </span>
            </TableCell>
            <TableCell>
              <span className="text-sm text-[#6B7C93]">
                {new Date(event.timestamp).toLocaleString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ============================================
// MAIN OVERVIEW COMPONENT
// ============================================

interface RiskOverviewProps {
  onEntitySelect: (entity: HighRiskEntity) => void;
  onNavigateToRules: () => void;
}

export function RiskOverview({ onEntitySelect, onNavigateToRules }: RiskOverviewProps) {
  const [stats, setStats] = useState(mockStats);
  const [highRiskEntities, setHighRiskEntities] = useState(mockHighRiskEntities);
  const [recentEvents, setRecentEvents] = useState(mockRecentEvents);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const refreshData = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setLastRefresh(new Date());
    setLoading(false);
  };

  // Filter entities
  const filteredEntities = highRiskEntities.filter(entity => {
    const matchesSearch = entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          entity.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = filterLevel === 'all' || entity.level === filterLevel;
    const matchesType = filterType === 'all' || entity.type === filterType;
    return matchesSearch && matchesLevel && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2D3D] flex items-center gap-3">
            <Shield className="h-7 w-7 text-[#2D8CFF]" />
            Risk Overview
          </h1>
          <p className="text-[#6B7C93] mt-1">
            Security Cockpit für Admin/Support/Compliance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-[#6B7C93]">
            <Clock className="h-4 w-4" />
            Letzte Aktualisierung: {lastRefresh.toLocaleString('de-DE')}
          </div>
          <Button 
            onClick={refreshData} 
            disabled={loading}
            className="bg-[#2D8CFF] hover:bg-[#1B6ED6] text-white"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Aktualisieren
          </Button>
          <Button variant="outline" className="border-[#E0E6ED]">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPITile
          title="Gesamt Entities"
          value={stats.total}
          icon={Activity}
          color="bg-[#2D8CFF]"
          trend="up"
          trendValue="+12% vs. letzte Woche"
        />
        <KPITile
          title="GREEN Entities"
          value={stats.byLevel.green}
          subtitle={`(${((stats.byLevel.green / stats.total) * 100).toFixed(1)}%)`}
          icon={CheckCircle2}
          color="bg-[#2ECC71]"
          trend="up"
          trendValue="+3.2%"
        />
        <KPITile
          title="YELLOW Entities"
          value={stats.byLevel.yellow}
          subtitle={`(${((stats.byLevel.yellow / stats.total) * 100).toFixed(1)}%)`}
          icon={AlertCircle}
          color="bg-[#F1C40F]"
          trend="neutral"
          trendValue="Stabil"
        />
        <KPITile
          title="RED Entities"
          value={stats.byLevel.red}
          subtitle={`(${((stats.byLevel.red / stats.total) * 100).toFixed(1)}%)`}
          icon={AlertTriangle}
          color="bg-[#E74C3C]"
          trend="up"
          trendValue="+2 Fälle"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Risk Distribution */}
        <Card className="border-[#E0E6ED]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-[#1F2D3D]">
              <BarChart3 className="h-5 w-5 text-[#2D8CFF]" />
              Global Risk Distribution
            </CardTitle>
            <CardDescription>Verteilung der Risk-Scores nach Level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Green Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#2ECC71]" />
                    <span className="text-sm font-medium text-[#1F2D3D]">GREEN (0-30)</span>
                  </div>
                  <span className="text-sm text-[#6B7C93]">
                    {stats.byLevel.green} ({((stats.byLevel.green / stats.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 bg-[#E0E6ED] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#2ECC71] rounded-full transition-all"
                    style={{ width: `${(stats.byLevel.green / stats.total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Yellow Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-[#F1C40F]" />
                    <span className="text-sm font-medium text-[#1F2D3D]">YELLOW (31-60)</span>
                  </div>
                  <span className="text-sm text-[#6B7C93]">
                    {stats.byLevel.yellow} ({((stats.byLevel.yellow / stats.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 bg-[#E0E6ED] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#F1C40F] rounded-full transition-all"
                    style={{ width: `${(stats.byLevel.yellow / stats.total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Red Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#E74C3C]" />
                    <span className="text-sm font-medium text-[#1F2D3D]">RED (61-100)</span>
                  </div>
                  <span className="text-sm text-[#6B7C93]">
                    {stats.byLevel.red} ({((stats.byLevel.red / stats.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 bg-[#E0E6ED] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#E74C3C] rounded-full transition-all"
                    style={{ width: `${(stats.byLevel.red / stats.total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Entity Type Breakdown */}
              <div className="mt-6 pt-4 border-t border-[#E0E6ED]">
                <h4 className="text-sm font-medium text-[#1F2D3D] mb-3">Nach Entity-Typ</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-[#E8F4FD]">
                    <Users className="h-5 w-5 mx-auto mb-1 text-[#2D8CFF]" />
                    <div className="text-lg font-bold text-[#1F2D3D]">{stats.byType.user}</div>
                    <div className="text-xs text-[#6B7C93]">Users</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-[#F3E8FD]">
                    <Building2 className="h-5 w-5 mx-auto mb-1 text-[#8B5CF6]" />
                    <div className="text-lg font-bold text-[#1F2D3D]">{stats.byType.company}</div>
                    <div className="text-xs text-[#6B7C93]">Companies</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-[#FEF3E8]">
                    <Truck className="h-5 w-5 mx-auto mb-1 text-[#F59E0B]" />
                    <div className="text-lg font-bold text-[#1F2D3D]">{stats.byType.transaction}</div>
                    <div className="text-xs text-[#6B7C93]">Transactions</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Trend Chart */}
        <Card className="border-[#E0E6ED]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-[#1F2D3D]">
              <TrendingUp className="h-5 w-5 text-[#2D8CFF]" />
              Risk Trend (7 Days)
            </CardTitle>
            <CardDescription>Entwicklung der Risk-Scores über Zeit</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskTrendChart data={stats.trend} />
          </CardContent>
        </Card>
      </div>

      {/* Top Risk Entities */}
      <Card className="border-[#E0E6ED]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg text-[#1F2D3D]">
                <AlertTriangle className="h-5 w-5 text-[#E74C3C]" />
                Top Risk Entities
              </CardTitle>
              <CardDescription>Entities mit höchstem Risk-Score</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7C93]" />
                <Input
                  placeholder="Suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48 border-[#E0E6ED]"
                />
              </div>
              {/* Filter Level */}
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-28 border-[#E0E6ED]">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Level</SelectItem>
                  <SelectItem value="RED">RED</SelectItem>
                  <SelectItem value="YELLOW">YELLOW</SelectItem>
                  <SelectItem value="GREEN">GREEN</SelectItem>
                </SelectContent>
              </Select>
              {/* Filter Type */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32 border-[#E0E6ED]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  <SelectItem value="USER">Users</SelectItem>
                  <SelectItem value="COMPANY">Companies</SelectItem>
                  <SelectItem value="TRANSACTION">Transactions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TopRiskEntitiesTable entities={filteredEntities} onEntityClick={onEntitySelect} />
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card className="border-[#E0E6ED]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-[#1F2D3D]">
            <Activity className="h-5 w-5 text-[#2D8CFF]" />
            Recent Risk Events
          </CardTitle>
          <CardDescription>Die zuletzt ausgelösten Risiko-Ereignisse</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <RecentEventsTable events={recentEvents} onEventClick={(e) => {
            const entity = highRiskEntities.find(en => en.id === e.entityId);
            if (entity) onEntitySelect(entity);
          }} />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex items-center gap-4 p-4 bg-[#F7F9FB] rounded-xl border border-[#E0E6ED]">
        <span className="text-sm font-medium text-[#1F2D3D]">Quick Actions:</span>
        <Button variant="outline" size="sm" className="border-[#E0E6ED]" onClick={onNavigateToRules}>
          <Shield className="h-4 w-4 mr-2" />
          Rules verwalten
        </Button>
        <Button variant="outline" size="sm" className="border-[#E0E6ED]">
          <Flag className="h-4 w-4 mr-2" />
          Security Flag setzen
        </Button>
        <Button variant="outline" size="sm" className="border-[#E0E6ED]">
          <Ban className="h-4 w-4 mr-2" />
          User sperren
        </Button>
        <Button variant="outline" size="sm" className="border-[#E0E6ED]">
          <Plus className="h-4 w-4 mr-2" />
          Neue Regel
        </Button>
      </div>
    </div>
  );
}

export default RiskOverview;
