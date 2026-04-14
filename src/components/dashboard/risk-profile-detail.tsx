'use client';

// ============================================
// CARGOBIT RISK DASHBOARD - SCREEN 2: RISK PROFILE DETAIL
// Detail Page für User/Company/Transaction
// ============================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Shield,
  Users,
  Building2,
  Truck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Flag,
  Ban,
  Unlock,
  RefreshCw,
  History,
  Activity,
  FileText,
  MessageSquare,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Edit,
  Save,
  X,
} from 'lucide-react';
import { getRiskLevel, getRiskColor, getRiskBgColor, getRiskAction } from '@/lib/design-tokens';

// ============================================
// TYPES
// ============================================

type RiskLevel = 'GREEN' | 'YELLOW' | 'RED';
type EntityType = 'USER' | 'COMPANY' | 'TRANSACTION';

interface TriggeredRule {
  id: string;
  name: string;
  category: 'user' | 'company' | 'transaction';
  weight: number;
  triggeredAt: string;
  context?: Record<string, unknown>;
  description?: string;
}

interface ScoreHistoryEntry {
  date: string;
  score: number;
  change: number;
  trigger: string;
}

interface RiskEvent {
  id: string;
  type: 'rule_triggered' | 'score_change' | 'status_change' | 'manual_override';
  description: string;
  timestamp: string;
  user?: string;
  details?: Record<string, unknown>;
}

interface SupportTicket {
  id: string;
  createdAt: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
}

interface RiskProfile {
  id: string;
  type: EntityType;
  name: string;
  score: number;
  level: RiskLevel;
  createdAt: string;
  lastUpdated: string;
  triggeredRules: TriggeredRule[];
  scoreHistory: ScoreHistoryEntry[];
  events: RiskEvent[];
  supportTicket?: SupportTicket;
  metadata: {
    email?: string;
    phone?: string;
    company?: string;
    walletBalance?: number;
    transactionCount?: number;
    memberSince?: string;
    verificationStatus?: string;
    [key: string]: unknown;
  };
}

// ============================================
// MOCK DATA
// ============================================

const mockProfile: RiskProfile = {
  id: 'u_2847',
  type: 'USER',
  name: 'Max Mustermann',
  score: 81,
  level: 'RED',
  createdAt: '2023-06-15T10:00:00',
  lastUpdated: '2024-01-14T10:23:00',
  triggeredRules: [
    { id: 'r1', name: 'new_iban', category: 'user', weight: 15, triggeredAt: '2024-01-14T10:23:00', description: 'IBAN wurde vor weniger als 24h hinzugefügt' },
    { id: 'r2', name: 'high_amount', category: 'transaction', weight: 25, triggeredAt: '2024-01-14T10:22:00', description: 'Transaktion über 10.000€' },
    { id: 'r3', name: 'fraud_flags', category: 'user', weight: 20, triggeredAt: '2024-01-14T10:20:00', description: 'Vorhandene Fraud-Flags im System' },
    { id: 'r4', name: 'location_mismatch', category: 'user', weight: 15, triggeredAt: '2024-01-14T09:45:00', description: 'GPS-Position stimmt nicht mit Profiladresse überein' },
    { id: 'r5', name: 'multiple_devices', category: 'user', weight: 6, triggeredAt: '2024-01-14T08:30:00', description: 'Login von 3+ verschiedenen Geräten' },
  ],
  scoreHistory: [
    { date: '2024-01-08', score: 25, change: 0, trigger: 'Initial' },
    { date: '2024-01-10', score: 35, change: +10, trigger: 'new_device' },
    { date: '2024-01-12', score: 48, change: +13, trigger: 'high_amount_first' },
    { date: '2024-01-13', score: 62, change: +14, trigger: 'fraud_flags' },
    { date: '2024-01-14', score: 81, change: +19, trigger: 'new_iban + high_amount' },
  ],
  events: [
    { id: 'e1', type: 'rule_triggered', description: 'Rule "new_iban" triggered', timestamp: '2024-01-14T10:23:00', details: { iban: 'DE89****4567' } },
    { id: 'e2', type: 'rule_triggered', description: 'Rule "high_amount" triggered', timestamp: '2024-01-14T10:22:00', details: { amount: 12500 } },
    { id: 'e3', type: 'score_change', description: 'Score increased from 62 to 81', timestamp: '2024-01-14T10:22:00', user: 'system' },
    { id: 'e4', type: 'status_change', description: 'Status changed to BLOCKED', timestamp: '2024-01-14T10:23:00', user: 'system' },
    { id: 'e5', type: 'rule_triggered', description: 'Rule "fraud_flags" triggered', timestamp: '2024-01-13T16:20:00' },
  ],
  supportTicket: {
    id: 'st_89234',
    createdAt: '2024-01-14T10:23:00',
    status: 'open',
    priority: 'high',
    assignedTo: 'Support Team A',
  },
  metadata: {
    email: 'max.mustermann@email.de',
    phone: '+49 170 ****456',
    company: 'Mustermann Logistics GmbH',
    walletBalance: 15420.50,
    transactionCount: 47,
    memberSince: '2023-06-15',
    verificationStatus: 'partial',
  },
};

