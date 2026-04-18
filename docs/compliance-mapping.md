# Compliance Mapping

**CargoBit Transport Platform**  
**Version:** 1.0  
**Classification:** Internal – Compliance Team  
**Last Updated:** 2025-01-15

---

## 1. Executive Summary

This document provides a comprehensive compliance mapping between the CargoBit Transport Platform's security controls and two major compliance frameworks: **ISO 27001:2022** and **SOC 2 Type II**. This mapping demonstrates how our technical and organizational controls satisfy regulatory requirements and provides evidence for audits and certifications.

### Scope

| Framework | Version | Scope |
|-----------|---------|-------|
| ISO 27001 | 2022 | Full ISMS scope |
| SOC 2 | Type II | Security, Availability, Processing Integrity, Confidentiality, Privacy |

### Certification Status

| Framework | Status | Last Audit | Next Audit |
|-----------|--------|------------|------------|
| ISO 27001 | Certified | 2024-06-15 | 2025-06-15 |
| SOC 2 Type II | Certified | 2024-09-01 | 2025-09-01 |

---

## 2. ISO 27001:2022 Mapping

### A.5 Organizational Controls

| Control ID | Control Name | Implementation | Evidence | Responsible |
|------------|--------------|----------------|----------|-------------|
| A.5.1 | Policies for information security | Security Policy stored in Security-Config-Service, version-controlled in Git | Policy document, Git history | CISO |
| A.5.2 | Information security roles and responsibilities | RACI matrix defined, roles in HR system, RBAC in platform | RACI document, HR records | CISO |
| A.5.3 | Segregation of duties | 4-eyes approval for critical operations, separate roles for dev/prod | Approval workflow logs, role assignments | Security Team |
| A.5.4 | Management responsibilities | Management commitment documented, regular security reviews | Board minutes, review records | CTO |
| A.5.5 | Contact with authorities | Incident response procedures include authority notification | Incident Response Plan, contact list | Legal Team |
| A.5.6 | Contact with special interest groups | Membership in ISACs, security communities | Membership records | Security Team |
| A.5.7 | Threat intelligence | Threat feeds integrated, STRIDE threat model maintained | Threat model, feed subscriptions | Security Team |
| A.5.8 | Information security in project management | Security checkpoint in SDLC, threat modeling for new features | SDLC process, threat models | Product Team |
| A.5.9 | Inventory of information and other associated assets | CMDB maintained, all systems documented in architecture docs | CMDB export, architecture docs | IT Team |
| A.5.10 | Acceptable use of information and other associated assets | Acceptable Use Policy, acknowledged by all employees | Policy acknowledgments | HR Team |
| A.5.11 | Return of assets | Offboarding checklist includes asset return | Offboarding records | HR Team |
| A.5.12 | Classification of information | Data classification policy, labels in Data Flow Diagram | Classification policy, DFD | Data Owners |
| A.5.13 | Labelling of information | Automated labeling in systems, manual for documents | Labeling examples | All Teams |
| A.5.14 | Information transfer | Transfer policy, encryption requirements | Transfer policy, TLS config | IT Team |
| A.5.15 | Access control | Access control policy, RBAC/ABAC implementation | Access control policy, RBAC config | Security Team |
| A.5.16 | Identity management | IAM system, automated provisioning/deprovisioning | IAM config, audit logs | IT Team |
| A.5.17 | Authentication information | Password policy, MFA required, secrets management | Password policy, MFA config | Security Team |
| A.5.18 | Access rights | Least privilege, regular access reviews | Access review records | Managers |
| A.5.19 | Information security in supplier relationships | Vendor assessment process, security requirements in contracts | Vendor assessments, contracts | Procurement |
| A.5.20 | Addressing information security within supplier agreements | Security addendum in all supplier contracts | Contract templates | Legal Team |
| A.5.21 | Managing information security in the ICT supply chain | Supply chain risk assessment, dependency scanning | Dependency scan results, risk assessments | DevOps Team |
| A.5.22 | Monitoring, review and change management of supplier services | Regular vendor reviews, SLA monitoring | Vendor review records, SLA reports | Procurement |
| A.5.23 | Information security for use of cloud services | Cloud security policy, CSPM implemented | Cloud policy, CSPM findings | Cloud Team |
| A.5.24 | Information security incident management planning | Incident Response Plan, playbooks | Incident Response Plan, playbooks | Security Team |
| A.5.25 | Assessment and decision on information security events | Event classification, triage process | Triage records, SEV classifications | SOC Team |
| A.5.26 | Response to information security incidents | Incident response procedures, On-Call Runbook | Incident records, runbook | All Teams |
| A.5.27 | Learning from information security incidents | Post-incident reviews, lessons learned | PIR documents | Security Team |
| A.5.28 | Collection of evidence | Forensic procedures, chain of custody | Forensic procedures, evidence logs | Security Team |
| A.5.29 | Information security during disruption | Business Continuity Plan, DR procedures | BCP, DR test results | Business Continuity |
| A.5.30 | ICT readiness for business continuity | DR testing, backup verification | DR test reports, backup logs | IT Team |
| A.5.31 | Legal, statutory, regulatory and contractual requirements | Compliance register, legal requirements tracking | Compliance register | Legal Team |
| A.5.32 | Intellectual property rights | IP policy, license management | License inventory | Legal Team |
| A.5.33 | Protection of records | Retention policy, WORM storage for audit logs | Retention policy, storage config | Compliance Team |
| A.5.34 | Privacy and protection of PII | Privacy policy, PII handling procedures | Privacy policy, DPA | DPO |
| A.5.35 | Independent review of information security | Internal audit, external certification audits | Audit reports | Internal Audit |
| A.5.36 | Compliance with policies and standards for information security | Compliance monitoring, policy acknowledgments | Compliance reports | Compliance Team |
| A.5.37 | Documented operating procedures | Runbooks, SOPs documented | Runbooks, SOPs | All Teams |

