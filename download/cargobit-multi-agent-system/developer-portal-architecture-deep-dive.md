# Developer-Portal Architecture Deep Dive

## Das vollständige Systemdesign des Portals

Dieses Dokument beschreibt die detaillierte Architektur, Komponenten und Design-Entscheidungen des CargoBit Developer-Portals.

---

## 1. High-Level Architektur

### 1.1 Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Browser   │  │   Mobile    │  │   API       │  │   Search            │ │
│  │   (Users)   │  │   App       │  │   Clients   │  │   Crawlers          │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
└─────────┼────────────────┼────────────────┼────────────────────┼───────────┘
          │                │                │                    │
          └────────────────┴────────────────┴────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EDGE LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         CDN (Cloudflare)                                 ││
│  │  ┌─────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐││
│  │  │ Cache   │  │ WAF         │  │ DDoS        │  │ Edge Workers        │││
│  │  │ (Edge)  │  │ Protection  │  │ Protection  │  │ (A/B, Redirects)    │││
│  │  └─────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HOSTING LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    Static Site Hosting (Vercel)                          ││
│  │  ┌──────────────────────┐  ┌──────────────────────┐                     ││
│  │  │ Static Files (SSG)   │  │ Edge Functions       │                     ││
│  │  │ - HTML/CSS/JS        │  │ - API Routes         │                     ││
│  │  │ - Images/Assets      │  │ - ISR Handlers       │                     ││
│  │  └──────────────────────┘  └──────────────────────┘                     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION LAYER                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         Tools Backend (API)                              ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐││
│  │  │ API Explorer│  │ Webhook     │  │ Event       │  │ Schema         │││
│  │  │ Proxy       │  │ Simulator   │  │ Replay      │  │ Service        │││
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ PostgreSQL  │  │ Redis       │  │ Algolia     │  │ Object Storage      │ │
│  │ (State)     │  │ (Cache)     │  │ (Search)    │  │ (S3 - Assets)       │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OBSERVABILITY LAYER                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Datadog     │  │ Sentry      │  │ SpeedCurve  │  │ PagerDuty           │ │
│  │ (Metrics)   │  │ (Errors)    │  │ (RUM)       │  │ (Alerting)          │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technologie-Stack

```yaml
technology_stack:
  frontend:
    framework: "Next.js 14 (App Router)"
    language: "TypeScript 5.x"
    styling: "Tailwind CSS 4.x"
    components: "shadcn/ui"
    markdown: "MDX + Contentlayer"
    code_highlighting: "Shiki"
    
  hosting:
    platform: "Vercel"
    rendering: "Static Site Generation (SSG) + ISR"
    edge: "Vercel Edge Functions"
    
  cdn:
    provider: "Cloudflare"
    features:
      - "Global CDN"
      - "WAF"
      - "DDoS Protection"
      - "Edge Caching"
      
  backend:
    runtime: "Node.js 20 LTS"
    framework: "Next.js API Routes"
    database: "PostgreSQL 15"
    cache: "Redis 7"
    search: "Algolia"
    
  observability:
    metrics: "Datadog"
    errors: "Sentry"
    rum: "SpeedCurve"
    logs: "Datadog Logs"
    alerting: "PagerDuty"
    
  ci_cd:
    version_control: "GitHub"
    ci: "GitHub Actions"
    deployment: "Vercel"
    
  security:
    authentication: "NextAuth.js"
    csrf: "Built-in Next.js"
    csp: "Strict CSP"
    secrets: "Vercel Environment Variables + Vault"
```

---

## 2. Komponenten-Detail

### 2.1 Frontend Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS APPLICATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    App Router                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ app/        │  │ app/docs/   │  │ app/tools/          ││  │
│  │  │ (home)      │  │ (docs)      │  │ (tools)             ││  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Components                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ UI          │  │ Layout      │  │ Feature             ││  │
│  │  │ (shadcn)    │  │ (Navigation)│  │ (API Explorer)      ││  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Content Layer                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ MDX Docs    │  │ OpenAPI     │  │ Translations        ││  │
│  │  │ (Contentlayer)│ (Specs)      │  │ (next-intl)         ││  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    State Management                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ React       │  │ URL State   │  │ Server State        ││  │
│  │  │ Context     │  │ (nuqs)      │  │ (React Query)       ││  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Frontend-Komponenten:**

