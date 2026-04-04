'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { capacityMatches, routeOptimizations, fleetVehicles, fleetDrivers } from '@/lib/mock-data';
import { formatNumber } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Truck,
  Package,
  Target,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Route,
  Clock,
  MapPin,
  ArrowRight,
  Zap,
  BarChart3,
  Gauge,
  Box,
  Weight,
  Edit3,
  Save,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Animated Circular Progress ────────────────────────────────────────────────
function AnimatedCircularProgress({
  value,
  size = 52,
  strokeWidth = 5,
  delay = 0,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  delay?: number;
}) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;

  const color =
    value > 80
      ? '#22c55e'
      : value >= 50
        ? '#eab308'
        : '#ef4444';

  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0;
      const duration = 1200;
      const steps = 60;
      const increment = value / steps;
      const interval = setInterval(() => {
        start += increment;
        if (start >= value) {
          setAnimatedValue(value);
          clearInterval(interval);
        } else {
          setAnimatedValue(Math.round(start));
        }
      }, duration / steps);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-100 ease-out"
          style={{
            filter: `drop-shadow(0 0 4px ${color}40)`,
          }}
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>
        {animatedValue}
      </span>
    </div>
  );
}

// ─── Capacity Bar ──────────────────────────────────────────────────────────────
function CapacityBar({
  used,
  total,
  unit,
  language,
}: {
  used: number;
  total: number;
  unit: string;
  language: string;
}) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const free = total - used;
  const barColor =
    pct < 50
      ? 'bg-green-500'
      : pct < 80
        ? 'bg-yellow-500'
        : 'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {formatNumber(used)}/{formatNumber(total)} {unit}
        </span>
        <span className="font-medium text-foreground">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', barColor)}
        />
      </div>
    </div>
  );
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function CapacityKPICard({
  label,
  value,
  suffix,
  icon: Icon,
  color,
  index,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ElementType;
  color: string;
  index: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const numVal = typeof value === 'number' ? value : parseInt(String(value), 10);
    if (isNaN(numVal)) return;
    const duration = 1200;
    const steps = 50;
    const increment = numVal / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numVal) {
        setDisplay(numVal);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  const displayValue = typeof value === 'number' ? display : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-orange-300/50 dark:hover:border-orange-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5 group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border',
                color
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight">
            {displayValue}
            {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Driver Free Capacity Card ("3 Paletten frei" style) ─────────────────────────────────────
interface DriverCapacityCardProps {
  vehicle: typeof fleetVehicles[0];
  driver: typeof fleetDrivers[0] | undefined;
  language: string;
  onUpdateCapacity: (vehicleId: string, freeWeight: number, freeVolume: number, freePallets: number) => void;
}

function DriverCapacityCard({ vehicle, driver, language, onUpdateCapacity }: DriverCapacityCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editWeight, setEditWeight] = useState(vehicle.maxWeight - vehicle.currentWeight);
  const [editVolume, setEditVolume] = useState(vehicle.maxVolume - vehicle.currentVolume);
  const [editPallets, setEditPallets] = useState(Math.floor((vehicle.maxVolume - vehicle.currentVolume) / 2));

  const freeWeight = vehicle.maxWeight - vehicle.currentWeight;
  const freeVolume = vehicle.maxVolume - vehicle.currentVolume;
  const freePallets = Math.floor(freeVolume / 2);
  const utilPercent = Math.round((vehicle.currentWeight / vehicle.maxWeight) * 100);

  const statusColor = vehicle.status === 'active' ? 'bg-green-500' : 
                      vehicle.status === 'loading' ? 'bg-yellow-500' :
                      vehicle.status === 'parked' ? 'bg-gray-400' : 'bg-red-500';

  const handleSave = () => {
    onUpdateCapacity(vehicle.id, editWeight, editVolume, editPallets);
    setIsEditing(false);
    toast.success(language === 'de' ? 'Kapazität aktualisiert' : 'Capacity updated', {
      description: `${vehicle.plate}: ${editWeight}kg, ${editVolume}m³, ${editPallets} Paletten frei`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300"
    >
      {/* Status indicator */}
      <div className={cn('absolute top-0 left-0 right-0 h-1', statusColor)} />
      
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center border border-orange-200/30 dark:border-orange-800/30">
              <Truck className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">{vehicle.plate}</p>
              <p className="text-xs text-muted-foreground">{vehicle.make} {vehicle.model}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn(
            'text-[10px] px-2',
            vehicle.status === 'active' && 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400',
            vehicle.status === 'loading' && 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400',
            vehicle.status === 'parked' && 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400',
          )}>
            {vehicle.status}
          </Badge>
        </div>

        {/* Driver info */}
        {driver && (
          <div className="mb-3 pb-3 border-b border-border/30">
            <p className="text-xs text-muted-foreground">{language === 'de' ? 'Fahrer' : 'Driver'}: <span className="font-medium text-foreground">{driver.name}</span></p>
            {vehicle.currentRoute && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                <MapPin className="w-3 h-3 inline mr-1" />
                {vehicle.currentRoute}
              </p>
            )}
          </div>
        )}

        {/* Free Capacity Display - "3 Paletten frei" style */}
        {!isEditing ? (
          <div className="space-y-3">
            {/* Main "X Paletten frei" Display */}
            <div className="flex items-center justify-center py-3 px-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200/30 dark:border-green-800/30">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(freePallets, 6))].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
                    >
                      <Box className="w-6 h-6 text-green-500" />
                    </motion.div>
                  ))}
                  {freePallets > 6 && (
                    <span className="text-sm font-medium text-green-600 dark:text-green-400 ml-1">
                      +{freePallets - 6}
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {freePallets}
                  </p>
                  <p className="text-xs text-green-600/70 dark:text-green-400/70">
                    {language === 'de' ? 'Paletten frei' : 'Pallets free'}
                  </p>
                </div>
              </div>
            </div>

            {/* Weight and Volume */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Weight className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-lg font-bold">{formatNumber(freeWeight)}</p>
                  <p className="text-[10px] text-muted-foreground">kg {language === 'de' ? 'frei' : 'free'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Box className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-lg font-bold">{freeVolume}</p>
                  <p className="text-[10px] text-muted-foreground">m³ {language === 'de' ? 'frei' : 'free'}</p>
                </div>
              </div>
            </div>

            {/* Utilization bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{language === 'de' ? 'Auslastung' : 'Utilization'}</span>
                <span className={cn(
                  'font-medium',
                  utilPercent < 50 ? 'text-green-500' : utilPercent < 80 ? 'text-yellow-500' : 'text-red-500'
                )}>{utilPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${utilPercent}%` }}
                  transition={{ duration: 0.8 }}
                  className={cn(
                    'h-full rounded-full',
                    utilPercent < 50 ? 'bg-green-500' : utilPercent < 80 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                />
              </div>
            </div>

            {/* Edit button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" />
              {language === 'de' ? 'Kapazität bearbeiten' : 'Edit Capacity'}
            </Button>
          </div>
        ) : (
          /* Edit Mode */
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">{language === 'de' ? 'Freies Gewicht (kg)' : 'Free Weight (kg)'}</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditWeight(Math.max(0, editWeight - 100))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  value={editWeight}
                  onChange={(e) => setEditWeight(parseInt(e.target.value) || 0)}
                  className="flex-1 h-8 text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditWeight(Math.min(vehicle.maxWeight, editWeight + 100))}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">{language === 'de' ? 'Freies Volumen (m³)' : 'Free Volume (m³)'}</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditVolume(Math.max(0, editVolume - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  value={editVolume}
                  onChange={(e) => setEditVolume(parseInt(e.target.value) || 0)}
                  className="flex-1 h-8 text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditVolume(Math.min(vehicle.maxVolume, editVolume + 1))}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{language === 'de' ? 'Freie Paletten' : 'Free Pallets'}</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditPallets(Math.max(0, editPallets - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  value={editPallets}
                  onChange={(e) => setEditPallets(parseInt(e.target.value) || 0)}
                  className="flex-1 h-8 text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditPallets(editPallets + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8"
                onClick={() => setIsEditing(false)}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                {language === 'de' ? 'Abbrechen' : 'Cancel'}
              </Button>
              <Button
                size="sm"
                className="flex-1 h-8 bg-orange-500 hover:bg-orange-600"
                onClick={handleSave}
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                {language === 'de' ? 'Speichern' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function CapacityPage() {
  const { language } = useCargoBitStore();
  const lang = language || 'de';

  // Filter state
  const [minScore, setMinScore] = useState<string>('0');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [etaFilter, setEtaFilter] = useState<string>('all');
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());
  
  // Vehicle capacities state (for updates)
  const [vehicleCapacities, setVehicleCapacities] = useState(() => {
    const map = new Map<string, { freeWeight: number; freeVolume: number; freePallets: number }>();
    fleetVehicles.forEach(v => {
      map.set(v.id, {
        freeWeight: v.maxWeight - v.currentWeight,
        freeVolume: v.maxVolume - v.currentVolume,
        freePallets: Math.floor((v.maxVolume - v.currentVolume) / 2),
      });
    });
    return map;
  });

  // KPI calculations
  const kpis = useMemo(() => {
    const activeVehicles = fleetVehicles.filter((v) => v.status === 'active');
    const totalFreeWeight = activeVehicles.reduce((sum, v) => sum + (vehicleCapacities.get(v.id)?.freeWeight || (v.maxWeight - v.currentWeight)), 0);
    const totalFreeVolume = activeVehicles.reduce((sum, v) => sum + (vehicleCapacities.get(v.id)?.freeVolume || (v.maxVolume - v.currentVolume)), 0);
    const totalFreePallets = activeVehicles.reduce((sum, v) => sum + (vehicleCapacities.get(v.id)?.freePallets || Math.floor((v.maxVolume - v.currentVolume) / 2)), 0);
    const pendingShipments = new Set(capacityMatches.map((m) => m.shipmentId)).size;
    const optimalMatches = capacityMatches.filter((m) => m.matchScore > 80).length;
    const avgScore =
      capacityMatches.length > 0
        ? Math.round(capacityMatches.reduce((sum, m) => sum + m.matchScore, 0) / capacityMatches.length)
        : 0;
    return { totalFreeWeight, totalFreeVolume, totalFreePallets, pendingShipments, optimalMatches, avgScore };
  }, [vehicleCapacities]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    return [...capacityMatches]
      .filter((m) => {
        if (parseInt(minScore) > 0 && m.matchScore < parseInt(minScore)) return false;
        if (priorityFilter !== 'all' && m.priority !== priorityFilter) return false;
        if (etaFilter === 'yes' && !m.etaOverlap) return false;
        if (etaFilter === 'no' && m.etaOverlap) return false;
        return true;
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [minScore, priorityFilter, etaFilter]);

  // Chart data from active vehicles
  const chartData = useMemo(() => {
    return fleetVehicles
      .filter((v) => v.status === 'active')
      .map((v) => ({
        name: v.plate,
        usedWeight: v.currentWeight,
        freeWeight: vehicleCapacities.get(v.id)?.freeWeight || (v.maxWeight - v.currentWeight),
        usedVolume: v.currentVolume,
        freeVolume: vehicleCapacities.get(v.id)?.freeVolume || (v.maxVolume - v.currentVolume),
        utilization: Math.round((v.currentWeight / v.maxWeight) * 100),
      }));
  }, [vehicleCapacities]);

  // Active vehicles with drivers for capacity cards
  const activeVehiclesWithDrivers = useMemo(() => {
    return fleetVehicles
      .filter(v => v.status === 'active' || v.status === 'loading')
      .map(vehicle => ({
        vehicle,
        driver: fleetDrivers.find(d => d.currentVehicle === vehicle.id),
      }));
  }, []);

  const toggleRoute = (vehicleId: string) => {
    setExpandedRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(vehicleId)) {
        next.delete(vehicleId);
      } else {
        next.add(vehicleId);
      }
      return next;
    });
  };

  const handleAssign = (matchId: string, tracking: string) => {
    toast.success(t('shipmentAssigned', lang), {
      description: `${tracking} → ${matchId}`,
    });
  };

  const handleUpdateCapacity = (vehicleId: string, freeWeight: number, freeVolume: number, freePallets: number) => {
    setVehicleCapacities(prev => {
      const next = new Map(prev);
      next.set(vehicleId, { freeWeight, freeVolume, freePallets });
      return next;
    });
  };

  const getScoreBadgeClass = (score: number) => {
    if (score > 80) return 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
    if (score >= 50) return 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
    return 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'express':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'overnight':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    }
  };

  const getUtilColor = (pct: number) => {
    if (pct < 50) return '#22c55e';
    if (pct < 80) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 p-6 sm:p-8 text-white"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 blur-xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Zap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t('capacityMatching', lang)}</h1>
            <p className="text-white/80 text-sm mt-1">
              {t('smartMatching', lang)} — {filteredMatches.length} {t('shipments', lang)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <CapacityKPICard
          label={t('availableCapacity', lang)}
          value={formatNumber(kpis.totalFreeWeight)}
          suffix="kg"
          icon={Truck}
          color="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-200/30 dark:border-orange-800/30 text-orange-500"
          index={0}
        />
        <CapacityKPICard
          label={lang === 'de' ? 'Freie Paletten' : 'Free Pallets'}
          value={kpis.totalFreePallets}
          icon={Box}
          color="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200/30 dark:border-green-800/30 text-green-500"
          index={1}
        />
        <CapacityKPICard
          label={t('pendingShipments', lang)}
          value={kpis.pendingShipments}
          icon={Package}
          color="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200/30 dark:border-blue-800/30 text-blue-500"
          index={2}
        />
        <CapacityKPICard
          label={t('optimalMatches', lang)}
          value={kpis.optimalMatches}
          icon={Target}
          color="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-200/30 dark:border-green-800/30 text-green-500"
          index={3}
        />
        <CapacityKPICard
          label={t('avgMatchScore', lang)}
          value={kpis.avgScore}
          suffix="%"
          icon={TrendingUp}
          color="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200/30 dark:border-purple-800/30 text-purple-500"
          index={4}
        />
      </div>

      {/* Driver Free Capacity Section - "3 Paletten frei" style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                  <Box className="w-4 h-4 text-green-500" />
                </div>
                {lang === 'de' ? 'Freie Kapazitäten' : 'Free Capacity'} — {lang === 'de' ? 'Fahrer Übersicht' : 'Driver Overview'}
                <Badge variant="secondary" className="ml-2 text-xs bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 border-0">
                  {activeVehiclesWithDrivers.length} {lang === 'de' ? 'aktiv' : 'active'}
                </Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeVehiclesWithDrivers.map(({ vehicle, driver }, index) => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <DriverCapacityCard
                    vehicle={vehicle}
                    driver={driver}
                    language={lang}
                    onUpdateCapacity={handleUpdateCapacity}
                  />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Smart Matching Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Gauge className="w-5 h-5 text-orange-500" />
                {t('smartMatching', lang)}
                <Badge variant="secondary" className="ml-2 text-xs bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 border-0">
                  {filteredMatches.length}
                </Badge>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{t('minScore', lang)}:</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                    className="w-16 h-8 text-xs"
                    placeholder="0"
                  />
                </div>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue placeholder={t('priority', lang)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allPriorities', lang)}</SelectItem>
                    <SelectItem value="standard">{t('standard', lang)}</SelectItem>
                    <SelectItem value="express">{t('express', lang)}</SelectItem>
                    <SelectItem value="overnight">{t('overnight', lang)}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={etaFilter} onValueChange={setEtaFilter}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue placeholder={t('etaOverlap', lang)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allEta', lang)}</SelectItem>
                    <SelectItem value="yes">{t('yesOverlap', lang)}</SelectItem>
                    <SelectItem value="no">{t('noOverlap', lang)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-6">
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                  <div className="col-span-3">{t('vehicle', lang)} / {t('route', lang)}</div>
                  <div className="col-span-2">{t('availableCapacity', lang)}</div>
                  <div className="col-span-2">{t('shipments', lang)}</div>
                  <div className="col-span-2">{t('pickupCity', lang)} → {t('deliveryCity', lang)}</div>
                  <div className="col-span-1 text-center">{t('matchScore', lang)}</div>
                  <div className="col-span-1 text-center">{t('etaOverlap', lang)}</div>
                  <div className="col-span-1 text-center">{t('actions', lang)}</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {filteredMatches.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                      {t('noData', lang)}
                    </div>
                  ) : (
                    filteredMatches.map((match, index) => (
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-muted/30 transition-colors duration-200 group"
                      >
                        {/* Vehicle + Route */}
                        <div className="col-span-3 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/10 to-amber-500/10 flex items-center justify-center shrink-0">
                              <Truck className="w-4 h-4 text-orange-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{match.vehiclePlate}</p>
                              {match.vehicleRoute && (
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {match.vehicleRoute.split(' → ').slice(0, 3).join(' → ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Available Capacity */}
                        <div className="col-span-2 space-y-1.5">
                          <CapacityBar
                            used={match.shipmentWeight}
                            total={match.availableWeight}
                            unit="kg"
                            language={lang}
                          />
                          <div className="text-[10px] text-muted-foreground">
                            {match.shipmentVolume}/{match.availableVolume} m³
                          </div>
                        </div>

                        {/* Shipment Details */}
                        <div className="col-span-2 min-w-0">
                          <p className="text-xs font-mono font-medium truncate">{match.shipmentTracking}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border', getPriorityBadgeClass(match.priority))}>
                              {t(match.priority === 'standard' ? 'standard' : match.priority === 'express' ? 'express' : 'overnight', lang)}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {formatNumber(match.shipmentWeight)} kg
                            </span>
                          </div>
                        </div>

                        {/* Pickup / Delivery */}
                        <div className="col-span-2 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs">
                            <MapPin className="w-3 h-3 text-green-500 shrink-0" />
                            <span className="truncate">{match.pickupCity}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs mt-0.5">
                            <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                            <span className="truncate">{match.deliveryCity}</span>
                          </div>
                        </div>

                        {/* Match Score */}
                        <div className="col-span-1 flex justify-center">
                          <AnimatedCircularProgress
                            value={match.matchScore}
                            size={48}
                            strokeWidth={4}
                            delay={index * 50}
                          />
                        </div>

                        {/* ETA Overlap */}
                        <div className="col-span-1 flex justify-center">
                          {match.etaOverlap ? (
                            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                          )}
                        </div>

                        {/* Action */}
                        <div className="col-span-1 flex justify-center">
                          <Button
                            size="sm"
                            className="h-7 px-3 text-xs bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm shadow-orange-500/20 transition-all duration-200"
                            onClick={() => handleAssign(match.id, match.shipmentTracking)}
                          >
                            {t('assign', lang)}
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Route Optimization + Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Route Optimization Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Route className="w-5 h-5 text-orange-500" />
                {t('routeOptimization', lang)}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6">
              <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                {routeOptimizations.map((route, index) => {
                  const isExpanded = expandedRoutes.has(route.vehicleId);
                  const stops = route.currentRoute.split(' → ');
                  const utilColor = getUtilColor(route.utilizationPercent);

                  return (
                    <motion.div
                      key={route.vehicleId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      className={cn(
                        'rounded-xl border border-border/50 bg-muted/20 p-4 transition-all duration-300',
                        isExpanded && 'ring-1 ring-orange-500/20 bg-orange-50/5 dark:bg-orange-950/10'
                      )}
                    >
                      {/* Route Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500/10 to-amber-500/10 flex items-center justify-center shrink-0">
                            <Truck className="w-4 h-4 text-orange-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{route.vehiclePlate}</p>
                            <p className="text-[11px] text-muted-foreground">{route.driverName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={cn('text-[10px] px-2 border', route.utilizationPercent < 50 ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800' : route.utilizationPercent < 80 ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800')}>
                            {route.utilizationPercent}% {t('utilization', lang)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => toggleRoute(route.vehicleId)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Route Progress Bar */}
                      <div className="mt-3">
                        <div className="flex items-center gap-1 mb-1.5">
                          {stops.map((stop, i) => (
                            <div key={i} className="flex items-center gap-1 flex-1 min-w-0">
                              <div className={cn(
                                'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 border-2',
                                i === 0
                                  ? 'bg-orange-500 text-white border-orange-500'
                                  : i === stops.length - 1
                                    ? 'bg-green-500 text-white border-green-500'
                                    : 'bg-card text-muted-foreground border-border'
                              )}>
                                {i + 1}
                              </div>
                              {i < stops.length - 1 && (
                                <div className="flex-1 h-0.5 bg-gradient-to-r from-orange-300 to-green-300 dark:from-orange-700 dark:to-green-700 rounded-full" />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          {stops.map((stop, i) => (
                            <div key={i} className="flex items-center gap-1 flex-1 min-w-0">
                              <span className="truncate font-medium">{stop}</span>
                              {i < stops.length - 1 && <ArrowRight className="w-3 h-3 shrink-0 opacity-40" />}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Utilization Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{t('utilization', lang)}</span>
                          <span className="font-medium" style={{ color: utilColor }}>{route.utilizationPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${route.utilizationPercent}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: utilColor }}
                          />
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {route.totalDistance} km
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {route.estimatedTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {route.suggestedStops.reduce((s, stop) => s + stop.matchingShipments, 0)} {t('shipments', lang).toLowerCase()}
                        </div>
                      </div>

                      {/* Expanded: Suggested Stops */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.3 }}
                          className="mt-3 pt-3 border-t border-border/50"
                        >
                          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-orange-500" />
                            {t('suggestedStops', lang)}
                          </p>
                          <div className="space-y-2">
                            {route.suggestedStops.map((stop, si) => (
                              <div
                                key={si}
                                className="flex items-center gap-3 rounded-lg bg-background/60 p-2.5 border border-border/30"
                              >
                                <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-[10px] font-bold text-orange-600 dark:text-orange-400 shrink-0">
                                  {si + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium">{stop.city}</p>
                                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                                    <span>{formatNumber(stop.availableCapacityWeight)} kg</span>
                                    <span>{stop.availableCapacityVolume} m³</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {stop.detourMinutes > 0 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
                                      +{stop.detourMinutes} min
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className={cn(
                                    'text-[10px] px-1.5 py-0',
                                    stop.matchingShipments > 0
                                      ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800'
                                      : 'bg-gray-50 text-gray-500 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200 dark:border-gray-800'
                                  )}>
                                    {stop.matchingShipments} {t('shipments', lang).toLowerCase()}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Capacity Overview Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-orange-500" />
                  {t('capacityOverview', lang)}
                </CardTitle>
                <Badge variant="secondary" className="text-xs bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 border-0">
                  {t('activeShipments', lang)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={2} barCategoryGap="15%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="weight"
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}t`}
                    />
                    <YAxis
                      yAxisId="volume"
                      orientation="right"
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}m³`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        color: 'var(--card-foreground)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          usedWeight: lang === 'de' ? 'Genutztes Gewicht' : 'Used Weight',
                          freeWeight: lang === 'de' ? 'Freies Gewicht' : 'Free Weight',
                          usedVolume: lang === 'de' ? 'Genutztes Volumen' : 'Used Volume',
                          freeVolume: lang === 'de' ? 'Freies Volumen' : 'Free Volume',
                        };
                        return [name === 'usedWeight' || name === 'freeWeight' ? `${formatNumber(value)} kg` : `${value} m³`, labels[name] || name];
                      }}
                    />
                    <ReferenceLine
                      yAxisId="weight"
                      y={0}
                      stroke="var(--muted-foreground)"
                      opacity={0.2}
                    />

                    {/* Weight bars */}
                    <Bar yAxisId="weight" dataKey="usedWeight" stackId="weight" radius={[0, 0, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`uw-${index}`} fill="#F97316" opacity={0.9} />
                      ))}
                    </Bar>
                    <Bar yAxisId="weight" dataKey="freeWeight" stackId="weight" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`fw-${index}`} fill="#FED7AA" opacity={0.7} />
                      ))}
                    </Bar>

                    {/* Volume bars */}
                    <Bar yAxisId="volume" dataKey="usedVolume" stackId="volume" radius={[0, 0, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`uv-${index}`} fill="#8B5CF6" opacity={0.9} />
                      ))}
                    </Bar>
                    <Bar yAxisId="volume" dataKey="freeVolume" stackId="volume" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`fv-${index}`} fill="#DDD6FE" opacity={0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-border/30">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-sm bg-orange-500 opacity-90" />
                  {t('usedCapacity', lang)} ({t('weight', lang)})
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-sm bg-orange-200 opacity-70" />
                  {t('freeCapacity', lang)} ({t('weight', lang)})
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-sm bg-purple-500 opacity-90" />
                  {t('usedCapacity', lang)} (Vol.)
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-sm bg-purple-200 opacity-70" />
                  {t('freeCapacity', lang)} (Vol.)
                </div>
              </div>

              {/* Utilization summary */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {chartData.map((vehicle, idx) => (
                  <div
                    key={vehicle.name}
                    className="flex items-center justify-between rounded-lg bg-muted/30 p-2.5 border border-border/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: getUtilColor(vehicle.utilization) }}
                      />
                      <span className="text-xs font-medium truncate">{vehicle.name}</span>
                    </div>
                    <span
                      className="text-xs font-semibold shrink-0"
                      style={{ color: getUtilColor(vehicle.utilization) }}
                    >
                      {vehicle.utilization}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default CapacityPage;
