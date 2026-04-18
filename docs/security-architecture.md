# CargoBit Security Architecture

## Übersicht

Diese Dokumentation beschreibt die Security-Architektur der CargoBit Transport-Plattform mit:
- Security-Config-Service als zentrale Konfigurationsquelle
- RBAC/ABAC Autorisierung
- Fraud-Scoring Integration
- Event-Driven Security Flows

---

## 1. Service-Landscape

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CARGOBIT PLATFORM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  Shipper App    │  │  Carrier App    │  │  Admin Dashboard│             │
│  │  (React/Next)   │  │  (React/Next)   │  │  (React/Next)   │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                │                                            │
│                                ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        API GATEWAY (Port 3000)                       │   │
│  │  • AuthN (JWT/OIDC Validation)                                      │   │
│  │  • Rate Limiting (per endpoint)                                     │   │
│  │  • Request Routing                                                  │   │
│  │  • Basic WAF                                                        │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                          │
│           ┌──────────────────────┼──────────────────────┐                  │
│           │                      │                      │                  │
│           ▼                      ▼                      ▼                  │
│  ┌────────────────┐   ┌──────────────────┐   ┌────────────────┐           │
│  │ Auth Service   │   │ Security-Config  │   │ Event Bus      │           │
│  │ Port: 3001     │   │ Service          │   │ (Kafka/NATS)   │           │
│  │                │   │ Port: 3005       │   │                │           │
│  │ • JWT Issue    │   │                  │   │ • Topics       │           │
│  │ • Session Mgmt │   │ • RBAC Config    │   │ • Pub/Sub      │           │
│  │ • 2FA          │   │ • ABAC Rules     │   │ • DLQ          │           │
│  │ • Password     │   │ • Fraud Config   │   │                │           │
│  └────────┬───────┘   │ • Rate Limits    │   └───────┬────────┘           │
│           │           └────────┬─────────┘           │                    │
│           │                    │                     │                    │
│           │           Config   │                     Events               │
│           │           ┌────────┴────────┐            │                    │
│           │           │                 │            │                    │
│           │           ▼                 ▼            ▼                    │
│  ┌────────┴────────────────────────────────────────────────────────────┐  │
│  │                      DOMAIN SERVICES                                 │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐           │  │
│  │  │  Order    │ │  Pricing  │ │  Bidding  │ │ Matching  │           │  │
│  │  │  Service  │ │  Service  │ │  Service  │ │  Service  │           │  │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘           │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐           │  │
│  │  │ Execution │ │   Risk    │ │  Carrier  │ │ Notif.    │           │  │
│  │  │  Service  │ │  Service  │ │  Service  │ │  Service  │           │  │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                  │                                         │
│                                  ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                         DATA LAYER                                   │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐           │  │
│  │  │ PostgreSQL│ │   Redis   │ │    S3     │ │TimescaleDB│           │  │
│  │  │ (Primary) │ │  (Cache)  │ │  (Files)  │ │ (Metrics) │           │  │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Security-Config-Service (Port 3005)

### 2.1 Verantwortlichkeiten

Der Security-Config-Service ist die **zentrale, versionierte Quelle** für:

| Komponente | Beschreibung |
|------------|--------------|
| **Rollen & Permissions** | RBAC Matrix mit `can`/`cannot` Listen |
| **ABAC Regeln** | Attribut-basierte Bedingungen |
| **Fraud Config** | Gewichte, Thresholds, Dumping/Spam/Coordination Parameter |
| **Rate Limits** | Endpoint-spezifische Limits |
| **Audit Config** | Event-Logging, WORM-Store |
| **Retention Policies** | Aufbewahrungsfristen |

### 2.2 API Endpoints

```yaml
# Komplette Security-Config (intern)
GET /config/security
  Headers: X-Service-Token: srv_xxx
  Response:
    version: "20260418-1430"
    roles: { SHIPPER: {...}, CARRIER: {...}, ... }
    abac: { rules: [...] }
    fraud: { carrierScore: {...}, bidScore: {...}, ... }
    rateLimits: [...]
    audit: {...}
    retention: {...}

# Version-Info
GET /config/security/version
  Response:
    version: "20260418-1430"
    loadedAt: "2026-04-18T14:30:00Z"
    reloadCount: 3

# Config neu laden (Admin/System only)
POST /config/security/reload
  Headers: Authorization: Bearer admin_xxx
  Response:
    success: true
    version: "20260418-1500"
    loadedAt: "2026-04-18T15:00:00Z"

# Authorization Check
POST /authz/check
  Body:
    subject: { id: "car_123", role: "CARRIER" }
    action: "bids:create"
    resource: { type: "order", id: "ord_999", shipperId: "ship_1" }
  Response:
    allowed: true
    matchedRule: "rbac:carrier"
    configVersion: "20260418-1430"

# Nur Fraud-Config
GET /fraud/config
  Response:
    carrierScore: { weights: {...}, thresholds: {...} }
    bidScore: { weights: {...}, dumping: {...} }
    totalScore: { alphaCarrier: 0.6, penaltyFactor: 0.5 }
    ...

# Rate Limits
GET /rate-limits
  Response: [{ endpoint: "POST /orders", maxRequests: 60, ... }, ...]
```

