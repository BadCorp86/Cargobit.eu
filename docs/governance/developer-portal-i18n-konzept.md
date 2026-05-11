# 🧱 BLOCK X — Developer-Portal Internationalisierungs-Konzept (i18n)

## Mehrsprachigkeit für globale Partner

### Internationale Ausrichtung des CargoBit Developer Portals

Dieses Dokument definiert die Internationalisierungs-Strategie für das CargoBit Developer Portal, um Entwicklern weltweit eine native Erfahrung in ihrer Sprache zu bieten.

---

## 1. Übersicht

### 1.1 Vision

Das CargoBit Developer Portal soll Entwicklern weltweit eine erstklassige Erfahrung in ihrer bevorzugten Sprache bieten, ohne Kompromisse bei technischer Genauigkeit oder Aktualität.

### 1.2 Zielsprachen

| Priorität | Sprache | Code | Markt | Status |
|-----------|---------|------|-------|--------|
| **P0** | Englisch | `en` | Global (Default) | ✅ Verfügbar |
| **P1** | Deutsch | `de` | DACH-Region | Monat 3 |
| **P1** | Französisch | `fr` | Frankreich, Belgien | Monat 6 |
| **P2** | Spanisch | `es` | Spanien, Lateinamerika | Monat 9 |
| **P2** | Portugiesisch | `pt` | Brasilien, Portugal | Monat 12 |
| **P3** | Japanisch | `ja` | Japan | Monat 15 |
| **P3** | Chinesisch | `zh` | China | Monat 18 |

### 1.3 i18n-Prinzipien

| Prinzip | Beschreibung |
|---------|--------------|
| **Developer-First** | Technische Genauigkeit vor sprachlicher Eleganz |
| **Code ist universal** | Code-Beispiele werden nicht übersetzt |
| **Native Experience** | Keine maschinellen Übersetzungen ohne Review |
| **Maintainability** | Zentrale Verwaltung aller Strings |
| **Scalability** | Architektur unterstützt beliebige Sprachen |

---

## 2. i18n-Architektur

### 2.1 System-Übersicht

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          i18n Architecture                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                      Content Layer                               │   │
│   │                                                                  │   │
│   │   /docs/en/    /docs/de/    /docs/fr/    /docs/es/              │   │
│   │   ├── intro.md ├── intro.md ├── intro.md ├── intro.md          │   │
│   │   ├── api.md   ├── api.md   ├── api.md   ├── api.md            │   │
│   │   └── guides/  └── guides/  └── guides/  └── guides/            │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                      │
│                                    ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                         UI Layer                                 │   │
│   │                                                                  │   │
│   │   /locales/                                                      │   │
│   │   ├── en.json    ← Default fallback                              │   │
│   │   ├── de.json                                                     │   │
│   │   ├── fr.json                                                     │   │
│   │   └── es.json                                                     │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                      │
│                                    ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                      Runtime Layer                               │   │
│   │                                                                  │   │
│   │   next-intl / i18next                                           │   │
│   │   ├── Language detection                                         │   │
│   │   ├── Route handling                                             │   │
│   │   ├── Fallback logic                                             │   │
│   │   └── Formatting (dates, numbers)                               │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Content Layer

**Verzeichnisstruktur:**

```
/docs/
├── en/
│   ├── index.md
│   ├── getting-started/
│   │   ├── quick-start.md
│   │   └── installation.md
│   ├── api-reference/
│   │   ├── payments.md
│   │   └── webhooks.md
│   └── guides/
│       └── integration.md
│
├── de/
│   ├── index.md
│   ├── getting-started/
│   │   ├── quick-start.md
│   │   └── installation.md
│   ├── api-reference/
│   │   ├── payments.md
│   │   └── webhooks.md
│   └── guides/
│       └── integration.md
│
└── fr/
    └── ...
```

### 2.3 UI Layer

**JSON-Struktur für UI-Strings:**

