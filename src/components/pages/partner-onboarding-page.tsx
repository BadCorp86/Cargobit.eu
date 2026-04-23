'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Circle,
  FileText,
  Settings,
  Rocket,
  Shield,
  Megaphone,
  Building2,
  User,
  Mail,
  Phone,
  Lock,
} from 'lucide-react';

const INSURANCE_PRODUCTS = [
  'Frachtversicherung',
  'Transportversicherung',
  'Haftpflichtversicherung',
  'Kaskoversicherung',
  'Spezialversicherungen (Gefahrgut, Kühlkette)',
];

const AD_SLOTS = [
  { id: 'homepage-hero', name: 'Homepage Hero Banner', size: '1200x400' },
  { id: 'marketplace-sidebar', name: 'Marketplace Sidebar', size: '300x600' },
  { id: 'listing-highlight', name: 'Listing Highlight', size: 'Native' },
  { id: 'order-detail', name: 'Order Detail Banner', size: '728x90' },
];

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  pendingAction?: string;
}

export function PartnerOnboardingPage() {
  const router = useRouter();
  const [partnerType, setPartnerType] = useState<'INSURANCE' | 'ADVERTISER'>('INSURANCE');
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Step 1: Company info
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    // Step 2: Partner-specific
    insuranceProducts: [] as string[],
    apiContact: '',
    advertisingBudget: '',
    targetAudience: '',
    preferredSlots: [] as string[],
    // Step 3: Terms
    acceptedTerms: false,
    acceptedPrivacy: false,
  });

  const handleInsuranceProductToggle = (product: string) => {
    setFormData((prev) => ({
      ...prev,
      insuranceProducts: prev.insuranceProducts.includes(product)
        ? prev.insuranceProducts.filter((p) => p !== product)
        : [...prev.insuranceProducts, product],
    }));
  };

  const handleSlotToggle = (slotId: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredSlots: prev.preferredSlots.includes(slotId)
        ? prev.preferredSlots.filter((s) => s !== slotId)
        : [...prev.preferredSlots, slotId],
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/partners/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          companyName: formData.companyName,
          contactPerson: formData.contactPerson,
          phone: formData.phone,
          partnerType,
          insuranceProducts: formData.insuranceProducts,
          apiContact: formData.apiContact,
          advertisingBudget: parseFloat(formData.advertisingBudget) || undefined,
          targetAudience: formData.targetAudience,
          acceptedTerms: formData.acceptedTerms,
          acceptedPrivacy: formData.acceptedPrivacy,
        }),
      });

      if (response.ok) {
        router.push('/partner/success');
      }
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const steps: OnboardingStep[] = [
    {
      id: 'registration',
      title: 'Registrierung',
      description: 'Unternehmensdaten erfassen',
      icon: <Building2 className="w-5 h-5" />,
      completed: currentStep > 1,
    },
    {
      id: 'details',
      title: 'Partner-Details',
      description: partnerType === 'INSURANCE' ? 'Versicherungsprodukte' : 'Werbekampagnen',
      icon: partnerType === 'INSURANCE' ? <Shield className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />,
      completed: currentStep > 2,
    },
    {
      id: 'terms',
      title: 'Vertrag',
      description: 'AGB akzeptieren',
      icon: <FileText className="w-5 h-5" />,
      completed: currentStep > 3,
    },
    {
      id: 'setup',
      title: 'Einrichtung',
      description: 'API-Zugang erhalten',
      icon: <Settings className="w-5 h-5" />,
      completed: false,
    },
    {
      id: 'golive',
      title: 'Go-Live',
      description: 'Partner werden aktiv',
      icon: <Rocket className="w-5 h-5" />,
      completed: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="container max-w-4xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            Partner werden
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            CargoBit Partner Programm
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Werden Sie Teil unseres Ökosystems. Als Versicherungs- oder Werbepartner 
            profitieren Sie von unserem wachsenden Netzwerk.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    step.completed
                      ? 'bg-green-100 border-green-500 text-green-600'
                      : index + 1 === currentStep
                      ? 'bg-blue-100 border-blue-500 text-blue-600'
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-1 ${
                      step.completed ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Partner Type Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Partnertyp wählen</CardTitle>
            <CardDescription>
              Für welche Art der Partnerschaft interessieren Sie sich?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={partnerType}
              onValueChange={(v) => setPartnerType(v as 'INSURANCE' | 'ADVERTISER')}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="INSURANCE" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Versicherungs-Partner
                </TabsTrigger>
                <TabsTrigger value="ADVERTISER" className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4" />
                  Werbe-Partner
                </TabsTrigger>
              </TabsList>

              <TabsContent value="INSURANCE" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Integrieren Sie Ihre Versicherungsprodukte in unsere Plattform. 
                  Bieten Sie Frachtversicherungen direkt bei der Buchung an und 
                  profitieren Sie von unserem automatisierten Risk-Scoring.
                </p>
              </TabsContent>

              <TabsContent value="ADVERTISER" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Erreichen Sie Ihre Zielgruppe auf Europas führender 
                  Transportplattform. Buchen Sie Banner-Werbung, Sponsored Listings 
                  und mehr.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Form Steps */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Unternehmensdaten
              </CardTitle>
              <CardDescription>
                Erfassen Sie die grundlegenden Informationen Ihres Unternehmens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Firmenname *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    placeholder="Muster GmbH"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Ansprechpartner *</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPerson: e.target.value })
                    }
                    placeholder="Max Mustermann"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="partner@beispiel.de"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      className="pl-10"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+49 123 456789"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Passwort *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      className="pl-10"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Mindestens 8 Zeichen"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Passwort bestätigen *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    placeholder="Passwort wiederholen"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={
                    !formData.companyName ||
                    !formData.contactPerson ||
                    !formData.email ||
                    !formData.password ||
                    formData.password !== formData.confirmPassword
                  }
                >
                  Weiter
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {partnerType === 'INSURANCE' ? (
                  <Shield className="w-5 h-5" />
                ) : (
                  <Megaphone className="w-5 h-5" />
                )}
                {partnerType === 'INSURANCE'
                  ? 'Versicherungsprodukte'
                  : 'Werbekampagnen'}
              </CardTitle>
              <CardDescription>
                {partnerType === 'INSURANCE'
                  ? 'Welche Versicherungsprodukte möchten Sie anbieten?'
                  : 'Welche Werbeformate interessieren Sie?'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {partnerType === 'INSURANCE' ? (
                <>
                  <div className="space-y-4">
                    <Label>Versicherungsprodukte</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {INSURANCE_PRODUCTS.map((product) => (
                        <label
                          key={product}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            formData.insuranceProducts.includes(product)
                              ? 'border-blue-500 bg-blue-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <Checkbox
                            checked={formData.insuranceProducts.includes(product)}
                            onCheckedChange={() => handleInsuranceProductToggle(product)}
                          />
                          <span className="text-sm">{product}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiContact">API-Kontakt (optional)</Label>
                    <Input
                      id="apiContact"
                      value={formData.apiContact}
                      onChange={(e) =>
                        setFormData({ ...formData, apiContact: e.target.value })
                      }
                      placeholder="api@ihre-versicherung.de"
                    />
                    <p className="text-xs text-muted-foreground">
                      E-Mail-Adresse für technische Integration
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="budget">Monatliches Budget (EUR)</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={formData.advertisingBudget}
                      onChange={(e) =>
                        setFormData({ ...formData, advertisingBudget: e.target.value })
                      }
                      placeholder="5000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="audience">Zielgruppe</Label>
                    <Select
                      value={formData.targetAudience}
                      onValueChange={(v) =>
                        setFormData({ ...formData, targetAudience: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Zielgruppe auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shippers">Versender</SelectItem>
                        <SelectItem value="carriers">Transportunternehmen</SelectItem>
                        <SelectItem value="drivers">Fahrer</SelectItem>
                        <SelectItem value="all">Alle Nutzer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label>Bevorzugte Werbeplätze</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {AD_SLOTS.map((slot) => (
                        <label
                          key={slot.id}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                            formData.preferredSlots.includes(slot.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={formData.preferredSlots.includes(slot.id)}
                              onCheckedChange={() => handleSlotToggle(slot.id)}
                            />
                            <div>
                              <p className="text-sm font-medium">{slot.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {slot.size}
                              </p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Zurück
                </Button>
                <Button
                  onClick={() => setCurrentStep(3)}
                  disabled={
                    partnerType === 'INSURANCE'
                      ? formData.insuranceProducts.length === 0
                      : !formData.advertisingBudget || !formData.targetAudience
                  }
                >
                  Weiter
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Vertragsunterlagen
              </CardTitle>
              <CardDescription>
                Bitte akzeptieren Sie unsere Geschäftsbedingungen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={formData.acceptedTerms}
                    onCheckedChange={(v) =>
                      setFormData({ ...formData, acceptedTerms: v as boolean })
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-medium">Allgemeine Geschäftsbedingungen</p>
                    <p className="text-sm text-muted-foreground">
                      Ich habe die{' '}
                      <a href="/agb" className="text-blue-600 hover:underline">
                        AGB für Partner
                      </a>{' '}
                      gelesen und akzeptiert.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={formData.acceptedPrivacy}
                    onCheckedChange={(v) =>
                      setFormData({ ...formData, acceptedPrivacy: v as boolean })
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-medium">Datenschutzerklärung</p>
                    <p className="text-sm text-muted-foreground">
                      Ich habe die{' '}
                      <a href="/datenschutz" className="text-blue-600 hover:underline">
                        Datenschutzerklärung
                      </a>{' '}
                      gelesen und akzeptiert.
                    </p>
                  </div>
                </label>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Nächste Schritte nach der Registrierung:</strong>
                </p>
                <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                  <li>Bestätigung Ihrer E-Mail-Adresse</li>
                  <li>Überprüfung Ihrer Unternehmensdaten</li>
                  <li>Vertragsunterzeichnung (digital)</li>
                  <li>Technische Einrichtung (API-Zugang)</li>
                  <li>Go-Live als aktiver Partner</li>
                </ol>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Zurück
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.acceptedTerms || !formData.acceptedPrivacy}
                  loading={isLoading}
                >
                  Registrierung absenden
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
