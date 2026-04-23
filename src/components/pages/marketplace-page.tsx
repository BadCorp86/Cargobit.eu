'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RiskBadge } from '@/components/cargobit/risk-badge';
import { TransportCard } from '@/components/cargobit/transport-card';
import { BannerAd, SponsoredListing } from '@/components/ads/banner-ad';
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Package,
  Truck,
  ChevronDown,
  X,
  SortAsc,
  Grid,
  List,
  ArrowUpDown,
} from 'lucide-react';

// ========================================
// Filters Component
// ========================================
interface FiltersProps {
  className?: string;
}

function Filters({ className }: FiltersProps) {
  const [priceRange, setPriceRange] = React.useState([0, 5000]);
  const [selectedRiskLevels, setSelectedRiskLevels] = React.useState<string[]>(['green', 'yellow', 'red']);
  const [selectedCargoTypes, setSelectedCargoTypes] = React.useState<string[]>([]);

  const riskLevels = [
    { id: 'green', label: 'Niedriges Risiko', color: 'bg-green-500' },
    { id: 'yellow', label: 'Mittleres Risiko', color: 'bg-yellow-500' },
    { id: 'red', label: 'Hohes Risiko', color: 'bg-red-500' },
  ];

  const cargoTypes = [
    'Paletten', 'Stückgut', 'Gefahrgut', 'Kühltransport', 'Baustoffe', 'Fahrzeuge', 'Umzugsgut'
  ];

  const countries = [
    'Deutschland', 'Österreich', 'Schweiz', 'Polen', 'Tschechien', 'Niederlande', 'Belgien', 'Frankreich', 'Italien'
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Route, ID, Fracht..." className="pl-10" />
      </div>

      {/* Origin/Destination */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Route
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Abholort" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country} value={country.toLowerCase()}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Zielort" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country} value={country.toLowerCase()}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Date Range */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Zeitraum
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="date" placeholder="Von" />
          <Input type="date" placeholder="Bis" />
        </CardContent>
      </Card>

      {/* Risk Level */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Risk-Level
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {riskLevels.map((risk) => (
            <div key={risk.id} className="flex items-center space-x-2">
              <Checkbox
                id={risk.id}
                checked={selectedRiskLevels.includes(risk.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedRiskLevels([...selectedRiskLevels, risk.id]);
                  } else {
                    setSelectedRiskLevels(selectedRiskLevels.filter((r) => r !== risk.id));
                  }
                }}
              />
              <Label htmlFor={risk.id} className="flex items-center gap-2 cursor-pointer">
                <span className={cn('w-3 h-3 rounded-full', risk.color)} />
                {risk.label}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Price Range */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Preisbereich</CardTitle>
        </CardHeader>
        <CardContent>
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            max={10000}
            step={100}
            className="mb-2"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{priceRange[0].toLocaleString('de-DE')} €</span>
            <span>{priceRange[1].toLocaleString('de-DE')} €</span>
          </div>
        </CardContent>
      </Card>

      {/* Cargo Type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="w-4 h-4" />
            Frachtart
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {cargoTypes.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={type}
                checked={selectedCargoTypes.includes(type)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedCargoTypes([...selectedCargoTypes, type]);
                  } else {
                    setSelectedCargoTypes(selectedCargoTypes.filter((t) => t !== type));
                  }
                }}
              />
              <Label htmlFor={type} className="cursor-pointer">{type}</Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Reset Filters */}
      <Button variant="outline" className="w-full gap-2">
        <X className="w-4 h-4" />
        Filter zurücksetzen
      </Button>
    </div>
  );
}

// ========================================
// Order List Component
// ========================================
interface OrderListProps {
  className?: string;
}

function OrderList({ className }: OrderListProps) {
  const orders = [
    { id: 'TR-12345', from: 'Berlin', to: 'München', price: 850, risk: 'green' as const, date: '15.04.2024', cargo: 'Paletten', weight: '2.5t' },
    { id: 'TR-12346', from: 'Hamburg', to: 'Wien', price: 1200, risk: 'green' as const, date: '16.04.2024', cargo: 'Stückgut', weight: '3.2t' },
    { id: 'TR-12347', from: 'Köln', to: 'Prag', price: 950, risk: 'yellow' as const, date: '17.04.2024', cargo: 'Baustoffe', weight: '5.0t' },
    { id: 'TR-12348', from: 'Frankfurt', to: 'Warschau', price: 1400, risk: 'yellow' as const, date: '18.04.2024', cargo: 'Gefahrgut', weight: '1.8t' },
    { id: 'TR-12349', from: 'Stuttgart', to: 'Mailand', price: 2200, risk: 'green' as const, date: '19.04.2024', cargo: 'Fahrzeuge', weight: '2.0t' },
    { id: 'TR-12350', from: 'München', to: 'Zürich', price: 650, risk: 'red' as const, date: '20.04.2024', cargo: 'Kühltransport', weight: '4.5t' },
    { id: 'TR-12351', from: 'Leipzig', to: 'Amsterdam', price: 1100, risk: 'green' as const, date: '21.04.2024', cargo: 'Paletten', weight: '3.0t' },
    { id: 'TR-12352', from: 'Dresden', to: 'Kopenhagen', price: 1800, risk: 'yellow' as const, date: '22.04.2024', cargo: 'Stückgut', weight: '6.0t' },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Sort & View Options */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{orders.length} Aufträge</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="newest">
            <SelectTrigger className="w-[180px]">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Neueste zuerst</SelectItem>
              <SelectItem value="price-asc">Preis aufsteigend</SelectItem>
              <SelectItem value="price-desc">Preis absteigend</SelectItem>
              <SelectItem value="risk-asc">Risiko niedrig</SelectItem>
              <SelectItem value="risk-desc">Risiko hoch</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Order Cards */}
      <div className="grid gap-4">
        {orders.map((order) => (
          <TransportCard
            key={order.id}
            id={order.id}
            route={{ from: order.from, to: order.to }}
            risk={order.risk}
            price={order.price}
            date={order.date}
            cargoType={order.cargo}
            weight={order.weight}
            onClick={() => console.log('Navigate to order:', order.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-8">
        <Button variant="outline" size="sm">Zurück</Button>
        <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">1</Button>
        <Button variant="outline" size="sm">2</Button>
        <Button variant="outline" size="sm">3</Button>
        <Button variant="outline" size="sm">Weiter</Button>
      </div>
    </div>
  );
}

// ========================================
// Marketplace Page
// ========================================
export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-background py-8">
      <div className="grid grid-cols-12 gap-6 max-w-7xl mx-auto px-4">
        {/* Sidebar - Filters */}
        <aside className="col-span-12 lg:col-span-3">
          <Filters />
          <div className="mt-6">
            <BannerAd slot="marketplace-sidebar" />
          </div>
        </aside>

        {/* Main Content */}
        <section className="col-span-12 lg:col-span-9 flex flex-col gap-4">
          {/* Sponsored Listings */}
          <SponsoredListing />
          
          {/* Order List */}
          <OrderList />
        </section>
      </div>
    </main>
  );
}
