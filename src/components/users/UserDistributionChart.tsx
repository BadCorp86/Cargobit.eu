'use client';

/**
 * User Distribution Chart Component
 * Horizontal Bar Chart with Animation
 * 
 * Features:
 * - Animated bar fills
 * - Staggered reveal
 * - Glow effects on bars
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';

interface UserData {
  label: string;
  value: number;
  color: string;
}

interface UserDistributionChartProps {
  data?: UserData[];
  title?: string;
  className?: string;
}

const DEFAULT_DATA: UserData[] = [
  { label: 'Verlader', value: 4256, color: '#1C7ED6' },
  { label: 'Spediteure', value: 3128, color: '#2ECC71' },
  { label: 'Fahrer', value: 4532, color: '#F39C12' },
  { label: 'Dispatcher', value: 542, color: '#9B59B6' },
];

export default function UserDistributionChart({
  data = DEFAULT_DATA,
  title = 'Benutzerverteilung',
  className = '',
}: UserDistributionChartProps) {
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const maxValue = Math.max(...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <Card className={className}>
        <CardHeader>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <CardTitle>{title}</CardTitle>
          </motion.div>
          <motion.button 
            className="text-[#00D4FF] text-sm hover:underline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
          >
            Alle Benutzer
          </motion.button>
        </CardHeader>

        <CardContent>
          {/* Total Count */}
          <motion.div 
            className="mb-6 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
          >
            <motion.span 
              className="text-3xl font-bold text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {total.toLocaleString()}
            </motion.span>
            <p className="text-white/40 text-sm">Benutzer gesamt</p>
          </motion.div>

          {/* Bar Chart */}
          <div className="space-y-4">
            {data.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + i * 0.1 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/60 text-sm">{item.label}</span>
                  <motion.span 
                    className="text-white font-medium text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 + i * 0.1 }}
                  >
                    {item.value.toLocaleString()}
                  </motion.span>
                </div>
                <div className="h-3 bg-white/[0.05] rounded-full overflow-hidden relative">
                  {/* Glow effect behind bar */}
                  <motion.div
                    className="absolute inset-0 rounded-full blur-sm"
                    style={{ backgroundColor: item.color, opacity: 0.3 }}
                    initial={{ width: 0 }}
                    animate={{ width: animated ? `${(item.value / maxValue) * 100}%` : 0 }}
                    transition={{ duration: 0.8, delay: 1.1 + i * 0.1, ease: 'easeOut' }}
                  />
                  {/* Main bar */}
                  <motion.div
                    className="h-full rounded-full relative"
                    style={{
                      background: `linear-gradient(90deg, ${item.color}, ${item.color}80)`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: animated ? `${(item.value / maxValue) * 100}%` : 0 }}
                    transition={{ duration: 0.8, delay: 1.1 + i * 0.1, ease: 'easeOut' }}
                    whileHover={{ 
                      boxShadow: `0 0 20px ${item.color}60`,
                      scale: 1.02,
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
