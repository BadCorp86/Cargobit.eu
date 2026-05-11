# 🧱 BLOCK AB — Developer-Portal Security-Hardening-Guide

## Sicherheit auf Enterprise-Niveau — für Portal, Tools und Inhalte

### Umfassende Sicherheitsstrategie für das CargoBit Developer Portal

Dieses Dokument definiert alle Sicherheitsmaßnahmen für das CargoBit Developer Portal, einschließlich Frontend, Backend, Tools und Infrastruktur.

---

## 1. Security-Ziele

### 1.1 Primäre Ziele

| Ziel | Beschreibung | Metrik |
|------|--------------|--------|
| **Confidentiality** | Schutz sensibler Daten | 0 Datenlecks |
| **Integrity** | Schutz vor Manipulation | 0 unauthorized modifications |
| **Availability** | Hohe Verfügbarkeit | 99.99% Uptime |
| **Compliance** | Einhaltung aller Standards | 100% Audit-Konformität |

### 1.2 Security-Prinzipien

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Security Principles                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   1. Defense in Depth                                                    │
│      Mehrere Sicherheitsschichten                                        │
│                                                                           │
│   2. Least Privilege                                                     │
│      Minimale notwendige Berechtigungen                                  │
│                                                                           │
│   3. Zero Trust                                                          │
│      Kein implizites Vertrauen                                           │
│                                                                           │
│   4. Security by Default                                                 │
│      Sichere Standardeinstellungen                                       │
│                                                                           │
│   5. Fail Secure                                                         │
│      Sicheres Verhalten bei Fehlern                                      │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Security

### 2.1 Content Security Policy (CSP)

```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'sha256-xxxxx' https://analytics.cargobit.dev;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.cargobit.dev https://api-sandbox.cargobit.dev;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

**CSP-Direktiven erklärt:**

| Direktive | Wert | Grund |
|-----------|------|-------|
| `default-src` | `'self'` | Nur eigene Ressourcen |
| `script-src` | `'self' + hashes` | Keine inline scripts |
| `style-src` | `'unsafe-inline'` | Tailwind erfordert dies |
| `connect-src` | API-URLs whitelisten | Nur autorisierte APIs |
| `frame-ancestors` | `'none'` | Kein Embedding (Clickjacking) |
| `upgrade-insecure-requests` | - | HTTPS erzwingen |

### 2.2 XSS-Schutz

```http
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Implementierung:**

```javascript
// Next.js Security Headers
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()'
          }
        ]
      }
    ];
  }
};
```

### 2.3 Input Sanitization

```javascript
import DOMPurify from 'dompurify';

// Sanitize user input
function sanitizeInput(input) {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}

// Validate URL
function isValidUrl(url) {
  const allowedOrigins = [
    'https://api.cargobit.dev',
    'https://api-sandbox.cargobit.dev'
  ];
  
  try {
    const parsed = new URL(url);
    return allowedOrigins.includes(parsed.origin);
  } catch {
    return false;
  }
}

// Escape HTML entities
function escapeHtml(str) {
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return str.replace(/[&<>"']/g, char => htmlEntities[char]);
}
```

### 2.4 CSRF-Schutz

```javascript
// CSRF Token Generation
import { randomBytes } from 'crypto';

function generateCsrfToken() {
  return randomBytes(32).toString('hex');
}

// CSRF Token Validation
function validateCsrfToken(token, sessionToken) {
  if (!token || !sessionToken) return false;
  return timingSafeEqual(
    Buffer.from(token),
    Buffer.from(sessionToken)
  );
}

// Double Submit Cookie Pattern
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const cookieToken = req.cookies['csrf-token'];
    const headerToken = req.headers['x-csrf-token'];
    
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  }
  next();
});
```

---

## 3. API Explorer Security

### 3.1 Sandbox-Isolation

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      API Explorer Security                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Production Isolation:                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                  │   │
│   │   API Explorer          Production API                          │   │
│   │   ┌─────────┐           ┌─────────────┐                        │   │
│   │   │ User    │ ─────────▶│ Sandbox     │                        │   │
│   │   │ Request │           │ Environment │                        │   │
│   │   └─────────┘           └─────────────┘                        │   │
│   │                               │                                  │   │
│   │                               │ Isolated Data                    │   │
│   │                               ▼                                  │   │
│   │                          ┌─────────────┐                        │   │
│   │                          │ Mock Data   │                        │   │
│   │                          │ No PII      │                        │   │
│   │                          └─────────────┘                        │   │
│   │                                                                  │   │
│   │   ✗ No Direct Production Access                                 │   │
│   │   ✗ No Real Payment Data                                        │   │
│   │   ✗ No Production Webhooks                                      │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Rate Limiting

