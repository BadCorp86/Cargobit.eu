# 🧱 BLOCK P — API-Explorer UX-Redesign

## Next-Gen Developer Experience

### Der API-Explorer als zentrales Tool des Portals

Der API-Explorer wird zum **zentralen Werkzeug** des Developer Portals und bietet Entwicklern eine intuitive, leistungsstarke Umgebung für API-Tests und -Integration.

---

## 1. Vision und Ziele

### 1.1 Vision Statement

Der CargoBit API-Explorer soll die best-in-class Entwicklererfahrung bieten – inspiriert von Stripe, Twilio und Postman, aber nahtlos in das Portal integriert und optimiert für CargoBit-spezifische Workflows.

### 1.2 Kernziele

| Ziel | Beschreibung | Metrik |
|------|--------------|--------|
| **Speed** | Schnelle API-Tests ohne Kontextwechsel | Time-to-first-request < 30s |
| **Discoverability** | Einfache Entdeckung aller Endpoints | Feature-Discovery-Rate > 80% |
| **Learning** | Interaktives Lernen durch Ausprobieren | Tutorial-Completion-Rate > 70% |
| **Productivity** | Effiziente Workflows für Power-User | Requests/Session > 5 |

---

## 2. Features

### 2.1 Live Request Builder

Der Live Request Builder ermöglicht das interaktive Erstellen und Ausführen von API-Anfragen.

#### Method Selector

```
┌─────────────────────────────────────────────────────────────┐
│ [GET ▼]  /v1/payments/pay_123abc                          │
└─────────────────────────────────────────────────────────────┘

Dropdown-Optionen:
• GET    - Ressource abrufen
• POST   - Neue Ressource erstellen
• PUT    - Ressource aktualisieren
• DELETE - Ressource löschen
```

#### URL Builder

```
┌─────────────────────────────────────────────────────────────┐
│ Base URL: [https://api.cargobit.io ▼]                      │
│                                                             │
│ Endpoint: [/v1/payments/{payment_id}              ]        │
│                                                             │
│ Path Parameters:                                           │
│   payment_id: [pay_123abc                    ]             │
│                                                             │
│ [Build URL]                                                │
│                                                             │
│ Result: https://api.cargobit.io/v1/payments/pay_123abc    │
└─────────────────────────────────────────────────────────────┘
```

#### Query Parameters

```
┌─────────────────────────────────────────────────────────────┐
│ Query Parameters                              [+ Add Param] │
├─────────────────────────────────────────────────────────────┤
│ Key                    │ Value                             │
│ ───────────────────────┼────────────────────────────────── │
│ limit                  │ 10                                │
│ starting_after         │ pay_abc123                        │
│ expand[]               │ customer                          │
│                                                         [×] │
└─────────────────────────────────────────────────────────────┘
```

#### Headers

```
┌─────────────────────────────────────────────────────────────┐
│ Headers                                       [+ Add Header]│
├─────────────────────────────────────────────────────────────┤
│ Authorization          │ Bearer sk_test_...                  │
│ Content-Type           │ application/json                   │
│ Idempotency-Key        │ [Auto-generate]            [↻]    │
│ CargoBit-Version       │ 2024-01-01                 [▼]    │
└─────────────────────────────────────────────────────────────┘
```

#### Body Editor (JSON)

```
┌─────────────────────────────────────────────────────────────┐
│ Request Body                              [Format] [Validate]│
├─────────────────────────────────────────────────────────────┤
│ {                                          │              │
│   "amount": 1000,                          │   }          │
│   "currency": "eur",                       │              │
│   "customer": "cus_abc123",                │   Syntax     │
│   "description": "Test payment",           │   Valid      │
│   "metadata": {                            │              │
│     "order_id": "ORD-123"                  │              │
│   }                                        │              │
│ }                                          │              │
└─────────────────────────────────────────────────────────────┘
```

Features:
- Syntax-Highlighting
- Auto-Format (Prettify)
- Schema-Validation
- Auto-Complete

---

### 2.2 Auto-Generated Code Snippets

Automatisch generierte Code-Beispiele für alle unterstützten Sprachen.

#### Unterstützte Sprachen

| Sprache | Bibliothek | Icon |
|---------|-----------|------|
| **curl** | Native | 🖥️ |
| **JavaScript** | fetch / axios | 🟨 |
| **Python** | requests | 🐍 |
| **Go** | net/http | 🐹 |
| **Java** | OkHttp / Unirest | ☕ |
| **Ruby** | net/http | 💎 |
| **PHP** | Guzzle | 🐘 |
| **C#** | HttpClient | 🎯 |

#### Code-Snippet-Panel

```
┌─────────────────────────────────────────────────────────────┐
│ Code Snippets                              [curl ▼] [Copy]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ curl -X GET "https://api.cargobit.io/v1/payments/pay_123" \│
│   -H "Authorization: Bearer sk_test_..." \                 │
│   -H "Content-Type: application/json"                      │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### JavaScript Beispiel

```javascript
const response = await fetch(
  'https://api.cargobit.io/v1/payments/pay_123',
  {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer sk_test_...',
      'Content-Type': 'application/json'
    }
  }
);

