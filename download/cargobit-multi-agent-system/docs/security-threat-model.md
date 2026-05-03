# CargoBit Security Threat Model (STRIDE)
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument beschreibt das Sicherheits-Threat-Modell für das CargoBit System basierend auf dem STRIDE-Framework. Es identifiziert Bedrohungen und deren Minderungsmaßnahmen.

---

# 2. STRIDE Overview

| Threat | Description |
|--------|-------------|
| **S**poofing | Impersonating something or someone |
| **T**ampering | Modifying data or code |
| **R**epudiation | Claiming to have not performed an action |
| **I**nformation Disclosure | Exposing information to unauthorized parties |
| **D**enial of Service | Making a system unavailable |
| **E**levation of Privilege | Gaining unauthorized access |

---

# 3. System Components

| Component | Description |
|-----------|-------------|
| API Gateway | Entry point for all API requests |
| Payment Service | Handles payment processing |
| Webhook Handler | Processes Stripe webhooks |
| Ledger Service | Manages financial records |
| Database | Stores all data |
| Redis | Rate limiting cache |
| Backup System | Data backup and restore |

---

# 4. Threat Analysis

## 4.1 Spoofing

| Threat | Component | Mitigation |
|--------|-----------|------------|
| API key theft | API Gateway | Secure storage, rotation policy, IP restrictions |
| Webhook spoofing | Webhook Handler | HMAC signature validation |
| JWT token theft | API Gateway | Short expiration, secure storage |
| Service impersonation | All services | TLS, service authentication |

### Mitigation Details

**Webhook Signature Validation:**
```typescript
// Validate HMAC-SHA256 signature
function validateSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

---

## 4.2 Tampering

| Threat | Component | Mitigation |
|--------|-----------|------------|
| Data modification in transit | All connections | TLS 1.2+ |
| Ledger manipulation | Database | Immutable entries |
| Audit log modification | Database | Hash chain |
| Configuration tampering | All services | Version control, access control |
| Backup corruption | Backup System | Encryption, integrity checks |

### Mitigation Details

**Hash Chain for Audit Logs:**
```sql
-- Each audit log entry references the previous hash
INSERT INTO "AuditLog" (id, action, previous_hash, hash)
VALUES (
  'audit_123',
  'payment.created',
  (SELECT hash FROM "AuditLog" ORDER BY created_at DESC LIMIT 1),
  compute_hash(previous_hash, action, timestamp)
);
```

---

## 4.3 Repudiation

| Threat | Component | Mitigation |
|--------|-----------|------------|
| Denying transaction | Payment Service | Audit logs with timestamps |
| Denying configuration change | All services | Version-controlled configs |
| Denying access | API Gateway | Access logging |
| Denying deployment | CI/CD | Deployment logs |

### Mitigation Details

**Audit Logging:**
- All actions logged with user, timestamp, action
- Logs are immutable (insert-only)
- Hash chain ensures integrity
- Logs retained per policy

---

## 4.4 Information Disclosure

| Threat | Component | Mitigation |
|--------|-----------|------------|
| API key exposure | API Gateway | Secure storage, no logging |
| PII leakage | Database | Encryption, access control |
| Log data exposure | Logging | No PII in logs |
| Error message leakage | All services | Generic error messages |
| Backup exposure | Backup System | Encryption |

### Mitigation Details

**No PII in Logs:**
```typescript
// Sanitize log data before logging
function sanitizeForLog(data: any): any {
  const sensitive = ['password', 'apiKey', 'token', 'email', 'name'];
  const sanitized = { ...data };
  for (const key of Object.keys(sanitized)) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}
```

---

## 4.5 Denial of Service

| Threat | Component | Mitigation |
|--------|-----------|------------|
| API flood | API Gateway | Rate limiting |
| Webhook flood | Webhook Handler | Rate limiting, queue |
| DB connection exhaustion | Database | Connection pooling |
| Storage exhaustion | All | Monitoring, quotas |
| DNS attacks | Infrastructure | Multiple DNS providers |

### Mitigation Details

**Rate Limiting (Token Bucket):**
```typescript
const rateLimiter = new TokenBucket({
  capacity: 100,      // Max tokens
  refillRate: 10,     // Tokens per second
  refillTime: 1000    // Refill interval (ms)
});

async function checkRateLimit(key: string): Promise<boolean> {
  return rateLimiter.consume(key, 1);
}
```

---

## 4.6 Elevation of Privilege

| Threat | Component | Mitigation |
|--------|-----------|------------|
| Unauthorized admin access | API | RBAC, MFA |
| SQL injection | Database | Parameterized queries |
| Command injection | All services | Input validation |
| Privilege escalation via API | API | Authorization checks |
| Service account abuse | All services | Least privilege |

### Mitigation Details

**RBAC Implementation:**
```typescript
enum Role {
  VIEWER = 'viewer',
  ENGINEER = 'engineer',
  ADMIN = 'admin'
}

const permissions: Record<Role, string[]> = {
  [Role.VIEWER]: ['read:payments', 'read:wallets'],
  [Role.ENGINEER]: ['read:*', 'write:payments'],
  [Role.ADMIN]: ['*']
};

function hasPermission(role: Role, permission: string): boolean {
  const rolePermissions = permissions[role];
  return rolePermissions.includes('*') || rolePermissions.includes(permission);
}
```

---

# 5. Attack Surface Map

```
┌─────────────────────────────────────────────────────────────┐
│                      ATTACK SURFACE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   External                                                   │
│   ├── API Gateway (HTTPS)                                   │
│   │   ├── Rate limiting                                     │
│   │   ├── Authentication                                    │
│   │   └── Authorization                                     │
│   │                                                          │
│   └── Webhook Endpoint (HTTPS)                              │
│       ├── Signature validation                              │
│       └── Idempotency                                       │
│                                                              │
│   Internal                                                   │
│   ├── Database (TLS)                                        │
│   ├── Redis (TLS)                                           │
│   └── Backup Storage (Encrypted)                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

# 6. Threat Modeling Process

## 6.1 When to Update

- New feature development
- Architecture changes
- Security incidents
- Quarterly review

## 6.2 Review Process

1. Identify new components or changes
2. Analyze each STRIDE category
3. Document threats and mitigations
4. Review with security team
5. Update this document

---

# 7. Summary

Dieses Threat Model identifiziert Bedrohungen und deren Minderungsmaßnahmen basierend auf dem STRIDE-Framework.

---

# 8. Contact

Security Team
CargoBit Internal
