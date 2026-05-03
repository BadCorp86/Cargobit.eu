# Compliance Matrix

## Document Information

| Field | Value |
|-------|-------|
| Document ID | COMP-001 |
| Version | 1.0.0 |
| Last Updated | 2024-05-03 |
| Classification | Internal |
| Owner | Compliance Team |
| Review Cycle | Quarterly |

---

## 1. Overview

This Compliance Matrix maps CargoBit's technical controls to regulatory requirements across PCI-DSS SAQ-A, GDPR, and SOC 2 Type 2 frameworks. It serves as the authoritative reference for compliance audits and control implementation.

### 1.1 Applicable Frameworks

| Framework | Scope | Certification Level |
|-----------|-------|-------------------|
| PCI-DSS SAQ-A | Payment processing | Self-Assessment |
| GDPR | EU customer data | Compliance attestation |
| SOC 2 Type 2 | Infrastructure controls | Annual audit |

### 1.2 Compliance Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPLIANCE FRAMEWORK                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│   │   PCI-DSS   │  │    GDPR     │  │   SOC 2     │        │
│   │   SAQ-A     │  │             │  │  Type 2     │        │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│          │                │                │                │
│          └────────────────┼────────────────┘                │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │   Shared    │                          │
│                    │  Controls   │                          │
│                    └──────┬──────┘                          │
│                           │                                  │
│    ┌──────────────────────┼──────────────────────┐          │
│    │                      │                      │          │
│    ▼                      ▼                      ▼          │
│ ┌──────────┐      ┌──────────────┐      ┌──────────────┐   │
│ │ Rate     │      │   Stripe     │      │    Audit     │   │
│ │ Limiting │      │   Webhooks   │      │    Logs      │   │
│ └──────────┘      └──────────────┘      └──────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. PCI-DSS SAQ-A Compliance

### 2.1 SAQ-A Eligibility

CargoBit qualifies for SAQ-A because:

- All cardholder data functions are fully outsourced to Stripe
- CargoBit does not store, process, or transmit cardholder data
- Payment acceptance is via Stripe.js (hosted payment form)
- Webhook signatures are verified for all Stripe events

### 2.2 Control Mapping