### A.6 People Controls

| Control ID | Control Name | Implementation | Evidence | Responsible |
|------------|--------------|----------------|----------|-------------|
| A.6.1 | Screening | Background checks for all employees | Background check records | HR Team |
| A.6.2 | Terms and conditions of employment | Security clauses in employment contracts | Contract templates | HR Team |
| A.6.3 | Information security awareness, education and training | Security awareness training, phishing simulations | Training records, simulation results | Security Team |
| A.6.4 | Disciplinary process | Security violations addressed in disciplinary policy | Disciplinary policy, case records | HR Team |
| A.6.5 | Responsibilities after or at the end of employment | Offboarding procedures, exit interviews | Offboarding checklists | HR Team |
| A.6.6 | Confidentiality or non-disclosure agreements | NDAs signed by all employees and contractors | Signed NDAs | Legal Team |
| A.6.7 | Remote working | Remote work policy, VPN, endpoint security | Remote work policy, VPN config | IT Team |
| A.6.8 | Information security event reporting | Incident reporting process, security hotline | Reporting process, incident tickets | All Teams |

### A.7 Physical Controls

| Control ID | Control Name | Implementation | Evidence | Responsible |
|------------|--------------|----------------|----------|-------------|
| A.7.1 | Physical security perimeters | Office access control, visitor management | Access logs, visitor records | Facilities |
| A.7.2 | Physical entry | Badge access, reception | Badge records | Facilities |
| A.7.3 | Securing offices, rooms and facilities | Locks, access control | Physical security assessment | Facilities |
| A.7.4 | Physical security monitoring | CCTV, security guards | CCTV coverage map | Facilities |
| A.7.5 | Protecting against physical and environmental threats | Fire suppression, UPS, climate control | Facility assessments | Facilities |
| A.7.6 | Working in secure areas | Clean desk policy, visitor escort | Policy, training records | All Teams |
| A.7.7 | Clear desk and clear screen | Clear desk policy, auto-lock screens | Policy, compliance checks | All Teams |
| A.7.8 | Equipment siting and protection | Secure data centers, colocation | DC contracts, assessments | IT Team |
| A.7.9 | Security of assets off-premises | Laptop encryption, mobile device management | MDM config, encryption status | IT Team |
| A.7.10 | Storage media | Media handling procedures, secure disposal | Disposal certificates | IT Team |
| A.7.11 | Supporting utilities | UPS, generator, redundant power | Infrastructure docs | Facilities |
| A.7.12 | Cabling security | Structured cabling, cable management | Network diagrams | IT Team |
| A.7.13 | Equipment maintenance | Maintenance schedules, service contracts | Maintenance logs | IT Team |
| A.7.14 | Secure disposal or re-use of equipment | Data sanitization, certificate of destruction | Destruction certificates | IT Team |

