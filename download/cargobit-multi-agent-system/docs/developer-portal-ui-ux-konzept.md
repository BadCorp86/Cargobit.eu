# CargoBit Developer Portal – UI/UX Konzept

**Dokument-Typ:** UX-Design-Spezifikation  
**Version:** 1.0.0  
**Status:** Final  
**Letzte Aktualisierung:** 2024-01-15  
**Verantwortlich:** UX Team  

---

## Inhaltsverzeichnis

1. [UX-Grundprinzipien](#1-ux-grundprinzipien)
2. [Zielgruppen-Personas](#2-zielgruppen-personas)
3. [Informationsarchitektur (IA)](#3-informationsarchitektur-ia)
4. [Navigationskonzept](#4-navigationskonzept)
5. [Page Templates](#5-page-templates-ui-layouts)
6. [Interaktionsdesign](#6-interaktionsdesign-flows)
7. [UI-Designsystem](#7-ui-designsystem)
8. [Such- und Discovery-Konzept](#8-such--und-discovery-konzept)
9. [Barrierefreiheit (A11y)](#9-barrierefreiheit-a11y)
10. [Mobile UX](#10-mobile-ux)
11. [Branding & Trust](#11-branding--trust)
12. [Onboarding-Flow](#12-onboarding-flow)
13. [Implementierungs-Roadmap](#13-implementierungs-roadmap)

---

## 1. UX-Grundprinzipien

Das Portal folgt sechs zentralen Prinzipien, die alle Design-Entscheidungen leiten. Diese Prinzipien stellen sicher, dass das Portal sowohl für neue Partner als auch für erfahrene Entwickler eine optimale Erfahrung bietet.

### 1.1 Clarity First

Alles muss sofort verständlich sein. Keine versteckten Funktionen, keine unnötigen Klicks. Jedes Element auf der Seite muss eine klare Purpose haben und für den Nutzer sofort erkennbar sein. Dies bedeutet:

- Klare, prägnante Labels für alle Interaktionselemente
- Konsistente Platzierung von Navigationselementen
- Visuelle Hierarchie, die wichtige Informationen hervorhebt
- Vermeidung von Jargon, wo immer möglich, oder Bereitstellung von Tooltips für technische Begriffe

### 1.2 Zero-Friction Onboarding

Ein Partner soll in **10 Minuten** seine erste API-Anfrage senden können. Das Onboarding ist so gestaltet, dass es keine unnötigen Hürden gibt. Der Prozess umfasst:

- Sofortige Sandbox-Key-Generierung ohne komplexe Registrierung
- Vorkonfigurierte Beispiel-Requests für jeden Endpunkt
- Automatische Weiterleitung zum API Explorer nach der Registrierung
- Schritt-für-Schritt-Anleitungen, die inline angezeigt werden

### 1.3 Documentation as Navigation

Dokumentation ist nicht "Text", sondern **Interaktion**. Anstatt lange Texte zu lesen, können Entwickler direkt mit der Dokumentation interagieren:

- Klickbare Code-Beispiele, die direkt im API Explorer ausgeführt werden können
- Inline-Validierung von Request-Parametern
- Live-Vorschau von Responses basierend auf eingegebenen Parametern
- Hover-Tooltips mit zusätzlichen Informationen zu Feldern

### 1.4 Tools-First Experience

API Explorer, Webhook Simulator, Schema Viewer stehen im Zentrum der Erfahrung. Diese Tools sind nicht versteckt in Untermenüs, sondern prominent platziert und sofort zugänglich:

- API Explorer ist direkt von jeder API-Referenzseite aus erreichbar
- Webhook Simulator ist in die Webhook-Dokumentation integriert
- Schema Viewer zeigt Live-Daten aus der Sandbox-Umgebung

### 1.5 Progressive Disclosure

Anfänger sehen nur das Nötigste. Experten finden alles. Das Portal passt sich an den Erfahrungsgrad des Nutzers an:

- Standardansicht zeigt die wichtigsten Informationen
- "Advanced Options" klappen zusätzliche Optionen auf
- Power-User können einen "Expert Mode" aktivieren
- Häufig genutzte Funktionen werden bevorzugt angezeigt

### 1.6 Enterprise-Grade Trust

Sicherheit, Compliance, Stabilität müssen visuell spürbar sein. Das Design vermittelt Vertrauen und Professionalität:

- Klare Anzeigen von Security-Status und Zertifikaten
- Compliance-Badges prominent platziert
- Status-Indikatoren für System-Gesundheit
- Transparente Anzeige von SLA-Einhaltung

---

## 2. Zielgruppen-Personas

Das Portal bedient vier primäre Zielgruppen mit unterschiedlichen Bedürfnissen und Erwartungen. Jede Persona hat spezifische User Journeys, die bei der Gestaltung berücksichtigt werden.

### 2.1 Persona A — Partner Developer

**Profil:**
- Rolle: Softwareentwickler bei einem Partnerunternehmen
- Erfahrung: Variiert von Junior bis Senior
- Ziele: Schnell integrieren, erste API-Anfragen senden, Fehler debuggen
- Erwartet: API-Explorer, Code-Beispiele in verschiedenen Sprachen, klare Fehlercodes
- Zeitrahmen: Möchte so schnell wie möglich Ergebnisse sehen

**Hauptbedürfnisse:**
- Schneller Zugriff auf API-Dokumentation
- Copy-Paste-fertige Code-Beispiele
- Klare, handlungsrelevante Fehlermeldungen
- Sandbox-Umgebung zum Testen

**User Journey:**
1. Registrierung und Sandbox-Key-Generierung
2. Erste API-Anfrage mit Beispiel-Code
3. Integration in eigene Anwendung
4. Webhook-Setup und Test
5. Go-Live mit Produktions-Keys

### 2.2 Persona B — Internal Engineer

**Profil:**
- Rolle: Interner Entwickler bei CargoBit
- Erfahrung: Senior-Level mit tiefem Systemverständnis
- Ziele: Architektur verstehen, Debugging, Performance-Analyse
- Erwartet: Deep Dives, Architekturdiagramme, Schema Viewer
- Zeitrahmen: Arbeitet langfristig am System

**Hauptbedürfnisse:**
- Detaillierte Architekturdokumentation
- Datenbankschemas und ER-Diagramme
- Interne API-Endpunkte und Services
- Performance-Metriken und Debugging-Tools

**User Journey:**
1. Suche nach spezifischen Architekturdetails
2. Analyse von Datenmodellen
3. Debugging von produktionsproblemen
4. Dokumentation von Änderungen

### 2.3 Persona C — Auditor / Compliance

**Profil:**
- Rolle: Externer oder interner Auditor
- Erfahrung: Compliance-Experte, nicht zwingend technisch
- Ziele: Nachvollziehbarkeit, Compliance-Prüfung
- Erwartet: Audit Logs, Policies, Retention Matrix, GDPR-Dokumentation
- Zeitrahmen: Periodische Audits

**Hauptbedürfnisse:**
- Klare Dokumentation aller Compliance-Maßnahmen
- Audit-Logs mit langem Aufbewahrungszeitraum
- Policies und Procedures
- Zertifikate und Nachweise

**User Journey:**
1. Zugriff auf Compliance-Dokumentation
2. Prüfung von Policies
3. Stichproben von Audit-Logs
4. Erstellung von Audit-Berichten

### 2.4 Persona D — SRE / Ops

**Profil:**
- Rolle: Site Reliability Engineer oder Operations-Spezialist
- Erfahrung: Senior-Level mit Fokus auf Betrieb und Stabilität
- Ziele: Betrieb sicherstellen, Incident Response, Monitoring
- Erwartet: Monitoring-Dashboards, Playbooks, Backup/Restore-Prozesse
- Zeitrahmen: Kontinuierliche Überwachung

**Hauptbedürfnisse:**
- Echtzeit-Systemstatus
- Runbooks für Incident Response
- Backup- und Restore-Prozesse
- Kapazitätsplanung und Metriken

**User Journey:**
1. Überwachung der Systemgesundheit
2. Reaktion auf Incidents
3. Durchführung von Wartungsarbeiten
4. Post-Incident-Analyse

---

## 3. Informationsarchitektur (IA)

Die Informationsarchitektur basiert auf **User-Intent**, nicht auf internen Systemstrukturen. Dies stellt sicher, dass Nutzer Informationen dort finden, wo sie sie erwarten.

### 3.1 Top-Level Kategorien

Die Hauptnavigation gliedert sich in zwölf Top-Level-Kategorien, die alle Nutzerbedürfnisse abdecken:

| Kategorie | Beschreibung | Primäre Persona |
|-----------|--------------|-----------------|
| **Getting Started** | Erste Schritte, Quickstart, Sandbox | Partner Developer |
| **API Reference** | Vollständige API-Dokumentation | Partner Developer |
| **Guides** | Schritt-für-Schritt-Anleitungen | Alle |
| **Tools** | API Explorer, Simulator, Viewer | Partner Developer, Internal |
| **Architecture** | Systemarchitektur, Diagramme | Internal Engineer |
| **Security** | Sicherheitsrichtlinien | Alle |
| **Compliance** | GDPR, Policies, Audits | Auditor |
| **Operations** | Monitoring, Playbooks | SRE/Ops |
| **Partner** | Partner-spezifische Ressourcen | Partner Developer |
| **Knowledge Base** | FAQ, Glossar, How-To | Alle |
| **Changelog** | Updates und Änderungen | Alle |
| **Support** | Hilfe und Kontakt | Alle |

### 3.2 Sub-Level Struktur

Jede Top-Level-Kategorie hat eine konsistente Sub-Level-Struktur:

**Beispiel: API Reference**
```
API Reference
├── Payments API
│   ├── POST /payments
│   ├── GET /payments/{id}
│   └── Fehlercodes
├── Wallet API
│   ├── GET /wallets/{id}
│   └── POST /wallets/{id}/adjust
├── Webhook API
│   ├── POST /webhooks/stripe
│   └── Eventtypen
├── Common Concepts
│   ├── Idempotency Keys
│   ├── Rate Limits
│   ├── Pagination
│   ├── Filtering
│   └── Sorting
└── Error Reference
    ├── Fehlerkategorien
    └── Fehlercodes
```

### 3.3 Cross-Linking Strategie

Um die Navigation zu erleichtern, sind alle Dokumente intelligent miteinander verknüpft:

- **Related Content:** Am Ende jeder Seite werden verwandte Dokumente vorgeschlagen
- **Inline Links:** Technische Begriffe verlinken direkt zur entsprechenden Dokumentation
- **Contextual Help:** Kontextsensitive Hilfe in Form von Tooltips und Sidebars
- **Breadcrumbs:** Klare Navigationpfade auf jeder Seite

---

## 4. Navigationskonzept

Das Navigationssystem besteht aus mehreren Ebenen, die zusammen eine intuitive und effiziente Navigation ermöglichen.

### 4.1 Global Navigation (Top Bar)

Die globale Navigation ist auf allen Seiten sichtbar und ermöglicht den schnellen Zugriff auf die wichtigsten Bereiche:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo]  Getting Started  API Reference  Tools  Guides  Architecture        │
│                                                                             │
│                                    [🔍 Search...]  [Login] [API Keys]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elemente:**
- **Logo:** Klickbar, führt zur Homepage
- **Hauptnavigation:** Horizontale Liste der primären Kategorien
- **Suchfeld:** Zentral platziert, immer sichtbar
- **Login/API Keys:** Schnellzugriff auf Account-Funktionen

### 4.2 Left Sidebar Navigation (Contextual)

Die linke Sidebar ist kontextabhängig und zeigt die Struktur des aktuellen Bereichs:

**API Reference Sidebar:**
```
┌─────────────────────┐
│ API Reference       │
├─────────────────────┤
│ ▼ Payments API      │
│   POST /payments    │
│   GET /payments     │
│   Errors            │
│ ▼ Wallet API        │
│ ▼ Webhook API       │
│ ▼ Common Concepts   │
│ ▼ Error Reference   │
└─────────────────────┘
```

**Features:**
- Expandable/Collapsible Sections
- Visuelle Markierung der aktuellen Seite
- Scroll-to-View für lange Listen
- Sticky Position beim Scrollen

### 4.3 Breadcrumbs

Breadcrumbs zeigen den aktuellen Navigationspfad und ermöglichen schnelle Navigation zurück:

```
API Reference > Payments API > POST /payments
```

**UX-Features:**
- Klickbar auf jeder Ebene
- Visuelle Trennung mit ">" oder "/"
- Truncation für tiefe Hierarchien
- Hover-Effekt für Interaktivität

### 4.4 Footer Navigation

Der Footer bietet Zugriff auf wichtige Links und Informationen:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Legal          Security       Status Page     Contact       Changelog    │
│  Privacy        Compliance     Incident        Support       Blog         │
│  Terms          GDPR           Status          Feedback       Docs         │
│                                                                             │
│  © 2024 CargoBit. All rights reserved.                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Mobile Navigation

Auf mobilen Geräten wird die Navigation optimiert:

- **Hamburger Menu:** Ersetzt die horizontale Navigation
- **Collapsible Sidebar:** Wird bei Bedarf eingeblendet
- **Sticky Search Bar:** Immer oben sichtbar
- **Bottom Navigation:** Schnellzugriff auf häufig genutzte Bereiche

---

## 5. Page Templates (UI-Layouts)

Das Portal verwendet vier primäre Page Templates, die je nach Inhaltstyp eingesetzt werden.

### 5.1 Template 1 — Documentation Page

**Verwendung:** Guides, Deep Dives, Policies, alle textlastigen Inhalte

**Layout-Struktur:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Global Navigation                                                           │
├──────────────┬──────────────────────────────────┬───────────────────────────┤
│              │                                  │                           │
│  Left        │        Main Content              │    Right Sidebar          │
│  Sidebar     │                                  │                           │
│              │  ┌────────────────────────────┐  │  Table of Contents        │
│  Navigation  │  │ Title                      │  │                           │
│              │  │                            │  │  - Section 1              │
│  ├─ Item 1   │  │ Content...                 │  │  - Section 2              │
│  ├─ Item 2   │  │                            │  │  - Section 3              │
│  └─ Item 3   │  │ Code Block                 │  │                           │
│              │  │ ```                        │  │  Quick Links              │
│              │  │ // code                    │  │  - Related Docs           │
│              │  │ ```                        │  │  - API Reference          │
│              │  │                            │  │  - Tools                  │
│              │  └────────────────────────────┘  │                           │
│              │                                  │                           │
├──────────────┴──────────────────────────────────┴───────────────────────────┤
│ Footer                                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key UX-Elemente:**

| Element | Beschreibung | Implementierung |
|---------|--------------|-----------------|
| Code-Snippets | Syntax-Highlighting mit Copy-Button | Prism.js / highlight.js |
| Inline-Hinweise | Warnings, Notes, Tips mit Icons | Color-coded Boxes |
| Diagramm-Container | Mermaid, SVG, Interactive | Responsive Scaling |
| Related Content | Vorschläge am Ende der Seite | Algorithm-basiert |

### 5.2 Template 2 — API Reference Page

**Verwendung:** Endpunkt-Dokumentation mit interaktiven Features

**Layout-Struktur:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Global Navigation                                                           │
├──────────────┬──────────────────────────────────┬───────────────────────────┤
│              │                                  │                           │
│  Left        │        Main Content              │    Request Builder        │
│  Sidebar     │                                  │                           │
│              │  POST /payments                  │  Environment: [Sandbox ▼] │
│  API         │  ────────────────────            │                           │
│  Reference   │                                  │  Request Body             │
│              │  Description                     │  ┌─────────────────────┐   │
│  ├─ Payments │                                  │  │ {                   │   │
│  ├─ Wallets  │  Parameters                      │  │   "amount": 1000    │   │
│  ├─ Webhooks │  ┌──────────────────────────┐    │  │ }                   │   │
│  └─ Errors   │  │ Name  │ Type │ Required │    │  └─────────────────────┘   │
│              │  ├──────┼──────┼──────────┤    │                           │
│              │  │ ...   │ ...  │ ...      │    │  [Send Request]           │
│              │  └──────────────────────────┘    │                           │
│              │                                  │  Response                 │
│              │  Request Example                 │  ┌─────────────────────┐   │
│              │  ```json                        │  │ 200 OK               │   │
│              │  { ... }                        │  │ { "id": "..."}       │   │
│              │  ```                            │  └─────────────────────┘   │
│              │                                  │                           │
├──────────────┴──────────────────────────────────┴───────────────────────────┤
│ Footer                                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Live API Explorer mit Editierfunktion
- Auto-generierte Beispiele in mehreren Sprachen
- Schema-Inspector mit expandierbaren Feldern
- Error-Preview mit möglichen Fehlercodes
- Request-History für angemeldete Nutzer

### 5.3 Template 3 — Tool Page

**Verwendung:** API Explorer, Webhook Simulator, Schema Viewer

**Layout-Struktur:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Global Navigation                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  [API Explorer] [Webhook Simulator] [Schema Viewer] [Event Replay]   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │                     Tool Content Area                                 │  │
│  │                                                                       │  │
│  │  (Full-Width, maximiert für Interaktion)                              │  │
│  │                                                                       │  │
│  │                                                                       │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Footer                                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Full-Width Layout für maximale Arbeitsfläche
- Tabs für verschiedene Modi
- Live Console Output mit Syntax-Highlighting
- Speichern/Laden von Konfigurationen
- Export-Funktionalität

### 5.4 Template 4 — Dashboard Page

**Verwendung:** Partner-Übersicht, Usage-Statistiken, Status

**Layout-Struktur:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Global Navigation                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Welcome, [Partner Name]                    [View Account] [Settings]       │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ API Usage    │ │ Webhook      │ │ Error Rate   │ │ Events       │       │
│  │              │ │ Delivery     │ │              │ │ Today        │       │
│  │   12,453     │ │   99.8%      │ │   0.02%      │ │   1,234      │       │
│  │   requests   │ │              │ │              │ │              │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Usage Graph (Last 7 Days)                                            │  │
│  │                                                                       │  │
│  │  [Chart Area]                                                         │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────┐ ┌─────────────────────────────────────┐   │
│  │ Recent Events               │ │ Quick Actions                        │   │
│  │                             │ │                                      │   │
│  │ • payment.created           │ │ [New API Key] [View Docs] [Support] │   │
│  │ • webhook.delivered         │ │                                      │   │
│  │ • ...                       │ │                                      │   │
│  └─────────────────────────────┘ └─────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Footer                                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Widgets:**
- API Usage mit Trend-Indikator
- Webhook Delivery Rate mit Status
- Error Rate mit Drilldown
- Recent Events Liste
- Quick Actions Panel

---

## 6. Interaktionsdesign (Flows)

Die folgenden User Flows beschreiben die wichtigsten Interaktionspfade durch das Portal.

### 6.1 Flow 1 — First API Call

Dieser Flow führt einen neuen Partner von der Registrierung bis zum ersten erfolgreichen API-Aufruf.

**Flow-Diagramm:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Start     │────▶│  Register   │────▶│ Generate    │────▶│  Copy       │
│             │     │             │     │ Sandbox Key │     │ Example     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                  │
                                                                  ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Success    │◀────│  View       │◀────│  Receive    │◀────│  Execute    │
│  Message    │     │  Response   │     │  Response   │     │  Request    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

**Detaillierte Schritte:**

| Schritt | Aktion | Bildschirm | Dauer |
|---------|--------|------------|-------|
| 1 | User klickt "Getting Started" | Homepage | < 5s |
| 2 | Sandbox Key generieren | Registration | < 30s |
| 3 | Beispiel-Request kopieren | Quickstart | < 10s |
| 4 | API Explorer öffnet sich | API Explorer | Automatisch |
| 5 | Request ausführen | API Explorer | < 5s |
| 6 | Response erscheint | API Explorer | Sofort |
| 7 | Weiterleitung zu "Webhook Setup" | Guides | Automatisch |

**Ziel:** Erfolgserlebnis in < 10 Minuten.

**UX-Optimierungen:**
- Vorausgefüllte Request-Beispiele
- Ein-Klick-Ausführung
- Erfolgsmeldung mit Konfetti-Animation
- Klare nächste Schritte

### 6.2 Flow 2 — Webhook Debugging

Dieser Flow hilft Partnern bei der Diagnose und Lösung von Webhook-Problemen.

**Flow-Diagramm:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Open       │────▶│  Select     │────▶│  Send       │────▶│  View       │
│  Simulator  │     │  Event      │     │  Event      │     │  Signature  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                  │
                                                                  ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Replay     │◀────│  View       │◀────│  Check      │◀────│  View       │
│  Event      │     │  Solution   │     │  Status     │     │  Raw Body   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

**Detaillierte Schritte:**

| Schritt | Aktion | Anzeige |
|---------|--------|---------|
| 1 | User öffnet Webhook Simulator | Tool Page |
| 2 | Wählt Event-Typ aus Dropdown | Event-Liste |
| 3 | Sendet Event an konfigurierte URL | Loading State |
| 4 | Portal zeigt Signature | Signature Details |
| 5 | Portal zeigt Raw Body | Formatted JSON |
| 6 | Portal zeigt Delivery Status | Success/Error |
| 7 | Portal zeigt Replay-Check | Validation Result |
| 8 | User kann Event erneut senden | Replay Button |

### 6.3 Flow 3 — Fehleranalyse

Dieser Flow führt Entwickler von einem Fehler zur Lösung.

**Flow-Diagramm:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  View       │────▶│  Click      │────▶│  View       │────▶│  View       │
│  Dashboard  │     │  Error      │     │  Error      │     │  Causes     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                  │
                                                                  ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Resolve    │◀────│  View       │◀────│  View       │◀────│  View       │
│  Issue      │     │  Related    │     │  Examples   │     │  Solutions  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

**Detaillierte Schritte:**

| Schritt | Aktion | Kontext |
|---------|--------|---------|
| 1 | User sieht Fehler im Dashboard | Widget/Error List |
| 2 | Klickt auf Fehlercode | Navigation |
| 3 | Portal öffnet Error Reference | Dokumentation |
| 4 | Portal zeigt mögliche Ursachen | Ursachen-Liste |
| 5 | Portal zeigt Lösungsschritte | Schritt-für-Schritt |
| 6 | Portal zeigt verwandte Dokumente | Links |

---

## 7. UI-Designsystem

Das Designsystem stellt Konsistenz über alle Seiten sicher und ermöglicht eine effiziente Entwicklung.

### 7.1 Farben

Die Farbpalette wurde für maximale Lesbarkeit und professionelles Auftreten entwickelt:

**Primärfarben:**
| Name | Hex-Code | Verwendung |
|------|----------|------------|
| CargoBit Blue | #0057FF | Primary Actions, Links |
| CargoBit Navy | #0A1A2F | Headers, Dark Backgrounds |
| CargoBit Teal | #00C2A8 | Accents, Success Indicators |
| CargoBit Grey | #F4F6F8 | Surfaces, Backgrounds |

**Sekundärfarben:**
| Name | Hex-Code | Verwendung |
|------|----------|------------|
| CargoBit Red | #FF3B30 | Errors, Critical Alerts |
| CargoBit Orange | #FF9500 | Warnings |
| CargoBit Green | #34C759 | Success, Confirmations |
| CargoBit Purple | #AF52DE | Special Highlights |

**Graustufen:**
| Name | Hex-Code | Verwendung |
|------|----------|------------|
| Grey 900 | #1C1C1E | Primary Text |
| Grey 700 | #3A3A3C | Secondary Text |
| Grey 500 | #636366 | Disabled, Placeholders |
| Grey 300 | #C7C7CC | Borders |
| Grey 100 | #F2F2F7 | Light Backgrounds |

### 7.2 Typografie

**Font-Familie:** Inter oder IBM Plex Sans

**Hierarchie:**
| Level | Größe | Gewicht | Zeilenhöhe | Verwendung |
|-------|-------|---------|------------|------------|
| H1 | 32px | 700 | 1.2 | Seitentitel |
| H2 | 24px | 600 | 1.3 | Section-Titel |
| H3 | 20px | 600 | 1.4 | Subsection-Titel |
| H4 | 18px | 500 | 1.4 | Card-Titel |
| Body Large | 18px | 400 | 1.6 | Lead Paragraphs |
| Body | 16px | 400 | 1.6 | Fließtext |
| Body Small | 14px | 400 | 1.5 | Metadaten, Captions |
| Code | 14px | 400 | 1.5 | Inline Code, Code Blöcke |

**Code-Font:** JetBrains Mono oder Fira Code (Monospace)

### 7.3 Komponenten

Die Komponentenbibliothek umfasst alle wiederverwendbaren UI-Elemente:

**Navigation Components:**
- Tabs (Horizontal, Vertical)
- Breadcrumbs
- Sidebar Navigation
- Footer Links

**Content Components:**
- Cards (Default, Highlighted, Interactive)
- Tables (Sortable, Filterable, Paginated)
- Lists (Bullet, Numbered, Icon)
- Accordions

**Code Components:**
- Code Blocks (mit Syntax Highlighting)
- Inline Code
- Copy Button
- Language Selector

**Feedback Components:**
- Alerts (Info, Warning, Error, Success)
- Toasts
- Progress Indicators
- Skeleton Loaders

**Form Components:**
- Input Fields
- Select Dropdowns
- Checkboxes
- Radio Buttons
- Toggle Switches

**Miscellaneous:**
- Badges
- Tags
- Tooltips
- Modals
- Drawers

### 7.4 Spacing & Grid

**Grid System:**
- 12-Column Grid
- 24px Gutter Width
- 8px Base Unit

**Spacing Scale:**
| Name | Wert | Verwendung |
|------|------|------------|
| xs | 4px | Tight Spacing |
| sm | 8px | Default Inline |
| md | 16px | Default Block |
| lg | 24px | Section Spacing |
| xl | 32px | Major Sections |
| 2xl | 48px | Page Sections |

---

## 8. Such- und Discovery-Konzept

Die Suche ist ein zentrales Element des Portals und ermöglicht den schnellen Zugriff auf alle Inhalte.

### 8.1 Global Search

**Platzierung:** Zentral in der Top Bar, immer sichtbar

**Funktionalität:**
- Volltextsuche über alle Dokumente
- API Endpoints
- Tools
- Policies
- Playbooks
- FAQs

**Such-Interface:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Search documentation, APIs, tools...                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Quick Actions                                           │   │
│  │  → Go to API Reference                                   │   │
│  │  → Open Webhook Simulator                                │   │
│  │  → View System Status                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Recent Searches                         Clear History          │
│  • payment creation                                          │
│  • webhook signature                                         │
│  • error codes                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Smart Suggestions

**Features:**
- "Meinten Sie…?" für Tippfehler
- "Beliebte Seiten" basierend auf Analytics
- "Zuletzt angesehen" für angemeldete Nutzer
- Autovervollständigung für API-Endpunkte

### 8.3 Search Filters

**Filter-Kategorien:**
- API (Endpoints, Schemas)
- Guides (Tutorials, How-To)
- Architecture (Diagrams, Deep Dives)
- Compliance (Policies, GDPR)
- Tools (Explorer, Simulator)
- Changelog (Updates, Releases)

**Filter-Interface:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Search Results for "payment"                                   │
│                                                                 │
│  Filter: [All] [API] [Guides] [Architecture] [Compliance]      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ API Reference                                           │   │
│  │ POST /payments                                          │   │
│  │ Create a new payment...                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Guide                                                   │   │
│  │ Getting Started with Payments                           │   │
│  │ Learn how to create your first payment...               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Barrierefreiheit (A11y)

Das Portal erfüllt die WCAG 2.1 AA Standards und ist für alle Nutzer zugänglich.

### 9.1 Kontrast & Farben

- Mindestens 4.5:1 Kontrastverhältnis für normalen Text
- Mindestens 3:1 für großen Text
- Farbliche Informationen werden immer durch Text oder Icons ergänzt
- Dark Mode mit angepassten Kontrastwerten

### 9.2 Tastaturnavigation

- Alle interaktiven Elemente sind per Tab erreichbar
- Logische Tab-Reihenfolge
- Sichtbare Fokus-Indikatoren
- Skip-to-Content Links
- Keyboard Shortcuts für Power-User

### 9.3 Screenreader-Unterstützung

- Semantisches HTML
- ARIA-Labels für komplexe Komponenten
- Alt-Texte für alle Bilder
- Live Regions für dynamische Inhalte
- Ankündigungen für Status-Änderungen

### 9.4 Weitere A11y-Features

- Skalierbare Schriftgrößen
- Keine Zeitlimits für Interaktionen
- Klare Error-Identification
- Konsistente Navigation

---

## 10. Mobile UX

Das Portal ist vollständig responsive und für mobile Geräte optimiert.

### 10.1 Responsive Breakpoints

| Breakpoint | Breite | Geräte |
|------------|--------|--------|
| Mobile | < 640px | Smartphones |
| Tablet | 640px - 1024px | Tablets |
| Desktop | > 1024px | Laptops, Desktops |

### 10.2 Mobile Anpassungen

**Navigation:**
- Collapsible Sidebar (Hamburger Menu)
- Sticky Search Bar
- Bottom Navigation für häufige Aktionen

**Content:**
- Single-Column Layout
- Horizontal scrollbare Code-Blöcke
- Vereinfachte Tabellen (Cards statt Tables)

**Tools:**
- "Compact Mode" für API Explorer
- Reduzierte Optionen für Simulator
- Optimized Touch Targets (min. 44px)

### 10.3 Touch-Optimierung

- Ausreichend große Touch-Targets
- Swipe-Gesten für Navigation
- Pull-to-Refresh wo sinnvoll
- Optimierter Touch-Scroll

---

## 11. Branding & Trust

Das Design vermittelt Vertrauen und Professionalität.

### 11.1 Visuelle Identität

- Klarer, professioneller Look
- Konsistente Farb- und Typografie-Nutzung
- Subtile Animationen für Übergänge
- Hochwertige Icons und Illustrationen

### 11.2 Trust-Elemente

- Compliance-Badges (GDPR, SOC2)
- Security-Status-Indikatoren
- Uptime-Statistiken
- Partner-Testimonials
- Certifications-Section

### 11.3 Tone-of-Voice

- Professionell aber zugänglich
- Präzise und klar
- Kein unnötiger Jargon
- Hilfsbereit und proaktiv

---

## 12. Onboarding-Flow

Das Onboarding ist so gestaltet, dass neue Partner schnell erfolgreich werden.

### 12.1 Onboarding-Steps

| Schritt | Inhalt | Dauer |
|---------|--------|-------|
| 1 | Willkommen & Übersicht | 30s |
| 2 | Sandbox-Key generieren | 30s |
| 3 | Erste API-Anfrage | 2min |
| 4 | Webhook-Setup | 2min |
| 5 | Resources entdecken | 2min |

### 12.2 Progress-Indikatoren

- Progress Bar zeigt Fortschritt
- Checkmarks für abgeschlossene Steps
- "Überspringen"-Option für erfahrene Nutzer

### 12.3 Erfolgserlebnisse

- Konfetti-Animation bei erster erfolgreicher API-Anfrage
- Achievement-Badges für Milestones
- "Next Steps"-Empfehlungen

---

## 13. Implementierungs-Roadmap

### 13.1 Phase 1: Foundation (Wochen 1-4)

- Design System aufsetzen
- Core Components entwickeln
- Basis-Templates implementieren
- Responsive Framework

### 13.2 Phase 2: Core Pages (Wochen 5-8)

- Homepage
- API Reference Pages
- Documentation Pages
- Navigation System

### 13.3 Phase 3: Tools & Interactive (Wochen 9-12)

- API Explorer
- Webhook Simulator
- Schema Viewer
- Search System

### 13.4 Phase 4: Polish & Launch (Wochen 13-16)

- Performance-Optimierung
- Accessibility Audit
- User Testing
- Launch

---

## Anhang

### A. Referenzdokumente

- Developer Portal Seitenbaum
- Block 11: Developer Handbook
- Block 23: API Overview
- Block 24: Webhooks Deep Dive

### B. Design-Tools

- Figma für Wireframes und Mockups
- Storybook für Component Library
- Framer für Prototyping

### C. Technologie-Stack

- Next.js für Frontend
- Tailwind CSS für Styling
- Radix UI für Accessibility-Components
- Algolia für Search

---

**Dokument-Ende**

*Dieses UI/UX Konzept bildet die Grundlage für die Entwicklung des CargoBit Developer Portals. Bei Fragen wende dich an das UX Team.*
