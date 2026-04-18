# CargoBit Security & Fraud - Epics & Tickets

**Projekt:** CargoBit Transport Platform  
**Bereich:** Security, Fraud Detection, Compliance  
**Version:** 1.0.0  
**Datum:** 2026-04-18

---

## Epic 1: Security-Config-Service

**Ziel:** Zentrale, versionierte Konfiguration für RBAC, ABAC und Fraud-Scoring.

### Story 1.1: Rollen & Permissions konfigurierbar verwalten

**Als** Admin  
**möchte ich** Rollen & Permissions zentral in einer YAML-Config verwalten  
**damit** alle Services konsistent prüfen können, wer was darf.

**Akzeptanzkriterien:**
- [ ] `config/security-config.yaml` mit allen Rollen (SHIPPER, CARRIER, ADMIN, SUPPORT, SYSTEM)
- [ ] Jede Rolle definiert `can` und `cannot` Permissions
- [ ] Wildcard-Support (`"*"` für ADMIN)
- [ ] Hot-Reload der Config ohne Service-Restart
- [ ] Config-Version wird in Audit-Logs gespeichert

**Implementierung:**
```typescript
// src/services/security-config.service.ts
const config = SecurityConfigService.getInstance();
const hasPermission = config.hasPermission('SHIPPER', 'orders:create');
```

**Story Points:** 5  
**Priority:** High

---

### Story 1.2: /authz/check Endpoint für Services

**Als** Service (Order, Pricing, Matching)  
**möchte ich** über einen `/authz/check`-Endpoint prüfen  
**ob** subject Aktion X auf resource ausführen darf.

**Akzeptanzkriterien:**
- [ ] `POST /internal/authz/check` Endpoint
- [ ] Request: `{ subject: {id, role}, action, resource: {...} }`
- [ ] Response: `{ allowed, reason?, matchedRule?, configVersion }`
- [ ] RBAC-Check zuerst, dann ABAC-Check
- [ ] < 10ms Response Time (Cache)

**API-Schema:**
```yaml
POST /internal/authz/check
Request:
  subject:
    id: "usr_123"
    role: "SHIPPER"
    companyId: "comp_456"
  action: "orders:read_own"
  resource:
    type: "order"
    id: "order_789"
    shipperId: "usr_123"
Response:
  allowed: true
  abacConditionMet: true
  configVersion: "1.0.0"
```

**Story Points:** 8  
**Priority:** High

---

### Story 1.3: ABAC-Regeln in Config definieren

**Als** Entwickler  
**möchte ich** ABAC-Regeln (z.B. `shipperId == subjectId`) in der Config definieren  
**damit** ich sie nicht im Code duplizieren muss.

**Akzeptanzkriterien:**
- [ ] ABAC-Regeln in `security-config.yaml` unter `abac.rules`
- [ ] Bedingungs-Support: `==`, `CONTAINS`, `IN`, `OR`, `DENY`
- [ ] Regeln auf Permissions gemappt (`appliesTo`)
- [ ] Evaluierung durch `evaluateABACCondition()`

**Beispiel-Regel:**
```yaml
abac:
  rules:
    - name: shipper_owns_order
      appliesTo: [orders:read_own, pricing:read_own]
      condition: "resource.shipperId == subject.id"
      description: "Shipper darf nur auf eigene Orders"
```

**Story Points:** 5  
**Priority:** High

---

## Epic 2: Fraud-Scoring

**Ziel:** Automatische Fraud-Erkennung mit konfigurierbaren Scores und Thresholds.

### Story 2.1: Bid-Fraud-Score berechnen

**Als** Pricing-Service  
**möchte ich** pro Bid einen `bidFraudScore` berechnen  
**basierend auf** Dumping, Spam und Koordination, konfigurierbar über Fraud-Config.

**Akzeptanzkriterien:**
- [ ] `Fb = 0.5·Bdumping + 0.3·Bspam + 0.2·Bcoordination`
- [ ] Dumping-Erkennung: `maxDiscountVsMarket: 35%`
- [ ] Spam-Erkennung: `maxBidsPerOrderPerHour: 20`
- [ ] Koordination: `similarityThreshold: 0.95` für gleiche Bids
- [ ] Score ∈ [0, 1], Config-Version im Audit

**Berechnung:**
```typescript
// Bdumping = 1 - (bidPrice - minPrice) / (startPrice - minPrice)
const Bdumping = calculateDumpingScore(bidPrice, minPrice, startPrice);
const Fb = 0.5 * Bdumping + 0.3 * Bspam + 0.2 * Bcoordination;
```

**Story Points:** 8  
**Priority:** High

---

### Story 2.2: Carrier-Fraud-Score im Matching

**Als** Matching-Service  
**möchte ich** pro Carrier einen `carrierFraudScore` berechnen  
**und** im Matching-Score als Penalty berücksichtigen.

**Akzeptanzkriterien:**
- [ ] `Fc = 0.3·Ccancel + 0.3·Cdispute + 0.2·CnoShow + 0.2·Cpattern`
- [ ] Lookback: 90 Tage für Storno/No-Show, 180 Tage für Disputes
- [ ] `Ftotal = 0.6·Fc + 0.4·Fb` (Carrier-Historie wiegt mehr)
- [ ] `Score' = Score · (1 - 0.5·Ftotal)` Penalty

