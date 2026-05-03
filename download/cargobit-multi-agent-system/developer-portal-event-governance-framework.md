# 🧱 BLOCK AY — Developer‑Portal Event‑Governance‑Framework

## Wie Events, Webhooks und Event‑Schemas kontrolliert werden

---

## 1. Überblick

Dieses Framework stellt sicher, dass Events:

| Eigenschaft | Beschreibung |
|-------------|--------------|
| **Stabil** | Konsistente Event-Namen und Payloads |
| **Versioniert** | Klare Versionierung für Rückwärtskompatibilität |
| **Deterministisch** | Vorhersagbare und reproduzierbare Events |
| **Auditierbar** | Vollständige Nachvollziehbarkeit |
| **Rückwärtskompatibel** | Keine Breaking Changes ohne Migration |

---

## 2. Event‑Governance‑Ziele

### 2.1 Primäre Ziele

**Keine Breaking Changes**
Events dürfen keine Felder entfernen oder deren Semantik ändern. Dies schützt Partner vor unerwarteten Integrationproblemen.

**Klare Event‑Schemas**
Jedes Event hat ein definiertes, versioniertes Schema mit dokumentierten Feldern und Typen.

**Vollständige Dokumentation**
Alle Events sind in der Event Reference dokumentiert mit Beispielen und Troubleshooting-Hinweisen.

**Hohe Webhook‑Zuverlässigkeit**
99.9% Delivery Rate innerhalb der definierten SLAs.

**Audit‑Fähigkeit**
Alle Event-Sendungen sind protokolliert und nachvollziehbar.

### 2.2 Messbare KPIs

| KPI | Zielwert | Messung |
|-----|----------|---------|
| Webhook Delivery Rate | 99.9% | Monitoring |
| Event Documentation Coverage | 100% | Automatisierte Checks |
| Breaking Changes (Lifetime) | 0 | Schema Analysis |
| Average Delivery Latency | < 500ms | APM |
| Retry Success Rate | > 95% | Delivery Analytics |

---

## 3. Event‑Lifecycle

### 3.1 Phase 1: Event Proposal

Jedes neue Event beginnt mit einem Proposal.

**Proposal-Template:**

```
Event Proposal:
├── Eventname
│   └── Format: entity.action (z.B. payment.completed)
├── Beschreibung
│   ├── Wann wird es getriggert?
│   ├── Wer empfängt es?
│   └── Was ist der Business-Value?
├── Payload-Definition
│   ├── Pflichtfelder
│   ├── Optionale Felder
│   └── Typen
├── Trigger-Definition
│   ├── System-Event
│   ├── User-Event
│   └── Scheduled-Event
├── Security Impact
│   ├── Enthält PII?
│   ├── Signatur erforderlich?
│   └── Verschlüsselung erforderlich?
└── Abhängigkeiten
    ├── Vorausgehende Events
    └── Nachfolgende Events
```

**Beispiel:**

```json
{
  "event_name": "payment.completed",
  "description": "Wird getriggert wenn eine Zahlung erfolgreich abgeschlossen wurde",
  "trigger": "System-Event nach erfolgreicher Zahlungsabwicklung",
  "payload": {
    "required": ["id", "amount", "currency", "status", "created_at"],
    "optional": ["metadata", "description", "customer_id"]
  },
  "security": {
    "contains_pii": false,
    "signature_required": true,
    "encryption_required": false
  }
}
```

### 3.2 Phase 2: Schema Review

Der Schema Review prüft die Konsistenz und Qualität des Event-Schemas.

**Prüfpunkte:**

| Prüfpunkt | Beschreibung | Kriterium |
|-----------|--------------|-----------|
| Pflichtfelder | Sind alle erforderlichen Felder definiert? | Vollständigkeit |
| Optionalfelder | Sind optionale Felder korrekt markiert? | Konsistenz |
| Typen | Sind alle Typen explizit definiert? | Klarheit |
| Versionierung | Ist die Version definiert? | Rückwärtskompatibilität |

