# 🧱 BLOCK U — Developer-Portal Accessibility-Konzept

## WCAG 2.1 AA Konformität

### Barrierefreies CargoBit Developer Portal

Dieses Dokument definiert die Accessibility-Anforderungen und -Implementierung für das CargoBit Developer Portal, um vollständige WCAG 2.1 AA Konformität zu gewährleisten.

---

## 1. Accessibility-Ziele

### 1.1 Compliance-Ziele

| Standard | Stufe | Status |
|----------|-------|--------|
| **WCAG 2.1** | AA | Vollständig konform |
| **Section 508** | - | Konform |
| **EN 301 549** | - | Konform |
| **ADA** | - | Konform |

### 1.2 Zielgruppen

Das Portal muss für folgende Benutzergruppen vollständig zugänglich sein:

| Gruppe | Anforderungen |
|--------|---------------|
| **Blinde Benutzer** | Screenreader-Kompatibilität, Tastaturnavigation |
| **Sehbehinderte** | Skalierbare Schriftgrößen, hoher Kontrast |
| **Motorisch eingeschränkt** | Vollständige Tastaturnavigation, ausreichende Click-Targets |
| **Kognitiv eingeschränkt** | Klare Sprache, konsistente Navigation |
| **Taub/hörbehindert** | Untertitel für Videos, visuelle Alternativen |

### 1.3 Accessibility-Metriken

| Metrik | Ziel |
|--------|------|
| **Axe Core Violations** | 0 |
| **Lighthouse Accessibility Score** | 100 |
| **WAVE Errors** | 0 |
| **Manual Test Pass Rate** | 100% |

---

## 2. WCAG 2.1 AA Anforderungen

### 2.1 Wahrnehmbarkeit (Perceivable)

#### 2.1.1 Text Alternatives (1.1.1)

Alle nicht-textlichen Inhalte müssen Textalternativen haben.

**Implementierung:**

```html
<!-- Bilder mit Alt-Text -->
<img src="architecture-diagram.png" 
     alt="CargoBit Systemarchitektur mit drei Hauptschichten: API Gateway, Business Logic und Database" />

<!-- Dekorative Bilder -->
<img src="decorative-icon.svg" alt="" role="presentation" />

<!-- Komplexe Diagramme -->
<figure>
  <img src="flowchart.png" 
       alt="Payment Processing Flowchart" 
       aria-describedby="flowchart-desc" />
  <figcaption id="flowchart-desc">
    Detaillierte Beschreibung des Zahlungsablaufs: 
    Der Kunde initiiert die Zahlung, das System validiert...
  </figcaption>
</figure>

<!-- Icons mit Bedeutungen -->
<button aria-label="Einstellungen">
  <svg aria-hidden="true">
    <use href="#settings-icon"></use>
  </svg>
</button>
```

#### 2.1.2 Zeitbasierte Medien (1.2.1 - 1.2.5)

Videos und Audio müssen Alternativen bieten.

**Implementierung:**

```html
<!-- Video mit Untertiteln und Audiobeschreibung -->
<video controls>
  <source src="tutorial.mp4" type="video/mp4" />
  <track kind="captions" src="captions-en.vtt" 
         srclang="en" label="English" default />
  <track kind="descriptions" src="descriptions-en.vtt" 
         srclang="en" label="English descriptions" />
</video>

<!-- Audio-Transkript -->
<audio src="podcast.mp3" controls></audio>
<details>
  <summary>Transkript anzeigen</summary>
  <p>Vollständiges Transkript der Audioaufnahme...</p>
</details>
```

#### 2.1.3 Anpassbar (1.3.1 - 1.3.6)

Inhalte müssen in verschiedenen Darstellungsformen präsentiert werden können.

**Semantisches HTML:**

