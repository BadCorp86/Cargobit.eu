# CargoBit Monitoring & Alerting Specification
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument definiert alle Metriken, Alerts und Dashboards für das CargoBit System. Es stellt sicher, dass kritische Systemzustände erkannt und kommuniziert werden.

---

# 2. Metrics

## 2.1 Service Level Indicators (SLIs)

| SLI | Description | Target | Measurement |
|-----|-------------|--------|-------------|
| Availability | % successful requests | 99.9% | HTTP 2xx / Total |
| Latency | Request response time | < 200ms | p99 latency |
| Error Rate | % failed requests | < 0.1% | HTTP 5xx / Total |
| Throughput | Requests per second | Variable | Requests / second |

## 2.2 Business Metrics

| Metric | Description | Measurement |
|--------|-------------|-------------|
| Payments created | Number of payments | Count / hour |
| Payments succeeded | Successful payments | Count / hour |
| Payouts created | Number of payouts | Count / hour |
| Wallet operations | Wallet changes | Count / hour |

## 2.3 Infrastructure Metrics

| Metric | Description | Threshold |
|--------|-------------|-----------|
| CPU usage | CPU utilization | < 80% |
| Memory usage | Memory utilization | < 85% |
| Disk usage | Disk utilization | < 80% |
| DB connections | Active connections | < 80% of pool |
| DB latency | Query response time | < 100ms |

## 2.4 Operational Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Webhook success rate | Successful webhooks | > 99% |
| Webhook latency | Processing time | < 2s |
| Backup success rate | Successful backups | 100% |
| Restore test success | Successful restores | 100% |
| Audit log integrity | Chain valid | 100% |

---

# 3. Alerts

## 3.1 Critical Alerts (SEV-1)

| Alert | Condition | Response Time |
|-------|-----------|---------------|
| Service down | Availability < 90% | 15 min |
| Database down | DB unreachable | 15 min |
| Audit chain broken | Integrity check failed | 15 min |
| Payment processing halted | 0 payments for 10 min | 15 min |

## 3.2 High Alerts (SEV-2)

| Alert | Condition | Response Time |
|-------|-----------|---------------|
| High error rate | Error rate > 1% | 30 min |
| Webhook failures | Failure rate > 5% | 30 min |
| Backup failed | Daily backup failed | 30 min |
| High latency | p99 > 500ms | 30 min |

## 3.3 Medium Alerts (SEV-3)

| Alert | Condition | Response Time |
|-------|-----------|---------------|
| Rate limit abuse | Same IP > 1000/min | 2 hours |
| Disk space low | Disk > 80% | 2 hours |
| Memory pressure | Memory > 85% | 2 hours |
| Certificate expiry | < 14 days | 24 hours |

---

# 4. Alert Routing

## 4.1 Routing Rules

| Severity | Primary | Secondary | Escalation |
|----------|---------|-----------|------------|
| SEV-1 | On-call + Lead | Team channel | +30 min: Manager |
| SEV-2 | On-call | Team channel | +1 hour: Lead |
| SEV-3 | Team channel | On-call | +4 hours: Lead |

## 4.2 Notification Channels

| Channel | Use Case |
|---------|----------|
| PagerDuty | SEV-1, SEV-2 |
| Slack #alerts | All alerts |
| Email | Daily summaries |
| Dashboard | Real-time status |

---

# 5. Dashboards

## 5.1 API Performance Dashboard

```
┌─────────────────────────────────────────────────────┐
│              API PERFORMANCE DASHBOARD               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Request Rate    Error Rate    Latency (p99)        │
│  ━━━━━━━━━━      ━━━━━━━━      ━━━━━━━━━━           │
│  1,234/min       0.05%         145ms                │
│                                                      │
│  [Request Rate Graph - 24h]                         │
│  [Error Rate Graph - 24h]                           │
│  [Latency Graph - 24h]                              │
│                                                      │
│  Top Endpoints:                                     │
│  POST /payments    45%                              │
│  GET /payments     30%                              │
│  GET /wallets      15%                              │
│  Other             10%                              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## 5.2 Webhook Processing Dashboard

```
┌─────────────────────────────────────────────────────┐
│            WEBHOOK PROCESSING DASHBOARD              │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Events/min      Success Rate    Avg Latency        │
│  ━━━━━━━━━━      ━━━━━━━━━━      ━━━━━━━━━━         │
│  89/min          99.5%           1.2s               │
│                                                      │
│  Events by Type:                                    │
│  payment_intent.succeeded    65%                    │
│  payment_intent.failed       20%                    │
│  payout.paid                 10%                    │
│  Other                       5%                     │
│                                                      │
│  Recent Failures:                                   │
│  [List of last 10 failed events]                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## 5.3 Database Health Dashboard

```
┌─────────────────────────────────────────────────────┐
│              DATABASE HEALTH DASHBOARD               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Connections     Query Time    Replication Lag      │
│  ━━━━━━━━━━      ━━━━━━━━━━    ━━━━━━━━━━           │
│  45/100          23ms avg      0ms                  │
│                                                      │
│  Table Sizes:                                       │
│  Payment         1.2M rows                          │
│  LedgerEntry     2.4M rows                          │
│  AuditLog        500K rows                          │
│  StripeEvent     100K rows                          │
│                                                      │
│  Slow Queries:                                      │
│  [Top 5 slow queries with duration]                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## 5.4 Backup Status Dashboard

```
┌─────────────────────────────────────────────────────┐
│              BACKUP STATUS DASHBOARD                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Last Backup     Status          Size               │
│  ━━━━━━━━━━      ━━━━━━━━━━      ━━━━━━━━━━         │
│  2024-01-15      SUCCESS         234 MB            │
│                                                      │
│  Last Restore Test:                                 │
│  Date: 2024-01-14                                   │
│  Status: SUCCESS                                    │
│  Duration: 12 min                                   │
│                                                      │
│  Backup History (7 days):                           │
│  [Graph with success/failure]                       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

# 6. SLO Monitoring

## 6.1 Error Budget

| SLO | Target | Current | Error Budget Remaining |
|-----|--------|---------|------------------------|
| Availability | 99.9% | 99.95% | 50% |
| Latency (p99) | < 200ms | 145ms | 73% |
| Error rate | < 0.1% | 0.05% | 50% |

## 6.2 Error Budget Policy

| Budget Remaining | Action |
|------------------|--------|
| > 50% | Normal operations |
| 25-50% | Reduce risky changes |
| 10-25% | Freeze non-critical changes |
| < 10% | Freeze all changes |

---

# 7. Summary

Diese Spezifikation stellt sicher, dass alle kritischen Metriken überwacht und relevante Alerts rechtzeitig kommuniziert werden.

---

# 8. Contact

SRE Team
CargoBit Internal
