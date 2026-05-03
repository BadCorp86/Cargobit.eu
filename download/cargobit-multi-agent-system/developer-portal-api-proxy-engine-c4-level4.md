# 🧱 BLOCK BD — C4 Level 4 — API Proxy Engine

## Implementierungs-Referenz für Architecture Reviews, Security & Governance

---

## 1. Kontext

Die API Proxy Engine ist eine Kernkomponente des Tools Service und verantwortlich für die sichere Ausführung von API-Requests im Namen der Entwickler.

### 1.1 Positionierung im Gesamtsystem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TOOLS SERVICE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────────────────────────────────────────┐   │
│  │   Request   │     │              API PROXY ENGINE                   │   │
│  │   Router    │────►│                                                 │   │
│  └─────────────┘     │  C4 Level 4 (dieses Dokument)                  │   │
│                      └─────────────────────────────────────────────────┘   │
│                                             │                               │
│                                             │                               │
│                      ┌──────────────────────┼──────────────────────┐       │
│                      │                      │                      │       │
│                      ▼                      ▼                      ▼       │
│               ┌─────────────┐       ┌─────────────┐       ┌─────────────┐  │
│               │  CargoBit   │       │Observability│       │   Schema    │  │
│               │  Core APIs  │       │   Stack     │       │  Registry   │  │
│               │(Sandbox/Prod│       │(Logs/Metrics│       │  (optional) │  │
│               └─────────────┘       └─────────────┘       └─────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Externe Schnittstellen

| Schnittstelle | Typ | Beschreibung |
|---------------|-----|--------------|
| **CargoBit Core APIs** | HTTP/REST | Ziel-APIs für Proxy-Requests |
| **Observability Stack** | OTLP/HTTPS | Logs, Metrics, Traces |
| **Schema Registry** | HTTP/REST | Schema-Validierung (optional) |

### 1.3 Eingehende Schnittstellen

| Schnittstelle | Typ | Beschreibung |
|---------------|-----|--------------|
| **Request Router** | Intern | HTTP-Requests mit ExecutionContext |

---

## 2. C4 Level 4 – Komponentendiagramm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API PROXY ENGINE                                     │
│                           (C4 Level 4)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      PRE-PROCESSING LAYER                           │    │
│  │                                                                     │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │    │
│  │  │    [1] Request  │  │    [2] Auth &   │  │    [3] Routing  │     │    │
│  │  │    Normalizer   │  │    Context      │  │    & Endpoint   │     │    │
│  │  │                 │  │    Resolver     │  │    Mapper       │     │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘     │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      VALIDATION LAYER                               │    │
│  │                                                                     │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │    │
│  │  │    [4] Policy   │  │    [5] Payload  │  │    [6] Header   │     │    │
│  │  │    & Guardrail  │  │    Validator    │  │    & Metadata   │     │    │
│  │  │    Engine       │  │    (Schema)     │  │    Sanitizer    │     │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘     │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      EXECUTION LAYER                                │    │
│  │                                                                     │    │
│  │  ┌───────────────────────────┐  ┌───────────────────────────┐      │    │
│  │  │       [7] Execution       │  │    [8] Timeout & Retry    │      │    │
│  │  │       Orchestrator        │  │    Controller             │      │    │
│  │  └───────────────────────────┘  └───────────────────────────┘      │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      POST-PROCESSING LAYER                          │    │
│  │                                                                     │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │    │
│  │  │    [9] Response │  │    [10] Error   │  │    [11] Observ. │     │    │
│  │  │    Normalizer   │  │    Mapper & DX  │  │    Hooks        │     │    │
│  │  │    & Redactor   │  │    Error Model  │  │                 │     │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘     │    │
│  │                                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Komponenten im Detail

### 3.1 Pre-Processing Layer

#### [1] Request Normalizer

**Verantwortlichkeit:**
Eingehende Requests aus dem Portal in ein internes, einheitliches Format transformieren.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REQUEST NORMALIZER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Input:                                                                     │
│  ├── HTTP Request (from Request Router)                                    │
│  │   ├── Method (GET, POST, PUT, DELETE, PATCH)                           │
│  │   ├── Path                                                              │
│  │   ├── Query Parameters                                                  │
│  │   ├── Headers                                                           │
│  │   └── Body (JSON, Form-Data, etc.)                                     │
│                                                                             │
│  Processing:                                                                 │
│  ├── 1. HTTP-Methode normalisieren (UPPERCASE)                             │
│  ├── 2. Query-Params in strukturiertes Objekt parsen                       │
│  ├── 3. Body → JSON parsen (falls möglich)                                 │
│  ├── 4. Headers normalisieren (lowercase keys)                             │
│  └── 5. NormalizedRequest-Objekt erstellen                                 │
│                                                                             │
│  Output:                                                                    │
│  └── NormalizedRequest {                                                    │
│        method: "POST",                                                      │
│        path: "/payments",                                                   │
│        query: { amount: "1000", currency: "EUR" },                         │
│        headers: { "content-type": "application/json", ... },               │
│        body: { amount: 1000, currency: "EUR" },                            │
│        raw: <original request reference>                                    │
│      }                                                                      │
│                                                                             │
│  Warum wichtig:                                                             │
│  Grundlage für deterministische Verarbeitung und Logging.                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementierungs-Beispiel:**

```typescript
interface NormalizedRequest {
  method: HttpMethod;
  path: string;
  query: Record<string, string | string[]>;
  headers: Record<string, string>;
  body: unknown;
  raw: IncomingRequest;
}

class RequestNormalizer {
  normalize(request: IncomingRequest): NormalizedRequest {
    return {
      method: this.normalizeMethod(request.method),
      path: this.normalizePath(request.path),
      query: this.parseQuery(request.query),
      headers: this.normalizeHeaders(request.headers),
      body: this.parseBody(request.body, request.headers['content-type']),
      raw: request
    };
  }

  private normalizeMethod(method: string): HttpMethod {
    return method.toUpperCase() as HttpMethod;
  }

  private normalizePath(path: string): string {
    return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }

  private parseQuery(query: string): Record<string, string | string[]> {
    // Parse query string into structured object
    const result: Record<string, string | string[]> = {};
    const params = new URLSearchParams(query);
    
    for (const [key, value] of params) {
      if (key in result) {
        const existing = result[key];
        result[key] = Array.isArray(existing) 
          ? [...existing, value] 
          : [existing, value];
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  private normalizeHeaders(headers: Record<string, string>): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = value;
    }
    return normalized;
  }

  private parseBody(body: unknown, contentType?: string): unknown {
    if (!body) return null;
    
    if (contentType?.includes('application/json')) {
      try {
        return typeof body === 'string' ? JSON.parse(body) : body;
      } catch {
        return body;
      }
    }
    
    return body;
  }
}
```

#### [2] Auth & Context Resolver

**Verantwortlichkeit:**
Kontext für den Request herstellen: Partner, Umgebung, Berechtigungen.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AUTH & CONTEXT RESOLVER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Input:                                                                     │
│  ├── NormalizedRequest                                                     │
│  └── ExecutionContext (from Request Router)                                │
│      ├── API Key / Session Token                                           │
│      ├── Partner ID (resolved)                                             │
│      └── Source IP                                                         │
│                                                                             │
│  Processing:                                                                 │
│  ├── 1. Token/API-Key validieren                                           │
│  ├── 2. Partner-Kontext laden                                              │
│  ├── 3. Umgebung bestimmen (Sandbox/Production)                            │
│  ├── 4. Berechtigungen prüfen                                              │
│  ├── 5. Limits und Flags laden                                             │
│  └── 6. ResolvedContext erstellen                                          │
│                                                                             │
│  Output:                                                                    │
│  └── ResolvedContext {                                                      │
│        partnerId: "partner_123",                                            │
│        environment: "sandbox" | "production",                              │
│        permissions: ["payments:read", "payments:write"],                   │
│        limits: {                                                            │
│          rateLimit: 1000,                                                   │
│          maxAmount: 1000000                                                 │
│        },                                                                   │
│        flags: {                                                             │
│          betaFeatures: true,                                                │
│          advancedTools: false                                               │
│        },                                                                   │
│        apiKey: {                                                            │
│          id: "key_abc123",                                                  │
│          prefix: "cb_test_",                                                │
│          scopes: ["payments", "refunds"]                                   │
│        }                                                                    │
│      }                                                                      │
│                                                                             │
│  Warum wichtig:                                                             │
│  Grundlage für Policies, Rate Limits, Routing.                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementierungs-Beispiel:**

```typescript
interface ResolvedContext {
  partnerId: string;
  environment: 'sandbox' | 'production';
  permissions: string[];
  limits: {
    rateLimit: number;
    maxAmount: number;
    dailyLimit: number;
  };
  flags: {
    betaFeatures: boolean;
    advancedTools: boolean;
    aiHinting: boolean;
  };
  apiKey: {
    id: string;
    prefix: string;
    scopes: string[];
  };
}

interface ExecutionContext {
  token?: string;
  apiKey?: string;
  partnerId?: string;
  sourceIp: string;
}

class AuthContextResolver {
  constructor(
    private readonly partnerService: PartnerService,
    private readonly cache: CacheService
  ) {}

  async resolve(context: ExecutionContext): Promise<ResolvedContext> {
    // 1. Validate token/api-key
    const partner = await this.validateCredentials(context);
    
    // 2. Load partner context (with caching)
    const partnerContext = await this.cache.getOrSet(
      `partner:${partner.id}:context`,
      () => this.partnerService.getContext(partner.id),
      { ttl: 300 } // 5 minutes
    );
    
    // 3. Determine environment
    const environment = this.determineEnvironment(context.apiKey);
    
    // 4. Build resolved context
    return {
      partnerId: partner.id,
      environment,
      permissions: partnerContext.permissions,
      limits: partnerContext.limits,
      flags: partnerContext.flags,
      apiKey: {
        id: partner.apiKeyId,
        prefix: partner.apiKeyPrefix,
        scopes: partner.scopes
      }
    };
  }

  private async validateCredentials(context: ExecutionContext): Promise<Partner> {
    if (context.apiKey) {
      return this.partnerService.validateApiKey(context.apiKey);
    }
    
    if (context.token) {
      return this.partnerService.validateSessionToken(context.token);
    }
    
    throw new AuthError('No valid credentials provided');
  }

  private determineEnvironment(apiKey?: string): 'sandbox' | 'production' {
    if (!apiKey) return 'sandbox';
    return apiKey.startsWith('cb_test_') ? 'sandbox' : 'production';
  }
}
```

#### [3] Routing & Endpoint Mapper

**Verantwortlichkeit:**
Mapping von Developer-sichtbaren Endpoints auf CargoBit Core API Endpoints.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ROUTING & ENDPOINT MAPPER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Aufgabe:                                                                   │
│  Mapping von "Developer-sichtbarem" Endpoint auf tatsächliche Core-Endpoint │
│                                                                             │
│  Mapping-Tabelle:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Portal Endpoint                  │ Core API Endpoint                │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ /tools/api/payments              │ /v1/payments                     │    │
│  │ /tools/api/payments/{id}         │ /v1/payments/{id}                │    │
│  │ /tools/api/payment-intents       │ /v1/payment-intents              │    │
│  │ /tools/api/refunds               │ /v1/refunds                      │    │
│  │ /tools/api/customers             │ /v1/customers                    │    │
│  │ /tools/api/webhook-endpoints     │ /v1/webhook-endpoints            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Features:                                                                  │
│  ├── Version-Awareness (v1, v2, ...)                                       │
│  ├── Feature-Flags (Beta-Endpoints)                                        │
│  ├── Environment-spezifisches Routing (Sandbox vs. Prod)                   │
│  └── Path-Parameter-Preservation                                           │
│                                                                             │
│  Mapping-Result:                                                            │
│  └── MappedEndpoint {                                                       │
│        targetUrl: "https://api.cargobit.com/v1/payments",                  │
│        method: "POST",                                                      │
│        version: "v1",                                                       │
│        requiresAuth: true,                                                  │
│        requiresScope: ["payments:write"],                                  │
│        sandboxUrl: "https://api.sandbox.cargobit.com/v1/payments",         │
│        deprecated: false,                                                   │
│        sunsetDate: null                                                     │
│      }                                                                      │
│                                                                             │
│  Warum wichtig:                                                             │
│  Entkoppelt Portal-UX von interner API-Struktur.                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementierungs-Beispiel:**

```typescript
interface MappedEndpoint {
  targetUrl: string;
  sandboxUrl: string;
  method: HttpMethod;
  version: string;
  requiresAuth: boolean;
  requiresScope: string[];
  deprecated: boolean;
  sunsetDate: Date | null;
  betaFeature: boolean;
}

interface RouteMapping {
  portalPath: string;
  corePath: string;
  methods: HttpMethod[];
  requiresScope: string[];
  betaFeature?: boolean;
}

const ROUTE_MAPPINGS: RouteMapping[] = [
  {
    portalPath: '/tools/api/payments',
    corePath: '/v1/payments',
    methods: ['GET', 'POST'],
    requiresScope: ['payments:read', 'payments:write']
  },
  {
    portalPath: '/tools/api/payments/:id',
    corePath: '/v1/payments/:id',
    methods: ['GET', 'POST', 'DELETE'],
    requiresScope: ['payments:read', 'payments:write']
  },
  {
    portalPath: '/tools/api/payment-intents',
    corePath: '/v1/payment-intents',
    methods: ['GET', 'POST'],
    requiresScope: ['payments:read', 'payments:write']
  },
  {
    portalPath: '/tools/api/beta/splits',
    corePath: '/v2/payment-splits',
    methods: ['POST'],
    requiresScope: ['payments:write'],
    betaFeature: true
  }
];

class RoutingEndpointMapper {
  private readonly baseUrl: string;
  private readonly sandboxUrl: string;

  constructor(config: ApiConfig) {
    this.baseUrl = config.productionBaseUrl;
    this.sandboxUrl = config.sandboxBaseUrl;
  }

  map(
    request: NormalizedRequest,
    context: ResolvedContext
  ): MappedEndpoint {
    // Find matching route
    const mapping = this.findMapping(request.path);
    if (!mapping) {
      throw new RoutingError(`No route found for ${request.path}`);
    }

    // Check beta feature access
    if (mapping.betaFeature && !context.flags.betaFeatures) {
      throw new AccessDeniedError('Beta feature not enabled for this partner');
    }

    // Build target URL
    const corePath = this.buildCorePath(mapping.corePath, request.path);
    const baseApiUrl = context.environment === 'sandbox' 
      ? this.sandboxUrl 
      : this.baseUrl;

    return {
      targetUrl: `${this.baseUrl}${corePath}`,
      sandboxUrl: `${this.sandboxUrl}${corePath}`,
      method: request.method,
      version: this.extractVersion(mapping.corePath),
      requiresAuth: true,
      requiresScope: mapping.requiresScope,
      deprecated: false,
      sunsetDate: null,
      betaFeature: mapping.betaFeature || false
    };
  }

  private findMapping(portalPath: string): RouteMapping | null {
    for (const mapping of ROUTE_MAPPINGS) {
      if (this.pathMatches(portalPath, mapping.portalPath)) {
        return mapping;
      }
    }
    return null;
  }

  private pathMatches(actualPath: string, pattern: string): boolean {
    const actualParts = actualPath.split('/');
    const patternParts = pattern.split('/');

    if (actualParts.length !== patternParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        continue; // Parameter placeholder
      }
      if (actualParts[i] !== patternParts[i]) {
        return false;
      }
    }

    return true;
  }

  private buildCorePath(corePattern: string, portalPath: string): string {
    const patternParts = corePattern.split('/');
    const portalParts = portalPath.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        patternParts[i] = portalParts[i];
      }
    }

    return patternParts.join('/');
  }

  private extractVersion(path: string): string {
    const match = path.match(/\/(v\d+)\//);
    return match ? match[1] : 'v1';
  }
}
```

---

### 3.2 Validation Layer

#### [4] Policy & Guardrail Engine

**Verantwortlichkeit:**
Durchsetzen von Sicherheits-Policies, Governance-Regeln und Usage-Policies.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    POLICY & GUARDRAIL ENGINE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Aufgabe:                                                                   │
│  Durchsetzen von:                                                           │
│  ├── Sicherheits-Policies                                                   │
│  ├── Governance-Regeln                                                      │
│  └── Usage-Policies                                                         │
│                                                                             │
│  Policy-Kategorien:                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Kategorie           │ Beispiele                                   │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ Security            │ • Verbot bestimmter Header                   │    │
│  │                     │ • Kein internal-traffic ohne Admin-Rechte    │    │
│  │                     │ • Max. Body-Size: 1MB                        │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ Governance          │ • API-Versionierung                          │    │
│  │                     │ • Deprecation-Warnings                        │    │
│  │                     │ • Schema-Pflicht für bestimmte Endpoints     │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ Usage               │ • Rate-Limit-Check                           │    │
│  │                     │ • Quota-Check                                │    │
│  │                     │ • Feature-Flag-Check                         │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ Sandbox             │ • Blocken sensibler Endpoints               │    │
│  │                     │ • Limitierung bestimmter Methoden            │    │
│  │                     │ • Keine Produktionsdaten                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Policy-Check-Result:                                                       │
│  └── PolicyResult {                                                         │
│        allowed: true | false,                                               │
│        violations: [                                                        │
│          { policy: "MAX_BODY_SIZE", message: "Body exceeds 1MB" }         │
│        ],                                                                   │
│        warnings: [                                                          │
│          { policy: "DEPRECATION", message: "API v1 deprecated" }          │
│        ],                                                                   │
│        modified: false,  // Wurde Request modifiziert?                     │
│        modifications: {}                                                    │
│      }                                                                      │
│                                                                             │
│  Warum wichtig:                                                             │
│  Schutz vor Missbrauch, interne Sicherheitsanforderungen, Compliance.      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Policy-Definitionen:**

```typescript
interface Policy {
  id: string;
  name: string;
  category: 'security' | 'governance' | 'usage' | 'sandbox';
  description: string;
  severity: 'error' | 'warning' | 'info';
  check: (context: PolicyContext) => PolicyCheckResult;
}

interface PolicyContext {
  request: NormalizedRequest;
  endpoint: MappedEndpoint;
  partnerContext: ResolvedContext;
}

interface PolicyCheckResult {
  passed: boolean;
  message?: string;
  modification?: RequestModification;
}

// Policy Examples

const POLICIES: Policy[] = [
  // Security Policies
  {
    id: 'SEC-001',
    name: 'Max Body Size',
    category: 'security',
    description: 'Request body must not exceed 1MB',
    severity: 'error',
    check: (ctx) => {
      const bodySize = JSON.stringify(ctx.request.body || {}).length;
      const maxSize = 1024 * 1024; // 1MB
      
      return {
        passed: bodySize <= maxSize,
        message: bodySize > maxSize 
          ? `Body size ${bodySize} exceeds maximum ${maxSize}`
          : undefined
      };
    }
  },

  {
    id: 'SEC-002',
    name: 'Forbidden Headers',
    category: 'security',
    description: 'Remove internal headers from request',
    severity: 'error',
    check: (ctx) => {
      const forbiddenHeaders = [
        'x-internal-token',
        'x-admin-key',
        'x-debug-mode'
      ];
      
      const found = forbiddenHeaders.filter(h => 
        h in ctx.request.headers
      );
      
      if (found.length > 0) {
        return {
          passed: true,
          modification: {
            type: 'remove_headers',
            headers: found
          }
        };
      }
      
      return { passed: true };
    }
  },

  // Sandbox Policies
  {
    id: 'SBX-001',
    name: 'Sandbox Endpoint Restriction',
    category: 'sandbox',
    description: 'Block production-only endpoints in sandbox',
    severity: 'error',
    check: (ctx) => {
      if (ctx.partnerContext.environment !== 'sandbox') {
        return { passed: true };
      }
      
      const productionOnlyEndpoints = [
        '/v1/accounts/close',
        '/v1/billing/finalize'
      ];
      
      const isProductionOnly = productionOnlyEndpoints.some(
        ep => ctx.endpoint.targetUrl.includes(ep)
      );
      
      return {
        passed: !isProductionOnly,
        message: isProductionOnly 
          ? 'This endpoint is not available in sandbox environment'
          : undefined
      };
    }
  },

  // Governance Policies
  {
    id: 'GOV-001',
    name: 'Deprecation Warning',
    category: 'governance',
    description: 'Warn about deprecated API versions',
    severity: 'warning',
    check: (ctx) => {
      if (ctx.endpoint.deprecated) {
        return {
          passed: true,
          message: `This endpoint is deprecated and will be removed on ${ctx.endpoint.sunsetDate}`
        };
      }
      return { passed: true };
    }
  }
];

class PolicyGuardrailEngine {
  constructor(private readonly policies: Policy[]) {}

  check(context: PolicyContext): PolicyResult {
    const violations: PolicyViolation[] = [];
    const warnings: PolicyWarning[] = [];
    const modifications: RequestModification[] = [];

    for (const policy of this.policies) {
      const result = policy.check(context);

      if (!result.passed) {
        if (policy.severity === 'error') {
          violations.push({
            policy: policy.id,
            message: result.message || 'Policy violation'
          });
        } else {
          warnings.push({
            policy: policy.id,
            message: result.message || 'Policy warning'
          });
        }
      }

      if (result.modification) {
        modifications.push(result.modification);
      }
    }

    return {
      allowed: violations.length === 0,
      violations,
      warnings,
      modified: modifications.length > 0,
      modifications
    };
  }
}
```

#### [5] Payload Validator (Schema-aware)

**Verantwortlichkeit:**
Validierung von Request-Bodies gegen API-Schemas.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PAYLOAD VALIDATOR (SCHEMA-AWARE)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Aufgabe:                                                                   │
│  Validierung von Request-Bodies gegen API-Schemas                          │
│                                                                             │
│  Input:                                                                     │
│  ├── Request Body                                                          │
│  ├── Schema aus Schema Registry                                            │
│  └── Endpoint-Information                                                  │
│                                                                             │
│  Processing:                                                                 │
│  ├── 1. Schema aus Registry laden (oder Cache)                             │
│  ├── 2. JSON-Schema-Validierung durchführen                                │
│  ├── 3. Validierungsfehler sammeln                                         │
│  └── 4. ValidationResult erstellen                                         │
│                                                                             │
│  Schema Source:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Endpoint                │ Schema                                    │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ POST /v1/payments       │ PaymentCreateRequest                      │    │
│  │ POST /v1/payment-intents│ PaymentIntentCreateRequest                │    │
│  │ POST /v1/refunds        │ RefundCreateRequest                       │    │
│  │ POST /v1/customers      │ CustomerCreateRequest                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Validation Result:                                                         │
│  └── ValidationResult {                                                     │
│        valid: true | false,                                                 │
│        errors: [                                                            │
│          {                                                                  │
│            path: "/amount",                                                 │
│            message: "must be greater than 0",                               │
│            code: "MINIMUM",                                                 │
│            value: -100                                                      │
│          }                                                                  │
│        ],                                                                   │
│        warnings: [],                                                        │
│        sanitized: false                                                     │
│      }                                                                      │
│                                                                             │
│  Warum wichtig:                                                             │
│  DX (frühe Fehler), Schutz der Core-APIs, deterministische Fehlerbilder.   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementierungs-Beispiel:**

```typescript
import Ajv, { ValidationError } from 'ajv';

interface ValidationErrorDetail {
  path: string;
  message: string;
  code: string;
  value?: unknown;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationErrorDetail[];
  warnings: string[];
  sanitized: boolean;
}

class PayloadValidator {
  private readonly ajv: Ajv;
  private readonly schemaRegistry: SchemaRegistry;
  private readonly cache: CacheService;

  constructor(schemaRegistry: SchemaRegistry, cache: CacheService) {
    this.ajv = new Ajv({ 
      allErrors: true,
      useDefaults: true,
      removeAdditional: 'failing'
    });
    this.schemaRegistry = schemaRegistry;
    this.cache = cache;
  }

  async validate(
    body: unknown,
    endpoint: MappedEndpoint
  ): Promise<ValidationResult> {
    // Skip validation for GET/DELETE without body
    if (!body || ['GET', 'DELETE'].includes(endpoint.method)) {
      return { valid: true, errors: [], warnings: [], sanitized: false };
    }

    // Load schema
    const schema = await this.loadSchema(endpoint);
    if (!schema) {
      // No schema available - skip validation (or enforce based on policy)
      return { 
        valid: true, 
        errors: [], 
        warnings: ['No schema available for validation'],
        sanitized: false 
      };
    }

    // Validate
    const validate = this.ajv.compile(schema);
    const valid = validate(body);

    if (valid) {
      return { valid: true, errors: [], warnings: [], sanitized: false };
    }

    // Format errors
    const errors = this.formatErrors(validate.errors || []);

    return {
      valid: false,
      errors,
      warnings: [],
      sanitized: false
    };
  }

  private async loadSchema(endpoint: MappedEndpoint): Promise<object | null> {
    const cacheKey = `schema:${endpoint.version}:${endpoint.targetUrl}`;
    
    return this.cache.getOrSet(
      cacheKey,
      () => this.schemaRegistry.getSchemaForEndpoint(
        endpoint.targetUrl,
        endpoint.method
      ),
      { ttl: 300 } // 5 minutes
    );
  }

  private formatErrors(errors: ValidationError[]): ValidationErrorDetail[] {
    return errors.map(error => ({
      path: error.instancePath || '/',
      message: error.message || 'Validation error',
      code: error.keyword,
      value: error.data
    }));
  }
}
```

#### [6] Header & Metadata Sanitizer

**Verantwortlichkeit:**
Entfernen/Überschreiben von Headern, die nicht nach außen gehen dürfen.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HEADER & METADATA SANITIZER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Aufgabe:                                                                   │
│  Entfernt/überschreibt Header, die nicht nach außen gehen dürfen           │
│                                                                             │
│  Header-Regeln:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Kategorie           │ Aktion                                        │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ REMOVE              │ • X-Internal-*                                │    │
│  │                     │ • X-Debug-*                                   │    │
│  │                     │ • Authorization (wird ersetzt)                │    │
│  │                     │ • Cookie                                      │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ REPLACE             │ • Authorization → Sandbox/Prod API-Key        │    │
│  │                     │ • Host → API-Host                             │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ ADD                 │ • X-CargoBit-Tool: api-explorer               │    │
│  │                     │ • X-CargoBit-Environment: sandbox|production  │    │
│  │                     │ • X-Request-ID: {uuid}                        │    │
│  │                     │ • X-Correlation-ID: {correlationId}           │    │
│  │                     │ • User-Agent: CargoBit-Tools/{version}        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Processing:                                                                 │
│  ├── 1. Remove forbidden headers                                           │
│  ├── 2. Replace authentication headers                                     │
│  ├── 3. Add tracking headers                                               │
│  └── 4. Normalize remaining headers                                        │
│                                                                             │
│  Sanitized Headers:                                                         │
│  └── {                                                                      │
│        "content-type": "application/json",                                 │
│        "accept": "application/json",                                        │
│        "authorization": "Bearer sk_test_...",                              │
│        "x-cargobit-tool": "api-explorer",                                  │
│        "x-cargobit-environment": "sandbox",                                │
│        "x-request-id": "req_abc123",                                        │
│        "x-correlation-id": "corr_xyz789",                                  │
│        "user-agent": "CargoBit-Tools/1.0.0",                               │
│        "idempotency-key": "idemp_key_123"                                  │
│      }                                                                      │
│                                                                             │
│  Warum wichtig:                                                             │
│  Security, Kapselung, klare Boundary.                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementierungs-Beispiel:**

```typescript
interface SanitizationConfig {
  removeHeaders: string[];
  replaceHeaders: Record<string, string>;
  addHeaders: Record<string, string>;
}

const SANITIZATION_CONFIG: SanitizationConfig = {
  removeHeaders: [
    'x-internal-*',
    'x-debug-*',
    'cookie',
    'x-forwarded-for',
    'x-real-ip'
  ],
  replaceHeaders: {
    'host': 'api.cargobit.com',
    'authorization': '' // Will be set dynamically
  },
  addHeaders: {
    'x-cargobit-tool': 'api-explorer',
    'user-agent': 'CargoBit-Tools/1.0.0'
  }
};

class HeaderMetadataSanitizer {
  private readonly config: SanitizationConfig;

  constructor(config: SanitizationConfig) {
    this.config = config;
  }

  sanitize(
    headers: Record<string, string>,
    context: ResolvedContext,
    requestId: string,
    correlationId: string
  ): Record<string, string> {
    const sanitized: Record<string, string> = {};

    // 1. Copy and filter headers
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      
      // Check if header should be removed
      if (this.shouldRemove(lowerKey)) {
        continue;
      }
      
      // Check if header should be replaced
      if (lowerKey in this.config.replaceHeaders) {
        continue;
      }
      
      sanitized[lowerKey] = value;
    }

    // 2. Add required headers
    for (const [key, value] of Object.entries(this.config.addHeaders)) {
      sanitized[key.toLowerCase()] = value;
    }

    // 3. Set dynamic headers
    sanitized['authorization'] = this.getAuthorizationHeader(context);
    sanitized['host'] = this.getHostHeader(context);
    sanitized['x-cargobit-environment'] = context.environment;
    sanitized['x-request-id'] = requestId;
    sanitized['x-correlation-id'] = correlationId;

    return sanitized;
  }

  private shouldRemove(headerName: string): boolean {
    for (const pattern of this.config.removeHeaders) {
      if (pattern.endsWith('*')) {
        if (headerName.startsWith(pattern.slice(0, -1))) {
          return true;
        }
      } else if (headerName === pattern) {
        return true;
      }
    }
    return false;
  }

  private getAuthorizationHeader(context: ResolvedContext): string {
    // Use sandbox or production key based on environment
    const apiKey = context.environment === 'sandbox'
      ? process.env.CARGOBIT_SANDBOX_API_KEY
      : process.env.CARGOBIT_PRODUCTION_API_KEY;
    
    return `Bearer ${apiKey}`;
  }

  private getHostHeader(context: ResolvedContext): string {
    return context.environment === 'sandbox'
      ? 'api.sandbox.cargobit.com'
      : 'api.cargobit.com';
  }
}
```

---

### 3.3 Execution Layer

#### [7] Execution Orchestrator

**Verantwortlichkeit:**
Orchestriert den eigentlichen HTTP-Call an die Core API.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXECUTION ORCHESTRATOR                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Aufgabe:                                                                   │
│  Orchestriert den eigentlichen Call:                                        │
│  ├── Request bauen                                                         │
│  ├── HTTP-Client aufrufen                                                  │
│  └── Response entgegennehmen                                               │
│                                                                             │
│  Features:                                                                  │
│  ├── Idempotency-Key Handling (optional)                                   │
│  ├── Correlation-ID Weitergabe                                             │
│  ├── Request Signing (optional)                                            │
│  └── Request/Response Logging                                              │
│                                                                             │
│  Execution Flow:                                                            │
│  ├── 1. HTTP-Request konstruieren                                          │
│  ├── 2. Idempotency-Key hinzufügen (falls POST)                            │
│  ├── 3. Correlation-ID hinzufügen                                          │
│  ├── 4. HTTP-Client aufrufen                                               │
│  ├── 5. Response empfangen                                                 │
│  ├── 6. Response-Logs schreiben                                            │
│  └── 7. ExecutionResult zurückgeben                                        │
│                                                                             │
│  Execution Result:                                                          │
│  └── ExecutionResult {                                                      │
│        success: true | false,                                               │
│        response: {                                                          │
│          status: 200,                                                       │
│          headers: {...},                                                    │
│          body: {...},                                                       │
│          latency: 234ms                                                     │
│        },                                                                   │
│        error: null | Error,                                                 │
│        retries: 0,                                                          │
│        timing: {                                                            │
│          dns: 10ms,                                                         │
│          connect: 20ms,                                                     │
│          tls: 15ms,                                                         │
│          wait: 189ms                                                        │
│        }                                                                    │
│      }                                                                      │
│                                                                             │
│  Warum wichtig:                                                             │
│  Herzstück der Engine.                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementierungs-Beispiel:**

```typescript
import fetch, { Request, Response } from 'node-fetch';

interface ExecutionResult {
  success: boolean;
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    latency: number;
  };
  error?: {
    type: string;
    message: string;
    code?: string;
  };
  retries: number;
  timing: {
    dns?: number;
    connect?: number;
    tls?: number;
    wait?: number;
    total: number;
  };
}

interface ExecutionRequest {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  idempotencyKey?: string;
  correlationId: string;
}

class ExecutionOrchestrator {
  private readonly httpClient: HttpClient;

  constructor(config: HttpClientConfig) {
    this.httpClient = new HttpClient(config);
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Build HTTP request
      const httpRequest = this.buildRequest(request);

      // Execute HTTP call
      const response = await this.httpClient.fetch(httpRequest);

      // Parse response
      const body = await this.parseResponse(response);

      const latency = Date.now() - startTime;

      return {
        success: response.ok,
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: this.headersToObject(response.headers),
          body,
          latency
        },
        retries: 0,
        timing: {
          total: latency
        }
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      return {
        success: false,
        error: {
          type: this.classifyError(error),
          message: error.message,
          code: error.code
        },
        retries: 0,
        timing: {
          total: latency
        }
      };
    }
  }

  private buildRequest(request: ExecutionRequest): Request {
    const headers = new Headers(request.headers);

    // Add idempotency key for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      if (request.idempotencyKey) {
        headers.set('Idempotency-Key', request.idempotencyKey);
      }
    }

    // Ensure correlation ID
    headers.set('X-Correlation-ID', request.correlationId);

    return new Request(request.url, {
      method: request.method,
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined
    });
  }

  private async parseResponse(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }

  private headersToObject(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of headers.entries()) {
      result[key] = value;
    }
    return result;
  }

  private classifyError(error: Error): string {
    if (error.code === 'ECONNREFUSED') return 'CONNECTION_ERROR';
    if (error.code === 'ETIMEDOUT') return 'TIMEOUT';
    if (error.code === 'ENOTFOUND') return 'DNS_ERROR';
    if (error.code === 'ECONNRESET') return 'CONNECTION_RESET';
    return 'UNKNOWN_ERROR';
  }
}
```

#### [8] Timeout & Retry Controller

**Verantwortlichkeit:**
Verwaltung von Timeouts, Retries und Circuit-Breaker-Logik.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TIMEOUT & RETRY CONTROLLER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Aufgabe:                                                                   │
│  ├── Timeouts pro Endpoint/Env                                             │
│  ├── Retries (idempotente Calls)                                           │
│  └── Circuit-Breaker-Logik (optional)                                      │
│                                                                             │
│  Timeout-Konfiguration:                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Endpoint-Type         │ Connect  │ Read    │ Total                 │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ Standard              │ 5s       │ 30s     │ 60s                   │    │
│  │ Payment               │ 3s       │ 15s     │ 30s                   │    │
│  │ Reporting             │ 5s       │ 60s     │ 120s                  │    │
│  │ Webhook-Management    │ 5s       │ 10s     │ 20s                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Retry-Konfiguration:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Condition             │ Retry?   │ Max Attempts │ Backoff          │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ 5xx Server Error      │ Yes      │ 3            │ Exponential      │    │
│  │ 429 Rate Limited      │ Yes      │ 2            │ Fixed (1s)       │    │
│  │ Connection Error      │ Yes      │ 3            │ Exponential      │    │
│  │ Timeout               │ Yes      │ 2            │ Fixed (500ms)    │    │
│  │ 4xx Client Error      │ No       │ -            │ -                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Circuit-Breaker-Konfiguration:                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Parameter             │ Wert                                       │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ Failure Threshold     │ 50% errors in 1 minute                     │    │
│  │ Minimum Calls         │ 20 calls before evaluation                 │    │
│  │ Open Duration         │ 30 seconds                                 │    │
│  │ Half-Open Calls       │ 5 test calls                               │    │
│  │ Success Threshold     │ 80% success to close                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Warum wichtig:                                                             │
│  Schutz vor Hängern, gute DX bei transienten Fehlern.                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementierungs-Beispiel:**

```typescript
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
  jitter: number;
  retryableErrors: string[];
  retryableStatusCodes: number[];
}

interface TimeoutConfig {
  connect: number;
  read: number;
  total: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 100,
  maxDelay: 5000,
  multiplier: 2,
  jitter: 0.1,
  retryableErrors: ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'],
  retryableStatusCodes: [429, 500, 502, 503, 504]
};

const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  connect: 5000,  // 5s
  read: 30000,    // 30s
  total: 60000    // 60s
};

class TimeoutRetryController {
  private readonly retryConfig: RetryConfig;
  private readonly timeoutConfig: TimeoutConfig;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    retryConfig: Partial<RetryConfig> = {},
    timeoutConfig: Partial<TimeoutConfig> = {}
  ) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.timeoutConfig = { ...DEFAULT_TIMEOUT_CONFIG, ...timeoutConfig };
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 0.5,
      minimumCalls: 20,
      openDuration: 30000,
      halfOpenCalls: 5,
      successThreshold: 0.8
    });
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    isIdempotent: boolean
  ): Promise<T> {
    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      throw new CircuitBreakerOpenError('Circuit breaker is open');
    }

    let lastError: Error | null = null;
    let attempt = 0;
    const startTime = Date.now();

    while (attempt < this.retryConfig.maxAttempts) {
      attempt++;

      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(operation);
        
        // Record success
        this.circuitBreaker.recordSuccess();
        
        return result;
      } catch (error) {
        lastError = error;

        // Check if we should retry
        if (!this.shouldRetry(error, isIdempotent, attempt)) {
          this.circuitBreaker.recordFailure();
          throw error;
        }

        // Calculate backoff delay
        const delay = this.calculateBackoff(attempt);
        await this.sleep(delay);
      }
    }

    // All retries exhausted
    this.circuitBreaker.recordFailure();
    throw lastError || new Error('Max retries exceeded');
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    const timeoutId = setTimeout(
      () => { throw new TimeoutError('Operation timed out'); },
      this.timeoutConfig.total
    );

    try {
      const result = await operation();
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private shouldRetry(
    error: Error,
    isIdempotent: boolean,
    attempt: number
  ): boolean {
    // Don't retry if max attempts reached
    if (attempt >= this.retryConfig.maxAttempts) {
      return false;
    }

    // Don't retry non-idempotent operations (except for specific errors)
    if (!isIdempotent && !this.isRetryableForNonIdempotent(error)) {
      return false;
    }

    // Check if error is retryable
    return this.isRetryableError(error);
  }

  private isRetryableError(error: Error): boolean {
    // Check error code
    if (this.retryConfig.retryableErrors.includes(error.code || '')) {
      return true;
    }

    // Check status code (for HTTP errors)
    if (error instanceof HttpError) {
      return this.retryConfig.retryableStatusCodes.includes(error.status);
    }

    return false;
  }

  private isRetryableForNonIdempotent(error: Error): boolean {
    // Only retry non-idempotent operations for specific safe errors
    return error.code === 'ECONNREFUSED';
  }

  private calculateBackoff(attempt: number): number {
    const baseDelay = this.retryConfig.initialDelay * 
      Math.pow(this.retryConfig.multiplier, attempt - 1);
    
    const cappedDelay = Math.min(baseDelay, this.retryConfig.maxDelay);
    
    // Add jitter
    const jitter = cappedDelay * this.retryConfig.jitter * Math.random();
    
    return Math.floor(cappedDelay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

### 3.4 Post-Processing Layer

#### [9] Response Normalizer & Redactor

**Verantwortlichkeit:**
Response in konsistentes Format bringen und sensible Felder maskieren.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  RESPONSE NORMALIZER & REDACTOR                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Aufgabe:                                                                   │
│  ├── Response in ein konsistentes Format bringen                           │
│  └── Sensible Felder ggf. maskieren                                        │
│                                                                             │
│  Redaction Rules:                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Feld                  │ Transformation                              │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ card.number           │ "**** **** **** 1234"                       │    │
│  │ card.cvc              │ "***"                                        │    │
│  │ api_key               │ "sk_test_****1234"                          │    │
│  │ secret                │ "[REDACTED]"                                 │    │
│  │ password              │ "[REDACTED]"                                 │    │
│  │ token                 │ "[REDACTED]"                                 │    │
│  │ webhook_secret        │ "whsec_****"                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Normalization:                                                             │
│  ├── Einheitliche Darstellung von Listen/Objekten                          │
│  ├── ISO-8601 Timestamps                                                   │
│  ├── Konsistente ID-Formate                                                │
│  └── Einheitliche Error-Struktur                                           │
│                                                                             │
│  Normalized Response:                                                       │
│  └── NormalizedResponse {                                                   │
│        status: 200,                                                         │
│        statusText: "OK",                                                    │
│        headers: { ... },                                                    │
│        body: {                                                              │
│          id: "pay_abc123",                                                  │
│          amount: 1000,                                                      │
│          currency: "EUR",                                                   │
│          card: {                                                            │
│            last4: "1234",                                                   │
│            brand: "visa"                                                    │
│          },                                                                 │
│          created: "2024-01-20T12:34:56Z"                                   │
│        },                                                                   │
│        metadata: {                                                           │
│          requestId: "req_abc123",                                           │
│          latency: 234,                                                      │
│          environment: "sandbox"                                             │
│        }                                                                    │
│      }                                                                      │
│                                                                             │
│  Warum wichtig:                                                             │
│  DX + Security + Konsistenz.                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementierungs-Beispiel:**

```typescript
interface RedactionRule {
  pattern: RegExp;
  replacement: string | ((value: string) => string);
}

interface NormalizedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  metadata: {
    requestId: string;
    latency: number;
    environment: string;
  };
}

const REDACTION_RULES: RedactionRule[] = [
  // Credit card numbers
  {
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?(\d{4})\b/g,
    replacement: '**** **** **** $1'
  },
  // API keys
  {
    pattern: /(sk_live_|sk_test_)(.+)(.{4})/g,
    replacement: '$1****$3'
  },
  // Secrets
  {
    pattern: /(whsec_)(.{8})(.*)/g,
    replacement: '$1********'
  }
];

const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'token',
  'api_key',
  'private_key',
  'cvc',
  'cvv'
];

