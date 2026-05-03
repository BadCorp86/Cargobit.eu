# 🧱 BLOCK AX — Developer‑Portal API‑Governance‑Framework

## Wie APIs geplant, geprüft, versioniert, dokumentiert und kontrolliert werden

---

## 1. Überblick

Dieses Framework stellt sicher, dass jede API:

| Eigenschaft | Beschreibung |
|-------------|--------------|
| **Konsistent** | Einheitliche Struktur und Naming Conventions |
| **Sicher** | Authentifizierung, Autorisierung, Verschlüsselung |
| **Deterministisch** | Vorhersagbare und reproduzierbare Ergebnisse |
| **Auditierbar** | Vollständige Nachvollziehbarkeit aller Änderungen |
| **Dokumentiert** | Umfassende und aktuelle Dokumentation |
| **Versioniert** | Klare Versionierungsstrategie |
| **Rückwärtskompatibel** | Keine Breaking Changes ohne Migration |

---

## 2. API‑Governance‑Ziele

### 2.1 Primäre Ziele

**Einheitliche API‑Qualität**
Alle APIs folgen denselben Standards, Patterns und Best Practices. Dies gewährleistet Konsistenz über alle Endpunkte hinweg und reduziert die Lernkurve für Entwickler.

**Minimierung von Breaking Changes**
Durch strikte Review-Prozesse und Versionierungsrichtlinien werden Breaking Changes vermieden oder mit ausreichenden Migrationspfaden versehen.

**Klare Verantwortlichkeiten**
Jede API hat einen definierten Owner, der für Qualität, Sicherheit und Weiterentwicklung verantwortlich ist.

**Vollständige Dokumentation**
Jeder Endpunkt ist vollständig dokumentiert mit Beschreibungen, Beispielen, Fehlercodes und Best Practices.

**Audit‑Nachvollziehbarkeit**
Alle Änderungen an APIs sind nachvollziehbar dokumentiert, einschließlich der Entscheidungsprozesse und Genehmigungen.

### 2.2 Messbare KPIs

| KPI | Zielwert | Messung |
|-----|----------|---------|
| API-Dokumentationsabdeckung | 100% | Automatisierte Checks |
| Breaking Changes pro Quartal | 0 | Changelog-Analyse |
| API-Review-Zeit | < 5 Tage | Prozess-Metriken |
| Dokumentations-Aktualität | < 24h | CI/CD-Integration |

---

## 3. Governance‑Prozesse

### 3.1 Phase 1: API‑Proposal (RFC)

Jede neue API oder signifikante Änderung beginnt mit einem Request for Comments (RFC).

**Erforderliche Inhalte:**

```
RFC-Template:
├── Titel und Beschreibung
├── Problemdefinition
│   ├── Aktueller Zustand
│   ├── Schmerzpunkte
│   └── Zielzustand
├── Use Cases
│   ├── Primäre Use Cases
│   ├── Edge Cases
│   └── Nicht-Unterstützte Cases
├── Schema-Entwurf
│   ├── Request Schema
│   ├── Response Schema
│   └── Error Schema
├── Security Impact Assessment
│   ├── Authentifizierung
│   ├── Autorisierung
│   ├── Datenklassifikation
│   └── Bedrohungsanalyse
├── Compliance Impact Assessment
│   ├── GDPR-Relevanz
│   ├── Audit-Anforderungen
│   └── Retention-Policy
└── Timeline und Ressourcen
```

**Review-Dauer:** 5 Werktage
**Genehmigung:** Tech Lead + Security Lead

### 3.2 Phase 2: Architecture Review

Der Architecture Review stellt sicher, dass die API den architektonischen Standards entspricht.

**Checkliste:**

| Prüfpunkt | Beschreibung | Verantwortlich |
|-----------|--------------|----------------|
| ADR‑Check | Entspricht der API den Architecture Decision Records? | Solution Architect |
| Schema‑Check | Ist das Schema konsistent mit anderen APIs? | API Guild |
| Determinism‑Check | Sind alle Responses deterministisch? | Backend Team |
| Error‑Model‑Check | Entspricht das Fehlermodell dem Standard? | API Guild |

**Entscheidungsmöglichkeiten:**
- ✅ Genehmigt
- ⚠️ Genehmigt mit Bedingungen
- ❌ Abgelehnt mit Feedback

### 3.3 Phase 3: Security Review

Jede API durchläuft einen Security Review vor der Veröffentlichung.

**Prüfbereiche:**

**Threat Model**
- STRIDE-Analyse für alle Endpunkte
- Identifikation von Angriffsvektoren
- Definition von Gegenmaßnahmen

**Signature Model**
- HMAC-Signatur-Anforderungen
- Webhook-Signatur-Validierung
- API-Key-Rotation-Policy

**Rate Limit Model**
- Default-Limits
- Burst-Handling
- DDoS-Schutz

