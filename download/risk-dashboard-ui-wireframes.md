# CargoBit Risk Dashboard - UI/UX Design Documentation

## Design System v1.0 | Stand: April 2026

---

# 📐 Teil 1: ASCII Wireframes

## 🖥️ Screen 1: Risk Dashboard Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ RISK DASHBOARD                                    [⚙️] [🔔] [User ▼]        │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ HEADER                                                                      ││
│  │ Security Cockpit für Admin/Support/Compliance                               ││
│  │ Last updated: 15.04.2026 14:32                              [Refresh] [Export]││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  KPI TILES                                                                       │
│  ┌────────────────┬────────────────┬────────────────┬────────────────────────┐  │
│  │ 📊 TOTAL       │ 🟢 GREEN       │ 🟡 YELLOW      │ 🔴 RED                 │  │
│  │ ENTITIES       │ (0-30)         │ (31-60)        │ (61-100)               │  │
│  │                │                │                │                        │  │
│  │    1,284       │      892       │      298       │       57               │  │
│  │                │   (71.5%)      │   (23.9%)      │    (4.6%)              │  │
│  │                │   ↑ +3.2%      │   → stable     │   ↑ +2 Fälle           │  │
│  └────────────────┴────────────────┴────────────────┴────────────────────────┘  │
│                                                                                  │
│  MAIN CONTENT ROW                                                                │
│  ┌──────────────────────────────────┬───────────────────────────────────────────┐│
│  │ 📋 TOP HIGH-RISK ENTITIES        │ 📈 RISK TREND (7 DAYS)                    ││
│  │ ───────────────────────────────  │ ─────────────────────────────────────────  ││
│  │ [Search...] [Filter ▼] [Type ▼]  │                                           ││
│  │                                  │  ┌─────────────────────────────────────┐   ││
│  │ ┌────────────────────────────┐   │  │ 160 ─                               │   ││
│  │ │ TYPE  │ NAME        │SCORE│   │  │     ──●───●───●───●───●───●───    │   ││
│  │ │ USER  │ Max M.      │ 81  │   │  │ 120 ─   ╲   ╲                       │   ││
│  │ │ COMP  │ LogiTrans   │ 75  │   │  │          ╲   ╲                      │   ││
│  │ │ TX    │ TX-4821     │ 88  │   │  │  80 ─      ╲   ╲───●───●───●───    │   ││
│  │ │ USER  │ Anna S.     │ 67  │   │  │            ╲                        │   ││
│  │ │ COMP  │ FastCargo   │ 62  │   │  │  40 ─       ╲───●───●───●───●───   │   ││
│  │ └────────────────────────────┘   │  │          08  09  10  11  12  13  14 │   ││
│  │                                  │  └─────────────────────────────────────┘   ││
│  │         [View All →]             │  ─── GREEN  ─── YELLOW  ─── RED           ││
│  └──────────────────────────────────┴───────────────────────────────────────────┘│
│                                                                                  │
│  RISK DISTRIBUTION                                                               │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │ ┌──────────────────────────────┐  ┌────────────────────────────────────────┐ ││
│  │ │ 🟢 GREEN ████████████ 892    │  │ BY ENTITY TYPE                         │ ││
│  │ │ 🟡 YELLOW ████░░░░░░ 298     │  │ [USER]  [COMPANY]  [TRANSACTION]       │ ││
│  │ │ 🔴 RED █░░░░░░░░░░░░ 57      │  │  634       412          201            │ ││
│  │ └──────────────────────────────┘  └────────────────────────────────────────┘ ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  RECENT RISK EVENTS                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │ 🕐 RECENT RISK EVENTS                                          [View All →] ││
│  │ ──────────────────────────────────────────────────────────────────────────── ││
│  │ TIME   │ ENTITY      │ RULE              │ WEIGHT │ SCORE │ LEVEL           ││
│  │ 14:32  │ u_2847      │ new_iban          │  +15   │   81  │ 🔴 RED          ││
│  │ 14:28  │ c_0892      │ vat_mismatch      │  +20   │   75  │ 🔴 RED          ││
│  │ 14:15  │ t_4821      │ high_amount       │  +25   │   88  │ 🔴 RED          ││
│  │ 14:02  │ u_1923      │ failed_verify     │  +15   │   67  │ 🔴 RED          ││
│  │ 13:45  │ c_1456      │ address_change    │  +10   │   62  │ 🔴 RED          ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  QUICK ACTIONS                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │ Quick Actions:  [📋 Rules verwalten] [🚩 Flag setzen] [🚫 Sperren] [+ Neue Regel] ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🖥️ Screen 2: Risk Profile Detail

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ← Zurück                                                                       │
│                                                                                  │
│  RISK PROFILE: USER u_2847                                                       │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────┐  ┌───────────────────────────────────────────┐│
│  │ SCORE CARD                   │  │ TRIGGERED RULES (5)                       ││
│  │                              │  │                                           ││
│  │      ┌─────────────┐         │  │ ┌─────────────────────────────────────┐   ││
│  │      │             │         │  │ │ ⚠️ new_iban                 +15    │   ││
│  │      │     81      │         │  │ │ IBAN < 24h alt                      │   ││
│  │      │             │         │  │ │ 14:32 · vor 2 Minuten               │   ││
│  │      └─────────────┘         │  │ └─────────────────────────────────────┘   ││
│  │                              │  │                                           ││
│  │      🔴 RED                  │  │ ┌─────────────────────────────────────┐   ││
│  │   Block + Support Ticket     │  │ │ ⚠️ high_amount              +25    │   ││
│  │                              │  │ │ Betrag > 10.000€                    │   ││
│  │ Last updated: 15.04 14:32    │  │ │ 14:30 · vor 4 Minuten               │   ││
│  │                              │  │ └─────────────────────────────────────┘   ││
│  │ ─────────────────────────── │  │                                           ││
│  │                              │  │ ┌─────────────────────────────────────┐   ││
│  │ ACTIONS                      │  │ │ ⚠️ fraud_flags              +20    │   ││
│  │                              │  │ │ Vorhandene Fraud-Flags              │   ││
│  │ [🚫 Security Flag setzen]    │  │ │ 14:28 · vor 6 Minuten               │   ││
│  │ [🔓 Entsperren]              │  │ └─────────────────────────────────────┘   ││
│  │ [🔄 Score neu berechnen]     │  │                                           ││
│  │ [✏️ Manueller Override]      │  │ Total Impact: +60                         ││
│  │                              │  │                                           ││
│  │ ─────────────────────────── │  └───────────────────────────────────────────┘│
│  │ DETAILS                      │                                                 │
│  │ ───────────                  │                                                 │
│  │ Entity ID    u_2847          │                                                 │
│  │ Email        max.m@...       │                                                 │
│  │ Company      Mustermann GmbH │                                                 │
│  │ Wallet       €15.420,50      │                                                 │
│  │ Transactions 47              │                                                 │
│  │ Member since 15.06.2023      │                                                 │
│  │ Verification partial         │                                                 │
│  └──────────────────────────────┘                                                 │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │ 📈 SCORE HISTORY (30 DAYS)                                                   ││
│  │ ──────────────────────────────────────────────────────────────────────────── ││
│  │ 100 ┤                           ●────────●────────●───                       ││
│  │  80 ┤              ●────────●                                             RED ││
│  │  60 ├───●─────────────────────────────────────────────────────── YELLOW     ││
│  │  40 ├──────────────────────────────────────────────────────────── GREEN     ││
│  │  20 ├────────────────────────────────────────────────────────────────────   ││
│  │    └─┬──────────┬──────────┬──────────┬──────────┬──────────┬──            ││
│  │     10.04     11.04      12.04      13.04      14.04      15.04             ││
│  │                                                                              ││
│  │    █████ RED Zone (61-100)  ████ YELLOW Zone (31-60)  ░░░░ GREEN (0-30)     ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │ 📋 EVENT TIMELINE                                                            ││
│  │ ──────────────────────────────────────────────────────────────────────────── ││
│  │                                                                              ││
│  │  ○ 14:32  Rule triggered: new_iban                                          ││
│  │  │       Context: iban_age_hours = 12                                       ││
│  │  │                                                                          ││
│  │  ○ 14:30  Score changed: 62 → 81                                            ││
│  │  │       Triggered by: high_amount                                          ││
│  │  │                                                                          ││
│  │  ○ 14:28  Status changed: ACTIVE → BLOCKED                                  ││
│  │  │       Reason: Automatic block (RED score)                                ││
│  │  │                                                                          ││
│  │  ○ 14:20  Rule triggered: fraud_flags                                       ││
│  │          Context: existing_flags = 1                                        ││
│  │                                                                              ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │ 🎫 SUPPORT TICKET                                                            ││
│  │ ──────────────────────────────────────────────────────────────────────────── ││
│  │ Ticket ID    st_89234         Status    🔴 OPEN                              ││
│  │ Priority     HIGH             Assigned  Support Team A                       ││
│  │ Created      15.04 14:32      SLA       4h remaining                         ││
│  │                                                                              ││
│  │ [💬 Ticket öffnen]  [🔗 Im Freshdesk öffnen]                                 ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🖥️ Screen 3: Rules Management

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ← Zurück                              [Import] [Export] [+ Neue Regel]         │
│                                                                                  │
│  RULES MANAGEMENT                                                                │
│  Verwalte Risk-Engine Regeln (Admin/Security only)                               │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  STATS CARDS                                                                     │
│  ┌────────────┬────────────┬────────────┬────────────┬────────────────────────┐ │
│  │ 📊 TOTAL   │ 🟢 ACTIVE  │ 🟡 TESTING │ ⚪ INACTIVE│ 📈 TOTAL TRIGGERS      │ │
│  │    40      │    32      │     5      │     3      │      12,847            │ │
│  └────────────┴────────────┴────────────┴────────────┴────────────────────────┘ │
│                                                                                  │
│  FILTERS                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │ [🔍 Search rules...]     [Category ▼]     [Status ▼]                         ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  RULES TABLE                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │ RULE NAME          │ CATEGORY    │ WEIGHT │ STATUS   │ TRIGGERS │ ACTIONS   ││
│  │ ─────────────────────────────────────────────────────────────────────────────││
│  │ new_iban           │ USER        │ ████░ +15 │ 🟢 ACTIVE │ 1,284   │ [▶][✏️][🗑️] ││
│  │ Neue IBAN < 24h    │             │          │           │         │           ││
│  │ ─────────────────────────────────────────────────────────────────────────────││
│  │ high_amount        │ TRANSACTION │ ██████ +25│ 🟢 ACTIVE │   847   │ [▶][✏️][🗑️] ││
│  │ Betrag > 10.000€   │             │          │           │         │           ││
│  │ ─────────────────────────────────────────────────────────────────────────────││
│  │ fraud_flags        │ USER        │ █████ +20 │ 🟢 ACTIVE │   234   │ [▶][✏️][🗑️] ││
│  │ Fraud-Flags vorhanden            │          │           │         │           ││
│  │ ─────────────────────────────────────────────────────────────────────────────││
│  │ vat_mismatch       │ COMPANY     │ █████ +20 │ 🟢 ACTIVE │   156   │ [▶][✏️][🗑️] ││
│  │ USt-IdNr. stimmt nicht           │          │           │         │           ││
│  │ ─────────────────────────────────────────────────────────────────────────────││
│  │ multiple_devices   │ USER        │ ██░░░ +6  │ 🟡 TESTING│    45   │ [▶][✏️][🗑️] ││
│  │ 3+ Devices in 24h  │             │          │           │         │           ││
│  │ ─────────────────────────────────────────────────────────────────────────────││
│  │ payout_velocity    │ TRANSACTION │ ████░ +18 │ ⚪ INACTIVE│     0   │ [▶][✏️][🗑️] ││
│  │ >3 Payouts in 24h  │             │          │           │         │           ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  INFO BOX                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │ ℹ️  Regeln werden in Echtzeit angewendet. Neue Regeln sollten immer im       ││
│  │    Status "Testing" gestartet werden, bevor sie auf "Active" gesetzt werden. ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘


