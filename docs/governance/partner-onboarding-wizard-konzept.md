# 🧱 BLOCK S — Partner-Onboarding-Wizard Konzept

## Der schnellste Weg für Partner, CargoBit zu integrieren

### End-to-End Integration Flow

Der Partner-Onboarding-Wizard führt neue Partner **in 5 Schritten** durch die vollständige Integration mit CargoBit — von der Projekterstellung bis zur Sandbox-Zertifizierung.

---

## 1. Übersicht

### 1.1 Vision Statement

Der Onboarding-Wizard eliminiert alle Barrieren für neue Partner und ermöglicht eine vollständige Integration in unter 15 Minuten — ohne Dokumentation lesen zu müssen.

### 1.2 Kernprinzipien

| Prinzip | Beschreibung |
|---------|--------------|
| **Guided Experience** | Schritt-für-Schritt Führung ohne Missverständnisse |
| **Instant Feedback** | Sofortige Validierung und Fehlerbehebung |
| **Progressive Disclosure** | Nur relevante Informationen zum richtigen Zeitpunkt |
| **Success Celebration** | Positive Bestätigung bei jedem abgeschlossenen Schritt |

### 1.3 Ziele & Metriken

| Ziel | Metrik | Target |
|------|--------|--------|
| Time to First Success | Zeit bis zur ersten erfolgreichen API-Anfrage | < 5 Minuten |
| Completion Rate | Prozentsatz abgeschlossener Onboardings | > 85% |
| Support Tickets | Reduktion der Onboarding-Support-Tickets | > 50% |
| Time to Production | Zeit bis zur Production-Freigabe | < 24 Stunden |

---

## 2. Wizard-Struktur

### 2.1 Übersicht der 5 Schritte

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│   Step 1        Step 2        Step 3        Step 4        Step 5        │
│  ┌─────┐       ┌─────┐       ┌─────┐       ┌─────┐       ┌─────┐        │
│  │  1  │ ───── │  2  │ ───── │  3  │ ───── │  4  │ ───── │  5  │        │
│  └─────┘       └─────┘       └─────┘       └─────┘       └─────┘        │
│  Project       API           Webhook       Idempotency   Sandbox        │
│  Setup         Connectivity  Setup         Check         Certification  │
│                                                                           │
│  ◀━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━▶   │
│                          Progress: 60%                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Wizard-Navigation

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Step 3 of 5: Webhook Setup                                    [Skip →]   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│                          [Wizard Content]                                 │
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  [← Back]                                                 [Continue →]   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Step 1 — Projekt Setup

### 3.1 Ziel

Einrichtung des Projekts und Generierung der ersten API-Keys.

### 3.2 UI-Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Step 1 of 5: Project Setup                                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │   🚀 Welcome to CargoBit!                                           │ │
│  │                                                                      │ │
│  │   Let's set up your integration. This takes about 3 minutes.        │ │
│  │                                                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│  Project Name *                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ My E-Commerce Store                                           [✓]  ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  Give your project a descriptive name.                                   │
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│  Environment *                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                      ││
│  │  ┌──────────────────────────┐  ┌──────────────────────────┐        ││
│  │  │ 🧪 Sandbox              │  │ 🔴 Production           │        ││
│  │  │                         │  │                         │        ││
│  │  │ Test environment with   │  │ Live environment with   │        ││
│  │  │ mock data. Recommended  │  │ real transactions.      │        ││
│  │  │ for getting started.    │  │ Requires verification.  │        ││
│  │  │                         │  │                         │        ││
│  │  │      [✓ Selected]       │  │                         │        ││
│  │  └──────────────────────────┘  └──────────────────────────┘        ││
│  │                                                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│  API Key Name                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Default Key                                                   [✓]  ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ ℹ️ Your API key will be generated after clicking Continue.          ││
│  │    Make sure to copy it — it will only be shown once!              ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                  [Continue to Step 2 →]  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Formularfelder

| Feld | Typ | Erforderlich | Validierung |
|------|-----|--------------|-------------|
| **Project Name** | Text | Ja | 3-50 Zeichen, alphanumerisch |
| **Environment** | Radio | Ja | Sandbox oder Production |
| **API Key Name** | Text | Nein | Default: "Default Key" |

