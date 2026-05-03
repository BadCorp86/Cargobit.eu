# On-Call Playbook

## Document Information

| Field | Value |
|-------|-------|
| Document ID | ONCALL-001 |
| Version | 1.0.0 |
| Last Updated | 2024-05-03 |
| Classification | Internal |
| Owner | SRE Team |
| Review Cycle | Quarterly |

---

## 1. Overview

This playbook defines on-call responsibilities, procedures, and best practices for the CargoBit Payment System. It ensures that on-call engineers can effectively respond to incidents while maintaining work-life balance.

### 1.1 On-Call Philosophy

- **Customer First**: Always prioritize customer impact
- **Blameless Culture**: Focus on solving problems, not assigning blame
- **Sustainable Rotation**: Balance on-call duties with regular work
- **Continuous Improvement**: Learn from every incident

### 1.2 On-Call Principles

| Principle | Description |
|-----------|-------------|
| **Clear Ownership** | One primary on-call, one secondary backup |
| **Escalation Path** | Defined escalation for complex issues |
| **Compensation** | Fair compensation for on-call time |
| **Handoff** | Structured shift transitions |
| **Support** | Team support during incidents |

---

## 2. Rotation Schedule

### 2.1 Primary Rotation

| Team | Rotation Type | Shift Duration | Timezone |
|------|---------------|----------------|----------|
| SRE | Weekly | Mon 10:00 - Mon 10:00 UTC | Follow-the-sun |
| Backend | Weekly | Mon 10:00 - Mon 10:00 UTC | Follow-the-sun |
| Security | Weekly | Mon 10:00 - Mon 10:00 UTC | Follow-the-sun |

### 2.2 Rotation Example

```
Week 1: Alice (Primary), Bob (Secondary)
Week 2: Bob (Primary), Charlie (Secondary)
Week 3: Charlie (Primary), Alice (Secondary)
Week 4: Alice (Primary), Bob (Secondary)
```

### 2.3 Schedule Management

- Rotation schedule maintained in PagerDuty
- Schedule published 4 weeks in advance
- Swap requests submitted via PagerDuty
- Emergency coverage arranged by team lead

### 2.4 Holiday Coverage

| Situation | Procedure |
|-----------|-----------|
| Planned vacation | Arrange swap 2 weeks in advance |
| Sick day | Team lead arranges coverage |
| Holiday | Pre-assigned holiday rotation |

---

## 3. Responsibilities

### 3.1 Primary On-Call

**Expected Response**:
- Acknowledge alerts within 5 minutes
- Begin investigation within 15 minutes
- Communicate status within 30 minutes (SEV1/SEV2)

**Responsibilities**:
- Triage incoming alerts
- Investigate and resolve incidents
- Escalate when necessary
- Document actions taken
- Update status page (if applicable)
- Participate in post-mortems

### 3.2 Secondary On-Call

**Expected Response**:
- Available if primary does not respond
- Join incidents when requested
- Provide expertise for specific areas

**Responsibilities**:
- Backup for primary
- Provide domain expertise
- Assume IC role if primary escalates

### 3.3 Team Lead On-Call

**Expected Response**:
- Available for SEV1 escalation
- Management communication

**Responsibilities**:
- Coordinate complex incidents
- Handle management escalation
- Make difficult decisions (rollback, failover)
- Authorize extended downtime

---

## 4. Alert Categories

### 4.1 Alert Severity

| Severity | Response Time | Auto-Page | Examples |
|----------|---------------|-----------|----------|
| Critical | 5 minutes | Yes | Service down, data breach |
| High | 15 minutes | Yes | Degradation, error spike |
| Medium | 1 hour | Yes (business hours) | Warning threshold |
| Low | 4 hours | No | Information, non-urgent |

### 4.2 Alert Routing

```
┌─────────────────┐
│    Monitoring   │
│   (Prometheus)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Alertmanager  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│   Primary O-C   │────▶│  Secondary O-C  │
│   (PagerDuty)   │     │   (PagerDuty)   │
└─────────────────┘     └─────────────────┘
         │                       │
         │  No response          │  No response
         │  (5 min)              │  (10 min)
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   Team Lead     │────▶│    VP Eng       │
└─────────────────┘     └─────────────────┘
```

### 4.3 Alert Categories

| Category | Source | Response |
|----------|--------|----------|
| Infrastructure | Prometheus, CloudWatch | Scale, failover, restart |
| Application | APM, Logs | Debug, rollback, patch |
| Security | WAF, SIEM | Contain, investigate |
| Third-party | Status pages | Mitigate, communicate |

