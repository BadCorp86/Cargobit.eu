# CargoBit UI-Journey Dokumentation

## Shipper-Journey (End-to-End)

### Screen 1 – "Neuer Auftrag"

**Zweck:** Auftragserstellung mit automatischer Preiskalkulation

**UI-Komponenten:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📦 Neuer Transportauftrag                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Abholung                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📍 Düsseldorf, Deutschland                              │    │
│  │ Kontakt: Max Mustermann | +49 123 456789                │    │
│  │ Zeitfenster: 17.04.2026 | 08:00 - 12:00                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Lieferung                                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📍 Paris, Frankreich                                    │    │
│  │ Kontakt: Jean Dupont | +33 1 234 56789                  │    │
│  │ Zeitfenster: 18.04.2026 | 14:00 - 18:00                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Frachtdetails                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Gewicht: 1.200 kg                                       │    │
│  │ Volumen: 8,5 m³                                         │    │
│  │ Palettenplätze: 6                                       │    │
│  │ □ Gefahrgut  □ Kühlung  □ Zerbrechlich                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 💰 Preisvorschau                                        │    │
│  │                                                         │    │
│  │ Marktpreis:      € 100,00                               │    │
│  │ Startpreis:      € 115,00  ← Empfohlener Angebotspreis  │    │
│  │ Mindestpreis:    € 65,00   ← Anti-Dumping-Grenze        │    │
│  │                                                         │    │
│  │ Kostenaufschlüsselung:                                  │    │
│  │ • Basis:      € 40,00                                   │    │
│  │ • Diesel:     € 27,00                                   │    │
│  │ • Maut:       € 15,00                                   │    │
│  │ • Personal:   € 13,00                                   │    │
│  │ • Risiko:     € 5,00   ⚠️ Gelbes Risikolevel            │    │
│  │ ─────────────────────                                   │    │
│  │   Gesamt:     € 100,00                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [Auftrag veröffentlichen]                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Events:**
1. Nach Submit → `order.created` Event
2. Pricing-Call → `pricing.calculated` Event
3. Anzeige: `PriceBreakdownCard` Komponente

---

### Screen 2 – "Auftrag aktiv"

**Zweck:** Status-Tracking während der Ausschreibung

**UI-Komponenten:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Auftrag #ord_123                                            │
│  Status: 🟢 In Ausschreibung                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Routeninfo                                                     │
│  Düsseldorf → Paris | 480 km | 1.200 kg                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 💰 Preisinfo                                            │    │
│  │                                                         │    │
│  │ Marktpreis:    € 100,00                                 │    │
│  │ Ihr Startpreis: € 115,00                                │    │
│  │                                                         │    │
│  │ 📊 Gebote: 3 eingegangen                                │    │
│  │ ─────────────────────────────────────────────────────── │    │
│  │ • € 82,00  (Gut)                                        │    │
│  │ • € 95,00  (Akzeptabel)                                 │    │
│  │ • € 108,00 (Über Marktpreis)                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ⏳ Matching läuft...                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Nach `matching.completed` Event:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ Carrier gefunden!                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 👤 Hans Müller                                          │    │
│  │ 🏢 Schnelle Logistik GmbH                               │    │
│  │ ⭐ 4.8/5.0  |  📦 342 Transporte                         │    │
│  │                                                         │    │
│  │ 💰 Preis: € 80,00                                       │    │
│  │                                                         │    │
│  │ 📋 Warum dieser Carrier?                                │    │
│  │ ✓ Sehr hohe Zuverlässigkeit                             │    │
│  │ ✓ Preis im attraktiven Bereich                          │    │
│  │ ✓ Geringes Risiko laut Risk-Engine                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [Bestätigen]  [Ablehnen]                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Screen 3 – "Transport-Tracking"

**Zweck:** Echtzeit-Verfolgung des Transports

**UI-Komponenten:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🚚 Transport-Tracking                                          │
│  Auftrag #ord_123                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │    [Karte mit aktueller Position]                       │    │
│  │                                                         │    │
│  │    📍 Düsseldorf ───────🚚─────────── 📍 Paris          │    │
│  │                  ~180 km entfernt                       │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Timeline                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ✅ CREATED      17.04.2026 18:00                        │    │
│  │ ✅ ASSIGNED     17.04.2026 18:06                        │    │
│  │ ✅ ACCEPTED     17.04.2026 18:10                        │    │
│  │ ✅ PICKED_UP    18.04.2026 09:30                        │    │
│  │ 🟢 IN_TRANSIT   Jetzt | ETA: 18.04.2026 16:00           │    │
│  │ ⬜ DELIVERED                                             │    │
│  │ ⬜ COMPLETED                                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Carrier-Kontakt                                                │
│  📞 +49 170 1234567  |  ✉️ h.mueller@email.de                   │
│                                                                 │
│  ETA: 18.04.2026 16:00 (~2 Std. verbleibend)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Screen 4 – "Abschluss & Bewertung"

