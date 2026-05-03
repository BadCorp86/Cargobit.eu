# CargoBit Data Classification Policy
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument definiert die Datenklassifizierung für das CargoBit System. Es stellt sicher, dass Daten entsprechend ihrer Sensibilität behandelt und geschützt werden.

---

# 2. Classification Levels

| Level | Name | Description | Examples |
|-------|------|-------------|----------|
| 1 | Public | Unkritisch, öffentlich | Marketing-Materialien |
| 2 | Internal | Intern, nicht öffentlich | Interne Dokumente |
| 3 | Confidential | Geschäftsrelevant | Partnerverträge, Roadmaps |
| 4 | Restricted | Hochsensibel | Zahlungsdaten, API-Keys |

---

# 3. Data Categories

## 3.1 Restricted (Level 4)

| Data Type | Description | Handling |
|-----------|-------------|----------|
| API Keys | Authentication credentials | Encrypted, access controlled |
| Payment data | Financial transactions | Encrypted, audit logged |
| Wallet balances | User funds | Encrypted, audit logged |
| PII | Personal identifiable information | Encrypted, GDPR compliant |
| Audit logs | System event records | Immutable, access controlled |

## 3.2 Confidential (Level 3)

| Data Type | Description | Handling |
|-----------|-------------|----------|
| Partner contracts | Legal agreements | Access controlled |
| Financial reports | Business metrics | Access controlled |
| Architecture docs | System design | Internal access |
| Incident reports | Postmortems | Internal access |

## 3.3 Internal (Level 2)

| Data Type | Description | Handling |
|-----------|-------------|----------|
| Internal docs | Procedures, guidelines | Internal access |
| Team communications | Slack, email | Internal access |
| Non-sensitive configs | Configuration files | Internal access |

## 3.4 Public (Level 1)

| Data Type | Description | Handling |
|-----------|-------------|----------|
| Marketing materials | Public content | No restrictions |
| Public API docs | Integration guides | No restrictions |
| Status page | Service status | No restrictions |

---

# 4. Handling Requirements

## 4.1 By Classification Level

| Requirement | Public | Internal | Confidential | Restricted |
|-------------|--------|----------|--------------|------------|
| Encryption at rest | Optional | Optional | Required | Required |
| Encryption in transit | Optional | Required | Required | Required |
| Access control | None | Basic | Required | Required + MFA |
| Audit logging | None | Optional | Required | Required |
| Retention period | Unlimited | 3 years | 7 years | 10 years |
| Disposal | Standard | Standard | Secure | Secure + verified |

## 4.2 Access Control

| Level | Who Can Access | Approval Required |
|-------|----------------|-------------------|
| Public | Anyone | None |
| Internal | Employees | None |
| Confidential | Need-to-know | Manager |
| Restricted | Authorized personnel | Manager + Security |

---

# 5. Data Lifecycle

## 5.1 Creation

| Level | Requirements |
|-------|--------------|
| Public | None |
| Internal | Creator responsibility |
| Confidential | Owner assignment |
| Restricted | Owner + access control setup |

## 5.2 Storage

| Level | Requirements |
|-------|--------------|
| Public | Standard storage |
| Internal | Standard storage |
| Confidential | Encrypted storage |
| Restricted | Encrypted + access-controlled |

## 5.3 Sharing

| Level | Internal | External |
|-------|----------|----------|
| Public | Allowed | Allowed |
| Internal | Allowed | With approval |
| Confidential | Need-to-know | With approval + NDA |
| Restricted | Need-to-know | Generally prohibited |

## 5.4 Disposal

| Level | Method |
|-------|--------|
| Public | Standard deletion |
| Internal | Standard deletion |
| Confidential | Secure deletion |
| Restricted | Secure deletion + verification |

---

# 6. Specific Data Types

## 6.1 Payment Data

| Aspect | Requirement |
|--------|-------------|
| Classification | Restricted |
| Storage | Ledger tables (immutable) |
| Retention | 10 years (legal requirement) |
| Access | Finance team + authorized |
| Encryption | Required |

## 6.2 API Keys

| Aspect | Requirement |
|--------|-------------|
| Classification | Restricted |
| Storage | Secrets manager (never in code) |
| Retention | Until revoked |
| Access | Engineering + SRE |
| Rotation | Every 90 days |

## 6.3 User Data (PII)

| Aspect | Requirement |
|--------|-------------|
| Classification | Restricted |
| Storage | Encrypted database |
| Retention | Account lifetime + 30 days |
| Access | Support + authorized |
| GDPR rights | Implemented |

## 6.4 Audit Logs

| Aspect | Requirement |
|--------|-------------|
| Classification | Confidential |
| Storage | Immutable audit table |
| Retention | 180 days |
| Access | Security + Compliance |
| Integrity | Hash chain verified |

---

# 7. Responsibilities

## 7.1 Data Owners

| Responsibility | Description |
|----------------|-------------|
| Classification | Assign appropriate level |
| Access control | Define who can access |
| Lifecycle management | Ensure proper handling |
| Review | Periodic access reviews |

## 7.2 Data Custodians

| Responsibility | Description |
|----------------|-------------|
| Technical controls | Implement security measures |
| Access provisioning | Grant/remove access |
| Monitoring | Monitor access and usage |
| Disposal | Secure data disposal |

## 7.3 Data Users

| Responsibility | Description |
|----------------|-------------|
| Compliance | Follow handling requirements |
| Reporting | Report incidents |
| Access | Use only authorized data |

---

# 8. Incident Handling

## 8.1 Classification Incidents

| Incident Type | Response |
|---------------|----------|
| Misclassification | Re-classify, review impact |
| Unauthorized access | Investigate, revoke access |
| Data leak | Incident response, notification |
| Disposal failure | Investigate, remediate |

## 8.2 Reporting

| Incident | Report To | Timeline |
|----------|-----------|----------|
| Data leak | Security team + DPO | Immediately |
| Unauthorized access | Security team | Within 1 hour |
| Misclassification | Data owner | Within 24 hours |

---

# 9. Compliance

## 9.1 Regulatory Requirements

| Regulation | Relevant Classifications |
|------------|-------------------------|
| GDPR | PII, User data |
| PCI-DSS | Payment data |
| SOC2 | Confidential, Restricted |

## 9.2 Auditing

| Audit Type | Frequency |
|------------|-----------|
| Access review | Quarterly |
| Classification review | Annually |
| Handling compliance | Quarterly |

---

# 10. Summary

Diese Policy stellt sicher, dass Daten entsprechend ihrer Sensibilität behandelt und geschützt werden.

---

# 11. Contact

Security Team
CargoBit Internal
