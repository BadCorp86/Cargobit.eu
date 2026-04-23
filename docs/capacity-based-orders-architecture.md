# Architektur für Kapazitätsbasierte Zusatzaufträge

> **CargoBit Transport Platform** — Capacity-Aware Order Matching
>
> *Technische Spezifikation für intelligente Tourenauslastung*

---

## Übersicht

Dieses Dokument beschreibt die Architektur für kapazitätsbasierte Zusatzaufträge – ein System, das freie Laderaum-Kapazitäten in Echtzeit erkennt und passende Zusatzaufträge vorschlägt.

### Kernziele

| Ziel | Metrik |
|------|--------|
| Tourenauslastung erhöhen | +10-20% Umsatz pro Tour |
| Leerkilometer reduzieren | -15% Leerfahrten |
| CO₂-Effizienz verbessern | -10% Emissionen pro Tour |
| Fahrerzufriedenheit steigern | Sinnvollere Touren |

---

## 1. High-Level Architektur

### 1.1 System-Komponenten

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    CAPACITY-AWARE ORDER MATCHING SYSTEM                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐                        ┌─────────────────┐             │
│  │   DRIVER APP    │                        │  DISPATCHER UI  │             │
│  │  (Mobile)       │                        │  (Web)          │             │
│  │                 │                        │                 │             │
│  │ • Foto-Upload   │                        │ • Tour-Übersicht│             │
│  │ • Telematik     │                        │ • Kapazitäts-   │             │
│  │ • Push-Notif.   │                        │   Dashboard     │             │
│  │ • Vorschläge    │                        │ • Zuweisung     │             │
│  └────────┬────────┘                        └────────┬────────┘             │
│           │                                          │                       │
│           │         ┌─────────────────────────────────┘                      │
│           │         │                                                        │
│           ▼         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        API GATEWAY                                   │   │
│  │  • Auth & Rate Limiting  • Request Routing  • API Versioning        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│           ┌──────────────────────────┼──────────────────────────┐           │
│           │                          │                          │           │
│           ▼                          ▼                          ▼           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ UPLOAD & VISION │    │ CAPACITY ENGINE │    │ MATCHING ENGINE │         │
│  │    SERVICE      │    │                 │    │                 │         │
│  │                 │    │ • V_free calc   │    │ • Order-Pool    │         │
│  │ • Bild-Upload   │    │ • G_free calc   │    │ • Route-Match   │         │
│  │ • Vision API    │    │ • P_free calc   │    │ • Score & Rank  │         │
│  │ • Laderaum-     │    │ • Vision-       │    │ • Constraints   │         │
│  │   Erkennung     │    │   Abgleich      │    │                 │         │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘         │
│           │                      │                      │                   │
│           └──────────────────────┼──────────────────────┘                   │
│                                  │                                          │
│           ┌──────────────────────┼──────────────────────┐                   │
│           │                      │                      │                   │
│           ▼                      ▼                      ▼                   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ ROUTING ENGINE  │    │ PRICING ENGINE  │    │NOTIFICATION SVC │         │
│  │                 │    │                 │    │                 │         │
│  │ • Route-Compute │    │ • Umweg-Kosten  │    │ • Push (Driver) │         │
│  │ • Zeitfenster   │    │ • Marge-Calc    │    │ • Tasks (Disp.) │         │
│  │ • Servicezeiten │    │ • Profit-Check  │    │ • Alerts        │         │
│  │ • Detour-Check  │    │                 │    │                 │         │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘         │
│           │                      │                      │                   │
│           └──────────────────────┼──────────────────────┘                   │
│                                  │                                          │
│                                  ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        ORDER / LOAD POOL                             │   │
│  │                                                                      │   │
│  │  • Offene Aufträge mit Start/Ende, Volumen, Gewicht, Zeitfenster    │   │
│  │  • Spot-Markt Integration  • Rückladungen  • Teilladungen           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        EVENT BUS (Kafka)                             │   │
│  │  capacity-updates | route-changes | order-matches | notifications    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.2 Komponenten-Beschreibung

#### Driver App / Telematik

| Feature | Beschreibung |
|---------|--------------|
| Foto-Upload | Laderaum-Fotos für Vision-Analyse |
| Telematik-Integration | GPS, Gewicht, Volumen, Paletten |
| Tour-Kontext | Aktueller Stopp, Route, ETA |
| Push-Benachrichtigungen | Vorschläge, Updates, Bestätigungen |

#### Dispatcher UI

| Feature | Beschreibung |
|---------|--------------|
| Tour-Übersicht | Alle laufenden Touren mit Kapazitäten |
| Kapazitäts-Dashboard | Freie Kapazität je Segment/Tour |
| Vorschlags-Panel | Matching-Aufträge mit Filteroptionen |
| Zuweisungs-Workflow | Manuelle und automatische Zuweisung |

#### Upload & Vision Service

| Feature | Beschreibung |
|---------|--------------|
| Bild-Verarbeitung | Annahme und Validierung von Uploads |
| Vision API Integration | Laderaum-Erkennung (belegte/freie Fläche) |
| Objekterkennung | Paletten, Kollis, Kartons identifizieren |
| Konfidenz-Scoring | Qualität der Erkennung bewerten |

#### Capacity Engine

| Feature | Beschreibung |
|---------|--------------|
| Kapazitätsberechnung | V_free, G_free, P_free |
| Vision-Abgleich | Diskrepanzen erkennen, Flags setzen |
| Segmentierung | Kapazität je Routen-Segment |
| Aggregation | Tour-Gesamtkapazität |

#### Routing Engine

| Feature | Beschreibung |
|---------|--------------|
| Route-Computation | Aktuelle Route + mögliche Abzweigungen |
| Zeitfenster-Check | Delivery Windows, Servicezeiten |
| Detour-Calculation | Umweg in km und Zeit |
| Constraint-Check | Max. Umweg, Pausenzeiten |

#### Matching Engine (Capacity-Aware)

| Feature | Beschreibung |
|---------|--------------|
| Order-Pool-Scan | Passende Aufträge identifizieren |
| Route-Matching | Aufträge entlang der Route |
| Multi-Kriterium-Scoring | Kapazität + Umweg + Marge + Zeitfenster |
| Ranking | Beste Vorschläge priorisieren |

#### Pricing / Profitability Engine

| Feature | Beschreibung |
|---------|--------------|
| Umweg-Kosten | Treibstoff, Zeit, Fahrer |
| Marge-Berechnung | Umsatz - Kosten |
| Profit-Check | Wirtschaftlichkeit bewerten |
| Preisvorschlag | Akzeptable Preisspanne |

#### Notification Service

| Feature | Beschreibung |
|---------|--------------|
| Driver Push | Mobile Push-Notifications |
| Dispatcher Tasks | In-App Tasks und Alerts |
| Event-Streaming | Real-time Updates über WebSocket |
| Audit-Trail | Alle Benachrichtigungen protokolliert |

---

### 1.3 Datenflüsse

