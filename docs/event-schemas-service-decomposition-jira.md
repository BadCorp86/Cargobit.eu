# Event-Schemas, Service-Zerlegung & Jira-Epics

> **CargoBit Transport Platform** — Production-Ready Implementation Guide
>
> *Direkt nutzbar für Kafka/NATS, Microservices und Jira-Backlog*

---

## Übersicht

Dieses Dokument definiert:

| Abschnitt | Inhalt |
|-----------|--------|
| **1. Event-Schemas** | 5 Kafka/NATS Event-Typen mit vollständigen Schemas |
| **2. Service-Zerlegung** | 4 Microservices mit Verantwortlichkeiten und APIs |
| **3. Jira-Epics & Stories** | 5 Epics mit 19 Stories für direkte Übernahme |

---

## 1. Event-Schemas für Kafka/NATS

### 1.1 Event-Architektur

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    EVENT-DRIVEN ARCHITECTURE                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Topics / Streams:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                         ││
│  │  capacity-events                                                       ││
│  │  ├── load.snapshot.created                                             ││
│  │  ├── load.snapshot.enriched (optional)                                 ││
│  │  └── capacity.state.updated                                            ││
│  │                                                                         ││
│  │  suggestion-events                                                     ││
│  │  ├── suggestion.generated                                              ││
│  │  └── suggestion.decision.made                                          ││
│  │                                                                         ││
│  │  tour-events                                                           ││
│  │  └── tour.route.updated                                                ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Event Flow:                                                                 │
│                                                                              │
│  Driver App ──► Vision Service ──► Capacity Service ──► Suggestion Service │
│       │              │                    │                      │          │
│       │              │                    │                      │          │
│       ▼              ▼                    ▼                      ▼          │
│  load.snapshot  load.snapshot    capacity.state       suggestion.generated │
│  .created       .enriched        .updated                               │
│                                                                              │
│  Dispatcher ──► Decision Service ──► Tour Service                         │
│       │               │                    │                                │
│       ▼               ▼                    ▼                                │
│  suggestion      suggestion         tour.route.updated                     │
│  .decision.made  .decision.made                                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.2 Event-Schema: load.snapshot.created

**Topic:** `capacity-events`  
**Partition Key:** `tourId`  
**Retention:** 7 Tage

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://cargobit.io/schemas/load.snapshot.created.json",
  "title": "LoadSnapshotCreated",
  "description": "Emitted when a new load snapshot is created (manual, vision, or telematics)",
  "type": "object",
  "required": [
    "eventId",
    "eventType",
    "occurredAt",
    "tourId",
    "vehicleId",
    "source",
    "volumeUsedM3",
    "weightUsedKg",
    "palletsUsed"
  ],
  "properties": {
    "eventId": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event identifier",
      "example": "550e8400-e29b-41d4-a716-446655440000"
    },
    "eventType": {
      "type": "string",
      "const": "load.snapshot.created",
      "description": "Event type identifier"
    },
    "eventVersion": {
      "type": "string",
      "default": "1.0",
      "description": "Schema version"
    },
    "occurredAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 timestamp when event occurred",
      "example": "2026-04-18T19:21:00Z"
    },
    "correlationId": {
      "type": "string",
      "format": "uuid",
      "description": "Correlation ID for tracing"
    },
    "causationId": {
      "type": "string",
      "format": "uuid",
      "description": "ID of event that caused this event"
    },
    "tourId": {
      "type": "string",
      "description": "Tour identifier",
      "example": "T123"
    },
    "stopId": {
      "type": "string",
      "nullable": true,
      "description": "Stop identifier where snapshot was taken (null if between stops)",
      "example": "S456"
    },
    "segmentId": {
      "type": "string",
      "nullable": true,
      "description": "Segment identifier",
      "example": "SEG_2"
    },
    "vehicleId": {
      "type": "string",
      "description": "Vehicle identifier",
      "example": "V789"
    },
    "driverId": {
      "type": "string",
      "description": "Driver identifier",
      "example": "DRV_42"
    },
    "source": {
      "type": "string",
      "enum": ["MANUAL", "VISION", "TELEMATICS"],
      "description": "Source of the snapshot data"
    },
    "volumeUsedM3": {
      "type": "number",
      "minimum": 0,
      "description": "Used volume in cubic meters",
      "example": 18.5
    },
    "weightUsedKg": {
      "type": "number",
      "minimum": 0,
      "description": "Used weight in kilograms",
      "example": 7200
    },
    "palletsUsed": {
      "type": "integer",
      "minimum": 0,
      "description": "Number of pallets used",
      "example": 12
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "nullable": true,
      "description": "Confidence score for VISION source (0-1)",
      "example": 0.87
    },
    "imageRefIds": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "References to stored images in object storage",
      "example": ["IMG_abc123", "IMG_def456"]
    },
    "manualOverride": {
      "type": "boolean",
      "default": false,
      "description": "True if manually overridden by driver/dispatcher"
    },
    "previousSnapshotId": {
      "type": "string",
      "nullable": true,
      "description": "ID of previous snapshot if this is an override"
    },
    "metadata": {
      "type": "object",
      "description": "Additional metadata",
      "properties": {
        "appVersion": {
          "type": "string",
          "example": "2.1.0"
        },
        "deviceModel": {
          "type": "string",
          "example": "iPhone 14 Pro"
        },
        "gpsAccuracy": {
          "type": "number",
          "description": "GPS accuracy in meters"
        }
      }
    }
  },
  "additionalProperties": false
}
```

**Beispiel-Payload:**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "load.snapshot.created",
  "eventVersion": "1.0",
  "occurredAt": "2026-04-18T19:21:00Z",
  "correlationId": "corr_12345",
  "tourId": "T123",
  "stopId": "S456",
  "segmentId": "SEG_2",
  "vehicleId": "V789",
  "driverId": "DRV_42",
  "source": "VISION",
  "volumeUsedM3": 18.5,
  "weightUsedKg": 7200,
  "palletsUsed": 12,
  "confidence": 0.87,
  "imageRefIds": ["IMG_abc123"],
  "manualOverride": false,
  "metadata": {
    "appVersion": "2.1.0",
    "deviceModel": "iPhone 14 Pro",
    "gpsAccuracy": 5.2
  }
}
```

---

### 1.3 Event-Schema: capacity.state.updated