**Security Review Output:**
```
Security Review Report:
├── Threat Assessment
├── Vulnerability Analysis
├── Required Controls
├── Penetration Test Requirements
└── Approval Status
```

### 3.4 Phase 4: Documentation Review

Die Dokumentation wird auf Vollständigkeit und Qualität geprüft.

**Dokumentationsanforderungen:**

| Dokumenttyp | Inhalt | Format |
|-------------|--------|--------|
| API Reference | Endpunkt-Beschreibung, Parameter, Responses | OpenAPI 3.1 |
| Guides | Step-by-Step Anleitungen | Markdown |
| Examples | Code-Beispiele in 5+ Sprachen | Code Blocks |
| Error Codes | Vollständige Fehlerdokumentation | Tabelle |

**Qualitätskriterien:**
- Alle Parameter sind beschrieben
- Alle Response-Codes sind dokumentiert
- Beispiele sind aktuell und funktionierend
- Links sind funktionsfähig

### 3.5 Phase 5: Release Approval

Die finale Genehmigung vor der Veröffentlichung.

**Release-Checkliste:**

```
Release Approval Checklist:
□ RFC genehmigt
□ Architecture Review abgeschlossen
□ Security Review abgeschlossen
□ Documentation Review abgeschlossen
□ Versionierung festgelegt
□ Changelog erstellt
□ Migration Guide (falls Breaking Change)
□ Deprecation Notice (falls erforderlich)
□ Stakeholder informiert
□ Support-Team geschult
```

---

## 4. API‑Quality‑Standards

### 4.1 Naming Conventions

**Felder (Request/Response):**
```json
{
  "partner_id": "string",      // snake_case
  "created_at": "timestamp",   // snake_case
  "payment_amount": "number"   // snake_case
}
```

**URLs:**
```
GET /api/v1/payment-intents     // kebab-case
POST /api/v1/webhook-endpoints  // kebab-case
GET /api/v1/partner-balances    // kebab-case
```

**Aktionen:**
```
POST /payments/authorize
POST /payments/capture
POST /payments/void
POST /payments/refund
```

### 4.2 Error Model

**Einheitliche Fehlerstruktur:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request payload is invalid",
    "details": [
      {
        "field": "amount",
        "issue": "must be greater than 0",
        "code": "INVALID_VALUE"
      }
    ],
    "request_id": "req_abc123",
    "documentation_url": "https://developer.cargobit.io/errors/VALIDATION_ERROR"
  }
}
```

**Fehlerkategorien:**

| Kategorie | HTTP Status | Beispiel |
|-----------|-------------|----------|
| Validation Error | 400 | INVALID_REQUEST |
| Authentication Error | 401 | UNAUTHORIZED |
| Authorization Error | 403 | FORBIDDEN |
| Not Found | 404 | RESOURCE_NOT_FOUND |
| Conflict | 409 | DUPLICATE_RESOURCE |
| Rate Limited | 429 | RATE_LIMIT_EXCEEDED |
| Server Error | 500 | INTERNAL_ERROR |

### 4.3 Idempotency

**Pflicht für alle POST‑Requests:**

```http
POST /api/v1/payment-intents
Idempotency-Key: idemp_key_abc123
Content-Type: application/json

{
  "amount": 1000,
  "currency": "EUR"
}
```

**Verhalten:**
- Gleicher Request mit gleichem Key = gleiche Response
- Keys werden 24 Stunden gespeichert
- Response enthält `idempotency_key` Feld

### 4.4 Pagination

**Cursor-Based Pagination (Standard):**

```http
GET /api/v1/transactions?limit=50&cursor=tx_123abc
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "cursor": "tx_456def",
    "has_more": true,
    "limit": 50
  }
}
```

---

## 5. Versionierungsstrategie

### 5.1 URL-Versionierung

```
/api/v1/...  →  Stable
/api/v2/...  →  Neue Major Version
```

### 5.2 Semantic Versioning für APIs

| Änderungstyp | Versionssprung | Beispiel |
|--------------|----------------|----------|
| Breaking Change | Major | v1 → v2 |
| Neue Features | Minor | v1.0 → v1.1 |
| Bug Fixes | Patch | v1.0.0 → v1.0.1 |

### 5.3 Breaking Change Policy

**Definition Breaking Change:**
- Entfernung eines Endpunkts
- Entfernung oder Umbenennung eines Pflichtfeldes
- Änderung des Datentyps eines Feldes
- Änderung der Authentifizierungsmethode
- Änderung der Fehlerstruktur

**Migrationsprozess:**

```
Breaking Change Timeline:
├── T-180 Tage: Ankündigung im Changelog
├── T-90 Tage: Deprecation Warning in API Response
├── T-30 Tage: Letzte Erinnerung an Partner
├── T-0 Tage: Abschaltung der alten Version
└── T+30 Tage: Entfernung aus der Dokumentation
```

---

## 6. API‑Governance‑Artefakte

### 6.1 RFC (Request for Comments)

```markdown
# RFC-2024-001: Neue Payment-Split-API

