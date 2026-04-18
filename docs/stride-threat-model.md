# CargoBit Security Threat Model (STRIDE)

> **Version:** 1.0.0  
> **Status:** Production-Ready  
> **Last Updated:** 2026-04-18  
> **Owner:** Security Architecture Team  
> **Methodology:** STRIDE (Microsoft Threat Modeling)

---

## K.1 Komponenten im Scope

### Architecture Components

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          CARGOBIT THREAT MODEL SCOPE                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   EXTERNAL ENTITIES                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  • Shipper App / Web Client                                                  │   │
│   │  • Carrier App / Web Client                                                  │   │
│   │  • Driver App (Mobile)                                                       │   │
│   │  • Partner APIs (Insurance, Ads)                                            │   │
│   │  • Admin Portal                                                              │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│   INFRASTRUCTURE COMPONENTS                                                         │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  • API Gateway (Kong/Envoy)                                                 │   │
│   │  • Auth Service (Keycloak/Auth0)                                            │   │
│   │  • Security-Config-Service                                                  │   │
│   │  • Kafka / NATS Event Broker                                                │   │
│   │  • Audit-Log-Store (Elasticsearch)                                          │   │
│   │  • PostgreSQL Databases                                                     │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│   DOMAIN SERVICES                                                                   │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  • Order Service                                                            │   │
│   │  • Pricing Service                                                          │   │
│   │  • Bidding Service                                                          │   │
│   │  • Matching Service                                                         │   │
│   │  • Execution Service                                                        │   │
│   │  • Risk Service                                                             │   │
│   │  • Carrier Service                                                          │   │
│   │  • Notification Service                                                     │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
│   DATA STORES                                                                       │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  • PostgreSQL (Primary Database)                                            │   │
│   │  • Redis (Cache/Rate Limits)                                                │   │
│   │  • Elasticsearch (Audit Logs)                                               │   │
│   │  • S3 / MinIO (Document Storage)                                            │   │
│   │  • Kafka (Event Store)                                                      │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          TRUST BOUNDARIES                                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   [TB1] INTERNET TRUST BOUNDARY                                                     │
│   ────────────────────────────────                                                  │
│   External Clients (Shipper/Carrier Apps) ←→ API Gateway                            │
│   Risk Level: HIGH (Untrusted)                                                      │
│   Controls: TLS 1.3, WAF, DDoS Protection, JWT Validation                           │
│                                                                                      │
│   [TB2] DMZ TRUST BOUNDARY                                                          │
│   ────────────────────────────────                                                  │
│   API Gateway ←→ Domain Services                                                    │
│   Risk Level: MEDIUM (Semi-Trusted)                                                 │
│   Controls: mTLS, NetworkPolicies, Service Mesh                                     │
│                                                                                      │
│   [TB3] INTERNAL TRUST BOUNDARY                                                     │
│   ────────────────────────────────                                                  │
│   Domain Services ←→ Core Services                                                  │
│   Risk Level: LOW (Trusted)                                                         │
│   Controls: Service JWT, mTLS, RBAC                                                 │
│                                                                                      │
│   [TB4] DATA TRUST BOUNDARY                                                         │
│   ────────────────────────────────                                                  │
│   All Services ←→ Data Stores                                                       │
│   Risk Level: CRITICAL (Highly Sensitive)                                           │
│   Controls: Encryption, Private Network, Access Control                             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## K.2 STRIDE Threat Analysis per Component

### STRIDE Overview

| Letter | Threat Category | Description |
|--------|-----------------|-------------|
| **S** | Spoofing | Impersonating something or someone else |
| **T** | Tampering | Modifying data or code |
| **R** | Repudiation | Claiming to have not performed an action |
| **I** | Information Disclosure | Exposing information to unauthorized parties |
| **D** | Denial of Service | Deny or degrade service to users |
| **E** | Elevation of Privilege | Gain capabilities without proper authorization |

---

## 1. API Gateway

