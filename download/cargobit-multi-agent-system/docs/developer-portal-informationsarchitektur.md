# CargoBit Developer Portal Informationsarchitektur (IA)

**Dokument-Typ:** Informationsarchitektur-Diagramm  
**Version:** 1.0.0  
**Status:** Final  
**Letzte Aktualisierung:** 2024-01-15  
**Verantwortlich:** UX Team  

---

## Inhaltsverzeichnis

1. [IA-Übersicht](#1-ia-übersicht)
2. [Hauptstruktur](#2-hauptstruktur)
3. [Detaillierte IA](#3-detaillierte-ia)
4. [Navigationspfade](#4-navigationspfade)
5. [Cross-Linking-Strategie](#5-cross-linking-strategie)
6. [Content-Typen](#6-content-typen)

---

## 1. IA-Übersicht

### 1.1 Design-Prinzipien

Die Informationsarchitektur des CargoBit Developer Portals basiert auf folgenden Prinzipien:

| Prinzip | Beschreibung | Umsetzung |
|---------|--------------|-----------|
| **User-Centric** | Struktur orientiert sich an Nutzerbedürfnissen | Kategorien basieren auf User-Intent |
| **Scalable** | Einfache Erweiterbarkeit | Modulare Struktur mit klaren Ebenen |
| **Discoverable** | Inhalte leicht auffindbar | Max. 3 Klicks zu jedem Inhalt |
| **Consistent** | Einheitliche Struktur | Wiederkehrende Patterns auf allen Ebenen |

### 1.2 Struktur-Übersicht

```
Developer Portal
├── 12 Hauptkategorien
├── 47 Unterkategorien
├── 150+ Einzelseiten
└── 500+ Inhaltsseiten
```

---

## 2. Hauptstruktur

### 2.1 Top-Level Navigation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                        DEVELOPER PORTAL                                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Getting Started        7. Compliance                                   │
│  2. API Reference          8. Operations                                   │
│  3. Guides                 9. Partner                                      │
│  4. Tools                  10. Knowledge Base                              │
│  5. Architecture           11. Changelog                                   │
│  6. Security               12. Support                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Kategorien-Zuordnung

| Kategorie | Zielgruppe | Hauptzweck |
|-----------|------------|------------|
| Getting Started | Neue Partner | Schneller Einstieg |
| API Reference | Entwickler | Technische Referenz |
| Guides | Alle | Schritt-für-Schritt |
| Tools | Entwickler | Interaktives Testen |
| Architecture | Internal | Systemverständnis |
| Security | Alle | Sicherheit |
| Compliance | Auditoren | Nachweise |
| Operations | SRE/Ops | Betrieb |
| Partner | Partner | Integration |
| Knowledge Base | Alle | Wissensdatenbank |
| Changelog | Alle | Updates |
| Support | Alle | Hilfe |

---

## 3. Detaillierte IA

### 3.1 Vollständiges IA-Diagramm

```
Developer Portal
│
├── 1. GETTING STARTED
│   │
│   ├── 1.1 Quickstart
│   │   ├── Overview
│   │   ├── Prerequisites
│   │   └── 5-Minute Guide
│   │
│   ├── 1.2 Sandbox Setup
│   │   ├── Creating a Sandbox Account
│   │   ├── Sandbox Environment
│   │   └── Test Data
│   │
│   ├── 1.3 API Keys
│   │   ├── Generating Keys
│   │   ├── Key Types (Sandbox/Production)
│   │   ├── Key Management
│   │   └── Security Best Practices
│   │
│   ├── 1.4 First API Call
│   │   ├── Authentication
│   │   ├── Making a Request
│   │   └── Understanding the Response
│   │
│   └── 1.5 First Webhook
│       ├── Webhook Setup
│       ├── Receiving Events
│       └── Testing Webhooks
│
├── 2. API REFERENCE
│   │
│   ├── 2.1 Payments API
│   │   ├── POST /payments
│   │   ├── GET /payments/{id}
│   │   ├── GET /payments
│   │   ├── POST /payments/{id}/cancel
│   │   ├── Payment Object
│   │   └── Errors
│   │
│   ├── 2.2 Wallet API
│   │   ├── GET /wallets/{id}
│   │   ├── GET /wallets
│   │   ├── POST /wallets/{id}/adjust
│   │   ├── Wallet Object
│   │   └── Errors
│   │
│   ├── 2.3 Webhook API
│   │   ├── POST /webhooks/stripe
│   │   ├── Webhook Object
│   │   ├── Event Types
│   │   ├── Signature Validation
│   │   └── Errors
│   │
│   ├── 2.4 Errors
│   │   ├── Error Types
│   │   ├── Error Codes
│   │   ├── HTTP Status Codes
│   │   └── Error Handling
│   │
│   ├── 2.5 Rate Limits
│   │   ├── Limit Overview
│   │   ├── Headers
│   │   ├── Handling Limits
│   │   └── Best Practices
│   │
│   ├── 2.6 Pagination
│   │   ├── Cursor-based Pagination
│   │   ├── Parameters
│   │   └── Response Format
│   │
│   ├── 2.7 Filtering
│   │   ├── Filter Syntax
│   │   ├── Available Filters
│   │   └── Examples
│   │
│   └── 2.8 Sorting
│       ├── Sort Syntax
│       ├── Available Fields
│       └── Examples
│
├── 3. GUIDES
│   │
│   ├── 3.1 Integration Guides
│   │   ├── Partner Integration Guide
│   │   ├── Webhook Integration Guide
│   │   ├── Payment Integration
│   │   └── Wallet Integration
│   │
│   ├── 3.2 Technical Guides
│   │   ├── API Usage Guidelines
│   │   ├── Idempotency Guide
│   │   ├── Rate Limit Guide
│   │   ├── Error Handling Guide
│   │   └── Testing Guide
│   │
│   ├── 3.3 Deep Dives
│   │   ├── Stripe Integration Deep Dive
│   │   ├── Ledger Consistency Model
│   │   ├── Determinism Guide
│   │   └── Schema Evolution Guide
│   │
│   ├── 3.4 Troubleshooting
│   │   ├── Webhook Issues
│   │   ├── Signature Validation Errors
│   │   ├── Duplicate Events
│   │   ├── Rate Limit Issues
│   │   └── Sandbox Problems
│   │
│   └── 3.5 Best Practices
│       ├── API Best Practices
│       ├── Webhook Best Practices
│       ├── Security Best Practices
│       └── Performance Best Practices
│
├── 4. TOOLS
│   │
│   ├── 4.1 API Explorer
│   │   ├── Overview
│   │   ├── Making Requests
│   │   ├── Viewing Responses
│   │   └── Saving History
│   │
│   ├── 4.2 Webhook Simulator
│   │   ├── Overview
│   │   ├── Sending Test Events
│   │   ├── Signature Testing
│   │   └── Delivery Logs
│   │
│   ├── 4.3 Event Replay Tool
│   │   ├── Overview
│   │   ├── Selecting Events
│   │   ├── Replaying Events
│   │   └── Idempotency Testing
│   │
│   ├── 4.4 Schema Viewer
│   │   ├── Table View
│   │   ├── ER Diagram
│   │   └── Field Inspector
│   │
│   └── 4.5 Determinism Checker
│       ├── Overview
│       ├── Running Checks
│       └── Interpreting Results
│
├── 5. ARCHITECTURE
│   │
│   ├── 5.1 Overview
│   │   ├── System Overview
│   │   ├── High-Level Architecture
│   │   └── Component Overview
│   │
│   ├── 5.2 Deep Dive
│   │   ├── Multi-Agent System
│   │   ├── Pipeline Architecture
│   │   ├── Backend Services
│   │   └── Ops Layer
│   │
│   ├── 5.3 Data Architecture
│   │   ├── Prisma Schema
│   │   ├── Migrations
│   │   ├── Ledger Model
│   │   └── Audit Log Architecture
│   │
│   ├── 5.4 Diagrams
│   │   ├── Sequence Diagrams
│   │   ├── Flow Diagrams
│   │   ├── Component Diagrams
│   │   └── ER Diagrams
│   │
│   └── 5.5 Decisions
│       ├── ADR Index
│       └── RFC Index
│
├── 6. SECURITY
│   │
│   ├── 6.1 Security Policy
│   │   ├── Overview
│   │   ├── Principles
│   │   └── Responsibilities
│   │
│   ├── 6.2 Threat Model
│   │   ├── Overview
│   │   ├── Attack Vectors
│   │   └── Mitigations
│   │
│   ├── 6.3 Hardening Guide
│   │   ├── System Hardening
│   │   ├── Network Security
│   │   └── Application Security
│   │
│   ├── 6.4 Webhook Security
│   │   ├── Signature Validation
│   │   ├── Replay Protection
│   │   └── Best Practices
│   │
│   ├── 6.5 Access Control
│   │   ├── Policy Overview
│   │   ├── Roles & Permissions
│   │   └── Implementation
│   │
│   └── 6.6 Data Classification
│       ├── Classification Levels
│       ├── Handling Guidelines
│       └── Examples
│
├── 7. COMPLIANCE
│   │
│   ├── 7.1 GDPR
│   │   ├── GDPR Matrix
│   │   ├── Data Processing
│   │   ├── Data Subject Rights
│   │   └── Consent Management
│   │
│   ├── 7.2 Retention Policies
│   │   ├── Overview
│   │   ├── Data Categories
│   │   └── Implementation
│   │
│   ├── 7.3 SLA
│   │   ├── Service Level Agreement
│   │   ├── SLO Definitions
│   │   └── Monitoring
│   │
│   ├── 7.4 Compliance Matrix
│   │   ├── Overview
│   │   ├── Requirements
│   │   └── Evidence
│   │
│   └── 7.5 Audit Logs
│       ├── Requirements
│       ├── Format
│       └── Access
│
├── 8. OPERATIONS
│   │
│   ├── 8.1 Backup Policy
│   │   ├── Overview
│   │   ├── Backup Schedule
│   │   └── Retention
│   │
│   ├── 8.2 Restore Playbook
│   │   ├── Overview
│   │   ├── Procedures
│   │   └── Testing
│   │
│   ├── 8.3 Monitoring & Alerts
│   │   ├── Overview
│   │   ├── Metrics
│   │   └── Alerting
│   │
│   ├── 8.4 Incident Playbooks
│   │   ├── SEV-1 Playbook
│   │   ├── SEV-2 Playbook
│   │   └── SEV-3 Playbook
│   │
│   ├── 8.5 On-Call Runbook
│   │   ├── Overview
│   │   ├── Responsibilities
│   │   └── Escalation
│   │
│   └── 8.6 CronJobs
│       ├── Overview
│       │   └── Schedule
│       └── Monitoring
│
├── 9. PARTNER
│   │
│   ├── 9.1 Integration Guide
│   │   ├── Overview
│   │   ├── Steps
│   │   └── Checklist
│   │
│   ├── 9.2 Certification
│   │   ├── Checklist
│   │   ├── Requirements
│   │   └── Process
│   │
│   ├── 9.3 Sandbox Guide
│   │   ├── Setup
│   │   ├── Features
│   │   └── Limitations
│   │
│   └── 9.4 Troubleshooting
│       ├── Common Issues
│       └── Solutions
│
├── 10. KNOWLEDGE BASE
│   │
│   ├── 10.1 FAQ
│   │   ├── General
│   │   ├── API
│   │   ├── Webhooks
│   │   ├── Payments
│   │   └── Compliance
│   │
│   ├── 10.2 Glossary
│   │   ├── Technical Terms
│   │   ├── Business Terms
│   │   ├── Compliance Terms
│   │   └── API Terms
│   │
│   └── 10.3 How-To Articles
│       ├── Authentication
│       ├── Integration
│       └── Troubleshooting
│
├── 11. CHANGELOG
│   │
│   ├── 11.1 API Changelog
│   │   ├── Latest Changes
│   │   ├── Version History
│   │   └── Deprecations
│   │
│   ├── 11.2 Webhook Changelog
│   │   ├── Event Changes
│   │   ├── Payload Changes
│   │   └── Deprecations
│   │
│   └── 11.3 System Changelog
│       ├── Feature Releases
│       ├── Bug Fixes
│       └── Maintenance
│
└── 12. SUPPORT
    │
    ├── 12.1 Contact
    │   ├── Channels
    │   ├── Hours
    │   └── Response Times
    │
    ├── 12.2 Ticket System
    │   ├── Creating Tickets
    │   ├── Status
    │   └── Priorities
    │
    └── 12.3 Status Page
        ├── Current Status
        ├── Incident History
        └── Uptime
```

---

## 4. Navigationspfade

### 4.1 Primäre User Journeys

#### Journey 1: Neuer Partner startet Integration

```
Homepage → Getting Started → Quickstart
         → Getting Started → API Keys
         → Getting Started → First API Call
         → API Reference → Payments API
         → Tools → API Explorer
```

**Dauer:** ~15 Minuten  
**Klicks:** 5

#### Journey 2: Entwickler debuggt Webhook

```
API Reference → Webhook API → Errors
→ Guides → Troubleshooting → Webhook Issues
→ Tools → Webhook Simulator
```

**Dauer:** ~10 Minuten  
**Klicks:** 4

#### Journey 3: Auditor prüft Compliance

```
Compliance → GDPR Matrix
          → Compliance → Retention Policies
          → Compliance → Audit Logs
          → Security → Access Control
```

**Dauer:** ~20 Minuten  
**Klicks:** 4

### 4.2 Klick-Tiefe

| Kategorie | Min. Tiefe | Max. Tiefe | Durchschnitt |
|-----------|------------|------------|--------------|
| Getting Started | 2 | 3 | 2.3 |
| API Reference | 2 | 4 | 2.8 |
| Guides | 2 | 4 | 2.5 |
| Tools | 2 | 3 | 2.2 |
| Architecture | 2 | 4 | 2.6 |
| Security | 2 | 4 | 2.7 |
| Compliance | 2 | 3 | 2.4 |
| Operations | 2 | 4 | 2.8 |
| Partner | 2 | 3 | 2.2 |
| Knowledge Base | 2 | 3 | 2.3 |

---

## 5. Cross-Linking-Strategie

### 5.1 Verlinkungs-Typen

| Typ | Beschreibung | Beispiel |
|-----|--------------|----------|
| **Hierarchical** | Parent/Child Beziehungen | API Reference → Payments API |
| **Sequential** | Nächster/Schritt | Getting Started Step 1 → Step 2 |
| **Related** | Thematisch verwandt | Payments API → Webhook Events |
| **Reference** | Technische Referenz | API Endpoint → Error Codes |
| **Contextual** | Kontextabhängig | Guide → API Explorer |

### 5.2 Cross-Link Matrix

```
                 Getting  API     Guides  Tools   Arch    Sec     Comp    Ops
                 Start    Ref
──────────────────────────────────────────────────────────────────────────────
Getting Started    ●       ○       ○       ○       -       -       -       -
API Reference      ○       ●       ○       ○       ○       ○       -       -
Guides             ○       ○       ●       ○       ○       ○       -       -
Tools              ○       ○       ○       ●       ○       -       -       -
Architecture       -       ○       ○       ○       ●       ○       ○       ○
Security           -       ○       ○       -       ○       ●       ○       ○
Compliance         -       -       -       -       ○       ○       ●       ○
Operations         -       -       -       ○       ○       ○       ○       ●

● = Starke Verlinkung (mehrere Links)
○ = Mittlere Verlinkung (einige Links)
- = Keine/Selten Verlinkung
```

---

## 6. Content-Typen

### 6.1 Content-Typ Matrix

| Kategorie | Referenz | Guide | Tutorial | Spec | Policy |
|-----------|----------|-------|----------|------|--------|
| Getting Started | - | ● | ● | - | - |
| API Reference | ● | - | - | ● | - |
| Guides | - | ● | ● | - | - |
| Tools | - | ● | ● | ○ | - |
| Architecture | ○ | ○ | - | ● | - |
| Security | ○ | ○ | - | - | ● |
| Compliance | ○ | - | - | - | ● |
| Operations | - | ● | - | - | ○ |

### 6.2 Metadaten-Schema

Jede Seite hat folgende Metadaten:

```yaml
---
title: "Page Title"
category: "Category Name"
subcategory: "Subcategory Name"
type: "reference|guide|tutorial|spec|policy"
audience: ["partner", "developer", "auditor", "sre"]
difficulty: "beginner|intermediate|advanced"
tags: ["tag1", "tag2", "tag3"]
last_updated: "2024-01-15"
related:
  - "related-page-1"
  - "related-page-2"
---
```

---

## Anhang

### A. URL-Struktur

```
/                           # Homepage
/getting-started/           # Getting Started
/getting-started/quickstart # Quickstart Guide
/api-reference/             # API Reference
/api-reference/payments/    # Payments API
/api-reference/payments/post-payments  # POST /payments
/tools/                     # Tools
/tools/api-explorer/        # API Explorer
...
```

### B. Sitemap

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://developers.cargobit.io/</loc></url>
  <url><loc>https://developers.cargobit.io/getting-started/</loc></url>
  <url><loc>https://developers.cargobit.io/getting-started/quickstart</loc></url>
  <!-- ... -->
</urlset>
```

### C. Breadcrumb-Schema

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "API Reference",
      "item": "https://developers.cargobit.io/api-reference/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Payments API",
      "item": "https://developers.cargobit.io/api-reference/payments/"
    }
  ]
}
```

---

**Dokument-Ende**

*Diese Informationsarchitektur bildet die Grundlage für das gesamte Developer Portal. Bei Fragen wende dich an das UX Team.*