### A.8 Technological Controls

| Control ID | Control Name | Implementation | Evidence | Responsible |
|------------|--------------|----------------|----------|-------------|
| A.8.1 | User endpoint devices | Endpoint protection, MDM, disk encryption | MDM config, AV reports | IT Team |
| A.8.2 | Privileged access rights | PAM solution, just-in-time access, session recording | PAM config, session logs | Security Team |
| A.8.3 | Information access restriction | RBAC, ABAC, data access controls | RBAC config, access matrices | Security Team |
| A.8.4 | Access to source code | Git access control, branch protection, code review | Git config, PR reviews | Dev Team |
| A.8.5 | Secure authentication | MFA, password policy, session management | Auth config, MFA adoption rate | Security Team |
| A.8.6 | Capacity management | Auto-scaling, resource monitoring, capacity planning | Scaling config, capacity reports | DevOps Team |
| A.8.7 | Protection against malware | Antivirus, EDR, sandbox analysis | AV coverage, EDR alerts | Security Team |
| A.8.8 | Management of technical vulnerabilities | Vulnerability scanning, patch management | Scan reports, patch records | Security Team |
| A.8.9 | Configuration management | IaC, config management, baseline hardening | IaC repos, hardening guides | DevOps Team |
| A.8.10 | Information deletion | Data retention, secure deletion procedures | Retention policy, deletion logs | Data Team |
| A.8.11 | Data masking | PII masking in non-prod, data anonymization | Masking rules, test data procedures | Data Team |
| A.8.12 | Data leakage prevention | DLP tools, egress monitoring, USB restrictions | DLP config, alerts | Security Team |
| A.8.13 | Information backup | Backup policy, tested restores, off-site storage | Backup logs, restore tests | IT Team |
| A.8.14 | Redundancy of information processing facilities | Multi-AZ deployment, DR site | Architecture docs, DR tests | DevOps Team |
| A.8.15 | Logging | Centralized logging, log retention, log protection | Log infrastructure, retention config | DevOps Team |
| A.8.16 | Monitoring activities | SIEM, alerting, dashboards | SIEM config, alert rules | SOC Team |
| A.8.17 | Clock synchronization | NTP servers, time sync across systems | NTP config, sync logs | IT Team |
| A.8.18 | Use of privileged utility programs | Restricted admin tools, audit logging | Tool inventory, access logs | IT Team |
| A.8.19 | Installation of software on operational systems | Change management, software whitelist | Change records, whitelist | DevOps Team |
| A.8.20 | Networks security | Network segmentation, firewalls, IDS/IPS | Network diagrams, firewall rules | Network Team |
| A.8.21 | Security of network services | Service-level agreements, security requirements | SLAs, security assessments | Network Team |
| A.8.22 | Segregation of networks | VLANs, NetworkPolicies, security zones | Network diagrams, policies | Network Team |
| A.8.23 | Web filtering | Web proxy, category blocking, malware scanning | Proxy config, block lists | Security Team |
| A.8.24 | Use of cryptography | Encryption standards, key management | Crypto policy, key inventory | Security Team |
| A.8.25 | Secure development life cycle | SSDLC, security testing, code review | SSDLC process, test results | Dev Team |
| A.8.26 | Application security requirements | Security requirements in user stories, threat modeling | Requirements docs, threat models | Dev Team |
| A.8.27 | Secure system architecture and engineering principles | Security architecture patterns, reference architecture | Architecture docs, patterns | Architecture Team |
| A.8.28 | Secure coding | Secure coding guidelines, static analysis | Coding standards, SAST reports | Dev Team |
| A.8.29 | Security testing in development and acceptance | DAST, penetration testing, security review | Test reports, pentest results | Security Team |
| A.8.30 | Outsourced development | Security requirements in contracts, code review | Contract clauses, review records | Procurement |
| A.8.31 | Separation of development, test and production environments | Separate environments, data masking | Environment inventory, masking rules | DevOps Team |
| A.8.32 | Change management | Change control process, CAB | Change records, CAB minutes | Change Team |
| A.8.33 | Test information | Production data not used in test, synthetic data | Test data procedures | Dev Team |
| A.8.34 | Protection of information systems during audit testing | Audit scope definition, read-only access | Audit procedures | Internal Audit |

