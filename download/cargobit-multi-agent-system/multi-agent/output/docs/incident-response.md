# Incident Response Playbook

## Document Information

| Field | Value |
|-------|-------|
| Document ID | INC-001 |
| Version | 1.0.0 |
| Last Updated | 2024-05-03 |
| Classification | Internal |
| Owner | SRE Team |
| Review Cycle | Quarterly |

---

## 1. Overview

This playbook provides step-by-step procedures for responding to incidents affecting the CargoBit Payment System. It ensures consistent, rapid, and effective incident handling to minimize service impact and data risk.

### 1.1 Incident Definition

An incident is any event that:
- Affects service availability or performance
- Compromises data security or integrity
- Requires immediate attention from engineering teams
- Impacts customer operations

### 1.2 Incident Classification

| Severity | Definition | Examples |
|----------|------------|----------|
| **SEV1 - Critical** | Complete outage, data breach, or critical security incident | Payment system down, database unavailable, confirmed breach |
| **SEV2 - Major** | Significant degradation affecting many users | API latency >5s, webhook failures, partial outage |
| **SEV3 - Minor** | Limited impact, workaround available | Single feature impaired, elevated error rates |
| **SEV4 - Low** | Minimal impact, cosmetic issue | UI glitch, documentation error |

### 1.3 Response Timeline

| Severity | Detection | Response | Resolution | Communication |
|----------|-----------|----------|------------|---------------|
| SEV1 | 5 minutes | 15 minutes | Ongoing | Immediate |
| SEV2 | 15 minutes | 1 hour | 4 hours | 30 minutes |
| SEV3 | 1 hour | 4 hours | 24 hours | 4 hours |
| SEV4 | 4 hours | 1 day | As scheduled | As needed |

---

## 2. Incident Response Process

### 2.1 Process Overview

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  DETECTION  │───▶│    TRIAGE    │───▶│ CONTAINMENT │───▶│ ERADICATION │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
       ┌────────────────────────────────────────────────────────┘
       ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   RECOVERY  │───▶│ POST-MORTEM │───▶│  IMPROVEMENT │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 2.2 Phase 1: Detection

#### Detection Sources

| Source | Method | Alerting |
|--------|--------|----------|
| Monitoring | Automated | PagerDuty/OpsGenie |
| Customer reports | Support tickets | Slack notification |
| Internal observation | Dashboard review | Manual |
| Security alerts | SIEM/WAF | PagerDuty/OpsGenie |

#### Detection Checklist

- [ ] Verify the issue is real (not false positive)
- [ ] Determine scope (single user, subset, all users)
- [ ] Assess severity using classification matrix
- [ ] Check recent deployments or changes
- [ ] Review dependent service status (Stripe, cloud provider)

### 2.3 Phase 2: Triage

#### Triage Steps

1. **Assign Incident Commander (IC)**
   - First responder becomes IC by default
   - IC can hand off to more appropriate person

2. **Gather Initial Information**
   - What is the issue?
   - When did it start?
   - Who is affected?
   - What is the impact?

3. **Determine Severity**
   - Apply severity matrix
   - Upgrade/downgrade as needed

4. **Assemble Response Team**
   - SEV1: IC + SRE + Backend + Security
   - SEV2: IC + SRE + relevant service owner
   - SEV3: Service owner + on-call

5. **Open Communication Channels**
   - Create incident Slack channel: `#incident-YYYY-MM-DD-brief`
   - Start incident bridge (SEV1/SEV2)
   - Update status page (SEV1/SEV2)

#### Triage Template

```markdown
## Incident Summary
- **Incident ID**: INC-YYYY-MM-DD-###
- **Severity**: [SEV1/SEV2/SEV3/SEV4]
- **Status**: [Investigating/Identified/Monitoring/Resolved]
- **Incident Commander**: @username
- **Start Time**: YYYY-MM-DD HH:MM UTC
- **Detection Method**: [Monitoring/Customer/Internal]

## Impact
- **User Impact**: [Description]
- **Business Impact**: [Description]
- **Affected Systems**: [List]

## Timeline
- [HH:MM] Issue detected
- [HH:MM] IC assigned
- [HH:MM] Team assembled
```

