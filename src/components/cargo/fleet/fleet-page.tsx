'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { fleetDrivers, fleetVehicles, formatNumber } from '@/lib/mock-data';
import { getDriverStatusColor, getVehicleStatusColor } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Truck,
  Navigation,
  PackageOpen,
  Search,
  Phone,
  Mail,
  MapPin,
  Star,
  Fuel,
  Gauge,
  Thermometer,
  Wrench,
  Snowflake,
  ChevronRight,
  CircleDot,
  RotateCcw,
  Coffee,
  WifiOff,
  Moon,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Local fleet translations (keys not in main i18n)
const fleetLabels: Record<string, Record<string, string>> = {
  de: {
    fleetManagement: 'Flottenmanagement',
    fleet: 'Flotte',
    drivers: 'Fahrer',
    vehicles: 'Fahrzeuge',
    available: 'Verfügbar',
    enRoute: 'Unterwegs',
    onBreak: 'Pause',
    offline: 'Offline',
    resting: 'Ruhend',
    active: 'Aktiv',
    maintenance: 'Wartung',
    parked: 'Geparkt',
    loading: 'Beladung',
    unloading: 'Entladung',
    totalDrivers: 'Fahrer gesamt',
    activeVehicles: 'Aktive Fahrzeuge',
    onRoute: 'Unterwegs',
    freeCapacity: 'Freie Kapazität',
    fuel: 'Kraftstoff',
    mileage: 'Kilometerstand',
    nextMaintenance: 'Nächste Wartung',
    assignedDriver: 'Zugewiesener Fahrer',
    currentRoute: 'Aktuelle Route',
    completedDeliveries: 'Abgeschlossene Lieferungen',
    rating: 'Bewertung',
    languages: 'Sprachen',
    capacity: 'Kapazität',
    plate: 'Kennzeichen',
    type: 'Typ',
    temperature: 'Temperatur',
    filter: 'Filtern...',
    assignedVehicle: 'Zugewiesenes Fahrzeug',
    license: 'Führerschein',
    location: 'Standort',
    maxWeight: 'Max. Gewicht',
    currentWeight: 'Aktuell',
    year: 'Baujahr',
    make: 'Marke',
    model: 'Modell',
    vehicleType: 'Fahrzeugtyp',
    semiTrailer: 'Sattelzug',
    boxTruck: 'Kastenwagen',
    van: 'Transporter',
    refrigerated: 'Kühlwagen',
    flatbed: 'Pritsche',
    km: 'km',
    of: 'von',
    searchDrivers: 'Fahrer suchen...',
    searchVehicles: 'Fahrzeuge suchen...',
  },
  en: {
    fleetManagement: 'Fleet Management',
    fleet: 'Fleet',
    drivers: 'Drivers',
    vehicles: 'Vehicles',
    available: 'Available',
    enRoute: 'En Route',
    onBreak: 'On Break',
    offline: 'Offline',
    resting: 'Resting',
    active: 'Active',
    maintenance: 'Maintenance',
    parked: 'Parked',
    loading: 'Loading',
    unloading: 'Unloading',
    totalDrivers: 'Total Drivers',
    activeVehicles: 'Active Vehicles',
    onRoute: 'On Route',
    freeCapacity: 'Free Capacity',
    fuel: 'Fuel',
    mileage: 'Mileage',
    nextMaintenance: 'Next Maintenance',
    assignedDriver: 'Assigned Driver',
    currentRoute: 'Current Route',
    completedDeliveries: 'Completed Deliveries',
    rating: 'Rating',
    languages: 'Languages',
    capacity: 'Capacity',
    plate: 'Plate',
    type: 'Type',
    temperature: 'Temperature',
    filter: 'Filter...',
    assignedVehicle: 'Assigned Vehicle',
    license: 'License',
    location: 'Location',
    maxWeight: 'Max Weight',
    currentWeight: 'Current',
    year: 'Year',
    make: 'Make',
    model: 'Model',
    vehicleType: 'Vehicle Type',
    semiTrailer: 'Semi Trailer',
    boxTruck: 'Box Truck',
    van: 'Van',
    refrigerated: 'Refrigerated',
    flatbed: 'Flatbed',
    km: 'km',
    of: 'of',
    searchDrivers: 'Search drivers...',
    searchVehicles: 'Search vehicles...',
  },
  pl: {
    fleetManagement: 'Zarządzanie flotą',
    fleet: 'Flota',
    drivers: 'Kierowcy',
    vehicles: 'Pojazdy',
    available: 'Dostępny',
    enRoute: 'W trasie',
    onBreak: 'Na przerwie',
    offline: 'Offline',
    resting: 'Odpoczywa',
    active: 'Aktywny',
    maintenance: 'Konserwacja',
    parked: 'Zaparkowany',
    loading: 'Załadunek',
    unloading: 'Rozładunek',
    totalDrivers: 'Łącznie kierowców',
    activeVehicles: 'Aktywne pojazdy',
    onRoute: 'Na trasie',
    freeCapacity: 'Wolna pojemność',
    fuel: 'Paliwo',
    mileage: 'Przebieg',
    nextMaintenance: 'Następna konserwacja',
    assignedDriver: 'Przypisany kierowca',
    currentRoute: 'Aktualna trasa',
    completedDeliveries: 'Ukończone dostawy',
    rating: 'Ocena',
    languages: 'Języki',
    capacity: 'Pojemność',
    plate: 'Rejestracja',
    type: 'Typ',
    temperature: 'Temperatura',
    filter: 'Filtruj...',
    assignedVehicle: 'Przypisany pojazd',
    license: 'Prawo jazdy',
    location: 'Lokalizacja',
    maxWeight: 'Maks. waga',
    currentWeight: 'Aktualnie',
    year: 'Rok',
    make: 'Marka',
    model: 'Model',
    vehicleType: 'Typ pojazdu',
    semiTrailer: 'Naczepa',
    boxTruck: 'Ciężarówka skrzyniowa',
    van: 'Van',
    refrigerated: 'Chłodnia',
    flatbed: 'Platforma',
    km: 'km',
    of: 'z',
    searchDrivers: 'Szukaj kierowców...',
    searchVehicles: 'Szukaj pojazdów...',
  },
  cs: {
    fleetManagement: 'Správa vozového parku',
    fleet: 'Vozový park',
    drivers: 'Řidiči',
    vehicles: 'Vozidla',
    available: 'Dostupný',
    enRoute: 'Na cestě',
    onBreak: 'Na přestávce',
    offline: 'Offline',
    resting: 'Odpočívá',
    active: 'Aktivní',
    maintenance: 'Údržba',
    parked: 'Zaparkovaný',
    loading: 'Nakládka',
    unloading: 'Vykládka',
    totalDrivers: 'Celkem řidičů',
    activeVehicles: 'Aktivní vozidla',
    onRoute: 'Na trase',
    freeCapacity: 'Volná kapacita',
    fuel: 'Palivo',
    mileage: 'Najeto',
    nextMaintenance: 'Další údržba',
    assignedDriver: 'Přiřazený řidič',
    currentRoute: 'Aktuální trasa',
    completedDeliveries: 'Dokončená doručení',
    rating: 'Hodnocení',
    languages: 'Jazyky',
    capacity: 'Kapacita',
    plate: 'SPZ',
    type: 'Typ',
    temperature: 'Teplota',
    filter: 'Filtrovat...',
    assignedVehicle: 'Přiřazené vozidlo',
    license: 'Řidičský průkaz',
    location: 'Umístění',
    maxWeight: 'Max. váha',
    currentWeight: 'Aktuálně',
    year: 'Rok',
    make: 'Značka',
    model: 'Model',
    vehicleType: 'Typ vozidla',
    semiTrailer: 'Návěs',
    boxTruck: 'Valník',
    van: 'Dodávka',
    refrigerated: 'Chladírna',
    flatbed: 'Valník',
    km: 'km',
    of: 'z',
    searchDrivers: 'Hledat řidiče...',
    searchVehicles: 'Hledat vozidla...',
  },
  el: {
    fleetManagement: 'Διαχείριση Στόλου',
    fleet: 'Στόλος',
    drivers: 'Οδηγοί',
    vehicles: 'Οχήματα',
    available: 'Διαθέσιμος',
    enRoute: 'Εν κινήσει',
    onBreak: 'Σε διάλειμμα',
    offline: 'Offline',
    resting: 'Αναπαύεται',
    active: 'Ενεργό',
    maintenance: 'Συντήρηση',
    parked: 'Παρκαρισμένο',
    loading: 'Φόρτωση',
    unloading: 'Εκφόρτωση',
    totalDrivers: 'Σύνολο Οδηγών',
    activeVehicles: 'Ενεργά Οχήματα',
    onRoute: 'Σε Διαδρομή',
    freeCapacity: 'Ελεύθερη χωρητικότητα',
    fuel: 'Καύσιμο',
    mileage: 'Χιλιόμετρα',
    nextMaintenance: 'Επόμενο Service',
    assignedDriver: 'Ανατεθειμένος οδηγός',
    currentRoute: 'Τρέχουσα διαδρομή',
    completedDeliveries: 'Ολοκληρωμένες Παραδόσεις',
    rating: 'Αξιολόγηση',
    languages: 'Γλώσσες',
    capacity: 'Χωρητικότητα',
    plate: 'Πινακίδα',
    type: 'Τύπος',
    temperature: 'Θερμοκρασία',
    filter: 'Φιλτράρισμα...',
    assignedVehicle: 'Ανατεθειμένο όχημα',
    license: 'Άδεια',
    location: 'Τοποθεσία',
    maxWeight: 'Μέγ. Βάρος',
    currentWeight: 'Τρέχον',
    year: 'Έτος',
    make: 'Μάρκα',
    model: 'Μοντέλο',
    vehicleType: 'Τύπος οχήματος',
    semiTrailer: 'Ημιρυμουλκούμενο',
    boxTruck: 'Κλειστό φορτηγό',
    van: 'Βαν',
    refrigerated: 'Ψυγείο',
    flatbed: 'Πλατφόρμα',
    km: 'χλμ',
    of: 'από',
    searchDrivers: 'Αναζήτηση οδηγών...',
    searchVehicles: 'Αναζήτηση οχημάτων...',
  },
  tr: {
    fleetManagement: 'Filo Yönetimi',
    fleet: 'Filo',
    drivers: 'Sürücüler',
    vehicles: 'Araçlar',
    available: 'Müsait',
    enRoute: 'Yolda',
    onBreak: 'Molada',
    offline: 'Çevrimdışı',
    resting: 'Dinleniyor',
    active: 'Aktif',
    maintenance: 'Bakım',
    parked: 'Park Edildi',
    loading: 'Yükleme',
    unloading: 'Boşaltma',
    totalDrivers: 'Toplam Sürücü',
    activeVehicles: 'Aktif Araçlar',
    onRoute: 'Yolda',
    freeCapacity: 'Boş Kapasite',
    fuel: 'Yakıt',
    mileage: 'Kilometre',
    nextMaintenance: 'Sonraki Bakım',
    assignedDriver: 'Atanan Sürücü',
    currentRoute: 'Mevcut Rota',
    completedDeliveries: 'Tamamlanan Teslimatlar',
    rating: 'Değerlendirme',
    languages: 'Diller',
    capacity: 'Kapasite',
    plate: 'Plaka',
    type: 'Tip',
    temperature: 'Sıcaklık',
    filter: 'Filtrele...',
    assignedVehicle: 'Atanan Araç',
    license: 'Ehliyet',
    location: 'Konum',
    maxWeight: 'Maks. Ağırlık',
    currentWeight: 'Mevcut',
    year: 'Yıl',
    make: 'Marka',
    model: 'Model',
    vehicleType: 'Araç Tipi',
    semiTrailer: 'Dorse',
    boxTruck: 'Kamyonet',
    van: 'Van',
    refrigerated: 'Soğutuculu',
    flatbed: 'Düz Yataklı',
    km: 'km',
    of: '/',
    searchDrivers: 'Sürücü ara...',
    searchVehicles: 'Araç ara...',
  },
  sl: {
    fleetManagement: 'Upravljanje flote',
    fleet: 'Flota',
    drivers: 'Vozniki',
    vehicles: 'Vozila',
    available: 'Na voljo',
    enRoute: 'Na poti',
    onBreak: 'Na odmoru',
    offline: 'Brez povezave',
    resting: 'Počiva',
    active: 'Aktivno',
    maintenance: 'Vzdrževanje',
    parked: 'Parkirano',
    loading: 'Nalaganje',
    unloading: 'Razkladanje',
    totalDrivers: 'Skupaj voznikov',
    activeVehicles: 'Aktivna vozila',
    onRoute: 'Na poti',
    freeCapacity: 'Prosta zmogljivost',
    fuel: 'Gorivo',
    mileage: 'Prevoženi kilometri',
    nextMaintenance: 'Naslednje vzdrževanje',
    assignedDriver: 'Dodeljeni voznik',
    currentRoute: 'Trenutna pot',
    completedDeliveries: 'Zaključene dostave',
    rating: 'Ocena',
    languages: 'Jeziki',
    capacity: 'Zmogljivost',
    plate: 'Registrska tablica',
    type: 'Tip',
    temperature: 'Temperatura',
    filter: 'Filtriraj...',
    assignedVehicle: 'Dodeljeno vozilo',
    license: 'Vozniško dovoljenje',
    location: 'Lokacija',
    maxWeight: 'Maks. teža',
    currentWeight: 'Trenutno',
    year: 'Leto',
    make: 'Znamka',
    model: 'Model',
    vehicleType: 'Tip vozila',
    semiTrailer: 'Prikolica',
    boxTruck: 'Tovornjak z nadvorjem',
    van: 'Kombi',
    refrigerated: 'Hladilnik',
    flatbed: 'Odprta prikolica',
    km: 'km',
    of: 'od',
    searchDrivers: 'Išči voznike...',
    searchVehicles: 'Išči vozila...',
  },
  hu: {
    fleetManagement: 'Flotta menedzsment',
    fleet: 'Flotta',
    drivers: 'Sofőrök',
    vehicles: 'Járművek',
    available: 'Elérhető',
    enRoute: 'Úton',
    onBreak: 'Szünetben',
    offline: 'Offline',
    resting: 'Pihen',
    active: 'Aktív',
    maintenance: 'Karbantartás',
    parked: 'Parkol',
    loading: 'Rakodás',
    unloading: 'Kirakodás',
    totalDrivers: 'Összes sofőr',
    activeVehicles: 'Aktív járművek',
    onRoute: 'Úton',
    freeCapacity: 'Szabad kapacitás',
    fuel: 'Üzemanyag',
    mileage: 'Futott km',
    nextMaintenance: 'Következő karbantartás',
    assignedDriver: 'Hozzárendelt sofőr',
    currentRoute: 'Jelenlegi útvonal',
    completedDeliveries: 'Befejezett szállítások',
    rating: 'Értékelés',
    languages: 'Nyelvek',
    capacity: 'Kapacitás',
    plate: 'Rendszám',
    type: 'Típus',
    temperature: 'Hőmérséklet',
    filter: 'Szűrés...',
    assignedVehicle: 'Hozzárendelt jármű',
    license: 'Jogosítvány',
    location: 'Helyszín',
    maxWeight: 'Max. súly',
    currentWeight: 'Jelenlegi',
    year: 'Év',
    make: 'Márka',
    model: 'Modell',
    vehicleType: 'Járműtípus',
    semiTrailer: 'Pótkocsi',
    boxTruck: 'Zárt teherautó',
    van: 'Kisteherautó',
    refrigerated: 'Hűtőkocsi',
    flatbed: 'Nyitott plató',
    km: 'km',
    of: '/',
    searchDrivers: 'Sofőr keresése...',
    searchVehicles: 'Jármű keresése...',
  },
  ro: {
    fleetManagement: 'Gestionare flotă',
    fleet: 'Flotă',
    drivers: 'Șoferi',
    vehicles: 'Vehicule',
    available: 'Disponibil',
    enRoute: 'În tranzit',
    onBreak: 'În pauză',
    offline: 'Offline',
    resting: 'În repaus',
    active: 'Activ',
    maintenance: 'Întreținere',
    parked: 'Parcat',
    loading: 'Încărcare',
    unloading: 'Descărcare',
    totalDrivers: 'Total șoferi',
    activeVehicles: 'Vehicule active',
    onRoute: 'Pe traseu',
    freeCapacity: 'Capacitate liberă',
    fuel: 'Combustibil',
    mileage: 'Kilometraj',
    nextMaintenance: 'Următoarea întreținere',
    assignedDriver: 'Șofer atribuit',
    currentRoute: 'Ruta curentă',
    completedDeliveries: 'Livrări finalizate',
    rating: 'Evaluare',
    languages: 'Limbi',
    capacity: 'Capacitate',
    plate: 'Număr înmatriculare',
    type: 'Tip',
    temperature: 'Temperatură',
    filter: 'Filtrare...',
    assignedVehicle: 'Vehicul atribuit',
    license: 'Permis',
    location: 'Locație',
    maxWeight: 'Greutate max.',
    currentWeight: 'Curent',
    year: 'An',
    make: 'Marcă',
    model: 'Model',
    vehicleType: 'Tip vehicul',
    semiTrailer: 'Semiremorcă',
    boxTruck: 'Camion închis',
    van: 'Van',
    refrigerated: 'Frigorific',
    flatbed: 'Platformă',
    km: 'km',
    of: 'din',
    searchDrivers: 'Căutare șoferi...',
    searchVehicles: 'Căutare vehicule...',
  },
};

