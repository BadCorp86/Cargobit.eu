# 🧱 BLOCK N — Vollständiges Designsystem

## CargoBit Developer Portal Design System v1.0

### Design Tokens, Komponenten, Patterns, Layout-Regeln

Das ist das **offizielle CargoBit Designsystem**, wie es in Figma, Code und Dokumentation verwendet wird.

---

## 1. Design Tokens

Design Tokens sind die atomaren Werte, die das gesamte Designsystem antreiben. Sie gewährleisten Konsistenz über alle Plattformen und ermöglichen eine effiziente Wartung und Skalierung des visuellen Erscheinungsbildes.

### **1.1 Farben (Color Tokens)**

Die Farbpalette von CargoBit wurde sorgfältig entwickelt, um professionelle Ästhetik mit optimaler Zugänglichkeit zu kombinieren. Jede Farbe hat eine semantische Bedeutung und wird konsistent über die gesamte Anwendung hinweg eingesetzt.

#### Primärfarben

```
--color-primary: #0057FF;        /* CargoBit Blue - Hauptmarke */
--color-primary-dark: #003FCC;   /* Dunklere Variante für Hover-Zustände */
--color-primary-light: #3380FF; /* Hellere Variante für Subtiles */
```

#### Sekundärfarben

```
--color-secondary: #00C2A8;      /* Teal - Akzentfarbe für Erfolg/Progress */
--color-secondary-dark: #009984; /* Dunklere Variante */
```

#### Hintergrundfarben

```
--color-bg: #0A1A2F;             /* Navy - Dunkler Hintergrund */
--color-surface: #F4F6F8;        /* Helles Surface für Cards/Panels */
--color-surface-elevated: #FFFFFF; /* Elevated surfaces */
```

#### Rahmenfarben

```
--color-border: #E0E4E8;         /* Standardrahmen */
--color-border-light: #F0F2F4;   /* Subtile Rahmen */
--color-border-focus: #0057FF;   /* Fokuszustand */
```

#### Textfarben

```
--color-text: #1A1A1A;           /* Primärtext */
--color-text-light: #6A6A6A;     /* Sekundärtext */
--color-text-muted: #9A9A9A;     /* Tertiärtext/Hinweise */
--color-text-inverse: #FFFFFF;   /* Text auf dunklem Hintergrund */
```

#### Semantische Farben

```
--color-error: #FF3B30;          /* Fehler/Kritisch */
--color-warning: #FFB300;        /* Warnung */
--color-success: #00C853;        /* Erfolg */
--color-info: #0057FF;           /* Information */
```

---

### **1.2 Typografie (Typography Tokens)**

Die Typografie ist ein zentrales Element des CargoBit Brandings. Wir nutzen eine Kombination aus serifenlosen Schriften für allgemeinen Text und einer Monospace-Schrift für Code-Inhalte.

#### Schriftfamilien

```
--font-family-base: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-family-heading: "Inter", sans-serif;
--font-family-mono: "IBM Plex Mono", "JetBrains Mono", "Fira Code", monospace;
```

#### Schriftgrößen

```
--font-size-h1: 32px;     /* Hauptüberschriften */
--font-size-h2: 24px;     /* Sektionsüberschriften */
--font-size-h3: 20px;     /* Untersektionsüberschriften */
--font-size-h4: 18px;     /* Kartenüberschriften */
--font-size-body: 16px;   /* Fließtext */
--font-size-small: 14px;  /* Sekundärer Text */
--font-size-xs: 12px;     /* Captions/Labels */
--font-size-code: 14px;   /* Code-Blöcke */
```

#### Schriftgewichte

