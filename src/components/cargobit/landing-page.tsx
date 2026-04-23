'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RiskBadge, RiskBar } from '@/components/cargobit/risk-badge';
import { TransportCard } from '@/components/cargobit/transport-card';
import { InsuranceWidget, InsuranceTier } from '@/components/cargobit/insurance-widget';
import {
  ArrowRight,
  Shield,
  Truck,
  Package,
  Globe,
  Zap,
  Lock,
  FileText,
  CheckCircle2,
  ChevronRight,
  Users,
  TrendingUp,
  Building2,
  CreditCard,
  Eye,
  AlertTriangle,
  Clock,
  Star,
} from 'lucide-react';

// ========================================
// Hero Section
// ========================================
export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      
      {/* Gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[var(--color-brand-primary)]/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[var(--color-risk-green)]/20 rounded-full blur-3xl" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Content */}
          <div className="text-white">
            <Badge variant="secondary" className="mb-6 px-4 py-2 gap-2 bg-white/10 text-white border-white/20">
              <Globe className="w-4 h-4" />
              Verfügbar in 27 europäischen Ländern
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Sichere Transportplattform mit integriertem{' '}
              <span className="text-[var(--color-brand-primary)]">Risk-Scoring</span> &{' '}
              <span className="text-[var(--color-insurance-gold)]">Frachtversicherung</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-xl">
              Reduziere Fraud, sichere jede Fracht ab und monetarisiere deine Plattform mit Versicherungen & Add-Ons.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="gap-2 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)]">
                Aufträge entdecken
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10">
                Auftrag einstellen
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap gap-8">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[var(--color-risk-green)]" />
                <span className="text-sm text-gray-300">ISO 27001 zertifiziert</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--color-brand-primary)]" />
                <span className="text-sm text-gray-300">12.000+ Nutzer</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-[var(--color-insurance-gold)] fill-current" />
                <span className="text-sm text-gray-300">4.9/5 Bewertung</span>
              </div>
            </div>
          </div>
          
          {/* Right - Feature Cards */}
          <div className="grid gap-4">
            <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--color-brand-primary)]/20">
                    <Shield className="w-6 h-6 text-[var(--color-brand-primary)]" />
                  </div>
                  <CardTitle className="text-lg">Risk-Engine</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300">
                  Echtzeit-Bewertung jeder Transaktion: Green, Yellow, Red – mit automatischer Mitigation.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--color-insurance-blue)]/20">
                    <Package className="w-6 h-6 text-[var(--color-insurance-blue)]" />
                  </div>
                  <CardTitle className="text-lg">Frachtversicherung</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300">
                  Direkt im Auftrag abschließen, Provision pro Abschluss für deine Plattform.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--color-insurance-gold)]/20">
                    <TrendingUp className="w-6 h-6 text-[var(--color-insurance-gold)]" />
                  </div>
                  <CardTitle className="text-lg">Add-On Ads</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300">
                  Banner-Ads & Sponsored Listings für Versicherer und Logistik-Partner.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

// ========================================
// How It Works Section
// ========================================
const steps = [
  {
    step: '01',
    title: 'Auftrag erstellen',
    description: 'Definiere Route, Fracht und Anforderungen. Unser Risk-Engine bewertet automatisch.',
    icon: FileText,
  },
  {
    step: '02',
    title: 'Matching & Auswahl',
    description: 'KI-gestütztes Matching verbindet dich mit verifizierten Transporteuren.',
    icon: Zap,
  },
  {
    step: '03',
    title: 'Versicherung optional',
    description: 'Schließe direkt eine Frachtversicherung ab – mit Provision für deine Plattform.',
    icon: Shield,
  },
  {
    step: '04',
    title: 'Tracking & Abschluss',
    description: 'Verfolge in Echtzeit. Zahlung wird nach erfolgreicher Lieferung freigegeben.',
    icon: CheckCircle2,
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Wie es funktioniert</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            In 4 Schritten zum sicheren Transport
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Von der Auftragsstellung bis zur Lieferung – alles automatisiert und transparent.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.step} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent -translate-x-8 z-0" />
              )}
              
              <div className="relative z-10 text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-primary/10 mb-4">
                  <step.icon className="w-10 h-10 text-primary" />
                </div>
                <div className="text-sm text-primary font-semibold mb-2">{step.step}</div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ========================================