### 2.4 Phase 3: Containment

#### Containment Strategies

| Scenario | Containment Action |
|----------|-------------------|
| Active attack | Block attacker IP, revoke credentials |
| Data exposure | Revoke access, isolate system |
| Runaway process | Kill process, scale horizontally |
| Database issue | Enable read replica, failover |
| DDoS attack | Enable protection, rate limit |

#### Containment Checklist

- [ ] Stop the bleeding (immediate mitigation)
- [ ] Preserve evidence (logs, screenshots)
- [ ] Document actions taken
- [ ] Assess effectiveness
- [ ] Prepare for eradication

#### Database Failover Procedure

```bash
# 1. Verify replica is in sync
psql -h replica-host -c "SELECT pg_is_in_recovery();"

# 2. Promote replica (if automatic failover hasn't occurred)
psql -h replica-host -c "SELECT pg_promote();"

# 3. Update connection strings
# Update DATABASE_URL in environment

# 4. Verify application connectivity
curl https://api.cargobit.com/health
```

### 2.5 Phase 4: Eradication

#### Eradication Steps

1. **Identify Root Cause**
   - Analyze logs, metrics, traces
   - Review recent changes
   - Consult with service owners

2. **Remove Threat**
   - Patch vulnerability
   - Remove malicious code
   - Rotate compromised credentials

3. **Verify Removal**
   - Scan for indicators of compromise
   - Test the fix
   - Verify no persistence mechanisms

#### Common Root Causes

| Category | Examples | Investigation Steps |
|----------|----------|---------------------|
| Code defect | Bug in recent deploy | Review recent commits, rollback |
| Infrastructure | Resource exhaustion, config drift | Check capacity, compare configs |
| Third-party | Stripe outage, cloud provider | Check status pages, logs |
| Security | Breach, attack | Security forensics, log analysis |
| Data | Corruption, inconsistency | Data integrity checks |

#### Rollback Procedure

```bash
# 1. Identify previous stable version
git log --oneline -n 10

# 2. Rollback deployment
kubectl rollout undo deployment/cargobit-api -n production

# 3. Verify rollback
kubectl rollout status deployment/cargobit-api -n production

# 4. Health check
curl https://api.cargobit.com/health
```

### 2.6 Phase 5: Recovery

#### Recovery Steps

1. **Plan Recovery**
   - Define success criteria
   - Identify rollback points
   - Communicate timeline

2. **Execute Recovery**
   - Follow documented procedures
   - Monitor progress
   - Document each step

3. **Verify Recovery**
   - Run smoke tests
   - Check metrics
   - Verify user experience

4. **Gradual Restoration**
   - Start with critical services
   - Gradually restore full capacity
   - Monitor for recurrence

#### Recovery Checklist

- [ ] All services operational
- [ ] Metrics within normal bounds
- [ ] Customer-facing features working
- [ ] Error rates normal
- [ ] Performance acceptable
- [ ] Monitoring confirmed

### 2.7 Phase 6: Post-Mortem

#### Post-Mortem Requirements

| Severity | Post-Mortem Required | Due Date |
|----------|---------------------|----------|
| SEV1 | Yes, blameless | 48 hours |
| SEV2 | Yes, blameless | 5 business days |
| SEV3 | Optional | 10 business days |
| SEV4 | No | N/A |

#### Post-Mortem Template

