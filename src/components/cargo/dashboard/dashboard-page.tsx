'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { kpiData, revenueData, activities, shipments, tickets, fleetVehicles, fleetDrivers, formatCurrency, formatNumber, getTimeAgo } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  Package,
  TrendingUp,
  Truck,
  Star,
  Plus,
  MapPin,
  Map,
  FileText,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  User,
  Globe,
  Users,
  AlertCircle,
  Megaphone,
  Navigation,
  Clock,
  MessageSquare,
  Wallet,
  BarChart3,
  Settings,
  Shield,
  Headphones,
  Eye,
  Wrench,
  Fuel,
  Thermometer,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function AnimatedCounter({ value, prefix = '', suffix = '', isDecimal = false }: { value: number; prefix?: string; suffix?: string; isDecimal?: boolean }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  const formatted = isDecimal
    ? display.toFixed(1)
    : formatNumber(Math.round(display));

  return (
    <span className="animate-count-up">
      {prefix}{formatted}{suffix}
    </span>
  );
}

function KPICard({ item, index, language, colorOverride }: { item: { label: string; value: number; change: number; changeLabel: string; icon: string }; index: number; language: string; colorOverride?: string }) {
  const iconMap: Record<string, React.ElementType> = { Package, TrendingUp, Truck, Star, Users, AlertCircle, Clock, MessageSquare, Wallet, BarChart3, Shield, Headphones };
  const Icon = iconMap[item.icon] || Package;
  const isPositive = item.change >= 0;
  const isRating = item.label === 'avgRating';

  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-amber-500',
    purple: 'from-purple-500 to-violet-600',
    red: 'from-red-500 to-rose-600',
    cyan: 'from-cyan-500 to-teal-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-orange-300/50 dark:hover:border-orange-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5 group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 bg-gradient-to-br', colorOverride ? colorClasses[colorOverride] : 'from-orange-500/10 to-amber-500/10 border border-orange-200/30 dark:border-orange-800/30')}>
              <Icon className={cn('w-5 h-5', colorOverride ? 'text-white' : 'text-orange-500')} />
            </div>
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              isPositive
                ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30'
                : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30'
            )}>
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {isPositive ? '+' : ''}{item.change}%
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight">
            {isRating ? (
              <AnimatedCounter value={item.value} suffix=" / 5.0" isDecimal />
            ) : item.label === 'revenue' || item.label === 'walletBalance' ? (
              <AnimatedCounter value={item.value} prefix="€" />
            ) : (
              <AnimatedCounter value={item.value} />
            )}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t(item.label as keyof typeof import('@/lib/i18n').translations.de, language as 'de')}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==========================================
