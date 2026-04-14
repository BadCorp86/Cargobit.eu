'use client';

// ============================================
// CARGOBIT RISK DASHBOARD - SCREEN 3: RULES MANAGEMENT
// Admin/Security View for Risk Rules
// ============================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Play,
  Copy,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Save,
  X,
  Code,
  Zap,
  Clock,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  Info,
  History,
  TestTube,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type RuleCategory = 'user' | 'company' | 'transaction';
type RuleStatus = 'active' | 'inactive' | 'testing';

interface RiskRule {
  id: string;
  name: string;
  category: RuleCategory;
  weight: number;
  status: RuleStatus;
  description: string;
  conditions: RuleCondition[];
  createdAt: string;
  updatedAt: string;
  triggerCount: number;
  lastTriggered?: string;
  version: number;
}

interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists';
  value: string | number | boolean;
}

interface TestResult {
  success: boolean;
  matchedRules: string[];
  totalScore: number;
  riskLevel: string;
  duration: number;
  details: Record<string, unknown>;
}

// ============================================
// MOCK DATA
// ============================================

const mockRules: RiskRule[] = [
  {
    id: 'rule_001',
    name: 'new_iban',
    category: 'user',
    weight: 15,
    status: 'active',
    description: 'IBAN wurde vor weniger als 24h hinzugefügt',
    conditions: [
      { field: 'iban_age_hours', operator: 'less_than', value: 24 },
    ],
    createdAt: '2023-01-15T10:00:00',
    updatedAt: '2024-01-10T14:30:00',
    triggerCount: 1284,
    lastTriggered: '2024-01-14T10:23:00',
    version: 3,
  },
  {
    id: 'rule_002',
    name: 'high_amount',
    category: 'transaction',
    weight: 25,
    status: 'active',
    description: 'Transaktion über 10.000€',
    conditions: [
      { field: 'transaction_amount', operator: 'greater_than', value: 10000 },
    ],
    createdAt: '2023-01-15T10:00:00',
    updatedAt: '2024-01-12T09:15:00',
    triggerCount: 847,
    lastTriggered: '2024-01-14T10:22:00',
    version: 2,
  },
  {
    id: 'rule_003',
    name: 'fraud_flags',
    category: 'user',
    weight: 20,
    status: 'active',
    description: 'Vorhandene Fraud-Flags im System',
    conditions: [
      { field: 'fraud_flags_count', operator: 'greater_than', value: 0 },
    ],
    createdAt: '2023-01-15T10:00:00',
    updatedAt: '2023-06-20T11:00:00',
    triggerCount: 234,
    lastTriggered: '2024-01-14T10:20:00',
    version: 1,
  },
  {
    id: 'rule_004',
    name: 'company_vat_mismatch',
    category: 'company',
    weight: 20,
    status: 'active',
    description: 'USt-IdNr. stimmt nicht mit Registrierungsland überein',
    conditions: [
      { field: 'vat_country', operator: 'not_equals', value: 'registration_country' },
    ],
    createdAt: '2023-02-01T10:00:00',
    updatedAt: '2023-08-15T14:00:00',
    triggerCount: 156,
    lastTriggered: '2024-01-14T09:45:00',
    version: 2,
  },
  {
    id: 'rule_005',
    name: 'location_mismatch',
    category: 'user',
    weight: 15,
    status: 'active',
    description: 'GPS-Position stimmt nicht mit Profiladresse überein',
    conditions: [
      { field: 'gps_distance_km', operator: 'greater_than', value: 50 },
    ],
    createdAt: '2023-03-10T10:00:00',
    updatedAt: '2023-12-01T16:00:00',
    triggerCount: 412,
    lastTriggered: '2024-01-14T09:45:00',
    version: 4,
  },
  {
    id: 'rule_006',
    name: 'multiple_devices',
    category: 'user',
    weight: 6,
    status: 'testing',
    description: 'Login von 3+ verschiedenen Geräten innerhalb 24h',
    conditions: [
      { field: 'unique_devices_24h', operator: 'greater_than', value: 3 },
    ],
    createdAt: '2024-01-05T10:00:00',
    updatedAt: '2024-01-14T08:00:00',
    triggerCount: 45,
    lastTriggered: '2024-01-14T08:30:00',
    version: 1,
  },
  {
    id: 'rule_007',
    name: 'payout_velocity',
    category: 'transaction',
    weight: 18,
    status: 'inactive',
    description: 'Mehr als 3 Payout-Anfragen innerhalb 24h',
    conditions: [
      { field: 'payout_requests_24h', operator: 'greater_than', value: 3 },
    ],
    createdAt: '2023-04-20T10:00:00',
    updatedAt: '2024-01-05T11:00:00',
    triggerCount: 0,
    version: 1,
  },
];

