'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast, Toaster } from 'sonner';
import {
  Truck,
  ArrowRight,
  ArrowLeft,
  Building2,
  MapPin,
  FileText,
  Wallet,
  Check,
  Upload,
  Plus,
  X,
  Globe,
  Phone,
  Mail,
  User,
  Briefcase,
  Thermometer,
  Package,
  Euro,
  Shield,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface OnboardingData {
  // Section 1 - Basisdaten
  companyName: string;
  legalForm: string;
  vatId: string;
  contactPhone: string;
  contactEmail: string;
  
  // Section 2 - Fahrzeuge
  vehicles: VehicleData[];
  
  // Section 3 - Regionen
  startRegion: string;
  targetRegions: string[];
  regularRoutes: string;
  
  // Section 4 - Dokumente
  businessLicense: File | null;
  driverLicense: File | null;
  insurance: File | null;
  
  // Section 5 - Konto & Wallet
  bankIban: string;
  bankHolder: string;
  bankBic: string;
  acceptTerms: boolean;
  acceptWalletFees: boolean;
}

interface VehicleData {
  type: string;
  capacityKg: number;
  capacityM3: number;
  palletSpaces: number;
  hasCooling: boolean;
  coolingMinTemp?: number;
  coolingMaxTemp?: number;
}

const VEHICLE_TYPES = [
  { value: 'SPRINTER', label: 'Sprinter (bis 3,5t)' },
  { value: 'KOEFFER', label: 'Koffer (7,5t)' },
  { value: 'PLANE', label: 'Plane (12t)' },
  { value: 'CURTAINSIDER', label: 'Planenauflieger' },
  { value: 'REEFER', label: 'Kühllaster' },
  { value: 'TIEFLADER', label: 'Tieflader' },
  { value: 'TANKAUFLIEGER', label: 'Tankauflieger' },
  { value: 'AUTOTRANSPORTER', label: 'Autotransporter' },
  { value: 'CONTAINERCHASSIS', label: 'Container-Chassis' },
];

const GERMAN_REGIONS = [
  'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen',
  'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen',
  'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen',
  'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen',
];

const EUROPEAN_COUNTRIES = [
  'Deutschland', 'Österreich', 'Schweiz', 'Polen', 'Tschechien',
  'Frankreich', 'Niederlande', 'Belgien', 'Luxemburg', 'Dänemark',
  'Italien', 'Spanien', 'Ungarn', 'Slowakei', 'Slowenien',
  'Rumänien', 'Bulgarien', 'Griechenland', 'Kroatien', 'Serbien',
];

const LEGAL_FORMS = [
  'Einzelunternehmen', 'GbR', 'OHG', 'KG', 'GmbH', 'UG', 'AG', 'e.K.', 'Freiberufler',
];

// ============================================
// COMPONENT
// ============================================
export function TransporteurOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    companyName: '',
    legalForm: '',
    vatId: '',
    contactPhone: '',
    contactEmail: '',
    vehicles: [{ type: 'SPRINTER', capacityKg: 0, capacityM3: 0, palletSpaces: 0, hasCooling: false }],
    startRegion: '',
    targetRegions: [],
    regularRoutes: '',
    businessLicense: null,
    driverLicense: null,
    insurance: null,
    bankIban: '',
    bankHolder: '',
    bankBic: '',
    acceptTerms: false,
    acceptWalletFees: false,
  });

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  // ============================================
  // HANDLERS
  // ============================================
  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const addVehicle = () => {
    updateData({
      vehicles: [...data.vehicles, {
        type: 'SPRINTER',
        capacityKg: 0,
        capacityM3: 0,
        palletSpaces: 0,
        hasCooling: false,
      }],
    });
  };

  const removeVehicle = (index: number) => {
    if (data.vehicles.length > 1) {
      updateData({
        vehicles: data.vehicles.filter((_, i) => i !== index),
      });
    }
  };

  const updateVehicle = (index: number, updates: Partial<VehicleData>) => {
    const newVehicles = [...data.vehicles];
    newVehicles[index] = { ...newVehicles[index], ...updates };
    updateData({ vehicles: newVehicles });
  };

  const toggleRegion = (region: string) => {
    const current = data.targetRegions;
    if (current.includes(region)) {
      updateData({ targetRegions: current.filter(r => r !== region) });
    } else {
      updateData({ targetRegions: [...current, region] });
    }
  };

  const handleFileUpload = (field: 'businessLicense' | 'driverLicense' | 'insurance', file: File | null) => {
    updateData({ [field]: file } as any);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.companyName && data.legalForm && data.contactEmail;
      case 2:
        return data.vehicles.length > 0 && data.vehicles[0].capacityKg > 0;
      case 3:
        return data.startRegion && data.targetRegions.length > 0;
      case 4:
        return true; // Documents are optional during initial signup
      case 5:
        return data.bankIban && data.bankHolder && data.acceptTerms && data.acceptWalletFees;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Onboarding erfolgreich!', {
        description: 'Sie werden in Kürze freigeschaltet und erhalten eine E-Mail-Bestätigung.',
      });
      
      // In production: Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/app?onboarding=success';
      }, 2000);
    } catch (error) {
      toast.error('Fehler beim Absenden', {
        description: 'Bitte versuchen Sie es erneut.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER SECTIONS
  // ============================================
  const renderSection1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold">Basisdaten</h3>
        <p className="text-muted-foreground">Ihre Firmeninformationen für das Profil</p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="companyName">Firmenname *</Label>
          <Input
            id="companyName"
            placeholder="Muster Transport GmbH"
            value={data.companyName}
            onChange={e => updateData({ companyName: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="legalForm">Rechtsform *</Label>
            <Select value={data.legalForm} onValueChange={v => updateData({ legalForm: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Auswählen" />
              </SelectTrigger>
              <SelectContent>
                {LEGAL_FORMS.map(form => (
                  <SelectItem key={form} value={form}>{form}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="vatId">USt-ID (optional)</Label>
            <Input
              id="vatId"
              placeholder="DE123456789"
              value={data.vatId}
              onChange={e => updateData({ vatId: e.target.value })}
            />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="contactPhone">Telefon *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="contactPhone"
                placeholder="+49 123 456789"
                className="pl-10"
                value={data.contactPhone}
                onChange={e => updateData({ contactPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contactEmail">E-Mail *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="contactEmail"
                type="email"
                placeholder="info@firma.de"
                className="pl-10"
                value={data.contactEmail}
                onChange={e => updateData({ contactEmail: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSection2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
          <Truck className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-semibold">Fahrzeuge</h3>
        <p className="text-muted-foreground">Ihre verfügbaren Fahrzeuge und Kapazitäten</p>
      </div>

      <div className="space-y-4">
        {data.vehicles.map((vehicle, index) => (
          <Card key={index} className="relative">
            {data.vehicles.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-8 w-8 p-0"
                onClick={() => removeVehicle(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Fahrzeug {index + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Fahrzeugtyp</Label>
                  <Select 
                    value={vehicle.type} 
                    onValueChange={v => updateVehicle(index, { type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Max. Zuladung (kg) *</Label>
                  <Input
                    type="number"
                    placeholder="3500"
                    value={vehicle.capacityKg || ''}
                    onChange={e => updateVehicle(index, { capacityKg: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Ladevolumen (m³)</Label>
                  <Input
                    type="number"
                    placeholder="15"
                    value={vehicle.capacityM3 || ''}
                    onChange={e => updateVehicle(index, { capacityM3: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Palettenplätze</Label>
                  <Input
                    type="number"
                    placeholder="6"
                    value={vehicle.palletSpaces || ''}
                    onChange={e => updateVehicle(index, { palletSpaces: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`cooling-${index}`}
                  checked={vehicle.hasCooling}
                  onCheckedChange={checked => updateVehicle(index, { hasCooling: checked as boolean })}
                />
                <Label htmlFor={`cooling-${index}`} className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-blue-500" />
                  Kühlung verfügbar
                </Label>
              </div>

              {vehicle.hasCooling && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div className="grid gap-2">
                    <Label>Min. Temp. (°C)</Label>
                    <Input
                      type="number"
                      placeholder="-20"
                      value={vehicle.coolingMinTemp ?? ''}
                      onChange={e => updateVehicle(index, { coolingMinTemp: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Max. Temp. (°C)</Label>
                    <Input
                      type="number"
                      placeholder="8"
                      value={vehicle.coolingMaxTemp ?? ''}
                      onChange={e => updateVehicle(index, { coolingMaxTemp: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" className="w-full gap-2" onClick={addVehicle}>
          <Plus className="w-4 h-4" />
          Weiteres Fahrzeug hinzufügen
        </Button>
      </div>
    </div>
  );

  const renderSection3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-blue-500" />
        </div>
        <h3 className="text-xl font-semibold">Regionen</h3>
        <p className="text-muted-foreground">Ihre Einsatzgebiete und Strecken</p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label>Startregion (Standort) *</Label>
          <Select value={data.startRegion} onValueChange={v => updateData({ startRegion: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Bundesland auswählen" />
            </SelectTrigger>
            <SelectContent>
              {GERMAN_REGIONS.map(region => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3">
          <Label>Zielregionen (mehrere auswählbar) *</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {EUROPEAN_COUNTRIES.map(country => (
              <button
                key={country}
                type="button"
                onClick={() => toggleRegion(country)}
                className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  data.targetRegions.includes(country)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {country}
              </button>
            ))}
          </div>
          {data.targetRegions.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {data.targetRegions.length} Länder ausgewählt
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label>Regelmäßige Strecken (optional)</Label>
          <Textarea
            placeholder="z.B. Hamburg - München, Berlin - Frankfurt, Ruhrgebiet - Österreich..."
            rows={3}
            value={data.regularRoutes}
            onChange={e => updateData({ regularRoutes: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Beschreiben Sie Ihre häufig gefahrenen Routen
          </p>
        </div>
      </div>
    </div>
  );

  const renderSection4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-purple-500" />
        </div>
        <h3 className="text-xl font-semibold">Dokumente</h3>
        <p className="text-muted-foreground">Laden Sie Ihre Dokumente hoch (optional)</p>
      </div>

      <div className="space-y-4">
        <Card className="border-dashed">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Gewerbeanmeldung</p>
                  <p className="text-sm text-muted-foreground">PDF, JPG oder PNG (max. 5MB)</p>
                </div>
              </div>
              <div>
                <Input
                  type="file"
                  id="businessLicense"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => handleFileUpload('businessLicense', e.target.files?.[0] || null)}
                />
                <Label htmlFor="businessLicense" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span className="gap-2">
                      <Upload className="w-4 h-4" />
                      {data.businessLicense ? 'Ändern' : 'Hochladen'}
                    </span>
                  </Button>
                </Label>
              </div>
            </div>
            {data.businessLicense && (
              <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                {data.businessLicense.name}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Führerschein / Fahrerlaubnis</p>
                  <p className="text-sm text-muted-foreground">PDF, JPG oder PNG (max. 5MB)</p>
                </div>
              </div>
              <div>
                <Input
                  type="file"
                  id="driverLicense"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => handleFileUpload('driverLicense', e.target.files?.[0] || null)}
                />
                <Label htmlFor="driverLicense" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span className="gap-2">
                      <Upload className="w-4 h-4" />
                      {data.driverLicense ? 'Ändern' : 'Hochladen'}
                    </span>
                  </Button>
                </Label>
              </div>
            </div>
            {data.driverLicense && (
              <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                {data.driverLicense.name}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Shield className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Versicherungsnachweis</p>
                  <p className="text-sm text-muted-foreground">Haftpflicht / Transportversicherung</p>
                </div>
              </div>
              <div>
                <Input
                  type="file"
                  id="insurance"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => handleFileUpload('insurance', e.target.files?.[0] || null)}
                />
                <Label htmlFor="insurance" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span className="gap-2">
                      <Upload className="w-4 h-4" />
                      {data.insurance ? 'Ändern' : 'Hochladen'}
                    </span>
                  </Button>
                </Label>
              </div>
            </div>
            {data.insurance && (
              <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                {data.insurance.name}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Hinweis:</strong> Dokumente können auch nach der Registrierung hochgeladen werden. 
            Die Verifizierung erfolgt innerhalb von 24-48 Stunden.
          </p>
        </div>
      </div>
    </div>
  );

  const renderSection5 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-yellow-500" />
        </div>
        <h3 className="text-xl font-semibold">Konto & Wallet</h3>
        <p className="text-muted-foreground">Bankverbindung für Auszahlungen</p>
      </div>

      <div className="grid gap-6">
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="bankHolder">Kontoinhaber *</Label>
            <Input
              id="bankHolder"
              placeholder="Muster Transport GmbH"
              value={data.bankHolder}
              onChange={e => updateData({ bankHolder: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bankIban">IBAN *</Label>
              <Input
                id="bankIban"
                placeholder="DE89 3704 0044 0532 0130 00"
                value={data.bankIban}
                onChange={e => updateData({ bankIban: e.target.value.replace(/\s/g, '') })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bankBic">BIC</Label>
              <Input
                id="bankBic"
                placeholder="COBADEFFXXX"
                value={data.bankBic}
                onChange={e => updateData({ bankBic: e.target.value })}
              />
            </div>
          </div>
        </div>

        <Separator />

        <Card className="bg-muted/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Euro className="w-5 h-5" />
              Wallet & Gebühren
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Provision</p>
                <p className="font-semibold">14% (Free Plan)</p>
              </div>
              <div>
                <p className="text-muted-foreground">Wallet-Gebühr</p>
                <p className="font-semibold">3,5% bei Ein-/Auszahlung</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="acceptWalletFees"
                  checked={data.acceptWalletFees}
                  onCheckedChange={checked => updateData({ acceptWalletFees: checked as boolean })}
                />
                <Label htmlFor="acceptWalletFees" className="text-sm leading-tight">
                  Ich akzeptiere die Wallet-Gebühren (3,5% für Ein- und Auszahlungen)
                </Label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="acceptTerms"
                  checked={data.acceptTerms}
                  onCheckedChange={checked => updateData({ acceptTerms: checked as boolean })}
                />
                <Label htmlFor="acceptTerms" className="text-sm leading-tight">
                  Ich akzeptiere die{' '}
                  <a href="/agb" className="text-primary underline">AGB</a> und{' '}
                  <a href="/datenschutz" className="text-primary underline">Datenschutzbestimmungen</a>
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
          <p className="text-sm text-green-700 dark:text-green-300">
            <strong>Ihre Vorteile:</strong> Schnelle Auszahlungen, Escrow-Schutz für alle Aufträge, 
            transparente Abrechnung in Echtzeit.
          </p>
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold">CargoBit</h1>
                <p className="text-xs text-muted-foreground">Transporteur Registrierung</p>
              </div>
            </div>
            <Badge variant="secondary">
              Schritt {currentStep} von {totalSteps}
            </Badge>
          </div>
          
          {/* Progress */}
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* Step indicators */}
          <div className="flex justify-between mt-3">
            {['Basisdaten', 'Fahrzeuge', 'Regionen', 'Dokumente', 'Konto'].map((step, i) => (
              <button
                key={step}
                onClick={() => i + 1 <= currentStep && setCurrentStep(i + 1)}
                disabled={i + 1 > currentStep}
                className={`text-xs transition-colors ${
                  i + 1 === currentStep
                    ? 'text-primary font-medium'
                    : i + 1 < currentStep
                    ? 'text-green-600'
                    : 'text-muted-foreground'
                }`}
              >
                {i + 1 < currentStep ? <Check className="w-3 h-3 inline mr-1" /> : null}
                <span className="hidden sm:inline">{step}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6 sm:p-8">
            {currentStep === 1 && renderSection1()}
            {currentStep === 2 && renderSection2()}
            {currentStep === 3 && renderSection3()}
            {currentStep === 4 && renderSection4()}
            {currentStep === 5 && renderSection5()}
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => prev - 1)}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
                className="gap-2"
              >
                Weiter
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Onboarding abschließen
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        <p>© 2024 CargoBit. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  );
}

export default TransporteurOnboarding;