function fl(key: string, lang: string): string {
  return fleetLabels[lang]?.[key] || fleetLabels.en[key] || key;
}

type FleetTab = 'drivers' | 'vehicles';

// ---- Status icon for drivers ----
function DriverStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'available': return <CircleDot className="w-3.5 h-3.5 text-green-500" />;
    case 'en_route': return <Navigation className="w-3.5 h-3.5 text-orange-500" />;
    case 'on_break': return <Coffee className="w-3.5 h-3.5 text-yellow-500" />;
    case 'offline': return <WifiOff className="w-3.5 h-3.5 text-gray-400" />;
    case 'resting': return <Moon className="w-3.5 h-3.5 text-blue-500" />;
    default: return <CircleDot className="w-3.5 h-3.5" />;
  }
}

// ---- Status icon for vehicles ----
function VehicleStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'active': return <Navigation className="w-3.5 h-3.5 text-green-500" />;
    case 'maintenance': return <Wrench className="w-3.5 h-3.5 text-red-500" />;
    case 'parked': return <CircleDot className="w-3.5 h-3.5 text-gray-400" />;
    case 'loading': return <PackageOpen className="w-3.5 h-3.5 text-blue-500" />;
    case 'unloading': return <RotateCcw className="w-3.5 h-3.5 text-purple-500" />;
    default: return <CircleDot className="w-3.5 h-3.5" />;
  }
}

