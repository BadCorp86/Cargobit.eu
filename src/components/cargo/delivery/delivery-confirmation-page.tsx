'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Signature, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Smartphone,
  Shield,
  Navigation,
  Camera,
  FileText
} from 'lucide-react';

interface DeliveryConfirmationData {
  shipmentId: string;
  confirmationTime: string | null;
  signature: string | null;
  gpsCoordinates: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  } | null;
  recipientName: string;
  recipientSignature: boolean;
  notes: string;
}

interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

export function DeliveryConfirmationPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [gpsPosition, setGpsPosition] = useState<GPSPosition | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmationData, setConfirmationData] = useState<DeliveryConfirmationData>({
    shipmentId: 'SHP-2025-001234',
    confirmationTime: null,
    signature: null,
    gpsCoordinates: null,
    recipientName: '',
    recipientSignature: false,
    notes: '',
  });

  // Request GPS position on mount
  useEffect(() => {
    requestGPSPosition();
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  const requestGPSPosition = () => {
    setGpsError(null);
    
    if (!navigator.geolocation) {
      setGpsError('Geolocation wird von diesem Browser nicht unterstützt');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('GPS-Zugriff wurde verweigert. Bitte aktivieren Sie GPS in Ihren Browser-Einstellungen.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError('Positionsinformationen sind nicht verfügbar.');
            break;
          case error.TIMEOUT:
            setGpsError('GPS-Timeout. Bitte versuchen Sie es erneut.');
            break;
          default:
            setGpsError('Ein unbekannter Fehler ist aufgetreten.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const confirmDelivery = async () => {
    if (!hasSignature) {
      alert('Bitte unterschreiben Sie vor der Bestätigung');
      return;
    }

    if (!gpsPosition) {
      alert('GPS-Position wird benötigt. Bitte aktivieren Sie GPS.');
      return;
    }

    setIsConfirming(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get signature as data URL
    const canvas = canvasRef.current;
    const signatureData = canvas?.toDataURL('image/png') || null;

    setConfirmationData({
      ...confirmationData,
      confirmationTime: new Date().toISOString(),
      signature: signatureData,
      gpsCoordinates: {
        latitude: gpsPosition.latitude,
        longitude: gpsPosition.longitude,
        accuracy: gpsPosition.accuracy,
        timestamp: gpsPosition.timestamp,
      },
      recipientSignature: true,
    });

    setIsConfirming(false);
    setIsConfirmed(true);
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (isConfirmed) {
    return (
      <div className="space-y-6 p-6 max-w-2xl mx-auto">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-xl text-green-600">Lieferung erfolgreich quittiert</CardTitle>
                <CardDescription>
                  Die Lieferung wurde bestätigt und dokumentiert
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-white/50">
                <p className="text-muted-foreground">Sendungsnummer</p>
                <p className="font-medium">{confirmationData.shipmentId}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/50">
                <p className="text-muted-foreground">Zeitstempel</p>
                <p className="font-medium">{formatDateTime(confirmationData.confirmationTime!)}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-orange-500" />
                <span className="text-muted-foreground">GPS-Koordinaten:</span>
                <span className="font-medium">
                  {confirmationData.gpsCoordinates?.latitude.toFixed(6)}, {confirmationData.gpsCoordinates?.longitude.toFixed(6)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Navigation className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">Genauigkeit:</span>
                <span className="font-medium">±{confirmationData.gpsCoordinates?.accuracy.toFixed(0)}m</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Blockchain-Hash:</span>
                <span className="font-mono text-xs">0x7f9fade...</span>
              </div>
            </div>

            <Separator />

            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <p className="text-sm">
                <strong>Betrugsschutz:</strong> Die GPS-Daten wurden zum Schutz vor Betrug 
                gespeichert und sind fälschungssicher auf der Blockchain dokumentiert.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                Quittung herunterladen
              </Button>
              <Button variant="outline" className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Foto anhängen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      {/* Header */}
      <Card className="border-orange-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-500/10">
              <Signature className="h-8 w-8 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-xl">Lieferung quittieren</CardTitle>
              <CardDescription>
                Unterschreiben Sie mit Ihrem Finger oder Stift
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{confirmationData.shipmentId}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* GPS Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            GPS-Standort
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {gpsError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>GPS-Fehler</AlertTitle>
              <AlertDescription>{gpsError}</AlertDescription>
            </Alert>
          )}
          
          {gpsPosition ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div className="text-sm">
                  <p className="font-medium text-green-600">GPS-Position erfasst</p>
                  <p className="text-muted-foreground">
                    {gpsPosition.latitude.toFixed(6)}, {gpsPosition.longitude.toFixed(6)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Genauigkeit: ±{gpsPosition.accuracy.toFixed(0)}m
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />
              <p className="text-sm text-yellow-600">GPS-Position wird ermittelt...</p>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={requestGPSPosition} className="gap-2">
            <Navigation className="h-4 w-4" />
            GPS aktualisieren
          </Button>
        </CardContent>
      </Card>

      {/* Signature Pad */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Signature className="h-5 w-5 text-orange-500" />
              Digitale Unterschrift
            </CardTitle>
            {hasSignature && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                Unterschrift erfasst
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-sm text-blue-600">
              <Smartphone className="h-4 w-4 inline mr-1" />
              Berühren Sie das Feld und unterschreiben Sie mit Ihrem Finger oder Stift
            </p>
          </div>

          <div className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              className="w-full touch-none cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-muted-foreground/50 text-sm">Hier unterschreiben</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Mit Ihrer Unterschrift bestätigen Sie den Erhalt der Lieferung an diesem Standort.
            </p>
            <Button variant="ghost" size="sm" onClick={clearSignature}>
              Löschen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fraud Protection Info */}
      <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-orange-500 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-orange-600">Betrugsschutz</p>
            <p className="text-muted-foreground mt-1">
              Bei der Quittierung werden automatisch GPS-Koordinaten gespeichert. 
              Dies dient als Nachweis für den tatsächlichen Lieferort und schützt 
              vor Betrugsversuchen. Alle Daten sind fälschungssicher auf der Blockchain 
              dokumentiert.
            </p>
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <Button
        className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-lg"
        disabled={!hasSignature || !gpsPosition || isConfirming}
        onClick={confirmDelivery}
      >
        {isConfirming ? (
          <>
            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            Wird bestätigt...
          </>
        ) : (
          <>
            <CheckCircle className="h-5 w-5 mr-2" />
            Lieferung bestätigen
          </>
        )}
      </Button>

      {!hasSignature && (
        <p className="text-center text-sm text-muted-foreground">
          Bitte unterschreiben Sie vor der Bestätigung
        </p>
      )}
    </div>
  );
}