class ResponseNormalizerRedactor {
  private readonly redactionRules: RedactionRule[];
  private readonly sensitiveFields: Set<string>;

  constructor(
    redactionRules: RedactionRule[] = REDACTION_RULES,
    sensitiveFields: string[] = SENSITIVE_FIELDS
  ) {
    this.redactionRules = redactionRules;
    this.sensitiveFields = new Set(sensitiveFields);
  }

  normalize(
    response: ExecutionResult,
    requestId: string,
    environment: string
  ): NormalizedResponse {
    if (!response.response) {
      throw new Error('No response to normalize');
    }

    // Redact sensitive data in body
    const redactedBody = this.redact(response.response.body);

    // Normalize headers
    const normalizedHeaders = this.normalizeHeaders(response.response.headers);

    return {
      status: response.response.status,
      statusText: response.response.statusText,
      headers: normalizedHeaders,
      body: redactedBody,
      metadata: {
        requestId,
        latency: response.response.latency,
        environment
      }
    };
  }

  private redact(data: unknown): unknown {
    if (typeof data === 'string') {
      return this.redactString(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.redact(item));
    }

    if (data && typeof data === 'object') {
      return this.redactObject(data as Record<string, unknown>);
    }

    return data;
  }

  private redactString(value: string): string {
    let result = value;

    for (const rule of this.redactionRules) {
      result = result.replace(
        rule.pattern,
        typeof rule.replacement === 'function'
          ? rule.replacement
          : rule.replacement
      );
    }

    return result;
  }

