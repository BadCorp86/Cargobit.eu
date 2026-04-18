# CargoBit Service-Landscape Architecture

## 1. High-Level Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CARGOBIT PLATFORM                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                           FRONTEND LAYER                                     │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │    │
│  │  │   Shipper App    │  │   Carrier App    │  │   Admin Dashboard │           │    │
│  │  │   (Web/Mobile)   │  │   (Web/Mobile)   │  │   (Web)           │           │    │
│  │  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘           │    │
│  └───────────┼─────────────────────┼─────────────────────┼──────────────────────┘    │
│              │                     │                     │                           │
│              ▼                     ▼                     ▼                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                           API GATEWAY                                        │    │
│  │  • Authentication (JWT)          • Rate Limiting                             │    │
│  │  • Request Routing               • CORS                                      │    │
│  │  • Load Balancing                • Request Logging                           │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                               │
├──────────────────────────────────────┼──────────────────────────────────────────────┤
│                                      ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                        SERVICE MESH / EVENT BUS                              │    │
│  │                                                                              │    │
│  │    ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │    │
│  │    │  Kafka  │  │  NATS   │  │  Redis  │  │  gRPC   │  │  REST   │          │    │
│  │    │ (Events)│  │ (Events)│  │ (Cache) │  │ (Sync)  │  │ (API)   │          │    │
│  │    └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                               │
├──────────────────────────────────────┼──────────────────────────────────────────────┤
│                                      ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                         CORE DOMAIN SERVICES                                 │    │
│  │                                                                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │    │
│  │  │   Order     │  │  Pricing    │  │  Bidding    │  │  Matching   │         │    │
│  │  │  Service    │  │  Service    │  │  Service    │  │  Service    │         │    │
│  │  │             │  │             │  │             │  │             │         │    │
│  │  │ /orders     │  │ /pricing    │  │ /bids       │  │ (event-only)│         │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │    │
│  │                                                                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │    │
│  │  │  Execution  │  │   Risk      │  │  Carrier    │  │Notification │         │    │
│  │  │  Service    │  │  Service    │  │  Service    │  │  Service    │         │    │
│  │  │             │  │             │  │             │  │             │         │    │
│  │  │ /executions │  │ /risk       │  │ /carriers   │  │ (event-only)│         │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                               │
├──────────────────────────────────────┼──────────────────────────────────────────────┤
│                                      ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                           DATA LAYER                                         │    │
│  │                                                                              │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐      │    │
│  │  │ Order-DB  │ │Pricing-DB │ │ Bids-DB   │ │Execution-DB│ │ Carrier-DB│      │    │
│  │  │(PostgreSQL│ │(PostgreSQL│ │(PostgreSQL│ │(PostgreSQL │ │(PostgreSQL│      │    │
│  │  │  or similar) │ or similar) │ or similar) │ or similar) │ or similar) │      │    │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘      │    │
│  │                                                                              │    │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐                    │    │
│  │  │  Risk-DB  │ │ Redis     │ │ S3/MinIO  │ │ TimescaleDB│                    │    │
│  │  │(PostgreSQL│ │ (Cache)   │ │(Documents)│ │ (Analytics)│                    │    │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘                    │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Domain Services

### 2.1 Order-Service

**Responsibility:** Aufträge anlegen, verwalten, Status (business-seitig)

**Database:** `Order-DB`
- Tables: `orders`, `order_events`, `order_requirements`

**REST API:**
```
POST   /orders                      # Neuen Auftrag erstellen
GET    /orders                      # Aufträge auflisten (mit Filter)
GET    /orders/{orderId}            # Auftrag-Details
PUT    /orders/{orderId}            # Auftrag aktualisieren
DELETE /orders/{orderId}            # Auftrag stornieren
GET    /orders/{orderId}/status     # Status abrufen
POST   /orders/{orderId}/publish    # Auftrag veröffentlichen
```

**Events Published:**
| Event | Trigger | Payload |
|-------|---------|---------|
| `order.created` | Neue Order angelegt | orderId, shipperId, route, cargo, schedule |
| `order.updated` | Order geändert | orderId, changedFields |
| `order.cancelled` | Order storniert | orderId, reason |
| `order.published` | Order veröffentlicht | orderId, pricingRequested |

**Events Consumed:**
| Event | Action |
|-------|--------|
| `matching.completed` | Carrier zuweisen, Status auf ASSIGNED |
| `execution.created` | Execution-Referenz speichern |
| `execution.status_changed` | Order-Status synchronisieren |

**Schema:**
```typescript
interface Order {
  id: string;
  shipperId: string;
  shipperCompanyId?: string;
  
  // Route
  pickupAddressId: string;
  deliveryAddressId: string;
  distanceKm?: number;
  isInternational: boolean;
  transitCountries?: string[];
  
  // Schedule
  pickupDatetime: Date;
  deliveryDatetime?: Date;
  
  // Cargo
  transportType: TransportType;
  weightKg?: number;
  volumeM3?: number;
  
  // Requirements
  vehicleRequirements?: VehicleRequirements;
  driverRequirements?: DriverRequirements;
  
  // Pricing
  shipperBudget?: number;
  agreedPrice?: number;
  
  // Status
  status: OrderStatus;
  
  // Timestamps
  createdAt: Date;
  publishedAt?: Date;
  assignedAt?: Date;
  completedAt?: Date;
}
```

---

### 2.2 Pricing-Service

**Responsibility:** Marktpreis, Startpreis, Mindestpreis, Kostenaufschlüsselung, Bid-Validation

**Database:** `Pricing-DB`
- Tables: `order_pricing`, `pricing_config`, `fuel_prices`, `toll_costs`, `labor_rates`, `market_price_history`

**REST API:**
```
POST   /pricing/market-price                 # Marktpreis berechnen
GET    /pricing/orders/{orderId}             # Pricing für Order abrufen
POST   /pricing/orders/{orderId}/bid/validate # Bid validieren
GET    /pricing/config                       # Konfiguration abrufen
PUT    /pricing/config                       # Konfiguration aktualisieren
GET    /pricing/fuel-prices                  # Kraftstoffpreise
PUT    /pricing/fuel-prices                  # Kraftstoffpreise aktualisieren
GET    /pricing/toll-costs                   # Mautkosten
GET    /pricing/labor-rates                  # Lohnsätze
```

**Events Published:**
| Event | Trigger | Payload |
|-------|---------|---------|
| `pricing.calculated` | Marktpreis berechnet | orderId, marketPrice, startPrice, minPrice, costBreakdown |
| `pricing.updated` | Pricing-Konfig geändert | configId, changes |

**Events Consumed:**
| Event | Action |
|-------|--------|
| `order.created` | Pricing berechnen |
| `order.updated` | Pricing neu berechnen (falls relevant) |
| `bid.submitted` | Bid validieren → `bid.validated` |

**Schema:**
```typescript
interface OrderPricing {
  id: string;
  orderId: string;
  
  // Core Prices
  marketPrice: number;      // Fairer Marktpreis
  startPrice: number;       // Empfohlener Startpreis
  minPrice: number;         // Anti-Dumping-Grenze
  
  // Adjustments
  riskAdjustment: number;
  demandAdjustment: number;
  routeComplexityFactor: number;
  
  // Cost Breakdown
  costBreakdown: {
    baseCost: number;       // Grundkosten
    fuelCost: number;       // Kraftstoff
    tollCost: number;       // Maut
    laborCost: number;      // Fahrer/Personal
    riskCost: number;       // Risiko-Aufschlag
    total: number;
  };
  
  // Context
  currency: string;
  validUntil: Date;
  calculatedBy: 'rule' | 'ml' | 'hybrid';
  
  // Market Context
  marketContext?: {
    medianPrice: number;
    priceRange: { min: number; max: number };
    confidence: number;
    dataPoints: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Bid Validation:**
```typescript
interface BidValidationRequest {
  orderId: string;
  bidId: string;
  carrierId: string;
  bidPrice: number;
}

interface BidValidationResponse {
  valid: boolean;
  reason: 'VALID' | 'BID_BELOW_MIN_PRICE' | 'BID_TOO_HIGH' | 'RISK_BLOCKED' | null;
  priceScore: number;  // 0-1, für Matching-Engine
  details: {
    marketPrice: number;
    startPrice: number;
    minPrice: number;
    bidPrice: number;
    currency: string;
    riskLevel: 'green' | 'yellow' | 'red';
  };
  warnings?: string[];
}
```

---

### 2.3 Bidding-Service

**Responsibility:** Bids persistieren, Lifecycle von Geboten

**Database:** `Bids-DB`
- Tables: `bids`, `bid_events`

**REST API:**
```
POST   /bids                           # Neues Gebot abgeben
GET    /bids                           # Gebote auflisten
GET    /bids/{bidId}                   # Gebot-Details
PUT    /bids/{bidId}                   # Gebot aktualisieren
DELETE /bids/{bidId}                   # Gebot zurückziehen
GET    /orders/{orderId}/bids          # Alle Gebote für Order
POST   /bids/{bidId}/accept            # Gebot annehmen
POST   /bids/{bidId}/reject            # Gebot ablehnen
```

**Events Published:**
| Event | Trigger | Payload |
|-------|---------|---------|
| `bid.submitted` | Neues Gebot eingegangen | bidId, orderId, carrierId, bidPrice |
| `bid.stored` | Gebot persistiert | bidId, orderId |
| `bid.withdrawn` | Gebot zurückgezogen | bidId, reason |
| `bid.accepted` | Gebot angenommen | bidId, orderId, carrierId |
| `bid.rejected` | Gebot abgelehnt | bidId, reason |

**Events Consumed:**
| Event | Action |
|-------|--------|
| `bid.validated` | Gebot-Status aktualisieren, priceScore speichern |

**Schema:**
```typescript
interface Bid {
  id: string;
  orderId: string;
  carrierId: string;
  driverId: string;
  vehicleId: string;
  
  // Pricing
  bidPrice: number;
  currency: string;
  
  // Validation (from Pricing-Service)
  priceScore?: number;
  valid?: boolean;
  validationReason?: string;
  
  // Metadata
  message?: string;
  estimatedDuration?: number;
  
  // Context at bid time
  carrierContext?: {
    currentLocation?: { lat: number; lng: number };
    distanceToPickup?: number;
  };
  
  // Validity
  validUntil?: Date;
  
  // Status
  status: 'PENDING' | 'VALIDATED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED';
  
  // Timestamps
  createdAt: Date;
  validatedAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
}
```

---

### 2.4 Matching-Service

**Responsibility:** Carrier-Scoring & Auswahl auf Basis von Bids, Pricing, Risk, Capacity, Reliability

**Database:** `Matching-DB` (optional, für Audit/Debug)
- Tables: `matching_sessions`, `matching_results`, `matching_candidates`

**Events Consumed:**
| Event | Action |
|-------|--------|
| `bid.validated` | Bid für Matching registrieren |
| `pricing.calculated` | Pricing-Kontext speichern |
| `order.created` | Order-Kontext speichern |
| `carrier.stats.updated` | Stats-Cache aktualisieren |
| `carrier.capacity.updated` | Capacity-Cache aktualisieren |

**Events Published:**
| Event | Trigger | Payload |
|-------|---------|---------|
| `matching.completed` | Matching abgeschlossen | orderId, matches[], config |
| `matching.failed` | Matching fehlgeschlagen | orderId, reason |

**Matching Algorithm:**
```typescript
// Scoring Formula
Score = w_p × S_price + w_r × S_reliability + w_k × S_capacity + w_d × S_distance + w_s × S_risk

// Default Weights
const weights = {
  price: 0.25,        // w_p
  reliability: 0.25,  // w_r
  capacity: 0.20,     // w_k
  distance: 0.15,     // w_d
  risk: 0.15          // w_s
};

// Thresholds
const MIN_SCORE = 0.6;        // Minimum to qualify
const AUTO_MATCH_GAP = 0.15;  // Gap to 2nd place for auto-match
```

**Match Result:**
```typescript
interface MatchResult {
  carrierId: string;
  driverId: string;
  vehicleId: string;
  
  // Scores
  score: number;
  priceScore: number;
  reliabilityScore: number;
  capacityScore: number;
  distanceScore: number;
  riskScore: number;
  
  // Price
  bidPrice: number;
  currency: string;
  
  // Explanation
  explanation: string[];
  warnings?: string[];
  
  // Auto-match
  autoMatchEligible: boolean;
}
```

---

### 2.5 Execution-Service

**Responsibility:** Transport-Lifecycle (Status, Tracking, POD)

**Database:** `Execution-DB`
- Tables: `executions`, `execution_events`, `tracking_points`, `documents`

**REST API:**
```
POST   /executions                            # Neue Execution erstellen
GET    /executions                            # Executions auflisten
GET    /executions/{executionId}              # Execution-Details
GET    /executions/order/{orderId}            # Execution für Order
POST   /executions/{executionId}/status       # Status aktualisieren
POST   /executions/{executionId}/pod          # POD hochladen
GET    /executions/{executionId}/tracking     # Tracking-Daten
POST   /executions/{executionId}/tracking     # Tracking-Punkt hinzufügen
GET    /executions/carrier/{carrierId}/active # Aktive Executions
POST   /executions/{executionId}/complete     # Abschließen
POST   /executions/{executionId}/cancel       # Stornieren
```

**Events Published:**
| Event | Trigger | Payload |
|-------|---------|---------|
| `execution.created` | Execution angelegt | executionId, orderId, carrierId |
| `execution.status_changed` | Status geändert | executionId, oldStatus, newStatus |
| `execution.pod_uploaded` | POD hochgeladen | executionId, documentId |
| `execution.completed` | Execution abgeschlossen | executionId, rating |

**Events Consumed:**
| Event | Action |
|-------|--------|
| `matching.completed` | Execution erstellen für Top-Match |

**Status Machine:**
```
CREATED → ASSIGNED → ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERED → POD_SUBMITTED → COMPLETED
                                                              ↓
                                                          CANCELLED
```

**Schema:**
```typescript
interface Execution {
  id: string;
  orderId: string;
  transportId: string;
  
  carrierId: string;
  driverId: string;
  vehicleId: string;
  
  // Pricing
  agreedPrice: number;
  currency: string;
  
  // Status
  status: ExecutionStatus;
  
  // Schedule
  scheduledPickup: Date;
  estimatedDelivery?: Date;
  actualPickup?: Date;
  actualDelivery?: Date;
  
  // Tracking
  currentLocation?: {
    lat: number;
    lng: number;
    timestamp: Date;
  };
  
  // POD
  podUrl?: string;
  podMetadata?: {
    uploadedAt: Date;
    type: 'delivery_note' | 'photo' | 'signed_document';
    signed: boolean;
    recipientName?: string;
  };
  
  // Rating
  shipperRating?: number;
  shipperComment?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 2.6 Risk-Service

**Responsibility:** Risk-Level pro Order/Route, Fraud-Signale

**Database:** `Risk-DB`
- Tables: `risk_scores`, `risk_events`, `risk_rules`, `risk_history`

**REST API:**
```
GET    /risk/orders/{orderId}              # Risk-Level für Order
POST   /risk/calculate                      # Risk Score berechnen
GET    /risk/entities/{type}/{id}           # Risk für Entity
GET    /risk/history/{type}/{id}            # Risk-Historie
GET    /risk/rules                          # Regeln auflisten
POST   /risk/rules                          # Neue Regel
PUT    /risk/rules/{ruleId}                 # Regel aktualisieren
```

**Events Published:**
| Event | Trigger | Payload |
|-------|---------|---------|
| `risk.updated` | Score geändert | entityType, entityId, oldScore, newScore, oldLevel, newLevel |
| `risk.level_changed` | Level geändert | entityType, entityId, level |

**Events Consumed:**
| Event | Action |
|-------|--------|
| `order.created` | Initiales Risk-Assessment |
| `execution.status_changed` | Behavioral Risk Analysis |

---

### 2.7 Carrier-Service

**Responsibility:** Stammdaten, Profile, Ratings, Compliance

**Database:** `Carrier-DB`
- Tables: `carriers`, `carrier_stats`, `carrier_capacity`, `carrier_documents`

**REST API:**
```
GET    /carriers                            # Carrier auflisten
GET    /carriers/{carrierId}                # Carrier-Details
PUT    /carriers/{carrierId}                # Carrier aktualisieren
GET    /carriers/{carrierId}/stats          # Carrier-Statistiken
PUT    /carriers/{carrierId}/stats          # Stats aktualisieren
GET    /carriers/{carrierId}/capacity       # Kapazität
PUT    /carriers/{carrierId}/capacity       # Kapazität aktualisieren
GET    /carriers/{carrierId}/documents      # Dokumente
POST   /carriers/{carrierId}/documents      # Dokument hochladen
GET    /carriers/me                         # Eigener Carrier-Profile
```

**Events Published:**
| Event | Trigger | Payload |
|-------|---------|---------|
| `carrier.stats.updated` | Stats geändert | carrierId, updatedStats |
| `carrier.capacity.updated` | Kapazität geändert | carrierId, capacity |
| `carrier.profile.updated` | Profil geändert | carrierId, changes |

**Schema:**
```typescript
interface CarrierStats {
  carrierId: string;
  
  // Reliability
  onTimeRate: number;      // 0-1
  cancelRate: number;      // 0-1
  disputeRate: number;     // 0-1
  
  // Performance
  completedOrders: number;
  totalDistanceKm: number;
  avgDeliveryTime: number;
  
  // Quality
  damageRate: number;
  claimRate: number;
  avgRating: number;
  
  // Response
  avgResponseTime: number;
  acceptanceRate: number;
  
  // Trends
  trendOnTime: number;     // -1 to 1
  trendRating: number;
  
  lastUpdated: Date;
}

interface CarrierCapacity {
  carrierId: string;
  
  // Physical
  maxWeightKg: number;
  maxVolumeM3: number;
  vehicleTypes: string[];
  
  // Special
  hasAdr: boolean;
  hasCooling: boolean;
  hasLift: boolean;
  hasCrane: boolean;
  
  // Availability
  isAvailable: boolean;
  availableFrom?: Date;
  availableUntil?: Date;
  
  // Location
  currentLocation?: {
    lat: number;
    lng: number;
    country: string;
  };
}
```

---

### 2.8 Notification-Service

**Responsibility:** E-Mail, Push, In-App-Notifications

**Database:** `Notification-DB`
- Tables: `notifications`, `notification_templates`, `notification_preferences`

**Events Consumed:**
| Event | Action |
|-------|--------|
| `matching.completed` | Shipper & Carrier benachrichtigen |
| `execution.status_changed` | Status-Updates senden |
| `execution.created` | Carrier über neuen Auftrag informieren |
| `risk.updated` | Warnung bei hohem Risiko |

**Channels:**
- E-Mail (SMTP/SendGrid)
- Push (Firebase/APNs)
- In-App (WebSocket)
- SMS (Twilio)

---

## 3. Event-Bus & Topics

### 3.1 Topic Registry

| Topic | Publisher | Subscribers | Purpose |
|-------|-----------|-------------|---------|
| `order.created` | Order-Service | Pricing, Risk, Matching | Neue Order verfügbar |
| `order.updated` | Order-Service | Pricing, Matching | Order geändert |
| `order.cancelled` | Order-Service | Pricing, Bidding, Matching | Order storniert |
| `pricing.calculated` | Pricing-Service | Matching, Notification | Marktpreis bereit |
| `bid.submitted` | Bidding-Service | Pricing | Neues Gebot |
| `bid.validated` | Pricing-Service | Bidding, Matching | Gebot validiert |
| `bid.accepted` | Bidding-Service | Matching, Notification | Gebot angenommen |
| `matching.completed` | Matching-Service | Order, Execution, Notification | Matching-Ergebnis |
| `execution.created` | Execution-Service | Notification, Order | Execution gestartet |
| `execution.status_changed` | Execution-Service | Notification, Risk | Status-Update |
| `carrier.stats.updated` | Carrier-Service | Matching | Stats-Update |
| `carrier.capacity.updated` | Carrier-Service | Matching | Capacity-Update |
| `risk.updated` | Risk-Service | Pricing, Notification | Risk-Änderung |

### 3.2 Event Flow Patterns

**Pattern 1: Command → REST, Domain-Event → Bus**
```
Shipper Action          Service Response          Event
─────────────           ───────────────           ─────
POST /orders     →      Order Created       →    order.created
                                      ↓
                              Pricing-Service
                                      ↓
                              pricing.calculated
```

**Pattern 2: Matching & Analytics → Rein Event-getrieben**
```
bid.validated ──┐
                ├──→ Matching-Service ──→ matching.completed
pricing.ready ──┘
```

---

## 4. Data Ownership

### 4.1 Database per Service

| Service | Database | Owner Tables |
|---------|----------|--------------|
| Order-Service | Order-DB | `orders`, `order_events`, `addresses` |
| Pricing-Service | Pricing-DB | `order_pricing`, `pricing_config`, `fuel_prices`, `toll_costs` |
| Bidding-Service | Bids-DB | `bids`, `bid_events` |
| Matching-Service | Matching-DB | `matching_sessions`, `matching_results` |
| Execution-Service | Execution-DB | `executions`, `tracking_points`, `documents` |
| Risk-Service | Risk-DB | `risk_scores`, `risk_events`, `risk_rules` |
| Carrier-Service | Carrier-DB | `carriers`, `carrier_stats`, `carrier_capacity` |
| Notification-Service | Notification-DB | `notifications`, `notification_templates` |

### 4.2 Cross-Service Data Access

**Prinzip:** Jeder Service ist Owner seiner DB; andere Services lesen nur über APIs/Events.

```
┌─────────────────┐
│  Matching-Service│  braucht Carrier-Stats
└────────┬────────┘
         │
         │ Option 1: Event-Driven
         │ carrier.stats.updated Event abonnieren
         │ → Cache im Matching-Service
         │
         │ Option 2: REST API Call
         │ GET /carriers/{id}/stats
         │ (mit Circuit Breaker)
         │
         ▼
┌─────────────────┐
│ Carrier-Service │
│  (Stats Owner)  │
└─────────────────┘
```

---

## 5. Main Flows

### 5.1 Order → Pricing → Bidding → Matching → Execution

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           ORDER LIFECYCLE FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

Shipper          Frontend         Order-Service      Pricing-Service     Event Bus
   │                │                   │                   │               │
   │ 1. Create Order│                   │                   │               │
   │───────────────>│                   │                   │               │
   │                │ POST /orders      │                   │               │
   │                │──────────────────>│                   │               │
   │                │                   │ order.created     │               │
   │                │                   │──────────────────────────────────>│
   │                │                   │                   │               │
   │                │                   │                   │ order.created │
   │                │                   │                   │<──────────────│
   │                │                   │                   │               │
   │                │                   │                   │ Calc Pricing  │
   │                │                   │                   │──────────────┐│
   │                │                   │                   │              ││
   │                │                   │                   │<─────────────┘│
   │                │                   │                   │               │
   │                │                   │                   │pricing.calc.  │
   │                │                   │                   │──────────────>│
   │                │<──────────────────│<──────────────────────────────────│
   │  Show Pricing  │                   │                   │               │
   │<───────────────│                   │                   │               │
   │                │                   │                   │               │

Carrier          Frontend         Bidding-Service     Pricing-Service     Event Bus
   │                │                   │                   │               │
   │ 2. Submit Bid  │                   │                   │               │
   │───────────────>│                   │                   │               │
   │                │ POST /bids        │                   │               │
   │                │──────────────────>│                   │               │
   │                │                   │ bid.submitted     │               │
   │                │                   │──────────────────────────────────>│
   │                │                   │                   │ bid.submitted │
   │                │                   │                   │<──────────────│
   │                │                   │                   │               │
   │                │                   │                   │ Validate Bid  │
   │                │                   │                   │──────────────┐│
   │                │                   │                   │              ││
   │                │                   │                   │<─────────────┘│
   │                │                   │                   │               │
   │                │                   │ bid.validated     │               │
   │                │                   │<──────────────────────────────────│
   │                │<──────────────────│                   │               │
   │  Show Feedback │                   │                   │               │
   │<───────────────│                   │                   │               │
   │                │                   │                   │               │

Matching-Service                        Event Bus           Execution-Service
   │                                       │                      │
   │ bid.validated (stored)                │                      │
   │<──────────────────────────────────────│                      │
   │                                       │                      │
   │ All data ready?                       │                      │
   │ ├─ pricing ✓                          │                      │
   │ ├─ bids ✓                             │                      │
   │ └─ carrier_stats ✓                    │                      │
   │                                       │                      │
   │ Compute Matching                      │                      │
   │───────────────────────────────────────│                      │
   │                                       │                      │
   │ matching.completed                    │                      │
   │──────────────────────────────────────>│                      │
   │                                       │ matching.completed   │
   │                                       │─────────────────────>│
   │                                       │                      │
   │                                       │                      │ Create Execution
   │                                       │                      │─────────────────┐
   │                                       │                      │                 │
   │                                       │                      │<────────────────│
   │                                       │                      │
   │                                       │ execution.created    │
   │                                       │<─────────────────────│
   │                                       │                      │

Notification-Service                     Event Bus
   │                                       │
   │ matching.completed                    │
   │<──────────────────────────────────────│
   │                                       │
   │ Notify Shipper (Email/Push)           │
   │───────────────────────────────────────│
   │                                       │
   │ Notify Carrier (Email/Push)           │
   │───────────────────────────────────────│
   │                                       │
```

---

## 6. Frontend Integration

### 6.1 Shipper-App / Web

**REST Clients:**
| Service | Endpoints Used |
|---------|---------------|
| Order-Service | `/orders`, `/orders/{id}`, `/orders/{id}/publish` |
| Pricing-Service | `/pricing/orders/{id}` |
| Execution-Service | `/executions/{id}`, `/executions/{id}/tracking` |

**UI Components:**
- `PriceBreakdownCard` → Zeigt `pricing.calculated` Daten
- `MatchingResultCard` → Zeigt `matching.completed` Daten
- `TrackingTimeline` → Zeigt `execution.status_changed`

### 6.2 Carrier-App / Web

**REST Clients:**
| Service | Endpoints Used |
|---------|---------------|
| Bidding-Service | `/bids`, `/orders/{id}/bids` |
| Pricing-Service | `/pricing/orders/{id}/bid/validate` |
| Execution-Service | `/executions/{id}/status`, `/executions/{id}/pod` |
| Carrier-Service | `/carriers/me`, `/carriers/me/stats` |

**UI Components:**
- `BidInputWithValidation` → Live-Validierung via Pricing-Service
- `ActiveTransportsList` → Zeigt aktive Executions
- `CarrierPerformanceCard` → Zeigt `carrier.stats`

---

## 7. API Contracts Summary

### 7.1 OpenAPI Specs

| Service | File |
|---------|------|
| Pricing-Service | `/download/openapi-pricing-service.yaml` |
| Execution-Service | `/download/openapi-execution-service.yaml` |
| Security-Gateway | `/download/openapi-security-gateway.yaml` |
| Matching-Service | `/download/openapi-matching-service.yaml` |

### 7.2 Event Schemas

| Event | File |
|-------|------|
| All Events | `/src/types/events.ts` |

---

## 8. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        KUBERNETES CLUSTER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Namespace:    │  │   Namespace:    │  │   Namespace:    │  │
│  │   cargobit-app  │  │ cargobit-events │  │  cargobit-data  │  │
│  │                 │  │                 │  │                 │  │
│  │  • order-svc    │  │  • kafka        │  │  • postgres     │  │
│  │  • pricing-svc  │  │  • nats         │  │  • redis        │  │
│  │  • bidding-svc  │  │  • redis        │  │  • minio        │  │
│  │  • matching-svc │  │                 │  │  • timescaledb  │  │
│  │  • execution-svc│  │                 │  │                 │  │
│  │  • risk-svc     │  │                 │  │                 │  │
│  │  • carrier-svc  │  │                 │  │                 │  │
│  │  • notification │  │                 │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    INGRESS / LOAD BALANCER               │    │
│  │  • api.cargobit.com → API Gateway                        │    │
│  │  • app.cargobit.com → Frontend                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Monitoring & Observability

### 9.1 Metrics

| Service | Key Metrics |
|---------|-------------|
| All | Request Rate, Error Rate, Latency (P50, P95, P99) |
| Pricing-Service | MAPE, RMSE, Prediction Latency |
| Matching-Service | Match Rate, Score Distribution, Auto-Match Rate |
| Execution-Service | Status Transition Times, POD Upload Rate |
| Risk-Service | Score Distribution, Block Rate, Mitigation Rate |

### 9.2 Dashboards

| Dashboard | Purpose |
|-----------|---------|
| Service Health | Latency, Errors, Throughput |
| Business Metrics | Orders, Matches, Executions |
| ML Model Performance | MAPE, Drift, Feature Importance |
| Risk Operations | Score Distribution, Alerts, Mitigations |