#### Flow A: Kapazität aktualisieren (Fahrer-initiiert)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLOW A: KAPAZITÄT AKTUALISIEREN                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Fahrer öffnet "Laderaum aktualisieren" in App                          │
│     │                                                                       │
│     ▼                                                                       │
│  2. Foto aufnehmen + Tour-Kontext erfassen                                 │
│     │                                                                       │
│     ▼                                                                       │
│  3. Upload an Upload-Service                                                │
│     POST /api/v1/capacity/upload                                           │
│     { image: base64, tourId, stopId, timestamp }                           │
│     │                                                                       │
│     ▼                                                                       │
│  4. Vision-Service analysiert Bild                                         │
│     → Erkennt freie/ belegte Fläche                                        │
│     → Schätzt V_free_vision                                                │
│     → Zählt erkannte Paletten/Kollis                                       │
│     │                                                                       │
│     ▼                                                                       │
│  5. Capacity-Engine berechnet freie Kapazität                              │
│     → V_free = V_max - V_used                                              │
│     → G_free = G_max - G_used                                              │
│     → P_free = P_max - P_used                                              │
│     → Vision-Abgleich mit Confidence                                       │
│     │                                                                       │
│     ▼                                                                       │
│  6. Event: capacity-updated                                                │
│     Kafka: capacity-updates topic                                          │
│     │                                                                       │
│     ▼                                                                       │
│  7. Matching-Engine triggert Matching                                      │
│     → Sucht passende Aufträge im Pool                                      │
│     → Berücksichtigt Route + Zeitfenster                                   │
│     │                                                                       │
│     ▼                                                                       │
│  8. Vorschläge an Fahrer & Dispatcher                                      │
│     Push an Fahrer, Task an Dispatcher                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Flow B: Zusatzauftrag vorschlagen (System-initiiert)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLOW B: ZUSATZAUFTRAG VORSCHLAGEN                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Neuer Auftrag im Order-Pool                                            │
│     → Event: order-added                                                   │
│     │                                                                       │
│     ▼                                                                       │
│  2. Matching-Engine sucht passende Touren                                  │
│     → Scan aller aktiven Touren mit freier Kapazität                       │
│     → Filter: Volumen, Gewicht, Zeitfenster, Richtung                      │
│     │                                                                       │
│     ▼                                                                       │
│  3. Routing-Engine berechnet Detour                                        │
│     → Abzweigung von Route                                                 │
│     → Zeitlicher Aufwand                                                   │
│     → Km-Umweg                                                             │
│     │                                                                       │
│     ▼                                                                       │
│  4. Pricing-Engine bewertet Wirtschaftlichkeit                             │
│     → Zusatzumsatz                                                         │
│     → Umwegkosten                                                          │
│     → Marge                                                                │
│     │                                                                       │
│     ▼                                                                       │
│  5. Score & Rank Vorschläge                                                │
│     → Multi-Kriterium Ranking                                              │
│     → Top-K Vorschläge selektieren                                         │
│     │                                                                       │
│     ▼                                                                       │
│  6. Vorschlag an Dispatcher & Fahrer                                       │
│     → Dispatcher: Task in UI                                               │
│     → Fahrer: Push-Notification                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Flow C: Zusatzauftrag annehmen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLOW C: ZUSATZAUFTRAG ANNEHMEN                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Entscheidung durch Fahrer oder Dispatcher                              │
│     │                                                                       │
│     ├─► Fahrer: "Annehmen" in App                                          │
│     │   POST /api/v1/matching/{matchId}/accept                             │
│     │                                                                       │
│     └─► Dispatcher: "Zu Tour hinzufügen" in UI                             │
│         POST /api/v1/dispatch/tours/{tourId}/orders/{orderId}              │
│                                                                             │
│     │                                                                       │
│     ▼                                                                       │
│  2. Validierung (System)                                                    │
│     → Kapazität noch verfügbar?                                            │
│     → Zeitfenster noch offen?                                              │
│     → Auftrag nicht bereits vergeben?                                      │
│     │                                                                       │
│     ▼                                                                       │
│  3. Routing-Engine aktualisiert Route                                      │
│     → Neuer Stopp eingefügt                                                │
│     → ETA neu berechnet                                                    │
│     → Folge-Stopps angepasst                                               │
│     │                                                                       │
│     ▼                                                                       │
│  4. Capacity-Engine aktualisiert Kapazität                                 │
│     → V_free, G_free, P_free neu berechnet                                 │
│     → Segment-Kapazitäten angepasst                                        │
│     │                                                                       │
│     ▼                                                                       │
│  5. Events & Notifications                                                  │
│     → order-assigned Event                                                 │
│     → Tour-Update an Fahrer (Push)                                         │
│     → Tour-Update in Dispatcher UI                                         │
│     → Bestätigung an Kunde (optional)                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Algorithmus für Kapazitätsberechnung

### 2.1 Eingabe-Daten

#### Fahrzeug-Stammdaten

```
┌─────────────────────────────────────────────────────────────┐
│                    VEHICLE MASTER DATA                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  V_max    = Maximales Ladevolumen (m³)                     │
│  G_max    = Maximales Gesamtgewicht (kg)                   │
│  P_max    = Maximale Palettenplätze                        │
│  L_max    = Maximale Ladelänge (m)                         │
│  B_max    = Maximale Ladbreite (m)                         │
│  H_max    = Maximale Ladehöhe (m)                          │
│                                                             │
│  Beispiel: 7.5t LKW                                        │
│  ├── V_max = 25 m³                                         │
│  ├── G_max = 7.500 kg                                      │
│  ├── P_max = 10 Paletten                                   │
│  ├── L_max = 5.0 m                                         │
│  ├── B_max = 2.2 m                                         │
│  └── H_max = 2.3 m                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Aktuelle Ladung

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT LOAD DATA                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  V_used   = Summe Volumen geladener Sendungen (m³)         │
│  G_used   = Summe Gewicht geladener Sendungen (kg)         │
│  P_used   = Belegte Palettenplätze                         │
│                                                             │
│  Berechnung aus:                                            │
│  ├── Auftragsdaten (ausgelieferte vs. verbleibende)        │
│  ├── Telematik-Daten (Gewichtssensoren)                    │
│  └── Fahrer-Eingabe (manuelle Korrektur)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Vision-Output (Optional)

```
┌─────────────────────────────────────────────────────────────┐
│                    VISION ANALYSIS OUTPUT                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  V_free_vision  = Geschätzter freier Volumenanteil (m³)    │
│  P_detected     = Erkannte Paletten/Kollis (Anzahl)        │
│  confidence     = Konfidenz der Erkennung (0-1)            │
│  regions        = Erkannte freie Bereiche (Bounding Boxes) │
│                                                             │
│  Beispiel-Output:                                           │
│  {                                                          │
│    "free_volume_estimate": 7.2,                            │
│    "detected_pallets": 6,                                  │
│    "confidence": 0.87,                                     │
│    "regions": [                                            │
│      {"x": 0, "y": 0.5, "w": 0.3, "h": 0.5},              │
│      {"x": 0.7, "y": 0, "w": 0.3, "h": 1.0}               │
│    ]                                                        │
│  }                                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.2 Berechnungsformeln

#### Grundlegende Kapazitätsberechnung

```
┌─────────────────────────────────────────────────────────────┐
│              BASIC CAPACITY CALCULATION                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Freies Volumen:                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  V_free = V_max - V_used                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Freies Gewicht:                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  G_free = G_max - G_used                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Freie Palettenplätze:                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  P_free = P_max - P_used                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Auslastung in %:                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Utilization = (V_used / V_max) × 100               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Vision-Abgleich

```
┌─────────────────────────────────────────────────────────────┐
│                    VISION RECONCILIATION                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Diskrepanz erkennen:                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ΔV = |V_free - V_free_vision|                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Threshold für Unsicherheit:                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  If ΔV > Threshold (z.B. 2 m³):                     │   │
│  │      Flag: "Unsicherheit hoch"                      │   │
│  │      Action: Manuelle Bestätigung anfordern         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Finale Kapazität (konservativ):                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  V_free_final = min(V_free, V_free_vision)          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Mit Konfidenz-Gewichtung:                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  V_free_weighted = V_free × (1 - confidence × w)    │   │
│  │                  + V_free_vision × confidence × w   │   │
│  │  // w = Vision-Weight (z.B. 0.7)                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Kapazitäts-Check für Auftrag