```
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

#### Zeilenhöhen

```
--line-height-tight: 1.25;
--line-height-base: 1.5;
--line-height-relaxed: 1.75;
```

---

### **1.3 Spacing (Spacing Tokens)**

Das Spacing-System basiert auf einer 4px-Basiseinheit, die konsistente Abstände über alle Komponenten gewährleistet.

```
--space-xxs: 4px;    /* Minimaler Abstand */
--space-xs: 8px;     /* Kompakter Abstand */
--space-sm: 12px;    /* Kleiner Abstand */
--space-md: 16px;    /* Standardabstand */
--space-lg: 24px;    /* Großer Abstand */
--space-xl: 32px;    /* Extragroßer Abstand */
--space-xxl: 48px;   /* Sektionsabstand */
--space-xxxl: 64px;  /* Hauptsektionsabstand */
```

#### Anwendungsbeispiele

| Token | Verwendung |
|-------|------------|
| `--space-xxs` | Icon-Text-Abstand |
| `--space-xs` | Button-Padding (vertikal) |
| `--space-sm` | Input-Padding |
| `--space-md` | Card-Padding |
| `--space-lg` | Sektions-Padding |
| `--space-xl` | Container-Padding |
| `--space-xxl` | Zwischen Sektionen |

---

### **1.4 Radius (Border Radius Tokens)**

```
--radius-sm: 4px;    /* Subtile Rundung */
--radius-md: 8px;    /* Standard-Rundung */
--radius-lg: 12px;   /* Prominente Rundung */
--radius-xl: 16px;   /* Große Rundung */
--radius-full: 9999px; /* Kreisförmig */
```

---

### **1.5 Shadows (Shadow Tokens)**

Schatten werden verwendet, um Hierarchie und Tiefe zu erzeugen. Wir nutzen ein dreistufiges System.

```
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);       /* Subtile Erhebung */
--shadow-md: 0 2px 6px rgba(0,0,0,0.08);       /* Standard-Erhebung */
--shadow-lg: 0 4px 12px rgba(0,0,0,0.12);      /* Prominente Erhebung */
--shadow-xl: 0 8px 24px rgba(0,0,0,0.16);      /* Modals/Overlays */
--shadow-focus: 0 0 0 3px rgba(0,87,255,0.25); /* Focus-Ring */
```

---

### **1.6 Animation & Transition Tokens**

```
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;
--transition-slower: 500ms ease;

--easing-default: cubic-bezier(0.4, 0, 0.2, 1);
--easing-in: cubic-bezier(0.4, 0, 1, 1);
--easing-out: cubic-bezier(0, 0, 0.2, 1);
--easing-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

---

### **1.7 Z-Index Tokens**

```
--z-index-dropdown: 1000;
--z-index-sticky: 1020;
--z-index-fixed: 1030;
--z-index-modal-backdrop: 1040;
--z-index-modal: 1050;
--z-index-popover: 1060;
--z-index-tooltip: 1070;
--z-index-toast: 1080;
```

---

## 2. Komponentenbibliothek (Erweitert)

Die Komponentenbibliothek enthält alle UI-Elemente, die für den Aufbau des Developer Portals benötigt werden. Jede Komponente folgt den Design-Token-Prinzipien und ist für Barrierefreiheit optimiert.

### **2.1 Buttons**

Buttons sind die primären Interaktionselemente. Sie verfügen über verschiedene Varianten und Zustände.

#### Varianten

| Variante | Verwendung | Design |
|----------|------------|--------|
| **Primary** | Hauptaktionen | Solid Blue Background |
| **Secondary** | Nebenkationen | Outlined Border |
| **Ghost** | Tertiäre Aktionen | Transparent Background |
| **Danger** | Destructive Aktionen | Solid Red Background |
| **Link** | Navigation | Text-Only mit Unterstreichung bei Hover |

#### Größen

```
--button-height-sm: 32px;
--button-height-md: 40px;
--button-height-lg: 48px;
```

#### Zustände

- **Default**: Standardzustand
- **Hover**: Leichte Farbaufhellung
- **Active**: Farbabdunklung
- **Focus**: Focus-Ring
- **Loading**: Spinner + deaktivierter Text
- **Disabled**: 50% Opacity, kein Pointer

