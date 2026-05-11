# 🧱 BLOCK O — Partner-Dashboard Konzept

## Das zentrale Dashboard für Partner-Entwickler

### Enterprise-Level Partner Experience

Das Partner-Dashboard ist der **zentrale Startpunkt für alle Integrationen** und bietet Entwicklern einen umfassenden Überblick über ihre API-Aktivitäten, Webhook-Status und Integration-Gesundheit.

---

## 1. Dashboard-Übersicht

### 1.1 Zweck und Ziele

Das Partner-Dashboard dient als Kommandozentrale für Entwickler, die CargoBit integrieren. Es bietet einen Echtzeit-Einblick in alle relevanten Metriken und ermöglicht schnelle Aktionen ohne die Dokumentation verlassen zu müssen.

#### Primäre Ziele

| Ziel | Beschreibung |
|------|--------------|
| **Visibility** | Vollständiger Überblick über API-Nutzung und Gesundheit |
| **Actionability** | Schnelle Aktionen direkt vom Dashboard aus |
| **Debugging** | Einfache Identifikation und Behebung von Problemen |
| **Onboarding** | Geführte Einrichtung neuer Integrationen |

#### Zielgruppen

- **Neue Partner**: Geführtes Onboarding, Setup-Checklisten
- **Aktive Partner**: Metriken, Webhook-Monitoring, Logs
- **Enterprise-Partner**: Erweiterte Analytics, Custom Reports

---

## 2. Dashboard-Widgets

### 2.1 API Usage Widget

Das API Usage Widget bietet einen umfassenden Überblick über die API-Nutzung des Partners.

#### Metriken

| Metrik | Beschreibung | Visualisierung |
|--------|--------------|----------------|
| **Requests per Day** | Tägliche API-Anfragen | Line Chart (7/30 Tage) |
| **Success Rate** | Erfolgreiche Anfragen in % | Gauge Chart |
| **Error Rate** | Fehlgeschlagene Anfragen in % | Gauge Chart (Warning Threshold: >1%) |
| **Rate Limit Usage** | Aktuelle Rate-Limit-Auslastung | Progress Bar |

#### Detaillierte Ansicht

```
┌─────────────────────────────────────────────────────────────┐
│ API Usage                              [7d] [30d] [Custom] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Requests/day                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │    ▄▄▄                                              │   │
│  │   ▄████▄                     ▄▄▄▄                  │   │
│  │  ▄██████▄      ▄▄▄▄▄      ▄██████▄                 │   │
│  │ ▄████████▄▄▄▄▄██████▄▄▄▄▄████████▄                 │   │
│  └─────────────────────────────────────────────────────┘   │
│   Mon  Tue  Wed  Thu  Fri  Sat  Sun                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Success Rate │  │  Error Rate  │  │ Rate Limit   │     │
│  │    99.2%     │  │     0.8%     │  │    45%       │     │
│  │   ✓ Normal   │  │   ✓ Normal   │  │   ✓ Normal   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Alert-Conditions

- Error Rate > 1%: Warning
- Error Rate > 5%: Critical
- Rate Limit Usage > 80%: Warning
- Rate Limit Usage > 95%: Critical

---

### 2.2 Webhook Delivery Widget

Das Webhook Delivery Widget überwacht die Zustellung und Verarbeitung von Webhooks.

#### Metriken

| Metrik | Beschreibung | Visualisierung |
|--------|--------------|----------------|
| **Delivery Success** | Erfolgreiche Zustellungen | Pie Chart |
| **Failures** | Fehlgeschlagene Zustellungen | Counter + List |
| **Retries** | Wiederholungsversuche | Counter |
| **Replay Detection** | Erkannte Replays | Counter |

#### Detaillierte Ansicht

```
┌─────────────────────────────────────────────────────────────┐
│ Webhook Delivery                                    [View All]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Delivery Status (Last 24h)                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  ████████████                       │   │
│  │                ████████████████                     │   │
│  │              ██████████████████████  98.5% Success  │   │
│  │            ████████████████████████████             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────┐  ┌────────────────┐                    │
│  │   Failures     │  │    Retries     │                    │
│  │      3         │  │      7         │                    │
│  │   ⚠ View       │  │   → View       │                    │
│  └────────────────┘  └────────────────┘                    │
│                                                             │
│  Recent Failures:                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ payment.failed → 503 Service Unavailable    [Retry] │   │
│  │ wallet.updated → Timeout                    [Retry] │   │
│  │ payout.created → 429 Rate Limited           [Retry] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.3 Recent Events Widget

Das Recent Events Widget zeigt die letzten Webhook-Events in Echtzeit.

#### Dargestellte Events

