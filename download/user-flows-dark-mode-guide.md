# CargoBit Risk Dashboard - User Flows & Dark Mode Package

## 📦 Enthaltene Dateien

| Datei | Beschreibung | Format |
|-------|--------------|--------|
| `user-flows-high-risk.json` | 3 interaktive User-Flows (Blocked, Review, Retry) | Flow Definition |
| `figma-dark-mode-tokens.json` | Vollständige Dark Mode Design Tokens | Style Dictionary |

---

# 🔄 Teil 1: User Flows

## Flow A: High-Risk Case Handling (Aktion blockiert)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FLOW A: HIGH-RISK BLOCKED                          │
└─────────────────────────────────────────────────────────────────────────────┘

  USER                UI              FRONTEND         SECURITY          RISK
    │                  │                  │              GATEWAY          ENGINE
    │                  │                  │                 │               │
    │──Click "Angebot akzeptieren"───────▶│                 │               │
    │                  │                  │                 │               │
    │                  │   Loading State  │                 │               │
    │                  │   [Spinner...]   │                 │               │
    │                  │                  │                 │               │
    │                  │                  │──POST /security/check──────────▶│
    │                  │                  │                 │               │
    │                  │                  │                 │──Permission Check
    │                  │                  │                 │  ✓ SHIPPER can ACCEPT
    │                  │                  │                 │               │
    │                  │                  │                 │──POST /risk/evaluate─▶
    │                  │                  │                 │               │
    │                  │                  │                 │◀──Score: 81 (RED)─────
    │                  │                  │                 │  Rules: new_iban,
    │                  │                  │                 │  high_amount, fraud_flags
    │                  │                  │                 │               │
    │                  │                  │                 │──Decision: BLOCK
    │                  │                  │                 │──Create Ticket
    │                  │                  │                 │──Send Email
    │                  │                  │                 │──Send Slack
    │                  │                  │                 │               │
    │                  │                  │◀──403 Forbidden─────────────────│
    │                  │                  │  errorCode: HIGH_RISK_BLOCKED  │
    │                  │                  │  supportTicketId: st_89234     │
    │                  │                  │                 │               │
    │                  │  ┌─────────────────────────────┐   │               │
    │                  │  │ 🚨 Aktion blockiert         │   │               │
    │                  │  │                             │   │               │
    │                  │  │ Diese Aktion wurde aus      │   │               │
    │                  │  │ Sicherheitsgründen gestoppt.│   │               │
    │                  │  │                             │   │               │
    │                  │  │ Risk Score: 81              │   │               │
    │                  │  │ Ticket: st_89234            │   │               │
    │                  │  │                             │   │               │
    │                  │  │         [ OK ]              │   │               │
    │                  │  └─────────────────────────────┘   │               │
    │◀─────────────────│  Show Blocked Modal               │               │
    │                  │                  │                 │               │
```

### UI-Zustände während Flow A

| Step | Komponente | State | Details |
|------|------------|-------|---------|
| 1 | Button | `default` | "Angebot akzeptieren" |
| 2 | Button | `loading` | Spinner, disabled |
| 3 | Modal | `blocked` | Error Icon, RED Theme |
| 4 | Dashboard | `updated` | Neue Entity in High-Risk Table |

---

## Flow B: Support prüft High-Risk Fall

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLOW B: SUPPORT REVIEW                              │
└─────────────────────────────────────────────────────────────────────────────┘

  SUPPORT            DASHBOARD          RISK PROFILE         BACKEND
    │                    │                    │                  │
    │──Open Ticket (Email/Slack/Dashboard)──▶│                  │
    │                    │                    │                  │
    │                    │  Show Risk Profile │                  │
    │                    │  Score: 81 (RED)   │                  │
    │                    │  Triggered Rules   │                  │
    │                    │                    │                  │
    │                    │  ┌────────────────────────────────┐  │
    │                    │  │ [Entsperren]  [Verifikation]  [Sperren] │
    │                    │  └────────────────────────────────┘  │
    │                    │                    │                  │
    │                    │                    │                  │

  ╔═══════════════════════════════════════════════════════════════════════════╗
  ║                        ENTSCHEIDUNG (3 OPTIONEN)                          ║
  ╠═══════════════════════════════════════════════════════════════════════════╣
  ║                                                                           ║
  ║  OPTION 1: ENTSPERREN                    OPTION 2: VERIFIKATION           ║
  ║  ────────────────────                    ─────────────────────           ║
  ║  Condition: Fall legitim                 Condition: Dokument nötig       ║
  ║  Action: POST /risk/override             Action: POST /verification      ║
  ║  Result: Score → 15 (GREEN)              Result: User lädt Doc hoch      ║
  ║  Next: Flow C                            Next: Flow D                    ║
  ║                                                                           ║
  ║  OPTION 3: NUTZER SPERREN                                                ║
  ║  ────────────────────────                                                ║
  ║  Condition: Verdacht auf Betrug                                          ║
  ║  Action: POST /user/block                                                ║
  ║  Result: User → BLOCKED                                                  ║
  ║  Next: Terminal (Ende)                                                   ║
  ║                                                                           ║
  ╚═══════════════════════════════════════════════════════════════════════════╝
```