```
┌─────────────────────────────────────────────────────────────┐
│               ORDER CAPACITY CHECK                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Eingabe: Auftrag i mit                                     │
│  ├── V_i = Volumen (m³)                                    │
│  ├── G_i = Gewicht (kg)                                    │
│  └── P_i = Paletten (Anzahl)                               │
│                                                             │
│  Prüfung:                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Auftrag i IST PASSEND wenn:                        │   │
│  │                                                     │   │
│  │  V_i ≤ V_free_final     (Volumen OK)               │   │
│  │  AND                                                │   │
│  │  G_i ≤ G_free           (Gewicht OK)               │   │
│  │  AND                                                │   │
│  │  P_i ≤ P_free           (Paletten OK)              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Ergebnis:                                                  │
│  ├── FIT: Auftrag kann geladen werden                      │
│  ├── PARTIAL_FIT: Mit Einschränkungen möglich              │
│  └── NO_FIT: Kapazität nicht ausreichend                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.3 Segment-basierte Kapazität

Für Touren mit mehreren Stopps wird die Kapazität je Segment berechnet:

```
┌─────────────────────────────────────────────────────────────┐
│               SEGMENT-BASED CAPACITY                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tour mit n Stopps → n-1 Segmente                          │
│                                                             │
│  Beispiel: Tour A → B → C → D                               │
│                                                             │
│  Segment 1: A → B                                          │
│  Segment 2: B → C                                          │
│  Segment 3: C → D                                          │
│                                                             │
│  Kapazität je Segment:                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  V_free[s] = V_max - V_delivered_up_to(s)           │   │
│  │                                                     │   │
│  │  V_delivered_up_to(s) = Summe aller Sendungen,      │   │
│  │                         die bis Segment s ausgeliefert│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Grafik:                                                    │
│                                                             │
│  Kapazität ─────────────────────────────────────────────►   │
│  ▓▓▓▓▓▓▓▓░░░░░░░░░░░░▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░       │
│  │     │           │         │                           │  │
│  │     │           │         └─ D: V_free = max          │  │
│  │     │           └─ C: V_free = 60% (Rückladung!)      │  │
│  │     └─ B: V_free = 30%                                 │  │
│  │     └─ A: V_free = 50% (erste Lieferung)              │  │
│  Start                                                      │
│                                                             │
│  Rückladungen möglich ab C (mehr Kapazität frei)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.4 Implementierung (Pseudocode)

```python
class CapacityEngine:
    """Capacity calculation with vision reconciliation."""
    
    def __init__(self, vehicle_data: VehicleData):
        self.V_max = vehicle_data.max_volume
        self.G_max = vehicle_data.max_weight
        self.P_max = vehicle_data.max_pallets
    
    def calculate_free_capacity(
        self,
        current_load: LoadData,
        vision_result: Optional[VisionResult] = None
    ) -> CapacityResult:
        """Calculate free capacity with optional vision reconciliation."""
        
        # Basic calculation
        V_free = self.V_max - current_load.volume_used
        G_free = self.G_max - current_load.weight_used
        P_free = self.P_max - current_load.pallets_used
        
        # Vision reconciliation if available
        uncertainty_flag = False
        if vision_result:
            V_free, uncertainty_flag = self._reconcile_with_vision(
                V_free, vision_result
            )
        
        return CapacityResult(
            volume_free=V_free,
            weight_free=G_free,
            pallets_free=P_free,
            utilization=current_load.volume_used / self.V_max,
            uncertainty_flag=uncertainty_flag
        )
    
    def _reconcile_with_vision(
        self,
        V_free_calculated: float,
        vision_result: VisionResult
    ) -> Tuple[float, bool]:
        """Reconcile calculated capacity with vision estimate."""
        
        V_free_vision = vision_result.free_volume_estimate
        confidence = vision_result.confidence
        
        # Calculate discrepancy
        discrepancy = abs(V_free_calculated - V_free_vision)
        
        # Threshold check
        UNCERTAINTY_THRESHOLD = 2.0  # m³
        uncertainty_flag = discrepancy > UNCERTAINTY_THRESHOLD
        
        # Conservative estimate
        V_free_final = min(V_free_calculated, V_free_vision)
        
        # Optional: Weight by confidence
        # V_free_final = (V_free_calculated * (1 - confidence * 0.7) +
        #                 V_free_vision * confidence * 0.7)
        
        return V_free_final, uncertainty_flag
    
    def check_order_fit(
        self,
        capacity: CapacityResult,
        order: Order
    ) -> FitResult:
        """Check if an order fits in available capacity."""
        
        volume_fit = order.volume <= capacity.volume_free
        weight_fit = order.weight <= capacity.weight_free
        pallets_fit = order.pallets <= capacity.pallets_free
        
        if volume_fit and weight_fit and pallets_fit:
            return FitResult.FIT
        elif volume_fit or weight_fit or pallets_fit:
            return FitResult.PARTIAL_FIT
        else:
            return FitResult.NO_FIT
    
    def calculate_segment_capacity(
        self,
        tour: Tour,
        deliveries: List[Delivery]
    ) -> List[SegmentCapacity]:
        """Calculate capacity for each tour segment."""
        
        segments = []
        remaining_volume = sum(d.volume for d in deliveries)
        remaining_weight = sum(d.weight for d in deliveries)
        remaining_pallets = sum(d.pallets for d in deliveries)
        
        for i, stop in enumerate(tour.stops[:-1]):
            # Deduct deliveries at this stop
            stop_deliveries = [d for d in deliveries if d.stop_id == stop.id]
            
            for d in stop_deliveries:
                remaining_volume -= d.volume
                remaining_weight -= d.weight
                remaining_pallets -= d.pallets
            
            # Calculate free capacity for next segment
            segments.append(SegmentCapacity(
                segment_id=f"{tour.id}_{i}",
                from_stop=stop,
                to_stop=tour.stops[i + 1],
                volume_free=self.V_max - remaining_volume,
                weight_free=self.G_max - remaining_weight,
                pallets_free=self.P_max - remaining_pallets
            ))
        
        return segments
```

---

## 3. Matching-Algorithmus

### 3.1 Multi-Kriterium Scoring

