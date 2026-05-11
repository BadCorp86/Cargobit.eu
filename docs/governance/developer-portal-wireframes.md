# CargoBit Developer Portal Wireframes

**Dokument-Typ:** UI-Spezifikation  
**Version:** 1.0.0  
**Status:** Final  
**Letzte Aktualisierung:** 2024-01-15  
**Verantwortlich:** UX Team  

---

## Inhaltsverzeichnis

1. [Wireframe-Übersicht](#1-wireframe-übersicht)
2. [Homepage](#2-homepage)
3. [Getting Started Page](#3-getting-started-page)
4. [API Reference Page](#4-api-reference-page)
5. [Tools Pages](#5-tools-pages)
6. [Documentation Page](#6-documentation-page)
7. [Dashboard Page](#7-dashboard-page)
8. [Search Results Page](#8-search-results-page)
9. [Mobile Wireframes](#9-mobile-wireframes)

---

## 1. Wireframe-Übersicht

Dieses Dokument enthält detaillierte, textbasierte Wireframes für alle Kernseiten des CargoBit Developer Portals. Die Wireframes dienen als visuelle Spezifikation für Designer und Entwickler und definieren die strukturelle Anordnung aller UI-Elemente.

### 1.1 Konventionen

```
+------------------+  ← Container-Grenzen
|                  |
|  [Button]        │  ← Interaktive Elemente
|                  |
|  ┌────────────┐  │  ← Verschachtelte Container
|  │            │  │
|  └────────────┘  │
|                  |
+------------------+

▶  ← Expandable Section
●  ← Bullet Point
→  ← Link/Navigations-Element
```

### 1.2 Seitenübersicht

| Seite | Template | Beschreibung |
|-------|----------|--------------|
| Homepage | Landing | Einstiegsseite mit Hero und Quick Links |
| Getting Started | Documentation | Erste Schritte für neue Nutzer |
| API Reference | API Reference | Interaktive API-Dokumentation |
| API Explorer | Tool | Live API-Testing |
| Webhook Simulator | Tool | Webhook-Testing und Debugging |
| Documentation | Documentation | Allgemeine Dokumentationsseiten |
| Dashboard | Dashboard | Partner-Übersicht und Metriken |
| Search Results | Search | Suchergebnisse |

---

## 2. Homepage

### 2.1 Desktop Wireframe

```
+=============================================================================+
|  GLOBAL NAVIGATION                                                          |
|  [Logo] Getting Started  API Reference  Tools  Guides  Architecture        |
|                                                    [🔍 Search...] [Login]   |
+=============================================================================+
|                                                                             |
|  HERO SECTION                                                               |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  CargoBit Developer Portal                                           |  |
|  |  ════════════════════════                                            |  |
|  |                                                                       |  |
|  |  Build seamless payment integrations with our powerful API           |  |
|  |                                                                       |  |
|  |  [Get Started →]  [API Reference →]                                  |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
+=============================================================================+
|                                                                             |
|  QUICK START SECTION                                                        |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  Start Building in Minutes                                           |  |
|  |  ───────────────────────────                                         |  |
|  |                                                                       |  |
|  |  +-----------------+  +-----------------+  +-----------------+       |  |
|  |  | 📚              |  | 🔑              |  | 🔗              |       |  |
|  |  | Quickstart      |  | Get API Keys    |  | API Reference   |       |  |
|  |  |                 |  |                 |  |                 |       |  |
|  |  | Get started     |  | Generate your   |  | Explore our     |       |  |
|  |  | with our 5-min  |  | sandbox keys    |  | complete API    |       |  |
|  |  | guide           |  | instantly       |  | documentation   |       |  |
|  |  |                 |  |                 |  |                 |       |  |
|  |  | [Start →]       |  | [Generate →]    |  | [Explore →]     |       |  |
|  |  +-----------------+  +-----------------+  +-----------------+       |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
+=============================================================================+
|                                                                             |
|  FEATURES SECTION                                                           |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  Why CargoBit?                                                       |  |
|  |  ─────────────                                                       |  |
|  |                                                                       |  |
|  |  +-----------------+  +-----------------+  +-----------------+       |  |
|  |  | ⚡ Fast         |  | 🔒 Secure       |  | 📊 Reliable     |       |  |
|  |  |                 |  |                 |  |                 |       |  |
|  |  | Sub-100ms       |  | Enterprise-grade|  | 99.95% uptime   |       |  |
|  |  | response times  |  | security        |  | SLA guaranteed  |       |  |
|  |  +-----------------+  +-----------------+  +-----------------+       |  |
|  |                                                                       |  |
|  |  +-----------------+  +-----------------+  +-----------------+       |  |
|  |  | 🛠️ Tools        |  | 📖 Docs         |  | 🎯 Support      |       |  |
|  |  |                 |  |                 |  |                 |       |  |
|  |  | Interactive     |  | Comprehensive   |  | Dedicated       |       |  |
|  |  | API Explorer    |  | documentation   |  | partner support |       |  |
|  |  +-----------------+  +-----------------+  +-----------------+       |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
+=============================================================================+
|                                                                             |
|  LATEST UPDATES SECTION                                                     |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  Latest Updates                                                      |  |
|  |  ──────────────                                                      |  |
|  |                                                                       |  |
|  |  +---------------------------------------------------------------+   |  |
|  |  | API v2.1 Released                                             |   |  |
|  |  | January 15, 2024                                [Changelog →] |   |  |
|  |  | New endpoints for batch operations and improved rate limits    |   |  |
|  |  +---------------------------------------------------------------+   |  |
|  |                                                                       |  |
|  |  +---------------------------------------------------------------+   |  |
|  |  | Webhook Retry Logic Enhanced                                  |   |  |
|  |  | January 10, 2024                                [Changelog →] |   |  |
|  |  | Exponential backoff and configurable retry policies            |   |  |
|  |  +---------------------------------------------------------------+   |  |
|  |                                                                       |  |
|  |  [View All Updates →]                                                |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
+=============================================================================+
|  FOOTER                                                                     |
|  Documentation  |  API Status  |  Security  |  Terms  |  Contact          |
|  © 2024 CargoBit. All rights reserved.                                     |
+=============================================================================+
```

### 2.2 Komponenten-Spezifikation

| Bereich | Komponente | Spezifikation |
|---------|------------|---------------|
| Navigation | Logo | 120x40px, klickbar zur Homepage |
| Navigation | Nav Links | 16px, semibold, hover underline |
| Navigation | Search | 280px breit, placeholder "Search..." |
| Hero | Title | H1, 48px, navy |
| Hero | Subtitle | Body Large, 20px, grey |
| Hero | CTAs | Primary Button + Secondary Button |
| Quick Start | Cards | 3 Spalten, gleiche Höhe |
| Features | Cards | 3 Spalten, Icon oben, Text unten |
| Updates | List Items | Border bottom, hover highlight |

---

## 3. Getting Started Page

### 3.1 Desktop Wireframe

```
+=============================================================================+
|  GLOBAL NAVIGATION                                                          |
+=============================================================================+
|                        |                                                    |
|  LEFT SIDEBAR           |  MAIN CONTENT                                      |
|  (280px fixed)          |  (flexible)                                        |
|                        |                                                    |
|  +------------------+  |  +-----------------------------------------------+  |
|  | Getting Started  |  |  |                                               |  |
|  | ────────────────│  |  |  Getting Started                              |  |
|  |                  │  |  | ═══════════════                              |  |
|  | ▶ Quickstart     │  |  |                                               |  |
|  |   5-min Guide    │  |  | Welcome to CargoBit! This guide will help    |  |
|  |                  │  |  | you make your first API call in under 5      |  |
|  | ▶ Sandbox        │  |  | minutes.                                      |  |
|  |   Setup          │  |  |                                               |  |
|  |                  │  |  | ──────────────────────────────────────────    |  |
|  | ▶ API Keys       │  |  |                                               |  |
|  |   Generation     │  |  | Prerequisites                                 |  |
|  |                  │  |  | ────────────                                  |  |
|  | ▶ First Request  │  |  |                                               |  |
|  |   Make your      │  |  | ✓ CargoBit account (sign up free)             |  |
|  |   first call     │  |  | ✓ API keys (sandbox or production)            |  |
|  |                  │  |  |                                               |  |
|  | ▶ Webhooks       │  |  | ──────────────────────────────────────────    |  |
|  |   Setup          │  |  |                                               |  |
|  |                  │  |  | Step 1: Generate API Keys                     |  |
|  | ▶ Best Practices │  |  | ───────────────────────────                   |  |
|  |   Tips           │  |  |                                               |  |
|  +------------------+  |  | 1. Navigate to the [Dashboard]                |  |
|                        |  | 2. Click "Generate API Key"                   |  |
|                        |  | 3. Copy your key (shown only once!)           |  |
|                        |  |                                               |  |
|                        |  | +-------------------------------------------+ |  |
|                        |  | | TIP                                       | |  |
|                        |  | | Use sandbox keys for testing. Production  | |  |
|                        |  | | keys have real money attached!            | |  |
|                        |  | +-------------------------------------------+ |  |
|                        |  |                                               |  |
|                        |  | ──────────────────────────────────────────    |  |
|                        |  |                                               |  |
|                        |  | Step 2: Make Your First Request              |  |
|                        |  | ─────────────────────────────────            |  |
|                        |  |                                               |  |
|                        |  | Use this curl command to create a payment:   |  |
|                        |  |                                               |  |
|                        |  | +-------------------------------------------+ |  |
|                        |  | | curl -X POST https://api.cargobit.io/v1/  | |  |
|                        |  | | payments \                                | |  |
|                        |  | |   -H "Authorization: Bearer YOUR_KEY" \   | |  |
|                        |  | |   -H "Content-Type: application/json" \   | |  |
|                        |  | |   -d '{"amount": 1000, "currency": "EUR"}'| |  |
|                        |  | |                           [Copy] [Try It →]| |  |
|                        |  | +-------------------------------------------+ |  |
|                        |  |                                               |  |
|                        |  | ──────────────────────────────────────────    |  |
|                        |  |                                               |  |
|                        |  | [← Previous]                     [Next →]    |  |
|                        |  |                                               |  |
|                        |  +-----------------------------------------------+  |
|                        |                                                    |
+=============================================================================+
|  FOOTER                                                                     |
+=============================================================================+
```

---

## 4. API Reference Page

### 4.1 Endpoint Detail Wireframe

```
+=============================================================================+
|  GLOBAL NAVIGATION                                                          |
+=============================================================================+
|                        |                                   |                 |
|  LEFT SIDEBAR           |  MAIN CONTENT                     |  RIGHT SIDEBAR  |
|  (280px)               |  (flexible)                       |  (240px)        |
|                        |                                   |                 |
|  +------------------+  |  +------------------------------+  |  +-----------+  |
|  | API Reference    │  |  |                              |  |  | ON THIS   │  |
|  | ────────────────│  |  |  POST /payments              |  |  | PAGE      │  |
|  |                  │  |  | ═══════════════             |  |  | ────────  │  |
|  | ▼ Payments       │  |  |                              |  |  |           │  |
|  |   POST /payments │◀─│  | Create a new payment        |  |  | Overview  │  |
|  |   GET /payments  │  |  |                              |  |  | Params    │  |
|  |   Errors         │  |  | ──────────────────────────   |  |  | Example   │  |
|  |                  │  |  |                              |  |  | Response  │  |
|  | ▶ Wallets        │  |  | SECURITY: API Key required  |  |  | Errors    │  |
|  |                  │  |  |                              |  |  |           │  |
|  | ▶ Webhooks       │  |  | ──────────────────────────   |  |  | TRY IT    │  |
|  |                  │  |  |                              |  |  | ──────    │  |
|  | ▶ Common         │  |  | Request Body                 |  |  |           │  |
|  |   Idempotency    │  |  | ────────────                 |  |  | Sandbox   │  |
|  |   Rate Limits    │  |  |                              |  |  | [●]       │  |
|  |   Pagination     │  |  | +--------------------------+ |  |  |           │  |
|  |   Filtering      │  |  | | Name    Type    Required | |  |  | API Key   │  |
|  |   Sorting        │  |  | +--------------------------+ |  |  | [•••••••] │  |
|  |                  │  |  | | amount  number  Yes      | |  |  |           │  |
|  | ▶ Errors         │  |  | | currency string  Yes      | |  |  | [Send     │  |
|  |                  │  |  | | idempotency_key         | |  |  |  Request] │  |
|  +------------------+  |  | +--------------------------+ |  |  |           │  |
|                        |  |                              |  |  +-----------+  |
|                        |  | ──────────────────────────   |  |                 |
|                        |  |                              |  |                 |
|                        |  | Example Request              |  |                 |
|                        |  | ───────────────              |  |                 |
|                        |  |                              |  |                 |
|                        |  | [cURL] [JavaScript] [Python]│  |                 |
|                        |  |                              |  |                 |
|                        |  | +--------------------------+ |  |                 |
|                        |  | | curl -X POST \           | |  |                 |
|                        |  | |   -H "Authorization:..." | |  |                 |
|                        |  | |   -d '{"amount": 1000}'  | |  |                 |
|                        |  | |                 [Copy]   | |  |                 |
|                        |  | +--------------------------+ |  |                 |
|                        |  |                              |  |                 |
|                        |  | ──────────────────────────   |  |                 |
|                        |  |                              |  |                 |
|                        |  | Response                    |  |                 |
|                        |  | ────────                    |  |                 |
|                        |  |                              |  |                 |
|                        |  | Status: 200 OK              |  |                 |
|                        |  |                              |  |                 |
|                        |  | +--------------------------+ |  |                 |
|                        |  | | {                        | |  |                 |
|                        |  | |   "id": "pay_abc123",   | |  |                 |
|                        |  | |   "status": "created",  | |  |                 |
|                        |  | |   "amount": 1000        | |  |                 |
|                        |  | | }                        | |  |                 |
|                        |  | +--------------------------+ |  |                 |
|                        |  |                              |  |                 |
|                        |  +------------------------------+  |                 |
|                        |                                    |                 |
+=============================================================================+
|  FOOTER                                                                     |
+=============================================================================+
```

### 4.2 Component Details

| Element | Spezifikation |
|---------|---------------|
| HTTP Method Badge | Farbcodiert: POST=grün, GET=blau, DELETE=rot |
| Endpoint URL | Monospace font, clickable |
| Security Badge | Zeigt Auth-Methode, Link zu Auth-Doku |
| Parameter Table | Sortierbar, Required-Spalte mit Badge |
| Code Tabs | cURL, JavaScript, Python, Go |
| Copy Button | Tooltip "Copied!" nach Klick |
| Response Schema | Expandable sections für verschachtelte Objekte |

---

## 5. Tools Pages

### 5.1 API Explorer Wireframe

```
+=============================================================================+
|  GLOBAL NAVIGATION                                                          |
+=============================================================================+
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |  [API Explorer]  [Webhook Simulator]  [Schema Viewer]  [Event Replay]|  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
+=============================================================================+
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  REQUEST                                              ENVIRONMENT    |  |
|  |  ───────                                              ───────────    |  |
|  |                                                                       |  |
|  |  +-------------------+  +-------------------+  +-------------------+  |  |
|  |  | Method: [POST ▼]  |  | URL: /payments    |  | Sandbox [●] Prod  |  |  |
|  |  +-------------------+  +-------------------+  +-------------------+  |  |
|  |                                                                       |  |
|  |  Headers                                              [Add Header]   |  |
|  |  ────────                                                            |  |
|  |  Authorization  Bearer ••••••••••••••••                              |  |
|  |  Content-Type   application/json                                     |  |
|  |                                                                       |  |
|  |  Body                                                [JSON] [Form]   |  |
|  |  ─────                                               ─────────────   |  |
|  |                                                                       |  |
|  |  +---------------------------------------------------------------+   |  |
|  |  | {                                                             |   |  |
|  |  |   "amount": 1000,                                            |   |  |
|  |  |   "currency": "EUR",                                         |   |  |
|  |  |   "description": "Test payment"                              |   |  |
|  |  | }                                                             |   |  |
|  |  +---------------------------------------------------------------+   |  |
|  |                                                                       |  |
|  |  [Beautify]  [Clear]                          [Send Request →]       |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
+=============================================================================+
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  RESPONSE                                        Time: 45ms  ID: abc  |  |
|  |  ────────                                                            |  |
|  |                                                                       |  |
|  |  Status: 200 OK                                                      |  |
|  |                                                                       |  |
|  |  +---------------------------------------------------------------+   |  |
|  |  | {                                                             |   |  |
|  |  |   "id": "pay_abc123def456",                                   |   |  |
|  |  |   "status": "created",                                        |   |  |
|  |  |   "amount": 1000,                                             |   |  |
|  |  |   "currency": "EUR",                                          |   |  |
|  |  |   "created_at": "2024-01-15T10:30:00Z"                        |   |  |
|  |  | }                                                             |   |  |
|  |  +---------------------------------------------------------------+   |  |
|  |                                                                       |  |
|  |  [Copy Response]  [View in Docs]  [Save to History]                 |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
+=============================================================================+
|  FOOTER                                                                     |
+=============================================================================+
```

### 5.2 Webhook Simulator Wireframe

```
+=============================================================================+
|  GLOBAL NAVIGATION                                                          |
+=============================================================================+
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |  [API Explorer]  [Webhook Simulator]  [Schema Viewer]  [Event Replay]|  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
+=============================================================================+
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  WEBHOOK SIMULATOR                                                   |  |
|  |                                                                       |  |
|  |  Event Type                                                          |  |
|  |  ───────────                                                         |  |
|  |  +---------------------------------------------------------------+   |  |
|  |  | [payment.created ▼]                                           |   |  |
|  |  +---------------------------------------------------------------+   |  |
|  |                                                                       |  |
|  |  Target URL                                                          |  |
|  |  ───────────                                                         |  |
|  |  +---------------------------------------------------------------+   |  |
|  |  | https://your-server.com/webhooks/cargobit                     |   |  |
|  |  +---------------------------------------------------------------+   |  |
|  |                                                                       |  |
|  |  Event Payload                                          [Generate]   |  |
|  |  ─────────────                                                        |  |
|  |  +---------------------------------------------------------------+   |  |
|  |  | {                                                             |   |  |
|  |  |   "id": "evt_abc123",                                         |   |  |
|  |  |   "type": "payment.created",                                  |   |  |
|  |  |   "data": {                                                   |   |  |
|  |  |     "id": "pay_xyz789",                                       |   |  |
|  |  |     "amount": 1000                                            |   |  |
|  |  |   },                                                          |   |  |
|  |  |   "created": "2024-01-15T10:30:00Z"                           |   |  |
|  |  | }                                                             |   |  |
|  |  +---------------------------------------------------------------+   |  |
|  |                                                                       |  |
|  |  Signature Preview                                                   |  |
|  |  ──────────────────                                                  |  |
|  |  +---------------------------------------------------------------+   |  |
|  |  | X-CargoBit-Signature: t=1705315800,v1=abc123def456...         |   |  |
|  |  +---------------------------------------------------------------+   |  |
|  |                                                                       |  |
|  |  [Send Webhook →]                                                    |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
+=============================================================================+
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  DELIVERY RESULT                                                     |  |
|  |                                                                       |  |
|  |  Status: ✓ Delivered (200 OK)                                        |  |
|  |  Duration: 125ms                                                      |  |
|  |                                                                       |  |
|  |  Response Headers                                                    |  |
|  |  ────────────────                                                    |  |
|  |  content-type: application/json                                      |  |
|  |                                                                       |  |
|  |  Response Body                                                       |  |
|  |  ────────────                                                        |  |
|  |  +---------------------------------------------------------------+   |  |
|  |  | { "received": true }                                          |   |  |
|  |  +---------------------------------------------------------------+   |  |
|  |                                                                       |  |
|  |  [Replay Event]  [View in Logs]                                      |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
+=============================================================================+
```

---

## 6. Documentation Page

### 6.1 Standard Documentation Layout

```
+=============================================================================+
|  GLOBAL NAVIGATION                                                          |
+=============================================================================+
|                        |                                   |                 |
|  LEFT SIDEBAR           |  MAIN CONTENT                     |  RIGHT SIDEBAR  |
|  (280px)               |  (flexible)                       |  (240px)        |
|                        |                                   |                 |
|  +------------------+  |  +------------------------------+  |  +-----------+  |
|  | Documentation    │  |  |                              |  |  | ON THIS   │  |
|  | ────────────────│  |  |  Document Title              |  |  | PAGE      │  |
|  |                  │  |  | ═══════════════             |  |  | ────────  │  |
|  | ▶ Overview       │  |  |                              |  |  |           │  |
|  |                  │  |  | Introduction paragraph that  |  |  | Section 1 │  |
|  | ▼ Architecture   │  |  | provides context and         |  |  | Section 2 │  |
|  |   Introduction   │  |  | overview of the document     |  |  | Section 3 │  |
|  |   Components     │  |  | content.                     |  |  | Section 4 │  |
|  |   Data Flow      │  |  |                              |  |  |           │  |
|  |                  │  |  | ──────────────────────────   |  |  | RESOURCES │  |
|  | ▶ Security       │  |  |                              |  |  | ───────── │  |
|  |                  │  |  | Section 1                    |  |  |           │  |
|  | ▶ Compliance     │  |  | ─────────                    |  |  | API Ref   │  |
|  |                  │  |  |                              |  |  | Guide     │  |
|  | ▶ Operations     │  |  | Content for section 1...     |  |  | Example   │  |
|  |                  │  |  |                              |  |  |           │  |
|  |                  │  |  | +--------------------------+ |  |  | FEEDBACK  │  |
|  |                  │  |  | | NOTE                     | |  |  | ──────── │  |
|  |                  │  |  | | This is an important     | |  |  |           │  |
|  |                  │  |  | | note for the reader.     | |  |  | Was this │  |
|  |                  │  |  | +--------------------------+ |  |  | helpful?  │  |
|  |                  │  |  |                              |  |  | [👍] [👎] │  |
|  |                  │  |  | ──────────────────────────   |  |  |           │  |
|  |                  │  |  |                              |  |  +-----------+  |
|  |                  │  |  | Section 2                    |  |                 |
|  |                  │  |  | ─────────                    |  |                 |
|  |                  │  |  |                              |  |                 |
|  |                  │  |  | Content for section 2...     |  |                 |
|  |                  │  |  |                              |  |                 |
|  |                  │  |  | +--------------------------+ |  |                 |
|  |                  │  |  | | ```javascript            | |  |                 |
|  |                  │  |  | | const payment = await... | |  |                 |
|  |                  │  |  | | ```              [Copy]  | |  |                 |
|  |                  │  |  | +--------------------------+ |  |                 |
|  |                  │  |  |                              |  |                 |
|  |                  │  |  | ──────────────────────────   |  |                 |
|  |                  │  |  |                              |  |                 |
|  |                  │  |  | [← Previous]      [Next →]  |  |                 |
|  |                  │  |  |                              |  |                 |
|  +------------------+  |  +------------------------------+  |                 |
|                        |                                    |                 |
+=============================================================================+
|  FOOTER                                                                     |
+=============================================================================+
```

---

## 7. Dashboard Page

### 7.1 Partner Dashboard Wireframe

```
+=============================================================================+
|  GLOBAL NAVIGATION                                                          |
+=============================================================================+
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  Welcome, Partner Name                           [Account] [Settings]|  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
+=============================================================================+
|                                                                             |
|  METRICS ROW                                                                |
|  +------------+  +------------+  +------------+  +------------+            |
|  | API Calls  |  | Webhook    |  | Error Rate |  | Active     |            |
|  |            |  | Delivery   |  |            |  | Webhooks   |            |
|  |  12,453    |  |            |  |            |  |            |            |
|  |  +15% ↑   |  |  99.8%    |  |  0.02%    |  |  3         |            |
|  |  last 7d  |  |  last 7d  |  |  last 7d  |  |  configured|            |
|  +------------+  +------------+  +------------+  +------------+            |
|                                                                             |
+=============================================================================+
|                                                                             |
|  +---------------------------------------+  +---------------------------+  |
|  |                                       |  |                           |  |
|  |  API USAGE (Last 7 Days)              |  |  QUICK ACTIONS            |  |
|  |  ─────────────────────────            |  |  ──────────────           |  |
|  |                                       |  |                           |  |
|  |  +---------------------------------+ |  |  [Generate API Key]       |  |
|  |  |                                 | |  |  [View Documentation]     |  |
|  |  |    [CHART AREA]                 | |  |  [Test Webhooks]          |  |
|  |  |                                 | |  |  [Contact Support]        |  |
|  |  |    Shows daily API call         | |  |                           |  |
|  |  |    volume with trend line       | |  |                           |  |
|  |  |                                 | |  |                           |  |
|  |  +---------------------------------+ |  |                           |  |
|  |                                       |  |                           |  |
|  +---------------------------------------+  +---------------------------+  |
|                                                                             |
+=============================================================================+
|                                                                             |
|  +---------------------------------------+  +---------------------------+  |
|  |                                       |  |                           |  |
|  |  RECENT EVENTS                        |  |  API KEYS                 |  |
|  |  ──────────────                       |  |  ─────────                |  |
|  |                                       |  |                           |  |
|  |  ● payment.created    2 min ago      |  |  Sandbox Key              |  |
|  |  ● webhook.delivered  5 min ago      |  |  ••••••••••••abc123      |  |
|  |  ● payment.updated    12 min ago     |  |  [Regenerate] [Reveal]    |  |
|  |  ● webhook.failed     15 min ago     |  |                           |  |
|  |                                       |  |  Production Key           |  |
|  |  [View All Events →]                  |  |  ••••••••••••def456      |  |
|  |                                       |  |  [Regenerate] [Reveal]    |  |
|  +---------------------------------------+  |                           |  |
|                                             +---------------------------+  |
|                                                                             |
+=============================================================================+
|  FOOTER                                                                     |
+=============================================================================+
```

---

## 8. Search Results Page

### 8.1 Desktop Wireframe

```
+=============================================================================+
|  GLOBAL NAVIGATION                                                          |
+=============================================================================+
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  [🔍 payment __________________________________________] [Search]     |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
+=============================================================================+
|                                                                             |
|  FILTERS                                                                    |
|  ────────                                                                   |
|  [All (24)]  [API (8)]  [Guides (6)]  [Docs (5)]  [FAQ (3)]  [Tools (2)]  |
|                                                                             |
+=============================================================================+
|                                                                             |
|  RESULTS (24)                                                               |
|  ────────────                                                               |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  API Reference                                          API          |  |
|  |  ──────────────                                                       |  |
|  |  POST /payments                                                       |  |
|  |  Create a new payment. The payment will be processed and a unique     |  |
|  |  ID will be returned...                                               |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  Guide                                                 Guide         |  |
|  |  ──────                                                               |  |
|  |  Getting Started with Payments                                       |  |
|  |  Learn how to create your first payment using our API. This guide    |  |
|  |  walks you through authentication, request format, and handling...    |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                                                                       |  |
|  |  API Reference                                          API          |  |
|  |  ──────────────                                                       |  |
|  |  GET /payments/{id}                                                   |  |
|  |  Retrieve details of a specific payment by its unique identifier...   |  |
|  |                                                                       |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  [1] [2] [3] ... [5]                                                        |
|                                                                             |
+=============================================================================+
|  FOOTER                                                                     |
+=============================================================================+
```

---

## 9. Mobile Wireframes

### 9.1 Mobile Homepage

```
+===========================+
|  [☰]  [Logo]     [Login]  |
+===========================+
|                           |
|  CargoBit                |
|  Developer Portal        |
|                           |
|  Build seamless payment  |
|  integrations            |
|                           |
|  [Get Started]           |
|  [API Reference]         |
|                           |
+===========================+
|                           |
|  Quick Start             |
|  ───────────             |
|                           |
|  +---------------------+  |
|  | 📚 Quickstart       |  |
|  | 5-minute guide      |  |
|  | [Start →]           |  |
|  +---------------------+  |
|                           |
|  +---------------------+  |
|  | 🔑 Get API Keys     |  |
|  | Generate sandbox    |  |
|  | [Generate →]        |  |
|  +---------------------+  |
|                           |
|  +---------------------+  |
|  | 🔗 API Reference    |  |
|  | Full documentation  |  |
|  | [Explore →]         |  |
|  +---------------------+  |
|                           |
+===========================+
|                           |
|  Latest Updates           |
|  ──────────────           |
|                           |
|  API v2.1 Released        |
|  Jan 15, 2024             |
|  [View →]                 |
|                           |
+===========================+
|  Footer                   |
+===========================+
```

### 9.2 Mobile API Reference

```
+===========================+
|  [☰]  API Reference  [🔍] |
+===========================+
|                           |
|  [Payments ▼]             |
|  [Wallets ▼]               |
|  [Webhooks ▼]              |
|  [Errors ▼]                |
|                           |
+===========================+
|                           |
|  POST /payments           |
|  ═════════════            |
|                           |
|  Create a new payment     |
|                           |
|  ─────────────────────    |
|                           |
|  Request Body             |
|  ────────────             |
|                           |
|  amount (number)          |
|  Required                 |
|                           |
|  currency (string)        |
|  Required                 |
|                           |
|  ─────────────────────    |
|                           |
|  Example Request          |
|  ───────────────          |
|                           |
|  [cURL] [JS] [Python]     |
|                           |
|  +---------------------+  |
|  | curl -X POST \      |  |
|  |   -H "Auth: ..."    |  |
|  |   -d '{"amount":..}'|  |
|  |           [Copy]    |  |
|  +---------------------+  |
|                           |
|  ─────────────────────    |
|                           |
|  [Try in Explorer →]      |
|                           |
+===========================+
```

---

## Anhang

### A. Breakpoint-Definitionen

| Breakpoint | Breite | Layout-Änderungen |
|------------|--------|-------------------|
| Mobile | < 640px | Single column, hamburger nav |
| Tablet | 640-1024px | Two columns, collapsed sidebar |
| Desktop | > 1024px | Three columns, full sidebar |

### B. Responsive Verhalten

| Komponente | Mobile | Tablet | Desktop |
|------------|--------|--------|---------|
| Left Sidebar | Hidden, slide-in | Collapsible | Always visible |
| Right Sidebar | Hidden | Hidden | Visible |
| Code Blocks | Horizontal scroll | Horizontal scroll | Full width |
| Tables | Card view | Scrollable | Full table |
| Search | Modal | Inline | Inline |

### C. Interaktions-States

| Element | States |
|---------|--------|
| Buttons | Default, Hover, Active, Disabled, Loading |
| Links | Default, Hover, Active, Visited |
| Inputs | Default, Focus, Error, Disabled |
| Cards | Default, Hover, Selected |
| Sidebar Items | Default, Hover, Active, Expanded |

---

**Dokument-Ende**

*Diese Wireframes dienen als Grundlage für die UI-Implementierung. Bei Fragen wende dich an das UX Team.*