**Zweck:** POD-Anzeige und Carrier-Bewertung

**UI-Komponenten:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ Transport abgeschlossen                                     │
│  Auftrag #ord_123                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📄 Proof of Delivery                                    │    │
│  │                                                         │    │
│  │ [Vorschau: Unterschriebener Lieferschein]               │    │
│  │                                                         │    │
│  │ Empfänger: Jean Dupont                                  │    │
│  │ Unterschrieben: 18.04.2026 15:48                        │    │
│  │ [PDF herunterladen]                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ⭐ Carrier bewerten                                     │    │
│  │                                                         │    │
│  │ Pünktlichkeit:    ⭐⭐⭐⭐⭐                              │    │
│  │ Kommunikation:    ⭐⭐⭐⭐○                              │    │
│  │ Zustand der Ware: ⭐⭐⭐⭐⭐                              │    │
│  │                                                         │    │
│  │ Kommentar (optional):                                   │    │
│  │ ┌─────────────────────────────────────────────────────┐ │    │
│  │ │ Sehr zuverlässiger Fahrer, ware pünktlich da!       │ │    │
│  │ └─────────────────────────────────────────────────────┘ │    │
│  │                                                         │    │
│  │ [Bewertung abgeben]                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Diese Bewertung fließt in die carrier_stats ein.               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Carrier-Journey (End-to-End)

### Screen 1 – "Offene Aufträge"

**Zweck:** Übersicht verfügbarer Aufträge

**UI-Komponenten:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 Offene Aufträge                              [Filter] [Sort] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📍 Düsseldorf → Paris                         🟡 Risiko │    │
│  │                                                         │    │
│  │ 480 km | 1.200 kg | 17.04.2026                          │    │
│  │                                                         │    │
│  │ 💰 Preisrange: € 80 – 115                               │    │
│  │                                                         │    │
│  │ [Details ansehen]                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📍 Hamburg → München                          🟢 Risiko │    │
│  │                                                         │    │
│  │ 790 km | 800 kg | 18.04.2026                            │    │
│  │                                                         │    │
│  │ 💰 Preisrange: € 120 – 180                              │    │
│  │                                                         │    │
│  │ [Details ansehen]                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📍 Frankfurt → Amsterdam                      🔴 Risiko │    │
│  │                                                         │    │
│  │ 440 km | 2.500 kg | 19.04.2026                          │    │
│  │                                                         │    │
│  │ 💰 Preisrange: € 150 – 220                              │    │
│  │ ⚠️ Gefahrgut-Autorisierung erforderlich                 │    │
│  │                                                         │    │
│  │ [Details ansehen]                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Screen 2 – "Auftragsdetails & Gebot"

**Zweck:** Details prüfen und Gebot abgeben

**UI-Komponenten:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Auftragsdetails #ord_123                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Route                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📍 Düsseldorf, DE → Paris, FR                           │    │
│  │ Entfernung: 480 km                                      │    │
│  │ Pickup: 17.04.2026 | 08:00 - 12:00                      │    │
│  │ Delivery: 18.04.2026 | 14:00 - 18:00                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Fracht                                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Gewicht: 1.200 kg | Volumen: 8,5 m³                     │    │
│  │ 6 Paletten | Standard                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 💰 Preisinfo                                            │    │
│  │                                                         │    │
│  │ Marktpreis:   € 100,00                                  │    │
│  │ Startpreis:   € 115,00                                  │    │
│  │ Mindestpreis: € 65,00   ← Nicht unterschreiten!         │    │
│  │                                                         │    │
│  │ Risikolevel: 🟡 Gelb                                    │    │
│  │ Grund: Neue Route für dich                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Dein Gebot                                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │    € [    80,00    ]                                    │    │
│  │                                                         │    │
│  │    ✅ Gebot im erwarteten Bereich                       │    │
│  │    Preis-Score: 0.72 (Gut)                              │    │
│  │                                                         │    │
│  │    [Gebot abgeben]                                      │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Live-Validierung (BidInputWithValidation):**
```
Bei Eingabe von € 60,00:
┌─────────────────────────────────────────────────────────┐
│    € [    60,00    ]                                    │
│                                                         │
│    ❌ Gebot zu niedrig!                                 │
│    Mindestpreis: € 65,00                                │
│    Grund: BID_BELOW_MIN_PRICE                           │
└─────────────────────────────────────────────────────────┘

Bei Eingabe von € 90,00:
┌─────────────────────────────────────────────────────────┐
│    € [    90,00    ]                                    │
│                                                         │
│    ⚠️ Gebot über Marktpreis                             │
│    Preis-Score: 0.45 (Akzeptabel)                       │
│    Tipp: Niedrigere Preise erhöhen Match-Chancen        │
└─────────────────────────────────────────────────────────┘
```

