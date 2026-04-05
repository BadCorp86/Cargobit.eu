'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  FileText,
  Target,
  DollarSign,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Megaphone,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdApplicationFormData {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  productDescription: string;
  advertisedProduct: string;
  budgetRange: string;
  preferredPositions: string[];
  campaignDuration: string;
  additionalNotes: string;
  acceptTerms: boolean;
}

const initialFormData: AdApplicationFormData = {
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  website: '',
  productDescription: '',
  advertisedProduct: '',
  budgetRange: '',
  preferredPositions: [],
  campaignDuration: '',
  additionalNotes: '',
  acceptTerms: false,
};

const budgetRanges = [
  { value: '500-1000', label: '€500 – €1.000/Monat' },
  { value: '1000-2500', label: '€1.000 – €2.500/Monat' },
  { value: '2500-5000', label: '€2.500 – €5.000/Monat' },
  { value: '5000-10000', label: '€5.000 – €10.000/Monat' },
  { value: '10000+', label: '€10.000+/Monat' },
];

const campaignDurations = [
  { value: '1', label: '1 Monat' },
  { value: '3', label: '3 Monate (10% Rabatt)' },
  { value: '6', label: '6 Monate (20% Rabatt)' },
  { value: '12', label: '12 Monate (30% Rabatt)' },
];

const adPositions = [
  { id: 'header', name: 'Header-Banner', price: '€500/Monat' },
  { id: 'sidebar', name: 'Sidebar-Banner', price: '€300/Monat' },
  { id: 'dashboard', name: 'Dashboard-Widget', price: '€400/Monat' },
  { id: 'newsletter', name: 'E-Mail-Newsletter', price: '€250/Monat' },
  { id: 'popup', name: 'Popup-Interstitial', price: '€350/Monat' },
  { id: 'footer', name: 'Footer-Banner', price: '€200/Monat' },
];

interface AdApplicationFormProps {
  trigger?: React.ReactNode;
  onApplicationSubmitted?: () => void;
}

