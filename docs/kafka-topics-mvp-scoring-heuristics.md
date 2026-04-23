# Kafka Topics, MVP-Cut & Erweiterte Scoring-Heuristik

**CargoBit Transport-Plattform – Technische Spezifikation**

---

## 1. Kafka-Topic-Struktur & Partitionierung

### 1.1 Design-Prinzipien

Die Topic-Struktur folgt diesen Prinzipien:
- **Stabilität**: Vorhersehbare Consumer-Gruppen und Reihenfolge-Garantien
- **Erweiterbarkeit**: Versioning-Suffix für Schema-Evolution
- **Konsumentfreundlichkeit**: Partitionierung nach logischen Entitäten

### 1.2 Topic-Übersicht

| Topic-Name | Partition-Key | Replikation | Partitionen (Start) |
|------------|---------------|-------------|---------------------|
| `logistics.load-snapshot.v1` | `tourId` | 3 | 3-6 |
| `logistics.capacity-state.v1` | `tourId` | 3 | 3-6 |
| `logistics.suggestion.v1` | `tourId` | 3 | 3-6 |
| `logistics.suggestion-decision.v1` | `suggestionId` | 3 | 3-6 |
| `logistics.tour-route.v1` | `tourId` | 3 | 3-6 |

### 1.3 Partitionierungs-Begründung

#### `logistics.load-snapshot.v1`
```
Key: tourId
Begründung: Reihenfolge pro Tour kritisch – Snapshots müssen in chronologischer 
Reihenfolge verarbeitet werden, um korrekte Kapazitätsberechnung zu gewährleisten.
Consumer-Gruppe: capacity-service-consumers
```

#### `logistics.capacity-state.v1`
```
Key: tourId
Begründung: Konsistente Kapazitätszustände pro Tour – alle Updates für dieselbe Tour 
landen in derselben Partition, wodurch Race Conditions vermieden werden.
Consumer-Gruppe: suggestion-service-consumers
```

#### `logistics.suggestion.v1`
```
Key: tourId
Begründung: Alle Vorschläge pro Tour zusammen – ermöglicht effiziente Aggregation 
und Filterung auf Consumer-Seite.
Consumer-Gruppe: decision-service-consumers, dispatcher-ui-consumers
```

#### `logistics.suggestion-decision.v1`
```
Key: suggestionId
Begründung: Entscheidungen pro Vorschlag – jede Decision eindeutig einem Vorschlag 
zuordenbar, unabhängig von der Tour (Cross-Tour-Entscheidungen möglich).
Consumer-Gruppe: suggestion-service-consumers, audit-logger-consumers
```

#### `logistics.tour-route.v1`
```
Key: tourId
Begründung: Route-Historie pro Tour – vollständige Chronologie aller Routenänderungen 
für Audit und Replay.
Consumer-Gruppe: routing-service-consumers, analytics-consumers
```

### 1.4 Skalierungsstrategie

```
Phase 1 (MVP): 3 Partitionen, 3 Replicas
Phase 2 (≥100 Tours/Tag): 6 Partitionen
Phase 3 (≥500 Tours/Tag): 12 Partitionen + Consumer-Scale-Out
```

### 1.5 Retention & Compaction

| Topic | Retention | Compaction | Begründung |
|-------|-----------|------------|------------|
| `load-snapshot` | 7 Tage | Nein | Zeitreihen-Daten, Histories |
| `capacity-state` | 7 Tage | Ja | Nur aktueller State relevant |
| `suggestion` | 30 Tage | Nein | Alle Vorschläge für Analytics |
| `suggestion-decision` | 365 Tage | Nein | Audit-Trail |
| `tour-route` | 365 Tage | Ja | Aktueller State + Historie |

---

## 2. MVP-Cut – Iteration 1

### 2.1 MVP-Zielsetzung

**Kernziel**: Kapazitätsbasierte Zusatzaufträge ohne Vision-KI und ohne Over-Engineering.

| Zielgröße | MVP-Wert |
|-----------|----------|
| Time-to-Market | 8-10 Wochen |
| Entwicklungsaufwand | 4-5 Entwickler |
| ROI-Nachweis | Nach 3 Monaten Betriebszeit |