```
┌─────────────────────────────────────────────────────────────┐
│               MULTI-CRITERION MATCHING SCORE                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Gesamt-Score = w₁×S_capacity + w₂×S_detour + w₃×S_margin  │
│               + w₄×S_time + w₅×S_direction                 │
│                                                             │
│  Gewichte (konfigurierbar):                                 │
│  ├── w₁ = 0.25 (Capacity Fit)                              │
│  ├── w₂ = 0.20 (Detour Penalty)                            │
│  ├── w₃ = 0.30 (Margin/Profit)                             │
│  ├── w₄ = 0.15 (Time Window Fit)                           │
│  └── w₅ = 0.10 (Direction Alignment)                       │
│                                                             │
│  Score-Berechnungen:                                        │
│                                                             │
│  S_capacity:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  = 1.0  wenn perfekt (keine Restriktionen)          │   │
│  │  = 0.7  wenn knapp (≤10% Puffer)                    │   │
│  │  = 0.4  wenn sehr knapp (≤5% Puffer)                │   │
│  │  = 0.0  wenn nicht passend                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  S_detour:                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  = 1.0 - (detour_km / max_detour_km)                │   │
│  │  // max_detour_km = konfigurierbar (z.B. 20 km)     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  S_margin:                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  = margin / max_expected_margin                     │   │
│  │  // Skaliert auf 0-1 basierend auf Erwartung        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  S_time:                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  = 1.0  wenn Zeitfenster perfekt passt              │   │
│  │  = 0.5  wenn Zeitfenster knapp                      │   │
│  │  = 0.0  wenn Zeitfenster verletzt                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  S_direction:                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  = cos(angle) zwischen Tour-Richtung und            │   │
│  │    Auftrags-Richtung                                │   │
│  │  // 1.0 = gleiche Richtung, -1.0 = Gegenrichtung   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Matching-Pipeline

```python
class MatchingEngine:
    """Capacity-aware order matching engine."""
    
    def __init__(self, config: MatchingConfig):
        self.weights = config.weights
        self.max_detour_km = config.max_detour_km
        self.max_detour_min = config.max_detour_min
    
    def find_matches(
        self,
        tour: Tour,
        capacity: CapacityResult,
        segments: List[SegmentCapacity],
        order_pool: List[Order]
    ) -> List[MatchSuggestion]:
        """Find matching orders for a tour with available capacity."""
        
        matches = []
        
        for order in order_pool:
            # Skip if order already assigned
            if order.status != OrderStatus.OPEN:
                continue
            
            # Find best insertion point
            insertion = self._find_best_insertion(
                tour, order, segments
            )
            
            if not insertion:
                continue
            
            # Calculate scores
            scores = self._calculate_scores(
                capacity, order, insertion, tour
            )
            
            # Calculate overall score
            total_score = sum(
                self.weights[i] * scores[i]
                for i in range(len(scores))
            )
            
            if total_score >= self.config.min_score_threshold:
                matches.append(MatchSuggestion(
                    order=order,
                    insertion_point=insertion,
                    scores=scores,
                    total_score=total_score,
                    estimated_profit=insertion.profit
                ))
        
        # Sort by total score descending
        return sorted(matches, key=lambda m: m.total_score, reverse=True)
    
    def _find_best_insertion(
        self,
        tour: Tour,
        order: Order,
        segments: List[SegmentCapacity]
    ) -> Optional[InsertionPoint]:
        """Find the best insertion point for an order."""
        
        best_insertion = None
        best_score = -1
        
        for i, segment in enumerate(segments):
            # Check capacity in this segment
            if not self._fits_in_segment(order, segment):
                continue
            
            # Calculate detour for this insertion
            detour = self._calculate_detour(
                tour.stops[i], 
                order.pickup,
                order.delivery,
                tour.stops[i + 1]
            )
            
            # Check detour constraints
            if detour.km > self.max_detour_km:
                continue
            if detour.time_min > self.max_detour_min:
                continue
            
            # Score this insertion
            insertion_score = self._score_insertion(detour, segment)
            
            if insertion_score > best_score:
                best_score = insertion_score
                best_insertion = InsertionPoint(
                    after_stop_index=i,
                    pickup=order.pickup,
                    delivery=order.delivery,
                    detour_km=detour.km,
                    detour_min=detour.time_min,
                    profit=self._calculate_profit(order, detour)
                )
        
        return best_insertion
    
    def _calculate_profit(
        self,
        order: Order,
        detour: Detour
    ) -> ProfitEstimate:
        """Calculate estimated profit for accepting an order."""
        
        # Revenue from order
        revenue = order.price
        
        # Costs
        fuel_cost = detour.km * self.config.cost_per_km
        driver_cost = (detour.time_min / 60) * self.config.driver_hourly_rate
        handling_cost = self.config.handling_cost_per_order
        
        total_cost = fuel_cost + driver_cost + handling_cost
        
        return ProfitEstimate(
            revenue=revenue,
            costs=total_cost,
            margin=revenue - total_cost,
            margin_percent=(revenue - total_cost) / revenue * 100
        )
