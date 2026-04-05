'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  MapPinned,
  Timer,
  Car,
  Fuel,
  Gauge,
  Search,
  Loader2,
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

interface RouteInfo {
  distance: string;
  duration: string;
  distanceMeters: number;
  durationSeconds: number;
}

interface ShipmentTracking {
  id: string;
  shipmentNumber: string;
  status: string;
  currentLocation: Position | null;
  destination: { lat: number; lng: number; address: string } | null;
  origin: { lat: number; lng: number; address: string } | null;
  driver: { id: string; name: string; phone: string } | null;
  vehicle: { id: string; plateNumber: string; vehicleType: string } | null;
  routeHistory: Position[];
  eta?: string;
  routeInfo?: RouteInfo;
}

// Google Maps API key from environment
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Check if Google Maps API is available
const hasGoogleMapsApiKey = GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.length > 0;

// ─── Placeholder Map Component (fallback when no API key) ─────────────────────
function PlaceholderMap({ 
  positions, 
  className,
  routeInfo,
}: { 
  positions: Position[]; 
  className?: string;
  routeInfo?: RouteInfo;
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

      {/* Route info overlay */}
      {routeInfo && (
        <div className="absolute top-4 left-4 bg-white/90 rounded-lg p-3 text-xs space-y-1">
          <div className="flex items-center gap-2 font-medium">
            <Route className="w-4 h-4 text-orange-500" />
            {routeInfo.distance}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-green-500" />
            ETA: {routeInfo.duration}
          </div>
        </div>
      )}

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

// ─── Google Maps Component (when API key is available) ─────────────────────────
function GoogleMapsView({
  center,
  positions,
  destination,
  origin,
  routeInfo,
  onMapLoaded,
  onRouteCalculated,
  className,
}: {
  center?: { lat: number; lng: number };
  positions: Position[];
  destination?: { lat: number; lng: number };
  origin?: { lat: number; lng: number };
  routeInfo?: RouteInfo;
  onMapLoaded?: () => void;
  onRouteCalculated?: (info: RouteInfo) => void;
  className?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // Load Google Maps script
  useEffect(() => {
    if (!hasGoogleMapsApiKey || !mapRef.current) return;

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      // Use microtask to avoid synchronous setState
      if (window.google && window.google.maps) {
        Promise.resolve().then(() => {
          setIsLoaded(true);
          setIsLoading(false);
        });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsLoaded(true);
      setIsLoading(false);
    };
    script.onerror = () => {
      setIsLoading(false);
    };
    document.head.appendChild(script);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return;

    const defaultCenter = center || positions[0] || { lat: 52.52, lng: 13.405 };
    
    const newMap = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 12,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    setMap(newMap);
    onMapLoaded?.();
  }, [isLoaded, center, positions, map, onMapLoaded]);

  // Clear markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
  }, []);

  // Add markers and route
  useEffect(() => {
    if (!map || !isLoaded) return;

    clearMarkers();

    // Current position marker
    if (positions.length > 0) {
      const currentPos = positions[positions.length - 1];
      const marker = new window.google.maps.Marker({
        position: { lat: currentPos.lat, lng: currentPos.lng },
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#F97316',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: 'Aktuelle Position',
      });
      markersRef.current.push(marker);

      // Center map on current position
      map.setCenter({ lat: currentPos.lat, lng: currentPos.lng });
    }

    // Destination marker
    if (destination) {
      const marker = new window.google.maps.Marker({
        position: { lat: destination.lat, lng: destination.lng },
        map,
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 8,
          fillColor: '#22c55e',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: 'Ziel',
      });
      markersRef.current.push(marker);
    }

    // Origin marker
    if (origin) {
      const marker = new window.google.maps.Marker({
        position: { lat: origin.lat, lng: origin.lng },
        map,
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 8,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: 'Start',
      });
      markersRef.current.push(marker);
    }

    // Calculate and display route
    if (origin && destination && positions.length > 0) {
      const currentPos = positions[positions.length - 1];
      
      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        map,
        polylineOptions: {
          strokeColor: '#F97316',
          strokeOpacity: 0.8,
          strokeWeight: 4,
        },
        suppressMarkers: true,
      });
      directionsRendererRef.current = directionsRenderer;

      directionsService.route(
        {
          origin: { lat: currentPos.lat, lng: currentPos.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK' && result) {
            directionsRenderer.setDirections(result);
            
            const route = result.routes[0];
            const leg = route.legs[0];
            
            const info: RouteInfo = {
              distance: leg.distance?.text || '',
              duration: leg.duration?.text || '',
              distanceMeters: leg.distance?.value || 0,
              durationSeconds: leg.duration?.value || 0,
            };
            
            onRouteCalculated?.(info);
          }
        }
      );
    }

    return () => {
      clearMarkers();
    };
  }, [map, isLoaded, positions, destination, origin, clearMarkers, onRouteCalculated]);

  if (!hasGoogleMapsApiKey) {
    return <PlaceholderMap positions={positions} className={className} routeInfo={routeInfo} />;
  }

  return (
    <div className={cn('relative', className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-900/50 z-10">
          <div className="flex items-center gap-2 text-white">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading Map...</span>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-xl" />
      
      {/* Route info overlay */}
      {routeInfo && (
        <div className="absolute top-4 left-4 bg-white/95 dark:bg-gray-900/95 rounded-lg p-3 shadow-lg z-20">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-orange-500" />
              <span className="font-medium">{routeInfo.distance}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-500" />
              <span className="font-medium">ETA: {routeInfo.duration}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-gray-900/95 rounded-lg p-3 shadow-lg z-20 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full" />
          <span>Aktuelle Position</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span>Ziel</span>
        </div>
      </div>
    </div>
  );
}

// ─── Geocoding Component ──────────────────────────────────────────────────────
function AddressSearch({
  onLocationSelect,
  placeholder,
}: {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);

  useEffect(() => {
    if (!hasGoogleMapsApiKey || !window.google?.maps?.places) return;
    autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
  }, []);

  const searchPlaces = useCallback(async (input: string) => {
    if (!input || input.length < 3 || !autocompleteServiceRef.current) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await autocompleteServiceRef.current.getPlacePredictions({
        input,
        componentRestrictions: { country: ['de', 'at', 'ch', 'pl', 'cz'] },
      });
      setPredictions(response.predictions.slice(0, 5));
    } catch {
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectPrediction = useCallback((prediction: google.maps.places.AutocompletePrediction) => {
    if (!window.google?.maps?.Geocoder) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ placeId: prediction.placeId }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const location = results[0].geometry.location;
        onLocationSelect({
          lat: location.lat(),
          lng: location.lng(),
          address: prediction.description,
        });
        setQuery(prediction.description);
        setPredictions([]);
      }
    });
  }, [onLocationSelect]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            searchPlaces(e.target.value);
          }}
          placeholder={placeholder}
          className="pl-9"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>
      
      {predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 rounded-lg border shadow-lg z-50 overflow-hidden">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-start gap-2"
              onClick={() => handleSelectPrediction(prediction)}
            >
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <span>{prediction.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function LiveTrackingPage() {
  const { language } = useCargoBitStore();
  const [shipmentId, setShipmentId] = useState('');
  const [tracking, setTracking] = useState<ShipmentTracking | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | undefined>();
  const [mapLoaded, setMapLoaded] = useState(false);

  const fetchTracking = useCallback(async () => {
    if (!shipmentId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/gps?shipmentId=${shipmentId}`);
      if (response.ok) {
        const data = await response.json();
        setTracking(data);
      } else {
        // Mock data for demo
        setTracking({
          id: '1',
          shipmentNumber: 'CB-2024-1847',
          status: 'in_transit',
          currentLocation: {
            lat: 52.52,
            lng: 13.405,
            timestamp: new Date().toISOString(),
            speed: 65,
            heading: 45,
            batteryLevel: 85,
          },
          destination: {
            lat: 52.37,
            lng: 9.73,
            address: 'Hannover, Deutschland',
          },
          origin: {
            lat: 52.52,
            lng: 13.405,
            address: 'Berlin, Deutschland',
          },
          driver: {
            id: 'drv1',
            name: 'Hans Müller',
            phone: '+49 170 1234567',
          },
          vehicle: {
            id: 'vh1',
            plateNumber: 'B-AB 1234',
            vehicleType: 'Sattelzug',
          },
          routeHistory: [
            { lat: 52.52, lng: 13.405, timestamp: new Date(Date.now() - 3600000).toISOString() },
            { lat: 52.48, lng: 13.35, timestamp: new Date(Date.now() - 3000000).toISOString() },
            { lat: 52.45, lng: 13.30, timestamp: new Date(Date.now() - 2400000).toISOString() },
            { lat: 52.40, lng: 13.25, timestamp: new Date(Date.now() - 1800000).toISOString() },
            { lat: 52.38, lng: 13.20, timestamp: new Date(Date.now() - 1200000).toISOString() },
            { lat: 52.35, lng: 13.15, timestamp: new Date(Date.now() - 600000).toISOString() },
          ],
          eta: '2h 15min',
        });
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
    const interval = setInterval(fetchTracking, 30000);
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

  const handleRouteCalculated = useCallback((info: RouteInfo) => {
    setRouteInfo(info);
  }, []);

  const handleLocationSelect = useCallback((location: { lat: number; lng: number; address: string }) => {
    console.log('Selected location:', location);
  }, []);

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
            {hasGoogleMapsApiKey && (
              <Badge variant="outline" className="px-3 py-1.5 bg-orange-500/10 text-orange-600 border-orange-500/20">
                <MapPinned className="w-3.5 h-3.5 mr-1.5" />
                Google Maps
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
            
            {/* Address Search (only with Google Maps API) */}
            {hasGoogleMapsApiKey && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-sm font-medium">Adresse suchen</Label>
                <div className="mt-2">
                  <AddressSearch
                    onLocationSelect={handleLocationSelect}
                    placeholder="Adresse oder Ort eingeben..."
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {tracking && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Map */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <div className="aspect-video">
                  {hasGoogleMapsApiKey ? (
                    <GoogleMapsView
                      positions={tracking.routeHistory}
                      center={tracking.currentLocation ? 
                        { lat: tracking.currentLocation.lat, lng: tracking.currentLocation.lng } : 
                        undefined
                      }
                      destination={tracking.destination || undefined}
                      origin={tracking.origin || undefined}
                      routeInfo={routeInfo}
                      onMapLoaded={() => setMapLoaded(true)}
                      onRouteCalculated={handleRouteCalculated}
                      className="w-full h-full"
                    />
                  ) : (
                    <PlaceholderMap
                      positions={tracking.routeHistory}
                      routeInfo={routeInfo}
                      className="w-full h-full"
                    />
                  )}
                </div>
              </Card>
              
              {/* Route Details */}
              {routeInfo && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <Route className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{routeInfo.distance}</p>
                        <p className="text-xs text-muted-foreground">Distanz</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Timer className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{routeInfo.duration}</p>
                        <p className="text-xs text-muted-foreground">ETA</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Car className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{tracking.currentLocation?.speed || 0}</p>
                        <p className="text-xs text-muted-foreground">km/h</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Fuel className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">72%</p>
                        <p className="text-xs text-muted-foreground">Tank</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
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
                      {tracking.eta && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-muted-foreground font-medium">ETA</span>
                          <span className="font-bold text-green-600">{tracking.eta}</span>
                        </div>
                      )}
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
                        <p className="font-medium">{tracking.currentLocation?.batteryLevel || 85}%</p>
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
                <Button variant="outline" className="flex-1" asChild>
                  <a 
                    href={tracking.destination ? 
                      `https://www.google.com/maps/dir/?api=1&destination=${tracking.destination.lat},${tracking.destination.lng}` : 
                      '#'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Google Maps
                  </a>
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
                {hasGoogleMapsApiKey ? (
                  <> Mit Google Maps Integration können Sie Route, Entfernung und ETA verfolgen.</>
                ) : (
                  <> Fügen Sie <code className="bg-muted px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> zu Ihrer .env Datei hinzu, um Google Maps zu aktivieren.</>
                )}
              </p>
              
              {!hasGoogleMapsApiKey && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg max-w-md mx-auto text-left">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      <strong>Google Maps API Key fehlt.</strong> Die Platzhalter-Karte wird angezeigt. 
                      Fügen Sie Ihren API-Schlüssel hinzu für echte Karten, Routenberechnung und Adresssuche.
                    </span>
                  </p>
                </div>
              )}
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
                  {hasGoogleMapsApiKey ? 
                    'Berechnete Route und Ankunftszeit via Google Maps' : 
                    'Berechnete Route und Ankunftszeit'
                  }
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
