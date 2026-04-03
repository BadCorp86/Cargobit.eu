'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { kpiData, revenueData, activities } from '@/lib/mock-data';
import { formatCurrency, formatNumber, getTimeAgo } from '@/lib/mock-data';
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

function KPICard({ item, index, language }: { item: { label: string; value: number; change: number; changeLabel: string; icon: string }; index: number; language: string }) {
  const iconMap: Record<string, React.ElementType> = { Package, TrendingUp, Truck, Star };
  const Icon = iconMap[item.icon] || Package;
  const isPositive = item.change >= 0;
  const isRating = item.label === 'avgRating';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-orange-300/50 dark:hover:border-orange-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5 group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-200/30 dark:border-orange-800/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Icon className="w-5 h-5 text-orange-500" />
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
            ) : item.label === 'revenue' || item.label === 'revenue' ? (
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

function ActivityFeed({ language }: { language: string }) {
  const iconMap: Record<string, React.ElementType> = {
    Package, CheckCircle, CreditCard, AlertTriangle, User, Truck, Map, FileText,
  };
  const typeColorMap: Record<string, string> = {
    shipment: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    delivery: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    payment: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    alert: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    system: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500 pulse-live" />
          {t('recentActivity', language)}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar pr-2">
          {activities.map((activity, index) => {
            const Icon = iconMap[activity.icon] || Package;
            const colorClass = typeColorMap[activity.type] || typeColorMap.system;
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 group"
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', colorClass)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{activity.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{activity.description}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
                  {getTimeAgo(activity.timestamp)}
                </span>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RevenueChart({ language }: { language: string }) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{t('revenueChart', language)}</CardTitle>
          <Badge variant="secondary" className="text-xs bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 border-0">
            <ArrowUpRight className="w-3 h-3 mr-1" />+11.1%
          </Badge>
        </div>
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
  );
}

function QuickActions({ language }: { language: string }) {
  const { setActiveTab, setShowCreateShipment } = useCargoBitStore();

  const actions = [
    { icon: Plus, label: t('createShipment', language), onClick: () => setShowCreateShipment(true) },
    { icon: MapPin, label: t('trackPackage', language), onClick: () => setActiveTab('tracking') },
    { icon: FileText, label: t('generateInvoice', language), onClick: () => setActiveTab('settings') },
    { icon: Download, label: t('exportReport', language), onClick: () => setActiveTab('analytics') },
  ];

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{t('quickActions', language)}</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <Button
                onClick={action.onClick}
                variant="outline"
                className="w-full h-auto p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-300 dark:hover:border-orange-700/50 transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/10 to-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <action.icon className="w-5 h-5 text-orange-500" />
                </div>
                <span className="text-xs font-medium text-center">{action.label}</span>
              </Button>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { currentRole, language } = useCargoBitStore();
  const role = currentRole || 'admin';
  const kpis = kpiData[role] || kpiData.admin;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 p-6 sm:p-8 text-white"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 blur-xl" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">
            {language === 'de' ? 'Guten Tag' : language === 'en' ? 'Good day' : 'Hello'}, {role === 'admin' ? 'Administrator' : role}! 👋
          </h1>
          <p className="text-white/80 text-sm sm:text-base max-w-lg">
            {language === 'de'
              ? `Willkommen zurück in Ihrem Dashboard. Sie haben ${kpis[0]?.value || 0} aktive Vorgänge.`
              : `Welcome back to your dashboard. You have ${kpis[0]?.value || 0} active items.`}
          </p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <KPICard key={kpi.label} item={kpi} index={index} language={language} />
        ))}
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart language={language} />
        </div>
        <div className="space-y-6">
          <QuickActions language={language} />
        </div>
      </div>

      {/* Activity Feed */}
      <ActivityFeed language={language} />

      {/* Shipment Volume */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t('shipmentVolume', language)}</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    color: 'var(--card-foreground)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number) => [value, language === 'de' ? 'Sendungen' : 'Shipments']}
                />
                <Bar dataKey="shipments" fill="#F97316" radius={[6, 6, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