### 2.3 Config-Versionierung

```yaml
# Version Format: YYYYMMDD-HHMM
version: "20260418-1430"

# Version wird generiert bei:
# 1. Service Start
# 2. POST /config/security/reload

# Services können Version abfragen:
# - Polling: GET /config/security/version alle 60s
# - Event: "config.version_changed" Event bei Reload
```

---

## 3. Fraud-Score Integration

### 3.1 Pricing-Engine mit Fraud-Score

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BID VALIDATION FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Carrier App                                                                 │
│      │                                                                       │
│      │ POST /api/pricing/orders/{id}/bid/validate                           │
│      │ { carrierId, bidPrice, ... }                                         │
│      ▼                                                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        PRICING SERVICE                                 │  │
│  │                                                                        │  │
│  │  ┌─────────────────┐     ┌─────────────────┐                          │  │
│  │  │ 1. Price Check  │────▶│ 2. Fraud Check  │                          │  │
│  │  │    minPrice     │     │    Carrier Stats│                          │  │
│  │  │    startPrice   │     │    Bid Context  │                          │  │
│  │  │    marketPrice  │     │    Fc + Fb      │                          │  │
│  │  └─────────────────┘     └────────┬────────┘                          │  │
│  │                                   │                                    │  │
│  │                                   ▼                                    │  │
│  │          ┌────────────────────────────────────────┐                   │  │
│  │          │ 3. Security-Config-Service Call        │                   │  │
│  │          │    GET /fraud/config                   │                   │  │
│  │          │    → weights, thresholds, ...          │                   │  │
│  │          └────────────────────────────────────────┘                   │  │
│  │                                   │                                    │  │
│  │                                   ▼                                    │  │
│  │          ┌────────────────────────────────────────┐                   │  │
│  │          │ 4. Calculate Scores                    │                   │  │
│  │          │    priceScore = position in range      │                   │  │
│  │          │    fraudScore = α·Fc + (1-α)·Fb        │                   │  │
│  │          └────────────────────────────────────────┘                   │  │
│  │                                   │                                    │  │
│  └───────────────────────────────────┼────────────────────────────────────┘  │
│                                      │                                       │
│                                      ▼                                       │
│          ┌───────────────────────────────────────────────────────────────┐  │
│          │                       RESPONSE                                │  │
│          │  {                                                            │  │
│          │    "valid": true,                                            │  │
│          │    "priceScore": 0.72,                                       │  │
│          │    "fraudScore": 0.41,                                       │  │
│          │    "fraudLevel": "beobachten",                               │  │
│          │    "fraudFlags": ["DUMPING_PATTERN"],                        │  │
│          │    "details": {                                              │  │
│          │      "minPrice": 65,                                         │  │
│          │      "marketPrice": 95,                                      │  │
│          │      "discountPct": 21                                       │  │
│          │    },                                                        │  │
│          │    "configVersion": "20260418-1430"                          │  │
│          │  }                                                           │  │
│          └───────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Fraud Score Formeln

```typescript
// Carrier Fraud Score (Fc ∈ [0,1])
Fc = 0.3·Ccancel + 0.3·Cdispute + 0.2·CnoShow + 0.2·Cpattern

// Bid Fraud Score (Fb ∈ [0,1])
Fb = 0.5·Bdumping + 0.3·Bspam + 0.2·Bcoordination

// Total Fraud Score
Ftotal = 0.6·Fc + 0.4·Fb  // α = 0.6: Carrier-Historie wiegt mehr

// Matching Penalty
Score' = Score · (1 - 0.5·Ftotal)  // β = 0.5
```

### 3.3 Thresholds & Actions

| Ftotal | Level | Action |
|--------|-------|--------|
| < 0.3 | unauffällig | Normal durchlassen |
| 0.3 - 0.6 | beobachten | Flag + Penalty anwenden |
| ≥ 0.6 | fraud_suspected | Kein Auto-Match, Manual Review, `fraud.suspected` Event |