```

---

## 4. UI-Flows

### 4.1 Fahrer-Flow (Mobile App)

#### Screen 1: Aktuelle Tour

```
┌────────────────────────────────────────────┐
│  ← Aktuelle Tour                    ⚙️     │
├────────────────────────────────────────────┤
│                                            │
│  ┌────────────────────────────────────┐   │
│  │  🚚 Tour T-2024-0847               │   │
│  │                                    │   │
│  │  Nächster Stopp:                   │   │
│  │  📍 Meyer GmbH, München            │   │
│  │  ETA: 14:30 (in 25 min)            │   │
│  │                                    │   │
│  │  Fortschritt: ████░░░░░░ 3/7       │   │
│  └────────────────────────────────────┘   │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │  📦 Aktuelle Auslastung            │   │
│  │                                    │   │
│  │  Volumen:  ████████████░░ 78%      │   │
│  │  Gewicht:  ██████████░░░░ 65%      │   │
│  │  Paletten: ████████░░░░░░ 6/10     │   │
│  │                                    │   │
│  │  Freie Kapazität:                  │   │
│  │  • 5,5 m³                          │   │
│  │  • 2.625 kg                        │   │
│  │  • 4 Palettenplätze                │   │
│  └────────────────────────────────────┘   │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │  📷 Laderaum aktualisieren         │   │
│  │                                    │   │
│  │  Zuletzt aktualisiert: vor 2 Std.  │   │
│  │                                    │   │
│  │  [   📷 Foto machen   ]            │   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │  💡 Mögliche Zusatzaufträge (2)    │   │
│  │  [   Vorschläge anzeigen   ]       │   │
│  └────────────────────────────────────┘   │
│                                            │
└────────────────────────────────────────────┘
```

#### Screen 2: Foto-Upload

```
┌────────────────────────────────────────────┐
│  ← Laderaum aktualisieren                 │
├────────────────────────────────────────────┤
│                                            │
│  ┌────────────────────────────────────┐   │
│  │                                    │   │
│  │       [ Kamera-Preview ]           │   │
│  │                                    │   │
│  │    ┌────────────────────────┐      │   │
│  │    │                        │      │   │
│  │    │    Laderaum-Foto       │      │   │
│  │    │    aufnehmen           │      │   │
│  │    │                        │      │   │
│  │    │    📷                   │      │   │
│  │    │                        │      │   │
│  │    └────────────────────────┘      │   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │  📝 Optional: Manuelle Eingabe     │   │
│  │                                    │   │
│  │  Freie Paletten:  [    4    ]      │   │
│  │  Freies Volumen:  [  5.5   ] m³    │   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│                                            │
│  Hinweis:                                  │
│  📷 Fotografieren Sie den Laderaum von    │
│     hinten für beste Erkennung            │
│                                            │
│         [    📷 Foto aufnehmen    ]        │
│                                            │
└────────────────────────────────────────────┘
```

#### Screen 3: Foto-Vorschau & Senden

```
┌────────────────────────────────────────────┐
│  ← Foto bestätigen                        │
├────────────────────────────────────────────┤
│                                            │
│  ┌────────────────────────────────────┐   │
│  │                                    │   │
│  │    ┌────────────────────────┐      │   │
│  │    │                        │      │   │
│  │    │   [ Laderaum-Foto ]    │      │   │
│  │    │                        │      │   │
│  │    │   Freie Bereiche       │      │   │
│  │    │   markiert:            │      │   │
│  │    │   ┌──┐    ┌─────┐      │      │   │
│  │    │   │✓ │    │ ✓   │      │      │   │
│  │    │   └──┘    └─────┘      │      │   │
│  │    │                        │      │   │
│  │    └────────────────────────┘      │   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │  🔍 Vision-Analyse läuft...        │   │
│  │                                    │   │
│  │  Erkannt:                          │   │
│  │  • Freies Volumen: ~6,2 m³         │   │
│  │  • Belegte Paletten: 6             │   │
│  │  • Konfidenz: 89%                  │   │
│  │                                    │   │
│  │  ████████████████████░░░░ Laden... │   │
│  └────────────────────────────────────┘   │
│                                            │
│     [  🔄 Neues Foto  ]  [  ✓ Senden  ]   │
│                                            │
└────────────────────────────────────────────┘
```

#### Screen 4: Ergebnis

```
┌────────────────────────────────────────────┐
│  ← Kapazität aktualisiert                 │
├────────────────────────────────────────────┤
│                                            │
│  ┌────────────────────────────────────┐   │
│  │  ✅ Kapazität erfolgreich erfasst  │   │
│  │                                    │   │
│  │  Basierend auf Foto + Auftragsdaten│   │
│  │                                    │   │
│  │  Freie Kapazität:                  │   │
│  │  ┌────────────────────────────┐    │   │
│  │  │ 📦 5,8 m³ Volumen          │    │   │
│  │  │ ⚖️ 2.450 kg Gewicht        │    │   │
│  │  │ 🏷️ 4 Palettenplätze        │    │   │
│  │  └────────────────────────────┘    │   │
│  │                                    │   │
│  │  Auslastung aktualisiert: 70%      │   │
│  │  (vorher: 78%)                     │   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │  💡 Mögliche Zusatzaufträge        │   │
│  │                                    │   │
│  │  Basierend auf Ihrer Route und     │   │
│  │  freien Kapazität gefunden:        │   │
│  │                                    │   │
│  │  3 passende Aufträge verfügbar     │   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│                                            │
│  [   Vorschläge anzeigen (3)   ]          │
│                                            │
│  [   Später   ]                           │
│                                            │
└────────────────────────────────────────────┘
```

#### Screen 5: Vorschläge

```
┌────────────────────────────────────────────┐
│  ← Vorschläge                      Filter  │
├────────────────────────────────────────────┤
│                                            │
│  3 passende Zusatzaufträge                 │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │ 🏆 Top-Vorschlag                   │   │
│  │ ────────────────────────────────   │   │
│  │                                    │   │
│  │ Müller AG → Schmidt KG            │   │
│  │ 📦 2 Paletten, 1,8 m³, 450 kg     │   │
│  │                                    │   │
│  │ ↗️ Umweg: 3,2 km (+8 min)          │   │
│  │ 💰 Zusatzumsatz: 185 €            │   │
│  │ 📊 Marge: 28%                     │   │
│  │                                    │   │
│  │ ⏰ Zeitfenster: 15:00-17:00        │   │
│  │ ✅ Passt in Ihren Zeitplan        │   │
│  │                                    │   │
│  │ [ Annehmen ]  [ Details ]         │   │
│  └────────────────────────────────────┘   │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │ Vorschlag 2                        │   │
│  │ ────────────────────────────────   │   │
│  │                                    │   │
│  │ Weber GmbH → Rückladung            │   │
│  │ 📦 3 Paletten, 2,5 m³, 680 kg     │   │
│  │                                    │   │
│  │ ↗️ Umweg: 5,8 km (+14 min)         │   │
│  │ 💰 Zusatzumsatz: 245 €            │   │
│  │ 📊 Marge: 32%                     │   │
│  │                                    │   │
│  │ ⏰ Zeitfenster: 16:30-18:30        │   │
│  │                                    │   │
│  │ [ Annehmen ]  [ Details ]         │   │
│  └────────────────────────────────────┘   │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │ Vorschlag 3                        │   │
│  │ [...]                              │   │
│  └────────────────────────────────────┘   │
│                                            │
└────────────────────────────────────────────┘
```

#### Screen 6: Bestätigung

```
┌────────────────────────────────────────────┐
│                                           │
│              ✅                            │
│         Auftrag angenommen                 │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │                                    │   │
│  │  Müller AG → Schmidt KG            │   │
│  │                                    │   │
│  │  2 Paletten, 1,8 m³, 450 kg       │   │
│  │  Zusatzumsatz: 185 €              │   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │  🗺️ Route aktualisiert             │   │
│  │                                    │   │
│  │  Neuer Stopp eingefügt:            │   │
│  │                                    │   │
│  │  1. Meyer GmbH (aktuell)           │   │
│  │  2. ➕ Müller AB (Abholung)        │   │
│  │  3. Weber GmbH                     │   │
│  │  4. ➕ Schmidt KG (Lieferung)      │   │
│  │  5. ...                            │   │
│  │                                    │   │
│  │  Neue ETA am Ziel: 17:45          │   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│                                            │
│  [  Route anzeigen  ]  [  OK  ]           │
│                                            │
└────────────────────────────────────────────┘
```

---

### 4.2 Disponenten-Flow (Web UI)

#### Screen 1: Tour-Übersicht

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│  CargoBit Dispatcher                           [🔔 3]  [👤 Max Mustermann]                 │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  Dashboard  │  Touren  │  Aufträge  │  Kapazitäten  │  Reports  │  Einstellungen          │
│                                                                                            │
│  ────────────────────────────────────────────────────────────────────────────────────────  │
│                                                                                            │
│  Touren-Übersicht                                                    [ Filter ] [ + Neu ] │
│                                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│  │ Status    │ Fahrer        │ Route           │ Auslastung │ Freie Kap. │ Vorschläge │ │
│  ├──────────────────────────────────────────────────────────────────────────────────────┤ │
│  │ 🟢 Aktiv  │ Müller, T.    │ München → Augsburg │ ████████░░ 78% │ 5.5m³, 4P │ 💡 2    │ │
│  │ 🟢 Aktiv  │ Schmidt, K.   │ Nürnberg → Regensburg │ ██████████ 95% │ 1.2m³, 1P │ -      │ │
│  │ 🟢 Aktiv  │ Weber, M.     │ Stuttgart → Ulm │ ██████░░░░ 62% │ 9.5m³, 6P │ 💡 5    │ │
│  │ 🟡 Pause  │ Bauer, J.     │ Frankfurt → Würzburg │ ███████░░░ 70% │ 7.5m³, 5P │ 💡 1    │ │
│  │ 🔵 Geplant│ Hoffmann, S.  │ Köln → Bonn     │ ░░░░░░░░░░ 0% │ 25m³, 10P │ -        │ │
│  └──────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              Kapazitäts-Heatmap                                       │ │
│  │                                                                                      │ │
│  │       0-20%    20-40%    40-60%    60-80%    80-100%                                │ │
│  │       ░░░░░    ▒▒▒▒▒    ▓▓▓▓▓    █████    ████                                     │ │
│  │                                                                                      │ │
│  │  München     [████████████████░░░░░░░░] 78%  →  2 Vorschläge                       │ │
│  │  Nürnberg    [██████████████████████░░] 95%  →  Ausgelastet                        │ │
│  │  Stuttgart   [████████████░░░░░░░░░░░░] 62%  →  5 Vorschläge  ★ Top-Potenzial     │ │
│  │  Frankfurt   [██████████████░░░░░░░░░░] 70%  →  1 Vorschlag                        │ │
│  │                                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                            │
│  ┌────────────────────────────────────────────┐  ┌────────────────────────────────────┐  │
│  │  💡 8 Vorschläge für Zuweisung             │  │  📋 Offene Aufträge: 23            │  │
│  │                                            │  │                                    │  │
│  │  Potenzial: +2.450 € Zusatzumsatz          │  │  Nach Kapazität filtern:           │  │
│  │                                            │  │  ○ Alle  ● Passende  ○ Dringende   │  │
│  │  [ Vorschläge anzeigen ]                   │  │                                    │  │
│  └────────────────────────────────────────────┘  └────────────────────────────────────┘  │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Screen 2: Tour-Detail

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│  ← Tour T-2024-0847                              Müller, Thomas    🟢 Aktiv               │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                    🗺️                                                │  │
│  │                              [ Kartenansicht ]                                       │  │
│  │                                                                                      │  │
│  │       München ──────► Augsburg ──────► Ulm                                          │  │
│  │          │            │              │                                              │  │
│  │       Meyer GmbH   Weber AG     Schmidt KG                                          │  │
│  │        (aktuell)    (14:45)      (16:30)                                            │  │
│  │                                                                                      │  │
│  │  ─────────────────────────────────────────────────────────────────────────────────── │  │
│  │  Route: München → Augsburg → Ulm                                                    │  │
│  │  Gesamtstrecke: 180 km  │  Verbleibend: 95 km  │  ETA Ziel: 16:30                   │  │
│  │                                                                                      │  │
│  └─────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                            │
│  ┌──────────────────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │  📊 Zeitachse                        │  │  📦 Kapazität je Segment                 │  │
│  │                                      │  │                                          │  │
│  │  14:00 ────● Meyer GmbH              │  │  Segment          │ Vol. │ Gew. │ Pal. │  │
│  │       │    │ Abholung: 3 Paletten    │  │  ─────────────────┼──────┼──────┼──────│  │
│  │       │    │ Lieferung: 2 Kollis     │  │  München→Augsburg│ 5.5m³│2625kg│  4   │  │
│  │       │                              │  │  Augsburg→Ulm    │ 8.2m³│3420kg│  6   │  │
│  │  14:45 ────● Weber AG                │  │  Nach Ulm        │ 12.0m³│5000kg│  9   │  │
│  │       │    │ Lieferung: 2 Paletten   │  │                                          │  │
│  │       │    │ + Rückladung möglich!   │  │  ★ Rückladung ab Augsburg möglich       │  │
│  │       │                              │  │                                          │  │
│  │  16:30 ────● Schmidt KG              │  └──────────────────────────────────────────┘  │
│  │           │ Lieferung: 1 Palette     │                                                 │
│  │           │                          │  ┌──────────────────────────────────────────┐  │
│  │           └── Tour Ende              │  │  💡 2 Vorschläge verfügbar                │  │
│  │                                      │  │                                          │  │
│  └──────────────────────────────────────┘  │  Potenzial: +430 € Zusatzumsatz           │  │
│                                            │                                          │  │
│                                            │  [ Vorschläge anzeigen ]                  │  │
│                                            │                                          │  │
│                                            └──────────────────────────────────────────┘  │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Screen 3: Vorschlags-Panel

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│  ← Tour T-2024-0847                          Vorschläge für Zusatzaufträge                 │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│  │ Filter:                                                                              │ │
│  │ [ Umweg: ≤10 km ▼ ]  [ Marge: ≥20% ▼ ]  [ Richtung: Alle ▼ ]  [ 🔍 Suchen ]        │ │
│  └──────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                            │
│  Gefunden: 2 passende Aufträge                              Sortierung: [ Marge ▼ ]      │
│                                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│  │ 🏆 Vorschlag 1                                                Marge: 32%            │ │
│  │ ──────────────────────────────────────────────────────────────────────────────────── │ │
│  │                                                                                      │ │
│  │  Auftrag: A-2024-1293                          [ Details ]  [ 👁️ Karte ]            │ │
│  │  Kunde: Weber GmbH → Rückladung                                                     │ │
│  │                                                                                      │ │
│  │  📦 3 Paletten  │  2,5 m³  │  680 kg  │  ⏰ 16:30-18:30                              │ │
│  │                                                                                      │ │
│  │  ↗️ Umweg: 5,8 km (+14 min)           💰 245 € Zusatzumsatz                         │ │
│  │  ✅ Kapazität: Passt genau           📊 32% Marge                                  │ │
│  │  ✅ Zeitfenster: Passt               🎯 Score: 0.87                                │ │
│  │                                                                                      │ │
│  │  [ ✓ Zu Tour hinzufügen ]                                                           │ │
│  │                                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│  │ Vorschlag 2                                                  Marge: 28%              │ │
│  │ ──────────────────────────────────────────────────────────────────────────────────── │ │
│  │                                                                                      │ │
│  │  Auftrag: A-2024-1187                          [ Details ]  [ 👁️ Karte ]            │ │
│  │  Kunde: Müller AG → Schmidt KG                                                      │ │
│  │                                                                                      │ │
│  │  📦 2 Paletten  │  1,8 m³  │  450 kg  │  ⏰ 15:00-17:00                              │ │
│  │                                                                                      │ │
│  │  ↗️ Umweg: 3,2 km (+8 min)            💰 185 € Zusatzumsatz                         │ │
│  │  ✅ Kapazität: Passt gut              📊 28% Marge                                  │ │
│  │  ✅ Zeitfenster: Passt               🎯 Score: 0.82                                │ │
│  │                                                                                      │ │
│  │  [ ✓ Zu Tour hinzufügen ]                                                           │ │
│  │                                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│  │ 📋 Zusammenfassung bei Annahme beider Vorschläge:                                   │ │
│  │                                                                                      │ │
│  │  Zusatzumsatz: +430 €  │  Zusätzlicher Umweg: 9,0 km (+22 min)  │  Marge: 30%       │ │
│  │                                                                                      │ │
│  │  [ Beide hinzufügen ]                                                               │ │
│  │                                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Screen 4: Entscheidung & Bestätigung

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│  ← Auftrag zuweisen                                  Zuordnung bestätigen                 │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                          Zuordnung prüfen                                            │ │
│  │ ──────────────────────────────────────────────────────────────────────────────────── │ │
│  │                                                                                      │ │
│  │  Tour: T-2024-0847 (Müller, Thomas)                                                 │ │
│  │  Auftrag: A-2024-1293 (Weber GmbH Rückladung)                                       │ │
│  │                                                                                      │ │
│  │  ┌────────────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  Kapazitäts-Check                                                              │ │ │
│  │  │  ───────────────────────────────────────────────────────────────────────────── │ │ │
│  │  │                                                                                │ │ │
│  │  │  Benötigt:          Verfügbar:           Status:                               │ │ │
│  │  │  2,5 m³            5,5 m³               ✅ OK                                   │ │ │
│  │  │  680 kg            2.625 kg             ✅ OK                                   │ │ │
│  │  │  3 Paletten        4 Plätze             ✅ OK                                   │ │ │
│  │  │                                                                                │ │ │
│  │  └────────────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                                      │ │
│  │  ┌────────────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  Zeitfenster-Check                                                             │ │ │
│  │  │  ───────────────────────────────────────────────────────────────────────────── │ │ │
│  │  │                                                                                │ │ │
│  │  │  Neuer Stopp: Weber AG (Abholung)                                              │ │ │
│  │  │  ETA: 15:45 - 16:00                                                            │ │ │
│  │  │  Zeitfenster: 16:30-18:30                                                      │ │ │
│  │  │  Status: ✅ Passt                                                               │ │ │
│  │  │                                                                                │ │ │
│  │  │  Neue ETA am Ziel: 17:45 (vorher: 16:30)                                       │ │ │
│  │  │  Verzögerung: +1h 15min                                                        │ │ │
│  │  │                                                                                │ │ │
│  │  └────────────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                                      │ │
│  │  ┌────────────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  Wirtschaftlichkeit                                                            │ │ │
│  │  │  ───────────────────────────────────────────────────────────────────────────── │ │ │
│  │  │                                                                                │ │ │
│  │  │  Zusatzumsatz:    + 245,00 €                                                   │ │ │
│  │  │  Umwegkosten:     -  52,00 €   (5,8 km × 9 €/km)                               │ │ │
│  │  │  Handling:        -  15,00 €                                                   │ │ │
│  │  │  ───────────────────────────────────────────                                   │ │ │
│  │  │  Deckungsbeitrag: + 178,00 €                                                   │ │ │
│  │  │  Marge:           32%                                                          │ │ │
│  │  │                                                                                │ │ │
│  │  └────────────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                                      │ │
│  │         [ Abbrechen ]                    [ ✓ Zuordnung bestätigen ]                 │ │
│  │                                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Screen 5: Bestätigung

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                           │
│                                        ✅                                                 │
│                                                                                            │
│                          Auftrag erfolgreich zugewiesen                                    │
│                                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                                      │ │
│  │  Tour: T-2024-0847                                                                  │ │
│  │  Fahrer: Thomas Müller                                                              │ │
│  │                                                                                      │ │
│  │  Neuer Auftrag hinzugefügt:                                                         │ │
│  │  • A-2024-1293: Weber GmbH Rückladung                                               │ │
│  │  • 3 Paletten, 2,5 m³, 680 kg                                                      │ │
│  │  • +245 € Zusatzumsatz (32% Marge)                                                  │ │
│  │                                                                                      │ │
│  │  Route aktualisiert:                                                                │ │
│  │  München → Augsburg → Weber AG → Ulm → Schmidt KG                                   │ │
│  │                                                                                      │ │
│  │  Neue ETA: 17:45                                                                    │ │
│  │                                                                                      │ │
│  │  ────────────────────────────────────────────────────────────────────────────────   │ │
│  │                                                                                      │ │
│  │  📱 Fahrer wurde benachrichtigt                                                     │ │
│  │  Push-Notification gesendet an: Thomas Müller                                       │ │
│  │                                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                            │
│                    [ Tour anzeigen ]        [ Schließen ]                                 │
│                                                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Business-Case-Modell (ROI)

### 5.1 Grundannahmen

```
┌─────────────────────────────────────────────────────────────┐
│                    BASIS-ANNAHMEN                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Operative Kennzahlen:                                      │
│  ├── Touren pro Tag:              100                      │
│  ├── Durchschnittsumsatz/Tour:    500 €                    │
│  ├── Durchschnittliche Auslastung: 70%                     │
│  └── Arbeitstage/Jahr:            220                      │
│                                                             │
│  Potenzial durch Optimierung:                               │
│  ├── Zusatzumsatz-Potenzial:      +10-20% pro Tour         │
│  └── Marge auf Zusatzaufträge:    25-30%                   │
│                                                             │
│  Implementierungskosten (einmalig):                         │
│  ├── Entwicklung & Integration:   150.000 - 300.000 €      │
│  │   ├── Backend-Services         ~100.000 €               │
│  │   ├── Mobile App Updates       ~50.000 €                │
│  │   ├── Web UI Updates           ~50.000 €                │
│  │   ├── Vision-Integration       ~50.000 €                │
│  │   └── Testing & QA             ~50.000 €                │
│  │                                                          │
│  └── Range:                       150k - 300k €            │
│                                                             │
│  Laufende Kosten (jährlich):                                │
│  ├── Infrastruktur (Cloud):       20.000 - 40.000 €        │
│  ├── Vision API / ML:             15.000 - 30.000 €        │
│  ├── Betrieb & Maintenance:       15.000 - 30.000 €        │
│  └── Range:                       50k - 100k €/Jahr        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 5.2 Beispielrechnung