---

## 3. SOC 2 Type II Mapping

### Trust Service Criteria: Security (CC6)

| Criteria | Control Activity | Implementation | Evidence |
|----------|------------------|----------------|----------|
| CC6.1 | Logical access security | RBAC, MFA, least privilege | Access control policy, MFA config |
| CC6.2 | Prior to issuing system credentials | Identity verification, approval workflow | Provisioning records |
| CC6.3 | Remove access upon termination | Automated deprovisioning | Offboarding records |
| CC6.4 | Periodic access review | Quarterly access reviews | Review records |
| CC6.5 | Address unauthorized access | Access monitoring, anomaly detection | Alert logs, incident records |
| CC6.6 | Transmission security | TLS 1.2+, mTLS internally | TLS config, certificate inventory |
| CC6.7 | Data protection | Encryption at rest, key management | Encryption config, key inventory |
| CC6.8 | Prevent unauthorized code changes | Code review, CI/CD controls | PR records, CI logs |
| CC6.9 | Manage exceptions | Exception tracking, remediation | Exception log, remediation records |

### Trust Service Criteria: Availability (A1)

| Criteria | Control Activity | Implementation | Evidence |
|----------|------------------|----------------|----------|
| A1.1 | Capacity management | Auto-scaling, resource monitoring | Scaling policies, capacity reports |
| A1.2 | Environmental protections | Data center controls, cloud provider | DC certifications, SLA |
| A1.3 | Recovery from incidents | DR procedures, backup restoration | DR plan, restore tests |
| A1.4 | Backup procedures | Daily backups, off-site storage | Backup logs, retention policy |
| A1.5 | Recovery objectives | RTO/RPO defined and tested | RTO/RPO documentation, test results |
| A1.6 | Alternate processing | Multi-AZ, failover procedures | Architecture docs, failover tests |
| A1.7 | Disaster recovery | DR site, annual DR test | DR plan, test results |

### Trust Service Criteria: Processing Integrity (PI1)

| Criteria | Control Activity | Implementation | Evidence |
|----------|------------------|----------------|----------|
| PI1.1 | Data processing validation | Input validation, schema validation | Validation rules, schema docs |
| PI1.2 | Data processing completeness | Event sourcing, audit trails | Event logs, audit records |
| PI1.3 | Data processing accuracy | Calculation verification, reconciliation | Reconciliation reports |
| PI1.4 | Data processing authorization | Business rules, approval workflows | Rule engine config, approval logs |
| PI1.5 | Data processing timeliness | SLAs, latency monitoring | SLA definitions, latency metrics |

### Trust Service Criteria: Confidentiality (C1)

| Criteria | Control Activity | Implementation | Evidence |
|----------|------------------|----------------|----------|
| C1.1 | Confidential information identification | Data classification, labeling | Classification policy, labels |
| C1.2 | Disposal of confidential information | Secure deletion, media sanitization | Disposal procedures, certificates |
| C1.3 | Confidential information protection | Encryption, access controls | Encryption config, access matrices |
| C1.4 | Confidentiality agreements | NDAs, confidentiality clauses | Signed agreements |

### Trust Service Criteria: Privacy (P1-P8)

