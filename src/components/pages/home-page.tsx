'use client';

import * as React from 'react';
import { HeroSection, HowItWorksSection, ForWhoSection, SecuritySection, MonetizationSection, CTASection } from '@/components/cargobit/landing-page';
import { BannerAd } from '@/components/ads/banner-ad';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Star, Globe, CheckCircle2 } from 'lucide-react';

// ========================================
// Trust Badges Component
// ========================================
function TrustBadges() {
  const badges = [
    { icon: Shield, label: 'ISO 27001 Zertifiziert', value: 'Security' },
    { icon: Users, label: 'Aktive Nutzer', value: '12.000+' },
    { icon: Star, label: 'Zufriedenheitsrate', value: '98%' },
    { icon: Globe, label: 'Europaweit', value: '27 Länder' },
    { icon: CheckCircle2, label: 'Erfolgreiche Transporte', value: '50.000+' },
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold mb-2">Vertrauen & Transparenz</h2>
          <p className="text-muted-foreground">Zahlen, die für sich sprechen</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {badges.map((badge) => (
            <div key={badge.label} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                <badge.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-2xl font-bold">{badge.value}</div>
              <div className="text-sm text-muted-foreground">{badge.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ========================================
// Home Page
// ========================================
export default function HomePage() {
  return (
    <main className="flex flex-col gap-0">
      {/* Hero Section */}
      <HeroSection />

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-4 w-full">
        <HowItWorksSection />
      </section>

      {/* Trust Badges */}
      <TrustBadges />

      {/* Ad Banner - Homepage Hero Slot */}
      <section className="max-w-6xl mx-auto px-4 w-full py-8">
        <BannerAd slot="homepage-hero" />
      </section>

      {/* For Who Section */}
      <section className="max-w-6xl mx-auto px-4 w-full">
        <ForWhoSection />
      </section>

      {/* Security Section */}
      <SecuritySection />

      {/* Monetization Section */}
      <MonetizationSection />

      {/* CTA Section */}
      <CTASection />
    </main>
  );
}
