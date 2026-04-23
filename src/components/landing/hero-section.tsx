'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Sparkles,
  MapPin,
  Shield,
  Zap,
} from 'lucide-react';

interface HeroSectionProps {
  onRegister: () => void;
  onLearnMore: () => void;
}

export function HeroSection({ onRegister, onLearnMore }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 gradient-radial" />
      
      {/* Animated Background Orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cb-primary/20 rounded-full blur-3xl animate-float" />
      <div 
        className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cb-accent/20 rounded-full blur-3xl animate-float" 
        style={{ animationDelay: '2s' }}
      />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(28,126,214,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(28,126,214,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Text Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <Badge 
              variant="outline" 
              className="mb-6 px-4 py-2 text-sm border-cb-primary/30 text-cb-accent bg-cb-primary/10 animate-float"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Europaweit vernetzt
            </Badge>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Transporte einfach.
              <br />
              <span className="bg-gradient-to-r from-cb-accent to-cb-primary bg-clip-text text-transparent">
                Europaweit vernetzt.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-gray-400 mb-8 max-w-xl mx-auto lg:mx-0">
              CargoBit verbindet Verlader, Spediteure und Fahrer auf einer Plattform – 
              schnell, sicher und effizient.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <Button
                className="btn-glow h-14 px-8 text-lg"
                onClick={onRegister}
              >
                Transport erstellen
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="btn-outline h-14 px-8 text-lg"
                onClick={onLearnMore}
              >
                Mehr erfahren
              </Button>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              {[
                { icon: Zap, label: 'KI-Preisempfehlung' },
                { icon: MapPin, label: 'Live Tracking' },
                { icon: Shield, label: 'Sichere Zahlung' },
              ].map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-center gap-2 px-4 py-2 glass rounded-full text-sm text-gray-300"
                >
                  <feature.icon className="w-4 h-4 text-cb-accent" />
                  {feature.label}
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Map Visualization */}
          <div className="relative">
            <EuropeanMap />
            
            {/* Floating Transport Card */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass-card p-4 rounded-2xl shadow-2xl animate-float z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-cb-success/20 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-cb-success" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Live Transport</div>
                  <div className="text-xs text-gray-400">Hamburg → Barcelona</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-cb-success/10 border-cb-success/30 text-cb-success text-xs">
                  unterwegs
                </Badge>
                <span className="text-xs text-gray-400">1.850 km</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// European Map Component with Animated Connections
function EuropeanMap() {
  // European city coordinates (relative positions)
  const cities = [
    { name: 'Hamburg', x: 48, y: 28, size: 'lg' },
    { name: 'Berlin', x: 55, y: 30, size: 'md' },
    { name: 'München', x: 50, y: 42, size: 'md' },
    { name: 'Paris', x: 28, y: 45, size: 'lg' },
    { name: 'Barcelona', x: 22, y: 65, size: 'lg' },
    { name: 'Madrid', x: 18, y: 75, size: 'md' },
    { name: 'Mailand', x: 52, y: 50, size: 'md' },
    { name: 'Rom', x: 58, y: 60, size: 'md' },
    { name: 'Warschau', x: 68, y: 32, size: 'md' },
    { name: 'Amsterdam', x: 35, y: 32, size: 'lg' },
    { name: 'Wien', x: 58, y: 42, size: 'md' },
    { name: 'Prag', x: 58, y: 36, size: 'md' },
  ];

  // Active routes for animation
  const routes = [
    { from: 'Hamburg', to: 'Barcelona', active: true },
    { from: 'Amsterdam', to: 'Rom', active: true },
    { from: 'Paris', to: 'Warschau', active: false },
    { from: 'Berlin', to: 'Madrid', active: false },
  ];

  const getCityPosition = (name: string) => cities.find(c => c.name === name);

  return (
    <div className="relative w-full aspect-square max-w-lg mx-auto">
      {/* Map Background */}
      <div className="absolute inset-0 map-container">
        {/* SVG Map */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          style={{ filter: 'drop-shadow(0 0 30px rgba(0, 212, 255, 0.2))' }}
        >
          {/* Gradient Definition */}
          <defs>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#00D4FF" stopOpacity="1" />
              <stop offset="100%" stopColor="#1C7ED6" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Europe outline (simplified) */}
          <path
            d="M5,20 Q15,15 25,20 Q35,15 45,18 Q55,12 65,15 Q75,10 85,15 Q95,20 98,35 Q95,50 90,65 Q85,80 75,90 Q60,95 45,92 Q30,95 20,85 Q10,75 8,60 Q5,45 5,30 Z"
            fill="rgba(28, 126, 214, 0.05)"
            stroke="rgba(0, 212, 255, 0.2)"
            strokeWidth="0.5"
          />

          {/* Connection Lines */}
          {routes.map((route, idx) => {
            const fromCity = getCityPosition(route.from);
            const toCity = getCityPosition(route.to);
            if (!fromCity || !toCity) return null;
            
            return (
              <g key={idx}>
                {/* Base line */}
                <line
                  x1={fromCity.x}
                  y1={fromCity.y}
                  x2={toCity.x}
                  y2={toCity.y}
                  stroke="rgba(0, 212, 255, 0.15)"
                  strokeWidth="0.3"
                />
                {/* Animated line */}
                {route.active && (
                  <line
                    x1={fromCity.x}
                    y1={fromCity.y}
                    x2={toCity.x}
                    y2={toCity.y}
                    stroke="url(#line-gradient)"
                    strokeWidth="0.5"
                    className="map-line"
                    strokeDasharray="3,2"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="100"
                      to="0"
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  </line>
                )}
              </g>
            );
          })}

          {/* City Nodes */}
          {cities.map((city) => (
            <g key={city.name}>
              <circle
                cx={city.x}
                cy={city.y}
                r={city.size === 'lg' ? 1.2 : 0.8}
                fill="#00D4FF"
                className="animate-pulse-node"
                style={{ animationDelay: `${Math.random() * 2}s` }}
              />
              <circle
                cx={city.x}
                cy={city.y}
                r={city.size === 'lg' ? 2.5 : 1.8}
                fill="none"
                stroke="rgba(0, 212, 255, 0.3)"
                strokeWidth="0.3"
                className="animate-pulse-node"
                style={{ animationDelay: `${Math.random() * 2}s` }}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-cb-accent/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-cb-primary/10 rounded-full blur-2xl" />
    </div>
  );
}
