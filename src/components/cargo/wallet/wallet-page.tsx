'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/mock-data';
import { walletTransactions, walletInvoices, paymentMethods } from '@/lib/mock-data-wallet';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Building2,
  FileText,
  TrendingUp,
  TrendingDown,
  Plus,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Banknote,
  Receipt,
  Landmark,
} from 'lucide-react';

const txTypeIcons: Record<string, React.ElementType> = {
  transport_fee: ArrowUpRight,
  commission: TrendingDown,
  auction_fee: Receipt,
  express_surcharge: Clock,
  refund: ArrowDownLeft,
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
};

const txTypeColors: Record<string, string> = {
  transport_fee: 'text-red-500',
  commission: 'text-green-500',
  auction_fee: 'text-blue-500',
  express_surcharge: 'text-orange-500',
  refund: 'text-emerald-500',
  deposit: 'text-green-500',
  withdrawal: 'text-red-500',
};

const txStatusIcons: Record<string, React.ElementType> = {
  completed: CheckCircle2,
  pending: Clock,
  failed: XCircle,
};

const txStatusColors: Record<string, string> = {
  completed: 'text-green-500',
  pending: 'text-yellow-500',
  failed: 'text-red-500',
};

const invoiceStatusColors: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function WalletPage() {
  const { language, currentRole } = useCargoBitStore();
  const [txFilter, setTxFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const balance = 24671.50;
  const pendingBalance = 2322.00;
  const availableBalance = balance - pendingBalance;
  const monthlyIncome = 15000.00;
  const monthlyExpense = 12448.50;
  const totalCommission = 603.98;

  const filteredTxs = walletTransactions
    .filter((tx) => txFilter === 'all' || tx.type === txFilter)
    .filter((tx) =>
      searchQuery === '' ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.reference.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Balance Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500 to-amber-500 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-white/80">{t('walletBalance', language)}</p>
                <WalletIcon className="w-5 h-5 text-white/80" />
              </div>
              <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
              <p className="text-xs text-white/60 mt-1">EUR</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">{t('availableBalance', language)}</p>
                <ChevronUp className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(availableBalance)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">{t('monthlyIncome', language)}</p>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(monthlyIncome)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">{t('totalCommission', language) || 'Gesamtprovision'}</p>
                <TrendingDown className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalCommission)}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/20">
              <Plus className="w-4 h-4" />
              {t('topUp', language)}
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-green-500" />
                {t('topUp', language)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>{t('amount', language)}</Label>
                <Input placeholder="0.00" type="number" className="mt-1.5" />
              </div>
              <div>
                <Label>{t('paymentMethods', language)}</Label>
                <Select defaultValue="bank">
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">{t('bankTransfer', language)}</SelectItem>
                    <SelectItem value="sepa">{t('sepa', language)}</SelectItem>
                    <SelectItem value="card">{t('creditCard', language)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
                {t('topUp', language)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <ArrowUpRight className="w-4 h-4" />
              {t('withdraw', language)}
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-red-500" />
                {t('withdraw', language)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>{t('amount', language)}</Label>
                <Input placeholder="0.00" type="number" className="mt-1.5" />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('availableBalance', language)}: {formatCurrency(availableBalance)}
              </p>
              <Button className="w-full">{t('withdraw', language)}</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" className="gap-2 ml-auto">
          <Download className="w-4 h-4" />
          {t('exportCSV', language)}
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="transactions">{t('transactionHistory', language)}</TabsTrigger>
          <TabsTrigger value="invoices">{t('invoices', language)}</TabsTrigger>
          <TabsTrigger value="methods">{t('paymentMethods', language)}</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('search', language)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={txFilter} onValueChange={setTxFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all', language)}</SelectItem>
                <SelectItem value="transport_fee">{t('transportFee', language)}</SelectItem>
                <SelectItem value="commission">{t('commission', language)}</SelectItem>
                <SelectItem value="auction_fee">{t('auctionFee', language)}</SelectItem>
                <SelectItem value="express_surcharge">{t('expressSurcharge', language)}</SelectItem>
                <SelectItem value="refund">{t('refund', language)}</SelectItem>
                <SelectItem value="deposit">{t('deposit', language)}</SelectItem>
                <SelectItem value="withdrawal">{t('withdrawal', language)}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transaction List */}
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {filteredTxs.map((tx, idx) => {
                  const TxIcon = txTypeIcons[tx.type] || AlertCircle;
                  const StatusIcon = txStatusIcons[tx.status] || Clock;
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', tx.amount >= 0 ? 'bg-green-500/10' : 'bg-red-500/10')}>
                        <TxIcon className={cn('w-5 h-5', txTypeColors[tx.type])} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tx.reference}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn('text-sm font-semibold', tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                          {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <StatusIcon className={cn('w-3 h-3', txStatusColors[tx.status])} />
                          <p className="text-[10px] text-muted-foreground">{formatDateTime(tx.createdAt)}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {filteredTxs.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <WalletIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t('noData', language)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card className="glass-card overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {walletInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{inv.invoiceNumber}</p>
                        <Badge className={cn('text-[10px]', invoiceStatusColors[inv.status])}>
                          {t(inv.status, language)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{inv.customerName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatCurrency(inv.amount)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t('date', language)}: {new Date(inv.dueDate).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentMethods.map((pm) => {
              const icon = pm.type === 'bank_transfer' ? Building2 : pm.type === 'sepa' ? Landmark : CreditCard;
              const Icon = icon;
              return (
                <Card key={pm.id} className={cn('glass-card hover:shadow-lg transition-shadow', pm.isDefault && 'ring-2 ring-orange-500/50')}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-orange-500" />
                      </div>
                      {pm.isDefault && (
                        <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px]">
                          Standard
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold">{pm.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{pm.details}</p>
                  </CardContent>
                </Card>
              );
            })}
            <Card className="glass-card border-dashed border-2 border-muted-foreground/20 flex items-center justify-center min-h-[140px] cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/5 transition-all">
              <div className="text-center">
                <Plus className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">{t('addPaymentMethod', language)}</p>
              </div>
            </Card>
          </div>

          {/* Commission Rates Info */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Banknote className="w-5 h-5 text-orange-500" />
                {t('commissionOverview', language)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: t('transportFee', language), rate: '5 – 8 %', desc: language === 'de' ? 'Pro Transport' : 'Per Transport' },
                  ...(currentRole === 'shipper' ? [{ label: t('auctionFee', language), rate: '3 – 5 %', desc: language === 'de' ? 'Pro Auktion' : 'Per Auction' }] : []),
                  { label: t('expressSurcharge', language), rate: '+ 2 %', desc: language === 'de' ? 'Express-Aufschlag' : 'Express Surcharge' },
                  { label: t('refund', language), rate: '100 %', desc: language === 'de' ? 'Vollständige Rückerstattung' : 'Full Refund' },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                    <p className="text-sm font-medium mt-1">{item.label}</p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-0.5">{item.rate}</p>
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
