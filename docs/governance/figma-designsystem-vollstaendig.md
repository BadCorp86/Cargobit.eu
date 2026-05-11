# 🧱 BLOCK R — Vollständiges Figma-Designsystem

## Design Tokens → Komponenten → Patterns → Layouts → Dokumentation

### Das offizielle CargoBit Designsystem für Figma

Dies ist ein **komplettes Designsystem**, wie es in Figma aufgebaut wäre, einschließlich aller Tokens, Komponenten, Patterns und Layouts für das CargoBit Developer Portal.

---

## 1. Foundations (Design Tokens)

Die Foundations bilden die atomare Basis des Designsystems. Sie gewährleisten Konsistenz über alle Plattformen und ermöglichen eine systematische Skalierung des visuellen Erscheinungsbildes.

### 1.1 Colors

Die Farbpalette ist das Herzstück der visuellen Identität. Sie wurde entwickelt, um professionelle Ästhetik mit optimaler Zugänglichkeit zu kombinieren.

#### Primary Palette

Die Primary Palette definiert die Hauptmarkenfarben von CargoBit. Primary 500 ist die primäre Markenfarbe, die in allen Hauptinteraktionen verwendet wird.

| Token | Hex | RGB | Verwendung |
|-------|-----|-----|------------|
| Primary 300 | #3380FF | rgb(51, 128, 255) | Hover states, Light backgrounds |
| Primary 400 | #1A6FFF | rgb(26, 111, 255) | Secondary interactions |
| **Primary 500** | **#0057FF** | **rgb(0, 87, 255)** | **Hauptmarke, Primary Buttons** |
| Primary 600 | #003FCC | rgb(0, 63, 204) | Pressed states, Active states |
| Primary 700 | #002A88 | rgb(0, 42, 136) | Deep accents, Headers |
| Primary 800 | #001A55 | rgb(0, 26, 85) | Dark mode surfaces |

#### Secondary Palette

Die Secondary Palette ergänzt die Primary Palette und wird für Akzente und Erfolgsmeldungen verwendet.

| Token | Hex | RGB | Verwendung |
|-------|-----|-----|------------|
| Secondary 300 | #33D4BE | rgb(51, 212, 190) | Light accents |
| Secondary 400 | #00DBB8 | rgb(0, 219, 184) | Hover states |
| **Secondary 500** | **#00C2A8** | **rgb(0, 194, 168)** | **Teal Akzentfarbe, Success** |
| Secondary 600 | #009984 | rgb(0, 153, 132) | Pressed states |
| Secondary 700 | #006B5A | rgb(0, 107, 90) | Deep accents |

#### Neutral Palette

Die Neutral Palette wird für Texte, Hintergründe, Rahmen und alle nicht-akzentuierten Elemente verwendet.

| Token | Hex | RGB | Verwendung |
|-------|-----|-----|------------|
| Neutral 0 | #FFFFFF | rgb(255, 255, 255) | Weiße Hintergründe |
| Neutral 50 | #F8FAFC | rgb(248, 250, 252) | Light surfaces |
| Neutral 100 | #F1F5F9 | rgb(241, 245, 249) | Card backgrounds |
| Neutral 200 | #E2E8F0 | rgb(226, 232, 240) | Borders, Dividers |
| Neutral 300 | #CBD5E1 | rgb(203, 213, 225) | Disabled borders |
| Neutral 400 | #94A3B8 | rgb(148, 163, 184) | Placeholder text |
| Neutral 500 | #64748B | rgb(100, 116, 139) | Secondary text |
| Neutral 600 | #475569 | rgb(71, 85, 105) | Body text |
| Neutral 700 | #334155 | rgb(51, 65, 85) | Headings |
| Neutral 800 | #1E293B | rgb(30, 41, 59) | Dark headings |
| Neutral 900 | #0F172A | rgb(15, 23, 42) | Primary text dark |

#### Semantic Colors

Semantische Farben kommunizieren den Status oder die Bedeutung eines Elements.