// ============================================
// UI COMPONENTS
// ============================================

// Large Score Circle
function LargeScoreCircle({ score, level }: { score: number; level: RiskLevel }) {
  const diameter = 120;
  const radius = (diameter - 8) / 2;
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
          strokeWidth="8"
        />
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          transform={`rotate(-90 ${diameter / 2} ${diameter / 2})`}
          className="transition-all duration-500"
        />
      </svg>
      <div className="text-center">
        <span className="text-4xl font-bold text-[#1F2D3D]">{score}</span>
        <div className="text-xs text-[#6B7C93] mt-1">RISK SCORE</div>
      </div>
    </div>
  );
}

// Risk Level Badge (Large)
function LargeRiskBadge({ level }: { level: RiskLevel }) {
  const styles = {
    GREEN: { bg: '#E8F8F0', color: '#2ECC71', icon: CheckCircle2, label: 'GREEN', action: 'Allow' },
    YELLOW: { bg: '#FFF9E6', color: '#F1C40F', icon: AlertCircle, label: 'YELLOW', action: 'Allow + Mitigations' },
    RED: { bg: '#FDEDEC', color: '#E74C3C', icon: AlertTriangle, label: 'RED', action: 'Block + Support Ticket' },
  };
  const style = styles[level];
  const Icon = style.icon;

  return (
    <div 
      className="inline-flex items-center gap-3 px-4 py-2 rounded-lg"
      style={{ backgroundColor: style.bg }}
    >
      <Icon className="h-5 w-5" style={{ color: style.color }} />
      <div>
        <div className="font-semibold" style={{ color: style.color }}>{style.label}</div>
        <div className="text-xs text-[#6B7C93]">{style.action}</div>
      </div>
    </div>
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
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      <Icon className="h-4 w-4" />
      {type}
    </span>
  );
}

