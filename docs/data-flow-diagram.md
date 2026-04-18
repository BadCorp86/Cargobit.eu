# Data Flow Diagram (DFD)

**CargoBit Transport Platform**  
**Version:** 1.0  
**Classification:** Internal – Architecture Team  
**Last Updated:** 2025-01-15

---

## 1. Overview

This document provides a comprehensive Data Flow Diagram (DFD) for the CargoBit Transport Platform. The DFD visualizes how data moves through the system, identifies trust boundaries, and documents data transformations at each processing step. This analysis supports security reviews, compliance audits, and system documentation.

### DFD Levels

| Level | Scope | Purpose |
|-------|-------|---------|
| Level-0 | Context Diagram | System boundary and external entities |
| Level-1 | Main Processes | Core data flows and transformations |
| Level-2 | Detailed Processes | Sub-process details where needed |

---

## 2. Level-0: Context Diagram

The Level-0 DFD shows the CargoBit Platform as a single process with its external entities and data flows.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌─────────────┐                                                          │
│   │   Shipper   │                                                          │
│   │  (External) │                                                          │
│   └──────┬──────┘                                                          │
│          │                                                                  │
│          │ Orders, Quotes, Tracking                                        │
│          ▼                                                                  │
│   ┌──────────────────────────────────────────────────────────────────┐    │
│   │                                                                  │    │
│   │                     CARGOBIT TRANSPORT PLATFORM                  │    │
│   │                           (Process 0)                            │    │
│   │                                                                  │    │
│   │  ┌─────────────────────────────────────────────────────────┐   │    │
│   │  │ • Order Management                                       │   │    │
│   │  │ • Pricing & Fraud Detection                             │   │    │
│   │  │ • Carrier Matching                                       │   │    │
│   │  │ • Execution & Tracking                                   │   │    │
│   │  │ • Notifications                                          │   │    │
│   │  └─────────────────────────────────────────────────────────┘   │    │
│   │                                                                  │    │
│   └──────────────────────────────┬───────────────────────────────────┘    │
│                                  │                                          │
│          ┌───────────────────────┼───────────────────────┐                │
│          │                       │                       │                 │
│          ▼                       ▼                       ▼                 │
│   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐          │
│   │   Carrier   │        │   Payment   │        │   External  │          │
│   │  (External) │        │  Provider   │        │    Maps     │          │
│   └─────────────┘        │  (External) │        │  (External) │          │
│                          └─────────────┘        └─────────────┘          │
│                                                                             │
│   Data Flows:                                                               │
│   ──────────                                                                │
│   Shipper → Platform: Orders, Quote Requests, Tracking Queries             │
│   Platform → Shipper: Quotes, Order Confirmations, Status Updates          │
│   Carrier → Platform: Bids, Availability, Location Updates                 │
│   Platform → Carrier: Match Requests, Shipment Details, Payments           │
│   Platform → Payment: Payment Requests, Refunds                            │
│   Payment → Platform: Payment Confirmations, Failures                      │
│   Platform → Maps: Geocoding, Route Optimization                           │
│   Maps → Platform: Coordinates, Distance, ETA                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### External Entities

| Entity | Type | Description | Trust Level |
|--------|------|-------------|-------------|
| Shipper | Human/User | Business customers creating shipments | Untrusted (Authenticated) |
| Carrier | Human/User | Transportation providers accepting loads | Untrusted (Authenticated) |
| Payment Provider | System | External payment processing (Stripe, etc.) | Trusted (mTLS) |
| Maps Service | System | External geocoding and routing (Google Maps, etc.) | Trusted (API Key) |
| Admin User | Human | Platform administrators | Trusted (MFA, Privileged) |

---

## 3. Level-1: Main Data Flow Diagram

The Level-1 DFD breaks down the platform into its core processes and shows data flow between them.