**Schema-Definition (JSON Schema):**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.cargobit.io/schemas/payment.completed.v1.json",
  "title": "Payment Completed Event",
  "type": "object",
  "required": ["id", "amount", "currency", "status", "created_at"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique payment identifier"
    },
    "amount": {
      "type": "integer",
      "description": "Payment amount in smallest currency unit"
    },
    "currency": {
      "type": "string",
      "enum": ["EUR", "USD", "GBP"],
      "description": "Three-letter currency code"
    },
    "status": {
      "type": "string",
      "const": "completed",
      "description": "Payment status"
    },
    "created_at": {
      "type": "integer",
      "description": "Unix timestamp of event creation"
    }
  },
  "additionalProperties": true
}
```

### 3.3 Phase 3: Delivery Review

Der Delivery Review stellt die zuverlässige Zustellung sicher.

**Retry-Policy Definition:**

```yaml
retry_policy:
  strategy: exponential_backoff
  max_attempts: 10
  initial_delay: 60s
  max_delay: 86400s
  jitter: 10%
```

**Retry-Zeitplan:**

| Versuch | Verzögerung | Kumulativ |
|---------|-------------|-----------|
| 1 | 60s | 1 min |
| 2 | 120s | 3 min |
| 3 | 300s | 8 min |
| 4 | 600s | 18 min |
| 5 | 1800s | 48 min |
| 6 | 3600s | 108 min |
| 7 | 7200s | 228 min |
| 8 | 14400s | 468 min |
| 9 | 28800s | 948 min |
| 10 | 86400s | 1d 13h |

**Signature Model:**

```http
POST /webhook-endpoint
Content-Type: application/json
X-CargoBit-Signature: sha256=abcdef123456...
X-CargoBit-Timestamp: 1705555555
X-CargoBit-Event: payment.completed

{
  "id": "evt_abc123",
  "event": "payment.completed",
  "data": {...}
}
```

**Idempotency Model:**

```json
{
  "id": "evt_abc123",
  "event": "payment.completed",
  "data": {...},
  "idempotency_key": "evt_abc123"
}
```

Partner können Events anhand der `id` deduplizieren.

### 3.4 Phase 4: Documentation

Vollständige Dokumentation für jedes Event.

**Event Reference Format:**

```markdown
# payment.completed

## Übersicht
Wird getriggert wenn eine Zahlung erfolgreich abgeschlossen wurde.

## Payload

| Feld | Typ | Beschreibung | Erforderlich |
|------|-----|--------------|--------------|
| id | string | Eindeutige Zahlungs-ID | Ja |
| amount | integer | Betrag in kleinster Währungseinheit | Ja |
| currency | string | Dreistelliger Währungscode | Ja |
| status | string | Status der Zahlung | Ja |
| created_at | integer | Unix Timestamp | Ja |
| metadata | object | Benutzerdefinierte Metadaten | Nein |

## Beispiel-Payload

```json
{
  "id": "pay_abc123",
  "amount": 10000,
  "currency": "EUR",
  "status": "completed",
  "created_at": 1705555555
}
```

## Troubleshooting
- **Event nicht erhalten:** Prüfen Sie die Webhook-Konfiguration
- **Signatur ungültig:** Verifizieren Sie das Webhook-Secret
```

### 3.5 Phase 5: Release

Der Release-Prozess für neue Events.

**Release-Checkliste:**

```
Event Release Checklist:
□ Event Proposal genehmigt
□ Schema Review abgeschlossen
□ Delivery Review abgeschlossen
□ Dokumentation erstellt
□ Versionierung festgelegt
□ Changelog aktualisiert
□ Test-Events verfügbar
□ Webhook Debugger getestet
□ Partner-Benachrichtigung (falls Breaking Change)
```

---

## 4. Event‑Quality‑Standards

### 4.1 Breaking Change Policy

**Verbotene Änderungen:**

| Änderungstyp | Status | Begründung |
|--------------|--------|------------|
| Feld entfernen | ❌ Verboten | Breakt existierende Integrationen |
| Feld umbenennen | ❌ Verboten | Breakt existierende Integrationen |
| Typ ändern | ❌ Verboten | Breakt existierende Integrationen |
| Semantik ändern | ❌ Verboten | Führt zu falschem Verhalten |
| PII hinzufügen | ❌ Verboten | Datenschutz-Verletzung |

**Erlaubte Änderungen:**

| Änderungstyp | Status | Bedingung |
|--------------|--------|-----------|
| Neues Feld hinzufügen | ✅ Erlaubt | Optional, mit Default-Wert |
| Neue Event-Version | ✅ Erlaubt | Mit Migrationspfad |
| Neue Event-Art | ✅ Erlaubt | Keine Auswirkung auf Bestehende |

### 4.2 Naming Conventions

**Event-Namen:**

```
Format: {entity}.{action}

