# Developer-Portal Threat Model (STRIDE)

## Vollständiges Threat Modeling für Portal, Tools und Infrastruktur

Dieses Dokument beschreibt eine systematische Sicherheitsanalyse des CargoBit Developer-Portals basierend auf dem STRIDE-Framework.

---

## 1. Scope

### 1.1 In-Scope Komponenten

| Komponente | Beschreibung | Trust Level |
|------------|--------------|-------------|
| Developer Portal Frontend | Statische Dokumentationsseiten | Public |
| Tools Backend | API Explorer, Webhook Simulator, Event Replay | Authenticated |
| API Explorer Proxy | Sandbox-Request-Proxy | Authenticated |
| Webhook Simulator | Event-Generierung und -Delivery | Authenticated |
| Event Replay Engine | Wiederholung von Webhook-Events | Authenticated |
| Search Engine | Dokumentations-Suche | Public |
| Observability Layer | Logs, Metrics, Traces | Internal |
| Authentication Service | OAuth2/JWT-Authentifizierung | Critical |
| Database Layer | PostgreSQL, Redis | Internal |

### 1.2 Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           INTERNET (Untrusted)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Anonymous   │  │ Authenticated│  │ Search      │  │ Malicious      │ │
│  │ Users       │  │ Partners     │  │ Crawlers    │  │ Actors         │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ │
└─────────┼────────────────┼────────────────┼──────────────────┼──────────┘
          │                │                │                  │
          ▼                ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    TRUST BOUNDARY: CDN / WAF                             │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Cloudflare Edge                                 │  │
│  │  - DDoS Protection                                                 │  │
│  │  - WAF Rules                                                       │  │
│  │  - Rate Limiting                                                   │  │
│  │  - Bot Detection                                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    TRUST BOUNDARY: Application                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Next.js Application                             │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐│  │
│  │  │ Static Docs │  │ Tools UI    │  │ Authentication              ││  │
│  │  │ (Public)    │  │ (Auth)      │  │ (OAuth2/JWT)                ││  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘│  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    TRUST BOUNDARY: Backend Services                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Tools Backend                                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐│  │
│  │  │ API Explorer│  │ Webhook     │  │ Event Replay                ││  │
│  │  │ Proxy       │  │ Simulator   │  │ Engine                      ││  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘│  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    TRUST BOUNDARY: Data Layer                            │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐│  │
│  │  │ PostgreSQL  │  │ Redis       │  │ Algolia                     ││  │
│  │  │ (State)     │  │ (Cache)     │  │ (Search)                    ││  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘│  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Data Flow Diagram

```
┌─────────┐                                            ┌─────────────┐
│  User   │                                            │   Partner   │
│ (Public)│                                            │  Endpoint   │
└────┬────┘                                            └──────▲──────┘
     │                                                        │
     │ HTTPS                                                  │ HTTPS
     ▼                                                        │
┌─────────────────────────────────────────────────────────────┴───────────┐
│                              CDN / WAF                                   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
     ┌──────────────────────────────┼──────────────────────────────┐
     │                              │                              │
     ▼                              ▼                              ▼
┌─────────────┐            ┌─────────────────┐            ┌─────────────┐
│   Static    │            │    Tools UI     │            │   Search    │
│    Docs     │            │  (API Explorer) │            │   Query     │
└─────────────┘            └────────┬────────┘            └──────┬──────┘
                                    │                             │
                                    ▼                             ▼
                           ┌─────────────────┐            ┌─────────────┐
                           │  Tools Backend  │            │   Algolia   │
                           │                 │            │   Index     │
                           └────────┬────────┘            └─────────────┘
                                    │
     ┌──────────────────────────────┼──────────────────────────────┐
     │                              │                              │
     ▼                              ▼                              ▼
┌─────────────┐            ┌─────────────────┐            ┌─────────────┐
│  Sandbox    │            │    Webhook      │            │  Database   │
│    API      │            │   Delivery      │            │  (State)    │
└─────────────┘            └─────────────────┘            └─────────────┘
```

