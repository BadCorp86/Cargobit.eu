# Red Team Simulation Playbook

**CargoBit Transport Platform**  
**Version:** 1.0  
**Classification:** Confidential – Security Team  
**Document ID:** RT-PLAYBOOK-2025-001  
**Last Updated:** 2025-01-15

---

## 1. Executive Summary

This Red Team Simulation Playbook defines the objectives, roles, rules, scenarios, and success criteria for adversary simulation exercises at CargoBit. Unlike penetration testing which focuses on vulnerability discovery, Red Team simulations focus on testing the organization's detection and response capabilities. This playbook provides a strategic framework for conducting controlled security simulations that improve defensive capabilities without operational risk.

### Purpose

| Purpose | Description |
|---------|-------------|
| Test Detection | Validate security monitoring and alerting effectiveness |
| Validate Response | Assess incident response process maturity |
| Identify Gaps | Discover visibility and response blind spots |
| Measure Performance | Quantify detection and response capabilities |
| Improve Collaboration | Strengthen teamwork between security functions |
| Build Resilience | Enhance organizational security posture |

### Key Principles

1. **Safety First** - No risk to production systems or data
2. **Learning Focus** - Exercises are for improvement, not blame
3. **Controlled Scope** - Well-defined boundaries and stop conditions
4. **Full Documentation** - Complete recording for lessons learned
5. **Executive Support** - Leadership buy-in and communication

---

## 2. Objectives

### 2.1 Primary Objectives

| ID | Objective | Success Metric |
|----|-----------|----------------|
| OBJ-001 | Test maturity of detection and response capabilities | Time to detect, time to respond |
| OBJ-002 | Validate incident response processes | Correct classification and escalation |
| OBJ-003 | Identify monitoring gaps | Gap count by category |
| OBJ-004 | Measure response speed | Time from detection to containment |
| OBJ-005 | Improve team collaboration | Post-exercise survey scores |

### 2.2 Secondary Objectives

| ID | Objective | Priority |
|----|-----------|----------|
| OBJ-006 | Test threat intelligence integration | Medium |
| OBJ-007 | Validate runbook effectiveness | Medium |
| OBJ-008 | Assess communication effectiveness | High |
| OBJ-009 | Test escalation procedures | High |
| OBJ-010 | Evaluate forensic capabilities | Medium |

---

## 3. Roles and Responsibilities

### 3.1 Red Team

**Mission:** Simulate adversary behavior (strategic level, not technical exploitation)

| Role | Responsibilities | Skills Required |
|------|------------------|-----------------|
| Red Team Lead | Plan scenarios, coordinate with White Team, document activities | Security leadership, threat modeling |
| Scenario Designer | Design realistic scenarios aligned with threat landscape | Threat intelligence, TTP mapping |
| Observer | Document Blue Team responses without interference | Observation, documentation |
| Timekeeper | Track detection and response times | Coordination, time management |

**Red Team Constraints:**
- No actual exploitation or attack techniques
- Strategic simulation of adversary actions
- Focus on whether detection/response would occur
- Document assumptions and theoretical attack paths

### 3.2 Blue Team

**Mission:** Detect, respond, and recover from simulated incidents

| Role | Responsibilities | Skills Required |
|------|------------------|-----------------|
| Blue Team Lead | Coordinate detection and response efforts | SOC leadership, incident management |
| SOC Analyst | Monitor alerts, triage incidents, initial response | Alert analysis, triage |
| Incident Responder | Execute response procedures, containment | IR procedures, forensics |
| Communicator | Stakeholder communication, status updates | Communication, documentation |

**Blue Team Scope:**
- Operate normally without knowledge of simulation timing
- Follow standard procedures and runbooks
- Document all actions taken
- Do not disrupt business operations for simulation

### 3.3 White Team

**Mission:** Governance, oversight, and safety

| Role | Responsibilities | Skills Required |
|------|------------------|-----------------|
| White Team Lead | Overall governance, final decision authority | Security leadership, risk management |
| Safety Officer | Monitor for safety concerns, stop authority | Risk assessment, safety protocols |
| Observer | Document exercise progress, note deviations | Documentation, observation |
| Communicator | Executive updates, participant coordination | Communication, stakeholder management |

