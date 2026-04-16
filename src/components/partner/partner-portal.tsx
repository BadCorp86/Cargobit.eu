'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast, Toaster } from 'sonner';
import {
  Shield,
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  Activity,
  Plus,
  Copy,
  Key,
  Trash2,
  Edit,
  Eye,
  BarChart3,
  Target,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  CreditCard,
  Megaphone,
  Package,
  PieChart,
} from 'lucide-react';

// Types
interface PartnerSession {
  partnerId: string;
  partnerName: string;
  partnerType: 'INSURANCE' | 'ADS';
  scopes: string[];
  isTestMode: boolean;
}

interface Partner {
  id: string;
  name: string;
  type: 'INSURANCE' | 'ADS';
  status: string;
  testMode: boolean;
  liveModeEnabled: boolean;
}

interface InsuranceProduct {
  id: string;
  name: string;
  description?: string;
  coverageEur: number;
  basePremiumEur: number;
  riskModifiers?: { yellow: number; red: number };
  isActive: boolean;
  createdAt: string;
}

interface AdCampaign {
  id: string;
  name: string;
  slot: string;
  budgetEur: number;
  spentEur: number;
  status: string;
  totalImpressions: number;
  totalClicks: number;
  targeting?: { riskLevels?: string[]; roles?: string[] };
}

interface ApiKey {
  id: string;
  name: string;
  apiKeyPrefix: string;
  isTestKey: boolean;
  status: string;
  lastUsedAt?: string;
}

interface Billing {
  id: string;
  invoiceNumber: string;
  periodMonth: number;
  periodYear: number;
  totalEur: number;
  status: string;
  dueDate?: string;
}