---

## 4. Request-Flow Beispiel

### 4.1 Bid Validation mit Fraud-Score

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BID VALIDATION REQUEST FLOW                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Carrier App                                                              │
│     │                                                                        │
│     │ POST /api/pricing/orders/ord_123/bid/validate                         │
│     │ Authorization: Bearer jwt_xxx                                          │
│     │ { carrierId: "car_456", bidPrice: 75 }                                │
│     │                                                                        │
│     ▼                                                                        │
│  2. API Gateway                                                              │
│     ├─ AuthN: JWT validieren → User: car_456, Role: CARRIER                 │
│     ├─ Rate Limit: 120 req/min für CARRIER → OK                             │
│     └─ Route: → Pricing Service                                              │
│     │                                                                        │
│     ▼                                                                        │
│  3. Pricing Service                                                          │
│     │                                                                        │
│     │ GET http://security-config:3005/fraud/config                          │
│     │ X-Service-Token: srv_pricing_xxx                                      │
│     │ ← { weights, thresholds, ... }                                        │
│     │                                                                        │
│     │ GET /authz/check                                                       │
│     │ { subject: {id: "car_456", role: "CARRIER"},                          │
│     │   action: "pricing:validate_bid",                                     │
│     │   resource: {type: "order", id: "ord_123"} }                          │
│     │ ← { allowed: true, configVersion: "..." }                             │
│     │                                                                        │
│     │ Berechne:                                                              │
│     │ - priceScore = 0.72                                                    │
│     │ - carrierFraudScore = 0.23                                             │
│     │ - bidFraudScore = 0.45                                                 │
│     │ - totalFraudScore = 0.31 → "beobachten"                               │
│     │                                                                        │
│     │ AUDIT: bid.validated Event                                             │
│     │                                                                        │
│     ▼                                                                        │
│  4. Response                                                                 │
│     {                                                                        │
│       "valid": true,                                                         │
│       "priceScore": 0.72,                                                    │
│       "fraudScore": 0.31,                                                    │
│       "fraudLevel": "beobachten",                                           │
│       "fraudFlags": [],                                                      │
│       "details": { minPrice: 65, marketPrice: 95, discountPct: 21 }         │
│     }                                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Event-Flow Beispiel

### 5.1 Matching mit Fraud-Penalty

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MATCHING EVENT FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. bid.validated Event (vom Pricing Service)                               │
│     {                                                                        │
│       bidId: "bid_789",                                                      │
│       orderId: "ord_123",                                                    │
│       carrierId: "car_456",                                                  │
│       priceScore: 0.72,                                                      │
│       fraudScore: 0.31,                                                      │
│       fraudLevel: "beobachten"                                              │
│     }                                                                        │
│     │                                                                        │
│     ▼                                                                        │
│  2. Matching Service (Event Consumer)                                        │
│     │                                                                        │
│     │ GET http://security-config:3005/fraud/config                          │
│     │ ← { totalScore.penaltyFactor: 0.5, ... }                              │
│     │                                                                        │
│     │ Berechne:                                                              │
│     │ baseScore = 85 (aus Multi-Criteria Scoring)                           │
│     │ penaltyFactor = 0.5                                                    │
│     │ fraudScore = 0.31                                                      │
│     │                                                                        │
│     │ finalScore = 85 × (1 - 0.5 × 0.31)                                    │
│     │            = 85 × 0.845                                               │
│     │            = 71.8                                                     │
│     │                                                                        │
│     │ AUDIT: matching.score_calculated                                       │
│     │                                                                        │
│     ▼                                                                        │
│  3. matching.completed Event                                                 │
│     {                                                                        │
│       orderId: "ord_123",                                                    │
│       winner: { carrierId: "car_456", score: 71.8, ... },                   │
│       fraudApplied: {                                                        │
│         baseScore: 85,                                                       │
│         penaltyPercent: 15.5,                                               │
│         fraudScore: 0.31                                                     │
│       }                                                                      │
│     }                                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Security-Kontrollpunkte

### 6.1 API Gateway Level

| Kontrolle | Beschreibung |
|-----------|--------------|
| **AuthN** | JWT/OIDC Token Validation |
| **Rate Limiting** | Per-Endpoint Limits aus Config |
| **Basic WAF** | SQL Injection, XSS, Path Traversal |
| **Request Logging** | Alle Requests mit Correlation-ID |

### 6.2 Security-Config-Service Level

| Kontrolle | Beschreibung |
|-----------|--------------|
| **Zentrale Policy-Quelle** | Single Source of Truth für alle Security-Config |
| **Versionierung** | Änderungen nachvollziehbar |
| **Hot Reload** | Config-Änderungen ohne Neustart |
| **Service Token** | Nur interne Services haben Zugriff |