// Score History Chart
function ScoreHistoryChart({ data }: { data: ScoreHistoryEntry[] }) {
  const maxScore = 100;
  const chartHeight = 200;
  const chartWidth = 600;
  const padding = 40;

  const points = data.map((entry, index) => {
    const x = padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - (entry.score / maxScore) * (chartHeight - padding * 2);
    return { x, y, ...entry };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="relative">
      <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(value => {
          const y = chartHeight - padding - (value / maxScore) * (chartHeight - padding * 2);
          return (
            <g key={value}>
              <line
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke="#E0E6ED"
                strokeDasharray={value === 60 || value === 30 ? "4" : "0"}
              />
              <text x={padding - 10} y={y + 4} textAnchor="end" className="text-xs fill-[#6B7C93]">
                {value}
              </text>
            </g>
          );
        })}

        {/* Threshold zones */}
        <rect x={padding} y={chartHeight - padding - (100/100) * (chartHeight - padding * 2)} width={chartWidth - padding * 2} height={(40/100) * (chartHeight - padding * 2)} fill="#FDEDEC" opacity="0.3" />
        <rect x={padding} y={chartHeight - padding - (60/100) * (chartHeight - padding * 2)} width={chartWidth - padding * 2} height={(30/100) * (chartHeight - padding * 2)} fill="#FFF9E6" opacity="0.3" />
        <rect x={padding} y={chartHeight - padding - (30/100) * (chartHeight - padding * 2)} width={chartWidth - padding * 2} height={(30/100) * (chartHeight - padding * 2)} fill="#E8F8F0" opacity="0.3" />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#2D8CFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="#2D8CFF" stroke="white" strokeWidth="2" />
            <text x={p.x} y={chartHeight - 10} textAnchor="middle" className="text-xs fill-[#6B7C93]">
              {new Date(p.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
            </text>
          </g>
        ))}
      </svg>

      {/* Threshold Labels */}
      <div className="absolute top-0 right-0 text-xs space-y-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#E74C3C] opacity-50" />
          <span className="text-[#6B7C93]">RED (61-100)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#F1C40F] opacity-50" />
          <span className="text-[#6B7C93]">YELLOW (31-60)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-[#2ECC71] opacity-50" />
          <span className="text-[#6B7C93]">GREEN (0-30)</span>
        </div>
      </div>
    </div>
  );
}

