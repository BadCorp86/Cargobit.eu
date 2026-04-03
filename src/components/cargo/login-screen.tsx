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
  Warehouse,
  Headphones,
  Euro,
  User,
  ChevronDown,
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

const iconMap: Record<string, React.ElementType> = {
  Shield,
  Radio,
  Truck,
  Package,
  Warehouse,
  Headphones,
  Euro,
  User,
};

export function LoginScreen() {
  const { setRole, language, setLanguage } = useCargoBitStore();

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as Language);
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
          className="text-center mb-12"
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
          className="w-full max-w-4xl"
        >
          <div className="glass-light dark:glass-dark rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/5">
            {/* Demo mode badge */}
            <div className="flex items-center justify-center mb-8">
              <Badge variant="secondary" className="px-4 py-1.5 text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-0">
                <span className="mr-2 w-2 h-2 rounded-full bg-green-500 pulse-live" />
                {t('demoMode', language)}
              </Badge>
            </div>

            <h2 className="text-2xl font-semibold text-center mb-2">
              {t('loginTitle', language)}
            </h2>
            <p className="text-muted-foreground text-center mb-8">
              {t('loginSubtitle', language)}
            </p>

            {/* Role Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicRoleConfigs.map((role, index) => {
                const Icon = iconMap[role.icon] || User;
                return (
                  <motion.div
                    key={role.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.08, duration: 0.5 }}
                  >
                    <Button
                      onClick={() => setRole(role.id)}
                      className="w-full h-auto p-5 rounded-2xl bg-white/50 dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-orange-950/30 border border-border/50 hover:border-orange-300 dark:hover:border-orange-700/50 transition-all duration-300 group cursor-pointer flex flex-col items-center gap-3 text-center shadow-sm hover:shadow-md hover:shadow-orange-500/10"
                      variant="outline"
                    >
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          {t(role.id === 'support' ? 'supportRole' : role.id as keyof typeof import('@/lib/i18n').translations.de, language)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {role.description}
                        </p>
                      </div>
                    </Button>
                  </motion.div>
                );
              })}
            </div>
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
