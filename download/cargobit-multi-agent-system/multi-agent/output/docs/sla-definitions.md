# SLA Definitions

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SLA-001 |
| Version | 1.0.0 |
| Last Updated | 2024-05-03 |
| Classification | Public |
| Owner | Operations Team |
| Review Cycle | Quarterly |

---

## 1. Overview

This document defines the Service Level Agreements (SLAs) for the CargoBit Payment System. These SLAs represent our commitments to customers regarding system availability, performance, and support responsiveness.

### 1.1 Service Description

CargoBit provides a payment processing platform that enables businesses to:
- Process payments via Stripe integration
- Manage customer wallets and balances
- Track transactions and payouts
- Access real-time audit trails

### 1.2 SLA Scope

| Service Component | Included in SLA |
|-------------------|-----------------|
| Payment API | ✓ |
| Wallet Management | ✓ |
| Transaction Processing | ✓ |
| Webhook Delivery | ✓ |
| Dashboard/Portal | ✓ |
| Audit Log Access | ✓ |
| Third-party integrations | Dependent on provider SLA |

---

## 2. Availability SLA

### 2.1 Service Availability Target

| Service Tier | Monthly Uptime Target | Annual Uptime Target |
|--------------|----------------------|---------------------|
| Enterprise | 99.99% | 99.99% |
| Business | 99.9% | 99.9% |
| Starter | 99.5% | 99.5% |

### 2.2 Downtime Calculation

**Monthly Downtime Allowance**:

| Service Tier | Monthly Allowance |
|--------------|------------------|
| Enterprise | 4 minutes 22 seconds |
| Business | 43 minutes 50 seconds |
| Starter | 3 hours 39 minutes |

**Calculation Formula**:
```
Availability % = ((Total Minutes - Downtime Minutes) / Total Minutes) × 100
```

### 2.3 Scheduled Maintenance

| Type | Notice Period | Typical Window | Excluded from SLA |
|------|---------------|----------------|-------------------|
| Emergency | None | As needed | No (unless >4 hours) |
| Critical security | 1 hour | As needed | No |
| Planned | 72 hours | Sunday 02:00-06:00 UTC | Yes, up to 4 hours/month |
| Major upgrade | 2 weeks | Scheduled window | Yes, up to 8 hours/year |

### 2.4 Exclusions

The following are excluded from downtime calculation:

1. **Force Majeure Events**: Natural disasters, war, terrorism
2. **Third-party failures**: Stripe outages, cloud provider issues
3. **Customer-caused issues**: Misconfiguration, exceeded quotas
4. **Scheduled maintenance**: As per notice requirements
5. **Customer network issues**: Connectivity between customer and CargoBit
6. **Attack mitigation**: DDoS protection measures

---

## 3. Performance SLA

### 3.1 API Response Time

| Endpoint Category | P50 Target | P95 Target | P99 Target |
|-------------------|------------|------------|------------|
| Payment creation | 200ms | 500ms | 1000ms |
| Payment status | 100ms | 200ms | 500ms |
| Wallet operations | 100ms | 200ms | 500ms |
| Transaction queries | 150ms | 300ms | 600ms |
| Batch operations | 500ms | 1000ms | 2000ms |

### 3.2 Throughput Limits

| Service Tier | Requests/minute | Concurrent connections |
|--------------|-----------------|----------------------|
| Enterprise | 10,000 | 500 |
| Business | 1,000 | 100 |
| Starter | 100 | 20 |

### 3.3 Webhook Delivery

| Metric | Target |
|--------|--------|
| Delivery time | <5 seconds (P95) |
| Retry attempts | Up to 5 |
| Retry backoff | Exponential (1m, 5m, 15m, 1h, 6h) |
| Success rate | >99.5% |

### 3.4 Data Processing

| Metric | Target |
|--------|--------|
| Payment processing | <3 seconds end-to-end |
| Balance updates | <1 second |
| Audit log latency | <100ms |

---

## 4. Support SLA

### 4.1 Support Tiers

| Tier | Channels | Availability |
|------|----------|--------------|
| Enterprise | Phone, Email, Chat, Dedicated CSM | 24/7 |
| Business | Email, Chat | Business hours + emergency |
| Starter | Email, Chat | Business hours |

### 4.2 Response Time Targets

| Priority | Enterprise | Business | Starter |
|----------|------------|----------|---------|
| **P1 - Critical** | 15 minutes | 1 hour | 4 hours |
| **P2 - High** | 1 hour | 4 hours | 1 business day |
| **P3 - Medium** | 4 hours | 1 business day | 2 business days |
| **P4 - Low** | 1 business day | 2 business days | 5 business days |

### 4.3 Priority Definitions

| Priority | Definition | Examples |
|----------|------------|----------|
| **P1 - Critical** | Complete service outage or data loss risk | Payment system down, security breach |
| **P2 - High** | Major feature unavailable, significant degradation | Payment delays, webhook failures |
| **P3 - Medium** | Feature impaired but workaround exists | Slow performance, intermittent errors |
| **P4 - Low** | Minor issue, cosmetic, enhancement request | UI issues, documentation requests |