```javascript
// Rate Limit Configuration
const rateLimits = {
  // API Explorer Limits
  'api-explorer:sandbox': {
    requests: 100,
    window: '1m',
    burst: 20
  },
  'api-explorer:production': {
    requests: 30,
    window: '1m',
    burst: 5
  },
  
  // Search Limits
  'search': {
    requests: 50,
    window: '1m',
    burst: 10
  },
  
  // Webhook Simulator Limits
  'webhook-simulator': {
    requests: 20,
    window: '1m',
    burst: 5
  }
};

// Implementation
import rateLimit from 'express-rate-limit';

const apiExplorerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Please wait before making more requests',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});
```

### 3.3 Input Validation

```javascript
import Joi from 'joi';

// Request Validation Schema
const apiRequestSchema = Joi.object({
  method: Joi.string()
    .valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH')
    .required(),
  endpoint: Joi.string()
    .pattern(/^\/v[1-9]\/[a-z-]+(\/[a-zA-Z0-9_-]+)*$/)
    .required(),
  headers: Joi.object()
    .pattern(/^[A-Za-z-]+$/, Joi.string().max(500))
    .max(20),
  body: Joi.object()
    .max(50)
    .unknown(true),
  queryParams: Joi.object()
    .pattern(/^[a-z_]+$/, Joi.string().max(200))
    .max(20)
});

function validateApiRequest(req, res, next) {
  const { error, value } = apiRequestSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.details.map(d => d.message)
    });
  }
  
  req.validatedRequest = value;
  next();
}
```

---

## 4. Webhook Simulator Security

### 4.1 Payload Anonymisierung

```javascript
// Sensitive Field Detection
const sensitiveFields = [
  'card_number',
  'cvv',
  'ssn',
  'password',
  'api_key',
  'secret',
  'token',
  'iban',
  'account_number'
];

function anonymizePayload(payload) {
  const anonymized = JSON.parse(JSON.stringify(payload));
  
  function traverse(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        traverse(obj[key]);
      } else if (sensitiveFields.some(f => 
        key.toLowerCase().includes(f)
      )) {
        obj[key] = '***REDACTED***';
      }
    }
  }
  
  traverse(anonymized);
  return anonymized;
}
```

### 4.2 Replay-Schutz

```javascript
// Replay Detection
import { createHash } from 'crypto';

const recentEvents = new Map();
const REPLAY_WINDOW = 5 * 60 * 1000; // 5 minutes

function detectReplay(event) {
  const eventId = event.id;
  const eventHash = createHash('sha256')
    .update(JSON.stringify(event))
    .digest('hex');
  
  const key = `${eventId}:${eventHash}`;
  
  if (recentEvents.has(key)) {
    return true; // Replay detected
  }
  
  recentEvents.set(key, Date.now());
  
  // Cleanup old entries
  for (const [k, timestamp] of recentEvents) {
    if (Date.now() - timestamp > REPLAY_WINDOW) {
      recentEvents.delete(k);
    }
  }
  
  return false;
}
```

---

## 5. Authentication & Authorization

### 5.1 Authentication-Architektur

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Authentication Architecture                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐              │
│   │   User      │     │    Auth     │     │   Session   │              │
│   │   Login     │ ──▶ │   Service   │ ──▶ │   Store     │              │
│   └─────────────┘     └─────────────┘     └─────────────┘              │
│                              │                                           │
│                              ▼                                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                        JWT Token                                 │   │
│   │                                                                  │   │
│   │   Header: { alg: "RS256", typ: "JWT" }                          │   │
│   │   Payload: { sub, email, role, exp, iat }                       │   │
│   │   Signature: RSASSA-PKCS1-v1_5                                  │   │
│   │                                                                  │   │
│   │   Expiration: 15 minutes (Access Token)                         │   │
│   │   Refresh: 7 days (Refresh Token)                               │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 API Key Management

```javascript
// API Key Generation
import { randomBytes, createHash } from 'crypto';

function generateApiKey(prefix = 'sk') {
  const key = randomBytes(32).toString('hex');
  return `${prefix}_${key}`;
}

// API Key Hashing (Storage)
function hashApiKey(apiKey) {
  return createHash('sha256').update(apiKey).digest('hex');
}

// API Key Validation
async function validateApiKey(apiKey) {
  if (!apiKey || !apiKey.startsWith('sk_')) {
    return { valid: false, reason: 'Invalid format' };
  }
  
  const hash = hashApiKey(apiKey);
  const storedKey = await db.apiKeys.findByHash(hash);
  
  if (!storedKey) {
    return { valid: false, reason: 'Key not found' };
  }
  
  if (storedKey.revoked) {
    return { valid: false, reason: 'Key revoked' };
  }
  
  if (storedKey.expiresAt < new Date()) {
    return { valid: false, reason: 'Key expired' };
  }
  
  return { 
    valid: true, 
    key: storedKey 
  };
}
```