---

## 2. STRIDE-Analyse

### 2.1 S — Spoofing (Identitätsdiebstahl)

**Definition:** Angreifer geben sich als jemand anderes aus, um unbefugten Zugriff zu erhalten.

#### 2.1.1 Bedrohungen

| ID | Bedrohung | Komponente | Beschreibung | Likelihood | Impact |
|----|-----------|------------|--------------|------------|--------|
| S-001 | Session Hijacking | Authentication | Angreifer stiehlt Session-Token | Medium | High |
| S-002 | JWT Token Theft | Authentication | XSS kann JWT aus localStorage exfiltrieren | Medium | High |
| S-003 | API Key Theft | API Explorer | API Key wird durch XSS gestohlen | Medium | High |
| S-004 | Webhook Signature Spoofing | Webhook Simulator | Gefälschte Signaturen in Events | Low | High |
| S-005 | CSRF Attack | Tools UI | Cross-Site Request Forgery | Medium | Medium |

#### 2.1.2 Mitigation-Maßnahmen

```yaml
spoofing_mitigations:
  S-001_session_hijacking:
    measures:
      - HttpOnly, Secure, SameSite=Strict cookies
      - Short session lifetime (15 min)
      - Session regeneration on privilege change
      - IP binding for sensitive operations
    implementation: |
      Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict; Max-Age=900
      
  S-002_jwt_theft:
    measures:
      - Store JWT in httpOnly cookies (not localStorage)
      - Short token lifetime (15 min access, 7d refresh)
      - Token rotation on each refresh
      - Token revocation list
    implementation: |
      // JWT stored in httpOnly cookie, not localStorage
      res.cookie('access_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000
      });
      
  S-003_api_key_theft:
    measures:
      - API Key never exposed to browser after creation
      - API Key only shown once at creation
      - Rate limiting per API Key
      - API Key rotation support
    implementation: |
      // API Key displayed only once
      async function createApiKey(userId) {
        const key = generateApiKey();
        const hash = await bcrypt.hash(key, 12);
        await storeApiKey(userId, hash, key.substring(0, 8));
        return key; // Only returned once
      }
      
  S-004_webhook_spoofing:
    measures:
      - HMAC-SHA256 signature validation
      - Timestamp validation (5 min tolerance)
      - Unique event IDs with replay protection
    implementation: |
      function verifySignature(payload, signature, secret) {
        const expected = crypto
          .createHmac('sha256', secret)
          .update(payload)
          .digest('hex');
        return crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expected)
        );
      }
      
  S-005_csrf:
    measures:
      - Double-submit cookie pattern
      - SameSite=Strict cookies
      - CSRF token in state-changing requests
    implementation: |
      // CSRF token validation
      app.use((req, res, next) => {
        if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
          const token = req.headers['x-csrf-token'];
          const cookieToken = req.cookies.csrf_token;
          if (!token || token !== cookieToken) {
            return res.status(403).json({ error: 'CSRF token mismatch' });
          }
        }
        next();
      });
```

---

### 2.2 T — Tampering (Datenmanipulation)

**Definition:** Unbefugte Änderung von Daten oder Code.

#### 2.2.1 Bedrohungen

| ID | Bedrohung | Komponente | Beschreibung | Likelihood | Impact |
|----|-----------|------------|--------------|------------|--------|
| T-001 | Documentation Tampering | Static Docs | Manipulation von Dokumentationsinhalten | Low | High |
| T-002 | Tool Payload Tampering | Tools Backend | Manipulation von Request/Response | Medium | High |
| T-003 | Search Index Poisoning | Search Engine | Manipulation des Suchindex | Low | Medium |
| T-004 | Webhook Payload Tampering | Webhook Simulator | Manipulation von Webhook-Payloads | Medium | High |
| T-005 | Configuration Tampering | Infrastructure | Manipulation von Konfigurationen | Low | Critical |