---

## 5. Response Procedures

### 5.1 Upon Receiving Alert

1. **Acknowledge** the alert in PagerDuty
2. **Assess** severity and impact
3. **Join** incident channel if SEV1/SEV2
4. **Communicate** initial status

### 5.2 Investigation Steps

```bash
# 1. Check system health
curl https://api.cargobit.com/health

# 2. Check recent deployments
kubectl rollout history deployment/cargobit-api -n production

# 3. Check error logs
kubectl logs -l app=cargobit-api --tail=100 -n production | grep -i error

# 4. Check metrics
# Open Grafana dashboard

# 5. Check dependencies
curl https://status.stripe.com/api/v2/status.json
```

### 5.3 Decision Tree

```
Is the service down?
├── Yes → Enable maintenance mode, investigate
│         ├── Database issue? → Failover
│         ├── Code issue? → Rollback
│         └── Capacity issue? → Scale
│
└── No → Is it degraded?
    ├── Yes → Identify bottleneck
    │         ├── Database slow? → Check queries
    │         ├── External API? → Check status pages
    │         └── Resource exhausted? → Scale
    │
    └── No → Is it a warning?
              └── Yes → Monitor, create ticket
```

### 5.4 Communication Protocol

| Time | Action | Channel |
|------|--------|---------|
| T+0 | Acknowledge alert | PagerDuty |
| T+5 | Initial assessment | Incident channel |
| T+15 | Status update | Incident channel, Status page |
| T+30 | Update | Incident channel, Status page |
| Hourly | Updates until resolved | All channels |

---

## 6. Common Scenarios

### 6.1 High Error Rate

**Alert**: API error rate > 5%

**Investigation**:
```bash
# Check recent deployments
kubectl rollout history deployment/cargobit-api -n production

# Check error logs
kubectl logs -l app=cargobit-api --tail=500 -n production | grep ERROR

# Check specific endpoints
curl -w "%{http_code}" https://api.cargobit.com/api/health
```

**Actions**:
1. If recent deploy → Rollback
2. If dependency issue → Check status pages
3. If capacity issue → Scale horizontally
4. If unknown → Engage service owner

### 6.2 Database Connection Errors

**Alert**: Database connection failures

**Investigation**:
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check for blocking queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE wait_event IS NOT NULL;"
```

**Actions**:
1. Kill blocking queries if necessary
2. Scale connection pool if needed
3. Failover if primary unhealthy

### 6.3 Memory/CPU Pressure

**Alert**: Resource utilization > 85%

**Investigation**:
```bash
# Check pod resource usage
kubectl top pods -n production

# Check node resources
kubectl top nodes

# Check for memory leaks
kubectl exec -it <pod> -- /bin/sh -c "free -m"
```

**Actions**:
1. Scale horizontally
2. Restart affected pods
3. Investigate memory leak if recurring

### 6.4 Rate Limit Threshold

**Alert**: Rate limit approaching threshold

**Investigation**:
```bash
# Check Redis rate limit keys
redis-cli KEYS "ratelimit:*" | head -20

# Check specific key
redis-cli GET "ratelimit:api:192.168.1.1"

# Check rate limit metrics
# Grafana rate limit dashboard
```

**Actions**:
1. Identify top consumers
2. Check for abuse pattern
3. Adjust limits if legitimate traffic
4. Block if malicious

### 6.5 Stripe Webhook Failure

**Alert**: Webhook processing lag

**Investigation**:
```bash
# Check webhook worker logs
kubectl logs -l app=cargobit-workers --tail=100 -n production

# Check Stripe event queue
# Via Stripe Dashboard → Developers → Webhooks