### Threat Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY THREAT ANALYSIS                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ S – SPOOFING                                                                 │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                              │    │
│  │  THREAT: Angreifer gibt sich als legitimer Carrier/Shipper aus             │    │
│  │                                                                              │    │
│  │  Attack Vectors:                                                            │    │
│  │  • Stolen JWT tokens                                                        │    │
│  │  • Session hijacking                                                        │    │
│  │  • Man-in-the-middle attacks                                                │    │
│  │  • Compromised service accounts                                             │    │
│  │                                                                              │    │
│  │  MITIGATIONS:                                                                │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ JWT Validation                                                   │    │    │
│  │  │    • Verify iss (issuer) matches expected value                     │    │    │
│  │  │    • Verify aud (audience) matches API identifier                   │    │    │
│  │  │    • Verify exp (expiration) - reject expired tokens                │    │    │
│  │  │    • Verify iat (issued at) - reject future tokens                  │    │    │
│  │  │    • Check jti (JWT ID) against revocation list                     │    │    │
│  │  │    • Algorithm: RS256 (asymmetric, not HS256)                       │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ mTLS Downstream                                                  │    │    │
│  │  │    • Require client certificates for all backend calls             │    │    │
│  │  │    • Verify certificate against internal CA                         │    │    │
│  │  │    • Certificate rotation every 24 hours                            │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Service Accounts with Short-Lived Tokens                         │    │    │
│  │  │    • Max token lifetime: 5 minutes                                  │    │    │
│  │  │    • Automatic rotation via Vault                                   │    │    │
│  │  │    • Service identity embedded in token                             │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Additional Controls                                               │    │    │
│  │  │    • IP reputation check (threat intelligence)                      │    │    │
│  │  │    • Device fingerprinting                                          │    │    │
│  │  │    • MFA for sensitive operations                                   │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                              │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  │                                                                              │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ T – TAMPERING                                                                │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                              │    │
│  │  THREAT: Manipulation von Requests in Transit                               │    │
│  │                                                                              │    │
│  │  Attack Vectors:                                                            │    │
│  │  • Request modification (price, amount, recipient)                          │    │
│  │  • Header injection                                                         │    │
│  │  • Parameter tampering                                                      │    │
│  │  • Replay attacks                                                           │    │
│  │                                                                              │    │
│  │  MITIGATIONS:                                                                │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ TLS 1.3 Enforcement                                               │    │    │
│  │  │    • Minimum TLS version: 1.2 (with approved ciphers)               │    │    │
│  │  │    • Preferred: TLS 1.3                                              │    │    │
│  │  │    • Cipher suites: AES-256-GCM, ChaCha20-Poly1305                  │    │    │
│  │  │    • HSTS enabled (max-age=31536000)                                 │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ WAF (Web Application Firewall)                                    │    │    │
│  │  │    • OWASP Core Rule Set                                             │    │    │
│  │  │    • SQL Injection detection                                         │    │    │
│  │  │    • XSS detection                                                   │    │    │
│  │  │    • Path traversal prevention                                       │    │    │
│  │  │    • Request size limits                                             │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Request Signing (Optional, for High-Value Transactions)           │    │    │
│  │  │    • HMAC-SHA256 signature in X-Signature header                     │    │    │
│  │  │    • Timestamp in signature to prevent replay                        │    │    │
│  │  │    • Nonce for uniqueness                                            │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                              │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  │                                                                              │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ R – REPUDIATION                                                              │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                              │    │
│  │  THREAT: Carrier bestreitet, ein Bid abgegeben zu haben                    │    │
│  │                                                                              │    │
│  │  Attack Vectors:                                                            │    │
│  │  • Denial of performing critical action                                     │    │
│  │  • Claiming account was compromised                                         │    │
│  │  • Disputing transaction authorization                                      │    │
│  │                                                                              │    │
│  │  MITIGATIONS:                                                                │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Audit Logs (WORM Storage)                                         │    │    │
│  │  │    • Every action logged with:                                       │    │    │
│  │  │      - User ID, Role, IP address                                     │    │    │
│  │  │      - Timestamp (with NTP sync)                                     │    │    │
│  │  │      - Action type, Resource ID                                      │    │    │
│  │  │      - Request/Response hash                                         │    │    │
│  │  │    • Immutable storage (WORM)                                        │    │    │
│  │  │    • Hash chain for integrity                                        │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Correlation IDs                                                   │    │    │
│  │  │    • Unique ID per request (X-Request-ID)                           │    │    │
│  │  │    • Propagated across all services                                 │    │    │
│  │  │    • Included in all log entries                                    │    │    │
│  │  │    • Enables end-to-end tracing                                     │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Digital Signatures for High-Value Actions                         │    │    │
│  │  │    • User must sign critical actions (payout, contract)             │    │    │
│  │  │    • Signature stored with audit log                                │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                              │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  │                                                                              │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ I – INFORMATION DISCLOSURE                                                   │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                              │    │
│  │  THREAT: Leakage sensibler Informationen über Fehlermeldungen              │    │
│  │                                                                              │    │
│  │  Attack Vectors:                                                            │    │
│  │  • Stack traces in error responses                                          │    │
│  │  • Database errors exposing schema                                          │    │
│  │  • Verbose error messages                                                   │    │
│  │  • Debug information leakage                                                │    │
│  │                                                                              │    │
│  │  MITIGATIONS:                                                                │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Generic Error Messages                                            │    │    │
│  │  │    • Production: Generic messages only                               │    │    │
│  │  │      Example: "An error occurred. Please try again."                │    │    │
│  │  │    • Error ID for support reference                                  │    │    │
│  │  │    • Detailed errors only in logs                                    │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ No Stack Traces in Responses                                      │    │    │
│  │  │    • Global error handler strips stack traces                       │    │    │
│  │  │    • Debug mode disabled in production                               │    │    │
│  │  │    • Environment variable check                                      │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Response Filtering                                                │    │    │
│  │  │    • Remove sensitive headers (X-Powered-By, Server)                │    │    │
│  │  │    • Filter internal IPs from responses                             │    │    │
│  │  │    • PII masking in error messages                                  │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                              │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  │                                                                              │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ D – DENIAL OF SERVICE                                                        │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                              │    │
│  │  THREAT: Bid-Flooding oder API-Überlastung                                  │    │
│  │                                                                              │    │
│  │  Attack Vectors:                                                            │    │
│  │  • High-volume request floods                                               │    │
│  │  • Slowloris attacks                                                        │    │
│  │  • Resource exhaustion                                                      │    │
│  │  • Amplification attacks                                                    │    │
│  │                                                                              │    │
│  │  MITIGATIONS:                                                                │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Rate Limits per Sub (User)                                        │    │    │
│  │  │    • Default: 100 req/sec per user                                  │    │    │
│  │  │    • Burst: 200 requests                                            │    │    │
│  │  │    • Sensitive endpoints: 5 req/min (login, payout)                 │    │    │
│  │  │    • Redis-backed distributed rate limiting                         │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ IP-Based Throttling                                               │    │    │
│  │  │    • Anonymous IPs: 20 req/min                                      │    │    │
│  │  │    • Known IPs: 500 req/min                                         │    │    │
│  │  │    • Automatic block for abusive IPs                                │    │    │
│  │  │    • Geo-blocking for high-risk countries                           │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ DDoS Protection                                                   │    │    │
│  │  │    • CloudFlare Enterprise                                          │    │    │
│  │  │    • Auto-scaling infrastructure                                    │    │    │
│  │  │    • Circuit breaker pattern                                        │    │    │
│  │  │    • Health check endpoints                                         │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                              │    │
│  │  RESIDUAL RISK: MEDIUM (sophisticated DDoS still possible)                  │    │
│  │                                                                              │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ E – ELEVATION OF PRIVILEGE                                                   │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                              │    │
│  │  THREAT: Carrier ruft Shipper-Endpoints auf                                │    │
│  │                                                                              │    │
│  │  Attack Vectors:                                                            │    │
│  │  • Role manipulation in JWT                                                 │    │
│  │  • Horizontal privilege escalation                                          │    │
│  │  • Vertical privilege escalation                                            │    │
│  │  • Bypassing authorization checks                                           │    │
│  │                                                                              │    │
│  │  MITIGATIONS:                                                                │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Role-Based Routing                                                │    │    │
│  │  │    • Routes mapped to allowed roles                                 │    │    │
│  │  │      /api/admin/* → ADMIN only                                      │    │    │
│  │  │      /api/transports/* → SHIPPER, DISPATCHER, DRIVER                │    │    │
│  │  │      /api/offers/* → DISPATCHER, SHIPPER                            │    │    │
│  │  │    • Gateway-level enforcement before reaching services              │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Authorization at Gateway                                          │    │    │
│  │  │    • OPA (Open Policy Agent) integration                            │    │    │
│  │  │    • Policy decisions at edge                                       │    │    │
│  │  │    • Central policy management                                      │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Defense in Depth                                                  │    │    │
│  │  │    • Gateway: Role check                                            │    │    │
│  │  │    • Service: ABAC check (ownership, attributes)                    │    │    │
│  │  │    • Database: Row-Level Security                                   │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                              │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  │                                                                              │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### API Gateway Threat Summary

| STRIDE | Threat | Risk Before | Risk After | Residual |
|--------|--------|-------------|------------|----------|
| S | Identity Spoofing | HIGH | LOW | LOW |
| T | Request Tampering | HIGH | LOW | LOW |
| R | Action Repudiation | MEDIUM | LOW | LOW |
| I | Information Disclosure | MEDIUM | LOW | LOW |
| D | Denial of Service | HIGH | MEDIUM | MEDIUM |
| E | Privilege Elevation | HIGH | LOW | LOW |

---

## 2. Security-Config-Service

### Threat Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                     SECURITY-CONFIG-SERVICE THREAT ANALYSIS                          │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ S – SPOOFING                                                                 │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                              │    │
│  │  THREAT: Unautorisierter Zugriff auf Security-Config                       │    │
│  │                                                                              │    │
│  │  Attack Vectors:                                                            │    │
│  │  • Impersonating a legitimate service                                       │    │
│  │  • Using stolen service credentials                                         │    │
│  │  • Exploiting misconfigured network policies                               │    │
│  │                                                                              │    │
│  │  MITIGATIONS:                                                                │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ mTLS (Mutual TLS)                                                │    │    │
│  │  │    • All clients must present valid certificate                    │    │    │
│  │  │    • Certificates issued by internal CA                            │    │    │
│  │  │    • CN contains service identity                                  │    │    │
│  │  │    • Certificate revocation checking (CRL/OCSP)                    │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Service-to-Service Authentication                                 │    │    │
│  │  │    • JWT with service identity claims                               │    │    │
│  │  │    • Short-lived tokens (max 5 minutes)                             │    │    │
│  │  │    • Token rotation via HashiCorp Vault                             │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ RBAC Enforcement                                                  │    │    │
│  │  │    • Only ADMIN and SYSTEM roles can access                         │    │    │
│  │  │    • Read vs Write separation                                       │    │    │
│  │  │    • Approval workflow for changes                                  │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                              │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  │                                                                              │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ T – TAMPERING                                                                │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                              │    │
│  │  THREAT: Manipulation der Fraud-Config                                      │    │
│  │                                                                              │    │
│  │  Attack Vectors:                                                            │    │
│  │  • Modifying fraud weights to bypass detection                             │    │
│  │  • Lowering thresholds to allow fraud                                       │    │
│  │  • Disabling security rules                                                 │    │
│  │  • Injecting malicious rules                                                │    │
│  │                                                                              │    │
│  │  MITIGATIONS:                                                                │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Git-Backed Immutable History                                      │    │    │
│  │  │    • All configs stored in Git                                      │    │    │
│  │  │    • Commit history preserved                                       │    │    │
│  │  │    • No force-push allowed                                          │    │    │
│  │  │    • Signed commits required                                        │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ JSON Schema Validation                                            │    │    │
│  │  │    • Strict schema enforcement                                      │    │    │
│  │  │    • Cross-field validation (weights sum to 1.0)                    │    │    │
│  │  │    • Business rule validation                                       │    │    │
│  │  │    • No unknown fields allowed                                      │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ 4-Eyes Approval Workflow                                          │    │    │
│  │  │    • Changes require approval from 2 different admins               │    │    │
│  │  │    • Approver cannot be same as submitter                           │    │    │
│  │  │    • Dry-run before approval                                        │    │    │
│  │  │    • Slack notification of pending approvals                        │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                              │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  │                                                                              │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ R – REPUDIATION                                                              │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                              │    │
│  │  THREAT: Admin bestreitet Änderung an Config                               │    │
│  │                                                                              │    │
│  │  MITIGATIONS:                                                                │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Audit Log with Diff                                               │    │    │
│  │  │    • Full before/after diff for every change                        │    │    │
│  │  │    • Actor ID (who made the change)                                  │    │    │
│  │  │    • Timestamp and IP address                                        │    │    │
│  │  │    • Approval chain recorded                                         │    │    │
│  │  │    • Immutable storage (WORM)                                        │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                              │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  │                                                                              │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ I – INFORMATION DISCLOSURE                                                   │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                              │    │
│  │  THREAT: Leakage von Fraud-Regeln an Angreifer                             │    │
│  │                                                                              │    │
│  │  MITIGATIONS:                                                                │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Private Network Only                                              │    │    │
│  │  │    • No external ingress                                            │    │    │
│  │  │    • Only accessible from cluster-internal services                 │    │    │
│  │  │    • NetworkPolicy restricts access                                 │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ No External Ingress                                               │    │    │
│  │  │    • Service type: ClusterIP only                                   │    │    │
│  │  │    • No LoadBalancer or NodePort                                    │    │    │
│  │  │    • Access only via API Gateway (for admin UI)                     │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                              │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  │                                                                              │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ D – DENIAL OF SERVICE                                                        │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                              │    │
│  │  THREAT: Config-Service down → Pricing/Matching blockiert                  │    │
│  │                                                                              │    │
│  │  MITIGATIONS:                                                                │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Local Cache in Each Service                                       │    │    │
│  │  │    • Each service caches config locally                             │    │    │
│  │  │    • Cache TTL: 30 seconds                                          │    │    │
│  │  │    • Background refresh                                             │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Circuit Breaker                                                   │    │    │
│  │  │    • Fail fast when config service unreachable                      │    │    │
│  │  │    • Fallback to cached config                                      │    │    │
│  │  │    • Automatic recovery when service returns                        │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Fallback Mode                                                     │    │    │
│  │  │    • "Last Known Good" config used on failure                       │    │    │
│  │  │    • Graceful degradation                                           │    │    │
│  │  │    • Alerting on fallback activation                                │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                              │    │
│  │  RESIDUAL RISK: LOW (with fallback)                                          │    │
│  │                                                                              │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ E – ELEVATION OF PRIVILEGE                                                   │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                              │    │
│  │  THREAT: Service lädt manipulierte Config                                   │    │
│  │                                                                              │    │
│  │  MITIGATIONS:                                                                │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Strict Schema Validation                                          │    │    │
│  │  │    • Config rejected if schema validation fails                     │    │    │
│  │  │    • No partial updates allowed                                     │    │    │
│  │  │    • Atomic config replacement                                      │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │    │
│  │  │ ✅ Signature Verification                                            │    │    │
│  │  │    • Config signed by approved admin                                │    │    │
│  │  │    • Signature verified before loading                              │    │    │
│  │  │    • Rejection of unsigned configs                                  │    │    │
│  │  └────────────────────────────────────────────────────────────────────┘    │    │
│  │                                                                              │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  │                                                                              │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Security-Config-Service Threat Summary

| STRIDE | Threat | Risk Before | Risk After | Residual |
|--------|--------|-------------|------------|----------|
| S | Unauthorized Access | HIGH | LOW | LOW |
| T | Config Manipulation | CRITICAL | LOW | LOW |
| R | Change Repudiation | MEDIUM | LOW | LOW |
| I | Rule Leakage | MEDIUM | LOW | LOW |
| D | Service Unavailability | HIGH | LOW | LOW |
| E | Malicious Config Load | CRITICAL | LOW | LOW |

---

## 3. Pricing Service

### Threat Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        PRICING SERVICE THREAT ANALYSIS                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ S – SPOOFING                                                                 │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Fake Carrier versucht Bid-Validation                              │    │
│  │  MITIGATIONS: JWT + mTLS authentication                                     │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ T – TAMPERING                                                                │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Manipulation von Pricing-Inputs                                    │    │
│  │  MITIGATIONS: Input validation, Audit logs                                  │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ R – REPUDIATION                                                              │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Carrier bestreitet Fraud-Score                                     │    │
│  │  MITIGATIONS: Audit-Log mit fraudScore + configVersion                      │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ I – INFORMATION DISCLOSURE                                                   │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Preis-Leaks an nicht-berechtigte User                              │    │
│  │  MITIGATIONS: ABAC - only shipper sees pricing                              │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ D – DENIAL OF SERVICE                                                        │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Pricing Service überlastet                                         │    │
│  │  MITIGATIONS: HPA, Caching, Circuit-Breaker                                 │    │
│  │  RESIDUAL RISK: MEDIUM                                                       │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ E – ELEVATION OF PRIVILEGE                                                   │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Carrier versucht Fraud-Penalty zu umgehen                          │    │
│  │  MITIGATIONS: Fraud-Score server-side only, tamper-proof                    │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Matching Service

### Threat Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        MATCHING SERVICE THREAT ANALYSIS                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ S – SPOOFING                                                                 │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Fake Events in Kafka injected                                      │    │
│  │  MITIGATIONS: Kafka ACLs, mTLS for producers                                │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ T – TAMPERING                                                                │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Manipulation von Matching-Scores                                   │    │
│  │  MITIGATIONS: Audit logs, Config version pinned                             │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ R – REPUDIATION                                                              │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Carrier bestreitet Matching-Ergebnis                               │    │
│  │  MITIGATIONS: Matching-Audit mit allen Inputs                               │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ I – INFORMATION DISCLOSURE                                                   │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Bids anderer Carrier sichtbar                                      │    │
│  │  MITIGATIONS: ABAC - carrierId == subjectId                                 │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ D – DENIAL OF SERVICE                                                        │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Matching Service stuck                                              │    │
│  │  MITIGATIONS: Worker autoscaling, Lag alerts                                │    │
│  │  RESIDUAL RISK: MEDIUM                                                       │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ E – ELEVATION OF PRIVILEGE                                                   │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Carrier versucht Score zu erhöhen                                  │    │
│  │  MITIGATIONS: Fraud-Penalty server-side, nicht umgehbar                     │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Audit-Log-Store

### Threat Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        AUDIT-LOG-STORE THREAT ANALYSIS                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ S – SPOOFING                                                                 │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Fake Audit Entries eingeschleust                                   │    │
│  │  MITIGATIONS: mTLS, Signed events from services                             │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ T – TAMPERING                                                                │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Manipulation von bestehenden Logs                                  │    │
│  │  MITIGATIONS: WORM storage, Append-only, Hash chain                         │    │
│  │  RESIDUAL RISK: VERY LOW                                                     │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ R – REPUDIATION                                                              │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Logs missing for critical event                                    │    │
│  │  MITIGATIONS: Log integrity checks, Hash verification                       │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ I – INFORMATION DISCLOSURE                                                   │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Sensitive Data in Logs (PII)                                       │    │
│  │  MITIGATIONS: PII-scrubbing, Field masking                                  │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ D – DENIAL OF SERVICE                                                        │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Log Store full                                                      │    │
│  │  MITIGATIONS: Retention policies, Auto-deletion                             │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │ E – ELEVATION OF PRIVILEGE                                                   │    │
│  ├─────────────────────────────────────────────────────────────────────────────┤    │
│  │  THREAT: Unauthorized log access                                            │    │
│  │  MITIGATIONS: RBAC + ABAC for log queries                                   │    │
│  │  RESIDUAL RISK: LOW                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## K.3 Consolidated Threat Summary

### Risk Matrix All Components

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          CONSOLIDATED RISK MATRIX                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │ Component          │   S   │   T   │   R   │   I   │   D   │   E   │ Overall │  │
│  ├────────────────────┼───────┼───────┼───────┼───────┼───────┼───────┼─────────┤  │
│  │ API Gateway        │  LOW  │  LOW  │  LOW  │  LOW  │ MED   │  LOW  │   LOW   │  │
│  │ Security-Config    │  LOW  │  LOW  │  LOW  │  LOW  │  LOW  │  LOW  │   LOW   │  │
│  │ Pricing Service    │  LOW  │  LOW  │  LOW  │  LOW  │ MED   │  LOW  │   LOW   │  │
│  │ Matching Service   │  LOW  │  LOW  │  LOW  │  LOW  │ MED   │  LOW  │   LOW   │  │
│  │ Execution Service  │  LOW  │  LOW  │  LOW  │  LOW  │ MED   │  LOW  │   LOW   │  │
│  │ Audit-Log-Store    │  LOW  │ V.LOW │  LOW  │  LOW  │  LOW  │  LOW  │   LOW   │  │
│  │ Kafka/NATS         │  LOW  │  LOW  │  LOW  │  LOW  │ MED   │  LOW  │   LOW   │  │
│  │ Databases          │  LOW  │  LOW  │  LOW  │  LOW  │  LOW  │  LOW  │   LOW   │  │
│  │ External Clients   │ HIGH  │ MED   │ MED   │ MED   │ HIGH  │ HIGH  │  HIGH   │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
│  Legend: V.LOW = Very Low, LOW, MED = Medium, HIGH                                  │
│                                                                                      │
│  KEY FINDINGS:                                                                       │
│  ────────────────────────────────────────────────────────────────────────────────   │
│  1. External Clients remain the highest risk area (untrusted zone)                  │
│  2. All internal components have LOW residual risk after mitigations                │
│  3. DoS remains MEDIUM risk for several services (inherent to distributed systems)  │
│  4. Audit-Log-Store has strongest protections (WORM, hash chain)                    │
│  5. Security-Config-Service has comprehensive controls (4-eyes, signing)            │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Top 10 Critical Controls

| Rank | Control | Component | Threats Mitigated |
|------|---------|-----------|-------------------|
| 1 | JWT Validation (RS256) | API Gateway | S, E |
| 2 | mTLS Service Mesh | All Services | S, T, I |
| 3 | WORM Audit Logs | Audit-Log-Store | T, R |
| 4 | 4-Eyes Approval | Security-Config | T, E |
| 5 | Rate Limiting | API Gateway | D |
| 6 | ABAC Policies | Domain Services | I, E |
| 7 | Config Signing | Security-Config | T, E |
| 8 | Local Cache + Fallback | Domain Services | D |
| 9 | Kafka ACLs | Kafka | S, T |
| 10 | PII Scrubbing | Audit-Log-Store | I |

---

## K.4 Threat Modeling Review Schedule

| Review Type | Frequency | Participants |
|-------------|-----------|--------------|
| Full STRIDE Review | Quarterly | Security Team + Architects |
| New Feature Review | Per Release | Security Champion |
| Incident Post-Mortem | Per Incident | Incident Team |
| Control Validation | Monthly | Security Team |
| External Audit | Annually | External Auditors |

---

**Document Status:** ✅ Production-Ready  
**Next Review:** 2026-07-18  
**Approval:** Security Architecture Board
