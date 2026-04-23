# CargoBit UI Journey - Shipper & Carrier

## End-to-End User Flows

---

## 1. Shipper Journey

### 1.1 Auftrag anlegen

**Screen:** `/shipper/orders/new`

**User Actions:**
1. Route eingeben (Pickup & Delivery Adresse)
2. Frachtdaten eingeben (Gewicht, Volumen, Palette)
3. Zeitfenster wählen (Früheste Abholung, Späteste Lieferung)
4. Anforderungen spezifizieren (ADR, Kühlung, Hebebühne)
5. "Marktpreis berechnen" klicken

**UI Components:**
- `<PriceBreakdownCard />` zeigt:
  - Marktpreis: 1.250 €
  - Startpreis: 1.180 €
  - Kostenaufschlüsselung:
    - Basis: 650 €
    - Diesel: 280 €
    - Maut: 150 €
    - Lohn: 120 €
    - Risiko: 50 €
  - Risk Level Badge (green/yellow/red)

**API Calls:**
```
POST /api/orders
  → Order-Service
  → POST /api/pricing/market-price
  → Response: { order, pricing }
```

**Next:** Auktionsphase starten

---

### 1.2 Auktionsphase

**Screen:** `/shipper/orders/{id}/bidding`

**User Actions:**
- Live-Status: "Gebote eingehend…"
- Countdown: Noch 2h 34m bis Bidding-Ende
- Optional: Liste der Gebote sehen (anonymisiert)

**UI Components:**
- Status-Header: "3 Gebote eingegangen"
- Bidding-Timeline:
  ```
  [14:32] Gebot #1 eingegangen
  [14:45] Gebot #2 eingegangen  
  [15:01] Gebot #3 eingegangen
  ```
- Gebote-Tabelle (optional, anonymisiert):
  | Rang | Preis | Score |
  |------|-------|-------|
  | 1    | 1.180 € | 0.87 |
  | 2    | 1.220 € | 0.75 |
  | 3    | 1.350 € | 0.62 |

**API Calls:**
```
GET /api/bids?orderId={id}&status=pending
```

**Next:** Match-Ergebnis

---

### 1.3 Match-Ergebnis

**Screen:** `/shipper/orders/{id}/match`

**User Actions:**
- Carrier-Zuweisung bestätigen
- "Warum dieser Carrier?" aufklappen

**UI Components:**
- Match-Card:
  ```
  ┌─────────────────────────────────────┐
  │ ✅ Carrier zugewiesen              │
  │                                     │
  │ Spedition Müller GmbH              │
  │ ⭐ 4.8 (127 Transporte)            │
  │                                     │
  │ Preis: 1.180 €                     │
  │ Abholung: Heute 14:00 - 16:00      │
  │ Lieferung: Morgen 09:00 - 12:00    │
  │                                     │
  │ 📋 Warum dieser Carrier?           │
  │ ✓ Sehr hohe Zuverlässigkeit (98%)  │
  │ ✓ Preis 6% unter Marktpreis        │
  │ ✓ Geringes Risiko (Green)          │
  └─────────────────────────────────────┘
  ```

**API Calls:**
```
GET /api/matching/orders/{id}/matches
POST /api/orders/{id}/assign
```

**Next:** Transport-Tracking

---

### 1.4 Transport-Tracking

**Screen:** `/shipper/orders/{id}/tracking`

**User Actions:**
- Live-Position auf Karte sehen
- ETA-Updates empfangen
- Status-Updates per Push

**UI Components:**
- Status-Timeline:
  ```
  ✓ CREATED      14:32
  ✓ ASSIGNED     14:33
  ✓ ACCEPTED     14:45
  ✓ PICKED_UP    15:30
  ● IN_TRANSIT   (aktuell)
  ○ DELIVERED    ETA: 10:15
  ○ COMPLETED
  ```
- Karte mit Carrier-Position
- ETA-Card: "Ankunft in ~2h 45min"

**API Calls:**
```
GET /api/executions/{id}/tracking
WebSocket: wss://api.cargobit.com/ws/tracking/{id}
```

**Next:** Proof-of-Delivery

---

### 1.5 Proof-of-Delivery

**Screen:** `/shipper/orders/{id}/pod`

**User Actions:**
- POD-Dokument ansehen
- Transport bewerten

**UI Components:**
- POD-Viewer:
  - Foto(s) der Lieferung
  - Digitale Signatur
  - Empfänger-Name
  - Zeitstempel
- Rating-Form:
  - ⭐⭐⭐⭐⭐ Bewertung
  - Kommentar (optional)

**API Calls:**
```
GET /api/executions/{id}/pod
POST /api/executions/{id}/rating
```

**Next:** Abgeschlossene Transporte

---

### 1.6 Abgeschlossene Transporte

**Screen:** `/shipper/orders/history`

**User Actions:**
- Historie durchsuchen
- Rechnungen herunterladen
- Kosten analysieren