| Criteria | Control Activity | Implementation | Evidence |
|----------|------------------|----------------|----------|
| P1.1 | Privacy notice | Privacy policy, consent management | Privacy policy, consent records |
| P2.1 | Choice and consent | Consent mechanisms, preference center | Consent config, preference records |
| P3.1 | Data collection limitation | Collect only necessary data | Data inventory, collection policy |
| P4.1 | Data use limitation | Purpose limitation, access controls | Data use policy, access logs |
| P5.1 | Data disclosure | Third-party agreements, data sharing policy | DPAs, sharing policy |
| P6.1 | Data quality | Data validation, correction procedures | Validation rules, correction logs |
| P7.1 | Data retention | Retention policy, automated deletion | Retention policy, deletion logs |
| P8.1 | Privacy rights | DSAR process, right to deletion | DSAR procedures, response records |

---

## 4. Control Implementation Details

### 4.1 Authentication & Authorization

| Control | ISO 27001 | SOC 2 | Implementation |
|---------|-----------|-------|----------------|
| Multi-Factor Authentication | A.5.17, A.8.5 | CC6.1 | MFA required for all users, TOTP/FIDO2 supported |
| Single Sign-On | A.5.16 | CC6.1 | SAML 2.0 integration with corporate IdP |
| Service Accounts | A.8.3 | CC6.1 | SPIFFE/SPIRE for service identity |
| API Authentication | A.8.24 | CC6.6 | JWT with RS256, short-lived tokens (15min) |
| Role-Based Access Control | A.5.15, A.8.3 | CC6.1 | RBAC with 25+ roles, mapped to job functions |
| Attribute-Based Access Control | A.8.3 | CC6.1 | ABAC for data-level access decisions |

**JWT Token Configuration:**
```yaml
jwt:
  algorithm: RS256
  access_token_expiry: 900  # 15 minutes
  refresh_token_expiry: 604800  # 7 days
  issuer: auth.cargobit.com
  audience:
    - api.cargobit.com
  claims:
    - sub          # Subject (user ID)
    - roles        # User roles
    - permissions  # Fine-grained permissions
    - tenant_id    # Multi-tenant isolation
    - iat          # Issued at
    - exp          # Expiration
    - jti          # JWT ID (for revocation)
```

### 4.2 Encryption

| Control | ISO 27001 | SOC 2 | Implementation |
|---------|-----------|-------|----------------|
| Encryption in Transit | A.8.24 | CC6.6 | TLS 1.2+ mandatory, mTLS for internal |
| Encryption at Rest | A.8.24 | C1.3 | AES-256 for databases, S3, volumes |
| Key Management | A.8.24 | C1.3 | AWS KMS / HashiCorp Vault, key rotation |
| Certificate Management | A.8.24 | CC6.6 | Automated via cert-manager, 90-day rotation |

**Encryption Configuration:**
```yaml
encryption:
  transit:
    protocol: TLS 1.2+
    cipher_suites:
      - TLS_AES_256_GCM_SHA384
      - TLS_CHACHA20_POLY1305_SHA256
    mtls:
      enabled: true
      mode: STRICT
  at_rest:
    algorithm: AES-256-GCM
    key_management: aws-kms
    key_rotation: 90 days
  secrets:
    storage: HashiCorp Vault
    transit_encryption: true
```

### 4.3 Network Security

| Control | ISO 27001 | SOC 2 | Implementation |
|---------|-----------|-------|----------------|
| Network Segmentation | A.8.22 | CC6.1 | VLANs, Kubernetes NetworkPolicies |
| Firewall Rules | A.8.20 | CC6.1 | Cloud firewalls, WAF, default deny |
| Intrusion Detection | A.8.20 | CC6.5 | Network IDS, anomaly detection |
| DDoS Protection | A.8.20 | A1.2 | Cloudflare, rate limiting |

**NetworkPolicy Example:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: pricing-service-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: pricing-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
        - podSelector:
            matchLabels:
              app: order-service
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: pricing-db
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: kafka
      ports:
        - protocol: TCP
          port: 9092