#### 2.2.2 Mitigation-Maßnahmen

```yaml
tampering_mitigations:
  T-001_docs_tampering:
    measures:
      - Immutable static deployments
      - Git-based version control with signed commits
      - Content integrity checks (SRI)
      - Read-only documentation storage
    implementation: |
      # Deployment with integrity check
      npm run build
      git add .
      git commit -S -m "Release v2.4.0"
      vercel --prod
      
      # SRI in HTML
      <script src="/js/app.js" 
              integrity="sha384-abc123..." 
              crossorigin="anonymous"></script>
      
  T-002_payload_tampering:
    measures:
      - Input validation with JSON Schema
      - Output sanitization
      - WAF rules for injection prevention
      - Request signing
    implementation: |
      // JSON Schema validation
      const requestSchema = z.object({
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
        endpoint: z.string().regex(/^\/v[0-9]\/[a-z0-9\-\/]+$/),
        body: z.any().optional()
      });
      
      // Sanitize all output
      function sanitizeOutput(data) {
        return DOMPurify.sanitize(JSON.stringify(data));
      }
      
  T-003_search_poisoning:
    measures:
      - Pre-indexed static content
      - Admin-only index updates
      - Content validation before indexing
      - Audit logs for index changes
    implementation: |
      # Build-time indexing
      npm run build:index
      
      # Index update requires authentication
      POST /api/admin/search/reindex
      Authorization: Bearer <admin-token>
      
  T-004_webhook_tampering:
    measures:
      - Payload signature verification
      - Immutable event log
      - Tamper-evident logging
      - Checksums for stored events
    implementation: |
      // Event integrity check
      function storeEvent(event) {
        const checksum = crypto
          .createHash('sha256')
          .update(JSON.stringify(event))
          .digest('hex');
        return db.events.insert({
          ...event,
          checksum,
          created_at: new Date()
        });
      }
      
  T-005_config_tampering:
    measures:
      - Infrastructure as Code (Terraform)
      - GitOps workflow
      - Configuration drift detection
      - Secrets in Vault (not in config files)
    implementation: |
      # Terraform state locking
      terraform apply -lock=true
      
      # Secrets from Vault
      export DATABASE_URL=$(vault read -field=url secret/portal/db)
```

---

### 2.3 R — Repudiation (Nichtabstreitbarkeit)

**Definition:** Angreifer können Aktionen nicht zugeordnet werden oder Aktionen abstreiten.

#### 2.3.1 Bedrohungen

| ID | Bedrohung | Komponente | Beschreibung | Likelihood | Impact |
|----|-----------|------------|--------------|------------|--------|
| R-001 | Missing Audit Logs | Tools Backend | Aktionen nicht protokolliert | Medium | High |
| R-002 | Log Tampering | Observability | Logs können geändert werden | Low | High |
| R-003 | Undocumented Actions | API Explorer | API-Aufrufe nicht nachvollziehbar | Medium | Medium |
| R-004 | Webhook Delivery Denial | Webhook Simulator | Partner bestreitet Erhalt | Medium | High |

#### 2.3.2 Mitigation-Maßnahmen