#### Code-Beispiel (CSS)

```css
.btn-primary {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

.btn-primary:focus {
  box-shadow: var(--shadow-focus);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

### **2.2 Inputs**

Input-Felder sind essenziell für Formulare und Suchfunktionen.

#### Typen

| Typ | Verwendung | Besonderheiten |
|-----|------------|----------------|
| **Text** | Einzeilige Texteingabe | Standard |
| **Number** | Numerische Eingaben | Stepper-Pfeile |
| **JSON Editor** | JSON-Eingaben | Syntax-Highlighting |
| **Search** | Suchfelder | Lupe-Icon |
| **Dropdown** | Auswahlmenüs | Optionsliste |
| **Multi-Select** | Mehrfachauswahl | Tags |

#### Zustände

- **Default**: Rahmen in `--color-border`
- **Focus**: Rahmen in `--color-border-focus`, Focus-Ring
- **Error**: Rahmen in `--color-error`, Fehlermeldung
- **Disabled**: Grauer Hintergrund, kein Input

#### Validierung

```css
.input-error {
  border-color: var(--color-error);
}

.input-error-message {
  color: var(--color-error);
  font-size: var(--font-size-xs);
  margin-top: var(--space-xxs);
}
```

---

### **2.3 Navigation**

#### Top Navigation

Die Top Navigation enthält Logo, Hauptnavigation, Suche und Benutzer-Menü.

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo]  Docs  API  Tools  [Search...]      [Avatar ▼]      │
└─────────────────────────────────────────────────────────────┘
```

#### Sidebar Navigation

Die Sidebar Navigation wird für die Dokumentationsstruktur verwendet.

```
┌────────────────┐
│ Getting Started│
│ ├─ Quick Start │
│ ├─ Concepts    │
│ └─ FAQ         │
│ API Reference  │
│ ├─ Endpoints   │
│ ├─ Webhooks    │
│ └─ Errors      │
│ Tools          │
│ └─ API Explorer│
└────────────────┘
```

#### Breadcrumbs

```
Docs > API Reference > Endpoints > Create Payment
```

#### Tabs

- **Horizontal**: Für Sektionswechsel
- **Vertical**: Für API-Versionsauswahl

---

### **2.4 Content-Komponenten**

#### Cards

Cards sind Container für zusammengehörige Inhalte.

```
┌─────────────────────────────────────┐
│ Title                         [Icon]│
│ Description text goes here...       │
│                                     │
│ [Action Button]                     │
└─────────────────────────────────────┘
```

#### Tables

Sortierbare und filterbare Tabellen für Datendarstellung.

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data     | Data     | Data     |
| Data     | Data     | Data     |

Features:
- Sortable Headers
- Row Hover States
- Pagination
- Column Resizing

#### Accordions

Für FAQ und aufklappbare Inhalte.

```
▼ Section Title
  Content that was hidden...

▶ Collapsed Section
```

#### Alerts

Statusmeldungen mit semantischen Farben.

- **Info**: Blau
- **Success**: Grün
- **Warning**: Orange
- **Error**: Rot

#### Badges

Kleine Labels für Status und Kategorien.

```
[Success] [Beta] [v2.0] [Deprecated]
```

#### Code Blocks

Syntax-gehighlightete Code-Darstellung.

```javascript
// Dark Theme
const payment = await cargobit.payments.create({
  amount: 1000,
  currency: 'eur'
});
```

---

### **2.5 Feedback-Komponenten**

#### Toasts

Kurze Benachrichtigungen, die temporär erscheinen.

```
┌─────────────────────────────────┐
│ ✓ Payment created successfully  │
└─────────────────────────────────┘
```

Position: Bottom-Right
Duration: 5000ms (default)

#### Skeleton Loader

Platzhalter während des Ladens.

```
┌─────────────────────────────────┐
│ ██████████████                  │
│ ████████████████████            │
│ ██████████████                  │
└─────────────────────────────────┘
```