| Komponente | Technologie | Zweck |
|------------|-------------|-------|
| Page Router | Next.js App Router | Routing, SSR/SSG |
| UI Library | shadcn/ui + Radix | Accessible Komponenten |
| Styling | Tailwind CSS | Utility-First Styling |
| Markdown | MDX + Contentlayer | Dokumentations-Inhalte |
| Code Highlighting | Shiki | Syntax-Highlighting |
| Search UI | DocSearch | Search Interface |
| Charts | Recharts | Datenvisualisierung |

**Rendering Strategien:**

```yaml
rendering_strategies:
  static_generation:
    use_case: "Documentation pages, API reference"
    method: "SSG at build time"
    revalidation: "ISR every 1 hour"
    
  server_side_rendering:
    use_case: "Dynamic tools, user-specific content"
    method: "SSR on request"
    
  incremental_static_regeneration:
    use_case: "Changelog, blog posts"
    method: "ISR with on-demand revalidation"
    
  client_side_rendering:
    use_case: "Interactive tools, search"
    method: "React hydration"
```

### 2.2 Tools Backend Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      TOOLS BACKEND                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    API Gateway                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ Rate        │  │ Auth        │  │ Request             ││  │
│  │  │ Limiting    │  │ Middleware  │  │ Validation          ││  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Tool Services                            │  │
│  │                                                              │  │
│  │  ┌─────────────────┐      ┌─────────────────────────────┐  │  │
│  │  │ API Explorer    │      │ Webhook Simulator           │  │  │
│  │  │ ┌─────────────┐ │      │ ┌─────────────────────────┐ │  │  │
│  │  │ │ Request     │ │      │ │ Event Generator         │ │  │  │
│  │  │ │ Builder     │ │      │ └─────────────────────────┘ │  │  │
│  │  │ └─────────────┘ │      │ ┌─────────────────────────┐ │  │  │
│  │  │ ┌─────────────┐ │      │ │ Delivery Engine         │ │  │  │
│  │  │ │ Sandbox     │ │      │ └─────────────────────────┘ │  │  │
│  │  │ │ Proxy       │ │      │ ┌─────────────────────────┐ │  │  │
│  │  │ └─────────────┘ │      │ │ Signature Service       │ │  │  │
│  │  └─────────────────┘      │ └─────────────────────────┘ │  │  │
│  │                           └─────────────────────────────┘  │  │
│  │  ┌─────────────────┐      ┌─────────────────────────────┐  │  │
│  │  │ Event Replay    │      │ Schema Service              │  │  │
│  │  │ ┌─────────────┐ │      │ ┌─────────────────────────┐ │  │  │
│  │  │ │ Event Store │ │      │ │ Schema Registry         │ │  │  │
│  │  │ └─────────────┘ │      │ └─────────────────────────┘ │  │  │
│  │  │ ┌─────────────┐ │      │ ┌─────────────────────────┐ │  │  │
│  │  │ │ Replay      │ │      │ │ Validator               │ │  │  │
│  │  │ │ Engine      │ │      │ └─────────────────────────┘ │  │  │
│  │  │ └─────────────┘ │      └─────────────────────────────┘  │  │
│  │  └─────────────────┘                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    External Integrations                    │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ Sandbox API │  │ Payment     │  │ Webhook             ││  │
│  │  │ (CargoBit)  │  │ Gateway     │  │ Endpoints           ││  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**API Explorer Proxy Flow:**

```yaml
api_explorer_flow:
  steps:
    1. User builds request in UI
    2. Request sent to API Gateway
    3. Rate limit check
    4. Auth validation
    5. Request transformation
    6. Forward to Sandbox API
    7. Response transformation
    8. Return to user
    
  security:
    - No production credentials
    - Sandbox-only execution
    - Input sanitization
    - Response filtering
```

### 2.3 Search Engine Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SEARCH ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Indexing Pipeline                        │  │
│  │                                                              │  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │  │
│  │  │ Content     │───▶│ Transform   │───▶│ Algolia        │ │  │
│  │  │ Sources     │    │ Pipeline    │    │ Index          │ │  │
│  │  │ (MDX, API)  │    │             │    │                 │ │  │
│  │  └─────────────┘    └─────────────┘    └─────────────────┘ │  │
│  │                                                │            │  │
│  │                                                ▼            │  │
│  │                                        ┌─────────────────┐ │  │
│  │                                        │ Synonyms        │ │  │
│  │                                        │ Dictionary      │ │  │
│  │                                        └─────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Query Pipeline                           │  │
│  │                                                              │  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │  │
│  │  │ User        │───▶│ Query       │───▶│ Algolia        │ │  │
│  │  │ Query       │    │ Processing  │    │ Search API     │ │  │
│  │  └─────────────┘    └─────────────┘    └─────────────────┘ │  │
│  │                            │                   │            │  │
│  │                            ▼                   ▼            │  │
│  │                    ┌─────────────┐    ┌─────────────────┐  │  │
│  │                    │ Typo        │    │ Ranked         │  │  │
│  │                    │ Correction  │    │ Results        │  │  │
│  │                    └─────────────┘    └─────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Fallback Layer                           │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │ Local Lunr.js Index (Pre-built at compile time)     │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Search Index Schema:**

