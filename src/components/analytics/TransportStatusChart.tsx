'use client';

/**
 * Transport Status Chart Component
 * Donut Chart with Animation
 * 
 * Features:
 * - Animated donut segments
 * - Center counter animation
 * - Hover effects with glow
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';

interface StatusData {
  label: string;
  value: number;
  color: string;
  percent: number;
}

interface TransportStatusChartProps {
  data?: StatusData[];
  title?: string;
  className?: string;
}

const DEFAULT_DATA: StatusData[] = [
  { label: 'Unterwegs', value: 1842, color: '#1C7ED6', percent: 48 },
  { label: 'Abgeschlossen', value: 1256, color: '#2ECC71', percent: 33 },
  { label: 'Geplant', value: 528, color: '#F39C12', percent: 14 },
  { label: 'Storniert', value: 216, color: '#E74C3C', percent: 5 },
];

export default function TransportStatusChart({
  data = DEFAULT_DATA,
  title = 'Transporte nach Status',
  className = '',
}: TransportStatusChartProps) {
  const [animated, setAnimated] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

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
            Details
          </motion.button>
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-6">
            {/* Donut Chart */}
            <motion.div 
              className="relative w-40 h-40 flex-shrink-0"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="20"
                />
                
                {data.map((segment, i) => {
                  const strokeDasharray = `${(segment.percent / 100) * circumference} ${circumference}`;
                  const strokeDashoffset = -(cumulativePercent / 100) * circumference;
                  cumulativePercent += segment.percent;
                  const isHovered = hoveredIndex === i;

                  return (
                    <motion.circle
                      key={i}
                      cx="100"
                      cy="100"
                      r={radius}
                      fill="none"
                      stroke={segment.color}
                      strokeWidth={isHovered ? 24 : 20}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      initial={{ strokeDasharray: `0 ${circumference}` }}
                      animate={{ 
                        strokeDasharray: animated ? `${(segment.percent / 100) * circumference} ${circumference}` : `0 ${circumference}`,
                      }}
                      transition={{ duration: 1, delay: 0.8 + i * 0.1, ease: 'easeOut' }}
                      whileHover={{ strokeWidth: 24 }}
                      onHoverStart={() => setHoveredIndex(i)}
                      onHoverEnd={() => setHoveredIndex(null)}
                      style={{
                        filter: `drop-shadow(0 0 ${isHovered ? 15 : 8}px ${segment.color}60)`,
                        cursor: 'pointer',
                        transformOrigin: 'center',
                      }}
                    />
                  );
                })}
              </svg>

              {/* Center Text */}
              <motion.div 
                className="absolute inset-0 flex flex-col items-center justify-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 }}
              >
                <motion.span 
                  className="text-2xl font-bold text-white"
                  key={hoveredIndex}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                >
                  {hoveredIndex !== null ? data[hoveredIndex].value.toLocaleString() : total.toLocaleString()}
                </motion.span>
                <span className="text-white/40 text-xs">
                  {hoveredIndex !== null ? data[hoveredIndex].label : 'Gesamt'}
                </span>
              </motion.div>
            </motion.div>

            {/* Legend */}
            <div className="flex-1 space-y-3">
              {data.map((item, i) => (
                <motion.div
                  key={i}
                  className="flex items-center justify-between cursor-pointer"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.3 + i * 0.1 }}
                  onHoverStart={() => setHoveredIndex(i)}
                  onHoverEnd={() => setHoveredIndex(null)}
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-center gap-2">
                    <motion.div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                      animate={{ 
                        boxShadow: hoveredIndex === i ? `0 0 10px ${item.color}` : 'none',
                        scale: hoveredIndex === i ? 1.2 : 1,
                      }}
                    />
                    <span className="text-white/60 text-sm">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-medium text-sm">{item.value.toLocaleString()}</span>
                    <span className="text-white/30 text-xs ml-1">({item.percent}%)</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
