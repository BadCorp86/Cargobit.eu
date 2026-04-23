'use client';

import { 
  Truck, 
  Users, 
  Star, 
  HeadphonesIcon 
} from 'lucide-react';

const stats = [
  {
    icon: Truck,
    value: '12.450+',
    label: 'Transporte',
    color: 'text-cb-accent',
  },
  {
    icon: Users,
    value: '8.760+',
    label: 'Partner',
    color: 'text-cb-primary',
  },
  {
    icon: Star,
    value: '98,6%',
    label: 'Zufriedenheit',
    color: 'text-yellow-400',
  },
  {
    icon: HeadphonesIcon,
    value: '24/7',
    label: 'Support',
    color: 'text-green-400',
  },
];

export function TrustSection() {
  return (
    <section className="relative -mt-16 z-20 px-4 sm:px-6 lg:px-8 mb-24">
      <div className="max-w-6xl mx-auto">
        <div className="glass-card p-6 sm:p-8 rounded-2xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="text-center group cursor-default"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
