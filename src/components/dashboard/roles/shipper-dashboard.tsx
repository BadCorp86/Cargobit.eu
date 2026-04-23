'use client';

import { DashboardLayout } from '../dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Truck,
  Package,
  Wallet,
  TrendingUp,
  MapPin,
  Clock,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ShipperDashboardProps {
  onLogout: () => void;
  onNewTransport: () => void;
}

export function ShipperDashboard({ onLogout, onNewTransport }: ShipperDashboardProps) {
  return (
    <DashboardLayout userRole="shipper" onLogout={onLogout}>
      <div className="space-y-6">
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Verlader Dashboard</h1>
            <p className="text-gray-400">Willkommen zurück</p>
          </div>
          <Button className="btn-glow gap-2" onClick={onNewTransport}>
            <Plus className="w-4 h-4" />
            Transport erstellen
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Truck className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">3</div>
            <div className="text-sm text-gray-400">Aktive Transporte</div>
          </div>
          
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">24</div>
            <div className="text-sm text-gray-400">Abgeschlossen</div>
          </div>
          
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">2</div>
            <div className="text-sm text-gray-400">Warten auf Angebote</div>
          </div>
          
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">€1,250</div>
            <div className="text-sm text-gray-400">Wallet Guthaben</div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* My Transports */}
          <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Meine Transporte</h3>
              <Badge variant="outline" className="text-cb-accent border-cb-accent/30">Alle anzeigen</Badge>
            </div>
            
            <div className="space-y-3">
              <TransportCard
                route="Hamburg → München"
                date="Heute, 14:00"
                status="active"
                price="€850"
                driver="Max M."
              />
              <TransportCard
                route="Berlin → Köln"
                date="Morgen, 08:00"
                status="pending"
                offers={3}
              />
              <TransportCard
                route="Frankfurt → Stuttgart"
                date="25.04.2025"
                status="completed"
                price="€420"
              />
            </div>
          </div>

          {/* AI Price Card */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-cb-accent/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-cb-accent" />
              </div>
              <h3 className="font-semibold text-white">KI-Preisempfehlung</h3>
            </div>
            
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Marktpreis</div>
              <div className="text-lg text-gray-300 line-through">€1.520</div>
            </div>
            
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Empfohlener Preis</div>
              <div className="text-3xl font-bold text-white">€1.680</div>
            </div>
            
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mb-4">
              +10% höhere Erfolgsrate
            </Badge>
            
            <div className="p-3 rounded-xl bg-white/5 mb-4">
              <div className="text-xs text-gray-400 mb-2">Route</div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cb-accent" />
                <span className="text-white">Hamburg → München</span>
              </div>
            </div>
            
            <Button className="w-full btn-primary">
              Preis übernehmen
            </Button>
          </div>
        </div>

        {/* Live Tracking */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Live Tracking</h3>
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
              Aktiv
            </Badge>
          </div>
          
          <div className="relative h-48 rounded-xl bg-cb-darker overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Route visualization */}
              <div className="relative w-3/4 h-1 bg-white/10 rounded-full">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-cb-primary rounded-full" />
                <div className="absolute left-1/3 top-1/2 -translate-y-1/2 w-3 h-3 bg-cb-accent rounded-full animate-pulse" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white/30 rounded-full" />
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gradient-to-r from-cb-primary via-cb-accent to-transparent" style={{ width: '33%' }} />
              </div>
            </div>
            
            <div className="absolute bottom-3 left-3 glass px-3 py-2 rounded-lg">
              <div className="text-xs text-gray-400">Abholort</div>
              <div className="text-sm text-white font-medium">Hamburg</div>
            </div>
            
            <div className="absolute bottom-3 right-3 glass px-3 py-2 rounded-lg">
              <div className="text-xs text-gray-400">Ziel</div>
              <div className="text-sm text-white font-medium">München</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function TransportCard({ route, date, status, price, driver, offers }: {
  route: string;
  date: string;
  status: 'active' | 'pending' | 'completed';
  price?: string;
  driver?: string;
  offers?: number;
}) {
  const statusStyles = {
    active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  const statusLabels = {
    active: 'Unterwegs',
    pending: 'Wartet',
    completed: 'Abgeschlossen',
  };

  return (
    <div className="p-4 rounded-xl bg-white/5 hover:bg-white/8 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cb-accent" />
          <span className="font-medium text-white">{route}</span>
        </div>
        <Badge className={statusStyles[status]}>{statusLabels[status]}</Badge>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <Clock className="w-3 h-3" />
          {date}
        </div>
        {price && <span className="text-white font-medium">{price}</span>}
        {driver && <span className="text-gray-400">Fahrer: {driver}</span>}
        {offers !== undefined && (
          <span className="text-cb-accent">{offers} Angebote</span>
        )}
      </div>
    </div>
  );
}
