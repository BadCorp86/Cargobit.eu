'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t, languages } from '@/lib/i18n';
import { roleConfigs } from '@/lib/mock-data';
import type { NavigationTab } from '@/types';
import Image from 'next/image';
import {
  LayoutDashboard,
  Package,
  MapPin,
  Headphones,
  BarChart3,
  Newspaper,
  Settings,
  LogOut,
  Menu,
  Bell,
  Moon,
  Sun,
  Monitor,
  ChevronLeft,
  Search,
  Truck,
  GitCompareArrows,
  User,
  Globe,
  Check,
  PackageCheck,
  AlertTriangle,
  Clock,
  Wallet,
  Megaphone,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const tabIconMap: Record<NavigationTab, React.ElementType> = {
  dashboard: LayoutDashboard,
  shipments: Package,
  tracking: MapPin,
  fleet: Truck,
  capacity: GitCompareArrows,
  support: Headphones,
  analytics: BarChart3,
  blog: Newspaper,
  settings: Settings,
  wallet: Wallet,
  advertising: Megaphone,
  memberships: CreditCard,
};

export function SidebarNav() {
  const {
    currentRole,
    activeTab,
    setActiveTab,
    logout,
    language,
    sidebarOpen,
    setSidebarOpen,
    notificationCount,
  } = useCargoBitStore();
  const { theme, setTheme } = useTheme();

  if (!currentRole) return null;

  const roleConfig = roleConfigs.find((r) => r.id === currentRole);
  const availableTabs = roleConfig?.availableTabs || [];

  const handleTabClick = (tab: NavigationTab) => {
    setActiveTab(tab);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 260 : 72 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen flex flex-col bg-sidebar text-sidebar-foreground z-50 border-r border-sidebar-border"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0">
          <Image src="/logo.svg" alt="CargoBit" width={22} height={22} />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h1 className="text-lg font-bold text-white">CargoBit</h1>
              <p className="text-[10px] text-sidebar-foreground/60 -mt-0.5">
                {roleConfig?.label || currentRole}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Separator className="bg-sidebar-border mx-3 w-auto" />

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <div className="px-3 space-y-1">
          {availableTabs.map((tab) => {
            const Icon = tabIconMap[tab];
            const isActive = activeTab === tab;
            return (
              <TooltipProvider key={tab} delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => handleTabClick(tab)}
                      variant="ghost"
                      className={cn(
                        'w-full justify-start gap-3 h-10 rounded-xl transition-all duration-200',
                        isActive
                          ? 'bg-orange-500/15 text-orange-400 hover:bg-orange-500/20 hover:text-orange-400'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                      )}
                    >
                      <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-orange-400')} />
                      <AnimatePresence>
                        {sidebarOpen && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className="overflow-hidden whitespace-nowrap text-sm"
                          >
                            {t(tab as keyof typeof import('@/lib/i18n').translations.de, language)}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Button>
                  </TooltipTrigger>
                  {!sidebarOpen && (
                    <TooltipContent side="right" className="font-medium">
                      {t(tab as keyof typeof import('@/lib/i18n').translations.de, language)}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </ScrollArea>

      {/* User section */}
      <div className="shrink-0 p-3">
        <Separator className="bg-sidebar-border mb-3" />
        <div className="flex items-center gap-3 px-2">
          <Avatar className="w-9 h-9 bg-orange-500/20 border border-orange-500/30">
            <AvatarFallback className="text-orange-400 text-sm font-semibold">
              {currentRole.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 overflow-hidden whitespace-nowrap min-w-0"
              >
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {roleConfig?.label}
                </p>
                <p className="text-xs text-sidebar-foreground/50 truncate">
                  {currentRole}@cargobit.de
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="h-8 w-8 text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}

const mockNotifications = [
  { id: 1, icon: PackageCheck, title: 'shipmentDelivered', description: 'CB-2024-1847', time: '5 min' },
  { id: 2, icon: AlertTriangle, title: 'delayAlert', description: 'CB-2024-1892', time: '12 min' },
  { id: 3, icon: Clock, title: 'newTicket', description: '#TK-4821', time: '28 min' },
  { id: 4, icon: Package, title: 'newShipment', description: 'CB-2024-1903', time: '1 h' },
];

export function HeaderBar() {
  const {
    activeTab,
    currentRole,
    language,
    setLanguage,
    sidebarOpen,
    setSidebarOpen,
    notificationCount,
    setActiveTab,
    logout,
  } = useCargoBitStore();
  const { theme, setTheme } = useTheme();

  const title = t(activeTab as keyof typeof import('@/lib/i18n').translations.de, language);

  const roleConfig = roleConfigs.find((r) => r.id === currentRole);

  return (
    <header className="sticky top-0 z-40 h-16 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center justify-between h-full px-4 sm:px-6">
        {/* Left: Menu button + Title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-9 w-9 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="hidden lg:block">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-9 w-9"
            >
              <ChevronLeft className={cn('w-4 h-4 transition-transform duration-300', !sidebarOpen && 'rotate-180')} />
            </Button>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search */}
          <div className="hidden sm:flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('search', language)}
                className="h-9 pl-9 pr-4 w-56 rounded-xl bg-muted/50 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300 transition-all"
              />
            </div>
          </div>

          {/* Theme toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : theme === 'light' ? <Sun className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="w-4 h-4 mr-2" />
                {t('light', language)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="w-4 h-4 mr-2" />
                {t('dark', language)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor className="w-4 h-4 mr-2" />
                {t('system', language)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                <Bell className="w-4 h-4" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {notificationCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span className="font-semibold">{t('notifications', language)}</span>
                {notificationCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 bg-orange-500/10 text-orange-600 hover:bg-orange-500/15">
                    {notificationCount}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-72 overflow-y-auto">
                {mockNotifications.map((notif) => {
                  const NotifIcon = notif.icon;
                  return (
                    <DropdownMenuItem key={notif.id} className="flex items-start gap-3 px-3 py-2.5 cursor-pointer">
                      <div className="mt-0.5 w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                        <NotifIcon className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {t(notif.title as keyof typeof import('@/lib/i18n').translations.de, language) || notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{notif.time} {t('ago', language) || 'ago'}</p>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center text-orange-500 font-medium cursor-pointer" onClick={() => setActiveTab('settings')}>
                {t('viewAll', language) || 'View all'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <Avatar className="w-7 h-7 bg-orange-500/20 border border-orange-500/30">
                  <AvatarFallback className="text-orange-400 text-xs font-semibold">
                    {currentRole ? currentRole.slice(0, 2).toUpperCase() : 'CB'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {/* User info header */}
              <div className="flex items-center gap-3 px-2 py-1.5">
                <Avatar className="w-10 h-10 bg-orange-500/20 border border-orange-500/30">
                  <AvatarFallback className="text-orange-400 text-sm font-semibold">
                    {currentRole ? currentRole.slice(0, 2).toUpperCase() : 'CB'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {roleConfig?.label || currentRole}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {currentRole}@cargobit.de
                  </p>
                </div>
              </div>

              <DropdownMenuSeparator />

              {/* Profile */}
              <DropdownMenuItem className="cursor-pointer" onClick={() => setActiveTab('settings')}>
                <User className="w-4 h-4 mr-2" />
                {t('profile', language)}
              </DropdownMenuItem>

              {/* Settings */}
              <DropdownMenuItem className="cursor-pointer" onClick={() => setActiveTab('settings')}>
                <Settings className="w-4 h-4 mr-2" />
                {t('settings', language)}
              </DropdownMenuItem>

              {/* Language sub-menu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <Globe className="w-4 h-4 mr-2" />
                  {t('language', language)}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      className={cn(
                        'cursor-pointer justify-between',
                        language === lang.code && 'bg-orange-500/5 text-orange-600 dark:text-orange-400'
                      )}
                      onClick={() => setLanguage(lang.code)}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base leading-none">{lang.flag}</span>
                        <span>{lang.label}</span>
                      </span>
                      {language === lang.code && <Check className="w-4 h-4 text-orange-500" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              {/* Logout */}
              <DropdownMenuItem
                className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('logout', language)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
