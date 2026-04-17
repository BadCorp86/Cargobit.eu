# CargoBit Security-Config-Service Deep-Level API Interface

## Übersblick

Der Security-Config-Service ist die zentrale, versionierte Quelle für alle Security-Konfigurationen der CargoBit-Plattform.

---

## 1. API Endpoints

### 1.1 GET /config/security

Liefert die komplette Security-Config.

**Response:**
```json
{
  "version": "2026-04-18-01",
  "loadedAt": "2026-04-18T10:30:00Z",
  "roles": {
    "SHIPPER": { "can": ["orders:create", "orders:read_own", ...] },
    "CARRIER": { "can": ["bids:create", "bids:read_own", ...] },
    "ADMIN": { "can": ["*"] },
    ...
  },
  "abac": {
    "rules": [
      {
        "name": "shipper_owns_order",
        "appliesTo": ["orders:read_own", "orders:update_own"],
        "condition": "resource.shipperId == subject.id",
        "description": "Shipper darf nur eigene Orders"
      }
    ]
  },
  "fraud": {
    "carrierScore": { "weights": {...}, "thresholds": {...} },
    "bidScore": { "weights": {...}, "dumping": {...} },
    "totalScore": { "alphaCarrier": 0.6, "penaltyFactor": 0.5 }
  },
  "rateLimits": [
    { "endpoint": "POST /orders", "maxRequests": 60, "windowMs": 60000 }
  ]
}
```

**Headers:**
- `X-Config-Version: 2026-04-18-01`
- `Cache-Control: no-store`

---

### 1.2 GET /config/security/version

Extrem leichtgewichtig - für regelmäßiges Polling (alle 60s).

**Response:**
```json
{ "version": "2026-04-18-01" }
```

**Headers:**
- `Cache-Control: max-age=30`

---

### 1.3 POST /config/security/reload

Triggert Reload der Config aus Git/S3/DB. Nur Admin/System.

**Request:**
```http
POST /config/security/reload
Authorization: Bearer admin_xxx
# oder
X-Service-Token: srv_xxx
```

**Response (Success):**
```json
{
  "success": true,
  "version": "2026-04-18-02",
  "loadedAt": "2026-04-18T10:35:00Z"
}
```

---

## 2. Error Cases

### 2.1 Fehlerklassen

| Fehler | HTTP | Bedeutung | Verhalten Client |
|--------|------|-----------|------------------|
| `CONFIG_NOT_FOUND` | 404 | Version existiert nicht | Fallback auf Cache |
| `SOURCE_UNAVAILABLE` | 503 | Git/S3/DB nicht erreichbar | Retry + Cache |
| `INVALID_CONFIG` | 422 | YAML/JSON fehlerhaft | Blocker → kein Reload |
| `UNAUTHORIZED` | 401 | Token fehlt/ungültig | Kein Fallback |
| `FORBIDDEN` | 403 | Rolle darf nicht reloaden | Kein Fallback |
| `RATE_LIMITED` | 429 | Zu viele Requests | Retry mit Backoff |

### 2.2 Error Response Format

```json
{
  "error": "SOURCE_UNAVAILABLE",
  "message": "Config backend unreachable",
  "retryAfterSeconds": 30
}
```

---

## 3. Timeouts & Retry-Strategie

### 3.1 Empfohlene Timeouts

| Operation | Timeout |
|-----------|---------|
| `GET /config/security/version` | 200-300ms |
| `GET /config/security` | 500-800ms |
| Reload (intern) | 2-5s |

### 3.2 Retry-Strategie

**Version-Check:**
- 3 Retries
- Exponentielles Backoff: `200ms → 400ms → 800ms`
- Danach: weiter mit Cache

**Config-Fetch:**
- 2 Retries
- Backoff: `500ms → 1000ms`
- Danach: Cache behalten + Warn-Log

---

## 4. Fallback-Strategie

### 4.1 Golden Rule

> **Wenn Security-Config-Service down ist → niemals blockieren. Immer mit Cache weiterarbeiten.**

### 4.2 Cache-Fallback-Matrix

| Situation | Verhalten |
|-----------|-----------|
| Version-Check schlägt fehl | Nutze Cache, logge Warnung |
| Config-Fetch schlägt fehl | Nutze Cache, logge Error |
| Cache leer + Fehler | Startup blockieren |
| Config invalid | Reload verweigern, alte Version behalten |

