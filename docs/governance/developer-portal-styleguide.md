# CargoBit Developer Portal Styleguide

**Dokument-Typ:** Design-System  
**Version:** 1.0.0  
**Status:** Final  
**Letzte Aktualisierung:** 2024-01-15  
**Verantwortlich:** Design Team  

---

## Inhaltsverzeichnis

1. [Design-Prinzipien](#1-design-prinzipien)
2. [Farbsystem](#2-farbsystem)
3. [Typografie](#3-typografie)
4. [Layout-System](#4-layout-system)
5. [Komponenten-Regeln](#5-komponenten-regeln)
6. [Iconografie](#6-iconografie)
7. [Bewegung und Animation](#7-bewegung-und-animation)
8. [Dark Mode](#8-dark-mode)

---

## 1. Design-Prinzipien

### 1.1 Kernprinzipien

| Prinzip | Beschreibung | Anwendung |
|---------|--------------|-----------|
| **Klarheit** | Jedes Element hat einen klaren Zweck | Keine dekorativen Elemente ohne Funktion |
| **Konsistenz** | Gleiche Elemente verhalten sich gleich | Wiederverwendung von Mustern |
| **Effizienz** | Minimale Klicks zum Ziel | Direkte Pfade, Shortcuts |
| **Zugänglichkeit** | Für alle Nutzer nutzbar | WCAG 2.1 AA Compliance |
| **Vertrauen** | Professionelles, stabiles Erscheinungsbild | Klare Hierarchie, keine Überraschungen |

### 1.2 Design-Entscheidungen

Bei Design-Entscheidungen gilt folgende Priorisierung:

1. **Funktionalität** vor Ästhetik
2. **Konsistenz** vor Kreativität
3. **Einfachheit** vor Vollständigkeit
4. **Performance** vor Komplexität

---

## 2. Farbsystem

### 2.1 Primärfarben

Die Primärfarben bilden die visuelle Identität von CargoBit und werden für Hauptaktionen und Markenpräsenz verwendet.

| Name | Hex | RGB | Verwendung |
|------|-----|-----|------------|
| **CargoBit Blue** | `#0057FF` | 0, 87, 255 | Primary Actions, Links, Focus Rings |
| **CargoBit Navy** | `#0A1A2F` | 10, 26, 47 | Headers, Dark Backgrounds, Text |

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  CargoBit Blue (#0057FF)                               │
│  ████████████████████████████████████████████████████  │
│  Verwendung: Buttons, Links, Active States             │
│                                                         │
│  CargoBit Navy (#0A1A2F)                               │
│  ████████████████████████████████████████████████████  │
│  Verwendung: Header Background, Footer, Dark Sections   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Sekundärfarben

Sekundärfarben ergänzen die Primärfarben und werden für Akzente und unterstützende Elemente verwendet.

| Name | Hex | RGB | Verwendung |
|------|-----|-----|------------|
| **CargoBit Teal** | `#00C2A8` | 0, 194, 168 | Accents, Success Highlights |
| **CargoBit Grey** | `#F4F6F8` | 244, 246, 248 | Backgrounds, Cards |

### 2.3 Statusfarben

Statusfarben kommunizieren den Zustand von Elementen und Aktionen.

| Status | Hex | Verwendung |
|--------|-----|------------|
| **Success** | `#00C853` | Erfolgreiche Aktionen, Positive Zustände |
| **Warning** | `#FFB300` | Warnungen, Aufmerksamkeit erforderlich |
| **Error** | `#FF3B30` | Fehler, Kritische Probleme |
| **Info** | `#2196F3` | Informationen, Hinweise |

### 2.4 Graustufen

Die Graustufen-Skala wird für Text, Borders und Hintergründe verwendet.

| Name | Hex | Verwendung |
|------|-----|------------|
| **Grey 900** | `#1C1C1E` | Primary Text |
| **Grey 800** | `#2C2C2E` | Secondary Text (Dark) |
| **Grey 700** | `#3A3A3C` | Secondary Text |
| **Grey 600** | `#48484A` | Tertiary Text |
| **Grey 500** | `#636366` | Disabled Text, Placeholders |
| **Grey 400** | `#8E8E93` | Icons, Borders |
| **Grey 300** | `#C7C7CC` | Light Borders |
| **Grey 200** | `#E5E5EA` | Dividers |
| **Grey 100** | `#F2F2F7` | Light Backgrounds |
| **Grey 50** | `#FAFAFA` | Page Background |

### 2.5 Farbverwendung

#### Buttons

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Primary Button:                                        │
│  ┌─────────────────┐                                   │
│  │   Button Text   │  Background: #0057FF              │
│  └─────────────────┘  Text: #FFFFFF                    │
│                                                         │
│  Secondary Button:                                      │
│  ┌─────────────────┐                                   │
│  │   Button Text   │  Background: transparent          │
│  └─────────────────┘  Border: #0057FF, Text: #0057FF   │
│                                                         │
│  Danger Button:                                         │
│  ┌─────────────────┐                                   │
│  │   Delete        │  Background: #FF3B30              │
│  └─────────────────┘  Text: #FFFFFF                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Links

| Link-Typ | Farbe | Hover |
|----------|-------|-------|
| Default | `#0057FF` | `#0046CC` (darker) |
| In Dark Background | `#4D9FFF` | `#80B8FF` (lighter) |
| Visited | `#6B2D9E` | - |

---

## 3. Typografie

### 3.1 Font-Familien

| Verwendung | Font | Fallback |
|------------|------|----------|
| **UI Text** | Inter | -apple-system, BlinkMacSystemFont, sans-serif |
| **Code** | JetBrains Mono | Fira Code, Consolas, monospace |

### 3.2 Schriftgrößen

#### Überschriften

| Level | Größe | Gewicht | Zeilenhöhe | Letter Spacing |
|-------|-------|---------|------------|----------------|
| **H1** | 32px / 2rem | 700 (Bold) | 1.2 | -0.02em |
| **H2** | 24px / 1.5rem | 600 (Semibold) | 1.3 | -0.01em |
| **H3** | 20px / 1.25rem | 600 (Semibold) | 1.4 | -0.01em |
| **H4** | 18px / 1.125rem | 500 (Medium) | 1.4 | 0 |
| **H5** | 16px / 1rem | 500 (Medium) | 1.5 | 0 |

#### Fließtext

| Art | Größe | Gewicht | Zeilenhöhe |
|-----|-------|---------|------------|
| **Body Large** | 18px / 1.125rem | 400 | 1.6 |
| **Body** | 16px / 1rem | 400 | 1.6 |
| **Body Small** | 14px / 0.875rem | 400 | 1.5 |

#### Code

| Art | Größe | Gewicht | Zeilenhöhe |
|-----|-------|---------|------------|
| **Code Inline** | 14px / 0.875rem | 400 | 1.5 |
| **Code Block** | 14px / 0.875rem | 400 | 1.6 |

### 3.3 Typografie-Beispiele

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  H1 - Heading One (32px Bold)                          │
│  ══════════════════════════════                        │
│                                                         │
│  H2 - Heading Two (24px Semibold)                      │
│  ─────────────────────────────────                     │
│                                                         │
│  H3 - Heading Three (20px Semibold)                    │
│                                                         │
│  H4 - Heading Four (18px Medium)                       │
│                                                         │
│  Body text at 16px regular weight with 1.6 line        │
│  height. This is the default for paragraph content.    │
│                                                         │
│  Body Large at 18px is used for lead paragraphs and    │
│  important introductions.                               │
│                                                         │
│  Body Small at 14px is used for metadata, captions,    │
│  and supporting information.                            │
│                                                         │
│  Inline code looks like `const x = 42;` within text.   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.4 Text-Farben

| Element | Farbe | Hex |
|---------|-------|-----|
| Heading | Grey 900 | `#1C1C1E` |
| Body Text | Grey 800 | `#2C2C2E` |
| Secondary Text | Grey 700 | `#3A3A3C` |
| Disabled Text | Grey 500 | `#636366` |
| Link | CargoBit Blue | `#0057FF` |
| Code Background | Grey 100 | `#F2F2F7` |

---

## 4. Layout-System

### 4.1 Grid-System

Das Portal verwendet ein 12-Spalten-Grid-System mit flexiblen Breakpoints.

#### Breakpoints

| Name | Breite | Container | Spalten |
|------|--------|-----------|---------|
| **Mobile** | < 640px | 100% - 32px padding | 4 |
| **Tablet** | 640px - 1023px | 640px - 64px padding | 8 |
| **Desktop** | 1024px - 1279px | 1024px | 12 |
| **Wide** | ≥ 1280px | 1280px | 12 |

#### Grid-Konfiguration

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  DESKTOP LAYOUT (1280px Container)                     │
│                                                         │
│  ├─────────────────────────────────────────────────────┤
│  │                                                     │
│  │  ├──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┤            │
│  │  │ 1│ 2│ 3│ 4│ 5│ 6│ 7│ 8│ 9│10│11│12│            │
│  │  ├──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┤            │
│  │                                                     │
│  │  Gutter: 24px                                       │
│  │  Column: ~80px                                      │
│  │  Margin: 24px                                       │
│  │                                                     │
│  └─────────────────────────────────────────────────────┤
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Spacing-Scale

Das Spacing-System basiert auf einer 8px-Basiseinheit.

| Name | Wert | Verwendung |
|------|------|------------|
| **xs** | 4px (0.25rem) | Tight spacing, icon margins |
| **sm** | 8px (0.5rem) | Inline spacing, small gaps |
| **md** | 16px (1rem) | Default padding, paragraph spacing |
| **lg** | 24px (1.5rem) | Section spacing, card padding |
| **xl** | 32px (2rem) | Major sections, container padding |
| **2xl** | 48px (3rem) | Page sections, hero spacing |
| **3xl** | 64px (4rem) | Large sections, feature areas |

### 4.3 Layout-Regionen

```
┌─────────────────────────────────────────────────────────┐
│  HEADER (64px height, sticky)                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  LEFT     │                    │         RIGHT         │
│  SIDEBAR  │    MAIN CONTENT    │         SIDEBAR       │
│  (280px)  │      (flexible)    │         (240px)       │
│           │                    │                       │
│           │                    │                       │
│           │                    │                       │
│           │                    │                       │
│           │                    │                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  FOOTER (variable height)                              │
└─────────────────────────────────────────────────────────┘
```

### 4.4 Container-Varianten

| Container | Breite | Padding | Verwendung |
|-----------|--------|---------|------------|
| **Full Width** | 100% | 24px | Landing Pages, Tools |
| **Content** | 1280px max | 24px | Dokumentationsseiten |
| **Narrow** | 768px max | 24px | Artikel, Blog Posts |
| **Sidebar Layout** | Main: flexible | 24px | API Reference, Docs |

---

## 5. Komponenten-Regeln

### 5.1 Buttons

#### Varianten

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  PRIMARY                                                │
│  ┌───────────────┐                                     │
│  │   Primary     │  BG: #0057FF, Text: #FFF            │
│  └───────────────┘  Border: none, Radius: 8px          │
│                                                         │
│  SECONDARY                                              │
│  ┌───────────────┐                                     │
│  │   Secondary   │  BG: transparent, Text: #0057FF     │
│  └───────────────┘  Border: 1px #0057FF, Radius: 8px   │
│                                                         │
│  GHOST                                                  │
│  ┌───────────────┐                                     │
│  │    Ghost      │  BG: transparent, Text: #1C1C1E     │
│  └───────────────┘  Border: none, Radius: 8px          │
│                                                         │
│  DANGER                                                 │
│  ┌───────────────┐                                     │
│  │    Delete     │  BG: #FF3B30, Text: #FFF            │
│  └───────────────┘  Border: none, Radius: 8px          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Größen

| Größe | Height | Padding | Font Size |
|-------|--------|---------|-----------|
| **Small** | 32px | 8px 12px | 14px |
| **Medium** | 40px | 10px 16px | 14px |
| **Large** | 48px | 12px 24px | 16px |

#### States

| State | Änderung |
|-------|----------|
| **Hover** | Background: 10% darker |
| **Active** | Background: 20% darker |
| **Disabled** | Opacity: 0.5, cursor: not-allowed |
| **Loading** | Spinner icon, text hidden |

### 5.2 Cards

#### Standard Card

```
┌───────────────────────────────────────┐
│                                       │
│  Card Title                    Action │
│  ──────────                           │
│                                       │
│  Card content goes here. This can    │
│  include text, images, or other      │
│  components.                          │
│                                       │
│  [Button]                             │
│                                       │
└───────────────────────────────────────┘

Background: #FFFFFF
Border: 1px solid #E5E5EA
Border Radius: 12px
Padding: 24px
Shadow: none (border-only design)
```

#### Card mit Hover

```
┌───────────────────────────────────────┐
│                                       │
│  Card Title                           │
│  ──────────                           │
│                                       │
│  Content                              │
│                                       │
└───────────────────────────────────────┘

Hover State:
- Border: 1px solid #0057FF
- Shadow: 0 4px 12px rgba(0, 87, 255, 0.1)
- Cursor: pointer
```

### 5.3 Code Blocks

#### Inline Code

```
Der `payment.created` Event wird ausgelöst.

Background: #F2F2F7
Padding: 2px 6px
Border Radius: 4px
Font: JetBrains Mono, 14px
Color: #C7254E (or #E83E8C)
```

#### Code Block

```
┌─────────────────────────────────────────────────────────┐
│  javascript                               [Copy] [Raw] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  const response = await fetch('/api/payments', {       │
│    method: 'POST',                                     │
│    headers: {                                          │
│      'Authorization': `Bearer ${apiKey}`,              │
│      'Content-Type': 'application/json'                │
│    },                                                  │
│    body: JSON.stringify({ amount: 1000 })              │
│  });                                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘

Background: #1C1C1E (Dark Theme)
Text: #E5E5EA
Border Radius: 8px
Font: JetBrains Mono, 14px
Line Height: 1.6
Header: Language name, Copy button
```

### 5.4 Tables

```
┌─────────────────────────────────────────────────────────┐
│  Parameter    │  Type     │  Required  │  Description  │
├───────────────┼───────────┼────────────┼───────────────┤
│  amount       │  number   │  Yes       │  Payment...   │
│  currency     │  string   │  Yes       │  Three-letter │
│  description  │  string   │  No        │  Optional     │
└───────────────┴───────────┴────────────┴───────────────┘

Header:
- Background: #F4F6F8
- Font: 14px Semibold
- Color: #1C1C1E

Rows:
- Background: #FFFFFF (odd), #FAFAFA (even)
- Font: 14px Regular
- Color: #2C2C2E
- Border Bottom: 1px solid #E5E5EA

Hover:
- Background: #F4F6F8
```

### 5.5 Alerts

```
┌─────────────────────────────────────────────────────────┐
│  ℹ️  INFO                                               │
│  ─────────                                              │
│  This is an informational message.                     │
└─────────────────────────────────────────────────────────┘
Border Left: 4px solid #2196F3
Background: #E3F2FD
Icon: Info icon, #2196F3

┌─────────────────────────────────────────────────────────┐
│  ⚠️  WARNING                                            │
│  ─────────                                              │
│  This is a warning message.                            │
└─────────────────────────────────────────────────────────┘
Border Left: 4px solid #FFB300
Background: #FFF8E1
Icon: Warning icon, #FFB300

┌─────────────────────────────────────────────────────────┐
│  ✓  SUCCESS                                             │
│  ─────────                                              │
│  Operation completed successfully.                     │
└─────────────────────────────────────────────────────────┘
Border Left: 4px solid #00C853
Background: #E8F5E9
Icon: Check icon, #00C853

┌─────────────────────────────────────────────────────────┐
│  ✕  ERROR                                               │
│  ─────────                                              │
│  An error occurred.                                    │
└─────────────────────────────────────────────────────────┘
Border Left: 4px solid #FF3B30
Background: #FFEBEE
Icon: X icon, #FF3B30
```

### 5.6 Forms

#### Input Field

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Label                                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Placeholder text                          [👁]  │   │
│  └─────────────────────────────────────────────────┘   │
│  Helper text                                            │
│                                                         │
└─────────────────────────────────────────────────────────┘

Label: 14px Medium, #1C1C1E
Input: 40px height, 12px padding, #FFFFFF
Border: 1px solid #C7C7CC, Radius: 8px
Placeholder: #636366
Helper: 14px Regular, #636366
```

#### Input States

| State | Border | Background |
|-------|--------|------------|
| Default | `#C7C7CC` | `#FFFFFF` |
| Focus | `#0057FF` (2px) | `#FFFFFF` |
| Error | `#FF3B30` | `#FFFFFF` |
| Disabled | `#E5E5EA` | `#F2F2F7` |

---

## 6. Iconografie

### 6.1 Icon-System

**Icon Library:** Lucide Icons oder Heroicons

**Größen:**
| Größe | Dimension | Verwendung |
|-------|-----------|------------|
| Small | 16px | Inline icons, badges |
| Medium | 20px | Default icon size |
| Large | 24px | Navigation, prominent actions |
| XL | 32px | Feature icons, empty states |

### 6.2 Icon-Farben

| Verwendung | Farbe |
|------------|-------|
| Default | `#636366` (Grey 500) |
| Active | `#0057FF` (CargoBit Blue) |
| Success | `#00C853` |
| Warning | `#FFB300` |
| Error | `#FF3B30` |

---

## 7. Bewegung und Animation

### 7.1 Timing-Funktionen

| Name | Wert | Verwendung |
|------|------|------------|
| **Ease Out** | `cubic-bezier(0.16, 1, 0.3, 1)` | Einblend-Animationen |
| **Ease In Out** | `cubic-bezier(0.65, 0, 0.35, 1)` | Zustandswechsel |
| **Spring** | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Spielische Interaktionen |

### 7.2 Dauer

| Art | Dauer | Verwendung |
|-----|-------|------------|
| Fast | 150ms | Hover, kleine Änderungen |
| Normal | 250ms | Modal, Dropdown |
| Slow | 400ms | Seitenübergänge |

### 7.3 Standard-Animationen

```css
/* Hover Fade */
.element {
  transition: opacity 150ms ease-out;
}

/* Modal Slide In */
.modal {
  animation: slideIn 250ms ease-out;
}
@keyframes slideIn {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Button Press */
.button:active {
  transform: scale(0.98);
}
```

---

## 8. Dark Mode

### 8.1 Farb-Anpassungen

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `#FFFFFF` | `#0A1A2F` |
| Surface | `#F4F6F8` | `#112240` |
| Primary Text | `#1C1C1E` | `#E5E5EA` |
| Secondary Text | `#3A3A3C` | `#A0AEC0` |
| Border | `#E5E5EA` | `#2D3748` |
| Code Background | `#F2F2F7` | `#1A202C` |

### 8.2 Dark Mode Toggle

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Light Mode              Dark Mode                      │
│  ┌────────────┐         ┌────────────┐                │
│  │ ○         │    →    │         ○ │                │
│  │  ☀️       │         │       🌙  │                │
│  └────────────┘         └────────────┘                │
│                                                         │
└─────────────────────────────────────────────────────────┘

Toggle Button:
- Background: #E5E5EA (light), #3A3A3C (dark)
- Knob: #FFFFFF with icon
- Animation: 250ms ease-in-out
```

---

## Anhang

### A. CSS-Variablen

```css
:root {
  /* Colors */
  --color-primary: #0057FF;
  --color-primary-dark: #0046CC;
  --color-navy: #0A1A2F;
  --color-teal: #00C2A8;
  
  /* Status */
  --color-success: #00C853;
  --color-warning: #FFB300;
  --color-error: #FF3B30;
  --color-info: #2196F3;
  
  /* Grey Scale */
  --grey-900: #1C1C1E;
  --grey-800: #2C2C2E;
  --grey-700: #3A3A3C;
  --grey-600: #48484A;
  --grey-500: #636366;
  --grey-400: #8E8E93;
  --grey-300: #C7C7CC;
  --grey-200: #E5E5EA;
  --grey-100: #F2F2F7;
  --grey-50: #FAFAFA;
  
  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  
  /* Typography */
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

### B. Tailwind Konfiguration

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#0057FF',
        navy: '#0A1A2F',
        teal: '#00C2A8',
        grey: {
          50: '#FAFAFA',
          100: '#F2F2F7',
          200: '#E5E5EA',
          300: '#C7C7CC',
          400: '#8E8E93',
          500: '#636366',
          600: '#48484A',
          700: '#3A3A3C',
          800: '#2C2C2E',
          900: '#1C1C1E',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    }
  }
}
```

### C. Figma Export

Alle Design-Tokens sind als Figma Library verfügbar:
- Datei: `CargoBit Design System`
- Team: CargoBit Design
- Publish: Automatisch bei Änderungen

---

**Dokument-Ende**

*Dieser Styleguide wird kontinuierlich aktualisiert. Bei Fragen wende dich an das Design Team.*