**White Team Authority:**
- Stop simulation immediately if safety concerns arise
- Approve all scenarios before execution
- Coordinate with business stakeholders
- Make go/no-go decisions
- Authorize any scope changes

---

## 4. Rules of Engagement

### 4.1 Absolute Prohibitions

| ID | Prohibition | Reason | Consequence |
|----|-------------|--------|-------------|
| ROE-001 | No production system access | Data integrity, service availability | Immediate stop, incident review |
| ROE-002 | No data manipulation | Data integrity, compliance | Immediate stop, incident review |
| ROE-003 | No data exfiltration | Data protection, privacy | Immediate stop, incident review |
| ROE-004 | No exploit execution | Safety, legal concerns | Immediate stop, incident review |
| ROE-005 | No social engineering | Employee safety, ethical concerns | Immediate stop, incident review |
| ROE-006 | No DoS simulation | Service availability | Immediate stop, incident review |
| ROE-007 | No unauthorized communication | Trust, operational integrity | Immediate stop, review |

### 4.2 Approved Activities

| Activity | Description | Limitation |
|----------|-------------|------------|
| Scenario Simulation | Simulate that an action has occurred | Logically, not technically |
| Alert Injection | Inject simulated alerts into monitoring | Via approved process only |
| Documentation Review | Review what would be logged | Without accessing actual logs |
| Hypothesis Testing | Test detection hypotheses | Through scenario discussion |
| Timeline Analysis | Analyze response timing | Retrospectively |

### 4.3 Simulation Methodology

**Approach:** Tabletop-enhanced simulation with controlled inject

```
Phase 1: Preparation
├── Scenario design (Red Team)
├── Approval (White Team)
├── Alert inject preparation
└── Participant notification window

Phase 2: Execution
├── Scenario trigger (Red Team)
├── Alert injection (via approved channel)
├── Blue Team detection and response
└── White Team observation

Phase 3: Conclusion
├── Exercise termination
├── Immediate debrief (hot wash)
├── Documentation collection
└── Timeline reconstruction

Phase 4: Analysis
├── Detection analysis
├── Response analysis
├── Gap identification
└── Report preparation
```

### 4.4 Stop Conditions

| Condition | Action | Authority |
|-----------|--------|-----------|
| Safety concern | Immediate stop | Any participant |
| Production incident | Pause simulation | White Team Lead |
| Unauthorized activity | Stop and investigate | White Team Lead |
| Participant distress | Stop and assess | White Team Safety Officer |
| Executive request | Pause for review | White Team Lead |

### 4.5 Documentation Requirements

| Document | Owner | Content | Timing |
|----------|-------|---------|--------|
| Scenario Plan | Red Team | Detailed scenario description | Before exercise |
| Activity Log | Red Team | All actions and timing | During exercise |
| Detection Log | Blue Team | All detections and actions | During exercise |
| Observer Notes | White Team | Observations and timing | During exercise |
| Timeline | White Team | Complete event timeline | Post-exercise |
| Analysis Report | Joint | Findings and recommendations | Post-exercise |

---

## 5. Simulation Scenarios

### 5.1 Scenario Overview

| ID | Scenario Name | Threat Type | Complexity | Duration |
|----|---------------|-------------|------------|----------|
| SC-001 | Unauthorized Config Service Access | Insider Threat / APT | Medium | 4 hours |
| SC-002 | Fraud Score Anomaly | Financial Crime | Medium | 3 hours |
| SC-003 | Suspicious API Gateway Activity | External Attack | High | 4 hours |
| SC-004 | Unusual Matching Events | Data Manipulation | Medium | 3 hours |
| SC-005 | Audit Log Anomalies | Cover-up / Persistence | High | 5 hours |

### 5.2 Scenario 1: Unauthorized Config Service Access

**Objective:** Test whether Blue Team detects unusual access patterns to Security-Config-Service.

| Attribute | Description |
|-----------|-------------|
| Threat Actor | Insider threat or compromised service account |
| Attack Goal | Access or modify security configurations |
| Simulation Method | Inject alerts for unusual config service access patterns |
| Detection Target | Alert on access outside normal patterns, from unusual sources, or at unusual times |

**Scenario Details:**