## Status: Approved
## Autor: Backend Team
## Datum: 2024-01-15

### Problem
Partner benötigen die Möglichkeit, Zahlungen auf mehrere Empfänger aufzuteilen.

### Vorgeschlagene Lösung
Neuer Endpunkt POST /payment-splits mit...
```

### 6.2 ADR (Architecture Decision Record)

```markdown
# ADR-003: Cursor-Based Pagination

## Status: Accepted
## Datum: 2024-01-10

### Kontext
Wir benötigen eine einheitliche Pagination-Strategie für alle Listen-Endpunkte.

### Entscheidung
Wir verwenden Cursor-Based Pagination für alle Listen-Endpunkte.

### Begründung
- Konsistente Performance bei großen Datensätzen
- Keine Probleme mit veränderten Daten während der Pagination
- Bessere User Experience
```

### 6.3 Schema Definition

```yaml
# openapi.yaml
openapi: 3.1.0
info:
  title: CargoBit Payment API
  version: 1.0.0
paths:
  /payment-intents:
    post:
      summary: Create a payment intent
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PaymentIntentRequest'
```

### 6.4 Threat Model

```markdown
# Threat Model: Payment Intent API

## STRIDE Analysis

| Threat | Mitigation |
|--------|------------|
| Spoofing | HMAC Signature Verification |
| Tampering | Request Integrity Check |
| Repudiation | Audit Logging |
| Information Disclosure | Encryption in Transit |
| Denial of Service | Rate Limiting |
| Elevation of Privilege | RBAC |
```

### 6.5 Changelog

```markdown
# API Changelog

## [1.2.0] - 2024-01-20

### Added
- New endpoint POST /payment-splits
- Field `metadata` in payment intents

### Changed
- Improved error messages for validation errors

### Deprecated
- Field `legacy_id` will be removed in v2.0.0

### Security
- Enhanced rate limiting for POST endpoints
```

### 6.6 Deprecation Notice

```markdown
# Deprecation Notice

## Endpoint: POST /legacy-payments

**Deprecation Date:** 2024-01-01
**Sunset Date:** 2024-07-01

### Migration Guide
Please migrate to POST /payment-intents.

### Timeline
- 2024-01-01: Deprecation announced
- 2024-04-01: Warning headers added
- 2024-07-01: Endpoint removed
```

---

## 7. Governance-Organisation

### 7.1 Rollen und Verantwortlichkeiten

| Rolle | Verantwortlichkeit | Berichtslinie |
|-------|-------------------|---------------|
| API Owner | API-Qualität, Roadmap | Engineering Manager |
| API Guild Member | Standards, Reviews | Tech Lead |
| Security Reviewer | Security Reviews | Security Lead |
| Tech Writer | Dokumentation | Documentation Lead |

### 7.2 Gremien

**API Guild**
- Wöchentliche Meetings
- Review von RFCs und ADRs
- Weiterentwicklung der Standards

**Architecture Board**
- Monatliche Meetings
- Genehmigung von Breaking Changes
- Strategische Ausrichtung

---

## 8. Tools und Automatisierung

### 8.1 CI/CD Integration

```yaml
# .github/workflows/api-review.yml
name: API Review

on:
  pull_request:
    paths:
      - 'api/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: OpenAPI Lint
        run: npx @redocly/cli lint api/openapi.yaml
      
      - name: Breaking Change Detection
        run: npx oasdiff breaking api/openapi.yaml
```

### 8.2 Automatische Checks

| Check | Tool | Integration |
|-------|------|-------------|
| Schema Validation | OpenAPI Linter | CI/CD |
| Breaking Change Detection | oasdiff | CI/CD |
| Documentation Coverage | Redocly | CI/CD |
| Security Scan | OWASP ZAP | Nightly |

---

## 9. Metriken und Reporting

### 9.1 Dashboard-KPIs

```
API Governance Dashboard:
├── API Health Score: 94%
├── Documentation Coverage: 100%
├── Breaking Changes (MTD): 0
├── API Review Backlog: 3
├── Average Review Time: 4.2 Tage
└── Open Deprecations: 5
```

### 9.2 Quartalsbericht

```markdown
# Q1 2024 API Governance Report

## Zusammenfassung
- 12 neue APIs veröffentlicht
- 0 Breaking Changes
- 100% Dokumentationsabdeckung
- 45 RFCs bearbeitet

## Empfehlungen
- Automatisierung der Schema-Validierung erhöhen
- API-Guild-Mitglieder aufstocken
```

---

## 10. Referenzen

- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [ADR-000: API Design Guidelines](./developer-portal-adr-set.md)
- [Security Hardening Guide](./developer-portal-security-hardening-guide.md)
- [Release Management Konzept](./developer-portal-release-management-konzept.md)

---

*Letzte Aktualisierung: 2024-01-20*
*Owner: API Guild*
*Status: Approved*
