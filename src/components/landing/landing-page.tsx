'use client';

import { Navbar } from './navbar';
import { HeroSection } from './hero-section';
import { TrustSection } from './trust-section';
import { FeatureSection, CTASection } from './feature-sections';
import { Footer } from './footer';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

export function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-cb-dark">
      <Navbar onLogin={onLogin} onRegister={onRegister} />
      <main>
        <HeroSection 
          onRegister={onRegister} 
          onLearnMore={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
        />
        <TrustSection />
        <div id="features">
          <FeatureSection />
        </div>
        <CTASection onRegister={onRegister} />
      </main>
      <Footer />
    </div>
  );
}