```

### 4.4 Logging & Monitoring

| Control | ISO 27001 | SOC 2 | Implementation |
|---------|-----------|-------|----------------|
| Log Collection | A.8.15 | CC6.5 | Fluentd/Fluent Bit, structured JSON logs |
| Log Retention | A.5.33 | PI1.2 | 90 days hot, 7 years archive (audit) |
| SIEM | A.8.16 | CC6.5 | Splunk / Elastic SIEM |
| Alerting | A.8.16 | A1.1 | PagerDuty, Slack integration |

**Audit Log Schema:**
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "correlation_id": "corr-abc123",
  "trace_id": "trace-xyz789",
  "span_id": "span-def456",
  "service": "pricing-service",
  "level": "INFO",
  "event_type": "AUDIT",
  "user_id": "user-123",
  "tenant_id": "tenant-456",
  "action": "PRICE_CALCULATED",
  "resource": {
    "type": "order",
    "id": "order-789"
  },
  "details": {
    "base_price": 1500.00,
    "final_price": 1425.00,
    "fraud_score": 0.12
  },
  "source_ip": "192.168.1.100",
  "user_agent": "CargoBit-Web/2.1.0",
  "hash": "sha256:..."
}
```

### 4.5 Incident Response

| Control | ISO 27001 | SOC 2 | Implementation |
|---------|-----------|-------|----------------|
| Incident Management | A.5.24-A.5.28 | CC6.5 | Incident Response Plan, On-Call Runbook |
| Severity Classification | A.5.25 | - | SEV1-SEV4 with SLAs |
| Escalation | A.5.26 | - | Escalation Matrix, automated paging |
| Post-Incident Review | A.5.27 | - | PIR within 5 days, lessons learned |

**SEV Classification:**
| Severity | Description | Response Time | Resolution Target | Example |
|----------|-------------|---------------|-------------------|---------|
| SEV1 | Critical - Full outage | 15 min | 4 hours | Complete platform down |
| SEV2 | Major - Partial outage | 30 min | 8 hours | Single region down |
| SEV3 | Minor - Degraded service | 2 hours | 24 hours | Elevated error rates |
| SEV4 | Low - Minimal impact | 1 day | 1 week | Non-critical feature issue |

### 4.6 Change Management

| Control | ISO 27001 | SOC 2 | Implementation |
|---------|-----------|-------|----------------|
| Change Control | A.8.32 | CC6.8 | CAB approval for changes |
| Testing | A.8.31 | CC6.8 | Mandatory testing in staging |
| Rollback | A.8.32 | CC6.8 | Automated rollback capability |
| Documentation | A.8.32 | PI1.1 | Change records, runbook updates |

**Change Management Workflow:**
```
1. Change Request submitted
   ├── RFC document with impact analysis
   └── Risk assessment

2. Technical Review
   ├── Architecture review
   └── Security review (if applicable)

3. CAB Approval
   ├── Weekly CAB meeting
   └── Emergency CAB for urgent changes

4. Implementation
   ├── Deployment window
   ├── Monitoring during change
   └── Validation checks

5. Post-Implementation
   ├── Success confirmation
   ├── Documentation update
   └── Change record closed
```

### 4.7 Backup & Recovery

| Control | ISO 27001 | SOC 2 | Implementation |
|---------|-----------|-------|----------------|
| Backup Procedures | A.8.13 | A1.4 | Daily backups, 30-day retention |
| Backup Testing | A.8.13 | A1.5 | Monthly restore tests |
| DR Site | A.8.14 | A1.6 | Multi-region deployment |
| DR Testing | A.5.30 | A1.7 | Annual full DR test |

**Backup Configuration:**
```yaml
backup:
  databases:
    frequency: daily
    retention: 30 days
    encryption: AES-256
    offsite: true
    tested_monthly: true
  
  object_storage:
    versioning: enabled
    cross_region_replication: true
  
  disaster_recovery:
    rto: 4 hours
    rpo: 1 hour
    test_frequency: annual
    last_test: 2024-09-15
```

---

## 5. Compliance Monitoring