### 2.2 MVP-Umfang

#### 2.2.1 Kapazitätsmanagement

**Vehicle-Stammdaten (Pflichtfelder):**
```json
{
  "vehicleId": "V123",
  "licensePlate": "B-XY 1234",
  "vehicleType": "SEMI_TRAILER",
  "volumeMaxM3": 45.0,
  "weightMaxKg": 12000,
  "palletsMax": 24,
  "activeTourId": "T123"
}
```

**Manuelle Ladungs-Eingabe:**
```json
{
  "tourId": "T123",
  "enteredBy": "DRIVER",
  "volumeUsedM3": 18.5,
  "weightUsedKg": 7200,
  "palletsUsed": 12,
  "source": "MANUAL_ENTRY"
}
```

**CapacityState-Berechnung:**
- Automatische Neuberechnung bei jeder Änderung
- Segment-basiert (Pickup → Dropoff)
- Event-Output: `capacity.state.updated`

#### 2.2.2 Matching-Engine

**Filter-Kriterien (MVP):**

| Kriterium | Logik | Konfiguration |
|-----------|-------|---------------|
| Kapazität | `order.volumeM3 <= capacity.volumeFreeM3` | Hard-Filter |
| Distanz | `pickup.distanceToRoute <= 5km` | Konfigurierbar |
| Zeitfenster | `order.pickupWindow ∈ tour.timeWindow` | Hard-Filter |

**Scoring (MVP – vereinfacht):**
```
Score = 0.5 × RevenueScore + 0.3 × CapacityUtilization + 0.2 × DetourPenalty

RevenueScore = order.price / maxExpectedPrice (normalized 0-1)
CapacityUtilization = order.volume / capacity.free (higher = better)
DetourPenalty = 1 - (detourKm / maxAllowedDetourKm)
```

#### 2.2.3 APIs (MVP)

**Vorschläge abrufen:**
```http
GET /tours/{tourId}/suggestions?limit=10&minScore=0.5

Response 200:
{
  "tourId": "T123",
  "suggestions": [
    {
      "suggestionId": "SUG_001",
      "orderId": "ORD_456",
      "score": 0.78,
      "extraRevenue": 180.0,
      "detourKm": 8.5,
      "pickup": { "lat": 52.5, "lng": 13.4, "window": "10:00-12:00" },
      "dropoff": { "lat": 52.6, "lng": 13.5, "window": "14:00-16:00" }
    }
  ]
}
```

**Entscheidung übermitteln:**
```http
POST /suggestions/{suggestionId}/decision

Request:
{
  "decision": "ACCEPT",
  "decidedBy": "DISPATCHER",
  "reason": "Good revenue, acceptable detour"
}

Response 200:
{
  "decisionId": "DEC_001",
  "status": "ACCEPTED",
  "tourUpdateStatus": "PENDING_REVIEW"
}
```

#### 2.2.4 UI-Komponenten (MVP)

**Disponenten-UI – Core-Features:**
1. **Tour-Übersicht**: Liste aller aktiven Touren mit Kapazitätsanzeige
2. **Kapazitäts-Panel**: Freies Volumen/Gewicht/Paletten pro Tour
3. **Vorschlags-Liste**: Matching-Vorschläge mit Score, Revenue, Umweg
4. **Entscheidungs-Buttons**: Accept/Reject mit optionalem Kommentar
5. **Route-Flag**: Bei Accept → Route-Update-Task für Dispatcher (manuell)

**Fahrer-UI:**
- **Nicht im MVP** – Follow-up in Iteration 2

#### 2.2.5 Events (MVP)

| Event | Produziert von | Konsumiert von |
|-------|----------------|----------------|
| `capacity.state.updated` | Capacity-Service | Suggestion-Service |
| `suggestion.generated` | Suggestion-Service | Decision-Service, UI |
| `suggestion.decision.made` | Decision-Service | Analytics, Audit |

### 2.3 Nicht im MVP (Explizit ausgeschlossen)

