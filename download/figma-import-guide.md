# CargoBit Risk Dashboard - Figma & UI Copywriting Package

## 📦 Enthaltene Dateien

| Datei | Beschreibung | Format |
|-------|--------------|--------|
| `figma-design-tokens.json` | Design Tokens (Colors, Typography, Spacing) | Style Dictionary |
| `figma-components.json` | Component Blueprints mit Varianten | Figma Plugin Format |
| `ui-copywriting.json` | Alle UI-Texte, Tooltips, Fehlermeldungen | i18n JSON |

---

## 🚀 Import-Anleitung

### 1. Figma Tokens Plugin

```
1. Figma öffnen → Plugins → Figma Tokens
2. "Import" wählen
3. figma-design-tokens.json auswählen
4. Tokens werden automatisch angewendet
```

### 2. Design Tokens Studio

```
1. VS Code mit Design Tokens Studio Extension
2. figma-design-tokens.json in Projekt öffnen
3. Tokens sind sofort verfügbar
```

### 3. Style Dictionary (CLI)

```bash
# Install Style Dictionary
npm install -g style-dictionary

# Build CSS Variables
styledictionary build --config ./config.json

# Output: tokens.css mit allen CSS Variables
```

---

## 🎨 Design Tokens Übersicht

### Colors

| Token | Wert | Verwendung |
|-------|------|------------|
| `colors.risk.green` | `#2ECC71` | GREEN Risk Level |
| `colors.risk.yellow` | `#F1C40F` | YELLOW Risk Level |
| `colors.risk.red` | `#E74C3C` | RED Risk Level |
| `colors.ui.primary` | `#2D8CFF` | Primary Buttons, Links |
| `colors.ui.background` | `#F7F9FB` | Page Background |
| `colors.ui.card` | `#FFFFFF` | Card Background |

### Spacing

| Token | Wert |
|-------|------|
| `spacing.xs` | 4px |
| `spacing.sm` | 8px |
| `spacing.md` | 12px |
| `spacing.lg` | 16px |
| `spacing.xl` | 24px |
| `spacing.xxl` | 32px |

### Border Radius

| Token | Wert |
|-------|------|
| `radius.sm` | 4px |
| `radius.md` | 8px |
| `radius.lg` | 12px |

---

## 🧩 Components Übersicht

### Button

```json
// Varianten
type: ["primary", "secondary", "danger", "ghost"]
state: ["default", "hover", "active", "disabled", "loading"]
size: ["sm", "md", "lg"]
```

**Beispiel Primary Button:**
```css
background: #2D8CFF;
color: #FFFFFF;
border-radius: 8px;
padding: 10px 20px;
```

### RiskBadge

```json
// Varianten
level: ["green", "yellow", "red", "grey"]
size: ["sm", "md"]
```

**Beispiel RED Badge:**
```css
background: #FDEDEC;
color: #E74C3C;
padding: 4px 10px;
border-radius: 4px;
```

### RiskScoreCircle

```json
// Varianten
level: ["green", "yellow", "red"]
size: ["sm", "md", "lg", "xl"]
```

**Größen:**
| Size | Diameter | Font Size | Stroke |
|------|----------|-----------|--------|
| sm | 48px | 14px | 3px |
| md | 64px | 18px | 4px |
| lg | 96px | 28px | 6px |
| xl | 120px | 36px | 8px |

---

## ✍️ UI Copywriting Übersicht

### Dashboard KPI Texte

| KPI | Titel | Tooltip |
|-----|-------|---------|
| Total | "Gesamt Entities" | "Alle überwachten Nutzer, Firmen und Transaktionen im System" |
| GREEN | "GREEN Entities" | "Niedriges Risiko (Score 0-30). Normale Aktionen ohne Einschränkungen." |
| YELLOW | "YELLOW Entities" | "Mittleres Risiko (Score 31-60). Aktionen mit Mitigations ausgeführt." |
| RED | "RED Entities" | "Hohes Risiko (Score 61-100). Aktionen blockiert, Support-Ticket erstellt." |

### Fehlermeldungen

| Error Code | Titel | Nachricht |
|------------|-------|-----------|
| `PERMISSION_DENIED` | "Keine Berechtigung" | "Du hast keine Berechtigung, diese Aktion auszuführen." |
| `HIGH_RISK_BLOCKED` | "Aktion blockiert" | "Diese Aktion wurde aus Sicherheitsgründen blockiert. Unser Team prüft den Fall." |
| `SECURITY_SERVICE_UNAVAILABLE` | "Dienst nicht verfügbar" | "Der Sicherheitsdienst ist momentan nicht erreichbar. Bitte versuche es später erneut." |

### User Feedback

