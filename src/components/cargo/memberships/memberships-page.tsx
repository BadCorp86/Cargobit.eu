'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { membershipPlans, formatEUR, getTransportCommission, getWalletFee, getVerladerBrokerageFee, FREE_TIER, calculateTransporteurCommission, calculateTransporteurNetIncome, VERLADER_BROKERAGE_FEE } from '@/lib/membership-data';
import type { MembershipTier, BillingCycle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Check,
  Sparkles,
  Crown,
  Rocket,
  Building2,
  Zap,
  Shield,
  CreditCard,
  TrendingUp,
  Star,
  Eye,
  Lock,
  Info,
  Package,
  Truck,
  Wallet,
  UserCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tierIcons: Record<string, React.ElementType> = {
  starter: Rocket,
  professional: Crown,
  enterprise: Building2,
};

const tierColors: Record<string, string> = {
  starter: 'from-slate-500 to-slate-600',
  professional: 'from-orange-500 to-orange-600',
  enterprise: 'from-purple-500 to-purple-600',
};

const tierBadgeColors: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  professional: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export function MembershipsPage() {
  const { language, currentMembership, setCurrentMembership, billingCycle, setBillingCycle, currentRole } = useCargoBitStore();
  const [selectedPlan, setSelectedPlan] = useState<MembershipTier | null>(null);

  const isYearly = billingCycle === 'yearly';
  const verladerFee = getVerladerBrokerageFee();

  const handleSelectPlan = (tier: MembershipTier) => {
    setCurrentMembership(tier);
    setSelectedPlan(tier);
  };

  const getCTAButton = (tier: MembershipTier) => {
    if (tier === currentMembership) {
      return (
        <Button disabled className="w-full bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30 hover:bg-green-500/20 cursor-default">
          <Check className="w-4 h-4 mr-2" />
          {t('currentPlanBadge', language)}
        </Button>
      );
    }

    const tierOrder: MembershipTier[] = ['free', 'starter', 'professional', 'enterprise'];
    const currentIndex = tierOrder.indexOf(currentMembership);
    const targetIndex = tierOrder.indexOf(tier);

    if (targetIndex > currentIndex) {
      return (
        <Button
          onClick={() => handleSelectPlan(tier)}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25"
        >
          <Zap className="w-4 h-4 mr-2" />
          {t('upgradePlan', language)}
        </Button>
      );
    }

    return (
      <Button
        onClick={() => handleSelectPlan(tier)}
        variant="outline"
        className="w-full border-border/50 hover:border-orange-300 hover:bg-orange-500/5"
      >
        {t('downgradePlan', language)}
      </Button>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-4">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
              {t('memberships', language)}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {t('membership', language)}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            {language === 'de'
              ? 'Wählen Sie den passenden Plan für Ihr Logistikunternehmen. Alle Pläne beinhalten eine 2-monatige kostenlose Testphase.'
              : 'Choose the right plan for your logistics company. All plans include a 2-month free trial.'}
          </p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center gap-3"
        >
          <span className={cn('text-sm font-medium', !isYearly && 'text-foreground', isYearly && 'text-muted-foreground')}>
            {t('monthly', language)}
          </span>
          <button
            onClick={() => setBillingCycle(isYearly ? 'monthly' : 'yearly')}
            className={cn(
              'relative w-14 h-7 rounded-full transition-colors duration-300',
              isYearly ? 'bg-orange-500' : 'bg-muted'
            )}
          >
            <motion.div
              className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm"
              animate={{ left: isYearly ? 32 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={cn('text-sm font-medium', isYearly && 'text-foreground', !isYearly && 'text-muted-foreground')}>
            {t('yearly', language)}
          </span>
          {isYearly && (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-[10px]">
              -17% {t('savePercent', language)}
            </Badge>
          )}
        </motion.div>
      </div>

      {/* Free Tier Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="max-w-6xl mx-auto"
      >
        <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-500/5 dark:to-cyan-500/5 border-blue-500/30 rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                <Eye className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-base">
                  {language === 'de' ? 'Kostenloser Zugang' : 'Free Access'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'de'
                    ? `Neu bei CargoBit? Testen Sie ${FREE_TIER.trialMonths} Monate kostenlos den Starter-Zugang. Sie können alles sehen, aber nicht alles nutzen.`
                    : `New to CargoBit? Try ${FREE_TIER.trialMonths} months free with Starter access. You can see everything, but not use everything.`}
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/50 border border-border/50">
                    <Package className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-xs font-medium">
                      {language === 'de'
                        ? `Max. ${FREE_TIER.maxOrdersInTrial} Aufträge in ${FREE_TIER.trialMonths} Monaten`
                        : `Max ${FREE_TIER.maxOrdersInTrial} orders in ${FREE_TIER.trialMonths} months`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/50 border border-border/50">
                    <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs font-medium">
                      {FREE_TIER.transportCommission}% {language === 'de' ? 'Transportprovision' : 'Transport Commission'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/50 border border-border/50">
                    <Wallet className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-medium">
                      {FREE_TIER.walletFee}% {language === 'de' ? 'Wallet-Gebühr' : 'Wallet Fee'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pricing Cards - Nicht für Verlader/Shipper */}
      {currentRole !== 'shipper' && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {membershipPlans.map((plan, index) => {
          const TierIcon = tierIcons[plan.tier] || Shield;
          const price = isYearly ? plan.priceYearly : plan.priceMonthly;
          const billingText = isYearly
            ? `${formatEUR(plan.priceYearly)} / ${t('perYear', language)}`
            : `${formatEUR(plan.priceMonthly)} / ${t('perMonth', language)}`;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            >
              <Card
                className={cn(
                  'relative bg-card/50 backdrop-blur-sm border-border/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg',
                  plan.popular && 'border-orange-500/50 shadow-lg shadow-orange-500/10 scale-[1.02]',
                  plan.tier === currentMembership && 'ring-2 ring-green-500/50'
                )}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600" />
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br',
                        tierColors[plan.tier]
                      )}>
                        <TierIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{language === 'de' ? plan.name : plan.nameEn}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {language === 'de' ? plan.description : plan.descriptionEn}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        {formatEUR(price)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {billingText}
                    </p>
                    <Badge className="mt-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-[10px]">
                      {t('twoMonthsFree', language)}
                    </Badge>
                  </div>

                  {plan.popular && (
                    <Badge className="absolute top-4 right-4 bg-orange-500 text-white border-0 text-[10px]">
                      <Star className="w-3 h-3 mr-1" />
                      {t('mostPopular', language)}
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* CTA */}
                  {getCTAButton(plan.tier)}

                  <Separator className="bg-border/50" />

                  {/* Shipment limit */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('shipmentLimit', language)}</span>
                    <Badge variant="outline" className={cn('text-[10px]', tierBadgeColors[plan.tier])}>
                      {plan.maxShipments ? `${plan.maxShipments} ${t('shipmentsPerMonth', language)}` : t('unlimited', language)}
                    </Badge>
                  </div>

                  <Separator className="bg-border/50" />

                  {/* Features */}
                  <div>
                    <p className="text-sm font-semibold mb-3">{t('features', language)}</p>
                    <div className="space-y-2.5">
                      {(language === 'de' ? plan.features : plan.featuresEn).map((feature, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                            plan.popular ? 'bg-orange-500/10' : 'bg-muted'
                          )}>
                            <Check className={cn(
                              'w-3 h-3',
                              plan.popular ? 'text-orange-500' : 'text-muted-foreground'
                            )} />
                          </div>
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-border/50" />

                  {/* Commission rates for Disponent */}
                  <div>
                    <p className="text-sm font-semibold mb-3">{t('transportCommission', language)}</p>
                    <div className="space-y-2">
                      <CommissionRow
                        label={language === 'de' ? 'Spediteur (Transportprovision)' : 'Dispatcher (Transport Commission)'}
                        value={plan.transportCommission.dispatcher}
                        language={language}
                      />
                      <CommissionRow
                        label={language === 'de' ? 'Disponent (Wallet-Gebühr)' : 'Dispatcher (Wallet Fee)'}
                        value={plan.walletFee.dispatcher}
                        language={language}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
      )}

      {/* VERLADER / AUKTIONSERSTELLER - WICHTIGER HINWEIS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="max-w-6xl mx-auto"
      >
        <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/5 dark:to-teal-500/5 border-emerald-500/30 rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {language === 'de'
                    ? 'Verlader / Auktionsersteller'
                    : 'Shipper / Auction Creator'}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {language === 'de'
                    ? 'Kein monatliches Abo erforderlich – nur Vermittlungsgebühr'
                    : 'No monthly subscription required – only brokerage fee'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {language === 'de'
                    ? 'Keine monatlichen Gebühren'
                    : 'No monthly fees'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'de'
                    ? 'Verlader erstellen Auktionen kostenlos und zahlen nur bei erfolgreichem Zuschlag.'
                    : 'Shippers create auctions for free and only pay when a bid is accepted.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {verladerFee}% {language === 'de' ? 'Vermittlungsgebühr auf Zuschlagspreis' : 'Brokerage fee on winning bid'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'de'
                    ? 'Die Gebühr wird berechnet auf den Betrag, den der Transporteur als Zuschlag erhält.'
                    : 'The fee is calculated on the amount the transport provider receives as the winning bid.'}
                </p>
              </div>
            </div>

            {/* Beispiel-Rechnung – Vollständige Auktionsabrechnung */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-4">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-orange-500" />
                <p className="text-sm font-semibold">
                  {language === 'de' ? 'Beispielrechnung – Vollständige Auktionsabrechnung' : 'Example Calculation – Complete Auction Billing'}
                </p>
              </div>

              {/* Auction header */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-background/80 border border-border/50">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{language === 'de' ? 'Auktion' : 'Auction'}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {language === 'de' ? 'Startpreis' : 'Start'} €1.000 → {language === 'de' ? 'Zuschlag' : 'Winning Bid'} <span className="font-bold text-green-600 dark:text-green-400">€800</span>
                </span>
              </div>

              {/* Seite 1 – Verlader */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <UserCircle className="w-4 h-4 text-emerald-500" />
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {language === 'de' ? 'Seite 1 – Verlader (Auktionsersteller)' : 'Side 1 – Shipper (Auction Creator)'}
                  </p>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {verladerFee}% {language === 'de' ? 'Vermittlungsgebühr auf €800' : 'Brokerage fee on €800'}
                  </span>
                  <span className="font-semibold">= {formatEUR(800 * verladerFee / 100)}</span>
                </div>
                <div className="flex justify-between text-sm p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    {language === 'de' ? 'Verlader zahlt an CargoBit' : 'Shipper pays to CargoBit'}
                  </span>
                  <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 font-mono text-xs">
                    {formatEUR(800 * verladerFee / 100)}
                  </Badge>
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Seite 2 – Transporteur (Gewinner der Auktion) - Nicht für Verlader/Shipper */}
              {currentRole !== 'shipper' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="w-4 h-4 text-blue-500" />
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {language === 'de' ? 'Seite 2 – Transporteur (Gewinner der Auktion)' : 'Side 2 – Transport Provider (Auction Winner)'}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-1.5 text-xs text-muted-foreground font-medium">{language === 'de' ? 'Abo-Tier' : 'Plan Tier'}</th>
                        <th className="text-right py-1.5 text-xs text-muted-foreground font-medium">{language === 'de' ? 'Provision' : 'Commission'}</th>
                        <th className="text-right py-1.5 text-xs text-muted-foreground font-medium">{language === 'de' ? 'Netto-Einkommen' : 'Net Income'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['free', 'starter', 'professional', 'enterprise'] as const).map((tier) => {
                        const commission = calculateTransporteurCommission(800, tier);
                        const netIncome = calculateTransporteurNetIncome(800, tier);
                        const tierLabel = tier === 'free'
                          ? (language === 'de' ? 'Kostenlos' : 'Free')
                          : tier === 'starter'
                            ? (language === 'de' ? 'Starter' : 'Starter')
                            : tier === 'professional'
                              ? (language === 'de' ? 'Professional' : 'Professional')
                              : (language === 'de' ? 'Enterprise' : 'Enterprise');
                        return (
                          <tr key={tier} className="border-b border-border/30">
                            <td className="py-1.5 font-medium text-xs">{tierLabel}</td>
                            <td className="py-1.5 text-right text-xs text-orange-600 dark:text-orange-400">
                              {getTransportCommission(tier, 'dispatcher')}% = {formatEUR(commission)}
                            </td>
                            <td className="py-1.5 text-right text-xs font-semibold text-green-600 dark:text-green-400">
                              {formatEUR(netIncome)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              <Separator className="bg-border/50" />

              {/* CargoBit Gesamteinnahmen - Nur für Admin sichtbar */}
              {currentRole === 'admin' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                      {language === 'de' ? 'CargoBit Gesamteinnahmen pro Auktion (Beispiel Professional)' : 'CargoBit Total Revenue per Auction (Example Professional)'}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {language === 'de' ? 'Von Verlader (Vermittlungsgebühr)' : 'From Shipper (Brokerage Fee)'}
                      </span>
                      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 font-mono text-xs">
                        {formatEUR(800 * verladerFee / 100)}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {language === 'de' ? 'Von Transporteur (5% Provision)' : 'From Transport Provider (5% Commission)'}
                      </span>
                      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 font-mono text-xs">
                        {formatEUR(calculateTransporteurCommission(800, 'professional'))}
                      </Badge>
                    </div>
                    <Separator className="bg-border/50" />
                    <div className="flex justify-between text-sm p-2 rounded-lg bg-orange-500/10 border border-orange-500/30">
                      <span className="font-bold text-orange-600 dark:text-orange-400">
                        {language === 'de' ? 'Gesamteinnahmen CargoBit' : 'Total CargoBit Revenue'}
                      </span>
                      <span className="font-bold text-orange-600 dark:text-orange-400 text-base">
                        {formatEUR(800 * verladerFee / 100 + calculateTransporteurCommission(800, 'professional'))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Commission Structure Table - Nicht für Verlader/Shipper */}
      {currentRole !== 'shipper' && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="max-w-6xl mx-auto"
      >
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('commissionTable', language)}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {language === 'de'
                    ? 'Provisionen und Gebühren je nach Rolle und Plan'
                    : 'Commissions and fees by role and plan'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="font-semibold">
                      {language === 'de' ? 'Rolle' : 'Role'}
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      {language === 'de' ? 'Kostenlos' : 'Free'}
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      {t('starter', language)}
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      {t('professional', language)}
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      {t('enterprise', language)}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Spediteur - Transportprovision (Abo-basiert) */}
                  <CommissionTableRow
                    label={language === 'de' ? 'Spediteur (Transportprovision)' : 'Dispatcher (Transport Commission)'}
                    description={language === 'de' ? 'Monatl. Abo erforderlich' : 'Monthly sub required'}
                    values={[FREE_TIER.transportCommission, 8, 5, 3.5]}
                    language={language}
                    highlightIndex={-1}
                  />
                  {/* Disponent - Wallet-Gebühr (Abo-basiert) */}
                  <CommissionTableRow
                    label={language === 'de' ? 'Disponent (Wallet-Gebühr)' : 'Dispatcher (Wallet Fee)'}
                    description={language === 'de' ? 'Monatl. Abo erforderlich' : 'Monthly sub required'}
                    values={[FREE_TIER.walletFee, 3, 2.5, 2]}
                    language={language}
                    highlightIndex={-1}
                  />
                  {/* Verlader - KEIN Abo, nur Auktionsprovision */}
                  <TableRow className="border-border/30 bg-emerald-500/5">
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-4 h-4 text-emerald-500" />
                        {language === 'de' ? 'Verlader (Auktionsprovision)' : 'Shipper (Auction Commission)'}
                      </div>
                    </TableCell>
                    <TableCell colSpan={4} className="text-center">
                      <div className="flex flex-col items-center gap-1 py-1">
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 font-mono text-xs">
                          {verladerFee}% {language === 'de' ? 'auf Zuschlagspreis' : 'on winning bid'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {language === 'de'
                            ? 'Kein monatliches Abo – nur bei erfolgreichem Zuschlag'
                            : 'No monthly subscription – only on successful bid'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      )}
    </div>
  );
}

function CommissionRow({ label, value, language }: { label: string; value: number; language: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant="outline" className="text-[10px] font-mono">
        {value}%
      </Badge>
    </div>
  );
}

function CommissionTableRow({
  label,
  description,
  values,
  language,
  highlightIndex,
}: {
  label: string;
  description?: string;
  values: number[];
  language: string;
  highlightIndex?: number;
}) {
  const tierBadgeClasses = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0',
    'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 border-0',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0',
  ];

  return (
    <TableRow className="border-border/30">
      <TableCell className="font-medium text-sm">
        {label}
        {description && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
        )}
      </TableCell>
      {values.map((val, i) => (
        <TableCell key={i} className="text-center">
          <Badge className={cn('font-mono text-xs', tierBadgeClasses[i])}>
            {val}%
          </Badge>
        </TableCell>
      ))}
    </TableRow>
  );
}