#### Szenario: Konservativ

```
┌─────────────────────────────────────────────────────────────┐
│              SZENARIO: KONSERVATIV                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Umsatz-Basis:                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  100 Touren/Tag × 500 €/Tour = 50.000 €/Tag         │   │
│  │  50.000 €/Tag × 220 Tage = 11.000.000 €/Jahr        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Zusatzumsatz (konservativ +10%):                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  +10% auf 50.000 €/Tag = +5.000 €/Tag               │   │
│  │  +5.000 €/Tag × 220 Tage = +1.100.000 €/Jahr        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Deckungsbeitrag (25% Marge):                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  1.100.000 € × 25% = 275.000 €/Jahr                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ROI Jahr 1:                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Zusatz-DB:           + 275.000 €                   │   │
│  │  Implementierung:     - 200.000 €  (angenommen)     │   │
│  │  Betriebskosten:      - 75.000 €                    │   │
│  │  ─────────────────────────────────────              │   │
│  │  Netto Jahr 1:        + 0 € (Break-Even)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ROI Jahr 2+:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Zusatz-DB:           + 275.000 €                   │   │
│  │  Betriebskosten:      - 75.000 €                    │   │
│  │  ─────────────────────────────────────              │   │
│  │  Netto Jahr 2+:       + 200.000 €/Jahr              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Payback-Period: ~12 Monate                                 │
│  3-Year ROI: ~475.000 €                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Szenario: Optimistisch

```
┌─────────────────────────────────────────────────────────────┐
│              SZENARIO: OPTIMISTISCH                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Zusatzumsatz (+20%):                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  +20% auf 50.000 €/Day = +10.000 €/Day              │   │
│  │  +10.000 €/Day × 220 Tage = +2.200.000 €/Jahr       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Deckungsbeitrag (30% Marge):                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  2.200.000 € × 30% = 660.000 €/Jahr                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ROI Jahr 1:                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Zusatz-DB:           + 660.000 €                   │   │
│  │  Implementierung:     - 200.000 €                   │   │
│  │  Betriebskosten:      - 75.000 €                    │   │
│  │  ─────────────────────────────────────              │   │
│  │  Netto Jahr 1:        + 385.000 €                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Payback-Period: ~4 Monate                                  │
│  3-Year ROI: ~1.255.000 €                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 5.3 ROI-Zusammenfassung

