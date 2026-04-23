# Domain-Modell & Matching-Algorithmus

> **CargoBit Transport Platform** — Production-Ready Specification
>
> *Direkt in Tickets / Repos übersetzbar*

---

## Übersicht

Dieses Dokument definiert das produktionsreife Domain-Modell für kapazitätsbasierte Zusatzaufträge:

| Abschnitt | Inhalt |
|-----------|--------|
| **1. Domain-Modell** | Entities, Value Objects, Events |
| **2. Matching-Heuristik** | Filter-Phase, Scoring-Phase, Entscheidungslogik |
| **3. API-Design** | Vollständige OpenAPI 3.0 Spezifikation |
| **4. Datenbank-Schema** | PostgreSQL Table-Design |
| **5. Implementierungs-Notes** | Repository-Pattern, Event-Sourcing |

---

## 1. Domain-Modell

### 1.1 Bounded Context

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    CAPACITY MATCHING CONTEXT                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                         ││
│  │    Vehicle ──────────► Tour ──────────► Stop                           ││
│  │                              │                │                         ││
│  │                              │                │                         ││
│  │                              ▼                ▼                         ││
│  │                        LoadSnapshot ◄──── CapacityState                 ││
│  │                              │                │                         ││
│  │                              │                │                         ││
│  │                              ▼                ▼                         ││
│  │                         Suggestion ◄──── OrderCandidate                 ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Aggregates:                                                                 │
│  ├── Tour Aggregate (Tour + Stops + LoadSnapshots + CapacityStates)        │
│  └── Suggestion Aggregate (Suggestion + Decision)                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.2 Kern-Entities

#### 1.2.1 Vehicle

**Beschreibung:** Stammdaten eines Fahrzeugs mit Kapazitätsinformationen.

```typescript
// Domain Model: Vehicle
interface Vehicle {
  // Identity
  vehicleId: string;                    // UUID, z.B. "vh_01HQP..."
  
  // Classification
  type: VehicleType;                    // TRUCK | VAN | TRAILER
  subtype?: string;                     // z.B. "7.5t", "Sprinter"
  
  // Capacity Constraints
  capacityVolumeM3: number;             // Max. Volumen in m³
  capacityWeightKg: number;             // Max. Gesamtgewicht in kg
  capacityPallets: number;              // Max. Palettenplätze (Europalette)
  
  // Dimensions (für detaillierte Planung)
  lengthM: number;                      // Ladelänge in m
  widthM: number;                       // Ladbreite in m
  heightM: number;                      // Ladehöhe in m
  
  // Location
  homeBaseLocation: Location;           // Standort Depots
  
  // Metadata
  licensePlate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

enum VehicleType {
  TRUCK = "TRUCK",           // LKW > 7.5t
  VAN = "VAN",               // Transporter bis 7.5t
  TRAILER = "TRAILER"        // Anhänger
}

// Value Object: Location
interface Location {
  lat: number;                         // Breitengrad
  lon: number;                         // Längengrad
  address?: string;                    // Optional: Adresse
  postalCode?: string;
  city?: string;
  country?: string;
}
```

**Beispiel-Instanz:**
```json
{
  "vehicleId": "vh_01HQP5X7Y8Z9ABCDEF",
  "type": "TRUCK",
  "subtype": "7.5t",
  "capacityVolumeM3": 25.0,
  "capacityWeightKg": 7500,
  "capacityPallets": 10,
  "lengthM": 5.0,
  "widthM": 2.2,
  "heightM": 2.3,
  "homeBaseLocation": {
    "lat": 48.1351,
    "lon": 11.5820,
    "address": "Musterstraße 1",
    "postalCode": "80331",
    "city": "München",
    "country": "DE"
  },
  "licensePlate": "M-AB 1234",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

#### 1.2.2 Tour

**Beschreibung:** Eine geplante Fahrt mit Stopps und aktuellem Status.

```typescript
// Domain Model: Tour (Aggregate Root)
interface Tour {
  // Identity
  tourId: string;                       // UUID, z.B. "tu_01HQP..."
  
  // Assignment
  vehicleId: string;                    // FK zu Vehicle
  driverId: string;                     // FK zu Driver (User)
  
  // Route
  plannedRoute: StopRef[];              // Geplante Stopps
  actualRoute?: StopRef[];              // Tatsächliche Stopps (wenn abweichend)
  
  // State
  status: TourStatus;                   // PLANNED | IN_PROGRESS | COMPLETED | CANCELLED
  
  // Timing
  startTimePlanned: Date;
  endTimePlanned: Date;
  startTimeActual?: Date;
  endTimeActual?: Date;
  
  // Current Position
  currentSegmentId?: string;            // ID des aktuellen Segments
  currentStopId?: string;               // ID des aktuellen Stopps
  currentLocation?: Location;           // Aktuelle GPS-Position
  
  // Statistics
  totalDistanceKm: number;
  totalDurationMinutes: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;                    // User ID
}

enum TourStatus {
  PLANNED = "PLANNED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

// Value Object: StopRef (Reference to Stop)
interface StopRef {
  stopId: string;
  sequence: number;
  location: Location;
  type: StopType;
  plannedArrival: Date;
  plannedDeparture: Date;
  actualArrival?: Date;
  actualDeparture?: Date;
  status: StopStatus;
}

enum StopType {
  PICKUP = "PICKUP",
  DELIVERY = "DELIVERY",
  BREAK = "BREAK",
  DEPOT = "DEPOT"
}

enum StopStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  SKIPPED = "SKIPPED"
}
```

**Beispiel-Instanz:**
```json
{
  "tourId": "tu_01HQP5X7Y8Z9GHIJKL",
  "vehicleId": "vh_01HQP5X7Y8Z9ABCDEF",
  "driverId": "us_01HQP5X7Y8Z9MNOPQR",
  "plannedRoute": [
    {
      "stopId": "st_01HQP5X7Y8Z9STUVWX",
      "sequence": 1,
      "location": {"lat": 48.1351, "lon": 11.5820, "city": "München"},
      "type": "PICKUP",
      "plannedArrival": "2024-01-19T08:00:00Z",
      "plannedDeparture": "2024-01-19T08:30:00Z",
      "status": "COMPLETED"
    },
    {
      "stopId": "st_01HQP5X7Y8Z9YZABCD",
      "sequence": 2,
      "location": {"lat": 48.3668, "lon": 10.8984, "city": "Augsburg"},
      "type": "DELIVERY",
      "plannedArrival": "2024-01-19T09:30:00Z",
      "plannedDeparture": "2024-01-19T10:00:00Z",
      "status": "IN_PROGRESS"
    }
  ],
  "status": "IN_PROGRESS",
  "startTimePlanned": "2024-01-19T08:00:00Z",
  "endTimePlanned": "2024-01-19T16:00:00Z",
  "startTimeActual": "2024-01-19T08:05:00Z",
  "currentSegmentId": "seg_tu_01HQP_1",
  "currentStopId": "st_01HQP5X7Y8Z9YZABCD",
  "totalDistanceKm": 180,
  "totalDurationMinutes": 480,
  "createdAt": "2024-01-18T10:00:00Z",
  "updatedAt": "2024-01-19T09:45:00Z",
  "createdBy": "us_01HQP5X7Y8Z9MNOPQR"
}
```

---

#### 1.2.3 Stop

**Beschreibung:** Ein einzelner Stopp innerhalb einer Tour.

```typescript
// Domain Model: Stop
interface Stop {
  // Identity
  stopId: string;                       // UUID
  tourId: string;                       // FK zu Tour
  
  // Sequence
  sequence: number;                     // Position in Tour (1-based)
  
  // Location
  location: Location;
  
  // Timing
  timeWindowFrom?: Date;                // Zeitfenster Start
  timeWindowTo?: Date;                  // Zeitfenster Ende
  plannedArrival: Date;
  plannedDeparture: Date;
  actualArrival?: Date;
  actualDeparture?: Date;
  
  // Service
  type: StopType;
  serviceTimeMinutes: number;           // Geplante Servicezeit
  status: StopStatus;
  
  // Orders
  assignedOrderIds: string[];           // FK zu Orders
  
  // Notes
  notes?: string;
  specialInstructions?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

**Beispiel-Instanz:**
```json
{
  "stopId": "st_01HQP5X7Y8Z9YZABCD",
  "tourId": "tu_01HQP5X7Y8Z9GHIJKL",
  "sequence": 2,
  "location": {
    "lat": 48.3668,
    "lon": 10.8984,
    "address": "Industriestraße 45",
    "postalCode": "86150",
    "city": "Augsburg",
    "country": "DE"
  },
  "timeWindowFrom": "2024-01-19T09:00:00Z",
  "timeWindowTo": "2024-01-19T11:00:00Z",
  "plannedArrival": "2024-01-19T09:30:00Z",
  "plannedDeparture": "2024-01-19T10:00:00Z",
  "actualArrival": "2024-01-19T09:35:00Z",
  "type": "DELIVERY",
  "serviceTimeMinutes": 30,
  "status": "IN_PROGRESS",
  "assignedOrderIds": [
    "ord_01HQP5X7Y8Z9CDEFGH"
  ],
  "notes": "Laderampe 3, Ansprechpartner: Herr Müller",
  "createdAt": "2024-01-18T10:00:00Z",
  "updatedAt": "2024-01-19T09:35:00Z"
}
```

---

#### 1.2.4 LoadSnapshot

**Beschreibung:** Momentaufnahme der aktuellen Beladung zu einem Zeitpunkt.

```typescript
// Domain Model: LoadSnapshot
interface LoadSnapshot {
  // Identity
  loadSnapshotId: string;               // UUID
  
  // Context
  tourId: string;                       // FK zu Tour
  stopId?: string;                      // FK zu Stop (optional, wenn zwischen Stopps)
  segmentId?: string;                   // FK zu Segment
  
  // Timing
  createdAt: Date;
  createdBy: string;                    // User ID oder "SYSTEM"
  
  // Source
  source: LoadSource;                   // MANUAL | VISION | TELEMATICS
  
  // Measurements
  volumeUsedM3: number;
  weightUsedKg: number;
  palletsUsed: number;
  
  // Vision-specific
  confidence?: number;                  // 0.0 - 1.0
  imageRefIds?: string[];               // FK zu Images in Object Storage
  
  // Manual Override
  manualOverride?: boolean;             // True wenn manuell korrigiert
  overriddenSnapshotId?: string;        // FK zu überschriebenem Snapshot
  
  // Validation
  isValid: boolean;
  validationMessage?: string;
}

enum LoadSource {
  MANUAL = "MANUAL",                     // Fahrer-Eingabe
  VISION = "VISION",                     // KI-basierte Erkennung
  TELEMATICS = "TELEMATICS"              // Fahrzeug-Sensoren
}
```

**Beispiel-Instanz:**
```json
{
  "loadSnapshotId": "ls_01HQP5X7Y8Z9EFGHIJ",
  "tourId": "tu_01HQP5X7Y8Z9GHIJKL",
  "stopId": "st_01HQP5X7Y8Z9STUVWX",
  "segmentId": "seg_tu_01HQP_1",
  "createdAt": "2024-01-19T08:45:00Z",
  "createdBy": "us_01HQP5X7Y8Z9MNOPQR",
  "source": "VISION",
  "volumeUsedM3": 17.5,
  "weightUsedKg": 4500,
  "palletsUsed": 6,
  "confidence": 0.89,
  "imageRefIds": [
    "img_01HQP5X7Y8Z9KLMNOP"
  ],
  "manualOverride": false,
  "isValid": true
}
```

---

#### 1.2.5 CapacityState

**Beschreibung:** Freie Kapazität in einem Tour-Segment.

```typescript
// Domain Model: CapacityState
interface CapacityState {
  // Identity
  capacityStateId: string;              // UUID
  
  // Context
  tourId: string;                       // FK zu Tour
  segmentId: string;                    // ID des Segments (Stop A → Stop B)
  
  // Segment Definition
  fromStopId: string;                   // FK zu Stop
  toStopId: string;                     // FK zu Stop
  
  // Capacity
  volumeFreeM3: number;
  weightFreeKg: number;
  palletsFree: number;
  
  // Utilization (Percentage)
  volumeUtilizationPct: number;         // 0-100
  weightUtilizationPct: number;
  palletsUtilizationPct: number;
  
  // Validity
  validFrom: Date;
  validTo?: Date;                       // null = aktuell gültig
  
  // Source
  basedOnSnapshotId: string;            // FK zu LoadSnapshot
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

**Beispiel-Instanz:**
```json
{
  "capacityStateId": "cs_01HQP5X7Y8Z9HIJKLM",
  "tourId": "tu_01HQP5X7Y8Z9GHIJKL",
  "segmentId": "seg_tu_01HQP_1",
  "fromStopId": "st_01HQP5X7Y8Z9STUVWX",
  "toStopId": "st_01HQP5X7Y8Z9YZABCD",
  "volumeFreeM3": 7.5,
  "weightFreeKg": 3000,
  "palletsFree": 4,
  "volumeUtilizationPct": 70,
  "weightUtilizationPct": 60,
  "palletsUtilizationPct": 60,
  "validFrom": "2024-01-19T08:45:00Z",
  "validTo": null,
  "basedOnSnapshotId": "ls_01HQP5X7Y8Z9EFGHIJ",
  "createdAt": "2024-01-19T08:45:00Z",
  "updatedAt": "2024-01-19T08:45:00Z"
}
```

---

#### 1.2.6 OrderCandidate

**Beschreibung:** Potenzieller Zusatzauftrag aus dem Order-Pool.

```typescript
// Domain Model: OrderCandidate
interface OrderCandidate {
  // Identity
  orderId: string;                      // UUID
  externalOrderId?: string;             // ID aus Fremdsystem
  