| Token | Hex | Bedeutung | Verwendung |
|-------|-----|-----------|------------|
| **Success 500** | **#00C853** | Erfolg, Positiv | Erfolgreiche Aktionen |
| Success 600 | #00A040 | Success pressed | Pressed states |
| Success Background | #E8F5E9 | Success light | Success alerts |
| **Warning 500** | **#FFB300** | Warnung, Achtung | Warnungen |
| Warning 600 | #FF8F00 | Warning pressed | Pressed states |
| Warning Background | #FFF8E1 | Warning light | Warning alerts |
| **Error 500** | **#FF3B30** | Fehler, Kritisch | Fehlermeldungen |
| Error 600 | #D32F2F | Error pressed | Pressed states |
| Error Background | #FFEBEE | Error light | Error alerts |
| **Info 500** | **#0284C7** | Information | Hinweise |
| Info 600 | #0277B5 | Info pressed | Pressed states |
| Info Background | #E1F5FE | Info light | Info alerts |

#### Dark Mode Palette

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| Background | #FFFFFF | #0A1A2F |
| Surface | #F4F6F8 | #142238 |
| Surface Elevated | #FFFFFF | #1A2A40 |
| Border | #E0E4E8 | #2A3A4F |
| Text Primary | #1A1A1A | #F4F6F8 |
| Text Secondary | #6A6A6A | #A0A8B0 |

---

### 1.2 Typography

Die Typografie definiert die visuelle Hierarchie und Lesbarkeit des Portals.

#### Font Families

```
Inter — UI Font
- Variable font with weights 400-700
- Optimized for screen readability
- Used for all UI text, headings, body

IBM Plex Mono — Code Font
- Monospace font for code
- Used for code blocks, inline code, API responses
- Ligatures disabled for code clarity
```

#### Font Scale

| Token | Size | Line Height | Weight | Letter Spacing | Verwendung |
|-------|------|-------------|--------|----------------|------------|
| Display | 48px | 1.1 | 700 (Bold) | -0.02em | Landing pages, Hero |
| H1 | 32px | 1.2 | 600 (Semibold) | -0.01em | Page titles |
| H2 | 24px | 1.3 | 600 (Semibold) | -0.01em | Section headings |
| H3 | 20px | 1.4 | 600 (Semibold) | 0 | Subsection headings |
| H4 | 18px | 1.4 | 500 (Medium) | 0 | Card headings |
| Body Large | 18px | 1.5 | 400 (Regular) | 0 | Lead paragraphs |
| Body | 16px | 1.5 | 400 (Regular) | 0 | Default body text |
| Body Small | 14px | 1.5 | 400 (Regular) | 0 | Secondary text |
| Caption | 12px | 1.4 | 400 (Regular) | 0.01em | Labels, captions |
| Code | 14px | 1.6 | 400 (Regular) | 0 | Code blocks |
| Code Small | 12px | 1.5 | 400 (Regular) | 0 | Inline code |

#### Font Weights

```
Regular: 400    — Body text, descriptions
Medium: 500     — Emphasized text, labels
Semibold: 600   — Headings, buttons
Bold: 700       — Display, strong emphasis
```

---

### 1.3 Spacing Scale

Das Spacing-System basiert auf einer 4px-Basiseinheit.

| Token | Value | Pixels | Verwendung |
|-------|-------|--------|------------|
| Space 4XS | 0.25rem | 4px | Minimal gaps |
| Space 3XS | 0.5rem | 8px | Compact spacing |
| Space 2XS | 0.75rem | 12px | Small spacing |
| Space XS | 1rem | 16px | Default spacing |
| Space SM | 1.5rem | 24px | Section spacing |
| Space MD | 2rem | 32px | Container padding |
| Space LG | 3rem | 48px | Section margins |
| Space XL | 4rem | 64px | Page margins |
| Space 2XL | 6rem | 96px | Major sections |
| Space 3XL | 8rem | 128px | Hero sections |

---

### 1.4 Border Radius

| Token | Value | Verwendung |
|-------|-------|------------|
| Radius SM | 4px | Badges, small elements |
| Radius MD | 8px | Buttons, inputs, cards |
| Radius LG | 12px | Modals, large cards |
| Radius XL | 16px | Feature cards |
| Radius Full | 9999px | Pills, avatars |

---

### 1.5 Shadows

Das Schatten-System erzeugt Tiefe und Hierarchie.

| Token | Value | Verwendung |
|-------|-------|------------|
| Shadow XS | 0 1px 2px rgba(0,0,0,0.05) | Subtle elevation |
| Shadow SM | 0 2px 4px rgba(0,0,0,0.08) | Cards, dropdowns |
| Shadow MD | 0 4px 8px rgba(0,0,0,0.12) | Elevated cards |
| Shadow LG | 0 8px 16px rgba(0,0,0,0.16) | Modals, popovers |
| Shadow XL | 0 16px 32px rgba(0,0,0,0.20) | Large modals |
| Shadow Focus | 0 0 0 3px rgba(0,87,255,0.25) | Focus rings |

