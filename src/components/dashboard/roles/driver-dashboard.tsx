'use client';

import { DashboardLayout } from '../dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Truck,
  MapPin,
  Clock,
  Wallet,
  Star,
  Navigation,
  CheckCircle2,
  Phone,
  FileText,
} from 'lucide-react';

interface DriverDashboardProps {
  onLogout: () => void;
}

export function DriverDashboard({ onLogout }: DriverDashboardProps) {
  return (
    <DashboardLayout userRole="driver" onLogout={onLogout}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Current Job Card */}
        <div className="glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse" />
              Aktueller Auftrag
            </Badge>
            <span className="text-sm text-gray-400">#TR-4829</span>
          </div>

          <div className="space-y-4">
            {/* Route */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-white">Hamburg → München</div>
                <div className="text-sm text-gray-400">1.850 km • Paletten (8 Stk)</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-white">€850</div>
                <div className="text-xs text-gray-400">Verdienst</div>
              </div>
            </div>

            {/* Next Stop */}
            <div className="p-4 rounded-xl bg-cb-accent/10 border border-cb-accent/20">
              <div className="flex items-center gap-3">
                <Navigation className="w-5 h-5 text-cb-accent" />
                <div className="flex-1">
                  <div className="text-sm text-gray-400">Nächster Halt</div>
                  <div className="font-medium text-white">Abholort: Hamburg, Hafenstraße 42</div>
                </div>
                <div className="text-sm text-cb-accent">in 15 min</div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-gray-400">Auftrag angenommen</span>
                <span className="text-xs text-gray-500 ml-auto">08:30</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-gray-400">Fahrt zum Abholort</span>
                <span className="text-xs text-gray-500 ml-auto">09:15</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-cb-accent animate-pulse" />
                <span className="text-white font-medium">Beladung</span>
                <span className="text-xs text-cb-accent ml-auto">Jetzt</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-white/20" />
                <span className="text-gray-500">Transport</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-white/20" />
                <span className="text-gray-500">Entladung</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button className="h-14 btn-glow text-lg">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Beladung fertig
          </Button>
          <Button variant="outline" className="h-14 btn-outline text-lg">
            <Phone className="w-5 h-5 mr-2" />
            Support
          </Button>
        </div>

        {/* Navigation Map */}
        <div className="glass-card p-4 rounded-2xl">
          <div className="relative h-48 rounded-xl bg-cb-darker overflow-hidden">
            {/* Simplified map */}
            <svg viewBox="0 0 200 100" className="w-full h-full">
              <path d="M20,80 Q50,40 100,50 Q150,60 180,20" fill="none" stroke="#1C7ED6" strokeWidth="3" strokeDasharray="5,5" />
              <circle cx="20" cy="80" r="5" fill="#22C55E" />
              <circle cx="180" cy="20" r="5" fill="#EF4444" />
              <circle cx="50" cy="65" r="4" fill="#00D4FF" className="animate-pulse" />
            </svg>
            
            <div className="absolute top-3 left-3 glass px-3 py-2 rounded-lg">
              <div className="text-xs text-gray-400">Entfernung</div>
              <div className="text-lg font-bold text-white">1.850 km</div>
            </div>
          </div>
        </div>

        {/* Documents & Earnings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4 rounded-2xl text-center">
            <FileText className="w-8 h-8 text-cb-accent mx-auto mb-2" />
            <div className="font-medium text-white">Dokumente</div>
            <div className="text-sm text-gray-400">CMR, Lieferschein</div>
          </div>
          
          <div className="glass-card p-4 rounded-2xl text-center">
            <Wallet className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="font-medium text-white">€3,420</div>
            <div className="text-sm text-gray-400">Verfügbarer Verdienst</div>
          </div>
        </div>

        {/* Stats */}
        <div className="glass-card p-4 rounded-2xl">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">342</div>
              <div className="text-xs text-gray-400">Touren</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">4.9 ⭐</div>
              <div className="text-xs text-gray-400">Bewertung</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">98%</div>
              <div className="text-xs text-gray-400">Pünktlichkeit</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