**Topic:** `capacity-events`  
**Partition Key:** `tourId`  
**Retention:** 7 Tage

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://cargobit.io/schemas/capacity.state.updated.json",
  "title": "CapacityStateUpdated",
  "description": "Emitted when capacity state for a segment is recalculated",
  "type": "object",
  "required": [
    "eventId",
    "eventType",
    "occurredAt",
    "tourId",
    "segmentId",
    "vehicleId",
    "volumeFreeM3",
    "weightFreeKg",
    "palletsFree",
    "validFrom"
  ],
  "properties": {
    "eventId": {
      "type": "string",
      "format": "uuid"
    },
    "eventType": {
      "type": "string",
      "const": "capacity.state.updated"
    },
    "eventVersion": {
      "type": "string",
      "default": "1.0"
    },
    "occurredAt": {
      "type": "string",
      "format": "date-time",
      "example": "2026-04-18T19:22:00Z"
    },
    "correlationId": {
      "type": "string",
      "format": "uuid"
    },
    "tourId": {
      "type": "string",
      "example": "T123"
    },
    "segmentId": {
      "type": "string",
      "description": "Segment identifier (Stop A → Stop B)",
      "example": "SEG_3"
    },
    "vehicleId": {
      "type": "string",
      "example": "V789"
    },
    "fromStopSequence": {
      "type": "integer",
      "description": "Sequence number of the from stop",
      "example": 2
    },
    "toStopSequence": {
      "type": "integer",
      "description": "Sequence number of the to stop",
      "example": 3
    },
    "volumeFreeM3": {
      "type": "number",
      "minimum": 0,
      "description": "Free volume in cubic meters",
      "example": 6.2
    },
    "weightFreeKg": {
      "type": "number",
      "minimum": 0,
      "description": "Free weight in kilograms",
      "example": 2800
    },
    "palletsFree": {
      "type": "integer",
      "minimum": 0,
      "description": "Free pallet positions",
      "example": 4
    },
    "volumeUtilizationPct": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Volume utilization percentage",
      "example": 75.2
    },
    "weightUtilizationPct": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Weight utilization percentage",
      "example": 62.7
    },
    "palletsUtilizationPct": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Pallet utilization percentage",
      "example": 60.0
    },
    "validFrom": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp when this state becomes valid",
      "example": "2026-04-18T19:22:00Z"
    },
    "validTo": {
      "type": "string",
      "format": "date-time",
      "nullable": true,
      "description": "Timestamp when this state expires (null = current)",
      "example": "2026-04-18T21:00:00Z"
    },
    "previousStateId": {
      "type": "string",
      "nullable": true,
      "description": "ID of the previous state that this replaces"
    },
    "basedOnSnapshotId": {
      "type": "string",
      "description": "ID of the snapshot this state is based on",
      "example": "LS_789"
    },
    "uncertaintyFlag": {
      "type": "boolean",
      "default": false,
      "description": "True if there's high uncertainty in the measurement"
    },
    "uncertaintyReason": {
      "type": "string",
      "nullable": true,
      "description": "Reason for uncertainty flag",
      "example": "VISION_CONFIDENCE_LOW"
    }
  },
  "additionalProperties": false
}
```

**Beispiel-Payload:**
```json
{
  "eventId": "660e8400-e29b-41d4-a716-446655440001",
  "eventType": "capacity.state.updated",
  "eventVersion": "1.0",
  "occurredAt": "2026-04-18T19:22:00Z",
  "correlationId": "corr_12345",
  "tourId": "T123",
  "segmentId": "SEG_3",
  "vehicleId": "V789",
  "fromStopSequence": 2,
  "toStopSequence": 3,
  "volumeFreeM3": 6.2,
  "weightFreeKg": 2800,
  "palletsFree": 4,
  "volumeUtilizationPct": 75.2,
  "weightUtilizationPct": 62.7,
  "palletsUtilizationPct": 60.0,
  "validFrom": "2026-04-18T19:22:00Z",
  "validTo": null,
  "previousStateId": "cs_prev_123",
  "basedOnSnapshotId": "LS_789",
  "uncertaintyFlag": false
}
```

---

### 1.4 Event-Schema: suggestion.generated

**Topic:** `suggestion-events`  
**Partition Key:** `tourId`  
**Retention:** 7 Tage

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://cargobit.io/schemas/suggestion.generated.json",
  "title": "SuggestionGenerated",
  "description": "Emitted when a new order matching suggestion is generated",
  "type": "object",
  "required": [
    "eventId",
    "eventType",
    "occurredAt",
    "suggestionId",
    "tourId",
    "orderId",
    "extraRevenue",
    "margin",
    "score"
  ],
  "properties": {
    "eventId": {
      "type": "string",
      "format": "uuid"
    },
    "eventType": {
      "type": "string",
      "const": "suggestion.generated"
    },
    "eventVersion": {
      "type": "string",
      "default": "1.0"
    },
    "occurredAt": {
      "type": "string",
      "format": "date-time",
      "example": "2026-04-18T19:23:00Z"
    },
    "correlationId": {
      "type": "string",
      "format": "uuid"
    },
    "suggestionId": {
      "type": "string",
      "description": "Unique suggestion identifier",
      "example": "SUG_001"
    },
    "tourId": {
      "type": "string",
      "example": "T123"
    },
    "segmentId": {
      "type": "string",
      "description": "Segment where order would be picked up",
      "example": "SEG_3"
    },
    "vehicleId": {
      "type": "string",
      "example": "V789"
    },
    "driverId": {
      "type": "string",
      "example": "DRV_42"
    },
    "orderId": {
      "type": "string",
      "description": "Matched order identifier",
      "example": "ORD_999"
    },
    "orderSummary": {
      "type": "object",
      "description": "Summary of the matched order",
      "properties": {
        "pickupCity": {
          "type": "string",
          "example": "Augsburg"
        },
        "deliveryCity": {
          "type": "string",
          "example": "Ulm"
        },
        "volumeM3": {
          "type": "number",
          "example": 2.5
        },
        "pallets": {
          "type": "integer",
          "example": 3
        },
        "weightKg": {
          "type": "number",
          "example": 680
        }
      }
    },
    "insertionDetails": {
      "type": "object",
      "description": "Details about where order fits in route",
      "properties": {
        "pickupAfterStopSequence": {
          "type": "integer",
          "example": 2
        },
        "deliveryAfterStopSequence": {
          "type": "integer",
          "example": 3
        },
        "estimatedPickupTime": {
          "type": "string",
          "format": "date-time"
        },
        "estimatedDeliveryTime": {
          "type": "string",
          "format": "date-time"
        }
      }
    },
    "extraRevenue": {
      "type": "number",
      "minimum": 0,
      "description": "Additional revenue in specified currency",
      "example": 180.0
    },
    "extraCost": {
      "type": "number",
      "minimum": 0,
      "description": "Estimated additional costs",
      "example": 40.0
    },
    "margin": {
      "type": "number",
      "description": "Contribution margin (revenue - cost)",
      "example": 140.0
    },
    "marginPercent": {
      "type": "number",
      "description": "Margin as percentage of revenue",
      "example": 77.8
    },
    "currency": {
      "type": "string",
      "default": "EUR",
      "example": "EUR"
    },
    "detourKm": {
      "type": "number",
      "minimum": 0,
      "description": "Additional distance in kilometers",
      "example": 12.3
    },
    "detourMinutes": {
      "type": "integer",
      "minimum": 0,
      "description": "Additional time in minutes",
      "example": 11
    },
    "scores": {
      "type": "object",
      "description": "Individual score components",
      "properties": {
        "revenue": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "example": 0.85
        },
        "capacity": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "example": 0.90
        },
        "priority": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "example": 0.50
        },
        "detour": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "example": 0.75
        },
        "timeFit": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "example": 0.95
        },
        "direction": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "example": 0.80
        }
      }
    },
    "score": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Composite weighted score",
      "example": 0.82
    },
    "rank": {
      "type": "integer",
      "minimum": 1,
      "description": "Rank among suggestions for this tour",
      "example": 1
    },
    "validUntil": {
      "type": "string",
      "format": "date-time",
      "description": "Expiration timestamp for this suggestion",
      "example": "2026-04-18T21:00:00Z"
    },
    "matchingRunId": {
      "type": "string",
      "description": "ID of the matching run that generated this suggestion",
      "example": "MR_20260418_001"
    }
  },
  "additionalProperties": false
}
```

**Beispiel-Payload:**
```json
{
  "eventId": "770e8400-e29b-41d4-a716-446655440002",
  "eventType": "suggestion.generated",
  "eventVersion": "1.0",
  "occurredAt": "2026-04-18T19:23:00Z",
  "correlationId": "corr_match_001",
  "suggestionId": "SUG_001",
  "tourId": "T123",
  "segmentId": "SEG_3",
  "vehicleId": "V789",
  "driverId": "DRV_42",
  "orderId": "ORD_999",
  "orderSummary": {
    "pickupCity": "Augsburg",
    "deliveryCity": "Ulm",
    "volumeM3": 2.5,
    "pallets": 3,
    "weightKg": 680
  },
  "insertionDetails": {
    "pickupAfterStopSequence": 2,
    "deliveryAfterStopSequence": 3,
    "estimatedPickupTime": "2026-04-18T20:30:00Z",
    "estimatedDeliveryTime": "2026-04-18T21:15:00Z"
  },
  "extraRevenue": 180.0,
  "extraCost": 40.0,
  "margin": 140.0,
  "marginPercent": 77.8,
  "currency": "EUR",
  "detourKm": 12.3,
  "detourMinutes": 11,
  "scores": {
    "revenue": 0.85,
    "capacity": 0.90,
    "priority": 0.50,
    "detour": 0.75,
    "timeFit": 0.95,
    "direction": 0.80
  },
  "score": 0.82,
  "rank": 1,
  "validUntil": "2026-04-18T21:00:00Z",
  "matchingRunId": "MR_20260418_001"
}
```

---

### 1.5 Event-Schema: suggestion.decision.made

