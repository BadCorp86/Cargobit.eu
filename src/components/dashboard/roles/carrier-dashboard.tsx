'use client';

import { DashboardLayout } from '../dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Truck,
  Users,
  Wallet,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle2,
  Navigation,
} from 'lucide-react';

interface CarrierDashboardProps {
  onLogout: () => void;
}

export function CarrierDashboard({ onLogout }: CarrierDashboardProps) {
  return (
    <DashboardLayout userRole="carrier" onLogout={onLogout}>
      <div className="space-y-6">
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Carrier Dashboard</h1>
            <p className="text-gray-400">Flottenübersicht & verfügbare Aufträge</p>
          </div>
          <Button className="btn-primary gap-2">
            <MapPin className="w-4 h-4" />
            Kartenansicht
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Verfügbare Loads" value="24" icon={<Truck className="w-5 h-5" />} color="blue" />
          <KPICard title="Fahrzeuge" value="12" icon={<Navigation className="w-5 h-5" />} color="green" />
          <KPICard title="Fahrer" value="15" icon={<Users className="w-5 h-5" />} color="purple" />
          <KPICard title="Umsatz/Monat" value="€45.2k" icon={<Wallet className="w-5 h-5" />} color="yellow" />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Available Loads */}
          <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
            <h3 className="font-semibold text-white mb-4">Verfügbare Aufträge</h3>
            <div className="space-y-3">
              <LoadCard
                route="Hamburg → Barcelona"
                distance="1.850 km"
                price="€1.680"
                type="Paletten"
                urgency="Sofort"
              />
              <LoadCard
                route="Berlin → Mailand"
                distance="1.200 km"
                price="€1.250"
                type="Stückgut"
                urgency="Morgen"
              />
              <LoadCard
                route="München → Paris"
                distance="830 km"
                price="€980"
                type="Komplettladung"
                urgency="In 2 Tagen"
              />
            </div>
          </div>

          {/* Smart Suggestions */}
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="font-semibold text-white mb-4">KI-Empfehlungen</h3>
            <div className="space-y-3">
              <SuggestionCard
                message="Fahrer Max M. hat Kapazität für die Route Berlin → Mailand"
                action="Zuweisen"
              />
              <SuggestionCard
                message="Fahrzeug VW-123 in der Nähe von Hamburg verfügbar"
                action="Details"
              />
            </div>
          </div>
        </div>

        {/* Fleet Map */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="font-semibold text-white mb-4">Flottenkarte</h3>
          <div className="h-64 rounded-xl bg-cb-darker relative overflow-hidden">
            <svg viewBox="0 0 400 200" className="w-full h-full">
              {/* Fleet nodes */}
              <circle cx="100" cy="80" r="6" fill="#22C55E" className="animate-pulse" />
              <circle cx="150" cy="120" r="6" fill="#22C55E" className="animate-pulse" />
              <circle cx="200" cy="90" r="6" fill="#1C7ED6" />
              <circle cx="280" cy="110" r="6" fill="#F59E0B" />
              <circle cx="320" cy="70" r="6" fill="#22C55E" className="animate-pulse" />
              
              {/* Labels */}
              <text x="100" y="100" fill="#A0AEC0" fontSize="10" textAnchor="middle">Hamburg</text>
              <text x="200" y="110" fill="#A0AEC0" fontSize="10" textAnchor="middle">Berlin</text>
              <text x="320" y="90" fill="#A0AEC0" fontSize="10" textAnchor="middle">München</text>
            </svg>
            
            <div className="absolute bottom-4 left-4 flex gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                Verfügbar
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                Unterwegs
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                Pause
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function KPICard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <div className="glass-card p-5 rounded-2xl">
      <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400">{title}</div>
    </div>
  );
}

function LoadCard({ route, distance, price, type, urgency }: {
  route: string;
  distance: string;
  price: string;
  type: string;
  urgency: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-white/5 hover:bg-white/8 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cb-accent" />
          <span className="font-medium text-white">{route}</span>
        </div>
        <Badge variant="outline" className="text-cb-accent border-cb-accent/30">{urgency}</Badge>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">{distance} • {type}</span>
        <span className="text-lg font-bold text-white">{price}</span>
      </div>
    </div>
  );
}

function SuggestionCard({ message, action }: { message: string; action: string }) {
  return (
    <div className="p-3 rounded-xl bg-cb-accent/10 border border-cb-accent/20">
      <div className="text-sm text-gray-300 mb-2">{message}</div>
      <Button size="sm" className="btn-primary">{action}</Button>
    </div>
  );
}