```
                                    EXTERNAL ENTITIES
                                    ─────────────────
    
    ┌──────────┐                                      ┌──────────┐
    │ Shipper  │                                      │ Carrier  │
    │  (E1)    │                                      │  (E2)    │
    └────┬─────┘                                      └────┬─────┘
         │                                                  │
         │ 1. Create Order                                  │ 14. Submit Bid
         │ 2. Request Quote                                 │ 15. Update Location
         │ 3. Track Shipment                                │ 16. Confirm Pickup/Delivery
         │                                                  │
         ▼                                                  ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                         TRUST BOUNDARY 1                            │
    │                        (Internet / WAF / DDoS)                      │
    └──────────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   ┌─────────────────────────────────────────────────────────────┐  │
    │   │                    API GATEWAY (P1)                         │  │
    │   │                                                             │  │
    │   │  • JWT Validation      • Rate Limiting                     │  │
    │   │  • RBAC Authorization  • Request Routing                    │  │
    │   │  • Input Validation    • Audit Logging                      │  │
    │   └──────────────────────────┬──────────────────────────────────┘  │
    │                              │                                     │
    │         ┌────────────────────┼────────────────────┐                │
    │         │                    │                    │                │
    │         ▼                    ▼                    ▼                │
    │   ┌───────────┐       ┌───────────┐       ┌───────────┐          │
    │   │   Auth    │       │ Security  │       │  Audit    │          │
    │   │  Service  │       │  Config   │       │   Log     │          │
    │   │  (P2)     │       │ Service   │       │  Store    │          │
    │   └───────────┘       │  (P3)     │       │  (D8)     │          │
    │         │             └───────────┘       └───────────┘          │
    │         │                   │                   ▲                 │
    │         │ 4. Validate       │ 5. Get Config     │ 17. Log Events  │
    │         │    Token          │    Rules          │                 │
    │         │                   │                   │                 │
    │   ┌─────────────────────────────────────────────────────────────┐ │
    │   │              TRUST BOUNDARY 2                               │ │
    │   │         (Service Mesh / mTLS / NetworkPolicies)             │ │
    │   └──────────────────────────┬──────────────────────────────────┘ │
    │                              │                                    │
    │         ┌────────────────────┼────────────────────┐               │
    │         │                    │                    │               │
    │         ▼                    ▼                    ▼               │
    │   ┌───────────┐       ┌───────────┐       ┌───────────┐         │
    │   │  Order    │       │  Pricing  │       │   Risk    │         │
    │   │  Service  │       │  Service  │       │  Service  │         │
    │   │  (P4)     │       │  (P5)     │       │  (P6)     │         │
    │   └─────┬─────┘       └─────┬─────┘       └───────────┘         │
    │         │                   │                                    │
    │         │ 6. Create         │ 7. Calculate Price                 │
    │         │    Order          │    + Fraud Score                   │
    │         │                   │                                    │
    │         │             ┌─────┴─────┐                              │
    │         │             │           │                              │
    │         │             ▼           ▼                              │
    │         │      ┌───────────────────────┐                         │
    │         │      │       Kafka (D1)      │                         │
    │         │      │   Event Streaming     │                         │
    │         │      └───────────┬───────────┘                         │
    │         │                  │                                     │
    │         │         8. Order │Created Event                        │
    │         │                  │                                     │
    │         │                  ▼                                     │
    │         │          ┌───────────┐                                 │
    │         │          │ Matching  │                                 │
    │         │          │ Service   │                                 │
    │         │          │  (P7)     │                                 │
    │         │          └─────┬─────┘                                 │
    │         │                │                                       │
    │         │       9. Match │Created Event                          │
    │         │                │                                       │
    │         │                ▼                                       │
    │         │         ┌───────────┐                                  │
    │         │         │ Execution │                                  │
    │         │         │ Service   │                                  │
    │         │         │  (P8)     │                                  │
    │         │         └─────┬─────┘                                  │
    │         │               │                                        │
    │         │      10. Status│Update Event                           │
    │         │               │                                        │
    │         │               ▼                                        │
    │         │        ┌───────────┐                                   │
    │         │        │Notification│                                  │
    │         │        │ Service   │                                  │
    │         │        │  (P9)     │                                  │
    │         │        └───────────┘                                   │
    │         │                                                        │
    │         └────────────────────────────────────────────────────────┤
    │                                                                  │
    │                    DATA STORES                                   │
    │                    ────────────                                  │
    │                                                                  │
    │   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   │
    │   │ D2  │   │ D3  │   │ D4  │   │ D5  │   │ D6  │   │ D7  │   │
    │   │Order│   │Price│   │Bid  │   │Match│   │Exec │   │Risk │   │
    │   │ DB  │   │ DB  │   │ DB  │   │ DB  │   │ DB  │   │ DB  │   │
    │   └─────┘   └─────┘   └─────┘   └─────┘   └─────┘   └─────┘   │
    │                                                                  │
    └─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Process Descriptions

### P1: API Gateway

**Purpose:** Single entry point for all external API requests, providing authentication, authorization, and routing.

| ID | Process Step | Input | Output | Security Controls |
|----|--------------|-------|--------|-------------------|
| P1.1 | Receive Request | HTTP Request | Validated Request | TLS, WAF |
| P1.2 | JWT Validation | JWT Token | User Context | Signature verification, expiration check |
| P1.3 | RBAC Check | User Context, Endpoint | Access Decision | Role-based authorization |
| P1.4 | Rate Limiting | Client ID, Request | Allow/Deny | Token bucket algorithm |
| P1.5 | Request Routing | Validated Request | Service Request | Service mesh routing |
| P1.6 | Audit Logging | Request Context | Audit Entry | WORM storage, correlation ID |

### P2: Auth Service

**Purpose:** Identity management, token issuance, and session handling.

| ID | Process Step | Input | Output | Security Controls |
|----|--------------|-------|--------|-------------------|
| P2.1 | Authenticate | Credentials | Auth Result | MFA, brute force protection |
| P2.2 | Issue Token | User Identity | JWT Token | RS256 signing, short expiry |
| P2.3 | Refresh Token | Refresh Token | New Access Token | Token rotation, binding |
| P2.4 | Logout | Token ID | Token Blacklisted | Redis blacklist |

### P3: Security Config Service

**Purpose:** Centralized security configuration management.

| ID | Process Step | Input | Output | Security Controls |
|----|--------------|-------|--------|-------------------|
| P3.1 | Get Config | Config Key | Config Value | mTLS, caching |
| P3.2 | Update Config | Config Change | Updated Config | 4-eyes approval, signing |
| P3.3 | Validate Config | Config Data | Validation Result | Schema validation |

### P4: Order Service

**Purpose:** Order lifecycle management.

| ID | Process Step | Input | Output | Security Controls |
|----|--------------|-------|--------|-------------------|
| P4.1 | Create Order | Order Data | Order ID | Input validation, tenant isolation |
| P4.2 | Validate Order | Order Data | Validation Result | Schema validation, business rules |
| P4.3 | Publish Event | Order Created | Kafka Event | Event signing |
| P4.4 | Update Status | Status Change | Updated Order | State machine validation |

### P5: Pricing Service

**Purpose:** Dynamic pricing calculation and fraud detection.

| ID | Process Step | Input | Output | Security Controls |
|----|--------------|-------|--------|-------------------|
| P5.1 | Calculate Price | Order Details | Price Quote | Server-side calculation |
| P5.2 | Apply Discounts | Quote, Rules | Final Price | Rule validation |
| P5.3 | Fraud Score | Order Context | Fraud Score | ML model, thresholds |
| P5.4 | Risk Alert | High Score | Alert Event | Threshold-based alerts |

### P6: Risk Service

**Purpose:** Risk assessment and mitigation for orders and carriers.

| ID | Process Step | Input | Output | Security Controls |
|----|--------------|-------|--------|-------------------|
| P6.1 | Assess Risk | Order/Carrier Data | Risk Score | ML model |
| P6.2 | Flag Suspicious | Risk Score | Flag Event | Threshold-based |
| P6.3 | Generate Report | Risk Data | Risk Report | Data aggregation |

### P7: Matching Service

**Purpose:** Match shipments with available carriers.

| ID | Process Step | Input | Output | Security Controls |
|----|--------------|-------|--------|-------------------|
| P7.1 | Find Carriers | Order, Location | Carrier List | Geographic query |
| P7.2 | Score Matches | Carriers, Order | Ranked List | Scoring algorithm |
| P7.3 | Send Match Request | Carrier, Order | Match Request | Rate limiting |
| P7.4 | Confirm Match | Carrier Response | Match Confirmed | Idempotency check |

### P8: Execution Service

**Purpose:** Track and manage shipment execution.

| ID | Process Step | Input | Output | Security Controls |
|----|--------------|-------|--------|-------------------|
| P8.1 | Track Shipment | Location Update | Tracking Record | Carrier verification |
| P8.2 | Update Status | Status Event | Updated Execution | State validation |
| P8.3 | Handle Exception | Exception Event | Resolution Action | Escalation rules |
| P8.4 | Complete Shipment | Delivery Confirmation | Final Status | POD verification |

### P9: Notification Service

**Purpose:** Send notifications to users and external systems.

| ID | Process Step | Input | Output | Security Controls |
|----|--------------|-------|--------|-------------------|
| P9.1 | Queue Notification | Event | Notification Task | Priority queuing |
| P9.2 | Send Email | Email Data | Email Sent | Template validation |
| P9.3 | Send SMS | SMS Data | SMS Sent | Rate limiting |
| P9.4 | Send Push | Push Data | Push Sent | Device verification |

---

## 5. Data Store Descriptions

### D1: Kafka (Event Streaming)

| Attribute | Value |
|-----------|-------|
| Type | Message Broker |
| Technology | Apache Kafka |
| Data Classification | Internal |
| Retention | 7 days (default), 30 days (audit topics) |
| Encryption | At rest (AES-256), In transit (TLS) |
| Access Control | ACLs per service, Schema Registry |

**Topics:**
| Topic | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| `orders.created` | Order Service | Pricing, Matching | New order events |
| `orders.updated` | Order Service | Notification, Execution | Order status changes |
| `pricing.calculated` | Pricing Service | Order, Risk | Price quotes |
| `matches.created` | Matching Service | Execution, Carrier | Match events |
| `execution.updated` | Execution Service | Notification, Order | Tracking updates |
| `audit.events` | All Services | Audit Log Store | Compliance audit trail |

### D2: Order Database

| Attribute | Value |
|-----------|-------|
| Type | Relational Database |
| Technology | PostgreSQL |
| Data Classification | Confidential |
| Encryption | At rest (AES-256), In transit (TLS) |
| Access Control | Service account, Row-level security |
| Backup | Daily, 30-day retention |

**Schema (Simplified):**
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    shipper_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    origin JSONB NOT NULL,
    destination JSONB NOT NULL,
    price DECIMAL(10,2),
    fraud_score DECIMAL(3,2),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

### D3: Pricing Database

| Attribute | Value |
|-----------|-------|
| Type | Relational Database |
| Technology | PostgreSQL |
| Data Classification | Confidential |
| Encryption | At rest (AES-256), In transit (TLS) |
| Access Control | Service account only |

**Key Tables:**
- `price_quotes` - Quote history and calculations
- `pricing_rules` - Dynamic pricing configuration
- `discount_codes` - Valid discount codes and usage

### D4: Bidding Database

| Attribute | Value |
|-----------|-------|
| Type | Relational Database |
| Technology | PostgreSQL |
| Data Classification | Confidential |
| Encryption | At rest (AES-256), In transit (TLS) |

**Key Tables:**
- `bids` - Carrier bid submissions
- `bid_history` - Historical bid data for analytics
- `carrier_preferences` - Carrier matching preferences

### D5: Matching Database

| Attribute | Value |
|-----------|-------|
| Type | Relational Database |
| Technology | PostgreSQL |
| Data Classification | Confidential |
| Encryption | At rest (AES-256), In transit (TLS) |

**Key Tables:**
- `matches` - Confirmed matches
- `match_scores` - Scoring history
- `carrier_availability` - Real-time availability

### D6: Execution Database

| Attribute | Value |
|-----------|-------|
| Type | Relational Database |
| Technology | PostgreSQL |
| Data Classification | Confidential |
| Encryption | At rest (AES-256), In transit (TLS) |

**Key Tables:**
- `executions` - Shipment execution records
- `tracking_events` - Location and status history
- `proof_of_delivery` - POD documents

### D7: Risk Database

| Attribute | Value |
|-----------|-------|
| Type | Relational Database |
| Technology | PostgreSQL |
| Data Classification | Confidential |
| Encryption | At rest (AES-256), In transit (TLS) |

**Key Tables:**
- `risk_assessments` - Risk score history
- `flagged_entities` - Flagged shippers/carriers
- `fraud_patterns` - Known fraud patterns

### D8: Audit Log Store

| Attribute | Value |
|-----------|-------|
| Type | Object Storage |
| Technology | S3 with Object Lock |
| Data Classification | Critical / Compliance |
| Retention | 7 years (compliance requirement) |
| Encryption | At rest (KMS), In transit (TLS) |
| Immutability | WORM (Write Once Read Many) |

**Structure:**
```
s3://audit-logs/
├── year=2025/
│   ├── month=01/
│   │   ├── day=15/
│   │   │   ├── api-gateway-20250115.jsonl.gz
│   │   │   ├── order-service-20250115.jsonl.gz
│   │   │   └── ...
```

---

## 6. Trust Boundaries

### Trust Boundary 1: External Network

**Location:** Between external entities and API Gateway

| Control | Implementation |
|---------|----------------|
| Encryption | TLS 1.2+ mandatory |
| DDoS Protection | Cloudflare / WAF |
| Authentication | JWT required for all endpoints |
| Rate Limiting | Per IP and per user |
| Input Validation | WAF rules, schema validation |

### Trust Boundary 2: Service Mesh

**Location:** Between services within the cluster

| Control | Implementation |
|---------|----------------|
| Encryption | mTLS (Istio / Linkerd) |
| Authentication | Service identity (SPIFFE) |
| Authorization | NetworkPolicies, Service RBAC |
| Observability | Distributed tracing, metrics |

### Trust Boundary 3: Data Layer

**Location:** Between services and databases

| Control | Implementation |
|---------|----------------|
| Encryption | TLS to database, encryption at rest |
| Authentication | Service accounts, certificate auth |
| Authorization | Least privilege, schema separation |
| Auditing | Query logging, data access audit |

---

## 7. Data Flow Details

### Flow 1: Order Creation

```
Shipper → API Gateway → Order Service → Pricing Service → Kafka → Matching Service