```
Scenario Timeline (Theoretical Attack):
T+00:00  Attacker gains access to service account credentials
T+02:00  Attacker accesses Security-Config-Service from unusual IP
T+02:15  Attacker queries multiple sensitive configuration keys
T+03:00  Attacker attempts to modify rate-limit configuration
T+03:30  Attacker queries fraud-threshold configuration
T+04:00  Attacker exfiltrates configuration data (simulated)

Simulation Injects:
- Inject 1: Alert for config service access from new IP (T+02:00)
- Inject 2: Alert for unusual config key access pattern (T+02:15)
- Inject 3: Alert for configuration modification attempt (T+03:00)
```

**Detection Goals:**
| Detection Point | Expected Alert | Expected Response |
|-----------------|----------------|-------------------|
| Unusual IP access | Config access anomaly | SOC triage within 15 min |
| Bulk config queries | Unusual access pattern | Classification as suspicious |
| Config modification | Unauthorized change | SEV2 classification, escalation |

**Success Criteria:**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first detection | < 30 min | From first inject to detection |
| Correct classification | High/Critical | SEV2 or SEV1 classification |
| Proper escalation | Yes | Escalation to Security Team |
| Documentation complete | Yes | Incident ticket with full timeline |

### 5.3 Scenario 2: Fraud Score Anomaly

**Objective:** Test detection of unusual fraud score patterns that could indicate manipulation.

| Attribute | Description |
|-----------|-------------|
| Threat Actor | Insider or compromised system |
| Attack Goal | Manipulate fraud scores to bypass controls |
| Simulation Method | Inject alerts for unusual fraud score distributions |
| Detection Target | Detect anomalous fraud score patterns, missing scores, or unusual correlations |

**Scenario Details:**

```
Scenario Timeline (Theoretical Attack):
T+00:00  Attacker begins manipulating fraud score algorithm
T+01:00  Fraud scores begin showing unusual distribution
T+02:00  Multiple high-risk orders receive low fraud scores
T+03:00  Risk team member notices unusual pattern
T+04:00  Alert triggers for fraud score deviation

Simulation Injects:
- Inject 1: Dashboard showing unusual fraud score distribution (T+01:00)
- Inject 2: Alert for fraud score deviation from baseline (T+02:00)
- Inject 3: Customer complaint about unauthorized charge (T+03:00)
```

**Detection Goals:**
| Detection Point | Expected Alert | Expected Response |
|-----------------|----------------|-------------------|
| Score distribution | Statistical anomaly alert | Risk team notification |
| Individual scores | Score outside expected range | Manual review trigger |
| Customer impact | Fraud report correlation | Cross-team escalation |

**Success Criteria:**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Pattern detected | Yes | Before customer impact |
| Cross-team communication | Yes | Risk team engaged |
| Root cause investigation | Yes | Algorithm review initiated |

### 5.4 Scenario 3: Suspicious API Gateway Activity

**Objective:** Test detection of API abuse patterns at the gateway level.

| Attribute | Description |
|-----------|-------------|
| Threat Actor | External attacker |
| Attack Goal | Enumerate users, bypass rate limits, or probe for vulnerabilities |
| Simulation Method | Inject alerts for unusual API patterns |
| Detection Target | Detect rate limit spikes, unusual endpoint access, or probing patterns |

**Scenario Details:**

```
Scenario Timeline (Theoretical Attack):
T+00:00  Attacker begins reconnaissance of API endpoints
T+00:30  Attacker triggers rate limit on authentication endpoint
T+01:00  Attacker attempts to access admin endpoints
T+01:30  Attacker switches to different IP, continues probing
T+02:00  Attacker triggers WAF rules with SQL injection attempts
T+02:30  Multiple IPs show correlated suspicious activity

Simulation Injects:
- Inject 1: Rate limit alert for authentication endpoint (T+00:30)
- Inject 2: Authorization failure alert for admin endpoints (T+01:00)
- Inject 3: WAF alert for SQL injection attempt (T+02:00)
- Inject 4: Correlated IP activity alert (T+02:30)
```

**Detection Goals:**
| Detection Point | Expected Alert | Expected Response |
|-----------------|----------------|-------------------|
| Rate limiting | Rate limit exceeded | IP blocking, investigation |
| Authorization failures | Multiple 401/403 errors | Account investigation |
| WAF triggers | Attack signature detected | Immediate blocking |
| Correlation | Multi-IP attack pattern | Threat intelligence escalation |

