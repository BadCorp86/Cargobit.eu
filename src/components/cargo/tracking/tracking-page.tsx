'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { shipments, getStatusColor } from '@/lib/mock-data';
import type { Shipment, ShipmentStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  MapPin,
  Package,
  Truck,
  Clock,
  CheckCircle2,
  Circle,
  Phone,
  MessageCircle,
  Navigation,
  Warehouse,
  ArrowRight,
  X,
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

const timelineSteps = [
  { key: 'pending', labelKey: 'pending', icon: Circle },
  { key: 'processing', labelKey: 'processing', icon: Warehouse },
  { key: 'in_transit', labelKey: 'inTransit', icon: Truck },
  { key: 'out_for_delivery', labelKey: 'outForDelivery', icon: Navigation },
  { key: 'delivered', labelKey: 'delivered', icon: CheckCircle2 },
];

export function TrackingPage() {
  const { language } = useCargoBitStore();
  const [trackingInput, setTrackingInput] = useState('CB-DE-2024-001245');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(
    shipments.find((s) => s.trackingNumber === 'CB-DE-2024-001245') || null
  );

  const handleTrack = () => {
    const found = shipments.find(
      (s) => s.trackingNumber.toLowerCase() === trackingInput.toLowerCase() ||
             s.id.toLowerCase() === trackingInput.toLowerCase()
    );
    setSelectedShipment(found || null);
  };

  const currentStepIndex = selectedShipment
    ? timelineSteps.findIndex((step) => step.key === selectedShipment.status)
    : -1;

  const progressPercent = currentStepIndex >= 0 ? ((currentStepIndex + 1) / timelineSteps.length) * 100 : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('tracking', language)}</h1>
        <p className="text-sm text-muted-foreground">{t('liveTracking', language)}</p>
      </div>

      {/* Search */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('trackingNumber', language)}
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                className="pl-9 h-11"
              />
            </div>
            <Button onClick={handleTrack} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25 px-6">
              <Search className="w-4 h-4 mr-2" />
              {t('trackPackage', language)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tracking Result */}
      {selectedShipment ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Shipment Summary Card */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 sm:p-6 text-white">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-lg">{selectedShipment.trackingNumber}</p>
                    <p className="text-white/70 text-sm">{selectedShipment.sender} → {selectedShipment.receiver}</p>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-white pulse-live mr-2" />
                  {t(statusLabels[selectedShipment.status], language)}
                </Badge>
              </div>
            </div>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">{t('estimatedDelivery', language)}</span>
                <span className="text-sm font-bold text-orange-500">
                  {selectedShipment.estimatedDelivery}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2 bg-muted" />
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">{t('from', language)}</span>
                <span className="text-[10px] text-muted-foreground">{Math.round(progressPercent)}%</span>
                <span className="text-[10px] text-muted-foreground">{t('to', language)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline */}
            <div className="lg:col-span-2">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">{t('deliveryTimeline', language)}</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="space-y-0">
                    {timelineSteps.map((step, index) => {
                      const isCompleted = index <= currentStepIndex;
                      const isCurrent = index === currentStepIndex;
                      const StepIcon = step.icon;

                      return (
                        <div key={step.key} className="flex gap-4">
                          {/* Line & Dot */}
                          <div className="flex flex-col items-center">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: index * 0.15 }}
                              className={cn(
                                'w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors',
                                isCompleted
                                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {isCurrent && isCompleted ? (
                                <span className="w-3 h-3 rounded-full bg-white pulse-live" />
                              ) : (
                                <StepIcon className="w-5 h-5" />
                              )}
                            </motion.div>
                            {index < timelineSteps.length - 1 && (
                              <div className={cn(
                                'w-0.5 h-16 transition-colors',
                                index < currentStepIndex ? 'bg-orange-500' : 'bg-muted'
                              )} />
                            )}
                          </div>

                          {/* Content */}
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.15 }}
                            className="pb-8"
                          >
                            <p className={cn(
                              'text-sm font-semibold',
                              isCompleted ? 'text-foreground' : 'text-muted-foreground'
                            )}>
                              {t(step.labelKey, language)}
                            </p>
                            {isCurrent && (
                              <div className="mt-1 flex items-center gap-2">
                                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 text-[10px]">
                                  {language === 'de' ? 'Aktuell' : 'Current'}
                                </Badge>
                              </div>
                            )}
                            {!isCompleted && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {language === 'de' ? 'Ausstehend' : 'Pending'}
                              </p>
                            )}
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Driver & Route Info */}
            <div className="space-y-6">
              {/* Driver Info */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">{t('driverInfo', language)}</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  {selectedShipment.driver ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center border border-orange-200/50">
                          <Truck className="w-6 h-6 text-orange-500" />
                        </div>
                        <div>
                          <p className="font-semibold">{selectedShipment.driver}</p>
                          <p className="text-xs text-muted-foreground">{selectedShipment.vehicle}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 gap-2">
                          <Phone className="w-3.5 h-3.5" />
                          {language === 'de' ? 'Anrufen' : 'Call'}
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 gap-2">
                          <MessageCircle className="w-3.5 h-3.5" />
                          {t('message', language)}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{language === 'de' ? 'Fahrer noch nicht zugewiesen' : 'Driver not yet assigned'}</p>
                  )}
                </CardContent>
              </Card>

              {/* Route Map Placeholder */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">{t('route', language)}</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 h-48 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        <circle cx="40" cy="160" r="8" fill="#F97316" />
                        <circle cx="160" cy="40" r="8" fill="#22C55E" />
                        <path d="M 40 160 Q 60 100 100 80 Q 140 60 160 40" stroke="#F97316" strokeWidth="3" fill="none" strokeDasharray="8 4" className="animate-route" />
                        <circle cx="80" cy="120" r="5" fill="#F97316" opacity="0.5">
                          <animate attributeName="cx" values="40;160" dur="3s" repeatCount="indefinite" />
                          <animate attributeName="cy" values="160;40" dur="3s" repeatCount="indefinite" />
                        </circle>
                      </svg>
                    </div>
                    <div className="text-center z-10">
                      <MapPin className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-orange-600 dark:text-orange-400">{selectedShipment.route}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      ) : (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="py-16 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">{t('noData', language)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
