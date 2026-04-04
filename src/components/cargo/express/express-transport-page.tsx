'use client';

import { useState } from 'react';
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
  Navigation,
  Truck,
  Timer,
  DollarSign,
  Weight,
  Box,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpressTransport {
  id: string;
  pickupPlace: string;
  pickupAddress: string;
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
}

const mockExpressTransports: ExpressTransport[] = [
  {
    id: '1',
    pickupPlace: 'Berlin-Mitte',
    pickupAddress: 'Alexanderplatz 1, 10178 Berlin',
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
  },
  {
    id: '2',
    pickupPlace: 'Berlin-Charlottenburg',
    pickupAddress: 'Kurfürstendamm 100, 10709 Berlin',
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
  },
];

export function ExpressTransportPage() {
  const { language } = useCargoBitStore();
  const [expressTransports, setExpressTransports] = useState(mockExpressTransports);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
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

  const handleCreateExpress = async () => {
    const express: ExpressTransport = {
      id: Date.now().toString(),
      pickupPlace: newExpress.pickupPlace || 'Unknown',
      pickupAddress: newExpress.pickupAddress,
      deliveryPlace: newExpress.deliveryPlace || 'Unknown',
      description: newExpress.description,
      weight: parseFloat(newExpress.weight) || 0,
      pallets: parseInt(newExpress.pallets) || 0,
      offeredPrice: parseFloat(newExpress.offeredPrice) || 0,
      alertRadiusKm: parseInt(newExpress.alertRadius) || 20,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (parseInt(newExpress.expiresInMinutes) || 30) * 60 * 1000).toISOString(),
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
  };

  const handleAccept = (id: string) => {
    setExpressTransports(prev => 
      prev.map(e => e.id === id ? { ...e, status: 'accepted' } : e)
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
              <DialogContent className="max-w-md">
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

        {/* Express Transports List */}
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
                )}>
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row">
                      <div className={cn(
                        'w-full lg:w-2 h-2 lg:h-auto',
                        express.status === 'active' && 'bg-red-500',
                        express.status === 'accepted' && 'bg-green-500',
                      )} />
                      
                      <div className="flex-1 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="space-y-3">
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
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Lieferung</p>
                                  <p className="font-medium">{express.deliveryPlace}</p>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm">{express.description}</p>
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
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-3">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">€{express.offeredPrice}</p>
                            </div>
                            {express.status === 'active' && (
                              <div className="flex items-center gap-2 text-red-600">
                                <Timer className="w-4 h-4" />
                                <span className="font-mono font-medium">
                                  {formatTimeRemaining(express.expiresAt)}
                                </span>
                              </div>
                            )}
                            {express.status === 'accepted' && (
                              <Badge className="bg-green-500">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Akzeptiert
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
                  Fahrer im 20km Umkreis erhalten Push-Benachrichtigung
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">Push Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Direkte Benachrichtigung auf Android & iOS
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
                  Automatischer Ablauf nach eingestellter Zeit
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
