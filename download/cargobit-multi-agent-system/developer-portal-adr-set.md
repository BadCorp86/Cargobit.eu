# Developer-Portal ADR-Set

## Architecture Decision Records

Dieses Dokument enthält die wichtigsten Architekturentscheidungen für das CargoBit Developer-Portal.

---

## ADR-Format

Alle Architecture Decision Records folgen diesem Format:

```markdown
# ADR-XXX: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[Beschreibung des Kontextes und des Problems]

## Decision
[Die getroffene Entscheidung]

## Consequences
[Die Konsequenzen der Entscheidung]

## Alternatives Considered
[Andere in Betracht gezogene Optionen]

## Notes
[Zusätzliche Informationen, Links, etc.]
```

---

## ADR-001: Static Site Generation (SSG)

### Status
**Accepted** (2024-01-15)

### Context

Die Dokumentation des CargoBit Developer-Portals muss:
- **Global verfügbar** sein (weltweite Partner)
- **Extrem schnell** laden (Developer Experience)
- **Hoch verfügbar** sein (99.9%+ Uptime)
- **Kosteneffizient** betrieben werden
- **Einfach zu warten** sein

Traditionelle server-side rendered (SSR) Ansätze haben mehrere Nachteile:
- Höhere Latenz durch Server-Verarbeitung
- Abhängigkeit von Server-Verfügbarkeit
- Höhere Betriebskosten
- Komplexere Skalierung

### Decision

**Das Portal wird mit Next.js Static Site Generation (SSG) gebaut.**

Alle Dokumentationsseiten werden zur Build-Zeit als statische HTML-Dateien generiert und über ein globales CDN ausgeliefert.

```yaml
architecture:
  framework: "Next.js 14"
  rendering: "Static Site Generation (SSG)"
  incremental: "ISR für dynamische Inhalte"
  deployment: "Vercel Edge Network"
  cdn: "Cloudflare (zusätzlich)"
```

### Consequences

**Positiv:**
- ⚡ **Sub-100ms Ladezeiten** durch CDN-Edge-Caching
- 🔄 **99.99% Verfügbarkeit** ohne Server-Abhängigkeit
- 💰 **Geringe Betriebskosten** (keine Server für Docs nötig)
- 🌍 **Globale Performance** durch Edge-Caching
- 🔒 **Sicherer** (keine Server-Schwachstellen für Docs)
- 📦 **Einfache Rollbacks** durch Versionskontrolle

**Negativ:**
- Build-Zeit steigt mit Content-Menge
- Keine echte Personalisierung ohne Client-Side JavaScript
- Content-Updates erfordern neuen Build (oder ISR)
- Tools können nicht vollständig statisch sein

### Alternatives Considered

| Option | Bewertung | Grund für Ablehnung |
|--------|-----------|---------------------|
| Server-Side Rendering | ⭐⭐⭐ | Höhere Latenz, Server-Abhängigkeit |
| Client-Side Rendering | ⭐⭐ | Schlechte SEO, langsame Initial-Ladung |
| Hybrid (SSR + CSR) | ⭐⭐⭐⭐ | Komplexer, nicht notwendig für Docs |
| Static Site Generation | ⭐⭐⭐⭐⭐ | **Gewählt** |