---

### 1.6 Animation Tokens

| Token | Duration | Easing | Verwendung |
|-------|----------|--------|------------|
| Transition Fast | 150ms | ease-out | Micro-interactions |
| Transition Base | 200ms | ease-out | Default transitions |
| Transition Slow | 300ms | ease-out | Complex animations |
| Transition Slower | 500ms | ease-out | Page transitions |

```
Easing Curves:
- ease-out: cubic-bezier(0, 0, 0.2, 1) — Elements entering
- ease-in: cubic-bezier(0.4, 0, 1, 1) — Elements leaving
- ease-in-out: cubic-bezier(0.4, 0, 0.2, 1) — State changes
```

---

### 1.7 Z-Index Scale

| Token | Value | Verwendung |
|-------|-------|------------|
| Z-Dropdown | 1000 | Dropdowns, selects |
| Z-Sticky | 1020 | Sticky headers |
| Z-Fixed | 1030 | Fixed navigation |
| Z-Modal Backdrop | 1040 | Modal overlays |
| Z-Modal | 1050 | Modals |
| Z-Popover | 1060 | Popovers, tooltips |
| Z-Toast | 1070 | Toast notifications |

---

## 2. Components

Die Komponentenbibliothek enthält alle UI-Elemente für das Developer Portal.

### 2.1 Buttons

Buttons sind die primären Interaktionselemente.

#### Variants

| Variante | Design | Verwendung |
|----------|--------|------------|
| **Primary** | Solid Primary 500 background | Hauptaktionen |
| **Secondary** | Neutral 100 background, Primary 500 border | Nebenkationen |
| **Ghost** | Transparent background | Tertiäre Aktionen |
| **Danger** | Solid Error 500 background | Destruktive Aktionen |
| **Icon Button** | Square, icon-only | Toolbar-Aktionen |

#### Sizes

| Size | Height | Padding | Font Size |
|------|--------|---------|-----------|
| Small | 32px | 8px 12px | 14px |
| Medium | 40px | 8px 16px | 16px |
| Large | 48px | 12px 24px | 18px |

#### States

```
Default:    Primary 500 bg, White text
Hover:      Primary 600 bg
Pressed:    Primary 700 bg
Focus:      Primary 500 bg + Focus Ring
Disabled:   50% opacity, cursor not-allowed
Loading:    Spinner + disabled state
```

#### Button Anatomy

```
┌─────────────────────────────────────┐
│ [Icon]  Button Label            [→] │
└─────────────────────────────────────┘
  ↑       ↑                        ↑
  Left    Label                    Right
  Icon    (Required)               Icon
  (Optional)                       (Optional)
```

---

### 2.2 Inputs

Input-Felder für Formulare und Suchfunktionen.

#### Input Types

| Typ | Beschreibung | Besonderheiten |
|-----|--------------|----------------|
| **Text Input** | Einzeilige Texteingabe | Standard input |
| **Number Input** | Numerische Eingaben | Stepper buttons |
| **JSON Editor** | JSON-Eingaben | Syntax highlighting |
| **Dropdown** | Auswahlmenü | Single select |
| **Multi-Select** | Mehrfachauswahl | Tags for selected |
| **Search Input** | Suchfeld | Search icon, clear button |
| **Toggle** | Ein/Aus-Schalter | Boolean values |
| **Checkbox** | Mehrfachauswahl | Check mark |
| **Radio** | Einzelauswahl | Radio button |

#### Input States

```
Default:    Neutral 200 border, Neutral 900 text
Hover:      Neutral 300 border
Focus:      Primary 500 border + Focus Ring
Error:      Error 500 border + Error message
Success:    Success 500 border + Check icon
Disabled:   Neutral 100 bg, Neutral 400 text
```

#### Input Anatomy

```
┌─────────────────────────────────────┐
│ Label *                             │
├─────────────────────────────────────┤
│ [Icon]  Placeholder text...    [×]  │
└─────────────────────────────────────┘
│ Helper text or error message        │
└─────────────────────────────────────┘
```

---

### 2.3 Navigation

#### Top Navigation

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo]  Docs  API  Tools  Changelog  │ [Search...] [Avatar ▼]│
└─────────────────────────────────────────────────────────────┘