// ============================================
// UI COMPONENTS
// ============================================

// Rule Status Badge
function RuleStatusBadge({ status }: { status: RuleStatus }) {
  const styles = {
    active: { bg: '#E8F8F0', color: '#2ECC71', icon: CheckCircle2 },
    inactive: { bg: '#F2F4F7', color: '#6B7C93', icon: AlertCircle },
    testing: { bg: '#FFF9E6', color: '#F1C40F', icon: TestTube },
  };
  const style = styles[status];
  const Icon = style.icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      <Icon className="h-3 w-3" />
      {status.toUpperCase()}
    </span>
  );
}

// Category Badge
function CategoryBadge({ category }: { category: RuleCategory }) {
  const styles = {
    user: { bg: '#E8F4FD', color: '#2D8CFF' },
    company: { bg: '#F3E8FD', color: '#8B5CF6' },
    transaction: { bg: '#FEF3E8', color: '#F59E0B' },
  };
  const style = styles[category];

  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {category}
    </span>
  );
}

// Weight Indicator
function WeightIndicator({ weight }: { weight: number }) {
  const color = weight > 20 ? '#E74C3C' : weight > 10 ? '#F1C40F' : '#2ECC71';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-[#E0E6ED] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(weight * 2, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-medium" style={{ color }}>
        +{weight}
      </span>
    </div>
  );
}

