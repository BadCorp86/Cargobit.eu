'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast, Toaster } from 'sonner';
import {
  Package,
  ArrowRight,
  User,
  Building2,
  Mail,
  Phone,
  Check,
} from 'lucide-react';

// ============================================
// SHIPPER ONBOARDING COMPONENT
// ============================================
export function ShipperOnboarding() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    isBusiness: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm({ 
      ...form, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!form.contactName || !form.email) {
      toast.error('Pflichtfelder fehlen', {
        description: 'Bitte geben Sie Ihren Namen und E-Mail an.',
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error('Ungültige E-Mail', {
        description: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
      });
      return;
    }

    // Business validation
    if (form.isBusiness && !form.companyName) {
      toast.error('Firmenname fehlt', {
        description: 'Als Unternehmen müssen Sie einen Firmennamen angeben.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/onboarding/shipper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
        toast.success('Registrierung erfolgreich!', {
          description: form.isBusiness 
            ? 'Ihr Unternehmenskonto wurde erstellt.' 
            : 'Ihr Privatkonto wurde erstellt.',
        });
      } else {
        throw new Error(data.message || 'Unbekannter Fehler');
      }
    } catch (error: any) {
      toast.error('Fehler bei der Registrierung', {
        description: error.message || 'Bitte versuchen Sie es erneut.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Toaster position="top-right" richColors />
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Willkommen bei CargoBit!</h2>
            <p className="text-muted-foreground mb-6">
              {form.isBusiness 
                ? 'Ihr Unternehmenskonto wurde erfolgreich erstellt. Sie können jetzt Transporte beauftragen.' 
                : 'Ihr Konto wurde erfolgreich erstellt. Starten Sie jetzt Ihren ersten Transport.'}
            </p>
            <Button className="w-full gap-2" onClick={() => window.location.href = '/app'}>
              Zum Dashboard
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Toaster position="top-right" richColors />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verlader werden</CardTitle>
          <CardDescription>
            Erstellen Sie Ihr Konto und beauftragen Sie Transporte
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Business Toggle */}
          <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted/50">
            <Checkbox
              id="isBusiness"
              checked={form.isBusiness}
              onCheckedChange={(checked) => 
                setForm({ ...form, isBusiness: checked as boolean })
              }
            />
            <div className="flex-1">
              <Label htmlFor="isBusiness" className="flex items-center gap-2 cursor-pointer">
                <Building2 className="w-4 h-4" />
                Ich bin ein Unternehmen
              </Label>
            </div>
          </div>

          {/* Company Name (only if business) */}
          {form.isBusiness && (
            <div className="space-y-2">
              <Label htmlFor="companyName">Firmenname *</Label>
              <Input
                id="companyName"
                name="companyName"
                placeholder="Musterfirma GmbH"
                value={form.companyName}
                onChange={handleChange}
              />
            </div>
          )}

          <Separator />

          {/* Contact Name */}
          <div className="space-y-2">
            <Label htmlFor="contactName">Kontakt-Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="contactName"
                name="contactName"
                placeholder="Max Mustermann"
                className="pl-10"
                value={form.contactName}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="max@firma.de"
                className="pl-10"
                value={form.email}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                name="phone"
                placeholder="+49 123 456789"
                className="pl-10"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Ihre Vorteile als Verlader:
            </p>
            <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3" />
                Transparenz - Alle Angebote auf einen Blick
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3" />
                Sicherheit - Escrow-Schutz für Zahlungen
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3" />
                Kostenlos - Keine Registrierungsgebühr
              </li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-4">
          <Button 
            className="w-full gap-2" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Wird erstellt...
              </>
            ) : (
              <>
                Konto erstellen
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Mit der Registrierung akzeptieren Sie unsere{' '}
            <a href="/agb" className="underline">AGB</a> und{' '}
            <a href="/datenschutz" className="underline">Datenschutzbestimmungen</a>.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default ShipperOnboarding;