| Feature | Grund | Geplant in |
|---------|-------|------------|
| Vision-Service (Bildanalyse) | Hohe Komplexität, ML-Infrastruktur nötig | Iteration 2 |
| CO₂-Optimierung | Kein kritischer Pfad, Datenbasis fehlt | Iteration 3 |
| Vollautomatisches Routing-Update | Risikoreich, manueller Review bevorzugt | Iteration 2 |
| Komplexe Priorisierungslogik | Over-Engineering für MVP | Iteration 3 |
| Fahrer-UI | Fokus auf Dispatcher-Workflow | Iteration 2 |
| Risk-/ServiceLevel-Scores | Benötigt Datenhistorie | Iteration 3 |

### 2.4 MVP-Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MVP ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐       │
│  │   Vehicle    │     │   Capacity   │     │  Suggestion  │       │
│  │   Master     │────▶│   Service    │────▶│   Service    │       │
│  │   Data       │     │              │     │              │       │
│  └──────────────┘     └──────────────┘     └──────────────┘       │
│         │                    │                    │                │
│         │                    ▼                    ▼                │
│         │            ┌──────────────┐     ┌──────────────┐       │
│         │            │   Kafka:     │     │   Kafka:     │       │
│         │            │capacity.state│     │suggestion.   │       │
│         │            │  .updated    │     │  generated   │       │
│         │            └──────────────┘     └──────────────┘       │
│         │                                         │                │
│         │                                         ▼                │
│         │                                  ┌──────────────┐       │
│         │                                  │  Decision    │       │
│         │                                  │  Service     │       │
│         │                                  └──────────────┘       │
│         │                                         │                │
│         ▼                                         ▼                │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐       │
│  │  Dispatcher  │◀───▶│   REST API   │◀───▶│  PostgreSQL  │       │
│  │     UI       │     │   Gateway    │     │  (Entities)  │       │
│  └──────────────┘     └──────────────┘     └──────────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.5 MVP-Meilensteine

| Woche | Milestone | Deliverable |
|-------|-----------|-------------|
| 1-2 | Infrastruktur | Kafka, PostgreSQL, API-Gateway |
| 3-4 | Capacity-Service | Stammdaten-API, Berechnung, Events |
| 5-6 | Suggestion-Service | Matching-Engine, Filter, Scoring |
| 7-8 | Decision-Service & UI | APIs, Dispatcher-Dashboard |
| 9-10 | Integration & Testing | E2E-Tests, Performance, UAT |

---

## 3. Erweiterte Scoring-Heuristik

### 3.1 Motivation

Das MVP-Scoring (Revenue + Capacity + Detour) wird erweitert um:
- **Risiko-Aspekte**: Zahlungsausfall, Kundenhistorie
- **Servicelevel**: Premium-Kunden, SLA-Kritikalität
- **CO₂-Effizienz**: Leerkilometer-Reduktion

### 3.2 Score-Komponenten

#### 3.2.1 RevenueScore (0-1)
```python
def calculate_revenue_score(order, max_expected_price):
    return min(1.0, order.price / max_expected_price)
```

#### 3.2.2 CapacityUtilizationScore (0-1)
```python
def calculate_capacity_score(order, capacity):
    # Höhere Auslastung = besserer Score
    volume_utilization = order.volumeM3 / capacity.volumeFreeM3
    weight_utilization = order.weightKg / capacity.weightFreeKg
    return min(1.0, (volume_utilization + weight_utilization) / 2)
```

#### 3.2.3 PriorityScore (0-1)
```python
def calculate_priority_score(order, customer_tier_config):
    # Kundenpriorität aus CRM/Master-Data
    tier = order.customer.tier  # GOLD, SILVER, BRONZE, STANDARD
    return customer_tier_config.get(tier, 0.5)
```

#### 3.2.4 RiskScore (0-1) – NEU
```python
def calculate_risk_score(order, customer_history):
    """
    1 = geringes Risiko (sehr gut)
    0 = hohes Risiko (kritisch)
    
    Faktoren:
    - Zahlungshistorie (Verspätungen, Ausfälle)
    - Stornierungsrate
    - Bonitäts-Score extern
    """
    payment_score = customer_history.on_time_payment_rate
    cancellation_score = 1 - customer_history.cancellation_rate
    credit_score = customer_history.external_credit_rating / 100
    
    return (payment_score * 0.4 + 
            cancellation_score * 0.3 + 
            credit_score * 0.3)
```

