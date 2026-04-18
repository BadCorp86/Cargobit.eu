# CargoBit Security Architecture Flow

## Übersicht

Dieses Dokument beschreibt die Security-Architektur der CargoBit Transport-Plattform mit Fokus auf Request-Flow, Event-Flow und Security-Kontrollpunkte.

---

## 1. Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL CLIENTS                                    │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐         │
│  │   Shipper   │   │   Carrier   │   │    Admin    │   │   Support   │         │
│  │  (Web/App)  │   │  (Web/App)  │   │  (Dashboard)│   │   (Portal)  │         │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘         │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────┘
          │                 │                 │                 │
          └─────────────────┴────────┬────────┴─────────────────┘
                                       │
                              ┌────────▼────────┐
                              │   Load Balancer │
                              │   (HTTPS/443)   │
                              └────────┬────────┘
                                       │
═══════════════════════════════════════╪═════════════════════════════════════════════
                              NAMESPACE: core
═══════════════════════════════════════╪═════════════════════════════════════════════
                                       │
                    ┌──────────────────▼──────────────────┐
                    │           API-Gateway               │
                    │  ┌─────────────────────────────┐    │
                    │  │ 1. Rate Limiting            │    │
                    │  │ 2. JWT Validation           │    │
                    │  │ 3. RBAC Pre-Check           │    │
                    │  │ 4. Request Logging          │    │
                    │  └─────────────┬───────────────┘    │
                    └────────────────┼────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
          ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────────┐      ┌─────────────────┐
│  Auth-Service   │      │ Security-Config-    │      │   Observability │
│   (Port 3001)   │      │   Service (3005)    │      │   (Prometheus)  │
│                 │      │                     │      │                 │
│ - Login/Logout  │◄────►│ GET /config/security│      │ - Metrics       │
│ - JWT Issuing   │      │ GET /version        │      │ - Tracing       │
│ - Token Refresh │      │ POST /reload        │      │ - Logging       │
│ - MFA           │      │ POST /authz/check   │      │                 │
└────────┬────────┘      └──────────┬──────────┘      └─────────────────┘
         │                          │
         │                          │ Config Distribution
         │                          ▼
═════════╪══════════════════════════╪═════════════════════════════════════════════
         │                 NAMESPACE: domain
═════════╪══════════════════════════╪═════════════════════════════════════════════
         │                          │
         │          ┌───────────────┴───────────────┐
         │          │                               │
         ▼          ▼                               ▼
┌─────────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Pricing-Service    │   │ Matching-Service│   │ Carrier-Service │
│    (Port 3002)      │   │   (Port 3003)   │   │   (Port 3004)   │
│                     │   │                 │   │                 │
│ - Preisberechnung   │   │ - Score Ranking │   │ - Stats         │
│ - Bid-Validierung   │   │ - Fraud Penalty │   │ - Capacity      │
│ - Fraud-Scoring ────┼──►│ - Assignment    │   │ - Profile       │
│                     │   │                 │   │                 │
│ SecurityConfigClient│   │SecurityConfigCl.│   │SecurityConfigCl.│
│   (cached config)   │   │  (cached config)│   │  (cached config)│
└─────────┬───────────┘   └────────┬────────┘   └────────┬────────┘
          │                        │                     │
          │                        │                     │
══════════╪════════════════════════╪═════════════════════╪═════════════════════════
          │                 NAMESPACE: data
══════════╪════════════════════════╪═════════════════════╪═════════════════════════
          │                        │                     │
          ▼                        ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MESSAGE BROKER (Kafka/NATS)                         │
│                                                                                  │
│  Topics: order.*, bid.*, matching.*, execution.*, fraud.*, audit.*             │
└─────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   PostgreSQL    │      │  Audit Store    │      │  S3/Glacier     │
│   (Port 5432)   │      │   (WORM)        │      │  (Documents)    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

---

## 2. Request-Flow mit Security-Kontrollpunkten

### 2.1 Bid Submission Flow (Beispiel)