1. Shipper sends POST /api/v1/orders
   - Data: {origin, destination, cargo_details}
   - Headers: Authorization: Bearer <JWT>
   
2. API Gateway validates:
   - JWT signature and expiration
   - User has "shipper" role
   - Rate limit not exceeded
   - Request size within limits
   
3. Order Service creates order:
   - Validates input schema
   - Creates order with status "pending"
   - Stores in Order DB (D2)
   - Publishes "orders.created" event to Kafka
   
4. Pricing Service calculates:
   - Consumes "orders.created" event
   - Calculates base price
   - Applies dynamic pricing rules
   - Calculates fraud score
   - Publishes "pricing.calculated" event
   
5. Matching Service initiates:
   - Consumes "pricing.calculated" event
   - Queries available carriers
   - Scores and ranks carriers
   - Sends match requests
```

### Flow 2: Carrier Matching

```
Carrier → API Gateway → Matching Service → Execution Service → Notification Service

1. Carrier sends GET /api/v1/matches/available
   - Headers: Authorization: Bearer <JWT>
   
2. API Gateway validates:
   - Carrier authentication
   - "carrier" role present
   
3. Matching Service returns available matches:
   - Queries matches near carrier location
   - Filters by carrier preferences
   - Returns ranked list
   
4. Carrier accepts match:
   - POST /api/v1/matches/{id}/accept
   - Matching Service updates status
   - Publishes "matches.created" event
   