EDIT RULE MODAL
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ✏️ Regel bearbeiten: new_iban                                              [X] │
│  Version 3 • Zuletzt aktualisiert: 10.01.2026 14:30                              │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Rule Name                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ new_iban                                                                   │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  Category                                              Status                   │
│  ┌──────────────────────────────┐  ┌────────────────────────────────────────┐   │
│  │ USER                     ▼   │  │ ACTIVE                              ▼   │   │
│  └──────────────────────────────┘  └────────────────────────────────────────┘   │
│                                                                                  │
│  Weight (Score Impact)                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ 15                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│  ℹ️ 1-50 Punkte                                                                 │
│                                                                                  │
│  Description                                                                    │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ IBAN wurde vor weniger als 24h hinzugefügt                                 │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  Conditions (JSON)                                                              │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ [                                                                          │ │
│  │   { "field": "iban_age_hours", "operator": "less_than", "value": 24 }     │ │
│  │ ]                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│  ℹ️ Operators: equals, not_equals, greater_than, less_than, contains, exists   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                                               [Abbrechen]  [Regel speichern]││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘


TEST RULE MODAL
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🧪 Test Rule: new_iban                                                    [X]  │
│  Führe diese Regel mit einem Test-Context aus                                    │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Test Context (JSON)                                                            │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ {                                                                          │ │
│  │   "user_id": "u_123",                                                      │ │
│  │   "iban_age_hours": 12                                                     │ │
│  │ }                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  [▶ Test ausführen]                                                             │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │ ⚠️ TEST ERGEBNIS                                                            ││
│  │ ──────────────────────────────────────────────────────────────────────────── ││
│  │ Matched Rules    new_iban                                                   ││
│  │ Total Score      +15                                                        ││
│  │ Risk Level       🟡 YELLOW                                                  ││
│  │ Duration         45ms                                                       ││
│  │                                                                              ││
│  │ Details:                                                                     ││
│  │ { "conditions_checked": 1, "conditions_matched": 1 }                        ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