```yaml
repudiation_mitigations:
  R-001_audit_logs:
    measures:
      - Structured logging for all actions
      - Correlation IDs for request tracing
      - Immutable log storage
      - Log retention for 7 years
    implementation: |
      // Structured audit log
      {
        "timestamp": "2025-01-15T10:30:00Z",
        "event_type": "api_explorer.request",
        "actor": {
          "type": "user",
          "id": "usr_abc123",
          "ip": "192.168.1.100",
          "session": "sess_xyz789"
        },
        "resource": {
          "type": "api_endpoint",
          "method": "POST",
          "path": "/v2/payments"
        },
        "result": {
          "status": "success",
          "response_code": 201
        },
        "correlation_id": "corr_def456"
      }
      
  R-002_log_tampering:
    measures:
      - Append-only log storage
      - Log hashing with Merkle tree
      - External log forwarding (SIEM)
      - Tamper-evident logging
    implementation: |
      # Forward logs to immutable storage
      aws logs create-export-task \
        --log-group-name /aws/ecs/portal \
        --destination audit-bucket \
        --destination-prefix audit-logs/
        
  R-003_undocumented_actions:
    measures:
      - All API calls logged with user context
      - Request/Response logging (sanitized)
      - Time-stamped records
      - User attribution
    implementation: |
      // Log all API Explorer requests
      async function executeRequest(req) {
        const logEntry = {
          timestamp: new Date(),
          user_id: req.user.id,
          request: sanitizeRequest(req.body),
          correlation_id: generateCorrelationId()
        };
        await logToImmutableStorage(logEntry);
        return executeInSandbox(req);
      }
      
  R-004_webhook_delivery_denial:
    measures:
      - Delivery receipts with signatures
      - Immutable delivery log
      - Response logging
      - Timestamped proofs
    implementation: |
      // Delivery proof
      {
        "event_id": "evt_abc123",
        "delivered_at": "2025-01-15T10:30:00Z",
        "endpoint": "https://partner.example.com/webhooks",
        "response_code": 200,
        "response_signature": "sha256=xyz789...",
        "delivery_attempts": 1
      }
```

---

### 2.4 I — Information Disclosure (Informationslecks)

**Definition:** Unbefugte Offenlegung von Informationen.

#### 2.4.1 Bedrohungen

| ID | Bedrohung | Komponente | Beschreibung | Likelihood | Impact |
|----|-----------|------------|--------------|------------|--------|
| I-001 | API Key Exposure | API Explorer | API Keys in Logs/Errors | Medium | Critical |
| I-002 | PII in Logs | Observability | Personenbezogene Daten in Logs | Medium | High |
| I-003 | Error Message Leakage | Tools Backend | Sensible Infos in Fehlermeldungen | High | Medium |
| I-004 | Webhook Payload Exposure | Webhook Simulator | Sensible Daten in Payloads | Medium | High |
| I-005 | Search Data Exposure | Search Engine | Nicht autorisierte Inhalte sichtbar | Low | Medium |

#### 2.4.2 Mitigation-Maßnahmen

```yaml
information_disclosure_mitigations:
  I-001_api_key_exposure:
    measures:
      - Never log API keys (mask in logs)
      - Environment variables for secrets
      - Secrets scanning in CI/CD
      - Key rotation capability
    implementation: |
      # Mask sensitive data in logs
      function maskApiKey(key) {
        if (!key) return key;
        return key.substring(0, 8) + '...' + key.substring(key.length - 4);
      }
      
      // Log: "API call with key: sk_test_1234...5678"
      
  I-002_pii_in_logs:
    measures:
      - No PII in application logs
      - Data anonymization
      - PII detection in log pipeline
      - Data classification policy
    implementation: |
      // Anonymize before logging
      function anonymizeForLog(data) {
        const sensitive = ['email', 'phone', 'name', 'address', 'ip'];
        const result = { ...data };
        for (const field of sensitive) {
          if (result[field]) {
            result[field] = '[REDACTED]';
          }
        }
        return result;
      }
      
  I-003_error_leakage:
    measures:
      - Generic error messages to users
      - Detailed errors only in internal logs
      - No stack traces in production
      - Error codes for support
    implementation: |
      // Production error handling
      app.use((err, req, res, next) => {
        // Log detailed error internally
        logger.error('Error', {
          error: err.message,
          stack: err.stack,
          correlation_id: req.correlationId
        });
        
        // Return generic error to user
        res.status(500).json({
          error: 'Internal server error',
          code: 'ERR_500',
          correlation_id: req.correlationId,
          support_url: 'https://support.cargobit.io'
        });
      });
      
  I-004_webhook_payload:
    measures:
      - Anonymize payloads in UI
      - No PII in stored events
      - Encrypted at rest
      - Automatic PII detection
    implementation: |
      // Anonymize webhook payload
      function anonymizePayload(payload) {
        const sensitiveFields = [
          'email', 'phone', 'name', 'address',
          'card_number', 'iban', 'ssn'
        ];
        
        function redact(obj) {
          for (const key in obj) {
            if (typeof obj[key] === 'object') {
              redact(obj[key]);
            } else if (sensitiveFields.includes(key.toLowerCase())) {
              obj[key] = '[REDACTED]';
            }
          }
        }
        
        const copy = JSON.parse(JSON.stringify(payload));
        redact(copy);
        return copy;
      }
      
  I-005_search_exposure:
    measures:
      - Content access control
      - Search results filtered by permission
      - No indexing of restricted content
      - Search audit logging
    implementation: |
      // Filter search results by permission
      async function search(query, user) {
        const results = await algolia.search(query);
        return results.filter(result => 
          hasPermission(user, result.acl)
        );
      }
```

