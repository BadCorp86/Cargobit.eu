# CargoBit Data Flow Diagram (DFD)

> **Version:** 1.0.0  
> **Status:** Production-Ready  
> **Last Updated:** 2026-04-18  
> **Owner:** Security Architecture Team  
> **Methodology:** Level-0 and Level-1 DFD

---

## L.1 Level-0 Overview (Context Diagram)

### System Context

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          LEVEL-0 CONTEXT DIAGRAM                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│                                                                                      │
│     ┌─────────────────┐                          ┌─────────────────┐               │
│     │                 │                          │                 │               │
│     │   SHIPPER APP   │                          │  CARRIER APP    │               │
│     │   (External)    │                          │   (External)    │               │
│     │                 │                          │                 │               │
│     │  • Create Order │                          │  • Submit Bids  │               │
│     │  • Accept Offer │                          │  • Update Status│               │
│     │  • Track Status │                          │  • Upload POD   │               │
│     │                 │                          │                 │               │
│     └────────┬────────┘                          └────────┬────────┘               │
│              │                                            │                          │
│              │ HTTPS + JWT                                │ HTTPS + JWT             │
│              │                                            │                          │
│              ▼                                            ▼                          │
│     ┌───────────────────────────────────────────────────────────────────────────┐   │
│     │                                                                           │   │
│     │                                                                           │   │
│     │                        CARGOBIT PLATFORM                                  │   │
│     │                                                                           │   │
│     │    ┌─────────────────────────────────────────────────────────────────┐    │   │
│     │    │                                                                 │    │   │
│     │    │   API Gateway → Domain Services → Matching → Execution         │    │   │
│     │    │                                                                 │    │   │
│     │    └─────────────────────────────────────────────────────────────────┘    │   │
│     │                                                                           │   │
│     └───────────────────────────────────────────────────────────────────────────┘   │
│              ▲                                            ▲                          │
│              │                                            │                          │
│              │ mTLS + Service Auth                        │                          │
│              │                                            │                          │
│     ┌────────┴────────┐                          ┌────────┴────────┐               │
│     │                 │                          │                 │               │
│     │  DRIVER APP     │                          │   ADMIN PORTAL  │               │
│     │   (External)    │                          │   (External)    │               │
│     │                 │                          │                 │               │
│     │  • Accept Jobs  │                          │  • Config Mgmt  │               │
│     │  • Update Status│                          │  • User Mgmt    │               │
│     │  • Upload POD   │                          │  • Audit Review │               │
│     │                 │                          │                 │               │
│     └─────────────────┘                          └─────────────────┘               │
│                                                                                      │
│                                                                                      │
│     ┌─────────────────┐                          ┌─────────────────┐               │
│     │                 │                          │                 │               │
│     │ PARTNER APIs    │                          │  EXTERNAL AUTH  │               │
│     │   (External)    │                          │   (External)    │               │
│     │                 │                          │                 │               │
│     │  • Insurance    │                          │  • Keycloak     │               │
│     │  • Advertising  │                          │  • OAuth2       │               │
│     │                 │                          │                 │               │
│     └─────────────────┘                          └─────────────────┘               │
│                                                                                      │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## L.2 Level-1 DFD (Detailed Data Flow)