### 4.4 Resolution Targets

| Priority | Target Resolution |
|----------|-------------------|
| P1 - Critical | 4 hours |
| P2 - High | 8 business hours |
| P3 - Medium | 3 business days |
| P4 - Low | Next release or as agreed |

---

## 5. Data Retention SLA

### 5.1 Transaction Data

| Data Type | Retention Period | Access |
|-----------|-----------------|--------|
| Transaction records | 7 years | Via API and dashboard |
| Payment details | 7 years | Via API and dashboard |
| Audit logs | 180 days | Via API |
| User profiles | Until deletion request + 30 days | Self-service |

### 5.2 Backup Retention

| Backup Type | Retention | RTO | RPO |
|-------------|-----------|-----|-----|
| Daily backups | 30 days | 4 hours | 24 hours |
| Weekly backups | 12 weeks | 8 hours | 1 week |
| Monthly backups | 12 months | 24 hours | 1 month |

### 5.3 Data Recovery

| Scenario | Recovery Time Objective |
|----------|------------------------|
| Single record recovery | 1 hour |
| Table-level recovery | 4 hours |
| Full database recovery | 8 hours |
| Cross-region recovery | 24 hours |

---

## 6. Security SLA

### 6.1 Incident Response

| Incident Severity | Detection | Response | Resolution |
|-------------------|-----------|----------|------------|
| Critical breach | 15 minutes | 15 minutes | Ongoing until contained |
| Active attack | 30 minutes | 30 minutes | Ongoing until mitigated |
| Vulnerability disclosed | 24 hours | Patch within SLA | Per severity |

### 6.2 Patch Management

| Vulnerability Severity | Patching SLA |
|-----------------------|--------------|
| Critical (CVSS 9-10) | 24 hours |
| High (CVSS 7-8.9) | 7 days |
| Medium (CVSS 4-6.9) | 30 days |
| Low (CVSS 0-3.9) | 90 days |

### 6.3 Security Monitoring

| Metric | Target |
|--------|--------|
| Log ingestion latency | <1 minute |
| Alert generation | <5 minutes |
| False positive rate | <5% |

---

## 7. SLA Credits

### 7.1 Credit Calculation

If CargoBit fails to meet the Monthly Uptime SLA, customers are eligible for service credits:

| Monthly Uptime | Credit |
|----------------|--------|
| 99.0% - 99.9% (Enterprise: 99.9%-99.99%) | 10% of monthly fee |
| 95.0% - 99.0% | 25% of monthly fee |
| <95.0% | 50% of monthly fee |

### 7.2 Credit Request Process

1. Customer notifies support within 30 days of incident
2. CargoBit verifies SLA breach
3. Credit applied to next billing cycle
4. Maximum credit: 50% of monthly fee
5. Credits are the sole remedy for SLA breaches

### 7.3 Credit Limitations

- Credits cannot be exchanged for cash
- Unused credits expire after 12 months
- Credits do not carry over between accounts
- Maximum 50% credit per month

---

## 8. Measurement and Reporting

### 8.1 Measurement Tools

| Metric | Tool | Frequency |
|--------|------|-----------|
| Availability | Uptime monitoring | Every 30 seconds |
| Response time | APM | Every request |
| Support tickets | Ticketing system | Real-time |
| Incidents | Incident management | Real-time |

### 8.2 Reporting

| Report | Frequency | Distribution |
|--------|-----------|--------------|
| Real-time status | Continuous | Status page |
| Daily metrics | Daily | Internal dashboard |
| Monthly SLA report | Monthly | Enterprise customers |
| Quarterly review | Quarterly | All customers (on request) |

### 8.3 Status Page

CargoBit maintains a public status page at `status.cargobit.com` with:

- Real-time system status
- Incident history
- Scheduled maintenance calendar
- RSS/Atom feed for updates

---

## 9. SLA Governance

### 9.1 Review Process

- Monthly: Internal SLA metrics review
- Quarterly: SLA targets review with stakeholders
- Annually: Full SLA framework review

### 9.2 Exceptions

SLA exceptions require:
- Written request from customer
- Business justification
- Approval from Operations Director
- Documented compensating controls

### 9.3 SLA Changes

Changes to SLA terms require:
- 30-day advance notice for customers
- Customer acknowledgment for material changes
- No retroactive changes without consent

---

## 10. Definitions

| Term | Definition |
|------|------------|
| **Uptime** | Time the service is operational and accessible |
| **Downtime** | Time the service is unavailable, measured from first customer report or detection |
| **Monthly Uptime Percentage** | (Total minutes in month - Downtime minutes) / Total minutes × 100 |
| **Business Hours** | Monday-Friday, 09:00-18:00 in customer's timezone |
| **Critical** | Service is unusable or data is at risk |
| **High** | Major feature unavailable with no workaround |
| **Medium** | Feature impaired but workaround exists |
| **Low** | Minor issue or enhancement request |
| **P50/P95/P99** | Percentile of measurements (median, 95th, 99th) |

---

## 11. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024-05-03 | Operations Team | Initial release |

---

*This document is classified as Public and may be shared with customers.*