### 4.3 Cache-TTL

- **Keine harte TTL** - nur Version-Check entscheidet über Reload
- Optional: Soft-TTL (24h) → Warnung, aber kein Block

---

## 5. Versioning-Semantik

### 5.1 Version-Format

```
YYYY-MM-DD-NN
```

**Beispiel:** `2026-04-18-01`

- `YYYY` = Jahr
- `MM` = Monat (01-12)
- `DD` = Tag (01-31)
- `NN` = Sequenzielle Nummer pro Tag (01-99)

### 5.2 Version-Regeln

- Jede Änderung an RBAC/ABAC/Fraud/RateLimits → neue Version
- Version wird im Config-File selbst gespeichert
- Security-Config-Service validiert Version beim Laden

### 5.3 Version-Propagation

```
Domain-Services poll'n /version
  ↓
Bei Änderung:
  ↓
GET /config/security
  ↓
Validieren
  ↓
In-Memory-Cache ersetzen
  ↓
Log: "Security config updated from X to Y"
```

---

## 6. Circuit-Breaker

### 6.1 Auslöser

- **5 aufeinanderfolgende Fehler** bei `/version` oder `/config/security`
- Fehlerarten: 503, Timeout, Connection refused

### 6.2 Verhalten

**Open-State:**
- Keine weiteren Requests für 60 Sekunden
- Nur Cache verwenden
- Log: `"SecurityConfigService unreachable – using cached config"`

**Half-Open:**
- 1 Test-Request nach 60 Sekunden
- Erfolgreich → Closed
- Nicht erfolgreich → wieder Open

---

## 7. Pricing-Service Integration

### 7.1 Startup-Flow

```typescript
const client = new SecurityConfigClient({
  baseUrl: process.env.SECURITY_CONFIG_URL,
  serviceToken: process.env.SERVICE_TOKEN,
});

// Blocking bei Cache leer + Fehler
await client.init();

// Service ist ready
```

### 7.2 Runtime-Flow

```
Alle 60 Sekunden:
  GET /config/security/version
    ↓
  Wenn Version ≠ Cache:
    GET /config/security
      ↓
    Validieren
      ↓
    Cache ersetzen
      ↓
    Fraud-Scoring neu initialisieren
```

### 7.3 Fraud-Scoring Nutzung

```typescript
// Config holen (aus Cache, nie blockierend)
const fraudConfig = client.getFraudConfig();

// Scores berechnen
const carrierScore = computeCarrierFraudScore(stats, fraudConfig);
const bidScore = computeBidFraudScore(bid, pricing, fraudConfig);
const totalScore = computeTotalFraudScore(carrierScore, bidScore, fraudConfig);

// Penalty anwenden
const finalScore = applyFraudPenalty(baseScore, totalScore, fraudConfig);
```

---

## 8. Matching-Service Integration

Der Matching-Service nutzt dieselbe Config für:

1. **Fraud-Penalty** auf Matching-Score
2. **ABAC-Regeln** (Carrier darf nur eigene Bids sehen)
3. **Rate-Limits** für interne APIs

```typescript
// Fraud-Penalty
const { adjustedScore } = applyFraudPenalty(
  matchResult.score,
  fraudScore,
  client.getFraudConfig()
);

// ABAC Check
const rules = client.getABACRules();
const canAccess = checkABAC(rules, 'carrier_owns_bid', subject, resource);
```

---

## 9. Client State

```typescript
interface ClientState {
  status: 'uninitialized' | 'loading' | 'ready' | 'error' | 'circuit_open';
  version: string | null;
  lastCheck: Date | null;
  lastUpdate: Date | null;
  lastError: SecurityConfigError | null;
  errorCount: number;
  circuitState: 'closed' | 'open' | 'half-open';
  usingCachedVersion: boolean;
}
```

---

## 10. Code-Beispiele

### 10.1 Initialisierung