// Triggered Rule Card
function TriggeredRuleCard({ rule, onExpand }: { rule: TriggeredRule; onExpand?: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[#E0E6ED] rounded-lg p-4 hover:bg-[#F7F9FB] transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rule.weight > 15 ? 'bg-[#FDEDEC]' : rule.weight > 5 ? 'bg-[#FFF9E6]' : 'bg-[#F2F4F7]'}`}>
            <AlertTriangle className={`h-5 w-5 ${rule.weight > 15 ? 'text-[#E74C3C]' : rule.weight > 5 ? 'text-[#F1C40F]' : 'text-[#6B7C93]'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#1F2D3D]">{rule.name}</span>
              <Badge variant="outline" className="text-xs">
                {rule.category}
              </Badge>
            </div>
            <p className="text-sm text-[#6B7C93] mt-1">{rule.description || 'No description'}</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${rule.weight > 0 ? 'text-[#E74C3C]' : 'text-[#2ECC71]'}`}>
            {rule.weight > 0 ? '+' : ''}{rule.weight}
          </div>
          <div className="text-xs text-[#6B7C93]">weight</div>
        </div>
      </div>
      
      {expanded && rule.context && (
        <div className="mt-4 pt-4 border-t border-[#E0E6ED]">
          <div className="text-xs font-medium text-[#6B7C93] mb-2">Context:</div>
          <pre className="text-xs bg-[#F7F9FB] p-2 rounded overflow-auto">
            {JSON.stringify(rule.context, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E0E6ED]">
        <span className="text-xs text-[#6B7C93]">
          <Clock className="h-3 w-3 inline mr-1" />
          {new Date(rule.triggeredAt).toLocaleString('de-DE')}
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-[#2D8CFF]"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Weniger' : 'Mehr'}
          {expanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}

// Event Timeline
function EventTimeline({ events }: { events: RiskEvent[] }) {
  const eventIcons = {
    rule_triggered: AlertTriangle,
    score_change: Activity,
    status_change: Shield,
    manual_override: Edit,
  };
  const eventColors = {
    rule_triggered: 'text-[#E74C3C]',
    score_change: 'text-[#2D8CFF]',
    status_change: 'text-[#8B5CF6]',
    manual_override: 'text-[#F59E0B]',
  };

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const Icon = eventIcons[event.type];
        const color = eventColors[event.type];

        return (
          <div key={event.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full bg-white border-2 border-[#E0E6ED] flex items-center justify-center ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              {index < events.length - 1 && (
                <div className="w-0.5 h-full bg-[#E0E6ED] mt-2" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-[#1F2D3D]">{event.description}</p>
                  {event.user && (
                    <p className="text-sm text-[#6B7C93]">by {event.user}</p>
                  )}
                </div>
                <span className="text-xs text-[#6B7C93]">
                  {new Date(event.timestamp).toLocaleString('de-DE')}
                </span>
              </div>
              {event.details && (
                <div className="mt-2 text-xs bg-[#F7F9FB] p-2 rounded">
                  {JSON.stringify(event.details)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// MAIN DETAIL COMPONENT
// ============================================

interface RiskProfileDetailProps {
  entityId?: string;
  onBack: () => void;
}

export function RiskProfileDetail({ entityId, onBack }: RiskProfileDetailProps) {
  const [profile, setProfile] = useState<RiskProfile>(mockProfile);
  const [loading, setLoading] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideScore, setOverrideScore] = useState('');

  const handleBlock = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setShowBlockDialog(false);
    setLoading(false);
  };

  const handleOverride = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setShowOverrideDialog(false);
    setLoading(false);
  };

  const handleRecalculate = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="text-[#6B7C93]">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#1F2D3D] flex items-center gap-3">
            Risk Profile: {profile.name}
          </h1>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Score & Actions */}
        <div className="space-y-6">
          {/* Score Card */}
          <Card className="border-[#E0E6ED]">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <EntityTypeBadge type={profile.type} />
                <div className="my-4">
                  <LargeScoreCircle score={profile.score} level={profile.level} />
                </div>
                <LargeRiskBadge level={profile.level} />
                <div className="mt-4 text-sm text-[#6B7C93]">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Last updated: {new Date(profile.lastUpdated).toLocaleString('de-DE')}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="border-[#E0E6ED]">
            <CardHeader>
              <CardTitle className="text-lg text-[#1F2D3D]">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.level === 'RED' && (
                <>
                  <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full bg-[#E74C3C] hover:bg-[#C0392B] text-white">
                        <Ban className="h-4 w-4 mr-2" />
                        Security Flag setzen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>User sperren?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Diese Aktion wird den User {profile.name} sperren und alle laufenden Aktionen blockieren.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBlock} className="bg-[#E74C3C]">
                          Sperren
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  {profile.supportTicket && (
                    <Button variant="outline" className="w-full border-[#E0E6ED]">
                      <FileText className="h-4 w-4 mr-2" />
                      Support Ticket #{profile.supportTicket.id}
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </>
              )}

              <Button variant="outline" className="w-full border-[#E0E6ED] text-[#2D8CFF]">
                <Unlock className="h-4 w-4 mr-2" />
                Entsperren
              </Button>

              <Button 
                variant="secondary" 
                className="w-full"
                onClick={handleRecalculate}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Score neu berechnen
              </Button>

              <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full border-[#E0E6ED]">
                    <Edit className="h-4 w-4 mr-2" />
                    Manueller Override
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Manuellen Score setzen</DialogTitle>
                    <DialogDescription>
                      Überschreibe den automatisch berechneten Risk-Score manuell.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium">Neuer Score</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={overrideScore}
                        onChange={(e) => setOverrideScore(e.target.value)}
                        placeholder={String(profile.score)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Grund</label>
                      <Textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Begründung für den manuellen Override..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
                      Abbrechen
                    </Button>
                    <Button onClick={handleOverride} className="bg-[#2D8CFF]">
                      <Save className="h-4 w-4 mr-2" />
                      Speichern
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Entity Metadata */}
          <Card className="border-[#E0E6ED]">
            <CardHeader>
              <CardTitle className="text-lg text-[#1F2D3D]">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7C93]">Entity ID</span>
                  <span className="font-mono text-[#1F2D3D] flex items-center gap-1">
                    {profile.id}
                    <Copy className="h-3 w-3 cursor-pointer text-[#6B7C93] hover:text-[#2D8CFF]" />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7C93]">Email</span>
                  <span className="text-[#1F2D3D]">{profile.metadata.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7C93]">Phone</span>
                  <span className="text-[#1F2D3D]">{profile.metadata.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7C93]">Company</span>
                  <span className="text-[#1F2D3D]">{profile.metadata.company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7C93]">Wallet Balance</span>
                  <span className="font-medium text-[#1F2D3D]">€{profile.metadata.walletBalance?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7C93]">Transactions</span>
                  <span className="text-[#1F2D3D]">{profile.metadata.transactionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7C93]">Member Since</span>
                  <span className="text-[#1F2D3D]">{new Date(profile.metadata.memberSince || '').toLocaleDateString('de-DE')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7C93]">Verification</span>
                  <Badge variant={profile.metadata.verificationStatus === 'full' ? 'default' : 'secondary'}>
                    {profile.metadata.verificationStatus}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Rules, History, Events */}
        <div className="lg:col-span-2 space-y-6">
          {/* Triggered Rules */}
          <Card className="border-[#E0E6ED]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-[#1F2D3D] flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-[#E74C3C]" />
                    Triggered Rules
                  </CardTitle>
                  <CardDescription>
                    {profile.triggeredRules.length} Regeln haben zu diesem Score beigetragen
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#E74C3C]">
                    +{profile.triggeredRules.reduce((sum, r) => sum + r.weight, 0)}
                  </div>
                  <div className="text-xs text-[#6B7C93]">Total Weight</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.triggeredRules.map((rule) => (
                <TriggeredRuleCard key={rule.id} rule={rule} />
              ))}
            </CardContent>
          </Card>

          {/* Score History Chart */}
          <Card className="border-[#E0E6ED]">
            <CardHeader>
              <CardTitle className="text-lg text-[#1F2D3D] flex items-center gap-2">
                <History className="h-5 w-5 text-[#2D8CFF]" />
                Score History
              </CardTitle>
              <CardDescription>Entwicklung des Risk-Scores über Zeit</CardDescription>
            </CardHeader>
            <CardContent>
              <ScoreHistoryChart data={profile.scoreHistory} />
            </CardContent>
          </Card>

          {/* Event Timeline */}
          <Card className="border-[#E0E6ED]">
            <CardHeader>
              <CardTitle className="text-lg text-[#1F2D3D] flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#2D8CFF]" />
                Event Timeline
              </CardTitle>
              <CardDescription>Chronologischer Ablauf der Risiko-Ereignisse</CardDescription>
            </CardHeader>
            <CardContent>
              <EventTimeline events={profile.events} />
            </CardContent>
          </Card>

          {/* Support Ticket Info (if exists) */}
          {profile.supportTicket && (
            <Card className="border-[#E74C3C] bg-[#FDEDEC]">
              <CardHeader>
                <CardTitle className="text-lg text-[#E74C3C] flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Support Ticket
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#6B7C93]">Ticket ID</span>
                    <p className="font-mono font-medium">{profile.supportTicket.id}</p>
                  </div>
                  <div>
                    <span className="text-[#6B7C93]">Status</span>
                    <p>
                      <Badge className={profile.supportTicket.status === 'open' ? 'bg-[#E74C3C]' : ''}>
                        {profile.supportTicket.status}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-[#6B7C93]">Priority</span>
                    <p>
                      <Badge variant="destructive">{profile.supportTicket.priority}</Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-[#6B7C93]">Assigned To</span>
                    <p className="font-medium">{profile.supportTicket.assignedTo}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="bg-[#E74C3C] hover:bg-[#C0392B]">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Ticket öffnen
                  </Button>
                  <Button size="sm" variant="outline" className="border-[#E74C3C] text-[#E74C3C]">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Im Freshdesk öffnen
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default RiskProfileDetail;