  private redactObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if field is sensitive
      if (this.sensitiveFields.has(lowerKey)) {
        result[key] = '[REDACTED]';
        continue;
      }

      // Recursively redact nested values
      result[key] = this.redact(value);
    }

    return result;
  }

  private normalizeHeaders(
    headers: Record<string, string>
  ): Record<string, string> {
    const normalized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'set-cookie', 'x-api-key'];

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveHeaders.includes(lowerKey)) {
        normalized[key] = '[REDACTED]';
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }
}
```

#### [10] Error Mapper & DX Error Model

**Verantwortlichkeit:**
Transformation technischer Fehler in developer-freundliche Fehlermeldungen.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ERROR MAPPER & DX ERROR MODEL                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Aufgabe:                                                                   │
│  ├── Technische Fehler → Developer-freundliche Fehler                      │
│  └── Einheitliches Error-Schema                                            │
│                                                                             │
│  Error Mapping:                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Technischer Fehler      │ DX Error                                   │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ ETIMEDOUT               │ REQUEST_TIMEOUT                            │    │
│  │ ECONNREFUSED            │ SERVICE_UNAVAILABLE                        │    │
│  │ ECONNRESET              │ CONNECTION_RESET                           │    │
│  │ 400 Bad Request         │ VALIDATION_ERROR                          │    │
│  │ 401 Unauthorized        │ AUTHENTICATION_ERROR                       │    │
│  │ 403 Forbidden           │ AUTHORIZATION_ERROR                        │    │
│  │ 404 Not Found           │ RESOURCE_NOT_FOUND                         │    │
│  │ 429 Rate Limited        │ RATE_LIMIT_EXCEEDED                        │    │
│  │ 500 Internal Error      │ INTERNAL_SERVER_ERROR                      │    │
│  │ 502 Bad Gateway         │ UPSTREAM_ERROR                             │    │
│  │ 503 Service Unavailable │ SERVICE_UNAVAILABLE                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  DX Error Format:                                                           │
│  └── DXError {                                                               │
│        code: "VALIDATION_ERROR",                                            │
│        message: "The request could not be processed",                       │
│        details: [                                                            │
│          {                                                                  │
│            field: "amount",                                                 │
│            issue: "must be greater than 0",                                 │
│            hint: "Use a positive integer in the smallest currency unit"    │
│          }                                                                  │
│        ],                                                                   │
│        documentation_url: "https://developer.cargobit.io/errors/...",      │
│        request_id: "req_abc123",                                            │
│        timestamp: "2024-01-20T12:34:56Z"                                   │
│      }                                                                      │
│                                                                             │
│  Error Context:                                                             │
│  ├── What: Was ist passiert?                                               │
│  ├── Why: Warum ist es passiert?                                           │
│  └── How to fix: Wie kann es behoben werden?                               │
│                                                                             │
│  Warum wichtig:                                                             │
│  Developer Experience, Debuggability, Support-Reduktion.                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementierungs-Beispiel:**

```typescript
interface DXError {
  code: string;
  message: string;
  details: DXErrorDetail[];
  documentation_url: string;
  request_id: string;
  timestamp: string;
}

