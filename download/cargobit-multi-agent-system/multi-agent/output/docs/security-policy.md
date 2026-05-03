# Security Policy

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SEC-001 |
| Version | 1.0.0 |
| Last Updated | 2024-05-03 |
| Classification | Internal |
| Owner | Security Team |
| Review Cycle | Quarterly |

---

## 1. Purpose

This Security Policy establishes the framework for protecting CargoBit's payment infrastructure, customer data, and operational systems. It defines security requirements, responsibilities, and procedures to ensure compliance with PCI-DSS, GDPR, and SOC 2 Type 2 standards.

The policy applies to all personnel, systems, and processes involved in the handling, processing, or storage of payment card data, personal information, and sensitive business data.

---

## 2. Scope

### 2.1 Systems in Scope

This policy covers the following systems and components:

- **Payment Processing System**: Core payment handling, Stripe integration, wallet management
- **Database Infrastructure**: PostgreSQL databases containing user, transaction, and audit data
- **API Layer**: All public and internal API endpoints
- **Webhook Handlers**: Stripe webhook processing infrastructure
- **Audit Logging System**: Hash-chain audit log storage and verification
- **Rate Limiting Infrastructure**: Redis-based request throttling

### 2.2 Data Classifications

| Classification | Description | Examples |
|---------------|-------------|----------|
| **Critical** | Payment card data, authentication credentials | Card numbers (via Stripe), API keys |
| **Sensitive** | Personal identifiable information, financial records | User profiles, wallet balances, transactions |
| **Internal** | Business operations data | Audit logs, rate limit counters, configurations |
| **Public** | Non-sensitive operational data | Health endpoints, public documentation |

### 2.3 Personnel Scope

- Full-time employees with system access
- Contractors and third-party vendors
- Service accounts and automated systems
- Development, operations, and security teams

---

## 3. Security Requirements

### 3.1 Authentication and Access Control

#### 3.1.1 Multi-Factor Authentication (MFA)

All access to production systems must use MFA. The following methods are approved:

- Hardware security keys (FIDO2/WebAuthn preferred)
- TOTP-based authenticator applications
- Push notification-based authentication

SMS-based MFA is explicitly prohibited for production access due to SIM-swapping vulnerabilities.

#### 3.1.2 Password Requirements

| Requirement | Value |
|-------------|-------|
| Minimum length | 16 characters |
| Complexity | Mixed case, numbers, symbols |
| Rotation | 90 days for service accounts |
| History | Last 12 passwords blocked |
| Lockout | 5 failed attempts = 30-minute lock |

#### 3.1.3 Role-Based Access Control (RBAC)

Access must follow the principle of least privilege. Standard roles:

| Role | Access Level | Use Case |
|------|-------------|----------|
| `admin` | Full system access | Security team, CTO |
| `sre` | Infrastructure access | SRE team |
| `developer` | Read-only production, write staging | Development team |
| `auditor` | Read-only audit logs | Compliance team |
| `service` | Specific API access | Automated systems |

### 3.2 Network Security

#### 3.2.1 Encryption in Transit

All network communications must use TLS 1.3 or higher. The following cipher suites are approved:

```
TLS_AES_256_GCM_SHA384
TLS_CHACHA20_POLY1305_SHA256
TLS_AES_128_GCM_SHA256
```

TLS 1.0 and 1.1 are explicitly prohibited.

#### 3.2.2 Network Segmentation

Production infrastructure must be segmented into the following zones:

| Zone | Purpose | Allowed Connections |
|------|---------|-------------------|
| `public` | Load balancers, public APIs | → application |
| `application` | API servers, workers | → database, redis, external |
| `database` | PostgreSQL, Redis | ← application only |
| `management` | Monitoring, logging | → all zones (read) |

#### 3.2.3 Firewall Rules

Default deny-all policy with explicit allow rules:

- Inbound: Only ports 443 (HTTPS) and 22 (SSH from management VPN)
- Outbound: Only necessary external endpoints (Stripe API, monitoring)
- Inter-zone: Only documented service ports

### 3.3 Data Protection

#### 3.3.1 Encryption at Rest

All data at rest must be encrypted using AES-256-GCM. Key management:

- Database encryption: Transparent Data Encryption (TDE)
- Backup encryption: Separate encryption keys
- Secret storage: HashiCorp Vault or AWS Secrets Manager

#### 3.3.2 Data Retention

| Data Type | Retention Period | Disposal Method |
|-----------|-----------------|-----------------|
| Transaction records | 7 years | Secure deletion |
| Audit logs | 180 days minimum | Secure deletion |
| User profiles | Until deletion request + 30 days | Anonymization |
| Rate limit counters | 24 hours | Automatic expiry |
| Backup files | 30 days (daily), 12 months (monthly) | Secure deletion |

#### 3.3.3 PCI-DSS Compliance

CargoBit operates under PCI-DSS SAQ-A compliance model:

- Cardholder data is handled exclusively by Stripe
- No card numbers are stored on CargoBit systems
- Stripe.js is used for client-side tokenization
- Webhook signatures are verified for all events

### 3.4 Application Security

#### 3.4.1 Secure Development Lifecycle

All code changes must:

