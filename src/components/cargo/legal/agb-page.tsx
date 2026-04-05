'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Shield, 
  Gavel, 
  MapPin, 
  Cookie, 
  Smartphone,
  Truck,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Scale,
  Lock,
  Globe,
  CreditCard,
  Megaphone
} from 'lucide-react';

interface AGBSection {
  id: string;
  titleKey: string;
  titleDe: string;
  icon: React.ReactNode;
  contentDe: string[];
}

const agbSections: AGBSection[] = [
  {
    id: 'geltungsbereich',
    titleKey: 'scopeOfApplication',
    titleDe: '§1 Geltungsbereich',
    icon: <FileText className="h-5 w-5" />,
    contentDe: [
      '1.1 Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Geschäftsbeziehungen zwischen der CargoBit GmbH (nachfolgend "CargoBit", "wir", "uns") und den Nutzern der Plattform cargobit.eu (nachfolgend "Nutzer", "Sie").',
      '1.2 Die Nutzung unserer Plattform ist ausschließlich für Unternehmer im Sinne des § 14 BGB gestattet. Verbraucher im Sinne des § 13 BGB sind von der Nutzung ausgeschlossen.',
      '1.3 Diese AGB gelten insbesondere für:',
      '   • Spediteure und Transportunternehmer (Disponenten)',
      '   • Fahrer und Lieferpersonal',
      '   • Verlader und Auktionsersteller (Shipper)',
      '   • Support-Personal und Administratoren',
      '1.4 Abweichende Bedingungen des Nutzers werden nicht anerkannt, es sei denn, wir stimmen ihrer Geltung ausdrücklich schriftlich zu.',
    ],
  },
  {
    id: 'plattform-nutzung',
    titleKey: 'platformUsage',
    titleDe: '§2 Plattformnutzung und Registrierung',
    icon: <Globe className="h-5 w-5" />,
    contentDe: [
      '2.1 Die Registrierung auf der Plattform erfordert die Angabe wahrer und vollständiger Daten. Die Anmeldung unter falschem Namen oder mit falschen Daten ist untersagt.',
      '2.2 Mit der Registrierung bestätigt der Nutzer, dass er geschäftsfähig ist und das 18. Lebensjahr vollendet hat.',
      '2.3 Der Nutzer ist verpflichtet, seine Zugangsdaten vertraulich zu behandeln und vor unbefugtem Zugriff durch Dritte zu schützen. Jede Nutzung der Plattform unter den Zugangsdaten des Nutzers erfolgt auf dessen Verantwortung.',
      '2.4 CargoBit behält sich das Recht vor, Nutzerkonten bei Verdacht auf Missbrauch, Rechtsverletzung oder bei Verstoß gegen diese AGB vorübergehend zu sperren oder dauerhaft zu löschen.',
      '2.5 Die Zuweisung der Nutzerrolle (Admin, Disponent, Fahrer, Verlader, Support) erfolgt durch den jeweiligen Kontoinhaber oder Administrator. Eine Änderung der Rolle erfordert die Zustimmung von CargoBit.',
    ],
  },
  {
    id: 'leistungen',
    titleKey: 'services',
    titleDe: '§3 Leistungen von CargoBit',
    icon: <Truck className="h-5 w-5" />,
    contentDe: [
      '3.1 CargoBit betreibt eine digitale Frachtbörse, die folgende Leistungen umfasst:',
      '   • Vermittlung von Transportaufträgen zwischen Verladern und Transporteuren',
      '   • Auktionsplattform für Frachtraum und Transportkapazitäten',
      '   • Elektronischer Frachtbrief (e-CMR) mit Blockchain-Technologie',
      '   • Echtzeit-Sendungsverfolgung und Flottenmanagement',
      '   • KI-gestützte Preisempfehlungen',
      '   • Wallet-System für Zahlungen und Abrechnungen',
      '3.2 Die Verfügbarkeit der Plattform beträgt 99,5% im Jahresmittel. Geplante Wartungsarbeiten werden mindestens 48 Stunden im Voraus angekündigt.',
      '3.3 CargoBit übernimmt keine Haftung für die Durchführung der Transporte. Die vertraglichen Beziehungen zwischen Verladern und Transporteuren sind von diesen eigenständig zu gestalten.',
    ],
  },
  {
    id: 'e-cmr',
    titleKey: 'eCMR',
    titleDe: '§4 Elektronischer Frachtbrief (e-CMR)',
    icon: <Smartphone className="h-5 w-5" />,
    contentDe: [
      '4.1 Der elektronische Frachtbrief (e-CMR) ist die digitale Version des Papier-Frachtbriefs und dient der elektronischen Übermittlung und Speicherung von Transportdaten.',
      '4.2 Der e-CMR ermöglicht:',
      '   • Schnellere Prozesse durch digitale Dokumentation',
      '   • Echtzeit-Nachverfolgung der Sendungen',
      '   • Geringere Verwaltungskosten',
      '   • Fälschungssichere Dokumentation via Blockchain-Technologie',
      '4.3 Der e-CMR erfüllt die Anforderungen des CMR-Übereinkommens und ist rechtlich gleichwertig zum papierbasierten Frachtbrief.',
      '4.4 Mit der digitalen Unterzeichnung des e-CMR bestätigen die Parteien die Richtigkeit der darin enthaltenen Angaben.',
      '4.5 Alle e-CMR-Daten werden verschlüsselt gespeichert und sind vor unbefugtem Zugriff geschützt. Die Blockchain-Technologie gewährleistet die Unveränderbarkeit der Dokumente.',
      '4.6 Die Speicherung der e-CMR-Daten erfolgt für die gesetzlich vorgeschriebene Mindestaufbewahrungsfrist von 10 Jahren.',
    ],
  },
  {
    id: 'quittierung',
    titleKey: 'deliveryConfirmation',
    titleDe: '§5 Lieferquittierung und GPS-Daten',
    icon: <MapPin className="h-5 w-5" />,
    contentDe: [
      '5.1 Die Lieferquittierung erfolgt digital über die CargoBit-App durch:',
      '   • Elektronische Unterschrift des Empfängers auf dem Smartphone',
      '   • Automatische Erfassung von GPS-Koordinaten zum Zeitpunkt der Quittierung',
      '   • Zeitstempel mit Datum und Uhrzeit',
      '5.2 Die GPS-Daten werden ausschließlich zum Schutz vor Betrug und zur Dokumentation der Lieferung gespeichert. Sie dienen als Nachweis für den ordnungsgemäßen Lieferort.',
      '5.3 Der Empfänger willigt mit seiner Unterschrift in die Speicherung der GPS-Daten ein.',
      '5.4 Die GPS-Funktion des Endgeräts ist für die Nutzung der Quittierungsfunktion zwingend erforderlich. Nutzer ohne aktives GPS können die Quittierungsfunktion nicht nutzen.',
      '5.5 Die gespeicherten GPS-Daten werden nicht an Dritte weitergegeben, es sei denn, dies ist zur Beweisführung bei Streitigkeiten oder auf gesetzliche Anordnung erforderlich.',
      '5.6 Nach Ablauf der gesetzlichen Aufbewahrungsfrist werden alle standortbezogenen Daten unwiderruflich gelöscht.',
    ],
  },
  {
    id: 'cookie-gps',
    titleKey: 'cookieAndGPS',
    titleDe: '§6 Cookie-Einstellungen und GPS-Ortung',
    icon: <Cookie className="h-5 w-5" />,
    contentDe: [
      '6.1 Die CargoBit-Plattform verwendet Cookies und lokale Speichertechnologien, um:',
      '   • Die Funktionalität der Plattform zu gewährleisten',
      '   • Die Benutzerfreundlichkeit zu verbessern',
      '   • Statistische Auswertungen zur Optimierung vorzunehmen',
      '   • Sicherheitsfunktionen zu gewährleisten',
      '6.2 Folgende Cookie-Kategorien werden verwendet:',
      '   • Technisch notwendige Cookies (zwingend erforderlich)',
      '   • Funktions-Cookies (können deaktiviert werden)',
      '   • Analyse-Cookies (können deaktiviert werden)',
      '6.3 GPS-Ortung ist für folgende Funktionen zwingend erforderlich:',
      '   • Lieferquittierung mit Standortnachweis',
      '   • Echtzeit-Sendungsverfolgung',
      '   • Flottenmanagement und Fahrerstatus',
      '   • Routenoptimierung',
      '6.4 Die Ortung von Mobiltelefonen erfolgt nur bei aktivierter Zustimmung des jeweiligen Nutzers und ausschließlich zu den in §6.3 genannten Zwecken.',
      '6.5 Die GPS-Daten werden in Echtzeit nur für die Dauer der aktiven Nutzung übertragen. Historische Ortsdaten werden gemäß Datenschutzbestimmungen gespeichert.',
      '6.6 Nutzer können die GPS-Funktion jederzeit deaktivieren. Dies kann jedoch die Nutzung bestimmter Plattformfunktionen einschränken oder unmöglich machen.',
    ],
  },
  {
    id: 'entgelte',
    titleKey: 'fees',
    titleDe: '§7 Entgelte und Zahlungsbedingungen',
    icon: <CreditCard className="h-5 w-5" />,
    contentDe: [
      '7.1 Die Nutzung der Plattform erfolgt auf Basis verschiedener Abonnement-Modelle:',
      '   • Starter: €89/Monat (50 Sendungen/Monat)',
      '   • Professional: €499/Monat (500 Sendungen/Monat)',
      '   • Enterprise: €899/Monat (unbegrenzte Sendungen)',
      '7.2 Für Verlader (Shipper) fällt KEIN monatliches Abo an. Stattdessen wird eine Vermittlungsgebühr von 4% auf den Zuschlagspreis einer Auktion erhoben.',
      '7.3 Provisionen für Transporteure (Disponenten):',
      '   • Starter: 8% Transportprovision',
      '   • Professional: 5% Transportprovision',
      '   • Enterprise: 3,5% Transportprovision',
      '7.4 Wallet-Gebühren für Auszahlungen an Disponenten:',
      '   • Starter: 3% Wallet-Gebühr',
      '   • Professional: 2,5% Wallet-Gebühr',
      '   • Enterprise: 2% Wallet-Gebühr',
      '7.5 Alle Preise verstehen sich zzgl. der gesetzlichen Mehrwertsteuer.',
      '7.6 Zahlungen erfolgen über das integrierte Wallet-System oder per SEPA-Lastschrift.',
      '7.7 Bei Zahlungsverzug ist CargoBit berechtigt, den Zugang zur Plattform vorübergehend zu sperren.',
    ],
  },
  {
    id: 'haftung',
    titleKey: 'liability',
    titleDe: '§8 Haftungsbeschränkung',
    icon: <Shield className="h-5 w-5" />,
    contentDe: [
      '8.1 CargoBit haftet unbeschränkt:',
      '   • Für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit',
      '   • Bei Arglist oder Vorsatz',
      '   • Nach dem Produkthaftungsgesetz',
      '   • Bei Übernahme einer Garantie',
      '8.2 Bei einfacher Fahrlässigkeit haftet CargoBit nur bei Verletzung einer wesentlichen Vertragspflicht. Die Haftung ist auf den typischerweise vorhersehbaren Schaden begrenzt.',
      '8.3 CargoBit übernimmt KEINE Haftung für:',
      '   • Die Durchführung der Transporte',
      '   • Schäden an Frachtgut',
      '   • Verspätungen oder Nichtlieferungen',
      '   • Das Verhalten von Fahrern oder Transporteuren',
      '   • Die Richtigkeit der von Nutzern eingegebenen Daten',
      '8.4 Der Nutzer stellt CargoBit von allen Ansprüchen Dritter frei, die aus der Nutzung der Plattform oder der Durchführung von Transporten resultieren.',
      '8.5 Die Haftung für Datenverlust ist auf den typischen Wiederherstellungsaufwand begrenzt.',
    ],
  },
  {
    id: 'datenschutz',
    titleKey: 'dataProtection',
    titleDe: '§9 Datenschutz',
    icon: <Lock className="h-5 w-5" />,
    contentDe: [
      '9.1 Die Erhebung, Verarbeitung und Nutzung personenbezogener Daten erfolgt gemäß der EU-Datenschutz-Grundverordnung (DSGVO) und dem Bundesdatenschutzgesetz (BDSG).',
      '9.2 Detaillierte Informationen finden Sie in unserer separaten Datenschutzerklärung.',
      '9.3 Der Nutzer willigt ein, dass CargoBit folgende Daten verarbeitet:',
      '   • Stammdaten (Name, Firma, Adresse, Kontaktdaten)',
      '   • Bankverbindung für Zahlungen',
      '   • GPS-Daten im Rahmen der Plattformnutzung',
      '   • Transaktionsdaten und Nutzungshistorie',
      '9.4 Der Nutzer hat das Recht auf Auskunft, Berichtigung, Löschung und Datenübertragbarkeit.',
    ],
  },
  {
    id: 'kündigung',
    titleKey: 'termination',
    titleDe: '§10 Laufzeit und Kündigung',
    icon: <AlertTriangle className="h-5 w-5" />,
    contentDe: [
      '10.1 Abonnements haben eine Mindestlaufzeit von einem Monat (monatliche Zahlung) bzw. einem Jahr (jährliche Zahlung).',
      '10.2 Die Kündigung ist jederzeit zum Ende der Mindestlaufzeit möglich. Die Kündigungsfrist beträgt 14 Tage zum Monatsende.',
      '10.3 Eine Kündigung erfolgt in Textform per E-Mail an kundigung@cargobit.eu oder über die Plattform.',
      '10.4 Bei Kündigung vor Ablauf der Mindestlaufzeit erfolgt keine Rückerstattung bereits gezahlter Beträge.',
      '10.5 Nach Kündigung werden alle Daten gemäß der gesetzlichen Aufbewahrungsfristen gespeichert und anschließend gelöscht.',
      '10.6 CargoBit behält sich das Recht vor, das Vertragsverhältnis aus wichtigem Grund fristlos zu kündigen.',
    ],
  },
  {
    id: 'streitbeilegung',
    titleKey: 'disputeResolution',
    titleDe: '§11 Streitbeilegung',
    icon: <Gavel className="h-5 w-5" />,
    contentDe: [
      '11.1 Bei Streitigkeiten zwischen Nutzern bietet CargoBit ein Mediationsverfahren über das Support-System an.',
      '11.2 Das Support-System für Konfliktlösung ist ausschließlich für Zwischenfälle während eines aktiven Transports gedacht.',
      '11.3 Chats werden nach Abschluss des Transports automatisch nach 24 Stunden gelöscht.',
      '11.4 Für rechtliche Auseinandersetzungen gilt die Gerichtsstandvereinbarung gemäß §14.',
    ],
  },
  {
    id: 'werbung',
    titleKey: 'advertising',
    titleDe: '§13 Werbung und Advertising',
    icon: <Megaphone className="h-5 w-5" />,
    contentDe: [
      '13.1 CargoBit bietet Werbeplätze auf der Plattform an. Die Buchung erfolgt über das Advertising-Modul.',
      '13.2 CargoBit ist NICHT verantwortlich für den Inhalt der geschalteten Werbung. Der Werbetreibende trägt die volle Verantwortung für die Richtigkeit, Legalität und Angemessenheit seiner Werbeinhalte.',
      '13.3 Alle Werbebilder und -videos werden automatisch auf Verstöße (Gewalt, Pornografie, Hassrede, illegale Inhalte) geprüft.',
      '13.4 Bei Verstoß gegen die Inhaltsrichtlinien wird der Benutzer automatisch gesperrt. Eine Freischaltung erfolgt nur nach manueller Prüfung durch Admin oder Support.',
      '13.5 CargoBit behält sich das Recht vor, Werbeanzeigen ohne Rückerstattung zu entfernen, wenn sie gegen geltendes Recht oder diese AGB verstoßen.',
      '13.6 Die automatische Rechnungserstellung erfolgt monatlich. Bei Nichtzahlung wird der Zugang zum Advertising-Modul gesperrt.',
    ],
  },
  {
    id: 'schlussbestimmungen',
    titleKey: 'finalProvisions',
    titleDe: '§14 Schlussbestimmungen',
    icon: <Scale className="h-5 w-5" />,
    contentDe: [
      '14.1 Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.',
      '14.2 Ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag ist Berlin, Deutschland, sofern der Nutzer Kaufmann ist.',
      '14.3 Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.',
      '14.4 CargoBit behält sich das Recht vor, diese AGB jederzeit zu ändern. Änderungen werden den Nutzern mindestens 4 Wochen vor Inkrafttreten mitgeteilt.',
      '14.5 Die aktuelle Version der AGB ist stets auf cargobit.eu/agb abrufbar.',
    ],
  },
];