| Event Type | Icon | Priorität |
|------------|------|-----------|
| `payment.succeeded` | ✓ Grün | Normal |
| `payment.failed` | ✗ Rot | High |
| `payout.created` | $ Blau | Normal |
| `wallet.updated` | ⟳ Teal | Normal |
| `refund.processed` | ↩ Orange | Normal |

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Recent Events                                       [View All]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✓ payment.succeeded                              2 min ago │
│    Payment #pay_123abc - €150.00                           │
│                                                             │
│  ✗ payment.failed                                 15 min ago│
│    Payment #pay_456def - Insufficient funds                │
│                                                             │
│  $ payout.created                                 1 hour ago│
│    Payout #po_789ghi - €5,000.00                           │
│                                                             │
│  ⟳ wallet.updated                                 2 hours ago│
│    Wallet #wlt_jklmno - Balance updated                    │
│                                                             │
│  ↩ refund.processed                               3 hours ago│
│    Refund #ref_pqrstu - €75.00                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.4 Integration Status Widget

Das Integration Status Widget zeigt den aktuellen Zustand der Integration und fehlende Setup-Schritte.

#### Checklist-Items

| Item | Status | Beschreibung |
|------|--------|--------------|
| **API Keys** | ✓/✗ | Mindestens ein API-Key konfiguriert |
| **Webhook Setup** | ✓/✗ | Webhook-Endpoint konfiguriert |
| **Signature Validation** | ✓/✗ | Signatur-Prüfung implementiert |
| **Idempotency Check** | ✓/✗ | Idempotency-Keys verwendet |
| **Sandbox Tests** | ✓/✗ | Mindestens 10 erfolgreiche Sandbox-Tests |

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Integration Status                                    [Setup]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Integration Health: ████████░░ 80%                        │
│                                                             │
│  Setup Progress:                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✓ API Keys               2 keys configured         │   │
│  │ ✓ Webhook Setup          1 endpoint configured     │   │
│  │ ✓ Signature Validation   Enabled                    │   │
│  │ ✗ Idempotency Check      Not implemented            │   │
│  │ ✓ Sandbox Tests          15 tests passed           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [View Documentation]  [Run Integration Test]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Scoring

- 5/5: Excellent - Production Ready
- 4/5: Good - Minor improvements recommended
- 3/5: Fair - Address missing items
- 2/5: Warning - Critical setup missing
- 1/5: Incomplete - Major setup required

---

### 2.5 Alerts Widget

Das Alerts Widget zeigt wichtige Benachrichtigungen und empfohlene Aktionen.

#### Alert-Typen

| Typ | Bedingung | Priorität |
|-----|-----------|-----------|
| **Webhook Failures** | >3 fehlgeschlagene Zustellungen | High |
| **Rate Limit Warning** | >80% Rate-Limit-Auslastung | Medium |
| **Schema Mismatch** | API-Response-Schema geändert | Low |
| **Certificate Expiry** | SSL-Zertifikat läuft bald ab | High |
| **API Key Expiry** | API-Key läuft bald ab | Medium |

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Alerts                                         [Mark All Read]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔴 HIGH  Webhook failures detected                        │
│     5 failed deliveries in the last hour                   │
│     [Investigate] [Dismiss]                                │
│                                                             │
│  🟡 MED   Rate limit approaching                           │
│     Currently at 85% of your plan limit                    │
│     [Upgrade Plan] [Dismiss]                               │
│                                                             │
│  🟢 LOW   New API version available                        │
│     API v2024-02-01 is now available                       │
│     [View Changelog] [Dismiss]                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Dashboard Navigation

### 3.1 Hauptnavigation

Die Dashboard-Navigation ist in logische Sektionen unterteilt, die den typischen Arbeitsabläufen von Entwicklern folgen.