# Check unprocessed events in DB
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"StripeEvent\" WHERE \"createdAt\" > NOW() - INTERVAL '1 hour';"
```

**Actions**:
1. Scale webhook workers
2. Replay webhooks from Stripe
3. Process backlog manually if needed

---

## 7. Escalation Procedures

### 7.1 When to Escalate

Escalate when:
- Issue not identified within 30 minutes
- Resolution not in progress within 1 hour
- Customer impact increasing
- Specialized expertise needed
- Management decision required

### 7.2 Escalation Contacts

| Role | Contact | When |
|------|---------|------|
| Secondary On-Call | PagerDuty | Primary unavailable |
| Team Lead | Slack + Phone | SEV1, complex incident |
| Service Owner | Slack | Domain expertise needed |
| Security Team | PagerDuty | Security incident |
| VP Engineering | Phone | Extended SEV1 |
| Stripe Support | support@stripe.com | Payment processing issues |

### 7.3 External Escalation

| Provider | Contact Method | When |
|----------|---------------|------|
| Stripe | Dashboard + support@stripe.com | Payment issues |
| AWS | Support case | Infrastructure issues |
| Redis Cloud | Support portal | Redis issues |

---

## 8. Handoff Procedures

### 8.1 Shift Handoff

**Outgoing On-Call Responsibilities**:
1. Resolve or hand off all active incidents
2. Document any ongoing issues
3. Update runbook if new procedure discovered
4. Send handoff message in Slack

### 8.2 Handoff Template

```markdown
## On-Call Handoff - YYYY-MM-DD

### Summary
- **Shift Duration**: [start] to [end]
- **Total Alerts**: X
- **Incidents**: X (X SEV1, X SEV2, X SEV3)

### Active Issues
| Issue | Status | Notes |
|-------|--------|-------|
| [Issue 1] | [Status] | [Context] |

### Highlights
- [Notable incident or fix]

### Follow-ups
| Item | Owner | Due |
|------|-------|-----|
| [Action item] | @username | [date] |

### Tips for Next Shift
- [Any advice or context]
```

### 8.3 Handoff Meeting

- Brief sync at shift change (15 minutes)
- Discuss ongoing issues
- Answer questions
- Transfer incident commander role if active

---

## 9. Wellbeing

### 9.1 Sustainable On-Call

| Practice | Implementation |
|----------|----------------|
| **Rotation** | No more than 1 week in 3 |
| **Compensation** | Paid on-call + incident bonus |
| **Time off** | Day off after night incident |
| **Support** | Buddy system for complex incidents |

### 9.2 During On-Call

- Keep laptop charged and accessible
- Have mobile hotspot backup
- Know your escalation contacts
- Take breaks between incidents
- Don't hesitate to ask for help

### 9.3 After Incident

- Take recovery time if needed
- Participate in blameless post-mortem
- Document lessons learned
- Update runbooks
- Celebrate successful resolution

### 9.4 Alert Fatigue Prevention

| Issue | Solution |
|-------|----------|
| Too many alerts | Tune thresholds, eliminate noise |
| False positives | Refine alerting rules |
| Non-actionable alerts | Add runbook or remove alert |
| Duplicate alerts | Consolidate alerting |

---

## 10. Tools and Resources

### 10.1 Essential Tools

| Tool | Purpose | URL |
|------|---------|-----|
| PagerDuty | Alerting, scheduling | pagerduty.cargobit.com |
| Slack | Communication | slack.cargobit.com |
| Grafana | Dashboards | grafana.cargobit.com |
| Logs | Log search | logs.cargobit.com |
| Status Page | Customer updates | status.cargobit.com |

### 10.2 Quick Commands

```bash
# Health check
curl https://api.cargobit.com/health

# Recent deployments
kubectl rollout history deployment/cargobit-api -n production

# Rollback
kubectl rollout undo deployment/cargobit-api -n production

# Scale
kubectl scale deployment cargobit-api --replicas=5 -n production

# Check logs
kubectl logs -l app=cargobit-api --tail=100 -n production

# Database check
psql $DATABASE_URL -c "SELECT 1;"

# Redis check
redis-cli PING
```

### 10.3 Important Links

| Resource | Link |
|----------|------|
| Incident Response Playbook | `docs/incident-response.md` |
| Restore Playbook | `docs/restore-playbook.md` |
| Security Policy | `docs/security-policy.md` |
| Architecture Overview | `docs/architecture-overview.md` |

---

## 11. Metrics and Improvement

### 11.1 On-Call Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Acknowledgment time | <5 minutes | PagerDuty |
| Resolution time | Per SLA | Incident records |
| False positive rate | <10% | Alert analysis |
| On-call satisfaction | >7/10 | Quarterly survey |

### 11.2 Improvement Process

1. **Weekly**: Review alerts, tune thresholds
2. **Monthly**: Team retro on on-call experience
3. **Quarterly**: Rotation review, compensation review
4. **Per Incident**: Update runbooks, automate tasks

---

## 12. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024-05-03 | SRE Team | Initial release |

---

*This document is classified as Internal and should not be shared externally without approval.*
