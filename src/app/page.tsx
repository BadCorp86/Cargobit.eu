'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast, Toaster } from 'sonner';
import {
  Truck,
  Package,
  Globe,
  Shield,
  Wallet,
  Users,
  Star,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  MapPin,
  Clock,
  BarChart3,
  FileText,
  HeadphonesIcon,
  Check,
  Play,
  Facebook,
  Linkedin,
  Instagram,
  Youtube,
} from 'lucide-react';

import { useAuthStore } from '@/lib/auth-store';
import { AuthModal } from '@/components/auth/auth-modal';
import { Dashboard } from '@/components/dashboard/dashboard';
import { TransportForm } from '@/components/transport/transport-form';
import { PartnerPortal } from '@/components/partner/partner-portal';
import { TransporteurOnboarding } from '@/components/onboarding/transporteur-onboarding';
import { ShipperOnboarding } from '@/components/onboarding/shipper-onboarding';

export default function Home() {
  const { isAuthenticated, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [showTransportForm, setShowTransportForm] = useState(false);
  const [showPartnerPortal, setShowPartnerPortal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showShipperOnboarding, setShowShipperOnboarding] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    toast.success('Erfolgreich abgemeldet');
  };

  const handleNewTransport = () => {
    setShowTransportForm(true);
  };

  const handleTransportSubmit = () => {
    setShowTransportForm(false);
    toast.success('Transport erfolgreich erstellt!', {
      description: 'Ihr Transport wurde veröffentlicht. Sie erhalten Benachrichtigungen über neue Angebote.'
    });
  };

  if (showOnboarding) {
    return <TransporteurOnboarding />;
  }

  if (showShipperOnboarding) {
    return <ShipperOnboarding />;
  }

  if (showPartnerPortal) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <PartnerPortal />
        <Button
          className="fixed bottom-4 right-4 gap-2 shadow-lg"
          onClick={() => setShowPartnerPortal(false)}
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Zurück zur Hauptseite
        </Button>
      </>
    );
  }

  if (isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <Dashboard onLogout={handleLogout} onNewTransport={handleNewTransport} />
        <TransportForm
          open={showTransportForm}
          onOpenChange={setShowTransportForm}
          onSubmit={handleTransportSubmit}
        />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen bg-[#06121C]">
        {/* Navigation */}
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#06121C]/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 lg:h-20">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#1C7ED6] to-[#00D4FF] flex items-center justify-center shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-white">CargoBit</span>
                  <span className="text-xs text-[#00D4FF]">Transporte in Europa</span>
                </div>
              </div>

              {/* Desktop Nav */}
              <div className="hidden lg:flex items-center gap-8">
                <button onClick={() => scrollToSection('matching')} className="text-gray-300 hover:text-[#00D4FF] transition-colors font-medium">
                  Matching
                </button>
                <button onClick={() => scrollToSection('preise')} className="text-gray-300 hover:text-[#00D4FF] transition-colors font-medium">
                  Preise
                </button>
                <button onClick={() => scrollToSection('wallet')} className="text-gray-300 hover:text-[#00D4FF] transition-colors font-medium">
                  Wallet
                </button>
                <button onClick={() => scrollToSection('support')} className="text-gray-300 hover:text-[#00D4FF] transition-colors font-medium">
                  Support
                </button>
              </div>

              {/* Right Side */}
              <div className="hidden lg:flex items-center gap-4">
                {/* Language Selector */}
                <div className="relative">
                  <button
                    onClick={() => setLangOpen(!langOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-gray-300"
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-sm">DE</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {langOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-[#0B3C5D] border border-[#1C7ED6]/30 rounded-lg shadow-xl py-2 min-w-[140px]">
                      {['DE', 'EN', 'PL', 'CZ', 'RO', 'SL', 'SK', 'TR', 'EL', 'FR'].map(lang => (
                        <button key={lang} className="w-full px-4 py-2 text-left hover:bg-[#1C7ED6]/20 transition-colors text-sm text-gray-300">
                          {lang}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-gray-300 hover:text-white"
                  onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}
                >
                  Anmelden
                </Button>
                <Button 
                  size="sm" 
                  className="bg-[#1C7ED6] hover:bg-[#1C7ED6]/80 gap-2"
                  onClick={() => { setAuthTab('register'); setShowAuthModal(true); }}
                >
                  Jetzt registrieren
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-300"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden bg-[#0B3C5D] border-t border-[#1C7ED6]/30 shadow-xl">
              <div className="px-4 py-6 space-y-4">
                <button onClick={() => scrollToSection('matching')} className="block w-full text-left py-2 text-gray-300 hover:text-[#00D4FF] transition-colors">
                  Matching
                </button>
                <button onClick={() => scrollToSection('preise')} className="block w-full text-left py-2 text-gray-300 hover:text-[#00D4FF] transition-colors">
                  Preise
                </button>
                <button onClick={() => scrollToSection('wallet')} className="block w-full text-left py-2 text-gray-300 hover:text-[#00D4FF] transition-colors">
                  Wallet
                </button>
                <button onClick={() => scrollToSection('support')} className="block w-full text-left py-2 text-gray-300 hover:text-[#00D4FF] transition-colors">
                  Support
                </button>
                <Separator className="bg-[#1C7ED6]/30" />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 border-[#1C7ED6]/50 text-gray-300"
                    onClick={() => { setAuthTab('login'); setShowAuthModal(true); setIsMenuOpen(false); }}
                  >
                    Anmelden
                  </Button>
                  <Button 
                    className="flex-1 bg-[#1C7ED6] hover:bg-[#1C7ED6]/80"
                    onClick={() => { setAuthTab('register'); setShowAuthModal(true); setIsMenuOpen(false); }}
                  >
                    Jetzt registrieren
                  </Button>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
          {/* Background - Dark blue world map with glowing connections */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#06121C] via-[#0B3C5D]/50 to-[#06121C]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#1C7ED6]/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00D4FF]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          
          {/* Connection lines pattern */}
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 1920 1080">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1C7ED6" stopOpacity="0" />
                  <stop offset="50%" stopColor="#00D4FF" stopOpacity="1" />
                  <stop offset="100%" stopColor="#1C7ED6" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Connection lines */}
              <circle cx="300" cy="300" r="4" fill="#00D4FF" className="animate-pulse" />
              <circle cx="600" cy="500" r="4" fill="#00D4FF" className="animate-pulse" />
              <circle cx="900" cy="250" r="4" fill="#00D4FF" className="animate-pulse" />
              <circle cx="1200" cy="450" r="4" fill="#00D4FF" className="animate-pulse" />
              <circle cx="1500" cy="350" r="4" fill="#00D4FF" className="animate-pulse" />
              <line x1="300" y1="300" x2="600" y2="500" stroke="url(#lineGradient)" strokeWidth="1" />
              <line x1="600" y1="500" x2="900" y2="250" stroke="url(#lineGradient)" strokeWidth="1" />
              <line x1="900" y1="250" x2="1200" y2="450" stroke="url(#lineGradient)" strokeWidth="1" />
              <line x1="1200" y1="450" x2="1500" y2="350" stroke="url(#lineGradient)" strokeWidth="1" />
            </svg>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="text-center lg:text-left">
                {/* Tagline */}
                <Badge className="mb-6 px-4 py-2 text-sm gap-2 bg-[#1C7ED6]/20 text-[#00D4FF] border border-[#00D4FF]/30">
                  <Globe className="w-4 h-4" />
                  Europaweit vernetzt
                </Badge>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-white">
                  Transporte einfach.
                  <br />
                  <span className="text-[#00D4FF]">Europaweit vernetzt.</span>
                </h1>

                {/* Description */}
                <p className="text-lg text-gray-300 max-w-xl mx-auto lg:mx-0 mb-8">
                  CargoBit verbindet Verlader, Spediteure und Fahrer auf einer Plattform – schnell, sicher und effizient.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                  <Button 
                    size="lg" 
                    className="gap-2 px-8 h-14 text-lg bg-[#1C7ED6] hover:bg-[#1C7ED6]/80 shadow-xl"
                    onClick={() => { setAuthTab('register'); setShowAuthModal(true); }}
                  >
                    Transport erstellen
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="gap-2 px-8 h-14 text-lg border-gray-600 text-gray-300 hover:bg-white/10"
                    onClick={() => scrollToSection('features')}
                  >
                    <Play className="w-5 h-5" />
                    Mehr erfahren
                  </Button>
                </div>

                {/* Feature Badges */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                  <div className="flex items-center gap-2 bg-[#0B3C5D]/50 rounded-full px-4 py-2 border border-[#1C7ED6]/30">
                    <Star className="w-4 h-4 text-[#00D4FF]" />
                    <span className="text-sm text-gray-300">KI-Preisempfehlung</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#0B3C5D]/50 rounded-full px-4 py-2 border border-[#1C7ED6]/30">
                    <MapPin className="w-4 h-4 text-[#00D4FF]" />
                    <span className="text-sm text-gray-300">Live Tracking</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#0B3C5D]/50 rounded-full px-4 py-2 border border-[#1C7ED6]/30">
                    <Shield className="w-4 h-4 text-[#00D4FF]" />
                    <span className="text-sm text-gray-300">Sichere Zahlung</span>
                  </div>
                </div>
              </div>

              {/* Right Content - Live Transport Widget */}
              <div className="hidden lg:block">
                <div className="relative">
                  {/* Main Dashboard Preview */}
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#1C7ED6]/30 bg-[#0B3C5D]">
                    <Image
                      src="/images/dashboard-main.png"
                      alt="CargoBit Dashboard"
                      width={800}
                      height={500}
                      className="w-full h-auto object-cover"
                      priority
                    />
                  </div>
                  
                  {/* Live Transport Widget */}
                  <div className="absolute -bottom-6 -left-6 bg-[#0B3C5D] border border-[#1C7ED6]/30 rounded-xl p-4 shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1C7ED6]/20 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-[#00D4FF]" />
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Live Transport</div>
                        <div className="text-sm font-semibold text-white">Hamburg → Barcelona</div>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs text-green-400">unterwegs</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Intelligent & Profitable Section */}
        <section id="matching" className="py-24 bg-[#06121C]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-left mb-12">
              <Badge className="mb-4 bg-[#1C7ED6]/20 text-[#00D4FF] border border-[#00D4FF]/30">INTELLIGENT & PROFITABEL</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                KI-gestützte Preise. Maximaler Gewinn.
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl">
                Unsere KI analysiert Marktdaten in Echtzeit und empfiehlt dir den optimalen Preis für jeden Transport – fair, transparent und marktgerecht.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 items-start">
              {/* Left - Statistics and Features */}
              <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-[#0B3C5D]/50 border border-[#1C7ED6]/20">
                    <CardContent className="p-4">
                      <div className="w-10 h-10 rounded-xl bg-[#1C7ED6]/20 flex items-center justify-center mb-3">
                        <Truck className="w-5 h-5 text-[#00D4FF]" />
                      </div>
                      <div className="text-2xl font-bold text-white">12.450+</div>
                      <div className="text-xs text-gray-400">Transporte</div>
                      <div className="text-xs text-gray-500">erfolgreich abgewickelt</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#0B3C5D]/50 border border-[#1C7ED6]/20">
                    <CardContent className="p-4">
                      <div className="w-10 h-10 rounded-xl bg-[#1C7ED6]/20 flex items-center justify-center mb-3">
                        <Users className="w-5 h-5 text-[#00D4FF]" />
                      </div>
                      <div className="text-2xl font-bold text-white">8.760+</div>
                      <div className="text-xs text-gray-400">Partner</div>
                      <div className="text-xs text-gray-500">vertrauen auf CargoBit</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#0B3C5D]/50 border border-[#1C7ED6]/20">
                    <CardContent className="p-4">
                      <div className="w-10 h-10 rounded-xl bg-[#1C7ED6]/20 flex items-center justify-center mb-3">
                        <Star className="w-5 h-5 text-[#00D4FF]" />
                      </div>
                      <div className="text-2xl font-bold text-white">98,6%</div>
                      <div className="text-xs text-gray-400">Zufriedenheit</div>
                      <div className="text-xs text-gray-500">unserer Kunden</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-[#0B3C5D]/50 border border-[#1C7ED6]/20">
                    <CardContent className="p-4">
                      <div className="w-10 h-10 rounded-xl bg-[#1C7ED6]/20 flex items-center justify-center mb-3">
                        <HeadphonesIcon className="w-5 h-5 text-[#00D4FF]" />
                      </div>
                      <div className="text-2xl font-bold text-white">24/7</div>
                      <div className="text-xs text-gray-400">Support</div>
                      <div className="text-xs text-gray-500">für dich da</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Features List */}
                <div className="space-y-3">
                  {[
                    'Echtzeit-Marktanalyse',
                    'Berücksichtigung aller Kostenfaktoren',
                    'Höherer Gewinn durch smarte Algorithmen',
                    'Schnelle & datenbasierte Entscheidungen'
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#1C7ED6]/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-[#00D4FF]" />
                      </div>
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Middle - Price Box and Route */}
              <div className="space-y-6">
                {/* Price Box */}
                <Card className="bg-gradient-to-br from-[#0B3C5D] to-[#06121C] border border-[#1C7ED6]/30 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-gray-400">Empfohlener Preis</span>
                      <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">+12% höherer Gewinn</Badge>
                    </div>
                    <div className="text-4xl font-bold text-white mb-2">€1.680</div>
                    <div className="text-sm text-gray-400">Inkl. aller Kosten</div>
                  </CardContent>
                </Card>

                {/* Route Details */}
                <Card className="bg-[#0B3C5D]/50 border border-[#1C7ED6]/20">
                  <CardContent className="p-6">
                    <div className="text-sm text-gray-400 mb-4">Strecke</div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1C7ED6]/20 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-[#00D4FF]" />
                        </div>
                        <div>
                          <div className="text-white font-medium">Hamburg</div>
                          <div className="text-xs text-gray-500">Deutschland</div>
                        </div>
                      </div>
                      <div className="flex-1 mx-4 border-t-2 border-dashed border-[#1C7ED6]/30" />
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1C7ED6]/20 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-[#00D4FF]" />
                        </div>
                        <div>
                          <div className="text-white font-medium">Barcelona</div>
                          <div className="text-xs text-gray-500">Spanien</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-6 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <span>1.893 km</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>24h 30m</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right - Map */}
              <div className="relative">
                <div className="relative rounded-2xl overflow-hidden border border-[#1C7ED6]/30 bg-[#0B3C5D] h-full min-h-[400px]">
                  <Image
                    src="/images/dashboard-main.png"
                    alt="Route Map Hamburg Barcelona"
                    fill
                    className="object-cover opacity-90"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Solutions Section */}
        <section id="features" className="py-24 bg-[#0B3C5D]/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Eine Plattform. Alle Lösungen.
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* Matching Card */}
              <Card className="bg-[#0B3C5D]/50 border border-[#1C7ED6]/20 hover:border-[#00D4FF]/50 transition-all group">
                <CardContent className="pt-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-[#1C7ED6]/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Truck className="w-7 h-7 text-[#00D4FF]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Matching</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Finde den passenden Transport oder die ideale Fracht in Sekunden.
                  </p>
                  <Button variant="ghost" size="sm" className="text-[#00D4FF] hover:text-[#00D4FF]/80">
                    Mehr erfahren →
                  </Button>
                </CardContent>
              </Card>

              {/* Live Tracking Card */}
              <Card className="bg-[#0B3C5D]/50 border border-[#1C7ED6]/20 hover:border-[#00D4FF]/50 transition-all group">
                <CardContent className="pt-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-[#1C7ED6]/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <MapPin className="w-7 h-7 text-[#00D4FF]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Live Tracking</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Verfolge jeden Transport in Echtzeit – jederzeit und überall.
                  </p>
                  <Button variant="ghost" size="sm" className="text-[#00D4FF] hover:text-[#00D4FF]/80">
                    Mehr erfahren →
                  </Button>
                </CardContent>
              </Card>

              {/* Sichere Zahlung Card */}
              <Card className="bg-[#0B3C5D]/50 border border-[#1C7ED6]/20 hover:border-[#00D4FF]/50 transition-all group">
                <CardContent className="pt-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-[#1C7ED6]/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Shield className="w-7 h-7 text-[#00D4FF]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Sichere Zahlung</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Sichere Wallet, einfache Zahlungen und schnelle Auszahlungen.
                  </p>
                  <Button variant="ghost" size="sm" className="text-[#00D4FF] hover:text-[#00D4FF]/80">
                    Mehr erfahren →
                  </Button>
                </CardContent>
              </Card>

              {/* Dokumente Card */}
              <Card className="bg-[#0B3C5D]/50 border border-[#1C7ED6]/20 hover:border-[#00D4FF]/50 transition-all group">
                <CardContent className="pt-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-[#1C7ED6]/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <FileText className="w-7 h-7 text-[#00D4FF]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Dokumente</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Digitale Dokumente verwalten und jederzeit verfügbar haben.
                  </p>
                  <Button variant="ghost" size="sm" className="text-[#00D4FF] hover:text-[#00D4FF]/80">
                    Mehr erfahren →
                  </Button>
                </CardContent>
              </Card>

              {/* Support Card */}
              <Card className="bg-[#0B3C5D]/50 border border-[#1C7ED6]/20 hover:border-[#00D4FF]/50 transition-all group">
                <CardContent className="pt-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-[#1C7ED6]/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <HeadphonesIcon className="w-7 h-7 text-[#00D4FF]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Support</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Unser Support-Team ist 24/7 für dich verfügbar.
                  </p>
                  <Button variant="ghost" size="sm" className="text-[#00D4FF] hover:text-[#00D4FF]/80">
                    Mehr erfahren →
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-24 bg-[#06121C] relative overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 opacity-30">
            <Image
              src="/images/dashboard-main.png"
              alt="Truck on highway"
              fill
              className="object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#06121C] via-[#06121C]/80 to-[#06121C]/60" />
          
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Bereit, smarter zu transportieren?
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              Werde jetzt Teil von CargoBit und profitiere von unserer starken Community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="gap-2 px-8 h-14 text-lg bg-[#1C7ED6] hover:bg-[#1C7ED6]/80"
                onClick={() => { setAuthTab('register'); setShowAuthModal(true); }}
              >
                Jetzt registrieren
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2 px-8 h-14 text-lg border-gray-600 text-gray-300 hover:bg-white/10"
                onClick={() => scrollToSection('features')}
              >
                Mehr erfahren
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#0B3C5D]/50 border-t border-[#1C7ED6]/20 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
              {/* Logo and Description */}
              <div className="lg:col-span-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#1C7ED6] to-[#00D4FF] flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-xl font-bold text-white">CargoBit</span>
                    <p className="text-xs text-[#00D4FF]">Transporte in Europa</p>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  CargoBit ist die smarte Plattform für Transporte in ganz Europa.
                </p>
                <div className="flex gap-3">
                  <a href="#" className="w-8 h-8 rounded-lg bg-[#1C7ED6]/20 flex items-center justify-center hover:bg-[#1C7ED6]/30 transition-colors">
                    <Facebook className="w-4 h-4 text-[#00D4FF]" />
                  </a>
                  <a href="#" className="w-8 h-8 rounded-lg bg-[#1C7ED6]/20 flex items-center justify-center hover:bg-[#1C7ED6]/30 transition-colors">
                    <Linkedin className="w-4 h-4 text-[#00D4FF]" />
                  </a>
                  <a href="#" className="w-8 h-8 rounded-lg bg-[#1C7ED6]/20 flex items-center justify-center hover:bg-[#1C7ED6]/30 transition-colors">
                    <Instagram className="w-4 h-4 text-[#00D4FF]" />
                  </a>
                  <a href="#" className="w-8 h-8 rounded-lg bg-[#1C7ED6]/20 flex items-center justify-center hover:bg-[#1C7ED6]/30 transition-colors">
                    <Youtube className="w-4 h-4 text-[#00D4FF]" />
                  </a>
                </div>
              </div>

              {/* Plattform */}
              <div>
                <h4 className="font-semibold text-white mb-4">Plattform</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">Matching</a></li>
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">Preise</a></li>
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">Wallet</a></li>
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">Live Tracking</a></li>
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">Dokumente</a></li>
                </ul>
              </div>

              {/* Unternehmen */}
              <div>
                <h4 className="font-semibold text-white mb-4">Unternehmen</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">Über uns</a></li>
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">Karriere</a></li>
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">Presse</a></li>
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">Blog</a></li>
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">Kontakt</a></li>
                </ul>
              </div>

              {/* Rechtliches */}
              <div>
                <h4 className="font-semibold text-white mb-4">Rechtliches</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">AGB</a></li>
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">Datenschutz</a></li>
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">Impressum</a></li>
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">Cookies</a></li>
                </ul>
              </div>

              {/* Support */}
              <div>
                <h4 className="font-semibold text-white mb-4">Support</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">Hilfe-Center</a></li>
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">Support anfragen</a></li>
                  <li><a href="#" className="text-sm text-gray-400 hover:text-[#00D4FF] transition-colors">Status</a></li>
                </ul>
              </div>
            </div>

            {/* Copyright */}
            <div className="mt-12 pt-8 border-t border-[#1C7ED6]/20 text-center">
              <p className="text-sm text-gray-500">© 2024 CargoBit. Alle Rechte vorbehalten.</p>
            </div>
          </div>
        </footer>
      </div>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        defaultTab={authTab}
      />
    </>
  );
}