```typescript
interface SearchIndexRecord {
  objectID: string;           // Unique ID
  title: string;              // Page title
  description: string;        // Meta description
  content: string;            // Full content (stripped)
  url: string;                // Page URL
  hierarchy: {                // Breadcrumb hierarchy
    lvl0: string;             // Section
    lvl1: string;             // Subsection
    lvl2: string;             // Page
  };
  tags: string[];             // Content tags
  type: 'doc' | 'api' | 'guide' | 'tool';
  lang: string;               // Language code
  lastUpdated: number;        // Timestamp
}
```

### 2.4 Observability Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Data Collection                          │  │
│  │                                                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ Application │  │ Browser     │  │ Infrastructure      ││  │
│  │  │ Telemetry   │  │ RUM         │  │ Metrics             ││  │
│  │  │             │  │             │  │                     ││  │
│  │  │ - Logs      │  │ - LCP/FID   │  │ - CPU/Memory       ││  │
│  │  │ - Traces    │  │ - CLS       │  │ - Network          ││  │
│  │  │ - Metrics   │  │ - Errors    │  │ - Disk             ││  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘│  │
│  │         │                │                     │           │  │
│  └─────────┼────────────────┼─────────────────────┼───────────┘  │
│            │                │                     │              │
│            ▼                ▼                     ▼              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Data Aggregation                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ Datadog     │  │ Sentry      │  │ SpeedCurve          ││  │
│  │  │ Agent       │  │ SDK         │  │ Agent               ││  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘│  │
│  └─────────┼────────────────┼─────────────────────┼───────────┘  │
│            │                │                     │              │
│            ▼                ▼                     ▼              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Storage & Processing                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ Datadog     │  │ Sentry      │  │ SpeedCurve          ││  │
│  │  │ Platform    │  │ Platform    │  │ Platform            ││  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘│  │
│  └─────────┼────────────────┼─────────────────────┼───────────┘  │
│            │                │                     │              │
│            ▼                ▼                     ▼              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Visualization & Alerting                 │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │ Dashboards  │  │ Error       │  │ Performance         ││  │
│  │  │ (Grafana)   │  │ Tracking    │  │ Reports             ││  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘│  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Alerting (PagerDuty → Slack → SMS)                  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Sequence Diagrams

### 3.1 API Explorer Flow

```
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│  User  │     │ Portal │     │ API    │     │ Auth   │     │ Sandbox│
│        │     │  UI    │     │Gateway │     │Service │     │  API   │
└───┬────┘     └───┬────┘     └───┬────┘     └───┬────┘     └───┬────┘
    │              │              │              │              │
    │ Build Request│              │              │              │
    │─────────────▶│              │              │              │
    │              │              │              │              │
    │              │ POST /api/explorer/execute  │              │
    │              │─────────────▶│              │              │
    │              │              │              │              │
    │              │              │ Validate Auth│              │
    │              │              │─────────────▶│              │
    │              │              │              │              │
    │              │              │ Auth Valid   │              │
    │              │              │◀─────────────│              │
    │              │              │              │              │
    │              │              │ Rate Limit Check            │
    │              │              │──────┐       │              │
    │              │              │◀─────┘       │              │
    │              │              │              │              │
    │              │              │ Transform Request           │
    │              │              │──────┐       │              │
    │              │              │◀─────┘       │              │
    │              │              │              │              │
    │              │              │ Sandbox API Request         │
    │              │              │─────────────────────────────▶
    │              │              │              │              │
    │              │              │              │ Sandbox Response
    │              │              │◀─────────────────────────────
    │              │              │              │              │
    │              │              │ Transform Response          │
    │              │              │──────┐       │              │
    │              │              │◀─────┘       │              │
    │              │              │              │              │
    │              │ Response     │              │              │
    │              │◀─────────────│              │              │
    │              │              │              │              │
    │ Display Result              │              │              │
    │◀─────────────│              │              │              │
    │              │              │              │              │
```