**Topic:** `suggestion-events`  
**Partition Key:** `tourId`  
**Retention:** 30 Tage (für Audit)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://cargobit.io/schemas/suggestion.decision.made.json",
  "title": "SuggestionDecisionMade",
  "description": "Emitted when a decision is made on a suggestion (accept or reject)",
  "type": "object",
  "required": [
    "eventId",
    "eventType",
    "occurredAt",
    "suggestionId",
    "tourId",
    "orderId",
    "decision",
    "decidedBy"
  ],
  "properties": {
    "eventId": {
      "type": "string",
      "format": "uuid"
    },
    "eventType": {
      "type": "string",
      "const": "suggestion.decision.made"
    },
    "eventVersion": {
      "type": "string",
      "default": "1.0"
    },
    "occurredAt": {
      "type": "string",
      "format": "date-time",
      "example": "2026-04-18T19:24:30Z"
    },
    "correlationId": {
      "type": "string",
      "format": "uuid"
    },
    "suggestionId": {
      "type": "string",
      "example": "SUG_001"
    },
    "tourId": {
      "type": "string",
      "example": "T123"
    },
    "vehicleId": {
      "type": "string",
      "example": "V789"
    },
    "driverId": {
      "type": "string",
      "example": "DRV_42"
    },
    "orderId": {
      "type": "string",
      "example": "ORD_999"
    },
    "decision": {
      "type": "string",
      "enum": ["ACCEPT", "REJECT"],
      "description": "The decision made"
    },
    "decidedBy": {
      "type": "string",
      "enum": ["DRIVER", "DISPATCHER", "SYSTEM"],
      "description": "Who or what made the decision"
    },
    "decidedById": {
      "type": "string",
      "description": "User ID of the decision maker (if human)",
      "example": "DRV_42"
    },
    "decisionSource": {
      "type": "string",
      "description": "Client that submitted the decision",
      "example": "DRIVER_APP_IOS"
    },
    "reason": {
      "type": "string",
      "nullable": true,
      "description": "Reason for the decision",
      "example": "OK_CAPACITY"
    },
    "rejectionReason": {
      "type": "string",
      "nullable": true,
      "description": "Detailed reason for rejection (if rejected)",
      "enum": [
        "CAPACITY_ISSUE",
        "TIME_CONSTRAINT",
        "DRIVER_REFUSED",
        "CUSTOMER_CANCELLED",
        "ROUTE_CONFLICT",
        "OTHER"
      ]
    },
    "rejectionDetails": {
      "type": "string",
      "nullable": true,
      "description": "Free-text details for rejection",
      "example": "Customer requested earlier delivery"
    },
    "previousStatus": {
      "type": "string",
      "description": "Previous suggestion status",
      "example": "NEW"
    },
    "newStatus": {
      "type": "string",
      "description": "New suggestion status",
      "enum": ["ACCEPTED_DRIVER", "ACCEPTED_DISPATCHER", "REJECTED"],
      "example": "ACCEPTED_DRIVER"
    },
    "matchedAt": {
      "type": "string",
      "format": "date-time",
      "description": "When the suggestion was originally generated"
    },
    "decisionLatencyMs": {
      "type": "integer",
      "description": "Time between suggestion generation and decision (ms)",
      "example": 90000
    }
  },
  "additionalProperties": false
}
```

**Beispiel-Payload:**
```json
{
  "eventId": "880e8400-e29b-41d4-a716-446655440003",
  "eventType": "suggestion.decision.made",
  "eventVersion": "1.0",
  "occurredAt": "2026-04-18T19:24:30Z",
  "correlationId": "corr_decision_001",
  "suggestionId": "SUG_001",
  "tourId": "T123",
  "vehicleId": "V789",
  "driverId": "DRV_42",
  "orderId": "ORD_999",
  "decision": "ACCEPT",
  "decidedBy": "DRIVER",
  "decidedById": "DRV_42",
  "decisionSource": "DRIVER_APP_IOS",
  "reason": "OK_CAPACITY",
  "previousStatus": "NEW",
  "newStatus": "ACCEPTED_DRIVER",
  "matchedAt": "2026-04-18T19:23:00Z",
  "decisionLatencyMs": 90000
}
```

---

### 1.6 Event-Schema: tour.route.updated

**Topic:** `tour-events`  
**Partition Key:** `tourId`  
**Retention:** 30 Tage (für Audit)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://cargobit.io/schemas/tour.route.updated.json",
  "title": "TourRouteUpdated",
  "description": "Emitted when a tour's route is modified (new stops added, sequence changed)",
  "type": "object",
  "required": [
    "eventId",
    "eventType",
    "occurredAt",
    "tourId",
    "vehicleId",
    "reason",
    "previousRouteVersion",
    "newRouteVersion"
  ],
  "properties": {
    "eventId": {
      "type": "string",
      "format": "uuid"
    },
    "eventType": {
      "type": "string",
      "const": "tour.route.updated"
    },
    "eventVersion": {
      "type": "string",
      "default": "1.0"
    },
    "occurredAt": {
      "type": "string",
      "format": "date-time",
      "example": "2026-04-18T19:25:00Z"
    },
    "correlationId": {
      "type": "string",
      "format": "uuid"
    },
    "causationId": {
      "type": "string",
      "format": "uuid",
      "description": "ID of the event that caused this route update",
      "example": "770e8400-e29b-41d4-a716-446655440002"
    },
    "tourId": {
      "type": "string",
      "example": "T123"
    },
    "vehicleId": {
      "type": "string",
      "example": "V789"
    },
    "driverId": {
      "type": "string",
      "example": "DRV_42"
    },
    "reason": {
      "type": "string",
      "enum": [
        "SUGGESTION_ACCEPTED",
        "MANUAL_CHANGE",
        "DELAY_ADJUSTMENT",
        "CANCELLATION",
        "OPTIMIZATION",
        "EMERGENCY"
      ],
      "description": "Reason for the route update",
      "example": "SUGGESTION_ACCEPTED"
    },
    "suggestionId": {
      "type": "string",
      "nullable": true,
      "description": "Reference to suggestion if reason is SUGGESTION_ACCEPTED",
      "example": "SUG_001"
    },
    "previousRouteVersion": {
      "type": "integer",
      "minimum": 1,
      "description": "Previous route version number",
      "example": 3
    },
    "newRouteVersion": {
      "type": "integer",
      "minimum": 1,
      "description": "New route version number",
      "example": 4
    },
    "addedStopIds": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "IDs of newly added stops",
      "example": ["S_NEW_1", "S_NEW_2"]
    },
    "removedStopIds": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "IDs of removed stops",
      "example": []
    },
    "addedOrderIds": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "IDs of orders added to tour",
      "example": ["ORD_999"]
    },
    "removedOrderIds": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "IDs of orders removed from tour",
      "example": []
    },
    "stops": {
      "type": "array",
      "description": "Complete new stop list",
      "items": {
        "type": "object",
        "required": ["stopId", "sequence", "type", "location"],
        "properties": {
          "stopId": {
            "type": "string",
            "example": "S1"
          },
          "sequence": {
            "type": "integer",
            "example": 1
          },
          "type": {
            "type": "string",
            "enum": ["PICKUP", "DELIVERY", "BREAK", "DEPOT"],
            "example": "DEPOT"
          },
          "location": {
            "type": "object",
            "properties": {
              "lat": {
                "type": "number",
                "example": 51.2
              },
              "lon": {
                "type": "number",
                "example": 6.4
              },
              "city": {
                "type": "string",
                "example": "München"
              }
            }
          },
          "plannedArrival": {
            "type": "string",
            "format": "date-time"
          },
          "plannedDeparture": {
            "type": "string",
            "format": "date-time"
          },
          "orderId": {
            "type": "string",
            "nullable": true
          },
          "isNew": {
            "type": "boolean",
            "description": "True if this stop was newly added"
          }
        }
      }
    },
    "routeImpact": {
      "type": "object",
      "description": "Impact of the route change",
      "properties": {
        "additionalDistanceKm": {
          "type": "number",
          "example": 12.3
        },
        "additionalTimeMinutes": {
          "type": "integer",
          "example": 25
        },
        "newTotalDistanceKm": {
          "type": "number",
          "example": 195.5
        },
        "newTotalDurationMinutes": {
          "type": "integer",
          "example": 320
        },
        "newEndTimePlanned": {
          "type": "string",
          "format": "date-time",
          "example": "2026-04-18T22:30:00Z"
        }
      }
    },
    "updatedBy": {
      "type": "string",
      "description": "User ID who initiated the update",
      "example": "DRV_42"
    },
    "updateSource": {
      "type": "string",
      "description": "Source of the update",
      "example": "SUGGESTION_SERVICE"
    }
  },
  "additionalProperties": false
}
```