### 6.3 Domain Service Level

| Kontrolle | Beschreibung |
|-----------|--------------|
| **Authz Check** | RBAC + ABAC via `/authz/check` |
| **Fraud Score** | Config-driven Fraud-Scoring |
| **Audit Logging** | Alle Security-relevanten Events |
| **Event Emission** | `fraud.suspected`, `permission.denied` |

---

## 7. Fraud-Config YAML Struktur

```yaml
fraud:
  # Carrier Fraud Score (Fc)
  carrierScore:
    weights:
      cancelRate: 0.3      # w1: Stornoquote
      disputeRate: 0.3     # w2: Dispute-Quote
      noShowRate: 0.2      # w3: No-Show Rate
      patternScore: 0.2    # w4: Pattern-Erkennung

    thresholds:
      observe: 0.3         # Ftotal >= 0.3: beobachten
      suspect: 0.6         # Ftotal >= 0.6: fraud_suspected

  # Bid Fraud Score (Fb)
  bidScore:
    weights:
      dumping: 0.5         # v1: Dumping-Erkennung
      spam: 0.3            # v2: Spam-Erkennung
      coordination: 0.2    # v3: Koordination/Collusion

    dumping:
      maxDiscountVsMarket: 0.35  # 35% max Rabatt

    spam:
      maxBidsPerOrderPerHour: 20

    coordination:
      similarityWindowMinutes: 5
      similarityThreshold: 0.95

  # Total Score
  totalScore:
    alphaCarrier: 0.6      # Carrier-Historie wiegt mehr
    penaltyFactor: 0.5     # Penalty für Matching

  # Matching Integration
  matching:
    applyPenalty: true
    capSuspectedScore: 30  # Max Score bei fraud_suspected
    excludeFromAutoMatch: true

  # Events
  events:
    emitFraudSuspected: true
    emitFraudFlagged: true
    auditAllScores: true
```

---

## 8. Integration in andere Services

### 8.1 Pricing Service

```typescript
// Beim Start: Config laden
const fraudConfig = await fetch('http://security-config:3005/fraud/config');

// Periodisch: Version prüfen (alle 60s)
setInterval(async () => {
  const { version } = await fetch('http://security-config:3005/config/security/version');
  if (version !== currentVersion) {
    fraudConfig = await fetch('http://security-config:3005/fraud/config');
  }
}, 60000);

// Bei Bid-Validation: Fraud-Score berechnen
const fraudScore = calculateFraudScore(carrierStats, bidContext, fraudConfig);
```

### 8.2 Matching Service

```typescript
// Fraud-Penalty anwenden
const { alphaCarrier, penaltyFactor } = fraudConfig.totalScore;
const finalScore = baseScore * (1 - penaltyFactor * fraudScore);

// Bei fraud_suspected: Event emittieren
if (fraudScore >= fraudConfig.carrierScore.thresholds.suspect) {
  await eventBus.publish({
    topic: 'fraud.suspected',
    payload: { carrierId, fraudScore, ... }
  });
}
```

---

## 9. Monitoring & Alerting

### 9.1 Key Metrics

| Metric | Beschreibung | Alert Threshold |
|--------|--------------|-----------------|
| `fraud.suspected.count` | Fraud-Suspected Events | > 10/hour |
| `authz.denied.count` | Permission Denied | > 100/hour |
| `fraud_score.avg` | Durchschnittlicher Fraud-Score | > 0.4 |
| `config.reload.count` | Config Reloads | > 5/hour |

### 9.2 Dashboard Widgets

- **Fraud Level Distribution**: Pie Chart (unauffällig/beobachten/fraud_suspected)
- **Top Flagged Carriers**: Tabelle mit Fraud-Score
- **Authz Denials by Role**: Bar Chart
- **Config Version Timeline**: Line Chart

---

## 10. File References

| Datei | Beschreibung |
|-------|--------------|
| `/config/security-config.yaml` | Zentrale YAML-Konfiguration |
| `/mini-services/security-config-service/index.ts` | Security-Config Microservice |
| `/src/services/fraud-scoring.service.ts` | Config-driven Fraud Service |
| `/src/services/security-config.service.ts` | Config Loader |
| `/src/app/api/authz/check/route.ts` | Authorization API |
| `/src/app/api/pricing/orders/[id]/bid/validate/route.ts` | Pricing mit Fraud-Score |

---

*Stand: 2026-04-18*  
*Version: 2.0.0*