Beispiele:
- payment.created
- payment.completed
- payment.failed
- refund.initiated
- refund.completed
- webhook_endpoint.created
- webhook_endpoint.disabled
```

**Payload-Felder:**

```json
{
  "id": "string",           // snake_case
  "created_at": 1234567890, // snake_case
  "customer_id": "string",  // snake_case
  "payment_method": "card"  // snake_case
}
```

### 4.3 Standard-Payload-Struktur

**Envelop-Format:**

```json
{
  "id": "evt_abc123",
  "event": "payment.completed",
  "version": "1.0",
  "created_at": 1705555555,
  "data": {
    // Event-spezifische Daten
  },
  "metadata": {
    "partner_id": "partner_123",
    "environment": "production"
  }
}
```

### 4.4 Datenschutz-Standards

**Keine PII in Events:**

```json
// ❌ FALSCH - Enthält PII
{
  "event": "customer.created",
  "data": {
    "email": "john@example.com",
    "name": "John Doe"
  }
}

// ✅ RICHTIG - Nur Referenzen
{
  "event": "customer.created",
  "data": {
    "customer_id": "cust_abc123"
  }
}
```

**Signaturpflicht:**

Alle Events müssen signiert werden:

```python
import hmac
import hashlib

def sign_payload(payload: str, secret: str) -> str:
    return hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
```

---

## 5. Event‑Governance‑Artefakte

### 5.1 Event Schema Registry

```yaml
# schema-registry.yaml
schemas:
  - name: payment.completed
    version: 1.0
    file: ./schemas/payment.completed.v1.json
    status: active
    deprecated: false
    
  - name: payment.failed
    version: 1.0
    file: ./schemas/payment.failed.v1.json
    status: active
    deprecated: false
    
  - name: legacy.payment.done
    version: 1.0
    file: ./schemas/legacy.payment.done.v1.json
    status: deprecated
    deprecated_since: "2024-01-01"
    sunset_date: "2024-07-01"
    migration_guide: ./docs/migration/payment-done-to-completed.md
```

### 5.2 Event Changelog

```markdown
# Event Changelog

## [2024-01-20] - payment.completed v1.1

### Added
- Field `processor` to identify payment processor
- Field `processor_transaction_id` for reconciliation

## [2024-01-15] - refund.initiated v1.0

### Added
- New event for refund initiation

## [2024-01-01] - legacy.payment.done v1.0

### Deprecated
- Event renamed to `payment.completed`
- See migration guide for details
```

### 5.3 Delivery Policy

```markdown
# Event Delivery Policy

## SLAs

| Event-Typ | Latency | Retry Window |
|-----------|---------|--------------|
| Payment Events | < 500ms | 24h |
| Webhook Events | < 1s | 7 Tage |
| Compliance Events | < 100ms | 30 Tage |

## Retry Strategy

- Exponential Backoff
- Max 10 Retries
- Jitter 10%

## Failure Handling

1. Nach 10 fehlgeschlagenen Versuchen: Webhook deaktivieren
2. Partner benachrichtigen
3. Dashboard-Warnung anzeigen
```

### 5.4 Retry Policy

```yaml
# retry-policy.yaml
defaults:
  strategy: exponential_backoff
  max_attempts: 10
  initial_delay_seconds: 60
  max_delay_seconds: 86400
  jitter_percent: 10