**Beispiel-Payload:**
```json
{
  "eventId": "990e8400-e29b-41d4-a716-446655440004",
  "eventType": "tour.route.updated",
  "eventVersion": "1.0",
  "occurredAt": "2026-04-18T19:25:00Z",
  "correlationId": "corr_route_001",
  "causationId": "880e8400-e29b-41d4-a716-446655440003",
  "tourId": "T123",
  "vehicleId": "V789",
  "driverId": "DRV_42",
  "reason": "SUGGESTION_ACCEPTED",
  "suggestionId": "SUG_001",
  "previousRouteVersion": 3,
  "newRouteVersion": 4,
  "addedStopIds": ["S_NEW_1", "S_NEW_2"],
  "removedStopIds": [],
  "addedOrderIds": ["ORD_999"],
  "removedOrderIds": [],
  "stops": [
    {
      "stopId": "S1",
      "sequence": 1,
      "type": "DEPOT",
      "location": { "lat": 48.1351, "lon": 11.582, "city": "München" },
      "plannedArrival": "2026-04-18T08:00:00Z",
      "plannedDeparture": "2026-04-18T08:30:00Z",
      "isNew": false
    },
    {
      "stopId": "S2",
      "sequence": 2,
      "type": "DELIVERY",
      "location": { "lat": 48.3668, "lon": 10.8984, "city": "Augsburg" },
      "plannedArrival": "2026-04-18T10:00:00Z",
      "plannedDeparture": "2026-04-18T10:30:00Z",
      "isNew": false
    },
    {
      "stopId": "S_NEW_1",
      "sequence": 3,
      "type": "PICKUP",
      "location": { "lat": 48.37, "lon": 10.9, "city": "Augsburg" },
      "plannedArrival": "2026-04-18T11:00:00Z",
      "plannedDeparture": "2026-04-18T11:15:00Z",
      "orderId": "ORD_999",
      "isNew": true
    },
    {
      "stopId": "S3",
      "sequence": 4,
      "type": "DELIVERY",
      "location": { "lat": 48.4011, "lon": 9.9876, "city": "Ulm" },
      "plannedArrival": "2026-04-18T12:30:00Z",
      "plannedDeparture": "2026-04-18T13:00:00Z",
      "isNew": false
    },
    {
      "stopId": "S_NEW_2",
      "sequence": 5,
      "type": "DELIVERY",
      "location": { "lat": 48.41, "lon": 9.99, "city": "Ulm" },
      "plannedArrival": "2026-04-18T13:30:00Z",
      "plannedDeparture": "2026-04-18T13:45:00Z",
      "orderId": "ORD_999",
      "isNew": true
    }
  ],
  "routeImpact": {
    "additionalDistanceKm": 12.3,
    "additionalTimeMinutes": 25,
    "newTotalDistanceKm": 195.5,
    "newTotalDurationMinutes": 320,
    "newEndTimePlanned": "2026-04-18T22:30:00Z"
  },
  "updatedBy": "DRV_42",
  "updateSource": "SUGGESTION_SERVICE"
}
```

---

### 1.7 Kafka/NATS Konfiguration

```yaml
# Kafka Topic Configuration
capacity-events:
  partitions: 6
  replication-factor: 3
  config:
    cleanup.policy: delete
    retention.ms: 604800000  # 7 days
    compression.type: lz4
    min.insync.replicas: 2

suggestion-events:
  partitions: 6
  replication-factor: 3
  config:
    cleanup.policy: delete
    retention.ms: 604800000  # 7 days
    compression.type: lz4
    min.insync.replicas: 2

tour-events:
  partitions: 6
  replication-factor: 3
  config:
    cleanup.policy: delete
    retention.ms: 2592000000  # 30 days (audit)
    compression.type: lz4
    min.insync.replicas: 2

# Consumer Groups
consumer-groups:
  capacity-service:
    topics: [capacity-events]
    auto.offset.reset: latest
    
  suggestion-service:
    topics: [capacity-events, suggestion-events]
    auto.offset.reset: latest
    
  tour-service:
    topics: [suggestion-events, tour-events]
    auto.offset.reset: latest
    
  notification-service:
    topics: [suggestion-events, tour-events]
    auto.offset.reset: latest
```

---

## 2. Service-Zerlegung

### 2.1 Service-Übersicht

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         MICROSERVICE ARCHITECTURE                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐            │
│  │  VISION-SERVICE │   │CAPACITY-SERVICE │   │SUGGESTION-SVC   │            │
│  │                 │   │                 │   │                 │            │
│  │ Image Analysis  │   │ State Calc      │   │ Matching        │            │
│  │ ML Integration  │   │ Aggregation     │   │ Scoring         │            │
│  │                 │   │                 │   │ Ranking         │            │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘            │
│           │                     │                     │                      │
│           │                     │                     │                      │
│           ▼                     ▼                     ▼                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         KAFKA EVENT BUS                              │    │
│  │   capacity-events  │  suggestion-events  │  tour-events             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│           │                     │                     │                      │
│           │                     │                     │                      │
│           ▼                     ▼                     ▼                      │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐            │
│  │ DECISION-SERVICE│   │  TOUR-SERVICE   │   │NOTIFICATION-SVC │            │
│  │                 │   │                 │   │                 │            │
│  │ Accept/Reject   │   │ Route Updates   │   │ Push (Driver)   │            │
│  │ Consistency     │   │ Stop Management │   │ Tasks (Dispatch)│            │
│  │                 │   │                 │   │                 │            │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘            │
│                                                                              │
│  Shared Infrastructure:                                                      │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐            │
│  │   PostgreSQL    │   │      Redis      │   │  Object Storage │            │
│  │   (State)       │   │   (Cache)       │   │    (Images)     │            │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.2 Vision-Service

**Verantwortung:**
Bildanalyse und Extraktion von Ladungsdaten mittels ML/AI.

```
┌─────────────────────────────────────────────────────────────┐
│                    VISION-SERVICE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Verantwortlichkeiten:                                      │
│  ├── Bildannahme (intern, nicht direkt vom Client)         │
│  ├── Aufruf von Vision-Modellen (intern/extern)            │
│  ├── Extraktion von:                                        │
│  │   ├── Belegter/freier Bereich                           │
│  │   ├── Paletten/Kollis                                   │
│  │   └── Confidence Score                                   │
│  └── Image-Storage-Integration                              │
│                                                             │
│  Input:                                                     │
│  ├── API: POST /internal/vision/analyze                    │
│  │   └── Body: { imageRefId, vehicleId }                   │
│  └── Event: load.snapshot.created (mit imageRef)           │
│                                                             │
│  Output:                                                    │
│  ├── Event: load.snapshot.enriched (optional)              │
│  │   └── Zusätzliche Vision-Daten                          │
│  └── API Response: VisionResult                            │
│      ├── volumeEstimate                                    │
│      ├── palletCount                                       │
│      ├── confidence                                        │
│      └── regions (Bounding Boxes)                          │
│                                                             │
│  Dependencies:                                              │
│  ├── Object Storage (S3/MinIO) für Images                  │
│  ├── ML Model API (Azure Cognitive Services, GCP Vision)   │
│  └── Kafka Producer                                        │
│                                                             │
│  Technology Stack:                                          │
│  ├── Python 3.11+ / FastAPI                                │
│  ├── OpenCV, PIL für Bildverarbeitung                      │
│  ├── TensorFlow/PyTorch (optional, eigenes Model)          │
│  └── External Vision APIs                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**API-Spezifikation:**
```yaml
# Internal API (nicht öffentlich)
POST /internal/vision/analyze:
  description: Analyze cargo space image
  requestBody:
    content:
      application/json:
        schema:
          type: object
          required: [imageRefId]
          properties:
            imageRefId:
              type: string
            vehicleId:
              type: string
            vehicleType:
              type: string
  responses:
    200:
      content:
        application/json:
          schema:
            type: object
            properties:
              volumeEstimate:
                type: number
              freeVolumeRatio:
                type: number
              palletCount:
                type: integer
              confidence:
                type: number
              regions:
                type: array
                items:
                  type: object
                  properties:
                    type: string  # "FREE" | "OCCUPIED"
                    bbox: array   # [x, y, w, h]
              processingTimeMs:
                type: integer
