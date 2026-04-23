# Scoring Config – Struktur & Rechenbeispiele

**CargoBit Transport-Plattform – Technische Referenz**

---

## 1. Config-Struktur für Scoring-Weights

### 1.1 JSON-Schema (für Security-Config-Service)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://cargobit.io/schemas/scoring-config.json",
  "title": "CargoBit Scoring Configuration",
  "description": "Konfiguration der Scoring-Weights für Suggestion-Service",
  "type": "object",
  "properties": {
    "scoring": {
      "type": "object",
      "properties": {
        "weights": {
          "type": "object",
          "properties": {
            "revenue": {
              "type": "number",
              "minimum": 0,
              "maximum": 1,
              "description": "Gewichtung des Revenue-Scores"
            },
            "capacityUtilization": {
              "type": "number",
              "minimum": 0,
              "maximum": 1,
              "description": "Gewichtung der Kapazitätsauslastung"
            },
            "priority": {
              "type": "number",
              "minimum": 0,
              "maximum": 1,
              "description": "Gewichtung der Kundenpriorität"
            },
            "risk": {
              "type": "number",
              "minimum": 0,
              "maximum": 1,
              "description": "Gewichtung des Risiko-Scores"
            },
            "serviceLevel": {
              "type": "number",
              "minimum": 0,
              "maximum": 1,
              "description": "Gewichtung des Servicelevel-Scores"
            },
            "co2": {
              "type": "number",
              "minimum": 0,
              "maximum": 1,
              "description": "Gewichtung des CO₂-Scores"
            }
          },
          "required": [
            "revenue",
            "capacityUtilization",
            "priority",
            "risk",
            "serviceLevel",
            "co2"
          ],
          "additionalProperties": false
        },
        "constraints": {
          "type": "object",
          "properties": {
            "sumEquals": {
              "type": "number",
              "const": 1.0,
              "description": "Summe aller Weights muss 1.0 ergeben"
            }
          },
          "required": ["sumEquals"]
        }
      },
      "required": ["weights", "constraints"]
    }
  },
  "required": ["scoring"]
}
```

**Design-Entscheidungen:**

| Constraint | Begründung |
|------------|------------|
| `sumEquals = 1.0` | Verhindert Fehlkonfigurationen, Scores bleiben vergleichbar |
| `min: 0, max: 1` | Alle Werte normalisiert, einfache Interpretation |
| `required: all` | Keine optionalen Weights – explizite Konfiguration |

### 1.2 Beispiel-Konfiguration (Produktiv-Default)

```json
{
  "scoring": {
    "weights": {
      "revenue": 0.35,
      "capacityUtilization": 0.20,
      "priority": 0.10,
      "risk": 0.10,
      "serviceLevel": 0.15,
      "co2": 0.10
    },
    "constraints": {
      "sumEquals": 1.0
    }
  }
}
```

**Validierung:**
```
0.35 + 0.20 + 0.10 + 0.10 + 0.15 + 0.10 = 1.00 ✓
```

### 1.3 Config-Profile (Vollständig)

#### Profil: `revenue_focused` (Default)
```json
{
  "profileId": "revenue_focused",
  "profileName": "Revenue-Fokus",
  "isDefault": true,
  "scoring": {
    "weights": {
      "revenue": 0.35,
      "capacityUtilization": 0.20,
      "priority": 0.10,
      "risk": 0.10,
      "serviceLevel": 0.15,
      "co2": 0.10
    },
    "constraints": { "sumEquals": 1.0 }
  }
}
```

#### Profil: `premium_customers`
```json
{
  "profileId": "premium_customers",
  "profileName": "Premium-Kunden Priorisierung",
  "isDefault": false,
  "scoring": {
    "weights": {
      "revenue": 0.25,
      "capacityUtilization": 0.15,
      "priority": 0.15,
      "risk": 0.10,
      "serviceLevel": 0.25,
      "co2": 0.10
    },
    "constraints": { "sumEquals": 1.0 }
  }
}
```

#### Profil: `sustainability`
```json
{
  "profileId": "sustainability",
  "profileName": "Nachhaltigkeits-Fokus",
  "isDefault": false,
  "scoring": {
    "weights": {
      "revenue": 0.25,
      "capacityUtilization": 0.15,
      "priority": 0.10,
      "risk": 0.10,
      "serviceLevel": 0.10,
      "co2": 0.30
    },
    "constraints": { "sumEquals": 1.0 }
  }
}
```

#### Profil: `risk_averse`
```json
{
  "profileId": "risk_averse",
  "profileName": "Risikominimierung",
  "isDefault": false,
  "scoring": {
    "weights": {
      "revenue": 0.25,
      "capacityUtilization": 0.15,
      "priority": 0.10,
      "risk": 0.25,
      "serviceLevel": 0.15,
      "co2": 0.10
    },
    "constraints": { "sumEquals": 1.0 }
  }
}
```

---

## 2. Rechenbeispiel – 3 Aufträge im Vergleich

### 2.1 Szenario-Basis

**Tour T123 – Verfügbare Kapazität:**

| Parameter | Wert |
|-----------|------|
| Freies Volumen | 6 m³ |
| Freie Paletten | 4 |
| Freies Gewicht | 2.800 kg |
| Max. akzeptabler Umweg | 15 km |

**Aktives Profil:** `revenue_focused`

| Weight | Wert |
|--------|------|
| w₁ Revenue | 0.35 |
| w₂ CapacityUtilization | 0.20 |
| w₃ Priority | 0.10 |
| w₄ Risk | 0.10 |
| w₅ ServiceLevel | 0.15 |
| w₆ CO₂ | 0.10 |

### 2.2 Auftrag A – „Premium-Kunde, kleiner Umweg"

**Eingabewerte:**

| Parameter | Wert |
|-----------|------|
| Preis | 180 € |
| Volumen | 2 m³ |
| Paletten | 1 |
| Umweg | 6 km |
| Risiko | 0.9 (sehr zuverlässig) |
| Servicelevel | 1.0 (Premium) |
| CO₂-Score | 0.8 (gute Rückladung) |

**Score-Berechnung:**

```
RevenueScore = 180 / (6 + 1) = 25.71