```
Carrier Client
     │
     │ 1. POST /pricing/orders/{id}/bid/validate
     │    Headers: Authorization: Bearer <JWT>
     │    Body: { carrierId, bidPrice, ... }
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ API-GATEWAY (Checkpoint 1)                                               │
├─────────────────────────────────────────────────────────────────────────┤
│ ✓ Rate Limit Check:                                                     │
│   - Endpoint: POST /pricing/:orderId/bid/validate                       │
│   - Limit: 300 req/min per carrier                                      │
│   - Config from: Security-Config-Service                               │
│                                                                          │
│ ✓ JWT Validation:                                                       │
│   - Verify signature                                                    │
│   - Check expiration                                                    │
│   - Extract: userId, role, companyId                                    │
│                                                                          │
│ ✓ RBAC Pre-Check:                                                       │
│   - Role: CARRIER                                                       │
│   - Required Permission: pricing:validate_bid                           │
│   - Query: Security-Config-Service /authz/check                        │
│                                                                          │
│ ✓ Request Logging:                                                      │
│   - Generate correlationId                                              │
│   - Log: timestamp, userId, endpoint, ip                               │
└─────────────────────────────────────────────────────────────────────────┘
     │
     │ 2. Forwarded Request
     │    Headers: X-User-Id, X-Role, X-Correlation-Id
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PRICING-SERVICE (Checkpoint 2)                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ ✓ Get Config (cached):                                                  │
│   - SecurityConfigClient.getConfig()                                    │
│   - Fraud weights, thresholds, dumping limits                          │
│                                                                          │
│ ✓ Price Validation:                                                     │
│   - Check bidPrice >= hardFloorEur (€20)                               │
│   - Check bidPrice >= minPrice * minPriceFactor (85%)                  │
│   - Calculate discount vs market price                                  │
│                                                                          │
│ ✓ Fraud Score Calculation:                                              │
│   - Carrier Score (Fc): cancel, dispute, noShow, pattern               │
│   - Bid Score (Fb): dumping, spam, coordination                        │
│   - Total Score: Ftotal = 0.6*Fc + 0.4*Fb                             │
│                                                                          │
│ ✓ Fraud Level Classification:                                           │
│   - unauffaellig: Ftotal < 0.3                                         │
│   - beobachten: 0.3 <= Ftotal < 0.6                                    │
│   - fraud_suspected: Ftotal >= 0.6                                     │
│                                                                          │
│ ✓ Event Emission (if configured):                                       │
│   - fraud.suspected → Kafka                                             │
│   - bid.validated → Kafka                                               │
└─────────────────────────────────────────────────────────────────────────┘
     │
     │ 3. Response
     │    { valid, priceScore, fraudScore, fraudLevel, fraudFlags }
     │
     ▼
Carrier Client (zeigt Fraud-Warnung wenn fraudLevel = 'beobachten')
```

---

## 3. Event-Flow Architecture

### 3.1 Event Topics & Producers/Consumers

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           KAFKA/NATS EVENT BUS                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ORDER DOMAIN                                                                    │
│  ├── order.created      → [Pricing, Notification]                               │
│  ├── order.updated      → [Notification, Audit]                                 │
│  ├── order.cancelled    → [Pricing, Matching, Notification]                     │
│  └── order.published    → [Pricing, Matching, Notification]                     │
│                                                                                  │
│  PRICING DOMAIN                                                                  │
│  ├── pricing.calculated → [Matching, Notification]                              │
│  └── pricing.updated    → [Audit, Matching]                                     │
│                                                                                  │
│  BID DOMAIN                                                                      │
│  ├── bid.submitted      → [Matching, Carrier-Stats, Audit]                      │
│  ├── bid.validated      → [Matching, Audit, Fraud-Scoring]                      │
│  ├── bid.accepted       → [Execution, Notification, Carrier-Stats]              │
│  └── bid.rejected       → [Notification, Carrier-Stats]                         │
│                                                                                  │
│  MATCHING DOMAIN                                                                 │
│  ├── matching.completed → [Execution, Notification, Carrier-Stats]              │
│  └── matching.failed    → [Notification, Audit]                                 │
│                                                                                  │
│  EXECUTION DOMAIN                                                                │
│  ├── execution.status_changed → [Notification, Carrier-Stats, Audit]            │
│  ├── execution.pod_uploaded   → [Billing, Audit]                                │
│  └── execution.completed      → [Billing, Carrier-Stats, Notification]          │
│                                                                                  │
│  FRAUD DOMAIN                                                                    │
│  ├── fraud.suspected    → [Matching, Audit, Notification, Risk-Engine]          │
│  └── fraud.flagged      → [Audit, Notification]                                 │
│                                                                                  │
│  AUDIT DOMAIN                                                                    │
│  └── audit.record_created → [Audit-Store (WORM)]                                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Fraud Event Flow

```
┌─────────────────┐
│ Pricing-Service │
│ (Bid Validation)│
└────────┬────────┘
         │
         │ fraudScore >= 0.6
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         fraud.suspected EVENT                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ {                                                                               │
│   "id": "evt_abc123",                                                           │
│   "topic": "fraud.suspected",                                                   │
│   "timestamp": "2026-04-18T10:30:00Z",                                          │
│   "correlationId": "bid_validate_ord123_1713435600000",                         │
│   "source": "pricing-service",                                                  │
│   "payload": {                                                                  │
│     "entityId": "bid_carrier123_ord123",                                        │
│     "entityType": "bid",                                                        │
│     "carrierId": "carrier123",                                                  │
│     "bidId": "bid_789",                                                         │
│     "orderId": "ord123",                                                        │
│     "carrierFraudScore": 0.45,                                                  │
│     "bidFraudScore": 0.82,                                                      │
│     "totalFraudScore": 0.62,                                                    │
│     "fraudLevel": "fraud_suspected",                                            │
│     "breakdown": { ... },                                                       │
│     "recommendations": [                                                        │
│       "FRAUD SUSPECTED - Kein Auto-Match",                                      │
│       "In Manual-Review-Queue aufnehmen"                                        │
│     ],                                                                          │
│     "configVersion": "20260418-1030"                                            │
│   }                                                                             │
│ }                                                                               │
└─────────────────────────────────────────────────────────────────────────────────┘
         │
         ├─────────────────────────────────────────────┐
         │                     │                       │
         ▼                     ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ Matching-Service│   │  Risk-Engine    │   │  Audit-Service  │
│                 │   │                 │   │  (WORM Store)   │
│ - Exclude from  │   │ - Increase      │   │ - Immutable     │
│   Auto-Match    │   │   Risk-Level    │   │   Record        │
│ - Add to manual │   │ - Add flag      │   │ - 10yr Retention│
│   review queue  │   │                 │   │                 │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## 4. Security-Config-Service Interface

### 4.1 Externe API

```http
### Full Config
GET /config/security
X-Service-Token: srv_xxx