```
┌─────────────────────────────────────────────────────────────┐
│                    ROI-ZUSAMMENFASSUNG                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    │ Konservativ │ Optimistisch     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Zusatzumsatz/Jahr  │  1.100.000 € │  2.200.000 €    │   │
│  │ Marge              │        25%  │        30%      │   │
│  │ Deckungsbeitrag    │    275.000 €│    660.000 €    │   │
│  │ ─────────────────────────────────────────────────── │   │
│  │ Implementierung    │    200.000 €│    200.000 €    │   │
│  │ Betriebskosten     │     75.000 €│     75.000 €    │   │
│  │ ─────────────────────────────────────────────────── │   │
│  │ Netto Jahr 1       │      0 €    │    385.000 €    │   │
│  │ Netto Jahr 2       │  200.000 €  │    585.000 €    │   │
│  │ Netto Jahr 3       │  200.000 €  │    585.000 €    │   │
│  │ ─────────────────────────────────────────────────── │   │
│  │ 3-Year Total       │  400.000 €  │  1.555.000 €    │   │
│  │ Payback Period     │   12 Mon.   │    4 Mon.       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Durchschnitt (erwartet):                                   │
│  ├── 3-Year ROI: ~975.000 €                                │
│  └── Payback Period: ~8 Monate                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 5.4 Qualitative Effekte

```
┌─────────────────────────────────────────────────────────────┐
│                  QUALITATIVE EFFEKTE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🌍 Nachhaltigkeit & CO₂                                    │
│  ├── Weniger Leerkilometer durch bessere Auslastung        │
│  ├── Reduzierte Emissionen pro transportierter Tonne       │
│  ├── Verbessertes CO₂-Profil für Nachhaltigkeits-Reports   │
│  └── Marketing-Vorteil bei umweltbewussten Kunden          │
│                                                             │
│  👥 Fahrerzufriedenheit                                     │
│  ├── Sinnvollere Touren mit weniger Leerlauf               │
│  ├── Potenziell höhere Verdienstmöglichkeiten              │
│  ├── Bessere Route-Planung reduziert Stress                │
│  └── Geringere Fluktuation, bessere Recruiting-Position    │
│                                                             │
│  😊 Kundenzufriedenheit                                     │
│  ├── Schnellere Verfügbarkeit von Transportkapazität       │
│  ├── Flexiblere Rückladungen und Spot-Aufträge             │
│  ├── Kürzere Response-Zeiten für Ad-hoc-Anfragen           │
│  └── Wettbewerbsvorteil gegenüber statischeren Anbietern   │
│                                                             │
│  📊 Operative Effizienz                                     │
│  ├── Weniger manuelle Disposition durch automatische       │
│  │   Vorschläge                                             │
│  ├── Bessere Planbarkeit durch Kapazitäts-Transparenz      │
│  ├── Reduzierte Fehlentscheidungen durch Datenbasis        │
│  └── Skalierbarkeit ohne proportional mehr Dispatcher       │
│                                                             │
│  🏢 Wettbewerbsfähigkeit                                    │
│  ├── Differenzierung durch Technology-Edge                 │
│  ├── Plattform für weitere Optimierungs-Features           │
│  ├── Datenbasis für ML-basierte Verbesserungen             │
│  └── Attraktiver für Tech-affine Kunden und Partner        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Technische Implementierung