// ---- Vehicle type label and icon ----
function VehicleTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    semi_trailer: { label: 'Semi Trailer', icon: Truck, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300' },
    box_truck: { label: 'Box Truck', icon: PackageOpen, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
    van: { label: 'Van', icon: Truck, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    refrigerated: { label: 'Refrigerated', icon: Snowflake, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
    flatbed: { label: 'Flatbed', icon: AlertTriangle, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  };
  const c = config[type] || config.van;
  const Icon = c.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', c.color)}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

// ---- Fuel bar ----
function FuelBar({ level }: { level: number }) {
  const color = level > 60 ? 'bg-green-500' : level > 30 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = level > 60 ? 'text-green-600 dark:text-green-400' : level > 30 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Fuel className="w-3 h-3" /> {fl('fuel', 'en')}
        </span>
        <span className={cn('text-xs font-semibold', textColor)}>{level}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${level}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
    </div>
  );
}

// ---- Capacity bar ----
function CapacityBar({ current, max, unit }: { current: number; max: number; unit: string }) {
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  const color = pct > 80 ? 'bg-orange-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{unit}</span>
        <span className="text-xs font-medium text-foreground">
          {formatNumber(current)} / {formatNumber(max)} kg ({pct}%)
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
      </div>
    </div>
  );
}

// ---- Star rating ----
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
    </div>
  );
}