5. Execution Service:
   - Creates execution record
   - Initializes tracking
   - Publishes "execution.updated" event
   
6. Notification Service:
   - Notifies shipper of match
   - Sends carrier contact details
```

### Flow 3: Shipment Tracking

```
Carrier → API Gateway → Execution Service → Kafka → Notification Service → Shipper

1. Carrier sends location update:
   - POST /api/v1/tracking/location
   - Data: {latitude, longitude, timestamp}
   
2. API Gateway validates:
   - Carrier authentication
   - Location data validity
   - Rate limit (10 updates/min)
   
3. Execution Service:
   - Validates against route
   - Stores tracking event (D6)
   - Publishes "execution.updated" event
   
4. Notification Service:
   - Determines notification rules
   - Sends push notification to shipper
   - Updates real-time dashboard
```

---

## 8. Security Annotations

### Sensitive Data in Transit

| Data Type | Flow | Protection |
|-----------|------|------------|
| Credentials | Shipper → Gateway | TLS, MFA |
| JWT Tokens | All flows | Short-lived, RS256 |
| Payment Data | Platform → Payment Provider | PCI-DSS compliant |
| PII | All internal flows | Encrypted, minimal logging |
| Location Data | Carrier → Execution | TLS, pseudonymization option |

### Data Transformation Points

| Point | Input | Output | Transformation |
|-------|-------|--------|----------------|
| API Gateway | Raw request | Sanitized request | Header stripping, input sanitization |
| Pricing Service | Order details | Price + Fraud Score | ML inference, rule application |
| Matching Service | Order + Carriers | Ranked matches | Scoring algorithm |
| Audit Log Store | Events | Compressed logs | PII scrubbing, compression |

---

## 9. Compliance Mapping

### ISO 27001

| Control | DFD Coverage |
|---------|--------------|
| A.8.2.1 (Classification) | Data stores labeled with classification |
| A.9.4.1 (Access Restriction) | Trust boundaries with access controls |
| A.10.1.1 (Encryption) | TLS/mTLS on all data flows |
| A.12.4.1 (Event Logging) | All events flow to Audit Log Store |
| A.13.1.1 (Network Controls) | Trust boundaries documented |

### SOC2

| Trust Service Criteria | DFD Coverage |
|------------------------|--------------|
| CC6.1 (Logical Access) | Authentication at all entry points |
| CC6.6 (Transmission) | Encryption on all data flows |
| CC6.7 (Protection) | Data classification per store |
| CC7.2 (Monitoring) | Observability on all processes |
| CC8.1 (Change Management) | Config service for changes |

---

## 10. Document Control

| Attribute | Value |
|-----------|-------|
| Owner | Architecture Team |
| Reviewers | Security Team, DevOps Team |
| Version | 1.0 |
| Last Updated | 2025-01-15 |
| Next Review | 2025-04-15 |

---

**Related Documents:**
- Security Architecture Diagram
- STRIDE Threat Model
- Compliance Mapping
- Network Architecture
