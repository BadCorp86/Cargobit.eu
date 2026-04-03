'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Cookie, 
  Shield, 
  MapPin, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Info,
  Lock,
  BarChart3,
  Zap,
  Smartphone
} from 'lucide-react';

interface CookieCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  enabled: boolean;
  icon: React.ReactNode;
  details: string[];
}

const initialCategories: CookieCategory[] = [
  {
    id: 'essential',
    name: 'Technisch notwendige Cookies',
    description: 'Diese Cookies sind für das Funktionieren der Website zwingend erforderlich.',
    required: true,
    enabled: true,
    icon: <Lock className="h-5 w-5" />,
    details: [
      'Sitzungs-Management und Authentifizierung',
      'Sicherheitstoken und CSRF-Schutz',
      'Sprach- und Regionseinstellungen',
      'Warenkorb und Benutzereinstellungen',
    ],
  },
  {
    id: 'functional',
    name: 'Funktions-Cookies',
    description: 'Ermöglichen erweiterte Funktionen und Personalisierung.',
    required: false,
    enabled: true,
    icon: <Zap className="h-5 w-5" />,
    details: [
      'Speichern von Filtereinstellungen',
      'Dashboard-Layout-Einstellungen',
      'Zuletzt besuchte Seiten',
      'Benachrichtigungs-Präferenzen',
    ],
  },
  {
    id: 'analytics',
    name: 'Analyse-Cookies',
    description: 'Helfen uns zu verstehen, wie Sie die Plattform nutzen.',
    required: false,
    enabled: false,
    icon: <BarChart3 className="h-5 w-5" />,
    details: [
      'Seitenaufrufe und Nutzungsmuster',
      'Performance-Messung',
      'Fehleranalyse und Debugging',
      'A/B-Testing neuer Funktionen',
    ],
  },
];

interface GPSSetting {
  id: string;
  name: string;
  description: string;
  required: boolean;
  enabled: boolean;
  usageContext: string;
}

const initialGPSSettings: GPSSetting[] = [
  {
    id: 'tracking',
    name: 'Echtzeit-Sendungsverfolgung',
    description: 'Live-Tracking von Sendungen auf der Karte',
    required: false,
    enabled: true,
    usageContext: 'Sendungsverfolgung, Dashboard',
  },
  {
    id: 'delivery',
    name: 'Lieferquittierung',
    description: 'GPS-Koordinaten bei Unterschrift speichern',
    required: true,
    enabled: true,
    usageContext: 'e-CMR, Lieferbestätigung',
  },
  {
    id: 'fleet',
    name: 'Flottenmanagement',
    description: 'Ortung von Fahrzeugen und Fahrern',
    required: false,
    enabled: true,
    usageContext: 'Flottenübersicht, Disposition',
  },
  {
    id: 'route',
    name: 'Routenoptimierung',
    description: 'GPS-basierte Routenberechnung',
    required: false,
    enabled: false,
    usageContext: 'Routenplanung, Navigation',
  },
];