const payment = await response.json();
console.log(payment);
```

#### Python Beispiel

```python
import requests

response = requests.get(
    'https://api.cargobit.io/v1/payments/pay_123',
    headers={
        'Authorization': 'Bearer sk_test_...',
        'Content-Type': 'application/json'
    }
)

payment = response.json()
print(payment)
```

---

### 2.3 Response Viewer

Der Response Viewer zeigt die API-Antwort in strukturierter Form.

#### Status und Metadaten

```
┌─────────────────────────────────────────────────────────────┐
│ Response                                    Status: 200 OK ✓│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Status Code: 200 OK                                        │
│ Duration: 145ms                                            │
│ Size: 1.2 KB                                               │
│                                                             │
│ Headers:                                                   │
│   content-type: application/json                           │
│   request-id: req_abc123                                   │
│   cargobit-version: 2024-01-01                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### JSON Response

```
┌─────────────────────────────────────────────────────────────┐
│ Response Body                               [Format] [Copy] │
├─────────────────────────────────────────────────────────────┤
│ {                                          │              │
│   "id": "pay_123abc",                      │   }          │
│   "object": "payment",                     │              │
│   "amount": 1000,                          │   Expandable │
│   "currency": "eur",                       │     ▼ customer│
│   "status": "succeeded",                   │              │
│   "customer": "cus_abc123",                │              │
│   "created": 1704067200,                   │              │
│   "metadata": {                            │              │
│     "order_id": "ORD-123"                  │              │
│   }                                        │              │
│ }                                          │              │
└─────────────────────────────────────────────────────────────┘
```

Features:
- Syntax-Highlighting
- Expandable Fields
- Click-to-Copy
- Link to Object (z.B. Customer)

#### Timing Metrics

```
┌─────────────────────────────────────────────────────────────┐
│ Timing Breakdown                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ DNS Lookup      ████████░░░░░░░░░░░░  25ms                │
│ TCP Connection  ████████████░░░░░░░░  35ms                │
│ TLS Handshake   ████████████████░░░░  45ms                │
│ Request         ██████████████████░░  20ms                │
│ Response        ████████████████████  20ms                │
│ ─────────────────────────────────────                     │
│ Total           ████████████████████  145ms               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.4 History Panel

Das History Panel speichert frühere Anfragen für schnellen Zugriff.

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Request History                                [Clear All]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Today:                                                     │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ GET /v1/payments/pay_123          200 OK    2 min ago │  │
│ │ POST /v1/payments                201 Created 15 min   │  │
│ │ GET /v1/customers                200 OK    1 hour ago │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Yesterday:                                                 │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ GET /v1/balance                   200 OK              │  │
│ │ POST /v1/refunds                 200 OK              │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ [Load More...]                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Actions

| Aktion | Beschreibung |
|--------|--------------|
| **Replay** | Anfrage erneut senden |
| **Compare** | Zwei Responses vergleichen |
| **Save** | Als Collection speichern |
| **Delete** | Aus History entfernen |

---

### 2.5 Environment Switcher

Einfacher Wechsel zwischen Sandbox und Production.

```
┌─────────────────────────────────────────────────────────────┐
│ Environment                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  (•) Sandbox                                               │
│      Test environment with mock data                       │
│      API Key: sk_test_...                                  │
│                                                             │
│  ( ) Production                                            │
│      Live environment with real transactions               │
│      API Key: sk_live_...                                  │
│      ⚠️ Requires 2FA                                       │
│                                                             │
│  [Switch Environment]                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Sandbox-Indikator

Wenn in Sandbox:
- Orangener Banner: "You are in SANDBOX mode"
- Wasserzeichen auf Responses
- Test-Daten-Markierung

---

## 3. UX-Verbesserungen

### 3.1 Auto-Complete für Endpoints

Intelligente Autovervollständigung für API-Endpunkte.

```
┌─────────────────────────────────────────────────────────────┐
│ Endpoint: /v1/pay█                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ /v1/payments                    List all payments      ││
│ │ /v1/payments/{id}               Retrieve a payment     ││
│ │ /v1/payment-intents             List payment intents   ││
│ │ /v1/payment-methods             List payment methods   ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Features:
- Fuzzy Search
- Recently Used
- Keyboard Navigation

### 3.2 Schema-Aware JSON Editor

Der JSON-Editor kennt das Request-Schema und bietet kontextsensitive Hilfe.

```
┌─────────────────────────────────────────────────────────────┐
│ {                                          │              │
│   "a|                         │   Field: amount    │      │
│ }                            │   Type: integer    │      │
│                              │   Required: yes    │      │
│                              │   Min: 1           │      │
│                              │   Description:     │      │
│                              │   Amount in cents  │      │
│                              │                    │      │
│                              │   Example: 1000    │      │
│                              │   ───────────────  │      │
│                              │   [Insert]         │      │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Error Highlighting