```

---

### 2.3 Capacity-Service

**Verantwortung:**
Aggregation und Berechnung von Kapazitätszuständen.

```
┌─────────────────────────────────────────────────────────────┐
│                   CAPACITY-SERVICE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Verantwortlichkeiten:                                      │
│  ├── Aggregation von Fahrzeug-/Tour-/Ladungsdaten          │
│  ├── Berechnung von CapacityState je Segment               │
│  ├── Verwaltung von LoadSnapshots                          │
│  └── Publizieren von capacity.state.updated                │
│                                                             │
│  Input:                                                     │
│  ├── API: POST /tours/{tourId}/load-snapshots              │
│  ├── Event: load.snapshot.created                          │
│  ├── Event: load.snapshot.enriched (optional)              │
│  └── Tour-/Stop-Daten (aus Planning/Execution Service)     │
│                                                             │
│  Output:                                                    │
│  ├── Event: capacity.state.updated                         │
│  └── API: GET /tours/{tourId}/capacity                     │
│                                                             │
│  Business Logic:                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  V_free = V_max - V_used                            │   │
│  │  G_free = G_max - G_used                            │   │
│  │  P_free = P_max - P_used                            │   │
│  │                                                     │   │
│  │  Vision-Abgleich:                                   │   │
│  │  If |V_free - V_free_vision| > threshold:           │   │
│  │      Flag: uncertaintyFlag = true                   │   │
│  │                                                     │   │
│  │  Segment-Calculation:                               │   │
│  │  For each segment in tour:                          │   │
│  │      Calculate capacity after deliveries in segment │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Dependencies:                                              │
│  ├── PostgreSQL (State Persistence)                        │
│  ├── Redis (Cache for current capacity)                    │
│  ├── Kafka Consumer/Producer                               │
│  └── Vehicle/Tour Service APIs                             │
│                                                             │
│  Technology Stack:                                          │
│  ├── Java 21 / Spring Boot 3.x                             │
│  ├── PostgreSQL + JPA/Hibernate                            │
│  ├── Redis + Spring Data Redis                             │
│  └── Spring Kafka                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**API-Endpunkte:**
```yaml
POST /tours/{tourId}/load-snapshots:
  description: Create a load snapshot
  parameters:
    - name: tourId
      in: path
      required: true
  requestBody:
    content:
      multipart/form-data:
        schema:
          properties:
            image: binary
            stopId: string (optional)
            source: enum [MANUAL, VISION, TELEMATICS]
            volumeUsedM3: number (optional)
            weightUsedKg: number (optional)
            palletsUsed: integer (optional)
  responses:
    201:
      description: Snapshot created
      content:
        application/json:
          schema: LoadSnapshot

GET /tours/{tourId}/capacity:
  description: Get current capacity states
  parameters:
    - name: tourId
      in: path
      required: true
    - name: segmentId
      in: query
      required: false
  responses:
    200:
      content:
        application/json:
          schema:
            properties:
              tourId: string
              vehicleCapacity: VehicleCapacity
              segments: CapacityState[]
```

---

### 2.4 Suggestion-Service

**Verantwortung:**
Matching-Algorithmus, Scoring und Ranking.

```
┌─────────────────────────────────────────────────────────────┐
│                   SUGGESTION-SERVICE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Verantwortlichkeiten:                                      │
│  ├── Matching-Heuristik                                     │
│  ├── Scoring & Ranking                                      │
│  ├── Erzeugung von Vorschlägen                              │
│  └── Order-Pool-Integration                                 │
│                                                             │
│  Input:                                                     │
│  ├── Event: capacity.state.updated (Trigger)               │
│  ├── Order-Pool (API/DB/Event)                             │
│  │   └── Open orders with location, time windows, cargo    │
│  ├── Routing-Infos (Routing-Service API)                   │
│  │   └── Distances, ETAs, detour calculations              │
│  └── Tour State (Tour-Service API)                         │
│                                                             │
│  Output:                                                    │
│  ├── Event: suggestion.generated                           │
│  └── API: GET /tours/{tourId}/suggestions                  │
│                                                             │
│  Matching Pipeline:                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  1. FILTER PHASE                                    │   │
│  │  ├── Capacity Check: V, G, P <= free               │   │
│  │  ├── Geographic: detour <= maxDetourKm             │   │
│  │  └── Time Window: ETA within windows               │   │
│  │                                                     │   │
│  │  2. SCORING PHASE                                   │   │
│  │  ├── Revenue Score: price / (detourKm + 1)         │   │
│  │  ├── Capacity Score: orderVol / freeVol            │   │
│  │  ├── Priority Score: HIGH=1.0, NORMAL=0.5          │   │
│  │  ├── Detour Score: 1 - (detour/max)                │   │
│  │  ├── Time Fit Score: position in window            │   │
│  │  └── Direction Score: cos(angle)                   │   │
│  │                                                     │   │
│  │  3. RANKING PHASE                                   │   │
│  │  ├── Total Score = Σ(weight_i × score_i)           │   │
│  │  ├── Sort by total score DESC                      │   │
│  │  ├── Filter: score >= threshold                    │   │
│  │  └── Limit: top N per tour                         │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Dependencies:                                              │
│  ├── PostgreSQL (Suggestions persistence)                  │
│  ├── Redis (Cache for order pool, matching results)       │
│  ├── Kafka Consumer/Producer                               │
│  ├── Routing Service API                                   │
│  └── Order Management API                                  │
│                                                             │
│  Technology Stack:                                          │
│  ├── Java 21 / Spring Boot 3.x                             │
│  ├── PostgreSQL + JPA                                      │
│  ├── Redis + Caching                                       │
│  └── Spring Kafka                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**API-Endpunkte:**
```yaml
GET /tours/{tourId}/suggestions:
  description: Get order suggestions for a tour
  parameters:
    - name: tourId
      in: path
      required: true
    - name: maxResults
      in: query
      schema:
        type: integer
        default: 5
    - name: minScore
      in: query
      schema:
        type: number
        default: 0.4
    - name: status
      in: query
      schema:
        type: string
        enum: [NEW, ACCEPTED_DRIVER, ACCEPTED_DISPATCHER, REJECTED]
  responses:
    200:
      content:
        application/json:
          schema:
            properties:
              tourId: string
              generatedAt: datetime
              suggestions: Suggestion[]
