'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Truck, 
  MapPin, 
  User, 
  Package, 
  Shield, 
  CheckCircle,
  Clock,
  Signature,
  QrCode,
  Link2,
  Lock,
  Download,
  Share2,
  Printer,
  Copy,
  AlertCircle,
  Info
} from 'lucide-react';

interface ECMRData {
  id: string;
  createdAt: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  
  // Sender info
  senderName: string;
  senderAddress: string;
  senderContact: string;
  
  // Receiver info
  receiverName: string;
  receiverAddress: string;
  receiverContact: string;
  
  // Carrier info
  carrierName: string;
  carrierAddress: string;
  carrierContact: string;
  vehiclePlate: string;
  driverName: string;
  
  // Shipment info
  pickupDate: string;
  deliveryDate: string;
  pickupPlace: string;
  deliveryPlace: string;
  
  // Goods info
  goodsDescription: string;
  weight: number;
  volume: number;
  packages: number;
  specialInstructions: string;
  
  // Blockchain info
  blockchainHash: string;
  signatureData: string;
  gpsCoordinates: {
    lat: number;
    lng: number;
    timestamp: string;
  } | null;
}

const mockECMRData: ECMRData = {
  id: 'eCMR-2025-001234',
  createdAt: '2025-01-15T08:30:00Z',
  status: 'active',
  
  senderName: 'Müller Electronics GmbH',
  senderAddress: 'Industriestraße 45, 80939 München, Deutschland',
  senderContact: '+49 89 123456-0',
  
  receiverName: 'Tech Solutions AG',
  receiverAddress: 'Bahnhofstraße 12, 1010 Wien, Österreich',
  receiverContact: '+43 1 9876543',
  
  carrierName: 'Schnell Transport GmbH',
  carrierAddress: 'Logistikpark 8, 83026 Rosenheim, Deutschland',
  carrierContact: '+49 8031 2345-0',
  vehiclePlate: 'RO-SB 1234',
  driverName: 'Hans Schmidt',
  
  pickupDate: '2025-01-15',
  deliveryDate: '2025-01-16',
  pickupPlace: 'München',
  deliveryPlace: 'Wien',
  
  goodsDescription: 'Elektronische Bauteile, empfindlich',
  weight: 2500,
  volume: 15.5,
  packages: 12,
  specialInstructions: 'Temperaturkontrolliert transportieren (15-25°C). Nicht stapeln.',
  
  blockchainHash: '0x7f9fade1c0d57a7af66ab4ead79c7d2d3f3c4a5b6c7d8e9f0a1b2c3d4e5f6a7b',
  signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  gpsCoordinates: null,
};