Sofortiges Feedback bei Fehlern mit Lösungsvorschlägen.

```
┌─────────────────────────────────────────────────────────────┐
│ Response                                    Status: 400 ✗  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ {                                                          │
│   "error": {                                               │
│     "type": "invalid_request_error",                       │
│     "message": "Invalid amount: must be a positive integer"│
│   }                                                        │
│ }                                                          │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 💡 Suggestion:                                          ││
│ │ Change "amount": -100 to a positive value like 1000     ││
│ │                                                         ││
│ │ [Apply Fix]                                             ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Copy-as-curl

Ein-Klick-Kopieren als curl-Befehl.

```
┌─────────────────────────────────────────────────────────────┐
│ [Copy as curl]  [Copy as JavaScript]  [Copy as Python]     │
└─────────────────────────────────────────────────────────────┘
```

### 3.5 Dark Mode

Vollständiger Dark Mode Support.

```
Light Mode:
- Background: #FFFFFF
- Surface: #F4F6F8
- Text: #1A1A1A

Dark Mode:
- Background: #0A1A2F
- Surface: #142238
- Text: #F4F6F8
```

---

## 4. Erweiterte Features

### 4.1 Collections

Speichern und Organisieren von Requests.

```
┌─────────────────────────────────────────────────────────────┐
│ Collections                                   [+ New]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📁 Payment Workflows                                       │
│   ├─ Create Payment                                        │
│   ├─ Get Payment                                           │
│   ├─ List Payments                                         │
│   └─ Refund Payment                                        │
│                                                             │
│ 📁 Customer Management                                     │
│   ├─ Create Customer                                       │
│   ├─ Update Customer                                       │
│   └─ List Customers                                        │
│                                                             │
│ 📁 Webhook Testing                                         │
│   └─ Simulate Payment Event                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Environment Variables

Wiederverwendbare Variablen für verschiedene Umgebungen.

```
┌─────────────────────────────────────────────────────────────┐
│ Environment Variables                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Variable          │ Sandbox Value     │ Production Value   │
│ ──────────────────┼───────────────────┼────────────────────│
│ {{api_key}}       │ sk_test_abc123    │ sk_live_xyz789     │
│ {{customer_id}}   │ cus_test_123      │ cus_live_456       │
│ {{base_url}}      │ api-sandbox...    │ api.cargobit.io    │
│                                                             │
│ [+ Add Variable]                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Request Chaining

Verkettung von Requests mit Variablen aus vorherigen Responses.

```
┌─────────────────────────────────────────────────────────────┐
│ Request Chain: Payment Flow                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. Create Customer                                         │
│    → Saves {{customer_id}} from response                   │
│                                                             │
│ 2. Create Payment Intent                                   │
│    → Uses {{customer_id}}                                  │
│    → Saves {{payment_intent_id}} from response             │
│                                                             │
│ 3. Confirm Payment                                         │
│    → Uses {{payment_intent_id}}                            │
│                                                             │
│ [Run Chain]  [Edit Chain]                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Keyboard Shortcuts

| Shortcut | Aktion |
|----------|--------|
| `Ctrl/Cmd + Enter` | Request senden |
| `Ctrl/Cmd + S` | Request speichern |
| `Ctrl/Cmd + K` | Endpoint-Suche öffnen |
| `Ctrl/Cmd + Shift + C` | Als curl kopieren |
| `Ctrl/Cmd + /` | Kommentar toggeln |
| `Esc` | Modal schließen |

---

## 6. Accessibility

### 6.1 Keyboard Navigation

- Vollständig per Tastatur bedienbar
- Fokus-Indikatoren sichtbar
- Logische Tab-Reihenfolge

### 6.2 Screen Reader Support

- ARIA-Labels für alle Elemente
- Live-Regions für Status-Updates
- Semantisches HTML

---

## 7. Performance

### 7.1 Optimierungen

- Lazy Loading für History
- Virtualized Lists für große Responses
- Debounced Auto-Complete
- Service Worker für Offline-Support

### 7.2 Metrics

| Metrik | Ziel |
|--------|------|
| Initial Load | < 1s |
| Auto-Complete Latency | < 100ms |
| Request Execution | < 500ms (ohne Netzwerk) |

---

## 8. Integration

### 8.1 Mit Dokumentation

- Deep-Links von API-Dokumentation
- Vorbefüllte Requests aus Beispielen
- Kontextsensitive Hilfe

### 8.2 Mit Dashboard

- Usage-Statistiken im Dashboard
- Recent Requests im Activity Feed

### 8.3 Mit Webhook Debugger

- Webhook-Events können im Explorer simuliert werden
- Shared History zwischen Tools

---

*Der API-Explorer UX-Redesign macht CargoBit zu einer der entwicklerfreundlichsten Zahlungs-APIs auf dem Markt.*