---

### 2.5 D — Denial of Service (Dienstverweigerung)

**Definition:** Angreifer verhindern legitime Nutzung des Systems.

#### 2.5.1 Bedrohungen

| ID | Bedrohung | Komponente | Beschreibung | Likelihood | Impact |
|----|-----------|------------|--------------|------------|--------|
| D-001 | API Explorer Abuse | Tools Backend | Überlastung durch Requests | High | High |
| D-002 | Webhook Simulator Abuse | Webhook Simulator | Massenhafte Webhook-Simulation | Medium | Medium |
| D-003 | Search Spam | Search Engine | Überlastung der Suche | Medium | Medium |
| D-004 | DDoS Attack | CDN/Infrastructure | Distributed Denial of Service | Medium | Critical |
| D-005 | Resource Exhaustion | Tools Backend | Memory/CPU-Verbrauch | Medium | High |

#### 2.5.2 Mitigation-Maßnahmen

```yaml
dos_mitigations:
  D-001_api_explorer_abuse:
    measures:
      - Rate limiting per user/IP
      - Request queuing
      - Circuit breakers
      - Auto-scaling
    implementation: |
      # Rate limit configuration
      const rateLimiter = rateLimit({
        windowMs: 60 * 1000,  # 1 minute
        max: 20,             # 20 requests per minute
        keyGenerator: (req) => req.user?.id || req.ip,
        handler: (req, res) => {
          res.status(429).json({
            error: 'Too many requests',
            retry_after: 60
          });
        }
      });
      
  D-002_webhook_abuse:
    measures:
      - Rate limiting per endpoint
      - Queue-based delivery
      - Background processing
      - Monitoring for anomalies
    implementation: |
      # Queue-based webhook delivery
      const webhookQueue = new Queue('webhooks', redis);
      
      webhookQueue.process(async (job) => {
        const { event, endpoint } = job.data;
        return deliverWebhook(event, endpoint);
      });
      
      # Rate limit: 100 webhooks per minute per user
      webhookQueue.rateLimit({
        max: 100,
        duration: 60 * 1000
      });
      
  D-003_search_spam:
    measures:
      - Rate limiting on search API
      - Captcha for suspicious patterns
      - Query caching
      - Result caching
    implementation: |
      # Search rate limiting
      const searchLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 30,  # 30 searches per minute
        skip: (req) => req.user?.plan === 'enterprise'
      });
      
      # Cache popular queries
      async function search(query) {
        const cacheKey = `search:${query}`;
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
        
        const results = await algolia.search(query);
        await redis.setex(cacheKey, 60, JSON.stringify(results));
        return results;
      }
      
  D-004_ddos:
    measures:
      - Cloudflare DDoS protection
      - Anycast network
      - Bot detection
      - Rate limiting at edge
      - Origin protection
    implementation: |
      # Cloudflare configuration
      - Enable "Under Attack Mode" when needed
      - Rate limiting rules at edge
      - Bot fight mode enabled
      - Challenge page for suspicious IPs
      
      # Origin protection
      # Only allow traffic from Cloudflare IPs
      iptables -A INPUT -p tcp --dport 443 -s $CLOUDFLARE_IPS -j ACCEPT
      iptables -A INPUT -p tcp --dport 443 -j DROP
      
  D-005_resource_exhaustion:
    measures:
      - Memory limits per request
      - CPU quotas
      - Request timeouts
      - Graceful degradation
    implementation: |
      # Resource limits
      const config = {
        maxRequestSize: '1mb',
        requestTimeout: 30000,  # 30 seconds
        maxConcurrentRequests: 100
      };
      
      # Graceful degradation
      app.use((req, res, next) => {
        if (getCurrentLoad() > 0.9) {
          return res.status(503).json({
            error: 'Service temporarily unavailable',
            retry_after: 30
          });
        }
        next();
      });
```