### Complete System Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          LEVEL-1 DATA FLOW DIAGRAM                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  EXTERNAL ENTITIES                                                                   │
│  ═════════════════                                                                   │
│                                                                                      │
│  ┌────────────────────────┐              ┌────────────────────────┐                │
│  │     SHIPPER / CARRIER  │              │      DRIVER APP        │                │
│  │         APPS           │              │                        │                │
│  │                        │              │  • Mobile Client       │                │
│  │  • Web Client          │              │  • GPS Tracking        │                │
│  │  • Mobile Client       │              │  • Offline Support     │                │
│  └───────────┬────────────┘              └───────────┬────────────┘                │
│              │                                       │                              │
│              │ HTTPS + JWT (TLS 1.3)                 │ HTTPS + JWT (TLS 1.3)       │
│              │                                       │                              │
│              ▼                                       ▼                              │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                          TRUST BOUNDARY 1 (Internet)                          │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                              │
│                                      ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐     │  │
│  │  │                        API GATEWAY (P1)                              │     │  │
│  │  │                                                                      │     │  │
│  │  │  Process:                                                            │     │  │
│  │  │  • JWT Validation (iss, aud, exp, sub)                              │     │  │
│  │  │  • Role extraction from token                                        │     │  │
│  │  │  • Rate Limiting (per user, per IP)                                 │     │  │
│  │  │  • WAF rule evaluation                                              │     │  │
│  │  │  • Request/Response logging                                         │     │  │
│  │  │  • mTLS downstream                                                  │     │  │
│  │  │                                                                      │     │  │
│  │  │  Data In:                                                           │     │  │
│  │  │  • HTTP Request (method, path, headers, body)                       │     │  │
│  │  │  • JWT Token                                                        │     │  │
│  │  │                                                                      │     │  │
│  │  │  Data Out:                                                          │     │  │
│  │  │  • Authenticated request to services                                │     │  │
│  │  │  • Audit event (request logged)                                     │     │  │
│  │  │                                                                      │     │  │
│  │  └─────────────────────────────────────────────────────────────────────┘     │  │
│  │                                                                               │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                              │
│                                      │ mTLS (Service Mesh)                          │
│                                      ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                          TRUST BOUNDARY 2 (DMZ)                               │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                              │
│              ┌───────────────────────┼───────────────────────┐                     │
│              │                       │                       │                     │
│              ▼                       ▼                       ▼                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                │
│  │ ORDER SERVICE   │    │ PRICING SERVICE │    │ BIDDING SERVICE │                │
│  │     (P2)        │    │     (P3)        │    │     (P4)        │                │
│  │                 │    │                 │    │                 │                │
│  │ Process:        │    │ Process:        │    │ Process:        │                │
│  │ • Create order  │    │ • Calc price    │    │ • Validate bid  │                │
│  │ • Update status │    │ • Fraud score   │    │ • Check limits  │                │
│  │ • Store order   │    │ • Audit log     │    │ • Audit log     │                │
│  │                 │    │                 │    │                 │                │
│  │ Data In:        │    │ Data In:        │    │ Data In:        │                │
│  │ • Order details │    │ • Order data    │    │ • Bid data      │                │
│  │ • User context  │    │ • Carrier score │    │ • Carrier ID    │                │
│  │                 │    │ • Config vers   │    │ • Fraud config  │                │
│  │ Data Out:       │    │                 │    │                 │                │
│  │ • Order event   │    │ Data Out:       │    │ Data Out:       │                │
│  │ • Audit event   │    │ • Price calc    │    │ • Bid validated │                │
│  │                 │    │ • Fraud score   │    │ • Fraud check   │                │
│  └────────┬────────┘    │ • Audit event   │    │ • Audit event   │                │
│           │             └────────┬────────┘    └────────┬────────┘                │
│           │                      │                      │                          │
│           │                      │                      │                          │
│           ▼                      ▼                      ▼                          │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                               │  │
│  │                        KAFKA / NATS EVENT BROKER (D1)                        │  │
│  │                                                                               │  │
│  │  Topics:                                                                      │  │
│  │  • order.created        → Order events                                       │  │
│  │  • pricing.calculated   → Pricing results                                    │  │
│  │  • bid.validated        → Validated bids                                     │  │
│  │  • matching.completed   → Match results                                      │  │
│  │  • execution.status     → Status updates                                     │  │
│  │  • fraud.detected       → Fraud alerts                                       │  │
│  │  • audit.events         → Audit trail                                        │  │
│  │                                                                               │  │
│  │  Security:                                                                    │  │
│  │  • ACLs per service                                                          │  │
│  │  • mTLS for all connections                                                  │  │
│  │  • Message signing                                                           │  │
│  │                                                                               │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                              │
│                                      │ Events (bid.validated)                       │
│                                      ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐     │  │
│  │  │                     MATCHING SERVICE (P5)                            │     │  │
│  │  │                                                                      │     │  │
│  │  │  Process:                                                            │     │  │
│  │  │  1. Consume bid.validated events                                    │     │  │
│  │  │  2. Calculate matching score                                        │     │  │
│  │  │  3. Apply fraud penalty                                             │     │  │
│  │  │  4. Rank bids by score                                              │     │  │
│  │  │  5. Select best bid                                                 │     │  │
│  │  │  6. Emit matching.completed event                                   │     │  │
│  │  │  7. Write audit log                                                 │     │  │
│  │  │                                                                      │     │  │
│  │  │  Data In:                                                           │     │  │
│  │  │  • bid.validated event (carrierId, bidAmount, fraudScore)          │     │  │
│  │  │  • Fraud config (weights, thresholds)                               │     │  │
│  │  │  • Carrier score history                                            │     │  │
│  │  │                                                                      │     │  │
│  │  │  Data Out:                                                          │     │  │
│  │  │  • matching.completed event                                         │     │  │
│  │  │    { transportId, carrierId, score, fraudPenaltyApplied }           │     │  │
│  │  │  • Audit: MATCHING_COMPLETED                                        │     │  │
│  │  │                                                                      │     │  │
│  │  └─────────────────────────────────────────────────────────────────────┘     │  │
│  │                                                                               │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                              │
│                                      │ matching.completed                           │
│                                      ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐     │  │
│  │  │                    EXECUTION SERVICE (P6)                            │     │  │
│  │  │                                                                      │     │  │
│  │  │  Process:                                                            │     │  │
│  │  │  1. Consume matching.completed events                               │     │  │
│  │  │  2. Assign driver to transport                                      │     │  │
│  │  │  3. Track execution status                                          │     │  │
│  │  │  4. Handle POD uploads                                              │     │  │
│  │  │  5. Emit status update events                                       │     │  │
│  │  │  6. Write audit log                                                 │     │  │
│  │  │                                                                      │     │  │
│  │  │  Data In:                                                           │     │  │
│  │  │  • matching.completed event                                         │     │  │
│  │  │  • Driver location (GPS)                                            │     │  │
│  │  │  • POD upload (image, signature)                                    │     │  │
│  │  │                                                                      │     │  │
│  │  │  Data Out:                                                          │     │  │
│  │  │  • execution.status.changed event                                   │     │  │
│  │  │  • Notification to shipper/carrier                                  │     │  │
│  │  │  • Audit: EXECUTION_STATUS_CHANGED                                  │     │  │
│  │  │                                                                      │     │  │
│  │  └─────────────────────────────────────────────────────────────────────┘     │  │
│  │                                                                               │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                              │
│                                      │ audit.events                                 │
│                                      ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                          TRUST BOUNDARY 4 (Data)                              │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                              │
│                                      ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                               │  │
│  │                         DATA STORES                                           │  │
│  │                                                                               │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │  │
│  │  │  PostgreSQL     │  │  Elasticsearch  │  │     Redis       │              │  │
│  │  │  (D2)           │  │  (D3)           │  │     (D4)        │              │  │
│  │  │                 │  │                 │  │                 │              │  │
│  │  │  • Orders       │  │  • Audit Logs   │  │  • Cache        │              │  │
│  │  │  • Bids         │  │  • Search       │  │  • Rate Limits  │              │  │
│  │  │  • Transports   │  │  • Analytics    │  │  • Sessions     │              │  │
│  │  │  • Users        │  │  • WORM Storage │  │                 │              │  │
│  │  │  • Carriers     │  │                 │  │                 │              │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘              │  │
│  │                                                                               │  │
│  │  ┌─────────────────┐  ┌─────────────────┐                                   │  │
│  │  │  Security       │  │   S3/MinIO      │                                   │  │
│  │  │  Config Store   │  │   (D6)          │                                   │  │
│  │  │  (D5)           │  │                 │                                   │  │
│  │  │                 │  │  • POD Images   │                                   │  │
│  │  │  • RBAC Rules   │  │  • Documents    │                                   │  │
│  │  │  • ABAC Rules   │  │  • Signatures   │                                   │  │
│  │  │  • Fraud Config │  │                 │                                   │  │
│  │  │  • Rate Limits  │  │                 │                                   │  │
│  │  └─────────────────┘  └─────────────────┘                                   │  │
│  │                                                                               │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## L.3 Data Flow Details by Process

