'use client';

import { DashboardLayout } from '../dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Truck,
  Users,
  Wallet,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  Euro,
  Activity,
  MapPin,
  Clock,
  Eye,
} from 'lucide-react';

interface AdminDashboardProps {
  onLogout: () => void;
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  return (
    <DashboardLayout userRole="admin" onLogout={onLogout}>
      <div className="space-y-6">
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400">Willkommen zurück, Admin</p>
          </div>
          <Button className="btn-primary gap-2">
            <Activity className="w-4 h-4" />
            Live Ansicht
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Aktive Transporte"
            value="3,842"
            change="+12%"
            changeType="positive"
            icon={<Truck className="w-5 h-5" />}
            color="blue"
          />
          <KPICard
            title="Umsatz heute"
            value="€234,500"
            change="+8.2%"
            changeType="positive"
            icon={<Euro className="w-5 h-5" />}
            color="green"
          />
          <KPICard
            title="Offene Tickets"
            value="47"
            change="-3"
            changeType="negative"
            icon={<AlertTriangle className="w-5 h-5" />}
            color="orange"
          />
          <KPICard
            title="Neue Nutzer"
            value="156"
            change="+24%"
            changeType="positive"
            icon={<Users className="w-5 h-5" />}
            color="purple"
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Live Map */}
          <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Live Karte</h3>
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                <Activity className="w-3 h-3 mr-1" />
                Live
              </Badge>
            </div>
            <div className="relative h-64 rounded-xl bg-cb-darker overflow-hidden">
              {/* Simplified Map Visualization */}
              <svg viewBox="0 0 400 200" className="w-full h-full">
                {/* Europe outline */}
                <ellipse cx="200" cy="100" rx="180" ry="90" fill="rgba(28,126,214,0.05)" stroke="rgba(0,212,255,0.2)" strokeWidth="1" />
                
                {/* Route lines */}
                <path d="M80,60 Q150,40 220,70" stroke="#00D4FF" strokeWidth="2" fill="none" strokeDasharray="5,5">
                  <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" repeatCount="indefinite" />
                </path>
                <path d="M220,70 Q280,50 350,90" stroke="#1C7ED6" strokeWidth="2" fill="none" strokeDasharray="5,5">
                  <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2.5s" repeatCount="indefinite" />
                </path>
                
                {/* Cities */}
                <circle cx="80" cy="60" r="8" fill="#00D4FF" className="animate-pulse-node" />
                <circle cx="220" cy="70" r="6" fill="#1C7ED6" className="animate-pulse-node" />
                <circle cx="350" cy="90" r="8" fill="#00D4FF" className="animate-pulse-node" />
                
                {/* Labels */}
                <text x="80" y="80" fill="#A0AEC0" fontSize="8" textAnchor="middle">Hamburg</text>
                <text x="220" y="90" fill="#A0AEC0" fontSize="8" textAnchor="middle">Mailand</text>
                <text x="350" y="110" fill="#A0AEC0" fontSize="8" textAnchor="middle">Barcelona</text>
              </svg>
              
              {/* Stats overlay */}
              <div className="absolute bottom-4 left-4 flex gap-4">
                <div className="glass px-3 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">Aktive Routen</div>
                  <div className="text-lg font-bold text-white">142</div>
                </div>
                <div className="glass px-3 py-2 rounded-lg">
                  <div className="text-xs text-gray-400">Fahrer unterwegs</div>
                  <div className="text-lg font-bold text-white">89</div>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts Panel */}
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="font-semibold text-white mb-4">Warnungen</h3>
            <div className="space-y-3">
              <AlertItem
                type="warning"
                title="Verdächtige Aktivität"
                description="User #1234 - Mehrere fehlgeschlagene Anmeldungen"
                time="vor 5 Min"
              />
              <AlertItem
                type="error"
                title="Zahlungsfehler"
                description="Transfer #TR-5678 konnte nicht verarbeitet werden"
                time="vor 12 Min"
              />
              <AlertItem
                type="info"
                title="Neue Verifizierung"
                description="Fahrer Max M. wartet auf KYC-Prüfung"
                time="vor 25 Min"
              />
              <AlertItem
                type="warning"
                title="Hohe Risikobewertung"
                description="Transport #T-9012 hat Risikoscore 85"
                time="vor 1 Std"
              />
            </div>
          </div>
        </div>

        {/* Revenue Chart & User Table */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Umsatz (7 Tage)</h3>
              <Badge variant="outline" className="text-green-400 border-green-500/30">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12.4%
              </Badge>
            </div>
            <div className="h-48 flex items-end gap-2">
              {[65, 45, 78, 52, 88, 70, 95].map((height, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-gradient-to-t from-cb-primary to-cb-accent rounded-t-lg transition-all duration-300 hover:opacity-80"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-gray-500">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][idx]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Users */}
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="font-semibold text-white mb-4">Neue Benutzer</h3>
            <div className="space-y-3">
              <UserRow name="Thomas Schmidt" email="thomas@example.com" role="shipper" status="verified" />
              <UserRow name="Maria Garcia" email="maria@example.com" role="carrier" status="pending" />
              <UserRow name="Jan Kowalski" email="jan@example.com" role="driver" status="verified" />
              <UserRow name="Sophie Martin" email="sophie@example.com" role="shipper" status="pending" />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Helper Components
function KPICard({ title, value, change, changeType, icon, color }: {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ReactNode;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20',
    green: 'from-green-500/20 to-green-500/5 border-green-500/20',
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/20',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20',
  };

  const iconColors: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    purple: 'text-purple-400',
  };

  return (
    <div className={`glass-card p-5 rounded-2xl bg-gradient-to-br ${colors[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl bg-white/5 ${iconColors[color]}`}>{icon}</div>
        <Badge variant="outline" className={changeType === 'positive' ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'}>
          {changeType === 'positive' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
          {change}
        </Badge>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400">{title}</div>
    </div>
  );
}

function AlertItem({ type, title, description, time }: {
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  time: string;
}) {
  const styles = {
    warning: 'border-orange-500/30 bg-orange-500/5',
    error: 'border-red-500/30 bg-red-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
  };

  const icons = {
    warning: <AlertTriangle className="w-4 h-4 text-orange-400" />,
    error: <AlertTriangle className="w-4 h-4 text-red-400" />,
    info: <Eye className="w-4 h-4 text-blue-400" />,
  };

  return (
    <div className={`p-3 rounded-xl border ${styles[type]}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icons[type]}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white">{title}</div>
          <div className="text-xs text-gray-400 truncate">{description}</div>
        </div>
        <div className="text-xs text-gray-500 whitespace-nowrap">{time}</div>
      </div>
    </div>
  );
}

function UserRow({ name, email, role, status }: {
  name: string;
  email: string;
  role: string;
  status: 'verified' | 'pending';
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cb-primary to-cb-accent flex items-center justify-center text-white font-medium">
        {name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white">{name}</div>
        <div className="text-xs text-gray-400">{email}</div>
      </div>
      <Badge variant="outline" className="text-xs capitalize">{role}</Badge>
      <Badge className={status === 'verified' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
        {status === 'verified' ? 'Verifiziert' : 'Ausstehend'}
      </Badge>
    </div>
  );
}
