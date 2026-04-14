'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Check,
  ChevronDown,
  Menu,
  X,
  MapPin,
  Clock,
  BarChart3,
  FileText,
  Zap,
  HeadphonesIcon,
  Bot,
  Languages,
  Moon,
  Sun,
  Phone,
  Mail,
  Map,
  CheckCircle2,
  User,
  Building2,
} from 'lucide-react';

import { useAuthStore } from '@/lib/auth-store';
import { AuthModal } from '@/components/auth/auth-modal';
import { Dashboard } from '@/components/dashboard/dashboard';
import { TransportForm } from '@/components/transport/transport-form';

// Translation object (simplified - would come from i18n in production)
const translations = {
  de: {
    nav: { transports: 'Transporte', matching: 'Matching', pricing: 'Preise', wallet: 'Wallet', support: 'Support' },
    hero: {
      title: 'CargoBit',
      subtitle: 'Ihre europäische Logistikplattform',
      description: 'Verbinden Sie Shipper und Transporteure in ganz Europa. Sichere Zahlungen, smartes Matching und transparente Preise.',
      cta_register: 'Jetzt registrieren',
      cta_login: 'Anmelden'
    },
    features: {
      title: 'Warum CargoBit?',
      items: [
        { title: 'Transport-Management', desc: 'Verwalten Sie alle Ihre Transporte an einem Ort. Von der Erstellung bis zur Lieferung.', icon: 'truck' },
        { title: 'Smart Matching', desc: 'KI-gestütztes Matching verbindet Sie mit den besten Transporteuren für Ihre Ladung.', icon: 'zap' },
        { title: 'Sichere Wallet', desc: 'Escrow-System schützt Ihre Zahlungen. Geld wird erst nach erfolgreicher Lieferung freigegeben.', icon: 'wallet' },
        { title: 'Fahrer-App', desc: 'Mobile-optimierte Oberfläche für Fahrer mit GPS-Tracking und Dokumenten-Upload.', icon: 'phone' },
        { title: 'Dispatcher-Tools', desc: 'Flottenübersicht, Kapazitätskalender und automatische Zuweisungen.', icon: 'bar-chart' },
        { title: 'Automatische Dokumente', desc: 'CMR, Lieferschein und Rechnung werden automatisch generiert.', icon: 'file-text' }
      ]
    },
    stats: {
      transports: 'Transporte abgeschlossen',
      users: 'Aktive Nutzer',
      countries: 'Länder',
      satisfaction: 'Zufriedenheitsrate'
    },
    pricing: {
      title: 'Preise & Pläne',
      subtitle: 'Wählen Sie den passenden Plan für Ihre Bedürfnisse',
      monthly: 'Monatlich',
      yearly: 'Jährlich',
      save: ' sparen',
      saveOrFree: '20% sparen oder 2 Monate Gratis',
      perMonth: '/Monat',
      perYear: '/Jahr',
      plans: [
        { name: 'Free', priceMonthly: 'Kostenlos', priceYearly: 'Kostenlos', desc: 'Für Einsteiger', features: ['5 aktive Transporte/Monat', 'Basis-Matching', 'E-Mail Support', 'Standard-Provision (14%)'] },
        { name: 'Starter', priceMonthly: '89€', priceYearly: '890€', desc: 'Für wachsende Unternehmen', features: ['25 aktive Transporte/Monat', 'Erweitertes Matching', 'Prioritäts-Support', 'Reduzierte Provision (10%)', 'API-Zugang'] },
        { name: 'Professional', priceMonthly: '699€', priceYearly: '6990€', desc: 'Für Profis', features: ['Unbegrenzte Transporte', 'Smart Matching Premium', '24/7 Support', 'Niedrigste Provision (8%)', 'API-Zugang', 'Automatische Dokumente', 'Custom Branding'], popular: true },
        { name: 'Enterprise', priceMonthly: 'Auf Anfrage', priceYearly: 'Auf Anfrage', desc: 'Für große Flotten', features: ['Alles aus Professional', 'Dedizierter Account Manager', 'Individuelle Integration', 'SLA Garantie', 'Multi-User Support', 'Niedrigste Provision (6%)'] }
      ],
      fees: {
        title: 'Gebühren & Provisionen',
        shipperFee: { title: 'Verlader-Gebühr', percent: '4%', desc: 'Verlader zahlen 4% vom Zuschlagspreis' },
        transporterCommission: { 
          title: 'Transportprovision', 
          desc: 'Transporteure zahlen je nach Abo-Tier',
          tiers: [
            { name: 'Kostenlos', percent: '14%' },
            { name: 'Starter', percent: '10%' },
            { name: 'Professional', percent: '8%' },
            { name: 'Enterprise', percent: '6%' }
          ]
        },
        walletFee: { title: 'Wallet-Gebühr', percent: '3,5%', desc: 'Für Ein- und Auszahlungen' }
      },
      cta: 'Jetzt starten'
    },
    footer: {
      about: 'Über uns',
      pricing: 'Preise',
      support: 'Support',
      legal: 'Rechtliches',
      terms: 'AGB',
      privacy: 'Datenschutz',
      contact: 'Kontakt',
      copyright: '© 2024 CargoBit. Alle Rechte vorbehalten.'
    }
  }
};