// Rule Editor Component
function RuleEditor({ 
  rule, 
  onSave, 
  onCancel 
}: { 
  rule: RiskRule | null;
  onSave: (rule: Partial<RiskRule>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Partial<RiskRule>>(
    rule || {
      name: '',
      category: 'user',
      weight: 10,
      status: 'testing',
      description: '',
      conditions: [],
    }
  );
  const [jsonEditor, setJsonEditor] = useState(
    JSON.stringify(rule?.conditions || [], null, 2)
  );

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-[#1F2D3D]">Rule Name</label>
          <Input
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="z.B. new_iban"
            className="mt-1 border-[#E0E6ED]"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#1F2D3D]">Category</label>
          <Select
            value={formData.category || 'user'}
            onValueChange={(value: RuleCategory) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger className="mt-1 border-[#E0E6ED]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="company">Company</SelectItem>
              <SelectItem value="transaction">Transaction</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-[#1F2D3D]">Weight (Score Impact)</label>
          <Input
            type="number"
            min="1"
            max="50"
            value={formData.weight || 10}
            onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
            className="mt-1 border-[#E0E6ED]"
          />
          <p className="text-xs text-[#6B7C93] mt-1">1-50 Punkte</p>
        </div>
        <div>
          <label className="text-sm font-medium text-[#1F2D3D]">Status</label>
          <Select
            value={formData.status || 'testing'}
            onValueChange={(value: RuleStatus) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger className="mt-1 border-[#E0E6ED]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-[#1F2D3D]">Description</label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Beschreibung der Regel..."
          className="mt-1 border-[#E0E6ED]"
          rows={2}
        />
      </div>

      {/* JSON Editor for Conditions */}
      <div>
        <label className="text-sm font-medium text-[#1F2D3D] flex items-center gap-2">
          <Code className="h-4 w-4" />
          Conditions (JSON)
        </label>
        <Textarea
          value={jsonEditor}
          onChange={(e) => setJsonEditor(e.target.value)}
          className="mt-1 font-mono text-sm border-[#E0E6ED] bg-[#F7F9FB]"
          rows={8}
          placeholder={`[
  { "field": "transaction_amount", "operator": "greater_than", "value": 10000 }
]`}
        />
        <p className="text-xs text-[#6B7C93] mt-1">
          Operators: equals, not_equals, greater_than, less_than, contains, exists
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E0E6ED]">
        <Button variant="outline" onClick={onCancel} className="border-[#E0E6ED]">
          <X className="h-4 w-4 mr-2" />
          Abbrechen
        </Button>
        <Button onClick={() => onSave(formData)} className="bg-[#2D8CFF] hover:bg-[#1B6ED6]">
          <Save className="h-4 w-4 mr-2" />
          Regel speichern
        </Button>
      </div>
    </div>
  );
}

// Test Rule Dialog
function TestRuleDialog({ 
  rule, 
  onClose 
}: { 
  rule: RiskRule;
  onClose: () => void;
}) {
  const [testContext, setTestContext] = useState('{\n  "user_id": "u_123",\n  "transaction_amount": 15000,\n  "iban_age_hours": 12\n}');
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setResult({
      success: true,
      matchedRules: [rule.name],
      totalScore: rule.weight,
      riskLevel: rule.weight > 20 ? 'RED' : rule.weight > 10 ? 'YELLOW' : 'GREEN',
      duration: 45,
      details: {
        conditions_checked: rule.conditions.length,
        conditions_matched: 1,
        evaluated_at: new Date().toISOString(),
      },
    });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-[#1F2D3D] flex items-center gap-2">
          <TestTube className="h-4 w-4 text-[#2D8CFF]" />
          Test Context (JSON)
        </label>
        <Textarea
          value={testContext}
          onChange={(e) => setTestContext(e.target.value)}
          className="mt-1 font-mono text-sm border-[#E0E6ED] bg-[#F7F9FB]"
          rows={6}
        />
      </div>

      <Button onClick={runTest} disabled={loading} className="w-full bg-[#2D8CFF]">
        {loading ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Play className="h-4 w-4 mr-2" />
        )}
        Test ausführen
      </Button>

      {result && (
        <Card className={`border-2 ${result.matchedRules.length > 0 ? 'border-[#E74C3C]' : 'border-[#2ECC71]'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {result.matchedRules.length > 0 ? (
                <AlertTriangle className="h-4 w-4 text-[#E74C3C]" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-[#2ECC71]" />
              )}
              Test Ergebnis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6B7C93]">Matched Rules</span>
              <span className="font-medium">{result.matchedRules.join(', ') || 'Keine'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7C93]">Total Score</span>
              <span className="font-bold text-lg" style={{ color: result.riskLevel === 'RED' ? '#E74C3C' : result.riskLevel === 'YELLOW' ? '#F1C40F' : '#2ECC71' }}>
                +{result.totalScore}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7C93]">Risk Level</span>
              <Badge className={result.riskLevel === 'RED' ? 'bg-[#E74C3C]' : result.riskLevel === 'YELLOW' ? 'bg-[#F1C40F]' : 'bg-[#2ECC71]'}>
                {result.riskLevel}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7C93]">Duration</span>
              <span className="font-mono">{result.duration}ms</span>
            </div>
            <div className="pt-2 border-t border-[#E0E6ED]">
              <span className="text-[#6B7C93]">Details:</span>
              <pre className="mt-1 text-xs bg-[#F7F9FB] p-2 rounded overflow-auto">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// MAIN RULES MANAGEMENT COMPONENT
// ============================================

interface RulesManagementProps {
  onBack: () => void;
}

export function RulesManagement({ onBack }: RulesManagementProps) {
  const [rules, setRules] = useState<RiskRule[]>(mockRules);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingRule, setEditingRule] = useState<RiskRule | null>(null);
  const [testingRule, setTestingRule] = useState<RiskRule | null>(null);
  const [showNewRuleDialog, setShowNewRuleDialog] = useState(false);

  // Filter rules
  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          rule.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || rule.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || rule.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Stats
  const stats = {
    total: rules.length,
    active: rules.filter(r => r.status === 'active').length,
    testing: rules.filter(r => r.status === 'testing').length,
    inactive: rules.filter(r => r.status === 'inactive').length,
    totalTriggers: rules.reduce((sum, r) => sum + r.triggerCount, 0),
  };

  const handleToggleStatus = (rule: RiskRule) => {
    setRules(rules.map(r => {
      if (r.id === rule.id) {
        const newStatus: RuleStatus = r.status === 'active' ? 'inactive' : 'active';
        return { ...r, status: newStatus, updatedAt: new Date().toISOString() };
      }
      return r;
    }));
  };

  const handleSaveRule = (ruleData: Partial<RiskRule>) => {
    if (editingRule) {
      setRules(rules.map(r => r.id === editingRule.id ? { ...r, ...ruleData } : r));
    } else {
      const newRule: RiskRule = {
        id: `rule_${Date.now()}`,
        name: ruleData.name || 'new_rule',
        category: ruleData.category || 'user',
        weight: ruleData.weight || 10,
        status: ruleData.status || 'testing',
        description: ruleData.description || '',
        conditions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        triggerCount: 0,
        version: 1,
      };
      setRules([...rules, newRule]);
    }
    setEditingRule(null);
    setShowNewRuleDialog(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="text-[#6B7C93]">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#1F2D3D] flex items-center gap-3">
              <Shield className="h-7 w-7 text-[#2D8CFF]" />
              Rules Management
            </h1>
            <p className="text-[#6B7C93] mt-1">
              Verwalte Risk-Engine Regeln (Admin/Security only)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-[#E0E6ED]">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" className="border-[#E0E6ED]">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button 
            className="bg-[#2D8CFF] hover:bg-[#1B6ED6]"
            onClick={() => setShowNewRuleDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Neue Regel
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-[#E0E6ED]">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-[#1F2D3D]">{stats.total}</div>
            <div className="text-xs text-[#6B7C93]">Total Rules</div>
          </CardContent>
        </Card>
        <Card className="border-[#2ECC71] bg-[#E8F8F0]">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-[#2ECC71]">{stats.active}</div>
            <div className="text-xs text-[#6B7C93]">Active</div>
          </CardContent>
        </Card>
        <Card className="border-[#F1C40F] bg-[#FFF9E6]">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-[#F1C40F]">{stats.testing}</div>
            <div className="text-xs text-[#6B7C93]">Testing</div>
          </CardContent>
        </Card>
        <Card className="border-[#E0E6ED]">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-[#6B7C93]">{stats.inactive}</div>
            <div className="text-xs text-[#6B7C93]">Inactive</div>
          </CardContent>
        </Card>
        <Card className="border-[#E0E6ED]">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-[#2D8CFF]">{stats.totalTriggers.toLocaleString()}</div>
            <div className="text-xs text-[#6B7C93]">Total Triggers</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7C93]" />
          <Input
            placeholder="Regeln suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 border-[#E0E6ED]"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-36 border-[#E0E6ED]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="company">Company</SelectItem>
            <SelectItem value="transaction">Transaction</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 border-[#E0E6ED]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="testing">Testing</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rules Table */}
      <Card className="border-[#E0E6ED]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F7F9FB] hover:bg-[#F7F9FB]">
                <TableHead className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Rule</TableHead>
                <TableHead className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Category</TableHead>
                <TableHead className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Weight</TableHead>
                <TableHead className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider text-right">Triggers</TableHead>
                <TableHead className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Last Triggered</TableHead>
                <TableHead className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.map((rule) => (
                <TableRow key={rule.id} className="hover:bg-[#F2F6FA]">
                  <TableCell>
                    <div>
                      <div className="font-medium text-[#1F2D3D]">{rule.name}</div>
                      <div className="text-xs text-[#6B7C93] mt-0.5">{rule.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={rule.category} />
                  </TableCell>
                  <TableCell>
                    <WeightIndicator weight={rule.weight} />
                  </TableCell>
                  <TableCell>
                    <RuleStatusBadge status={rule.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium text-[#1F2D3D]">{rule.triggerCount.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-[#6B7C93]">
                      {rule.lastTriggered ? new Date(rule.lastTriggered).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Toggle Status */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(rule)}
                        title={rule.status === 'active' ? 'Deaktivieren' : 'Aktivieren'}
                      >
                        {rule.status === 'active' ? (
                          <ToggleRight className="h-4 w-4 text-[#2ECC71]" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-[#6B7C93]" />
                        )}
                      </Button>
                      
                      {/* Test */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" title="Testen">
                            <Play className="h-4 w-4 text-[#2D8CFF]" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <TestTube className="h-5 w-5 text-[#2D8CFF]" />
                              Test Rule: {rule.name}
                            </DialogTitle>
                            <DialogDescription>
                              Führe diese Regel mit einem Test-Context aus
                            </DialogDescription>
                          </DialogHeader>
                          <TestRuleDialog rule={rule} onClose={() => {}} />
                        </DialogContent>
                      </Dialog>

                      {/* Edit */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setEditingRule(rule)} title="Bearbeiten">
                            <Edit className="h-4 w-4 text-[#6B7C93]" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Regel bearbeiten: {rule.name}</DialogTitle>
                            <DialogDescription>
                              Version {rule.version} • Zuletzt aktualisiert: {new Date(rule.updatedAt).toLocaleString('de-DE')}
                            </DialogDescription>
                          </DialogHeader>
                          <RuleEditor
                            rule={rule}
                            onSave={handleSaveRule}
                            onCancel={() => setEditingRule(null)}
                          />
                        </DialogContent>
                      </Dialog>

                      {/* Delete */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" title="Löschen">
                            <Trash2 className="h-4 w-4 text-[#E74C3C]" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Regel löschen?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Möchtest du die Regel "{rule.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteRule(rule.id)}
                              className="bg-[#E74C3C] hover:bg-[#C0392B]"
                            >
                              Löschen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Rule Dialog */}
      <Dialog open={showNewRuleDialog} onOpenChange={setShowNewRuleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#2D8CFF]" />
              Neue Regel erstellen
            </DialogTitle>
            <DialogDescription>
              Definiere eine neue Risk-Engine Regel
            </DialogDescription>
          </DialogHeader>
          <RuleEditor
            rule={null}
            onSave={handleSaveRule}
            onCancel={() => setShowNewRuleDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Info Box */}
      <div className="flex items-start gap-3 p-4 bg-[#E8F4FD] rounded-xl border border-[#2D8CFF]">
        <Info className="h-5 w-5 text-[#2D8CFF] flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-[#1F2D3D]">Regeln werden in Echtzeit angewendet</p>
          <p className="text-[#6B7C93] mt-1">
            Änderungen an Regeln werden sofort wirksam. Neuen Regeln sollten immer im Status "Testing" gestartet werden,
            bevor sie auf "Active" gesetzt werden.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RulesManagement;
