# CargoBit Partner Integration Guide
Version 1.0
Internal & Partner Use

---

# 1. Introduction

Dieses Dokument beschreibt, wie Partner CargoBit in ihre Systeme integrieren können.
Es richtet sich an:

- Logistikpartner
- Plattformpartner
- Enterprise-Kunden
- Zahlungsanbieter
- Technische Integratoren

Der Fokus liegt auf:

- API-Integration
- Webhook-Verarbeitung
- Idempotenz
- Sicherheit
- Test- und Sandbox-Flows
- Operational Readiness

---

# 2. Integration Overview

Die Integration besteht aus drei Bausteinen:

1. **API Calls**
   Partner initiieren Zahlungen, Wallet-Aktionen oder Statusabfragen.

2. **Webhooks**
   CargoBit sendet Ereignisse (z. B. Payment bestätigt).

3. **Idempotency & Reliability**
   Alle Vorgänge sind wiederholbar und sicher.

---

# 3. API Integration

## 3.1 Authentication

Partner authentifizieren sich über:

- API Key (server-to-server)
- TLS enforced
- No client-side usage

## 3.2 Base URL

```
https://api.cargobit.example.com/v1/
```

## 3.3 Common Headers

```
Content-Type: application/json
Authorization: Bearer <API_KEY>
Idempotency-Key: <UUID>
```

## 3.4 Idempotency

- Jeder POST-Request **muss** einen `Idempotency-Key` enthalten.
- Wiederholte Requests mit gleichem Key liefern **identische Ergebnisse**.
- Keine doppelten Zahlungen.

---

# 4. Payment Flow

## 4.1 Create Payment

```
POST /payments
```

Body:

```json
{
  "amount": 12000,
  "currency": "EUR",
  "reference": "ORDER-12345"
}
```

Response:

```json
{
  "paymentId": "pay_abc123",
  "status": "pending"
}
```

## 4.2 Payment Status

```
GET /payments/{paymentId}
```

---

# 5. Webhook Integration

## 5.1 Purpose

Webhooks informieren Partner über:

- Payment bestätigt
- Payment fehlgeschlagen
- Wallet aktualisiert
- Payout ausgeführt

## 5.2 Webhook Endpoint Requirements

- HTTPS only
- Must return `200 OK`
- Must validate signature
- Must be idempotent

## 5.3 Signature Validation

Header:

```
Stripe-Signature: t=...,v1=...
```

Partner müssen:

1. Raw body lesen
2. Signatur validieren
3. Event-ID prüfen
4. Event nur einmal verarbeiten

---

# 6. Event Types

| Event | Description |
|--------|-------------|
| payment.succeeded | Zahlung erfolgreich |
| payment.failed | Zahlung fehlgeschlagen |
| payout.created | Auszahlung initiiert |
| payout.succeeded | Auszahlung erfolgreich |
| wallet.updated | Guthaben geändert |

---

# 7. Idempotency & Reliability

## 7.1 Why It Matters

- Webhooks können mehrfach gesendet werden
- API-Requests können wiederholt werden
- Netzwerkfehler dürfen keine doppelten Zahlungen erzeugen

## 7.2 Partner Responsibilities

- Idempotency-Key verwenden
- Webhooks idempotent verarbeiten
- Event-IDs speichern

---

# 8. Error Handling

## 8.1 API Errors

| Code | Meaning |
|------|---------|
| 400 | Invalid request |
| 401 | Unauthorized |
| 429 | Rate limit exceeded |
| 500 | Internal error |

## 8.2 Webhook Errors

- CargoBit retryt Webhooks mehrfach
- Exponentielles Backoff
- Nach 72h werden Events archiviert

---

# 9. Sandbox & Testing

## 9.1 Sandbox Environment

Partner erhalten:

- Sandbox API Key
- Sandbox Webhook Secret
- Test-Dashboard

## 9.2 Test Scenarios

- Payment success
- Payment failure
- Duplicate webhook
- Rate limit exceeded
- Invalid signature

---

# 10. Operational Requirements

## 10.1 Monitoring

Partner müssen:

- Webhook-Fehler loggen
- API-Fehler loggen
- Idempotency-Keys speichern

## 10.2 Availability

- Webhook endpoint must be available 24/7
- Response time < 2 seconds

---

# 11. Security Requirements

- HTTPS enforced
- No plaintext secrets
- Rotate API keys every 90 days
- Validate all signatures
- Store no PII in logs

---

# 12. Support & Escalation

## 12.1 Support Channels

- Engineering Support
- Partner Success
- Incident Hotline (SEV-1 only)

## 12.2 Escalation Levels

| Level | Response Time |
|--------|----------------|
| SEV-1 | < 30 minutes |
| SEV-2 | < 2 hours |
| SEV-3 | < 24 hours |

---

# 13. Checklist for Go-Live

- [ ] API Key configured
- [ ] Webhook endpoint deployed
- [ ] Signature validation implemented
- [ ] Idempotency implemented
- [ ] Monitoring enabled
- [ ] Test scenarios passed
- [ ] Documentation reviewed

---

# 14. Summary

Dieser Guide ermöglicht Partnern eine:

- sichere
- zuverlässige
- auditierbare
- deterministische

Integration in die CargoBit Payment Platform.

---

# 15. Contact

Partner Engineering
CargoBit Internal