# 🎨 Teil 2: Figma Struktur

## 2.1 Frame-Hierarchie

```
📁 CargoBit Risk Dashboard
│
├── 📁 Pages
│   ├── 📄 Overview
│   │   ├── Frame: Dashboard Overview
│   │   └── Frame: Dashboard Overview (Dark Mode)
│   │
│   ├── 📄 Risk Profile
│   │   ├── Frame: User Profile (GREEN)
│   │   ├── Frame: User Profile (YELLOW)
│   │   ├── Frame: User Profile (RED)
│   │   ├── Frame: Company Profile
│   │   └── Frame: Transaction Profile
│   │
│   ├── 📄 Rules Management
│   │   ├── Frame: Rules List
│   │   ├── Frame: Edit Rule Modal
│   │   └── Frame: Test Rule Modal
│   │
│   └── 📁 Components
│       ├── 📄 Buttons
│       ├── 📄 Badges
│       ├── 📄 Cards
│       ├── 📄 Tables
│       ├── 📄 Charts
│       └── 📄 Forms
│
└── 📁 Assets
    ├── 📁 Icons
    └── 📁 Illustrations
```

---

## 2.2 Atomic Design Struktur

### 🔵 Atoms (Grundelemente)

```
Atoms/
├── Colors/
│   ├── Risk Colors
│   │   ├── Green (#2ECC71)
│   │   ├── Yellow (#F1C40F)
│   │   ├── Red (#E74C3C)
│   │   └── Grey (#BDC3C7)
│   │
│   ├── UI Colors
│   │   ├── Primary (#2D8CFF)
│   │   ├── Primary Dark (#1B6ED6)
│   │   ├── Background (#F7F9FB)
│   │   ├── Card Background (#FFFFFF)
│   │   ├── Border (#E0E6ED)
│   │   ├── Text Primary (#1F2D3D)
│   │   └── Text Secondary (#6B7C93)
│   │
│   └── Semantic Colors
│       ├── Success (#2ECC71)
│       ├── Warning (#F1C40F)
│       ├── Error (#E74C3C)
│       └── Info (#2D8CFF)
│
├── Typography/
│   ├── H1 (32px, Bold)
│   ├── H2 (24px, Semibold)
│   ├── H3 (18px, Semibold)
│   ├── Body (14px, Regular)
│   ├── Caption (12px, Regular)
│   └── Mono (13px, Monospace)
│
├── Icons/
│   ├── Shield
│   ├── AlertTriangle
│   ├── AlertCircle
│   ├── CheckCircle
│   ├── Users
│   ├── Building2
│   ├── Truck
│   ├── TrendingUp
│   ├── TrendingDown
│   ├── Activity
│   ├── Clock
│   ├── Search
│   ├── Filter
│   ├── Edit
│   ├── Trash
│   ├── Play
│   └── Plus
│
└── Spacers/
    ├── xs (4px)
    ├── sm (8px)
    ├── md (16px)
    ├── lg (24px)
    ├── xl (32px)
    └── 2xl (48px)
```