---

### Screen 3 – "Zuschlag / Kein Zuschlag"

**Bei Zuschlag:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🎉 Du hast den Auftrag erhalten!                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Auftrag #ord_123                                        │    │
│  │                                                         │    │
│  │ 📍 Düsseldorf → Paris                                   │    │
│  │                                                         │    │
│  │ 💰 Dein Preis: € 80,00                                  │    │
│  │                                                         │    │
│  │ Pickup: 17.04.2026 | 08:00 - 12:00                      │    │
│  │ Shipper-Kontakt: Max Mustermann                         │    │
│  │                +49 123 456789                           │    │
│  │                                                         │    │
│  │ [Auftrag annehmen]  [Ablehnen]                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ⏳ Bitte innerhalb von 2 Stunden antworten                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Bei keinem Zuschlag:**
```
┌─────────────────────────────────────────────────────────────────┐
│  😔 Diesmal kein Zuschlag                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Auftrag #ord_123 wurde einem anderen Carrier zugeteilt.        │
│                                                                 │
│  Dein Gebot:     € 95,00                                       │
│  Zuschlagspreis: € 80,00                                       │
│                                                                 │
│  💡 Tipp: Dein Gebot lag 18,75% über dem ausgewählten Preis.    │
│  Versuche bei ähnlichen Aufträgen etwas niedriger zu bieten.    │
│                                                                 │
│  [Weitere Aufträge ansehen]                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Screen 4 – "Aktive Transporte"

**Zweck:** Übersicht laufender Transporte mit Status-Updates

**UI-Komponenten:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🚚 Aktive Transporte                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ #ord_123                                    🟡 IN_TRANSIT│    │
│  │                                                         │    │
│  │ Düsseldorf → Paris | 480 km                             │    │
│  │ Pickup: 17.04.2026 09:30 ✓                              │    │
│  │ ETA: 18.04.2026 16:00                                   │    │
│  │                                                         │    │
│  │ [Status aktualisieren]  [Details]                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ #ord_456                                    🟢 ACCEPTED │    │
│  │                                                         │    │
│  │ Hamburg → München | 790 km                              │    │
│  │ Pickup: 18.04.2026 10:00                                │    │
│  │                                                         │    │
│  │ [Zum Pickup navigieren]  [Details]                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Status-Update Dialog:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Status aktualisieren                                           │
│  Auftrag #ord_123                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Neuer Status:                                                  │
│  ○ Abgeholt (PICKED_UP)                                         │
│  ● Unterwegs (IN_TRANSIT)                                       │
│  ○ Zugestellt (DELIVERED)                                       │
│                                                                 │
│  Notiz (optional):                                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Alles reibungslos verlaufen                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  📍 Standort:                                                   │
│  Latitude:  49.4521                                             │
│  Longitude: 7.0556                                              │
│  [Aktuelle Position verwenden]                                  │
│                                                                 │
│  [Speichern]                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Screen 5 – "Historie & Performance"

**Zweck:** Carrier-KPIs und Performance-Tracking

**UI-Komponenten:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Meine Performance                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ KPIs (Letzte 30 Tage)                                   │    │
│  │                                                         │    │
│  │ 📦 Abgeschlossene Transporte: 42                        │    │
│  │ ⏱️ Pünktlichkeitsrate:     94%                          │    │
│  │ 📉 Stornoquote:            3%                           │    │
│  │ ⭐ Durchschnittsbewertung: 4.7/5.0                      │    │
│  │ 💰 Durchschnittspreis:     € 87,50                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Trend (vs. Vorperiode)                                  │    │
│  │                                                         │    │
│  │ Pünktlichkeit: ↑ +2%   ✅                               │    │
│  │ Stornos:       ↓ -1%   ✅                               │    │
│  │ Bewertung:     ↑ +0.2  ✅                               │    │
│  │ Match-Rate:    ↑ +5%   ✅                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  💡 Diese Werte beeinflussen dein Matching-Score!               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Letzte Bewertungen                                      │    │
│  │                                                         │    │
│  │ ⭐⭐⭐⭐⭐ "Super Fahrer, sehr pünktlich!"               │    │
│  │            - Max M., Düsseldorf → Köln                  │    │
│  │                                                         │    │
│  │ ⭐⭐⭐⭐○ "Alles gut gelaufen"                           │    │
│  │            - Anna K., Hamburg → Berlin                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Event-Flow Integration

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CARGOBIT EVENT FLOW                            │
└──────────────────────────────────────────────────────────────────────────┘

Shipper                Frontend               Order-Service      Pricing-Service
   │                      │                        │                   │
   │  1. Auftrag erstellen│                        │                   │
   │─────────────────────>│                        │                   │
   │                      │  POST /orders          │                   │
   │                      │───────────────────────>│                   │
   │                      │                        │ order.created     │
   │                      │                        │──────────────────>│
   │                      │                        │                   │
   │                      │                        │  pricing.calculated
   │                      │                        │<──────────────────│
   │                      │                        │                   │
   │                      │  PriceBreakdownCard    │                   │
   │                      │<───────────────────────│                   │
   │  2. Preis anzeigen   │                        │                   │
   │<─────────────────────│                        │                   │
   │                      │                        │                   │

Carrier                Frontend               Bid-Service        Pricing-Service
   │                      │                        │                   │
   │  3. Gebot abgeben    │                        │                   │
   │─────────────────────>│                        │                   │
   │                      │  POST /bids            │                   │
   │                      │───────────────────────>│                   │
   │                      │                        │  bid.validate     │
   │                      │                        │──────────────────>│
   │                      │                        │                   │
   │                      │                        │  bid.validated    │
   │                      │                        │<──────────────────│
   │                      │                        │                   │
   │  4. Validierung zeigen                       │                   │
   │<─────────────────────│                        │                   │

Matching-Service                    Execution-Service            Carrier
      │                                  │                          │
      │  5. bid.validated                │                          │
      │<─────────────────────────────────│                          │
      │                                  │                          │
      │  matching.completed              │                          │
      │─────────────────────────────────>│                          │
      │                                  │  execution.created       │
      │                                  │─────────────────────────>│
      │                                  │                          │
      │                                  │  execution.status_changed│
      │                                  │<─────────────────────────│
      │                                  │                          │
```