  // Locations
  pickupLocation: Location;
  deliveryLocation: Location;
  
  // Time Windows
  pickupTimeWindowFrom: Date;
  pickupTimeWindowTo: Date;
  deliveryTimeWindowFrom: Date;
  deliveryTimeWindowTo: Date;
  
  // Cargo
  volumeM3: number;
  weightKg: number;
  pallets: number;
  cargoDescription?: string;
  specialRequirements?: string[];       // z.B. "Kühlung", "Hebebühne"
  
  // Commercial
  price: number;                        // Angebotspreis in EUR
  costEstimate?: number;                // Geschätzte Kosten
  
  // Priority
  priority: OrderPriority;              // NORMAL | HIGH | CONTRACTUAL
  priorityReason?: string;
  
  // Status
  status: OrderStatus;                  // OPEN | RESERVED | ASSIGNED | CANCELLED
  reservedForTourId?: string;           // FK zu Tour (wenn reserviert)
  reservedUntil?: Date;
  
  // Constraints
  maxDetourKm?: number;                 // Maximaler Umweg
  maxDelayMinutes?: number;             // Maximale Verzögerung
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  source: string;                       // "SPOT_MARKET" | "CONTRACT" | "RETURN_LOAD"
}

enum OrderPriority {
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  CONTRACTUAL = "CONTRACTUAL"
}

enum OrderStatus {
  OPEN = "OPEN",
  RESERVED = "RESERVED",
  ASSIGNED = "ASSIGNED",
  CANCELLED = "CANCELLED"
}
```

**Beispiel-Instanz:**
```json
{
  "orderId": "ord_01HQP5X7Y8Z9NOPQRS",
  "externalOrderId": "EXT-2024-0847",
  "pickupLocation": {
    "lat": 48.3668,
    "lon": 10.8984,
    "address": "Industriestraße 45",
    "city": "Augsburg"
  },
  "deliveryLocation": {
    "lat": 48.4011,
    "lon": 9.9876,
    "address": "Ulmer Straße 12",
    "city": "Ulm"
  },
  "pickupTimeWindowFrom": "2024-01-19T14:00:00Z",
  "pickupTimeWindowTo": "2024-01-19T16:00:00Z",
  "deliveryTimeWindowFrom": "2024-01-19T16:30:00Z",
  "deliveryTimeWindowTo": "2024-01-19T18:30:00Z",
  "volumeM3": 2.5,
  "weightKg": 680,
  "pallets": 3,
  "cargoDescription": "Elektronik-Komponenten, stoßfest verpackt",
  "specialRequirements": ["Hebebühne"],
  "price": 245.00,
  "priority": "NORMAL",
  "status": "OPEN",
  "maxDetourKm": 15,
  "createdAt": "2024-01-19T06:00:00Z",
  "updatedAt": "2024-01-19T06:00:00Z",
  "source": "SPOT_MARKET"
}
```

---

#### 1.2.7 Suggestion

**Beschreibung:** Vorschlag für einen Zusatzauftrag.

```typescript
// Domain Model: Suggestion (Aggregate Root)
interface Suggestion {
  // Identity
  suggestionId: string;                 // UUID
  
  // Relations
  tourId: string;                       // FK zu Tour
  orderId: string;                      // FK zu OrderCandidate
  segmentId: string;                    // Segment für Insertion
  
  // Insertion Point
  pickupAfterStopSequence: number;      // Nach welchem Stopp Pickup
  deliveryAfterStopSequence: number;    // Nach welchem Stopp Delivery
  
  // Economics
  extraRevenue: number;                 // Zusätzlicher Umsatz
  extraCost: number;                    // Zusätzliche Kosten
  margin: number;                       // Deckungsbeitrag
  marginPercent: number;                // Marge in %
  
  // Route Impact
  detourKm: number;                     // Umweg in km
  detourMinutes: number;                // Umweg in Minuten
  
  // Scores
  capacityScore: number;                // 0.0 - 1.0
  revenueScore: number;                 // 0.0 - 1.0
  priorityScore: number;                // 0.0 - 1.0
  totalScore: number;                   // Weighted composite
  
  // Status
  status: SuggestionStatus;
  
  // Decision
  decidedBy?: string;                   // DRIVER | DISPATCHER | SYSTEM
  decidedAt?: Date;
  decisionUserId?: string;              // User ID
  
