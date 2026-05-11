# 🧱 BLOCK Q — Webhook Debugger Pro-Modul

## Deep Observability für Webhooks

### Enterprise-Level Webhook Debugging

Das Webhook Debugger Pro-Modul ist ein **Enterprise-Webhook-Debugger** auf dem Niveau von Stripes internen Tools. Es bietet tiefgreifende Einsicht in Webhook-Events und ermöglicht umfassendes Debugging.

---

## 1. Übersicht und Architektur

### 1.1 Zweck

Der Webhook Debugger Pro ermöglicht Entwicklern:

- **Vollständige Transparenz** über alle Webhook-Events
- **Deep Debugging** bei Fehlern
- **Replay & Testing** für Entwicklung
- **Audit & Compliance** für Dokumentation

### 1.2 Kernkomponenten

```
┌─────────────────────────────────────────────────────────────┐
│                  Webhook Debugger Pro                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Event     │  │  Signature  │  │   Replay    │         │
│  │   Timeline  │  │  Inspector  │  │   Engine    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Delivery   │  │   Event     │  │   Debug     │         │
│  │    Log      │  │ Diff Tool   │  │   Flows     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Event Timeline

### 2.1 Übersicht

Die Event Timeline zeigt den vollständigen Lebenszyklus eines Webhook-Events.

```
┌─────────────────────────────────────────────────────────────┐
│ Event Timeline: evt_abc123                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  14:32:01.234  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│  14:32:01.234  ✓ RECEIVED                                  │
│                Source: Stripe                               │
│                Event: payment.succeeded                     │
│                IP: 34.123.45.67                            │
│                                                             │
│  14:32:01.235  ✓ VALIDATED                                 │
│                Signature: Valid (v1)                       │
│                Timestamp: Within tolerance (2s)            │
│                Replay: Not detected                        │
│                                                             │
│  14:32:01.236  ⟳ PROCESSING                                │
│                Handler: /webhooks/stripe                   │
│                Action: Creating payment record             │
│                                                             │
│  14:32:01.456  ✓ ACKNOWLEDGED                              │
│                Response: 200 OK                            │
│                Duration: 222ms                             │
│                Idempotency Key: ik_xyz789                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Timeline-Zustände

| Zustand | Icon | Beschreibung |
|---------|------|--------------|
| **RECEIVED** | 📥 | Event von CargoBit empfangen |
| **VALIDATED** | ✓ | Signatur und Timestamp geprüft |
| **PROCESSING** | ⟳ | Event wird verarbeitet |
| **ACKNOWLEDGED** | ✓ | Erfolgreich verarbeitet |
| **FAILED** | ✗ | Verarbeitung fehlgeschlagen |
| **RETRYING** | ↻ | Wiederholungsversuch läuft |

### 2.3 Detaillierte Event-Ansicht

```
┌─────────────────────────────────────────────────────────────┐
│ Event Details                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Event ID:        evt_abc123def456                         │
│  Type:            payment.succeeded                        │
│  Created:         2024-01-15T14:32:01.234Z                 │
│  Livemode:        false (Sandbox)                          │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  Payload:                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ {                                                   │   │
│  │   "id": "evt_abc123",                              │   │
│  │   "object": "event",                               │   │
│  │   "type": "payment.succeeded",                     │   │
│  │   "data": {                                        │   │
│  │     "object": {                                    │   │
│  │       "id": "pay_xyz789",                          │   │
│  │       "amount": 10000,                             │   │
│  │       "currency": "eur",                           │   │
│  │       "status": "succeeded"                        │   │
│  │     }                                              │   │
│  │   }                                                │   │
│  │ }                                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Copy Payload]  [Download JSON]  [View Raw]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Signature Inspector

### 3.1 Übersicht

Der Signature Inspector ermöglicht die detaillierte Analyse der Webhook-Signatur.

```
┌─────────────────────────────────────────────────────────────┐
│ Signature Inspector                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Raw Body (for signature verification):                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ {"id":"evt_abc123","object":"event",...}           │   │
│  │                                                     │   │
│  │ [Copy Raw Body]                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  Signature Header:                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ t=1705324321,                                       │   │
│  │ v1=5257a869e8ecbdd56...,                           │   │
│  │ v0=abc123...                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  Components:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Timestamp:    1705324321                            │   │
│  │ Received At:  2024-01-15T14:32:01Z                  │   │
│  │ Tolerance:    300s (5 minutes)                      │   │
│  │ Difference:   2s ✓ Within tolerance                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  Signature Verification:                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ v1 Signature (Current):                             │   │
│  │   Received:  5257a869e8ecbdd56...                   │   │
│  │   Computed:  5257a869e8ecbdd56...                   │   │
│  │   Match:     ✓ VALID                                │   │
│  │                                                     │   │
│  │ v0 Signature (Legacy):                              │   │
│  │   Received:  abc123...                              │   │
│  │   Computed:  abc123...                              │   │
│  │   Match:     ✓ VALID                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  Verification Steps:                                       │
│  1. Extract timestamp from header                   ✓      │
│  2. Check timestamp within tolerance                ✓      │
│  3. Compute expected signature                      ✓      │
│  4. Compare with received signature                 ✓      │
│                                                             │
│  [Test with Different Secret]  [Regenerate Signature]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Fehleranalyse