---

### 2.6 E — Elevation of Privilege (Rechteausweitung)

**Definition:** Angreifer erlangen höhere Berechtigungen als vorgesehen.

#### 2.6.1 Bedrohungen

| ID | Bedrohung | Komponente | Beschreibung | Likelihood | Impact |
|----|-----------|------------|--------------|------------|--------|
| E-001 | Admin Access | Tools Backend | Unbefugter Admin-Zugriff | Low | Critical |
| E-002 | Partner Data Access | Database | Zugriff auf fremde Partnerdaten | Medium | Critical |
| E-003 | API Key Abuse | API Explorer | Verwendung fremder API Keys | Medium | High |
| E-004 | Webhook Access | Webhook Simulator | Zugriff auf fremde Webhooks | Medium | High |
| E-005 | Privilege Escalation | Authentication | Ausweitung eigener Rechte | Low | Critical |

#### 2.6.2 Mitigation-Maßnahmen

```yaml
elevation_mitigations:
  E-001_admin_access:
    measures:
      - Role-based access control (RBAC)
      - Multi-factor authentication for admin
      - Separate admin network
      - Audit logging for admin actions
    implementation: |
      # RBAC implementation
      const roles = {
        admin: ['read', 'write', 'delete', 'admin'],
        developer: ['read', 'write'],
        viewer: ['read']
      };
      
      function checkPermission(user, action) {
        const role = user.role;
        if (!roles[role]?.includes(action)) {
          throw new Error('Insufficient permissions');
        }
      }
      
      # MFA for admin
      if (user.role === 'admin' && !req.session.mfaVerified) {
        return res.status(403).json({
          error: 'MFA required',
          mfa_required: true
        });
      }
      
  E-002_partner_data:
    measures:
      - Row-level security (RLS)
      - Data access logging
      - Least privilege principle
      - Data isolation
    implementation: |
      # Row-level security in PostgreSQL
      ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY user_webhook_configs ON webhook_configs
        USING (user_id = current_setting('app.current_user_id')::uuid);
        
      # Application-level check
      async function getWebhookConfig(userId, configId) {
        const config = await db.webhookConfigs.findById(configId);
        if (config.user_id !== userId) {
          throw new Error('Access denied');
        }
        return config;
      }
      
  E-003_api_key_abuse:
    measures:
      - API Key tied to user account
      - API Key scope restrictions
      - Usage monitoring
      - Anomaly detection
    implementation: |
      # API Key validation with user binding
      async function validateApiKey(keyId, userId) {
        const key = await db.apiKeys.findById(keyId);
        if (key.user_id !== userId) {
          throw new Error('API key does not belong to user');
        }
        if (!key.scopes.includes('api_explorer')) {
          throw new Error('API key lacks required scope');
        }
        return key;
      }
      
  E-004_webhook_access:
    measures:
      - User-scoped webhook configs
      - No cross-user webhook access
      - Access audit logging
      - Resource ownership validation
    implementation: |
      # User-scoped webhook query
      async function listWebhooks(userId) {
        return db.webhookConfigs.findMany({
          where: { user_id: userId }
        });
      }
      
      # Ownership check before any operation
      async function updateWebhook(userId, webhookId, data) {
        const webhook = await db.webhookConfigs.findById(webhookId);
        if (webhook.user_id !== userId) {
          throw new Error('Access denied');
        }
        return db.webhookConfigs.update(webhookId, data);
      }
      
  E-005_privilege_escalation:
    measures:
      - Role changes require approval
      - Privilege change audit logging
      - Session invalidation on role change
      - Principle of least privilege
    implementation: |
      # Role change requires approval
      async function changeUserRole(userId, newRole, approverId) {
        # Log the request
        await auditLog.create({
          action: 'role_change_request',
          target_user: userId,
          new_role: newRole,
          requested_by: approverId
        });
        
        # Require approval for elevated roles
        if (['admin', 'superuser'].includes(newRole)) {
          await requireApproval(userId, newRole);
        }
        
        # Invalidate all sessions on role change
        await invalidateAllSessions(userId);
        
        # Update role
        return db.users.update(userId, { role: newRole });
      }
```