Height: 64px
Background: White with bottom shadow
Position: Fixed on scroll
```

#### Sidebar Navigation

```
┌────────────────────────────────┐
│ Getting Started                │
│ ├─ Quick Start                 │
│ ├─ Installation                │
│ └─ Concepts                    │
│                                │
│ API Reference                  │
│ ├─ Endpoints                   │
│ ├─ Webhooks                    │
│ └─ Errors                      │
│                                │
│ Tools                          │
│ └─ API Explorer                │
└────────────────────────────────┘

Width: 240px (expanded), 64px (collapsed)
Background: Neutral 50
Border-right: Neutral 200
```

#### Breadcrumbs

```
Docs > API Reference > Endpoints > Create Payment

Style: Neutral 500 text
Separator: "/" or chevron icon
Current: Neutral 900, non-clickable
```

#### Tabs

```
Horizontal Tabs:
┌─────────────────────────────────────────────┐
│ [Overview]  [API]  [Examples]  [Changelog]  │
│ ───────────                                 │
└─────────────────────────────────────────────┘

Active: Primary 500 underline, Primary 500 text
Inactive: Neutral 500 text
```

---

### 2.4 Content Components

#### Cards

```
┌─────────────────────────────────────┐
│ Card Title                    [Icon]│
│─────────────────────────────────────│
│                                     │
│ Card description text that          │
│ provides context and information.   │
│                                     │
│─────────────────────────────────────│
│ [Action Button]      [Link →]       │
└─────────────────────────────────────┘

Padding: 24px
Radius: 12px
Shadow: Shadow SM
Border: Optional Neutral 200
```

#### Tables

```
┌─────────────────────────────────────────────────────────────┐
│ Column 1 ↑       │ Column 2          │ Column 3          │
│─────────────────────────────────────────────────────────────│
│ Row 1 Data       │ Data              │ Status            │
│ Row 2 Data       │ Data              │ Status            │
│ Row 3 Data       │ Data              │ Status            │
└─────────────────────────────────────────────────────────────┘

Features:
- Sortable headers (click to sort)
- Row hover states (Neutral 50 bg)
- Pagination
- Column resizing
- Row selection
```

#### Accordions

```
▼ Expanded Section
  This content is visible when expanded.
  It can contain any type of content.

▶ Collapsed Section
```

#### Alerts

```
Info Alert:
┌─────────────────────────────────────┐
│ ℹ️ This is an informational alert.  │
└─────────────────────────────────────┘
Background: Info Background
Border-left: Info 500, 4px

Success Alert:
┌─────────────────────────────────────┐
│ ✓ Operation completed successfully. │
└─────────────────────────────────────┘
Background: Success Background
Border-left: Success 500, 4px

Warning Alert:
┌─────────────────────────────────────┐
│ ⚠️ Please review before proceeding. │
└─────────────────────────────────────┘
Background: Warning Background
Border-left: Warning 500, 4px

Error Alert:
┌─────────────────────────────────────┐
│ ✗ An error occurred. Please retry.  │
└─────────────────────────────────────┘
Background: Error Background
Border-left: Error 500, 4px
```

#### Badges

```
[Default]   — Neutral 200 bg, Neutral 700 text
[Success]   — Success Background, Success 600 text
[Warning]   — Warning Background, Warning 600 text
[Error]     — Error Background, Error 600 text
[Primary]   — Primary 100 bg, Primary 700 text

Radius: Full
Padding: 4px 8px
Font: Caption (12px)
```

#### Code Blocks

```
Light Theme:
┌─────────────────────────────────────────────────────────────┐
│ javascript                           [Copy] [Wrap] [Expand] │
│─────────────────────────────────────────────────────────────│
│ const payment = await cargobit.payments.create({           │
│   amount: 1000,                                            │
│   currency: 'eur'                                          │
│ });                                                        │
└─────────────────────────────────────────────────────────────┘
Background: Neutral 900
Text: Neutral 100
Font: IBM Plex Mono, 14px

Syntax Colors:
- Keywords: Primary 400
- Strings: Success 400
- Numbers: Warning 400
- Comments: Neutral 500
- Functions: Secondary 400
```

#### Metric Widgets

```
┌─────────────────────────────────────┐
│ API Requests                        │
│                                     │
│ 1,234,567                          │
│ ↑ 12.5% vs last week               │
│                                     │
│ ┌─────────────────────────────────┐│
│ │     ▄▄▄▄▄                       ││
│ │   ▄▄██████▄▄                    ││
│ │ ▄▄██████████▄▄                  ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