interface DXErrorDetail {
  field?: string;
  issue: string;
  hint?: string;
}

interface ErrorMapping {
  code: string;
  message: string;
  documentation_url: string;
  hint?: string;
}

const ERROR_MAPPINGS: Record<string, ErrorMapping> = {
  // Network Errors
  ETIMEDOUT: {
    code: 'REQUEST_TIMEOUT',
    message: 'The request took too long to complete',
    documentation_url: 'https://developer.cargobit.io/errors/timeout',
    hint: 'Try again or check your network connection'
  },
  ECONNREFUSED: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'The service is temporarily unavailable',
    documentation_url: 'https://developer.cargobit.io/errors/unavailable',
    hint: 'Check the status page or try again in a few minutes'
  },
  ECONNRESET: {
    code: 'CONNECTION_RESET',
    message: 'The connection was closed unexpectedly',
    documentation_url: 'https://developer.cargobit.io/errors/connection',
    hint: 'This is usually temporary. Try your request again.'
  },

  // HTTP Errors
  '400': {
    code: 'VALIDATION_ERROR',
    message: 'The request could not be processed',
    documentation_url: 'https://developer.cargobit.io/errors/validation'
  },
  '401': {
    code: 'AUTHENTICATION_ERROR',
    message: 'Invalid or missing authentication',
    documentation_url: 'https://developer.cargobit.io/errors/auth',
    hint: 'Check your API key is correct and has not expired'
  },
  '403': {
    code: 'AUTHORIZATION_ERROR',
    message: 'You do not have permission to perform this action',
    documentation_url: 'https://developer.cargobit.io/errors/forbidden'
  },
  '404': {
    code: 'RESOURCE_NOT_FOUND',
    message: 'The requested resource was not found',
    documentation_url: 'https://developer.cargobit.io/errors/not-found'
  },
  '429': {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please slow down.',
    documentation_url: 'https://developer.cargobit.io/errors/rate-limit',
    hint: 'Implement exponential backoff in your code'
  },
  '500': {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    documentation_url: 'https://developer.cargobit.io/errors/server'
  },
  '502': {
    code: 'UPSTREAM_ERROR',
    message: 'Bad gateway from upstream service',
    documentation_url: 'https://developer.cargobit.io/errors/upstream'
  },
  '503': {
    code: 'SERVICE_UNAVAILABLE',
    message: 'The service is temporarily unavailable',
    documentation_url: 'https://developer.cargobit.io/errors/unavailable'
  }
};