**Success Criteria:**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Attack detected | Yes | Before successful breach |
| IP blocked | Yes | Within 30 min of detection |
| Attack timeline built | Yes | Complete correlation |
| Threat intel shared | Yes | IOCs documented |

### 5.5 Scenario 4: Unusual Matching Events

**Objective:** Test detection of matching system manipulation or unusual patterns.

| Attribute | Description |
|-----------|-------------|
| Threat Actor | Colluding carrier or insider |
| Attack Goal | Manipulate matching outcomes for financial gain |
| Simulation Method | Inject alerts for unusual matching patterns |
| Detection Target | Detect unusual match distributions, timing anomalies, or suspicious correlations |

**Scenario Details:**

```
Scenario Timeline (Theoretical Attack):
T+00:00  Attacker begins manipulating carrier availability
T+01:00  Unusual matching patterns emerge (same carrier repeatedly)
T+02:00  Matching latency shows unusual spikes
T+03:00  Match quality scores deviate from baseline
T+04:00  Financial anomaly detected (carrier revenue spike)

Simulation Injects:
- Inject 1: Alert for unusual carrier match frequency (T+01:00)
- Inject 2: Matching service latency alert (T+02:00)
- Inject 3: Match quality anomaly alert (T+03:00)
- Inject 4: Financial audit alert (T+04:00)
```

**Detection Goals:**
| Detection Point | Expected Alert | Expected Response |
|-----------------|----------------|-------------------|
| Match frequency | Same carrier anomaly | Fraud team notification |
| Latency spikes | Service degradation | Service health check |
| Quality deviation | Score anomaly | Algorithm review |
| Financial correlation | Revenue pattern | Cross-team investigation |

**Success Criteria:**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Pattern correlation | Yes | Match + Financial linked |
| Fraud team engaged | Yes | Within 1 hour |
| Carrier flagged | Yes | For investigation |
| Business impact limited | Yes | Before significant loss |

### 5.6 Scenario 5: Audit Log Anomalies

**Objective:** Test detection of missing or unusual audit log patterns.

| Attribute | Description |
|-----------|-------------|
| Threat Actor | Sophisticated attacker covering tracks |
| Attack Goal | Hide malicious activity by manipulating audit logs |
| Simulation Method | Inject alerts for audit log anomalies |
| Detection Target | Detect missing logs, unusual gaps, or log integrity violations |

**Scenario Details:**

```
Scenario Timeline (Theoretical Attack):
T+00:00  Attacker gains elevated access
T+01:00  Attacker begins activity that would be logged
T+02:00  Audit logs show unusual gaps
T+03:00  Log integrity check fails for specific time period
T+04:00  SIEM shows reduced event volume from specific service

Simulation Injects:
- Inject 1: Alert for missing audit events (T+02:00)
- Inject 2: Log integrity check failure (T+03:00)
- Inject 3: SIEM event volume anomaly (T+04:00)
```

**Detection Goals:**
| Detection Point | Expected Alert | Expected Response |
|-----------------|----------------|-------------------|
| Missing events | Audit gap detected | Immediate investigation |
| Integrity failure | WORM verification failed | SEV1 classification |
| Volume anomaly | SIEM ingestion drop | Service health check |

**Success Criteria:**
| Metric | Target | Measurement |
|--------|--------|-------------|
| Gap detected | Yes | Within 30 min of inject |
| Severity correct | SEV1 | Appropriate for log manipulation |
| Forensic team engaged | Yes | Chain of custody initiated |
| Integrity restored | Yes | Via backup verification |

---

## 6. Detection Goals Summary

### 6.1 Alert Categories

| Category | Alerts Required | Current Coverage | Gap |
|----------|-----------------|------------------|-----|
| Config Access | 3 | Partial | Need anomaly detection |
| Fraud Patterns | 4 | Partial | Need statistical baseline |
| API Anomalies | 5 | Good | Minor tuning needed |
| Matching Patterns | 3 | Partial | Need correlation rules |
| Audit Integrity | 4 | Weak | Major gap |

### 6.2 Detection Metrics

| Metric | Current Baseline | Target | Improvement |
|--------|------------------|--------|-------------|
| Mean Time to Detect (MTTD) | 45 min | 15 min | 67% reduction |
| Detection Rate | 70% | 95% | 25% increase |
| False Positive Rate | 15% | <5% | 10% reduction |
| Alert Fatigue Score | 6/10 | <3/10 | 3+ reduction |