event_overrides:
  payment.completed:
    max_attempts: 15
    priority: high
    
  compliance.report:
    max_attempts: 20
    priority: critical
    alert_on_failure: true
```

### 5.5 Signature Policy

```markdown
# Event Signature Policy

## Signatur-Algorithmus

- Algorithmus: HMAC-SHA256
- Header: X-CargoBit-Signature
- Format: sha256={signature}

## Verifikation

```python
def verify_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(
        f"sha256={expected}",
        signature
    )
```

## Timestamp-Validierung

- Toleranz: 5 Minuten
- Header: X-CargoBit-Timestamp
- Schutz gegen Replay-Attacken
```

---

## 6. Webhook-Management

### 6.1 Webhook-Registrierung

```http
POST /api/v1/webhook-endpoints
Content-Type: application/json

{
  "url": "https://partner.example.com/webhooks",
  "events": ["payment.completed", "payment.failed"],
  "secret": "whsec_abc123...",
  "active": true
}
```

### 6.2 Webhook-Monitoring

**Dashboard-Metriken:**

| Metrik | Beschreibung | Alert-Schwellwert |
|--------|--------------|-------------------|
| Delivery Rate | Erfolgreiche Zustellungen | < 99% |
| Latency P50 | Median-Latenz | > 500ms |
| Latency P99 | 99. Perzentil-Latenz | > 2s |
| Failed Attempts | Fehlgeschlagene Versuche | > 10/Tag |

### 6.3 Webhook-Debugging

**Webhook Debugger Pro Features:**

```
Webhook Debug Session:
├── Request Details
│   ├── Headers
│   ├── Payload
│   └── Signature
├── Response Details
│   ├── Status Code
│   ├── Headers
│   └── Body
├── Timeline
│   ├── Sent at
│   ├── Response received
│   └── Duration
└── Retry History
    ├── Attempt 1: 200 OK
    └── Duration: 150ms
```

---

## 7. Event-Testing

### 7.1 Test-Events

```http
POST /api/v1/test-events
Content-Type: application/json

{
  "event": "payment.completed",
  "payload": {
    "id": "test_pay_123",
    "amount": 1000,
    "currency": "EUR"
  }
}
```

### 7.2 Event-Simulation

```yaml
# event-simulation.yaml
simulation:
  name: payment_flow_test
  events:
    - payment.created
    - payment.processing
    - payment.completed
  interval_seconds: 5
  target_webhook: "https://staging.partner.com/webhooks"
```

---

## 8. Governance-Organisation

### 8.1 Rollen

| Rolle | Verantwortlichkeit |
|-------|-------------------|
| Event Owner | Event-Qualität, Schema |
| Event Guild Member | Standards, Reviews |
| Webhook Admin | Webhook-Management |
| Partner Support | Partner-Betreuung |

### 8.2 Gremien

**Event Guild**
- Wöchentliche Meetings
- Review von Event Proposals
- Weiterentwicklung der Standards

---

## 9. Metriken und Reporting

### 9.1 Event-Dashboard

```
Event Governance Dashboard:
├── Active Events: 45
├── Deprecated Events: 3
├── Webhook Endpoints: 1,234
├── Delivery Rate: 99.97%
├── Average Latency: 234ms
└── Open Event Proposals: 5
```

### 9.2 Quartalsbericht

```markdown
# Q1 2024 Event Governance Report

## Zusammenfassung
- 5 neue Events veröffentlicht
- 0 Breaking Changes
- 99.97% Delivery Rate
- 1.2M Events/Tag verarbeitet

## Empfehlungen
- Event-Schema-Registry automatisieren
- Webhook-Debugger erweitern
```

---

## 10. Referenzen

- [Webhook Debugger Pro](./developer-portal-webhook-debugger-pro.md)
- [API Governance Framework](./developer-portal-api-governance-framework.md)
- [Data Governance Framework](./developer-portal-data-governance-framework.md)

---

*Letzte Aktualisierung: 2024-01-20*
*Owner: Event Guild*
*Status: Approved*