// ADMIN DASHBOARD
// ==========================================
function AdminDashboard({ language }: { language: string }) {
  const { setActiveTab } = useCargoBitStore();
  
  const adminKPIs = [
    { label: 'activeShipments', value: 1247, change: 12.5, changeLabel: 'vs. letzten Monat', icon: 'Package' },
    { label: 'revenue', value: 298000, change: 11.1, changeLabel: 'vs. letzten Monat', icon: 'TrendingUp' },
    { label: 'deliveriesToday', value: 342, change: 8.3, changeLabel: 'vs. gestern', icon: 'Truck' },
    { label: 'avgRating', value: 4.8, change: 0.2, changeLabel: 'vs. letzten Monat', icon: 'Star' },
  ];

  const alerts = [
    { id: 1, type: 'urgent', title: '3 verspätete Lieferungen', desc: 'Wetterbedingte Verzögerungen' },
    { id: 2, type: 'warning', title: 'Fahrzeug-Wartung fällig', desc: 'VH-007: DAF XF 480' },
    { id: 3, type: 'info', title: 'Neue Werbeanfrage', desc: 'MediaMarkt Deutschland' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 p-6 sm:p-8 text-white"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">{language === 'de' ? 'Guten Tag, Administrator!' : 'Good day, Administrator!'} 👋</h1>
          <p className="text-white/80 text-sm sm:text-base max-w-lg">
            {language === 'de' ? 'Systemübersicht und Plattform-Status.' : 'System overview and platform status.'}
          </p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminKPIs.map((kpi, index) => (
          <KPICard key={kpi.label} item={kpi} index={index} language={language} />
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Map Placeholder */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 pulse-live" />
              {language === 'de' ? 'Live-Karte' : 'Live Map'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-center">
              <div className="text-center">
                <Map className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">{language === 'de' ? 'Interaktive Karte wird geladen...' : 'Loading interactive map...'}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{fleetVehicles.filter(v => v.status === 'active').length} {language === 'de' ? 'Fahrzeuge unterwegs' : 'vehicles on route'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Problems */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              {language === 'de' ? 'Probleme & Alerts' : 'Issues & Alerts'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className={cn(
                'p-3 rounded-xl border',
                alert.type === 'urgent' ? 'bg-red-500/10 border-red-500/30' :
                alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                'bg-blue-500/10 border-blue-500/30'
              )}>
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions for Admin */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{language === 'de' ? 'Schnellaktionen' : 'Quick Actions'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Users, label: language === 'de' ? 'Benutzerverwaltung' : 'User Management', tab: 'settings', color: 'blue' },
              { icon: Megaphone, label: language === 'de' ? 'Werbung' : 'Advertising', tab: 'advertising', color: 'purple' },
              { icon: Wallet, label: language === 'de' ? 'Finanzen' : 'Finances', tab: 'wallet', color: 'green' },
              { icon: BarChart3, label: language === 'de' ? 'Analytik' : 'Analytics', tab: 'analytics', color: 'orange' },
            ].map((action, idx) => (
              <Button
                key={idx}
                onClick={() => setActiveTab(action.tab as any)}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-orange-50 dark:hover:bg-orange-950/30"
              >
                <action.icon className="w-5 h-5 text-orange-500" />
                <span className="text-xs font-medium text-center">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Chart */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t('revenueChart', language)}</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    color: 'var(--card-foreground)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => [formatCurrency(value), language === 'de' ? 'Umsatz' : 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// SHIPPER (VERLADER) DASHBOARD
// ==========================================
function ShipperDashboard({ language }: { language: string }) {
  const { setActiveTab, setShowCreateShipment } = useCargoBitStore();
  
  const shipperKPIs = [
    { label: 'activeShipments', value: 15, change: 3, changeLabel: 'aktive Sendungen', icon: 'Package' },
    { label: 'deliveriesToday', value: 3, change: 1, changeLabel: 'heute geliefert', icon: 'Truck' },
    { label: 'revenue', value: 12850, change: 5.5, changeLabel: 'dieser Monat', icon: 'TrendingUp' },
    { label: 'avgRating', value: 4.7, change: 0.1, changeLabel: 'Liefer-Qualität', icon: 'Star' },
  ];

  const myShipments = shipments.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 p-6 sm:p-8 text-white"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">{language === 'de' ? 'Willkommen zurück!' : 'Welcome back!'} 👋</h1>
          <p className="text-white/80 text-sm sm:text-base max-w-lg">
            {language === 'de' ? 'Verwalten Sie Ihre Transporte und erstellen Sie neue Aufträge.' : 'Manage your transports and create new orders.'}
          </p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {shipperKPIs.map((kpi, index) => (
          <KPICard key={kpi.label} item={kpi} index={index} language={language} colorOverride="green" />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button
          onClick={() => setShowCreateShipment(true)}
          className="h-20 flex flex-col items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
        >
          <Plus className="w-6 h-6" />
          <span className="font-semibold">{language === 'de' ? 'Neuen Transport erstellen' : 'Create New Transport'}</span>
        </Button>
        <Button
          onClick={() => setActiveTab('tracking')}
          variant="outline"
          className="h-20 flex flex-col items-center gap-2"
        >
          <MapPin className="w-6 h-6 text-blue-500" />
          <span className="font-semibold">{language === 'de' ? 'Live-Tracking' : 'Live Tracking'}</span>
        </Button>
        <Button
          onClick={() => setActiveTab('wallet')}
          variant="outline"
          className="h-20 flex flex-col items-center gap-2"
        >
          <Wallet className="w-6 h-6 text-green-500" />
          <span className="font-semibold">{language === 'de' ? 'Wallet & Rechnungen' : 'Wallet & Invoices'}</span>
        </Button>
      </div>

      {/* My Transports */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{language === 'de' ? 'Meine Transporte' : 'My Transports'}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('shipments')}>
              {language === 'de' ? 'Alle anzeigen' : 'View all'} →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {myShipments.map((shipment) => (
              <div key={shipment.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  shipment.status === 'delivered' ? 'bg-green-500/10' :
                  shipment.status === 'in_transit' ? 'bg-orange-500/10' :
                  'bg-yellow-500/10'
                )}>
                  <Package className={cn(
                    'w-5 h-5',
                    shipment.status === 'delivered' ? 'text-green-500' :
                    shipment.status === 'in_transit' ? 'text-orange-500' :
                    'text-yellow-500'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{shipment.trackingNumber}</p>
                  <p className="text-xs text-muted-foreground truncate">{shipment.sender} → {shipment.receiver}</p>
                </div>
                <Badge className={cn(
                  'text-[10px]',
                  shipment.status === 'delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  shipment.status === 'in_transit' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                )}>
                  {t(shipment.status as any, language)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Price Recommendation Hint */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{language === 'de' ? 'KI-Preisempfehlung' : 'AI Price Recommendation'}</h3>
              <p className="text-sm text-muted-foreground">
                {language === 'de' ? 'Lassen Sie Ihnen unsere KI den optimalen Preis vorschlagen.' : 'Let our AI suggest the optimal price for you.'}
              </p>
            </div>
            <Button onClick={() => setShowCreateShipment(true)} variant="outline">
              {language === 'de' ? 'Testen' : 'Try it'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents & Support */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" />
              {language === 'de' ? 'Dokumente' : 'Documents'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {language === 'de' ? 'Lieferscheine, Rechnungen und Zertifikate.' : 'Delivery notes, invoices and certificates.'}
            </p>
            <Button variant="outline" className="w-full" onClick={() => setActiveTab('shipments')}>
              <Download className="w-4 h-4 mr-2" />
              {language === 'de' ? 'Dokumente anzeigen' : 'View Documents'}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Headphones className="w-4 h-4 text-orange-500" />
              {language === 'de' ? 'Support' : 'Support'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {language === 'de' ? 'Hilfe bei Problemen mit Ihrem Transport.' : 'Help with issues regarding your transport.'}
            </p>
            <Button variant="outline" className="w-full" onClick={() => setActiveTab('support')}>
              <MessageSquare className="w-4 h-4 mr-2" />
              {language === 'de' ? 'Ticket erstellen' : 'Create Ticket'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==========================================
// CARRIER (DISPATCHER) DASHBOARD
// ==========================================
function CarrierDashboard({ language }: { language: string }) {
  const { setActiveTab } = useCargoBitStore();
  
  const carrierKPIs = [
    { label: 'activeShipments', value: 89, change: 5.2, changeLabel: 'heute aktiv', icon: 'Package' },
    { label: 'deliveriesToday', value: 342, change: 8.3, changeLabel: 'heute geplant', icon: 'Truck' },
    { label: 'revenue', value: 45200, change: 3.1, changeLabel: 'heute', icon: 'TrendingUp' },
    { label: 'avgRating', value: 4.6, change: 0.1, changeLabel: 'Kundenrating', icon: 'Star' },
  ];

  const activeVehicles = fleetVehicles.filter(v => v.status === 'active').slice(0, 4);
  const availableOrders = shipments.filter(s => s.status === 'pending' || s.status === 'processing').slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-500 p-6 sm:p-8 text-white"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">{language === 'de' ? 'Guten Tag, Disponent!' : 'Good day, Dispatcher!'} 👋</h1>
          <p className="text-white/80 text-sm sm:text-base max-w-lg">
            {language === 'de' ? `${carrierKPIs[0].value} aktive Aufträge – ${activeVehicles.length} Fahrzeuge unterwegs.` : `${carrierKPIs[0].value} active orders – ${activeVehicles.length} vehicles on route.`}
          </p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {carrierKPIs.map((kpi, index) => (
          <KPICard key={kpi.label} item={kpi} index={index} language={language} colorOverride="blue" />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Button
          onClick={() => setActiveTab('shipments')}
          className="h-20 flex flex-col items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600"
        >
          <Package className="w-6 h-6" />
          <span className="font-semibold">{language === 'de' ? 'Verfügbare Aufträge' : 'Available Orders'}</span>
        </Button>
        <Button
          onClick={() => setActiveTab('capacity')}
          variant="outline"
          className="h-20 flex flex-col items-center gap-2"
        >
          <Truck className="w-6 h-6 text-blue-500" />
          <span className="font-semibold">{language === 'de' ? 'Auto-Load' : 'Auto-Load'}</span>
        </Button>
        <Button
          onClick={() => setActiveTab('fleet')}
          variant="outline"
          className="h-20 flex flex-col items-center gap-2"
        >
          <Users className="w-6 h-6 text-purple-500" />
          <span className="font-semibold">{language === 'de' ? 'Flottenmanagement' : 'Fleet Management'}</span>
        </Button>
        <Button
          onClick={() => setActiveTab('wallet')}
          variant="outline"
          className="h-20 flex flex-col items-center gap-2"
        >
          <Wallet className="w-6 h-6 text-green-500" />
          <span className="font-semibold">{language === 'de' ? 'Wallet' : 'Wallet'}</span>
        </Button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Orders */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">{language === 'de' ? 'Verfügbare Aufträge' : 'Available Orders'}</CardTitle>
              <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                {availableOrders.length} {language === 'de' ? 'neu' : 'new'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableOrders.map((order) => (
              <div key={order.id} className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{order.trackingNumber}</span>
                  <Badge className={cn('text-[10px]', order.priority === 'express' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}>
                    {order.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{order.sender} → {order.receiver}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-semibold text-orange-500">{formatCurrency(order.cost)}</span>
                  <Button size="sm" variant="ghost">{language === 'de' ? 'Details' : 'Details'}</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Active Fleet */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">{language === 'de' ? 'Aktive Fahrzeuge' : 'Active Vehicles'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('fleet')}>
                {language === 'de' ? 'Alle' : 'All'} →
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeVehicles.map((vehicle) => (
              <div key={vehicle.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{vehicle.plate}</p>
                  <p className="text-xs text-muted-foreground truncate">{vehicle.currentRoute || (language === 'de' ? 'Keine Route' : 'No route')}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Fuel className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs">{vehicle.fuelLevel}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Support & Invoices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button onClick={() => setActiveTab('support')} variant="outline" className="h-16 justify-start gap-3">
          <Headphones className="w-5 h-5 text-orange-500" />
          <span>{language === 'de' ? 'Support bei Zwischenfällen' : 'Incident Support'}</span>
        </Button>
        <Button onClick={() => setActiveTab('wallet')} variant="outline" className="h-16 justify-start gap-3">
          <FileText className="w-5 h-5 text-orange-500" />
          <span>{language === 'de' ? 'Rechnungen & Abrechnung' : 'Invoices & Billing'}</span>
        </Button>
      </div>
    </div>
  );
}

// ==========================================
// DRIVER DASHBOARD - NO FINANCES!
// ==========================================
function DriverDashboard({ language }: { language: string }) {
  const { setActiveTab } = useCargoBitStore();
  
  const driverKPIs = [
    { label: 'deliveriesToday', value: 8, change: 2, changeLabel: 'heute erledigt', icon: 'Truck' },
    { label: 'activeShipments', value: 2, change: 0, changeLabel: 'restlich', icon: 'Package' },
    { label: 'avgRating', value: 4.9, change: 0.3, changeLabel: 'Kundenrating', icon: 'Star' },
    { label: 'Clock', value: 6.5, change: 0, changeLabel: 'Stunden heute', icon: 'Clock' },
  ];

  const myDeliveries = shipments.filter(s => s.status === 'in_transit' || s.status === 'out_for_delivery').slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500 via-purple-600 to-violet-500 p-6 sm:p-8 text-white"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">{language === 'de' ? 'Guten Tag, Fahrer!' : 'Good day, Driver!'} 👋</h1>
          <p className="text-white/80 text-sm sm:text-base max-w-lg">
            {language === 'de' ? `${driverKPIs[0].value} Lieferungen heute – ${driverKPIs[1].value} noch offen.` : `${driverKPIs[0].value} deliveries today – ${driverKPIs[1].value} remaining.`}
          </p>
        </div>
      </motion.div>

      {/* KPI Cards - NO FINANCES! */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {driverKPIs.map((kpi, index) => (
          <KPICard key={kpi.label} item={kpi} index={index} language={language} colorOverride="purple" />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button
          onClick={() => setActiveTab('shipments')}
          className="h-20 flex flex-col items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600"
        >
          <Package className="w-6 h-6" />
          <span className="font-semibold">{language === 'de' ? 'Meine Aufträge' : 'My Orders'}</span>
        </Button>
        <Button
          onClick={() => setActiveTab('tracking')}
          variant="outline"
          className="h-20 flex flex-col items-center gap-2"
        >
          <Navigation className="w-6 h-6 text-blue-500" />
          <span className="font-semibold">{language === 'de' ? 'Navigation' : 'Navigation'}</span>
        </Button>
        <Button
          onClick={() => setActiveTab('chat')}
          variant="outline"
          className="h-20 flex flex-col items-center gap-2"
        >
          <MessageSquare className="w-6 h-6 text-green-500" />
          <span className="font-semibold">{language === 'de' ? 'Transport-Chat' : 'Transport Chat'}</span>
        </Button>
      </div>

      {/* My Deliveries */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{language === 'de' ? 'Aktive Lieferungen' : 'Active Deliveries'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {myDeliveries.map((delivery) => (
            <div key={delivery.id} className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">{delivery.trackingNumber}</span>
                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {t(delivery.status as any, language)}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-500" />
                  <span>{language === 'de' ? 'Von:' : 'From:'} {delivery.sender}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span>{language === 'de' ? 'Nach:' : 'To:'} {delivery.receiver}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span>{language === 'de' ? 'ETA:' : 'ETA:'} {delivery.estimatedDelivery}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="flex-1">
                  <Navigation className="w-4 h-4 mr-1" />
                  {language === 'de' ? 'Navigieren' : 'Navigate'}
                </Button>
                <Button size="sm" variant="outline">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {language === 'de' ? 'Abgeschlossen' : 'Done'}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Status Update & Documents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{language === 'de' ? 'Status aktualisieren' : 'Update Status'}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {['Abgeholt', 'Unterwegs', 'Verzögerung', 'Ankunft'].map((status, idx) => (
              <Button key={idx} variant="outline" size="sm">
                {status}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {language === 'de' ? 'Dokumente' : 'Documents'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {language === 'de' ? 'Lieferscheine und Frachtbriefe.' : 'Delivery notes and waybills.'}
            </p>
            <Button variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              {language === 'de' ? 'Dokumente' : 'Documents'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Support - NO FINANCES SECTION! */}
      <Card className="bg-orange-500/10 border-orange-500/30">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Headphones className="w-6 h-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{language === 'de' ? 'Support bei Zwischenfällen' : 'Incident Support'}</h3>
              <p className="text-sm text-muted-foreground">
                {language === 'de' ? 'Nur für Probleme während des Transports.' : 'Only for issues during transport.'}
              </p>
            </div>
            <Button onClick={() => setActiveTab('support')}>
              {language === 'de' ? 'Kontakt' : 'Contact'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// SUPPORT DASHBOARD - NO FINANCES/ANALYTICS!
// ==========================================
function SupportDashboard({ language }: { language: string }) {
  const { setActiveTab } = useCargoBitStore();
  
  const supportKPIs = [
    { label: 'open', value: 7, change: 2, changeLabel: 'offene Tickets', icon: 'Package' },
    { label: 'inProgress', value: 3, change: 1, changeLabel: 'in Bearbeitung', icon: 'Clock' },
    { label: 'resolved', value: 95, change: 3.4, changeLabel: 'Lösungsrate %', icon: 'CheckCircle' },
    { label: 'avgRating', value: 4.6, change: 0.2, changeLabel: 'Zufriedenheit', icon: 'Star' },
  ];

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').slice(0, 4);
  const urgentTickets = tickets.filter(t => t.priority === 'urgent' || t.priority === 'high');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 p-6 sm:p-8 text-white"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">{language === 'de' ? 'Guten Tag, Support!' : 'Good day, Support!'} 👋</h1>
          <p className="text-white/80 text-sm sm:text-base max-w-lg">
            {language === 'de' ? `${openTickets.length} offene Tickets – ${urgentTickets.length} dringend.` : `${openTickets.length} open tickets – ${urgentTickets.length} urgent.`}
          </p>
        </div>
      </motion.div>

      {/* KPI Cards - NO REVENUE! */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {supportKPIs.map((kpi, index) => (
          <KPICard key={kpi.label} item={kpi} index={index} language={language} colorOverride="cyan" />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button
          onClick={() => setActiveTab('support')}
          className="h-20 flex flex-col items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600"
        >
          <Headphones className="w-6 h-6" />
          <span className="font-semibold">{language === 'de' ? 'Tickets' : 'Tickets'}</span>
        </Button>
        <Button
          onClick={() => setActiveTab('chat')}
          variant="outline"
          className="h-20 flex flex-col items-center gap-2"
        >
          <MessageSquare className="w-6 h-6 text-blue-500" />
          <span className="font-semibold">{language === 'de' ? 'Live-Chat' : 'Live Chat'}</span>
        </Button>
        <Button
          onClick={() => setActiveTab('tracking')}
          variant="outline"
          className="h-20 flex flex-col items-center gap-2"
        >
          <Eye className="w-6 h-6 text-purple-500" />
          <span className="font-semibold">{language === 'de' ? 'Transport-Details' : 'Transport Details'}</span>
        </Button>
      </div>

      {/* Open Tickets */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{language === 'de' ? 'Offene Tickets' : 'Open Tickets'}</CardTitle>
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {urgentTickets.length} {language === 'de' ? 'dringend' : 'urgent'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {openTickets.map((ticket) => (
            <div key={ticket.id} className={cn(
              'p-4 rounded-xl border',
              ticket.priority === 'urgent' ? 'bg-red-500/10 border-red-500/30' :
              ticket.priority === 'high' ? 'bg-orange-500/10 border-orange-500/30' :
              'bg-muted/30 border-border/50'
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{ticket.subject}</span>
                <Badge className={cn(
                  'text-[10px]',
                  ticket.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                  ticket.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                  'bg-yellow-100 text-yellow-700'
                )}>
                  {ticket.priority}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{ticket.customer}</p>
              <p className="text-xs text-muted-foreground mt-1">{ticket.description.slice(0, 80)}...</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="flex-1">
                  {language === 'de' ? 'Bearbeiten' : 'Handle'}
                </Button>
                <Button size="sm" variant="outline">
                  {language === 'de' ? 'Details' : 'Details'}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Conflicts & Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              {language === 'de' ? 'Konflikte' : 'Conflicts'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {language === 'de' ? 'Aktive Streitfälle und Reklamationen.' : 'Active disputes and complaints.'}
            </p>
            <Button variant="outline" className="w-full">
              {language === 'de' ? 'Konflikte anzeigen' : 'View Conflicts'}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 border-orange-500/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-orange-500" />
              <div>
                <h3 className="font-semibold">{language === 'de' ? 'Nur für Zwischenfälle' : 'Incidents Only'}</h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'de' ? 'Support nur bei Transport-Problemen.' : 'Support only for transport issues.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Note: NO FINANCES OR ANALYTICS ACCESS! */}
      <Card className="bg-muted/30 border-border/50">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground text-center">
            {language === 'de' 
              ? '⚠️ Support-Rolle hat keinen Zugriff auf Finanzen oder Analytik.' 
              : '⚠️ Support role has no access to finances or analytics.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// MAIN DASHBOARD COMPONENT
// ==========================================
export function DashboardPage() {
  const { currentRole, language } = useCargoBitStore();
  const role = currentRole || 'admin';

  // Render role-specific dashboard
  switch (role) {
    case 'admin':
      return <AdminDashboard language={language} />;
    case 'shipper':
      return <ShipperDashboard language={language} />;
    case 'dispatcher':
      return <CarrierDashboard language={language} />;
    case 'driver':
      return <DriverDashboard language={language} />;
    case 'support':
      return <SupportDashboard language={language} />;
    default:
      return <AdminDashboard language={language} />;
  }
}