#### Inline Validation

Echtzeit-Validierung mit Feedback.

```
┌─────────────────────────────────┐
│ [email@example.com        ✓]   │
└─────────────────────────────────┘
```

---

## 3. Patterns

Patterns sind bewährte Layout-Kombinationen für wiederkehrende Use Cases.

### **3.1 Documentation Pattern**

Das Standard-Layout für Dokumentationsseiten.

```
┌──────────┬─────────────────────────┬──────────┐
│          │                         │          │
│ Sidebar  │    Main Content         │   TOC    │
│          │                         │          │
│ Navigation│   ┌─────────────────┐  │  - H1    │
│          │   │ Heading         │  │  - H2    │
│          │   │                 │  │    - H3  │
│          │   │ Content...      │  │  - H2    │
│          │   │                 │  │          │
│          │   └─────────────────┘  │          │
│          │                         │          │
└──────────┴─────────────────────────┴──────────┘
```

#### Layout-Spezifikationen

- **Sidebar Width**: 240px (fixed)
- **Main Content**: flex-grow, max-width 800px
- **TOC Width**: 200px (sticky)
- **Sticky Headers**: Ja

---

### **3.2 Tool Pattern**

Layout für interaktive Tools wie API Explorer.

```
┌─────────────────────────────────────────────────┐
│                 Header / Controls               │
├─────────────────────┬───────────────────────────┤
│                     │                           │
│    Input Panel      │     Output Panel          │
│                     │                           │
│  ┌───────────────┐  │  ┌─────────────────────┐  │
│  │ Endpoint      │  │  │ Response            │  │
│  │ Parameters    │  │  │ Status: 200 OK      │  │
│  │ Body          │  │  │ Body: {...}         │  │
│  └───────────────┘  │  └─────────────────────┘  │
│                     │                           │
│  [Execute]          │                           │
│                     │                           │
└─────────────────────┴───────────────────────────┘
```

Features:
- Two-Column Layout
- Live Console
- Input → Output Flow
- Resizable Panels

---

### **3.3 Dashboard Pattern**

Layout für Dashboard-Seiten mit Metriken und Aktivitäten.

```
┌─────────────────────────────────────────────────┐
│ Dashboard                         [Time Range] │
├─────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │Metric 1 │ │Metric 2 │ │Metric 3 │ │Metric 4 ││
│ │  1,234  │ │  98.5%  │ │   42    │ │  12ms   ││
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘│
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐│
│ │                Chart Area                   ││
│ │                                             ││
│ └─────────────────────────────────────────────┘│
├────────────────────┬────────────────────────────┤
│ Activity Feed      │ Quick Actions             │
│ • Event 1          │ [Generate Key]            │
│ • Event 2          │ [Test Webhook]            │
│ • Event 3          │ [View Logs]               │
└────────────────────┴────────────────────────────┘
```

Features:
- Metric Cards
- Charts (Line, Bar, Pie)
- Activity Feed
- Quick Actions

---

## 4. Layout-Regeln

### **4.1 Grid System**

12-Spalten Grid mit konfigurierbaren Gaps.

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-lg);
}

.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-md);
}