// ---- KPI Card ----
function FleetKPICard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-orange-300/50 dark:hover:border-orange-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5 group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300', color)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5 opacity-70">{sub}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---- Driver Card ----
function DriverCard({ driver, index, language }: { driver: typeof fleetDrivers[0]; index: number; language: string }) {
  const vehicle = driver.currentVehicle ? fleetVehicles.find(v => v.id === driver.currentVehicle) : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.4 }}
      layout
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-orange-300/50 dark:hover:border-orange-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5 group h-full">
        <CardContent className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-200/40 dark:border-orange-800/40 flex items-center justify-center text-sm font-bold text-orange-600 dark:text-orange-400">
                {driver.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className="font-semibold text-sm group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{driver.name}</h3>
                <p className="text-xs text-muted-foreground">{driver.license}</p>
              </div>
            </div>
            <Badge className={cn('gap-1 text-[10px] font-medium border-0', getDriverStatusColor(driver.status))}>
              <DriverStatusIcon status={driver.status} />
              {fl(driver.status, language)}
            </Badge>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{driver.location}</span>
          </div>

          {/* Current route */}
          {driver.currentRoute && (
            <div className="bg-muted/50 rounded-lg px-3 py-2 mb-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">{fl('currentRoute', language)}</p>
              <p className="text-xs font-medium truncate flex items-center gap-1">
                <Navigation className="w-3 h-3 text-orange-500 shrink-0" />
                <span className="truncate">{driver.currentRoute}</span>
              </p>
            </div>
          )}

          {/* Assigned vehicle */}
          {vehicle && (
            <div className="flex items-center gap-2 mb-3 text-xs">
              <Truck className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">{vehicle.plate}</span>
              <span className="text-foreground font-medium">{vehicle.make} {vehicle.model}</span>
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 mb-3">
            <StarRating rating={driver.rating} />
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{formatNumber(driver.completedDeliveries)}</span> {fl('completedDeliveries', language)}
            </div>
          </div>

          {/* Contact row */}
          <div className="flex items-center gap-3 mb-3">
            <a href={`tel:${driver.phone}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-orange-500 transition-colors">
              <Phone className="w-3 h-3" />
              {driver.phone}
            </a>
            <a href={`mailto:${driver.email}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-orange-500 transition-colors">
              <Mail className="w-3 h-3" />
              <span className="truncate">{driver.email}</span>
            </a>
          </div>

          {/* Language badges */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-muted-foreground mr-1">{fl('languages', language)}:</span>
            {driver.languages.map(lang => (
              <Badge key={lang} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal bg-muted/80 hover:bg-muted">
                {lang}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---- Vehicle Card ----
function VehicleCard({ vehicle, index, language }: { vehicle: typeof fleetVehicles[0]; index: number; language: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.4 }}
      layout
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-orange-300/50 dark:hover:border-orange-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5 group h-full">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-200/30 dark:border-orange-800/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Truck className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  {vehicle.make} {vehicle.model}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {vehicle.year} &middot; <span className="font-mono">{vehicle.plate}</span>
                </p>
              </div>
            </div>
            <Badge className={cn('gap-1 text-[10px] font-medium border-0 shrink-0', getVehicleStatusColor(vehicle.status))}>
              <VehicleStatusIcon status={vehicle.status} />
              {fl(vehicle.status, language)}
            </Badge>
          </div>

          {/* Vehicle type badge */}
          <div className="mb-3">
            <VehicleTypeBadge type={vehicle.type} />
          </div>

          {/* Fuel bar */}
          <div className="mb-3">
            <FuelBar level={vehicle.fuelLevel} />
          </div>

          {/* Capacity bar */}
          <div className="mb-3">
            <CapacityBar current={vehicle.currentWeight} max={vehicle.maxWeight} unit={fl('capacity', language)} />
          </div>

          {/* Temperature for refrigerated */}
          {vehicle.temperature !== undefined && (
            <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400">
              <Thermometer className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{vehicle.temperature > 0 ? '+' : ''}{vehicle.temperature}°C</span>
              <span className="text-[10px] text-cyan-500 dark:text-cyan-400/70 ml-1">{fl('temperature', language)}</span>
            </div>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Gauge className="w-3 h-3 shrink-0" />
              <span>{formatNumber(vehicle.mileage)} {fl('km', language)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Wrench className="w-3 h-3 shrink-0" />
              <span className="truncate">{vehicle.nextMaintenance}</span>
            </div>
          </div>

          {/* Assigned driver */}
          <div className="flex items-center gap-1.5 text-xs mb-3">
            <Users className="w-3 h-3 text-muted-foreground shrink-0" />
            {vehicle.assignedDriver ? (
              <span className="text-foreground font-medium">{vehicle.assignedDriver}</span>
            ) : (
              <span className="text-muted-foreground italic">&mdash;</span>
            )}
          </div>

          {/* Current route */}
          {vehicle.currentRoute && (
            <div className="bg-muted/50 rounded-lg px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">{fl('currentRoute', language)}</p>
              <p className="text-xs font-medium truncate flex items-center gap-1">
                <Navigation className="w-3 h-3 text-orange-500 shrink-0" />
                <span className="truncate">{vehicle.currentRoute}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---- Filter pills ----
function FilterPills({
  options,
  selected,
  onSelect,
  allLabel,
  language,
}: {
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
  allLabel: string;
  language: string;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => onSelect('all')}
        className={cn(
          'px-3 py-1 rounded-full text-xs font-medium transition-all duration-200',
          selected === 'all'
            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm'
            : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        {allLabel}
      </button>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium transition-all duration-200',
            selected === opt
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm'
              : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {fl(opt, language)}
        </button>
      ))}
    </div>
  );
}

// ---- Main component ----
export function FleetPage() {
  const { language } = useCargoBitStore();
  const lang = language || 'de';
  const [activeTab, setActiveTab] = useState<FleetTab>('drivers');
  const [driverSearch, setDriverSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState('all');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');

  // KPIs
  const kpis = useMemo(() => {
    const totalDrivers = fleetDrivers.length;
    const activeVehicles = fleetVehicles.filter(v => v.status === 'active').length;
    const onRouteDrivers = fleetDrivers.filter(d => d.status === 'en_route').length;
    const freeCapacity = fleetVehicles
      .filter(v => v.status === 'active')
      .reduce((acc, v) => acc + (v.maxWeight - v.currentWeight), 0);
    return { totalDrivers, activeVehicles, onRouteDrivers, freeCapacity };
  }, []);

  // Filtered drivers
  const filteredDrivers = useMemo(() => {
    return fleetDrivers.filter(d => {
      const matchesSearch =
        !driverSearch ||
        d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
        d.location.toLowerCase().includes(driverSearch.toLowerCase());
      const matchesStatus = driverStatusFilter === 'all' || d.status === driverStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [driverSearch, driverStatusFilter]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return fleetVehicles.filter(v => {
      const matchesSearch =
        !vehicleSearch ||
        v.plate.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
        v.make.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
        v.model.toLowerCase().includes(vehicleSearch.toLowerCase());
      const matchesStatus = vehicleStatusFilter === 'all' || v.status === vehicleStatusFilter;
      const matchesType = vehicleTypeFilter === 'all' || v.type === vehicleTypeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [vehicleSearch, vehicleStatusFilter, vehicleTypeFilter]);

  const driverStatuses = ['available', 'en_route', 'on_break', 'offline', 'resting'];
  const vehicleStatuses = ['active', 'maintenance', 'parked', 'loading', 'unloading'];
  const vehicleTypes = ['semi_trailer', 'box_truck', 'van', 'refrigerated', 'flatbed'];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 p-6 sm:p-8 text-white"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 blur-xl" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">{fl('fleetManagement', lang)}</h1>
          <p className="text-white/80 text-sm sm:text-base">
            {lang === 'de'
              ? `Verwalten Sie ${formatNumber(kpis.totalDrivers)} Fahrer und ${formatNumber(fleetVehicles.length)} Fahrzeuge`
              : `Manage ${formatNumber(kpis.totalDrivers)} drivers and ${formatNumber(fleetVehicles.length)} vehicles`}
          </p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <FleetKPICard
          icon={Users}
          label={fl('totalDrivers', lang)}
          value={kpis.totalDrivers}
          color="bg-gradient-to-br from-orange-500 to-orange-600"
          delay={0.1}
        />
        <FleetKPICard
          icon={Truck}
          label={fl('activeVehicles', lang)}
          value={kpis.activeVehicles}
          sub={`/${fleetVehicles.length}`}
          color="bg-gradient-to-br from-green-500 to-emerald-600"
          delay={0.15}
        />
        <FleetKPICard
          icon={Navigation}
          label={fl('onRoute', lang)}
          value={kpis.onRouteDrivers}
          color="bg-gradient-to-br from-blue-500 to-indigo-600"
          delay={0.2}
        />
        <FleetKPICard
          icon={PackageOpen}
          label={fl('freeCapacity', lang)}
          value={`${formatNumber(Math.round(kpis.freeCapacity / 1000))}t`}
          color="bg-gradient-to-br from-purple-500 to-violet-600"
          delay={0.25}
        />
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-muted/60 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('drivers')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              activeTab === 'drivers'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Users className="w-4 h-4" />
            {fl('drivers', lang)}
            <Badge variant="secondary" className={cn(
              'ml-1 text-[10px] px-1.5 py-0 h-5',
              activeTab === 'drivers' ? 'bg-white/20 text-white border-0' : ''
            )}>
              {fleetDrivers.length}
            </Badge>
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              activeTab === 'vehicles'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Truck className="w-4 h-4" />
            {fl('vehicles', lang)}
            <Badge variant="secondary" className={cn(
              'ml-1 text-[10px] px-1.5 py-0 h-5',
              activeTab === 'vehicles' ? 'bg-white/20 text-white border-0' : ''
            )}>
              {fleetVehicles.length}
            </Badge>
          </button>
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'drivers' ? (
          <motion.div
            key="drivers"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Search & filter */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1 w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  placeholder={fl('searchDrivers', lang)}
                  className="pl-9 bg-card/50 backdrop-blur-sm border-border/50"
                />
              </div>
              <FilterPills
                options={driverStatuses}
                selected={driverStatusFilter}
                onSelect={setDriverStatusFilter}
                allLabel={t('all', lang)}
                language={lang}
              />
            </div>

            {/* Driver grid */}
            {filteredDrivers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredDrivers.map((driver, idx) => (
                  <DriverCard key={driver.id} driver={driver} index={idx} language={lang} />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-muted-foreground"
              >
                <Users className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">{t('noData', lang)}</p>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="vehicles"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Search & filters */}
            <div className="flex flex-col gap-3">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  placeholder={fl('searchVehicles', lang)}
                  className="pl-9 bg-card/50 backdrop-blur-sm border-border/50"
                />
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium shrink-0">
                    {t('status', lang)}:
                  </span>
                  <FilterPills
                    options={vehicleStatuses}
                    selected={vehicleStatusFilter}
                    onSelect={setVehicleStatusFilter}
                    allLabel={t('all', lang)}
                    language={lang}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium shrink-0">
                    {fl('type', lang)}:
                  </span>
                  <FilterPills
                    options={vehicleTypes}
                    selected={vehicleTypeFilter}
                    onSelect={setVehicleTypeFilter}
                    allLabel={t('all', lang)}
                    language={lang}
                  />
                </div>
              </div>
            </div>

            {/* Vehicle grid */}
            {filteredVehicles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredVehicles.map((vehicle, idx) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} index={idx} language={lang} />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-muted-foreground"
              >
                <Truck className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">{t('noData', lang)}</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
