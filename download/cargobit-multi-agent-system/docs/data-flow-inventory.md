# CargoBit Data Flow Inventory
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument führt alle Datenflüsse im CargoBit System. Es dient als Referenz für Sicherheitsanalysen, Compliance und Troubleshooting.

---

# 2. Data Flow Categories

| Category | Description |
|----------|-------------|
| Inbound | Data entering the system from external sources |
| Internal | Data flowing between internal components |
| Outbound | Data leaving the system to external destinations |
| Scheduled | Automated data movements (backups, etc.) |

---

# 3. Inbound Data Flows

## 3.1 Partner API Requests

```
Partner → API Gateway → Service → Database

Data: Payment requests, wallet operations, payouts
Protocol: HTTPS (TLS 1.2+)
Authentication: API Key (Bearer token)
Rate Limited: Yes
Logged: Yes (with correlation ID)
```

## 3.2 Stripe Webhooks

```
Stripe → Webhook Endpoint → Webhook Handler → Database

Data: Payment events, payout events
Protocol: HTTPS (TLS 1.2+)
Authentication: HMAC signature validation
Idempotent: Yes
Logged: Yes
```

## 3.3 Admin Access

```
Admin User → VPN → Admin Interface → Database

Data: Configuration, monitoring, support
Protocol: HTTPS + VPN
Authentication: MFA + RBAC
Logged: Yes (audit log)
```

---

# 4. Internal Data Flows

## 4.1 Service to Database

```
Payment Service → Database (PostgreSQL)

Data: Payment records, wallet updates
Protocol: TLS
Authentication: Database credentials
Logged: Query logs (optional)
```

## 4.2 Service to Cache

```
API Gateway → Redis

Data: Rate limit counters, session data
Protocol: TLS
Authentication: Redis password
Logged: No (ephemeral data)
```

## 4.3 Service to Audit Log

```
All Services → Audit Log Table

Data: Action records, timestamps, user IDs
Protocol: Database connection
Authentication: Database credentials
Integrity: Hash chain
```

---

# 5. Outbound Data Flows

## 5.1 Partner Webhooks (Future)

```
Webhook Service → Partner Endpoint

Data: Event notifications
Protocol: HTTPS
Authentication: Partner signature
Retry: Yes (exponential backoff)
Logged: Yes
```

## 5.2 Stripe API Calls

```
Payment Service → Stripe API

Data: Payment intents, payout requests
Protocol: HTTPS
Authentication: Stripe API key
Logged: Yes
```

## 5.3 Monitoring Data

```
All Services → Monitoring System

Data: Metrics, logs
Protocol: HTTPS
Authentication: Service account
Logged: No (it IS the logging)
```

---

# 6. Scheduled Data Flows

## 6.1 Database Backups

```
CronJob → Database → Backup File → Storage (S3)

Data: Full database dump
Protocol: TLS for transfer, encryption at rest
Frequency: Daily
Retention: 30 days
Logged: Yes
```

## 6.2 Restore Tests

```
CronJob → Backup Storage → Test Database

Data: Backup restoration
Protocol: Internal
Frequency: Weekly
Logged: Yes
```

## 6.3 Retention Cleanup

```
CronJob → Database → Delete old records

Data: Expired audit logs, old events
Protocol: Database connection
Frequency: Daily
Logged: Yes
```

---

# 7. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CARGOBIT DATA FLOWS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   EXTERNAL                    INTERNAL                    EXTERNAL       │
│                                                                          │
│   ┌─────────┐              ┌─────────┐              ┌─────────┐         │
│   │ Partners│───(API)────▶│  API    │              │ Stripe  │         │
│   └─────────┘              │ Gateway │──(Webhook)─▶│  API    │         │
│                           └────┬────┘              └─────────┘         │
│                                │                                        │
│                           ┌────┴────┐                                   │
│                           │ Services│                                   │
│                           └────┬────┘                                   │
│                                │                                        │
│          ┌─────────────────────┼─────────────────────┐                 │
│          │                     │                     │                  │
│          ▼                     ▼                     ▼                  │
│    ┌──────────┐          ┌──────────┐          ┌──────────┐            │
│    │Database  │          │  Redis   │          │Audit Log │            │
│    │(Postgres)│          │ (Cache)  │          │ (Table)  │            │
│    └────┬─────┘          └──────────┘          └──────────┘            │
│         │                                                               │
│         │ (Backup)                                                      │
│         ▼                                                               │
│    ┌──────────┐                                                         │
│    │ Storage  │                                                         │
│    │  (S3)    │                                                         │
│    └──────────┘                                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 8. Data Classification per Flow

| Flow | Data Classification | Encryption |
|------|---------------------|------------|
| Partner API | Restricted | TLS |
| Stripe Webhooks | Restricted | TLS |
| Database queries | Confidential | TLS |
| Audit logs | Confidential | TLS |
| Backups | Restricted | TLS + AES |
| Monitoring | Internal | TLS |

---

# 9. Summary

Dieses Dokument führt alle Datenflüsse im CargoBit System.

---

# 10. Contact

Architecture Team
CargoBit Internal