### 3.4 Nach Step 1

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ✓ API Key Generated!                                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Your Sandbox API Key has been created.                                  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ sk_test_51H7bmKLkW4F...                              [Copy] [👁]   ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ⚠️ Copy this key now. It will not be shown again!                      │
│                                                                           │
│  [I've saved my key — Continue →]                                        │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Step 2 — API Connectivity Test

### 4.1 Ziel

Verifizierung, dass die API-Verbindung funktioniert.

### 4.2 UI-Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Step 2 of 5: API Connectivity Test                                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │   Let's test your API connection.                                   │ │
│  │                                                                      │ │
│  │   We'll send a test request to verify everything works.             │ │
│  │                                                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│  Choose your preferred method:                                           │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                      ││
│  │  ┌────────────────────────┐  ┌────────────────────────┐            ││
│  │  │ 🖥️ curl                │  │ 📋 Copy & Paste        │            ││
│  │  │                        │  │                        │            ││
│  │  │ Run the command in     │  │ Use the API Explorer   │            ││
│  │  │ your terminal.         │  │ right here.            │            ││
│  │  │                        │  │                        │            ││
│  │  │    [✓ Recommended]     │  │                        │            ││
│  │  └────────────────────────┘  └────────────────────────┘            ││
│  │                                                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│  Run this command in your terminal:                                      │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ curl -X GET "https://api.cargobit.io/v1/balance" \          [Copy] ││
│  │   -H "Authorization: Bearer sk_test_51H7bmKLkW4F..."                ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  Or test directly here:                                                  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                      ││
│  │  [Send Test Request]                                                 ││
│  │                                                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│  Test Result:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ ✓ SUCCESS                                                    145ms  ││
│  │                                                                      ││
│  │ {                                                                    ││
│  │   "available": 100000,                                              ││
│  │   "currency": "eur"                                                 ││
│  │ }                                                                    ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                  [Continue to Step 3 →]  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Test-Szenarien

| Szenario | Result | Nächste Aktion |
|----------|--------|----------------|
| **Erfolg** | 200 OK | Weiter zu Step 3 |
| **Auth Error** | 401 Unauthorized | API-Key prüfen |
| **Network Error** | Timeout | URL/Netzwerk prüfen |
| **Rate Limited** | 429 Too Many Requests | Warten und erneut versuchen |

### 4.4 Fehlerbehandlung

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⚠️ Connection Failed                                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Error: 401 Unauthorized                                                 │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 💡 This usually means your API key is incorrect or expired.        ││
│  │                                                                      ││
│  │ Common fixes:                                                        ││
│  │ 1. Make sure you copied the entire key                              ││
│  │ 2. Check for extra spaces before/after the key                      ││
│  │ 3. Verify the key hasn't been revoked                               ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  [Copy API Key Again]  [Generate New Key]  [Contact Support]             │
│                                                                           │
│  [Retry Test →]                                                          │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Step 3 — Webhook Setup

### 5.1 Ziel

Konfiguration und Test des Webhook-Endpoints.

### 5.2 UI-Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Step 3 of 5: Webhook Setup                                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │   Webhooks keep your system in sync with CargoBit events.          │ │
│  │                                                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│  Webhook URL *                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ https://your-server.com/webhooks/cargobit                     [✓]  ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  The URL where CargoBit will send events. Must be HTTPS.                │
│                                                                           │
│  Events to Subscribe *                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ [✓] payment.succeeded       [✓] payment.failed                     ││
│  │ [✓] payout.created          [ ] refund.processed                    ││
│  │ [ ] customer.created        [ ] customer.updated                    ││
│  │                                                                      ││
│  │ [Select All Common Events]                                           ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│  Webhook Secret                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ whsec_abc123...                                        [Generate]   ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  Use this secret to verify webhook signatures.                           │
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                      ││
│  │  [Send Test Event]                                                   ││
│  │                                                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  Test Result:                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ ✓ WEBHOOK RECEIVED                                           245ms  ││
│  │                                                                      ││
│  │ Signature Validation: ✓ Valid                                        ││
│  │ Response Code: 200 OK                                                ││
│  │ Response Body: {"received": true}                                    ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                  [Continue to Step 4 →]  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Webhook Simulator

Integrierter Webhook-Simulator für Tests:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Webhook Simulator                                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Simulate Event:                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ [payment.succeeded ▼]                                               ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  Event Payload (editable):                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ {                                                                    ││
│  │   "id": "evt_test_123",                                             ││
│  │   "type": "payment.succeeded",                                      ││
│  │   "data": {                                                         ││
│  │     "object": {                                                     ││
│  │       "id": "pay_test_456",                                         ││
│  │       "amount": 1000,                                               ││
│  │       "currency": "eur"                                             ││
│  │     }                                                               ││
│  │   }                                                                 ││
│  │ }                                                                    ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  [Send Test Event]                                                       │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Validierungs-Checks

| Check | Beschreibung | Status |
|-------|--------------|--------|
| **URL Valid** | HTTPS, gültiges Format | ✓/✗ |
| **Endpoint Reachable** | Server antwortet | ✓/✗ |
| **Signature Valid** | Signatur korrekt validiert | ✓/✗ |
| **Response Code** | 200 OK zurückgegeben | ✓/✗ |
| **Response Time** | < 5 Sekunden | ✓/✗ |

---

## 6. Step 4 — Idempotency Check

### 6.1 Ziel

Sicherstellung, dass die Integration Idempotency korrekt behandelt.

### 6.2 UI-Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Step 4 of 5: Idempotency Check                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │   Idempotency prevents duplicate processing.                        │ │
│  │                                                                      │ │
│  │   When you retry a request with the same Idempotency-Key,           │ │
│  │   CargoBit returns the same result without creating a duplicate.    │ │
│  │                                                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│  Let's test your idempotency handling:                                   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                      ││
│  │  Test 1: Create a payment with Idempotency-Key: A                   ││
│  │                                                                      ││
│  │  [Send First Request]                                                ││
│  │                                                                      ││
│  │  Result: ✓ Payment created (pay_001)                                ││
│  │                                                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                      ││
│  │  Test 2: Retry with the same Idempotency-Key: A                     ││
│  │                                                                      ││
│  │  [Send Retry Request]                                                ││
│  │                                                                      ││
│  │  Result: ✓ Same payment returned (pay_001) — No duplicate!          ││
│  │                                                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│  Your Idempotency Status:                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                      ││
│  │  ✓ Duplicate detection working                                      ││
│  │  ✓ Correct response handling                                        ││
│  │  ✓ No duplicate side effects                                        ││
│  │                                                                      ││
│  │  Status: PASSED                                                      ││
│  │                                                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                  [Continue to Step 5 →]  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Duplicate Request Simulation

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Duplicate Request Simulator                                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Simulating duplicate webhook delivery...                                │
│                                                                           │
│  Request 1:                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ POST /webhooks/cargobit                                             ││
│  │ Idempotency-Key: ik_test_123                                        ││
│  │ Response: 200 OK                                                     ││
│  │ Processing: Created payment record                                   ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  Request 2 (Duplicate):                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ POST /webhooks/cargobit                                             ││
│  │ Idempotency-Key: ik_test_123                                        ││
│  │ Response: 200 OK                                                     ││
│  │ Processing: Skipped (already processed)                              ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ✓ Your system correctly handled the duplicate!                          │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Step 5 — Sandbox Certification

### 7.1 Ziel

Abschluss des Onboardings mit erfolgreicher Sandbox-Zertifizierung.

### 7.2 UI-Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Step 5 of 5: Sandbox Certification                                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │   Complete these tests to earn your Sandbox Certificate.            │ │
│  │                                                                      │ │
│  │   This certifies your integration is ready for production.          │ │
│  │                                                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│  Required Tests:                                                         │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                      ││
│  │  Test 1: Create Payment                                              ││
│  │  ✓ PASSED                                                    0.2s   ││
│  │                                                                      ││
│  │  Test 2: Retrieve Payment                                            ││
│  │  ✓ PASSED                                                    0.1s   ││
│  │                                                                      ││
│  │  Test 3: List Payments                                               ││
│  │  ✓ PASSED                                                    0.3s   ││
│  │                                                                      ││
│  │  Test 4: Process Webhook                                             ││
│  │  ✓ PASSED                                                    0.5s   ││
│  │                                                                      ││
│  │  Test 5: Handle Error                                                ││
│  │  ✓ PASSED                                                    0.1s   ││
│  │                                                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                      ││
│  │  ████████████████████████████████████████████ 100%                  ││
│  │                                                                      ││
│  │  All 5 tests passed! ✓                                               ││
│  │                                                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                              [Complete Certification →]  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Test-Katalog

| Test | Beschreibung | Kriterium |
|------|--------------|-----------|
| **Create Payment** | Zahlung erstellen | 201 Created |
| **Retrieve Payment** | Zahlung abrufen | 200 OK, korrekte Daten |
| **List Payments** | Zahlungen auflisten | 200 OK, Array zurück |
| **Process Webhook** | Webhook verarbeiten | 200 OK innerhalb 5s |
| **Handle Error** | Fehlerbehandlung | Korrekter Error-Handler |

---

## 8. Wizard Completion

### 8.1 Erfolgsmeldung

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                         🎉 CONGRATULATIONS!                              │
│                                                                           │
│                  Your integration is complete!                           │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │   ✓ API Keys Generated                                               │ │
│  │   ✓ API Connection Verified                                          │ │
│  │   ✓ Webhooks Configured                                              │ │
│  │   ✓ Idempotency Tested                                               │ │
│  │   ✓ Sandbox Certified                                                │ │
│  │                                                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│  Your Sandbox Certificate:                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                                                                      ││
│  │   📜 CERT-2024-00123                                                ││
│  │                                                                      ││
│  │   Project: My E-Commerce Store                                      ││
│  │   Completed: 2024-01-15                                             ││
│  │   Status: CERTIFIED                                                  ││
│  │                                                                      ││
│  │   [Download Certificate PDF]                                         ││
│  │                                                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Nächste Schritte

```
┌──────────────────────────────────────────────────────────────────────────┐
│ What's Next?                                                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐ │
│  │ 🔧 API Explorer    │  │ 📊 Dashboard       │  │ 🔴 Production      │ │
│  │                    │  │                    │  │                    │ │
│  │ Test more          │  │ View your usage    │  │ Go live with       │ │
│  │ endpoints.         │  │ and metrics.       │  │ real payments.     │ │
│  │                    │  │                    │  │                    │ │
│  │ [Open →]           │  │ [Open →]           │  │ [Request Access →] │ │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘ │
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│  Recommended Reading:                                                    │
│  • Getting Started Guide                                                 │
│  • API Reference                                                         │
│  • Best Practices for Production                                         │
│  • Security Checklist                                                    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Skip & Resume Funktionalität

### 9.1 Skip Option

Jeder Schritt kann übersprungen werden:

```
[Skip this step →] — Überspringt den aktuellen Schritt
```

### 9.2 Resume bei Wiedereintritt

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Welcome back!                                                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  You were in the middle of setting up your integration.                  │
│                                                                           │
│  Progress: Step 3 of 5 (Webhook Setup)                                   │
│                                                                           │
│  [Continue where I left off]  [Start over]                               │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Analytics & Tracking

### 10.1 Getrackte Events

| Event | Beschreibung |
|-------|--------------|
| `wizard_started` | Wizard begonnen |
| `wizard_step_completed` | Schritt abgeschlossen |
| `wizard_step_skipped` | Schritt übersprungen |
| `wizard_completed` | Wizard abgeschlossen |
| `wizard_abandoned` | Wizard abgebrochen |
| `test_passed` | Test bestanden |
| `test_failed` | Test fehlgeschlagen |

### 10.2 Conversion-Funnel

```
Started:      100%
Step 1:       95%  (5% drop-off)
Step 2:       88%  (7% drop-off)
Step 3:       82%  (6% drop-off)
Step 4:       78%  (4% drop-off)
Step 5:       75%  (3% drop-off)
Completed:    75%  (25% overall drop-off)
```

---

*Der Partner-Onboarding-Wizard eliminiert alle Barrieren und ermöglicht eine schnelle, erfolgreiche Integration mit CargoBit.*