---

## Status-Übergänge

### Execution Status Machine

```
                    ┌─────────────────┐
                    │    CREATED      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
          ┌─────────│    ASSIGNED     │◄────────┐
          │         └────────┬────────┘         │
          │                  │                  │
          │         ┌────────▼────────┐         │
          │         │    ACCEPTED     │         │
          │         └────────┬────────┘         │
          │                  │                  │
          │         ┌────────▼────────┐         │
          │         │   PICKED_UP     │         │
          │         └────────┬────────┘         │
          │                  │                  │
          │         ┌────────▼────────┐         │
          │         │   IN_TRANSIT    │         │
          │         └────────┬────────┘         │
          │                  │                  │
          │         ┌────────▼────────┐         │
          │         │   DELIVERED     │         │
          │         └────────┬────────┘         │
          │                  │                  │
          │         ┌────────▼────────┐         │
          │         │  POD_SUBMITTED  │         │
          │         └────────┬────────┘         │
          │                  │                  │
          │         ┌────────▼────────┐         │
          └────────>│   COMPLETED     │─────────┘
                    └─────────────────┘
                             ▲
                             │
                    ┌────────┴────────┐
                    │   CANCELLED     │
                    └─────────────────┘
```

---

## API Integration Summary

| Screen | API Calls | Events Published | Events Consumed |
|--------|-----------|------------------|-----------------|
| Shipper Screen 1 | POST /transports, GET /pricing/market-price | order.created | pricing.calculated |
| Shipper Screen 2 | GET /transports/{id}, GET /bids | - | matching.completed |
| Shipper Screen 3 | GET /executions/{id}, GET /tracking | - | execution.status_changed |
| Shipper Screen 4 | POST /ratings | - | - |
| Carrier Screen 1 | GET /transports?status=open | - | - |
| Carrier Screen 2 | GET /transports/{id}, POST /bids, POST /pricing/bid/validate | bid.submitted | bid.validated |
| Carrier Screen 3 | - | - | matching.completed |
| Carrier Screen 4 | GET /executions?carrierId=X&status=active, POST /executions/{id}/status | - | - |
| Carrier Screen 5 | GET /carrier/stats | - | carrier.stats.updated |