export function AdApplicationForm({ trigger, onApplicationSubmitted }: AdApplicationFormProps) {
  const { language } = useCargoBitStore();
  const [formData, setFormData] = useState<AdApplicationFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleInputChange = (field: keyof AdApplicationFormData, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePositionToggle = (positionId: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredPositions: prev.preferredPositions.includes(positionId)
        ? prev.preferredPositions.filter((p) => p !== positionId)
        : [...prev.preferredPositions, positionId],
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.companyName || !formData.contactPerson || !formData.email || !formData.phone) {
      toast.error(language === 'de' ? 'Fehler' : 'Error', {
        description: language === 'de' ? 'Bitte füllen Sie alle Pflichtfelder aus.' : 'Please fill in all required fields.',
      });
      return;
    }

    if (!formData.acceptTerms) {
      toast.error(language === 'de' ? 'Fehler' : 'Error', {
        description: language === 'de' ? 'Bitte akzeptieren Sie die AGB.' : 'Please accept the terms and conditions.',
      });
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsSubmitting(false);
    setIsSubmitted(true);

    toast.success(language === 'de' ? 'Bewerbung eingereicht' : 'Application submitted', {
      description: language === 'de'
        ? 'Ihre Bewerbung wird von unserem Team geprüft. Sie erhalten eine E-Mail-Bestätigung.'
        : 'Your application is being reviewed by our team. You will receive an email confirmation.',
    });

    onApplicationSubmitted?.();
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setIsSubmitted(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(resetForm, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setTimeout(resetForm, 300); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20">
            <Megaphone className="w-4 h-4" />
            {t('applyForAdvertising', language)}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold">{t('applyForAdvertising', language)}</p>
              <p className="text-xs text-muted-foreground font-normal">
                {language === 'de' ? 'Werben Sie auf CargoBit' : 'Advertise on CargoBit'}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {language === 'de' ? 'Bewerbungsformular für Werbung auf CargoBit' : 'Application form for advertising on CargoBit'}
          </DialogDescription>
        </DialogHeader>

        {isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {language === 'de' ? 'Bewerbung erfolgreich eingereicht!' : 'Application submitted successfully!'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {language === 'de'
                ? 'Unser Team wird Ihre Bewerbung prüfen und Sie innerhalb von 2-3 Werktagen kontaktieren.'
                : 'Our team will review your application and contact you within 2-3 business days.'}
            </p>
            <div className="bg-muted/30 rounded-xl p-4 text-left space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>{language === 'de' ? 'Bearbeitungszeit: 2-3 Werktage' : 'Processing time: 2-3 business days'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-orange-500" />
                <span>{language === 'de' ? 'Bestätigung per E-Mail' : 'Confirmation via email'}</span>
              </div>
            </div>
            <Button onClick={handleClose} className="bg-orange-500 hover:bg-orange-600">
              {language === 'de' ? 'Schließen' : 'Close'}
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Company Information */}
            <Card className="bg-muted/30 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-500" />
                  {language === 'de' ? 'Unternehmensinformationen' : 'Company Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">{language === 'de' ? 'Unternehmen *' : 'Company *'}</Label>
                    <Input
                      placeholder="CargoBit GmbH"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{language === 'de' ? 'Ansprechpartner *' : 'Contact Person *'}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Max Mustermann"
                        value={formData.contactPerson}
                        onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">E-Mail *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="info@unternehmen.de"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{language === 'de' ? 'Telefon *' : 'Phone *'}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="+49 123 456789"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{language === 'de' ? 'Website' : 'Website'}</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="https://unternehmen.de"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Information */}
            <Card className="bg-muted/30 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-500" />
                  {language === 'de' ? 'Produkt & Kampagne' : 'Product & Campaign'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">{language === 'de' ? 'Produktbeschreibung' : 'Product Description'}</Label>
                  <Textarea
                    placeholder={language === 'de' ? 'Beschreiben Sie Ihr Unternehmen und Ihre Produkte...' : 'Describe your company and products...'}
                    value={formData.productDescription}
                    onChange={(e) => handleInputChange('productDescription', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{language === 'de' ? 'Beworbenes Produkt' : 'Advertised Product'}</Label>
                  <Input
                    placeholder={language === 'de' ? 'z.B. Transportversicherung, Fuhrpark-Software' : 'e.g., Transport insurance, Fleet software'}
                    value={formData.advertisedProduct}
                    onChange={(e) => handleInputChange('advertisedProduct', e.target.value)}
                    className="h-9"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Budget & Positions */}
            <Card className="bg-muted/30 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-orange-500" />
                  {language === 'de' ? 'Budget & Platzierung' : 'Budget & Placement'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">{language === 'de' ? 'Budget-Rahmen' : 'Budget Range'}</Label>
                    <Select value={formData.budgetRange} onValueChange={(v) => handleInputChange('budgetRange', v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={language === 'de' ? 'Budget auswählen' : 'Select budget'} />
                      </SelectTrigger>
                      <SelectContent>
                        {budgetRanges.map((range) => (
                          <SelectItem key={range.value} value={range.value}>
                            {range.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{language === 'de' ? 'Kampagnenlaufzeit' : 'Campaign Duration'}</Label>
                    <Select value={formData.campaignDuration} onValueChange={(v) => handleInputChange('campaignDuration', v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={language === 'de' ? 'Laufzeit wählen' : 'Select duration'} />
                      </SelectTrigger>
                      <SelectContent>
                        {campaignDurations.map((duration) => (
                          <SelectItem key={duration.value} value={duration.value}>
                            {duration.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{language === 'de' ? 'Bevorzugte Werbeplätze' : 'Preferred Ad Positions'}</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {adPositions.map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => handlePositionToggle(pos.id)}
                        className={cn(
                          'p-2.5 rounded-lg border text-left transition-all duration-200',
                          formData.preferredPositions.includes(pos.id)
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-border/50 hover:border-orange-300 bg-card/50'
                        )}
                      >
                        <p className={cn(
                          'text-xs font-medium',
                          formData.preferredPositions.includes(pos.id) ? 'text-orange-600 dark:text-orange-400' : 'text-foreground'
                        )}>
                          {pos.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{pos.price}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label className="text-xs">{language === 'de' ? 'Zusätzliche Anmerkungen' : 'Additional Notes'}</Label>
              <Textarea
                placeholder={language === 'de' ? 'Weitere Informationen, Fragen oder Wünsche...' : 'Additional information, questions or requests...'}
                value={formData.additionalNotes}
                onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                rows={2}
              />
            </div>

            <Separator />

            {/* Terms */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <Switch
                checked={formData.acceptTerms}
                onCheckedChange={(checked) => handleInputChange('acceptTerms', checked)}
              />
              <Label className="text-xs leading-relaxed cursor-pointer">
                {language === 'de' ? (
                  <>
                    Ich habe die <span className="text-orange-600 dark:text-orange-400">AGB (§13 Werbung und Advertising)</span> gelesen und akzeptiere diese. 
                    Ich verstehe, dass CargoBit nicht für den Inhalt meiner Werbung verantwortlich ist.
                  </>
                ) : (
                  <>
                    I have read and accept the <span className="text-orange-600 dark:text-orange-400">Terms (§13 Advertising)</span>. 
                    I understand that CargoBit is not responsible for the content of my advertisements.
                  </>
                )}
              </Label>
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                {language === 'de' ? 'Abbrechen' : 'Cancel'}
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    {language === 'de' ? 'Wird gesendet...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {language === 'de' ? 'Bewerbung einreichen' : 'Submit Application'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AdApplicationForm;