---

## 3. Threat Register

### 3.1 Vollständiges Bedrohungsregister

| ID | STRIDE | Bedrohung | Komponente | Likelihood | Impact | Risk Score | Status |
|----|--------|-----------|------------|------------|--------|------------|--------|
| S-001 | Spoofing | Session Hijacking | Authentication | Medium | High | High | Mitigated |
| S-002 | Spoofing | JWT Token Theft | Authentication | Medium | High | High | Mitigated |
| S-003 | Spoofing | API Key Theft | API Explorer | Medium | High | High | Mitigated |
| S-004 | Spoofing | Webhook Signature Spoofing | Webhook | Low | High | Medium | Mitigated |
| S-005 | Spoofing | CSRF Attack | Tools UI | Medium | Medium | Medium | Mitigated |
| T-001 | Tampering | Documentation Tampering | Static Docs | Low | High | Medium | Mitigated |
| T-002 | Tampering | Tool Payload Tampering | Tools Backend | Medium | High | High | Mitigated |
| T-003 | Tampering | Search Index Poisoning | Search | Low | Medium | Low | Mitigated |
| T-004 | Tampering | Webhook Payload Tampering | Webhook | Medium | High | High | Mitigated |
| T-005 | Tampering | Configuration Tampering | Infrastructure | Low | Critical | High | Mitigated |
| R-001 | Repudiation | Missing Audit Logs | Tools Backend | Medium | High | High | Mitigated |
| R-002 | Repudiation | Log Tampering | Observability | Low | High | Medium | Mitigated |
| R-003 | Repudiation | Undocumented Actions | API Explorer | Medium | Medium | Medium | Mitigated |
| R-004 | Repudiation | Webhook Delivery Denial | Webhook | Medium | High | High | Mitigated |
| I-001 | Info Disclosure | API Key Exposure | API Explorer | Medium | Critical | Critical | Mitigated |
| I-002 | Info Disclosure | PII in Logs | Observability | Medium | High | High | Mitigated |
| I-003 | Info Disclosure | Error Message Leakage | Tools Backend | High | Medium | High | Mitigated |
| I-004 | Info Disclosure | Webhook Payload Exposure | Webhook | Medium | High | High | Mitigated |
| I-005 | Info Disclosure | Search Data Exposure | Search | Low | Medium | Low | Mitigated |
| D-001 | DoS | API Explorer Abuse | Tools Backend | High | High | Critical | Mitigated |
| D-002 | DoS | Webhook Simulator Abuse | Webhook | Medium | Medium | Medium | Mitigated |
| D-003 | DoS | Search Spam | Search | Medium | Medium | Medium | Mitigated |
| D-004 | DoS | DDoS Attack | Infrastructure | Medium | Critical | Critical | Mitigated |
| D-005 | DoS | Resource Exhaustion | Tools Backend | Medium | High | High | Mitigated |
| E-001 | Elevation | Admin Access | Tools Backend | Low | Critical | High | Mitigated |
| E-002 | Elevation | Partner Data Access | Database | Medium | Critical | Critical | Mitigated |
| E-003 | Elevation | API Key Abuse | API Explorer | Medium | High | High | Mitigated |
| E-004 | Elevation | Webhook Access | Webhook | Medium | High | High | Mitigated |
| E-005 | Elevation | Privilege Escalation | Authentication | Low | Critical | High | Mitigated |

