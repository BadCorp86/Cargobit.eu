'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Zap,
  MapPin,
  Package,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Bell,
  BellRing,
  Navigation,
  Truck,
  Timer,
  DollarSign,
  Weight,
  Box,
  MapPinned,
  Loader2,
  Gauge,
  Radio,
  UserCheck,
  X,
  Send,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Driver {
  id: string;
  name: string;
  distance: number;
  latitude: number;
  longitude: number;
  available: boolean;
  vehicleType: string;
  rating: number;
  plateNumber: string;
}

interface ExpressTransport {
  id: string;
  pickupPlace: string;
  pickupAddress: string;
  pickupCoords?: { lat: number; lng: number };
  deliveryPlace: string;
  description: string;
  weight: number;
  pallets: number;
  offeredPrice: number;
  alertRadiusKm: number;
  status: string;
  distance?: number;
  createdAt: string;
  expiresAt: string;
  driversNotified?: number;
  driversInRange?: number;
}

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Mock drivers data with coordinates
const mockDrivers: Driver[] = [
  { id: 'DRV-001', name: 'Hans Müller', distance: 0, latitude: 52.52, longitude: 13.405, available: true, vehicleType: 'Sattelzug', rating: 4.9, plateNumber: 'M-AB 1234' },
  { id: 'DRV-002', name: 'Klaus Schmidt', distance: 0, latitude: 52.55, longitude: 13.35, available: true, vehicleType: 'Sattelzug', rating: 4.7, plateNumber: 'M-CD 5678' },
  { id: 'DRV-003', name: 'Stefan Weber', distance: 0, latitude: 52.48, longitude: 13.45, available: true, vehicleType: 'Sprinter', rating: 4.8, plateNumber: 'N-GH 3456' },
  { id: 'DRV-004', name: 'Michael Wagner', distance: 0, latitude: 52.60, longitude: 13.50, available: false, vehicleType: 'Kastenwagen', rating: 4.6, plateNumber: 'B-OP 0123' },
  { id: 'DRV-005', name: 'Andreas Becker', distance: 0, latitude: 52.42, longitude: 13.30, available: true, vehicleType: 'Kühl-LKW', rating: 4.9, plateNumber: 'F-QR 4567' },
  { id: 'DRV-006', name: 'Peter Fischer', distance: 0, latitude: 52.38, longitude: 13.55, available: true, vehicleType: 'Sattelzug', rating: 4.5, plateNumber: 'W-KL 2345' },
  { id: 'DRV-007', name: 'Lisa Meier', distance: 0, latitude: 52.35, longitude: 13.25, available: true, vehicleType: 'Sprinter', rating: 4.9, plateNumber: 'D-ZA 4567' },
  { id: 'DRV-008', name: 'Thomas Braun', distance: 0, latitude: 52.65, longitude: 13.30, available: false, vehicleType: 'Kastenwagen', rating: 4.3, plateNumber: 'S-MN 6789' },
];

const mockExpressTransports: ExpressTransport[] = [
  {
    id: '1',
    pickupPlace: 'Berlin-Mitte',
    pickupAddress: 'Alexanderplatz 1, 10178 Berlin',
    pickupCoords: { lat: 52.5219, lng: 13.4132 },
    deliveryPlace: 'Potsdam',
    description: '3 Paletten Elektromaterial, EILIG',
    weight: 1500,
    pallets: 3,
    offeredPrice: 450,
    alertRadiusKm: 20,
    status: 'active',
    distance: 5.2,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
    driversNotified: 5,
    driversInRange: 6,
  },
  {
    id: '2',
    pickupPlace: 'Berlin-Charlottenburg',
    pickupAddress: 'Kurfürstendamm 100, 10709 Berlin',
    pickupCoords: { lat: 52.5040, lng: 13.3195 },
    deliveryPlace: 'Hamburg',
    description: 'Express-Paket, Kühlung erforderlich',
    weight: 200,
    pallets: 0,
    offeredPrice: 280,
    alertRadiusKm: 20,
    status: 'active',
    distance: 8.7,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    driversNotified: 4,
    driversInRange: 5,
  },
];