## 3. Patterns

Patterns sind bewährte Layout-Kombinationen für wiederkehrende Use Cases.

### 3.1 Documentation Pattern

Das Standard-Layout für Dokumentationsseiten.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Top Navigation (64px fixed)                                              │
├──────────────┬──────────────────────────────────────────┬────────────────┤
│              │                                          │                │
│   Sidebar    │          Main Content                    │      TOC       │
│   (240px)    │          (min-width: 640px)              │    (200px)     │
│              │                                          │    Sticky      │
│   - Item 1   │  ┌────────────────────────────────────┐  │                │
│   - Item 2   │  │ H1: Page Title                     │  │  - H1 Title    │
│   - Item 3   │  │                                    │  │    - H2 Intro  │
│     - Sub    │  │ Introduction paragraph...           │  │    - H2 Setup  │
│   - Item 4   │  │                                    │  │  - H2 API      │
│              │  │ ## Introduction                    │  │                │
│   Collapsed  │  │ Content here...                    │  │  On this page  │
│   on mobile  │  │                                    │  │  heading       │
│              │  │ ## Setup                           │  │                │
│              │  │ ```code block```                   │  │                │
│              │  │                                    │  │                │
│              │  └────────────────────────────────────┘  │                │
│              │                                          │                │
│              │  [← Previous]                    [Next →]│                │
│              │                                          │                │
└──────────────┴──────────────────────────────────────────┴────────────────┘
```

#### Specifications

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Sidebar | 240px fixed | 64px mini | Hidden (hamburger) |
| Main Content | flex-grow | flex-grow | 100% |
| TOC | 200px sticky | Hidden | Hidden |
| Max content width | 800px | 800px | 100% |

---

### 3.2 Tool Pattern

Layout für interaktive Tools wie API Explorer.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Tool Header (Title + Controls)                                           │
├─────────────────────────────────────────┬────────────────────────────────┤
│                                         │                                │
│         Input Panel (50%)               │      Output Panel (50%)        │
│                                         │                                │
│  ┌─────────────────────────────────┐    │  ┌────────────────────────────┐│
│  │ Method Selector                 │    │  │ Status: 200 OK      145ms  ││
│  │ [GET ▼] /v1/payments/{id}      │    │  │────────────────────────────││
│  │                                 │    │  │                            ││
│  │ Parameters                      │    │  │ {                          ││
│  │ payment_id: [pay_123      ]    │    │  │   "id": "pay_123",         ││
│  │                                 │    │  │   "status": "succeeded"    ││
│  │ Headers                         │    │  │ }                          ││
│  │ Authorization: Bearer sk_...    │    │  │                            ││
│  │                                 │    │  │                            ││
│  │ Body                            │    │  │                            ││
│  │ { }                             │    │  │                            ││
│  └─────────────────────────────────┘    │  └────────────────────────────┘│
│                                         │                                │
│  [Send Request]                         │  [Copy Response] [Save]       │
│                                         │                                │
├─────────────────────────────────────────┴────────────────────────────────┤
│ Console / History Panel (Collapsible)                                    │
└──────────────────────────────────────────────────────────────────────────┘

Features:
- Resizable panels (drag divider)
- Collapsible console
- Tabbed interface for multiple requests
```

---

### 3.3 Dashboard Pattern

Layout für Dashboard-Seiten.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Dashboard Title                                    [Time Range] [Export] │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│ │ Metric 1    │ │ Metric 2    │ │ Metric 3    │ │ Metric 4    │         │
│ │             │ │             │ │             │ │             │         │
│ │   1,234     │ │   98.5%     │ │    42       │ │   12ms      │         │
│ │   ↑ 12%     │ │   ↑ 0.5%    │ │   ↓ 3%      │ │   ↑ 2ms     │         │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                                                                     │ │
│  │                       Main Chart Area                               │ │
│  │                                                                     │ │
│  │   (Line Chart / Bar Chart / Area Chart)                            │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
├────────────────────────────────────────┬─────────────────────────────────┤
│                                        │                                 │
│  Activity Feed                         │  Quick Actions                  │
│  ┌────────────────────────────────┐    │  ┌───────────────────────────┐ │
│  │ • payment.succeeded  2m ago   │    │  │ [Generate API Key]        │ │
│  │ • webhook.delivered  5m ago   │    │  │ [Test Webhook]            │ │
│  │ • payment.failed    10m ago   │    │  │ [View Logs]               │ │
│  │ • customer.created  15m ago   │    │  │ [Export Data]             │ │
│  └────────────────────────────────┘    │  └───────────────────────────┘ │
│                                        │                                 │
└────────────────────────────────────────┴─────────────────────────────────┘
```

---

## 4. Layouts

### 4.1 Desktop Layout (1440px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                           Container (max 1440px)                          │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                          Header (64px)                              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                                                                     │ │
│  │                          Main Content                               │ │
│  │                                                                     │ │
│  │                     (12-column grid system)                         │ │
│  │                                                                     │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                          Footer (80px)                              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

Grid: 12 columns
Gutter: 24px
Margin: 48px
```

