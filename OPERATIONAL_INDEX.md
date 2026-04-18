# CargoBit Operational Documentation Index

**Version:** 2024-01-15-01  
**Last Updated:** 2024-01-15  

---

## Quick Navigation

| Category | Files | Description |
|----------|-------|-------------|
| **Incident Playbooks** | 5 | Schritt-für-Schritt Incident Response |
| **SLO/SLI Definitions** | 3 | Service Level Objectives + Alerting |
| **Deployment Playbooks** | 2 | End-to-End Deployment Guide |

---

## E) Incident-Playbooks

| # | Playbook | Severity | Trigger |
|---|----------|----------|---------|
| E.1 | [Pricing-Service Down](./playbooks/incident-pricing-service-down.md) | P1 | 5xx-Rate > 5%, Validation fails |
| E.2 | [Matching-Service Stuck](./playbooks/incident-matching-service-stuck.md) | P1 | No matches, Kafka lag rising |
| E.3 | [Fraud-Config Invalid](./playbooks/incident-fraud-config-invalid.md) | P2 | INVALID_CONFIG error |
| E.4 | [Kafka Lag / Backpressure](./playbooks/incident-kafka-lag.md) | P2 | Lag > 10,000 events |
| E.5 | [Gateway Rate-Limit Spikes](./playbooks/incident-gateway-ratelimit-spikes.md) | P2 | 429 rate > 5% |

### Playbook Structure

Jedes Playbook enthält:
- **Quick Reference** - Key metrics & thresholds
- **Trigger** - Was löst den Incident aus
- **Impact** - Business impact assessment
- **Diagnosis Steps** - kubectl commands, log queries
- **Immediate Actions** - Erste Maßnahmen
- **Root Cause Analysis** - Mögliche Ursachen
- **Follow-Up Actions** - Kurz/Mittel/Langfristig

---

## F) SLO/SLI Definitions

| File | Description |
|------|-------------|
| [slo-definitions.md](./slos/slo-definitions.md) | Alle SLIs/SLOs für Pricing, Matching, Execution, Gateway |
| [slo-recording-rules.yaml](./slos/slo-recording-rules.yaml) | Prometheus Recording Rules |
| [slo-alerting-rules.yaml](./slos/slo-alerting-rules.yaml) | Error Budget Burn Alerts |

### SLO Summary

| Service | Availability | Latency P95 | Error Budget |
|---------|--------------|-------------|--------------|
| Pricing-Service | 99.9% | < 150ms | 43.2 min/month |
| Matching-Service | 99.9% | < 500ms | 43.2 min/month |
| Execution-Service | 99.9% | < 200ms | 43.2 min/month |
| API-Gateway | 99.99% | < 50ms | 4.3 min/month |
| Security-Config | 99.99% | < 100ms | 4.3 min/month |

### Error Budget Policy

| Burn Rate | Action |
|-----------|--------|
| < 1x | Normal operations |
| 1x - 2x | Review in daily standup |
| 2x - 5x | Freeze non-critical releases |
| > 5x | Incident response, all hands |

---

## G) Deployment Playbooks

| File | Description |
|------|-------------|
| [deployment-playbook.md](./docs/deployment-playbook.md) | Vollständiges 6-Phasen Deployment |
| [deployment-commands.md](./docs/deployment-commands.md) | Quick Reference Commands |

### Deployment Phases

```
┌─────────────────────────────────────────────────────────┐
│ Phase 1: Infrastructure                                 │
│ ├── K8s Cluster                                         │
│ ├── Namespaces (core, domain, data, observability)      │
│ ├── Secrets (JWT, mTLS, DB credentials)                 │
│ └── Storage (PostgreSQL, Redis, Kafka, MinIO)           │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Phase 2: Core Layer                                     │
│ ├── Observability (Prometheus, Grafana, Loki, Tempo)    │
│ ├── Security-Config-Service                             │
│ ├── Auth-Service                                        │
│ └── API-Gateway                                         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Phase 3: Domain Layer (Dependency Order)                │
│ ├── 1. carrier-service                                  │
│ ├── 2. shipper-service                                  │
│ ├── 3. order-service                                    │
│ ├── 4. pricing-service                                  │
│ ├── 5. bidding-service                                  │
│ ├── 6. matching-service                                 │
│ ├── 7. execution-service                                │
│ └── 8. risk-service                                     │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Phase 4: Smoke Tests                                    │
│ ├── Pricing Validation                                  │
│ ├── Bid Submission                                      │
│ ├── Matching Flow                                       │
│ ├── Execution Status Update                             │
│ ├── Fraud-Score Calculation                             │
│ └── Config Reload                                       │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Phase 5: Load Tests                                     │
│ ├── 1000 Orders/min                                     │
│ ├── 5000 Bids/min                                       │
│ ├── 2000 Status Updates/min                             │
│ ├── Fraud-Score Stress Test                             │
│ └── Gateway Rate-Limit Test                             │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Phase 6: Go-Live Checklist                              │
│ ├── ☐ SLO Dashboards aktiv                              │
│ ├── ☐ Alerts aktiv                                      │
│ ├── ☐ On-Call Rotation definiert                        │
│ ├── ☐ Incident Playbooks verteilt                       │
│ ├── ☐ Config-Version pinned                             │
│ ├── ☐ Canary Deployment aktiviert                       │
│ └── ☐ Rollback-Plan vorhanden                           │
└─────────────────────────────────────────────────────────┘
```

---

## File Locations

```
/home/z/my-project/
├── playbooks/
│   ├── incident-pricing-service-down.md
│   ├── incident-matching-service-stuck.md
│   ├── incident-fraud-config-invalid.md
│   ├── incident-kafka-lag.md
│   └── incident-gateway-ratelimit-spikes.md
├── slos/
│   ├── slo-definitions.md
│   ├── slo-recording-rules.yaml
│   └── slo-alerting-rules.yaml
└── docs/
    ├── deployment-playbook.md
    └── deployment-commands.md
```

---

## Integration Checklist

### Confluence/Jira Import

- [ ] Playbooks nach Confluence importieren (Markdown → Confluence)
- [ ] SLO Dashboard in Jira/Confluence verlinken
- [ ] Deployment Playbook in Release-Workflow integrieren

### Prometheus/Grafana

- [ ] `slo-recording-rules.yaml` in Prometheus laden
- [ ] `slo-alerting-rules.yaml` in Prometheus laden
- [ ] SLO Dashboard in Grafana importieren

### PagerDuty/OpsGenie

- [ ] Alert Routes konfigurieren
- [ ] Runbook-Links zu Playbooks hinzufügen

### Slack

- [ ] Alert Notifications zu #platform-alerts
- [ ] Playbook-Links in Channel Description

---

## Contacts

| Role | Contact |
|------|---------|
| Platform On-Call | pagerduty.com/platform |
| Backend Lead | backend-lead@cargobit.io |
| Security Team | security@cargobit.io |
