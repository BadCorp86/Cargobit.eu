'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { shipments, formatCurrency, formatDate, getStatusColor } from '@/lib/mock-data';
import { calculateAIRecommendedPrice, formatEUR } from '@/lib/membership-data';
import type { Shipment, ShipmentStatus, AIPriceRecommendation } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Search,
  Filter,
  Plus,
  Eye,
  ArrowUpDown,
  MapPin,
  Package,
  Truck,
  Calendar,
  User,
  X,
  ChevronRight,
  Sparkles,
  Info,
  Gavel,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusLabels: Record<ShipmentStatus, string> = {
  pending: 'pending',
  processing: 'processing',
  in_transit: 'inTransit',
  out_for_delivery: 'outForDelivery',
  delivered: 'delivered',
  cancelled: 'cancelled',
  returned: 'returned',
};

export function ShipmentsPage() {
  const { language, showCreateShipment, setShowCreateShipment, selectedShipmentId, setSelectedShipmentId } = useCargoBitStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('pickupDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filteredShipments = useMemo(() => {
    let result = [...shipments];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.trackingNumber.toLowerCase().includes(q) ||
          s.sender.toLowerCase().includes(q) ||
          s.receiver.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      result = result.filter((s) => s.priority === priorityFilter);
    }

    result.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'cost') return (a.cost - b.cost) * dir;
      if (sortField === 'weight') return (a.weight - b.weight) * dir;
      if (sortField === 'pickupDate') return (new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime()) * dir;
      return 0;
    });

    return result;
  }, [searchQuery, statusFilter, priorityFilter, sortField, sortDir]);

  const selectedShipment = shipments.find((s) => s.id === selectedShipmentId);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: shipments.length };
    shipments.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('shipments', language)}</h1>
          <p className="text-sm text-muted-foreground">{shipments.length} {t('shipments', language).toLowerCase()}</p>
        </div>
        <Button
          onClick={() => setShowCreateShipment(true)}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('createShipment', language)}
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('search', language)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44 h-10">
                <SelectValue placeholder={t('status', language)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('all', language)} ({statusCounts.all || 0})
                </SelectItem>
                {(Object.keys(statusLabels) as ShipmentStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(statusLabels[status], language)} ({statusCounts[status] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-40 h-10">
                <SelectValue placeholder={t('priority', language)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all', language)}</SelectItem>
                <SelectItem value="standard">{t('standard', language)}</SelectItem>
                <SelectItem value="express">{t('express', language)}</SelectItem>
                <SelectItem value="overnight">{t('overnight', language)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="w-12">#</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="h-auto p-0 font-semibold text-xs" onClick={() => toggleSort('pickupDate')}>
                    {t('date', language)}
                    <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="text-xs font-semibold">{t('trackingNumber', language)}</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">{t('from', language)}</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">{t('to', language)}</TableHead>
                <TableHead className="text-xs font-semibold">{t('status', language)}</TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">
                  <Button variant="ghost" size="sm" className="h-auto p-0 font-semibold text-xs" onClick={() => toggleSort('weight')}>
                    {t('weight', language)}
                    <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="text-xs font-semibold hidden lg:table-cell">
                  <Button variant="ghost" size="sm" className="h-auto p-0 font-semibold text-xs" onClick={() => toggleSort('cost')}>
                    {t('cost', language)}
                    <ArrowUpDown className="w-3 h-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="text-xs font-semibold">{t('actions', language)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShipments.map((shipment, index) => (
                <motion.tr
                  key={shipment.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedShipmentId(shipment.id)}
                >
                  <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="text-sm">{formatDate(shipment.pickupDate)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="text-sm font-mono font-medium">{shipment.trackingNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm max-w-[150px] truncate">{shipment.sender}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm max-w-[150px] truncate">{shipment.receiver}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-[10px] font-medium border-0', getStatusColor(shipment.status))}>
                      {t(statusLabels[shipment.status], language)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{shipment.weight.toLocaleString()} kg</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm font-medium">{formatCurrency(shipment.cost)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedShipmentId(shipment.id); }}>
                      <Eye className="w-4 h-4 text-muted-foreground hover:text-orange-500" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
              {filteredShipments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    {t('noData', language)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Shipment Detail Dialog */}
      <Dialog open={!!selectedShipment} onOpenChange={() => setSelectedShipmentId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
          {selectedShipment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{selectedShipment.trackingNumber}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={cn('text-[10px] border-0', getStatusColor(selectedShipment.status))}>
                        {t(statusLabels[selectedShipment.status], language)}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {selectedShipment.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Route info */}
                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('from', language)}</p>
                      <p className="text-sm font-medium">{selectedShipment.sender}</p>
                      <p className="text-xs text-muted-foreground">{selectedShipment.senderAddress}</p>
                    </div>
                  </div>
                  <div className="border-l-2 border-dashed border-orange-300 dark:border-orange-700 ml-1.5 h-4" />
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('to', language)}</p>
                      <p className="text-sm font-medium">{selectedShipment.receiver}</p>
                      <p className="text-xs text-muted-foreground">{selectedShipment.receiverAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem icon={Calendar} label={t('pickupDate', language)} value={formatDate(selectedShipment.pickupDate)} />
                  <DetailItem icon={Calendar} label={t('estimatedDelivery', language)} value={formatDate(selectedShipment.estimatedDelivery)} />
                  <DetailItem icon={Package} label={t('weight', language)} value={`${selectedShipment.weight.toLocaleString()} kg`} />
                  <DetailItem icon={Package} label={t('dimensions', language)} value={selectedShipment.dimensions} />
                  <DetailItem icon={Truck} label={t('driver', language)} value={selectedShipment.driver || '—'} />
                  <DetailItem icon={Truck} label={t('vehicle', language)} value={selectedShipment.vehicle || '—'} />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('cost', language)}</p>
                    <p className="text-2xl font-bold text-orange-500">{formatCurrency(selectedShipment.cost)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedShipment.insurance ? 'default' : 'secondary'} className={cn(selectedShipment.insurance ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0' : '')}>
                      {t('insurance', language)}: {selectedShipment.insurance ? t('yes', language) : t('no', language)}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Shipment Dialog */}
      <CreateShipmentDialog open={showCreateShipment} onOpenChange={setShowCreateShipment} />
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function CreateShipmentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { language } = useCargoBitStore();
  const [step, setStep] = useState(1);

  // Form state
  const [weight, setWeight] = useState<string>('');
  const [length, setLength] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [cargoType, setCargoType] = useState<'palette' | 'vehicle' | 'bulk' | 'container' | 'hazardous' | 'refrigerated'>('palette');
  const [priority, setPriority] = useState<'standard' | 'express' | 'overnight'>('standard');
  const [shipmentType, setShipmentType] = useState<'direct' | 'auction'>('direct');
  const [price, setPrice] = useState<string>('');
  const [auctionDuration, setAuctionDuration] = useState<string>('48');
  const [hasUserEditedPrice, setHasUserEditedPrice] = useState(false);

  // Calculate AI recommendation using useMemo (derived state)
  const aiRecommendation = useMemo(() => {
    if (step < 2) return null;
    const w = parseFloat(weight) || 0;
    if (w <= 0) return null;
    return calculateAIRecommendedPrice({
      distance: 350, // default distance for demo
      weight: w,
      priority,
    });
  }, [weight, priority, step]);

  // Display price: user-entered price, or AI recommendation if not manually edited
  const displayPrice = hasUserEditedPrice ? price : (aiRecommendation ? aiRecommendation.recommendedPrice.toFixed(2) : price);

  const handlePriceChange = (val: string) => {
    setPrice(val);
    setHasUserEditedPrice(true);
  };

  const applyRecommendation = () => {
    if (aiRecommendation) {
      setPrice(aiRecommendation.recommendedPrice.toFixed(2));
      setHasUserEditedPrice(true);
    }
  };

  const resetForm = useCallback(() => {
    setStep(1);
    setWeight('');
    setLength('');
    setWidth('');
    setHeight('');
    setCargoType('palette');
    setPriority('standard');
    setShipmentType('direct');
    setPrice('');
    setAuctionDuration('48');
    setHasUserEditedPrice(false);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-orange-500" />
            {t('createShipment', language)}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                step >= s ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground'
              )}>
                {s}
              </div>
              {s < 3 && <div className={cn('flex-1 h-0.5 rounded', step > s ? 'bg-orange-500' : 'bg-muted')} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('sender', language)}</Label>
              <Input placeholder={t('sender', language)} />
            </div>
            <div className="space-y-2">
              <Label>{t('senderAddress', language)}</Label>
              <Input placeholder={t('senderAddress', language)} />
            </div>
            <div className="space-y-2">
              <Label>{t('receiver', language)}</Label>
              <Input placeholder={t('receiver', language)} />
            </div>
            <div className="space-y-2">
              <Label>{t('receiverAddress', language)}</Label>
              <Input placeholder={t('receiverAddress', language)} />
            </div>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setStep(2)}>
              {t('continue', language)}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {/* Sendungsart-Auswahl */}
            <div className="space-y-2">
              <Label>{language === 'de' ? 'Art der Sendung' : 'Cargo Type'}</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'palette', labelDe: 'Palette', labelEn: 'Pallet', icon: Package },
                  { id: 'vehicle', labelDe: 'Fahrzeug', labelEn: 'Vehicle', icon: Truck },
                  { id: 'bulk', labelDe: 'Schüttgut', labelEn: 'Bulk', icon: Package },
                  { id: 'container', labelDe: 'Container', labelEn: 'Container', icon: Package },
                  { id: 'hazardous', labelDe: 'Gefahrgut', labelEn: 'Hazardous', icon: AlertTriangle },
                  { id: 'refrigerated', labelDe: 'Kühlung', labelEn: 'Refrigerated', icon: Package },
                ].map((type) => {
                  const TypeIcon = type.icon;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setCargoType(type.id as typeof cargoType)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200',
                        cargoType === type.id
                          ? 'border-orange-500 bg-orange-500/5'
                          : 'border-border/50 bg-card/50 hover:border-orange-300'
                      )}
                    >
                      <TypeIcon className={cn('w-4 h-4', cargoType === type.id ? 'text-orange-500' : 'text-muted-foreground')} />
                      <span className={cn('text-xs font-medium', cargoType === type.id ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground')}>
                        {language === 'de' ? type.labelDe : type.labelEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('weight', language)} (kg)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'de' ? 'Volumen (m³)' : 'Volume (m³)'}</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={length && width && height ? ((parseFloat(length) * parseFloat(width) * parseFloat(height)) / 1000000).toFixed(2) : ''}
                  readOnly
                  className="bg-muted/50"
                />
              </div>
            </div>

            {/* 3 separate Maße-Felder */}
            <div className="space-y-2">
              <Label>{language === 'de' ? 'Abmessungen (cm)' : 'Dimensions (cm)'}</Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Input
                    type="number"
                    placeholder={language === 'de' ? 'Länge' : 'Length'}
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground text-center block">{language === 'de' ? 'Länge' : 'Length'}</span>
                </div>
                <div className="space-y-1">
                  <Input
                    type="number"
                    placeholder={language === 'de' ? 'Breite' : 'Width'}
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground text-center block">{language === 'de' ? 'Breite' : 'Width'}</span>
                </div>
                <div className="space-y-1">
                  <Input
                    type="number"
                    placeholder={language === 'de' ? 'Höhe' : 'Height'}
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground text-center block">{language === 'de' ? 'Höhe' : 'Height'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('priority', language)}</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as 'standard' | 'express' | 'overnight')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{t('standard', language)}</SelectItem>
                  <SelectItem value="express">{t('express', language)}</SelectItem>
                  <SelectItem value="overnight">{t('overnight', language)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="insurance" className="rounded" />
              <Label htmlFor="insurance">{t('insurance', language)}</Label>
            </div>

            {/* AI Price Recommendation */}
            {aiRecommendation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                      {t('aiPriceRecommendation', language)}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      {t('basedOnFactors', language)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      {formatEUR(aiRecommendation.recommendedPrice)}
                    </p>
                    <Badge className="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 border-0 text-[10px]">
                      {t('recommended', language)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    {language === 'de' ? `Distanz: 350 km` : `Distance: 350 km`}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    {t('weight', language)}: {weight} kg
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    {t('priority', language)}: {t(priority, language)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    {t('bidFloor', language)}: {formatEUR(aiRecommendation.bidFloor)}
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                {t('back', language)}
              </Button>
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setStep(3)}>
                {t('continue', language)}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {/* Shipment Type */}
            <div className="space-y-2">
              <Label>{t('shipmentType', language)}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShipmentType('direct')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                    shipmentType === 'direct'
                      ? 'border-orange-500 bg-orange-500/5'
                      : 'border-border/50 bg-card/50 hover:border-orange-300'
                  )}
                >
                  <Truck className={cn('w-5 h-5', shipmentType === 'direct' ? 'text-orange-500' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium', shipmentType === 'direct' ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground')}>
                    {t('directTransport', language)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShipmentType('auction')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                    shipmentType === 'auction'
                      ? 'border-orange-500 bg-orange-500/5'
                      : 'border-border/50 bg-card/50 hover:border-orange-300'
                  )}
                >
                  <Gavel className={cn('w-5 h-5', shipmentType === 'auction' ? 'text-orange-500' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium', shipmentType === 'auction' ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground')}>
                    {t('auctionShipment', language)}
                  </span>
                </button>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label>{t('yourPrice', language)} (EUR)</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={displayPrice}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="pr-4 text-lg font-semibold"
                />
                {aiRecommendation && (
                  <button
                    type="button"
                    onClick={applyRecommendation}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-orange-500 hover:text-orange-600 font-medium px-2 py-1 rounded-md bg-orange-500/10 hover:bg-orange-500/15 transition-colors"
                  >
                    {t('recommended', language)}
                  </button>
                )}
              </div>
            </div>

            {/* Auction specific fields */}
            {shipmentType === 'auction' && aiRecommendation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                {/* Auction Info */}
                <div className="rounded-xl bg-muted/30 border border-border/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-orange-500" />
                    <p className="text-sm font-semibold">{t('auctionInfo', language)}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('startPrice', language)}</span>
                      <span className="font-semibold">{formatEUR(parseFloat(price) || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('minBidForBidders', language)}</span>
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 text-xs">
                        {formatEUR(aiRecommendation.bidFloor)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Auction Duration */}
                <div className="space-y-2">
                  <Label>{t('auctionDuration', language)}</Label>
                  <Select value={auctionDuration} onValueChange={setAuctionDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">{t('hours24', language)}</SelectItem>
                      <SelectItem value="48">{t('hours48', language)}</SelectItem>
                      <SelectItem value="72">{t('hours72', language)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              <Label>{t('pickupDate', language)}</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label>{t('description', language)}</Label>
              <Textarea rows={3} placeholder={t('description', language)} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                {t('back', language)}
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25"
                onClick={() => onOpenChange(false)}
              >
                {t('createShipment', language)}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
