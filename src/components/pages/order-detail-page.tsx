'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RiskBadge, RiskBar } from '@/components/cargobit/risk-badge';
import { InsuranceWidget, InsuranceTier } from '@/components/cargobit/insurance-widget';
import { TransportCard } from '@/components/cargobit/transport-card';
import { BannerAd } from '@/components/ads/banner-ad';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Package,
  Truck,
  Clock,
  User,
  Building2,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Info,
  Phone,
  Mail,
  ArrowRight,
  CreditCard,
  Star,
  ChevronRight,
} from 'lucide-react';

// ========================================
// Order Header
// ========================================
interface OrderHeaderProps {
  orderId: string;
  status: string;
  risk: 'green' | 'yellow' | 'red';
}

function OrderHeader({ orderId, status, risk }: OrderHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">#{orderId}</h1>
            <Badge variant="secondary">{status}</Badge>
          </div>
        </div>
      </div>
      <RiskBadge risk={risk} showLabel />
    </div>
  );
}

// ========================================
// Order Info
// ========================================
function OrderInfo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Transportdetails
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Route */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Abholort</div>
            <div className="text-lg font-semibold">Berlin, Deutschland</div>
            <div className="text-sm text-muted-foreground">Musterstraße 123, 10115</div>
          </div>
          <ArrowRight className="w-6 h-6 text-muted-foreground" />
          <div className="flex-1 text-right">
            <div className="text-sm text-muted-foreground">Zielort</div>
            <div className="text-lg font-semibold">München, Deutschland</div>
            <div className="text-sm text-muted-foreground">Beispielweg 456, 80331</div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Abholdatum</div>
            <div className="font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              15.04.2024
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Lieferdatum</div>
            <div className="font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              16.04.2024
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Frachtart</div>
            <div className="font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Paletten
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Gewicht</div>
            <div className="font-medium flex items-center gap-2">
              <Truck className="w-4 h-4" />
              2.500 kg
            </div>
          </div>
        </div>

        <Separator />

        {/* Cargo Description */}
        <div>
          <div className="text-sm text-muted-foreground mb-2">Frachtbeschreibung</div>
          <p className="text-sm">
            10 Europaletten mit Elektronik-Komponenten. Empfindliche Ware, trocken lagern.
            Stapelbar bis max. 3 Lagen. Wert ca. 45.000 €.
          </p>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
          <div>
            <div className="text-sm text-muted-foreground">Transportpreis</div>
            <div className="text-2xl font-bold">850,00 €</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Zahlungsart</div>
            <div className="font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Escrow
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// Risk Section
// ========================================
function RiskSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Risk-Engine Analyse
        </CardTitle>
        <CardDescription>Automatische Bewertung basierend auf 15 Faktoren</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Risk */}
        <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
          <div>
            <div className="text-sm text-muted-foreground">Gesamtrisiko</div>
            <div className="text-xl font-semibold">Niedriges Risiko</div>
          </div>
          <RiskBadge risk="green" showLabel />
        </div>

        {/* Risk Factors */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Verlader-Vertrauenslevel</span>
            <div className="flex items-center gap-2">
              <RiskBar risk="green" value={90} className="w-24" />
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Route-Bewertung</span>
            <div className="flex items-center gap-2">
              <RiskBar risk="green" value={85} className="w-24" />
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Frachtart-Risiko</span>
            <div className="flex items-center gap-2">
              <RiskBar risk="green" value={75} className="w-24" />
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Wert-Risiko</span>
            <div className="flex items-center gap-2">
              <RiskBar risk="yellow" value={40} className="w-24" />
              <Info className="w-4 h-4 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="p-3 bg-blue-500/10 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Empfehlung:</strong> Eine Frachtversicherung wird aufgrund des Warenwerts empfohlen.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// Insurance Box
// ========================================
function InsuranceBox() {
  const [selectedTier, setSelectedTier] = React.useState<string | null>(null);

  const tiers = [
    {
      name: 'Basis',
      price: 9.90,
      coverage: '10.000 €',
      features: ['Grundschutz', 'Transportschäden', 'Diebstahl'],
    },
    {
      name: 'Standard',
      price: 24.90,
      coverage: '50.000 €',
      features: ['Vollschutz', 'Transportschäden', 'Diebstahl', 'Wasserschäden', 'Keine Selbstbeteiligung'],
      recommended: true,
    },
    {
      name: 'Premium',
      price: 49.90,
      coverage: '100.000 €',
      features: ['Komplettschutz', 'Alle Schäden', 'Weltweit', 'Express-Abwicklung', '24/7 Support'],
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[var(--color-insurance-blue)]" />
          Frachtversicherung
        </CardTitle>
        <CardDescription>Schützen Sie Ihre Ware gegen Verlust und Beschädigung</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4">
          {tiers.map((tier) => (
            <InsuranceTier
              key={tier.name}
              name={tier.name}
              price={tier.price}
              coverage={tier.coverage}
              features={tier.features}
              recommended={tier.recommended}
              onSelect={() => setSelectedTier(tier.name)}
            />
          ))}
        </div>
      </CardContent>
      {selectedTier && (
        <CardFooter className="bg-muted/50">
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="text-sm text-muted-foreground">Ausgewählt: {selectedTier}</div>
              <div className="font-semibold">
                {tiers.find((t) => t.name === selectedTier)?.price.toFixed(2)} €
              </div>
            </div>
            <Button className="gap-2">
              Versicherung hinzufügen
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

// ========================================
// Similar Orders
// ========================================
function SimilarOrders() {
  const similarOrders = [
    { id: 'TR-12400', from: 'Berlin', to: 'München', price: 820, risk: 'green' as const },
    { id: 'TR-12401', from: 'Berlin', to: 'Stuttgart', price: 780, risk: 'green' as const },
    { id: 'TR-12402', from: 'Hamburg', to: 'München', price: 950, risk: 'yellow' as const },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Ähnliche Aufträge</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {similarOrders.map((order) => (
          <TransportCard
            key={order.id}
            id={order.id}
            route={{ from: order.from, to: order.to }}
            risk={order.risk}
            price={order.price}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ========================================
// Footer Actions
// ========================================
function FooterActions() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold">Max Mustermann</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  4.9 · 127 Transporte
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Phone className="w-4 h-4" />
              Kontakt
            </Button>
            <Button className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Auftrag annehmen
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// Order Detail Page
// ========================================
interface OrderDetailPageProps {
  orderId?: string;
}

export default function OrderDetailPage({ orderId = 'TR-12345' }: OrderDetailPageProps) {
  return (
    <main className="min-h-screen bg-background py-8">
      <div className="max-w-5xl mx-auto px-4 flex flex-col gap-8">
        {/* Header */}
        <OrderHeader orderId={orderId} status="Offen" risk="green" />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <OrderInfo />
            <RiskSection />
            <InsuranceBox />
          </div>

          {/* Right Column - Sidebar */}
          <aside className="lg:col-span-1 flex flex-col gap-4">
            <BannerAd slot="order-detail-sidebar" />
            <SimilarOrders />
          </aside>
        </div>

        {/* Footer Actions */}
        <FooterActions />
      </div>
    </main>
  );
}