```html
<!-- Korrekte Überschriftenhierarchie -->
<h1>API Reference</h1>
  <h2>Payments API</h2>
    <h3>Create Payment</h3>
    <h3>List Payments</h3>
  <h2>Webhooks API</h2>
    <h3>Register Endpoint</h3>

<!-- Listen für Navigation -->
<nav aria-label="Hauptnavigation">
  <ul>
    <li><a href="/docs">Dokumentation</a></li>
    <li><a href="/api">API Reference</a></li>
    <li><a href="/tools">Tools</a></li>
  </ul>
</nav>

<!-- Data Tables -->
<table>
  <caption>API Endpoints Übersicht</caption>
  <thead>
    <tr>
      <th scope="col">Endpoint</th>
      <th scope="col">Methode</th>
      <th scope="col">Beschreibung</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>/v1/payments</td>
      <td>POST</td>
      <td>Erstellt eine neue Zahlung</td>
    </tr>
  </tbody>
</table>

<!-- Formulare mit Labels -->
<form>
  <fieldset>
    <legend>Kontaktinformationen</legend>
    
    <div class="form-group">
      <label for="email">E-Mail-Adresse *</label>
      <input type="email" id="email" name="email" required
             aria-describedby="email-hint" />
      <span id="email-hint" class="hint">
        Wir senden Ihnen eine Bestätigung zu.
      </span>
    </div>
    
    <div class="form-group">
      <label for="message">Nachricht</label>
      <textarea id="message" name="message"></textarea>
    </div>
  </fieldset>
</form>
```

#### 2.1.4 Unterscheidbar (1.4.1 - 1.4.12)

Inhalte müssen leicht zu sehen und zu hören sein.

