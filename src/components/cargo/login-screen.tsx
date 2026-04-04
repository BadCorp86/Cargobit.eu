'use client';

import { motion } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { roleConfigs, publicRoleConfigs } from '@/lib/mock-data';
import { t } from '@/lib/i18n';
import { Language } from '@/types';
import Image from 'next/image';
import {
  Shield,
  Radio,
  Truck,
  Package,
  Headphones,
  User,
  Lock,
  CheckCircle2,
  Users,
  Building2,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { languages } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  Shield,
  Radio,
  Truck,
  Package,
  Headphones,
  User,
};

// Role colors for visual distinction
const roleColors: Record<string, { bg: string; border: string; icon: string }> = {
  admin: { bg: 'from-red-500 to-rose-600', border: 'hover:border-red-300 dark:hover:border-red-700/50', icon: 'text-red-500' },
  dispatcher: { bg: 'from-blue-500 to-indigo-600', border: 'hover:border-blue-300 dark:hover:border-blue-700/50', icon: 'text-blue-500' },
  driver: { bg: 'from-purple-500 to-violet-600', border: 'hover:border-purple-300 dark:hover:border-purple-700/50', icon: 'text-purple-500' },
  shipper: { bg: 'from-emerald-500 to-teal-600', border: 'hover:border-emerald-300 dark:hover:border-emerald-700/50', icon: 'text-emerald-500' },
  support: { bg: 'from-amber-500 to-orange-600', border: 'hover:border-amber-300 dark:hover:border-amber-700/50', icon: 'text-amber-500' },
};

// Extended role info for demo
const roleInfo: Record<string, { features: string[]; access: 'full' | 'limited' | 'operational' }> = {
  admin: { 
    features: ['Benutzerverwaltung', 'Analytik', 'Finanzen', 'Alle Daten'],
    access: 'full'
  },
  dispatcher: { 
    features: ['Aufträge verwalten', 'Flotte steuern', 'Routen planen', 'Wallet'],
    access: 'full'
  },
  driver: { 
    features: ['Lieferungen', 'Navigation', 'Status-Updates', 'Chat'],
    access: 'operational'
  },
  shipper: { 
    features: ['Transporte buchen', 'Tracking', 'Rechnungen', 'Support'],
    access: 'limited'
  },
  support: { 
    features: ['Tickets', 'Konfliktlösung', 'Chat-Zugang', 'Keine Finanzen'],
    access: 'limited'
  },
};