```json
// /locales/en.json
{
  "common": {
    "search": "Search documentation...",
    "navigation": {
      "docs": "Documentation",
      "api": "API Reference",
      "guides": "Guides",
      "tools": "Tools"
    },
    "actions": {
      "copy": "Copy",
      "copied": "Copied!",
      "submit": "Submit",
      "cancel": "Cancel"
    }
  },
  "docs": {
    "onThisPage": "On this page",
    "lastUpdated": "Last updated",
    "wasThisHelpful": "Was this helpful?",
    "yes": "Yes",
    "no": "No"
  },
  "apiExplorer": {
    "title": "API Explorer",
    "sendRequest": "Send Request",
    "response": "Response",
    "statusCode": "Status Code",
    "duration": "Duration"
  },
  "errors": {
    "404": {
      "title": "Page not found",
      "description": "The page you're looking for doesn't exist."
    },
    "500": {
      "title": "Server error",
      "description": "Something went wrong. Please try again."
    }
  }
}
```

```json
// /locales/de.json
{
  "common": {
    "search": "Dokumentation durchsuchen...",
    "navigation": {
      "docs": "Dokumentation",
      "api": "API-Referenz",
      "guides": "Anleitungen",
      "tools": "Werkzeuge"
    },
    "actions": {
      "copy": "Kopieren",
      "copied": "Kopiert!",
      "submit": "Absenden",
      "cancel": "Abbrechen"
    }
  },
  "docs": {
    "onThisPage": "Auf dieser Seite",
    "lastUpdated": "Zuletzt aktualisiert",
    "wasThisHelpful": "War das hilfreich?",
    "yes": "Ja",
    "no": "Nein"
  }
}
```

### 2.4 Runtime Layer

**Next.js i18n Konfiguration:**

```javascript
// next.config.js
module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'de', 'fr', 'es'],
    localeDetection: true
  }
}
```

**Middleware für Spracherkennung:**

```javascript
// middleware.js
import { NextResponse } from 'next/server';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const locales = ['en', 'de', 'fr', 'es'];

function getLocale(request) {
  const negotiator = new Negotiator(request.headers);
  const languages = negotiator.languages();
  return matchLocale(languages, locales, 'en');
}

export function middleware(request) {
  const pathname = request.nextUrl.pathname;
  
  // Check if pathname already has a locale
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );
  
  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    return NextResponse.redirect(
      new URL(`/${locale}${pathname}`, request.url)
    );
  }
}
```

---

## 3. Übersetzungs-Workflow

### 3.1 Workflow-Übersicht

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       Translation Workflow                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐       │
│   │  Source  │     │  Export  │     │ Translate│     │  Import  │       │
│   │ Content  │ ──▶ │  to PO   │ ──▶ │ (CAT)    │ ──▶ │ & Review │       │
│   │  (EN)    │     │  Files   │     │          │     │          │       │
│   └──────────┘     └──────────┘     └──────────┘     └──────────┘       │
│                                                           │              │
│                                                           ▼              │
│                                                     ┌──────────┐        │
│                                                     │  Deploy  │        │
│                                                     │  & Sync  │        │
│                                                     └──────────┘        │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Übersetzungsprozess

| Phase | Aktivität | Verantwortlich |
|-------|-----------|----------------|
| **1. Source** | Erstellung auf Englisch | Technical Writer |
| **2. Export** | Export in CAT-Format | Localization Manager |
| **3. Translate** | Übersetzung durch Linguisten | Übersetzungsagentur |
| **4. Review** | Technisches Review | Engineer + Native Speaker |
| **5. Import** | Import ins System | Localization Manager |
| **6. Deploy** | Veröffentlichung | DevOps |

### 3.3 Qualitätssicherung

**Review-Checkliste:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Translation Review Checklist                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Technische Korrektheit:                                                │
│   [ ] API-Parameter-Namen sind korrekt (nicht übersetzt)                 │
│   [ ] Code-Beispiele funktionieren                                       │
│   [ ] URLs und Links sind intakt                                         │
│   [ ] JSON-Strukturen sind valide                                        │
│                                                                           │
│   Sprachliche Qualität:                                                  │
│   [ ] Konsistente Terminologie                                           │
│   [ ] Native Sprachfluss                                                 │
│   [ ] Keine wörtlichen Übersetzungen                                     │
│   [ ] Kulturelle Angemessenheit                                          │
│                                                                           │
│   Formatierung:                                                           │
│   [ ] Markdown-Formatierung intakt                                       │
│   [ ] Tabellen-Struktur korrekt                                          │
│   [ ] Code-Blöcke nicht verändert                                        │
│   [ ] Links funktionieren                                                │
│                                                                           │
│   Glossar:                                                                │
│   [ ] Alle Fachbegriffe im Glossar definiert                             │
│   [ ] Konsistente Übersetzung von Begriffen                              │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Lokalisierungs-Regeln