| PCI Requirement | Control | Implementation | Evidence |
|-----------------|---------|----------------|----------|
| **1.1** Firewall configuration | Network segmentation | Separate application and database zones | Network diagram, firewall rules |
| **1.2** Firewall rules | Default deny-all | Explicit allow rules only | Firewall configuration audit |
| **1.3** Prohibit direct access | No public database access | Database in private subnet | Network configuration |
| **2.1** Default passwords | Changed on all systems | Automated in infrastructure code | Configuration management |
| **2.2** Unnecessary services | Disabled | Container minimal base images | Container scan results |
| **2.3** Encryption for admin access | TLS for all access | VPN + TLS required | Access configuration |
| **2.4** Inventory | All systems documented | Infrastructure as Code | Terraform/CloudFormation |
| **3.1** Cardholder data storage | Not applicable | Stripe handles all card data | Stripe integration docs |
| **3.2** Do not store sensitive auth data | Not applicable | No storage by CargoBit | Code audit |
| **3.4** Render PAN unreadable | Not applicable | Stripe tokenization | Stripe docs |
| **4.1** Encryption in transit | TLS 1.3 | All endpoints TLS 1.3+ | SSL scan results |
| **4.2** Never send PAN in email | Policy enforced | Security awareness training | Training records |
| **5.1** Anti-virus | Not applicable | Serverless/containers | Architecture docs |
| **5.2** Address vulnerabilities | Patch management | Automated dependency updates | Patch logs |
| **6.1** Security development process | SDLC | PR reviews, SAST scanning | Git history, scan results |
| **6.2** Secure coding | Guidelines | Security training, code review | Training records |
| **6.3** Vulnerability remediation | SLA defined | Critical: 24h, High: 7d | Patch records |
| **6.4** Change control | Process defined | CI/CD pipeline | Pipeline configuration |
| **6.5** Common coding vulnerabilities | Addressed | SAST, DAST scanning | Scan results |
| **6.6** Application security | Implemented | Security headers, input validation | Security review |
| **7.1** Access control | RBAC implemented | Role-based permissions | Access matrix |
| **7.2** Access needs | Least privilege | Documented roles | Role definitions |
| **7.3** Access via automated system | Implemented | IAM system | IAM configuration |
| **8.1** User ID assignment | Unique IDs | SSO with unique identifiers | User directory |
| **8.2** Authentication | Strong auth | MFA for all access | MFA configuration |
| **8.3** Multi-factor auth | Required | MFA mandatory for production | MFA policy |
| **8.4** MFA for CDE access | Not applicable | No CDE access | Architecture docs |
| **8.5** MFA for remote access | Required | MFA for VPN/SSH | VPN configuration |
| **8.6** Service accounts | Documented | Dedicated service accounts | Account inventory |
| **8.7** All access via MFA | Verified | 100% MFA coverage | MFA audit |
| **8.8** MFA for administrators | Required | Admin role requires MFA | Role configuration |
| **9.1** Physical access | Cloud provider | AWS/GCP physical security | Provider SOC reports |
| **9.2** Physical access procedures | Cloud provider | Provider manages | Provider documentation |
| **9.3** Visitor access | Cloud provider | Provider manages | Provider documentation |
| **9.4** Visitor log | Cloud provider | Provider manages | Provider documentation |
| **9.5** Media storage | Not applicable | No physical media | Architecture docs |
| **9.6** Media inventory | Not applicable | No physical media | N/A |
| **9.7** Media destruction | Not applicable | No physical media | N/A |
| **9.8** Media distribution | Not applicable | No physical media | N/A |
| **9.9** Point-of-interaction | Not applicable | E-commerce only | Business model |
| **10.1** Audit logs | Implemented | Hash-chain audit logs | Audit system docs |
| **10.2** Automated audit trails | Implemented | All events logged | Audit configuration |
| **10.3** Record audit data | Comprehensive | User, time, action, resource | Audit log schema |
| **10.4** Time synchronization | NTP | Synchronized clocks | NTP configuration |
| **10.5** Secure audit logs | Implemented | Immutable, encrypted | Audit system docs |
| **10.6** Review logs | Regular review | Daily automated + weekly manual | Review records |
| **10.7** Retention | 180+ days | 7-year retention | Retention policy |
| **10.8** Unauthorized changes | Detection | File integrity monitoring | FIM configuration |
| **11.1** Wireless detection | Not applicable | No wireless infrastructure | Architecture docs |
| **11.2** Vulnerability scans | Quarterly | External + internal scans | Scan reports |
| **11.3** Penetration testing | Annual | External pentest | Pentest reports |
| **11.4** Intrusion detection | Implemented | WAF, monitoring | WAF configuration |
| **11.5** Change detection | Implemented | File integrity monitoring | FIM configuration |
| **11.6** Unauthorized access | Detection | Alerting on suspicious activity | Alert configuration |
| **12.1** Security policy | Documented | This document | Policy documentation |
| **12.2** Daily security operations | Defined | Security team procedures | Procedures |
| **12.3** Security roles | Defined | RACI matrix | Organization chart |
| **12.4** Security responsibilities | Assigned | Job descriptions | HR documentation |
| **12.5** Asset management | Implemented | Asset inventory | Asset database |
| **12.6** Security awareness | Training program | Annual training | Training records |
| **12.7** Personnel screening | Background checks | Per job role | HR policy |
| **12.8** Third-party security | Vendor management | Vendor assessments | Vendor files |
| **12.9** Incident response | Documented | Incident playbook | Playbook |
| **12.10** Policy review | Annual | Review schedule | Review records |
| **A.1** Third-party provider | Stripe PCI compliance | Stripe is PCI certified | Stripe AOC |

### 2.3 Stripe PCI Attestation

CargoBit relies on Stripe's PCI-DSS certification. Key documentation:

| Document | Source | Update Frequency |
|----------|--------|------------------|
| Attestation of Compliance (AOC) | Stripe | Annual |
| PCI DSS certificate | Stripe | Annual |
| SAQ-A eligibility | Stripe docs | As updated |

---

## 3. GDPR Compliance

### 3.1 Data Subject Rights Implementation

| Right | Article | Implementation | Technical Control |
|-------|---------|----------------|-------------------|
| **Right to Access** | Art. 15 | User data export API | `GET /api/user/export` |
| **Right to Rectification** | Art. 16 | User profile update API | `PATCH /api/user/profile` |
| **Right to Erasure** | Art. 17 | Deletion request process | `DELETE /api/user` + cascade |
| **Right to Portability** | Art. 20 | Data export in JSON | Export functionality |
| **Right to Object** | Art. 21 | Marketing opt-out | Preference center |
| **Right to Restriction** | Art. 18 | Account freeze | `POST /api/user/restrict` |

### 3.2 Lawful Basis for Processing

| Processing Activity | Legal Basis | Article | Documentation |
|--------------------|-------------|---------|---------------|
| Payment processing | Contract | Art. 6(1)(b) | Terms of Service |
| Fraud prevention | Legitimate interest | Art. 6(1)(f) | Risk assessment |
| Customer support | Contract | Art. 6(1)(b) | Terms of Service |
| Marketing | Consent | Art. 6(1)(a) | Consent records |
| Audit logging | Legal obligation | Art. 6(1)(c) | Regulatory requirements |

### 3.3 Data Protection Measures

| Measure | Requirement | Implementation |
|---------|-------------|----------------|
| Encryption at rest | Art. 32 | AES-256-GCM |
| Encryption in transit | Art. 32 | TLS 1.3 |
| Access controls | Art. 32 | RBAC, MFA |
| Audit logging | Art. 32 | Hash-chain logs |
| Data minimization | Art. 5 | Field-level review |
| Purpose limitation | Art. 5 | Documented purposes |
| Retention limits | Art. 5 | Automated deletion |

### 3.4 Data Processing Records

| Field | Value |
|-------|-------|
| Controller | CargoBit GmbH |
| Processor(s) | Stripe, AWS/GCP, Redis Cloud |
| Data categories | User profile, transaction data, audit logs |
| Purpose(s) | Payment processing, support, compliance |
| Retention | As per retention schedule |
| Transfers | EU to US (SCCs), data localization options |

### 3.5 Breach Notification

| Timeline | Action |
|----------|--------|
| Detection | Immediate logging and containment |
| Assessment | Within 4 hours |
| Authority notification | Within 72 hours if risk to rights |
| Data subject notification | Without undue delay if high risk |

---

## 4. SOC 2 Type 2 Compliance

### 4.1 Trust Service Criteria Mapping

#### Security (CC6.0)

| Control | Criteria | Implementation | Evidence |
|---------|----------|----------------|----------|
| CC6.1 | Logical access | RBAC, MFA | Access policy, MFA config |
| CC6.2 | Registration | SSO onboarding | Onboarding process |
| CC6.3 | Access removal | Automated offboarding | HR integration |
| CC6.4 | Access restrictions | Role-based permissions | Role definitions |
| CC6.5 | Need-to-know | Data classification | Classification policy |
| CC6.6 | Boundary protection | Network segmentation | Network diagram |
| CC6.7 | Transmission security | TLS encryption | SSL configuration |
| CC6.8 | Input/output controls | Validation, sanitization | Code review |

#### Availability (A1.0)

| Control | Criteria | Implementation | Evidence |
|---------|----------|----------------|----------|
| A1.1 | Capacity management | Auto-scaling | Scaling configuration |
| A1.2 | Backup and recovery | Daily backups, PITR | Backup policy |
| A1.3 | Recovery procedures | Playbooks | Restore playbook |

#### Confidentiality (C1.0)

| Control | Criteria | Implementation | Evidence |
|---------|----------|----------------|----------|
| C1.1 | Data classification | Classification scheme | Classification policy |
| C1.2 | Disposal | Secure deletion | Disposal procedures |