```typescript
import { SecurityConfigClient, initSecurityConfigClient } from '@cargobit/security-config-client';

// Option 1: Direkte Initialisierung
const client = new SecurityConfigClient({
  baseUrl: 'http://security-config-service.core.svc.cluster.local:3005',
  serviceToken: process.env.SERVICE_TOKEN,
  checkIntervalMs: 60000,
  versionTimeoutMs: 300,
  configTimeoutMs: 800,
  versionMaxRetries: 3,
  configMaxRetries: 2,
  initialBackoffMs: 200,
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
  },
  debug: false,
  onConfigChange: (newConfig, oldVersion) => {
    console.log(`Config updated: ${oldVersion} → ${newConfig.version}`);
    // Fraud-Scoring neu initialisieren
  },
  onError: (error) => {
    console.error(`SecurityConfig error: ${error.type} - ${error.message}`);
  },
  onFallback: (reason) => {
    console.warn(`Using cached config: ${reason}`);
  },
});

await client.init();
```

### 10.2 Verwendung im Fraud-Scoring

```typescript
import {
  computeCarrierFraudScore,
  computeBidFraudScore,
  computeTotalFraudScore,
  applyFraudPenalty,
} from '@cargobit/security-config-client';

class FraudScoringEngine {
  constructor(private configClient: SecurityConfigClient) {}
  
  analyze(carrierStats: CarrierStats, bid: BidContext): FraudResult {
    const cfg = this.configClient.getFraudConfig();
    
    // Carrier Score
    const carrierScore = computeCarrierFraudScore({
      cancelRatePercent: carrierStats.cancelRate,
      disputeRatePercent: carrierStats.disputeRate,
      noShowRatePercent: carrierStats.noShowRate,
      patternScore: carrierStats.patternScore,
    }, cfg);
    
    // Bid Score
    const bidScore = computeBidFraudScore({
      bidPrice: bid.price,
      marketPrice: bid.marketPrice,
      dumpingScore: this.calcDumping(bid),
      spamScore: this.calcSpam(bid),
      coordinationScore: this.calcCoordination(bid),
    }, cfg);
    
    // Total Score
    const totalScore = computeTotalFraudScore(carrierScore, bidScore, cfg);
    
    // Determine level
    const level = totalScore < cfg.carrierScore.thresholds.observe 
      ? 'unauffaellig'
      : totalScore < cfg.carrierScore.thresholds.suspect 
        ? 'beobachten'
        : 'fraud_suspected';
    
    return { carrierScore, bidScore, totalScore, level };
  }
}
```

### 10.3 Matching-Service Integration

```typescript
class MatchingEngine {
  constructor(private configClient: SecurityConfigClient) {}
  
  rank(bids: Bid[]): RankedBid[] {
    const fraudConfig = this.configClient.getFraudConfig();
    
    return bids.map(bid => {
      // Base score calculation
      let score = this.calculateBaseScore(bid);
      
      // Apply fraud penalty
      if (fraudConfig.matching.applyPenalty && bid.fraudScore > 0) {
        const { adjustedScore } = applyFraudPenalty(score, bid.fraudScore, fraudConfig);
        score = adjustedScore;
      }
      
      // Cap score for fraud_suspected
      if (bid.fraudLevel === 'fraud_suspected' && fraudConfig.matching.capSuspectedScore) {
        score = Math.min(score, fraudConfig.matching.capSuspectedScore);
      }
      
      // Exclude from auto-match
      const autoMatchEligible = fraudConfig.matching.excludeFromAutoMatch
        ? bid.fraudLevel !== 'fraud_suspected'
        : true;
      
      return { ...bid, score, autoMatchEligible };
    }).sort((a, b) => b.score - a.score);
  }
}
```

---

## 11. Zusammenfassung

Der Security-Config-Service liefert:
- ✅ RBAC (Rollen & Permissions)
- ✅ ABAC (Attribut-basierte Regeln)
- ✅ Fraud-Config (Weights, Thresholds, Penalty)
- ✅ Rate-Limits
- ✅ Versioning (YYYY-MM-DD-NN Format)
- ✅ Reload-Mechanismus

Domain-Services:
- ✅ Halten Config im Memory-Cache
- ✅ Pollen Version alle 60s
- ✅ Reloaden bei Änderung
- ✅ Nutzen Circuit-Breaker
- ✅ Blockieren **nie** bei Ausfall
- ✅ Validieren Config vor Nutzung

---

*Document Version: 1.0.0 | Last Updated: 2026-04-18*