```

---

### 2.5 Decision-Service

**Verantwortung:**
Entscheidungs-Handling und Konsistenz.

```
┌─────────────────────────────────────────────────────────────┐
│                   DECISION-SERVICE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Verantwortlichkeiten:                                      │
│  ├── Annahme/Ablehnung von Vorschlägen                     │
│  ├── Konsistenz mit Tour/Order-System                      │
│  ├── Validierung (Kapazität, Zeitfenster, Doppelbuchung)   │
│  └── Trigger für tour.route.updated                        │
│                                                             │
│  Input:                                                     │
│  ├── API: POST /suggestions/{id}/decision                  │
│  │   └── Body: { decision, decidedBy, reason }             │
│  └── Event: suggestion.decision.made                       │
│                                                             │
│  Output:                                                    │
│  ├── Event: suggestion.decision.made                       │
│  ├── Event: tour.route.updated (on ACCEPT)                 │
│  └── Status-Updates für Orders/Touren                      │
│                                                             │
│  Decision Flow (ACCEPT):                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  1. Validate suggestion status == NEW              │   │
│  │  2. Check not expired                              │   │
│  │  3. Re-validate capacity (race condition)          │   │
│  │  4. Re-validate time window                        │   │
│  │  5. Check order not already assigned               │   │
│  │                                                     │   │
│  │  If valid:                                          │   │
│  │  ├── Update suggestion status                      │   │
│  │  ├── Update order status → ASSIGNED                │   │
│  │  ├── Create new stops (pickup, delivery)           │   │
│  │  ├── Update tour route                             │   │
│  │  ├── Recalculate capacity states                   │   │
│  │  └── Publish tour.route.updated                    │   │
│  │                                                     │   │
│  │  If invalid:                                        │   │
│  │  └── Return error with reason                      │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Dependencies:                                              │
│  ├── PostgreSQL (Transaction management)                   │
│  ├── Kafka Producer                                        │
│  ├── Tour Service API (route updates)                      │
│  ├── Order Service API (status updates)                    │
│  └── Capacity Service API (recalculation)                  │
│                                                             │
│  Technology Stack:                                          │
│  ├── Java 21 / Spring Boot 3.x                             │
│  ├── Spring Transaction Management                         │
│  └── Spring Kafka                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**API-Endpunkte:**
```yaml
POST /suggestions/{suggestionId}/decision:
  description: Accept or reject a suggestion
  parameters:
    - name: suggestionId
      in: path
      required: true
  requestBody:
    content:
      application/json:
        schema:
          type: object
          required: [decision, decidedBy]
          properties:
            decision:
              type: string
              enum: [ACCEPT, REJECT]
            decidedBy:
              type: string
              enum: [DRIVER, DISPATCHER]
            reason:
              type: string
              description: Optional reason for rejection
  responses:
    200:
      description: Decision recorded
      content:
        application/json:
          schema: Suggestion
    400:
      description: Invalid state (already decided, expired)
    409:
      description: Conflict (capacity changed, order already assigned)
```

---

## 3. Jira-Epics & Stories

### 3.1 Epic-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                    JIRA EPIC OVERVIEW                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  EPIC 1: Capacity-Grundlage & LoadSnapshots                │
│  ├── 6 Stories                                              │
│  └── Priority: Must Have (MVP)                              │
│                                                             │
│  EPIC 2: Vision-Integration                                 │
│  ├── 4 Stories                                              │
│  └── Priority: Should Have (MVP+1)                          │
│                                                             │
│  EPIC 3: Suggestion-Engine (Matching & Scoring)            │
│  ├── 6 Stories                                              │
│  └── Priority: Must Have (MVP)                              │
│                                                             │
│  EPIC 4: Decisions & Routing-Update                        │
│  ├── 4 Stories                                              │
│  └── Priority: Must Have (MVP)                              │
│                                                             │
│  EPIC 5: UI-Integration Fahrer & Disponenten               │
│  ├── 5 Stories                                              │
│  └── Priority: Must Have (MVP)                              │
│                                                             │
│  Total: 25 Stories                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.2 Epic 1: Capacity-Grundlage & LoadSnapshots

```
┌─────────────────────────────────────────────────────────────┐
│  EPIC-1: Capacity-Grundlage & LoadSnapshots                 │
│  Priority: Must Have (MVP)                                  │
│  Story Points: ~34                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STORY 1.1 – Domainmodell definieren                       │
│  ─────────────────────────────────────────────────────────  │
│  Als: Entwickler                                           │
│  Ich möchte: Ein klares Domainmodell für Vehicle, Tour,    │
│             LoadSnapshot und CapacityState                 │
│  Damit: Alle Services auf konsistente Entitäten zugreifen  │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Domain-Klassen in Java/TypeScript definiert          │
│  ├── Alle Felder und Validierungen dokumentiert           │
│  ├── Unit Tests für Value Objects                          │
│  └── DDD-Respektierung der Aggregate Boundaries            │
│                                                             │
│  Story Points: 5                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 1.2 – Event-Schema implementieren                   │
│  ─────────────────────────────────────────────────────────  │
│  Als: Entwickler                                           │
│  Ich möchte: Event-Schemas für load.snapshot.created und   │
│             capacity.state.updated definiert               │
│  Damit: Services Events korrekt produzieren/konsumieren    │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── JSON-Schema für beide Events                          │
│  ├── Schema Registry Eintrag                               │
│  ├── Producer/Consumer Tests                               │
│  └── Dokumentation mit Beispielen                          │
│                                                             │
│  Story Points: 3                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 1.3 – API POST /tours/{tourId}/load-snapshots       │
│  ─────────────────────────────────────────────────────────  │
│  Als: Fahrer-App                                           │
│  Ich möchte: LoadSnapshots mit Bild und Metadaten hochladen│
│  Damit: Die aktuelle Beladung erfasst wird                  │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── POST Endpoint implementiert                           │
│  ├── Multipart-Form-Data für Bild                          │
│  ├── Validierung aller Pflichtfelder                       │
│  ├── Event load.snapshot.created wird gepublished          │
│  ├── Image wird in Object Storage gespeichert              │
│  └── OpenAPI Doku aktualisiert                             │
│                                                             │
│  Story Points: 8                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 1.4 – CapacityState-Berechnung                      │
│  ─────────────────────────────────────────────────────────  │
│  Als: Capacity-Service                                     │
│  Ich möchte: Aus Stammdaten und Snapshots CapacityState    │
│             je Segment berechnen                           │
│  Damit: Freie Kapazität bekannt ist                         │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Algorithmus implementiert (V_free, G_free, P_free)    │
│  ├── Segment-basierte Berechnung                           │
│  ├── Vision-Abgleich mit Uncertainty Flag                  │
│  ├── Unit Tests mit Edge Cases                             │
│  └── Performance: <100ms pro Berechnung                    │
│                                                             │
│  Story Points: 8                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 1.5 – Event capacity.state.updated publizieren      │
│  ─────────────────────────────────────────────────────────  │
│  Als: Capacity-Service                                     │
│  Ich möchte: Bei jeder Änderung ein Event publizieren      │
│  Damit: Andere Services über Kapazitätsänderungen wissen   │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Kafka Producer konfiguriert                           │
│  ├── Event mit allen Pflichtfeldern                        │
│  ├── At-least-once Garantie                                │
│  ├── Correlation-ID Propagation                            │
│  └── Monitoring/Alerting für Producer-Lag                  │
│                                                             │
│  Story Points: 3                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 1.6 – API GET /tours/{tourId}/capacity              │
│  ─────────────────────────────────────────────────────────  │
│  Als: Dispatcher-UI / Fahrer-App                           │
│  Ich möchte: Aktuelle Kapazität pro Segment abfragen       │
│  Damit: Ich die Auslastung sehen kann                       │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── GET Endpoint implementiert                            │
│  ├── Response mit allen Segmenten                          │
│  ├── Caching (Redis) für Performance                       │
│  ├── Cache Invalidation bei capacity.state.updated         │
│  └── OpenAPI Doku                                          │
│                                                             │
│  Story Points: 5                                            │
│  Priority: High                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.3 Epic 2: Vision-Integration

```
┌─────────────────────────────────────────────────────────────┐
│  EPIC-2: Vision-Integration                                 │
│  Priority: Should Have (MVP+1)                              │
│  Story Points: ~21                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STORY 2.1 – Image-Storage & Referenzierung                │
│  ─────────────────────────────────────────────────────────  │
│  Als: System                                               │
│  Ich möchte: Bilder in Object Storage speichern und        │
│             referenzieren können                           │
│  Damit: Vision-Service darauf zugreifen kann               │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── S3/MinIO Bucket konfiguriert                          │
│  ├── Presigned URLs für Upload                             │
│  ├── Image-Referenz-ID Generierung                         │
│  ├── Lifecycle Policy (30 Tage Retention)                  │
│  └── Tests für Upload/Download                             │
│                                                             │
│  Story Points: 5                                            │
│  Priority: Medium                                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 2.2 – Vision-Service Stub (Mock-Ergebnisse)         │
│  ─────────────────────────────────────────────────────────  │
│  Als: Entwickler                                           │
│  Ich möchte: Einen Vision-Service Stub mit Mock-Daten      │
│  Damit: Die Integration getestet werden kann ohne ML       │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Mock API POST /internal/vision/analyze               │
│  ├── Deterministische Ergebnisse basierend auf Input       │
│  ├── Simulierte Confidence-Werte                           │
│  ├── Konfigurierbare Latenz                                │
│  └── Docker-Compose Setup                                  │
│                                                             │
│  Story Points: 3                                            │
│  Priority: Medium                                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 2.3 – Event load.snapshot.enriched einführen        │
│  ─────────────────────────────────────────────────────────  │
│  Als: Vision-Service                                       │
│  Ich möchte: Ein Enrichment-Event publizieren              │
│  Damit: Capacity-Service die Vision-Daten nutzen kann      │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Event-Schema definiert                                │
│  ├── Vision-Service publiziert nach Analyse                │
│  ├── Capacity-Service konsumiert Event                     │
│  ├── Correlation-ID Propagation                            │
│  └── Tests für End-to-End Flow                             │
│                                                             │
│  Story Points: 5                                            │
│  Priority: Low                                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 2.4 – Integration Vision → Capacity                 │
│  ─────────────────────────────────────────────────────────  │
│  Als: System                                               │
│  Ich möchte: Dass Vision-Ergebnisse automatisch in        │
│             Capacity-Berechnung einfließen                 │
│  Damit: Genauere Kapazitätsdaten durch Bildanalyse         │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Capacity-Service konsumiert load.snapshot.enriched    │
│  ├── Vision-Daten werden in Capacity-State übernommen      │
│  ├── Uncertainty-Flag bei Diskrepanzen                     │
│  ├── End-to-End Tests                                      │
│  └── Monitoring für Event-Verarbeitung                     │
│                                                             │
│  Story Points: 8                                            │
│  Priority: Low                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.4 Epic 3: Suggestion-Engine