```markdown
# Post-Mortem: [Incident Title]

## Summary
Brief description of the incident.

## Impact
- Duration: [start time] to [end time]
- Users affected: [number or percentage]
- Revenue impact: [if applicable]

## Timeline
All times in UTC
- YYYY-MM-DD HH:MM - Issue detected
- YYYY-MM-DD HH:MM - IC assigned
- YYYY-MM-DD HH:MM - Root cause identified
- YYYY-MM-DD HH:MM - Fix deployed
- YYYY-MM-DD HH:MM - Incident resolved

## Root Cause
Technical explanation of what happened.

## Contributing Factors
- Factor 1
- Factor 2

## What Went Well
- Positive aspect 1
- Positive aspect 2

## What Could Be Improved
- Area for improvement 1
- Area for improvement 2

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action 1] | @username | YYYY-MM-DD | [ ] |
| [Action 2] | @username | YYYY-MM-DD | [ ] |

## Lessons Learned
Key takeaways for the team.

## Appendix
- Incident channel: #incident-YYYY-MM-DD-xxx
- PagerDuty incident: [link]
- Related incidents: [links]
```

---

## 3. Specific Incident Scenarios

### 3.1 Payment Processing Failure

#### Symptoms
- Payment API returning 5xx errors
- Increased payment failure rate
- Webhook processing backlog

#### Response Procedure

1. **Immediate Actions**
   ```bash
   # Check API health
   curl https://api.cargobit.com/health
   
   # Check Stripe status
   # https://status.stripe.com
   
   # Check recent error logs
   kubectl logs -l app=cargobit-api --tail=100 | grep -i error
   ```

2. **Diagnosis**
   - Verify Stripe API connectivity
   - Check database connectivity
   - Review rate limit status
   - Check audit log processing

3. **Containment**
   - Enable maintenance mode if needed
   - Failover to backup if database issue
   - Scale horizontally if capacity issue

4. **Recovery**
   - Process backlog of webhooks
   - Verify wallet balances
   - Reconcile transactions

#### Escalation
- Contact Stripe support if provider issue
- Engage backend team for code issues
- Engage SRE for infrastructure issues

### 3.2 Database Outage

#### Symptoms
- Connection timeout errors
- Query latency spike
- Replication lag

#### Response Procedure

1. **Immediate Actions**
   ```bash
   # Check database connectivity
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Check replication status
   psql $DATABASE_URL -c "SELECT * FROM pg_stat_replication;"
   
   # Check long-running queries
   psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
   ```

2. **Containment**
   - Kill long-running queries if blocking
   - Enable read replica for read traffic
   - Consider failover if primary unhealthy

3. **Recovery**
   - Restore from backup if corruption
   - Replay WAL logs if needed
   - Verify data integrity

### 3.3 Security Breach

#### Symptoms
- Unauthorized access detected
- Suspicious API activity
- Data exfiltration indicators
- Alert from security monitoring

#### Response Procedure

1. **Immediate Actions**
   ```bash
   # Block suspicious IPs
   iptables -A INPUT -s [suspicious-ip] -j DROP
   
   # Revoke compromised credentials
   # (Via IAM console or CLI)
   
   # Enable enhanced logging
   # (Via configuration)
   ```

2. **Containment**
   - Isolate affected systems
   - Preserve evidence
   - Do not alert attacker (quietly contain)
   - Document all actions

3. **Investigation**
   - Analyze access logs
   - Review audit trail
   - Identify attack vector
   - Determine data exposure

4. **Notification**
   - Notify legal/compliance
   - Prepare breach notification if required
   - Document for regulators

#### Security Incident Checklist

- [ ] Isolate affected systems
- [ ] Preserve logs and evidence
- [ ] Identify attack vector
- [ ] Assess data exposure
- [ ] Patch vulnerability
- [ ] Rotate all credentials
- [ ] Notify stakeholders
- [ ] Document timeline

### 3.4 DDoS Attack

#### Symptoms
- Traffic spike
- Elevated error rates
- Service degradation

#### Response Procedure

1. **Immediate Actions**
   - Enable DDoS protection (CloudFlare, AWS Shield)
   - Enable rate limiting at edge
   - Scale infrastructure

2. **Analysis**
   - Identify attack pattern
   - Block attack sources
   - Implement geo-blocking if applicable