Bei ungültiger Signatur:

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Signature Verification Failed                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  v1 Signature:                                             │
│   Received:  5257a869e8ecbdd56abc...                       │
│   Computed:  5257a869e8ecbdd56def...                       │
│   Match:     ✗ INVALID                                     │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  Possible Causes:                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Wrong webhook secret configured                  │   │
│  │    → Check your webhook endpoint settings           │   │
│  │                                                     │   │
│  │ 2. Payload was modified in transit                  │   │
│  │    → Check for proxies or middleware                │   │
│  │                                                     │   │
│  │ 3. Using wrong signing key version                  │   │
│  │    → Verify you're using the current secret         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  💡 Suggested Actions:                                      │
│  [Rotate Webhook Secret]  [Test with New Secret]           │
│  [View Documentation]                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Replay Engine

### 4.1 Übersicht

Die Replay Engine ermöglicht das erneute Senden von Events mit verschiedenen Modifikationen.

```
┌─────────────────────────────────────────────────────────────┐
│ Replay Engine                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Source Event: evt_abc123 (payment.succeeded)              │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  Replay Options:                                           │
│                                                             │
│  [✓] Replay event to original endpoint                     │
│  [ ] Replay to custom endpoint                             │
│      URL: [___________________________]                    │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  Modifications:                                            │
│                                                             │
│  [ ] Modify payload                                        │
│      ┌─────────────────────────────────────────────────┐   │
│      │ {                                                 │   │
│      │   "id": "evt_abc123",                            │   │
│      │   "data": {                                      │   │
│      │     "object": {                                  │   │
│      │       "amount": 5000  ← Changed from 10000      │   │
│      │     }                                            │   │
│      │   }                                              │   │
│      │ }                                                │   │
│      └─────────────────────────────────────────────────┘   │
│                                                             │
│  [ ] Modify timestamp                                      │
│      New timestamp: [2024-01-15T15:00:00Z           ]      │
│                                                             │
│  [ ] Modify signature (for testing validation)             │
│      New signature: [Auto-generated               ]        │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  Idempotency:                                              │
│  [✓] Generate new idempotency key                         │
│  [ ] Use original idempotency key (test duplicate handling)│
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  [Replay Event]  [Save as Template]  [Cancel]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Replay-Historie

```
┌─────────────────────────────────────────────────────────────┐
│ Replay History                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Original Event: evt_abc123                                │
│                                                             │
│  Replays:                                                  │
│  ┌───────────────────────────────────────────────────────┐│
│  │ #1  2024-01-15 14:45:00  200 OK    189ms             ││
│  │ #2  2024-01-15 14:50:00  200 OK    201ms             ││
│  │ #3  2024-01-15 15:00:00  400 Error  5ms              ││
│  │     └─ Invalid signature                               ││
│  │ #4  2024-01-15 15:05:00  200 OK    195ms             ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
│  [Compare Replays]  [Export History]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Delivery Log