### 4.1 Nicht zu übersetzende Elemente

| Element | Beispiel | Grund |
|---------|----------|-------|
| **Code-Beispiele** | `const payment = await cargobit.payments.create()` | Code ist universal |
| **API-Parameter** | `amount`, `currency`, `customer` | API-Konsistenz |
| **Endpoint-URLs** | `/v1/payments` | Technische Referenz |
| **Fehlercodes** | `payment_failed`, `invalid_request` | Debugging |
| **HTTP-Status** | `200 OK`, `401 Unauthorized` | Standard |
| **JSON-Keys** | `"id": "pay_123"` | API-Response |

### 4.2 Zu übersetzende Elemente

| Element | Beispiel EN | Beispiel DE |
|---------|-------------|-------------|
| **Seiten-Titel** | Create Payment | Zahlung erstellen |
| **Beschreibungen** | Creates a new payment | Erstellt eine neue Zahlung |
| **Parameter-Beschreibungen** | Amount in cents | Betrag in Cent |
| **Fehlermeldungen** | Invalid API key | Ungültiger API-Key |
| **UI-Labels** | Submit | Absenden |
| **Navigation** | Getting Started | Erste Schritte |

### 4.3 Code-Kommentare

**Übersetzung von Code-Kommentaren:**

```javascript
// EN (Source)
const payment = await cargobit.payments.create({
  amount: 1000,       // Amount in cents
  currency: 'eur',    // Three-letter currency code
  customer: 'cus_123' // Customer ID
});

// DE (Translated)
const payment = await cargobit.payments.create({
  amount: 1000,       // Betrag in Cent
  currency: 'eur',    // Dreistelliger Währungscode
  customer: 'cus_123' // Kunden-ID
});
```

### 4.4 Regionale Formatierung

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Regional Formatting                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Datum:                                                                 │
│   ──────                                                                 │
│   EN: January 15, 2024                                                   │
│   DE: 15. Januar 2024                                                    │
│   FR: 15 janvier 2024                                                    │
│   ES: 15 de enero de 2024                                                │
│                                                                           │
│   Zahlen:                                                                │
│   ───────                                                                │
│   EN: 1,234.56                                                          │
│   DE: 1.234,56                                                          │
│   FR: 1 234,56                                                          │
│   ES: 1.234,56                                                          │
│                                                                           │
│   Währung:                                                               │
│   ────────                                                               │
│   EN: €1,234.56                                                         │
│   DE: 1.234,56 €                                                        │
│   FR: 1 234,56 €                                                        │
│   ES: 1.234,56 €                                                        │
│                                                                           │
│   Zeit:                                                                  │
│   ─────                                                                  │
│   EN: 2:30 PM                                                           │
│   DE: 14:30 Uhr                                                         │
│   FR: 14h30                                                             │
│   ES: 14:30                                                             │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Glossar-Management

### 5.1 Zentrales Glossar

| Begriff EN | Begriff DE | Begriff FR | Begriff ES | Definition |
|------------|------------|------------|------------|------------|
| Payment | Zahlung | Paiement | Pago | A financial transaction |
| Webhook | Webhook | Webhook | Webhook | HTTP callback for events |
| API Key | API-Key | Clé API | Clave API | Authentication credential |
| Idempotency Key | Idempotency-Key | Clé d'idempotence | Clave de idempotencia | Unique request identifier |
| Sandbox | Sandbox | Sandbox | Sandbox | Test environment |

### 5.2 Glossar-Regeln

1. **Jeder Fachbegriff** muss im Glossar definiert sein
2. **Konsistente Übersetzung** über alle Seiten hinweg
3. **Keine Erfindung** neuer Begriffe ohne Abstimmung
4. **Regelmäßige Updates** bei neuen Features

---

## 6. Sprachauswahl-UI

### 6.1 Language Switcher

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Language Switcher                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Desktop (Navigation):                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Docs  API  Guides  Tools              [Search...]    EN ▼       │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│   Dropdown:                                                              │
│   ┌─────────────┐                                                        │
│   │ ✓ English   │                                                        │
│   │   Deutsch   │                                                        │
│   │   Français  │                                                        │
│   │   Español   │                                                        │
│   └─────────────┘                                                        │
│                                                                           │
│   Mobile (Settings):                                                     │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Language:                                                        │   │
│   │ [English ▼]                                                      │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Automatische Spracherkennung