.col-6 { grid-column: span 6; }
.col-4 { grid-column: span 4; }
.col-3 { grid-column: span 3; }
```

### **4.2 Breakpoints**

```css
--breakpoint-sm: 640px;   /* Mobile Landscape */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large Desktop */
--breakpoint-2xl: 1536px; /* Extra Large */
```

### **4.3 Responsive Verhalten**

| Komponente | Mobile | Tablet | Desktop |
|------------|--------|--------|---------|
| Sidebar | Collapsed (Overlay) | Mini (Icons) | Expanded |
| TOC | Hidden | Hidden | Visible |
| Grid | 1 Col | 2 Col | 12 Col |
| Navigation | Hamburger | Hamburger | Full |

---

## 5. Accessibility-Richtlinien

### **5.1 Farbkontraste**

Alle Text-/Hintergrund-Kombinationen erfüllen WCAG 2.1 AA.

| Kombination | Kontrast | Status |
|-------------|----------|--------|
| Text auf Surface | 15.2:1 | ✓ AAA |
| Primary auf White | 4.6:1 | ✓ AA |
| Light Text auf Primary | 4.6:1 | ✓ AA |

### **5.2 Fokus-Management**

- Alle interaktiven Elemente haben sichtbaren Focus-Ring
- Fokus-Reihenfolge folgt logischer Navigation
- Skip-Links für Tastatur-Nutzer

### **5.3 ARIA-Labels**

```html
<button aria-label="Close dialog">
  <IconX />
</button>

<nav aria-label="Main navigation">
  <!-- Navigation items -->
</nav>
```

---

## 6. Dark Mode

Das Designsystem unterstützt einen vollständigen Dark Mode.

### **6.1 Dark Mode Tokens**

```css
[data-theme="dark"] {
  --color-bg: #0A1A2F;
  --color-surface: #142238;
  --color-border: #2A3A4F;
  --color-text: #F4F6F8;
  --color-text-light: #A0A8B0;
}
```

### **6.2 Umschaltung**

- System-Preference Detection
- Manueller Toggle
- Persistenz in LocalStorage

---

## 7. Implementierung

### **7.1 CSS Variables**

```css
:root {
  /* Alle Design Tokens */
}

/* Automatisch verfügbar in allen Komponenten */
.component {
  background: var(--color-primary);
  padding: var(--space-md);
  border-radius: var(--radius-md);
}
```

### **7.2 Tailwind Konfiguration**

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        surface: 'var(--color-surface)',
        // ...
      },
      spacing: {
        'xxs': 'var(--space-xxs)',
        'xs': 'var(--space-xs)',
        // ...
      }
    }
  }
}
```

### **7.3 Figma Sync**

Alle Tokens sind mit Figma über Style Dictionary synchronisiert.

```json
{
  "color": {
    "primary": { "value": "#0057FF" }
  }
}
```

---

## 8. Wartung & Governance

### **8.1 Versioning**

- Major.Minor.Patch Semantic Versioning
- Breaking Changes erfordern Major-Version
- Neue Tokens erfordern Minor-Version

### **8.2 Änderungsprozess**

1. RFC für neue Tokens/Komponenten
2. Design Review durch Design System Team
3. Implementierung in Figma + Code
4. Dokumentation + Beispiele
5. Release + Changelog

### **8.3 Ownership**

- **Design Team**: Visuelle Konsistenz, Figma
- **Frontend Team**: Implementierung, Accessibility
- **Product Team**: Anforderungen, Priorisierung

---

## 9. Quick Reference

### **Token-Übersicht**

| Kategorie | Beispiele |
|-----------|-----------|
| Colors | `--color-primary`, `--color-error` |
| Typography | `--font-size-h1`, `--font-weight-bold` |
| Spacing | `--space-xs` bis `--space-xxxl` |
| Radius | `--radius-sm` bis `--radius-full` |
| Shadows | `--shadow-sm` bis `--shadow-xl` |
| Animation | `--transition-fast` bis `--transition-slower` |

### **Komponenten-Übersicht**

| Kategorie | Komponenten |
|-----------|-------------|
| Buttons | Primary, Secondary, Ghost, Danger, Link |
| Inputs | Text, Number, JSON Editor, Search, Dropdown |
| Navigation | Top Nav, Sidebar, Breadcrumbs, Tabs |
| Content | Cards, Tables, Accordions, Alerts, Badges |
| Feedback | Toasts, Skeleton, Inline Validation |

---

*Dieses Designsystem bildet die Grundlage für alle visuellen Elemente des CargoBit Developer Portals und gewährleistet Konsistenz, Zugänglichkeit und professionelle Qualität.*