#### Processing Integrity (PI1.0)

| Control | Criteria | Implementation | Evidence |
|---------|----------|----------------|----------|
| PI1.1 | Data processing | Validation, audit | Audit logs |
| PI1.2 | Error handling | Graceful degradation | Error handling docs |

#### Privacy (P1.0) - if applicable

| Control | Criteria | Implementation | Evidence |
|---------|----------|----------------|----------|
| P1.1 | Notice | Privacy policy | Published policy |
| P1.2 | Choice | Consent management | Preference center |
| P1.3 | Access | Data export | Export API |
| P1.4 | Security | Encryption, access | Security controls |
| P1.5 | Sharing | Processor agreements | DPAs with vendors |
| P1.6 | Retention | Data lifecycle | Retention policy |
| P1.7 | Quality | Data validation | Validation rules |

### 4.2 Control Testing Schedule

| Control Area | Testing Frequency | Testing Method |
|--------------|-------------------|----------------|
| Access controls | Monthly | Automated scan + manual review |
| Network security | Quarterly | Vulnerability scan |
| Encryption | Quarterly | Certificate audit |
| Backup/recovery | Quarterly | Restore test |
| Incident response | Semi-annually | Tabletop exercise |

---

## 5. Control Implementation Summary

### 5.1 Technical Controls

| Control | Implementation | Audit Evidence |
|---------|----------------|----------------|
| **Rate Limiting** | Redis-based sliding window | `src/lib/rateLimit.ts` |
| **Webhook Security** | Stripe signature verification | `src/webhooks/stripe.ts` |
| **Audit Logging** | Hash-chain immutable logs | `src/services/auditLog.ts` |
| **Audit Verification** | Integrity checker | `src/jobs/auditVerify.ts` |
| **Database Security** | Encrypted at rest, network isolation | Infrastructure config |
| **Backup** | Daily automated backups | `ops/backup-db.sh` |

### 5.2 Administrative Controls

| Control | Implementation | Documentation |
|---------|----------------|---------------|
| Security policy | Defined | `docs/security-policy.md` |
| Incident response | Defined | `docs/incident-response.md` |
| Access management | RBAC | `docs/security-policy.md` |
| Training program | Annual training | Training records |

### 5.3 Physical Controls

| Control | Implementation | Provider |
|---------|----------------|----------|
| Data center security | Physical access control | AWS/GCP |
| Environmental controls | Power, cooling | AWS/GCP |
| Physical monitoring | 24/7 surveillance | AWS/GCP |

---

## 6. Compliance Monitoring

### 6.1 Continuous Monitoring

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Failed login attempts | >5 in 5 minutes | Security alert |
| Rate limit violations | >100/hour | Security alert |
| Certificate expiration | <30 days | Warning |
| Audit log gaps | Any gap | Critical alert |
| Backup failures | Any failure | Critical alert |

### 6.2 Compliance Dashboards

- **PCI-DSS**: Control status, SAQ-A eligibility
- **GDPR**: Data subject requests, breach incidents
- **SOC 2**: Control testing status, exceptions

### 6.3 Reporting Schedule

| Report | Frequency | Audience |
|--------|-----------|----------|
| Security posture | Weekly | Security team |
| Compliance status | Monthly | Management |
| Audit findings | Quarterly | Board |
| Annual assessment | Annually | All stakeholders |

---

## 7. Exception Management

### 7.1 Exception Process

1. Identify control gap or deviation
2. Document business justification
3. Assess risk and compensating controls
4. Obtain approval from Compliance Team
5. Document exception with expiration date
6. Track resolution progress

### 7.2 Exception Register

All exceptions must be recorded with:

- Exception ID
- Control affected
- Risk assessment
- Compensating controls
- Approval (name, date)
- Expiration date
- Resolution status

---

## 8. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024-05-03 | Compliance Team | Initial release |

---

*This document is classified as Internal and should not be shared externally without approval.*