### UI-Optionen für Support

| Option | Button Style | API Endpoint | Result |
|--------|--------------|--------------|--------|
| **Entsperren** | Primary (#2D8CFF) | `POST /risk/override` | Score → GREEN |
| **Verifikation** | Secondary (Outline) | `POST /verification/request` | Pending |
| **Sperren** | Danger (#E74C3C) | `POST /user/block` | User blocked |

---

## Flow C: Retry nach Freigabe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FLOW C: RETRY AFTER UNLOCK                             │
└─────────────────────────────────────────────────────────────────────────────┘

  USER                UI              SECURITY GATEWAY          RISK ENGINE
    │                  │                    │                        │
    │◀──Email: "Deine Anfrage wurde genehmigt"                      │
    │                  │                    │                        │
    │                  │  ┌────────────────────────────────┐        │
    │                  │  │ ✅ Deine Anfrage wurde genehmigt │       │
    │                  │  │    Du kannst jetzt fortfahren.  │       │
    │                  │  │         [Jetzt fortfahren]      │       │
    │                  │  └────────────────────────────────┘        │
    │                  │                    │                        │
    │──Click "Jetzt fortfahren"───────────▶│                        │
    │                  │                    │                        │
    │                  │  Show Transport    │                        │
    │                  │  Status: UNLOCKED  │                        │
    │                  │  Badge: GREEN      │                        │
    │                  │                    │                        │
    │──Click "Angebot akzeptieren"────────▶│                        │
    │                  │                    │                        │
    │                  │                    │──POST /security/check──▶
    │                  │                    │                        │
    │                  │                    │◀──Permission: ✓ ───────│
    │                  │                    │◀──Risk: 15 (GREEN) ────│
    │                  │                    │                        │
    │                  │                    │──Decision: ALLOW       │
    │                  │                    │                        │
    │                  │  ┌────────────────────────────────┐        │
    │                  │  │ ✔ Angebot erfolgreich akzeptiert│       │
    │                  │  │    Der Transport wurde gebucht. │       │
    │                  │  │      [Transport anzeigen]       │       │
    │                  │  └────────────────────────────────┘        │
    │◀─────────────────│  Success Modal      │                        │
    │                  │                    │                        │
```

---

# 🌙 Teil 2: Dark Mode Design Tokens

## Farbpalette Vergleich

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| **Background** | `#F7F9FB` | `#0E1117` |
| **Card** | `#FFFFFF` | `#161B22` |
| **Border** | `#E0E6ED` | `#30363D` |
| **Text Primary** | `#1F2D3D` | `#F0F6FC` |
| **Text Secondary** | `#6B7C93` | `#8B949E` |

## Risk Colors - Dark Mode

| Level | Color | Background (Dark) |
|-------|-------|-------------------|
| GREEN | `#3FBF7F` | `rgba(63, 191, 127, 0.15)` |
| YELLOW | `#E2C75C` | `rgba(226, 199, 92, 0.15)` |
| RED | `#F85149` | `rgba(248, 81, 73, 0.15)` |

## Buttons - Dark Mode

### Primary Button
```css
/* Dark Mode */
background: #58A6FF;
color: #0E1117;

/* Hover */
background: #1F6FEB;

/* Disabled */
background: #1F2A37;
color: #6E7681;
```

### Danger Button
```css
/* Dark Mode */
background: #F85149;
color: #0E1117;

/* Hover */
background: #DA3633;

/* Disabled */
background: #4D2020;
color: #484F58;
```

## Risk Badge - Dark Mode

```css
/* GREEN Badge - Dark Mode */
background: rgba(63, 191, 127, 0.15);
color: #3FBF7F;
border: 1px solid rgba(63, 191, 127, 0.3);

/* YELLOW Badge - Dark Mode */
background: rgba(226, 199, 92, 0.15);
color: #E2C75C;
border: 1px solid rgba(226, 199, 92, 0.3);

/* RED Badge - Dark Mode */
background: rgba(248, 81, 73, 0.15);
color: #F85149;
border: 1px solid rgba(248, 81, 73, 0.3);
```

---

# 📐 UI-Zustands-Diagramme

## Button State Machine

```
                    ┌─────────┐
                    │ DEFAULT │
                    └────┬────┘
                         │
         ┌───────────────┼───────────────┐
         │ hover         │ focus         │ disabled
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌──────────┐
    │  HOVER  │    │  FOCUS  │    │ DISABLED │
    └────┬────┘    └────┬────┘    └──────────┘
         │               │
         │ active        │ active
         ▼               ▼
    ┌─────────┐    ┌─────────┐
    │ ACTIVE  │    │ ACTIVE  │
    └────┬────┘    └────┬────┘
         │               │
         │ click         │ click
         ▼               ▼
    ┌─────────┐    ┌─────────┐
    │ LOADING │    │ LOADING │
    └────┬────┘    └────┬────┘
         │               │
         │ success/error │ success/error
         └───────┬───────┘
                 │
                 ▼
           ┌─────────┐
           │ DEFAULT │
           └─────────┘
```

## Risk Score State Machine

```
                    ┌────────────┐
                    │ EVALUATING │
                    └──────┬─────┘
                           │
                           │ calculation complete
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    score ≤ 30        31 ≤ score ≤ 60   score ≥ 61
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │  GREEN  │      │ YELLOW  │      │   RED   │
    │ (Allow) │      │(Mitigate)│      │(Blocked)│
    └────┬────┘      └────┬────┘      └────┬────┘
         │                │                │
         │                │                │ manual_override
         │                │                │
         │                │                ▼
         │                │          ┌──────────┐
         │                │          │ OVERRIDE │
         │                │          │ (GREEN/  │
         │                │          │  YELLOW) │
         │                │          └────┬─────┘
         │                │               │
         └────────────────┴───────────────┘
                          │
                          ▼
                    ┌──────────┐
                    │ COMPLETE │
                    └──────────┘
```

---

# 🔧 Implementierung

## CSS Variables generieren

```bash
# Mit Style Dictionary
npm install -g style-dictionary

# Config erstellen
cat > config.json << 'EOF'
{
  "source": ["figma-dark-mode-tokens.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "prefix": "cargbit-dark",
      "files": [{
        "destination": "dark-mode.css",
        "format": "css/variables"
      }]
    }
  }
}
EOF

# Build
style-dictionary build --config config.json
```

## React Theme Provider

```typescript
// themes/dark.ts
import darkTokens from './figma-dark-mode-tokens.json';

export const darkTheme = {
  colors: {
    background: darkTokens.tokens.colors.background.primary.value,
    card: darkTokens.tokens.colors.background.secondary.value,
    border: darkTokens.tokens.colors.border.default.value,
    text: {
      primary: darkTokens.tokens.colors.text.primary.value,
      secondary: darkTokens.tokens.colors.text.secondary.value,
    },
    risk: {
      green: darkTokens.tokens.colors.risk.green.value,
      yellow: darkTokens.tokens.colors.risk.yellow.value,
      red: darkTokens.tokens.colors.risk.red.value,
    },
  },
};

// App.tsx
import { ThemeProvider } from 'styled-components';
import { darkTheme } from './themes/dark';

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <RiskDashboard />
    </ThemeProvider>
  );
}
```

## Tailwind Config erweitern

```javascript
// tailwind.config.js
const darkTokens = require('./figma-dark-mode-tokens.json');

module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          primary: darkTokens.tokens.colors.background.primary.value,
          secondary: darkTokens.tokens.colors.background.secondary.value,
        },
        risk: {
          green: darkTokens.tokens.colors.risk.green.value,
          yellow: darkTokens.tokens.colors.risk.yellow.value,
          red: darkTokens.tokens.colors.risk.red.value,
        },
      },
    },
  },
};
```

---

# 📋 Checklist

## Für Figma Designer
- [ ] Dark Mode Tokens importieren
- [ ] Components mit Dark Mode Varianten erstellen
- [ ] User Flows als Prototypen bauen
- [ ] Übergänge zwischen Light/Dark testen

## Für Frontend Entwickler
- [ ] Theme Provider implementieren
- [ ] CSS Variables generieren
- [ ] Tailwind Config erweitern
- [ ] User Flow States implementieren
- [ ] API Integration für alle Flows

## Für QA
- [ ] Alle 3 User Flows testen
- [ ] Light/Dark Mode Toggle
- [ ] Error States
- [ ] Loading States
- [ ] Accessibility (WCAG 2.1 AA)

---

*Package Version: 1.0.0 | April 2026*
*CargoBit Security Team*
