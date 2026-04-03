'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { languages } from '@/lib/i18n';
import type { Language } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sun,
  Moon,
  Monitor,
  Globe,
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  FileText,
  Download,
  CreditCard,
  User,
  Building,
  Palette,
  Shield,
  Upload,
  Camera,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export function SettingsPage() {
  const { language, setLanguage, currentRole } = useCargoBitStore();
  const { theme, setTheme } = useTheme();
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const themeOptions = [
    { value: 'light', icon: Sun, label: t('light', language) },
    { value: 'dark', icon: Moon, label: t('dark', language) },
    { value: 'system', icon: Monitor, label: t('system', language) },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('settings', language)}</h1>
        <p className="text-sm text-muted-foreground">
          {language === 'de' ? 'Verwalten Sie Ihre Kontoeinstellungen' : 'Manage your account settings'}
        </p>
      </div>

      {/* Profile */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-orange-500" />
            {t('profile', language)}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 border-2 border-orange-200/50">
              <AvatarFallback className="text-xl font-bold text-white">
                {(currentRole || 'AD').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{currentRole === 'admin' ? 'Administrator' : currentRole}</p>
              <p className="text-sm text-muted-foreground">{currentRole}@cargobit.de</p>
              <Badge className="mt-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 text-xs">
                {currentRole?.toUpperCase()}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'de' ? 'Vollständiger Name' : 'Full Name'}</Label>
              <Input defaultValue={currentRole === 'admin' ? 'Max Mustermann' : currentRole} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'de' ? 'Firma' : 'Company'}</Label>
              <Input defaultValue="CargoBit GmbH" />
            </div>
            <div className="space-y-2">
              <Label>{language === 'de' ? 'E-Mail' : 'Email'}</Label>
              <Input defaultValue={`${currentRole}@cargobit.de`} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'de' ? 'Telefon' : 'Phone'}</Label>
              <Input defaultValue="+49 30 1234567" />
            </div>
          </div>
          <Button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white">
            {t('save', language)}
          </Button>
        </CardContent>
      </Card>

      {/* Company Profile - Logo Upload */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building className="w-4 h-4 text-orange-500" />
            {language === 'de' ? 'Firmenprofil' : 'Company Profile'}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="flex items-start gap-6 mb-6">
            {/* Logo Upload */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 border-2 border-dashed border-orange-300 dark:border-orange-700/50 flex items-center justify-center overflow-hidden transition-all group-hover:border-orange-500">
                  {companyLogo ? (
                    <img src={companyLogo} alt="Company Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building className="w-10 h-10 text-orange-400 dark:text-orange-500" />
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {language === 'de' ? 'Klicken zum Hochladen' : 'Click to upload'}
              </p>
            </div>
            {/* Company Details */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'de' ? 'Firmenname' : 'Company Name'}</Label>
                  <Input defaultValue="CargoBit GmbH" />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'de' ? 'Firmen-ID' : 'Company ID'}</Label>
                  <Input defaultValue="CB-2024-001" disabled className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'de' ? 'Adresse' : 'Address'}</Label>
                  <Input defaultValue="Logistikstraße 42, 10115 Berlin" />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'de' ? 'Website' : 'Website'}</Label>
                  <Input defaultValue="https://cargobit.eu" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              <Upload className="w-4 h-4 mr-2" />
              {language === 'de' ? 'Logo speichern' : 'Save Logo'}
            </Button>
            {companyLogo && (
              <Button variant="outline" onClick={() => setCompanyLogo(null)}>
                {language === 'de' ? 'Logo entfernen' : 'Remove Logo'}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {language === 'de'
              ? 'Empfohlene Größe: 200x200 Pixel. Unterstützte Formate: PNG, JPG, SVG.'
              : 'Recommended size: 200x200 pixels. Supported formats: PNG, JPG, SVG.'}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Language */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-orange-500" />
              {t('language', language)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              {language === 'de' ? 'Wählen Sie Ihre bevorzugte Sprache' : 'Select your preferred language'}
            </p>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Palette className="w-4 h-4 text-orange-500" />
              {t('theme', language)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={theme === opt.value ? 'default' : 'outline'}
                  className={cn(
                    'h-auto py-4 flex flex-col items-center gap-2 transition-all',
                    theme === opt.value
                      ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25'
                      : 'hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-300 dark:hover:border-orange-700/50'
                  )}
                  onClick={() => setTheme(opt.value)}
                >
                  <opt.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{opt.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-500" />
              {t('notificationPrefs', language)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('emailNotifications', language)}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'de' ? 'Erhalten Sie Updates per E-Mail' : 'Receive updates via email'}
                    </p>
                  </div>
                </div>
                <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('pushNotifications', language)}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'de' ? 'Push-Benachrichtigungen aktivieren' : 'Enable push notifications'}
                    </p>
                  </div>
                </div>
                <Switch checked={pushNotif} onCheckedChange={setPushNotif} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('smsNotifications', language)}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'de' ? 'SMS-Benachrichtigungen aktivieren' : 'Enable SMS notifications'}
                    </p>
                  </div>
                </div>
                <Switch checked={smsNotif} onCheckedChange={setSmsNotif} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-500" />
              {t('quickActionsTitle', language)}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3 h-11 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-300 dark:hover:border-orange-700/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{t('generateInvoice', language)}</p>
                  <p className="text-[10px] text-muted-foreground">{language === 'de' ? 'Rechnung für ausgewählte Sendungen' : 'Invoice for selected shipments'}</p>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-11 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-300 dark:hover:border-orange-700/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Download className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{t('exportCSV', language)}</p>
                  <p className="text-[10px] text-muted-foreground">{language === 'de' ? 'Daten als CSV exportieren' : 'Export data as CSV'}</p>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-11 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-300 dark:hover:border-orange-700/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Download className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{t('exportPDF', language)}</p>
                  <p className="text-[10px] text-muted-foreground">{language === 'de' ? 'Bericht als PDF generieren' : 'Generate report as PDF'}</p>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-11 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-300 dark:hover:border-orange-700/50 transition-all">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{t('paymentPlan', language)}</p>
                  <p className="text-[10px] text-muted-foreground">{language === 'de' ? 'Zahlungsplan verwalten' : 'Manage payment plan'}</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
