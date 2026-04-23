# CargoBit Design System

## Übersicht

Das CargoBit Design System ist eine umfassende, modulare Sammlung von Design-Tokens, Komponenten und Konfigurationen für die CargoBit Transportplattform. Es wurde entwickelt, um Konsistenz, Skalierbarkeit und Wartbarkeit über alle Frontend-Anwendungen hinweg zu gewährleisten.

### Version: 1.0.0

---

## Dateistruktur

```
CargoBit_Design_System/
├── tokens/
│   ├── design-tokens.json      # Vollständige Token-Definitionen
│   └── dark-mode-overrides.json # Dark-Mode Overrides
├── config/
│   └── tailwind.config.js      # Tailwind CSS Konfiguration
├── styles/
│   └── design-tokens.css       # CSS-Variablen (Light/Dark)
├── components/
│   ├── Button.tsx              # Button-Komponente
│   ├── Input.tsx               # Input & Textarea Komponenten
│   └── Card.tsx                # Card & TransportCard Komponenten
├── utils/
│   └── cn.ts                   # Utility-Funktionen
├── index.ts                    # Hauptexport-Datei
└── README.md                   # Diese Dokumentation
```

---

## Schnellstart

### Installation

```bash
# Erforderliche Dependencies
npm install tailwindcss clsx tailwind-merge class-variance-authority

# Tailwind CSS initialisieren
npx tailwindcss init
```

### Einrichtung

1. **Tailwind Konfiguration kopieren:**
   ```bash
   cp config/tailwind.config.js ./tailwind.config.js
   ```

2. **CSS-Variablen importieren:**
   ```css
   @import './styles/design-tokens.css';
   ```

3. **Komponenten verwenden:**
   ```tsx
   import { Button, Card, RiskBadge } from './CargoBit_Design_System';
   ```

---

## Design Tokens

### Farbsystem

#### Brand Colors
| Token | Wert | Verwendung |
|-------|------|------------|
| `brand.primary` | `#0052FF` | Primäre Aktionen, Links |
| `brand.secondary` | `#00C2A8` | Sekundäre Elemente |
| `brand.accent` | `#FFB800` | Hervorhebungen |

#### Risk Level Colors (CargoBit Core)
| Token | Wert | Bedeutung |
|-------|------|-----------|
| `risk.green` | `#2ECC71` | Niedriges Risiko |
| `risk.yellow` | `#F1C40F` | Mittleres Risiko |
| `risk.red` | `#E74C3C` | Hohes Risiko |

#### Neutral Scale
```
neutral-50:  #F9FAFB  (Seitenhintergrund)
neutral-100: #F3F4F6  (Subtile Oberflächen)
neutral-200: #E5E7EB  (Borders)
neutral-300: #D1D5DB  (Input Borders)
neutral-400: #9CA3AF  (Placeholder)
neutral-500: #6B7280  (Muted Text)
neutral-600: #4B5563  (Secondary Text)
neutral-700: #374151  (Body Text)
neutral-800: #1F2933  (Headings)
neutral-900: #111827  (Primary Text)
```

### Typografie

#### Font Family
- **Primary:** Inter (-apple-system fallback)
- **Mono:** JetBrains Mono (Consolas fallback)

#### Font Sizes
| Token | Größe | Verwendung |
|-------|-------|------------|
| `xs` | 12px | Captions, Labels |
| `sm` | 14px | Helper Text, Badges |
| `md` | 16px | Body Text |
| `lg` | 18px | Lead Text |
| `xl` | 20px | H3 |
| `2xl` | 32px | H1, H2 |

### Spacing
```
4px  | 8px  | 12px | 16px | 20px | 24px | 32px | 40px
```

### Border Radius
| Token | Wert | Verwendung |
|-------|------|------------|
| `sm` | 4px | Badges, kleine Elemente |
| `md` | 8px | Buttons, Inputs |
| `lg` | 12px | Cards |
| `pill` | 999px | Tags, Chips |

---

## Dark Mode

### Aktivierung

Dark Mode wird über die `class`-Strategie aktiviert:

```html
<!-- Light Mode (default) -->
<html>

<!-- Dark Mode -->
<html class="dark">
```

### Dark Mode Overrides

Im Dark Mode werden folgende Tokens überschrieben:

- Hintergrundfarben werden dunkler
- Textfarben werden heller
- Brand Primary wird aufgehellt (`#4C8DFF`)
- Shadows werden intensiver

```json
{
  "color": {
    "background": {
      "page": "#0F1115",
      "surface": "#1A1C20"
    },
    "text": {
      "primary": "#FFFFFF",
      "secondary": "#D1D5DB"
    }
  }
}
```

---

## Komponenten

### Button