### 5.3 Session Hardening

```javascript
// Session Configuration
const sessionConfig = {
  name: 'cb_session', // Non-default name
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true, // HTTPS only
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: '.cargobit.dev',
    path: '/'
  }
};

// Session Rotation
function rotateSession(req, res, next) {
  if (req.session) {
    const oldSession = req.session;
    req.session.regenerate((err) => {
      if (err) return next(err);
      // Copy important data
      req.session.userId = oldSession.userId;
      req.session.createdAt = Date.now();
      next();
    });
  } else {
    next();
  }
}
```

---

## 6. Infrastructure Security

### 6.1 HTTPS & TLS

```nginx
# Nginx Configuration
server {
    listen 443 ssl http2;
    server_name cargobit.dev;
    
    # TLS Configuration
    ssl_certificate /etc/letsencrypt/live/cargobit.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cargobit.dev/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name cargobit.dev;
    return 301 https://$server_name$request_uri;
}
```

### 6.2 WAF Configuration

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      WAF Rules                                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   SQL Injection Protection:                                              │
│   • Block patterns: SELECT.*, UNION.*, DROP.*, etc.                     │
│   • Severity: High                                                        │
│   • Action: Block                                                         │
│                                                                           │
│   XSS Protection:                                                         │
│   • Block patterns: <script>, javascript:, onerror=, etc.               │
│   • Severity: High                                                        │
│   • Action: Block                                                         │
│                                                                           │
│   Path Traversal:                                                         │
│   • Block patterns: ../, ..\, /etc/passwd, etc.                         │
│   • Severity: High                                                        │
│   • Action: Block                                                         │
│                                                                           │
│   Rate Limiting:                                                          │
│   • Global: 1000 requests/minute/IP                                      │
│   • API: 100 requests/minute/key                                         │
│   • Action: Throttle                                                      │
│                                                                           │
│   Bot Protection:                                                         │
│   • Challenge suspicious bots                                            │
│   • Block known malicious IPs                                            │
│   • Action: Challenge/Block                                               │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 6.3 DDoS Protection

```yaml
# DDoS Mitigation Configuration
ddos-protection:
  mode: active
  
  rate-limits:
    global:
      requests: 10000
      window: 1m
      action: throttle
    
    per-ip:
      requests: 100
      window: 1m
      action: block
    
    per-endpoint:
      search:
        requests: 50
        window: 1m
      api-explorer:
        requests: 100
        window: 1m
  
  auto-mitigation:
    enabled: true
    threshold: 80%
    action: enable-challenge
    
  geographic-blocking:
    enabled: false  # Only for specific threats
    
  whitelist:
    - 192.168.0.0/16  # Internal
    - 10.0.0.0/8      # Internal
```

---

## 7. Security Testing

### 7.1 Testing-Übersicht

| Test-Typ | Häufigkeit | Tool | Verantwortlich |
|----------|------------|------|----------------|
| **Static Code Analysis** | Jeder Commit | SonarQube, Snyk | CI/CD |
| **Dependency Scanning** | Täglich | Snyk, Dependabot | Automation |
| **Secret Scanning** | Jeder Commit | GitLeaks, TruffleHog | CI/CD |
| **DAST** | Wöchentlich | OWASP ZAP | Security Team |
| **Penetration Testing** | Halbjährlich | External | Security Team |
| **Red Team Assessment** | Jährlich | External | Security Team |

### 7.2 Vulnerability Management

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    Vulnerability Management                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Severity    │ Response Time │ Resolution Time │ Escalation            │
│   ────────────┼───────────────┼─────────────────┼───────────────────────│
│   Critical    │ < 1 hour      │ < 24 hours      │ CTO, Security Team    │
│   High        │ < 4 hours     │ < 7 days        │ Security Team         │
│   Medium      │ < 24 hours    │ < 30 days       │ Dev Team              │
│   Low         │ < 1 week      │ < 90 days       │ Backlog               │
│                                                                           │
│   ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│   Patch Management:                                                      │
│   • Critical patches: Immediate deployment                               │
│   • Security updates: Within 48 hours                                    │
│   • Dependency updates: Weekly batch                                     │
│                                                                           │
│   Exception Process:                                                     │
│   • Accept risk only with CTO approval                                   │
│   • Compensating controls required                                       │
│   • Review every 30 days                                                 │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Security Scan Pipeline