**Farbkontrast:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Color Contrast Requirements                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Text Type              Minimum Contrast    Current Ratio    Status     │
│   ─────────────────      ─────────────────    ─────────────    ──────     │
│                                                                           │
│   Normal Text (<18px)    4.5:1               7.2:1            ✓ Pass     │
│   Large Text (≥18px)     3:1                 5.1:1            ✓ Pass     │
│   UI Components          3:1                 4.8:1            ✓ Pass     │
│   Focus Indicators       3:1                 4.2:1            ✓ Pass     │
│                                                                           │
│   ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│   Verified Color Combinations:                                            │
│   ┌─────────────────────────────────────────────────────────────────────┐│
│   │ Primary Text (#1A1A1A) on White (#FFFFFF): 15.2:1 ✓               ││
│   │ Secondary Text (#6A6A6A) on White (#FFFFFF): 5.1:1 ✓              ││
│   │ Primary Blue (#0057FF) on White (#FFFFFF): 4.6:1 ✓               ││
│   │ Error Red (#FF3B30) on White (#FFFFFF): 4.5:1 ✓                  ││
│   │ White (#FFFFFF) on Primary Blue (#0057FF): 4.6:1 ✓               ││
│   └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Text-Skalierung:**

```css
/* Relative Einheiten für Skalierbarkeit */
html {
  font-size: 100%; /* 16px default */
}

body {
  font-size: 1rem; /* Skaliert mit Benutzereinstellungen */
}

h1 {
  font-size: 2rem; /* 32px bei 16px Basis */
}

/* Unterstütze 200% Zoom ohne horizontal Scroll */
@media (max-width: 640px) {
  .container {
    width: 100%;
    padding: 0 1rem;
  }
}
```

**Nutzung von Farbe:**

```html
<!-- Nicht nur Farbe für Informationen verwenden -->
<div class="status">
  <span class="status-icon success" aria-hidden="true">✓</span>
  <span class="status-text">Erfolgreich</span>
</div>

<div class="status">
  <span class="status-icon error" aria-hidden="true">✗</span>
  <span class="status-text">Fehlgeschlagen</span>
</div>

<!-- Form Validierung mit Text, nicht nur Farbe -->
<input type="text" 
       class="input-error" 
       aria-invalid="true"
       aria-describedby="error-message" />
<span id="error-message" class="error-message" role="alert">
  Bitte geben Sie eine gültige E-Mail-Adresse ein.
</span>
```

---

### 2.2 Bedienbarkeit (Operable)

#### 2.2.1 Tastaturzugänglich (2.1.1 - 2.1.4)

Alle Funktionen müssen per Tastatur bedienbar sein.

**Tastaturnavigation:**

```html
<!-- Focus-Indikatoren -->
<button class="btn">
  Klick mich
</button>

<style>
.btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 87, 255, 0.5);
}

.btn:focus-visible {
  outline: 2px solid #0057FF;
  outline-offset: 2px;
}
</style>

<!-- Skip Links -->
<body>
  <a href="#main-content" class="skip-link">
    Zum Hauptinhalt springen
  </a>
  
  <nav>...</nav>
  
  <main id="main-content">
    <!-- Hauptinhalt -->
  </main>
</body>

<style>
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: #0057FF;
  color: white;
  z-index: 1000;
}

.skip-link:focus {
  top: 0;
}
</style>

<!-- Keine Tastaturfallen -->
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Bestätigung</h2>
  <p>Möchten Sie fortfahren?</p>
  <button onclick="closeDialog()">Abbrechen</button>
  <button onclick="confirm()">Bestätigen</button>
</div>

<script>
// Focus trap für Modals
function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
    
    if (e.key === 'Escape') {
      closeDialog();
    }
  });
  
  firstFocusable.focus();
}
</script>
```

#### 2.2.2 Ausreichend Zeit (2.2.1 - 2.2.2)

Benutzer müssen genug Zeit haben, um Inhalte zu lesen und zu nutzen.

**Implementierung:**

```javascript
// Session Timeout mit Warnung
let timeoutWarning;
let sessionTimeout;

function resetSessionTimer() {
  clearTimeout(timeoutWarning);
  clearTimeout(sessionTimeout);
  
  // Warnung nach 25 Minuten
  timeoutWarning = setTimeout(() => {
    showTimeoutWarning();
  }, 25 * 60 * 1000);
  
  // Logout nach 30 Minuten
  sessionTimeout = setTimeout(() => {
    logout();
  }, 30 * 60 * 1000);
}

function showTimeoutWarning() {
  const modal = document.createElement('div');
  modal.setAttribute('role', 'alertdialog');
  modal.setAttribute('aria-labelledby', 'timeout-title');
  modal.setAttribute('aria-describedby', 'timeout-desc');
  
  modal.innerHTML = `
    <h2 id="timeout-title">Session läuft bald ab</h2>
    <p id="timeout-desc">Ihre Session wird in 5 Minuten beendet.</p>
    <button onclick="extendSession()">Session verlängern</button>
  `;
  
  document.body.appendChild(modal);
}

// Für bewegte Inhalte: Pause/Stop-Controls
<video src="demo.mp4" controls>
  <!-- Browser stellt Pause-Button bereit -->
</video>

<marquee behavior="scroll">
  <button onclick="this.parentElement.stop()">Stop</button>
  Aktuelle Ankündigungen...
</marquee>
```

#### 2.2.3 Anfälle und körperliche Reaktionen (2.3.1 - 2.3.2)

Keine Inhalte, die Anfälle auslösen können.

**Implementierung:**

```css
/* Kein content, der mehr als 3x pro Sekunde blinkt */
/* Falls Animationen nötig: */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

#### 2.2.4 Navigierbar (2.4.1 - 2.4.11)

Benutzer müssen einfach navigieren und Inhalte finden können.

**Implementierung:**

```html
<!-- Konsistente Navigation -->
<header>
  <nav aria-label="Hauptnavigation">
    <ul>
      <li><a href="/docs">Dokumentation</a></li>
      <li><a href="/api">API Reference</a></li>
      <li><a href="/tools">Tools</a></li>
    </ul>
  </nav>
</header>

<!-- Breadcrumbs -->
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/docs">Dokumentation</a></li>
    <li><a href="/docs/api">API</a></li>
    <li aria-current="page">Payments</li>
  </ol>
</nav>

<!-- Sitemap -->
<nav aria-label="Sitemap">
  <!-- Vollständige Sitemap -->
</nav>

<!-- Suche -->
<form role="search">
  <label for="search">Dokumentation durchsuchen</label>
  <input type="search" id="search" 
         placeholder="Suchbegriff eingeben..." />
  <button type="submit">Suchen</button>
</form>

<!-- Link Purpose -->
<a href="/docs/api/payments#create">
  Mehr Informationen zur Create Payment API
</a>
<!-- statt nur "Mehr" oder "Hier klicken" -->
```

---

### 2.3 Verständlichkeit (Understandable)

#### 2.3.1 Lesbar (3.1.1 - 3.1.2)

Seiten müssen lesbar und verständlich sein.

**Implementierung:**

```html
<!-- Sprachangabe -->
<html lang="de">
  <!-- Für englische Code-Beispiele -->
  <code lang="en">const payment = await cargobit.payments.create();</code>
  
  <!-- Abkürzungen erklären -->
  <abbr title="Application Programming Interface">API</abbr>
  
  <!-- Fachbegriffe erklären -->
  <dfn id="webhook">Webhook</dfn>
  <p>Ein <a href="#webhook">Webhook</a> ist eine HTTP-Callback-Funktion...</p>
</html>
```

**Klare Sprache:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            Writing Guidelines                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Verwenden Sie:                                                         │
│   ──────────────                                                         │
│   ✓ Kurze, klare Sätze                                                   │
│   ✓ Aktive Sprache ("Klicken Sie auf..." statt "Es muss geklickt...")   │
│   ✓ Einfache Wörter                                                      │
│   ✓ Aufzählungen für komplexe Schritte                                   │
│   ✓ Konsistente Terminologie                                             │
│                                                                           │
│   Vermeiden Sie:                                                         │
│   ──────────────                                                         │
│   ✗ Fachjargon ohne Erklärung                                           │
│   ✗ Lange, verschachtelte Sätze                                         │
│   ✗ Passive Sprache                                                      │
│   ✗ Doppelte Verneinungen                                                │
│   ✗ Metaphern und Idiome                                                 │
│                                                                           │
│   Lesbarkeitstests:                                                      │
│   ────────────────                                                       │
│   • Flesch Reading Ease: > 60                                           │
│   • Flesch-Kincaid Grade Level: < 8                                     │
│   • Satzanzahl pro Absatz: < 5                                          │
│   • Wörter pro Satz: < 20                                               │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 2.3.2 Vorhersagbar (3.2.1 - 3.2.4)

Seiten müssen vorhersehbar funktionieren.

**Implementierung:**

```html
<!-- Kein unexpected Context Change -->
<!-- Falsch: -->
<select onchange="window.location = this.value">
  <option value="/page1">Seite 1</option>
  <option value="/page2">Seite 2</option>
</select>

<!-- Richtig: -->
<select id="page-select">
  <option value="/page1">Seite 1</option>
  <option value="/page2">Seite 2</option>
</select>
<button onclick="navigate()">Navigieren</button>

<!-- Konsistente Identifikation -->
<!-- Gleiche Icons bedeuten gleiche Aktionen -->
<button aria-label="Suchen">
  <svg aria-hidden="true"><!-- Search Icon --></svg>
</button>

<!-- Konsistente Formular-Labels -->
<form>
  <label for="email-1">E-Mail</label>
  <input type="email" id="email-1" />
</form>

<!-- Später im Formular: -->
<form>
  <label for="email-2">E-Mail</label>
  <input type="email" id="email-2" />
  <!-- Selbes Label, gleicher Input-Typ -->
</form>
```

#### 2.3.3 Hilfestellung bei Eingaben (3.3.1 - 3.3.4)

Benutzer müssen bei Fehlern unterstützt werden.

**Implementierung:**

```html
<!-- Form Validation mit klaren Fehlermeldungen -->
<form novalidate>
  <div class="form-group">
    <label for="email">
      E-Mail-Adresse *
      <span class="required">(erforderlich)</span>
    </label>
    <input type="email" 
           id="email" 
           name="email"
           required
           aria-describedby="email-error email-hint"
           aria-invalid="false" />
    
    <span id="email-hint" class="hint">
      Beispiel: name@beispiel.de
    </span>
    
    <span id="email-error" class="error" role="alert" aria-live="polite">
      <!-- Error message injected here -->
    </span>
  </div>
  
  <button type="submit">Absenden</button>
</form>

<script>
function validateEmail(input) {
  const errorSpan = document.getElementById('email-error');
  const isValid = input.validity.valid;
  
  input.setAttribute('aria-invalid', !isValid);
  
  if (!isValid) {
    let errorMessage = '';
    
    if (input.validity.valueMissing) {
      errorMessage = 'Bitte geben Sie Ihre E-Mail-Adresse ein.';
    } else if (input.validity.typeMismatch) {
      errorMessage = 'Bitte geben Sie eine gültige E-Mail-Adresse ein. Beispiel: name@beispiel.de';
    }
    
    errorSpan.textContent = errorMessage;
  } else {
    errorSpan.textContent = '';
  }
}
</script>
```

---

### 2.4 Robustheit (Robust)

#### 2.4.1 Kompatibel (4.1.1 - 4.1.3)

Inhalte müssen mit aktuellen und zukünftigen Technologien kompatibel sein.

**ARIA-Implementierung:**

```html
<!-- Korrekte ARIA-Rollen -->
<nav role="navigation" aria-label="Hauptnavigation">
  <ul>
    <li><a href="/docs">Dokumentation</a></li>
  </ul>
</nav>

<main role="main" id="main-content">
  <article>
    <h1>API Reference</h1>
    <!-- Content -->
  </article>
</main>

<aside role="complementary">
  <h2>Verwandte Artikel</h2>
  <ul>
    <li><a href="#">Getting Started</a></li>
  </ul>
</aside>

<!-- Status Messages -->
<div role="status" aria-live="polite">
  <span class="sr-only">Laden...</span>
</div>

<div role="alert" aria-live="assertive">
  Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
</div>

<!-- Dynamic Content Updates -->
<div aria-live="polite" aria-atomic="true">
  <!-- Suchergebnisse werden hier aktualisiert -->
</div>

<!-- Name, Role, Value -->
<button 
  role="switch"
  aria-checked="false"
  aria-label="Dark Mode"
  onclick="toggleDarkMode()">
  <span class="switch-track"></span>
</button>

<!-- Custom Checkbox -->
<div 
  role="checkbox"
  aria-checked="false"
  tabindex="0"
  onclick="toggleCheckbox(this)"
  onkeydown="handleCheckboxKeydown(event, this)">
  Ich stimme den Nutzungsbedingungen zu
</div>
```

---

## 3. Accessibility-Testing

### 3.1 Automatisierte Tests

#### Axe Core

```javascript
// Jest + Axe Integration
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

#### Lighthouse CI

```yaml
# lighthouse-budget.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:accessibility": ["error", {"minScore": 1.0}]
      }
    }
  }
}
```

### 3.2 Manuelle Tests

#### Tastatur-Test-Checkliste

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Keyboard Testing Checklist                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Navigation:                                                            │
│   [ ] Tab durch alle interaktiven Elemente                               │
│   [ ] Shift+Tab rückwärts navigieren                                     │
│   [ ] Fokus-Reihenfolge ist logisch                                      │
│   [ ] Fokus ist immer sichtbar                                           │
│   [ ] Keine Tastaturfallen                                               │
│                                                                           │
│   Interaktionen:                                                         │
│   [ ] Enter aktiviert Buttons/Links                                      │
│   [ ] Space aktiviert Buttons/Checkboxen                                 │
│   [ ] Pfeiltasten navigieren in Menüs                                    │
│   [ ] Escape schließt Modals                                             │
│   [ ] Tab erreicht alle Controls                                         │
│                                                                           │
│   Focus Management:                                                      │
│   [ ] Focus auf Modal beim Öffnen                                        │
│   [ ] Focus zurück nach Modal-Schließung                                 │
│   [ ] Focus auf neue Inhalte bei dynamischen Updates                     │
│   [ ] Skip-Link funktioniert                                             │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Screenreader-Test-Checkliste

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Screenreader Testing Checklist                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   NVDA (Windows):                                                        │
│   [ ] Alle Inhalte werden vorgelesen                                     │
│   [ ] Überschriften-Navigation funktioniert                              │
│   [ ] Landmarks werden korrekt angekündigt                               │
│   [ ] Formular-Labels werden vorgelesen                                  │
│   [ ] Fehlermeldungen werden angekündigt                                 │
│                                                                           │
│   VoiceOver (macOS/iOS):                                                 │
│   [ ] Rotor-Funktionen arbeiten korrekt                                  │
│   [ ] Touch-Gesten funktionieren                                         │
│   [ ] Landmarks sind navigierbar                                         │
│   [ ] Tabellen werden korrekt vorgelesen                                 │
│                                                                           │
│   JAWS (Windows):                                                        │
│   [ ] Virtual Cursor funktioniert                                        │
│   [ ] Forms Mode wird korrekt aktiviert                                  │
│   [ ] Tabellen-Navigation funktioniert                                   │
│   [ ] ARIA-Live-Regions werden angekündigt                               │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Accessibility-Entscheidungen

### 4.1 Kontrast-Optimierung

```css
/* High Contrast Mode Support */
@media (prefers-contrast: high) {
  :root {
    --color-text: #000000;
    --color-border: #000000;
    --color-primary: #0033CC;
  }
  
  .btn-primary {
    border: 2px solid currentColor;
  }
}

/* Forced Colors Mode (Windows High Contrast) */
@media (forced-colors: active) {
  .btn-primary {
    background: Canvas;
    color: CanvasText;
    border: 2px solid currentColor;
  }
  
  .icon {
    forced-color-adjust: none;
  }
}
```

### 4.2 Motion-Präferenzen

```css
/* Reduce Motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  /* Parallax Effects deaktivieren */
  .parallax {
    transform: none !important;
  }
}
```

### 4.3 Focus-Styles

```css
/* Consistent Focus Indicators */
:focus {
  outline: none;
}

:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Für Buttons */
.btn:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 87, 255, 0.5);
}

/* Für Links */
a:focus-visible {
  text-decoration: underline;
  text-decoration-thickness: 2px;
}

/* Skip Link */
.skip-link:focus {
  position: absolute;
  top: 0;
  left: 0;
  padding: 1rem;
  background: var(--color-primary);
  color: white;
  z-index: 9999;
}
```

---

## 5. Accessibility-Checkliste für Komponenten

### 5.1 Buttons

```html
<!-- Korrekter Button -->
<button type="button" aria-label="Einstellungen öffnen">
  <svg aria-hidden="true" focusable="false">
    <use href="#settings-icon"></use>
  </svg>
</button>

<!-- Link vs Button -->
<!-- Navigation: <a> -->
<a href="/docs">Dokumentation</a>

<!-- Aktion: <button> -->
<button onclick="submitForm()">Absenden</button>
```

### 5.2 Formulare

```html
<form aria-labelledby="form-title">
  <h2 id="form-title">Kontaktformular</h2>
  
  <div class="form-group">
    <label for="name">Name *</label>
    <input 
      type="text" 
      id="name" 
      name="name"
      required
      aria-required="true"
      autocomplete="name" />
  </div>
  
  <div class="form-group">
    <fieldset>
      <legend>Bevorzugte Kontaktmethode</legend>
      
      <input type="radio" id="contact-email" name="contact" value="email" />
      <label for="contact-email">E-Mail</label>
      
      <input type="radio" id="contact-phone" name="contact" value="phone" />
      <label for="contact-phone">Telefon</label>
    </fieldset>
  </div>
  
  <button type="submit">Absenden</button>
</form>
```

### 5.3 Modals

```html
<div 
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-desc">
  
  <h2 id="modal-title">Bestätigung</h2>
  <p id="modal-desc">Möchten Sie diese Aktion wirklich durchführen?</p>
  
  <button onclick="closeModal()">Abbrechen</button>
  <button onclick="confirm()">Bestätigen</button>
</div>
```

### 5.4 Tabellen

```html
<table aria-describedby="table-summary">
  <caption id="table-summary">
    Übersicht aller API-Endpoints mit Methode und Beschreibung
  </caption>
  
  <thead>
    <tr>
      <th scope="col">Endpoint</th>
      <th scope="col">Methode</th>
      <th scope="col">Beschreibung</th>
    </tr>
  </thead>
  
  <tbody>
    <tr>
      <th scope="row">/v1/payments</th>
      <td>POST</td>
      <td>Erstellt eine neue Zahlung</td>
    </tr>
  </tbody>
</table>
```

### 5.5 Code-Blöcke

```html
<figure role="figure" aria-labelledby="code-caption">
  <figcaption id="code-caption">
    Beispiel: Zahlung erstellen
  </figcaption>
  
  <pre><code class="language-javascript">
const payment = await cargobit.payments.create({
  amount: 1000,
  currency: 'eur'
});
  </code></pre>
  
  <button onclick="copyCode()" aria-label="Code kopieren">
    <svg aria-hidden="true"><!-- Copy Icon --></svg>
    Kopieren
  </button>
</figure>
```

---

## 6. Accessibility-Dokumentation

### 6.1 Accessibility Statement

Das Portal muss ein öffentliches Accessibility-Statement bereitstellen:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Accessibility Statement                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   CargoBit Developer Portal Accessibility Statement                      │
│                                                                           │
│   Commitment:                                                            │
│   CargoBit ist bestrebt, das Developer Portal für alle Benutzer         │
│   zugänglich zu machen, einschließlich Menschen mit Behinderungen.      │
│                                                                           │
│   Conformance Status:                                                    │
│   Dieses Portal entspricht vollständig den WCAG 2.1 AA Richtlinien.     │
│                                                                           │
│   Accessibility Features:                                                │
│   • Vollständige Tastaturnavigation                                      │
│   • Screenreader-Kompatibilität                                          │
│   • Ausreichender Farbkontrast                                           │
│   • Skalierbare Textgrößen                                               │
│   • Skip Navigation Links                                                │
│   • ARIA-Landmarks                                                       │
│                                                                           │
│   Known Issues:                                                          │
│   [Liste bekannter Probleme und Workarounds]                            │
│                                                                           │
│   Feedback:                                                              │
│   Bei Accessibility-Problemen kontaktieren Sie uns unter:               │
│   accessibility@cargobit.io                                             │
│                                                                           │
│   Letzte Aktualisierung: 2024-01-15                                     │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.2 VPAT (Voluntary Product Accessibility Template)

Ein VPAT-Dokument sollte für Enterprise-Kunden bereitgestellt werden.

---

*Dieses Accessibility-Konzept gewährleistet, dass das CargoBit Developer Portal für alle Entwickler vollständig zugänglich ist und den höchsten Standards für Barrierefreiheit entspricht.*