// ─── Countdown Timer with Progress ────────────────────────────────────────────
function CountdownTimer({ 
  expiresAt, 
  createdAt,
  onExpire,
}: { 
  expiresAt: string; 
  createdAt: string;
  onExpire?: () => void;
}) {
  // Calculate total duration once at render time
  const totalDuration = new Date(expiresAt).getTime() - new Date(createdAt).getTime();
  const [timeRemaining, setTimeRemaining] = useState(() => 
    Math.max(0, new Date(expiresAt).getTime() - Date.now())
  );
  const [isExpired, setIsExpired] = useState(() => 
    new Date(expiresAt).getTime() <= Date.now()
  );
  const onExpireRef = useRef(onExpire);

  // Keep ref updated
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (isExpired) return;
    
    const interval = setInterval(() => {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeRemaining(0);
        setIsExpired(true);
        onExpireRef.current?.();
        clearInterval(interval);
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isExpired]);

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  const progress = totalDuration > 0 ? (timeRemaining / totalDuration) * 100 : 0;

  const getColor = () => {
    if (progress > 50) return 'text-green-600 dark:text-green-400';
    if (progress > 25) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = () => {
    if (progress > 50) return 'bg-green-500';
    if (progress > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isExpired) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <XCircle className="w-4 h-4" />
        <span className="text-sm">Abgelaufen</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Timer className={cn('w-5 h-5', getColor())} />
        <span className={cn('font-mono text-lg font-bold', getColor())}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
          className={cn('h-full rounded-full transition-colors', getProgressColor())}
        />
        {progress < 25 && (
          <motion.div
            className="absolute inset-0 bg-red-500/30"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Alert Notification Simulation ─────────────────────────────────────────────
function AlertNotification({
  drivers,
  pickupCoords,
  radius,
  onSend,
}: {
  drivers: Driver[];
  pickupCoords?: { lat: number; lng: number };
  radius: number;
  onSend: (driversNotified: number) => void;
}) {
  const [isSending, setIsSending] = useState(false);
  const [sentTo, setSentTo] = useState<string[]>([]);
  const [showAnimation, setShowAnimation] = useState(false);

  const driversInRange = pickupCoords ? 
    drivers.filter(d => {
      const distance = calculateDistance(pickupCoords.lat, pickupCoords.lng, d.latitude, d.longitude);
      return distance <= radius && d.available;
    }) : [];

  const handleSendAlerts = async () => {
    setIsSending(true);
    setShowAnimation(true);
    
    for (let i = 0; i < driversInRange.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setSentTo(prev => [...prev, driversInRange[i].id]);
    }
    
    setTimeout(() => {
      setIsSending(false);
      setShowAnimation(false);
      onSend(driversInRange.length);
      toast.success('Alerts versendet', {
        description: `${driversInRange.length} Fahrer im ${radius}km Radius benachrichtigt`,
      });
    }, 500);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium">
            {driversInRange.length} Fahrer im {radius}km Radius
          </span>
        </div>
        <Button
          size="sm"
          className="h-8 bg-red-500 hover:bg-red-600"
          onClick={handleSendAlerts}
          disabled={isSending || driversInRange.length === 0}
        >
          {isSending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Sende...
            </>
          ) : (
            <>
              <BellRing className="w-3.5 h-3.5 mr-1.5" />
              Alert senden
            </>
          )}
        </Button>
      </div>
      
      {/* Driver list with animation */}
      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {driversInRange.map((driver) => {
          const distance = pickupCoords ? 
            calculateDistance(pickupCoords.lat, pickupCoords.lng, driver.latitude, driver.longitude) : 0;
          const isSent = sentTo.includes(driver.id);
          
          return (
            <motion.div
              key={driver.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                'flex items-center justify-between p-2 rounded-lg text-xs transition-all',
                isSent ? 'bg-green-500/10 border border-green-500/20' : 'bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
                  <UserCheck className="w-3 h-3 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium">{driver.name}</p>
                  <p className="text-muted-foreground">{driver.plateNumber} • {driver.vehicleType}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-medium">{distance.toFixed(1)} km</p>
                  <p className="text-yellow-600 dark:text-yellow-400">★ {driver.rating}</p>
                </div>
                {isSent && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function ExpressTransportPage() {
  const { language } = useCargoBitStore();
  const [expressTransports, setExpressTransports] = useState(mockExpressTransports);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  const [newExpress, setNewExpress] = useState({
    pickupAddress: '',
    pickupPlace: '',
    deliveryAddress: '',
    deliveryPlace: '',
    description: '',
    weight: '',
    pallets: '',
    offeredPrice: '',
    alertRadius: '20',
    expiresInMinutes: '30',
  });

  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation wird nicht unterstützt');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
        toast.success('Standort ermittelt', {
          description: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
        });
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Standortzugriff verweigert');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Standort nicht verfügbar');
            break;
          case error.TIMEOUT:
            setLocationError('Zeitüberschreitung');
            break;
          default:
            setLocationError('Unbekannter Fehler');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Calculate drivers in range for new express
  const getDriversInRangeCount = useCallback((coords: { lat: number; lng: number } | undefined, radius: number) => {
    if (!coords) return 0;
    return mockDrivers.filter(d => {
      const distance = calculateDistance(coords.lat, coords.lng, d.latitude, d.longitude);
      return distance <= radius && d.available;
    }).length;
  }, []);

  const handleCreateExpress = async () => {
    // Default to Berlin coordinates if no location
    const coords = userLocation || { lat: 52.52, lng: 13.405 };
    const radius = parseInt(newExpress.alertRadius) || 20;
    const driversInRange = getDriversInRangeCount(coords, radius);
    
    const express: ExpressTransport = {
      id: Date.now().toString(),
      pickupPlace: newExpress.pickupPlace || 'Unknown',
      pickupAddress: newExpress.pickupAddress,
      pickupCoords: coords,
      deliveryPlace: newExpress.deliveryPlace || 'Unknown',
      description: newExpress.description,
      weight: parseFloat(newExpress.weight) || 0,
      pallets: parseInt(newExpress.pallets) || 0,
      offeredPrice: parseFloat(newExpress.offeredPrice) || 0,
      alertRadiusKm: radius,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (parseInt(newExpress.expiresInMinutes) || 30) * 60 * 1000).toISOString(),
      driversInRange,
    };
    
    setExpressTransports([express, ...expressTransports]);
    setShowCreateDialog(false);
    setNewExpress({
      pickupAddress: '',
      pickupPlace: '',
      deliveryAddress: '',
      deliveryPlace: '',
      description: '',
      weight: '',
      pallets: '',
      offeredPrice: '',
      alertRadius: '20',
      expiresInMinutes: '30',
    });
    
    toast.success('Express Transport erstellt', {
      description: `${driversInRange} Fahrer im ${radius}km Radius verfügbar`,
    });
  };

  const handleAccept = (id: string) => {
    setExpressTransports(prev => 
      prev.map(e => e.id === id ? { ...e, status: 'accepted' } : e)
    );
  };

  const handleExpire = (id: string) => {
    setExpressTransports(prev => 
      prev.map(e => e.id === id ? { ...e, status: 'expired' } : e)
    );
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return 'Abgelaufen';
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full overflow-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              Express Transport
            </h1>
            <p className="text-muted-foreground mt-1">
              Sofort-Transport mit Alarm an Fahrer im {newExpress.alertRadius}km Umkreis
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Location indicator */}
            {userLocation ? (
              <Badge variant="outline" className="px-3 py-1.5 bg-green-500/10 text-green-600 border-green-500/20">
                <MapPinned className="w-3.5 h-3.5 mr-1.5" />
                Standort aktiv
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={getCurrentLocation}
                disabled={isLocating}
              >
                {isLocating ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4 mr-1.5" />
                )}
                Standort ermitteln
              </Button>
            )}
            
            <Badge variant="outline" className="px-3 py-1.5 bg-red-500/10 text-red-600 border-red-500/20">
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              {expressTransports.filter(e => e.status === 'active').length} Aktiv
            </Badge>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-red-500 hover:bg-red-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Express erstellen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-red-500" />
                    Express Transport erstellen
                  </DialogTitle>
                  <DialogDescription>
                    Fahrer im Umkreis erhalten sofort eine Push-Benachrichtigung
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Location section */}
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        Standort
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={getCurrentLocation}
                        disabled={isLocating}
                      >
                        {isLocating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        ) : (
                          <Navigation className="w-3.5 h-3.5 mr-1" />
                        )}
                        {userLocation ? 'Aktualisieren' : 'Ermitteln'}
                      </Button>
                    </div>
                    {userLocation ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                        </span>
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                          {getDriversInRangeCount(userLocation, parseInt(newExpress.alertRadius))} Fahrer in Reichweite
                        </Badge>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Kein Standort aktiv. Standardmäßig Berlin wird verwendet.
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Abholadresse</Label>
                    <Input
                      placeholder="Straße, PLZ Stadt"
                      value={newExpress.pickupAddress}
                      onChange={e => setNewExpress({ ...newExpress, pickupAddress: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lieferadresse</Label>
                    <Input
                      placeholder="Straße, PLZ Stadt"
                      value={newExpress.deliveryAddress}
                      onChange={e => setNewExpress({ ...newExpress, deliveryAddress: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Beschreibung</Label>
                    <Textarea
                      placeholder="z.B. 3 Paletten Elektromaterial, EILIG"
                      value={newExpress.description}
                      onChange={e => setNewExpress({ ...newExpress, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gewicht (kg)</Label>
                      <Input
                        type="number"
                        placeholder="500"
                        value={newExpress.weight}
                        onChange={e => setNewExpress({ ...newExpress, weight: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Paletten</Label>
                      <Input
                        type="number"
                        placeholder="2"
                        value={newExpress.pallets}
                        onChange={e => setNewExpress({ ...newExpress, pallets: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Preis (€)</Label>
                      <Input
                        type="number"
                        placeholder="250"
                        value={newExpress.offeredPrice}
                        onChange={e => setNewExpress({ ...newExpress, offeredPrice: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Alarm Radius (km)</Label>
                      <Select value={newExpress.alertRadius} onValueChange={v => setNewExpress({ ...newExpress, alertRadius: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 km</SelectItem>
                          <SelectItem value="20">20 km</SelectItem>
                          <SelectItem value="30">30 km</SelectItem>
                          <SelectItem value="50">50 km</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Drivers in range preview */}
                  <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-orange-500" />
                      <span className="font-medium">
                        {getDriversInRangeCount(userLocation, parseInt(newExpress.alertRadius))} Fahrer im {newExpress.alertRadius}km Radius verfügbar
                      </span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Abbrechen
                  </Button>
                  <Button 
                    className="bg-red-500 hover:bg-red-600"
                    onClick={handleCreateExpress}
                    disabled={!newExpress.pickupAddress || !newExpress.description || !newExpress.offeredPrice}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Alarm senden
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Active Express Transports */}
        <div className="space-y-4">
          <AnimatePresence>
            {expressTransports.map((express) => (
              <motion.div
                key={express.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
              >
                <Card className={cn(
                  'overflow-hidden transition-all',
                  express.status === 'active' && 'border-red-500/30',
                  express.status === 'accepted' && 'border-green-500/30',
                  express.status === 'expired' && 'border-gray-500/30 opacity-60',
                )}>
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row">
                      <div className={cn(
                        'w-full lg:w-2 h-2 lg:h-auto',
                        express.status === 'active' && 'bg-red-500',
                        express.status === 'accepted' && 'bg-green-500',
                        express.status === 'expired' && 'bg-gray-400',
                      )} />
                      
                      <div className="flex-1 p-4">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          <div className="space-y-3 flex-1">
                            {/* Route */}
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-center">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <div className="w-0.5 h-8 bg-border" />
                                <div className="w-3 h-3 rounded-full bg-orange-500" />
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <p className="text-sm text-muted-foreground">Abholung</p>
                                  <p className="font-medium">{express.pickupPlace}</p>
                                  <p className="text-xs text-muted-foreground">{express.pickupAddress}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Lieferung</p>
                                  <p className="font-medium">{express.deliveryPlace}</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Description */}
                            <p className="text-sm">{express.description}</p>
                            
                            {/* Tags */}
                            <div className="flex flex-wrap gap-3">
                              {express.weight > 0 && (
                                <Badge variant="outline" className="gap-1">
                                  <Weight className="w-3 h-3" />
                                  {express.weight} kg
                                </Badge>
                              )}
                              {express.pallets > 0 && (
                                <Badge variant="outline" className="gap-1">
                                  <Box className="w-3 h-3" />
                                  {express.pallets} Palette{express.pallets > 1 ? 'n' : ''}
                                </Badge>
                              )}
                              {express.distance && (
                                <Badge variant="outline" className="gap-1">
                                  <Navigation className="w-3 h-3" />
                                  {express.distance} km
                                </Badge>
                              )}
                              {express.driversInRange && (
                                <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                                  <Users className="w-3 h-3" />
                                  {express.driversInRange} Fahrer in Reichweite
                                </Badge>
                              )}
                            </div>
                            
                            {/* Alert notification section */}
                            {express.status === 'active' && (
                              <div className="pt-2 border-t">
                                <AlertNotification
                                  drivers={mockDrivers}
                                  pickupCoords={express.pickupCoords}
                                  radius={express.alertRadiusKm}
                                  onSend={(count) => {
                                    setExpressTransports(prev =>
                                      prev.map(e => e.id === express.id ? 
                                        { ...e, driversNotified: count } : e
                                      )
                                    );
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          
                          {/* Right side */}
                          <div className="flex flex-col items-end gap-3 min-w-[180px]">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">€{express.offeredPrice}</p>
                              <p className="text-xs text-muted-foreground">Bietet an</p>
                            </div>
                            
                            {/* Timer */}
                            {express.status === 'active' && (
                              <CountdownTimer
                                expiresAt={express.expiresAt}
                                createdAt={express.createdAt}
                                onExpire={() => handleExpire(express.id)}
                              />
                            )}
                            
                            {express.status === 'accepted' && (
                              <Badge className="bg-green-500">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Akzeptiert
                              </Badge>
                            )}
                            
                            {express.status === 'expired' && (
                              <Badge variant="secondary" className="bg-gray-500/10 text-gray-600">
                                <XCircle className="w-3 h-3 mr-1" />
                                Abgelaufen
                              </Badge>
                            )}
                            
                            {express.status === 'active' && (
                              <Button 
                                className="bg-red-500 hover:bg-red-600"
                                onClick={() => handleAccept(express.id)}
                              >
                                <Zap className="w-4 h-4 mr-2" />
                                Annehmen
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Info Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold">Sofort-Alarm</h3>
                <p className="text-sm text-muted-foreground">
                  Fahrer im {newExpress.alertRadius}km Umkreis erhalten Push-Benachrichtigung
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                <Gauge className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">Geo-Location</h3>
                <p className="text-sm text-muted-foreground">
                  Präzise Fahrer-Ermittlung per GPS
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                <Timer className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold">Zeitlimits</h3>
                <p className="text-sm text-muted-foreground">
                  Automatischer Ablauf mit Countdown
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ExpressTransportPage;