export function AGBPage() {
  const { t } = useI18n();
  const [expandedSections, setExpandedSections] = useState<string[]>(['geltungsbereich']);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const expandAll = () => {
    setExpandedSections(agbSections.map((s) => s.id));
  };

  const collapseAll = () => {
    setExpandedSections([]);
  };

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <Card className="border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-500/10">
              <FileText className="h-8 w-8 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-2xl">Allgemeine Geschäftsbedingungen (AGB)</CardTitle>
              <CardDescription className="text-base mt-1">
                CargoBit GmbH - Digitale Frachtbörse
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                Version 2.0
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Gültig ab: 01.01.2025</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span>Rechtsbindend</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-sm">
              <strong>Wichtiger Hinweis:</strong> Diese AGB schützen die CargoBit Plattform, 
              die CargoBit GmbH sowie deren Geschäftsführer und Mitarbeiter. Mit der Nutzung 
              unserer Plattform erkennen Sie diese Bedingungen an.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={expandAll} className="gap-2">
          <ChevronDown className="h-4 w-4" />
          Alle aufklappen
        </Button>
        <Button variant="outline" onClick={collapseAll} className="gap-2">
          <ChevronUp className="h-4 w-4" />
          Alle zuklappen
        </Button>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Als PDF herunterladen
        </Button>
      </div>

      {/* AGB Sections */}
      <ScrollArea className="h-[calc(100vh-350px)]">
        <div className="space-y-3 pr-4">
          {agbSections.map((section) => (
            <Card key={section.id} className="overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                    {section.icon}
                  </div>
                  <span className="font-medium">{section.titleDe}</span>
                </div>
                {expandedSections.includes(section.id) ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              {expandedSections.includes(section.id) && (
                <CardContent className="pt-0 pb-4">
                  <Separator className="mb-4" />
                  <div className="space-y-3 text-sm leading-relaxed">
                    {section.contentDe.map((paragraph, pIndex) => (
                      <p key={pIndex} className={paragraph.startsWith('   •') ? 'pl-4' : ''}>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <Card className="border-orange-500/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              <p><strong>CargoBit GmbH</strong></p>
              <p>Logistikstraße 42, 10115 Berlin, Deutschland</p>
              <p>E-Mail: recht@cargobit.eu | Tel: +49 30 123456-0</p>
              <p className="mt-2">Handelsregister: HRB 123456 | Amtsgericht Berlin-Charlottenburg</p>
              <p>Geschäftsführer: [Ihr Name]</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Rechtlich geprüft
              </Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                DSGVO-konform
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