```
┌─────────────────────────────────────────────────────────────┐
│  EPIC-3: Suggestion-Engine (Matching & Scoring)             │
│  Priority: Must Have (MVP)                                  │
│  Story Points: ~40                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STORY 3.1 – Domainmodell für OrderCandidate & Suggestion  │
│  ─────────────────────────────────────────────────────────  │
│  Als: Entwickler                                           │
│  Ich möchte: Domain-Klassen für Order und Suggestion       │
│  Damit: Die Matching-Logik darauf aufbauen kann            │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── OrderCandidate Entity mit allen Feldern               │
│  ├── Suggestion Entity mit Scores                          │
│  ├── Repository Interfaces                                 │
│  ├── Unit Tests                                            │
│  └── DB Schema erstellt                                    │
│                                                             │
│  Story Points: 5                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 3.2 – Order-Pool Zugriff                            │
│  ─────────────────────────────────────────────────────────  │
│  Als: Suggestion-Service                                   │
│  Ich möchte: Auf offene Aufträge zugreifen                 │
│  Damit: Ich passende Aufträge finden kann                  │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── API Client für Order Management Service               │
│  ├── Order-Pool Caching (Redis)                            │
│  ├── Event-basierte Updates (order.added, order.removed)   │
│  ├── Retry/Circuit Breaker                                 │
│  └── Tests mit Mock-Server                                 │
│                                                             │
│  Story Points: 5                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 3.3 – Filter-Logik implementieren                   │
│  ─────────────────────────────────────────────────────────  │
│  Als: Suggestion-Service                                   │
│  Ich möchte: Orders filtern nach Kapazität, Distanz, Zeit  │
│  Damit: Nur passende Kandidaten ins Scoring gehen          │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Capacity Filter (V, G, P)                             │
│  ├── Geographic Filter (Detour)                            │
│  ├── Time Window Filter                                    │
│  ├── Konfigurierbare Thresholds                            │
│  ├── Unit Tests für alle Filter                            │
│  └── Performance: <50ms für 100 Orders                     │
│                                                             │
│  Story Points: 8                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 3.4 – Scoring-Logik implementieren                  │
│  ─────────────────────────────────────────────────────────  │
│  Als: Suggestion-Service                                   │
│  Ich möchte: Gefilterte Orders scored und ranked werden    │
│  Damit: Die besten Vorschläge oben stehen                  │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Revenue Score                                         │
│  ├── Capacity Score                                        │
│  ├── Priority Score                                        │
│  ├── Detour Score                                          │
│  ├── Time Fit Score                                        │
│  ├── Direction Score                                       │
│  ├── Weighted Composite Score                              │
│  ├── Konfigurierbare Gewichte                              │
│  └── Unit Tests                                            │
│                                                             │
│  Story Points: 8                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 3.5 – Event suggestion.generated publizieren        │
│  ─────────────────────────────────────────────────────────  │
│  Als: Suggestion-Service                                   │
│  Ich möchte: Neue Vorschläge als Event publizieren         │
│  Damit: Andere Services benachrichtigt werden              │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Event-Schema implementiert                            │
│  ├── Alle Score-Komponenten im Event                       │
│  ├── Batch-Publishing für mehrere Vorschläge               │
│  ├── Monitoring                                            │
│  └── Tests                                                 │
│                                                             │
│  Story Points: 3                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 3.6 – API GET /tours/{tourId}/suggestions           │
│  ─────────────────────────────────────────────────────────  │
│  Als: Dispatcher-UI / Fahrer-App                           │
│  Ich möchte: Vorschläge für eine Tour abrufen              │
│  Damit: Ich entscheiden kann                               │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── GET Endpoint implementiert                            │
│  ├── Filter nach Status                                    │
│  ├── Pagination                                            │
│  ├── Caching                                               │
│  └── OpenAPI Doku                                          │
│                                                             │
│  Story Points: 5                                            │
│  Priority: High                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.5 Epic 4: Decisions & Routing-Update

```
┌─────────────────────────────────────────────────────────────┐
│  EPIC-4: Decisions & Routing-Update                         │
│  Priority: Must Have (MVP)                                  │
│  Story Points: ~26                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STORY 4.1 – API POST /suggestions/{id}/decision           │
│  ─────────────────────────────────────────────────────────  │
│  Als: Fahrer / Dispatcher                                  │
│  Ich möchte: Einen Vorschlag annehmen oder ablehnen        │
│  Damit: Die Tour entsprechend aktualisiert wird            │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── POST Endpoint implementiert                           │
│  ├── Validierung (Status, Expiry)                          │
│  ├── Idempotency Key Support                               │
│  ├── Response mit aktualisierter Tour                      │
│  └── OpenAPI Doku                                          │
│                                                             │
│  Story Points: 5                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 4.2 – Event suggestion.decision.made publizieren    │
│  ─────────────────────────────────────────────────────────  │
│  Als: Decision-Service                                     │
│  Ich möchte: Entscheidungen als Event publizieren          │
│  Damit: Audit-Trail und Notifications möglich sind         │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Event-Schema implementiert                            │
│  ├── Alle Decision-Details im Event                        │
│  ├── Latency Tracking                                      │
│  ├── Monitoring                                            │
│  └── Tests                                                 │
│                                                             │
│  Story Points: 3                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 4.3 – Integration mit Tour-/Routing-System          │
│  ─────────────────────────────────────────────────────────  │
│  Als: Decision-Service                                     │
│  Ich möchte: Bei ACCEPT die Tour-Route aktualisieren       │
│  Damit: Neue Stopps eingefügt werden                        │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Tour-Service API Client                               │
│  ├── Neue Stopps (Pickup, Delivery) erstellen              │
│  ├── Route-Sequenz aktualisieren                           │
│  ├── Event tour.route.updated publizieren                  │
│  ├── Transaktionale Konsistenz                             │
│  └── Tests                                                 │
│                                                             │
│  Story Points: 8                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 4.4 – Konsistenzprüfungen                           │
│  ─────────────────────────────────────────────────────────  │
│  Als: Decision-Service                                     │
│  Ich möchte: Vor ACCEPT Validierungen durchführen          │
│  Damit: Keine ungültigen Zuweisungen entstehen             │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Kapazität noch verfügbar                              │
│  ├── Zeitfenster noch offen                                │
│  ├── Order nicht bereits zugewiesen                        │
│  ├── Race-Condition Handling (Optimistic Locking)          │
│  ├── Klare Error-Messages                                  │
│  └── Tests für alle Failure-Scenarios                      │
│                                                             │
│  Story Points: 8                                            │
│  Priority: High                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.6 Epic 5: UI-Integration