CapacityUtilizationScore = 2 / 6 = 0.33

PriorityScore = 1.0 (Premium-Kunde)

RiskScore = 0.9

ServiceLevelScore = 1.0

CO₂Score = 0.8
```

**Gesamt-Score:**

```
Score_A = 0.35 × 25.71  +  0.20 × 0.33  +  0.10 × 1.0  +  0.10 × 0.9  +  0.15 × 1.0  +  0.10 × 0.8

       = 9.00          +  0.07          +  0.10        +  0.09        +  0.15        +  0.08

       = 9.49
```

---

### 2.3 Auftrag B – „Hoher Preis, aber großer Umweg"

**Eingabewerte:**

| Parameter | Wert |
|-----------|------|
| Preis | 260 € |
| Volumen | 3 m³ |
| Paletten | 2 |
| Umweg | 14 km |
| Risiko | 0.7 (moderat) |
| Servicelevel | 0.5 (Standard) |
| CO₂-Score | 0.4 (keine gute Rückladung) |

**Score-Berechnung:**

```
RevenueScore = 260 / (14 + 1) = 17.33

CapacityUtilizationScore = 3 / 6 = 0.50

PriorityScore = 0.5 (Standard-Kunde)

RiskScore = 0.7

ServiceLevelScore = 0.5

CO₂Score = 0.4
```

**Gesamt-Score:**

```
Score_B = 0.35 × 17.33  +  0.20 × 0.50  +  0.10 × 0.5  +  0.10 × 0.7  +  0.15 × 0.5  +  0.10 × 0.4

       = 6.07           +  0.10         +  0.05        +  0.07        +  0.075        +  0.04

       = 6.40
```

---

### 2.4 Auftrag C – „Günstig, aber perfekter Fit"

**Eingabewerte:**

| Parameter | Wert |
|-----------|------|
| Preis | 90 € |
| Volumen | 1 m³ |
| Paletten | 1 |
| Umweg | 3 km |
| Risiko | 1.0 (neuer Kunde, sauber) |
| Servicelevel | 0.3 (niedrige Priorität) |
| CO₂-Score | 1.0 (perfekte Rückladung) |

**Score-Berechnung:**

```
RevenueScore = 90 / (3 + 1) = 22.50

CapacityUtilizationScore = 1 / 6 = 0.17

PriorityScore = 0.5 (Standard-Kunde)

RiskScore = 1.0

ServiceLevelScore = 0.3