```yaml
# Security Scanning Pipeline
name: Security Scans
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Daily

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Snyk
        uses: snyk/actions/node@master
        with:
          args: --severity-threshold=high
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: GitLeaks Scan
        uses: gitleaks/gitleaks-action@v2

  sast-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: SonarQube Scan
        uses: sonarqube-quality-gate-action@master
        with:
          scanMetadataReportFile: target/sonar/report-task.txt

  dast-scan:
    runs-on: ubuntu-latest
    steps:
      - name: OWASP ZAP Scan
        uses: zaproxy/action-full-scan@v0.4.0
        with:
          target: https://staging.cargobit.dev
```

---

## 8. Incident Response

### 8.1 Incident-Klassifikation

| Level | Beschreibung | Beispiele | Response |
|-------|--------------|-----------|----------|
| **SEV1** | Kritisch | Datenleck, aktiver Angriff | Sofort |
| **SEV2** | Hoch | Vulnerability exploited | < 1 Stunde |
| **SEV3** | Mittel | Verdächtige Aktivität | < 4 Stunden |
| **SEV4** | Niedrig | Policy-Verletzung | < 24 Stunden |

### 8.2 Incident Response Plan

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Incident Response Process                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   1. Detection                                                           │
│      ├── Monitoring Alerts                                               │
│      ├── User Reports                                                    │
│      └── External Notifications                                          │
│                                                                           │
│   2. Triage                                                              │
│      ├── Severity bestimmen                                              │
│      ├── Scope identifizieren                                            │
│      └── Team alarmieren                                                 │
│                                                                           │
│   3. Containment                                                         │
│      ├── Isolation betroffener Systeme                                   │
│      ├── Access revoken                                                  │
│      └── Traffic blockieren                                              │
│                                                                           │
│   4. Eradication                                                         │
│      ├── Root Cause identifizieren                                       │
│      ├── Vulnerability beheben                                           │
│      └── Patches anwenden                                                │
│                                                                           │
│   5. Recovery                                                            │
│      ├── Systeme wiederherstellen                                        │
│      ├── Monitoring erhöhen                                              │
│      └── Services reaktivieren                                           │
│                                                                           │
│   6. Post-Incident                                                       │
│      ├── Incident Report                                                 │
│      ├── Lessons Learned                                                 │
│      └── Prozess-Verbesserungen                                          │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Security-Compliance

### 9.1 Compliance-Framework

| Standard | Status | Audit-Häufigkeit |
|----------|--------|------------------|
| **SOC 2 Type II** | ✅ Certified | Jährlich |
| **ISO 27001** | ✅ Certified | Jährlich |
| **GDPR** | ✅ Compliant | Kontinuierlich |
| **PCI DSS** | ✅ Compliant | Jährlich |

### 9.2 Security-Audit-Checkliste

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Security Audit Checklist                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Access Control:                                                        │
│   [ ] Multi-Factor Authentication aktiviert                              │
│   [ ] Least Privilege implementiert                                      │
│   [ ] Access Reviews quartalsweise                                       │
│   [ ] Inactive Accounts deaktiviert                                      │
│                                                                           │
│   Data Protection:                                                       │
│   [ ] Encryption at rest aktiviert                                       │
│   [ ] Encryption in transit erzwungen                                    │
│   [ ] Data Classification implementiert                                  │
│   [ ] Data Retention Policy durchgesetzt                                 │
│                                                                           │
│   Network Security:                                                      │
│   [ ] Firewall konfiguriert                                              │
│   [ ] WAF aktiviert                                                      │
│   [ ] DDoS Protection aktiv                                              │
│   [ ] VPN für internen Zugriff                                           │
│                                                                           │
│   Monitoring:                                                            │
│   [ ] Security Logs aktiviert                                            │
│   [ ] SIEM integriert                                                    │
│   [ ] Alert Rules konfiguriert                                           │
│   [ ] Incident Response getestet                                         │
│                                                                           │
│   Vulnerability Management:                                              │
│   [ ] Automatische Scans aktiviert                                       │
│   [ ] Patch Process etabliert                                            │
│   [ ] Penetration Tests durchgeführt                                     │
│   [ ] Remediation SLAs definiert                                         │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

*Dieser Security-Hardening-Guide gewährleistet Enterprise-Level-Sicherheit für alle Aspekte des CargoBit Developer Portals.*