### 5.1 Übersicht

Der Delivery Log zeigt alle Zustellversuche mit Details.

```
┌─────────────────────────────────────────────────────────────┐
│ Delivery Log                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filters: [All ▼] [Success ▼] [Failed ▼] [Retrying ▼]     │
│           [Last 24h ▼]  [Search...              ]          │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  ┌───────────────────────────────────────────────────────┐│
│  │ ✓ payment.succeeded      200 OK     145ms   2 min ago ││
│  │   evt_abc123 → https://partner.com/webhook            ││
│  │                                                       ││
│  │ ✗ payment.failed         500 Error  5012ms  15 min ago││
│  │   evt_def456 → https://partner.com/webhook            ││
│  │   Error: Internal Server Error                        ││
│  │   [Retry] [Details]                                   ││
│  │                                                       ││
│  │ ↻ customer.updated       Retrying...          30 min ago│
│  │   evt_ghi789 → https://partner.com/webhook            ││
│  │   Attempt 3/5, Next retry in 60s                      ││
│  │   [Cancel Retry] [Details]                            ││
│  │                                                       ││
│  │ ✓ payout.created         200 OK     98ms    1 hour ago ││
│  │   evt_jkl012 → https://partner.com/webhook            ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
│  [Load More]                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Delivery Details

```
┌─────────────────────────────────────────────────────────────┐
│ Delivery Details: evt_abc123                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Event:         payment.succeeded                          │
│  Endpoint:      https://partner.com/webhook                │
│  Status:        ✓ Delivered                                │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  Attempts:                                                 │
│                                                             │
│  Attempt 1:                                                │
│  ┌───────────────────────────────────────────────────────┐│
│  │ Timestamp:   2024-01-15T14:32:01.234Z                ││
│  │ Status:      200 OK                                   ││
│  │ Duration:    145ms                                    ││
│  │ Response:                                            ││
│  │   {"received": true, "processed_id": "proc_123"}     ││
│  │                                                      ││
│  │ Request Headers:                                      ││
│  │   Content-Type: application/json                     ││
│  │   CargoBit-Signature: t=1705324321,v1=5257a...      ││
│  │   CargoBit-Event: payment.succeeded                  ││
│  │                                                      ││
│  │ Response Headers:                                     ││
│  │   Content-Type: application/json                     ││
│  │   X-Request-Id: req_partner_abc                      ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
│  [Replay Event]  [View Full Payload]  [Download Log]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Event Diff Tool

### 6.1 Übersicht

Das Event Diff Tool vergleicht zwei Events und hebt Unterschiede hervor.