const t = translations.de;

export default function Home() {
  const { isAuthenticated, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isYearly, setIsYearly] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [showTransportForm, setShowTransportForm] = useState(false);

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

  // If authenticated, show dashboard
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

  // Landing page for non-authenticated users
  const features = [
    { icon: <Truck className="w-8 h-8" />, title: t.features.items[0].title, desc: t.features.items[0].desc },
    { icon: <Zap className="w-8 h-8" />, title: t.features.items[1].title, desc: t.features.items[1].desc },
    { icon: <Wallet className="w-8 h-8" />, title: t.features.items[2].title, desc: t.features.items[2].desc },
    { icon: <Phone className="w-8 h-8" />, title: t.features.items[3].title, desc: t.features.items[3].desc },
    { icon: <BarChart3 className="w-8 h-8" />, title: t.features.items[4].title, desc: t.features.items[4].desc },
    { icon: <FileText className="w-8 h-8" />, title: t.features.items[5].title, desc: t.features.items[5].desc },
  ];

  const stats = [
    { value: '50.000+', label: t.stats.transports },
    { value: '12.000+', label: t.stats.users },
    { value: '27', label: t.stats.countries },
    { value: '98%', label: t.stats.satisfaction },
  ];

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-background/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 lg:h-20">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  CargoBit
                </span>
              </div>

              {/* Desktop Nav */}
              <div className="hidden lg:flex items-center gap-8">
                {Object.entries(t.nav).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => scrollToSection(key)}
                    className="text-muted-foreground hover:text-primary transition-colors font-medium"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Right Side */}
              <div className="hidden lg:flex items-center gap-4">
                {/* Language Selector */}
                <div className="relative">
                  <button
                    onClick={() => setLangOpen(!langOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-sm">DE</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {langOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-xl py-2 min-w-[140px]">
                      {['DE', 'EN', 'PL', 'CZ', 'RO', 'SL', 'SK', 'TR', 'EL', 'FR'].map(lang => (
                        <button key={lang} className="w-full px-4 py-2 text-left hover:bg-muted transition-colors text-sm">
                          {lang}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Theme Toggle */}
                <button
                  onClick={() => setIsDark(!isDark)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}
                >
                  {t.hero.cta_login}
                </Button>
                <Button 
                  size="sm" 
                  className="gap-2"
                  onClick={() => { setAuthTab('register'); setShowAuthModal(true); }}
                >
                  {t.hero.cta_register}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden bg-card border-t shadow-xl">
              <div className="px-4 py-6 space-y-4">
                {Object.entries(t.nav).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => scrollToSection(key)}
                    className="block w-full text-left py-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {label}
                  </button>
                ))}
                <Separator />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => { setAuthTab('login'); setShowAuthModal(true); setIsMenuOpen(false); }}
                  >
                    {t.hero.cta_login}
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => { setAuthTab('register'); setShowAuthModal(true); setIsMenuOpen(false); }}
                  >
                    {t.hero.cta_register}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000,transparent)]" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              {/* Badge */}
              <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm gap-2 animate-float">
                <Globe className="w-4 h-4" />
                Verfügbar in 27 europäischen Ländern
              </Badge>

              {/* Title */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  {t.hero.title}
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-xl sm:text-2xl text-muted-foreground mb-4 font-medium">
                {t.hero.subtitle}
              </p>

              {/* Description */}
              <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto mb-10">
                {t.hero.description}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  size="lg" 
                  className="gap-2 px-8 h-14 text-lg shadow-xl hover:shadow-2xl transition-all animate-pulse-glow"
                  onClick={() => { setAuthTab('register'); setShowAuthModal(true); }}
                >
                  {t.hero.cta_register}
                  <ArrowRight className="w-5 h-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="gap-2 px-8 h-14 text-lg"
                  onClick={() => { setAuthTab('login'); setShowAuthModal(true); }}
                >
                  {t.hero.cta_login}
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="mt-12 flex flex-wrap justify-center gap-8 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Sichere Zahlungen</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <span className="text-sm">12.000+ Nutzer</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm">4.9/5 Bewertung</span>
                </div>
              </div>
            </div>

            {/* Hero Image/Illustration - Professional Dashboard Preview */}
            <div className="mt-16 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border bg-card">
                <Image
                  src="/images/dashboard-main.png"
                  alt="CargoBit Dashboard - Professionelle Logistikplattform"
                  width={1344}
                  height={768}
                  className="w-full h-auto object-cover"
                  priority
                />
                {/* Overlay with subtle gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                {/* Bottom label */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                  <Badge variant="secondary" className="px-4 py-2 text-sm bg-background/80 backdrop-blur-sm">
                    <Globe className="w-4 h-4 mr-2" />
                    Dashboard Vorschau - 6 Rollen verfügbar
                  </Badge>
                </div>
              </div>
              {/* Floating badges around the image */}
              <div className="absolute -top-4 -left-4 bg-card border rounded-xl p-3 shadow-lg animate-float hidden lg:flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Transport</div>
                  <div className="text-sm font-semibold">Erfolgreich</div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-card border rounded-xl p-3 shadow-lg animate-float hidden lg:flex items-center gap-2" style={{ animationDelay: '0.5s' }}>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Wallet</div>
                  <div className="text-sm font-semibold">€12,450</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Preview Section - Interactive Role Selection */}
        <section className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4">Dashboard-Vorschau</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Individuelle Dashboards für jede Rolle
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Jeder Nutzer erhält ein optimiertes Dashboard - von Verladern bis zu Fahrern, Dispatcher und Administratoren.
              </p>
            </div>

            <Tabs defaultValue="shipper" className="space-y-8">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 w-full max-w-4xl mx-auto h-auto p-1">
                <TabsTrigger value="shipper" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Package className="w-5 h-5" />
                  <span className="text-xs sm:text-sm">Verlader</span>
                </TabsTrigger>
                <TabsTrigger value="driver" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Truck className="w-5 h-5" />
                  <span className="text-xs sm:text-sm">Fahrer</span>
                </TabsTrigger>
                <TabsTrigger value="dispatcher" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Users className="w-5 h-5" />
                  <span className="text-xs sm:text-sm">Dispatcher</span>
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Shield className="w-5 h-5" />
                  <span className="text-xs sm:text-sm">Admin</span>
                </TabsTrigger>
                <TabsTrigger value="support" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <HeadphonesIcon className="w-5 h-5" />
                  <span className="text-xs sm:text-sm">Support</span>
                </TabsTrigger>
                <TabsTrigger value="marketer" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-xs sm:text-sm">Marketer</span>
                </TabsTrigger>
              </TabsList>

              {/* Shipper Dashboard Preview */}
              <TabsContent value="shipper" className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div className="order-2 lg:order-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Package className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Verlader Dashboard</h3>
                        <p className="text-sm text-muted-foreground">Für Privat- & Firmenkunden</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-6">
                      Verwalten Sie alle Ihre Transporte an einem Ort. Erstellen Sie neue Aufträge, verfolgen Sie den Status in Echtzeit und verwalten Sie Ihre Wallet.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-blue-500">3</div>
                        <div className="text-sm text-muted-foreground">Aktive Transporte</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-green-500">€1,250</div>
                        <div className="text-sm text-muted-foreground">Wallet Guthaben</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-yellow-500">2</div>
                        <div className="text-sm text-muted-foreground">Warte auf Angebote</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-primary">24</div>
                        <div className="text-sm text-muted-foreground">Abgeschlossen</div>
                      </div>
                    </div>
                    <Button className="gap-2" onClick={() => { setAuthTab('register'); setShowAuthModal(true); }}>
                      Als Verlader registrieren
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="order-1 lg:order-2">
                    <div className="relative rounded-2xl overflow-hidden shadow-xl border bg-card">
                      <Image
                        src="/images/dashboard-shipper.png"
                        alt="Verlader Dashboard"
                        width={1024}
                        height={1024}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Driver Dashboard Preview */}
              <TabsContent value="driver" className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div className="order-2 lg:order-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <Truck className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Fahrer Dashboard</h3>
                        <p className="text-sm text-muted-foreground">Für selbstständige Fahrer</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-6">
                      Finden Sie verfügbare Aufträge in Ihrer Nähe, akzeptieren Sie Jobs mit einem Klick und erhalten Sie schnelle Auszahlungen auf Ihre Wallet.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-green-500">€3,420</div>
                        <div className="text-sm text-muted-foreground">Verfügbarer Verdienst</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-yellow-500">4.9 ⭐</div>
                        <div className="text-sm text-muted-foreground">Bewertung</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-blue-500">342</div>
                        <div className="text-sm text-muted-foreground">Abgeschlossene Touren</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-primary">8</div>
                        <div className="text-sm text-muted-foreground">Diese Woche</div>
                      </div>
                    </div>
                    <Button className="gap-2" onClick={() => { setAuthTab('register'); setShowAuthModal(true); }}>
                      Als Fahrer registrieren
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="order-1 lg:order-2">
                    <div className="relative rounded-2xl overflow-hidden shadow-xl border bg-card">
                      <Image
                        src="/images/dashboard-driver.png"
                        alt="Fahrer Dashboard"
                        width={1024}
                        height={1024}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Dispatcher Dashboard Preview */}
              <TabsContent value="dispatcher" className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div className="order-2 lg:order-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-purple-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Dispatcher Dashboard</h3>
                        <p className="text-sm text-muted-foreground">Für Flottenverwaltung</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-6">
                      Verwalten Sie Ihre gesamte Flotte, weisen Sie Fahrer Touren zu und behalten Sie den Überblick über alle Fahrzeuge in Echtzeit.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-purple-500">12</div>
                        <div className="text-sm text-muted-foreground">Fahrzeuge</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-blue-500">15</div>
                        <div className="text-sm text-muted-foreground">Fahrer</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-green-500">€45.200</div>
                        <div className="text-sm text-muted-foreground">Umsatz/Monat</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-primary">18</div>
                        <div className="text-sm text-muted-foreground">Heutige Touren</div>
                      </div>
                    </div>
                    <Button className="gap-2" onClick={() => { setAuthTab('register'); setShowAuthModal(true); }}>
                      Als Dispatcher registrieren
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="order-1 lg:order-2">
                    <div className="relative rounded-2xl overflow-hidden shadow-xl border bg-card">
                      <Image
                        src="/images/dashboard-dispatcher.png"
                        alt="Dispatcher Dashboard"
                        width={1024}
                        height={1024}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Admin Dashboard Preview */}
              <TabsContent value="admin" className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div className="order-2 lg:order-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Admin Dashboard</h3>
                        <p className="text-sm text-muted-foreground">Systemverwaltung</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-6">
                      Vollständige Systemübersicht, Benutzerverwaltung, Verifizierungen und KI-Überwachung für einen reibungslosen Plattformbetrieb.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-red-500">12,458</div>
                        <div className="text-sm text-muted-foreground">Benutzer gesamt</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-green-500">€234.500</div>
                        <div className="text-sm text-muted-foreground">Umsatz/Monat</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-blue-500">3,842</div>
                        <div className="text-sm text-muted-foreground">Aktive Transporte</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-yellow-500">47</div>
                        <div className="text-sm text-muted-foreground">Ausstehende Verifizierungen</div>
                      </div>
                    </div>
                  </div>
                  <div className="order-1 lg:order-2">
                    <div className="relative rounded-2xl overflow-hidden shadow-xl border bg-card aspect-square flex items-center justify-center bg-gradient-to-br from-red-500/10 to-red-500/5">
                      <div className="text-center p-8">
                        <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h4 className="text-xl font-bold mb-2">Admin Dashboard</h4>
                        <p className="text-muted-foreground">Nur für autorisierte Administratoren</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Support Dashboard Preview */}
              <TabsContent value="support" className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div className="order-2 lg:order-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <HeadphonesIcon className="w-6 h-6 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Support Dashboard</h3>
                        <p className="text-sm text-muted-foreground">Kundensupport & Tickets</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-6">
                      Verwalten Sie Support-Tickets, Streitfälle und Nutzeranfragen mit KI-unterstützter Automatisierung.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-red-500">23</div>
                        <div className="text-sm text-muted-foreground">Offene Tickets</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-green-500">42</div>
                        <div className="text-sm text-muted-foreground">Heute gelöst</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-blue-500">8 Min</div>
                        <div className="text-sm text-muted-foreground">Ø Antwortzeit</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-primary">68%</div>
                        <div className="text-sm text-muted-foreground">KI-gelöst</div>
                      </div>
                    </div>
                  </div>
                  <div className="order-1 lg:order-2">
                    <div className="relative rounded-2xl overflow-hidden shadow-xl border bg-card aspect-square flex items-center justify-center bg-gradient-to-br from-orange-500/10 to-orange-500/5">
                      <div className="text-center p-8">
                        <HeadphonesIcon className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                        <h4 className="text-xl font-bold mb-2">Support Dashboard</h4>
                        <p className="text-muted-foreground">24/7 Kundensupport</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Marketer Dashboard Preview */}
              <TabsContent value="marketer" className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div className="order-2 lg:order-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-pink-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Marketing Dashboard</h3>
                        <p className="text-sm text-muted-foreground">Kampagnen & Analytics</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-6">
                      Verwalten Sie Marketing-Kampagnen, analysieren Sie Performance-Metriken und optimieren Sie die Nutzerakquise.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-pink-500">8</div>
                        <div className="text-sm text-muted-foreground">Aktive Kampagnen</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-blue-500">245K</div>
                        <div className="text-sm text-muted-foreground">Impressionen</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-green-500">892</div>
                        <div className="text-sm text-muted-foreground">Conversions</div>
                      </div>
                      <div className="p-4 rounded-xl bg-card border">
                        <div className="text-2xl font-bold text-primary">3.2x</div>
                        <div className="text-sm text-muted-foreground">ROI Ø</div>
                      </div>
                    </div>
                  </div>
                  <div className="order-1 lg:order-2">
                    <div className="relative rounded-2xl overflow-hidden shadow-xl border bg-card aspect-square flex items-center justify-center bg-gradient-to-br from-pink-500/10 to-pink-500/5">
                      <div className="text-center p-8">
                        <BarChart3 className="w-16 h-16 text-pink-500 mx-auto mb-4" />
                        <h4 className="text-xl font-bold mb-2">Marketing Dashboard</h4>
                        <p className="text-muted-foreground">Kampagnen-Performance</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 border-y bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-4xl sm:text-5xl font-bold text-primary mb-2">{stat.value}</div>
                  <div className="text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="transports" className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4">Features</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.features.title}</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Alles was Sie für Ihre Logistik brauchen - in einer Plattform
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <Card key={i} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/20">
                  <CardHeader>
                    <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{feature.desc}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4">{t.pricing.title}</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.pricing.subtitle}</h2>
              
              {/* Billing Toggle */}
              <div className="flex items-center justify-center gap-4 mt-8">
                <span className={isYearly ? 'text-muted-foreground' : 'font-medium'}>{t.pricing.monthly}</span>
                <Switch checked={isYearly} onCheckedChange={setIsYearly} />
                <span className={isYearly ? 'font-medium' : 'text-muted-foreground'}>
                  {t.pricing.yearly}
                  {isYearly && (
                    <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      {t.pricing.saveOrFree}
                    </Badge>
                  )}
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {t.pricing.plans.map((plan, i) => (
                <Card key={i} className={`relative ${plan.popular ? 'border-primary shadow-xl scale-105' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="px-4 py-1">Beliebt</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.desc}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">
                        {isYearly ? plan.priceYearly : plan.priceMonthly}
                      </span>
                      {plan.priceMonthly !== 'Kostenlos' && plan.priceMonthly !== 'Auf Anfrage' && (
                        <span className="text-muted-foreground">
                          {isYearly ? t.pricing.perYear : t.pricing.perMonth}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {plan.features.map((feature, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() => { setAuthTab('register'); setShowAuthModal(true); }}
                    >
                      {t.pricing.cta}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Fees Section */}
            <div className="mt-20">
              <div className="text-center mb-12">
                <h3 className="text-2xl font-bold mb-2">{t.pricing.fees.title}</h3>
                <p className="text-muted-foreground">Transparente Preisstruktur für alle Nutzer</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {/* Shipper Fee */}
                <Card className="text-center p-6">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                    <Package className="w-8 h-8" />
                  </div>
                  <h4 className="font-semibold text-lg mb-1">{t.pricing.fees.shipperFee.title}</h4>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {t.pricing.fees.shipperFee.percent}
                  </div>
                  <p className="text-sm text-muted-foreground">{t.pricing.fees.shipperFee.desc}</p>
                </Card>

                {/* Transporter Commission */}
                <Card className="text-center p-6">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-4">
                    <Truck className="w-8 h-8" />
                  </div>
                  <h4 className="font-semibold text-lg mb-1">{t.pricing.fees.transporterCommission.title}</h4>
                  <p className="text-sm text-muted-foreground mb-4">{t.pricing.fees.transporterCommission.desc}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {t.pricing.fees.transporterCommission.tiers.map((tier, i) => (
                      <div key={i} className="bg-muted rounded-lg p-2">
                        <div className="text-xs text-muted-foreground">{tier.name}</div>
                        <div className="font-bold text-green-600 dark:text-green-400">{tier.percent}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Wallet Fee */}
                <Card className="text-center p-6">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                    <Wallet className="w-8 h-8" />
                  </div>
                  <h4 className="font-semibold text-lg mb-1">{t.pricing.fees.walletFee.title}</h4>
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                    {t.pricing.fees.walletFee.percent}
                  </div>
                  <p className="text-sm text-muted-foreground">{t.pricing.fees.walletFee.desc}</p>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Matching Section */}
        <section id="matching" className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge variant="outline" className="mb-4">Smart Matching</Badge>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                  KI-gestütztes Matching für optimale Transporte
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Unser intelligentes Matching-System verbindet Shipper automatisch mit den besten verfügbaren Transporteuren - basierend auf Route, Fahrzeugtyp, Kapazität und Bewertung.
                </p>
                <ul className="space-y-4">
                  {[
                    { icon: <MapPin className="w-5 h-5" />, text: 'Automatische Routenoptimierung' },
                    { icon: <Clock className="w-5 h-5" />, text: 'Echtzeit-Verfügbarkeit' },
                    { icon: <Star className="w-5 h-5" />, text: 'Bewertungsbasierte Empfehlungen' },
                    { icon: <Zap className="w-5 h-5" />, text: 'Sofortige Match-Vorschläge' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        {item.icon}
                      </div>
                      <span className="font-medium">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="rounded-2xl border bg-card shadow-xl p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">KI-Matching</div>
                      <div className="text-sm text-muted-foreground">3 passende Transporteure gefunden</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: 'Spedition Müller', rating: '4.9', price: '€450', distance: '12 km' },
                      { name: 'Transport Weber', rating: '4.8', price: '€420', distance: '25 km' },
                      { name: 'Logistik Schmidt', rating: '4.7', price: '€395', distance: '40 km' },
                    ].map((driver, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-lg">
                            🚛
                          </div>
                          <div>
                            <div className="font-medium">{driver.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {driver.rating}
                              <span>•</span>
                              <MapPin className="w-3 h-3" />
                              {driver.distance}
                            </div>
                          </div>
                        </div>
                        <div className="font-semibold text-primary">{driver.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Wallet Section */}
        <section id="wallet" className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4">Wallet</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Sichere Zahlungen mit Escrow</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Ihre Zahlungen sind geschützt. Geld wird erst nach erfolgreicher Lieferung an den Transporteur freigegeben.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: <Shield className="w-8 h-8" />, title: 'Escrow-Schutz', desc: 'Zahlungen werden sicher verwahrt bis zur Lieferbestätigung' },
                { icon: <Wallet className="w-8 h-8" />, title: 'Transparente Gebühren', desc: 'Keine versteckten Kosten - alle Gebühren sind klar ausgewiesen' },
                { icon: <Globe className="w-8 h-8" />, title: 'EU-weite Auszahlungen', desc: 'Schnelle SEPA-Auszahlungen in alle EU-Länder' },
              ].map((item, i) => (
                <Card key={i} className="text-center">
                  <CardHeader>
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                      {item.icon}
                    </div>
                    <CardTitle>{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{item.desc}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section id="support" className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge variant="outline" className="mb-4">Support</Badge>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                  Rund um die Uhr für Sie da
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Unser Support-Team und KI-Assistent stehen Ihnen jederzeit zur Verfügung - in Ihrer Sprache.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <HeadphonesIcon className="w-8 h-8 text-primary mb-4" />
                      <div className="font-semibold mb-1">24/7 Support</div>
                      <div className="text-sm text-muted-foreground">Live-Chat und Ticket-System</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <Languages className="w-8 h-8 text-primary mb-4" />
                      <div className="font-semibold mb-1">10 Sprachen</div>
                      <div className="text-sm text-muted-foreground">Support in Ihrer Sprache</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <div className="rounded-2xl border bg-card shadow-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold">KI-Support</div>
                    <div className="text-xs text-muted-foreground">Online</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-muted rounded-lg p-3 text-sm">
                    Hallo! Wie kann ich Ihnen heute helfen? 🚛
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Ihre Nachricht..." className="flex-1" />
                    <Button size="icon">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-muted/30 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
              {/* Brand */}
              <div className="lg:col-span-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <Package className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold">CargoBit</span>
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  Ihre europäische Logistikplattform für sichere und effiziente Transporte.
                </p>
                <div className="flex gap-2">
                  {['🇪🇺', '🇩🇪', '🇬🇧', '🇫🇷', '🇵🇱'].map((flag, i) => (
                    <div key={i} className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-lg">
                      {flag}
                    </div>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div>
                <div className="font-semibold mb-4">Plattform</div>
                <ul className="space-y-2 text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">{t.footer.about}</a></li>
                  <li><a href="#pricing" className="hover:text-primary transition-colors">{t.footer.pricing}</a></li>
                  <li><a href="#support" className="hover:text-primary transition-colors">{t.footer.support}</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">API</a></li>
                </ul>
              </div>

              <div>
                <div className="font-semibold mb-4">{t.footer.legal}</div>
                <ul className="space-y-2 text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">{t.footer.terms}</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">{t.footer.privacy}</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Impressum</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Cookie-Einstellungen</a></li>
                </ul>
              </div>

              <div>
                <div className="font-semibold mb-4">{t.footer.contact}</div>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">support@cargobit.eu</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">+49 123 456 7890</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Map className="w-4 h-4" />
                    <span className="text-sm">Berlin, Deutschland</span>
                  </li>
                </ul>
              </div>
            </div>

            <Separator className="my-8" />

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
              <div>{t.footer.copyright}</div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Shield className="w-4 h-4 text-green-500" />
                  SSL-gesichert
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-4 h-4 text-blue-500" />
                  DSGVO-konform
                </span>
              </div>
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