Response 200:
{
  "version": "20260418-1030",
  "roles": { "SHIPPER": {...}, "CARRIER": {...}, ... },
  "abac": { "rules": [...] },
  "fraud": { ... },
  "rateLimits": [...]
}

### Version Check
GET /config/security/version

Response 200:
{
  "version": "20260418-1030",
  "loadedAt": "2026-04-18T10:30:00Z",
  "reloadCount": 5
}

### Reload Config (Admin only)
POST /config/security/reload
Authorization: Bearer admin_xxx

Response 200:
{
  "success": true,
  "version": "20260418-1035",
  "loadedAt": "2026-04-18T10:35:00Z"
}

### Authorization Check
POST /authz/check
Content-Type: application/json

{
  "subject": { "id": "user123", "role": "CARRIER" },
  "action": "pricing:validate_bid",
  "resource": { "type": "order", "id": "ord123" }
}

Response 200:
{
  "allowed": true,
  "matchedRule": "rbac:allowed",
  "configVersion": "20260418-1030"
}

### Health & Ready
GET /health
GET /ready
```

### 4.2 Client-Side Caching Pattern

```typescript
// In jedem Domain-Service
const client = new SecurityConfigClient({
  baseUrl: 'http://security-config-service.core.svc.cluster.local:3005',
  serviceToken: process.env.SERVICE_TOKEN,
  checkIntervalMs: 60000,  // Check every 60s
});

// Init beim Service-Start
await client.init();

// Verwendung
const fraudConfig = client.getFraudConfig();
const threshold = fraudConfig.carrierScore.thresholds.suspect;
```

---

## 5. Kubernetes Network Security

### 5.1 Namespace Isolation

| Namespace | Purpose | Services |
|-----------|---------|----------|
| `core` | Zentrale Infrastruktur | API-Gateway, Auth, Security-Config, Observability |
| `domain` | Business-Services | Order, Pricing, Matching, Execution, Carrier |
| `data` | Persistenz | PostgreSQL, Kafka, Redis, S3 |

### 5.2 Network Policy Summary

```yaml
# Security-Config-Service
Ingress:
  - from: namespace(type=core)
  - from: namespace(type=domain)
Egress:
  - to: any (for config source: S3/Git)

# Pricing-Service
Ingress:
  - from: namespace(type=core), pod(api-gateway)
Egress:
  - to: namespace(type=core), pod(security-config-service)
  - to: namespace(type=data), pod(kafka)
  - to: namespace(type=data), pod(postgres)

# API-Gateway (einziger externer Entry-Point)
Ingress:
  - from: LoadBalancer/Ingress
Egress:
  - to: namespace(type=core)
  - to: namespace(type=domain)
```

---

## 6. Security Checkpoints Summary

| Checkpoint | Location | Check Type | Config Source |
|------------|----------|------------|---------------|
| CP-1 | API-Gateway | Rate Limiting | Security-Config-Service |
| CP-1 | API-Gateway | JWT Validation | Auth-Service |
| CP-1 | API-Gateway | RBAC Pre-Check | Security-Config-Service |
| CP-2 | Pricing-Service | Price Validation | Security-Config-Service |
| CP-2 | Pricing-Service | Fraud Scoring | Security-Config-Service |
| CP-3 | Matching-Service | Fraud Penalty | Security-Config-Service |
| CP-3 | Matching-Service | Auto-Match Exclusion | Security-Config-Service |

---

## 7. Config-Driven Security Parameters

### 7.1 Fraud Scoring Formulas

```
Carrier Score (Fc):
Fc = 0.3·Ccancel + 0.3·Cdispute + 0.2·CnoShow + 0.2·Cpattern

Bid Score (Fb):
Fb = 0.5·Bdumping + 0.3·Bspam + 0.2·Bcoordination

Total Score:
Ftotal = 0.6·Fc + 0.4·Fb

Matching Penalty:
Score' = Score · (1 - 0.5·Ftotal)
```

### 7.2 Config Hot-Reload Flow

```
1. Admin updates security-config.yaml in Git/S3
2. Admin calls POST /config/security/reload
3. Security-Config-Service reloads config
4. Version changes: 20260418-1030 → 20260418-1035
5. Domain-Services detect version change (polling)
6. Domain-Services reload config
7. New thresholds applied immediately
```

---

*Document Version: 1.0.0 | Last Updated: 2026-04-18*