CO₂Score = 1.0
```

**Gesamt-Score:**

```
Score_C = 0.35 × 22.50  +  0.20 × 0.17  +  0.10 × 0.5  +  0.10 × 1.0  +  0.15 × 0.3  +  0.10 × 1.0

       = 7.88           +  0.03         +  0.05        +  0.10        +  0.045        +  0.10

       = 8.20
```

---

## 3. Ergebnis – Ranking & Empfehlung

### 3.1 Score-Übersicht

| Auftrag | Score | Revenue | Risk | ServiceLevel | CO₂ | Empfehlung |
|---------|-------|---------|------|--------------|-----|------------|
| **A** | **9.49** | 180 € | 0.9 | 1.0 | 0.8 | 🥇 **Top-Vorschlag** |
| **C** | **8.20** | 90 € | 1.0 | 0.3 | 1.0 | 🥈 Sehr gut, CO₂-optimal |
| **B** | **6.40** | 260 € | 0.7 | 0.5 | 0.4 | 🥉 Nur wenn Kapazität sonst verfällt |

### 3.2 Analyse

**Auftrag A (Score: 9.49)**
- Premium-Kunde mit hohem Servicelevel
- Gute Risikobewertung (0.9)
- Ausgewogener Umweg (6 km)
- Deutlich beste Option

**Auftrag C (Score: 8.20)**
- Höchster CO₂-Score (1.0) – perfekte Rückladung
- Geringster Preis (90 €), aber sehr effizient
- Beste Option für Nachhaltigkeits-Ziele

**Auftrag B (Score: 6.40)**
- Höchster Preis (260 €), aber großer Umweg (14 km)
- Niedriger CO₂-Score (0.4)
- Nur sinnvoll bei akuter Kapazitätsnot

### 3.3 Dispatcher-UI – Score-Aufschlüsselung

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SUGGESTION RANKING – Tour T123                          Profile: rev   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  🥇 A – Premium-Kunde                                    Score: 9.49    │
│  ├─ Revenue:      ████████████████████░░░░  0.35 × 25.71 = 9.00        │
│  ├─ Capacity:     █░░░░░░░░░░░░░░░░░░░░░░░  0.20 × 0.33  = 0.07        │
│  ├─ Priority:     ████████████████████████  0.10 × 1.00  = 0.10        │
│  ├─ Risk:         ███████████████████░░░░░  0.10 × 0.90  = 0.09        │
│  ├─ ServiceLevel: ████████████████████████  0.15 × 1.00  = 0.15        │
│  └─ CO₂:          ████████████████░░░░░░░░  0.10 × 0.80  = 0.08        │
│                                                                         │
│  🥈 C – Perfekter Fit (CO₂)                              Score: 8.20    │
│  ├─ Revenue:      ███████████████████░░░░░  0.35 × 22.50 = 7.88        │
│  ├─ Capacity:     ░░░░░░░░░░░░░░░░░░░░░░░░  0.20 × 0.17  = 0.03        │
│  ├─ Priority:     ██████████░░░░░░░░░░░░░░  0.10 × 0.50  = 0.05        │
│  ├─ Risk:         ████████████████████████  0.10 × 1.00  = 0.10        │
│  ├─ ServiceLevel: ██████░░░░░░░░░░░░░░░░░░  0.15 × 0.30  = 0.05        │
│  └─ CO₂:          ████████████████████████  0.10 × 1.00  = 0.10        │
│                                                                         │
│  🥉 B – Hoher Preis, großer Umweg                        Score: 6.40    │
│  ├─ Revenue:      ███████████████░░░░░░░░░  0.35 × 17.33 = 6.07        │
│  ├─ Capacity:     ██████████░░░░░░░░░░░░░░  0.20 × 0.50  = 0.10        │
│  ├─ Priority:     ██████████░░░░░░░░░░░░░░  0.10 × 0.50  = 0.05        │
│  ├─ Risk:         ██████████████░░░░░░░░░░  0.10 × 0.70  = 0.07        │
│  ├─ ServiceLevel: ██████████░░░░░░░░░░░░░░  0.15 × 0.50  = 0.08        │
│  └─ CO₂:          ████████░░░░░░░░░░░░░░░░  0.10 × 0.40  = 0.04        │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  [A akzeptieren]  [C akzeptieren]  [B akzeptieren]  [Alle ablehnen]    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementierungs-Code

### 4.1 Scoring Engine mit Config-Integration

```python
from dataclasses import dataclass
from typing import Dict, Optional
import json

