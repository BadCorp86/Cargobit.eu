# CargoBit Architecture Deep Dive
## Das vollständige, extrem detaillierte Architektur-Dokument

**Version:** 1.0  
**Klassifikation:** Internal Use Only  
**Zielgruppe:** Senior Engineers, Enterprise Architects, Security Teams, Auditoren

---

# Inhaltsverzeichnis

1. [Einführung](#1-einführung)
2. [System Overview](#2-system-overview)
3. [Multi-Agent System Architecture](#3-multi-agent-system-architecture)
4. [Data Architecture](#4-data-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Security Architecture](#6-security-architecture)
7. [Integration Architecture](#7-integration-architecture)
8. [Operations Architecture](#8-operations-architecture)
9. [Pipeline Architecture](#9-pipeline-architecture)
10. [Determinism Architecture](#10-determinism-architecture)
11. [Compliance Architecture](#11-compliance-architecture)
12. [Design Decisions](#12-design-decisions)
13. [Alternatives Considered](#13-alternatives-considered)
14. [Technical Debt](#14-technical-debt)
15. [Future Architecture](#15-future-architecture)
16. [Glossary](#16-glossary)

---

# 1. Einführung

## 1.1 Dokumentzweck

Dieses Dokument beschreibt die vollständige technische Architektur des CargoBit Foundation Generator Systems. Es richtet sich an Senior Engineers, Enterprise Architects, Security und Compliance Teams sowie Auditoren und Partner mit technischem Fokus. Es erklärt alle Schichten, Komponenten, Datenflüsse, Sicherheitsmechanismen und Designentscheidungen in einer Tiefe, die für Enterprise-Reviews und Due-Diligence-Prüfungen ausreichend ist.

## 1.2 Systemgrenzen

Das CargoBit Foundation Generator System ist ein automatisiertes System zur Generierung technischer Foundation-Artefakte für Zahlungsabwicklungssysteme. Es generiert Datenbankschemata, Backend-Services, Operations-Skripte, Tests und Dokumentation. Das System ist so konzipiert, dass es unabhängig von spezifischer Infrastruktur funktioniert und plattformagnostisch bleibt. Die generierten Artefakte sind deterministisch, was bedeutet, dass bei identischem Input immer identischer Output erzeugt wird.

## 1.3 Architektur-Prinzipien

Die Architektur basiert auf fünf fundamentalen Prinzipien, die durch alle Schichten konsistent umgesetzt werden. Determinismus bedeutet, dass alle generierten Artefakte reproduzierbar und vorhersehbar sind. Modularität ermöglicht die unabhängige Entwicklung und Erweiterung einzelner Komponenten. Automation reduziert manuelle Eingriffe und die damit verbundenen Fehlerquellen. Security-by-Design stellt sicher, dass Sicherheitsaspekte von Anfang an integriert sind. Compliance-by-Design gewährleistet, dass regulatorische Anforderungen automatisch erfüllt werden.

---

# 2. System Overview

## 2.1 High-Level Architecture

Das System besteht aus drei Hauptschichten, die zusammen einen vollständigen Generierungs- und Validierungsprozess bilden. Das Multi-Agent System ist die Generierungsschicht, die spezialisierte Agenten koordiniert. Die Deterministic Assembly Engine ist die Organisationsschicht, die Artefakte sammelt und Metadaten erstellt. Die CI Pipeline ist die Automatisierungsschicht, die den gesamten Prozess orchestriert.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CargoBit Foundation Generator                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   GENERATION LAYER                               │   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │                    Multi-Agent System                        ││   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       ││   │
│  │  │  │Architect │ │ Backend  │ │   SRE    │ │    QA    │       ││   │
│  │  │  │  Agent   │ │  Agent   │ │  Agent   │ │  Agent   │       ││   │
│  │  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       ││   │
│  │  │       │            │            │            │              ││   │
│  │  │       └────────────┴────────────┴────────────┘              ││   │
│  │  │                         │                                    ││   │
│  │  │                  ┌──────▼──────┐                            ││   │
│  │  │                  │ Compliance  │                            ││   │
│  │  │                  │   Agent     │                            ││   │
│  │  │                  └──────┬──────┘                            ││   │
│  │  └─────────────────────────┼────────────────────────────────────┘│   │
│  └────────────────────────────┼─────────────────────────────────────┘   │
│                               │                                         │
│  ┌────────────────────────────▼─────────────────────────────────────┐   │
│  │                   ORGANIZATION LAYER                              │   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │              Deterministic Assembly Engine                   ││   │
│  │  │   • File Collection    • Manifest Generation                 ││   │
│  │  │   • Checksum Creation  • Structure Validation                ││   │
│  │  └─────────────────────────────────────────────────────────────┘│   │
│  └────────────────────────────┬─────────────────────────────────────┘   │
│                               │                                         │
│  ┌────────────────────────────▼─────────────────────────────────────┐   │
│  │                   AUTOMATION LAYER                                │   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │                     CI Pipeline                              ││   │
│  │  │   Run → Validate → Assemble → Publish                       ││   │
│  │  └─────────────────────────────────────────────────────────────┘│   │
│  └────────────────────────────┬─────────────────────────────────────┘   │
│                               │                                         │
│  ┌────────────────────────────▼─────────────────────────────────────┐   │
│  │                     OUTPUT LAYER                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────┐│   │
│  │  │                  Deterministic Output                        ││   │
│  │  │   Schema • Migrations • Services • Tests • Docs             ││   │
│  │  └─────────────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Komponenten-Interaktion

Die Interaktion zwischen den Komponenten folgt einem strikten sequenziellen Fluss mit definierten Übergabepunkten. Der Orchestrator initialisiert den Kontext und startet die Agenten. Jeder Agent empfängt den aktuellen Kontext und generiert seine spezifischen Artefakte. Nach der Ausführung übergibt der Agent aktualisierte Kontext-Informationen an nachfolgende Agenten. Die Assembly Engine sammelt alle Artefakte und erstellt Metadaten. Die Pipeline validiert den Output und publiziert bei Erfolg.

## 2.3 Technologie-Stack

| Ebene | Technologie | Begründung |
|-------|------------|------------|
| Runtime | Node.js 20+ | Performance, Ecosystem |
| Sprache | TypeScript | Typsicherheit, Developer Experience |
| ORM | Prisma | Migration-Safety, Typing |
| Datenbank | PostgreSQL | ACID, Reliability |
| Cache | Redis | Performance, Rate Limiting |
| CI/CD | GitHub Actions | Integration, Automation |
| Testing | Jest | Coverage, Mocking |

---

# 3. Multi-Agent System Architecture

## 3.1 Agent-Design-Philosophie

Das Multi-Agent System basiert auf dem Prinzip der spezialisierten Verantwortlichkeit. Jeder Agent ist ein unabhängiges Modul mit klar definierter Zuständigkeit. Die Agenten kommunizieren ausschließlich über einen expliziten Kontext-Mechanismus. Seiteneffekte zwischen Agenten sind durch den Orchestrator kontrolliert. Die Ausführungsreihenfolge ist deterministisch und vorhersagbar.

## 3.2 Agent-Typen und Verantwortlichkeiten

### 3.2.1 Architect Agent

Der Architect Agent ist der erste Agent in der Ausführungsreihenfolge und legt das Fundament für alle nachfolgenden Generierungen. Seine primäre Verantwortlichkeit ist die Definition der Datenarchitektur. Er generiert das Prisma-Schema, das die Datenstruktur des gesamten Systems definiert. Er erstellt SQL-Migrationen für die Evolution der Datenbankstruktur. Er produziert die Architektur-Dokumentation, die als Referenz für alle anderen Agenten dient.

**Generierte Artefakte:**

| Artefakt | Beschreibung | Abhängigkeiten |
|----------|--------------|----------------|
| `prisma/schema.prisma` | Datenbank-Schema-Definition | Keine |
| `migrations/0001_init.sql` | Initiale Tabellen-Erstellung | Schema |
| `migrations/0002_indexes.sql` | Performance-Optimierungen | Init-Migration |
| `docs/architecture-overview.md` | Architektur-Dokumentation | Schema |

**Design-Entscheidungen:**

- Verwendung von UUID als Primärschlüssel für globale Eindeutigkeit
- Timestamps mit Timezone für internationale Konsistenz
- Keine Cascade-Deletes für Datenintegrität
- Immutable Ledger-Tables für Audit-Sicherheit

### 3.2.2 Backend Agent

Der Backend Agent implementiert die Kerngeschäftslogik des Systems. Er baut direkt auf dem Schema des Architect Agents auf und generiert Services, die mit der definierten Datenstruktur arbeiten. Seine Verantwortlichkeiten umfassen Rate-Limiting für API-Schutz, Stripe-Webhook-Verarbeitung mit Security-Validierung, Audit-Logging mit Hash-Chain-Integrität und Business-Logik-Services.

**Generierte Artefakte:**

| Artefakt | Beschreibung | Abhängigkeiten |
|----------|--------------|----------------|
| `src/lib/rateLimit.ts` | Token-Bucket-Implementierung | Keine |
| `src/middleware/rateLimit.ts` | Express-Middleware | lib/rateLimit.ts |
| `src/webhooks/stripe.ts` | Webhook-Handler | lib/rateLimit.ts |
| `src/services/stripeEvents.ts` | Event-Verarbeitung | webhooks/stripe.ts |
| `src/services/auditLog.ts` | Audit-Logging | Schema |
| `src/jobs/auditVerify.ts` | Integritäts-Check | services/auditLog.ts |

**Design-Entscheidungen:**

- Token-Bucket als primärer Rate-Limit-Algorithmus für glatte Begrenzung
- Sliding-Window als Fallback für verteilte Szenarien
- Raw-Body-Parsing für Signature-Validierung
- Transaktionale Event-Verarbeitung für Idempotenz

### 3.2.3 SRE Agent

Der SRE Agent ist für den Betrieb des generierten Systems verantwortlich. Er erstellt Skripte und Konfigurationen für Backup, Restore, Monitoring und Wartung. Seine Outputs gewährleisten, dass das generierte System in Produktionsumgebungen zuverlässig betrieben werden kann.

**Generierte Artefakte:**

| Artefakt | Beschreibung | Abhängigkeiten |
|----------|--------------|----------------|
| `ops/backup-db.sh` | Datenbank-Backup-Skript | Keine |
| `ops/restore-db.sh` | Datenbank-Restore-Skript | backup-db.sh |
| `ops/cron-backup.yaml` | CronJob-Definition | backup-db.sh |
| `ops/export-audit-log.ts` | Audit-Export-Skript | Schema |

**Design-Entscheidungen:**

- pg_dump im Custom-Format für Flexibilität
- Keine Owner/Privilege-Änderungen im Restore für Sicherheit
- Cloud-agnostische CronJob-Definition für Portabilität

### 3.2.4 QA Agent

Der QA Agent entwickelt umfassende Test-Suiten für das generierte System. Er validiert die Korrektheit der anderen Agent-Outputs und stellt sicher, dass der generierte Code den Qualitätsanforderungen entspricht. Seine Tests decken Unit-, Integration- und Determinism-Tests ab.

**Generierte Artefakte:**

| Artefakt | Beschreibung | Abhängigkeiten |
|----------|--------------|----------------|
| `tests/rateLimit.test.ts` | Token-Bucket-Tests | lib/rateLimit.ts |
| `tests/middleware/rateLimit.test.ts` | Middleware-Tests | middleware/rateLimit.ts |
| `tests/services/stripeEvents.test.ts` | Event-Tests | services/stripeEvents.ts |
| `tests/webhooks/stripe.test.ts` | Webhook-Tests | webhooks/stripe.ts |

**Design-Entscheidungen:**

- Jest als Test-Framework für Konsistenz mit dem Ecosystem
- Mocking externer Abhängigkeiten für Isolation
- Coverage-Schwellen von 80% für kritische Pfade

### 3.2.5 Compliance Agent

Der Compliance Agent stellt die Einhaltung regulatorischer Anforderungen sicher. Er generiert Sicherheitsrichtlinien, SLA-Definitionen, Incident-Playbooks und On-Call-Runbooks. Seine Outputs sind essenziell für Audit-Situationen und den sicheren Betrieb des Systems.

**Generierte Artefakte:**

| Artefakt | Beschreibung | Abhängigkeiten |
|----------|--------------|----------------|
| `docs/security-policy.md` | Sicherheitsrichtlinien | architecture-overview.md |
| `docs/compliance-matrix.md` | Compliance-Übersicht | security-policy.md |
| `docs/incident-response.md` | Incident-Management | security-policy.md |
| `docs/on-call-playbook.md` | Bereitschaftsdienst | incident-response.md |
| `docs/sla-definitions.md` | Service-Level-Agreements | architecture-overview.md |

**Design-Entscheidungen:**

- PCI-DSS SAQ-A Fokus wegen Stripe-Integration
- GDPR Data-Minimization-Prinzip
- SOC 2 Controls als Dokumentationsrahmen

## 3.3 Orchestrator Architecture

### 3.3.1 Orchestrator-Verantwortlichkeiten

Der Orchestrator ist die zentrale Steuerungskomponente des Multi-Agent Systems. Er initialisiert den Ausführungskontext mit Standardwerten. Er lädt und registriert alle verfügbaren Agenten. Er führt die Agenten in der definierten Reihenfolge aus. Er verwaltet den Kontext-Fluss zwischen Agenten. Er sammelt alle generierten Dateien. Er validiert die Konsistenz der Outputs. Er erzeugt den finalen Output-Bundle.

### 3.3.2 Orchestrator-Implementierung

```javascript
// orchestrator.js - Core Logic
const fs = require('fs');
const path = require('path');

class Orchestrator {
  constructor(config) {
    this.config = config;
    this.context = {};
    this.files = {};
    this.errors = [];
  }

  async initialize() {
    // Load agent configurations
    this.agents = this.config.executionOrder.map(name => ({
      name,
      module: require(`./agents/${name}`)
    }));
    
    // Initialize context
    this.context = {
      timestamp: new Date().toISOString(),
      version: this.config.version,
      ...this.config.initialContext
    };
  }

  async run() {
    for (const agent of this.agents) {
      try {
        console.log(`Running agent: ${agent.name}`);
        
        const result = await agent.module.run(this.context);
        
        // Merge files
        Object.assign(this.files, result.files);
        
        // Update context
        Object.assign(this.context, result.context || {});
        
        console.log(`Agent ${agent.name} completed: ${Object.keys(result.files).length} files`);
      } catch (error) {
        this.errors.push({ agent: agent.name, error });
        throw error; // Fail fast
      }
    }
    
    return {
      files: this.files,
      context: this.context,
      errors: this.errors
    };
  }
}

module.exports = { Orchestrator };
```

### 3.3.3 Kontext-Mechanismus

Der Kontext ist ein zentrales Objekt, das zwischen Agenten geteilt wird. Er enthält Informationen, die von einem Agenten generiert und von nachfolgenden Agenten verwendet werden. Der Kontext ist immutable für bereits ausgeführte Agenten, was bedeutet, dass nachträgliche Änderungen nicht möglich sind. Diese Immutability gewährleistet Reproduzierbarkeit und Debugging-Fähigkeit.

**Kontext-Struktur:**

```javascript
{
  // Metadata
  version: "1.0.0",
  timestamp: "2024-Q4",
  
  // Agent Outputs
  architect: {
    schema: { /* Prisma Schema Object */ },
    migrations: ["0001_init.sql", "0002_indexes.sql"],
    entities: ["User", "Wallet", "Transaction", "Payment"]
  },
  
  backend: {
    services: ["rateLimit", "stripeEvents", "auditLog"],
    endpoints: ["/webhooks/stripe"]
  },
  
  sre: {
    scripts: ["backup-db.sh", "restore-db.sh"],
    cronjobs: ["cron-backup.yaml"]
  },
  
  qa: {
    testFiles: ["rateLimit.test.ts", "stripe.test.ts"],
    coverage: 0.85
  },
  
  compliance: {
    policies: ["security-policy.md", "compliance-matrix.md"],
    standards: ["PCI-DSS", "GDPR", "SOC2"]
  }
}
```

---

# 4. Data Architecture

## 4.1 Database Schema Architecture

### 4.1.1 Schema-Design-Prinzipien

Das Datenbankschema basiert auf Prinzipien, die Datenintegrität, Performance und Audit-Sicherheit gewährleisten. ACID-Compliance stellt sicher, dass alle Transaktionen atomar, konsistent, isoliert und dauerhaft sind. Referential Integrity durch Foreign Keys verhindert verwaiste Datensätze. Keine Cascade-Deletes schützt vor versehentlichem Datenverlust. Immutable Ledger-Tables gewährleisten Audit-Sicherheit. Timestamps mit Timezone ermöglichen internationale Konsistenz.

### 4.1.2 Core Entities

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Entity Relationship Diagram                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐           │
│  │    User     │       │   Wallet    │       │Transaction  │           │
│  ├─────────────┤       ├─────────────┤       ├─────────────┤           │
│  │ id (UUID)   │──┐    │ id (UUID)   │──┐    │ id (UUID)   │           │
│  │ email       │  │    │ userId (FK) │◄─┘    │ walletId(FK)│◄──┐       │
│  │ role        │  │    │ balance     │       │ amount      │   │       │
│  │ createdAt   │  │    │ currency    │       │ type        │   │       │
│  └─────────────┘  │    │ createdAt   │       │ createdAt   │   │       │
│                   │    └─────────────┘       └─────────────┘   │       │
│                   │                                          │       │
│                   │    ┌─────────────┐       ┌─────────────┐ │       │
│                   │    │   Payment   │       │   Payout    │ │       │
│                   │    ├─────────────┤       ├─────────────┤ │       │
│                   │    │ id (UUID)   │       │ id (UUID)   │ │       │
│                   └───►│ userId (FK) │       │ userId (FK) │ │       │
│                        │ stripeId    │       │ stripeId    │ │       │
│                        │ amount      │       │ amount      │ │       │
│                        │ status      │       │ status      │ │       │
│                        └─────────────┘       └─────────────┘ │       │
│                                                          │   │       │
│  ┌─────────────┐       ┌─────────────┐                  │   │       │
│  │ StripeEvent │       │  AuditLog   │                  │   │       │
│  ├─────────────┤       ├─────────────┤                  │   │       │
│  │ id (UUID)   │       │ id (UUID)   │                  │   │       │
│  │ stripeId    │       │ action      │                  │   │       │
│  │ type        │       │ entityType  │                  │   │       │
│  │ processed   │       │ entityId    │◄─────────────────┘   │       │
│  │ createdAt   │       │ actor       │                      │       │
│  └─────────────┘       │ prevHash    │                      │       │
│                        │ hash        │                      │       │
│                        └─────────────┘                      │       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.1.3 Entity-Beschreibungen

| Entity | Zweck | Beziehungen |
|--------|-------|-------------|
| User | Benutzer-Identität und Rollen | Hat viele Wallets |
| Wallet | Guthaben pro Währung | Gehört zu User, Hat viele Transactions |
| Transaction | Ledger-Einträge | Gehört zu Wallet |
| Payment | Eingehende Zahlungen | Gehört zu User |
| Payout | Ausgehende Zahlungen | Gehört zu User |
| StripeEvent | Idempotenz-Tabelle | Unabhängig |
| AuditLog | Audit-Historie | Verweist auf beliebige Entities |

## 4.2 Ledger Architecture

### 4.2.1 Immutability-Prinzip

Die Ledger-Architektur basiert auf dem Immutability-Prinzip, das für Finanzsysteme essenziell ist. Transaktionen sind append-only, was bedeutet, dass neue Einträge nur hinzugefügt, niemals geändert oder gelöscht werden können. Diese Eigenschaft gewährleistet, dass die vollständige Historie aller Transaktionen jederzeit verfügbar und auditierbar ist. Bei Korrekturen wird eine neue ausgleichende Transaktion erstellt, anstatt die ursprüngliche zu ändern.

### 4.2.2 Double-Entry-Bookkeeping

Das System implementiert Prinzipien des Double-Entry-Bookkeeping für Konsistenz. Jede Transaktion hat eine Quelle und ein Ziel. Die Summe aller Wallet-Balances entspricht der Summe aller Transaktionen. Konsistenz-Checks validieren dies periodisch. Diese Architektur verhindert Datenanomalien und ermöglicht einfache Reconciliation.

### 4.2.3 Referential Integrity

Die referentielle Integrität wird durch strikte Foreign-Key-Constraints gewährleistet. Jede Transaction gehört zu genau einem Wallet. Jeder Wallet gehört zu genau einem User. Diese Constraints sind auf Datenbankebene implementiert und können nicht umgangen werden. Dies verhindert verwaiste Datensätze und gewährleistet Datenkonsistenz.

## 4.3 Audit Log Architecture

### 4.3.1 Hash-Chain-Mechanismus

Der Audit-Log verwendet eine kryptografische Hash-Chain für Integrität. Jeder Eintrag enthält den Hash des vorherigen Eintrags (prevHash). Der eigene Hash wird über alle Inhalte einschließlich prevHash berechnet. Dies erzeugt eine unveränderliche Kette, bei der jede Änderung erkannt wird.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Audit Log Hash Chain                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Entry 1              Entry 2              Entry 3                      │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐              │
│  │ action: ... │      │ action: ... │      │ action: ... │              │
│  │ entity: ... │      │ entity: ... │      │ entity: ... │              │
│  │ prevHash: 0 │─────►│ prevHash: H1│─────►│ prevHash: H2│───► ...      │
│  │ hash: H1    │      │ hash: H2    │      │ hash: H3    │              │
│  └─────────────┘      └─────────────┘      └─────────────┘              │
│                                                                         │
│  Verifikation: H(n) = hash(content + prevHash)                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.3.2 Integritäts-Verifikation

Ein Background-Job verifiziert periodisch die Integrität der Audit-Log-Kette. Der Job liest alle Einträge in chronologischer Reihenfolge. Für jeden Eintrag wird der Hash neu berechnet und mit dem gespeicherten Hash verglichen. Bei einer Diskrepanz wird ein Alert ausgelöst. Der Job läuft wöchentlich und dokumentiert die Ergebnisse.

### 4.3.3 Implementierung

```typescript
// auditLog.ts - Hash Chain Implementation
import crypto from 'crypto';

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: string;
  metadata: Record<string, unknown>;
  previousHash: string;
  hash: string;
}

function computeHash(entry: Omit<AuditEntry, 'hash'>): string {
  // Deterministic serialization: alphabetically sorted keys
  const payload = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    actor: entry.actor,
    metadata: sortObjectKeys(entry.metadata),
    previousHash: entry.previousHash
  }, Object.keys(payload).sort());
  
  return crypto
    .createHmac('sha256', process.env.AUDIT_HASH_SECRET!)
    .update(payload)
    .digest('hex');
}

async function createAuditEntry(
  action: string,
  entityType: string,
  entityId: string,
  actor: string,
  metadata: Record<string, unknown> = {}
): Promise<AuditEntry> {
  // Get previous entry
  const previousEntry = await getLatestAuditEntry();
  const previousHash = previousEntry?.hash || '0'.repeat(64);
  
  const entry: Omit<AuditEntry, 'hash'> = {
    id: generateUUID(),
    timestamp: new Date().toISOString(),
    action,
    entityType,
    entityId,
    actor,
    metadata,
    previousHash
  };
  
  const hash = computeHash(entry);
  
  return { ...entry, hash };
}
```

---

# 5. Backend Architecture

## 5.1 Rate Limiting Architecture

### 5.1.1 Algorithmus-Auswahl

Das System verwendet zwei komplementäre Algorithmen für Rate Limiting. Der Token-Bucket-Algorithmus ist der primäre Mechanismus für glatte Begrenzung. Er erlaubt Burst-Traffic bis zur Bucket-Größe und gewährt konsistente Request-Raten. Der Sliding-Window-Algorithmus dient als Fallback für verteilte Szenarien. Er bietet präzise Begrenzung ohne Burst-Möglichkeit.

### 5.1.2 Token-Bucket-Implementierung

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Token Bucket Algorithm                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Bucket (Capacity: 100 tokens)                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ ████████████████████████████████████████████████░░░░░░░░░░░░░░░░░ │  │
│  │                   75 tokens available                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Refill Rate: 10 tokens/second                                          │
│                                                                         │
│  Request Flow:                                                          │
│  ┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐  │
│  │ Request │────►│ Check Tokens│────►│ Consume 1   │────►│ Allow    │  │
│  └─────────┘     │ Available?  │     │ Token       │     │ Request  │  │
│                  └──────┬──────┘     └─────────────┘     └──────────┘  │
│                         │                                               │
│                         │ No                                            │
│                         ▼                                               │
│                  ┌─────────────┐                                        │
│                  │ Reject with │                                        │
│                  │ 429 + Retry │                                        │
│                  │ -After      │                                        │
│                  └─────────────┘                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.1.3 Redis-Speicherstruktur

Die Rate-Limit-Daten werden in Redis gespeichert für Performance und Verteilbarkeit. Die Schlüsselstruktur ist `rl:{identifier}:{route}`. Der Wert enthält die Anzahl der Tokens und den letzten Refill-Zeitpunkt. TTL wird verwendet, um veraltete Einträge automatisch zu bereinigen.

```typescript
// rateLimit.ts - Redis Implementation
interface RateLimitConfig {
  points: number;           // Max tokens
  duration: number;         // Refill window in seconds
  blockDuration: number;    // Block time when exceeded
}

async function checkRateLimit(
  identifier: string,
  route: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const key = `rl:${identifier}:${route}`;
  const now = Date.now();
  
  // Get current state
  const state = await redis.hgetall(key);
  const tokens = parseFloat(state.tokens ?? config.points);
  const lastRefill = parseInt(state.lastRefill ?? now);
  
  // Calculate refill
  const elapsed = (now - lastRefill) / 1000;
  const refillRate = config.points / config.duration;
  const newTokens = Math.min(
    config.points,
    tokens + (elapsed * refillRate)
  );
  
  if (newTokens >= 1) {
    // Allow request, consume token
    await redis.hset(key, {
      tokens: (newTokens - 1).toString(),
      lastRefill: now.toString()
    });
    await redis.expire(key, config.duration * 2);
    
    return { allowed: true, remaining: Math.floor(newTokens - 1) };
  } else {
    // Reject request
    const retryAfter = Math.ceil((1 - newTokens) / refillRate);
    return { allowed: false, remaining: 0, retryAfter };
  }
}
```

## 5.2 Stripe Webhook Architecture

### 5.2.1 Security-Layer

Die Webhook-Architektur implementiert mehrschichtige Security. Der erste Layer ist die Signature-Validierung, die sicherstellt, dass der Request tatsächlich von Stripe stammt. Der zweite Layer ist die Idempotency-Prüfung, die Replay-Attacks verhindert. Der dritte Layer ist die Transactional Processing, die Datenkonsistenz gewährleistet.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Webhook Security Flow                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Stripe ──► Webhook Endpoint                                            │
│                │                                                        │
│                ▼                                                        │
│         ┌─────────────┐                                                 │
│         │ 1. Parse    │  Raw body preservation for signature           │
│         │    Raw Body │                                                 │
│         └──────┬──────┘                                                 │
│                │                                                        │
│                ▼                                                        │
│         ┌─────────────┐                                                 │
│         │ 2. Validate │  stripe-signature header check                  │
│         │  Signature  │  Timestamp tolerance (5 min)                    │
│         └──────┬──────┘  HMAC-SHA256 verification                       │
│                │                                                        │
│                ▼                                                        │
│         ┌─────────────┐                                                 │
│         │ 3. Check    │  StripeEvent table lookup                       │
│         │  Idempotency│  Return 200 if already processed                │
│         └──────┬──────┘                                                 │
│                │                                                        │
│                ▼                                                        │
│         ┌─────────────┐                                                 │
│         │ 4. Process  │  Transactional event handling                   │
│         │    Event    │  Create StripeEvent record                      │
│         └──────┬──────┘  Update business entities                       │
│                │                                                        │
│                ▼                                                        │
│         ┌─────────────┐                                                 │
│         │ 5. Respond  │  200 OK with processing confirmation            │
│         └─────────────┘                                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2.2 Implementierung

```typescript
// stripe.ts - Webhook Handler
import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function handleStripeWebhook(
  req: Request,
  res: Response
): Promise<void> {
  // 1. Get raw body
  const rawBody = await buffer(req);
  const signature = req.headers['stripe-signature'];
  
  if (!signature) {
    res.status(400).json({ error: 'Missing signature' });
    return;
  }
  
  // 2. Validate signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Signature validation failed:', err);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }
  
  // 3. Check idempotency
  const existingEvent = await prisma.stripeEvent.findUnique({
    where: { stripeId: event.id }
  });
  
  if (existingEvent) {
    // Already processed - idempotent response
    res.status(200).json({ received: true, idempotent: true });
    return;
  }
  
  // 4. Process event transactionally
  try {
    await prisma.$transaction(async (tx) => {
      // Create event record
      await tx.stripeEvent.create({
        data: {
          stripeId: event.id,
          type: event.type,
          processed: true
        }
      });
      
      // Process based on event type
      await processEvent(event, tx);
    });
    
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Event processing failed:', err);
    res.status(500).json({ error: 'Processing failed' });
  }
}
```

---

# 6. Security Architecture

## 6.1 Security-Layers

Die Sicherheitsarchitektur besteht aus fünf Schichten, die einen Defense-in-Depth-Ansatz implementieren. Die Application-Layer umfasst RBAC, Rate Limiting und Input Validation. Die Integration-Layer enthält Webhook-Signature-Validation und TLS. Die Data-Layer implementiert Encryption, FK-Constraints und Immutability. Die Operations-Layer umfasst Backups, Restore und Monitoring. Die Compliance-Layer enthält Policies, SLAs und Audit-Logs.

## 6.2 Threat Model

### 6.2.1 STRIDE-Analyse

| Threat | Component | Risk | Mitigation |
|--------|-----------|------|------------|
| **S**poofing | Webhook Endpoint | High | Stripe Signature Validation |
| **T**ampering | Audit Logs | Critical | Hash Chain Verification |
| **R**epudiation | Payment Events | High | Idempotency + Audit Log |
| **I**nformation Disclosure | Database | Critical | Encryption + RBAC |
| **D**enial of Service | API Endpoints | High | Rate Limiting + Autoscaling |
| **E**levation of Privilege | Service Accounts | High | mTLS + RBAC |

### 6.2.2 Attack-Vectors und Mitigations

| Attack Vector | Beschreibung | Mitigation |
|---------------|--------------|------------|
| Webhook Spoofing | Gefälschte Stripe-Events | Signature Validation, Timestamp Check |
| Replay Attack | Wiederholte Events | StripeEvent Table, Idempotency |
| SQL Injection | Bösartige Queries | Prisma ORM, Parameterized Queries |
| Rate Abuse | API-Missbrauch | Token Bucket, Sliding Window |
| Data Tampering | Manipulation von Records | Hash Chain, Audit Logs |
| Credential Theft | Gestohlene Secrets | Secrets Manager, Rotation |

---

# 7. Integration Architecture

## 7.1 Stripe Integration

### 7.1.1 Integration-Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Stripe Integration Flow                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Customer       Stripe.js      Stripe       CargoBit                    │
│     │              │             │              │                        │
│     │  1. Payment  │             │              │                        │
│     ├─────────────►│             │              │                        │
│     │              │  2. Token   │              │                        │
│     │              ├────────────►│              │                        │
│     │              │             │  3. Charge   │                        │
│     │              │             ├─────────────►│                        │
│     │              │             │              │                        │
│     │              │             │  4. Webhook  │                        │
│     │              │             ├─────────────►│                        │
│     │              │             │              │ 5. Process             │
│     │              │             │              ├───────┐                │
│     │              │             │              │       │                │
│     │              │             │              │◄──────┘                │
│     │              │             │  6. Confirm  │                        │
│     │              │             │◄─────────────┤                        │
│     │  7. Success  │             │              │                        │
│     │◄─────────────┤             │              │                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.1.2 PCI-DSS-Compliance

Die Integration ist für PCI-DSS SAQ-A konzipiert. Cardholder Data wird niemals auf CargoBit-Systemen gespeichert. Die gesamte Zahlungsabwicklung erfolgt über Stripe. Die Webhooks enthalten nur Tokens und keine Kartendaten. Dies minimiert das PCI-DSS-Scope erheblich.

---

# 8. Operations Architecture

## 8.1 Backup-Architecture

### 8.1.1 Backup-Strategie

| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| Full | Täglich | 30 Tage | Encrypted S3 |
| Incremental | Stündlich | 7 Tage | Encrypted S3 |
| WAL Archive | Kontinuierlich | 7 Tage | Encrypted S3 |

### 8.1.2 Backup-Prozess

```bash
#!/bin/bash
# backup-db.sh - Database Backup

set -euo pipefail

BACKUP_DIR="/var/backups/postgresql"
S3_BUCKET="s3://cargobit-backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/cargobit_${TIMESTAMP}.sql.gz.enc"

# Create backup
pg_dump -U cargobit_backup -d cargobit_prod \
  --format=plain --no-owner --no-acl | \
  gzip | \
  openssl enc -aes-256-gcm -salt -pbkdf2 \
    -pass env:BACKUP_ENCRYPTION_KEY > "${BACKUP_FILE}"

# Verify
[[ -s "${BACKUP_FILE}" ]] || { echo "ERROR: Empty backup"; exit 1; }

# Upload
aws s3 cp "${BACKUP_FILE}" "${S3_BUCKET}/" \
  --sse aws:kms \
  --sse-kms-key-id "${KMS_KEY_ID}"

# Cleanup
find "${BACKUP_DIR}" -name "*.sql.gz.enc" -mtime +3 -delete

echo "Backup completed: ${BACKUP_FILE}"
```

## 8.2 Restore-Architecture

Der Restore-Prozess ist für Disaster Recovery optimiert. Das Restore-Skript ist einfach und robust. Es unterstützt verschiedene Wiederherstellungspunkte. Der Prozess wird monatlich getestet und dokumentiert.

---

# 9. Pipeline Architecture

## 9.1 Pipeline-Schritte

### 9.1.1 Run-Step

Der Run-Step initialisiert und führt das Multi-Agent System aus. Er lädt die Konfiguration, initialisiert den Orchestrator, führt alle Agenten aus und sammelt die generierten Dateien.

### 9.1.2 Validate-Step

Der Validate-Step prüft den Output gegen Qualitätskriterien. Er überprüft die Verzeichnisstruktur, prüft auf verbotene Patterns, validiert JSON-Dateien und gewährleistet Determinismus.

### 9.1.3 Assemble-Step

Der Assemble-Step erstellt die Metadaten-Dateien. Er generiert manifest.json mit allen Dateinamen, erstellt checksums.json mit SHA-256-Hashes und organisiert die Struktur.

### 9.1.4 Publish-Step

Der Publish-Step publiziert die Ergebnisse. Er prüft auf Änderungen, erstellt einen Commit mit automatischer Nachricht und pusht zum Ziel-Branch.

---

# 10. Determinism Architecture

## 10.1 Determinismus-Regeln

| Regel | Beschreibung | Implementierung |
|-------|--------------|-----------------|
| Keine Zeitstempel | Keine variablen Zeitangaben | Konstante Werte |
| Keine Zufallswerte | Keine Random-Funktionen | Deterministische IDs |
| Alphabetische Sortierung | Konsistente Reihenfolgen | Sorted Arrays |
| JSON-Sortierung | Konsistente Schlüsselreihenfolge | sortKeys Option |
| Checksums nachträglich | Nicht im deterministischen Teil | Post-Build |

## 10.2 Validierung

Die Determinismus-Validierung erfolgt durch Vergleich. Zwei aufeinanderfolgende Builds werden verglichen. Bei Unterschieden wird ein Fehler geworfen. Dies gewährleistet Reproduzierbarkeit.

---

# 11. Compliance Architecture

## 11.1 Compliance-Framework

| Standard | Anforderung | Implementierung |
|----------|-------------|-----------------|
| PCI-DSS SAQ-A | Keine Kartendaten | Stripe-Only |
| GDPR | Data Minimization | Schema-Design |
| GDPR | Retention | Policies |
| SOC 2 | Security Controls | Dokumentation |
| SOC 2 | Change Management | Pipeline |

## 11.2 Dokumentations-Architektur

Die Compliance-Dokumentation ist in Schichten organisiert. Die Security Policy definiert Sicherheitsanforderungen. Die Compliance Matrix zeigt die Einhaltung von Standards. Die Incident Playbooks beschreiben Notfallprozesse. Das On-Call Runbook definiert Bereitschaftsdienste.

---

# 12. Design Decisions

## 12.1 Why Multi-Agent?

Die Multi-Agent-Architektur wurde aus mehreren Gründen gewählt. Modularität ermöglicht unabhängige Entwicklung und Wartung. Erweiterbarkeit erlaubt das Hinzufügen neuer Agenten ohne Änderungen an bestehenden. Determinismus wird durch explizite Übergaben gewährleistet. Testbarkeit wird durch isolierte Agenten verbessert. Parallelisierung ist als zukünftige Optimierung möglich.

## 12.2 Why Deterministic?

Determinismus ist essenziell für Enterprise-Systeme. Reproducibility ermöglicht Build-Vergleiche. Auditability erfüllt Compliance-Anforderungen. CI Stability verhindert flaky Builds. Trust schafft Vertrauen in den generierten Code.

## 12.3 Why Prisma?

Prisma wurde als ORM aus mehreren Gründen gewählt. Strong Typing bietet TypeScript-Integration. Migration Safety gewährleistet sichere Schema-Änderungen. Developer Productivity erhöht die Entwicklungsgeschwindigkeit. Query Building bietet eine intuitive API.

---

# 13. Alternatives Considered

## 13.1 ORM Alternatives

| Option | Advantage | Disadvantage | Decision |
|--------|-----------|--------------|----------|
| TypeORM | Reife | Non-deterministic migrations | Rejected |
| Sequelize | Verbreitung | Weak typing | Rejected |
| Knex | Flexibilität | Too low-level | Rejected |
| Prisma | Typing, Migrations | Vendor lock-in | **Selected** |

## 13.2 Webhook Alternatives

| Option | Advantage | Disadvantage | Decision |
|--------|-----------|--------------|----------|
| Polling | Einfach | Latency, Cost | Rejected |
| EventBridge | Serverless | Cloud lock-in | Rejected |
| Webhooks | Real-time | Complexity | **Selected** |

---

# 14. Technical Debt

## 14.1 Bekannte Schulden

| Area | Debt | Impact | Priority |
|------|------|--------|----------|
| Testing | E2E Tests fehlen | Medium | P1 |
| Monitoring | Alerts unvollständig | Medium | P2 |
| Documentation | API Docs fehlen | Low | P3 |

## 14.2 Abbau-Plan

Technical Debt wird systematisch abgebaut. Pro Sprint wird ein Debt-Item adressiert. Neue Features werden ohne zusätzliche Schulden entwickelt. Documentation-First bei neuen Komponenten.

---

# 15. Future Architecture

## 15.1 Kurzfristig (Q1 2025)

- Multi-Currency Wallets
- Erweiterte Monitoring-Integration
- Performance-Optimierung

## 15.2 Mittelfristig (Q2-Q3 2025)

- Reconciliation Engine
- Admin Dashboard
- Multi-Region Backups

## 15.3 Langfristig (Q4 2025+)

- Additional Payment Providers
- Advanced Analytics
- ML-based Fraud Detection

---

# 16. Glossary

| Term | Definition |
|------|------------|
| MAS | Multi-Agent System - Architektur mit spezialisierten Agenten |
| PITR | Point-in-Time Recovery - Wiederherstellung zu einem bestimmten Zeitpunkt |
| RBAC | Role-Based Access Control - Berechtigungskonzept |
| SLA | Service Level Agreement - Vereinbarung über Servicequalität |
| Token Bucket | Algorithmus für Rate Limiting |
| Hash Chain | Kryptografische Verkettung für Integrität |

---

**End of Architecture Deep Dive**
