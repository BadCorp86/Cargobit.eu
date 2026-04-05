'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/mock-data';
import { adCampaigns, adPositions, adApplications } from '@/lib/mock-data-wallet';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { AdApplicationForm } from './ad-application-form';
import {
  Megaphone,
  Eye,
  MousePointerClick,
  BarChart3,
  Plus,
  ExternalLink,
  CheckCircle2,
  Clock,
  Pause,
  Ban,
  FileText,
  Building2,
  Mail,
  Upload,
  LayoutDashboard,
  Image as ImageIcon,
  DollarSign,
  Percent,
  Target,
  ChevronRight,
} from 'lucide-react';

const campaignStatusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  pending_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paused: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const campaignStatusIcons: Record<string, React.ElementType> = {
  active: CheckCircle2,
  pending_review: Clock,
  paused: Pause,
  completed: CheckCircle2,
  rejected: Ban,
};

const appStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const getPositionIcon = (posName: string): React.ElementType => {
  const name = posName.toLowerCase();
  if (name.includes('newsletter') || name.includes('email')) return Mail;
  return LayoutDashboard;
};

export function AdvertisingPage() {
  const { language } = useCargoBitStore();

  const activeCampaigns = adCampaigns.filter((c) => c.status === 'active');
  const totalImpressions = adCampaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = adCampaigns.reduce((s, c) => s + c.clicks, 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0';
  const totalAdSpend = adCampaigns.reduce((s, c) => s + c.budgetUsed, 0);

  const volumeDiscounts = [
    { months: '3+', discount: '10%', description: '3+ Monate Laufzeit' },
    { months: '6+', discount: '20%', description: '6+ Monate Laufzeit' },
    { months: '12+', discount: '30%', description: '12+ Monate Laufzeit' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('activeCampaigns', language), value: activeCampaigns.length, icon: Megaphone, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: t('totalImpressions', language), value: formatNumber(totalImpressions), icon: Eye, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: t('totalClicks', language), value: formatNumber(totalClicks), icon: MousePointerClick, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: t('adSpend', language), value: formatCurrency(totalAdSpend), icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map((kpi, idx) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.05 }}>
            <Card className="glass-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', kpi.bg)}>
                    <kpi.icon className={cn('w-4 h-4', kpi.color)} />
                  </div>
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20">
              <Plus className="w-4 h-4" />
              {t('createCampaign', language)}
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-orange-500" />
                {t('createCampaign', language)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <Label>{t('campaign', language)}</Label>
                <Input placeholder="Kampagnenname" className="mt-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('budget', language)}</Label>
                  <Input placeholder="500" type="number" className="mt-1.5" />
                </div>
                <div>
                  <Label>{t('dailyBudget', language)}</Label>
                  <Input placeholder="50" type="number" className="mt-1.5" />
                </div>
              </div>
              <div>
                <Label>{t('targetUrl', language)}</Label>
                <Input placeholder="https://example.de" className="mt-1.5" />
              </div>
              <div>
                <Label>{t('bannerUpload', language)}</Label>
                <div className="mt-1.5 border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-orange-500/50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">728×90 px, 300×250 px oder 600×200 px</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG oder GIF – Max 2 MB</p>
                </div>
              </div>
              <div>
                <Label>{t('position', language)}</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {adPositions.filter(p => p.available).map((pos) => (
                    <label key={pos.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/50 hover:border-orange-500/50 cursor-pointer transition-colors">
                      <input type="radio" name="position" className="accent-orange-500" />
                      <div>
                        <p className="text-xs font-medium">{pos.name}</p>
                        <p className="text-[10px] text-muted-foreground">{pos.dimensions}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('startDate', language)}</Label>
                  <Input type="date" className="mt-1.5" />
                </div>
                <div>
                  <Label>{t('endDate', language)}</Label>
                  <Input type="date" className="mt-1.5" />
                </div>
              </div>
              <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white">
                {t('createCampaign', language)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AdApplicationForm />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="campaigns">{t('myCampaigns', language)}</TabsTrigger>
          <TabsTrigger value="positions">{t('bannerPositions', language)}</TabsTrigger>
          <TabsTrigger value="applications">{t('adApplications', language)}</TabsTrigger>
          <TabsTrigger value="pricing">{t('pricing', language)}</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {adCampaigns.map((campaign, idx) => {
              const StatusIcon = campaignStatusIcons[campaign.status] || Clock;
              const PosIcon = getPositionIcon(campaign.position);
              return (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                >
                  <Card className="glass-card overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold truncate">{campaign.name}</p>
                            <Badge className={cn('text-[10px] shrink-0', campaignStatusColors[campaign.status])}>
                              {t(campaign.status, language)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{campaign.advertiser}</p>
                        </div>
                        <PosIcon className="w-5 h-5 text-muted-foreground/40 shrink-0 ml-2" />
                      </div>

                      {/* Banner Preview */}
                      <div className="relative rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 border border-border/30 h-24 mb-3 overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/50 font-medium">
                          {campaign.position} – {campaign.dimensions}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="text-center p-2 rounded-lg bg-muted/30">
                          <p className="text-[10px] text-muted-foreground">{t('impressions', language)}</p>
                          <p className="text-sm font-bold">{formatNumber(campaign.impressions)}</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/30">
                          <p className="text-[10px] text-muted-foreground">{t('clicks', language)}</p>
                          <p className="text-sm font-bold">{formatNumber(campaign.clicks)}</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/30">
                          <p className="text-[10px] text-muted-foreground">{t('ctr', language)}</p>
                          <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{campaign.ctr}%</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/30">
                          <p className="text-[10px] text-muted-foreground">{t('budget', language)}</p>
                          <p className="text-xs font-medium">{formatCurrency(campaign.budget)}</p>
                        </div>
                      </div>

                      {/* Budget Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{t('budgetUsed', language)}</span>
                          <span>{Math.round((campaign.budgetUsed / campaign.budget) * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(campaign.budgetUsed / campaign.budget) * 100}%` }}
                            transition={{ duration: 1, delay: 0.3 }}
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {adPositions.map((pos, idx) => {
              const PosIcon = getPositionIcon(pos.name);
              return (
                <motion.div
                  key={pos.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                >
                  <Card className={cn('glass-card overflow-hidden hover:shadow-lg transition-shadow', !pos.available && 'opacity-70')}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                          <PosIcon className="w-5 h-5 text-orange-500" />
                        </div>
                        <Badge className={cn('text-[10px]', pos.available ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400')}>
                          {pos.available ? t('available', language) : t('occupied', language)}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold mb-1">{pos.name}</p>
                      <p className="text-xs text-muted-foreground mb-3">{pos.location}</p>

                      <div className="rounded-lg bg-muted/30 border border-dashed border-border/50 p-4 mb-3 flex items-center justify-center">
                        <div className="text-center">
                          <ImageIcon className="w-6 h-6 mx-auto mb-1 text-muted-foreground/30" />
                          <p className="text-xs text-muted-foreground font-mono">{pos.dimensions}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(pos.pricePerMonth)}</p>
                        <p className="text-[10px] text-muted-foreground">/ {t('months', language)}</p>
                      </div>
                      {pos.currentAdvertiser && (
                        <p className="text-[10px] text-muted-foreground mt-2 truncate">
                          {pos.currentAdvertiser}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          <div className="space-y-3">
            {adApplications.map((app, idx) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                <Card className="glass-card hover:shadow-lg transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="w-4 h-4 text-orange-500 shrink-0" />
                          <p className="text-sm font-semibold truncate">{app.companyName}</p>
                          <Badge className={cn('text-[10px] shrink-0', appStatusColors[app.status])}>
                            {t(app.status, language)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          {app.contactPerson} · {app.email}
                        </p>
                        <p className="text-xs text-muted-foreground/70 ml-6 mt-1 line-clamp-2">
                          {app.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2 ml-6">
                          {app.preferredPositions.map((pos) => (
                            <Badge key={pos} variant="outline" className="text-[10px] font-normal">
                              {pos}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <p className="text-xs font-medium">{app.budgetRange}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(app.submittedAt).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-500" />
                {t('pricing', language)} – {t('bannerPositions', language)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">{t('position', language)}</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">{t('location', language)}</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">{t('dimensions', language)}</th>
                      <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground">{t('pricePerMonth', language)}</th>
                      <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground">{t('status', language)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adPositions.map((pos) => (
                      <tr key={pos.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3 text-sm font-medium">{pos.name}</td>
                        <td className="py-3 px-3 text-xs text-muted-foreground">{pos.location}</td>
                        <td className="py-3 px-3 text-xs font-mono text-muted-foreground">{pos.dimensions}</td>
                        <td className="py-3 px-3 text-sm font-bold text-right text-orange-600 dark:text-orange-400">{formatCurrency(pos.pricePerMonth)}</td>
                        <td className="py-3 px-3 text-center">
                          <Badge className={cn('text-[10px]', pos.available ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400')}>
                            {pos.available ? t('available', language) : t('occupied', language)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Volume Discounts */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="w-5 h-5 text-orange-500" />
                {t('volumeDiscounts', language)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {volumeDiscounts.map((vd) => (
                  <div key={vd.months} className="p-5 rounded-xl bg-gradient-to-br from-orange-500/5 to-amber-500/5 border border-orange-500/20 text-center">
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{vd.discount}</p>
                    <p className="text-sm font-medium mt-1">{t('discount', language)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{vd.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