### 3.2 Risk Score Calculation

```
Risk Score = Likelihood × Impact

Likelihood:
- Low = 1
- Medium = 2
- High = 3

Impact:
- Low = 1
- Medium = 2
- High = 3
- Critical = 4

Risk Score:
- Low: 1-2
- Medium: 3-4
- High: 6
- Critical: 8-12
```

---

## 4. Residual Risk Assessment

### 4.1 Akzeptiertes Restrisiko

| ID | Bedrohung | Residual Risk | Begründung |
|----|-----------|---------------|------------|
| D-004 | DDoS Attack | Low | Cloudflare bietet umfassenden Schutz, aber sehr große Angriffe können dennoch Auswirkungen haben |
| I-003 | Error Leakage | Low | Generische Fehlermeldungen implementiert, aber neue Szenarien können Leaks verursachen |
| E-001 | Admin Access | Very Low | MFA und RBAC implementiert, aber Insider-Bedrohung bleibt |

### 4.2 Risikovermeidung vs. Akzeptanz

```yaml
risk_strategy:
  avoid:
    - "Store no PII in portal"
    - "No production API access from portal"
    
  transfer:
    - "DDoS protection to Cloudflare"
    - "Security monitoring to Datadog"
    
  mitigate:
    - "Rate limiting for all endpoints"
    - "WAF for injection prevention"
    - "RBAC for access control"
    
  accept:
    - "Residual risk from zero-day vulnerabilities"
    - "Risk from advanced persistent threats"
```

---

## 5. Annual Review Process

### 5.1 Review-Zeitplan

| Tätigkeit | Frequenz | Verantwortlich |
|-----------|----------|----------------|
| Threat Register Review | Quartalsweise | Security Team |
| Mitigation Verification | Monatlich | Security Team |
| Penetration Test | Halbjährlich | External Vendor |
| Architecture Review | Quartalsweise | Tech Lead |
| Risk Assessment Update | Jährlich | Security Lead |

### 5.2 Review-Checkliste

```markdown
## Threat Model Annual Review

### Scope Review
- [ ] All components covered
- [ ] New components added since last review
- [ ] Trust boundaries still accurate
- [ ] Data flows updated

### Threat Analysis
- [ ] All STRIDE categories reviewed
- [ ] New threats identified
- [ ] Likelihood/Impact reassessed
- [ ] Risk scores updated

### Mitigation Verification
- [ ] All mitigations implemented
- [ ] Mitigations still effective
- [ ] New mitigations needed
- [ ] Residual risks acceptable

### Documentation
- [ ] Threat register updated
- [ ] Mitigation plan current
- [ ] Contact information current

### Sign-off
- Security Lead: [Signature]
- Tech Lead: [Signature]
- Date: [Date]
```

---

## 6. Compliance-Mapping

### 6.1 Sicherheitsstandards

| Standard | Abgedeckte Anforderungen |
|----------|--------------------------|
| OWASP Top 10 | A01-A10 alle adressiert |
| SOC 2 | CC6.1-CC6.8 Logical Access |
| ISO 27001 | A.9 Access Control, A.12 Operations |
| PCI DSS | 6.5 Secure Coding, 10 Logging |
| GDPR | Art. 32 Security of Processing |

---

*Dieses Threat Model wird jährlich oder bei signifikanten Architekturänderungen überprüft. Letzte Überprüfung: Januar 2025.*