class ErrorMapperDX {
  private readonly baseUrl: string;

  constructor(baseUrl: string = 'https://developer.cargobit.io') {
    this.baseUrl = baseUrl;
  }

  map(
    error: Error | HttpError,
    requestId: string,
    requestBody?: unknown
  ): DXError {
    // Determine error type
    const errorKey = this.getErrorKey(error);
    const mapping = ERROR_MAPPINGS[errorKey] || this.getDefaultMapping();

    // Build DX error
    const dxError: DXError = {
      code: mapping.code,
      message: mapping.message,
      details: this.extractDetails(error, requestBody),
      documentation_url: mapping.documentation_url,
      request_id: requestId,
      timestamp: new Date().toISOString()
    };

    // Add hint if available
    if (mapping.hint) {
      dxError.details.push({
        issue: 'Suggestion',
        hint: mapping.hint
      });
    }

    return dxError;
  }

  private getErrorKey(error: Error | HttpError): string {
    // Check for HTTP error
    if (error instanceof HttpError) {
      return String(error.status);
    }

    // Check for network error
    if (error.code) {
      return error.code;
    }

    // Check error name
    if (error.name === 'TimeoutError') {
      return 'ETIMEDOUT';
    }

    return 'UNKNOWN';
  }

  private extractDetails(
    error: Error | HttpError,
    requestBody?: unknown
  ): DXErrorDetail[] {
    const details: DXErrorDetail[] = [];

    // Extract validation errors
    if (error instanceof ValidationError) {
      for (const err of error.errors) {
        details.push({
          field: err.path,
          issue: err.message,
          hint: this.getValidationHint(err.code)
        });
      }
    }

    // Extract API error details
    if (error instanceof HttpError && error.body) {
      const apiError = error.body as { error?: { details?: DXErrorDetail[] } };
      if (apiError.error?.details) {
        details.push(...apiError.error.details);
      }
    }

    return details;
  }