---

### 🟢 Molecules (Kombinierte Elemente)

```
Molecules/
├── Button/
│   ├── Primary
│   │   ├── Default
│   │   ├── Hover (#1B6ED6)
│   │   ├── Disabled (#AFCBFF)
│   │   ├── With Icon
│   │   └── Loading
│   │
│   ├── Secondary
│   │   ├── Default
│   │   ├── Hover (#EAF3FF)
│   │   ├── Disabled
│   │   └── With Icon
│   │
│   ├── Danger
│   │   ├── Default (#E74C3C)
│   │   ├── Hover (#C0392B)
│   │   ├── Disabled
│   │   └── With Icon
│   │
│   └── Ghost
│       ├── Default
│       ├── Hover
│       └── Disabled
│
├── Badge/
│   ├── Risk Level
│   │   ├── Green (bg: #E8F8F0, text: #2ECC71)
│   │   ├── Yellow (bg: #FFF9E6, text: #F1C40F)
│   │   ├── Red (bg: #FDEDEC, text: #E74C3C)
│   │   └── Grey (bg: #F2F4F7, text: #6B7C93)
│   │
│   └── Entity Type
│       ├── User (bg: #E8F4FD, text: #2D8CFF)
│       ├── Company (bg: #F3E8FD, text: #8B5CF6)
│       └── Transaction (bg: #FEF3E8, text: #F59E0B)
│
├── Input/
│   ├── Default
│   ├── With Icon
│   ├── Focus
│   ├── Error
│   └── Disabled
│
├── Select/
│   ├── Default
│   ├── Open
│   └── Selected
│
├── KPI Card/
│   ├── With Trend Up
│   ├── With Trend Down
│   ├── Without Trend
│   └── Loading
│
└── Score Circle/
    ├── Small (48px)
    ├── Medium (64px)
    └── Large (96px)
        ├── Green (0-30)
        ├── Yellow (31-60)
        └── Red (61-100)
```