**UI Components:**
- Transport-Liste:
  | Datum | Route | Carrier | Preis | Status | Bewertung |
  |-------|-------|---------|-------|--------|-----------|
  | 18.04 | BER→MUC | Müller | 1.180€ | ✅ | ⭐⭐⭐⭐⭐ |
  | 17.04 | FRA→HH | Schmidt | 980€ | ✅ | ⭐⭐⭐⭐ |
  | 15.04 | MUC→CGN | Weber | 750€ | ✅ | ⭐⭐⭐⭐⭐ |

---

## 2. Carrier Journey

### 2.1 Auftragsübersicht

**Screen:** `/carrier/orders/available`

**User Actions:**
- Filter anwenden (Route, Zeit, Preis)
- Auftrag auswählen
- Detailseite öffnen

**UI Components:**
- Order-Card:
  ```
  ┌─────────────────────────────────────┐
  │ Berlin → München                    │
  │ 350 km | 12 Paletten | 8.000 kg    │
  │                                     │
  │ 💰 1.150 - 1.350 €                  │
  │ 🟢 Geringes Risiko                  │
  │                                     │
  │ Abholung: 18.04, 14:00-16:00        │
  │ Lieferung: 19.04, 09:00-12:00       │
  │                                     │
  │ [Details] [Bieten]                  │
  └─────────────────────────────────────┘
  ```

**API Calls:**
```
GET /api/transports/available?carrierId={id}
```

**Next:** Gebot abgeben

---

### 2.2 Gebot abgeben

**Screen:** `/carrier/orders/{id}/bid`

**User Actions:**
- Preis eingeben
- Live-Feedback sehen
- Gebot bestätigen

**UI Components:**
- `<BidInputWithValidation />`:
  ```
  ┌─────────────────────────────────────┐
  │ Dein Gebot (€)                      │
  │ ┌─────────────────────────────────┐ │
  │ │ 1180                        EUR │ │
  │ └─────────────────────────────────┘ │
  │                                     │
  │ Marktpreis: 1.250 €                 │
  │ Empfohlen: 1.150 - 1.280 €          │
  │                                     │
  │ ✅ Sehr gutes Gebot!                │
  │ Wettbewerbs-Score: 82%              │
  │                                     │
  │ 📊 Preis-Position:                  │
  │ [────●──────────────────]           │
  │ 980€          1.250€      1.350€    │
  │                                     │
  │ [Gebot abgeben]                     │
  └─────────────────────────────────────┘
  ```

**API Calls:**
```
POST /api/pricing/orders/{id}/bid/validate
POST /api/bids
```

**Next:** Zuschlag / Absage

---

### 2.3 Zuschlag / Absage

**Screen:** `/carrier/orders/{id}/assignment`

**User Actions:**
- Zuschlag erhalten → Annehmen
- Auftrag bestätigen

**UI Components:**
- Erfolg-Card:
  ```
  ┌─────────────────────────────────────┐
  │ 🎉 Du hast den Auftrag erhalten!    │
  │                                     │
  │ Berlin → München                    │
  │ Preis: 1.180 €                      │
  │                                     │
  │ 📍 Abholung:                        │
  │ Max Mustermann GmbH                 │
  │ Industriestr. 42, 12345 Berlin      │
  │ 18.04, 14:00-16:00                  │
  │ Tel: +49 30 123456                  │
  │                                     │
  │ 📍 Lieferung:                       │
  │ Anna Schmidt KG                     │
  │ Münchner Str. 15, 80331 München     │
  │ 19.04, 09:00-12:00                  │
  │                                     │
  │ [Auftrag annehmen]                  │
  └─────────────────────────────────────┘
  ```

**API Calls:**
```
GET /api/orders/{id}/assignment
POST /api/executions/{id}/status (ACCEPTED)
```

**Next:** Ausführung

---

### 2.4 Ausführung

**Screen:** `/carrier/executions/{id}`

**User Actions:**
- Status updaten (PICKED_UP, IN_TRANSIT, DELIVERED)
- Position teilen (automatisch via App)
- POD hochladen

**UI Components:**
- Status-Buttons:
  ```
  ┌─────────────────────────────────────┐
  │ Aktueller Status: AKZEPTIERT        │
  │                                     │
  │ [Abholung bestätigen]               │
  │                                     │
  │ Position: 52.5200, 13.4050          │
  │ ETA: 15:30                          │
  │                                     │
  │ Nächste Schritte:                   │
  │ 1. Am Abholort einfinden            │
  │ 2. Fracht übernehmen                │
  │ 3. "Abgeholt" bestätigen            │
  └─────────────────────────────────────┘
  ```
  
  Nach PICKED_UP:
  ```
  ┌─────────────────────────────────────┐
  │ Aktueller Status: UNTERWEGS         │
  │                                     │
  │ 📍 Route: Berlin → München (350km)  │
  │ 📊 Fortschritt: 45%                 │
  │ ⏱️ ETA: 10:15                       │
  │                                     │
  │ [Ankunft bestätigen]                │
  └─────────────────────────────────────┘
  ```

**API Calls:**
```
POST /api/executions/{id}/status
POST /api/executions/{id}/tracking
```

**Next:** POD hochladen

---

### 2.5 POD hochladen

**Screen:** `/carrier/executions/{id}/pod`

