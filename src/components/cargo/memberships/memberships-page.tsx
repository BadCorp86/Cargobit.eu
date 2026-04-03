'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { membershipPlans, formatEUR, getTransportCommission, getWalletFee } from '@/lib/membership-data';
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
  Phone,
  Mail,
  Globe,
  X,
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

      {/* Pricing Cards */}
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
              transition={{ duration: 0.5, delay: index * 0.1 }}
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
                    {isYearly && (
                      <Badge className="mt-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-[10px]">
                        {t('twoMonthsFree', language)}
                      </Badge>
                    )}
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

                  {/* Commission rates */}
                  <div>
                    <p className="text-sm font-semibold mb-3">{t('transportCommission', language)}</p>
                    <div className="space-y-2">
                      <CommissionRow
                        label={language === 'de' ? 'Spediteur' : 'Dispatcher'}
                        value={plan.transportCommission.dispatcher}
                        language={language}
                      />
                      <CommissionRow
                        label={language === 'de' ? 'Transportunternehmer' : 'Shipper'}
                        value={plan.transportCommission.shipper}
                        language={language}
                      />
                      <CommissionRow
                        label={language === 'de' ? 'Fahrer (Wallet)' : 'Driver (Wallet)'}
                        value={plan.walletFee.driver}
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

      {/* Current Plan Summary */}
      {currentMembership !== 'free' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 rounded-2xl max-w-6xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {t('currentPlan', language)}: {t(currentMembership, language)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {currentMembership === 'free'
                      ? (language === 'de' ? 'Kostenlos - 5 Sendungen/Monat' : 'Free - 5 Shipments/month')
                      : `${isYearly ? t('yearly', language) : t('monthly', language)} - ${t('twoMonthsFree', language)}`
                    }
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                  {t('freeTrial', language)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t('freeTrialDesc', language)}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Commission Structure Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
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
                  <CommissionTableRow
                    label={language === 'de' ? 'Spediteur (Transportprovision)' : 'Dispatcher (Transport Commission)'}
                    starter={8}
                    professional={5}
                    enterprise={2}
                    language={language}
                  />
                  <CommissionTableRow
                    label={language === 'de' ? 'Transportunternehmer (Transportprovision)' : 'Shipper (Transport Commission)'}
                    starter={6}
                    professional={4}
                    enterprise={1.5}
                    language={language}
                  />
                  <CommissionTableRow
                    label={language === 'de' ? 'Fahrer (Wallet-Gebühr)' : 'Driver (Wallet Fee)'}
                    starter={3}
                    professional={2}
                    enterprise={0.5}
                    language={language}
                  />
                  <CommissionTableRow
                    label={language === 'de' ? 'Admin / Support' : 'Admin / Support'}
                    starter={0}
                    professional={0}
                    enterprise={0}
                    language={language}
                    isHighlighted={false}
                  />
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
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
  starter,
  professional,
  enterprise,
  language,
}: {
  label: string;
  starter: number;
  professional: number;
  enterprise: number;
  language: string;
  isHighlighted?: boolean;
}) {
  return (
    <TableRow className="border-border/30">
      <TableCell className="font-medium text-sm">{label}</TableCell>
      <TableCell className="text-center">
        <Badge variant="outline" className="font-mono text-xs">
          {starter}%
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 font-mono text-xs">
          {professional}%
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0 font-mono text-xs">
          {enterprise}%
        </Badge>
      </TableCell>
    </TableRow>
  );
}