export function ECMRPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('overview');
  const [eCMRData, setECMRData] = useState<ECMRData>(mockECMRData);
  const [showSignature, setShowSignature] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: ECMRData['status']) => {
    const statusConfig = {
      draft: { label: 'Entwurf', variant: 'secondary' as const, icon: FileText },
      active: { label: 'Aktiv', variant: 'default' as const, icon: Truck },
      completed: { label: 'Abgeschlossen', variant: 'success' as const, icon: CheckCircle },
      archived: { label: 'Archiviert', variant: 'outline' as const, icon: Lock },
    };
    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className="gap-1">
        <config.icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <Card className="border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-orange-500/10">
                <FileText className="h-8 w-8 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-2xl">Elektronischer Frachtbrief (e-CMR)</CardTitle>
                <CardDescription className="text-base mt-1">
                  Digitale Dokumentation mit Blockchain-Technologie
                </CardDescription>
              </div>
            </div>
            {getStatusBadge(eCMRData.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                {eCMRData.id}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Erstellt: {formatDate(eCMRData.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Blockchain-gesichert</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-blue-600">Was ist der e-CMR?</p>
          <p className="text-muted-foreground mt-1">
            Der elektronische Frachtbrief (e-Frachtbrief oder e-CMR) ist die digitale Version des Papier-Frachtbriefs 
            und dient der elektronischen Übermittlung und Speicherung von Transportdaten. Er ermöglicht schnellere 
            Prozesse, Echtzeit-Nachverfolgung, geringere Verwaltungskosten und fälschungssichere Dokumentation 
            via Blockchain-Technologie.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="parties">Beteiligte</TabsTrigger>
          <TabsTrigger value="goods">Fracht</TabsTrigger>
          <TabsTrigger value="signature">Unterschrift</TabsTrigger>
          <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Route Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-orange-500" />
                  Transportroute
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-green-500/10 text-green-500">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{eCMRData.pickupPlace}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(eCMRData.pickupDate)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{eCMRData.senderAddress}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-px h-8 bg-border" />
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-orange-500/10 text-orange-500">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{eCMRData.deliveryPlace}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(eCMRData.deliveryDate)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{eCMRData.receiverAddress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-orange-500" />
                  Transportstatus
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">Status</span>
                  {getStatusBadge(eCMRData.status)}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">Fahrzeug</span>
                  <span className="font-medium">{eCMRData.vehiclePlate}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">Fahrer</span>
                  <span className="font-medium">{eCMRData.driverName}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Aktionen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  PDF herunterladen
                </Button>
                <Button variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" />
                  Drucken
                </Button>
                <Button variant="outline" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Teilen
                </Button>
                <Button variant="outline" className="gap-2">
                  <QrCode className="h-4 w-4" />
                  QR-Code anzeigen
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parties Tab */}
        <TabsContent value="parties" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sender */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-500" />
                  Absender
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{eCMRData.senderName}</p>
                <p className="text-muted-foreground">{eCMRData.senderAddress}</p>
                <p className="text-muted-foreground">{eCMRData.senderContact}</p>
              </CardContent>
            </Card>

            {/* Carrier */}
            <Card className="border-orange-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-orange-500" />
                  Frachtführer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{eCMRData.carrierName}</p>
                <p className="text-muted-foreground">{eCMRData.carrierAddress}</p>
                <p className="text-muted-foreground">{eCMRData.carrierContact}</p>
                <Separator className="my-2" />
                <p className="text-muted-foreground">Fahrzeug: {eCMRData.vehiclePlate}</p>
                <p className="text-muted-foreground">Fahrer: {eCMRData.driverName}</p>
              </CardContent>
            </Card>

            {/* Receiver */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-500" />
                  Empfänger
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{eCMRData.receiverName}</p>
                <p className="text-muted-foreground">{eCMRData.receiverAddress}</p>
                <p className="text-muted-foreground">{eCMRData.receiverContact}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Goods Tab */}
        <TabsContent value="goods" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-500" />
                Frachtdetails
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-orange-500">{eCMRData.weight}</p>
                  <p className="text-sm text-muted-foreground">Gewicht (kg)</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-orange-500">{eCMRData.volume}</p>
                  <p className="text-sm text-muted-foreground">Volumen (m³)</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-orange-500">{eCMRData.packages}</p>
                  <p className="text-sm text-muted-foreground">Packstücke</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-green-500">
                    <CheckCircle className="h-8 w-8 mx-auto" />
                  </p>
                  <p className="text-sm text-muted-foreground">Unbeschädigt</p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Warenbeschreibung</Label>
                  <p className="mt-1">{eCMRData.goodsDescription}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Besondere Anweisungen</Label>
                  <p className="mt-1">{eCMRData.specialInstructions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signature Tab */}
        <TabsContent value="signature" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Signature Pad */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Signature className="h-5 w-5 text-orange-500" />
                  Digitale Unterschrift
                </CardTitle>
                <CardDescription>
                  Unterschreiben Sie direkt auf dem Touchscreen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-[4/3] rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/20">
                  {showSignature ? (
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Unterschrift erfasst</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Signature className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Berühren Sie hier zum Unterschreiben</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                    onClick={() => setShowSignature(true)}
                  >
                    <Signature className="h-4 w-4 mr-2" />
                    Unterschreiben
                  </Button>
                  <Button variant="outline" onClick={() => setShowSignature(false)}>
                    Zurücksetzen
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* GPS Data */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-orange-500" />
                  GPS-Quittierung
                </CardTitle>
                <CardDescription>
                  Automatische Standorterfassung bei Unterschrift
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-600">GPS erforderlich</p>
                      <p className="text-muted-foreground mt-1">
                        Bei der Quittierung werden automatisch GPS-Koordinaten gespeichert. 
                        Dies dient als Betrugsschutz und Nachweis für den Lieferort.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">GPS aktiv</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">Standort</span>
                    <span className="text-sm text-muted-foreground">
                      {eCMRData.gpsCoordinates 
                        ? `${eCMRData.gpsCoordinates.lat.toFixed(4)}, ${eCMRData.gpsCoordinates.lng.toFixed(4)}`
                        : 'Wird bei Unterschrift erfasst...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">Zeitstempel</span>
                    <span className="text-sm text-muted-foreground">
                      {eCMRData.gpsCoordinates?.timestamp || 'Ausstehend'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Blockchain Tab */}
        <TabsContent value="blockchain" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5 text-orange-500" />
                Blockchain-Verifizierung
              </CardTitle>
              <CardDescription>
                Fälschungssichere Dokumentation durch Blockchain-Technologie
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium text-green-600">Dokument verifiziert</p>
                    <p className="text-sm text-muted-foreground">
                      Dieses e-CMR ist auf der Blockchain unveränderbar gespeichert
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-muted-foreground">Blockchain-Hash</Label>
                <div className="flex gap-2">
                  <Input 
                    value={eCMRData.blockchainHash} 
                    readOnly 
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Netzwerk</p>
                  <p className="font-medium">Ethereum Mainnet</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Block</p>
                  <p className="font-medium">#19,234,567</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Zeitstempel</p>
                  <p className="font-medium">15.01.2025 08:30:45 UTC</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Bestätigungen</p>
                  <p className="font-medium text-green-500">1,234</p>
                </div>
              </div>

              <Button variant="outline" className="w-full gap-2">
                <Link2 className="h-4 w-4" />
                Auf Etherscan anzeigen
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
