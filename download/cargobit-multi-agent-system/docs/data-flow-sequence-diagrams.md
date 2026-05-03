# CargoBit Data Flow & Sequence Diagrams
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument visualisiert alle Datenflüsse und Sequenzen im CargoBit System. Es dient als Referenz für Entwickler, SREs und Partner.

---

# 2. Payment Flow

## 2.1 Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant P as Partner
    participant API as CargoBit API
    participant DB as Database
    participant S as Stripe
    participant W as Webhook Handler

    P->>API: POST /v1/payments
    API->>API: Validate request
    API->>DB: Create Payment (pending)
    DB-->>API: paymentId
    API->>S: Create PaymentIntent
    S-->>API: client_secret
    API-->>P: paymentId + pending

    Note over S: Customer completes payment

    S->>W: payment_intent.succeeded
    W->>W: Validate signature
    W->>DB: Check idempotency
    W->>DB: Insert StripeEvent
    W->>DB: Update Payment (succeeded)
    W->>DB: Insert LedgerEntry
    W->>DB: Insert AuditLog
    W-->>S: 200 OK

    API->>P: webhook event (optional)
    P->>API: GET /v1/payments/{id}
    API-->>P: Payment (succeeded)
```

## 2.2 Data Flow

```
Partner Request
    │
    ▼
┌─────────────┐
│ API Gateway │ ← Rate Limiting, Auth
└─────────────┘
    │
    ▼
┌─────────────┐
│ Payment     │ ← Validation, Business Logic
│ Service     │
└─────────────┘
    │
    ├──────────────────┐
    ▼                  ▼
┌─────────────┐  ┌─────────────┐
│ Database    │  │ Stripe API  │
│ (Payment)   │  │ (PI create) │
└─────────────┘  └─────────────┘
```

---

# 3. Webhook Processing Flow

## 3.1 Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant S as Stripe
    participant W as Webhook Handler
    participant V as Validator
    participant DB as Database
    participant PS as Payment Service
    participant AL as Audit Log

    S->>W: POST /webhooks/stripe
    W->>V: Validate signature
    V-->>W: Valid

    W->>DB: SELECT event_id
    DB-->>W: Not found

    W->>DB: INSERT StripeEvent (pending)

    alt payment_intent.succeeded
        W->>PS: handlePaymentSucceeded
        PS->>DB: UPDATE Payment
        PS->>DB: INSERT LedgerEntry
    else payment_intent.payment_failed
        W->>PS: handlePaymentFailed
        PS->>DB: UPDATE Payment (failed)
    else payout.paid
        W->>PS: handlePayoutPaid
        PS->>DB: UPDATE Payout
        PS->>DB: INSERT LedgerEntry
    end

    W->>AL: Log event
    W->>DB: UPDATE StripeEvent (processed)
    W-->>S: 200 OK
```

## 3.2 Data Flow

```
Stripe Webhook
    │
    ▼
┌─────────────────────┐
│ Signature Validator │ ← HMAC-SHA256
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Idempotency Check   │ ← StripeEvent table
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ Event Router        │ ← Type-based routing
└─────────────────────┘
    │
    ├────────────────┬────────────────┐
    ▼                ▼                ▼
┌─────────┐    ┌─────────┐    ┌─────────┐
│ Payment │    │ Payout  │    │ Account │
│ Handler │    │ Handler │    │ Handler │
└─────────┘    └─────────┘    └─────────┘
    │                │                │
    └────────────────┴────────────────┘
                     │
                     ▼
              ┌─────────────┐
              │ Audit Log   │
              └─────────────┘
```

---

# 4. Wallet Flow

## 4.1 Credit Flow

```mermaid
sequenceDiagram
    autonumber
    participant API as API
    participant WS as Wallet Service
    participant DB as Database
    participant L as Ledger

    API->>WS: creditWallet(userId, amount)
    WS->>DB: SELECT Wallet
    DB-->>WS: Wallet (balance)

    WS->>WS: Validate (active, limits)

    WS->>DB: BEGIN TRANSACTION
    WS->>DB: UPDATE Wallet (balance + amount)
    WS->>L: INSERT LedgerEntry (credit)
    WS->>DB: INSERT AuditLog
    WS->>DB: COMMIT

    WS-->>API: Updated wallet
```