  // Validity
  validUntil: Date;                     // Ablauf des Vorschlags
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

enum SuggestionStatus {
  NEW = "NEW",                          // Neu generiert
  ACCEPTED_DRIVER = "ACCEPTED_DRIVER",  // Fahrer hat angenommen
  ACCEPTED_DISPATCHER = "ACCEPTED_DISPATCHER", // Disponent hat angenommen
  REJECTED = "REJECTED",                // Abgelehnt
  EXPIRED = "EXPIRED",                  // Abgelaufen
  CANCELLED = "CANCELLED"               // Storniert (z.B. Order nicht mehr verfügbar)
}
```

**Beispiel-Instanz:**
```json
{
  "suggestionId": "sug_01HQP5X7Y8Z9TUVWXY",
  "tourId": "tu_01HQP5X7Y8Z9GHIJKL",
  "orderId": "ord_01HQP5X7Y8Z9NOPQRS",
  "segmentId": "seg_tu_01HQP_2",
  "pickupAfterStopSequence": 2,
  "deliveryAfterStopSequence": 3,
  "extraRevenue": 245.00,
  "extraCost": 67.00,
  "margin": 178.00,
  "marginPercent": 72.65,
  "detourKm": 5.8,
  "detourMinutes": 14,
  "capacityScore": 0.95,
  "revenueScore": 0.85,
  "priorityScore": 0.50,
  "totalScore": 0.82,
  "status": "NEW",
  "validUntil": "2024-01-19T14:00:00Z",
  "createdAt": "2024-01-19T10:00:00Z",
  "updatedAt": "2024-01-19T10:00:00Z"
}
```

---

### 1.3 Events

#### 1.3.1 Event-Katalog

```
┌─────────────────────────────────────────────────────────────┐
│                    DOMAIN EVENTS                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Event Name                    │ Aggregate   │ Trigger      │
│  ──────────────────────────────┼─────────────┼──────────────│
│  load.snapshot.created         │ Tour        │ Snapshot new │
│  capacity.state.updated        │ Tour        │ Recalc       │
│  suggestion.generated          │ Suggestion  │ Match found  │
│  suggestion.decision.made      │ Suggestion  │ Accept/Rej   │
│  tour.route.updated            │ Tour        │ Route change │
│  order.matched                 │ Order       │ Assigned     │
│  order.expired                 │ Order       │ Timeout      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### 1.3.2 Event-Schemas

##### Event: load.snapshot.created

```json
{
  "eventId": "ev_01HQP5X7Y8Z9ZABCDEF",
  "eventType": "load.snapshot.created",
  "eventVersion": "1.0",
  "timestamp": "2024-01-19T08:45:00Z",
  "correlationId": "corr_01HQP5X7Y8Z9GHIJKL",
  "causationId": "req_01HQP5X7Y8Z9MNOPQR",
  "aggregateType": "Tour",
  "aggregateId": "tu_01HQP5X7Y8Z9GHIJKL",
  "data": {
    "loadSnapshotId": "ls_01HQP5X7Y8Z9EFGHIJ",
    "tourId": "tu_01HQP5X7Y8Z9GHIJKL",
    "stopId": "st_01HQP5X7Y8Z9STUVWX",
    "segmentId": "seg_tu_01HQP_1",
    "volumeUsedM3": 17.5,
    "weightUsedKg": 4500,
    "palletsUsed": 6,
    "source": "VISION",
    "confidence": 0.89,
    "imageRefIds": ["img_01HQP5X7Y8Z9KLMNOP"]
  },
  "metadata": {
    "userId": "us_01HQP5X7Y8Z9MNOPQR",
    "source": "DRIVER_APP",
    "version": "2.1.0"
  }
}
```

##### Event: capacity.state.updated

```json
{
  "eventId": "ev_01HQP5X7Y8Z9ZABCDEF",
  "eventType": "capacity.state.updated",
  "eventVersion": "1.0",
  "timestamp": "2024-01-19T08:45:05Z",
  "correlationId": "corr_01HQP5X7Y8Z9GHIJKL",
  "aggregateType": "Tour",
  "aggregateId": "tu_01HQP5X7Y8Z9GHIJKL",
  "data": {
    "capacityStateId": "cs_01HQP5X7Y8Z9HIJKLM",
    "tourId": "tu_01HQP5X7Y8Z9GHIJKL",
    "segmentId": "seg_tu_01HQP_1",
    "previousStateId": "cs_01HQP5X7Y8Z9PREVIOU",
    "volumeFreeM3": 7.5,
    "weightFreeKg": 3000,
    "palletsFree": 4,
    "volumeUtilizationPct": 70,
    "weightUtilizationPct": 60,
    "palletsUtilizationPct": 60,
    "basedOnSnapshotId": "ls_01HQP5X7Y8Z9EFGHIJ"
  }
}
```

##### Event: suggestion.generated

```json
{
  "eventId": "ev_01HQP5X7Y8Z9ZABCDEF",
  "eventType": "suggestion.generated",
  "eventVersion": "1.0",
  "timestamp": "2024-01-19T08:50:00Z",
  "correlationId": "corr_01HQP5X7Y8Z9MATCH01",
  "aggregateType": "Suggestion",
  "aggregateId": "sug_01HQP5X7Y8Z9TUVWXY",
  "data": {
    "suggestionId": "sug_01HQP5X7Y8Z9TUVWXY",
    "tourId": "tu_01HQP5X7Y8Z9GHIJKL",
    "orderId": "ord_01HQP5X7Y8Z9NOPQRS",
    "segmentId": "seg_tu_01HQP_2",
    "extraRevenue": 245.00,
    "extraCost": 67.00,
    "margin": 178.00,
    "detourKm": 5.8,
    "detourMinutes": 14,
    "totalScore": 0.82,
    "validUntil": "2024-01-19T14:00:00Z"
  }
}
```

##### Event: suggestion.decision.made

```json
{
  "eventId": "ev_01HQP5X7Y8Z9ZABCDEF",
  "eventType": "suggestion.decision.made",
  "eventVersion": "1.0",
  "timestamp": "2024-01-19T10:15:00Z",
  "correlationId": "corr_01HQP5X7Y8Z9DECIS01",
  "aggregateType": "Suggestion",
  "aggregateId": "sug_01HQP5X7Y8Z9TUVWXY",
  "data": {
    "suggestionId": "sug_01HQP5X7Y8Z9TUVWXY",
    "tourId": "tu_01HQP5X7Y8Z9GHIJKL",
    "orderId": "ord_01HQP5X7Y8Z9NOPQRS",
    "decision": "ACCEPT",
    "decisionBy": "DISPATCHER",
    "decisionUserId": "us_01HQP5X7Y8Z9DISPATCH",
    "previousStatus": "NEW",
    "newStatus": "ACCEPTED_DISPATCHER"
  }
}
```

##### Event: tour.route.updated

```json
{
  "eventId": "ev_01HQP5X7Y8Z9ZABCDEF",
  "eventType": "tour.route.updated",
  "eventVersion": "1.0",
  "timestamp": "2024-01-19T10:15:30Z",
  "correlationId": "corr_01HQP5X7Y8Z9ROUTE01",
  "aggregateType": "Tour",
  "aggregateId": "tu_01HQP5X7Y8Z9GHIJKL",
  "data": {
    "tourId": "tu_01HQP5X7Y8Z9GHIJKL",
    "reason": "SUGGESTION_ACCEPTED",
    "suggestionId": "sug_01HQP5X7Y8Z9TUVWXY",
    "previousRoute": {
      "stops": [
        {"stopId": "st_001", "sequence": 1, "city": "München"},
        {"stopId": "st_002", "sequence": 2, "city": "Augsburg"},
        {"stopId": "st_003", "sequence": 3, "city": "Ulm"}
      ]
    },
    "newRoute": {
      "stops": [
        {"stopId": "st_001", "sequence": 1, "city": "München"},
        {"stopId": "st_002", "sequence": 2, "city": "Augsburg"},
        {"stopId": "st_new_pickup", "sequence": 3, "city": "Augsburg", "type": "PICKUP"},
        {"stopId": "st_003", "sequence": 4, "city": "Ulm"},
        {"stopId": "st_new_delivery", "sequence": 5, "city": "Ulm", "type": "DELIVERY"}
      ]
    },
    "addedOrderIds": ["ord_01HQP5X7Y8Z9NOPQRS"],
    "newTotalDistanceKm": 195,
    "newEndTime": "2024-01-19T17:30:00Z"
  }
}
```

---

### 1.4 Aggregate-Design

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         AGGREGATE BOUNDARIES                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        TOUR AGGREGATE                                    ││
│  │                                                                         ││
│  │   Tour (Root)                                                           ││
│  │   ├── Stop[]                                                            ││
│  │   ├── LoadSnapshot[]                                                    ││
│  │   ├── CapacityState[]                                                   ││
│  │   └── Invariants:                                                       ││
│  │       ├── Stop sequences must be unique                                 ││
│  │       ├── Capacity state per segment must be unique (valid)             ││
│  │       ├── Load snapshots must reference valid stops                     ││
│  │       └── Tour status transitions must be valid                         ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                     SUGGESTION AGGREGATE                                 ││
│  │                                                                         ││
│  │   Suggestion (Root)                                                     ││
│  │   └── Invariants:                                                       ││
│  │       ├── Cannot accept expired suggestion                              ││
│  │       ├── Cannot change decision after made                             ││
│  │       ├── Status transitions must be valid                              ││
│  │       └── Must reference valid tour and order                           ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                     ORDER CANDIDATE AGGREGATE                            ││
│  │                                                                         ││
│  │   OrderCandidate (Root)                                                 ││
│  │   └── Invariants:                                                       ││
│  │       ├── Cannot assign already assigned order                          ││
│  │       ├── Reservation must have expiration                              ││
│  │       └── Status transitions must be valid                              ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Matching-Heuristik

### 2.1 Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                MATCHING PIPELINE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Input:                                                     │
│  ├── Active Tours with Capacity                             │
│  └── Open Order Candidates                                  │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │   FILTER     │──►│   SCORING    │──►│   RANKING    │   │
│  │   PHASE      │   │   PHASE      │   │   PHASE      │   │
│  └──────────────┘   └──────────────┘   └──────────────┘   │
│         │                  │                  │            │
│         ▼                  ▼                  ▼            │
│  Remove unfitting    Calculate scores    Top N per tour   │
│  candidates          per candidate       with cutoff      │
│                                                             │
│  Output:                                                    │
│  └── List<Suggestion> per Tour                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.2 Filter-Phase

#### 2.2.1 Kapazitäts-Filter

```python
def filter_by_capacity(
    order: OrderCandidate,
    capacity: CapacityState
) -> bool:
    """
    Check if order fits in available capacity.
    
    Returns True if ALL constraints are satisfied.
    """
    return (
        order.volumeM3 <= capacity.volumeFreeM3 and
        order.weightKg <= capacity.weightFreeKg and
        order.pallets <= capacity.palletsFree
    )
```

#### 2.2.2 Geografischer Filter

```python
from typing import Optional
from geopy.distance import geodesic

def filter_by_geography(
    order: OrderCandidate,
    tour: Tour,
    segment: Segment,
    max_pickup_detour_km: float = 10.0,
    max_delivery_detour_km: float = 10.0
) -> bool:
    """
    Check if order pickup/delivery locations are within
    acceptable detour distance from route.
    """
    
    # Calculate distance from segment route to pickup
    pickup_detour = calculate_min_detour_to_route(
        point=order.pickupLocation,
        route_points=[segment.fromStop.location, segment.toStop.location],
        remaining_route=get_remaining_route(tour, segment)
    )
    
    # Calculate distance from delivery to remaining route
    delivery_detour = calculate_min_detour_to_route(
        point=order.deliveryLocation,
        route_points=get_remaining_route(tour, segment)
    )
    
    return (
        pickup_detour <= max_pickup_detour_km and
        delivery_detour <= max_delivery_detour_km
    )


def calculate_min_detour_to_route(
    point: Location,
    route_points: list[Location]
) -> float:
    """
    Calculate minimum distance from point to any point on route.
    """
    min_distance = float('inf')
    
    for i in range(len(route_points) - 1):
        # Distance to line segment
        dist = point_to_segment_distance(
            point,
            route_points[i],
            route_points[i + 1]
        )
        min_distance = min(min_distance, dist)
    
    return min_distance


def point_to_segment_distance(
    point: Location,
    segment_start: Location,
    segment_end: Location
) -> float:
    """
    Calculate shortest distance from point to line segment.
    Uses Haversine formula for geographic coordinates.
    """
    # Simplified implementation
    # In production: use proper geospatial library
    
    # Distance to start
    d_start = geodesic(
        (point.lat, point.lon),
        (segment_start.lat, segment_start.lon)
    ).kilometers
    
    # Distance to end
    d_end = geodesic(
        (point.lat, point.lon),
        (segment_end.lat, segment_end.lon)
    ).kilometers
    
    return min(d_start, d_end)
```

#### 2.2.3 Zeitfenster-Filter

```python
from datetime import timedelta

def filter_by_time_window(
    order: OrderCandidate,
    tour: Tour,
    segment: Segment,
    avg_speed_kmh: float = 50.0,
    service_time_minutes: int = 30
) -> tuple[bool, Optional[datetime], Optional[datetime]]:
    """
    Check if order time windows can be satisfied.
    
    Returns:
        - bool: True if time windows can be satisfied
        - datetime: Estimated arrival at pickup
        - datetime: Estimated arrival at delivery
    """
    
    # Calculate current ETA at segment end
    current_eta_at_segment_end = calculate_eta_at_stop(
        tour, segment.toStopId
    )
    
    # Estimate arrival at pickup (after segment start)
    eta_at_pickup = current_eta_at_segment_end + timedelta(
        minutes=estimate_travel_time(
            segment.toStop.location,
            order.pickupLocation,
            avg_speed_kmh
        )
    )
    
    # Check pickup time window
    if eta_at_pickup < order.pickupTimeWindowFrom:
        # Too early - would need to wait
        # Could still work if we can adjust timing
        pass
    if eta_at_pickup > order.pickupTimeWindowTo:
        # Too late
        return False, None, None
    
    # Estimate arrival at delivery
    eta_at_delivery = eta_at_pickup + timedelta(
        minutes=service_time_minutes + 
        estimate_travel_time(
            order.pickupLocation,
            order.deliveryLocation,
            avg_speed_kmh
        )
    )
    
    # Check delivery time window
    if eta_at_delivery > order.deliveryTimeWindowTo:
        # Too late for delivery
        return False, None, None
    
    return True, eta_at_pickup, eta_at_delivery
```

#### 2.2.4 Kombinierter Filter

```python
@dataclass
class FilterResult:
    passed: bool
    reason: Optional[str] = None
    eta_pickup: Optional[datetime] = None
    eta_delivery: Optional[datetime] = None
    pickup_detour_km: Optional[float] = None
    delivery_detour_km: Optional[float] = None


def apply_filters(
    order: OrderCandidate,
    tour: Tour,
    segment: Segment,
    capacity: CapacityState,
    config: MatchingConfig
) -> FilterResult:
    """
    Apply all filters to check if order can be matched.
    """
    
    # 1. Capacity Filter
    if not filter_by_capacity(order, capacity):
        return FilterResult(
            passed=False,
            reason="CAPACITY_EXCEEDED"
        )
    
    # 2. Geography Filter
    if not filter_by_geography(
        order, tour, segment,
        config.max_pickup_detour_km,
        config.max_delivery_detour_km
    ):
        return FilterResult(
            passed=False,
            reason="DETOUR_TOO_LARGE"
        )
    
    # 3. Time Window Filter
    time_ok, eta_pickup, eta_delivery = filter_by_time_window(
        order, tour, segment
    )
    if not time_ok:
        return FilterResult(
            passed=False,
            reason="TIME_WINDOW_MISMATCH"
        )
    
    # All filters passed
    pickup_detour = calculate_min_detour_to_route(
        order.pickupLocation,
        [segment.fromStop.location, segment.toStop.location]
    )
    delivery_detour = calculate_min_detour_to_route(
        order.deliveryLocation,
        get_remaining_route(tour, segment)
    )
    
    return FilterResult(
        passed=True,
        eta_pickup=eta_pickup,
        eta_delivery=eta_delivery,
        pickup_detour_km=pickup_detour,
        delivery_detour_km=delivery_detour
    )
```

---

### 2.3 Scoring-Phase

#### 2.3.1 Score-Berechnungen

```python
@dataclass
class ScoreComponents:
    revenue_score: float          # 0.0 - 1.0
    capacity_score: float         # 0.0 - 1.0
    priority_score: float         # 0.0 - 1.0
    detour_score: float           # 0.0 - 1.0
    time_fit_score: float         # 0.0 - 1.0
    direction_score: float        # 0.0 - 1.0
    total_score: float            # Weighted composite


def calculate_scores(
    order: OrderCandidate,
    tour: Tour,
    segment: Segment,
    capacity: CapacityState,
    filter_result: FilterResult,
    config: MatchingConfig
) -> ScoreComponents:
    """
    Calculate all score components for a matched order.
    """
    
    # 1. Revenue Score
    revenue_score = calculate_revenue_score(
        order.price,
        filter_result.pickup_detour_km + filter_result.delivery_detour_km,
        config
    )
    
    # 2. Capacity Utilization Score
    capacity_score = calculate_capacity_score(
        order.volumeM3,
        capacity.volumeFreeM3,
        order.pallets,
        capacity.palletsFree
    )
    
    # 3. Priority Score
    priority_score = calculate_priority_score(order.priority)
    
    # 4. Detour Score (inverse - less detour = higher score)
    total_detour = filter_result.pickup_detour_km + filter_result.delivery_detour_km
    detour_score = calculate_detour_score(total_detour, config.max_total_detour_km)
    
    # 5. Time Fit Score
    time_fit_score = calculate_time_fit_score(
        filter_result.eta_pickup,
        order.pickupTimeWindowFrom,
        order.pickupTimeWindowTo,
        filter_result.eta_delivery,
        order.deliveryTimeWindowFrom,
        order.deliveryTimeWindowTo
    )
    
    # 6. Direction Score (alignment with tour direction)
    direction_score = calculate_direction_score(
        tour,
        segment,
        order.pickupLocation,
        order.deliveryLocation
    )
    
    # 7. Total Score (weighted)
    total_score = (
        config.weight_revenue * revenue_score +
        config.weight_capacity * capacity_score +
        config.weight_priority * priority_score +
        config.weight_detour * detour_score +
        config.weight_time_fit * time_fit_score +
        config.weight_direction * direction_score
    )
    
    return ScoreComponents(
        revenue_score=revenue_score,
        capacity_score=capacity_score,
        priority_score=priority_score,
        detour_score=detour_score,
        time_fit_score=time_fit_score,
        direction_score=direction_score,
        total_score=total_score
    )


def calculate_revenue_score(
    price: float,
    detour_km: float,
    config: MatchingConfig
) -> float:
    """
    Revenue Score: price per detour km
    
    RS = order.price / (detour_km + 1)
    Normalized to 0-1 range.
    """
    if detour_km == 0:
        detour_km = 0.1  # Avoid division by zero
    
    revenue_per_km = price / detour_km
    
    # Normalize: assume 20 EUR/km is excellent (1.0)
    # 5 EUR/km is poor (0.25)
    normalized = min(1.0, revenue_per_km / config.target_revenue_per_km)
    
    return normalized


def calculate_capacity_score(
    order_volume: float,
    free_volume: float,
    order_pallets: int,
    free_pallets: int
) -> float:
    """
    Capacity Utilization Score
    
    Higher score for orders that fill available capacity well.
    """
    volume_ratio = order_volume / free_volume if free_volume > 0 else 0
    pallet_ratio = order_pallets / free_pallets if free_pallets > 0 else 0
    
    # Average of both ratios, capped at 1.0
    # Ideal: fills 80-100% of capacity
    avg_ratio = (volume_ratio + pallet_ratio) / 2
    
    # Score peaks at 0.9 utilization (leaving some buffer)
    if avg_ratio <= 0.9:
        return avg_ratio / 0.9
    else:
        # Penalize very tight fits (leave some buffer)
        return max(0.5, 1.0 - (avg_ratio - 0.9) * 5)


def calculate_priority_score(priority: OrderPriority) -> float:
    """
    Priority Score based on business priority.
    """
    priority_scores = {
        OrderPriority.HIGH: 1.0,
        OrderPriority.CONTRACTUAL: 0.8,
        OrderPriority.NORMAL: 0.5
    }
    return priority_scores.get(priority, 0.5)


def calculate_detour_score(
    detour_km: float,
    max_detour_km: float
) -> float:
    """
    Detour Score (inverse)
    
    Less detour = higher score.
    """
    if detour_km >= max_detour_km:
        return 0.0
    
    return 1.0 - (detour_km / max_detour_km)


def calculate_time_fit_score(
    eta_pickup: datetime,
    pickup_window_from: datetime,
    pickup_window_to: datetime,
    eta_delivery: datetime,
    delivery_window_from: datetime,
    delivery_window_to: datetime
) -> float:
    """
    Time Fit Score
    
    Higher score for orders that fit well in time windows
    with good buffer.
    """
    def window_fit_score(
        eta: datetime,
        window_from: datetime,
        window_to: datetime
    ) -> float:
        window_duration = (window_to - window_from).total_seconds()
        buffer_start = (eta - window_from).total_seconds()
        buffer_end = (window_to - eta).total_seconds()
        
        # Score based on position within window
        # Best: middle of window
        # OK: within window but with some buffer
        # Poor: at the edge of window
        
        if buffer_start < 0 or buffer_end < 0:
            return 0.0  # Outside window
        
        # Score 1.0 if eta is in middle third of window
        # Score decreases towards edges
        position = buffer_start / window_duration
        
        if 0.33 <= position <= 0.67:
            return 1.0
        elif position < 0.33:
            return 0.5 + (position / 0.33) * 0.5
        else:
            return 0.5 + ((1.0 - position) / 0.33) * 0.5
    
    pickup_score = window_fit_score(eta_pickup, pickup_window_from, pickup_window_to)
    delivery_score = window_fit_score(eta_delivery, delivery_window_from, delivery_window_to)
    
    return (pickup_score + delivery_score) / 2


def calculate_direction_score(
    tour: Tour,
    segment: Segment,
    pickup_location: Location,
    delivery_location: Location
) -> float:
    """
    Direction Score
    
    Higher score if order direction aligns with tour direction.
    """
    import math
    
    # Tour direction vector (from current position to destination)
    tour_direction = calculate_direction_vector(
        segment.fromStop.location,
        get_final_destination(tour)
    )
    
    # Order direction vector
    order_direction = calculate_direction_vector(
        pickup_location,
        delivery_location
    )
    
    # Cosine similarity (dot product of normalized vectors)
    cos_angle = (
        tour_direction[0] * order_direction[0] +
        tour_direction[1] * order_direction[1]
    )
    
    # Normalize to 0-1 range (cos can be -1 to 1)
    # 1.0 = same direction, -1.0 = opposite direction
    return (cos_angle + 1) / 2


def calculate_direction_vector(from_loc: Location, to_loc: Location) -> tuple:
    """Calculate normalized direction vector between two locations."""
    import math
    
    dx = to_loc.lon - from_loc.lon
    dy = to_loc.lat - from_loc.lat
    
    length = math.sqrt(dx * dx + dy * dy)
    if length == 0:
        return (0, 0)
    
    return (dx / length, dy / length)
```

#### 2.3.2 Konfiguration

```python
@dataclass
class MatchingConfig:
    """Configuration for matching algorithm."""
    
    # Filter Thresholds
    max_pickup_detour_km: float = 10.0
    max_delivery_detour_km: float = 10.0
    max_total_detour_km: float = 15.0
    
    # Scoring Weights
    weight_revenue: float = 0.30
    weight_capacity: float = 0.20
    weight_priority: float = 0.15
    weight_detour: float = 0.15
    weight_time_fit: float = 0.15
    weight_direction: float = 0.05
    
    # Target Values for Normalization
    target_revenue_per_km: float = 20.0  # EUR/km
    
    # Ranking
    max_suggestions_per_tour: int = 5
    min_score_threshold: float = 0.4
    
    # Validity
    suggestion_validity_hours: int = 2
```

---

### 2.4 Ranking-Phase

```python
from typing import List
from dataclasses import dataclass

@dataclass
class RankedSuggestion:
    suggestion: Suggestion
    rank: int


def rank_suggestions(
    candidates: List[tuple[OrderCandidate, ScoreComponents, FilterResult]],
    tour: Tour,
    config: MatchingConfig
) -> List[RankedSuggestion]:
    """
    Rank matched candidates and create suggestions.
    """
    
    # Sort by total score descending
    sorted_candidates = sorted(
        candidates,
        key=lambda x: x[1].total_score,
        reverse=True
    )
    
    # Apply minimum threshold
    filtered = [
        c for c in sorted_candidates
        if c[1].total_score >= config.min_score_threshold
    ]
    
    # Limit to max suggestions
    top_n = filtered[:config.max_suggestions_per_tour]
    
    # Create suggestions
    suggestions = []
    for rank, (order, scores, filter_result) in enumerate(top_n, 1):
        suggestion = create_suggestion(
            tour=tour,
            order=order,
            scores=scores,
            filter_result=filter_result,
            config=config
        )
        suggestions.append(RankedSuggestion(
            suggestion=suggestion,
            rank=rank
        ))
    
    return suggestions


def create_suggestion(
    tour: Tour,
    order: OrderCandidate,
    scores: ScoreComponents,
    filter_result: FilterResult,
    config: MatchingConfig
) -> Suggestion:
    """Create a Suggestion entity from matched order."""
    
    # Calculate economics
    total_detour_km = filter_result.pickup_detour_km + filter_result.delivery_detour_km
    extra_cost = estimate_extra_cost(total_detour_km, filter_result.detour_minutes)
    margin = order.price - extra_cost
    margin_percent = (margin / order.price * 100) if order.price > 0 else 0
    
    return Suggestion(
        suggestionId=generate_uuid(),
        tourId=tour.tourId,
        orderId=order.orderId,
        segmentId=filter_result.segment_id,
        pickupAfterStopSequence=filter_result.pickup_after_sequence,
        deliveryAfterStopSequence=filter_result.delivery_after_sequence,
        extraRevenue=order.price,
        extraCost=extra_cost,
        margin=margin,
        marginPercent=margin_percent,
        detourKm=total_detour_km,
        detourMinutes=filter_result.detour_minutes,
        capacityScore=scores.capacity_score,
        revenueScore=scores.revenue_score,
        priorityScore=scores.priority_score,
        totalScore=scores.total_score,
        status=SuggestionStatus.NEW,
        validUntil=datetime.now() + timedelta(hours=config.suggestion_validity_hours),
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    )


def estimate_extra_cost(detour_km: float, detour_minutes: float) -> float:
    """Estimate additional costs for detour."""
    
    # Cost factors
    cost_per_km = 0.50  # EUR per km (fuel, wear)
    driver_hourly_rate = 25.0  # EUR per hour
    
    distance_cost = detour_km * cost_per_km
    time_cost = (detour_minutes / 60) * driver_hourly_rate
    handling_cost = 15.0  # Fixed handling cost
    
    return distance_cost + time_cost + handling_cost
```

---

### 2.5 Vollständiger Matching-Algorithmus

```python
class MatchingEngine:
    """
    Main matching engine that orchestrates the matching pipeline.
    """
    
    def __init__(self, config: MatchingConfig):
        self.config = config
    
    def find_matches(
        self,
        tours: List[Tour],
        orders: List[OrderCandidate],
        capacity_states: Dict[str, CapacityState]
    ) -> Dict[str, List[RankedSuggestion]]:
        """
        Find matching orders for all active tours.
        
        Returns dict mapping tourId to list of suggestions.
        """
        
        results = {}
        
        for tour in tours:
            if tour.status != TourStatus.IN_PROGRESS:
                continue
            
            tour_suggestions = self._match_tour(
                tour, orders, capacity_states
            )
            
            if tour_suggestions:
                results[tour.tourId] = tour_suggestions
        
        return results
    
    def _match_tour(
        self,
        tour: Tour,
        orders: List[OrderCandidate],
        capacity_states: Dict[str, CapacityState]
    ) -> List[RankedSuggestion]:
        """Find matches for a single tour."""
        
        candidates = []
        
        for order in orders:
            if order.status != OrderStatus.OPEN:
                continue
            
            # Try each segment
            for segment in get_tour_segments(tour):
                capacity = capacity_states.get(segment.segmentId)
                if not capacity:
                    continue
                
                # Apply filters
                filter_result = apply_filters(
                    order, tour, segment, capacity, self.config
                )
                
                if not filter_result.passed:
                    continue
                
                # Calculate scores
                scores = calculate_scores(
                    order, tour, segment, capacity,
                    filter_result, self.config
                )
                
                candidates.append((order, scores, filter_result))
        
        # Rank and return top suggestions
        return rank_suggestions(candidates, tour, self.config)
    
    def recompute_matches(
        self,
        tour_id: str,
        trigger: str = "CAPACITY_UPDATE"
    ) -> List[Suggestion]:
        """
        Recompute matches for a specific tour after a trigger event.
        """
        # Fetch fresh data
        tour = self.tour_repository.get(tour_id)
        orders = self.order_repository.get_open_orders()
        capacities = self.capacity_repository.get_for_tour(tour_id)
        
        # Run matching
        suggestions = self._match_tour(tour, orders, capacities)
        
        # Store new suggestions
        for ranked in suggestions:
            self.suggestion_repository.save(ranked.suggestion)
            self.event_publisher.publish(
                "suggestion.generated",
                ranked.suggestion.to_dict()
            )
        
        return [r.suggestion for r in suggestions]
```

---

### 2.6 Entscheidungslogik

```python
class SuggestionDecisionHandler:
    """
    Handles decisions on suggestions (accept/reject).
    """
    
    def __init__(
        self,
        suggestion_repository: SuggestionRepository,
        tour_repository: TourRepository,
        order_repository: OrderRepository,
        event_publisher: EventPublisher
    ):
        self.suggestions = suggestion_repository
        self.tours = tour_repository
        self.orders = order_repository
        self.events = event_publisher
    
    def decide(
        self,
        suggestion_id: str,
        decision: str,  # "ACCEPT" | "REJECT"
        decided_by: str,  # "DRIVER" | "DISPATCHER"
        user_id: str
    ) -> Suggestion:
        """
        Process a decision on a suggestion.
        """
        
        suggestion = self.suggestions.get(suggestion_id)
        
        # Validate
        if suggestion.status != SuggestionStatus.NEW:
            raise InvalidStateError(
                f"Suggestion already decided: {suggestion.status}"
            )
        
        if datetime.now() > suggestion.validUntil:
            raise ExpiredError("Suggestion has expired")
        
        # Update status
        if decision == "ACCEPT":
            new_status = (
                SuggestionStatus.ACCEPTED_DRIVER
                if decided_by == "DRIVER"
                else SuggestionStatus.ACCEPTED_DISPATCHER
            )
            
            # Update tour route
            self._update_tour_route(suggestion)
            
            # Update order status
            self._assign_order(suggestion)
            
        else:
            new_status = SuggestionStatus.REJECTED
        
        suggestion.status = new_status
        suggestion.decidedBy = decided_by
        suggestion.decidedAt = datetime.now()
        suggestion.decisionUserId = user_id
        suggestion.updatedAt = datetime.now()
        
        # Persist
        self.suggestions.save(suggestion)
        
        # Publish event
        self.events.publish("suggestion.decision.made", {
            "suggestionId": suggestion.suggestionId,
            "tourId": suggestion.tourId,
            "orderId": suggestion.orderId,
            "decision": decision,
            "decisionBy": decided_by,
            "decisionUserId": user_id,
            "previousStatus": SuggestionStatus.NEW,
            "newStatus": new_status
        })
        
        return suggestion
    
    def _update_tour_route(self, suggestion: Suggestion):
        """Insert new stops into tour route."""
        
        tour = self.tours.get(suggestion.tourId)
        order = self.orders.get(suggestion.orderId)
        
        # Create pickup stop
        pickup_stop = Stop(
            stopId=generate_uuid(),
            tourId=tour.tourId,
            sequence=suggestion.pickupAfterStopSequence + 0.5,
            location=order.pickupLocation,
            type=StopType.PICKUP,
            timeWindowFrom=order.pickupTimeWindowFrom,
            timeWindowTo=order.pickupTimeWindowTo,
            assignedOrderIds=[order.orderId],
            status=StopStatus.PENDING,
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        # Create delivery stop
        delivery_stop = Stop(
            stopId=generate_uuid(),
            tourId=tour.tourId,
            sequence=suggestion.deliveryAfterStopSequence + 1.5,
            location=order.deliveryLocation,
            type=StopType.DELIVERY,
            timeWindowFrom=order.deliveryTimeWindowFrom,
            timeWindowTo=order.deliveryTimeWindowTo,
            assignedOrderIds=[order.orderId],
            status=StopStatus.PENDING,
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        # Insert stops and renumber
        tour.plannedRoute = insert_and_renumber(
            tour.plannedRoute,
            [pickup_stop, delivery_stop]
        )
        
        # Update statistics
        tour.totalDistanceKm += suggestion.detourKm
        tour.totalDurationMinutes += suggestion.detourMinutes
        tour.updatedAt = datetime.now()
        
        self.tours.save(tour)
        
        # Publish route update
        self.events.publish("tour.route.updated", {
            "tourId": tour.tourId,
            "reason": "SUGGESTION_ACCEPTED",
            "suggestionId": suggestion.suggestionId,
            "addedOrderIds": [order.orderId]
        })
    
    def _assign_order(self, suggestion: Suggestion):
        """Mark order as assigned."""
        
        order = self.orders.get(suggestion.orderId)
        order.status = OrderStatus.ASSIGNED
        order.updatedAt = datetime.now()
        
        self.orders.save(order)
```

---

## 3. API-Design (OpenAPI 3.0)

### 3.1 Vollständige Spezifikation

```yaml
openapi: 3.0.3
info:
  title: CargoBit Capacity & Suggestions API
  description: |
    API for capacity-aware order matching in the CargoBit Transport Platform.
    
    ## Overview
    This API enables:
    - Upload of load snapshots (images + metadata)
    - Query of current capacity states
    - Retrieval of order suggestions
    - Decision handling (accept/reject suggestions)
    
    ## Authentication
    All endpoints require Bearer token authentication via OAuth 2.0.
    
    ## Rate Limits
    - Read operations: 100 requests/minute
    - Write operations: 30 requests/minute
    
  version: 1.0.0
  contact:
    name: CargoBit API Support
    email: api-support@cargobit.io
    url: https://docs.cargobit.io/api
  
servers:
  - url: https://api.cargobit.io/v1
    description: Production
  - url: https://api-staging.cargobit.io/v1
    description: Staging

tags:
  - name: Capacity
    description: Capacity snapshot and state management
  - name: Suggestions
    description: Order matching suggestions
  - name: Tours
    description: Tour information
  - name: Health
    description: Health check endpoints

security:
  - bearerAuth: []

paths:
  # ============================================
  # CAPACITY ENDPOINTS
  # ============================================
  
  /tours/{tourId}/load-snapshots:
    post:
      tags:
        - Capacity
      summary: Create load snapshot
      description: |
        Upload a load snapshot with optional image.
        The snapshot captures the current loading state of the vehicle.
        
        Supported image formats: JPEG, PNG (max 10MB)
      operationId: createLoadSnapshot
      parameters:
        - name: tourId
          in: path
          required: true
          description: Unique tour identifier
          schema:
            type: string
            format: uuid
            example: "tu_01HQP5X7Y8Z9GHIJKL"
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required:
                - source
              properties:
                image:
                  type: string
                  format: binary
                  description: Optional image of cargo space
                stopId:
                  type: string
                  format: uuid
                  nullable: true
                  description: ID of the stop where snapshot was taken
                  example: "st_01HQP5X7Y8Z9STUVWX"
                source:
                  type: string
                  enum:
                    - MANUAL
                    - VISION
                    - TELEMATICS
                  description: Source of the snapshot data
                volumeUsedM3:
                  type: number
                  format: float
                  nullable: true
                  minimum: 0
                  description: Manually entered volume (m³)
                  example: 17.5
                weightUsedKg:
                  type: number
                  format: float
                  nullable: true
                  minimum: 0
                  description: Manually entered weight (kg)
                  example: 4500
                palletsUsed:
                  type: integer
                  nullable: true
                  minimum: 0
                  description: Manually entered pallet count
                  example: 6
      responses:
        '201':
          description: Snapshot created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoadSnapshot'
              example:
                loadSnapshotId: "ls_01HQP5X7Y8Z9EFGHIJ"
                tourId: "tu_01HQP5X7Y8Z9GHIJKL"
                stopId: "st_01HQP5X7Y8Z9STUVWX"
                volumeUsedM3: 17.5
                weightUsedKg: 4500
                palletsUsed: 6
                source: "VISION"
                confidence: 0.89
                createdAt: "2024-01-19T08:45:00Z"
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
        '413':
          description: Image file too large
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  
  /tours/{tourId}/capacity:
    get:
      tags:
        - Capacity
      summary: Get capacity states
      description: |
        Retrieve the current capacity state for each segment of the tour.
        Returns an array of capacity states, one per route segment.
      operationId: getCapacityStates
      parameters:
        - name: tourId
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: segmentId
          in: query
          required: false
          description: Filter by specific segment
          schema:
            type: string
      responses:
        '200':
          description: Capacity states retrieved
          content:
            application/json:
              schema:
                type: object
                properties:
                  tourId:
                    type: string
                  vehicleCapacity:
                    $ref: '#/components/schemas/VehicleCapacity'
                  segments:
                    type: array
                    items:
                      $ref: '#/components/schemas/CapacityState'
              example:
                tourId: "tu_01HQP5X7Y8Z9GHIJKL"
                vehicleCapacity:
                  volumeM3: 25.0
                  weightKg: 7500
                  pallets: 10
                segments:
                  - capacityStateId: "cs_01HQP5X7Y8Z9HIJKLM"
                    segmentId: "seg_tu_01HQP_1"
                    fromStopSequence: 1
                    toStopSequence: 2
                    volumeFreeM3: 7.5
                    weightFreeKg: 3000
                    palletsFree: 4
                    utilizationPct: 70
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  # ============================================
  # SUGGESTIONS ENDPOINTS
  # ============================================
  
  /tours/{tourId}/suggestions:
    get:
      tags:
        - Suggestions
      summary: Get order suggestions
      description: |
        Retrieve suggested additional orders for a tour.
        Suggestions are ranked by a composite score considering
        revenue, capacity utilization, detour, and time fit.
      operationId: getSuggestions
      parameters:
        - name: tourId
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: maxResults
          in: query
          required: false
          description: Maximum number of suggestions to return
          schema:
            type: integer
            minimum: 1
            maximum: 20
            default: 5
        - name: minScore
          in: query
          required: false
          description: Minimum score threshold
          schema:
            type: number
            format: float
            minimum: 0
            maximum: 1
            default: 0.4
        - name: status
          in: query
          required: false
          description: Filter by suggestion status
          schema:
            type: string
            enum:
              - NEW
              - ACCEPTED_DRIVER
              - ACCEPTED_DISPATCHER
              - REJECTED
              - EXPIRED
      responses:
        '200':
          description: Suggestions retrieved
          content:
            application/json:
              schema:
                type: object
                properties:
                  tourId:
                    type: string
                  generatedAt:
                    type: string
                    format: date-time
                  suggestions:
                    type: array
                    items:
                      $ref: '#/components/schemas/Suggestion'
              example:
                tourId: "tu_01HQP5X7Y8Z9GHIJKL"
                generatedAt: "2024-01-19T10:00:00Z"
                suggestions:
                  - suggestionId: "sug_01HQP5X7Y8Z9TUVWXY"
                    orderId: "ord_01HQP5X7Y8Z9NOPQRS"
                    order:
                      pickupLocation:
                        city: "Augsburg"
                      deliveryLocation:
                        city: "Ulm"
                      volumeM3: 2.5
                      pallets: 3
                      price: 245.00
                    extraRevenue: 245.00
                    extraCost: 67.00
                    margin: 178.00
                    marginPercent: 72.65
                    detourKm: 5.8
                    detourMinutes: 14
                    totalScore: 0.82
                    status: "NEW"
                    validUntil: "2024-01-19T14:00:00Z"
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /suggestions/{suggestionId}:
    get:
      tags:
        - Suggestions
      summary: Get suggestion details
      description: Retrieve detailed information about a specific suggestion
      operationId: getSuggestion
      parameters:
        - name: suggestionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Suggestion details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SuggestionDetail'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /suggestions/{suggestionId}/decision:
    post:
      tags:
        - Suggestions
      summary: Accept or reject suggestion
      description: |
        Make a decision on a suggestion.
        Once decided, the suggestion status cannot be changed.
        
        On accept, the tour route is automatically updated with
        the new pickup and delivery stops.
      operationId: decideSuggestion
      parameters:
        - name: suggestionId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - decision
                - decidedBy
              properties:
                decision:
                  type: string
                  enum:
                    - ACCEPT
                    - REJECT
                  description: The decision to make
                decidedBy:
                  type: string
                  enum:
                    - DRIVER
                    - DISPATCHER
                  description: Who is making the decision
                reason:
                  type: string
                  maxLength: 500
                  description: Optional reason for rejection
            example:
              decision: "ACCEPT"
              decidedBy: "DISPATCHER"
      responses:
        '200':
          description: Decision recorded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Suggestion'
        '400':
          description: Invalid decision (e.g., already decided)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                code: "INVALID_STATE"
                message: "Suggestion already decided"
                details:
                  currentStatus: "ACCEPTED_DISPATCHER"
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'
        '410':
          description: Suggestion expired
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  # ============================================
  # TOURS ENDPOINTS
  # ============================================
  
  /tours/{tourId}:
    get:
      tags:
        - Tours
      summary: Get tour details
      description: Retrieve detailed information about a tour
      operationId: getTour
      parameters:
        - name: tourId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Tour details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Tour'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /tours/{tourId}/route:
    put:
      tags:
        - Tours
      summary: Update tour route
      description: Manually update the tour route (for dispatcher overrides)
      operationId: updateTourRoute
      parameters:
        - name: tourId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - stops
              properties:
                stops:
                  type: array
                  items:
                    $ref: '#/components/schemas/StopInput'
                reason:
                  type: string
                  description: Reason for manual change
      responses:
        '200':
          description: Route updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Tour'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  # ============================================
  # HEALTH ENDPOINTS
  # ============================================
  
  /health:
    get:
      tags:
        - Health
      summary: Health check
      description: Check if the API is healthy
      operationId: healthCheck
      security: []
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum: [healthy, degraded]
                  version:
                    type: string
                  timestamp:
                    type: string
                    format: date-time
                  checks:
                    type: object
                    properties:
                      database:
                        type: string
                        enum: [ok, error]
                      kafka:
                        type: string
                        enum: [ok, error]

# ============================================
# COMPONENTS
# ============================================

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |
        JWT token obtained from OAuth 2.0 authorization server.
        
        Required scopes:
        - `tours:read` - Read tour information
        - `tours:write` - Modify tours
        - `suggestions:read` - Read suggestions
        - `suggestions:write` - Make decisions
        - `capacity:read` - Read capacity states
        - `capacity:write` - Create snapshots

  responses:
    BadRequest:
      description: Invalid request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            code: "VALIDATION_ERROR"
            message: "Invalid request parameters"
            details:
              - field: "volumeUsedM3"
                message: "Must be a positive number"
    
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            code: "UNAUTHORIZED"
            message: "Authentication required"
    
    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            code: "NOT_FOUND"
            message: "Tour not found"
            details:
              tourId: "tu_nonexistent"

  schemas:
    # ----------------------------------------
    # ENTITIES
    # ----------------------------------------
    
    LoadSnapshot:
      type: object
      required:
        - loadSnapshotId
        - tourId
        - source
        - createdAt
      properties:
        loadSnapshotId:
          type: string
          format: uuid
          description: Unique identifier
        tourId:
          type: string
          format: uuid
          description: Associated tour
        stopId:
          type: string
          format: uuid
          nullable: true
          description: Stop where snapshot was taken
        segmentId:
          type: string
          nullable: true
        volumeUsedM3:
          type: number
          format: float
          minimum: 0
        weightUsedKg:
          type: number
          format: float
          minimum: 0
        palletsUsed:
          type: integer
          minimum: 0
        source:
          type: string
          enum:
            - MANUAL
            - VISION
            - TELEMATICS
        confidence:
          type: number
          format: float
          minimum: 0
          maximum: 1
          description: Confidence score for VISION source
        imageRefIds:
          type: array
          items:
            type: string
          description: References to stored images
        isValid:
          type: boolean
        createdAt:
          type: string
          format: date-time
        createdBy:
          type: string
    
    CapacityState:
      type: object
      required:
        - capacityStateId
        - tourId
        - segmentId
      properties:
        capacityStateId:
          type: string
          format: uuid
        tourId:
          type: string
          format: uuid
        segmentId:
          type: string
        fromStopSequence:
          type: integer
        toStopSequence:
          type: integer
        fromStopId:
          type: string
        toStopId:
          type: string
        volumeFreeM3:
          type: number
          format: float
        weightFreeKg:
          type: number
          format: float
        palletsFree:
          type: integer
        utilizationPct:
          type: number
          format: float
          minimum: 0
          maximum: 100
        validFrom:
          type: string
          format: date-time
        validTo:
          type: string
          format: date-time
          nullable: true
    
    VehicleCapacity:
      type: object
      properties:
        volumeM3:
          type: number
        weightKg:
          type: number
        pallets:
          type: integer
    
    Suggestion:
      type: object
      required:
        - suggestionId
        - tourId
        - orderId
        - status
      properties:
        suggestionId:
          type: string
          format: uuid
        tourId:
          type: string
          format: uuid
        orderId:
          type: string
          format: uuid
        order:
          $ref: '#/components/schemas/OrderSummary'
        segmentId:
          type: string
        pickupAfterStopSequence:
          type: integer
        deliveryAfterStopSequence:
          type: integer
        extraRevenue:
          type: number
          format: float
          description: Additional revenue (EUR)
        extraCost:
          type: number
          format: float
          description: Estimated additional costs (EUR)
        margin:
          type: number
          format: float
          description: Contribution margin (EUR)
        marginPercent:
          type: number
          format: float
          description: Margin percentage
        detourKm:
          type: number
          format: float
          description: Additional distance (km)
        detourMinutes:
          type: integer
          description: Additional time (minutes)
        scores:
          $ref: '#/components/schemas/SuggestionScores'
        totalScore:
          type: number
          format: float
          minimum: 0
          maximum: 1
          description: Composite score (weighted)
        status:
          type: string
          enum:
            - NEW
            - ACCEPTED_DRIVER
            - ACCEPTED_DISPATCHER
            - REJECTED
            - EXPIRED
            - CANCELLED
        decidedBy:
          type: string
          nullable: true
          enum:
            - DRIVER
            - DISPATCHER
            - SYSTEM
        decidedAt:
          type: string
          format: date-time
          nullable: true
        validUntil:
          type: string
          format: date-time
          description: Expiration timestamp
        createdAt:
          type: string
          format: date-time
    
    SuggestionDetail:
      allOf:
        - $ref: '#/components/schemas/Suggestion'
        - type: object
          properties:
            order:
              $ref: '#/components/schemas/OrderCandidate'
            tour:
              $ref: '#/components/schemas/TourSummary'
            insertionDetails:
              type: object
              properties:
                pickupStop:
                  $ref: '#/components/schemas/StopPreview'
                deliveryStop:
                  $ref: '#/components/schemas/StopPreview'
                affectedStops:
                  type: array
                  items:
                    $ref: '#/components/schemas/StopPreview'
    
    SuggestionScores:
      type: object
      properties:
        capacity:
          type: number
          format: float
        revenue:
          type: number
          format: float
        priority:
          type: number
          format: float
        detour:
          type: number
          format: float
        timeFit:
          type: number
          format: float
        direction:
          type: number
          format: float
    
    OrderSummary:
      type: object
      properties:
        orderId:
          type: string
        pickupLocation:
          $ref: '#/components/schemas/Location'
        deliveryLocation:
          $ref: '#/components/schemas/Location'
        volumeM3:
          type: number
        weightKg:
          type: number
        pallets:
          type: integer
        price:
          type: number
        priority:
          type: string
          enum:
            - NORMAL
            - HIGH
            - CONTRACTUAL
    
    OrderCandidate:
      allOf:
        - $ref: '#/components/schemas/OrderSummary'
        - type: object
          properties:
            externalOrderId:
              type: string
            pickupTimeWindowFrom:
              type: string
              format: date-time
            pickupTimeWindowTo:
              type: string
              format: date-time
            deliveryTimeWindowFrom:
              type: string
              format: date-time
            deliveryTimeWindowTo:
              type: string
              format: date-time
            cargoDescription:
              type: string
            specialRequirements:
              type: array
              items:
                type: string
            status:
              type: string
              enum:
                - OPEN
                - RESERVED
                - ASSIGNED
                - CANCELLED
            maxDetourKm:
              type: number
            maxDelayMinutes:
              type: integer
            createdAt:
              type: string
              format: date-time
            source:
              type: string
    
    Tour:
      type: object
      properties:
        tourId:
          type: string
          format: uuid
        vehicleId:
          type: string
        driverId:
          type: string
        status:
          type: string
          enum:
            - PLANNED
            - IN_PROGRESS
            - COMPLETED
            - CANCELLED
        plannedRoute:
          type: array
          items:
            $ref: '#/components/schemas/Stop'
        startTimePlanned:
          type: string
          format: date-time
        endTimePlanned:
          type: string
          format: date-time
        startTimeActual:
          type: string
          format: date-time
          nullable: true
        endTimeActual:
          type: string
          format: date-time
          nullable: true
        currentStopId:
          type: string
          nullable: true
        totalDistanceKm:
          type: number
        totalDurationMinutes:
          type: integer
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
    
    TourSummary:
      type: object
      properties:
        tourId:
          type: string
        status:
          type: string
        driverName:
          type: string
        vehicleLicensePlate:
          type: string
        currentLocation:
          $ref: '#/components/schemas/Location'
        stopCount:
          type: integer
        completedStops:
          type: integer
    
    Stop:
      type: object
      properties:
        stopId:
          type: string
          format: uuid
        sequence:
          type: integer
        location:
          $ref: '#/components/schemas/Location'
        type:
          type: string
          enum:
            - PICKUP
            - DELIVERY
            - BREAK
            - DEPOT
        timeWindowFrom:
          type: string
          format: date-time
          nullable: true
        timeWindowTo:
          type: string
          format: date-time
          nullable: true
        plannedArrival:
          type: string
          format: date-time
        plannedDeparture:
          type: string
          format: date-time
        actualArrival:
          type: string
          format: date-time
          nullable: true
        actualDeparture:
          type: string
          format: date-time
          nullable: true
        status:
          type: string
          enum:
            - PENDING
            - IN_PROGRESS
            - COMPLETED
            - SKIPPED
        assignedOrderIds:
          type: array
          items:
            type: string
        notes:
          type: string
          nullable: true
    
    StopPreview:
      type: object
      description: Preview of a new stop to be inserted
      properties:
        location:
          $ref: '#/components/schemas/Location'
        type:
          type: string
          enum:
            - PICKUP
            - DELIVERY
        plannedArrival:
          type: string
          format: date-time
        timeWindowFrom:
          type: string
          format: date-time
        timeWindowTo:
          type: string
          format: date-time
    
    StopInput:
      type: object
      required:
        - location
        - type
      properties:
        location:
          $ref: '#/components/schemas/Location'
        type:
          type: string
          enum:
            - PICKUP
            - DELIVERY
            - BREAK
            - DEPOT
        timeWindowFrom:
          type: string
          format: date-time
        timeWindowTo:
          type: string
          format: date-time
        serviceTimeMinutes:
          type: integer
          default: 30
        orderIds:
          type: array
          items:
            type: string
        notes:
          type: string
    
    Location:
      type: object
      required:
        - lat
        - lon
      properties:
        lat:
          type: number
          format: float
          minimum: -90
          maximum: 90
          description: Latitude
        lon:
          type: number
          format: float
          minimum: -180
          maximum: 180
          description: Longitude
        address:
          type: string
          nullable: true
        postalCode:
          type: string
          nullable: true
        city:
          type: string
          nullable: true
        country:
          type: string
          nullable: true
          default: "DE"
    
    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          description: Error code
          enum:
            - VALIDATION_ERROR
            - INVALID_STATE
            - UNAUTHORIZED
            - FORBIDDEN
            - NOT_FOUND
            - CONFLICT
            - EXPIRED
            - INTERNAL_ERROR
        message:
          type: string
          description: Human-readable error message
        details:
          type: object
          description: Additional error details
        requestId:
          type: string
          description: Request ID for support
        timestamp:
          type: string
          format: date-time
```

---

## 4. Datenbank-Schema (PostgreSQL)

### 4.1 Entity-Relationship-Diagramm

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA (PostgreSQL)                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐         ┌─────────────────┐                            │
│  │    vehicles     │         │     tours       │                            │
│  ├─────────────────┤         ├─────────────────┤                            │
│  │ PK vehicle_id   │◄────────│ FK vehicle_id   │                            │
│  │    type         │         │ PK tour_id      │                            │
│  │    capacity_*   │         │ FK driver_id    │                            │
│  │    home_base_*  │         │    status       │                            │
│  └─────────────────┘         │    start_time   │                            │
│                              │    end_time     │                            │
│                              └────────┬────────┘                            │
│                                       │                                      │
│                                       │ 1:N                                  │
│                                       ▼                                      │
│  ┌─────────────────┐         ┌─────────────────┐                            │
│  │ load_snapshots  │         │     stops       │                            │
│  ├─────────────────┤         ├─────────────────┤                            │
│  │ PK snapshot_id  │         │ PK stop_id      │                            │
│  │ FK tour_id      │────────►│ FK tour_id      │                            │
│  │ FK stop_id      │         │    sequence     │                            │
│  │    source       │         │    location     │                            │
│  │    volume_used  │         │    type         │                            │
│  │    weight_used  │         │    time_window  │                            │
│  │    confidence   │         │    status       │                            │
│  └─────────────────┘         └─────────────────┘                            │
│                                                                              │
│  ┌─────────────────┐         ┌─────────────────┐                            │
│  │capacity_states  │         │ order_candidates│                            │
│  ├─────────────────┤         ├─────────────────┤                            │
│  │ PK state_id     │         │ PK order_id     │                            │
│  │ FK tour_id      │         │    pickup_loc   │                            │
│  │ FK segment_id   │         │    delivery_loc │                            │
│  │    volume_free  │         │    time_windows │                            │
│  │    weight_free  │         │    volume/weight│                            │
│  │ FK snapshot_id  │         │    price        │                            │
│  └─────────────────┘         │    status       │                            │
│                              └────────┬────────┘                            │
│                                       │                                      │
│                                       │                                      │
│                                       ▼                                      │
│                              ┌─────────────────┐                            │
│                              │  suggestions    │                            │
│                              ├─────────────────┤                            │
│                              │ PK suggestion_id│                            │
│                              │ FK tour_id      │                            │
│                              │ FK order_id     │                            │
│                              │    scores       │                            │
│                              │    economics    │                            │
│                              │    status       │                            │
│                              │    valid_until  │                            │
│                              └─────────────────┘                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Table Definitions

```sql
-- ============================================
-- VEHICLES
-- ============================================

CREATE TABLE vehicles (
    vehicle_id VARCHAR(36) PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('TRUCK', 'VAN', 'TRAILER')),
    subtype VARCHAR(50),
    capacity_volume_m3 DECIMAL(10,2) NOT NULL,
    capacity_weight_kg DECIMAL(10,2) NOT NULL,
    capacity_pallets INTEGER NOT NULL,
    length_m DECIMAL(5,2),
    width_m DECIMAL(5,2),
    height_m DECIMAL(5,2),
    home_base_lat DECIMAL(10,8),
    home_base_lon DECIMAL(11,8),
    home_base_address VARCHAR(255),
    home_base_postal_code VARCHAR(20),
    home_base_city VARCHAR(100),
    home_base_country VARCHAR(2) DEFAULT 'DE',
    license_plate VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_dimensions CHECK (
        capacity_volume_m3 > 0 AND
        capacity_weight_kg > 0 AND
        capacity_pallets >= 0
    )
);

CREATE INDEX idx_vehicles_active ON vehicles(is_active);
CREATE INDEX idx_vehicles_location ON vehicles(home_base_lat, home_base_lon);

-- ============================================
-- TOURS
-- ============================================

CREATE TABLE tours (
    tour_id VARCHAR(36) PRIMARY KEY,
    vehicle_id VARCHAR(36) NOT NULL REFERENCES vehicles(vehicle_id),
    driver_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' 
        CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    start_time_planned TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time_planned TIMESTAMP WITH TIME ZONE NOT NULL,
    start_time_actual TIMESTAMP WITH TIME ZONE,
    end_time_actual TIMESTAMP WITH TIME ZONE,
    current_segment_id VARCHAR(50),
    current_stop_id VARCHAR(36),
    current_location_lat DECIMAL(10,8),
    current_location_lon DECIMAL(11,8),
    total_distance_km DECIMAL(10,2),
    total_duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36) NOT NULL,
    
    CONSTRAINT valid_time_range CHECK (
        end_time_planned > start_time_planned
    )
);

CREATE INDEX idx_tours_status ON tours(status);
CREATE INDEX idx_tours_vehicle ON tours(vehicle_id);
CREATE INDEX idx_tours_driver ON tours(driver_id);
CREATE INDEX idx_tours_time ON tours(start_time_planned, end_time_planned);

-- ============================================
-- STOPS
-- ============================================

CREATE TABLE stops (
    stop_id VARCHAR(36) PRIMARY KEY,
    tour_id VARCHAR(36) NOT NULL REFERENCES tours(tour_id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    
    -- Location
    lat DECIMAL(10,8) NOT NULL,
    lon DECIMAL(11,8) NOT NULL,
    address VARCHAR(255),
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(2) DEFAULT 'DE',
    
    -- Timing
    time_window_from TIMESTAMP WITH TIME ZONE,
    time_window_to TIMESTAMP WITH TIME ZONE,
    planned_arrival TIMESTAMP WITH TIME ZONE NOT NULL,
    planned_departure TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_arrival TIMESTAMP WITH TIME ZONE,
    actual_departure TIMESTAMP WITH TIME ZONE,
    
    -- Service
    type VARCHAR(20) NOT NULL CHECK (type IN ('PICKUP', 'DELIVERY', 'BREAK', 'DEPOT')),
    service_time_minutes INTEGER DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')),
    
    -- Metadata
    notes TEXT,
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_tour_sequence UNIQUE (tour_id, sequence),
    CONSTRAINT valid_time_window CHECK (
        time_window_to IS NULL OR time_window_from IS NULL OR
        time_window_to > time_window_from
    )
);

CREATE INDEX idx_stops_tour ON stops(tour_id);
CREATE INDEX idx_stops_status ON stops(status);

-- Stop-Order junction table
CREATE TABLE stop_orders (
    stop_id VARCHAR(36) REFERENCES stops(stop_id) ON DELETE CASCADE,
    order_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (stop_id, order_id)
);

-- ============================================
-- LOAD SNAPSHOTS
-- ============================================

CREATE TABLE load_snapshots (
    load_snapshot_id VARCHAR(36) PRIMARY KEY,
    tour_id VARCHAR(36) NOT NULL REFERENCES tours(tour_id),
    stop_id VARCHAR(36) REFERENCES stops(stop_id),
    segment_id VARCHAR(50),
    
    -- Source
    source VARCHAR(20) NOT NULL CHECK (source IN ('MANUAL', 'VISION', 'TELEMATICS')),
    
    -- Measurements
    volume_used_m3 DECIMAL(10,2),
    weight_used_kg DECIMAL(10,2),
    pallets_used INTEGER,
    
    -- Vision-specific
    confidence DECIMAL(4,3) CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Manual override
    manual_override BOOLEAN DEFAULT false,
    overridden_snapshot_id VARCHAR(36) REFERENCES load_snapshots(load_snapshot_id),
    
    -- Validation
    is_valid BOOLEAN DEFAULT true,
    validation_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36) NOT NULL
);

CREATE INDEX idx_snapshots_tour ON load_snapshots(tour_id);
CREATE INDEX idx_snapshots_created ON load_snapshots(created_at DESC);

-- Image references
CREATE TABLE snapshot_images (
    image_id VARCHAR(36) PRIMARY KEY,
    load_snapshot_id VARCHAR(36) NOT NULL REFERENCES load_snapshots(load_snapshot_id) ON DELETE CASCADE,
    storage_path VARCHAR(500) NOT NULL,
    content_type VARCHAR(100),
    size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CAPACITY STATES
-- ============================================

CREATE TABLE capacity_states (
    capacity_state_id VARCHAR(36) PRIMARY KEY,
    tour_id VARCHAR(36) NOT NULL REFERENCES tours(tour_id),
    segment_id VARCHAR(50) NOT NULL,
    
    -- Segment definition
    from_stop_id VARCHAR(36) NOT NULL REFERENCES stops(stop_id),
    to_stop_id VARCHAR(36) NOT NULL REFERENCES stops(stop_id),
    
    -- Capacity
    volume_free_m3 DECIMAL(10,2) NOT NULL,
    weight_free_kg DECIMAL(10,2) NOT NULL,
    pallets_free INTEGER NOT NULL,
    
    -- Utilization
    volume_utilization_pct DECIMAL(5,2) CHECK (volume_utilization_pct >= 0 AND volume_utilization_pct <= 100),
    weight_utilization_pct DECIMAL(5,2) CHECK (weight_utilization_pct >= 0 AND weight_utilization_pct <= 100),
    pallets_utilization_pct DECIMAL(5,2) CHECK (pallets_utilization_pct >= 0 AND pallets_utilization_pct <= 100),
    
    -- Validity
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE,
    
    -- Source
    based_on_snapshot_id VARCHAR(36) NOT NULL REFERENCES load_snapshots(load_snapshot_id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_valid_state_per_segment UNIQUE (tour_id, segment_id, valid_to)
);

CREATE INDEX idx_capacity_tour ON capacity_states(tour_id);
CREATE INDEX idx_capacity_segment ON capacity_states(segment_id);
CREATE INDEX idx_capacity_valid ON capacity_states(tour_id, valid_to) WHERE valid_to IS NULL;

-- ============================================
-- ORDER CANDIDATES
-- ============================================

CREATE TABLE order_candidates (
    order_id VARCHAR(36) PRIMARY KEY,
    external_order_id VARCHAR(100),
    
    -- Pickup
    pickup_lat DECIMAL(10,8) NOT NULL,
    pickup_lon DECIMAL(11,8) NOT NULL,
    pickup_address VARCHAR(255),
    pickup_city VARCHAR(100),
    pickup_time_window_from TIMESTAMP WITH TIME ZONE NOT NULL,
    pickup_time_window_to TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Delivery
    delivery_lat DECIMAL(10,8) NOT NULL,
    delivery_lon DECIMAL(11,8) NOT NULL,
    delivery_address VARCHAR(255),
    delivery_city VARCHAR(100),
    delivery_time_window_from TIMESTAMP WITH TIME ZONE NOT NULL,
    delivery_time_window_to TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Cargo
    volume_m3 DECIMAL(10,2) NOT NULL,
    weight_kg DECIMAL(10,2) NOT NULL,
    pallets INTEGER NOT NULL,
    cargo_description TEXT,
    special_requirements TEXT[],
    
    -- Commercial
    price DECIMAL(10,2) NOT NULL,
    cost_estimate DECIMAL(10,2),
    
    -- Priority
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL'
        CHECK (priority IN ('NORMAL', 'HIGH', 'CONTRACTUAL')),
    priority_reason TEXT,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'RESERVED', 'ASSIGNED', 'CANCELLED')),
    reserved_for_tour_id VARCHAR(36) REFERENCES tours(tour_id),
    reserved_until TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    max_detour_km DECIMAL(10,2),
    max_delay_minutes INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source VARCHAR(50)
);

CREATE INDEX idx_orders_status ON order_candidates(status);
CREATE INDEX idx_orders_pickup_location ON order_candidates(pickup_lat, pickup_lon);
CREATE INDEX idx_orders_delivery_location ON order_candidates(delivery_lat, delivery_lon);
CREATE INDEX idx_orders_pickup_time ON order_candidates(pickup_time_window_from, pickup_time_window_to);
CREATE INDEX idx_orders_delivery_time ON order_candidates(delivery_time_window_from, delivery_time_window_to);

-- ============================================
-- SUGGESTIONS
-- ============================================

CREATE TABLE suggestions (
    suggestion_id VARCHAR(36) PRIMARY KEY,
    tour_id VARCHAR(36) NOT NULL REFERENCES tours(tour_id),
    order_id VARCHAR(36) NOT NULL REFERENCES order_candidates(order_id),
    segment_id VARCHAR(50) NOT NULL,
    
    -- Insertion point
    pickup_after_stop_sequence INTEGER NOT NULL,
    delivery_after_stop_sequence INTEGER NOT NULL,
    
    -- Economics
    extra_revenue DECIMAL(10,2) NOT NULL,
    extra_cost DECIMAL(10,2) NOT NULL,
    margin DECIMAL(10,2) NOT NULL,
    margin_percent DECIMAL(5,2),
    
    -- Route impact
    detour_km DECIMAL(10,2) NOT NULL,
    detour_minutes INTEGER NOT NULL,
    
    -- Scores
    capacity_score DECIMAL(4,3),
    revenue_score DECIMAL(4,3),
    priority_score DECIMAL(4,3),
    detour_score DECIMAL(4,3),
    time_fit_score DECIMAL(4,3),
    direction_score DECIMAL(4,3),
    total_score DECIMAL(4,3) NOT NULL,
    
    -- Status
    status VARCHAR(30) NOT NULL DEFAULT 'NEW'
        CHECK (status IN ('NEW', 'ACCEPTED_DRIVER', 'ACCEPTED_DISPATCHER', 'REJECTED', 'EXPIRED', 'CANCELLED')),
    
    -- Decision
    decided_by VARCHAR(20) CHECK (decided_by IN ('DRIVER', 'DISPATCHER', 'SYSTEM')),
    decided_at TIMESTAMP WITH TIME ZONE,
    decision_user_id VARCHAR(36),
    rejection_reason TEXT,
    
    -- Validity
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_suggestions_tour ON suggestions(tour_id);
CREATE INDEX idx_suggestions_order ON suggestions(order_id);
CREATE INDEX idx_suggestions_status ON suggestions(status);
CREATE INDEX idx_suggestions_score ON suggestions(total_score DESC);
CREATE INDEX idx_suggestions_valid ON suggestions(valid_until) WHERE status = 'NEW';

-- ============================================
-- EVENT STORE (for event sourcing)
-- ============================================

CREATE TABLE event_store (
    event_id VARCHAR(36) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_version VARCHAR(10) NOT NULL DEFAULT '1.0',
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(36) NOT NULL,
    event_data JSONB NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    correlation_id VARCHAR(36),
    causation_id VARCHAR(36)
);

CREATE INDEX idx_events_aggregate ON event_store(aggregate_type, aggregate_id);
CREATE INDEX idx_events_type ON event_store(event_type);
CREATE INDEX idx_events_timestamp ON event_store(timestamp DESC);
CREATE INDEX idx_events_correlation ON event_store(correlation_id);
```

---

## 5. Implementierungs-Notes

### 5.1 Repository-Pattern

```typescript
// TypeScript Repository Interfaces

interface TourRepository {
  findById(tourId: string): Promise<Tour | null>;
  findActive(): Promise<Tour[]>;
  save(tour: Tour): Promise<void>;
  updateRoute(tourId: string, stops: Stop[]): Promise<void>;
}

interface CapacityStateRepository {
  findCurrentForTour(tourId: string): Promise<CapacityState[]>;
  findCurrentForSegment(tourId: string, segmentId: string): Promise<CapacityState | null>;
  save(state: CapacityState): Promise<void>;
  invalidatePrevious(tourId: string, segmentId: string): Promise<void>;
}

interface SuggestionRepository {
  findById(suggestionId: string): Promise<Suggestion | null>;
  findForTour(tourId: string, status?: SuggestionStatus): Promise<Suggestion[]>;
  findNew(): Promise<Suggestion[]>;
  save(suggestion: Suggestion): Promise<void>;
  updateStatus(suggestionId: string, status: SuggestionStatus, metadata: DecisionMetadata): Promise<void>;
}

interface OrderCandidateRepository {
  findById(orderId: string): Promise<OrderCandidate | null>;
  findOpen(): Promise<OrderCandidate[]>;
  findMatching(criteria: MatchingCriteria): Promise<OrderCandidate[]>;
  save(order: OrderCandidate): Promise<void>;
  updateStatus(orderId: string, status: OrderStatus): Promise<void>;
}
```

### 5.2 Event Publisher

```typescript
interface EventPublisher {
  publish<T>(eventType: string, data: T, metadata?: EventMetadata): Promise<void>;
  publishBatch(events: DomainEvent[]): Promise<void>;
}

interface DomainEvent {
  eventId: string;
  eventType: string;
  eventVersion: string;
  aggregateType: string;
  aggregateId: string;
  timestamp: Date;
  correlationId?: string;
  causationId?: string;
  data: unknown;
  metadata?: Record<string, unknown>;
}

// Kafka-based implementation
class KafkaEventPublisher implements EventPublisher {
  constructor(private producer: KafkaProducer) {}
  
  async publish<T>(
    eventType: string, 
    data: T, 
    metadata?: EventMetadata
  ): Promise<void> {
    const event: DomainEvent = {
      eventId: generateUUID(),
      eventType,
      eventVersion: '1.0',
      aggregateType: metadata?.aggregateType || 'Unknown',
      aggregateId: metadata?.aggregateId || '',
      timestamp: new Date(),
      correlationId: metadata?.correlationId,
      causationId: metadata?.causationId,
      data,
      metadata: metadata?.additional
    };
    
    await this.producer.send({
      topic: this.getTopicForEventType(eventType),
      messages: [{
        key: event.aggregateId,
        value: JSON.stringify(event),
        headers: {
          'event-type': eventType,
          'event-version': event.eventVersion
        }
      }]
    });
  }
  
  private getTopicForEventType(eventType: string): string {
    // Map event types to topics
    const topicMap = {
      'load.snapshot.created': 'capacity-events',
      'capacity.state.updated': 'capacity-events',
      'suggestion.generated': 'suggestion-events',
      'suggestion.decision.made': 'suggestion-events',
      'tour.route.updated': 'tour-events'
    };
    return topicMap[eventType] || 'domain-events';
  }
}
```

### 5.3 Service-Layer

```typescript
// Service Layer Architecture

class CapacityService {
  constructor(
    private tourRepo: TourRepository,
    private snapshotRepo: LoadSnapshotRepository,
    private capacityRepo: CapacityStateRepository,
    private eventPublisher: EventPublisher
  ) {}
  
  async createSnapshot(
    tourId: string,
    data: CreateSnapshotInput
  ): Promise<LoadSnapshot> {
    // 1. Validate tour exists and is active
    const tour = await this.tourRepo.findById(tourId);
    if (!tour || tour.status !== 'IN_PROGRESS') {
      throw new InvalidStateError('Tour not active');
    }
    
    // 2. Create snapshot entity
    const snapshot = LoadSnapshot.create({
      tourId,
      stopId: data.stopId,
      source: data.source,
      volumeUsedM3: data.volumeUsedM3,
      weightUsedKg: data.weightUsedKg,
      palletsUsed: data.palletsUsed,
      confidence: data.confidence,
      createdBy: data.userId
    });
    
    // 3. Save snapshot
    await this.snapshotRepo.save(snapshot);
    
    // 4. Calculate new capacity states
    const capacityStates = await this.calculateCapacityStates(tour, snapshot);
    
    // 5. Invalidate old states and save new
    for (const state of capacityStates) {
      await this.capacityRepo.invalidatePrevious(tourId, state.segmentId);
      await this.capacityRepo.save(state);
    }
    
    // 6. Publish events
    await this.eventPublisher.publish('load.snapshot.created', snapshot, {
      aggregateType: 'Tour',
      aggregateId: tourId,
      correlationId: data.correlationId
    });
    
    for (const state of capacityStates) {
      await this.eventPublisher.publish('capacity.state.updated', state, {
        aggregateType: 'Tour',
        aggregateId: tourId
      });
    }
    
    return snapshot;
  }
  
  private async calculateCapacityStates(
    tour: Tour,
    snapshot: LoadSnapshot
  ): Promise<CapacityState[]> {
    // Implementation based on segment calculation
    // ...
  }
}

class MatchingService {
  constructor(
    private matchingEngine: MatchingEngine,
    private suggestionRepo: SuggestionRepository,
    private eventPublisher: EventPublisher
  ) {}
  
  async findMatchesForTour(tourId: string): Promise<Suggestion[]> {
    // 1. Run matching engine
    const suggestions = await this.matchingEngine.recomputeMatches(tourId);
    
    // 2. Store suggestions
    for (const suggestion of suggestions) {
      await this.suggestionRepo.save(suggestion);
      
      await this.eventPublisher.publish('suggestion.generated', suggestion, {
        aggregateType: 'Suggestion',
        aggregateId: suggestion.suggestionId
      });
    }
    
    return suggestions;
  }
}

class SuggestionService {
  constructor(
    private decisionHandler: SuggestionDecisionHandler
  ) {}
  
  async decide(
    suggestionId: string,
    decision: 'ACCEPT' | 'REJECT',
    decidedBy: 'DRIVER' | 'DISPATCHER',
    userId: string
  ): Promise<Suggestion> {
    return this.decisionHandler.decide(
      suggestionId,
      decision,
      decidedBy,
      userId
    );
  }
}
```

---

*Dokument-Version: 1.0 | Erstellt: 2024-01 | Nächste Überprüfung: 2025-01*