### 6.1 Microservice-Architektur

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    MICROSERVICE ARCHITECTURE                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        KUBERNETES CLUSTER                               ││
│  │                                                                         ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  ││
│  │  │ capacity-svc │  │ matching-svc │  │ routing-svc  │                  ││
│  │  │──────────────│  │──────────────│  │──────────────│                  ││
│  │  │ :8080        │  │ :8080        │  │ :8080        │                  ││
│  │  │ 3 replicas   │  │ 3 replicas   │  │ 2 replicas   │                  ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  ││
│  │                                                                         ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  ││
│  │  │ vision-svc   │  │ pricing-svc  │  │ notify-svc   │                  ││
│  │  │──────────────│  │──────────────│  │──────────────│                  ││
│  │  │ :8080        │  │ :8080        │  │ :8080        │                  ││
│  │  │ 2 replicas   │  │ 2 replicas   │  │ 2 replicas   │                  ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  ││
│  │                                                                         ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  ││
│  │  │ upload-svc   │  │ order-pool   │  │ tour-svc     │                  ││
│  │  │──────────────│  │──────────────│  │──────────────│                  ││
│  │  │ :8080        │  │ :8080        │  │ :8080        │                  ││
│  │  │ 2 replicas   │  │ 3 replicas   │  │ 3 replicas   │                  ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  ││
│  │                                                                         ││
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │                    KAFKA CLUSTER                                 │   ││
│  │  │  Topics: capacity-updates | order-events | match-events          │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  │                                                                         ││
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │                    POSTGRESQL (Primary + Replica)                │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  │                                                                         ││
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │                    REDIS (Cache)                                 │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  │                                                                         ││
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │                    S3 / MINIO (Object Storage)                   │   ││
│  │  │  Bucket: capacity-images                                         │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 API-Endpunkte

```yaml
# API Specification (OpenAPI excerpt)
paths:
  # Capacity Service
  /api/v1/capacity/upload:
    post:
      summary: Upload capacity image
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                image:
                  type: string
                  format: binary
                tourId:
                  type: string
                stopId:
                  type: string
      responses:
        200:
          description: Capacity analyzed
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CapacityResult'

  /api/v1/capacity/{tourId}:
    get:
      summary: Get current capacity for tour
      parameters:
        - name: tourId
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: Capacity details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TourCapacity'

  # Matching Service
  /api/v1/matching/suggestions/{tourId}:
    get:
      summary: Get order suggestions for tour
      parameters:
        - name: tourId
          in: path
          required: true
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: integer
            default: 10
      responses:
        200:
          description: List of matching orders
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/MatchSuggestion'

  /api/v1/matching/{matchId}/accept:
    post:
      summary: Accept a match suggestion
      parameters:
        - name: matchId
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: Match accepted, route updated

  # Vision Service
  /api/v1/vision/analyze:
    post:
      summary: Analyze cargo space image
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                imageUrl:
                  type: string
                vehicleType:
                  type: string
      responses:
        200:
          description: Vision analysis result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/VisionResult'

components:
  schemas:
    CapacityResult:
      type: object
      properties:
        volumeFree:
          type: number
          format: float
        weightFree:
          type: number
          format: float
        palletsFree:
          type: integer
        utilization:
          type: number
          format: float
        uncertaintyFlag:
          type: boolean
        confidence:
          type: number
          format: float

    MatchSuggestion:
      type: object
      properties:
        matchId:
          type: string
        order:
          $ref: '#/components/schemas/Order'
        insertionPoint:
          $ref: '#/components/schemas/InsertionPoint'
        scores:
          type: object
          properties:
            capacity:
              type: number
            detour:
              type: number
            margin:
              type: number
            timeWindow:
              type: number
            direction:
              type: number
        totalScore:
          type: number
        estimatedProfit:
          $ref: '#/components/schemas/ProfitEstimate'

    VisionResult:
      type: object
      properties:
        freeVolumeEstimate:
          type: number
          format: float
        detectedPallets:
          type: integer
        confidence:
          type: number
          format: float
        regions:
          type: array
          items:
            type: object
            properties:
              x:
                type: number
              y:
                type: number
              w:
                type: number
              h:
                type: number
```

### 6.3 Event-Schema

```json
// Kafka Event Schemas

// capacity-updated
{
  "eventType": "capacity-updated",
  "timestamp": "2024-01-19T14:30:00Z",
  "data": {
    "tourId": "T-2024-0847",
    "vehicleId": "VH-123",
    "stopId": "S-456",
    "volumeFree": 5.5,
    "weightFree": 2625,
    "palletsFree": 4,
    "utilization": 0.70,
    "source": "VISION",
    "confidence": 0.89,
    "uncertaintyFlag": false
  }
}

// order-match-suggested
{
  "eventType": "order-match-suggested",
  "timestamp": "2024-01-19T14:32:00Z",
  "data": {
    "matchId": "M-789",
    "tourId": "T-2024-0847",
    "orderId": "A-2024-1293",
    "totalScore": 0.87,
    "estimatedProfit": {
      "revenue": 245.00,
      "costs": 67.00,
      "margin": 178.00,
      "marginPercent": 32
    },
    "detour": {
      "km": 5.8,
      "minutes": 14
    },
    "expiresAt": "2024-01-19T16:00:00Z"
  }
}

// match-accepted
{
  "eventType": "match-accepted",
  "timestamp": "2024-01-19T14:45:00Z",
  "data": {
    "matchId": "M-789",
    "tourId": "T-2024-0847",
    "orderId": "A-2024-1293",
    "acceptedBy": "DISPATCHER",
    "acceptedByUserId": "U-456",
    "newRoute": {
      "stops": [
        {"id": "S-1", "name": "Meyer GmbH", "eta": "14:30"},
        {"id": "S-2", "name": "Weber AG", "eta": "15:45"},
        {"id": "S-3", "name": "Schmidt KG", "eta": "17:45"}
      ]
    }
  }
}
```

---

## 7. Rollout-Plan

### 7.1 Phasen

```
┌─────────────────────────────────────────────────────────────┐
│                    ROLLOUT-PHASEN                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PHASE 1: Foundation (Wochen 1-6)                          │
│  ├── Capacity Engine Core                                   │
│  ├── Basic Matching Algorithm                               │
│  ├── API Infrastructure                                     │
│  └── Pilot mit 5 Touren/Tag                                 │
│                                                             │
│  PHASE 2: Vision Integration (Wochen 7-12)                 │
│  ├── Vision Service Setup                                   │
│  ├── Mobile App Photo Upload                                │
│  ├── Vision-Abgleich Logic                                  │
│  └── Pilot erweitern auf 20 Touren/Tag                      │
│                                                             │
│  PHASE 3: Full Rollout (Wochen 13-18)                       │
│  ├── Dispatcher UI Complete                                 │
│  ├── Notification Service                                   │
│  ├── Pricing Engine                                         │
│  └── Rollout auf alle 100 Touren                            │
│                                                             │
│  PHASE 4: Optimization (ab Woche 19)                        │
│  ├── ML-basierte Verbesserungen                             │
│  ├── Automatisierte Zuweisung (optional)                    │
│  ├── Erweiterte Analytics                                   │
│  └── Integration weiterer Features                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Erfolgsmetriken

| Metrik | Baseline | Ziel (6 Monate) | Ziel (12 Monate) |
|--------|----------|-----------------|------------------|
| Tourenauslastung | 70% | 78% | 85% |
| Zusatzumsatz/Tour | 0 € | +50 € | +100 € |
| Leerkilometer | 25% | 20% | 15% |
| Vorschlag-Akzeptanzrate | - | 30% | 50% |
| Vision-Konfidenz | - | 85% | 92% |
| Dispatcher-Zeitersparnis | 0% | 15% | 25% |

---

*Dokument-Version: 1.0 | Erstellt: 2024-01 | Nächste Überprüfung: 2025-01*