| Level | Nachricht |
|-------|-----------|
| RED (Blocked) | "Diese Aktion wurde aus Sicherheitsgründen blockiert. Unser Team prüft den Fall." |
| YELLOW (Mitigation) | "Diese Aktion wurde ausgeführt, aber zusätzliche Sicherheitsmaßnahmen wurden angewendet." |
| GREEN (Allowed) | *(keine Nachricht)* |

### Mitigation Messages

| Typ | Nachricht |
|-----|-----------|
| delayed | "Diese Aktion wurde verzögert, um zusätzliche Sicherheitsprüfungen durchzuführen." |
| logging | "Wir haben zusätzliche Logs erstellt, um die Aktivität zu überwachen." |
| verification | "Bitte bestätige deine Identität, um fortzufahren." |
| manualReview | "Diese Transaktion wird manuell überprüft." |
| delayedPayout | "Der Payout wurde um 24 Stunden verzögert." |

---

## 📐 Component-Mapping für Entwickler

### TypeScript Interface

```typescript
// Aus ui-copywriting.json generiert
interface RiskLevel {
  green: 'GREEN';
  yellow: 'YELLOW';
  red: 'RED';
  grey: 'UNKNOWN';
}

interface ErrorMessages {
  permissionDenied: {
    title: string;
    message: string;
    action: string;
  };
  highRiskBlocked: {
    title: string;
    message: string;
    action: string;
  };
  // ...
}

interface UITexts {
  dashboard: {
    title: string;
    subtitle: string;
    kpiCards: {
      totalEntities: { title: string; tooltip: string; };
      // ...
    };
  };
}
```

### React Hook Usage

```typescript
import uiTexts from './ui-copywriting.json';

function RiskBadge({ level }: { level: 'green' | 'yellow' | 'red' }) {
  const labels = uiTexts.statusLabels.riskLevel;
  return (
    <span className={`badge badge-${level}`}>
      {labels[level]}
    </span>
  );
}
```

---

## 🔄 Figma Auto-Layout Setup

### Dashboard Overview

```
Frame: Dashboard Overview
├── Auto Layout: Vertical, Gap: 24px, Padding: 24px
│
├── Header
│   └── Auto Layout: Horizontal, Space Between
│
├── KPI Row
│   └── Auto Layout: Horizontal, Gap: 16px
│       ├── KPI Card × 4
│       │   └── Auto Layout: Vertical, Gap: 8px
│
├── Main Content Grid
│   └── Grid: 2 Columns, Gap: 24px
│       ├── Top Risk Entities (Card)
│       └── Risk Trend Chart (Card)
│
└── Events Table (Card)
    └── Auto Layout: Vertical, Gap: 16px
```

### Risk Profile Detail

```
Frame: Risk Profile
├── Auto Layout: Vertical, Gap: 24px, Padding: 24px
│
├── Back Navigation
│
├── Two Column Layout
│   └── Auto Layout: Horizontal, Gap: 24px
│       │
│       ├── Left Column (320px)
│       │   └── Auto Layout: Vertical, Gap: 16px
│       │       ├── Score Card
│       │       ├── Actions Card
│       │       └── Details Card
│       │
│       └── Right Column (Flex: 1)
│           └── Auto Layout: Vertical, Gap: 16px
│               ├── Triggered Rules Card
│               ├── Score History Card
│               ├── Event Timeline Card
│               └── Support Ticket Card
```

---

## 📋 Checklist für Figma

### Atoms
- [ ] Color Tokens importieren
- [ ] Typography Styles erstellen
- [ ] Icon Set importieren (Lucide)

### Molecules
- [ ] Button Component (4 types × 4 states × 3 sizes = 48 variants)
- [ ] RiskBadge Component (4 levels × 2 sizes = 8 variants)
- [ ] EntityBadge Component (3 types)
- [ ] Input Component (4 states)
- [ ] RiskScoreCircle (3 levels × 4 sizes = 12 variants)

### Organisms
- [ ] KPICard Component
- [ ] RiskDistribution Chart
- [ ] RiskTrend Chart
- [ ] RiskEvents Table
- [ ] TriggeredRules List
- [ ] ScoreHistory Chart
- [ ] RuleEditor Modal

### Pages
- [ ] Dashboard Overview
- [ ] Risk Profile (GREEN)
- [ ] Risk Profile (YELLOW)
- [ ] Risk Profile (RED)
- [ ] Rules Management

---

## 🛠️ Nützliche Figma Plugins

| Plugin | Verwendung |
|--------|------------|
| **Figma Tokens** | Import Design Tokens |
| **Design Tokens Studio** | VS Code Integration |
| **Content Reel** | UI Copywriting testen |
| **Similayer** | Ähnliche Layer finden |
| **Autoflow** | Flow Diagramme |
| **Anima** | React Code Export |

---

*Package Version: 1.0.0 | April 2026*
*CargoBit Security Team*
