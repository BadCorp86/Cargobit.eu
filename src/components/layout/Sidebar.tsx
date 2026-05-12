'use client';

/**
 * Premium Sidebar Component
 * Glassmorphism + Glow Effects + Framer Motion Animations
 * 
 * Features:
 * - Animated menu items with stagger effect
 * - Active state with glow indicator
 * - Hover scale/glow effects
 * - Collapsible with smooth transitions
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
}

interface SidebarProps {
  menuItems?: NavItem[];
  collapsed?: boolean;
  mobileOpen?: boolean;
  onToggle?: () => void;
  onMobileClose?: () => void;
  user?: {
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
}

const DEFAULT_MENU: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    href: '/admin/dashboard',
  },
  {
    id: 'transports',
    label: 'Transporte',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    href: '/admin/transports',
  },
  {
    id: 'orders',
    label: 'Aufträge',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    href: '/admin/jobs',
  },
  {
    id: 'users',
    label: 'Benutzer',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    href: '/admin/users',
  },
  {
    id: 'drivers',
    label: 'Fahrer',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    href: '/admin/drivers',
  },
  {
    id: 'vehicles',
    label: 'Fahrzeuge',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    href: '/admin/vehicles',
  },
  {
    id: 'verifications',
    label: 'Verifizierungen',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    href: '/admin/verifications',
    badge: 47,
  },
  {
    id: 'disputes',
    label: 'Streitfälle',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    href: '/admin/disputes',
    badge: 3,
  },
  {
    id: 'payments',
    label: 'Zahlungen',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    href: '/admin/payments',
  },
  {
    id: 'reports',
    label: 'Berichte',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    href: '/admin/reports',
  },
  {
    id: 'settings',
    label: 'Einstellungen',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    href: '/admin/system/settings',
  },
  {
    id: 'logs',
    label: 'System Logs',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    href: '/admin/system/logs',
  },
];

const sidebarVariants = {
  hidden: { x: -260 },
  visible: {
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
};

const menuItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.03,
      duration: 0.3,
      ease: 'easeOut',
    },
  }),
};

export default function Sidebar({
  menuItems = DEFAULT_MENU,
  collapsed = false,
  mobileOpen = false,
  onToggle,
  onMobileClose,
  user = { name: 'Admin', email: 'admin@cargobit.eu', role: 'Administrator' },
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial="hidden"
        animate="visible"
        variants={sidebarVariants}
        className={`
          fixed left-0 top-0 h-full z-50
          transition-all duration-300 ease-out
          ${collapsed ? 'lg:w-20' : 'lg:w-[260px]'}
          w-[260px]
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Glassmorphism Background */}
        <div className="absolute inset-0 bg-[#06121C]/95 backdrop-blur-xl border-r border-white/[0.08]" />

        {/* Content */}
        <div className="relative h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between h-20 px-5 border-b border-white/[0.08]">
            {!collapsed && (
              <Link href="/admin/dashboard" className="flex items-center gap-3 group">
                {/* Logo */}
                <motion.div 
                  className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#1C7ED6] to-[#00D4FF] flex items-center justify-center shadow-lg shadow-[#1C7ED6]/20 group-hover:shadow-[#1C7ED6]/40 transition-shadow duration-300"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-white font-bold text-lg">CB</span>
                  {/* Glow Effect */}
                  <motion.div 
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#1C7ED6] to-[#00D4FF] opacity-50 blur-md -z-10"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
                <div>
                  <span className="text-white font-semibold text-lg tracking-tight">CargoBit</span>
                  <p className="text-white/40 text-[10px] font-medium tracking-wider uppercase">Admin Panel</p>
                </div>
              </Link>
            )}

            {collapsed && (
              <motion.div 
                className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-[#1C7ED6] to-[#00D4FF] flex items-center justify-center shadow-lg shadow-[#1C7ED6]/20"
                whileHover={{ scale: 1.1 }}
              >
                <span className="text-white font-bold text-lg">CB</span>
              </motion.div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {menuItems.map((item, index) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <motion.div
                  key={item.id}
                  custom={index}
                  variants={menuItemVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Link
                    href={item.href}
                    className={`
                      relative flex items-center gap-3 px-3 py-3 rounded-[14px] transition-all duration-200 group
                      ${isActive
                        ? 'bg-[#1C7ED6]/20 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                      }
                    `}
                    title={collapsed ? item.label : undefined}
                  >
                    {/* Active Glow */}
                    {isActive && (
                      <>
                        <motion.div 
                          className="absolute inset-0 rounded-[14px] bg-[#1C7ED6]/10"
                          layoutId="activeBackground"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                        <motion.div 
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-[#00D4FF] rounded-r-full shadow-lg shadow-[#00D4FF]/50"
                          initial={{ height: 0 }}
                          animate={{ height: 32 }}
                          transition={{ duration: 0.3 }}
                        />
                      </>
                    )}

                    {/* Icon */}
                    <motion.span 
                      className={`relative z-10 ${isActive ? 'text-[#00D4FF]' : 'group-hover:text-white/80'}`}
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      {item.icon}
                    </motion.span>

                    {/* Label */}
                    {!collapsed && (
                      <>
                        <span className="relative z-10 font-medium text-[14px] flex-1">{item.label}</span>
                        {item.badge && (
                          <motion.span 
                            className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#E74C3C] text-white shadow-lg shadow-[#E74C3C]/30"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500 }}
                          >
                            {item.badge}
                          </motion.span>
                        )}
                      </>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* User Section */}
          <motion.div 
            className="p-4 border-t border-white/[0.08]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {!collapsed ? (
              <motion.div 
                className="flex items-center gap-3 p-3 rounded-[14px] bg-white/[0.03] hover:bg-white/[0.05] transition-colors cursor-pointer group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1C7ED6] to-[#00D4FF] flex items-center justify-center text-white font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <motion.div 
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#2ECC71] rounded-full border-2 border-[#06121C] shadow-lg shadow-[#2ECC71]/30"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{user.name}</p>
                  <p className="text-white/40 text-xs">{user.role}</p>
                </div>
                <motion.svg 
                  className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  whileHover={{ y: -2 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </motion.svg>
              </motion.div>
            ) : (
              <motion.div 
                className="relative w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-[#1C7ED6] to-[#00D4FF] flex items-center justify-center text-white font-semibold cursor-pointer"
                whileHover={{ scale: 1.1 }}
              >
                {user.name.charAt(0).toUpperCase()}
                <motion.div 
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#2ECC71] rounded-full border-2 border-[#06121C]"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Collapse Toggle Button - Desktop only */}
        {onToggle && (
          <motion.button
            onClick={onToggle}
            className="absolute -right-3 top-24 w-6 h-6 rounded-full bg-[#1C7ED6] border border-white/20 flex items-center justify-center text-white hover:bg-[#00D4FF] transition-colors shadow-lg shadow-[#1C7ED6]/30 hidden lg:flex"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.svg 
              className="w-3 h-3" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </motion.svg>
          </motion.button>
        )}
      </motion.aside>
    </>
  );
}