## 4.2 Debit Flow

```mermaid
sequenceDiagram
    autonumber
    participant API as API
    participant WS as Wallet Service
    participant DB as Database
    participant L as Ledger

    API->>WS: debitWallet(userId, amount)
    WS->>DB: SELECT Wallet
    DB-->>WS: Wallet (balance)

    WS->>WS: Validate (sufficient funds)

    alt Sufficient funds
        WS->>DB: BEGIN TRANSACTION
        WS->>DB: UPDATE Wallet (balance - amount)
        WS->>L: INSERT LedgerEntry (debit)
        WS->>DB: INSERT AuditLog
        WS->>DB: COMMIT
        WS-->>API: Updated wallet
    else Insufficient funds
        WS-->>API: Error (insufficient_funds)
    end
```

---

# 5. Payout Flow

## 5.1 Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant API as API
    participant PS as Payout Service
    participant WS as Wallet Service
    participant DB as Database
    participant S as Stripe

    U->>API: Request payout
    API->>PS: createPayout(userId, amount)
    PS->>WS: checkBalance(userId)
    WS-->>PS: balance

    alt Sufficient funds
        PS->>DB: INSERT Payout (pending)
        PS->>WS: debitWallet(userId, amount)
        PS->>S: Create Stripe Payout

        S->>API: webhook: payout.paid
        API->>PS: handlePayoutPaid
        PS->>DB: UPDATE Payout (succeeded)
        PS-->>U: Payout complete
    else Insufficient funds
        PS-->>API: Error (insufficient_funds)
    end
```

---

# 6. Backup Flow

## 6.1 Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant C as CronJob
    participant B as Backup Script
    participant DB as Database
    participant S3 as Storage
    participant M as Monitoring

    C->>B: Trigger backup
    B->>DB: pg_dump
    DB-->>B: SQL dump

    B->>B: Compress + encrypt
    B->>S3: Upload backup

    alt Upload success
        S3-->>B: OK
        B->>DB: INSERT BackupLog (success)
        B->>M: Success metric
    else Upload failed
        S3-->>B: Error
        B->>DB: INSERT BackupLog (failed)
        B->>M: Failure alert
    end
```

## 6.2 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      BACKUP FLOW                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   CronJob (00:00 UTC)                                        │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────────┐                                            │
│   │ pg_dump     │ ──► SQL dump                               │
│   └─────────────┘                                            │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────────┐                                            │
│   │ gzip        │ ──► backup.sql.gz                          │
│   └─────────────┘                                            │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────────┐                                            │
│   │ Storage     │ ──► s3://backups/YYYY-MM-DD.sql.gz        │
│   └─────────────┘                                            │
│        │                                                     │
│        ▼                                                     │
│   ┌─────────────┐                                            │
│   │ Monitoring  │ ──► Success/Failure alert                  │
│   └─────────────┘                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

# 7. Restore Flow

## 7.1 Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant O as Operator
    participant R as Restore Script
    participant S3 as Storage
    participant DB as Database
    participant M as Monitoring

    O->>R: Run restore --date 2024-01-15
    R->>S3: Download backup
    S3-->>R: backup.sql.gz

    R->>R: Decrypt + decompress

    R->>DB: Drop existing data
    R->>DB: Restore from dump

    alt Restore success
        DB-->>R: OK
        R->>DB: Verify integrity
        R->>M: Success metric
        R-->>O: Restore complete
    else Restore failed
        DB-->>R: Error
        R->>M: Failure alert
        R-->>O: Restore failed
    end