```
┌─────────────────────────────────────────────────────────────┐
│ Event Diff Tool                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Left:   [Original Event ▼]  evt_abc123                    │
│  Right:  [Modified Event ▼]  evt_abc123 (Replay #4)        │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  ┌─────────────────────┬─────────────────────────────────┐ │
│  │ Original            │ Modified                        │ │
│  ├─────────────────────┼─────────────────────────────────┤ │
│  │ {                   │ {                               │ │
│  │   "id": "evt_abc",  │   "id": "evt_abc",              │ │
│  │   "type": "payment",│   "type": "payment",            │ │
│  │   "data": {         │   "data": {                     │ │
│  │     "object": {     │     "object": {                 │ │
│  │       "amount":     │       "amount":                 │ │
│  │ ━━━━━━━━━━━━━━━━━━━│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│ │
│  │       10000,        │       5000,         ← Changed   │ │
│  │ ━━━━━━━━━━━━━━━━━━━│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│ │
│  │       "currency":   │       "currency":               │ │
│  │       "eur"         │       "eur"                     │ │
│  │     }               │     }                           │ │
│  │   }                 │   }                             │ │
│  │ }                   │ }                               │ │
│  └─────────────────────┴─────────────────────────────────┘ │
│                                                             │
│  ─────────────────────────────────────────────────────────│
│                                                             │
│  Summary:                                                  │
│  • 1 field changed                                         │
│  • 0 fields added                                          │
│  • 0 fields removed                                        │
│                                                             │
│  [Export Diff]  [Create Replay from Modified]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Diff-Legende

| Markierung | Bedeutung |
|------------|-----------|
| Rote Hintergrund | Gelöscht |
| Grüner Hintergrund | Hinzugefügt |
| Gelber Hintergrund | Geändert |

---

## 7. Debugging-Flows

### 7.1 Flow 1 — Signature Failure

```
┌─────────────────────────────────────────────────────────────┐
│ Debugging Flow: Signature Failure                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Problem: Event hat ungültige Signatur                     │
│                                                             │
│  Step 1: Event auswählen                                    │
│  ┌───────────────────────────────────────────────────────┐│
│  │ ✗ payment.succeeded      Signature Invalid           ││
│  │   evt_bad_sig → https://partner.com/webhook          ││
│  │                                                       ││
│  │ [Open in Debugger]                                    ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
│  Step 2: Signature Inspector öffnen                        │
│  ┌───────────────────────────────────────────────────────┐│
│  │ Signature Analysis:                                   ││
│  │                                                       ││
│  │ Expected:   5257a869e8ecbdd56def...                  ││
│  │ Received:   5257a869e8ecbdd56xyz...                  ││
│  │                                                       ││
│  │ Mismatch detected at character position 24           ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
│  Step 3: Fehlerursache anzeigen                            │
│  ┌───────────────────────────────────────────────────────┐│
│  │ 🔍 Root Cause Analysis:                              ││
│  │                                                       ││
│  │ Most likely cause: Webhook secret mismatch           ││
│  │                                                       ││
│  │ Your configured secret ends with: ...xyz789          ││
│  │ Correct secret should end with:     ...def456        ││
│  │                                                       ││
│  │ This suggests you're using an outdated secret.       ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
│  Step 4: Lösungsvorschläge                                 │
│  ┌───────────────────────────────────────────────────────┐│
│  │ 💡 Recommended Actions:                               ││
│  │                                                       ││
│  │ 1. [Update Webhook Secret]                            ││
│  │    Use the current secret from your dashboard         ││
│  │                                                       ││
│  │ 2. [Rotate Secret]                                    ││
│  │    Generate a new secret and update your server       ││
│  │                                                       ││
│  │ 3. [View Documentation]                               ││
│  │    Learn about signature verification                 ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Flow 2 — Duplicate Event