// For Who Section
// ========================================
const audiences = [
  {
    title: 'Shipper / Verlader',
    description: 'Private und gewerbliche Kunden, die Transporte beauftragen.',
    features: ['Transport-Management', 'Wallet & Escrow', 'Dokumente automatisiert'],
    icon: Package,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Carrier / Transporteure',
    description: 'Fahrer und Flotten, die Aufträge ausführen.',
    features: ['Mobile App', 'Schnelle Auszahlung', 'Route-Optimierung'],
    icon: Truck,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    title: 'Versicherer & Partner',
    description: 'Versicherungsgesellschaften und Logistik-Dienstleister.',
    features: ['API-Integration', 'Risk-Data Access', 'Banner-Werbung'],
    icon: Building2,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
];

export function ForWhoSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Für wen?</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Die richtige Lösung für jeden Akteur
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {audiences.map((audience) => (
            <Card key={audience.title} className="relative overflow-hidden">
              <CardHeader>
                <div className={cn('inline-flex w-12 h-12 rounded-xl mb-4', audience.bgColor)}>
                  <audience.icon className={cn('w-6 h-6 m-auto', audience.color)} />
                </div>
                <CardTitle>{audience.title}</CardTitle>
                <CardDescription>{audience.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {audience.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ========================================
// Security & Compliance Section
// ========================================
export function SecuritySection() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="outline" className="mb-4">Security & Compliance</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Enterprise-Grade Sicherheit für jede Transaktion
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Unsere Risk-Engine bewertet jede Transaktion in Echtzeit und schützt vor Fraud.
            </p>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Risk-Engine</h4>
                  <p className="text-sm text-muted-foreground">
                    KI-gestützte Bewertung: Green, Yellow, Red mit automatischer Mitigation.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Audit-Trail</h4>
                  <p className="text-sm text-muted-foreground">
                    Vollständige Protokollierung jeder Aktion für Compliance & Transparenz.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">ISO/SOC2 Ready</h4>
                  <p className="text-sm text-muted-foreground">
                    Zertifiziert nach ISO 27001 und SOC 2 Type II.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Demo Cards */}
          <div className="space-y-4">
            <Card className="card-risk-green">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Niedriges Risiko</CardTitle>
                  <RiskBadge risk="green" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Verifizierter Verlader mit 50+ erfolgreichen Transporten.
                </p>
                <RiskBar risk="green" value={15} showValue />
              </CardContent>
            </Card>

            <Card className="card-risk-yellow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Mittleres Risiko</CardTitle>
                  <RiskBadge risk="yellow" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Neuer Transporteur, KYC verifiziert, erste 5 Aufträge.
                </p>
                <RiskBar risk="yellow" value={45} showValue />
              </CardContent>
            </Card>

            <Card className="card-risk-red">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Hohes Risiko</CardTitle>
                  <RiskBadge risk="red" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Auffällige Route, fehlende Dokumente, manuelle Prüfung.
                </p>
                <RiskBar risk="red" value={85} showValue />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

// ========================================
// Monetization Section
// ========================================
export function MonetizationSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Monetarisierung</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Mehrere Einnahmequellen für deine Plattform
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Ads */}
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto p-4 rounded-2xl bg-primary/10 w-fit mb-4">
                <Eye className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Banner-Ads</CardTitle>
              <CardDescription>
                970×250, 728×90, 300×250 Formate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-left space-y-2 mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Versicherer & Logistik-Partner
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Targeting nach Route & Fracht
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  CPM & CPC Modelle
                </li>
              </ul>
              <div className="text-2xl font-bold text-primary">+25% RPM</div>
              <div className="text-xs text-muted-foreground">durchschnittliche Steigerung</div>
            </CardContent>
          </Card>

          {/* Insurance */}
          <Card className="text-center border-2 border-[var(--color-insurance-gold)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--color-insurance-gold)] text-white text-xs font-medium rounded-full">
              Empfohlen
            </div>
            <CardHeader>
              <div className="mx-auto p-4 rounded-2xl bg-[var(--color-insurance-blue)]/10 w-fit mb-4">
                <Shield className="w-8 h-8 text-[var(--color-insurance-blue)]" />
              </div>
              <CardTitle>Frachtversicherung</CardTitle>
              <CardDescription>
                Provision pro Abschluss
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-left space-y-2 mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Integration im Checkout
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Bis zu 15% Provision
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Keine Eigenleistung
                </li>
              </ul>
              <div className="text-2xl font-bold text-[var(--color-insurance-blue)]">€12-45</div>
              <div className="text-xs text-muted-foreground">Provision pro Abschluss</div>
            </CardContent>
          </Card>

          {/* Premium */}
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto p-4 rounded-2xl bg-primary/10 w-fit mb-4">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Premium Listings</CardTitle>
              <CardDescription>
                Hervorgehobene Aufträge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-left space-y-2 mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Top-Platzierung
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Badge & Hervorhebung
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Pauschale pro Tag
                </li>
              </ul>
              <div className="text-2xl font-bold text-primary">€5-15</div>
              <div className="text-xs text-muted-foreground">pro Tag Premium</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

// ========================================
// CTA Section
// ========================================
export function CTASection() {
  return (
    <section className="py-24 hero-gradient">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6">
          Bereit für sichere Transporte?
        </h2>
        <p className="text-xl text-gray-300 mb-8">
          Starte jetzt und profitiere von Risk-Scoring, Versicherungen und Monetarisierung.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button size="lg" className="gap-2 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)]">
            Kostenlos starten
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button size="lg" variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10">
            Demo anfragen
          </Button>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
