'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { RiskBadge } from '@/components/cargobit/risk-badge';
import { BannerAd } from '@/components/ads/banner-ad';
import {
  Truck,
  Package,
  Shield,
  TrendingUp,
  Euro,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  MousePointerClick,
  CreditCard,
  Wallet,
  BarChart3,
  FileText,
  Settings,
  Download,
  Filter,
} from 'lucide-react';

// ========================================
// Dashboard KPIs
// ========================================
function DashboardKPIs() {
  const kpis = [
    {
      title: 'Aktive Aufträge',
      value: '23',
      change: '+12%',
      trend: 'up',
      icon: Truck,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Versicherungen',
      value: '18',
      change: '+8%',
      trend: 'up',
      icon: Shield,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Werbeeinnahmen',
      value: '€1.245',
      change: '+23%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Gesamtumsatz',
      value: '€45.680',
      change: '-3%',
      trend: 'down',
      icon: Euro,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={cn('p-2 rounded-lg', kpi.bgColor)}>
                <kpi.icon className={cn('w-5 h-5', kpi.color)} />
              </div>
              <div className={cn(
                'flex items-center gap-1 text-sm',
                kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'
              )}>
                {kpi.trend === 'up' ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {kpi.change}
              </div>
            </div>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <div className="text-sm text-muted-foreground">{kpi.title}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ========================================
// Orders Tab Content
// ========================================
function OrdersTabContent() {
  const orders = [
    { id: 'TR-12345', route: 'Berlin → München', price: 850, status: 'Aktiv', risk: 'green' as const },
    { id: 'TR-12346', route: 'Hamburg → Wien', price: 1200, status: 'In Bearbeitung', risk: 'green' as const },
    { id: 'TR-12347', route: 'Köln → Prag', price: 950, status: 'Ausstehend', risk: 'yellow' as const },
    { id: 'TR-12348', route: 'Frankfurt → Warschau', price: 1400, status: 'Abgeschlossen', risk: 'green' as const },
    { id: 'TR-12349', route: 'Stuttgart → Mailand', price: 2200, status: 'Aktiv', risk: 'green' as const },
  ];

  const statusColors: Record<string, string> = {
    'Aktiv': 'bg-green-500/10 text-green-600',
    'In Bearbeitung': 'bg-blue-500/10 text-blue-600',
    'Ausstehend': 'bg-yellow-500/10 text-yellow-600',
    'Abgeschlossen': 'bg-gray-500/10 text-gray-600',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Aufträge</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Preis</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.route}</TableCell>
                <TableCell>{order.price.toLocaleString('de-DE')} €</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusColors[order.status]}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <RiskBadge risk={order.risk} showLabel={false} size="sm" />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">Details</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ========================================
// Insurance Tab Content
// ========================================
function InsuranceTabContent() {
  const policies = [
    { id: 'P-001', orderId: 'TR-12345', provider: 'Allianz', coverage: '50.000 €', premium: '24,90 €', status: 'Aktiv', commission: '3,74 €' },
    { id: 'P-002', orderId: 'TR-12346', provider: 'HDI', coverage: '25.000 €', premium: '14,90 €', status: 'Aktiv', commission: '2,24 €' },
    { id: 'P-003', orderId: 'TR-12347', provider: 'Allianz', coverage: '100.000 €', premium: '49,90 €', status: 'Ausstehend', commission: '7,49 €' },
    { id: 'P-004', orderId: 'TR-12348', provider: 'AXA', coverage: '50.000 €', premium: '24,90 €', status: 'Abgelaufen', commission: '3,74 €' },
  ];

  const statusColors: Record<string, string> = {
    'Aktiv': 'bg-green-500/10 text-green-600',
    'Ausstehend': 'bg-yellow-500/10 text-yellow-600',
    'Abgelaufen': 'bg-gray-500/10 text-gray-600',
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Shield className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">18</div>
                <div className="text-sm text-muted-foreground">Aktive Policen</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Euro className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">€312,45</div>
                <div className="text-sm text-muted-foreground">Provision gesamt</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">15%</div>
                <div className="text-sm text-muted-foreground">Conversion Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Policen</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Auftrag</TableHead>
                <TableHead>Anbieter</TableHead>
                <TableHead>Deckung</TableHead>
                <TableHead>Prämie</TableHead>
                <TableHead>Provision</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">{policy.id}</TableCell>
                  <TableCell>{policy.orderId}</TableCell>
                  <TableCell>{policy.provider}</TableCell>
                  <TableCell>{policy.coverage}</TableCell>
                  <TableCell>{policy.premium}</TableCell>
                  <TableCell className="text-green-600">{policy.commission}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[policy.status]}>
                      {policy.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ========================================
// Ads Tab Content
// ========================================
function AdsTabContent() {
  const campaigns = [
    { name: 'Allianz Versicherung', slot: 'Homepage Hero', impressions: 45230, clicks: 1245, ctr: '2.75%', spend: '€622,50', status: 'Aktiv' },
    { name: 'DHL Express', slot: 'Marketplace Sidebar', impressions: 28450, clicks: 856, ctr: '3.01%', spend: '€428,00', status: 'Aktiv' },
    { name: 'HDI Transport', slot: 'Order Detail', impressions: 15680, clicks: 423, ctr: '2.70%', spend: '€211,50', status: 'Pausiert' },
    { name: 'Shell Tankkarte', slot: 'Dashboard', impressions: 8920, clicks: 312, ctr: '3.50%', spend: '€156,00', status: 'Aktiv' },
  ];

  const slots = [
    { slot: 'homepage-hero', size: '970×250', fillRate: 95, eCPM: '€12,50' },
    { slot: 'marketplace-sidebar', size: '300×600', fillRate: 88, eCPM: '€8,20' },
    { slot: 'order-detail-sidebar', size: '300×250', fillRate: 92, eCPM: '€10,00' },
    { slot: 'dashboard-sidebar', size: '300×250', fillRate: 78, eCPM: '€7,50' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Impressions</span>
            </div>
            <div className="text-2xl font-bold">98.280</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointerClick className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clicks</span>
            </div>
            <div className="text-2xl font-bold">2.836</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">CTR</span>
            </div>
            <div className="text-2xl font-bold">2.89%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Euro className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Revenue</span>
            </div>
            <div className="text-2xl font-bold">€1.418</div>
          </CardContent>
        </Card>
      </div>

      {/* Slots Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Slot-Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slot</TableHead>
                <TableHead>Größe</TableHead>
                <TableHead>Fill Rate</TableHead>
                <TableHead>eCPM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.map((slot) => (
                <TableRow key={slot.slot}>
                  <TableCell className="font-medium">{slot.slot}</TableCell>
                  <TableCell>{slot.size}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={slot.fillRate} className="w-20" />
                      <span>{slot.fillRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{slot.eCPM}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Campaigns */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Kampagnen</CardTitle>
            <Button size="sm">Neue Kampagne</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kampagne</TableHead>
                <TableHead>Slot</TableHead>
                <TableHead>Impressions</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead>Spend</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.name}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>{campaign.slot}</TableCell>
                  <TableCell>{campaign.impressions.toLocaleString()}</TableCell>
                  <TableCell>{campaign.clicks.toLocaleString()}</TableCell>
                  <TableCell>{campaign.ctr}</TableCell>
                  <TableCell>{campaign.spend}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={campaign.status === 'Aktiv' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ========================================
// Earnings Tab Content
// ========================================
function EarningsTabContent() {
  const transactions = [
    { type: 'Provision Versicherung', amount: '+€3,74', date: '15.04.2024', status: 'Ausgezahlt' },
    { type: 'Ad Revenue', amount: '+€156,00', date: '14.04.2024', status: 'Ausgezahlt' },
    { type: 'Transport-Gebühr', amount: '+€42,50', date: '13.04.2024', status: 'Ausgezahlt' },
    { type: 'Auszahlung', amount: '-€1.200,00', date: '12.04.2024', status: 'Bearbeitung' },
    { type: 'Provision Versicherung', amount: '+€7,49', date: '11.04.2024', status: 'Ausgezahlt' },
  ];

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Wallet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-muted-foreground">Verfügbar</div>
              <div className="text-3xl font-bold text-green-500">€3.456,78</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ausstehend</div>
              <div className="text-3xl font-bold text-yellow-500">€892,45</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Diesen Monat</div>
              <div className="text-3xl font-bold">€2.312,89</div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button className="gap-2">
            <CreditCard className="w-4 h-4" />
            Auszahlen
          </Button>
          <Button variant="outline" className="gap-2">
            <FileText className="w-4 h-4" />
            Abrechnung
          </Button>
        </CardFooter>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transaktionen</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Typ</TableHead>
                <TableHead>Betrag</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{tx.type}</TableCell>
                  <TableCell className={tx.amount.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                    {tx.amount}
                  </TableCell>
                  <TableCell>{tx.date}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {tx.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ========================================
// Dashboard Page
// ========================================
export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 flex flex-col gap-10">
        {/* KPIs */}
        <DashboardKPIs />

        {/* Tabs */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="orders" className="gap-2">
              <Truck className="w-4 h-4" />
              Aufträge
            </TabsTrigger>
            <TabsTrigger value="insurance" className="gap-2">
              <Shield className="w-4 h-4" />
              Versicherungen
            </TabsTrigger>
            <TabsTrigger value="ads" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Werbung
            </TabsTrigger>
            <TabsTrigger value="earnings" className="gap-2">
              <Euro className="w-4 h-4" />
              Einnahmen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <OrdersTabContent />
          </TabsContent>
          <TabsContent value="insurance">
            <InsuranceTabContent />
          </TabsContent>
          <TabsContent value="ads">
            <AdsTabContent />
          </TabsContent>
          <TabsContent value="earnings">
            <EarningsTabContent />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