### 3.2 Webhook Simulator Flow

```
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│  User  │     │ Portal │     │Webhook │     │ Event  │     │Partner │
│        │     │  UI    │     │Service │     │Store   │     │Endpoint│
└───┬────┘     └───┬────┘     └───┬────┘     └───┬────┘     └───┬────┘
    │              │              │              │              │
    │ Config Webhook              │              │              │
    │─────────────▶│              │              │              │
    │              │              │              │              │
    │              │ Save Config  │              │              │
    │              │─────────────▶│              │              │
    │              │              │              │              │
    │ Select Event │              │              │              │
    │─────────────▶│              │              │              │
    │              │              │              │              │
    │              │ Generate Event              │              │
    │              │─────────────▶│              │              │
    │              │              │              │              │
    │              │              │ Store Event  │              │
    │              │              │─────────────▶│              │
    │              │              │              │              │
    │              │              │ Sign Payload │              │
    │              │              │──────┐       │              │
    │              │              │◀─────┘       │              │
    │              │              │              │              │
    │              │              │ Deliver Webhook             │
    │              │              │──────────────────────────────▶
    │              │              │              │              │
    │              │              │              │ HTTP Response │
    │              │              │◀──────────────────────────────
    │              │              │              │              │
    │              │              │ Update Delivery Status      │
    │              │              │─────────────▶│              │
    │              │              │              │              │
    │              │ Status Update│              │              │
    │              │◀─────────────│              │              │
    │              │              │              │              │
    │ Show Result  │              │              │              │
    │◀─────────────│              │              │              │
    │              │              │              │              │
```

### 3.3 Search Flow

```
┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
│  User  │     │ Portal │     │ Search │     │Algolia │
│        │     │  UI    │     │Service │     │  API   │
└───┬────┘     └───┬────┘     └───┬────┘     └───┬────┘
    │              │              │              │
    │ Type Query   │              │              │
    │─────────────▶│              │              │
    │              │              │              │
    │              │ Debounce     │              │
    │              │──────┐       │              │
    │              │◀─────┘       │              │
    │              │              │              │
    │              │ Search Query │              │
    │              │─────────────▶│              │
    │              │              │              │
    │              │              │ Search API   │
    │              │              │─────────────▶│
    │              │              │              │
    │              │              │ Results      │
    │              │              │◀─────────────│
    │              │              │              │
    │              │ Ranked Results              │
    │              │◀─────────────│              │
    │              │              │              │
    │ Show Results │              │              │
    │◀─────────────│              │              │
    │              │              │              │
    │ Click Result │              │              │
    │─────────────▶│              │              │
    │              │              │              │
    │              │ Analytics Event             │
    │              │─────────────▶│              │
    │              │              │              │
    │ Navigate to Page           │              │
    │◀─────────────│              │              │
    │              │              │              │
```

---

## 4. Architektur-Qualitäten

### 4.1 Performance

```yaml
performance_strategies:
  frontend:
    static_generation:
      method: "SSG at build time"
      benefit: "Instant page loads, no server computation"
      
    edge_caching:
      method: "CDN edge caching"
      benefit: "Content served from nearest edge location"
      
    code_splitting:
      method: "Next.js automatic code splitting"
      benefit: "Only load code needed for current page"
      
    image_optimization:
      method: "Next.js Image component"
      benefit: "Automatic WebP/AVIF, lazy loading, responsive"
      
  backend:
    connection_pooling:
      method: "PgBouncer for PostgreSQL"
      benefit: "Efficient database connections"
      
    caching:
      method: "Redis for API responses"
      benefit: "Sub-millisecond cache hits"
      
    async_processing:
      method: "Queue-based processing"
      benefit: "Non-blocking operations"
```

**Performance Budget Enforcement:**

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 1.0 }],
        'categories:best-practices': ['error', { minScore: 1.0 }],
        'categories:seo': ['error', { minScore: 1.0 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
      },
    },
  },
};
```

### 4.2 Security

```yaml
security_architecture:
  network_security:
    - WAF (Web Application Firewall)
    - DDoS Protection
    - Rate Limiting
    - IP Reputation Filtering
    
  application_security:
    - Content Security Policy (CSP)
    - Cross-Origin policies (CORS, COOP, COEP)
    - Input validation and sanitization
    - Output encoding
    
  authentication:
    - OAuth 2.0 / OIDC
    - JWT tokens with short expiry
    - Secure session management
    - MFA for admin access
    
  data_security:
    - Encryption at rest (AES-256)
    - Encryption in transit (TLS 1.3)
    - Secrets management (Vault)
    - Data anonymization for tools