---

### 🟠 Organisms (Komplexe Komponenten)

```
Organisms/
├── Sidebar/
│   ├── Collapsed
│   └── Expanded
│       ├── Logo Section
│       ├── Navigation Items
│       └── User Profile
│
├── Header/
│   ├── Default
│   └── With Breadcrumb
│
├── Risk Trend Chart/
│   ├── 7 Days
│   ├── 30 Days
│   └── Custom Range
│
├── Risk Distribution Card/
│   ├── Green Bar
│   ├── Yellow Bar
│   ├── Red Bar
│   └── Entity Type Breakdown
│
├── Risk Events Table/
│   ├── Header Row
│   ├── Data Row
│   ├── Empty State
│   └── Loading State
│
├── High Risk Entities Table/
│   ├── With Actions
│   ├── Without Actions
│   └── Selected Row
│
├── Triggered Rules List/
│   ├── Collapsed
│   ├── Expanded
│   └── Empty
│
├── Score History Chart/
│   ├── With Threshold Zones
│   └── Without Zones
│
├── Event Timeline/
│   ├── Vertical
│   └── Horizontal
│
├── Rule Editor Modal/
│   ├── Create Mode
│   ├── Edit Mode
│   └── Test Mode
│
├── Rules Table/
│   ├── Header
│   ├── Row (Active)
│   ├── Row (Testing)
│   ├── Row (Inactive)
│   └── Actions Column
│
└── Support Ticket Card/
    ├── Open
    ├── In Progress
    └── Resolved
```

---

### 🔴 Templates (Seiten-Layouts)

```
Templates/
├── Dashboard Layout/
│   ├── Sidebar (left)
│   ├── Header (top)
│   └── Main Content (center)
│
├── Detail Layout/
│   ├── Back Navigation
│   ├── Left Column (Score, Actions, Details)
│   └── Right Column (Rules, History, Events)
│
└── Management Layout/
│   ├── Header with Actions
│   ├── Stats Row
│   ├── Filters Row
│   └── Data Table
```

---

## 2.3 Component Variants (Detail)

### Button Variants

| Variant | Background | Text | Border | Radius | Padding |
|---------|------------|------|--------|--------|---------|
| Primary Default | #2D8CFF | #FFFFFF | none | 8px | 10px 20px |
| Primary Hover | #1B6ED6 | #FFFFFF | none | 8px | 10px 20px |
| Primary Disabled | #AFCBFF | #FFFFFF | none | 8px | 10px 20px |
| Secondary Default | #FFFFFF | #2D8CFF | 1px #2D8CFF | 8px | 10px 20px |
| Secondary Hover | #EAF3FF | #2D8CFF | 1px #2D8CFF | 8px | 10px 20px |
| Danger Default | #E74C3C | #FFFFFF | none | 8px | 10px 20px |
| Danger Hover | #C0392B | #FFFFFF | none | 8px | 10px 20px |

### Badge Variants

