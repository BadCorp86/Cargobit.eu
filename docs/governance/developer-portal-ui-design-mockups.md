# CargoBit Developer Portal UI-Design Mockups

**Dokument-Typ:** High-Fidelity Design-Spezifikation  
**Version:** 1.0.0  
**Status:** Final  
**Letzte Aktualisierung:** 2024-01-15  
**Verantwortlich:** Design Team  

---

## Inhaltsverzeichnis

1. [Mockup-Konventionen](#1-mockup-konventionen)
2. [Homepage](#2-homepage)
3. [Getting Started Page](#3-getting-started-page)
4. [API Reference Page](#4-api-reference-page)
5. [API Explorer Tool](#5-api-explorer-tool)
6. [Webhook Simulator](#6-webhook-simulator)
7. [Documentation Page](#7-documentation-page)
8. [Dashboard Page](#8-dashboard-page)
9. [Search Results Page](#9-search-results-page)
10. [Settings Page](#10-settings-page)

---

## 1. Mockup-Konventionen

### 1.1 Layout-Raster

```
Desktop (1280px Container):
├── Header: 64px height, sticky
├── Content: flexible height
│   ├── Left Sidebar: 280px (optional)
│   ├── Main Content: flexible
│   └── Right Sidebar: 240px (optional)
└── Footer: variable height

Spacing: 8px Grid System
Max Width: 1280px
Padding: 24px horizontal
```

### 1.2 Komponenten-Legende

```
[Button]     - Primary Action
[Link]       - Secondary Action
[Dropdown]   - Select/Menu
[Input]      - Text Input
[Tab]        - Tab Navigation
[Card]       - Content Container
[Badge]      - Status Indicator
[Icon]       - Symbol/Image
```

### 1.3 Farbkodierung in Mockups

```
═════════════  Primary Background (White/Grey)
───────────   Border/Divider
[Primary]      Primary Button (Blue)
[Secondary]    Secondary Button (Outline)
■■■■■■■■■■     Filled Area (Blue)
░░░░░░░░░░     Filled Area (Grey)
```

---

## 2. Homepage

### 2.1 Full Page Mockup

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  TOP NAVIGATION                                                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────┐                                                                ║
║  │ CargoBit│  Getting Started  API Reference  Tools  Guides  Architecture  ║
║  │   ▲▲▲   │                                                                ║
║  └─────────┘                                ┌──────────────────┐  ┌──────┐  ║
║                                             │ 🔍 Search...     │  │Login │  ║
║                                             └──────────────────┘  └──────┘  ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  HERO SECTION                                                                ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌───────────────────────────────────────────────────────────────────────┐   ║
║  │                                                                       │   ║
║  │                        CargoBit Developer Portal                      │   ║
║  │                        ═══════════════════════════                    │   ║
║  │                                                                       │   ║
║  │            Build, test, and integrate payments in minutes.           │   ║
║  │                                                                       │   ║
║  │            Enterprise-grade payment infrastructure with              │   ║
║  │            deterministic guarantees and full compliance.             │   ║
║  │                                                                       │   ║
║  │            ┌──────────────────┐  ┌────────────────────┐              │   ║
║  │            │  Get Started →   │  │  Explore APIs →   │              │   ║
║  │            └──────────────────┘  └────────────────────┘              │   ║
║  │                                                                       │   ║
║  └───────────────────────────────────────────────────────────────────────┘   ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  QUICK ACCESS SECTION                                                        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Start Building in Minutes                                                   ║
║  ─────────────────────────                                                   ║
║                                                                               ║
║  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐   ║
║  │                     │  │                     │  │                     │   ║
║  │  📚                 │  │  🔗                 │  │  🔑                 │   ║
║  │                     │  │                     │  │                     │   ║
║  │  First API Call     │  │  Webhook Setup      │  │  Sandbox Keys       │   ║
║  │  ───────────────    │  │  ─────────────      │  │  ───────────        │   ║
║  │                     │  │                     │  │                     │   ║
║  │  Make your first    │  │  Configure your     │  │  Generate test      │   ║
║  │  API request in     │  │  webhook endpoint   │  │  API keys for       │   ║
║  │  under 5 minutes    │  │  in minutes         │  │  the sandbox        │   ║
║  │                     │  │                     │  │                     │   ║
║  │  [Open Guide →]     │  │  [Open Guide →]     │  │  [Generate →]       │   ║
║  │                     │  │                     │  │                     │   ║
║  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘   ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  FEATURES SECTION                                                            ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Why CargoBit?                                                               ║
║  ────────────                                                                ║
║                                                                               ║
║  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐   ║
║  │  ⚡ Fast            │  │  🔒 Secure          │  │  📊 Reliable        │   ║
║  │  ──────             │  │  ───────            │  │  ─────────          │   ║
║  │                     │  │                     │  │                     │   ║
║  │  Sub-100ms API      │  │  Enterprise-grade   │  │  99.95% uptime      │   ║
║  │  response times     │  │  security with      │  │  SLA guaranteed     │   ║
║  │  globally           │  │  full compliance    │  │  with SLO alerts    │   ║
║  │                     │  │                     │  │                     │   ║
║  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘   ║
║                                                                               ║
║  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐   ║
║  │  🛠️ Tools           │  │  📖 Documentation   │  │  🎯 Support         │   ║
║  │  ──────             │  │  ──────────────     │  │  ────────           │   ║
║  │                     │  │                     │  │                     │   ║
║  │  Interactive API    │  │  Comprehensive      │  │  Dedicated partner  │   ║
║  │  Explorer, Webhook  │  │  guides, API docs   │  │  support with       │   ║
║  │  Simulator & more   │  │  and code samples   │  │  fast response      │   ║
║  │                     │  │                     │  │                     │   ║
║  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘   ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  LATEST UPDATES SECTION                                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Latest Updates                                               [View All →]   ║
║  ───────────────                                                             ║
║                                                                               ║
║  ┌───────────────────────────────────────────────────────────────────────┐   ║
║  │  NEW                                            January 15, 2024       │   ║
║  │  API v2.1 Released                                                    │   ║
║  │  New batch operations endpoint, improved rate limits, bug fixes      │   ║
║  │                                                      [Changelog →]    │   ║
║  └───────────────────────────────────────────────────────────────────────┘   ║
║                                                                               ║
║  ┌───────────────────────────────────────────────────────────────────────┐   ║
║  │  IMPROVEMENT                                    January 10, 2024      │   ║
║  │  Webhook Retry Logic Enhanced                                         │   ║
║  │  Exponential backoff, configurable retry policies, better logging    │   ║
║  │                                                      [Changelog →]    │   ║
║  └───────────────────────────────────────────────────────────────────────┘   ║
║                                                                               ║
║  ┌───────────────────────────────────────────────────────────────────────┐   ║
║  │  FEATURE                                        January 5, 2024       │   ║
║  │  Ledger Consistency Checker Added                                     │   ║
║  │  Automated verification of ledger integrity with audit reports       │   ║
║  │                                                      [Changelog →]    │   ║
║  └───────────────────────────────────────────────────────────────────────┘   ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  FOOTER                                                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Documentation  │  API Status  │  Security  │  Terms  │  Privacy  │  Contact ║
║                                                                               ║
║  ┌───────────────────────────────────────────────────────────────────────┐   ║
║  │  PRODUCT          │  RESOURCES       │  COMPANY        │  LEGAL      │   ║
║  │  API Reference    │  Documentation   │  About          │  Terms      │   ║
║  │  Webhooks         │  Changelog       │  Blog           │  Privacy    │   ║
║  │  Tools            │  Status          │  Careers        │  Cookies    │   ║
║  │  Pricing          │  Support         │  Contact        │  Security   │   ║
║  └───────────────────────────────────────────────────────────────────────┘   ║
║                                                                               ║
║  © 2024 CargoBit. All rights reserved.                                      ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### 2.2 Design-Spezifikation

| Element | Spezifikation |
|---------|---------------|
| Hero Background | Gradient: Navy (#0A1A2F) to Blue (#0057FF) |
| Hero Title | 48px, Bold, White |
| Hero Subtitle | 20px, Regular, Grey (#E5E5EA) |
| Primary CTA | Blue Button, 16px, Semibold |
| Secondary CTA | Ghost Button, White border |
| Feature Cards | White, Border: 1px #E5E5EA, Hover: Shadow |
| Update Cards | Border-left: 4px, colored by type |

---

## 3. Getting Started Page

### 3.1 Full Page Mockup

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  TOP NAVIGATION                                                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │  Getting Started                                                        │ ║
║  │  ════════════════                                                       │ ║
║  │                                                                         │ ║
║  │  Learn how to integrate CargoBit into your application                 │ ║
║  │                                                                         │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │                                                                         │ ║
║  │  STEP 1                                    STEP 2                       │ ║
║  │  ┌──────────────────┐                     ┌──────────────────┐         │ ║
║  │  │       1          │─────────────────────│        2         │         │ ║
║  │  │   Get API Keys   │                     │   Make Request   │         │ ║
║  │  └──────────────────┘                     └──────────────────┘         │ ║
║  │                                                                         │ ║
║  │  STEP 3                                    STEP 4                       │ ║
║  │  ┌──────────────────┐                     ┌──────────────────┐         │ ║
║  │  │       3          │─────────────────────│        4         │         │ ║
║  │  │   Setup Webhook  │                     │    Go Live       │         │ ║
║  │  └──────────────────┘                     └──────────────────┘         │ ║
║  │                                                                         │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │  STEP 1: Get Your API Keys                                              │ ║
║  │  ════════════════════════                                               │ ║
║  │                                                                         │ ║
║  │  Before you can make API requests, you need to generate API keys.     │ ║
║  │  We provide both sandbox and production environments.                  │ ║
║  │                                                                         │ ║
║  │  ┌───────────────────────────────────────────────────────────────────┐ │ ║
║  │  │  💡 TIP                                                          │ │ ║
║  │  │  Use sandbox keys for development and testing. Production keys   │ │ ║
║  │  │  are for live transactions and have real money attached.         │ │ ║
║  │  └───────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                         │ ║
║  │  1. Navigate to the Dashboard                                         │ ║
║  │  2. Click "Generate API Key" in the sidebar                           │ ║
║  │  3. Select environment (Sandbox or Production)                        │ ║
║  │  4. Copy your key immediately (shown only once!)                      │ ║
║  │                                                                         │ ║
║  │  ┌───────────────────────────────────────────────────────────────────┐ │ ║
║  │  │                                                                   │ │ ║
║  │  │  Sandbox Key: ••••••••••••••••••••••••••••••••abc123             │ │ ║
║  │  │                                                                   │ │ ║
║  │  │  [Copy]  [Regenerate]  [Reveal]                                  │ │ ║
║  │  │                                                                   │ │ ║
║  │  └───────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                         │ ║
║  │                                            [Next: Make a Request →]    │ ║
║  │                                                                         │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  FOOTER                                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 4. API Reference Page

### 4.1 Full Page Mockup

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  TOP NAVIGATION                                                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  API Reference > Payments > POST /payments                                   ║
║                                                                               ║
╠═══════════════════╦═══════════════════════════════════════════╦═══════════════╣
║  LEFT SIDEBAR     ║  MAIN CONTENT                            ║  RIGHT SIDEBAR║
║  (280px)          ║                                          ║  (240px)      ║
║                   ║                                          ║               ║
╠═══════════════════╬═══════════════════════════════════════════╬═══════════════╣
║                   ║                                          ║               ║
║  API Reference    ║  POST /payments                          ║  ON THIS PAGE ║
║  ─────────────    ║  ═════════════                           ║  ──────────── ║
║                   ║                                          ║               ║
║  ▼ Payments       ║  Create a new payment                    ║  Overview     ║
║    ● Overview     ║                                          ║  Request      ║
║    ● POST /pay... ║  Creates a new payment object and        ║  Parameters   ║
║    ○ GET /pay...  ║  initiates the payment process.         ║  Response     ║
║    ○ Errors       ║                                          ║  Errors       ║
║                   ║  ─────────────────────────────────────   ║               ║
║  ▶ Wallets        ║                                          ║  TRY IT       ║
║                   ║  Authentication: API Key required        ║  ──────       ║
║  ▶ Webhooks       ║  Rate Limit: 100 req/min                 ║               ║
║                   ║  Idempotency: Supported                  ║  Environment: ║
║  ▶ Errors         ║                                          ║  [●] Sandbox  ║
║                   ║  ─────────────────────────────────────   ║  [ ] Prod     ║
║  ▶ Common         ║                                          ║               ║
║    ○ Idempotency  ║  REQUEST BODY                            ║  API Key:     ║
║    ○ Rate Limits  ║  ─────────────                           ║  ••••••abc    ║
║    ○ Pagination   ║                                          ║               ║
║                   ║  ┌────────────────────────────────────┐ ║  ┌──────────┐ ║
║                   ║  │ Parameter │ Type    │ Required    │ ║  │  Send    │ ║
║                   ║  ├───────────┼─────────┼─────────────┤ ║  │  Request │ ║
║                   ║  │ amount    │ number  │ Yes         │ ║  └──────────┘ ║
║                   ║  │ currency  │ string  │ Yes         │ ║               ║
║                   ║  │ wallet_id │ string  │ No          │ ║               ║
║                   ║  │ metadata  │ object  │ No          │ ║               ║
║                   ║  └────────────────────────────────────┘ ║               ║
║                   ║                                          ║               ║
║                   ║  ─────────────────────────────────────   ║               ║
║                   ║                                          ║               ║
║                   ║  CODE EXAMPLES                           ║               ║
║                   ║  ──────────────                          ║               ║
║                   ║                                          ║               ║
║                   ║  [cURL] [JavaScript] [Python] [Go]      ║               ║
║                   ║                                          ║               ║
║                   ║  ┌────────────────────────────────────┐ ║               ║
║                   ║  │ curl -X POST \                     │ ║               ║
║                   ║  │   https://api.cargobit.io/v1/...  │ ║               ║
║                   ║  │   -H "Authorization: Bearer ..."  │ ║               ║
║                   ║  │   -H "Content-Type: application/" │ ║               ║
║                   ║  │   -d '{                            │ ║               ║
║                   ║  │     "amount": 1000,               │ ║               ║
║                   ║  │     "currency": "EUR"             │ ║               ║
║                   ║  │   }'                               │ ║               ║
║                   ║  │                        [Copy]     │ ║               ║
║                   ║  └────────────────────────────────────┘ ║               ║
║                   ║                                          ║               ║
║                   ║  ─────────────────────────────────────   ║               ║
║                   ║                                          ║               ║
║                   ║  RESPONSE                                ║               ║
║                   ║  ────────                                ║               ║
║                   ║                                          ║               ║
║                   ║  Status: 201 Created                     ║               ║
║                   ║                                          ║               ║
║                   ║  ┌────────────────────────────────────┐ ║               ║
║                   ║  │ {                                  │ ║               ║
║                   ║  │   "id": "pay_abc123def456",       │ ║               ║
║                   ║  │   "status": "pending",            │ ║               ║
║                   ║  │   "amount": 1000,                 │ ║               ║
║                   ║  │   "currency": "EUR",              │ ║               ║
║                   ║  │   "created_at": "2024-01-15..."   │ ║               ║
║                   ║  │ }                                  │ ║               ║
║                   ║  └────────────────────────────────────┘ ║               ║
║                   ║                                          ║               ║
║                   ║  ─────────────────────────────────────   ║               ║
║                   ║                                          ║               ║
║                   ║  ERRORS                                  ║               ║
║                   ║  ──────                                  ║               ║
║                   ║                                          ║               ║
║                   ║  400 Bad Request - Invalid parameters   ║               ║
║                   ║  401 Unauthorized - Invalid API key     ║               ║
║                   ║  429 Too Many Requests - Rate limit     ║               ║
║                   ║                                          ║               ║
║                   ║  [View All Errors →]                     ║               ║
║                   ║                                          ║               ║
╠═══════════════════╩═══════════════════════════════════════════╩═══════════════╣
║  FOOTER                                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 5. API Explorer Tool

### 5.1 Full Page Mockup

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  TOP NAVIGATION                                                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │ [API Explorer]  [Webhook Simulator]  [Schema Viewer]  [Event Replay]   │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │                                                                         │ ║
║  │  REQUEST BUILDER                                       ENVIRONMENT     │ ║
║  │  ───────────────                                       ───────────     │ ║
║  │                                                                         │ ║
║  │  ┌───────────────┐  ┌─────────────────────────────┐  ┌──────────────┐  │ ║
║  │  │ [POST ▼]      │  │ /payments                   │  │ [●] Sandbox  │  │ ║
║  │  └───────────────┘  └─────────────────────────────┘  │ [ ] Prod     │  │ ║
║  │                                                      └──────────────┘  │ ║
║  │                                                                         │ ║
║  │  HEADERS                                              [Add Header]     │ ║
║  │  ────────                                                              │ ║
║  │  ┌───────────────────────────────────────────────────────────────────┐ │ ║
║  │  │ Authorization    Bearer sk_test_••••••••••••••••           [×]   │ │ ║
║  │  │ Content-Type     application/json                             [×]   │ │ ║
║  │  │ Idempotency-Key  req_abc123xyz                                [×]   │ │ ║
║  │  └───────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                         │ ║
║  │  BODY                                                   [JSON] [Form]  │ ║
║  │  ────                                                                   │ ║
║  │  ┌───────────────────────────────────────────────────────────────────┐ │ ║
║  │  │ {                                                                 │ │ ║
║  │  │   "amount": 1000,                                                │ │ ║
║  │  │   "currency": "EUR",                                             │ │ ║
║  │  │   "description": "Test payment",                                 │ │ ║
║  │  │   "metadata": {                                                  │ │ ║
║  │  │     "order_id": "ORD-12345"                                      │ │ ║
║  │  │   }                                                               │ │ ║
║  │  │ }                                                                 │ │ ║
║  │  │                                                                   │ │ ║
║  │  └───────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                         │ ║
║  │  [Beautify]  [Clear]  [Load Example]         [Send Request →]         │ ║
║  │                                                                         │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │                                                                         │ ║
║  │  RESPONSE                                     Time: 45ms  ID: req_xyz   │ ║
║  │  ────────                                                               │ ║
║  │                                                                         │ ║
║  │  Status: 201 Created                                                    │ ║
║  │                                                                         │ ║
║  │  ┌───────────────────────────────────────────────────────────────────┐ │ ║
║  │  │ {                                                                 │ │ ║
║  │  │   "id": "pay_abc123def456ghi789",                                 │ │ ║
║  │  │   "object": "payment",                                            │ │ ║
║  │  │   "status": "pending",                                            │ │ ║
║  │  │   "amount": 1000,                                                 │ │ ║
║  │  │   "currency": "EUR",                                              │ │ ║
║  │  │   "description": "Test payment",                                  │ │ ║
║  │  │   "metadata": {                                                   │ │ ║
║  │  │     "order_id": "ORD-12345"                                       │ │ ║
║  │  │   },                                                               │ │ ║
║  │  │   "created_at": "2024-01-15T10:30:00Z",                           │ │ ║
║  │  │   "updated_at": "2024-01-15T10:30:00Z"                            │ │ ║
║  │  │ }                                                                 │ │ ║
║  │  └───────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                         │ ║
║  │  [Copy Response]  [View in Docs]  [Save to History]                   │ ║
║  │                                                                         │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  FOOTER                                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 6. Webhook Simulator

### 6.1 Full Page Mockup

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  TOP NAVIGATION                                                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │ [API Explorer]  [Webhook Simulator]  [Schema Viewer]  [Event Replay]   │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │                                                                         │ ║
║  │  WEBHOOK SIMULATOR                                                     │ ║
║  │  Test your webhook integration with simulated events                   │ ║
║  │                                                                         │ ║
║  │  ─────────────────────────────────────────────────────────────────     │ ║
║  │                                                                         │ ║
║  │  EVENT TYPE                                                            │ ║
║  │  ┌───────────────────────────────────────────────────────────────────┐ │ ║
║  │  │ payment.created                                             [▼]   │ │ ║
║  │  └───────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                         │ ║
║  │  TARGET URL                                                            │ ║
║  │  ┌───────────────────────────────────────────────────────────────────┐ │ ║
║  │  │ https://your-server.com/webhooks/cargobit                         │ │ ║
║  │  └───────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                         │ ║
║  │  SECRET (for signature validation)                      [Generate]     │ ║
║  │  ┌───────────────────────────────────────────────────────────────────┐ │ ║
║  │  │ whsec_•••••••••••••••••••••••••••••••••••••••••            [👁]   │ │ ║
║  │  └───────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                         │ ║
║  │  EVENT PAYLOAD                                           [Generate]    │ ║
║  │  ┌───────────────────────────────────────────────────────────────────┐ │ ║
║  │  │ {                                                                 │ │ ║
║  │  │   "id": "evt_abc123xyz789",                                       │ │ ║
║  │  │   "object": "event",                                              │ │ ║
║  │  │   "type": "payment.created",                                      │ │ ║
║  │  │   "api_version": "2024-01-15",                                    │ │ ║
║  │  │   "created": 1705315800,                                          │ │ ║
║  │  │   "data": {                                                       │ │ ║
║  │  │     "object": {                                                   │ │ ║
║  │  │       "id": "pay_abc123",                                         │ │ ║
║  │  │       "status": "created",                                        │ │ ║
║  │  │       "amount": 1000                                              │ │ ║
║  │  │     }                                                              │ │ ║
║  │  │   }                                                                │ │ ║
║  │  │ }                                                                 │ │ ║
║  │  └───────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                         │ ║
║  │  SIGNATURE PREVIEW                                                     │ ║
║  │  ┌───────────────────────────────────────────────────────────────────┐ │ ║
║  │  │ X-CargoBit-Signature: t=1705315800,v1=abc123def456ghi789...      │ │ ║
║  │  └───────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                         │ ║
║  │  [Send Webhook →]                                                      │ ║
║  │                                                                         │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │                                                                         │ ║
║  │  DELIVERY RESULT                                                       │ ║
║  │                                                                         │ ║
║  │  ✓ Delivered                                                          │ ║
║  │  HTTP Status: 200 OK                                                   │ ║
║  │  Duration: 125ms                                                       │ ║
║  │                                                                         │ ║
║  │  RESPONSE HEADERS                                                      │ ║
║  │  ┌───────────────────────────────────────────────────────────────────┐ │ ║
║  │  │ content-type: application/json                                    │ │ ║
║  │  │ date: Mon, 15 Jan 2024 10:30:00 GMT                               │ │ ║
║  │  └───────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                         │ ║
║  │  RESPONSE BODY                                                         │ ║
║  │  ┌───────────────────────────────────────────────────────────────────┐ │ ║
║  │  │ { "received": true, "event_id": "evt_abc123xyz789" }              │ │ ║
║  │  └───────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                         │ ║
║  │  [Replay Event]  [View in Logs]  [Save Configuration]                 │ ║
║  │                                                                         │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  FOOTER                                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 7. Documentation Page

### 7.1 Full Page Mockup

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  TOP NAVIGATION                                                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Documentation > Architecture > Overview                                     ║
║                                                                               ║
╠═══════════════════╦═══════════════════════════════════════════╦═══════════════╣
║  LEFT SIDEBAR     ║  MAIN CONTENT                            ║  RIGHT SIDEBAR║
║  (280px)          ║                                          ║  (240px)      ║
║                   ║                                          ║               ║
╠═══════════════════╬═══════════════════════════════════════════╬═══════════════╣
║                   ║                                          ║               ║
║  Documentation    ║  Architecture Overview                   ║  ON THIS PAGE ║
║  ─────────────    ║  ═════════════════════                   ║  ──────────── ║
║                   ║                                          ║               ║
║  ▼ Architecture   ║  This document provides a comprehensive  ║  Introduction ║
║    ● Overview     ║  overview of the CargoBit system         ║  Components   ║
║    ● Components   ║  architecture.                           ║  Data Flow    ║
║    ● Data Model   ║                                          ║  Diagrams     ║
║    ○ Diagrams     ║  ─────────────────────────────────────   ║               ║
║                   ║                                          ║  RESOURCES    ║
║  ▶ Security       ║  Introduction                            ║  ─────────    ║
║                   ║  ───────────                             ║               ║
║  ▶ Compliance     ║                                          ║  API Reference║
║                   ║  CargoBit is built on a multi-agent      ║  Deep Dive    ║
║  ▶ Operations     ║  architecture that enables deterministic║  Glossary     ║
║                   ║  processing of payments with full audit  ║               ║
║  ▶ Partner        ║  trail and compliance guarantees.        ║               ║
║                   ║                                          ║               ║
║                   ║  ┌────────────────────────────────────┐ ║               ║
║                   ║  │ 💡 KEY CONCEPT                    │ ║               ║
║                   ║  │                                    │ ║               ║
║                   ║  │ Determinism is the core principle │ ║               ║
║                   ║  │ of CargoBit. Every operation      │ ║               ║
║                   ║  │ produces identical results when   │ ║               ║
║                   ║  │ given identical inputs.           │ ║               ║
║                   ║  └────────────────────────────────────┘ ║               ║
║                   ║                                          ║               ║
║                   ║  ─────────────────────────────────────   ║               ║
║                   ║                                          ║               ║
║                   ║  Core Components                        ║               ║
║                   ║  ────────────────                       ║               ║
║                   ║                                          ║               ║
║                   ║  ┌────────────────────────────────────┐ ║               ║
║                   ║  │         ARCHITECTURE DIAGRAM       │ ║               ║
║                   ║  │                                    │ ║               ║
║                   ║  │  ┌─────────┐    ┌─────────┐       │ ║               ║
║                   ║  │  │  API    │───▶│ Agent   │       │ ║               ║
║                   ║  │  │ Gateway │    │ System  │       │ ║               ║
║                   ║  │  └─────────┘    └────┬────┘       │ ║               ║
║                   ║  │                      │             │ ║               ║
║                   ║  │                      ▼             │ ║               ║
║                   ║  │              ┌─────────────┐       │ ║               ║
║                   ║  │              │   Ledger    │       │ ║               ║
║                   ║  │              │   System    │       │ ║               ║
║                   ║  │              └─────────────┘       │ ║               ║
║                   ║  │                                    │ ║               ║
║                   ║  └────────────────────────────────────┘ ║               ║
║                   ║                                          ║               ║
║                   ║  ─────────────────────────────────────   ║               ║
║                   ║                                          ║               ║
║                   ║  [← Previous]                  [Next →] ║               ║
║                   ║                                          ║               ║
╠═══════════════════╩═══════════════════════════════════════════╩═══════════════╣
║  FOOTER                                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 8. Dashboard Page

### 8.1 Full Page Mockup

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  TOP NAVIGATION                                                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Welcome, Partner Name                              [Account]  [Settings]    ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  METRICS OVERVIEW                                                            ║
║  ─────────────────                                                           ║
║                                                                               ║
║  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ║
║  │               │  │               │  │               │  │               │  ║
║  │  API Calls    │  │  Webhook      │  │  Error Rate   │  │  Active       │  ║
║  │               │  │  Delivery     │  │               │  │  Webhooks     │  ║
║  │   12,453      │  │   99.8%       │  │   0.02%       │  │   3           │  ║
║  │               │  │               │  │               │  │               │  ║
║  │  +15% ↑      │  │  +0.5% ↑     │  │  -0.01% ↓    │  │  configured   │  ║
║  │  last 7 days │  │  last 7 days  │  │  last 7 days  │  │               │  ║
║  │               │  │               │  │               │  │               │  ║
║  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘  ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────────────────────────────────────┐  ┌───────────────────────────┐  ║
║  │                                         │  │                           │  ║
║  │  API USAGE (Last 7 Days)                │  │  QUICK ACTIONS            │  ║
║  │  ───────────────────────                │  │  ──────────────           │  ║
║  │                                         │  │                           │  ║
║  │  ┌────────────────────────────────────┐│  │  ┌───────────────────────┐│  ║
║  │  │                                    ││  │  │ 🔑 Generate API Key   ││  ║
║  │  │     ╭──────╮                       ││  │  └───────────────────────┘│  ║
║  │  │    ╭╯      ╰╮                      ││  │                           │  ║
║  │  │   ╭╯        ╰╮    ╭──╮            ││  │  ┌───────────────────────┐│  ║
║  │  │  ╭╯          ╰──╭─╯  ╰──╮        ││  │  │ 📚 View Documentation ││  ║
║  │  │ ╭╯              ╰      ╰─╮      ││  │  └───────────────────────┘│  ║
║  │  │╭╯                       ╰     ││  │                           │  ║
║  │  │╯                                ││  │  ┌───────────────────────┐│  ║
║  │  │                                  ││  │  │ 🔗 Test Webhooks      ││  ║
║  │  │ Mon Tue Wed Thu Fri Sat Sun      ││  │  └───────────────────────┘│  ║
║  │  └────────────────────────────────────┘│  │                           │  ║
║  │                                         │  │  ┌───────────────────────┐│  ║
║  │  Peak: 2,500 requests/hour              │  │  │ 📞 Contact Support    ││  ║
║  │  Average: 1,800 requests/hour           │  │  └───────────────────────┘│  ║
║  │                                         │  │                           │  ║
║  └─────────────────────────────────────────┘  └───────────────────────────┘  ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────────────────────────────────────┐  ┌───────────────────────────┐  ║
║  │                                         │  │                           │  ║
║  │  RECENT EVENTS                          │  │  API KEYS                 │  ║
║  │  ──────────────                         │  │  ─────────                │  ║
║  │                                         │  │                           │  ║
║  │  ● payment.created        2 min ago    │  │  Sandbox Key              │  ║
║  │  ● webhook.delivered      5 min ago    │  │  sk_test_•••••••abc123   │  ║
║  │  ● payment.updated        12 min ago   │  │  Created: Jan 10, 2024    │  ║
║  │  ● webhook.failed         15 min ago   │  │  [Reveal]  [Regenerate]   │  ║
║  │  ● payment.completed      23 min ago   │  │                           │  ║
║  │                                         │  │  ───────────────────────  │  ║
║  │  [View All Events →]                    │  │                           │  ║
║  │                                         │  │  Production Key           │  ║
║  │                                         │  │  sk_live_•••••••def456   │  ║
║  │                                         │  │  Created: Jan 5, 2024     │  ║
║  │                                         │  │  [Reveal]  [Regenerate]   │  ║
║  │                                         │  │                           │  ║
║  └─────────────────────────────────────────┘  └───────────────────────────┘  ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  FOOTER                                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 9. Search Results Page

### 9.1 Full Page Mockup

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  TOP NAVIGATION                                                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │                                                                         │ ║
║  │  🔍  payment ____________________________________________    [Search]   │ ║
║  │                                                                         │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  FILTERS                                                                     ║
║  ────────                                                                    ║
║  [All (24)]  [API (8)]  [Guides (6)]  [Docs (5)]  [FAQ (3)]  [Tools (2)]    ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  RESULTS (24)                                                                ║
║  ────────────                                                                ║
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │                                                                         │ ║
║  │  API Reference                                              [API]       │ ║
║  │  ──────────────                                                         │ ║
║  │                                                                         │ ║
║  │  POST /payments                                                         │ ║
║  │  Create a new payment. The payment will be processed and a unique      │ ║
║  │  ID will be returned. Use this endpoint to initiate all payment...     │ ║
║  │                                                                         │ ║
║  │  ...create a new payment...                                             │ ║
║  │                                                                         │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │                                                                         │ ║
║  │  Guide                                                    [Guide]       │ ║
║  │  ──────                                                                 │ ║
║  │                                                                         │ ║
║  │  Getting Started with Payments                                         │ ║
║  │  Learn how to create your first payment using our API. This guide      │ ║
║  │  walks you through authentication, request format, and handling...     │ ║
║  │                                                                         │ ║
║  │  ...create your first payment...                                       │ ║
║  │                                                                         │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
║  ┌─────────────────────────────────────────────────────────────────────────┐ ║
║  │                                                                         │ ║
║  │  API Reference                                              [API]       │ ║
║  │  ──────────────                                                         │ ║
║  │                                                                         │ ║
║  │  GET /payments/{id}                                                     │ ║
║  │  Retrieve details of a specific payment by its unique identifier.      │ ║
║  │  Returns the payment object with all associated metadata...            │ ║
║  │                                                                         │ ║
║  │  ...specific payment...                                                 │ ║
║  │                                                                         │ ║
║  └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
║  ──────────────────────────────────────────────────────────────────────────  ║
║                                                                               ║
║  [1]  [2]  [3]  ...  [5]                                                    ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  FOOTER                                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 10. Settings Page

### 10.1 Full Page Mockup

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  TOP NAVIGATION                                                              ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Settings                                                                    ║
║                                                                               ║
╠═══════════════════╦═══════════════════════════════════════════════════════════╣
║  LEFT SIDEBAR     ║  MAIN CONTENT                                            ║
║  (280px)          ║                                                          ║
║                   ║                                                          ║
╠═══════════════════╬═══════════════════════════════════════════════════════════╣
║                   ║                                                          ║
║  Settings         ║  Account Settings                                        ║
║  ────────         ║  ═══════════════                                        ║
║                   ║                                                          ║
║  ● General        ║  Profile Information                                    ║
║  ○ API Keys       ║  ───────────────────                                    ║
║  ○ Webhooks       ║                                                          ║
║  ○ Notifications  ║  ┌────────────────────────────────────────────────────┐ ║
║  ○ Security       ║  │  Display Name                                       │ ║
║  ○ Billing        ║  │  ┌────────────────────────────────────────────────┐│ ║
║                   ║  │  │ Partner Name                                    ││ ║
║                   ║  │  └────────────────────────────────────────────────┘│ ║
║                   ║  │                                                      │ ║
║                   ║  │  Email                                               │ ║
║                   ║  │  ┌────────────────────────────────────────────────┐│ ║
║                   ║  │  │ partner@example.com                             ││ ║
║                   ║  │  └────────────────────────────────────────────────┘│ ║
║                   ║  │                                                      │ ║
║                   ║  │  Company                                             │ ║
║                   ║  │  ┌────────────────────────────────────────────────┐│ ║
║                   ║  │  │ Acme Corp                                       ││ ║
║                   ║  │  └────────────────────────────────────────────────┘│ ║
║                   ║  └────────────────────────────────────────────────────┘ ║
║                   ║                                                          ║
║                   ║  ──────────────────────────────────────────────────────  ║
║                   ║                                                          ║
║                   ║  Preferences                                             ║
║                   ║  ───────────                                             ║
║                   ║                                                          ║
║                   ║  ┌────────────────────────────────────────────────────┐ ║
║                   ║  │  Theme                                              │ ║
║                   ║  │  [●] Light  [ ] Dark  [ ] System                   │ ║
║                   ║  │                                                      │ ║
║                   ║  │  Language                                           │ ║
║                   ║  │  [English ▼]                                        │ ║
║                   ║  │                                                      │ ║
║                   ║  │  Timezone                                           │ ║
║                   ║  │  [Europe/Berlin ▼]                                  │ ║
║                   ║  └────────────────────────────────────────────────────┘ ║
║                   ║                                                          ║
║                   ║  ──────────────────────────────────────────────────────  ║
║                   ║                                                          ║
║                   ║                                    [Save Changes]        ║
║                   ║                                                          ║
╠═══════════════════╩═══════════════════════════════════════════════════════════╣
║  FOOTER                                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## Anhang

### A. Responsive Breakpoints

| Breakpoint | Breite | Layout-Änderungen |
|------------|--------|-------------------|
| Mobile | < 640px | Single column, hamburger nav, stacked cards |
| Tablet | 640-1023px | Two columns, collapsed right sidebar |
| Desktop | 1024-1279px | Three columns, full layout |
| Wide | ≥ 1280px | Max-width container, centered |

### B. Mobile Anpassungen

- Navigation: Hamburger Menu
- Sidebar: Slide-in Drawer
- Code Blocks: Horizontal scroll
- Tables: Card view
- Metrics: Stacked vertically

### C. Animation-Referenz

| Element | Animation | Dauer |
|---------|-----------|-------|
| Page transitions | Fade | 250ms |
| Modal open | Slide up + Fade | 300ms |
| Dropdown | Expand | 150ms |
| Toast | Slide in | 200ms |
| Button hover | Color transition | 150ms |

---

**Dokument-Ende**

*Diese Mockups dienen als visuelle Referenz für die UI-Implementierung. Bei Fragen wende dich an das Design Team.*
