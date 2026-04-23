'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp,
  BarChart3,
  Zap,
  Target,
  MapPin,
  Shield,
  FileText,
  HeadphonesIcon,
  ArrowRight,
} from 'lucide-react';

export function FeatureSection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-cb-primary/30 text-cb-accent">
            Features
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Intelligent. Transparent.{' '}
            <span className="bg-gradient-to-r from-cb-accent to-cb-primary bg-clip-text text-transparent">
              Profitabel.
            </span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Unsere KI analysiert den Markt in Echtzeit und optimiert Ihre Preise automatisch.
          </p>
        </div>

        {/* Main Feature Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
          {/* Left - Text */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-6">
              KI-gestützte Preisempfehlung
            </h3>
            <p className="text-gray-400 mb-6">
              Unsere künstliche Intelligenz analysiert Marktdaten, Routen und Kapazitäten, 
              um Ihnen den optimalen Preis zu empfehlen – für maximale Gewinne und zufriedene Kunden.
            </p>
            
            <ul className="space-y-4">
              {[
                { icon: BarChart3, text: 'Echtzeit-Marktanalyse' },
                { icon: TrendingUp, text: 'Automatische Preisoptimierung' },
                { icon: Target, text: 'Mehr Gewinn durch KI' },
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-gray-300">
                  <div className="w-8 h-8 rounded-lg bg-cb-primary/20 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-cb-accent" />
                  </div>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Right - Price Card */}
          <div className="relative">
            <div className="glass-card p-8 rounded-2xl">
              {/* Mini Map */}
              <div className="relative h-40 mb-6 rounded-xl bg-cb-dark/50 overflow-hidden">
                <svg viewBox="0 0 200 100" className="w-full h-full opacity-50">
                  {/* Route line */}
                  <path
                    d="M20,50 Q100,30 180,50"
                    fill="none"
                    stroke="#00D4FF"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                  {/* Start point */}
                  <circle cx="20" cy="50" r="6" fill="#1C7ED6" />
                  {/* End point */}
                  <circle cx="180" cy="50" r="6" fill="#00D4FF" />
                </svg>
                <div className="absolute bottom-2 left-2 text-xs text-gray-400">Hamburg</div>
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">Barcelona</div>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="text-sm text-gray-400 mb-2">Empfohlener Preis</div>
                <div className="text-5xl font-bold text-white mb-2">€1.680</div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  +12% höherer Gewinn
                </Badge>
              </div>

              {/* Route Info */}
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>Route: Hamburg → Barcelona</span>
                <span>1.850 km</span>
              </div>
            </div>
            
            {/* Decorative glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-cb-accent/10 to-cb-primary/10 rounded-3xl blur-2xl -z-10" />
          </div>
        </div>

        {/* Solutions Grid */}
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold text-white">
            Eine Plattform. Alle Lösungen.
          </h3>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            { icon: Zap, title: 'Matching', desc: 'KI-basiertes Matching' },
            { icon: MapPin, title: 'Live Tracking', desc: 'Echtzeit-Ortung' },
            { icon: Shield, title: 'Sichere Zahlung', desc: 'Escrow-System' },
            { icon: FileText, title: 'Dokumente', desc: 'Automatisch generiert' },
            { icon: HeadphonesIcon, title: 'Support', desc: '24/7 verfügbar' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="glass-card p-6 rounded-2xl text-center cursor-pointer group"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-cb-primary/20 to-cb-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <item.icon className="w-7 h-7 text-cb-accent" />
              </div>
              <h4 className="font-semibold text-white mb-1">{item.title}</h4>
              <p className="text-sm text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CTASection({ onRegister }: { onRegister: () => void }) {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="relative glass-card p-12 rounded-3xl overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-cb-primary/20 to-cb-accent/20" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Bereit, smarter zu transportieren?
              </h2>
              <p className="text-lg text-gray-300 max-w-xl">
                Schließen Sie sich über 8.000 Partnern an und profitieren Sie von unserer KI-Technologie.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                className="btn-glow h-14 px-8 text-lg"
                onClick={onRegister}
              >
                Jetzt registrieren
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="btn-outline h-14 px-8 text-lg"
              >
                Mehr erfahren
              </Button>
            </div>
          </div>

          {/* Decorative truck silhouette */}
          <div className="absolute -right-20 -bottom-20 w-64 h-64 opacity-10">
            <svg viewBox="0 0 100 60" fill="currentColor" className="text-white w-full h-full">
              <rect x="0" y="25" width="60" height="25" rx="3" />
              <rect x="60" y="15" width="35" height="35" rx="3" />
              <circle cx="18" cy="55" r="8" />
              <circle cx="75" cy="55" r="8" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