```

**Security Headers Configuration:**

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'sha256-xxx' https://cdn.cargobit.io;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' https://fonts.gstatic.com;
      connect-src 'self' https://api.cargobit.io;
      frame-ancestors 'none';
    `.replace(/\n/g, ''),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 4.3 Reliability

```yaml
reliability_architecture:
  redundancy:
    hosting:
      - Multi-region deployment
      - Automatic failover
      
    database:
      - Primary + Read replicas
      - Cross-region replication
      
    cdn:
      - Multiple edge locations
      - Fallback CDN provider
      
  resilience:
    circuit_breaker:
      enabled: true
      threshold: 5 failures
      timeout: 30 seconds
      
    retry:
      max_attempts: 3
      backoff: exponential
      
    graceful_degradation:
      - Static content always available
      - Tools fallback modes
      - Search fallback to local index
      
  health_checks:
    - Endpoint: /health
      Interval: 30s
      
    - Endpoint: /health/ready
      Interval: 10s
      
    - Endpoint: /health/tools
      Interval: 60s
```

### 4.4 Scalability

```yaml
scalability_architecture:
  horizontal_scaling:
    api_layer:
      min_instances: 2
      max_instances: 20
      scaling_metric: CPU > 70%
      
    background_workers:
      min_instances: 1
      max_instances: 10
      scaling_metric: Queue depth
      
  vertical_scaling:
    database:
      start: db.t3.medium
      max: db.r6g.xlarge
      
    cache:
      start: cache.t3.micro
      max: cache.r6g.large
      
  caching_strategy:
    cdn:
      static_assets: 1 year
      html_pages: 1 hour
      
    redis:
      api_responses: 5 minutes
      user_sessions: 15 minutes
      
    browser:
      static_assets: 1 year
      html_pages: no cache (always fresh)
```

### 4.5 Maintainability

```yaml
maintainability_architecture:
  modular_design:
    - Component-based architecture
    - Clear separation of concerns
    - Well-defined interfaces
    
  documentation:
    - Architecture Decision Records (ADRs)
    - API documentation (OpenAPI)
    - Runbooks for operations
    
  testing:
    - Unit tests (Jest)
    - Integration tests (Playwright)
    - E2E tests (Playwright)
    - Visual regression (Percy)
    
  code_quality:
    - TypeScript strict mode
    - ESLint + Prettier
    - Pre-commit hooks
    - Code review required
```

---

## 5. Data Model

### 5.1 Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│       Users         │       │    API_Keys         │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │       │ id (PK)             │
│ email               │       │ user_id (FK)        │───┐
│ name                │       │ key_hash            │   │
│ created_at          │       │ prefix              │   │
│ updated_at          │       │ scopes              │   │
│ role                │       │ created_at          │   │
│ status              │       │ expires_at          │   │
└─────────┬───────────┘       │ last_used_at        │   │
          │                   └─────────────────────┘   │
          │                                               │
          │           ┌─────────────────────┐           │
          │           │   Webhook_Configs   │           │
          │           ├─────────────────────┤           │
          │           │ id (PK)             │           │
          └──────────▶│ user_id (FK)        │◀──────────┘
                      │ endpoint_url        │
                      │ secret_hash         │
                      │ events              │
                      │ status              │
                      │ created_at          │
                      └─────────┬───────────┘
                                │
                                │
                      ┌─────────▼───────────┐
                      │   Webhook_Events    │
                      ├─────────────────────┤
                      │ id (PK)             │
                      │ config_id (FK)      │
                      │ event_type          │
                      │ payload             │
                      │ status              │
                      │ attempts            │
                      │ delivered_at        │
                      │ response_code       │
                      │ created_at          │
                      └─────────────────────┘