### 4.2 Tablet Layout (1024px)

```
┌──────────────────────────────────────────┐
│                                          │
│         Container (max 1024px)           │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │          Header (64px)             │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                     │ │
│  │        Main Content                │ │
│  │        (8-column grid)             │ │
│  │                                     │ │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │          Footer (80px)             │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘

Grid: 8 columns
Gutter: 16px
Margin: 24px
Sidebar: Mini mode (64px)
```

### 4.3 Mobile Layout (375px)

```
┌────────────────────────┐
│                        │
│   Container (375px)    │
│                        │
│  ┌──────────────────┐  │
│  │ Header (56px)    │  │
│  │ [☰] Logo [🔍]   │  │
│  └──────────────────┘  │
│                        │
│  ┌──────────────────┐  │
│  │                  │  │
│  │  Main Content    │  │
│  │  (1 column)      │  │
│  │                  │  │
│  │  Cards stacked   │  │
│  │  vertically      │  │
│  │                  │  │
│  └──────────────────┘  │
│                        │
│  ┌──────────────────┐  │
│  │ Footer           │  │
│  └──────────────────┘  │
│                        │
└────────────────────────┘

Grid: 1 column
Gutter: 16px
Margin: 16px
Sidebar: Hidden (hamburger menu)
Navigation: Bottom bar optional
```

---

## 5. Figma Organization

### 5.1 File Structure

```
CargoBit Design System
├── 📁 Foundations
│   ├── Colors
│   ├── Typography
│   ├── Spacing
│   ├── Radius
│   ├── Shadows
│   └── Animation
│
├── 📁 Components
│   ├── Buttons
│   ├── Inputs
│   ├── Navigation
│   ├── Content
│   └── Feedback
│
├── 📁 Patterns
│   ├── Documentation Pattern
│   ├── Tool Pattern
│   └── Dashboard Pattern
│
├── 📁 Layouts
│   ├── Desktop (1440px)
│   ├── Tablet (1024px)
│   └── Mobile (375px)
│
└── 📁 Documentation
    ├── Usage Guidelines
    ├── Accessibility Notes
    └── Code Snippets
```

### 5.2 Naming Conventions

```
Components: ComponentName/Variant/State
Example: Button/Primary/Hover

Colors: Category/Token/Hue
Example: Primary/500 or Neutral/200

Typography: Type/Size/Weight
Example: Heading/H1/Semibold

Spacing: Space/Size
Example: Space/MD or Space/24
```

---

## 6. Design Tokens Export

### 6.1 CSS Variables

```css
:root {
  /* Colors */
  --color-primary-500: #0057FF;
  --color-primary-600: #003FCC;
  --color-neutral-100: #F1F5F9;
  --color-neutral-900: #0F172A;
  --color-success-500: #00C853;
  --color-error-500: #FF3B30;
  
  /* Typography */
  --font-family-base: "Inter", sans-serif;
  --font-family-mono: "IBM Plex Mono", monospace;
  --font-size-h1: 32px;
  --font-size-body: 16px;
  
  /* Spacing */
  --space-xs: 16px;
  --space-sm: 24px;
  --space-md: 32px;
  
  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  /* Shadows */
  --shadow-sm: 0 2px 4px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 8px rgba(0,0,0,0.12);
}
```

### 6.2 Tailwind Config

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
        },
        neutral: {
          100: 'var(--color-neutral-100)',
          900: 'var(--color-neutral-900)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      }
    }
  }
}
```

---

*Dieses Figma-Designsystem bildet die vollständige visuelle Grundlage für das CargoBit Developer Portal und gewährleistet Konsistenz, Effizienz und professionelle Qualität über alle Touchpoints.*