### 5.1 Key Compliance Metrics

| Metric | Target | Measurement | Frequency |
|--------|--------|-------------|-----------|
| Access Review Completion | 100% | Percentage of reviews completed on time | Quarterly |
| MFA Adoption | 100% | Percentage of users with MFA enabled | Monthly |
| Patch Compliance | 95% | Percentage of systems patched within SLA | Monthly |
| Backup Success Rate | 99.9% | Percentage of successful backups | Daily |
| Incident Response SLA | 95% | Percentage of incidents responded within SLA | Monthly |
| Training Completion | 100% | Percentage of employees completing security training | Annual |
| Vulnerability Remediation | 90% | Critical vulns remediated within 7 days | Monthly |

### 5.2 Automated Compliance Checks

```yaml
compliance_checks:
  - name: "TLS Version Check"
    query: "security_config.tls_version >= '1.2'"
    severity: critical
    frequency: daily
    
  - name: "MFA Enforcement"
    query: "users.mfa_enabled == true"
    severity: critical
    frequency: daily
    
  - name: "Access Review Status"
    query: "access_reviews.overdue == false"
    severity: high
    frequency: weekly
    
  - name: "Encryption at Rest"
    query: "data_stores.encryption_enabled == true"
    severity: critical
    frequency: daily
    
  - name: "Log Retention"
    query: "logging.retention_days >= 90"
    severity: high
    frequency: weekly
```

### 5.3 Compliance Dashboard

The compliance dashboard provides real-time visibility into compliance status:

| Widget | Data Source | Refresh |
|--------|-------------|---------|
| Overall Compliance Score | Multiple checks | Daily |
| Open Findings | Audit management system | Real-time |
| Training Status | LMS | Daily |
| Access Reviews | IAM system | Real-time |
| Vulnerability Status | Vulnerability scanner | Daily |
| Backup Status | Backup system | Hourly |

---

## 6. Audit Trail

### 6.1 Internal Audits

| Audit Type | Frequency | Scope | Last Conducted |
|------------|-----------|-------|----------------|
| Access Review | Quarterly | All user access rights | 2025-01-01 |
| Vulnerability Assessment | Monthly | All systems | 2025-01-10 |
| Penetration Test | Annual | External perimeter, internal network | 2024-09-01 |
| DR Test | Annual | Full failover | 2024-09-15 |
| Policy Review | Annual | All security policies | 2024-12-01 |

### 6.2 External Audits

| Audit Type | Auditor | Scope | Period | Status |
|------------|---------|-------|--------|--------|
| ISO 27001 Certification | BSI | Full ISMS | 2024-06 | Certified |
| SOC 2 Type II | Deloitte | Security, Availability, PI, Confidentiality, Privacy | 2024-09 | Certified |
| Penetration Test | NCC Group | External, Internal | 2024-09 | Completed |

---

## 7. Gap Management

### 7.1 Current Gaps

| Gap ID | Description | Control Reference | Risk Level | Remediation Plan | Target Date |
|--------|-------------|-------------------|------------|------------------|-------------|
| GAP-001 | PII masking not implemented for all non-prod environments | A.8.11, C1.3 | Medium | Implement data masking tool | 2025-03-15 |
| GAP-002 | Key rotation manual for some legacy systems | A.8.24 | Low | Automate key rotation | 2025-04-01 |
| GAP-003 | Vendor security assessments overdue for 2 vendors | A.5.19 | Medium | Complete assessments | 2025-02-15 |

### 7.2 Remediation Tracking

All gaps are tracked in the GRC system with:
- Owner assignment
- Due date
- Progress updates
- Risk acceptance (if applicable)
- Closure verification

---

## 8. Document Control

| Attribute | Value |
|-----------|-------|
| Owner | Compliance Team |
| Reviewers | CISO, Legal, External Auditor |
| Version | 1.0 |
| Last Updated | 2025-01-15 |
| Next Review | 2025-04-15 |

---

**Related Documents:**
- Security Policy
- Incident Response Plan
- Business Continuity Plan
- Data Classification Policy
- Privacy Policy
