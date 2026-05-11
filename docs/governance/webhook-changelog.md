# CargoBit Webhook Changelog
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument führt alle Änderungen an Webhooks und Events. Es informiert über neue Event-Typen und Änderungen.

---

# 2. Version History

## v1.0.0 (2024-01-15)

### Added
- Initial webhook support
- payment_intent.succeeded event
- payment_intent.payment_failed event
- payment_intent.canceled event
- payout.created event
- payout.paid event
- payout.failed event

### Features
- HMAC-SHA256 signature validation
- Timestamp validation (5-minute window)
- Event idempotency support
- Retry logic (7 attempts, 72-hour window)

---

# 3. Event Types

## 3.1 Current Events

| Event | Description | Since |
|-------|-------------|-------|
| payment_intent.succeeded | Payment completed | v1.0.0 |
| payment_intent.payment_failed | Payment failed | v1.0.0 |
| payment_intent.canceled | Payment canceled | v1.0.0 |
| payout.created | Payout initiated | v1.0.0 |
| payout.paid | Payout completed | v1.0.0 |
| payout.failed | Payout failed | v1.0.0 |

## 3.2 Upcoming Events

| Event | Description | Planned |
|-------|-------------|---------|
| payment.refunded | Payment refunded | v1.1.0 |
| wallet.balance_updated | Balance changed | v1.2.0 |

---

# 4. Payload Changes

## 4.1 Current Payload Format

```json
{
  "id": "evt_abc123",
  "type": "payment_intent.succeeded",
  "created": 1705312800,
  "data": {
    "object": {
      "id": "pi_abc123",
      "amount": 1000,
      "currency": "eur",
      "metadata": {
        "paymentId": "pay_xyz"
      }
    }
  }
}
```

---

# 5. Signature Version

| Version | Algorithm | Status |
|---------|-----------|--------|
| v1 | HMAC-SHA256 | Current |
| v0 | HMAC-SHA256 | Deprecated |

---

# 6. Retry Behavior Changes

| Version | Max Attempts | Window |
|---------|--------------|--------|
| v1.0.0 | 7 | 72 hours |

---

# 7. Summary

Dieses Dokument führt alle Änderungen an Webhooks und Events.

---

# 8. Contact

Engineering Team
CargoBit Internal