┌─────────────────────┐       ┌─────────────────────┐
│   Tool_Sessions     │       │   Search_Analytics  │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │       │ id (PK)             │
│ user_id (FK)        │       │ query               │
│ session_token       │       │ results_count       │
│ tool_type           │       │ clicked_result      │
│ created_at          │       │ created_at          │
│ expires_at          │       │ user_id (FK)        │
└─────────────────────┘       └─────────────────────┘
```

### 5.2 Database Schema

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'developer',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys Table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key_prefix VARCHAR(8) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Webhook Configurations Table
CREATE TABLE webhook_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    endpoint_url VARCHAR(500) NOT NULL,
    secret_hash VARCHAR(255),
    events TEXT[] NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Events Table
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID REFERENCES webhook_configs(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    delivered_at TIMESTAMP WITH TIME ZONE,
    response_code INTEGER,
    response_body TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_webhook_configs_user_id ON webhook_configs(user_id);
CREATE INDEX idx_webhook_events_config_id ON webhook_events(config_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
```

---

## 6. Infrastructure as Code

### 6.1 Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: developer-portal
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: developer-portal
  template:
    metadata:
      labels:
        app: developer-portal
    spec:
      containers:
        - name: portal
          image: cargobit/developer-portal:latest
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: portal-secrets
                  key: database-url
---
apiVersion: v1
kind: Service
metadata:
  name: developer-portal
  namespace: production
spec:
  selector:
    app: developer-portal
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: developer-portal-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: developer-portal
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### 6.2 Terraform Configuration

```hcl
# main.tf
provider "aws" {
  region = var.primary_region
}

# RDS PostgreSQL
resource "aws_db_instance" "portal_db" {
  identifier           = "developer-portal-db"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.t3.medium"
  allocated_storage    = 100
  storage_encrypted    = true
  
  db_name  = "portal"
  username = var.db_username
  password = var.db_password
  
  multi_az               = true
  backup_retention_period = 30
  backup_window          = "02:00-03:00"
  
  tags = {
    Project = "developer-portal"
  }
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "portal_cache" {
  cluster_id           = "developer-portal-cache"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 2
  parameter_group_name = "default.redis7"
  
  tags = {
    Project = "developer-portal"
  }
}

# S3 Bucket for Assets
resource "aws_s3_bucket" "portal_assets" {
  bucket = "developer-portal-assets"
  
  tags = {
    Project = "developer-portal"
  }
}

# CloudFront Distribution (Backup CDN)
resource "aws_cloudfront_distribution" "portal_cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = "PriceClass_All"
  
  origin {
    domain_name = aws_s3_bucket.portal_assets.bucket_regional_domain_name
    origin_id   = "S3-assets"
  }
  
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-assets"
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
```

---

## 7. Environment Configuration

### 7.1 Environment Variables

```yaml
# Environment Configuration
environments:
  development:
    NODE_ENV: "development"
    LOG_LEVEL: "debug"
    DATABASE_URL: "${DEV_DATABASE_URL}"
    REDIS_URL: "${DEV_REDIS_URL}"
    ALGOLIA_APP_ID: "${DEV_ALGOLIA_APP_ID}"
    ALGOLIA_API_KEY: "${DEV_ALGOLIA_API_KEY}"
    
  staging:
    NODE_ENV: "staging"
    LOG_LEVEL: "info"
    DATABASE_URL: "${STAGING_DATABASE_URL}"
    REDIS_URL: "${STAGING_REDIS_URL}"
    ALGOLIA_APP_ID: "${STAGING_ALGOLIA_APP_ID}"
    ALGOLIA_API_KEY: "${STAGING_ALGOLIA_API_KEY}"
    
  production:
    NODE_ENV: "production"
    LOG_LEVEL: "warn"
    DATABASE_URL: "${PROD_DATABASE_URL}"
    REDIS_URL: "${PROD_REDIS_URL}"
    ALGOLIA_APP_ID: "${PROD_ALGOLIA_APP_ID}"
    ALGOLIA_API_KEY: "${PROD_ALGOLIA_API_KEY}"
    SENTRY_DSN: "${SENTRY_DSN}"
    DATADOG_API_KEY: "${DATADOG_API_KEY}"
```

### 7.2 Feature Flags

```yaml
# Feature Flags Configuration
feature_flags:
  api_explorer_v2:
    enabled: true
    rollout: 100%
    
  webhook_debugger_pro:
    enabled: true
    rollout: 100%
    
  event_replay:
    enabled: true
    rollout: 50%
    
  multi_language:
    enabled: true
    languages: ["en", "de"]
    
  dark_mode:
    enabled: true
    default: "system"
```

---

*Diese Architektur-Dokumentation wird quartalsweise überprüft und aktualisiert. Letzte Überprüfung: Januar 2025.*
