'use client';

import { motion } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { revenueData, regionalData, shipments } from '@/lib/mock-data';
import { formatCurrency, formatNumber } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Truck,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChartIcon,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const deliveryData = [
  { name: 'Jan', success: 95, failed: 5 },
  { name: 'Feb', success: 93, failed: 7 },
  { name: 'Mär', success: 96, failed: 4 },
  { name: 'Apr', success: 97, failed: 3 },
  { name: 'Mai', success: 94, failed: 6 },
  { name: 'Jun', success: 98, failed: 2 },
  { name: 'Jul', success: 96, failed: 4 },
  { name: 'Aug', success: 95, failed: 5 },
  { name: 'Sep', success: 97, failed: 3 },
  { name: 'Okt', success: 98, failed: 2 },
  { name: 'Nov', success: 97, failed: 3 },
  { name: 'Dez', success: 99, failed: 1 },
];

const pieData = [
  { name: 'Geliefert', value: 45, color: '#22C55E' },
  { name: 'Unterwegs', value: 28, color: '#F97316' },
  { name: 'Ausstehend', value: 15, color: '#EAB308' },
  { name: 'Storniert', value: 8, color: '#EF4444' },
  { name: 'Zurück', value: 4, color: '#94A3B8' },
];

const performanceMetrics = [
  { label: 'Avg. Lieferzeit', value: '2.3 Tage', change: -8, icon: Clock },
  { label: 'Pünktlichkeitsrate', value: '94.2%', change: 2.1, icon: Target },
  { label: 'Kundenzufriedenheit', value: '4.8/5.0', change: 0.3, icon: TrendingUp },
  { label: 'Fahrerauslastung', value: '87%', change: 5.2, icon: Truck },
];

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  color: 'var(--card-foreground)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
};

export function AnalyticsPage() {
  const { language } = useCargoBitStore();

  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const totalShipments = revenueData.reduce((sum, d) => sum + d.shipments, 0);
  const avgRevenuePerShipment = totalRevenue / totalShipments;
  const overallSuccessRate = pieData.find((d) => d.name === 'Geliefert')?.value || 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('analytics', language)}</h1>
        <p className="text-sm text-muted-foreground">{t('performanceMetrics', language)}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Jahresumsatz', value: formatCurrency(totalRevenue), change: 18.5, icon: BarChart3 },
          { label: 'Gesamt-Sendungen', value: formatNumber(totalShipments), change: 15.3, icon: Truck },
          { label: 'Ø Umsatz/Sendung', value: formatCurrency(avgRevenuePerShipment), change: 3.2, icon: Target },
          { label: 'Erfolgsquote', value: `${overallSuccessRate}%`, change: 2.1, icon: TrendingUp },
        ].map((metric, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 flex items-center justify-center">
                    <metric.icon className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className={cn(
                    'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                    metric.change >= 0
                      ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30'
                      : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30'
                  )}>
                    {metric.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {metric.change}%
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight">{metric.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{metric.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.08 }}
            >
              <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{metric.value}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <span className={cn(
                        'text-[10px] font-medium',
                        metric.change >= 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {metric.change >= 0 ? '+' : ''}{metric.change}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">{t('revenueChart', language)}</CardTitle>
                <Badge variant="secondary" className="text-xs bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 border-0">
                  <ArrowUpRight className="w-3 h-3 mr-1" />+18.5%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatCurrency(value), 'Umsatz']} />
                    <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Donut Chart */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t('deliverySuccessRate', language)}</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Success Trend */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{language === 'de' ? 'Lieferqualität im Jahresverlauf' : 'Delivery Quality Trend'}</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={deliveryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} domain={[85, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="success" stroke="#22C55E" strokeWidth={2.5} dot={{ fill: '#22C55E', r: 3 }} name="Erfolgreich" />
                <Line type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444', r: 3 }} name="Fehlgeschlagen" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Regional Breakdown */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4 text-orange-500" />
            {t('regionalBreakdown', language)}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-xs font-semibold">{t('region', language)}</TableHead>
                  <TableHead className="text-xs font-semibold">{t('shipments', language)}</TableHead>
                  <TableHead className="text-xs font-semibold">{t('revenue', language)}</TableHead>
                  <TableHead className="text-xs font-semibold">{t('growth', language)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regionalData.map((region) => (
                  <TableRow key={region.region} className="border-border/30 hover:bg-muted/30">
                    <TableCell className="text-sm font-medium">{region.region}</TableCell>
                    <TableCell className="text-sm">{formatNumber(region.shipments)}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(region.revenue)}</TableCell>
                    <TableCell>
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        region.growth >= 0
                          ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30'
                          : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30'
                      )}>
                        {region.growth >= 0 ? '+' : ''}{region.growth}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