#### 3.2.5 ServiceLevelScore (0-1) – NEU
```python
def calculate_service_level_score(order, sla_config):
    """
    1 = Premium/SLA-kritisch (priorisieren)
    0 = unkritisch (Standard-Behandlung)
    
    Faktoren:
    - SLA-Tier des Kunden
    - Kontrakt-Typ (Premium vs. Standard)
    - Zeitkritikalität des Auftrags
    """
    base_score = sla_config.get_tier_score(order.customer.sla_tier)
    
    # Zeitkritikalität erhöht Score
    if order.is_time_critical:
        base_score = min(1.0, base_score * 1.2)
    
    return base_score
```

#### 3.2.6 CO2Score (0-1) – NEU
```python
def calculate_co2_score(order, route, vehicle):
    """
    1 = starke CO₂-Verbesserung (weniger Leerkilometer)
    0 = keine Verbesserung oder Verschlechterung
    
    Berechnung:
    - Leerkilometer-Reduktion durch zusätzlichen Auftrag
    - Tank-/Strecken-Effizienz
    """
    # Baseline: Leerkilometer ohne Zusatzauftrag
    empty_km_baseline = route.calculate_empty_km()
    
    # Mit Zusatzauftrag
    empty_km_with_order = route.calculate_empty_km_with_stop(
        order.pickup, order.dropoff
    )
    
    # Reduktion = Verbesserung
    reduction = empty_km_baseline - empty_km_with_order
    max_possible_reduction = route.total_km * 0.3  # Max 30% Verbesserung
    
    return min(1.0, max(0, reduction / max_possible_reduction))
```

### 3.3 Gesamt-Score-Formel

```
Score = w1 × RevenueScore 
      + w2 × CapacityUtilizationScore 
      + w3 × PriorityScore 
      + w4 × RiskScore 
      + w5 × ServiceLevelScore 
      + w6 × CO2Score
```

### 3.4 Standard-Gewichte

| Gewicht | Komponente | Wert | Begründung |
|---------|------------|------|------------|
| w1 | Revenue | 0.35 | Primäres Business-Ziel |
| w2 | Capacity | 0.20 | Effizienz, Auslastung |
| w3 | Priority | 0.10 | Kundenpriorisierung |
| w4 | Risk | 0.10 | Risikominimierung |
| w5 | ServiceLevel | 0.15 | SLA-Compliance |
| w6 | CO2 | 0.10 | Nachhaltigkeit |

**Validierung**: Σ wi = 1.0 ✓

### 3.5 Konfigurierbare Profile

#### Profil 1: Revenue-Fokus (Default)
```json
{
  "profile": "revenue_focused",
  "weights": {
    "revenue": 0.35,
    "capacity": 0.20,
    "priority": 0.10,
    "risk": 0.10,
    "serviceLevel": 0.15,
    "co2": 0.10
  }
}
```

#### Profil 2: Premium-Kunden
```json
{
  "profile": "premium_customers",
  "weights": {
    "revenue": 0.25,
    "capacity": 0.15,
    "priority": 0.15,
    "risk": 0.10,
    "serviceLevel": 0.25,
    "co2": 0.10
  }
}
```

#### Profil 3: Nachhaltigkeit
```json
{
  "profile": "sustainability",
  "weights": {
    "revenue": 0.25,
    "capacity": 0.15,
    "priority": 0.10,
    "risk": 0.10,
    "serviceLevel": 0.10,
    "co2": 0.30
  }
}
```

#### Profil 4: Risikominimierung
```json
{
  "profile": "risk_averse",
  "weights": {
    "revenue": 0.25,
    "capacity": 0.15,
    "priority": 0.10,
    "risk": 0.25,
    "serviceLevel": 0.15,
    "co2": 0.10
  }
}
```

### 3.6 Implementierungs-Beispiel