**User Actions:**
- Foto aufnehmen
- Signatur erfassen
- POD einreichen

**UI Components:**
- POD-Upload:
  ```
  ┌─────────────────────────────────────┐
  │ Proof of Delivery                   │
  │                                     │
  │ 📷 Fotos:                           │
  │ [+] [Foto 1] [Foto 2]               │
  │                                     │
  │ ✍️ Signatur:                        │
  │ ┌───────────────────────────────┐   │
  │ │                               │   │
  │ │      [Signatur-Feld]          │   │
  │ │                               │   │
  │ └───────────────────────────────┘   │
  │                                     │
  │ Empfänger-Name: [_______________]   │
  │                                     │
  │ [POD einreichen]                    │
  └─────────────────────────────────────┘
  ```

**API Calls:**
```
POST /api/executions/{id}/pod
```

**Next:** Historie & Performance

---

### 2.6 Historie & Performance

**Screen:** `/carrier/performance`

**User Actions:**
- Statistiken einsehen
- Verbesserungspotenzial analysieren

**UI Components:**
- Performance-Dashboard:
  ```
  ┌─────────────────────────────────────┐
  │ Meine Performance                   │
  │                                     │
  │ ┌────────┐ ┌────────┐ ┌────────┐   │
  │ │ ⭐ 4.8 │ │ 📦 127 │ │ ✓ 98%  │   │
  │ │ Rating │ │ Aufträge│ │ Pünktl.│   │
  │ └────────┘ └────────┘ └────────┘   │
  │                                     │
  │ Stornorate: 2%                      │
  │ Dispute: 0                          │
  │                                     │
  │ Letzte 30 Tage:                     │
  │ ████████████░░░░░ Aufträge          │
  │                                     │
  │ 💡 Tipp: Frühere Abholzeiten        │
  │    verbessern deinen Score.         │
  └─────────────────────────────────────┘
  ```

---

## 3. Zentrale UI-Screens (Zusammenfassung)

### Shipper Screens

| Screen | Pfad | Hauptfunktion |
|--------|------|---------------|
| Neuer Auftrag | `/shipper/orders/new` | Transport anlegen + Pricing |
| Auftragsdetails | `/shipper/orders/{id}` | Übersicht + Matching-Ergebnis |
| Bidding-Übersicht | `/shipper/orders/{id}/bidding` | Gebote beobachten |
| Transport-Tracking | `/shipper/orders/{id}/tracking` | Live-Position + Status |
| POD-Übersicht | `/shipper/orders/{id}/pod` | POD ansehen + Bewerten |
| Historie | `/shipper/orders/history` | Abgeschlossene Transporte |

### Carrier Screens

| Screen | Pfad | Hauptfunktion |
|--------|------|---------------|
| Offene Aufträge | `/carrier/orders/available` | Verfügbare Aufträge filtern |
| Auftragsdetails | `/carrier/orders/{id}` | Details + Bieten |
| Bieten | `/carrier/orders/{id}/bid` | Gebot mit Validierung |
| Meine Aufträge | `/carrier/executions` | Aktive Transporte |
| Ausführung | `/carrier/executions/{id}` | Status + Tracking + POD |
| Performance | `/carrier/performance` | Statistiken + Historie |

---

## 4. API-Integration Matrix

| User Action | Frontend Component | API Endpoint | Backend Service |
|-------------|-------------------|--------------|-----------------|
| Transport anlegen | CreateOrderForm | POST /api/orders | Order-Service |
| Preis berechnen | PriceBreakdownCard | POST /api/pricing/market-price | Pricing-Engine |
| Gebot validieren | BidInputWithValidation | POST /api/pricing/orders/{id}/bid/validate | Pricing-Engine |
| Gebot abgeben | BidInputWithValidation | POST /api/bids | Bid-Service |
| Matches laden | MatchResultCard | GET /api/matching/orders/{id}/matches | Matching-Engine |
| Carrier zuweisen | AssignmentCard | POST /api/orders/{id}/assign | Order-Service |
| Status updaten | ExecutionStatusCard | POST /api/executions/{id}/status | Execution-Engine |
| Tracking | TrackingMap | GET /api/executions/{id}/tracking | Execution-Engine |
| POD hochladen | PodUploadForm | POST /api/executions/{id}/pod | Execution-Engine |
| Bewertung | RatingForm | POST /api/executions/{id}/rating | Execution-Engine |

---

## 5. WebSocket Events

### Tracking Updates

```typescript
// Client subscribes
ws.send({ type: 'subscribe', executionId: 'exec_123' });

// Server pushes location updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'location_update':
      // Update map marker
      updateMapPosition(data.location);
      break;
    case 'status_change':
      // Update timeline
      updateStatusTimeline(data.status);
      break;
    case 'eta_update':
      // Update ETA display
      updateEta(data.eta);
      break;
  }
};
```

### Status Notifications

```typescript
// Push notification payload
{
  type: 'status_change',
  executionId: 'exec_123',
  orderId: 'order_456',
  status: 'DELIVERED',
  timestamp: '2024-04-18T15:30:00Z',
  eta: null,
  message: 'Ihre Lieferung ist angekommen!'
}
```