```tsx
import { Button } from './CargoBit_Design_System';

// Varianten
<Button variant="primary">Primär</Button>
<Button variant="secondary">Sekundär</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Gefährlich</Button>
<Button variant="outline">Outline</Button>
<Button variant="link">Link</Button>

// Größen
<Button size="sm">Klein</Button>
<Button size="md">Mittel</Button>
<Button size="lg">Groß</Button>

// Mit Icons
<Button leftIcon={<Icon />}>Mit Icon</Button>
<Button rightIcon={<Icon />}>Icon rechts</Button>

// Loading State
<Button loading>Lädt...</Button>

// Full Width
<Button fullWidth>Volle Breite</Button>
```

### Input

```tsx
import { Input, Textarea } from './CargoBit_Design_System';

// Standard Input
<Input
  label="Label"
  placeholder="Placeholder"
  helperText="Hilfetext"
/>

// Mit Validierung
<Input
  label="E-Mail"
  type="email"
  error="Ungültige E-Mail-Adresse"
/>

// Mit Icons
<Input
  leftIcon={<SearchIcon />}
  placeholder="Suchen..."
/>

// Textarea
<Textarea
  label="Beschreibung"
  placeholder="Ihre Beschreibung..."
  rows={4}
/>
```

### Card

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  TransportCard,
  RiskBadge
} from './CargoBit_Design_System';

// Standard Card
<Card>
  <CardHeader bordered>
    <CardTitle>Titel</CardTitle>
    <CardDescription>Beschreibung</CardDescription>
  </CardHeader>
  <CardContent>
    Inhalt
  </CardContent>
  <CardFooter bordered>
    <Button>Aktion</Button>
  </CardFooter>
</Card>

// Transport Card (spezialisiert)
<TransportCard
  transportId="TR-12345"
  route={{ from: 'Berlin', to: 'München' }}
  risk="green"
  status="Aktiv"
  price={1500}
  onClick={() => console.log('Clicked')}
/>

// Risk Badge
<RiskBadge risk="green" showLabel />
<RiskBadge risk="yellow" showLabel />
<RiskBadge risk="red" showLabel />
```

---

## Tailwind Integration

### Custom Colors

```tsx
// In Komponenten verwenden
<div className="bg-brand-primary text-white">
<div className="bg-risk-green text-risk-green-text">
<div className="border-neutral-200">
```

### Custom Shadows

```tsx
<div className="shadow-card">
<div className="shadow-dropdown">
<div className="shadow-modal">
```

### Animation

```tsx
<div className="animate-fade-in">
<div className="animate-slide-up">
<div className="animate-pulse-risk">
```

---

## CSS Variablen

### Direkte Verwendung

```css
.custom-element {
  background-color: var(--color-brand-primary);
  color: var(--color-text-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--spacing-16);
}
```

### Tailwind mit CSS Variablen

```tsx
<div className="bg-[var(--color-brand-primary)]">
<div className="text-[var(--color-text-primary)]">
```

---

## Best Practices

### 1. Token-First Design
- Verwende immer Design-Tokens statt hardcodierter Werte
- Nutze `var(--spacing-16)` statt `16px`
- Nutze `text-neutral-600` statt `#4B5563`

### 2. Semantische Farbverwendung
- `brand.primary` für primäre Aktionen
- `risk.*` für Risiko-Indikatoren
- `feedback.*` für Status-Meldungen

### 3. Responsive Design
- Mobile-first Ansatz
- Breakpoints: `sm:640px`, `md:768px`, `lg:1024px`

### 4. Accessibility
- Alle interaktiven Elemente haben Focus-States
- Kontrastverhältnis mind. 4.5:1 für Text
- ARIA-Labels für Icons

---

## Dependencies

```json
{
  "dependencies": {
    "tailwindcss": "^3.4.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "class-variance-authority": "^0.7.0"
  }
}
```

---

## Figma Integration

Die Design Tokens können mit **Figma Tokens Plugin** oder **Tokens Studio** importiert werden:

1. Plugin installieren: [Tokens Studio for Figma](https://www.tokens.studio/)
2. JSON-Datei importieren: `tokens/design-tokens.json`
3. Dark Mode Overrides: `tokens/dark-mode-overrides.json`

---

## Changelog

### v1.0.0 (2024)
- Initiale Version
- Design Tokens (Light/Dark)
- Tailwind Konfiguration
- React Komponenten (Button, Input, Card)
- CSS Variablen
- Utility Functions

---

## Support

Bei Fragen zur Verwendung oder Erweiterung des Design Systems:

1. Dokumentation konsultieren
2. Code-Beispiele in den Komponenten-Dateien prüfen
3. Tailwind CSS Dokumentation: [tailwindcss.com](https://tailwindcss.com)