---

## 7. Success Criteria

### 7.1 Detection Success

| Criterion | Target | Measurement Method |
|-----------|--------|-------------------|
| Incident detected within target time | Yes | Timeline analysis |
| Correct severity classification | ≥90% accuracy | Classification review |
| No missed critical alerts | Zero | Post-exercise log review |
| Correlation across data sources | ≥80% correlation | Alert correlation analysis |

### 7.2 Response Success

| Criterion | Target | Measurement Method |
|-----------|--------|-------------------|
| Correct escalation path followed | Yes | Escalation log review |
| Response time within SLA | ≥90% | Time tracking |
| Communication to stakeholders | Complete | Communication log |
| Documentation quality | ≥4/5 rating | Post-exercise review |

### 7.3 Improvement Success

| Criterion | Target | Measurement Method |
|-----------|--------|-------------------|
| Lessons learned documented | Yes | Report review |
| Action items assigned | Yes | Action item tracker |
| Remediation timeline defined | Yes | Action item tracker |
| Follow-up exercise scheduled | Yes | Exercise calendar |

---

## 8. Deliverables

### 8.1 Red Team Report

| Section | Content | Audience |
|---------|---------|----------|
| Executive Summary | High-level findings, risk assessment | Executive Leadership |
| Scenario Details | Each scenario executed, objectives, outcomes | Security Team |
| Detection Analysis | What was detected, timing, gaps | Blue Team, SOC |
| Recommendations | Priority improvements | Security Team |
| Appendix | Full timeline, raw data | Security Team |

### 8.2 Blue Team Response Timeline

| Element | Description |
|---------|-------------|
| Detection Timeline | When each detection occurred |
| Response Actions | Actions taken by Blue Team |
| Communication Log | All communications during exercise |
| Escalation Record | All escalations and their outcomes |
| Challenges Encountered | Difficulties faced during response |

### 8.3 Gap Analysis

| Gap Category | Findings | Priority | Remediation Owner |
|--------------|----------|----------|-------------------|
| Detection Gaps | Missing alerts, visibility issues | Critical | SOC Team |
| Response Gaps | Process issues, resource constraints | High | IR Team |
| Tool Gaps | Missing capabilities, configuration issues | Medium | Security Engineering |
| Process Gaps | Documentation gaps, training needs | Medium | Security Team |

### 8.4 Improvement Plan

| ID | Improvement | Priority | Effort | Owner | Due Date |
|----|-------------|----------|--------|-------|----------|
| IMP-001 | [Detection improvement] | Critical | Medium | SOC Lead | [Date] |
| IMP-002 | [Process improvement] | High | Low | IR Lead | [Date] |
| IMP-003 | [Tool improvement] | Medium | High | SecEng Lead | [Date] |
| ... | ... | ... | ... | ... | ... |

### 8.5 Executive Summary

**Template:**

```
Red Team Simulation Exercise - Executive Summary

Exercise: [Name]
Date: [Date]
Duration: [Hours]

Key Findings:
- [Finding 1]
- [Finding 2]
- [Finding 3]

Detection Performance:
- Detection Rate: [X]%
- Mean Time to Detect: [X] minutes
- Critical Findings Detected: [X] of [Y]

Response Performance:
- Mean Time to Respond: [X] minutes
- Correct Escalation: [X]%
- Documentation Complete: [Yes/No]

Recommendations:
1. [Priority 1 recommendation]
2. [Priority 2 recommendation]
3. [Priority 3 recommendation]

Overall Assessment: [Improved / Met Expectations / Needs Improvement]

Next Steps:
- Follow-up exercise: [Date]
- Key improvements to implement: [List]
```

---

## 9. Exercise Schedule

### 9.1 Annual Calendar

| Quarter | Exercise Type | Focus Area | Duration |
|---------|---------------|------------|----------|
| Q1 | Tabletop | Incident Response | 4 hours |
| Q2 | Simulation | Detection Capabilities | 8 hours |
| Q3 | Tabletop | Business Continuity | 4 hours |
| Q4 | Simulation | Full Purple Team | 16 hours |

### 9.2 Exercise Preparation Checklist

