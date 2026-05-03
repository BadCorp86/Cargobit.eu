# CargoBit System Hardening Guide
## Security, Operations & Compliance Hardening

**Version:** 1.0  
**Classification:** Internal Use Only  
**Last Review:** 2024-Q4  

---

# Inhaltsverzeichnis

1. [Einführung](#1-einführung)
2. [Security Hardening](#2-security-hardening)
3. [Infrastructure Hardening](#3-infrastructure-hardening)
4. [Application Hardening](#4-application-hardening)
5. [Database Hardening](#5-database-hardening)
6. [Network Hardening](#6-network-hardening)
7. [Compliance Hardening](#7-compliance-hardening)
8. [Operational Hardening](#8-operational-hardening)
9. [Threat Model](#9-threat-model)
10. [Security Checklist](#10-security-checklist)
11. [Hardening Validation](#11-hardening-validation)
12. [Appendix](#12-appendix)

---

# 1. Einführung

## 1.1 Zweck

Dieses Dokument definiert die Hardening-Anforderungen für das CargoBit Payment Foundation System. Es deckt alle Aspekte der Systemabsicherung ab, von der Netzwerk-Ebene bis zur Applikations-Ebene, und stellt sicher, dass das System den Anforderungen von PCI-DSS, GDPR und SOC 2 Type 2 entspricht.

## 1.2 Geltungsbereich

| Komponente | Hardening-Level | Priorität |
|-----------|-----------------|-----------|
| PostgreSQL Database | Critical | P0 |
| Redis Cache | High | P1 |
| Application Services | Critical | P0 |
| Webhook Endpoints | Critical | P0 |
| Audit Log System | Critical | P0 |
| CI/CD Pipeline | High | P1 |
| Backup Systems | High | P1 |

## 1.3 Compliance-Framework

Das System muss folgende Standards erfüllen:

- **PCI-DSS SAQ-A**: Payment Card Industry Data Security Standard
- **GDPR**: General Data Protection Regulation
- **SOC 2 Type 2**: Service Organization Control
- **ISO 27001**: Information Security Management (empfohlen)

---

# 2. Security Hardening

## 2.1 Authentication & Authorization

### 2.1.1 Service-to-Service Authentication

```
┌─────────────────────────────────────────────────────────────┐
│                 Service Authentication Flow                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Service A ──► API Gateway ──► Auth Middleware ──► Service B│
│       │              │               │               │      │
│       │              │               │               │      │
│       └── mTLS ◄─────┘◄── JWT ◄──────┘◄── RBAC ◄────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Anforderungen:**

| Mechanismus | Implementierung | Status |
|------------|-----------------|--------|
| mTLS | Mutual TLS für alle internen Services | Required |
| JWT | Short-lived Tokens (15 min) | Required |
| API Keys | Rotierbar, min. 32 Zeichen | Required |
| RBAC | Role-based Access Control | Required |

### 2.1.2 Stripe Webhook Authentication

```typescript
// SICHER: Stripe Signature Verification
import Stripe from 'stripe';

function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string,
  secret: string,
  tolerance: number = 300 // 5 minutes
): Stripe.Event {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  
  // Zeit-basierte Replay-Attack Prevention
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    secret,
    { tolerance }
  );
  
  return event;
}
```

**Validierungs-Checkliste:**

- [ ] Stripe Signature Header vorhanden
- [ ] Timestamp innerhalb Toleranz (±5 min)
- [ ] Signature validiert gegen Webhook Secret
- [ ] Event ID auf Duplikate geprüft (Idempotency)

### 2.1.3 Rate Limiting

```typescript
// Token Bucket Implementation
interface RateLimitConfig {
  points: number;           // Max requests
  duration: number;         // Time window in seconds
  blockDuration: number;    // Block time on exceeded
  inmemoryBlockOnConsumed: number; // Immediate block threshold
}

const RATE_LIMITS = {
  // Webhook Endpoints
  'webhook:stripe': { points: 100, duration: 60, blockDuration: 300 },
  
  // API Endpoints  
  'api:public': { points: 1000, duration: 3600, blockDuration: 600 },
  'api:authenticated': { points: 5000, duration: 3600, blockDuration: 300 },
  
  // Internal Services
  'internal:service': { points: 10000, duration: 60, blockDuration: 60 }
};
```

## 2.2 Secrets Management

### 2.2.1 Secrets Classification

| Level | Typ | Speicherort | Rotation |
|-------|-----|-------------|----------|
| **L1 - Critical** | DB Passwords, API Keys | HashiCorp Vault | 30 Tage |
| **L2 - High** | Stripe Secrets, JWT Keys | Encrypted Env Vars | 90 Tage |
| **L3 - Medium** | Service Tokens, Nonces | Secrets Manager | 180 Tage |
| **L4 - Low** | Public Keys, Config | Config Files | N/A |

### 2.2.2 Secrets Storage Requirements

```yaml
# Kubernetes Secrets (Production)
apiVersion: v1
kind: Secret
metadata:
  name: cargobit-secrets
  namespace: cargobit-prod
type: Opaque
data:
  DATABASE_URL: <base64-encoded>
  STRIPE_SECRET_KEY: <base64-encoded>
  STRIPE_WEBHOOK_SECRET: <base64-encoded>
  REDIS_URL: <base64-encoded>
  AUDIT_HASH_SECRET: <base64-encoded>
```

**NIEMALS:**

```bash
# VERBOTEN - Secrets in Code
const apiKey = "sk_live_xxxx";  // ❌ NEVER

# VERBOTEN - Secrets in Logs
console.log(`Connecting with password: ${password}`);  // ❌ NEVER

# VERBOTEN - Secrets in Git
git add .env.production  // ❌ NEVER
```

## 2.3 Encryption

### 2.3.1 Encryption at Rest

| Daten | Algorithmus | Key-Länge |
|-------|------------|-----------|
| Database (PostgreSQL) | AES-256-GCM | 256-bit |
| Redis Cache | AES-256-GCM | 256-bit |
| Backups | AES-256-GCM | 256-bit |
| Audit Logs | SHA-256 Hash Chain | N/A |

### 2.3.2 Encryption in Transit

```
┌─────────────────────────────────────────────────────────────┐
│                    TLS Requirements                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client ──► Load Balancer ──► API Gateway ──► Service      │
│     │            │               │               │         │
│   TLS 1.3     TLS 1.3         mTLS 1.3        mTLS 1.3     │
│                                                             │
│  Cipher Suites:                                             │
│  - TLS_AES_256_GCM_SHA384                                   │
│  - TLS_CHACHA20_POLY1305_SHA256                             │
│  - TLS_AES_128_GCM_SHA256                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3.3 Audit Log Hash Chain

```typescript
// Deterministische Hash-Chain für Audit Logs
interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: string;
  metadata: Record<string, unknown>;
  previousHash: string;
  hash: string;
}

function computeHash(entry: Omit<AuditEntry, 'hash'>): string {
  // Deterministisch: Alphabetisch sortierte Felder
  const payload = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    actor: entry.actor,
    metadata: sortObjectKeys(entry.metadata),
    previousHash: entry.previousHash
  }, Object.keys(payload).sort());
  
  return crypto
    .createHmac('sha256', process.env.AUDIT_HASH_SECRET!)
    .update(payload)
    .digest('hex');
}
```

---

# 3. Infrastructure Hardening

## 3.1 Container Security

### 3.1.1 Container Requirements

```dockerfile
# Empfohlene Dockerfile-Struktur
FROM node:20-alpine AS builder

# Non-root User erstellen
RUN addgroup -g 1001 -S cargobit && \
    adduser -u 1001 -S cargobit -G cargobit

# Minimal Base Image
FROM node:20-alpine

# Security Updates
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache dumb-init

# Read-only Filesystem
COPY --from=builder --chown=cargobit:cargobit /app /app
WORKDIR /app

# Non-root User
USER cargobit

# Health Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# Init System für Graceful Shutdown
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### 3.1.2 Container Security Policy

| Policy | Wert | Begründung |
|--------|------|------------|
| Run as Non-root | Required | Privilege Escalation Prevention |
| Read-only Root FS | Required | Immutable Infrastructure |
| No Privileged Mode | Required | Container Escape Prevention |
| Drop All Capabilities | Required | Minimal Attack Surface |
| Resource Limits | Required | DoS Prevention |

```yaml
# Kubernetes Security Context
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
  seccompProfile:
    type: RuntimeDefault
```

## 3.2 Kubernetes Hardening

### 3.2.1 Pod Security Standards

```yaml
# Pod Security Policy - Restricted
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: cargobit-restricted
spec:
  privileged: false
  runAsUser:
    rule: MustRunAsNonRoot
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
  supplementalGroups:
    rule: RunAsAny
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
```

### 3.2.2 Network Policies

```yaml
# Network Policy - Default Deny All
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cargobit-default-deny
  namespace: cargobit-prod
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Network Policy - Allow Specific Traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cargobit-allow
  namespace: cargobit-prod
spec:
  podSelector:
    matchLabels:
      app: cargobit-api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: databases
      ports:
        - protocol: TCP
          port: 5432  # PostgreSQL
        - protocol: TCP
          port: 6379  # Redis
    - to:
        - namespaceSelector: {}  # DNS
      ports:
        - protocol: UDP
          port: 53
```

## 3.3 Resource Management

### 3.3.1 Resource Limits

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|-------------|-----------|----------------|--------------|
| API Gateway | 250m | 1000m | 256Mi | 512Mi |
| Payment Service | 500m | 2000m | 512Mi | 1Gi |
| Webhook Handler | 250m | 1000m | 256Mi | 512Mi |
| Audit Service | 250m | 500m | 256Mi | 512Mi |
| Worker | 500m | 1000m | 512Mi | 1Gi |

### 3.3.2 Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cargobit-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cargobit-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
```

---

# 4. Application Hardening

## 4.1 Input Validation

### 4.1.1 Validation Rules

```typescript
import { z } from 'zod';

// Stripe Webhook Event Validation
const StripeEventSchema = z.object({
  id: z.string().startsWith('evt_'),
  object: z.literal('event'),
  type: z.string(),
  data: z.object({
    object: z.record(z.unknown())
  }),
  created: z.number(),
  livemode: z.boolean()
});

// Payment Intent Validation
const PaymentIntentSchema = z.object({
  id: z.string().startsWith('pi_'),
  amount: z.number().int().positive().max(99999999), // Max ~$1M
  currency: z.string().length(3).regex(/^[a-z]{3}$/),
  status: z.enum(['requires_payment_method', 'requires_confirmation', 
                  'processing', 'succeeded', 'canceled', 'failed']),
  metadata: z.record(z.string()).optional()
});
```

### 4.1.2 Sanitization Requirements

| Input Type | Validierung | Sanitisierung |
|-----------|-------------|---------------|
| IDs | Regex: `^[a-zA-Z0-9_-]+$` | Trim, Lowercase |
| Amounts | Range: 1 - 99999999 | ParseInt, Round |
| Currency | ISO 4217 | Uppercase, Trim |
| Webhook Payload | JSON Schema | UTF-8 Decode |
| User Input | Type-specific | Escape HTML |

## 4.2 Error Handling

### 4.2.1 Secure Error Response

```typescript
// PRODUCTION: Keine internen Details
interface ErrorResponse {
  error: {
    code: string;      // z.B. "PAYMENT_FAILED"
    message: string;   // User-friendly
    requestId: string; // Für Support
  }
}

// NIEMALS Stack Traces oder interne Details preisgeben
app.use((err, req, res, next) => {
  // Log intern mit vollständigen Details
  logger.error('Unhandled error', {
    error: err,
    stack: err.stack,
    requestId: req.id,
    path: req.path
  });
  
  // Extern: Nur sichere Informationen
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.status < 500 
        ? err.message 
        : 'An unexpected error occurred',
      requestId: req.id
    }
  });
});
```

### 4.2.2 Error Code Mapping

| Internal Code | HTTP Status | External Message |
|--------------|-------------|------------------|
| `STRIPE_SIGNATURE_INVALID` | 400 | Invalid request signature |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `EVENT_ALREADY_PROCESSED` | 200 | OK (idempotent) |
| `DATABASE_CONNECTION_FAILED` | 503 | Service temporarily unavailable |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |

## 4.3 Logging & Monitoring

### 4.3.1 Logging Standards

```typescript
// Structured Logging mit Pino
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() })
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.cardNumber',
      'res.body.stripeSignature'
    ],
    censor: '[REDACTED]'
  }
});

// Sichere Log-Einträge
logger.info({
  eventId: event.id,
  eventType: event.type,
  processingTime: Date.now() - startTime,
  status: 'success'
}, 'Webhook processed successfully');
```

### 4.3.2 Audit Trail Requirements

| Event | Log Level | Felder |
|-------|-----------|--------|
| Payment Created | INFO | userId, amount, currency, paymentId |
| Payment Success | INFO | paymentId, stripeId, amount |
| Payment Failed | WARN | paymentId, errorCode, reason |
| Webhook Received | INFO | eventType, eventId, source |
| Auth Failure | WARN | ip, userAgent, reason |
| Rate Limit Hit | WARN | ip, endpoint, limit |
| Data Access | INFO | userId, resource, action |

### 4.3.3 Monitoring Alerts

```yaml
# Alert Rules
groups:
  - name: cargobit-critical
    rules:
      - alert: PaymentProcessingDown
        expr: rate(payment_processed_total[5m]) == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "No payments processed in last 5 minutes"
          
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
          
      - alert: AuditLogChainBroken
        expr: audit_chain_valid == 0
        for: 1m
        labels:
          severity: critical
        
      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_activity_count / pg_settings_max_connections > 0.9
        for: 2m
        labels:
          severity: warning
```

---

# 5. Database Hardening

## 5.1 PostgreSQL Security

### 5.1.1 Connection Security

```sql
-- pg_hba.conf - strikte Authentifizierung
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
host    cargobit_prod   cargobit_app    10.0.0.0/8              scram-sha-256
host    cargobit_prod   cargobit_app    172.16.0.0/12           scram-sha-256
hostssl replication      replicator      10.0.0.0/8              scram-sha-256

-- Alle anderen Verbindungen verweigern
host    all             all             all                     reject
```

### 5.1.2 Role-Based Access Control

```sql
-- Application Role (Minimale Rechte)
CREATE ROLE cargobit_app WITH LOGIN PASSWORD '${APP_PASSWORD}';
GRANT CONNECT ON DATABASE cargobit_prod TO cargobit_app;
GRANT USAGE ON SCHEMA public TO cargobit_app;

-- Read-Write Zugriff nur auf notwendige Tabellen
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO cargobit_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cargobit_app;

-- Audit Role (Nur Lesen)
CREATE ROLE cargobit_audit WITH LOGIN PASSWORD '${AUDIT_PASSWORD}';
GRANT CONNECT ON DATABASE cargobit_prod TO cargobit_audit;
GRANT SELECT ON audit_logs TO cargobit_audit;

-- Backup Role
CREATE ROLE cargobit_backup WITH LOGIN PASSWORD '${BACKUP_PASSWORD}';
GRANT pg_read_all_data TO cargobit_backup;
```

### 5.1.3 Row-Level Security

```sql
-- Row-Level Security für Tenant Isolation
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy für Application User
CREATE POLICY app_payments_policy ON payments
  FOR ALL TO cargobit_app
  USING (organization_id = current_setting('app.organization_id')::uuid);

-- Policy für Audit Logs (Nur Lesen)
CREATE POLICY audit_read_policy ON audit_logs
  FOR SELECT TO cargobit_audit
  USING (organization_id = current_setting('app.organization_id')::uuid);
```

## 5.2 Redis Security

### 5.2.1 Redis Configuration

```conf
# redis.conf - Hardened Configuration

# Network
bind 127.0.0.1 10.0.0.0/8
protected-mode yes
port 0  # Unix Socket only

# Unix Socket
unixsocket /var/run/redis/redis.sock
unixsocketperm 770

# Authentication
requirepass ${REDIS_PASSWORD}
aclfile /etc/redis/users.acl

# Memory Management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Security
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""
rename-command CONFIG ""
rename-command DEBUG ""

# Persistence
appendonly yes
appendfsync everysec
```

### 5.2.2 ACL Configuration

```conf
# /etc/redis/users.acl

# Default: Keine Berechtigungen
user default off

# Application User: Nur Cache-Operationen
user cargobit_app on >${REDIS_APP_PASSWORD} ~* &* +@read +@write +@connection -@dangerous

# Backup User: Nur Read
user cargobit_backup on >${REDIS_BACKUP_PASSWORD} ~* &* +@read +@connection
```

## 5.3 Backup & Recovery

### 5.3.1 Backup Strategy

| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| Full | Täglich | 30 Tage | Encrypted S3 |
| Incremental | Stündlich | 7 Tage | Encrypted S3 |
| WAL Archive | Kontinuierlich | 7 Tage | Encrypted S3 |
| PITR | Kontinuierlich | 7 Tage | Encrypted S3 |

### 5.3.2 Backup Script (Hardened)

```bash
#!/bin/bash
# backup-db.sh - Hardened Database Backup
set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/postgresql"
S3_BUCKET="s3://cargobit-backups/postgresql"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/cargobit_${TIMESTAMP}.sql.gz.enc"

# Pre-flight Checks
[[ -z "${ENCRYPTION_KEY}" ]] && { echo "ERROR: BACKUP_ENCRYPTION_KEY not set"; exit 1; }
[[ -d "${BACKUP_DIR}" ]] || mkdir -p "${BACKUP_DIR}"

# Create Backup (Read-Only User)
pg_dump -U cargobit_backup -d cargobit_prod --format=plain --no-owner --no-acl | \
  gzip | \
  openssl enc -aes-256-gcm -salt -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY > "${BACKUP_FILE}"

# Verify Backup
[[ -s "${BACKUP_FILE}" ]] || { echo "ERROR: Backup file is empty"; exit 1; }

# Upload to S3 with Server-Side Encryption
aws s3 cp "${BACKUP_FILE}" "${S3_BUCKET}/" \
  --sse aws:kms \
  --sse-kms-key-id "${KMS_KEY_ID}" \
  --metadata "timestamp=${TIMESTAMP},database=cargobit_prod"

# Cleanup Local (Keep 3 Days)
find "${BACKUP_DIR}" -name "*.sql.gz.enc" -mtime +3 -delete

# Verify Integrity
BACKUP_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}")
echo "Backup completed: ${BACKUP_FILE} (${BACKUP_SIZE} bytes)"
```

### 5.3.3 Recovery Procedures

```bash
#!/bin/bash
# restore-db.sh - Database Recovery
set -euo pipefail

BACKUP_FILE="${1:-}"
TARGET_DATABASE="${2:-cargobit_recovery}"

# Validation
[[ -z "${BACKUP_FILE}" ]] && { echo "Usage: $0 <backup-file> [target-db]"; exit 1; }
[[ -f "${BACKUP_FILE}" ]] || { echo "ERROR: Backup file not found"; exit 1; }

# Decrypt and Restore
openssl enc -d -aes-256-gcm -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY < "${BACKUP_FILE}" | \
  gunzip | \
  psql -U postgres -d "${TARGET_DATABASE}"

echo "Restore completed to database: ${TARGET_DATABASE}"
```

---

# 6. Network Hardening

## 6.1 Firewall Rules

### 6.1.1 Ingress Rules

| Source | Destination | Port | Protocol | Purpose |
|--------|-------------|------|----------|---------|
| 0.0.0.0/0 | Load Balancer | 443 | HTTPS | Public API |
| Stripe IPs | Webhook Handler | 443 | HTTPS | Webhooks |
| VPN CIDR | Bastion | 22 | SSH | Admin Access |
| Internal | API Services | 3000 | HTTP | Service Mesh |

### 6.1.2 Egress Rules

| Source | Destination | Port | Protocol | Purpose |
|--------|-------------|------|----------|---------|
| API Services | Stripe API | 443 | HTTPS | Payment Processing |
| API Services | PostgreSQL | 5432 | TLS | Database |
| API Services | Redis | 6379 | TLS | Cache |
| All | DNS | 53 | UDP/TCP | DNS Resolution |

## 6.2 DDoS Protection

### 6.2.1 Rate Limiting Layers

```
┌─────────────────────────────────────────────────────────────┐
│                   Rate Limiting Layers                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: CDN/WAF                                           │
│  ├── Global Rate Limit: 100K req/sec                        │
│  ├── Geo-blocking (Optional)                                │
│  └── Bot Detection                                          │
│                                                             │
│  Layer 2: Load Balancer                                     │
│  ├── IP-based: 1000 req/min per IP                          │
│  └── Path-based: Specialized limits                         │
│                                                             │
│  Layer 3: Application                                       │
│  ├── Token Bucket per User                                  │
│  ├── Sliding Window per Endpoint                            │
│  └── Redis-backed distributed limiting                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2.2 WAF Rules

```yaml
# Web Application Firewall Rules
waf_rules:
  - name: block-sql-injection
    action: block
    conditions:
      - type: sql-injection
      
  - name: block-xss
    action: block
    conditions:
      - type: xss
      
  - name: limit-webhook-endpoint
    action: rate-limit
    rate: 100/minute
    conditions:
      - path: /webhooks/stripe
      
  - name: geo-block-high-risk
    action: challenge
    conditions:
      - country: [XX, YY]  # High-risk countries
      - path: /api/*
```

---

# 7. Compliance Hardening

## 7.1 PCI-DSS Requirements

### 7.1.1 SAQ-A Compliance Checklist

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **1.1** Firewall Configuration | ✅ | Network Policies |
| **1.2** Network Segmentation | ✅ | Kubernetes Namespaces |
| **1.3** Public Access Restriction | ✅ | Ingress Rules |
| **2.1** Default Passwords Changed | ✅ | Secrets Management |
| **2.2** Unnecessary Services Disabled | ✅ | Container Hardening |
| **2.3** Encryption of Card Data | ✅ | Stripe Hosted |
| **3.1** Cardholder Data Storage | ✅ | No Storage (Stripe) |
| **4.1** Encryption in Transit | ✅ | TLS 1.3 |
| **6.1** Security Patching | ✅ | Automated Updates |
| **6.2** Secure Development | ✅ | Code Review, SAST |
| **6.3** Change Management | ✅ | CI/CD Pipeline |
| **7.1** Access Control | ✅ | RBAC |
| **8.1** User Identification | ✅ | SSO, MFA |
| **9.1** Physical Access | ✅ | Cloud Provider |
| **10.1** Audit Logs | ✅ | Hash Chain |
| **11.1** Vulnerability Scanning | ✅ | Weekly Scans |
| **12.1** Security Policy | ✅ | Documentation |

### 7.1.2 Cardholder Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│               PCI-DSS Scope Boundary                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Customer Browser                                           │
│       │                                                     │
│       ▼                                                     │
│  Stripe.js (PCI-DSS Level 1) ◄── Cardholder Data           │
│       │                                                     │
│       ▼                                                     │
│  Stripe Infrastructure (PCI-DSS Level 1)                    │
│       │                                                     │
│       ▼                                                     │
│  Webhook (Token Only) ◄── NO Cardholder Data               │
│       │                                                     │
│       ▼                                                     │
│  CargoBit System (Out of PCI Scope)                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 7.2 GDPR Compliance

### 7.2.1 Data Subject Rights

| Right | Implementation | Status |
|-------|---------------|--------|
| Access (Art. 15) | Export API Endpoint | ✅ |
| Rectification (Art. 16) | Update Profile API | ✅ |
| Erasure (Art. 17) | Soft Delete + Anonymization | ✅ |
| Portability (Art. 20) | JSON Export | ✅ |
| Object (Art. 21) | Opt-out Mechanism | ✅ |

### 7.2.2 Data Retention Policy

```sql
-- Automated Retention Cleanup
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Audit Logs: 7 Jahre aufbewahren
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '7 years';
  
  -- Session Data: 30 Tage
  DELETE FROM sessions 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Anonymized Data: Sofort
  DELETE FROM temp_data 
  WHERE created_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 7.3 SOC 2 Type 2 Controls

### 7.3.1 Trust Service Criteria

| Criteria | Control | Evidence |
|----------|---------|----------|
| **CC6.1** Logical Access | RBAC, MFA | Access Logs |
| **CC6.2** Access Restrictions | Network Policies | Firewall Rules |
| **CC6.3** Access Removal | Offboarding Process | HR Integration |
| **CC6.6** Transmission Security | TLS 1.3 | Certificate Monitor |
| **CC7.1** Vulnerability Management | Weekly Scans | Scan Reports |
| **CC7.2** Anomaly Detection | SIEM Alerts | Alert Logs |
| **CC8.1** Change Management | CI/CD Pipeline | Change Records |
| **CC9.1** Backup & Recovery | Daily Backups | Backup Logs |

---

# 8. Operational Hardening

## 8.1 Change Management

### 8.1.1 Change Classification

| Type | Description | Approval | Lead Time |
|------|-------------|----------|-----------|
| **Standard** | Pre-approved, low-risk | Auto | Immediate |
| **Normal** | Moderate risk | Team Lead | 2 Days |
| **Emergency** | Critical fix | CTO + On-Call | Immediate |
| **Major** | Architecture change | Change Board | 2 Weeks |

### 8.1.2 Deployment Process

```
┌─────────────────────────────────────────────────────────────┐
│                   Deployment Pipeline                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Code Commit ──► PR Review ──► CI Build ──► Security Scan  │
│                                                │            │
│                                                ▼            │
│  Prod ←── Manual Gate ←── Staging Deploy ←── Unit Tests    │
│     │                              │                        │
│     ▼                              ▼                        │
│  Monitoring                  Integration Tests              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 8.2 Incident Management

### 8.2.1 Severity Matrix

| Severity | Impact | Response Time | Resolution Time |
|----------|--------|---------------|-----------------|
| **SEV-1** | Complete outage | 15 min | 4 hours |
| **SEV-2** | Partial outage | 30 min | 8 hours |
| **SEV-3** | Degraded service | 2 hours | 24 hours |
| **SEV-4** | Minor issue | 1 day | 72 hours |

### 8.2.2 Incident Response Playbook

```yaml
# Incident Response Steps
incident_response:
  detection:
    - Automated alert from monitoring
    - Customer report
    - Internal observation
    
  triage:
    - Assess severity
    - Identify affected components
    - Assign incident commander
    
  containment:
    - Isolate affected systems
    - Enable rate limiting
    - Activate failover
    
  resolution:
    - Implement fix
    - Validate in staging
    - Deploy to production
    
  recovery:
    - Restore services
    - Verify data integrity
    - Resume normal operations
    
  postmortem:
    - Root cause analysis
    - Action items
    - Documentation update
```

## 8.3 Access Management

### 8.3.1 Access Provisioning

```
┌─────────────────────────────────────────────────────────────┐
│                   Access Request Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Employee ──► Manager Approval ──► IT Provisioning          │
│                    │                    │                   │
│                    │                    ▼                   │
│                    │            RBAC Assignment             │
│                    │                    │                   │
│                    ▼                    ▼                   │
│              Audit Log ◄─────── Access Granted              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.3.2 Access Review Schedule

| Review Type | Frequency | Scope |
|-------------|-----------|-------|
| Self-Review | Quarterly | All Users |
| Manager Review | Quarterly | Direct Reports |
| Privileged Access | Monthly | Admin Accounts |
| Service Accounts | Monthly | All Service Accounts |

---

# 9. Threat Model

## 9.1 STRIDE Analysis

### 9.1.1 Threat Categories

| Threat | Component | Risk | Mitigation |
|--------|-----------|------|------------|
| **S**poofing | Webhook Endpoint | High | Stripe Signature Verification |
| **T**ampering | Audit Logs | Critical | Hash Chain Verification |
| **R**epudiation | Payment Events | High | Idempotency Keys + Audit Log |
| **I**nformation Disclosure | Database | Critical | Encryption + RBAC |
| **D**enial of Service | API Endpoints | High | Rate Limiting + Autoscaling |
| **E**levation of Privilege | Service Accounts | High | mTLS + RBAC |

## 9.2 Attack Vectors

### 9.2.1 Webhook Attack Surface

```
┌─────────────────────────────────────────────────────────────┐
│              Webhook Attack Vectors & Mitigations           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Attack: Spoofed Webhook                                    │
│  Mitigation: Stripe Signature Verification                  │
│  ├── Verify stripe-signature header                         │
│  ├── Check timestamp within tolerance                       │
│  └── Validate against webhook secret                        │
│                                                             │
│  Attack: Replay Attack                                      │
│  Mitigation: Idempotency + Timestamp Check                  │
│  ├── Store processed event IDs                              │
│  ├── Check timestamp within 5 minutes                       │
│  └── Return 200 OK for duplicates                           │
│                                                             │
│  Attack: Timing Attack                                      │
│  Mitigation: Constant-Time Comparison                       │
│  └── Use crypto.timingSafeEqual() for signatures            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 9.2.2 Database Attack Surface

| Attack | Mitigation | Implementation |
|--------|------------|----------------|
| SQL Injection | Parameterized Queries | Prisma ORM |
| Credential Theft | Secrets Management | Vault + Rotation |
| Data Exfiltration | Encryption + RBAC | AES-256 + Roles |
| Privilege Escalation | Row-Level Security | PostgreSQL RLS |

## 9.3 Security Controls Matrix

```
┌──────────────────────────────────────────────────────────────┐
│              Security Controls Matrix                        │
├──────────────┬───────────────────────────────────────────────┤
│ Layer        │ Controls                                     │
├──────────────┼───────────────────────────────────────────────┤
│ Network      │ Firewall, WAF, DDoS Protection, mTLS         │
├──────────────┼───────────────────────────────────────────────┤
│ Application  │ Input Validation, Rate Limiting, Auth        │
├──────────────┼───────────────────────────────────────────────┤
│ Data         │ Encryption, RBAC, Audit Logging, Backup      │
├──────────────┼───────────────────────────────────────────────┤
│ Operations   │ Monitoring, Incident Response, Change Mgmt   │
├──────────────┼───────────────────────────────────────────────┤
│ Compliance   │ PCI-DSS, GDPR, SOC 2 Controls                │
└──────────────┴───────────────────────────────────────────────┘
```

---

# 10. Security Checklist

## 10.1 Pre-Deployment Checklist

### 10.1.1 Infrastructure

- [ ] Alle Container laufen als Non-Root
- [ ] Network Policies implementiert
- [ ] TLS 1.3 für alle Verbindungen
- [ ] Secrets in Vault gespeichert
- [ ] Resource Limits definiert
- [ ] Backup konfiguriert und getestet

### 10.1.2 Application

- [ ] Input Validation aktiv
- [ ] Rate Limiting konfiguriert
- [ ] Audit Logging aktiviert
- [ ] Error Handling sicher
- [ ] Keine Secrets im Code
- [ ] Dependencies auf Vulnerabilities geprüft

### 10.1.3 Database

- [ ] RBAC konfiguriert
- [ ] Encryption at Rest aktiviert
- [ ] Row-Level Security aktiviert
- [ ] Backup getestet
- [ ] Connection Pooling konfiguriert

## 10.2 Operational Checklist

### 10.2.1 Daily

- [ ] Backup Verification
- [ ] Alert Review
- [ ] Log Anomalies Check

### 10.2.2 Weekly

- [ ] Vulnerability Scan
- [ ] Access Review
- [ ] Certificate Expiry Check

### 10.2.3 Monthly

- [ ] Patch Management
- [ ] Penetration Test Review
- [ ] Incident Trend Analysis
- [ ] Secrets Rotation

---

# 11. Hardening Validation

## 11.1 Automated Scans

### 11.1.1 Container Scanning

```yaml
# Trivy Container Scan
trivy:
  image: aquasec/trivy:latest
  script:
    - trivy image --severity HIGH,CRITICAL --exit-code 1 cargobit-api:latest
```

### 11.1.2 Dependency Scanning

```yaml
# npm audit + Snyk
dependency-scan:
  script:
    - npm audit --audit-level=high
    - snyk test --severity-threshold=high
```

### 11.1.3 Infrastructure Scanning

```yaml
# Terraform Security Scan
tfsec:
  script:
    - tfsec . --severity critical
```

## 11.2 Penetration Testing

### 11.2.1 Test Scope

| Component | Test Type | Frequency |
|-----------|-----------|-----------|
| Webhook Endpoint | API Pentest | Quarterly |
| API Endpoints | Web Pentest | Quarterly |
| Infrastructure | Network Pentest | Annually |
| Application | Code Review + SAST | Continuous |

### 11.2.2 Test Results Handling

1. Alle Findings dokumentieren
2. Nach Severity priorisieren
3. Remediation-Plan erstellen
4. Retest nach Fix
5. Evidence für Audit speichern

---

# 12. Appendix

## 12.1 Security Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| Security Team | security@cargobit.io | - |
| On-Call Security | +1-xxx-xxx-xxxx | SEV-1/2 |
| CISO | ciso@cargobit.io | SEV-1 |
| Stripe Support | support@stripe.com | Payment Issues |

## 12.2 Security Tools

| Tool | Purpose | Integration |
|------|---------|-------------|
| HashiCorp Vault | Secrets Management | Kubernetes |
| Trivy | Container Scanning | CI/CD |
| Snyk | Dependency Scanning | CI/CD |
| Datadog | Monitoring/SIEM | All Services |
| PagerDuty | Incident Management | On-Call |

## 12.3 Compliance Certifications

| Standard | Status | Auditor | Next Audit |
|----------|--------|---------|------------|
| PCI-DSS SAQ-A | Active | Self-Assessment | Annual |
| SOC 2 Type 2 | Active | Big 4 | Annual |
| GDPR | Compliant | DPO Review | Ongoing |
| ISO 27001 | Planned | - | 2025-Q2 |

## 12.4 Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-Q4 | Security Team | Initial Release |

---

**End of System Hardening Guide**

*Dieses Dokument ist für interne Zwecke bestimmt und darf nicht ohne Genehmigung weitergegeben werden.*