@dataclass
class ScoringWeights:
    revenue: float
    capacity_utilization: float
    priority: float
    risk: float
    service_level: float
    co2: float
    
    def validate(self) -> bool:
        """Validiert, dass Summe der Weights = 1.0"""
        total = (self.revenue + self.capacity_utilization + 
                 self.priority + self.risk + self.service_level + self.co2)
        return abs(total - 1.0) < 0.001


@dataclass
class OrderCandidate:
    order_id: str
    price: float
    volume_m3: float
    pallets: int
    detour_km: float
    risk_score: float
    service_level_score: float
    co2_score: float
    priority_score: float


@dataclass
class TourCapacity:
    volume_free_m3: float
    weight_free_kg: float
    pallets_free: int
    max_detour_km: float


class ScoringEngine:
    """
    Berechnet gewichtete Scores für OrderCandidates.
    
    Konfiguration erfolgt über JSON-Config (Security-Config-Service).
    """
    
    def __init__(self, config_path: str = "/config/scoring-weights.json"):
        self.weights = self._load_config(config_path)
        
    def _load_config(self, path: str) -> ScoringWeights:
        """Lädt Weights aus JSON-Config."""
        with open(path, 'r') as f:
            config = json.load(f)
        
        weights = ScoringWeights(
            revenue=config["scoring"]["weights"]["revenue"],
            capacity_utilization=config["scoring"]["weights"]["capacityUtilization"],
            priority=config["scoring"]["weights"]["priority"],
            risk=config["scoring"]["weights"]["risk"],
            service_level=config["scoring"]["weights"]["serviceLevel"],
            co2=config["scoring"]["weights"]["co2"]
        )
        
        if not weights.validate():
            raise ValueError(f"Invalid weights: sum must equal 1.0")
        
        return weights
    
    def calculate_score(
        self, 
        order: OrderCandidate, 
        capacity: TourCapacity
    ) -> float:
        """
        Berechnet Gesamt-Score für einen OrderCandidate.
        
        Formel:
        Score = Σ(wᵢ × scoreᵢ)
        """
        # Einzelne Score-Komponenten
        revenue_score = self._calc_revenue_score(order, capacity)
        capacity_score = self._calc_capacity_score(order, capacity)
        
        # Gewichteter Gesamt-Score
        total = (
            self.weights.revenue * revenue_score +
            self.weights.capacity_utilization * capacity_score +
            self.weights.priority * order.priority_score +
            self.weights.risk * order.risk_score +
            self.weights.service_level * order.service_level_score +
            self.weights.co2 * order.co2_score
        )
        
        return round(total, 2)
    
    def _calc_revenue_score(
        self, 
        order: OrderCandidate, 
        capacity: TourCapacity
    ) -> float:
        """
        Revenue normalisiert auf Detour.
        Höherer Score = bessere Revenue/Detour-Ratio.
        """
        return order.price / (order.detour_km + 1)
    
    def _calc_capacity_score(
        self, 
        order: OrderCandidate, 
        capacity: TourCapacity
    ) -> float:
        """
        Kapazitätsauslastung.
        Höherer Score = bessere Auslastung der freien Kapazität.
        """
        volume_ratio = order.volume_m3 / capacity.volume_free_m3
        return min(1.0, volume_ratio)
    
    def explain_score(
        self, 
        order: OrderCandidate, 
        capacity: TourCapacity
    ) -> Dict:
        """
        Liefert detaillierte Score-Aufschlüsselung für UI.
        """
        revenue_score = self._calc_revenue_score(order, capacity)
        capacity_score = self._calc_capacity_score(order, capacity)
        
        return {
            "total": self.calculate_score(order, capacity),
            "components": {
                "revenue": {
                    "raw_score": revenue_score,
                    "weight": self.weights.revenue,
                    "contribution": round(self.weights.revenue * revenue_score, 2)
                },
                "capacityUtilization": {
                    "raw_score": capacity_score,
                    "weight": self.weights.capacity_utilization,
                    "contribution": round(self.weights.capacity_utilization * capacity_score, 2)
                },
                "priority": {
                    "raw_score": order.priority_score,
                    "weight": self.weights.priority,
                    "contribution": round(self.weights.priority * order.priority_score, 2)
                },
                "risk": {
                    "raw_score": order.risk_score,
                    "weight": self.weights.risk,
                    "contribution": round(self.weights.risk * order.risk_score, 2)
                },
                "serviceLevel": {
                    "raw_score": order.service_level_score,
                    "weight": self.weights.service_level,
                    "contribution": round(self.weights.service_level * order.service_level_score, 2)
                },
                "co2": {
                    "raw_score": order.co2_score,
                    "weight": self.weights.co2,
                    "contribution": round(self.weights.co2 * order.co2_score, 2)
                }
            }
        }