3. **Recovery**
   - Gradually relax blocks
   - Monitor for recurrence
   - Document attack characteristics

### 3.5 Webhook Processing Failure

#### Symptoms
- Webhook queue backlog
- Missed payment updates
- Stale transaction status

#### Response Procedure

1. **Diagnosis**
   ```bash
   # Check webhook processing
   kubectl logs -l app=cargobit-workers --tail=100
   
   # Check Stripe event queue
   # Via Stripe dashboard
   
   # Check database for unprocessed events
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"StripeEvent\" WHERE \"createdAt\" > NOW() - INTERVAL '1 hour';"
   ```

2. **Containment**
   - Increase worker capacity
   - Enable webhook replay from Stripe
   - Process backlog manually if needed

3. **Recovery**
   - Verify all events processed
   - Reconcile wallet balances
   - Run audit verification

---

## 4. Communication Templates

### 4.1 Status Page Update (Initial)

```
[Investigating] Payment Processing Degradation

We are currently investigating issues with payment processing. 
Some users may experience delays in payment confirmation.

Started: YYYY-MM-DD HH:MM UTC
Impact: Payment API response times elevated

We will provide updates every 30 minutes.
```

### 4.2 Status Page Update (Identified)

```
[Identified] Payment Processing Degradation

The issue has been identified as a database connectivity problem. 
Our team is working on a fix.

Next update in 30 minutes.
```

### 4.3 Status Page Update (Resolved)

```
[Resolved] Payment Processing Degradation

The issue has been resolved. All systems are operating normally.

Duration: X hours Y minutes
Root Cause: [Brief description]

A post-mortem will be published within 48 hours.
```

### 4.4 Customer Communication

```
Subject: Service Incident - Payment Processing

Dear Customer,

We experienced a service disruption affecting payment processing 
on [date] between [start time] and [end time] UTC.

Impact:
- [Description of impact]

Resolution:
The issue has been resolved and all systems are operating normally.

We apologize for any inconvenience this may have caused. Our team 
is conducting a thorough post-mortem to prevent recurrence.

If you have any questions, please contact support@cargobit.com.

Sincerely,
The CargoBit Team
```

---

## 5. Tools and Resources

### 5.1 Incident Tools

| Tool | Purpose | Access |
|------|---------|--------|
| PagerDuty | Alerting, on-call | pagerduty.cargobit.com |
| Slack | Communication | #incident-* channels |
| Status Page | Customer communication | status.cargobit.com |
| Grafana | Metrics, dashboards | grafana.cargobit.com |
| Logs | Log aggregation | logs.cargobit.com |

### 5.2 Key Dashboards

| Dashboard | URL |
|-----------|-----|
| System Overview | grafana.cargobit.com/d/overview |
| API Performance | grafana.cargobit.com/d/api |
| Database Health | grafana.cargobit.com/d/database |
| Payment Flow | grafana.cargobit.com/d/payments |

### 5.3 Runbook Links

- Database Failover: `docs/runbooks/database-failover.md`
- Cache Recovery: `docs/runbooks/redis-recovery.md`
- Payment Reconciliation: `docs/runbooks/payment-recon.md`

---

## 6. Escalation Matrix

### 6.1 Technical Escalation

| Level | Role | Response Time | When to Escalate |
|-------|------|---------------|------------------|
| L1 | On-call engineer | 15 minutes | First response |
| L2 | Service owner | 30 minutes | If issue not identified |
| L3 | Engineering manager | 1 hour | If resolution not in progress |
| L4 | VP Engineering | 2 hours | If SEV1 continues |

### 6.2 Management Escalation

| Severity | Notify | Timing |
|----------|--------|--------|
| SEV1 | CTO, CEO | Immediately |
| SEV2 | VP Engineering | Within 1 hour |
| SEV3 | Engineering Manager | Within 4 hours |

---

## 7. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024-05-03 | SRE Team | Initial release |

---

*This document is classified as Internal and should not be shared externally without approval.*