  private getValidationHint(code: string): string {
    const hints: Record<string, string> = {
      'required': 'This field is mandatory',
      'minimum': 'Value must be greater than or equal to the minimum',
      'maximum': 'Value must be less than or equal to the maximum',
      'pattern': 'Value must match the expected format',
      'enum': 'Value must be one of the allowed values',
      'type': 'Value must be of the correct type'
    };

    return hints[code] || 'Check the API documentation for valid values';
  }

  private getDefaultMapping(): ErrorMapping {
    return {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      documentation_url: `${this.baseUrl}/errors/internal`
    };
  }
}
```

#### [11] Observability Hooks

**Verantwortlichkeit:**
Zentralisierte Observability (Logs, Metrics, Traces) für alle Komponenten.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       OBSERVABILITY HOOKS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Aufgabe:                                                                   │
│  ├── Logs (structured)                                                     │
│  ├── Metrics (latency, error rate, retries)                                │
│  └── Traces (Span pro Call)                                                │
│                                                                             │
│  Wichtig:                                                                   │
│  ├── Keine PII                                                             │
│  └── Correlation-ID durchgängig                                            │
│                                                                             │
│  Log Structure:                                                             │
│  └── {                                                                      │
│        "timestamp": "2024-01-20T12:34:56.789Z",                            │
│        "level": "info",                                                     │
│        "service": "tools-service",                                          │
│        "component": "api-proxy-engine",                                     │
│        "correlation_id": "corr_abc123",                                     │
│        "request_id": "req_xyz789",                                          │
│        "partner_id": "partner_123",                                         │
│        "action": "proxy_request",                                           │
│        "endpoint": "/v1/payments",                                          │
│        "method": "POST",                                                    │
│        "status": 200,                                                       │
│        "duration_ms": 234,                                                  │
│        "environment": "sandbox"                                             │
│      }                                                                      │
│                                                                             │
│  Key Metrics:                                                               │
│  ├── api_proxy_request_duration_seconds (histogram)                         │
│  ├── api_proxy_request_total (counter)                                      │
│  ├── api_proxy_error_total (counter)                                        │
│  ├── api_proxy_retry_total (counter)                                        │
│  └── api_proxy_active_requests (gauge)                                      │
│                                                                             │
│  Trace Spans:                                                               │
│  ├── api_proxy.request (root span)                                          │
│  │   ├── api_proxy.normalization                                            │
│  │   ├── api_proxy.validation                                               │
│  │   ├── api_proxy.execution                                                │
│  │   └── api_proxy.response_processing                                      │
│  └── Linked by Correlation ID                                               │
│                                                                             │
│  Warum wichtig:                                                             │
│  Debugging, SRE, Partner-Scoring, Audit.                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementierungs-Beispiel:**

```typescript
import { Span, Tracer } from '@opentelemetry/api';
import { metrics, tracing } from '@opentelemetry/sdk-node';

