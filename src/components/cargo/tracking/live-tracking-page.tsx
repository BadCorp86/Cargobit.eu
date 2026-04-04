'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MapPin,
  Navigation,
  Truck,
  Package,
  Clock,
  Battery,
  Signal,
  Play,
  Pause,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Layers,
  Route,
  AlertCircle,
  CheckCircle,
  User,
  Phone,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Position {
  lat: number;
  lng: number;
  timestamp: string;
  speed?: number;
  heading?: number;
  batteryLevel?: number;
}

interface ShipmentTracking {
  id: string;
  shipmentNumber: string;
  status: string;
  currentLocation: Position | null;
  driver: { id: string; name: string; phone: string } | null;
  vehicle: { id: string; plateNumber: string; vehicleType: string } | null;
  routeHistory: Position[];
}

// Mock map component (in production, would use Google Maps or Mapbox)
function MapPreview({ 
  positions, 
  center, 
  highlighted,
  className 
}: { 
  positions: Position[]; 
  center?: { lat: number; lng: number };
  highlighted?: string;
  className?: string;
}) {
  const [zoom, setZoom] = useState(10);

  return (
    <div className={cn('relative rounded-xl overflow-hidden bg-gradient-to-br from-blue-900 to-blue-950', className)}>
      {/* Map placeholder with grid */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Route visualization */}
      {positions.length > 1 && (
        <svg className="absolute inset-0" viewBox="0 0 400 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          <path
            d={`M ${positions.map((p, i) => 
              `${(i / (positions.length - 1)) * 380 + 10} ${300 - ((p.lat - 50) * 200 + 150)}`
            ).join(' L ')}`}
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="3"
            strokeDasharray="8,4"
          />
        </svg>
      )}

      {/* Current position marker */}
      {positions.length > 0 && (
        <motion.div
          className="absolute"
          style={{
            left: '80%',
            top: '50%',
          }}
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          <div className="relative">
            <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-lg" />
            <div className="absolute inset-0 w-4 h-4 bg-orange-500 rounded-full animate-ping opacity-50" />
          </div>
        </motion.div>
      )}

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-white/90"
          onClick={() => setZoom(z => Math.min(z + 1, 18))}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-white/90"
          onClick={() => setZoom(z => Math.max(z - 1, 1))}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-white/90"
        >
          <Layers className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 bg-white/90 rounded px-2 py-1 text-xs font-medium">
        Zoom: {zoom}x
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/90 rounded-lg p-2 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full" />
          <span>Aktuelle Position</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-gradient-to-r from-orange-500 to-green-500" />
          <span>Route</span>
        </div>
      </div>
    </div>
  );
}

export function LiveTrackingPage() {
  const { language } = useCargoBitStore();
  const [shipmentId, setShipmentId] = useState('');
  const [tracking, setTracking] = useState<ShipmentTracking | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchTracking = useCallback(async () => {
    if (!shipmentId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/gps?shipmentId=${shipmentId}`);
      if (response.ok) {
        const data = await response.json();
        setTracking(data);
      }
    } catch (error) {
      console.error('Failed to fetch tracking:', error);
    } finally {
      setIsLoading(false);
    }
  }, [shipmentId]);

  const startLiveTracking = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    fetchTracking();
    const interval = setInterval(fetchTracking, 30000); // Refresh every 30 seconds
    setRefreshInterval(interval);
    setIsTracking(true);
  };

  const stopLiveTracking = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
    setIsTracking(false);
  };

  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  return (
    <div className="h-full overflow-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              Live Tracking
            </h1>
            <p className="text-muted-foreground mt-1">
              Echtzeit-Ortung von Sendungen und Fahrzeugen
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isTracking && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 animate-pulse">
                <Signal className="w-3.5 h-3.5 mr-1.5" />
                Live
              </Badge>
            )}
            <Badge variant="outline" className="px-3 py-1.5 bg-blue-500/10 text-blue-600 border-blue-500/20">
              <MapPin className="w-3.5 h-3.5 mr-1.5" />
              GPS
            </Badge>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Sendung suchen</CardTitle>
            <CardDescription>
              Geben Sie die Sendungsnummer ein, um das Live-Tracking zu starten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="z.B. CB-2024-1847"
                value={shipmentId}
                onChange={(e) => setShipmentId(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={fetchTracking}
                disabled={!shipmentId || isLoading}
                variant="outline"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Suchen'
                )}
              </Button>
              {tracking && (
                <Button
                  onClick={isTracking ? stopLiveTracking : startLiveTracking}
                  className={isTracking ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}
                >
                  {isTracking ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Live
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {tracking && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Map */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <div className="aspect-video">
                  <MapPreview
                    positions={tracking.routeHistory}
                    className="w-full h-full"
                  />
                </div>
              </Card>
            </div>

            {/* Info Panel */}
            <div className="space-y-4">
              {/* Status Card */}
              <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className={cn(
                      'px-3 py-1',
                      tracking.status === 'in_transit' && 'bg-blue-500',
                      tracking.status === 'delivered' && 'bg-green-500',
                    )}>
                      {tracking.status === 'in_transit' ? 'Unterwegs' : tracking.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {tracking.shipmentNumber}
                    </span>
                  </div>
                  
                  {tracking.currentLocation && (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Position</span>
                        <span className="font-mono">
                          {tracking.currentLocation.lat.toFixed(4)}, {tracking.currentLocation.lng.toFixed(4)}
                        </span>
                      </div>
                      {tracking.currentLocation.speed && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Geschwindigkeit</span>
                          <span>{tracking.currentLocation.speed.toFixed(0)} km/h</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Letzte Meldung</span>
                        <span>{new Date(tracking.currentLocation.timestamp).toLocaleTimeString('de-DE')}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Driver Info */}
              {tracking.driver && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-orange-500" />
                      Fahrer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{tracking.driver.name}</p>
                        {tracking.vehicle && (
                          <p className="text-sm text-muted-foreground">
                            {tracking.vehicle.vehicleType} • {tracking.vehicle.plateNumber}
                          </p>
                        )}
                      </div>
                      <Button variant="outline" size="icon" asChild>
                        <a href={`tel:${tracking.driver.phone}`}>
                          <Phone className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Battery & Signal */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Battery className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Batterie</p>
                        <p className="font-medium">85%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Signal className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Signal</p>
                        <p className="font-medium">Stark</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1">
                  <Route className="w-4 h-4 mr-2" />
                  Route anzeigen
                </Button>
                <Button variant="outline" className="flex-1">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Google Maps
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Demo Hint */}
        {!tracking && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Navigation className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Live Tracking starten</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Geben Sie eine Sendungsnummer ein, um die Echtzeit-Position des Fahrzeugs auf der Karte zu sehen.
                Mit Google Maps Integration können Sie Route, Entfernung und ETA verfolgen.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">GPS Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Echtzeit-Positionsübermittlung alle 30 Sekunden
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                <Route className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold">Route & ETA</h3>
                <p className="text-sm text-muted-foreground">
                  Berechnete Route und Ankunftszeit
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold">Historie</h3>
                <p className="text-sm text-muted-foreground">
                  Vollständige Route-Historie der letzten 24h
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default LiveTrackingPage;
