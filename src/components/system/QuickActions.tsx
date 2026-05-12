'use client';

/**
 * Quick Actions Component
 * Action Buttons with Glow Effects and Animations
 * 
 * Features:
 * - Hover glow effects
 * - Animated icons
 * - Staggered reveal
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/Card';

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  color: string;
  href?: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  actions?: QuickAction[];
  title?: string;
  className?: string;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    label: 'Neuen Transport erstellen',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    color: '#1C7ED6',
    href: '/admin/transports/new',
  },
  {
    label: 'Benutzer einladen',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    color: '#2ECC71',
    href: '/admin/users/invite',
  },
  {
    label: 'Verifizierung prüfen',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    color: '#F39C12',
    href: '/admin/verifications',
  },
  {
    label: 'Bericht generieren',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: '#9B59B6',
    href: '/admin/reports',
  },
];

const actionVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: 'easeOut',
    },
  }),
};

export default function QuickActions({
  actions = DEFAULT_ACTIONS,
  title = 'Schnellaktionen',
  className = '',
}: QuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card className={className}>
        <CardContent>
          <motion.h3 
            className="text-white font-semibold mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {title}
          </motion.h3>
          <div className="space-y-2">
            {actions.map((action, i) => (
              <motion.button
                key={i}
                custom={i}
                variants={actionVariants}
                initial="hidden"
                animate="visible"
                onClick={action.onClick}
                className="w-full relative flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-transparent hover:border-white/[0.08] transition-all group overflow-hidden"
                whileHover={{ 
                  scale: 1.02,
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Glow effect on hover */}
                <motion.div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at left, ${action.color}15, transparent 70%)`,
                  }}
                />
                
                {/* Icon container */}
                <motion.div
                  className="relative p-2 rounded-lg z-10"
                  style={{ backgroundColor: `${action.color}20`, color: action.color }}
                  whileHover={{ 
                    scale: 1.15, 
                    rotate: 5,
                    boxShadow: `0 0 20px ${action.color}40`,
                  }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  {action.icon}
                </motion.div>
                
                {/* Label */}
                <span className="text-white/70 text-sm font-medium group-hover:text-white transition-colors z-10">
                  {action.label}
                </span>
                
                {/* Arrow */}
                <motion.svg
                  className="w-4 h-4 text-white/30 ml-auto z-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  whileHover={{ x: 4, color: action.color }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </motion.svg>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