### P1: API Gateway Processing

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          P1: API GATEWAY DATA FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                               │   │
│  │   External Request                                                           │   │
│  │   ────────────────                                                           │   │
│  │   POST /api/bids/validate                                                   │   │
│  │   Headers:                                                                   │   │
│  │     Authorization: Bearer eyJhbGciOiJSUzI1NiIs...                           │   │
│  │     X-Request-ID: req-abc-123                                               │   │
│  │     Content-Type: application/json                                          │   │
│  │   Body:                                                                      │   │
│  │     { "transportId": "tr_123", "amount": 1500, "carrierId": "c_456" }      │   │
│  │                                                                               │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   ┌──────────────────────────────────────────────────────────────────────┐  │   │
│  │   │                     PROCESSING STEPS                                  │  │   │
│  │   └──────────────────────────────────────────────────────────────────────┘  │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 1: TLS Termination                                                   │   │
│  │   ─────────────────────────                                                 │   │
│  │   • Verify TLS 1.3 connection                                               │   │
│  │   • Check certificate validity                                              │   │
│  │   • Extract client IP for logging                                          │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 2: Rate Limiting                                                     │   │
│  │   ─────────────────────                                                     │   │
│  │   • Check Redis: rate_limit:user:u_123                                     │   │
│  │   • Increment counter                                                       │   │
│  │   • If exceeded: Return 429 Too Many Requests                              │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 3: JWT Validation                                                    │   │
│  │   ──────────────────────                                                    │   │
│  │   • Extract token from Authorization header                                 │   │
│  │   • Verify signature with JWKS public key                                  │   │
│  │   • Validate claims:                                                        │   │
│  │     - iss: https://auth.cargobit.com ✓                                     │   │
│  │     - aud: cargobit-api ✓                                                  │   │
│  │     - exp: > now() ✓                                                       │   │
│  │     - iat: <= now() ✓                                                      │   │
│  │   • Extract: sub="u_123", role="DISPATCHER", companyId="c_456"            │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 4: Authorization Check                                               │   │
│  │   ───────────────────────────                                               │   │
│  │   • Route: /api/bids/* → allowed roles: [DISPATCHER]                       │   │
│  │   • User role: DISPATCHER ✓                                                │   │
│  │   • If denied: Return 403 Forbidden                                        │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 5: WAF Inspection                                                    │   │
│  │   ──────────────────────                                                    │   │
│  │   • Check for SQL injection patterns                                       │   │
│  │   • Check for XSS patterns                                                 │   │
│  │   • Validate request size                                                  │   │
│  │   • If threat detected: Return 403 + Log security event                    │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 6: Forward to Service                                                │   │
│  │   ───────────────────────────                                               │   │
│  │   • mTLS connection to bidding-service.domain.svc:8080                     │   │
│  │   • Headers added:                                                          │   │
│  │     X-User-ID: u_123                                                       │   │
│  │     X-User-Role: DISPATCHER                                                │   │
│  │     X-Company-ID: c_456                                                    │   │
│  │     X-Request-ID: req-abc-123                                              │   │
│  │                                                                               │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│  Data Stores Accessed:                                                              │
│  • Redis (D4) - Rate limit counters                                                 │
│  • JWKS Cache - Public keys for JWT validation                                      │
│                                                                                      │
│  Audit Log Written:                                                                 │
│  • Timestamp, Request-ID, Method, Path, User-ID, IP, Result                         │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### P3: Pricing Service Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          P3: PRICING SERVICE DATA FLOW                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                               │   │
│  │   Input Event: order.created                                                 │   │
│  │   ────────────────────────────                                               │   │
│  │   {                                                                          │   │
│  │     "eventId": "evt-123",                                                   │   │
│  │     "eventType": "order.created",                                           │   │
│  │     "timestamp": "2026-04-18T10:30:00Z",                                    │   │
│  │     "data": {                                                                │   │
│  │       "orderId": "ord_789",                                                 │   │
│  │       "shipperId": "s_001",                                                 │   │
│  │       "route": { "from": "Berlin", "to": "Munich" },                        │   │
│  │       "cargo": { "weight": 5000, "type": "general" },                       │   │
│  │       "requirements": { "hazmat": false, "temperature": null }              │   │
│  │     }                                                                        │   │
│  │   }                                                                          │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   ┌──────────────────────────────────────────────────────────────────────┐  │   │
│  │   │                     PROCESSING STEPS                                  │  │   │
│  │   └──────────────────────────────────────────────────────────────────────┘  │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 1: Load Security Config                                              │   │
│  │   ─────────────────────────────                                             │   │
│  │   • Check local cache for config version                                    │   │
│  │   • If stale: Fetch from Security-Config-Service                           │   │
│  │   • Current config: v2026-04-18-01                                         │   │
│  │   • Contains: fraud weights, thresholds, rate limits                       │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 2: Calculate Base Price                                              │   │
│  │   ────────────────────────────                                              │   │
│  │   • Distance: Berlin → Munich = 585 km                                     │   │
│  │   • Base rate: €1.50/km                                                    │   │
│  │   • Weight factor: 5000kg = 1.2x                                           │   │
│  │   • Base price: 585 × 1.50 × 1.2 = €1053                                   │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 3: Fraud Score Calculation                                           │   │
│  │   ─────────────────────────────                                             │   │
│  │   • Load carrier risk score from Risk Service                              │   │
│  │   • Calculate transaction risk:                                             │   │
│  │     - Amount: €1053 (medium) → +5                                          │   │
│  │     - Route: domestic → +0                                                 │   │
│  │     - Cargo type: general → +0                                             │   │
│  │   • Combined score: User(15) × 0.4 + Company(10) × 0.3 + TX(5) × 0.3       │   │
│  │   • Result: 6 + 3 + 1.5 = 10.5 → GREEN                                     │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 4: Store Price Calculation                                           │   │
│  │   ─────────────────────────────                                             │   │
│  │   • Insert into pricing_calculations table                                  │   │
│  │   • Store: orderId, basePrice, fraudScore, configVersion                   │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 5: Emit pricing.calculated Event                                     │   │
│  │   ─────────────────────────────────────                                     │   │
│  │   {                                                                          │   │
│  │     "eventId": "evt-124",                                                   │   │
│  │     "eventType": "pricing.calculated",                                      │   │
│  │     "timestamp": "2026-04-18T10:30:01Z",                                    │   │
│  │     "data": {                                                                │   │
│  │       "orderId": "ord_789",                                                 │   │
│  │       "basePrice": 1053,                                                    │   │
│  │       "fraudScore": 10.5,                                                   │   │
│  │       "fraudLevel": "GREEN",                                                │   │
│  │       "configVersion": "v2026-04-18-01"                                    │   │
│  │     }                                                                        │   │
│  │   }                                                                          │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 6: Write Audit Log                                                   │   │
│  │   ─────────────────────────                                                 │   │
│  │   • Event: PRICING_CALCULATED                                              │   │
│  │   • Fields: orderId, price, fraudScore, configVersion, timestamp           │   │
│  │                                                                               │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│  Data Stores Accessed:                                                              │
│  • PostgreSQL (D2) - Pricing calculations                                           │
│  • Security Config Cache - Fraud config                                             │
│  • Kafka (D1) - Events in/out                                                       │
│  • Elasticsearch (D3) - Audit logs                                                  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### P5: Matching Service Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          P5: MATCHING SERVICE DATA FLOW                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                               │   │
│  │   Input: Multiple bid.validated Events                                       │   │
│  │   ─────────────────────────────────────                                       │   │
│  │   Event 1: { carrierId: "c_001", bid: 980, fraudScore: 12 }                 │   │
│  │   Event 2: { carrierId: "c_002", bid: 1050, fraudScore: 25 }                │   │
│  │   Event 3: { carrierId: "c_003", bid: 950, fraudScore: 45 }                 │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   ┌──────────────────────────────────────────────────────────────────────┐  │   │
│  │   │                     MATCHING ALGORITHM                                │  │   │
│  │   └──────────────────────────────────────────────────────────────────────┘  │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 1: Load Fraud Config                                                  │   │
│  │   ─────────────────────────────                                              │   │
│  │   • Weights: carrierScore=0.6, bidScore=0.4                                 │   │
│  │   • Penalty factor: 0.5 for fraudScore > 30                                 │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 2: Calculate Matching Score for Each Bid                              │   │
│  │   ─────────────────────────────────────────────                              │   │
│  │                                                                               │   │
│  │   Carrier c_001:                                                             │   │
│  │   • Bid price: 980 (best price)                                             │   │
│  │   • Fraud score: 12 (GREEN)                                                 │   │
│  │   • Carrier rating: 4.8/5                                                   │   │
│  │   • Matching score: 0.6 × (1 - 12/100) + 0.4 × priceScore = 0.53 + 0.4      │   │
│  │   • Final: 0.93 (no penalty)                                                │   │
│  │                                                                               │   │
│  │   Carrier c_002:                                                             │   │
│  │   • Bid price: 1050                                                         │   │
│  │   • Fraud score: 25 (GREEN/YELLOW boundary)                                 │   │
│  │   • Carrier rating: 4.5/5                                                   │   │
│  │   • Matching score: 0.6 × (1 - 25/100) + 0.3 × priceScore = 0.45 + 0.3      │   │
│  │   • Final: 0.75                                                              │   │
│  │                                                                               │   │
│  │   Carrier c_003:                                                             │   │
│  │   • Bid price: 950 (lowest)                                                 │   │
│  │   • Fraud score: 45 (YELLOW)                                                │   │
│  │   • Carrier rating: 3.9/5                                                   │   │
│  │   • Base matching score: 0.6 × (1 - 45/100) + 0.4 × priceScore              │   │
│  │   • Fraud penalty applied: score × 0.5                                      │   │
│  │   • Final: 0.33 (penalized)                                                 │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 3: Rank and Select                                                    │   │
│  │   ────────────────────────                                                   │   │
│  │   1. c_001: 0.93 ✓ SELECTED                                                 │   │
│  │   2. c_002: 0.75                                                            │   │
│  │   3. c_003: 0.33 (fraud penalty)                                            │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 4: Emit matching.completed Event                                      │   │
│  │   ──────────────────────────────────────                                     │   │
│  │   {                                                                          │   │
│  │     "eventId": "evt-125",                                                   │   │
│  │     "eventType": "matching.completed",                                       │   │
│  │     "timestamp": "2026-04-18T10:31:00Z",                                    │   │
│  │     "data": {                                                                │   │
│  │       "orderId": "ord_789",                                                 │   │
│  │       "selectedCarrierId": "c_001",                                         │   │
│  │       "winningBid": 980,                                                     │   │
│  │       "matchingScore": 0.93,                                                 │   │
│  │       "fraudPenaltyApplied": [],                                            │   │
│  │       "allBids": [                                                           │   │
│  │         { "carrierId": "c_001", "score": 0.93, "status": "SELECTED" },      │   │
│  │         { "carrierId": "c_002", "score": 0.75, "status": "REJECTED" },      │   │
│  │         { "carrierId": "c_003", "score": 0.33, "status": "REJECTED",        │   │
│  │           "penaltyReason": "FRAUD_PENALTY" }                                 │   │
│  │       ],                                                                     │   │
│  │       "configVersion": "v2026-04-18-01"                                     │   │
│  │     }                                                                        │   │
│  │   }                                                                          │   │
│  │                            │                                                 │   │
│  │                            ▼                                                 │   │
│  │                                                                               │   │
│  │   Step 5: Write Audit Log                                                    │   │
│  │   ────────────────────────                                                   │   │
│  │   • Event: MATCHING_COMPLETED                                               │   │
│  │   • Full bid ranking stored                                                 │   │
│  │   • Fraud penalties documented                                               │   │
│  │                                                                               │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│  Data Stores Accessed:                                                              │
│  • PostgreSQL (D2) - Matching results                                               │
│  • Kafka (D1) - Events in/out                                                       │
│  • Elasticsearch (D3) - Audit logs                                                  │
│  • Security Config Cache - Fraud config                                             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## L.4 Data Stores Summary

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          DATA STORES SUMMARY                                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │ D1: KAFKA / NATS EVENT BROKER                                                 │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │ Type: Event Stream                                                            │  │
│  │ Topics: order.created, pricing.calculated, bid.validated, matching.completed │  │
│  │ Retention: 7 days (events), 30 days (audit)                                   │  │
│  │ Security: ACLs, mTLS, Message Signing                                         │  │
│  │ Access: All domain services (read/write per ACL)                              │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │ D2: POSTGRESQL (PRIMARY DATABASE)                                             │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │ Type: Relational Database                                                     │  │
│  │ Schema: Orders, Bids, Transports, Users, Companies, Carriers, Vehicles       │  │
│  │ Retention: Indefinite (with archival)                                         │  │
│  │ Security: TLS, Row-Level Security, Encryption at Rest                         │  │
│  │ Access: Domain services via connection pool                                   │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │ D3: ELASTICSEARCH (AUDIT LOG STORE)                                           │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │ Type: Search Engine + Log Store                                               │  │
│  │ Indices: audit-events-*, security-events-*, analytics-*                      │  │
│  │ Retention: 5 years (audit), 2 years (analytics)                               │  │
│  │ Security: WORM mode, Hash chain, RBAC                                         │  │
│  │ Access: Audit service (write), Admin/Compliance (read)                        │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │ D4: REDIS (CACHE & RATE LIMITS)                                               │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │ Type: In-Memory Cache                                                         │  │
│  │ Keys: rate_limit:*, session:*, cache:*, config:*                             │  │
│  │ Retention: Varies (seconds to hours)                                          │  │
│  │ Security: TLS, AUTH, ACL                                                      │  │
│  │ Access: API Gateway (rate limits), Services (cache)                           │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │ D5: SECURITY CONFIG STORE (Git/S3)                                            │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │ Type: Versioned Configuration                                                 │  │
│  │ Content: RBAC rules, ABAC policies, Fraud config, Rate limits                │  │
│  │ Retention: Indefinite (versioned)                                             │  │
│  │ Security: Signed commits, 4-eyes approval, Audit trail                        │  │
│  │ Access: Security-Config-Service (read), Admin UI (write with approval)        │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │ D6: S3 / MINIO (DOCUMENT STORAGE)                                             │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │ Type: Object Storage                                                          │  │
│  │ Content: POD images, Signatures, KYC documents, Vehicle documents            │  │
│  │ Retention: 7 years (legal documents), 1 year (POD images)                     │  │
│  │ Security: Encryption at rest, Presigned URLs, Access logging                 │  │
│  │ Access: Execution Service (write), Admin/Compliance (read)                    │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## L.5 Trust Boundary Crossing Summary

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          TRUST BOUNDARY CROSSINGS                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │ BOUNDARY 1: INTERNET → API GATEWAY                                            │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │ Data Crossing: HTTP Requests, JWT Tokens                                      │  │
│  │ Protection: TLS 1.3, WAF, DDoS Protection, Rate Limiting                      │  │
│  │ Validation: JWT signature, Claims, Token revocation check                     │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │ BOUNDARY 2: API GATEWAY → DOMAIN SERVICES                                     │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │ Data Crossing: Internal HTTP, Service JWTs                                    │  │
│  │ Protection: mTLS, NetworkPolicies, Service Mesh                               │  │
│  │ Validation: Service identity, Request signing                                 │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │ BOUNDARY 3: DOMAIN SERVICES → CORE SERVICES                                   │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │ Data Crossing: Config requests, Auth tokens                                   │  │
│  │ Protection: mTLS, Service JWT, RBAC                                           │  │
│  │ Validation: Service permissions, Rate limits                                  │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │ BOUNDARY 4: SERVICES → DATA STORES                                            │  │
│  ├───────────────────────────────────────────────────────────────────────────────┤  │
│  │ Data Crossing: SQL queries, Events, Documents                                 │  │
│  │ Protection: TLS, Encryption at Rest, Private Network                          │  │
│  │ Validation: Connection auth, Query logging, Access control                    │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

**Document Status:** ✅ Production-Ready  
**Next Review:** 2026-07-18  
**Approval:** Security Architecture Team