```

### 4.2 Beispiel-Verwendung

```python
# Kapazität der Tour
capacity = TourCapacity(
    volume_free_m3=6.0,
    weight_free_kg=2800,
    pallets_free=4,
    max_detour_km=15
)

# Auftrag A – Premium-Kunde
order_a = OrderCandidate(
    order_id="ORD_A",
    price=180.0,
    volume_m3=2.0,
    pallets=1,
    detour_km=6,
    risk_score=0.9,
    service_level_score=1.0,
    co2_score=0.8,
    priority_score=1.0
)

# Scoring Engine initialisieren
engine = ScoringEngine("/config/scoring-weights.json")

# Score berechnen
score_a = engine.calculate_score(order_a, capacity)
# Ergebnis: 9.49

# Detaillierte Aufschlüsselung
explanation = engine.explain_score(order_a, capacity)
print(json.dumps(explanation, indent=2))
```

---

## 5. API-Integration

### 5.1 Config-Endpoint

```http
GET /api/v1/config/scoring-weights

Response 200:
{
  "profileId": "revenue_focused",
  "profileName": "Revenue-Fokus",
  "weights": {
    "revenue": 0.35,
    "capacityUtilization": 0.20,
    "priority": 0.10,
    "risk": 0.10,
    "serviceLevel": 0.15,
    "co2": 0.10
  },
  "constraints": {
    "sumEquals": 1.0
  },
  "lastModified": "2025-04-15T10:30:00Z",
  "modifiedBy": "admin@cargobit.io"
}
```

### 5.2 Score-Explanation-Endpoint

```http
GET /api/v1/tours/{tourId}/suggestions/{suggestionId}/score-explanation

Response 200:
{
  "suggestionId": "SUG_001",
  "orderId": "ORD_A",
  "tourId": "T123",
  "profileId": "revenue_focused",
  "totalScore": 9.49,
  "components": {
    "revenue": {
      "rawScore": 25.71,
      "weight": 0.35,
      "contribution": 9.00,
      "description": "180€ / (6km + 1)"
    },
    "capacityUtilization": {
      "rawScore": 0.33,
      "weight": 0.20,
      "contribution": 0.07,
      "description": "2m³ / 6m³"
    },
    "priority": {
      "rawScore": 1.0,
      "weight": 0.10,
      "contribution": 0.10,
      "description": "Premium-Kunde"
    },
    "risk": {
      "rawScore": 0.9,
      "weight": 0.10,
      "contribution": 0.09,
      "description": "Sehr zuverlässig"
    },
    "serviceLevel": {
      "rawScore": 1.0,
      "weight": 0.15,
      "contribution": 0.15,
      "description": "Premium-SLA"
    },
    "co2": {
      "rawScore": 0.8,
      "weight": 0.10,
      "contribution": 0.08,
      "description": "Gute Rückladung"
    }
  }
}
```

---

## 6. Zusammenfassung

| Komponente | Status | Speicherort |
|------------|--------|-------------|
| JSON-Schema | ✅ Definiert | `/schemas/scoring-config.json` |
| Beispiel-Config | ✅ Validiert | `/config/scoring-weights.json` |
| Profile (4x) | ✅ Konfiguriert | Config-Service |
| Rechenbeispiel (3 Orders) | ✅ Dokumentiert | Dieses Dokument |
| Python-Implementierung | ✅ Bereit | `scoring_engine.py` |

**Validierung der Berechnungen:**

| Auftrag | Score (Manuell) | Score (Code) | Status |
|---------|-----------------|--------------|--------|
| A | 9.49 | 9.49 | ✅ |
| B | 6.40 | 6.40 | ✅ |
| C | 8.20 | 8.20 | ✅ |

**Nächste Schritte:**
1. Config-Service mit JSON-Schema-Validierung deployen
2. Scoring Engine in Suggestion-Service integrieren
3. Score-Explanation-UI im Dispatcher-Dashboard implementieren
