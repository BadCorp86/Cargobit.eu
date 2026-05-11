# CargoBit Access Control Policy
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument definiert die Zugriffssteuerungsrichtlinie für das CargoBit System. Es stellt sicher, dass der Zugriff auf Systeme und Daten kontrolliert, überwacht und dokumentiert ist.

---

# 2. Core Principles

| Principle | Description |
|-----------|-------------|
| Least Privilege | Nur minimal notwendige Rechte |
| Need-to-Know | Zugriff nur bei geschäftlicher Notwendigkeit |
| Separation of Duties | Kritische Funktionen auf mehrere Rollen verteilt |
| Accountability | Alle Zugriffe protokolliert |
| Regular Review | Regelmäßige Überprüfung der Rechte |

---

# 3. Role-Based Access Control (RBAC)

## 3.1 Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| Admin | System administration | Full access |
| Engineer | Development access | Development systems |
| SRE | Operations access | Production systems |
| Support | Customer support | Read-only + limited write |
| Auditor | Compliance review | Read-only |
| Viewer | Limited read access | Dashboards only |

## 3.2 Role Permissions

### Admin

| Permission | Systems |
|------------|---------|
| Full access | All systems |
| User management | IAM |
| Configuration | All services |
| Secrets access | All secrets |

### Engineer

| Permission | Systems |
|------------|---------|
| Read access | Production (with approval) |
| Write access | Development, Staging |
| Deploy | Staging |
| Secrets access | Non-production |

### SRE

| Permission | Systems |
|------------|---------|
| Full access | Production infrastructure |
| Deploy | Production |
| Secrets access | Production secrets |
| Database admin | Production DB |

### Support

| Permission | Systems |
|------------|---------|
| Read access | User data, transactions |
| Write access | Ticket system |
| No access | Infrastructure, secrets |

### Auditor

| Permission | Systems |
|------------|---------|
| Read access | Logs, configurations |
| No write access | All systems |

---

# 4. Access Provisioning

## 4.1 Request Process

```
1. Request submitted
   └── User requests access via ticket system

2. Manager approval
   └── Direct manager approves request

3. Security review (if needed)
   └── Security team reviews for sensitive access

4. Access granted
   └── IT provisions access

5. Documentation
   └── Access logged in IAM
```

## 4.2 Approval Requirements

| Access Type | Approver(s) |
|-------------|-------------|
| Standard role | Manager |
| Elevated access | Manager + Security |
| Production access | Manager + SRE Lead |
| Admin access | Manager + CTO |

---

# 5. Access Review

## 5.1 Review Schedule

| Review Type | Frequency | Scope |
|-------------|-----------|-------|
| User access review | Quarterly | All users |
| Role review | Annually | All roles |
| Privileged access | Monthly | Admin accounts |
| Service accounts | Quarterly | Service account inventory |

## 5.2 Review Process

```
1. Generate access report
   └── List all users and their permissions

2. Manager review
   └── Managers verify team members' access

3. Revoke unnecessary access
   └── Remove access no longer needed

4. Document changes
   └── Log all modifications

5. Report
   └── Summary to Security team
```

---

# 6. Authentication Requirements

## 6.1 Password Policy

| Requirement | Value |
|-------------|-------|
| Minimum length | 12 characters |
| Complexity | Upper, lower, number, special |
| History | Last 12 passwords |
| Expiry | 90 days |
| Lockout | 5 failed attempts |

## 6.2 Multi-Factor Authentication (MFA)

| Access Type | MFA Required |
|-------------|--------------|
| Production systems | Yes |
| Admin accounts | Yes |
| VPN access | Yes |
| Development systems | Recommended |
| Office access | Yes |

---

# 7. Service Accounts

## 7.1 Requirements

| Requirement | Description |
|-------------|-------------|
| Naming convention | svc-[service]-[environment] |
| No shared accounts | One service = one account |
| Limited scope | Minimum necessary permissions |
| Key rotation | Every 90 days |
| Documentation | Owner, purpose, expiry |

## 7.2 Management

| Activity | Frequency |
|----------|-----------|
| Inventory review | Quarterly |
| Key rotation | Every 90 days |
| Access audit | Monthly |

---

# 8. Offboarding

## 8.1 Offboarding Checklist

- [ ] Disable user account
- [ ] Revoke all access tokens
- [ ] Remove from all groups
- [ ] Transfer owned resources
- [ ] Archive user data
- [ ] Update documentation
- [ ] Confirm with manager

## 8.2 Timeline

| Action | Timeline |
|--------|----------|
| Account disabled | Same day |
| Access revoked | Same day |
| Data archived | Within 7 days |
| Final confirmation | Within 30 days |

---

# 9. Privileged Access

## 9.1 Definition

Privileged access includes:
- Admin accounts
- Database admin access
- Production deployment access
- Secrets management access
- Root/superuser accounts

## 9.2 Controls

| Control | Description |
|---------|-------------|
| Just-in-time access | Elevated access granted temporarily |
| Session recording | All privileged sessions recorded |
| Approval workflow | Manager approval for each use |
| Automatic expiration | Time-limited access |
| Enhanced logging | Detailed audit trail |

---

# 10. Access Logging

## 10.1 What is Logged

| Event | Details |
|-------|---------|
| Login attempts | User, time, success/failure |
| Access grants | Who, what, when, approver |
| Access revocations | Who, what, when, reason |
| Privileged actions | User, action, target, time |
| Failed access attempts | User, resource, time |

## 10.2 Log Retention

| Log Type | Retention |
|----------|-----------|
| Authentication logs | 90 days |
| Authorization logs | 1 year |
| Privileged access logs | 2 years |
| Failed attempts | 90 days |

---

# 11. Incident Response

## 11.1 Access-Related Incidents

| Incident | Response |
|----------|----------|
| Unauthorized access | Revoke access, investigate |
| Compromised account | Disable account, reset credentials |
| Privilege escalation | Revoke, investigate, audit |
| Shared credentials | Reset, enforce policy |

## 11.2 Reporting

| Incident | Report To | Timeline |
|----------|-----------|----------|
| Compromised account | Security team | Immediately |
| Unauthorized access | Security team | Within 1 hour |
| Policy violation | Manager + Security | Within 24 hours |

---

# 12. Compliance

## 12.1 Requirements Mapping

| Requirement | Implementation |
|-------------|----------------|
| PCI-DSS 7.x | RBAC, least privilege |
| GDPR Art. 32 | Access controls |
| SOC2 CC6 | Logical access |

---

# 13. Summary

Diese Policy stellt sicher, dass der Zugriff auf Systeme und Daten kontrolliert, überwacht und dokumentiert ist.

---

# 14. Contact

Security Team
CargoBit Internal