```
┌─────────────────────────────────────────────────────────────┐
│ Debugging Flow: Duplicate Event                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Problem: Event wurde mehrfach verarbeitet                 │
│                                                             │
│  Step 1: Replay Detection                                  │
│  ┌───────────────────────────────────────────────────────┐│
│  │ Replay Detection:                                     ││
│  │                                                       ││
│  │ Event ID: evt_abc123                                 ││
│  │ First seen:   2024-01-15T14:32:01Z                   ││
│  │ This attempt: 2024-01-15T14:35:00Z                   ││
│  │                                                       ││
│  │ ⚠️ This is a duplicate delivery!                      ││
│  │                                                       ││
│  │ Time between deliveries: 2m 59s                      ││
│  │ Likely cause: Timeout on first delivery              ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
│  Step 2: Idempotency Key Check                             │
│  ┌───────────────────────────────────────────────────────┐│
│  │ Idempotency Analysis:                                 ││
│  │                                                       ││
│  │ Idempotency Key: ik_xyz789                           ││
│  │                                                       ││
│  │ Previous processing:                                  ││
│  │   Time:    2024-01-15T14:32:01Z                      ││
│  │   Status:  200 OK                                    ││
│  │   Result:  Payment created (pay_123)                 ││
│  │                                                       ││
│  │ ✅ Your system correctly handled this duplicate!     ││
│  │    Response was identical to first processing.       ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
│  Step 3: Event History                                     │
│  ┌───────────────────────────────────────────────────────┐│
│  │ Event History for evt_abc123:                        ││
│  │                                                       ││
│  │ #1  14:32:01  Received    → Processed → 200 OK      ││
│  │ #2  14:35:00  Received    → Skipped   → 200 OK      ││
│  │     (Duplicate detected, idempotent response sent)   ││
│  │                                                       ││
│  │ [View Full Timeline]                                  ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Flow 3 — Partner-Fehler

```
┌─────────────────────────────────────────────────────────────┐
│ Debugging Flow: Partner Endpoint Error                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Problem: Partner-Endpoint gibt Fehler zurück              │
│                                                             │
│  Step 1: Delivery Log                                      │
│  ┌───────────────────────────────────────────────────────┐│
│  │ Failed Delivery:                                      ││
│  │                                                       ││
│  │ Event:   payment.succeeded                           ││
│  │ Time:    2024-01-15T14:32:01Z                        ││
│  │ Status:  500 Internal Server Error                   ││
│  │ Latency: 5012ms                                      ││
│  │                                                       ││
│  │ Response Body:                                        ││
│  │ {                                                     ││
│  │   "error": "Database connection failed"              ││
│  │ }                                                     ││
│  │                                                       ││
│  │ [Retry Now] [View Full Request/Response]             ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
│  Step 2: Response Analysis                                 │
│  ┌───────────────────────────────────────────────────────┐│
│  │ Response Codes Analysis:                              ││
│  │                                                       ││
│  │ Last 24h for this endpoint:                          ││
│  │                                                       ││
│  │ 200 OK:        150 requests (93.75%)                 ││
│  │ 500 Error:       8 requests (5.00%)  ← Current       ││
│  │ Timeout:         2 requests (1.25%)                  ││
│  │                                                       ││
│  │ ⚠️ Elevated error rate detected!                     ││
│  │                                                       ││
│  │ Error pattern: All 500s in last 30 minutes           ││
│  │ Suggests: Possible database or infrastructure issue  ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
│  Step 3: Retry Simulation                                  │
│  ┌───────────────────────────────────────────────────────┐│
│  │ Retry Simulation:                                     ││
│  │                                                       ││
│  │ Current retry policy:                                ││
│  │   Max attempts: 5                                    ││
│  │   Backoff: Exponential (1s, 2s, 4s, 8s, 16s)        ││
│  │                                                       ││
│  │ Current status: Attempt 3/5                          ││
│  │ Next retry in: 4 seconds                             ││
│  │                                                       ││
│  │ [Retry Now] [Cancel Retry] [Modify Retry Policy]     ││
│  └───────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. CLI-Integration

### 8.1 CLI-Befehle

```bash
# Events auflisten
cargobit webhook list --limit 20 --status failed

# Event-Details anzeigen
cargobit webhook get evt_abc123

# Event replayen
cargobit webhook replay evt_abc123

# Signatur testen
cargobit webhook verify-signature --payload @event.json --secret whsec_xxx

# Diff zwischen Events
cargobit webhook diff evt_abc123 evt_def456
```

---

## 9. API-Integration

### 9.1 Webhook Debugger API

```javascript
// Events auflisten
const events = await cargobit.webhookEvents.list({
  limit: 20,
  status: 'failed',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});

// Event abrufen
const event = await cargobit.webhookEvents.retrieve('evt_abc123');

// Event replayen
await cargobit.webhookEvents.replay('evt_abc123', {
  endpoint: 'https://partner.com/webhook',
  modifications: {
    'data.object.amount': 5000
  }
});

// Delivery-Log abrufen
const deliveries = await cargobit.webhookEvents.deliveries('evt_abc123');
```

---

## 10. Performance & Limits

### 10.1 Speicherdauer

| Event-Typ | Speicherdauer |
|-----------|---------------|
| Erfolgreiche Events | 30 Tage |
| Fehlgeschlagene Events | 90 Tage |
| Replay-Historie | 90 Tage |

### 10.2 Limits

| Limit | Wert |
|-------|------|
| Events pro Anfrage | 100 |
| Replays pro Tag | 1000 |
| Diff-Vergleiche pro Tag | 500 |

---

*Das Webhook Debugger Pro-Modul bietet Enterprise-Level Observability und macht Webhook-Debugging zum Kinderspiel.*