```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard Navigation                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏠 Overview          Startseite mit allen Widgets          │
│  📊 API Usage         Detaillierte API-Nutzungsstatistiken   │
│  🔗 Webhooks          Webhook-Management und Debugging       │
│  📝 Logs              Anfrage- und Event-Logs               │
│  ⚙️ Settings          Account- und Integration-Einstellungen │
│  🧪 Sandbox           Sandbox-Umgebung für Tests            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Navigation Details

#### Overview
- Alle Widgets auf einen Blick
- Quick Actions
- Alerts

#### API Usage
- Requests über Zeit
- Endpoint-Breakdown
- Error-Analyse
- Rate-Limit-Historie

#### Webhooks
- Event-Historie
- Delivery-Status
- Replay-Tool
- Endpoint-Konfiguration

#### Logs
- Request-Logs
- Response-Logs
- Filter- und Suchoptionen
- Export-Funktionalität

#### Settings
- API-Keys verwalten
- Webhook-Endpoints
- Team-Mitglieder
- Benachrichtigungen

#### Sandbox
- Test-Daten
- Simulierte Events
- Test-API-Keys

---

## 4. Dashboard Actions

### 4.1 Quick Actions

Quick Actions ermöglichen häufige Aufgaben direkt vom Dashboard aus.

| Aktion | Beschreibung | Icon |
|--------|--------------|------|
| **Generate API Key** | Neuen API-Key erstellen | 🔑 |
| **Test Webhook** | Webhook-Test senden | 🧪 |
| **Replay Event** | Event erneut senden | ↻ |
| **Download Logs** | Logs als CSV exportieren | 📥 |
| **Switch to Production** | Zur Production-Umgebung wechseln | 🚀 |

### 4.2 Action Flows

#### Generate API Key

```
1. [Generate API Key] klicken
2. Modal öffnet sich:
   ┌─────────────────────────────────────────┐
   │ Generate New API Key                    │
   ├─────────────────────────────────────────┤
   │                                         │
   │ Key Name: [_______________________]    │
   │                                         │
   │ Environment: (•) Sandbox  ( ) Production│
   │                                         │
   │ Permissions:                            │
   │ [✓] Read payments                      │
   │ [✓] Write payments                     │
   │ [ ] Admin access                       │
   │                                         │
   │ [Cancel]              [Generate Key]   │
   └─────────────────────────────────────────┘
3. Key wird generiert und einmalig angezeigt
4. Copy-to-Clipboard-Option
```

#### Test Webhook

```
1. [Test Webhook] klicken
2. Modal öffnet sich:
   ┌─────────────────────────────────────────┐
   │ Test Webhook Delivery                   │
   ├─────────────────────────────────────────┤
   │                                         │
   │ Endpoint: [https://your-server.com/webhook]│
   │                                         │
   │ Event Type: [payment.succeeded ▼]      │
   │                                         │
   │ Payload:                                │
   │ ┌─────────────────────────────────────┐ │
   │ │ {                                   │ │
   │ │   "test": true,                     │ │
   │ │   "event": "payment.succeeded"      │ │
   │ │ }                                   │ │
   │ └─────────────────────────────────────┘ │
   │                                         │
   │ [Cancel]                    [Send Test] │
   └─────────────────────────────────────────┘
3. Test wird gesendet
4. Ergebnis wird angezeigt (Success/Error)
```

---

## 5. Responsive Design

### 5.1 Breakpoints

| Breakpoint | Layout |
|------------|--------|
| **Mobile** (<640px) | Single Column, Widgets stacked |
| **Tablet** (640-1024px) | 2 Column Grid |
| **Desktop** (>1024px) | 3+ Column Grid |

### 5.2 Mobile Optimierungen

- Widgets werden vertikal gestapelt
- Charts werden zu kleineren Versionen
- Quick Actions werden zum Hamburger-Menu
- Tabellen werden zu Cards

---

## 6. Performance-Anforderungen

### 6.1 Ladezeiten

| Metrik | Ziel |
|--------|------|
| Initial Load | < 2s |
| Widget Refresh | < 500ms |
| Action Response | < 200ms |

### 6.2 Caching-Strategie

- Widget-Daten werden 30s gecached
- Echtzeit-Updates via WebSocket
- Retry bei Fehlern mit Exponential Backoff

---

## 7. Sicherheitsaspekte

### 7.1 Zugriffskontrolle

- Rollenbasierte Zugriffskontrolle (RBAC)
- Sensitive Aktionen erfordern 2FA
- Audit-Logging aller Dashboard-Aktionen

### 7.2 Data Protection

- Keine PII in Widgets ohne explizite Berechtigung
- Logs werden nach 30 Tagen gelöscht
- Verschlüsselte Übertragung aller Daten

---

## 8. Integration mit anderen Tools

### 8.1 API Explorer

- Direkter Link vom Usage-Widget
- Vorausgefüllte Parameter basierend auf Widget-Daten

### 8.2 Webhook Debugger

- Direkter Link von fehlgeschlagenen Events
- Replay-Funktionalität integriert

### 8.3 Logs

- Deep-Links zu spezifischen Request-IDs
- Zeitraum-Filter basierend auf Widget-Auswahl

---

## 9. Metriken & Analytics

### 9.1 Dashboard-Nutzung

| Metrik | Beschreibung |
|--------|--------------|
| **DAU** | Tägliche aktive Dashboard-Nutzer |
| **Session Duration** | Durchschnittliche Sitzungsdauer |
| **Feature Usage** | Nutzung der einzelnen Widgets |
| **Action Completion** | Erfolgreich abgeschlossene Aktionen |

### 9.2 Erfolgsmessung

- Time-to-First-Successful-Integration
- Error-Discovery-Time
- Support-Ticket-Reduction

---

*Das Partner-Dashboard ist das Herzstück der CargoBit Developer Experience und ermöglicht Partnern, ihre Integrationen effizient zu verwalten und zu optimieren.*