// Dashboard Component
function PartnerDashboard({ partnerType }: { partnerType: 'INSURANCE' | 'ADS' }) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const apiKey = localStorage.getItem('partner_api_key');
      const response = await fetch('/api/partner/dashboard', {
        headers: { 'x-api-key': apiKey || '' },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Laden...</div>;
  }

  if (partnerType === 'INSURANCE') {
    const metrics = dashboardData.metrics as Record<string, number> || {};
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground">Übersicht Ihrer Versicherungsprodukte</p>
          </div>
          <Badge variant="secondary" className="gap-2">
            <Shield className="w-4 h-4" />
            Versicherungs-Partner
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktive Produkte</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeProducts || 0}</div>
              <p className="text-xs text-muted-foreground">Verfügbare Tarife</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Policen gesamt</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalPolicies || 0}</div>
              <p className="text-xs text-muted-foreground">Abgeschlossene Verträge</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monatsumsatz</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{(metrics.monthlyRevenue || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Prämien diesen Monat</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Provision</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{(metrics.monthlyCommission || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Diesen Monat verdient</p>
            </CardContent>
          </Card>
        </div>

        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Risiko-Verteilung</CardTitle>
            <CardDescription>Verteilung der Policen nach Risikolevel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {((dashboardData.riskDistribution as Array<{level: string; count: number}>) || []).map((item) => (
                <div key={item.level} className="flex items-center gap-2">
                  <Badge variant={item.level === 'green' ? 'default' : item.level === 'yellow' ? 'secondary' : 'destructive'}>
                    {item.level.toUpperCase()}
                  </Badge>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } else {
    // ADS Dashboard
    const metrics = dashboardData.metrics as Record<string, number | string> || {};
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground">Übersicht Ihrer Werbekampagnen</p>
          </div>
          <Badge variant="secondary" className="gap-2">
            <Megaphone className="w-4 h-4" />
            Werbepartner
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktive Kampagnen</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeCampaigns || 0}</div>
              <p className="text-xs text-muted-foreground">von {metrics.totalCampaigns || 0} gesamt</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impressionen</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics.totalImpressions || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Gesamtaufrufe</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Klicks</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics.totalClicks || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">CTR: {metrics.avgCTR || '0.00'}%</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{(metrics.remainingBudget || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">von €{(metrics.totalBudget || 0).toLocaleString()} übrig</p>
            </CardContent>
          </Card>
        </div>

        {/* Budget Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Budget-Übersicht</CardTitle>
            <CardDescription>Ausgenutztes Budget aller Kampagnen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Ausgegeben: €{(metrics.totalSpent || 0).toLocaleString()}</span>
                <span>Budget: €{(metrics.totalBudget || 0).toLocaleString()}</span>
              </div>
              <Progress value={
                (metrics.totalBudget as number) > 0 
                  ? ((metrics.totalSpent as number) / (metrics.totalBudget as number)) * 100 
                  : 0
              } />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

// Insurance Products Component
function InsuranceProducts() {
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coverageEur: '',
    basePremiumEur: '',
    deductibleEur: '0',
    riskModifiersYellow: '1.2',
    riskModifiersRed: '1.5',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const apiKey = localStorage.getItem('partner_api_key');
      const response = await fetch('/api/partner/insurance/products', {
        headers: { 'x-api-key': apiKey || '' },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    try {
      const apiKey = localStorage.getItem('partner_api_key');
      const response = await fetch('/api/partner/insurance/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          coverageEur: parseFloat(formData.coverageEur),
          basePremiumEur: parseFloat(formData.basePremiumEur),
          deductibleEur: parseFloat(formData.deductibleEur),
          riskModifiers: {
            yellow: parseFloat(formData.riskModifiersYellow),
            red: parseFloat(formData.riskModifiersRed),
          },
        }),
      });
      
      if (response.ok) {
        toast.success('Produkt erstellt');
        setShowCreateDialog(false);
        fetchProducts();
        setFormData({
          name: '',
          description: '',
          coverageEur: '',
          basePremiumEur: '',
          deductibleEur: '0',
          riskModifiersYellow: '1.2',
          riskModifiersRed: '1.5',
        });
      } else {
        toast.error('Fehler beim Erstellen');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Versicherungsprodukte</h2>
          <p className="text-muted-foreground">Verwalten Sie Ihre Tarife und Deckungssummen</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Produkt erstellen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Neues Produkt erstellen</DialogTitle>
              <DialogDescription>
                Definieren Sie ein neues Versicherungsprodukt
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Produktname</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Standard Cargo"
                />
              </div>
              <div>
                <Label htmlFor="description">Beschreibung</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kurze Beschreibung"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="coverage">Deckung (€)</Label>
                  <Input
                    id="coverage"
                    type="number"
                    value={formData.coverageEur}
                    onChange={(e) => setFormData({ ...formData, coverageEur: e.target.value })}
                    placeholder="50000"
                  />
                </div>
                <div>
                  <Label htmlFor="premium">Basisprämie (€)</Label>
                  <Input
                    id="premium"
                    type="number"
                    step="0.01"
                    value={formData.basePremiumEur}
                    onChange={(e) => setFormData({ ...formData, basePremiumEur: e.target.value })}
                    placeholder="12.50"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="deductible">Selbstbeteiligung (€)</Label>
                <Input
                  id="deductible"
                  type="number"
                  value={formData.deductibleEur}
                  onChange={(e) => setFormData({ ...formData, deductibleEur: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="yellow">Yellow Multiplikator</Label>
                  <Input
                    id="yellow"
                    type="number"
                    step="0.1"
                    value={formData.riskModifiersYellow}
                    onChange={(e) => setFormData({ ...formData, riskModifiersYellow: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="red">Red Multiplikator</Label>
                  <Input
                    id="red"
                    type="number"
                    step="0.1"
                    value={formData.riskModifiersRed}
                    onChange={(e) => setFormData({ ...formData, riskModifiersRed: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleCreateProduct}>Erstellen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produkt</TableHead>
                <TableHead>Deckung</TableHead>
                <TableHead>Prämie</TableHead>
                <TableHead>Risiko-Zuschläge</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      {product.description && (
                        <div className="text-sm text-muted-foreground">{product.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>€{product.coverageEur.toLocaleString()}</TableCell>
                  <TableCell>€{product.basePremiumEur}</TableCell>
                  <TableCell>
                    {product.riskModifiers && (
                      <div className="text-sm">
                        <Badge variant="outline" className="mr-1">Y: {product.riskModifiers.yellow}x</Badge>
                        <Badge variant="outline">R: {product.riskModifiers.red}x</Badge>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? 'default' : 'secondary'}>
                      {product.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Keine Produkte gefunden. Erstellen Sie Ihr erstes Produkt.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Ad Campaigns Component
function AdCampaigns() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slot: 'MARKETPLACE_SIDEBAR',
    targetUrl: '',
    budgetEur: '',
    cpcEur: '0.50',
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const apiKey = localStorage.getItem('partner_api_key');
      const response = await fetch('/api/partner/ads/campaigns', {
        headers: { 'x-api-key': apiKey || '' },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      const apiKey = localStorage.getItem('partner_api_key');
      const response = await fetch('/api/partner/ads/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
        },
        body: JSON.stringify({
          name: formData.name,
          slot: formData.slot,
          targetUrl: formData.targetUrl,
          budgetEur: parseFloat(formData.budgetEur),
          cpcEur: parseFloat(formData.cpcEur),
          pricingModel: 'CPC',
        }),
      });
      
      if (response.ok) {
        toast.success('Kampagne erstellt');
        setShowCreateDialog(false);
        fetchCampaigns();
        setFormData({
          name: '',
          slot: 'MARKETPLACE_SIDEBAR',
          targetUrl: '',
          budgetEur: '',
          cpcEur: '0.50',
        });
      } else {
        toast.error('Fehler beim Erstellen');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen');
    }
  };

  const getCTR = (campaign: AdCampaign) => {
    if (campaign.totalImpressions === 0) return '0.00';
    return ((campaign.totalClicks / campaign.totalImpressions) * 100).toFixed(2);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Werbekampagnen</h2>
          <p className="text-muted-foreground">Verwalten Sie Ihre Kampagnen und Budgets</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Kampagne erstellen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Neue Kampagne erstellen</DialogTitle>
              <DialogDescription>
                Definieren Sie Ihre Werbekampagne
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Kampagnenname</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Q1 Branding"
                />
              </div>
              <div>
                <Label htmlFor="slot">Platzierung</Label>
                <Select value={formData.slot} onValueChange={(v) => setFormData({ ...formData, slot: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARKETPLACE_SIDEBAR">Marketplace Sidebar</SelectItem>
                    <SelectItem value="MARKETPLACE_BANNER">Marketplace Banner</SelectItem>
                    <SelectItem value="LISTING_HIGHLIGHT">Listing Highlight</SelectItem>
                    <SelectItem value="CHECKOUT_UPSELL">Checkout Upsell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="targetUrl">Ziel-URL</Label>
                <Input
                  id="targetUrl"
                  type="url"
                  value={formData.targetUrl}
                  onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budget">Budget (€)</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budgetEur}
                    onChange={(e) => setFormData({ ...formData, budgetEur: e.target.value })}
                    placeholder="500"
                  />
                </div>
                <div>
                  <Label htmlFor="cpc">CPC (€)</Label>
                  <Input
                    id="cpc"
                    type="number"
                    step="0.01"
                    value={formData.cpcEur}
                    onChange={(e) => setFormData({ ...formData, cpcEur: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleCreateCampaign}>Erstellen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{campaign.name}</CardTitle>
                <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {campaign.status}
                </Badge>
              </div>
              <CardDescription>{campaign.slot.replace('_', ' ')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Impressionen</div>
                  <div className="font-semibold">{campaign.totalImpressions.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Klicks</div>
                  <div className="font-semibold">{campaign.totalClicks.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">CTR</div>
                  <div className="font-semibold">{getCTR(campaign)}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Budget</div>
                  <div className="font-semibold">€{campaign.budgetEur.toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Ausgegeben</span>
                  <span>€{campaign.spentEur} / €{campaign.budgetEur}</span>
                </div>
                <Progress value={(campaign.spentEur / campaign.budgetEur) * 100} />
              </div>
            </CardContent>
          </Card>
        ))}
        {campaigns.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Megaphone className="w-12 h-12 mb-4 opacity-50" />
              <p>Keine Kampagnen gefunden. Erstellen Sie Ihre erste Kampagne.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// API Keys Component
function ApiAccess() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const apiKey = localStorage.getItem('partner_api_key');
      const response = await fetch('/api/partner/dashboard', {
        headers: { 'x-api-key': apiKey || '' },
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.apiKeys || []);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('API-Key kopiert!');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API-Zugang</h2>
          <p className="text-muted-foreground">Verwalten Sie Ihre API-Keys und Webhooks</p>
        </div>
      </div>

      {newKey && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              API-Key erstellt
            </CardTitle>
            <CardDescription>
              Kopieren Sie diesen Key jetzt. Er wird nicht erneut angezeigt!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-3 rounded font-mono text-sm break-all">
                {newKey}
              </code>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(newKey)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>API-Keys</CardTitle>
          <CardDescription>Ihre aktiven API-Keys für die Integration</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key Prefix</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Letzte Nutzung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-sm">{key.apiKeyPrefix}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={key.isTestKey ? 'secondary' : 'default'}>
                      {key.isTestKey ? 'Test' : 'Live'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={key.status === 'ACTIVE' ? 'default' : 'destructive'}>
                      {key.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString('de-DE') : 'Nie'}
                  </TableCell>
                </TableRow>
              ))}
              {apiKeys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Keine API-Keys vorhanden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate Limits</CardTitle>
          <CardDescription>Übersicht Ihrer API-Nutzung</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">300</div>
              <div className="text-sm text-muted-foreground">Requests / Minute</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">100</div>
              <div className="text-sm text-muted-foreground">Burst Limit</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Billing Component
function Billing() {
  const [billings, setBillings] = useState<Billing[]>([]);
  const [summary, setSummary] = useState({ totalOpenAmount: 0, openInvoices: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillings();
  }, []);

  const fetchBillings = async () => {
    try {
      const apiKey = localStorage.getItem('partner_api_key');
      const response = await fetch('/api/partner/billing', {
        headers: { 'x-api-key': apiKey || '' },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBillings(data.billings);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching billings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return months[month - 1];
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Abrechnung</h2>
          <p className="text-muted-foreground">Rechnungen und Zahlungsstatus</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Offene Rechnungen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.openInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Offener Betrag</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">€{summary.totalOpenAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bezahlt (Gesamt)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{(billings.filter(b => b.status === 'PAID').reduce((s, b) => s + b.totalEur, 0)).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rechnungen</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rechnungsnummer</TableHead>
                <TableHead>Zeitraum</TableHead>
                <TableHead>Betrag</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fällig</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billings.map((billing) => (
                <TableRow key={billing.id}>
                  <TableCell className="font-medium">{billing.invoiceNumber}</TableCell>
                  <TableCell>{getMonthName(billing.periodMonth)} {billing.periodYear}</TableCell>
                  <TableCell>€{billing.totalEur.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={billing.status === 'PAID' ? 'default' : billing.status === 'OPEN' ? 'secondary' : 'destructive'}>
                      {billing.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {billing.dueDate ? new Date(billing.dueDate).toLocaleDateString('de-DE') : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {billings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Keine Rechnungen vorhanden
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Partner Portal Component
export function PartnerPortal() {
  const [session, setSession] = useState<PartnerSession | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/partner/auth/login', {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        setPartner(data.partner);
        setIsAuthenticated(true);
        localStorage.setItem('partner_api_key', apiKey);
        toast.success('Erfolgreich angemeldet');
      } else {
        toast.error('Ungültiger API-Key');
      }
    } catch (error) {
      toast.error('Anmeldung fehlgeschlagen');
    }
  };

  const handleLogout = () => {
    setSession(null);
    setPartner(null);
    setIsAuthenticated(false);
    setApiKey('');
    localStorage.removeItem('partner_api_key');
    toast.success('Abgemeldet');
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Partner-Portal</CardTitle>
            <CardDescription>Melden Sie sich mit Ihrem API-Key an</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="apiKey">API-Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="cb_partner_..."
                />
              </div>
              <Button className="w-full" onClick={handleLogin}>
                Anmelden
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Portal
  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">{partner?.name}</h1>
              <p className="text-sm text-muted-foreground">
                {partner?.type === 'INSURANCE' ? 'Versicherungs-Partner' : 'Werbepartner'}
                {session?.isTestMode && <Badge variant="outline" className="ml-2">Test-Modus</Badge>}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Abmelden
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <PieChart className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            {partner?.type === 'INSURANCE' && (
              <>
                <TabsTrigger value="products" className="gap-2">
                  <Package className="w-4 h-4" />
                  Produkte
                </TabsTrigger>
                <TabsTrigger value="policies" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Policen
                </TabsTrigger>
              </>
            )}
            {partner?.type === 'ADS' && (
              <TabsTrigger value="campaigns" className="gap-2">
                <Megaphone className="w-4 h-4" />
                Kampagnen
              </TabsTrigger>
            )}
            <TabsTrigger value="api" className="gap-2">
              <Key className="w-4 h-4" />
              API-Zugang
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Abrechnung
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <PartnerDashboard partnerType={partner?.type || 'INSURANCE'} />
          </TabsContent>
          
          {partner?.type === 'INSURANCE' && (
            <>
              <TabsContent value="products">
                <InsuranceProducts />
              </TabsContent>
              <TabsContent value="policies">
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Policen</h2>
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      Policen-Übersicht wird hier angezeigt
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </>
          )}
          
          {partner?.type === 'ADS' && (
            <TabsContent value="campaigns">
              <AdCampaigns />
            </TabsContent>
          )}
          
          <TabsContent value="api">
            <ApiAccess />
          </TabsContent>
          
          <TabsContent value="billing">
            <Billing />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default PartnerPortal;
