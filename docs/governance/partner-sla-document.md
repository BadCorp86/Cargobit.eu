# CargoBit Partner SLA Document
Version 1.0
Internal & Partner Use

---

# 1. Purpose

Dieses Dokument definiert die Service Level Agreements (SLAs) für CargoBit-Partner. Es legt die Erwartungen und Verpflichtungen beider Parteien fest.

---

# 2. Service Commitments

## 2.1 Availability

| Service | Commitment | Measurement |
|---------|------------|-------------|
| API Availability | 99.9% | Monthly uptime |
| Webhook Delivery | 99% | Events delivered |
| Support Response | Per severity | Time to first response |

## 2.2 Performance

| Metric | Target | Maximum |
|--------|--------|---------|
| API Response Time (p50) | < 100 ms | 200 ms |
| API Response Time (p99) | < 200 ms | 500 ms |
| Webhook Processing | < 2 s | 5 s |

---

# 3. Support Levels

## 3.1 Severity Definitions

| Severity | Definition | Examples |
|----------|------------|----------|
| SEV-1 | Critical - Service down | API unavailable, payment failures |
| SEV-2 | Major - Degraded service | Partial outage, delays |
| SEV-3 | Minor - Limited impact | Single request failures, questions |

## 3.2 Response Times

| Severity | First Response | Update Frequency |
|----------|----------------|------------------|
| SEV-1 | 30 minutes | Every 30 minutes |
| SEV-2 | 2 hours | Every 2 hours |
| SEV-3 | 24 hours | As needed |

## 3.3 Resolution Targets

| Severity | Target Resolution |
|----------|-------------------|
| SEV-1 | 4 hours |
| SEV-2 | 24 hours |
| SEV-3 | 72 hours |

---

# 4. Scheduled Maintenance

## 4.1 Notice Period

| Type | Notice Required |
|------|-----------------|
| Planned maintenance | 7 days |
| Emergency maintenance | Best effort |

## 4.2 Maintenance Windows

- Primary: Tuesday-Thursday, 10:00-14:00 CET
- Duration: Typically < 2 hours
- Impact: Minimal to none (zero-downtime deployments)

---

# 5. Partner Responsibilities

## 5.1 Integration Requirements

- Implement proper error handling
- Use idempotency keys
- Validate webhook signatures
- Implement retry logic with backoff
- Monitor own integration health

## 5.2 Security Requirements

- Protect API keys
- Rotate keys every 90 days
- Report security incidents immediately
- Follow security best practices

## 5.3 Communication

- Provide technical contact
- Respond to incident communications
- Report issues through proper channels

---

# 6. Service Credits

## 6.1 Availability Credits

| Monthly Uptime | Credit |
|----------------|--------|
| < 99.9% | 5% of monthly fees |
| < 99.0% | 10% of monthly fees |
| < 95.0% | 25% of monthly fees |

## 6.2 Claim Process

1. Submit claim within 30 days
2. Provide evidence of impact
3. Credit applied to next invoice

---

# 7. Exclusions

SLA does not apply to:

- Force majeure events
- Partner-caused issues
- Scheduled maintenance
- Third-party failures (e.g., Stripe)
- Issues caused by partner's misuse

---

# 8. Support Channels

| Channel | Use Case | Response |
|---------|----------|----------|
| Email | Non-urgent | Within SLA |
| Phone | SEV-1 only | Immediate |
| Partner Portal | All issues | Within SLA |

---

# 9. Contact Information

| Team | Email | Phone |
|------|-------|-------|
| Technical Support | partner-support@cargobit.example.com | - |
| Emergency (SEV-1) | emergency@cargobit.example.com | +49-XXX |
| Account Management | accounts@cargobit.example.com | - |

---

# 10. Summary

Dieses Dokument definiert die SLAs für CargoBit-Partner.

---

# 11. Contact

Partner Engineering
CargoBit Internal