**Matching-Integration:**
```typescript
const Ftotal = 0.6 * carrierScore + 0.4 * bidScore;
const adjustedScore = originalScore * (1 - 0.5 * Ftotal);

if (Ftotal >= 0.6) {
  adjustedScore = Math.min(adjustedScore, 30); // Cap
  // Kein Auto-Match
}
```

**Story Points:** 8  
**Priority:** High

---

### Story 2.3: fraud.suspected Event für Risk-Service

**Als** Risk-Service  
**möchte ich** Events `fraud.suspected` erhalten  
**wenn** `Ftotal >= suspectThreshold (0.6)`  
**um** Carrier für manuelle Prüfung zu markieren.

**Akzeptanzkriterien:**
- [ ] Event `fraud.suspected` mit Payload: `{ carrierId, Ftotal, Fc, Fb, orderId?, bidId? }`
- [ ] Event auf Topic `fraud.suspected` veröffentlicht
- [ ] Risk-Service subscribed und erstellt Review-Ticket
- [ ] Audit-Log Eintrag mit Config-Version

**Event-Schema:**
```json
{
  "type": "fraud.suspected",
  "payload": {
    "carrierId": "car_123",
    "totalScore": 0.72,
    "carrierScore": 0.65,
    "bidScore": 0.85,
    "level": "fraud_suspected",
    "orderId": "order_456",
    "configVersion": "1.0.0"
  },
  "correlationId": "trace_abc"
}
```

**Story Points:** 5  
**Priority:** High

---

### Story 2.4: Fraud-Scores im Audit-Log

**Als** Compliance-Officer  
**möchte ich** Fraud-Scores und Entscheidungen im Audit-Log sehen  
**inkl.** verwendeter Config-Version.

**Akzeptanzkriterien:**
- [ ] Jeder Fraud-Score-Berechnung erzeugt Audit-Record
- [ ] `configVersion` im Audit-Record
- [ ] `payloadBefore` und `payloadAfter` bei Status-Änderungen
- [ ] WORM-Store für Audit-Logs (S3 Glacier)
- [ ] 10 Jahre Retention

**Audit-Record:**
```json
{
  "id": "audit_123",
  "timestamp": "2026-04-18T10:00:00Z",
  "actorType": "system",
  "actorId": "svc_fraud",
  "service": "fraud-service",
  "action": "FRAUD_SCORE_CALCULATED",
  "entityType": "carrier",
  "entityId": "car_123",
  "payloadAfter": {
    "totalScore": 0.72,
    "level": "fraud_suspected"
  },
  "configVersion": "1.0.0"
}
```

**Story Points:** 5  
**Priority:** Medium

---

## Epic 3: Rate-Limiting

**Ziel:** API-Schutz vor Missbrauch mit Redis-basiertem Token-Bucket.

### Story 3.1: Rate-Limit-Config aus security-config.yaml laden

**Als** API-Gateway  
**möchte ich** Rate-Limits aus der zentralen Config laden  
**damit** Limits einheitlich und wartbar sind.

**Akzeptanzkriterien:**
- [ ] Rate-Limits in `security-config.yaml` definiert
- [ ] Per Endpoint, Scope (shipper/carrier/user/ip)
- [ ] Key-Template: `carrier:{carrierId}`
- [ ] Redis Token-Bucket Implementierung

**Config-Beispiel:**
```yaml
rateLimits:
  - endpoint: "POST /bids"
    maxRequests: 120
    windowMs: 60000
    scope: "carrier"
    keyTemplate: "carrier:{carrierId}"
```

**Story Points:** 5  
**Priority:** High

---

## Epic 4: Data Retention

**Ziel:** Compliance-konforme Datenvorhaltung mit automatischen Purge-Jobs.

### Story 4.1: Retention-Policies aus Config

**Als** Data-Engineer  
**möchte ich** Retention-Policies in der Config definieren  
**damit** Aufbewahrungsfristen zentral verwaltet werden.

**Akzeptanzkriterien:**
- [ ] Policies in `security-config.yaml`
- [ ] GDPR-Ausnahmen gekennzeichnet
- [ ] `legalBasis` für jede Policy
- [ ] Purge-Job Schedule konfigurierbar

**Story Points:** 3  
**Priority:** Medium

---

## Priorisierung

| Epic | Stories | SP | Priority | Sprint |
|------|---------|----|----------| -------|
| 1. Security-Config | 1.1, 1.2, 1.3 | 18 | High | 1-2 |
| 2. Fraud-Scoring | 2.1, 2.2, 2.3, 2.4 | 26 | High | 2-3 |
| 3. Rate-Limiting | 3.1 | 5 | High | 2 |
| 4. Data Retention | 4.1 | 3 | Medium | 3 |

**Total Story Points:** 52

---

## Technische Abhängigkeiten

```
Epic 1 (Security-Config)
    │
    ├──► Epic 2 (Fraud-Scoring) ──► braucht Fraud-Config
    │
    ├──► Epic 3 (Rate-Limiting) ──► braucht Rate-Limit-Config
    │
    └──► Epic 4 (Data Retention) ──► braucht Retention-Config
```

---

## Dateien

```
config/
└── security-config.yaml        # Zentrale Config

src/services/
├── security-config.service.ts  # Config Loader
├── fraud-score-calculator.ts   # Fc, Fb, Ftotal
├── matching.service.ts         # Matching + Fraud Penalty
├── rate-limit.service.ts       # Token-Bucket
└── data-retention.service.ts   # Purge Jobs
```