1. Pass automated security scanning (SAST)
2. Be reviewed by at least one other developer
3. Pass all unit and integration tests
4. Be deployed through CI/CD pipeline
5. Have corresponding documentation updates

#### 3.4.2 Dependency Management

- Automated vulnerability scanning for all dependencies
- Critical vulnerabilities patched within 24 hours
- High vulnerabilities patched within 7 days
- Medium vulnerabilities patched within 30 days
- Unused dependencies removed quarterly

#### 3.4.3 Security Headers

All HTTP responses must include:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' https://js.stripe.com
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 4. Incident Response

### 4.1 Severity Classifications

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| P1 - Critical | Active security breach, data exposure | 15 minutes | Confirmed breach, ransomware |
| P2 - High | Vulnerability being exploited | 1 hour | Active attack, compromised credentials |
| P3 - Medium | Security issue requiring attention | 24 hours | Vulnerability disclosed, suspicious activity |
| P4 - Low | Minor security concern | 72 hours | Policy violation, minor misconfiguration |

### 4.2 Response Procedure

1. **Detection**: Automated alerts or manual report
2. **Triage**: Security team assesses severity
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat, patch vulnerability
5. **Recovery**: Restore services, verify integrity
6. **Post-Mortem**: Document lessons learned

### 4.3 Communication Requirements

| Stakeholder | P1 | P2 | P3 | P4 |
|-------------|-----|-----|-----|-----|
| Security Team | Immediate | 1 hour | 24 hours | 72 hours |
| Engineering | Immediate | 1 hour | 24 hours | - |
| Management | 1 hour | 4 hours | - | - |
| Customers | If data exposed | If affected | - | - |
| Regulators | Required by law | If required | - | - |

---

## 5. Monitoring and Logging

### 5.1 Security Monitoring

The following events must be monitored and alerted:

- Failed authentication attempts (>5 in 5 minutes)
- Privilege escalation attempts
- Unusual API access patterns
- Geographic anomalies in access
- Rate limit threshold breaches
- Database query anomalies
- Certificate expiration (<30 days)

### 5.2 Audit Logging

All security-relevant events must be logged to the audit log system:

- User authentication (success and failure)
- Authorization decisions
- Data access and modifications
- Configuration changes
- Administrative actions
- Webhook processing
- Payment events

### 5.3 Log Protection

- Logs must be immutable (hash-chain verification)
- Logs must be retained for minimum 180 days
- Logs must be encrypted at rest
- Access to logs must be restricted and audited

---

## 6. Third-Party Security

### 6.1 Vendor Assessment

All third-party vendors with access to sensitive data must:

- Complete security questionnaire
- Provide SOC 2 Type 2 report or equivalent
- Sign Business Associate Agreement (BAA) if handling PHI
- Undergo annual security review

### 6.2 Stripe Integration Security

- Webhook signatures must be verified for all events
- API keys must be rotated quarterly
- Test mode and live mode keys must be stored separately
- All payment flows must use Stripe.js tokenization

---

## 7. Compliance Requirements

### 7.1 Regulatory Framework

| Regulation | Applicability | Key Requirements |
|------------|--------------|------------------|
| PCI-DSS | Payment processing | SAQ-A compliance via Stripe |
| GDPR | EU customers | Data subject rights, breach notification |
| SOC 2 | Customer contracts | Security, availability controls |
| CCPA | California customers | Data access, deletion rights |

### 7.2 Audit Schedule

| Audit Type | Frequency | Scope |
|------------|-----------|-------|
| Internal security review | Quarterly | All systems |
| Penetration test | Annually | External perimeter |
| SOC 2 audit | Annually | All controls |
| PCI-DSS assessment | Annually | Payment flow |

---

## 8. Training and Awareness

### 8.1 Required Training

| Training | Frequency | Audience |
|----------|-----------|----------|
| Security awareness | Annual | All employees |
| Secure coding | Annual | Developers |
| Incident response | Quarterly | Security, SRE |
| Compliance overview | Annual | All employees |

### 8.2 Security Culture

- Report suspicious activity without fear of blame
- Question unusual requests, even from "executives"
- Verify identity before sharing sensitive information
- Use established channels for security concerns

---

## 9. Policy Enforcement

### 9.1 Compliance Monitoring

- Automated policy compliance checks
- Regular access reviews
- Configuration drift detection
- Security metric dashboards

### 9.2 Violation Handling

| Violation Level | Consequence |
|-----------------|-------------|
| Minor | Written warning, additional training |
| Moderate | Access suspension, formal review |
| Severe | Termination, legal action if warranted |

---

## 10. Policy Governance

### 10.1 Review and Updates

This policy must be reviewed:
- Quarterly by Security Team
- After any security incident
- When regulations change
- When systems change significantly

### 10.2 Exceptions

All policy exceptions must be:
- Documented with business justification
- Approved by Security Team lead
- Time-limited (maximum 90 days)
- Compensating controls implemented

### 10.3 Related Documents

- Incident Response Playbook (DOC-002)
- Backup Policy (DOC-003)
- Compliance Matrix (DOC-004)
- On-Call Playbook (DOC-005)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2024-05-03 | Security Team | Initial release |

---

*This document is classified as Internal and should not be shared externally without approval.*