export function LoginScreen() {
  const { setRole, language, setLanguage } = useCargoBitStore();

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as Language);
  };

  const getRoleLabel = (roleId: string): string => {
    const labels: Record<string, Record<string, string>> = {
      admin: { de: 'Administrator', en: 'Administrator' },
      dispatcher: { de: 'Disponent / Spediteur', en: 'Dispatcher / Carrier' },
      driver: { de: 'Fahrer', en: 'Driver' },
      shipper: { de: 'Versender / Verlader', en: 'Shipper / Loader' },
      support: { de: 'Support-Agent', en: 'Support Agent' },
    };
    return labels[roleId]?.[language] || roleId;
  };

  const getRoleDescription = (roleId: string): string => {
    const descriptions: Record<string, Record<string, string>> = {
      admin: { 
        de: 'Vollzugriff auf alle Plattformfunktionen (nur durch Betreiber zuweisbar)',
        en: 'Full access to all platform features (owner-assigned only)'
      },
      dispatcher: { 
        de: 'Sendungsverwaltung, Routenplanung und Flottensteuerung',
        en: 'Shipment management, route planning and fleet control'
      },
      driver: { 
        de: 'Aktive Lieferungen, Navigation und Status-Updates',
        en: 'Active deliveries, navigation and status updates'
      },
      shipper: { 
        de: 'Transporte erstellen, verfolgen und verwalten',
        en: 'Create, track and manage transports'
      },
      support: { 
        de: 'Ticketverwaltung und Konfliktlösung (nur durch Betreiber zuweisbar)',
        en: 'Ticket management and conflict resolution (owner-assigned only)'
      },
    };
    return descriptions[roleId]?.[language] || '';
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Animated gradient background */}
      <div className="absolute inset-0 gradient-bg opacity-5" />

      {/* Floating orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />

      {/* Language selector */}
      <div className="absolute top-6 right-6 z-20">
        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-48 bg-white/80 dark:bg-black/40 backdrop-blur-lg border-white/30 dark:border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
        {/* Logo & Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Image src="/logo.svg" alt="CargoBit" width={36} height={36} className="text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">
              {t('appName', language)}
            </h1>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-lg text-muted-foreground"
          >
            {t('appTagline', language)}
          </motion.p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="w-full max-w-5xl"
        >
          <div className="glass-light dark:glass-dark rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/5">
            {/* Demo mode badge */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <Badge variant="secondary" className="px-4 py-1.5 text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-0">
                <span className="mr-2 w-2 h-2 rounded-full bg-green-500 pulse-live" />
                {t('demoMode', language)}
              </Badge>
              <p className="text-sm text-muted-foreground text-center max-w-lg">
                {language === 'de' 
                  ? 'Wählen Sie eine Rolle, um die Plattform zu erkunden. Admin und Support werden vom Plattformbetreiber zugewiesen.'
                  : 'Select a role to explore the platform. Admin and Support are assigned by the platform owner.'}
              </p>
            </div>

            {/* Role Categories */}
            <div className="space-y-6">
              {/* Public Roles Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-4 h-4 text-green-500" />
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {language === 'de' ? 'Öffentlich verfügbar' : 'Publicly Available'}
                  </h3>
                  <div className="flex-1 h-px bg-border/50" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {publicRoleConfigs.filter(r => !r.ownerOnly).map((role, index) => {
                    const Icon = iconMap[role.icon] || User;
                    const colors = roleColors[role.id];
                    const info = roleInfo[role.id];
                    
                    return (
                      <motion.div
                        key={role.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.08, duration: 0.5 }}
                      >
                        <Button
                          onClick={() => setRole(role.id)}
                          className={cn(
                            'w-full h-auto p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-border/50 transition-all duration-300 group cursor-pointer flex flex-col items-start gap-3 text-left shadow-sm hover:shadow-md hover:shadow-orange-500/10',
                            colors.border
                          )}
                          variant="outline"
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 bg-gradient-to-br', colors.bg)}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground text-sm">
                                {getRoleLabel(role.id)}
                              </p>
                              <Badge variant="secondary" className="text-[10px] mt-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                                {language === 'de' ? 'Frei wählbar' : 'Free to choose'}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {getRoleDescription(role.id)}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {info.features.slice(0, 3).map((feature, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Owner-Assigned Roles Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {language === 'de' ? 'Nur durch Betreiber zuweisbar' : 'Owner-Assigned Only'}
                  </h3>
                  <div className="flex-1 h-px bg-border/50" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  {roleConfigs.filter(r => r.ownerOnly).map((role, index) => {
                    const Icon = iconMap[role.icon] || User;
                    const colors = roleColors[role.id];
                    const info = roleInfo[role.id];
                    
                    return (
                      <motion.div
                        key={role.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.08, duration: 0.5 }}
                      >
                        <Button
                          onClick={() => setRole(role.id)}
                          className={cn(
                            'w-full h-auto p-4 rounded-2xl bg-white/50 dark:bg-white/5 border border-border/50 transition-all duration-300 group cursor-pointer flex flex-col items-start gap-3 text-left shadow-sm hover:shadow-md hover:shadow-orange-500/10',
                            colors.border
                          )}
                          variant="outline"
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 bg-gradient-to-br', colors.bg)}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground text-sm">
                                {getRoleLabel(role.id)}
                              </p>
                              <Badge variant="secondary" className="text-[10px] mt-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                                <Lock className="w-2.5 h-2.5 mr-1" />
                                {language === 'de' ? 'Gesperrt' : 'Restricted'}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {getRoleDescription(role.id)}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {info.features.slice(0, 3).map((feature, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Info Box */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50"
            >
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium">{language === 'de' ? 'Rollen-Übersicht' : 'Role Overview'}</p>
                  <ul className="mt-1 text-xs space-y-1 text-blue-700 dark:text-blue-300">
                    <li>• <strong>Dispatcher</strong>: {language === 'de' ? 'Spediteure und Transportunternehmen' : 'Carriers and transport companies'}</li>
                    <li>• <strong>Driver</strong>: {language === 'de' ? 'Fahrer ohne Zugriff auf Finanzen' : 'Drivers without access to finances'}</li>
                    <li>• <strong>Shipper</strong>: {language === 'de' ? 'Versender und Verlader' : 'Shippers and loaders'}</li>
                    <li>• <strong>Admin/Support</strong>: {language === 'de' ? 'Nur durch CargoBit zuweisbar' : 'Assigned by CargoBit only'}</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="text-center text-xs text-muted-foreground mt-8"
          >
            © 2024 {t('companyName', language)} • {t('companyAddress', language)}
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
