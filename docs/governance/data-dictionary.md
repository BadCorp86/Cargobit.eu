# CargoBit Data Dictionary
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument definiert alle Datenfelder und deren Bedeutung im CargoBit System. Es dient als Referenz für Entwickler, Analysten und Partner.

---

# 2. Common Fields

## 2.1 Identifiers

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | string | Unique identifier | pay_abc123 |
| paymentId | string | Payment identifier | pay_abc123 |
| walletId | string | Wallet identifier | wallet_xyz |
| payoutId | string | Payout identifier | payout_123 |
| userId | string | User identifier | user_abc |
| reference | string | External reference | ORDER-12345 |
| correlationId | string | Request tracking ID | corr_abc123 |

## 2.2 Timestamps

| Field | Type | Description | Format |
|-------|------|-------------|--------|
| createdAt | datetime | Record creation time | ISO 8601 |
| updatedAt | datetime | Last update time | ISO 8601 |
| processedAt | datetime | Processing completion time | ISO 8601 |
| expiresAt | datetime | Expiration time | ISO 8601 |

## 2.3 Amounts

| Field | Type | Description | Unit |
|-------|------|-------------|------|
| amount | integer | Monetary amount | Cents |
| balance | integer | Wallet balance | Cents |
| fee | integer | Transaction fee | Cents |

---

# 3. Payment Fields

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| paymentId | string | Unique payment ID | Format: pay_* |
| amount | integer | Payment amount | Positive, cents |
| currency | string | ISO 4217 currency | 3 letters |
| status | enum | Payment status | pending, succeeded, failed, canceled |
| reference | string | Partner reference | Max 255 chars |
| userId | string | User who created payment | FK to User |
| walletId | string | Target wallet | FK to Wallet |
| stripePaymentIntentId | string | Stripe PaymentIntent ID | Format: pi_* |
| metadata | object | Additional data | Key-value pairs |

---

# 4. Wallet Fields

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| walletId | string | Unique wallet ID | Format: wallet_* |
| userId | string | Wallet owner | FK to User |
| balance | integer | Current balance | Non-negative, cents |
| currency | string | Wallet currency | ISO 4217 |
| status | enum | Wallet status | active, frozen, closed |

---

# 5. Ledger Fields

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | string | Entry ID | Format: le_* |
| walletId | string | Affected wallet | FK to Wallet |
| type | enum | Entry type | CREDIT, DEBIT |
| amount | integer | Entry amount | Positive, cents |
| reference | string | Source reference | Payment/Payout ID |
| referenceType | enum | Source type | PAYMENT, PAYOUT, ADJUSTMENT |
| balanceAfter | integer | Balance after entry | Cents |

---

# 6. Payout Fields

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| payoutId | string | Unique payout ID | Format: payout_* |
| walletId | string | Source wallet | FK to Wallet |
| amount | integer | Payout amount | Positive, cents |
| status | enum | Payout status | pending, processing, succeeded, failed |
| destination | string | Payout destination | Bank account ID |
| stripePayoutId | string | Stripe Payout ID | Format: po_* |

---

# 7. Audit Log Fields

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | string | Log entry ID | Format: al_* |
| action | string | Action performed | E.g., payment.created |
| userId | string | Actor user ID | FK to User |
| resourceType | string | Resource type | E.g., Payment |
| resourceId | string | Resource ID | Related ID |
| metadata | object | Additional context | Key-value pairs |
| previousHash | string | Previous entry hash | SHA256 |
| hash | string | This entry's hash | SHA256 |

---

# 8. Stripe Event Fields

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | string | Stripe event ID | Format: evt_* |
| type | string | Event type | E.g., payment_intent.succeeded |
| data | object | Event payload | JSON |
| status | enum | Processing status | pending, processed, failed |
| processedAt | datetime | Processing time | ISO 8601 |
| errorMessage | string | Error if failed | Text |

---

# 9. Status Values

## 9.1 Payment Status

| Status | Description |
|--------|-------------|
| pending | Created, awaiting confirmation |
| succeeded | Successfully completed |
| failed | Failed to complete |
| canceled | Canceled before completion |

## 9.2 Wallet Status

| Status | Description |
|--------|-------------|
| active | Normal operation |
| frozen | Temporarily suspended |
| closed | Permanently closed |

## 9.3 Payout Status

| Status | Description |
|--------|-------------|
| pending | Created, awaiting processing |
| processing | Being processed by Stripe |
| succeeded | Successfully completed |
| failed | Failed to complete |

---

# 10. Currency Codes

| Code | Currency | Minor Units |
|------|----------|-------------|
| EUR | Euro | 2 (cents) |
| USD | US Dollar | 2 (cents) |
| GBP | British Pound | 2 (pence) |

---

# 11. Summary

Dieses Dokument definiert alle Datenfelder und deren Bedeutung im CargoBit System.

---

# 12. Contact

Data Team
CargoBit Internal