export function CookieSettingsPage() {
  const { t } = useI18n();
  const [categories, setCategories] = useState<CookieCategory[]>(initialCategories);
  const [gpsSettings, setGPSSettings] = useState<GPSSetting[]>(initialGPSSettings);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === id && !cat.required ? { ...cat, enabled: !cat.enabled } : cat
      )
    );
  };

  const toggleGPS = (id: string) => {
    setGPSSettings((prev) =>
      prev.map((setting) =>
        setting.id === id && !setting.required ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
  };

  const acceptAll = () => {
    setCategories((prev) => prev.map((cat) => ({ ...cat, enabled: true })));
    setGPSSettings((prev) => prev.map((setting) => ({ ...setting, enabled: true })));
  };

  const acceptNecessary = () => {
    setCategories((prev) => prev.map((cat) => ({ ...cat, enabled: cat.required })));
    setGPSSettings((prev) => prev.map((setting) => ({ ...setting, enabled: setting.required })));
  };

  const enabledCookies = categories.filter((c) => c.enabled).length;
  const totalOptionalCookies = categories.filter((c) => !c.required).length;
  const enabledOptionalCookies = categories.filter((c) => !c.required && c.enabled).length;

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <Card className="border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-500/10">
              <Cookie className="h-8 w-8 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-2xl">Cookie-Einstellungen</CardTitle>
              <CardDescription className="text-base mt-1">
                Verwalten Sie Ihre Datenschutzeinstellungen
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              DSGVO-konform
            </Badge>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
              <Shield className="h-3 w-3 mr-1" />
              Transparenz
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* GPS Notice */}
      <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
        <div className="flex items-start gap-3">
          <MapPin className="h-6 w-6 text-orange-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-orange-600">GPS-Ortung ist zwingend erforderlich</p>
            <p className="text-muted-foreground mt-1">
              Für die Nutzung bestimmter Funktionen der CargoBit-Plattform ist die GPS-Ortung 
              Ihres Mobiltelefons zwingend erforderlich. Dies umfasst:
            </p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Lieferquittierung mit Standortnachweis (Betrugsschutz)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Echtzeit-Sendungsverfolgung
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Flottenmanagement und Fahrerstatus
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Routenoptimierung
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={acceptAll}>
          Alle akzeptieren
        </Button>
        <Button variant="outline" onClick={acceptNecessary}>
          Nur notwendige
        </Button>
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          Einstellungen speichern
        </Button>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Aktivierte Cookies</span>
            <span className="text-sm text-muted-foreground">
              {enabledCookies} von {categories.length}
            </span>
          </div>
          <Progress value={(enabledCookies / categories.length) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {enabledOptionalCookies} von {totalOptionalCookies} optionalen Cookies aktiviert
          </p>
        </CardContent>
      </Card>

      {/* Cookie Categories */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Cookie className="h-5 w-5 text-orange-500" />
          Cookie-Kategorien
        </h2>

        {categories.map((category) => (
          <Card key={category.id} className={category.enabled ? 'border-green-500/20' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${category.enabled ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                    {category.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {category.required && (
                    <Badge variant="outline" className="text-xs">
                      Erforderlich
                    </Badge>
                  )}
                  <Switch
                    checked={category.enabled}
                    disabled={category.required}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <button
                onClick={() => setShowDetails(showDetails === category.id ? null : category.id)}
                className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
              >
                <Info className="h-4 w-4" />
                {showDetails === category.id ? 'Details ausblenden' : 'Details anzeigen'}
              </button>
              {showDetails === category.id && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50">
                  <ul className="space-y-2 text-sm">
                    {category.details.map((detail, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* GPS Settings */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-orange-500" />
          GPS- und Ortungseinstellungen
        </h2>

        <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Smartphone className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-600">Hinweis zur Ortung von Mobiltelefonen</p>
              <p className="text-muted-foreground mt-1">
                Die Ortung erfolgt ausschließlich zu den unten genannten Zwecken. 
                Ihre Standortdaten werden nicht an Dritte weitergegeben und nach 
                Ablauf der gesetzlichen Aufbewahrungsfrist gelöscht.
              </p>
            </div>
          </div>
        </div>

        {gpsSettings.map((setting) => (
          <Card key={setting.id} className={setting.enabled ? 'border-green-500/20' : ''}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{setting.name}</p>
                    {setting.required && (
                      <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">
                        Zwingend
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{setting.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Verwendung: {setting.usageContext}
                  </p>
                </div>
                <Switch
                  checked={setting.enabled}
                  disabled={setting.required}
                  onCheckedChange={() => toggleGPS(setting.id)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <Card className="border-orange-500/20">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Widerrufsrecht:</strong> Sie können Ihre Einwilligung jederzeit mit Wirkung 
              für die Zukunft widerrufen. Nutzen Sie dazu die Einstellungen auf dieser Seite oder 
              kontaktieren Sie uns unter datenschutz@cargobit.eu.
            </p>
            <p>
              <strong>Speicherdauer:</strong> Cookies werden je nach Kategorie für unterschiedlich 
              lange Zeiträume gespeichert. Technisch notwendige Cookies werden nach dem Logout 
              gelöscht. Andere Cookies haben eine maximale Laufzeit von 24 Monaten.
            </p>
            <p>
              <strong>Weitere Informationen:</strong> Detaillierte Informationen finden Sie in 
              unserer <a href="#" className="text-orange-500 hover:underline">Datenschutzerklärung</a> und in den <a href="#" className="text-orange-500 hover:underline">AGB</a>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