interface LogContext {
  correlationId: string;
  requestId: string;
  partnerId: string;
  environment: string;
  component: string;
}

interface MetricTags {
  endpoint: string;
  method: string;
  status: number;
  environment: string;
  errorType?: string;
}

class ObservabilityHooks {
  private readonly tracer: Tracer;
  private readonly logger: Logger;
  private readonly meter: metrics.Meter;

  constructor(serviceName: string) {
    this.tracer = tracing.getTracer(serviceName);
    this.logger = new Logger(serviceName);
    this.meter = metrics.getMeter(serviceName);

    this.initializeMetrics();
  }

  private requestDurationHistogram!: metrics.Histogram;
  private requestCounter!: metrics.Counter;
  private errorCounter!: metrics.Counter;
  private retryCounter!: metrics.Counter;
  private activeRequestsGauge!: metrics.ObservableGauge;

  private initializeMetrics(): void {
    this.requestDurationHistogram = this.meter.createHistogram(
      'api_proxy_request_duration_seconds',
      { description: 'Request duration in seconds' }
    );

    this.requestCounter = this.meter.createCounter(
      'api_proxy_request_total',
      { description: 'Total number of requests' }
    );

    this.errorCounter = this.meter.createCounter(
      'api_proxy_error_total',
      { description: 'Total number of errors' }
    );

    this.retryCounter = this.meter.createCounter(
      'api_proxy_retry_total',
      { description: 'Total number of retries' }
    );
  }

  // Logging
  logRequest(
    context: LogContext,
    request: { method: string; endpoint: string }
  ): void {
    this.logger.info('Request started', {
      ...context,
      action: 'request_start',
      method: request.method,
      endpoint: request.endpoint
    });
  }

  logResponse(
    context: LogContext,
    response: { status: number; duration: number; retries: number }
  ): void {
    this.logger.info('Request completed', {
      ...context,
      action: 'request_complete',
      status: response.status,
      duration_ms: response.duration,
      retries: response.retries
    });
  }

  logError(
    context: LogContext,
    error: Error,
    request: { method: string; endpoint: string }
  ): void {
    this.logger.error('Request failed', {
      ...context,
      action: 'request_error',
      method: request.method,
      endpoint: request.endpoint,
      error_type: error.constructor.name,
      error_message: error.message
    });
  }

  // Metrics
  recordRequestDuration(duration: number, tags: MetricTags): void {
    this.requestDurationHistogram.record(duration / 1000, {
      endpoint: tags.endpoint,
      method: tags.method,
      status: String(tags.status),
      environment: tags.environment
    });
  }

  incrementRequestCount(tags: MetricTags): void {
    this.requestCounter.add(1, {
      endpoint: tags.endpoint,
      method: tags.method,
      status: String(tags.status),
      environment: tags.environment
    });
  }

  incrementErrorCount(tags: MetricTags): void {
    this.errorCounter.add(1, {
      endpoint: tags.endpoint,
      method: tags.method,
      error_type: tags.errorType || 'unknown',
      environment: tags.environment
    });
  }

  incrementRetryCount(tags: MetricTags): void {
    this.retryCounter.add(1, {
      endpoint: tags.endpoint,
      method: tags.method,
      environment: tags.environment
    });
  }

  // Tracing
  startSpan(name: string, context: LogContext): Span {
    const span = this.tracer.startSpan(name);
    span.setAttribute('correlation_id', context.correlationId);
    span.setAttribute('request_id', context.requestId);
    span.setAttribute('partner_id', context.partnerId);
    span.setAttribute('environment', context.environment);
    return span;
  }

  endSpan(span: Span, status: 'ok' | 'error' = 'ok'): void {
    span.setStatus({ code: status === 'ok' ? 0 : 2 });
    span.end();
  }