```

---

# 8. Audit Log Flow

## 8.1 Write Flow

```mermaid
sequenceDiagram
    autonumber
    participant S as Service
    participant AL as Audit Logger
    participant DB as Database

    S->>AL: log(action, metadata)
    AL->>AL: Get previous hash
    AL->>AL: Compute new hash
    AL->>DB: INSERT AuditLog

    Note over AL,DB: hash = SHA256(prev_hash + action + timestamp)
```

## 8.2 Integrity Check Flow

```mermaid
sequenceDiagram
    autonumber
    participant C as CronJob
    participant V as Validator
    participant DB as Database

    C->>V: Run integrity check
    V->>DB: SELECT * FROM AuditLog ORDER BY created_at
    DB-->>V: All entries

    loop For each entry
        V->>V: Recompute hash
        V->>V: Compare with stored hash
    end

    alt All valid
        V-->>C: Integrity OK
    else Hash mismatch
        V-->>C: ALERT: Chain broken
    end
```

---

# 9. Rate Limiting Flow

## 9.1 Token Bucket Algorithm

```
┌─────────────────────────────────────────────────────────────┐
│                    RATE LIMITING FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Request                                                    │
│      │                                                       │
│      ▼                                                       │
│   ┌─────────────┐                                            │
│   │ Extract     │ ──► API Key / IP                          │
│   │ Identifier  │                                            │
│   └─────────────┘                                            │
│      │                                                       │
│      ▼                                                       │
│   ┌─────────────┐                                            │
│   │ Redis       │ ──► GET tokens                            │
│   │ Token Bucket│                                            │
│   └─────────────┘                                            │
│      │                                                       │
│      ├──────────────────────┐                                │
│      ▼                      ▼                                │
│   tokens > 0             tokens = 0                          │
│      │                      │                                │
│      ▼                      ▼                                │
│   ┌─────────┐          ┌─────────┐                           │
│   │ DECR    │          │ REJECT  │                           │
│   │ tokens  │          │ 429     │                           │
│   └─────────┘          └─────────┘                           │
│      │                                                       │
│      ▼                                                       │
│   Process Request                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

# 10. System Overview

## 10.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CARGOBIT SYSTEM OVERVIEW                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌────────────┐     ┌────────────┐     ┌────────────┐                  │
│   │  Partners  │     │  Users     │     │  Admin     │                  │
│   └────────────┘     └────────────┘     └────────────┘                  │
│        │                  │                  │                           │
│        └──────────────────┴──────────────────┘                           │
│                           │                                              │
│                           ▼                                              │
│                    ┌─────────────┐                                       │
│                    │ API Gateway │                                       │
│                    │ (Rate Limit)│                                       │
│                    └─────────────┘                                       │
│                           │                                              │
│        ┌──────────────────┼──────────────────┐                          │
│        ▼                  ▼                  ▼                          │
│   ┌─────────┐       ┌─────────┐       ┌─────────┐                       │
│   │ Payment │       │ Wallet  │       │ Payout  │                       │
│   │ Service │       │ Service │       │ Service │                       │
│   └─────────┘       └─────────┘       └─────────┘                       │
│        │                  │                  │                           │
│        └──────────────────┼──────────────────┘                           │
│                           │                                              │
│        ┌──────────────────┼──────────────────┐                          │
│        ▼                  ▼                  ▼                          │
│   ┌─────────┐       ┌─────────┐       ┌─────────┐                       │
│   │ Ledger  │       │AuditLog │       │StripeEvent│                      │
│   │ Table   │       │ Table   │       │  Table   │                       │
│   └─────────┘       └─────────┘       └─────────┘                       │
│                                                                          │
│   External:              Operations:                                     │
│   ┌─────────┐           ┌─────────┐                                      │
│   │ Stripe  │           │ Backups │                                      │
│   │   API   │           │ CronJobs│                                      │
│   └─────────┘           └─────────┘                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 11. Summary

Dieses Dokument visualisiert alle kritischen Datenflüsse im CargoBit System. Es dient als Referenz für Entwicklung, Debugging und Onboarding.

---

# 12. Contact

Architecture Board
CargoBit Internal