```python
class ScoringEngine:
    def __init__(self, config_profile: str = "revenue_focused"):
        self.weights = self._load_profile(config_profile)
    
    def calculate_score(self, order: Order, tour: Tour) -> float:
        """Berechnet den Gesamt-Score für einen OrderCandidate."""
        
        # Einzelne Scores
        revenue_score = self._calc_revenue_score(order)
        capacity_score = self._calc_capacity_score(order, tour)
        priority_score = self._calc_priority_score(order)
        risk_score = self._calc_risk_score(order)
        service_level_score = self._calc_service_level_score(order)
        co2_score = self._calc_co2_score(order, tour)
        
        # Gewichteter Gesamt-Score
        total_score = (
            self.weights["revenue"] * revenue_score +
            self.weights["capacity"] * capacity_score +
            self.weights["priority"] * priority_score +
            self.weights["risk"] * risk_score +
            self.weights["serviceLevel"] * service_level_score +
            self.weights["co2"] * co2_score
        )
        
        return round(total_score, 4)
    
    def explain_score(self, order: Order, tour: Tour) -> dict:
        """Liefert detaillierte Score-Aufschlüsselung für UI."""
        return {
            "total": self.calculate_score(order, tour),
            "components": {
                "revenue": {
                    "score": self._calc_revenue_score(order),
                    "weight": self.weights["revenue"],
                    "contribution": self.weights["revenue"] * self._calc_revenue_score(order)
                },
                "capacity": {
                    "score": self._calc_capacity_score(order, tour),
                    "weight": self.weights["capacity"],
                    "contribution": self.weights["capacity"] * self._calc_capacity_score(order, tour)
                },
                # ... weitere Komponenten
            }
        }
```

### 3.7 UI-Integration

**Score-Aufschlüsselung in Dispatcher-UI:**

```
┌─────────────────────────────────────────────────────────────┐
│  Suggestion: ORD_456                          Score: 0.82   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ████████████████████░░░░  Revenue        0.35 × 0.90 = 0.32│
│  ████████████░░░░░░░░░░░░  Capacity       0.20 × 0.85 = 0.17│
│  ████████░░░░░░░░░░░░░░░░  Priority       0.10 × 0.70 = 0.07│
│  ██████████░░░░░░░░░░░░░░  Risk           0.10 × 0.95 = 0.10│
│  ███████████████░░░░░░░░░  ServiceLevel   0.15 × 0.80 = 0.12│
│  ██████░░░░░░░░░░░░░░░░░░  CO2            0.10 × 0.40 = 0.04│
│                                                             │
│  Profile: revenue_focused                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Konfigurations-API

### 4.1 Scoring-Profile verwalten

```http
GET /config/scoring-profiles

Response 200:
{
  "profiles": [
    {
      "id": "revenue_focused",
      "name": "Revenue-Fokus",
      "isDefault": true,
      "weights": { ... }
    },
    {
      "id": "premium_customers",
      "name": "Premium-Kunden",
      "isDefault": false,
      "weights": { ... }
    }
  ]
}
```

```http
PUT /config/scoring-profiles/{profileId}

Request:
{
  "weights": {
    "revenue": 0.30,
    "capacity": 0.20,
    "priority": 0.10,
    "risk": 0.15,
    "serviceLevel": 0.15,
    "co2": 0.10
  }
}
```

### 4.2 Profilauswahl pro Mandant/Region

```http
POST /config/tenant-scoring-mapping

Request:
{
  "tenantId": "TENANT_001",
  "region": "DE-NORTH",
  "profileId": "sustainability"
}
```

---

## 5. Zusammenfassung

| Komponente | Status | Verantwortlich |
|------------|--------|----------------|
| Kafka Topics | Spezifiziert | Platform Team |
| MVP-Scope | Definiert | Product Team |
| Scoring v2 | Erweitert | Suggestion-Service Team |
| Profile-Konfig | Spezifiziert | Config-Service Team |

**Nächste Schritte:**
1. Kafka-Cluster aufsetzen (3 Broker, 3 Replicas)
2. MVP-Entwicklung starten (10-Wochen-Plan)
3. Scoring-Engine mit Profil-Unterstützung implementieren
4. UI-Mockups für Score-Aufschlüsselung erstellen