  // Convenience method for full request tracking
  async trackRequest<T>(
    context: LogContext,
    request: { method: string; endpoint: string },
    operation: (span: Span) => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const rootSpan = this.startSpan('api_proxy.request', context);

    this.logRequest(context, request);
    this.incrementRequestCount({
      endpoint: request.endpoint,
      method: request.method,
      status: 0,
      environment: context.environment
    });

    try {
      const result = await operation(rootSpan);
      
      const duration = Date.now() - startTime;
      this.logResponse(context, { status: 200, duration, retries: 0 });
      this.recordRequestDuration(duration, {
        endpoint: request.endpoint,
        method: request.method,
        status: 200,
        environment: context.environment
      });

      this.endSpan(rootSpan, 'ok');
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logError(context, error, request);
      this.incrementErrorCount({
        endpoint: request.endpoint,
        method: request.method,
        status: 0,
        errorType: error.constructor.name,
        environment: context.environment
      });
      this.recordRequestDuration(duration, {
        endpoint: request.endpoint,
        method: request.method,
        status: 0,
        environment: context.environment
      });

      this.endSpan(rootSpan, 'error');
      throw error;
    }
  }
}
```

---

## 4. Typische Sequenz – „API Call via Explorer"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE REQUEST FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Request Router → API Proxy Engine (mit ExecutionContext)                │
│     │                                                                       │
│     ▼                                                                       │
│  2. [1] Request Normalizer: Normalisiert Input                              │
│     │                                                                       │
│     ▼                                                                       │
│  3. [2] Auth & Context Resolver: Kontext prüfen                             │
│     │                                                                       │
│     ▼                                                                       │
│  4. [3] Routing & Endpoint Mapper: Ziel-Endpoint bestimmen                  │
│     │                                                                       │
│     ▼                                                                       │
│  5. [4] Policy & Guardrail Engine: Policies prüfen                          │
│     │                                                                       │
│     ▼                                                                       │
│  6. [5] Payload Validator: Schema-Check (optional, wenn Body)               │
│     │                                                                       │
│     ▼                                                                       │
│  7. [6] Header & Metadata Sanitizer: Request säubern                        │
│     │                                                                       │
│     ▼                                                                       │
│  8. [7] Execution Orchestrator: HTTP-Call ausführen                         │
│     │                                                                       │
│     ▼                                                                       │
│  9. [8] Timeout & Retry Controller: ggf. Retries                            │
│     │                                                                       │
│     ▼                                                                       │
│  10. [9] Response Normalizer & Redactor: Response aufbereiten               │
│     │                                                                       │
│     ▼                                                                       │
│  11. [10] Error Mapper: Fehler ggf. mappen                                  │
│     │                                                                       │
│     ▼                                                                       │
│  12. [11] Observability Hooks: Logs/Metrics/Traces                          │
│     │                                                                       │
│     ▼                                                                       │
│  13. Antwort zurück an Request Router → Portal → User                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Nicht-funktionale Anforderungen

### 5.1 Determinismus

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DETERMINISM REQUIREMENTS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Definition:                                                                │
│  Gleiche Inputs → Gleiche Outputs (inkl. Fehlerbilder)                     │
│                                                                             │
│  Garantien:                                                                 │
│  ├── Gleiche Request-Parameter → Gleiche Response-Struktur                 │
│  ├── Gleiche Fehler-Condition → Gleiche DX-Error                          │
│  ├── Deterministische Header-Behandlung                                    │
│  ├── Deterministische Validation-Fehler                                    │
│  └── Keine Random-Werte in Logs/Metadata (außer IDs)                       │
│                                                                             │
│  Durchsetzung:                                                              │
│  ├── Normalisierung aller Inputs                                           │
│  ├── Konsistente Error-Formatierung                                        │
│  ├── Deterministische Retry-Backoff (mit konfiguriertem Seed)              │
│  └── Keine nicht-deterministischen Komponenten                             │
│                                                                             │
│  Testing:                                                                   │
│  ├── Determinism-Tests für jeden Flow                                      │
│  ├── Snapshot-Testing für Responses                                        │
│  └── Chaos-Engineering für Edge-Cases                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Performance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERFORMANCE REQUIREMENTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Latenz-Budget:                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ Komponente                 │ Latenz-Ziel    │ Max                   │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ Request Normalizer         │ 1ms            │ 5ms                   │    │
│  │ Auth & Context Resolver    │ 5ms            │ 20ms                  │    │
│  │ Routing & Endpoint Mapper  │ 1ms            │ 5ms                   │    │
│  │ Policy & Guardrail Engine  │ 2ms            │ 10ms                  │    │
│  │ Payload Validator          │ 3ms            │ 15ms                  │    │
│  │ Header Sanitizer           │ 1ms            │ 5ms                   │    │
│  │ Execution Orchestrator     │ Variable       │ -                     │    │
│  │ Response Normalizer        │ 2ms            │ 10ms                  │    │
│  │ Error Mapper               │ 1ms            │ 5ms                   │    │
│  │ Observability Hooks        │ 2ms            │ 10ms                  │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │ Gesamt (ohne Core API)     │ ~20ms          │ ~85ms                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Throughput:                                                                │
│  ├── 1000 Requests/Sekunde (Standard)                                      │
│  ├── 5000 Requests/Sekunde (Peak)                                          │
│  └── Horizontal Scaling für höhere Last                                    │
│                                                                             │
│  Resource Limits:                                                           │
│  ├── Memory: 512MB pro Instanz                                             │
│  ├── CPU: 1 Core pro Instanz                                               │
│  └── Connections: 1000 concurrent                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Security

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY REQUIREMENTS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Network Security:                                                           │
│  ├── Kein direkter Zugriff vom Frontend auf Core-APIs                      │
│  ├── Alle Calls durch Policies & Validation                                │
│  ├── TLS 1.3 für alle Verbindungen                                         │
│  └── Certificate Pinning (optional)                                        │
│                                                                             │
│  Data Security:                                                              │
│  ├── Keine PII in Logs                                                     │
│  ├── Sensible Daten redacted                                               │
│  ├── Keine Credentials in Responses                                        │
│  └── Encryption at Rest für Logs                                           │
│                                                                             │
│  Access Control:                                                             │
│  ├── API-Key-Validierung für jeden Request                                 │
│  ├── RBAC für Tool-Zugriff                                                 │
│  ├── Session-Timeout (8 Stunden)                                           │
│  └── MFA für Admin-Funktionen                                              │
│                                                                             │
│  Input Validation:                                                           │
│  ├── JSON-Schema-Validierung                                               │
│  ├── Max Body Size: 1MB                                                    │
│  ├── SQL-Injection-Schutz                                                  │
│  └── XSS-Schutz                                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Resilience

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RESILIENCE REQUIREMENTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Circuit Breaker:                                                           │
│  ├── Failure Threshold: 50% in 1 Minute                                    │
│  ├── Open Duration: 30 Seconds                                             │
│  └── Automatic Recovery                                                     │
│                                                                             │
│  Timeouts:                                                                  │
│  ├── Connect: 5 Seconds                                                    │
│  ├── Read: 30 Seconds                                                      │
│  └── Total: 60 Seconds                                                     │
│                                                                             │
│  Retries:                                                                   │
│  ├── Nur für idempotente Calls                                             │
│  ├── Max 3 Retries                                                         │
│  ├── Exponential Backoff                                                   │
│  └── Jitter für Thundering Herd                                            │
│                                                                             │
│  Fallback:                                                                  │
│  ├── Cache für GET-Requests (optional)                                     │
│  ├── Statische Error-Responses                                             │
│  └── Graceful Degradation                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Auditability

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AUDITABILITY REQUIREMENTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Logging:                                                                   │
│  ├── Jede Entscheidung nachvollziehbar                                     │
│  │   ├── Policy-Block                                                      │
│  │   ├── Validation-Fehler                                                 │
│  │   ├── Mapping-Entscheidung                                              │
│  │   └── Retry-Entscheidung                                                │
│  ├── Structured JSON Logs                                                  │
│  ├── Correlation-ID durchgängig                                            │
│  └── Keine PII in Logs                                                     │
│                                                                             │
│  Tracing:                                                                   │
│  ├── Distributed Tracing für jeden Request                                 │
│  ├── Span pro Komponente                                                   │
│  └── Export nach Jaeger/Datadog                                            │
│                                                                             │
│  Metrics:                                                                   │
│  ├── Request Duration                                                      │
│  ├── Error Rates                                                           │
│  ├── Retry Counts                                                          │
│  └── Policy Violations                                                     │
│                                                                             │
│  Retention:                                                                 │
│  ├── Logs: 30 Tage                                                        │
│  ├── Traces: 7 Tage                                                       │
│  └── Metrics: 90 Tage                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Nächste Vertiefungen

### 6.1 Threat Model (STRIDE)

| Threat | Relevante Komponenten |
|--------|----------------------|
| **Spoofing** | Auth & Context Resolver |
| **Tampering** | Payload Validator, Header Sanitizer |
| **Repudiation** | Observability Hooks, Audit Logs |
| **Information Disclosure** | Response Redactor, Error Mapper |
| **Denial of Service** | Timeout & Retry Controller, Rate Limiter |
| **Elevation of Privilege** | Policy & Guardrail Engine |

### 6.2 Performance Architecture

| Aspekt | Beschreibung |
|--------|--------------|
| **Latenzbudget** | Detaillierte Budgets pro Komponente |
| **Throughput** | Kapazitätsplanung und Scaling |
| **Caching** | Schema Cache, Partner Context Cache |
| **Connection Pooling** | HTTP-Client Konfiguration |

### 6.3 Operating Model

| Rolle | Verantwortlichkeit |
|-------|-------------------|
| **API Proxy Owner** | Feature-Entwicklung, Qualität |
| **SRE** | Deployment, Monitoring, Incidents |
| **Security** | Policy-Definition, Audits |

---

## 7. Referenzen

- [C4 Level 3 - Tools Service](./developer-portal-tools-service-c4-level3.md)
- [Enterprise Architecture Blueprint](./developer-portal-enterprise-architecture-blueprint.md)
- [API Governance Framework](./developer-portal-api-governance-framework.md)
- [Security Hardening Guide](./developer-portal-security-hardening-guide.md)
- [Threat Model STRIDE](./developer-portal-threat-model-stride.md)

---

*Letzte Aktualisierung: Januar 2025*
*Owner: Architecture Board*
*Status: Implementierungs-Referenz*