| Type | Background | Text | Padding | Radius | Font Size |
|------|------------|------|---------|--------|-----------|
| GREEN | #E8F8F0 | #2ECC71 | 4px 8px | 4px | 12px |
| YELLOW | #FFF9E6 | #F1C40F | 4px 8px | 4px | 12px |
| RED | #FDEDEC | #E74C3C | 4px 8px | 4px | 12px |
| GREY | #F2F4F7 | #6B7C93 | 4px 8px | 4px | 12px |
| USER | #E8F4FD | #2D8CFF | 4px 8px | 4px | 12px |
| COMPANY | #F3E8FD | #8B5CF6 | 4px 8px | 4px | 12px |
| TRANSACTION | #FEF3E8 | #F59E0B | 4px 8px | 4px | 12px |

### Risk Score Circle

| Size | Diameter | Font Size | Stroke Width |
|------|----------|-----------|--------------|
| Small | 48px | 14px | 3px |
| Medium | 64px | 18px | 4px |
| Large | 96px | 28px | 6px |

| Level | Stroke Color | Background |
|-------|--------------|------------|
| GREEN (0-30) | #2ECC71 | #E8F8F0 |
| YELLOW (31-60) | #F1C40F | #FFF9E6 |
| RED (61-100) | #E74C3C | #FDEDEC |

### Table Row States

| State | Background | Border | Text Color |
|-------|------------|--------|------------|
| Default | #FFFFFF | bottom #E0E6ED | #1F2D3D |
| Hover | #F2F6FA | bottom #E0E6ED | #1F2D3D |
| Selected | #EAF3FF | bottom #2D8CFF | #1F2D3D |

---

## 2.4 Spacing & Grid System

```
Grid System:
- Columns: 12
- Gutter: 24px
- Margin: 24px

Breakpoints:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: 1024px - 1440px
- Large: > 1440px

Spacing Scale:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
```

---

## 2.5 Interaction States

### Buttons
```
Normal → Hover → Active → Disabled → Loading

Primary:  #2D8CFF → #1B6ED6 → #1457A6 → #AFCBFF → Animated Spinner
Secondary: #FFFFFF → #EAF3FF → #D4E6FF → #F7F9FB → Animated Spinner
Danger:   #E74C3C → #C0392B → #922B21 → #F5B7B1 → Animated Spinner
```

### Cards
```
Default → Hover → Selected → Loading

Border:   #E0E6ED → #2D8CFF → #2D8CFF → #E0E6ED
Shadow:   0 1px 3px → 0 4px 12px → 0 4px 12px → none
```

### Table Rows
```
Default → Hover → Selected → Active

Background: #FFFFFF → #F2F6FA → #EAF3FF → #EAF3FF
```

---

## 2.6 Animation Specifications

```
Transitions:
- Default: 150ms ease-in-out
- Fast: 100ms ease-in-out
- Slow: 300ms ease-in-out

Hover Effects:
- Button: background-color 150ms
- Card: box-shadow 200ms
- Table Row: background-color 100ms

Loading States:
- Spinner: rotate 1s linear infinite
- Skeleton: pulse 2s ease-in-out infinite
- Fade: opacity 300ms ease-in-out
```

---

# 📋 Teil 3: Implementierungs-Checkliste

## Für Figma Designer

- [ ] Alle Atoms erstellen (Colors, Typography, Icons)
- [ ] Molecules mit allen Varianten anlegen
- [ ] Organisms als wiederverwendbare Components
- [ ] Templates für alle 3 Screens
- [ ] Responsive Breakpoints testen
- [ ] Dark Mode Varianten (optional)
- [ ] Accessibility (WCAG 2.1 AA) prüfen

## Für Frontend Entwickler

- [ ] Design Tokens in CSS Variables konvertieren
- [ ] Tailwind Config erweitern
- [ ] Components mit shadcn/ui erstellen
- [ ] Charts mit Recharts/Chart.js implementieren
- [ ] Responsive Layouts testen
- [ ] Animationen mit Framer Motion
- [ ] Unit Tests für Components

---

# 📁 Dateien in diesem Projekt

| Datei | Beschreibung |
|-------|--------------|
| `design-tokens.ts` | Design System Token |
| `risk-overview.tsx` | Screen 1: Dashboard Overview |
| `risk-profile-detail.tsx` | Screen 2: Risk Profile Detail |
| `rules-management.tsx` | Screen 3: Rules Management |
| `risk-dashboard-container.tsx` | Main Container mit Navigation |

---

*Dokumentation erstellt für CargoBit Security Team*
*Version 1.0 | April 2026*