```javascript
// Spracherkennung basierend auf:
// 1. URL-Präfix (/de/docs)
// 2. Cookie (user-preference)
// 3. Browser-Sprache (Accept-Language)
// 4. IP-Geolocation (Fallback)

function detectLanguage(request) {
  // 1. Check URL
  const urlLocale = extractLocaleFromUrl(request.url);
  if (urlLocale) return urlLocale;
  
  // 2. Check Cookie
  const cookieLocale = request.cookies.get('locale');
  if (cookieLocale) return cookieLocale;
  
  // 3. Check Browser Language
  const browserLocale = getBrowserLocale(request.headers);
  if (browserLocale) return browserLocale;
  
  // 4. Default
  return 'en';
}
```

---

## 7. SEO für Mehrsprachigkeit

### 7.1 Hreflang-Tags

```html
<link rel="alternate" hreflang="en" href="https://cargobit.dev/docs/payments" />
<link rel="alternate" hreflang="de" href="https://cargobit.dev/de/docs/payments" />
<link rel="alternate" hreflang="fr" href="https://cargobit.dev/fr/docs/payments" />
<link rel="alternate" hreflang="es" href="https://cargobit.dev/es/docs/payments" />
<link rel="alternate" hreflang="x-default" href="https://cargobit.dev/docs/payments" />
```

### 7.2 Sprachspezifische Sitemaps

```xml
<!-- sitemap-de.xml -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://cargobit.dev/de/docs/payments</loc>
    <xhtml:link rel="alternate" hreflang="en" href="https://cargobit.dev/docs/payments"/>
    <xhtml:link rel="alternate" hreflang="de" href="https://cargobit.dev/de/docs/payments"/>
    <xhtml:link rel="alternate" hreflang="fr" href="https://cargobit.dev/fr/docs/payments"/>
  </url>
</urlset>
```

---

## 8. Qualitätssicherung

### 8.1 Automatisierte Tests

```javascript
// i18n Test Suite
describe('i18n Tests', () => {
  it('should have all keys translated', () => {
    const enKeys = Object.keys(enTranslations);
    const deKeys = Object.keys(deTranslations);
    
    enKeys.forEach(key => {
      expect(deKeys).toContain(key);
    });
  });
  
  it('should not have untranslated strings', () => {
    const untranslated = findUntranslatedStrings(deTranslations);
    expect(untranslated).toHaveLength(0);
  });
  
  it('should preserve markdown formatting', () => {
    const formatted = renderMarkdown(deTranslations.guide);
    expect(formatted).toBeValidMarkdown();
  });
});
```

### 8.2 Kontinuierliche Überprüfung

| Prüfung | Häufigkeit | Tool |
|---------|------------|------|
| **Missing Translations** | Bei jedem Commit | CI/CD |
| **Format Validation** | Bei jedem Commit | ESLint Plugin |
| **Link Checking** | Täglich | Link Checker |
| **Glossar Compliance** | Wöchentlich | Custom Script |

---

## 9. Rollout-Plan

### 9.1 Phasen

| Phase | Sprachen | Zeitrahmen | Meilenstein |
|-------|----------|------------|-------------|
| **1** | EN (Default) | Monat 0 | Basis-Portal |
| **2** | EN + DE | Monat 3 | DACH-Markt |
| **3** | EN + DE + FR | Monat 6 | EU-Erweiterung |
| **4** | EN + DE + FR + ES | Monat 9 | LatAm-Vorbereitung |
| **5** | + PT | Monat 12 | Brasilien |
| **6** | + JA | Monat 15 | Japan |
| **7** | + ZH | Monat 18 | China |

### 9.2 Erfolgs-Metriken

| Metrik | Ziel |
|--------|------|
| **Übersetzungsabdeckung** | 100% der Core-Dokumentation |
| **Zeit bis Übersetzung** | < 2 Wochen nach englischem Update |
| **Fehlerquote** | < 1% kritische Fehler |
| **Benutzerzufriedenheit** | > 90% positive Bewertungen |

---

*Dieses Internationalisierungs-Konzept ermöglicht eine globale Reichweite des CargoBit Developer Portals bei gleichbleibender technischer Qualität.*
