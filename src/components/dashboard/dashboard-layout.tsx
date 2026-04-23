'use client';

import { useState, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Truck,
  Users,
  Wallet,
  FileText,
  HeadphonesIcon,
  Settings,
  LogOut,
  Bell,
  Search,
  ChevronDown,
  Menu,
  X,
  Shield,
  BarChart3,
  Package,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  userRole: 'admin' | 'shipper' | 'carrier' | 'driver' | 'support' | 'marketer';
  userName?: string;
  userAvatar?: string;
  onLogout: () => void;
}

const roleNavItems: Record<string, { icon: any; label: string; href: string }[]> = {
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: Users, label: 'Benutzer', href: '/admin/users' },
    { icon: Truck, label: 'Transporte', href: '/admin/transports' },
    { icon: Wallet, label: 'Finanzen', href: '/admin/finances' },
    { icon: Shield, label: 'Risiko', href: '/admin/risk' },
    { icon: FileText, label: 'Dokumente', href: '/admin/documents' },
    { icon: HeadphonesIcon, label: 'Support', href: '/admin/support' },
  ],
  shipper: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/shipper' },
    { icon: Package, label: 'Meine Transporte', href: '/shipper/transports' },
    { icon: Truck, label: 'Neuer Transport', href: '/shipper/new' },
    { icon: Wallet, label: 'Wallet', href: '/shipper/wallet' },
    { icon: FileText, label: 'Dokumente', href: '/shipper/documents' },
    { icon: HeadphonesIcon, label: 'Support', href: '/shipper/support' },
  ],
  carrier: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/carrier' },
    { icon: Truck, label: 'Verfügbare Loads', href: '/carrier/loads' },
    { icon: Users, label: 'Fahrer', href: '/carrier/drivers' },
    { icon: BarChart3, label: 'Flotte', href: '/carrier/fleet' },
    { icon: Wallet, label: 'Wallet', href: '/carrier/wallet' },
    { icon: HeadphonesIcon, label: 'Support', href: '/carrier/support' },
  ],
  driver: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/driver' },
    { icon: Truck, label: 'Mein Auftrag', href: '/driver/job' },
    { icon: FileText, label: 'Dokumente', href: '/driver/documents' },
    { icon: Wallet, label: 'Verdienst', href: '/driver/earnings' },
  ],
  support: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/support' },
    { icon: HeadphonesIcon, label: 'Tickets', href: '/support/tickets' },
    { icon: Truck, label: 'Transporte', href: '/support/transports' },
    { icon: Users, label: 'Benutzer', href: '/support/users' },
  ],
  marketer: [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/marketer' },
    { icon: BarChart3, label: 'Kampagnen', href: '/marketer/campaigns' },
    { icon: Users, label: 'Partner', href: '/marketer/partners' },
    { icon: BarChart3, label: 'Analytics', href: '/marketer/analytics' },
  ],
};

const roleColors: Record<string, string> = {
  admin: 'from-red-500 to-red-600',
  shipper: 'from-blue-500 to-blue-600',
  carrier: 'from-purple-500 to-purple-600',
  driver: 'from-green-500 to-green-600',
  support: 'from-orange-500 to-orange-600',
  marketer: 'from-pink-500 to-pink-600',
};

export function DashboardLayout({
  children,
  userRole,
  userName = 'Max Mustermann',
  userAvatar,
  onLogout,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(0);

  const navItems = roleNavItems[userRole] || roleNavItems.shipper;
  const roleGradient = roleColors[userRole];

  return (
    <div className="min-h-screen bg-cb-dark">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 glass-strong border-r border-white/5 z-40 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleGradient} flex items-center justify-center`}>
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-white">CargoBit</span>
              <Badge variant="outline" className="ml-2 text-xs capitalize">
                {userRole}
              </Badge>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item, idx) => (
            <a
              key={idx}
              href={item.href}
              onClick={() => setActiveItem(idx)}
              className={`sidebar-item ${activeItem === idx ? 'active' : ''}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <a href="#settings" className="sidebar-item mb-2">
            <Settings className="w-5 h-5" />
            <span>Einstellungen</span>
          </a>
          <button onClick={onLogout} className="sidebar-item w-full text-red-400 hover:text-red-300">
            <LogOut className="w-5 h-5" />
            <span>Abmelden</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="h-16 glass sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 border-b border-white/5">
          {/* Left - Mobile Menu + Search */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-gray-400"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Suchen..."
                className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-48"
              />
            </div>
          </div>

          {/* Right - Notifications + User */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-white/5 text-gray-400">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User Menu */}
            <div className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-xl px-3 py-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={userAvatar} />
                <AvatarFallback className={`bg-gradient-to-br ${roleGradient} text-white text-sm`}>
                  {userName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-white">{userName}</div>
                <div className="text-xs text-gray-400 capitalize">{userRole}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