### Notes
- [Next.js SSG Documentation](https://nextjs.org/docs/basic-features/pages#static-generation)
- Incremental Static Regeneration (ISR) für Changelog und Blog

---

## ADR-002: Tools Backend als Serverless Functions

### Status
**Accepted** (2024-01-20)

### Context

Die Portal-Tools (API Explorer, Webhook Simulator, Event Replay) benötigen:
- **Server-Side Logik** für Sandbox-Requests
- **State Management** für Webhook-Simulation
- **Datenbank-Zugriff** für Event-Speicherung
- **Sichere Authentifizierung**
- **Skalierbarkeit** bei variabler Last

Die Dokumentation (ADR-001) ist statisch, aber Tools benötigen dynamische Backend-Funktionalität.

### Decision

**Tools werden als Serverless Functions (Vercel Edge Functions / AWS Lambda) implementiert.**

```yaml
architecture:
  platform: "Vercel Edge Functions"
  fallback: "AWS Lambda"
  runtime: "Node.js 20"
  database: "PostgreSQL (Supabase)"
  cache: "Redis (Upstash)"
  
services:
  api_explorer:
    type: "Edge Function"
    memory: "128MB"
    timeout: "30s"
    
  webhook_simulator:
    type: "Edge Function"
    memory: "256MB"
    timeout: "60s"
    
  event_replay:
    type: "Background Worker"
    memory: "512MB"
    timeout: "300s"
```

### Consequences

**Positiv:**
- 🚀 **Automatische Skalierung** von 0 zu tausenden Requests
- 💰 **Pay-per-use** Kostenstruktur
- 🔧 **Einfache Deployment** zusammen mit Frontend
- 🌍 **Edge-Ausführung** für geringe Latenz
- 🔒 **Isolierte Ausführung** für Sicherheit

**Negativ:**
- Cold Start Latenz (bei Inaktivität)
- Einschränkungen bei langlaufenden Prozessen
- Vendor Lock-in bei Vercel-spezifischen Features
- Debugging komplexer als bei traditionellen Servern

### Alternatives Considered

| Option | Bewertung | Grund für Ablehnung |
|--------|-----------|---------------------|
| Monolithischer Server | ⭐⭐ | Überprovisioniert, komplex zu skalieren |
| Kubernetes | ⭐⭐⭐ | Zu komplex für aktuellen Bedarf |
| Container (Docker) | ⭐⭐⭐ | Mehr Wartungsaufwand |
| Serverless Functions | ⭐⭐⭐⭐⭐ | **Gewählt** |

### Notes
- Cold Starts minimieren durch regelmäßige "Warmer" Requests
- Vorbereitung für Multi-Cloud mit AWS Lambda Fallback

---

## ADR-003: Pre-Indexed Search Engine

### Status
**Accepted** (2024-01-25)

### Context

Die Suche im Developer-Portal muss:
- **Instant Results** liefern (< 100ms)
- **Typo-Toleranz** haben
- **Facettenreiche Filterung** ermöglichen
- **Globale Verfügbarkeit** gewährleisten
- **Kosteneffizient** sein

Die Dokumentation ist statisch, aber Suche erfordert typischerweise Backend-Logik.

### Decision

**Suche wird mit Algolia als pre-indexed Search-as-a-Service implementiert.**

Der Suchindex wird zur Build-Zeit generiert und bei Content-Änderungen aktualisiert.

```yaml
architecture:
  provider: "Algolia"
  indexing: "Build-time + Webhook updates"
  fallback: "Client-side Lunr.js"
  
configuration:
  search_api_key: "Public, search-only"
  index_name: "developer-portal"
  
features:
  typo_tolerance: true
  synonyms: true
  faceting: true
  highlighting: true
  
index_schema:
  objectID: "string"
  title: "string"
  description: "string"
  content: "string"
  url: "string"
  hierarchy: "object"
  tags: "array"
  type: "string"
```

### Consequences

**Positiv:**
- ⚡ **Sub-50ms Suchanfragen**
- 🔤 **Ausgezeichnete Typo-Korrektur**
- 🔍 **Relevante Ergebnisse** durch ML-Ranking
- 🌍 **Globale Edge-Verteilung**
- 🔧 **DocSearch UI** verfügbar

**Negativ:**
- Kosten pro Suchanfrage
- Vendor Lock-in
- Externe Abhängigkeit

### Alternatives Considered

| Option | Bewertung | Grund für Ablehnung |
|--------|-----------|---------------------|
| Elasticsearch | ⭐⭐⭐ | Komplex zu betreiben, überprovisioniert |
| MeiliSearch | ⭐⭐⭐ | Selbst gehostet, mehr Wartung |
| Client-side Lunr.js | ⭐⭐ | Keine Typo-Toleranz, Index-Größe |
| Algolia | ⭐⭐⭐⭐⭐ | **Gewählt** |

### Notes
- Fallback auf Client-side Suche bei Algolia-Ausfall
- DocSearch (kostenlos für Open Source) geprüft

---

## ADR-004: No PII in Portal Logs

### Status
**Accepted** (2024-02-01)

### Context

Das Portal muss:
- **DSGVO-konform** sein
- **Sicher** sein (keine Datenlecks durch Logs)
- **Audit-fähig** sein
- **Compliance** mit SOC 2 und ISO 27001 gewährleisten

Traditionelles Logging kann sensible Daten enthalten:
- IP-Adressen
- E-Mail-Adressen
- API Keys
- Session-Token
- Persönliche Daten

### Decision

**Keine personenbezogenen Daten (PII) werden in Portal-Logs gespeichert.**

```yaml
logging_policy:
  no_pii: true
  anonymization: "Automatic"
  
logged_data:
  - timestamp: "ISO 8601"
  - correlation_id: "UUID"
  - event_type: "string"
  - user_id: "Hashed ID"  # Nicht die echte ID
  - action: "string"
  - result: "string"
  - metadata: "Sanitized object"
  
not_logged:
  - ip_address: "Never logged"
  - email: "Never logged"
  - api_keys: "Never logged"
  - session_tokens: "Never logged"
  - request_bodies: "Sanitized only"
```

### Consequences

**Positiv:**
- 🔒 **DSGVO-konform** by Design
- 📋 **Audit-fähig** ohne Datenschutzrisiken
- 🛡️ **Keine Datenlecks** durch Logs
- 💰 **Einfachere Compliance**
- 🧹 **Keine Löschpflichten** für Logs

**Negativ:**
- Eingeschränkte Debugging-Möglichkeiten
- Zusätzlicher Aufwand bei der Implementierung
- PII muss für Support anderweitig erfasst werden

### Alternatives Considered

| Option | Bewertung | Grund für Ablehnung |
|--------|-----------|---------------------|
| Full Logging | ⭐ | Datenschutzrisiko, nicht DSGVO-konform |
| Anonymized Logging | ⭐⭐⭐ | Komplex, Fehleranfällig |
| No PII Logging | ⭐⭐⭐⭐⭐ | **Gewählt** |
| Encrypted Logging | ⭐⭐⭐ | Komplex, Key-Management |

### Notes
- Debugging mit Correlation IDs und User-Hashes
- Support-Tickets mit expliziter Zustimmung für PII

---

## ADR-005: Determinism Checker Integration

### Status
**Accepted** (2024-02-10)

### Context

CargoBit ist eine **deterministische Zahlungsplattform**:
- Gleiche Inputs → Gleiche Outputs
- Vorhersagbare Ergebnisse
- Wichtige Eigenschaft für Partner

Partner müssen verstehen und testen können, wie Determinismus funktioniert. Das Developer-Portal sollte diese Eigenschaft demonstrieren und erklären.

### Decision

**Das Portal enthält einen integrierten Determinism Checker als Tool.**

```yaml
determinism_checker:
  type: "Interactive Tool"
  location: "/tools/determinism-checker"
  
features:
  - name: "Request Comparison"
    description: "Vergleiche identische Requests mit gleicher Seed"
    
  - name: "Seed Visualization"
    description: "Zeige wie Seeds Outputs determinieren"
    
  - name: "Anomaly Detection"
    description: "Erkenne nicht-deterministische Responses"
    
implementation:
  ui: "React Component"
  backend: "Edge Function"
  sandbox: "CargoBit Sandbox API"
```

### Consequences

**Positiv:**
- 🎯 **Demonstriert Kern-Feature** von CargoBit
- 📚 **Educational Tool** für Partner
- 🔧 **Debugging-Hilfe** bei Integration
- 💡 **Einzigartiges Feature** vs. Wettbewerber

**Negativ:**
- Zusätzliche Entwicklungs- und Wartungskosten
- Erfordert Sandbox-API-Integration
- Komplexität im UI

### Alternatives Considered

| Option | Bewertung | Grund für Ablehnung |
|--------|-----------|---------------------|
| Dokumentation nur | ⭐⭐ | Nicht interaktiv |
| Externes Tool | ⭐⭐⭐ | Weniger integriert |
| Integrierter Checker | ⭐⭐⭐⭐⭐ | **Gewählt** |

### Notes
- ML-basierte Anomalie-Erkennung für nicht-deterministische Responses
- Integration mit API Explorer für nahtlose UX

---

## ADR-006: Multi-Language Support (i18n)

### Status
**Accepted** (2024-02-15)

### Context

CargoBit Partner sind weltweit verteilt:
- Europa (Deutschland, Frankreich, UK)
- Nordamerika (USA, Kanada)
- Asien (Singapur, Japan)
- Lateinamerika (Brasilien)

Für optimale Developer Experience sollte die Dokumentation in mehreren Sprachen verfügbar sein.

### Decision

**Das Portal unterstützt mehrere Sprachen mit next-intl.**

```yaml
i18n_config:
  library: "next-intl"
  strategy: "Subdirectory routing"
  
languages:
  - code: "en"
    name: "English"
    default: true
    
  - code: "de"
    name: "Deutsch"
    
  - code: "fr"
    name: "Français"
    
routing:
  default: "/docs/getting-started"  # English
  localized: "/de/docs/getting-started"
  
translation_workflow:
  tool: "Crowdin"
  format: "JSON"
  sync: "GitHub Integration"
```

### Consequences

**Positiv:**
- 🌍 **Bessere Developer Experience** weltweit
- 📈 **Höhere Partner-Akzeptanz** in lokalen Märkten
- 🔍 **SEO-Vorteile** durch lokalisierte Inhalte

**Negativ:**
- Übersetzungskosten
- Content-Sync-Aufwand
- Build-Zeit steigt

### Alternatives Considered

| Option | Bewertung | Grund für Ablehnung |
|--------|-----------|---------------------|
| Englisch nur | ⭐⭐ | Begrenzte Reichweite |
| Maschinelle Übersetzung | ⭐⭐ | Qualität unzureichend |
| Professionelle Übersetzung | ⭐⭐⭐⭐⭐ | **Gewählt** |

### Notes
- Start mit EN + DE, dann FR
- API-Reference bleibt auf Englisch (Branchenstandard)

---

## ADR-007: Authentication with NextAuth.js

### Status
**Accepted** (2024-02-20)

### Context

Partner müssen sich authentifizieren für:
- Gespeicherte API Explorer Konfigurationen
- Webhook Simulator Einstellungen
- Event Replay Zugriff
- Persönliche Dashboard-Daten

Anforderungen:
- Sichere Authentifizierung
- OAuth2-Integration (GitHub, Google)
- API Key Management
- Session Management

### Decision

**NextAuth.js (Auth.js) wird für die Authentifizierung verwendet.**

```yaml
auth_config:
  library: "NextAuth.js v5"
  strategy: "JWT + Database Sessions"
  
providers:
  - name: "GitHub"
    type: "OAuth"
    
  - name: "Google"
    type: "OAuth"
    
  - name: "Email Magic Link"
    type: "Email"
    
  - name: "Credentials"
    type: "Credentials"
    
session:
  strategy: "JWT"
  max_age: "7d"
  
jwt:
  algorithm: "RS256"
  access_token_expiry: "15m"
  refresh_token_expiry: "7d"
  
database:
  adapter: "Prisma"
  provider: "PostgreSQL"
```

### Consequences

**Positiv:**
- 🔐 **Bewährte Lösung** für Next.js
- 🔗 **OAuth-Integration** einfach
- 🔧 **Flexible Konfiguration**
- 📦 **Eingebaute Security-Features**

**Negativ:**
- Vendor Lock-in bei Next.js
- Custom Provider erfordern Anpassung

### Alternatives Considered

| Option | Bewertung | Grund für Ablehnung |
|--------|-----------|---------------------|
| Custom Auth | ⭐ | Sicherheitsrisiko, aufwendig |
| Auth0 | ⭐⭐⭐ | Kosten, Vendor Lock-in |
| Clerk | ⭐⭐⭐⭐ | Gut, aber NextAuth besser integriert |
| NextAuth.js | ⭐⭐⭐⭐⭐ | **Gewählt** |

### Notes
- MFA für Admin-Zugang
- API Keys separat von Session-Auth

---

## ADR-008: Content Management mit Git

### Status
**Accepted** (2024-02-25)

### Context

Dokumentations-Content muss:
- Versioniert sein
- Durch Reviews gehen
- Einfach zu bearbeiten sein
- Audit-Trail haben

Traditionelle CMS haben Nachteile:
- Komplexe Benutzeroberflächen
- Separates Versionierung
- Review-Workflow-Limitierungen

### Decision

**Content wird direkt in Git als MDX-Dateien verwaltet.**

```yaml
content_management:
  format: "MDX (Markdown + React)"
  storage: "Git Repository"
  
structure:
  docs/
    getting-started/
      index.mdx
      quick-start.mdx
    api-reference/
      payments.mdx
      webhooks.mdx
      
workflow:
  editing: "GitHub UI oder lokaler Editor"
  review: "Pull Request Process"
  approval: "Required Reviews: 1"
  deployment: "Automatisch nach Merge"
  
features:
  frontmatter: "YAML Metadaten"
  components: "React Komponenten in MDX"
  i18n: "Parallele Übersetzungsdateien"
```

### Consequences

**Positiv:**
- 📝 **Versionierung** built-in
- 🔍 **Review-Prozess** durch PRs
- 📜 **Audit-Trail** durch Git-History
- 🔧 **Entwickler-freundlich**
- 💰 **Kein CMS-Kosten**

**Negativ:**
- Technische Barriere für Nicht-Entwickler
- Kein WYSIWYG-Editor
- Build-Zeit bei Content-Änderungen

### Alternatives Considered

| Option | Bewertung | Grund für Ablehnung |
|--------|-----------|---------------------|
| Contentful | ⭐⭐⭐ | Kosten, externe Abhängigkeit |
| Strapi | ⭐⭐⭐ | Selbst gehostet, Wartung |
| Git-based | ⭐⭐⭐⭐⭐ | **Gewählt** |

### Notes
- Zukunft: Optionaler WYSIWYG-Editor für nicht-technische Redakteure
- Content-Review-Workflow im Governance-Framework dokumentiert

---

## ADR-009: Observability Stack

### Status
**Accepted** (2024-03-01)

### Context

Für Enterprise-Betrieb benötigt das Portal:
- Zentralisiertes Logging
- Metrics und Monitoring
- Distributed Tracing
- Alerting
- Performance Monitoring

### Decision

**Datadog als primäre Observability-Plattform mit Sentry für Error-Tracking.**

```yaml
observability_stack:
  logging:
    provider: "Datadog Logs"
    retention: "30 days"
    volume: "~10GB/month"
    
  metrics:
    provider: "Datadog Metrics"
    custom_metrics: true
    
  tracing:
    provider: "Datadog APM"
    sampling_rate: "10%"
    
  errors:
    provider: "Sentry"
    retention: "90 days"
    
  rum:
    provider: "SpeedCurve"
    metrics: ["LCP", "FID", "CLS"]
    
  alerting:
    provider: "PagerDuty"
    escalation: "Slack → PagerDuty → SMS"
    
  dashboards:
    provider: "Datadog Dashboards"
    
integrations:
  - "GitHub (Deployments)"
  - "Slack (Alerts)"
  - "PagerDuty (Escalation)"
```

### Consequences

**Positiv:**
- 📊 **Unified Platform** für alle Observability
- 🔗 **Integrationen** mit existierenden Tools
- 🔍 **Umfassende Einsicht** in System-Verhalten
- 🚨 **Proaktives Alerting**

**Negativ:**
- Kosten bei Skalierung
- Vendor Lock-in

### Alternatives Considered

| Option | Bewertung | Grund für Ablehnung |
|--------|-----------|---------------------|
| Prometheus + Grafana | ⭐⭐⭐⭐ | Selbst gehostet, mehr Wartung |
| ELK Stack | ⭐⭐⭐ | Komplex, resource-intensiv |
| Datadog | ⭐⭐⭐⭐⭐ | **Gewählt** |

### Notes
- Reserved Budget für Skalierung
- Export-Funktion für Langzeit-Archivierung

---

## ADR-010: Deployment Strategy

### Status
**Accepted** (2024-03-05)

### Context

Deployment muss:
- Schnell und sicher sein
- Rollbacks ermöglichen
- Zero-Downtime haben
- Automatisiert sein
- Mehrere Umgebungen unterstützen

### Decision

**Vercel mit GitHub Actions CI/CD Pipeline und Preview-Deployments.**

```yaml
deployment_strategy:
  platform: "Vercel"
  
environments:
  preview:
    trigger: "Pull Request"
    url: "pr-{number}-developer-portal.vercel.app"
    
  staging:
    trigger: "Merge to develop"
    url: "staging.developer.cargobit.io"
    
  production:
    trigger: "Merge to main"
    url: "developer.cargobit.io"
    
ci_cd:
  provider: "GitHub Actions"
  
  pipeline:
    - stage: "Lint & Type Check"
      duration: "2 min"
      
    - stage: "Unit Tests"
      duration: "5 min"
      
    - stage: "Integration Tests"
      duration: "10 min"
      
    - stage: "Build"
      duration: "5 min"
      
    - stage: "Lighthouse CI"
      duration: "3 min"
      
    - stage: "Deploy"
      duration: "2 min"
      
  quality_gates:
    - "All tests pass"
    - "Lighthouse score > 90"
    - "No security vulnerabilities"
    
rollback:
  method: "Vercel Instant Rollback"
  duration: "< 1 min"
```

### Consequences

**Positiv:**
- ⚡ **Schnelle Deployments** (< 30 min)
- 🔒 **Automatische Quality Gates**
- 👀 **Preview Deployments** für Reviews
- 🔄 **Instant Rollbacks**
- 📊 **Deployment-History**

**Negativ:**
- Vendor Lock-in bei Vercel
- Build-Minuten-Begrenzung

### Alternatives Considered

| Option | Bewertung | Grund für Ablehnung |
|--------|-----------|---------------------|
| AWS Amplify | ⭐⭐⭐ | Weniger Features als Vercel |
| Self-hosted | ⭐⭐ | Mehr Wartung |
| Vercel | ⭐⭐⭐⭐⭐ | **Gewählt** |

### Notes
- Multi-Region-Deployment für Disaster Recovery vorbereitet

---

## ADR-Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| ADR-001 | Static Site Generation | Accepted | 2024-01-15 |
| ADR-002 | Tools Backend Serverless | Accepted | 2024-01-20 |
| ADR-003 | Pre-Indexed Search | Accepted | 2024-01-25 |
| ADR-004 | No PII in Logs | Accepted | 2024-02-01 |
| ADR-005 | Determinism Checker | Accepted | 2024-02-10 |
| ADR-006 | Multi-Language Support | Accepted | 2024-02-15 |
| ADR-007 | NextAuth.js Authentication | Accepted | 2024-02-20 |
| ADR-008 | Git-based Content | Accepted | 2024-02-25 |
| ADR-009 | Observability Stack | Accepted | 2024-03-01 |
| ADR-010 | Deployment Strategy | Accepted | 2024-03-05 |

---

*Diese ADRs werden bei neuen Architekturentscheidungen erweitert. Letzte Aktualisierung: Januar 2025.*