| Task | Owner | Timing |
|------|-------|--------|
| Define objectives | White Team | 4 weeks before |
| Design scenarios | Red Team | 3 weeks before |
| Review and approve scenarios | White Team | 2 weeks before |
| Notify participants (general) | White Team | 1 week before |
| Prepare simulation environment | Red Team | 3 days before |
| Final briefing | White Team | 1 day before |
| Execute exercise | All Teams | Scheduled day |
| Hot wash | All Teams | Immediately after |
| Detailed analysis | Joint Team | Within 1 week |
| Report delivery | White Team | Within 2 weeks |
| Action item tracking | Security Team | Ongoing |

---

## 10. Communication Templates

### 10.1 Exercise Notification

```
Subject: Upcoming Security Exercise - [Date]

This is a notification that a security exercise will be conducted on [Date] between [Start Time] and [End Time].

Exercise Type: Red Team Simulation
Scope: [General description]
Impact: None to production systems

Please note:
- This is a planned exercise, not a real incident
- Follow standard procedures during the exercise
- Report any concerns to the Security Team

Questions: Contact security@cargobit.com

Regards,
Security Team
```

### 10.2 Exercise Start Notification

```
Subject: SECURITY EXERCISE STARTED - [Exercise Name]

This is to notify that the security exercise "[Name]" has started.

Exercise ID: [ID]
Start Time: [Time]
Expected Duration: [Hours]

White Team Contact: [Name] - [Phone]

This is an exercise. Normal operations continue.
```

### 10.3 Exercise Completion Notification

```
Subject: SECURITY EXERCISE COMPLETED - [Exercise Name]

The security exercise "[Name]" has been completed.

Exercise ID: [ID]
End Time: [Time]
Duration: [Hours]

A debrief will be scheduled within the next 48 hours.
Exercise report will be available within 2 weeks.

Thank you for your participation.

Regards,
White Team
```

---

## 11. Document Control

| Attribute | Value |
|-----------|-------|
| Owner | Security Team |
| Reviewers | CISO, Blue Team Lead, Red Team Lead |
| Version | 1.0 |
| Last Updated | 2025-01-15 |
| Next Review | 2025-04-15 |
| Classification | Confidential |

---

**Related Documents:**
- Penetration Testing Scope Document
- Incident Response Plan
- On-Call Runbook
- Security Architecture Diagram
- STRIDE Threat Model

---

## Appendix A: Scenario Quick Reference

| ID | Scenario | Key Detection | Key Response |
|----|----------|---------------|--------------|
| SC-001 | Config Access | Unusual access pattern | Config service investigation |
| SC-002 | Fraud Anomaly | Score distribution | Risk team engagement |
| SC-003 | API Activity | Rate limit + WAF alerts | IP blocking, correlation |
| SC-004 | Matching Events | Pattern + financial | Fraud investigation |
| SC-005 | Audit Logs | Gap + integrity failure | Forensic investigation |

## Appendix B: Metrics Dashboard Template

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXERCISE METRICS DASHBOARD                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Detection Metrics              │  Response Metrics             │
│  ─────────────────              │  ─────────────────             │
│  Detection Rate:      [X]%      │  MTTR:              [X] min   │
│  MTTD:                [X] min   │  Escalation Rate:   [X]%      │
│  Alerts Generated:    [X]       │  Correct Severity:  [X]%      │
│  True Positives:      [X]       │  Documentation:     [X]%      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Scenario Performance                                          │
│  ────────────────────                                          │
│  SC-001: [Detected/Not Detected] - [Time] min                  │
│  SC-002: [Detected/Not Detected] - [Time] min                  │
│  SC-003: [Detected/Not Detected] - [Time] min                  │
│  SC-004: [Detected/Not Detected] - [Time] min                  │
│  SC-005: [Detected/Not Detected] - [Time] min                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| Red Team | Team simulating adversary behavior |
| Blue Team | Defensive security team |
| White Team | Governance and oversight team |
| Purple Team | Collaborative Red/Blue exercise |
| Inject | Simulated event introduced into exercise |
| TTP | Tactics, Techniques, Procedures |
| MTTD | Mean Time to Detect |
| MTTR | Mean Time to Respond |
| SIEM | Security Information and Event Management |
| SOC | Security Operations Center |
| IR | Incident Response |