```
┌─────────────────────────────────────────────────────────────┐
│  EPIC-5: UI-Integration Fahrer & Disponenten                │
│  Priority: Must Have (MVP)                                  │
│  Story Points: ~34                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STORY 5.1 – Fahrer-App: „Laderaum aktualisieren"          │
│  ─────────────────────────────────────────────────────────  │
│  Als: Fahrer                                               │
│  Ich möchte: Foto machen + manuelle Eingabe für Beladung   │
│  Damit: Die Kapazität aktuell gehalten wird                 │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Screen für Foto-Upload                                │
│  ├── Kamera-Integration                                    │
│  ├── Manuelle Eingabe (Volumen, Paletten, Gewicht)         │
│  ├── Offline-Support (Queue)                               │
│  ├── Upload-Progress                                       │
│  └── Bestätigungs-Screen                                   │
│                                                             │
│  Story Points: 8                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 5.2 – Fahrer-App: Vorschlagsliste + Accept/Reject   │
│  ─────────────────────────────────────────────────────────  │
│  Als: Fahrer                                               │
│  Ich möchte: Vorschläge sehen und entscheiden              │
│  Damit: Ich Zusatzaufträge annehmen kann                    │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Vorschlagsliste mit Details                           │
│  ├── Annehmen/Ablehnen Buttons                             │
│  ├── Route-Preview bei Accept                              │
│  ├── Push-Notification bei neuen Vorschlägen               │
│  ├── Offline-Queue für Entscheidungen                      │
│  └── Success/Error Feedback                                │
│                                                             │
│  Story Points: 8                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 5.3 – Dispatcher-UI: Tour-Kapazität je Segment      │
│  ─────────────────────────────────────────────────────────  │
│  Als: Dispatcher                                           │
│  Ich möchte: Kapazität pro Segment sehen                   │
│  Damit: Ich Touren überwachen kann                          │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Dashboard mit allen aktiven Touren                    │
│  ├── Kapazitäts-Balken pro Segment                         │
│  ├── Heatmap für Auslastung                                │
│  ├── Real-time Updates (WebSocket)                         │
│  └── Filter nach Tour/Driver                               │
│                                                             │
│  Story Points: 5                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 5.4 – Dispatcher-UI: Vorschlagsliste + Entscheidung │
│  ─────────────────────────────────────────────────────────  │
│  Als: Dispatcher                                           │
│  Ich möchte: Vorschläge sehen und zuweisen                 │
│  Damit: Ich Touren optimieren kann                          │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Panel mit Vorschlägen pro Tour                        │
│  ├── Detail-View mit Karte                                 │
│  ├── Filter (Marge, Distanz, Kunde)                        │
│  ├── Batch-Zuweisung                                       │
│  ├── Konflikt-Warnungen                                    │
│  └── Success/Error Toasts                                  │
│                                                             │
│  Story Points: 8                                            │
│  Priority: High                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  STORY 5.5 – Telemetrie & Logging für Entscheidungen       │
│  ─────────────────────────────────────────────────────────  │
│  Als: Admin                                                │
│  Ich möchte: Alle Entscheidungen nachvollziehbar sehen     │
│  Damit: Audit und Analyse möglich sind                      │
│                                                             │
│  Acceptance Criteria:                                       │
│  ├── Event-Log für alle Entscheidungen                     │
│  ├── Dashboard mit Metriken                                │
│  ├── Export-Funktion (CSV)                                 │
│  ├── Suche/Filter                                          │
│  └── Retention-Policy                                      │
│                                                             │
│  Story Points: 5                                            │
│  Priority: Medium                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3.7 Story-Matrix (Export-Ready)

| Story-ID | Titel | Epic | SP | Priorität | Abhängigkeiten |
|----------|-------|------|-----|-----------|----------------|
| 1.1 | Domainmodell definieren | EPIC-1 | 5 | High | - |
| 1.2 | Event-Schema implementieren | EPIC-1 | 3 | High | 1.1 |
| 1.3 | API POST /load-snapshots | EPIC-1 | 8 | High | 1.1, 1.2 |
| 1.4 | CapacityState-Berechnung | EPIC-1 | 8 | High | 1.1 |
| 1.5 | Event capacity.state.updated | EPIC-1 | 3 | High | 1.2, 1.4 |
| 1.6 | API GET /capacity | EPIC-1 | 5 | High | 1.4, 1.5 |
| 2.1 | Image-Storage | EPIC-2 | 5 | Medium | 1.3 |
| 2.2 | Vision-Service Stub | EPIC-2 | 3 | Medium | 2.1 |
| 2.3 | Event load.snapshot.enriched | EPIC-2 | 5 | Low | 2.2 |
| 2.4 | Integration Vision → Capacity | EPIC-2 | 8 | Low | 2.3, 1.4 |
| 3.1 | Domainmodell Order/Suggestion | EPIC-3 | 5 | High | 1.1 |
| 3.2 | Order-Pool Zugriff | EPIC-3 | 5 | High | 3.1 |
| 3.3 | Filter-Logik | EPIC-3 | 8 | High | 1.6, 3.2 |
| 3.4 | Scoring-Logik | EPIC-3 | 8 | High | 3.3 |
| 3.5 | Event suggestion.generated | EPIC-3 | 3 | High | 3.4, 1.2 |
| 3.6 | API GET /suggestions | EPIC-3 | 5 | High | 3.4 |
| 4.1 | API POST /decision | EPIC-4 | 5 | High | 3.1 |
| 4.2 | Event suggestion.decision.made | EPIC-4 | 3 | High | 4.1, 1.2 |
| 4.3 | Tour/Routing Integration | EPIC-4 | 8 | High | 4.1 |
| 4.4 | Konsistenzprüfungen | EPIC-4 | 8 | High | 4.1 |
| 5.1 | Fahrer-App Upload | EPIC-5 | 8 | High | 1.3 |
| 5.2 | Fahrer-App Vorschläge | EPIC-5 | 8 | High | 3.6, 4.1 |
| 5.3 | Dispatcher Dashboard | EPIC-5 | 5 | High | 1.6 |
| 5.4 | Dispatcher Vorschläge | EPIC-5 | 8 | High | 3.6, 4.1 |
| 5.5 | Telemetrie & Logging | EPIC-5 | 5 | Medium | 4.2 |

**Total Story Points: 155**

---

## 4. Sprint-Empfehlung

### 4.1 Sprint-Planung (2-Wochen-Sprints)

```
┌─────────────────────────────────────────────────────────────┐
│                    SPRINT ROADMAP                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SPRINT 1-2: Foundation (Velocity ~30 SP/Sprint)           │
│  ├── Epic 1: Stories 1.1, 1.2, 1.3, 1.4, 1.5, 1.6        │
│  └── Ziel: Capacity-Service mit API                        │
│                                                             │
│  SPRINT 3-4: Matching Core                                 │
│  ├── Epic 3: Stories 3.1, 3.2, 3.3, 3.4, 3.5, 3.6        │
│  └── Ziel: Suggestion-Service mit Matching                 │
│                                                             │
│  SPRINT 5-6: Decisions & Integration                       │
│  ├── Epic 4: Stories 4.1, 4.2, 4.3, 4.4                   │
│  └── Ziel: Decision-Flow End-to-End                        │
│                                                             │
│  SPRINT 7-8: UI Integration                                │
│  ├── Epic 5: Stories 5.1, 5.2, 5.3, 5.4, 5.5              │
│  └── Ziel: Fahrer-App & Dispatcher-UI                      │
│                                                             │
│  SPRINT 9-10: Vision (Optional, MVP+1)                     │
│  ├── Epic 2: Stories 2.1, 2.2, 2.3, 2.4                   │
│  └── Ziel: Bildanalyse-Integration                         │
│                                                             │
│  MVP Timeline: 8 Sprints (~4 Monate)                       │
│  Full Timeline: 10 Sprints (~5 Monate)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

*Dokument-Version: 1.0 | Erstellt: 2026-04 | Nächste Überprüfung: 2026-05*
