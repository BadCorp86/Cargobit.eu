# CargoBit Security Architecture Diagram

> **Version:** 1.0.0  
> **Status:** Production-Ready  
> **Last Updated:** 2026-04-18  
> **Owner:** Security Architecture Team

---

## H.1 High-Level Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL ACCESS LAYER                                   │
│  ┌─────────────────────────────┐     ┌─────────────────────────────┐               │
│  │      Shipper App / Web      │     │      Carrier App / Web      │               │
│  │  (React Native / Next.js)   │     │  (React Native / Next.js)   │               │
│  └─────────────────────────────┘     └─────────────────────────────┘               │
│                               │                    │                                 │
│                               └────────┬───────────┘                                 │
│                                        │                                             │
│                               HTTPS (TLS 1.3) + JWT                                 │
│                                        │                                             │
└────────────────────────────────────────┼─────────────────────────────────────────────┘
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY LAYER (core namespace)                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                          Kong / Envoy Gateway                                │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │   │
│  │  │ JWT AuthN    │ │ Rate Limit   │ │ WAF Rules    │ │ Routing      │        │   │
│  │  │ Validation   │ │ per Endpoint │ │ Injection    │ │ Layer 7      │        │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘        │   │
│  │                                                                              │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │   │
│  │  │ mTLS Client  │ │ Request/Resp │ │ Circuit      │ │ Audit Log    │        │   │
│  │  │ Cert Verify  │ │ Logging      │ │ Breaker      │ │ Streaming    │        │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                             │
│                               mTLS (Service Mesh)                                   │
│                                        │                                             │
└────────────────────────────────────────┼─────────────────────────────────────────────┘
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              DOMAIN SERVICES LAYER (domain namespace)                │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                              │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │   │
│  │   │   Order     │  │   Pricing   │  │   Bidding   │  │  Matching   │        │   │
│  │   │  Service    │  │  Service    │  │  Service    │  │  Service    │        │   │
│  │   │   :3001     │  │   :3002     │  │   :3003     │  │   :3004     │        │   │
│  │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │   │
│  │          │                │                │                │                │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │   │
│  │   │ Execution   │  │    Risk     │  │  Carrier    │  │ Notification│        │   │
│  │   │  Service    │  │  Service    │  │  Service    │  │  Service    │        │   │
│  │   │   :3005     │  │   :3006     │  │   :3007     │  │   :3008     │        │   │
│  │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │   │
│  │          │                │                │                │                │   │
│  │   ┌───────────────────────────────────────────────────────────────────┐     │   │
│  │   │              Security Config Client (Local Cache)                  │     │   │
│  │   │   - RBAC/ABAC Rules    - Fraud Scoring Config    - Rate Limits   │     │   │
│  │   │   - Hot Reload via WebSocket    - Graceful Degradation           │     │   │
│  │   └───────────────────────────────────────────────────────────────────┘     │   │
│  │                                                                              │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                             │
└────────────────────────────────────────┼─────────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────┼─────────────────────────────────────────────┐
│                              CORE SERVICES LAYER (core namespace)                    │
│                                        │                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                     Security-Config-Service (:3100)                          │   │
│  │  ┌───────────────────────────────────────────────────────────────────────┐  │   │
│  │  │  RBAC/ABAC Engine  │  Fraud Config  │  Rate Limits  │  Version Ctrl   │  │   │
│  │  └───────────────────────────────────────────────────────────────────────┘  │   │
│  │  Features:                                                                   │   │
│  │  • JSON Schema Validation (strict mode)                                     │   │
│  │  • Versioned Configs (YYYY-MM-DD-NN format)                                │   │
│  │  • Hot Reload via WebSocket (real-time push)                               │   │
│  │  • Audit Trail for all config changes                                       │   │
│  │  • Rollback capability (last 10 versions)                                  │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                   Auth / Identity Provider (:3200)                           │   │
│  │  ┌───────────────────────────────────────────────────────────────────────┐  │   │
│  │  │  Keycloak / Auth0  │  JWT Issuer  │  User Mgmt  │  Service Accounts   │  │   │
│  │  └───────────────────────────────────────────────────────────────────────┘  │   │
│  │  Features:                                                                   │   │
│  │  • JWT Token Issuance (RS256, 15min access, 7d refresh)                    │   │
│  │  • User & Service Account Management                                        │   │
│  │  • Role Assignment (ADMIN, SHIPPER, DISPATCHER, DRIVER, SUPPORT)          │   │
│  │  • MFA Support (TOTP, SMS)                                                  │   │
│  │  • Password Policies (min 12 chars, complexity, rotation)                  │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                             │
└────────────────────────────────────────┼─────────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────┼─────────────────────────────────────────────┐
│                              DATA LAYER (data namespace)                             │
│                                        │                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐   │
│  │   Audit Log Store     │  │    Kafka / NATS       │  │   PostgreSQL          │   │
│  │   (Append-Only)       │  │   Event Broker        │  │   (Primary DB)        │   │
│  │                       │  │                       │  │                       │   │
│  │  • WORM-capable       │  │  Topics:              │  │  • Orders             │   │
│  │  • Hash-chain         │  │  • order.created      │  │  • Bids               │   │
│  │  • 5-year retention   │  │  • pricing.calculated │  │  • Transports         │   │
│  │  • SIEM integration   │  │  • bid.validated      │  │  • Users              │   │
│  │  • Immutable          │  │  • matching.completed │  │  • Companies          │   │
│  │                       │  │  • execution.status   │  │  • Vehicles           │   │
│  │  Storage: Elasticsearch│  │  • fraud.detected    │  │  • Audit Events       │   │
│  │                       │  │  • risk.scored        │  │                       │   │
│  └───────────────────────┘  └───────────────────────┘  └───────────────────────┘   │
│                                        │                                             │
└────────────────────────────────────────┼─────────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────┼─────────────────────────────────────────────┐
│                              OBSERVABILITY LAYER                                    │
│                                        │                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐   │
│  │     Prometheus        │  │       Loki            │  │       Tempo           │   │
│  │     (Metrics)         │  │       (Logs)          │  │      (Tracing)        │   │
│  │                       │  │                       │  │                       │   │
│  │  • RED Metrics        │  │  • Structured JSON    │  │  • OpenTelemetry      │   │
│  │  • SLO Tracking       │  │  • Full-text Search   │  │  • Distributed Traces │   │
│  │  • Alerting Rules     │  │  • Log Aggregation    │  │  • Span Analysis      │   │
│  └───────────────────────┘  └───────────────────────┘  └───────────────────────┘   │
│                                        │                                             │
│                        ┌───────────────────────────────────┐                        │
│                        │           Grafana                 │                        │
│                        │    (Unified Dashboards & Alerts)  │                        │
│                        └───────────────────────────────────┘                        │
│                                                                                    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## H.2 Trust Boundaries

### Trust Boundary Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                      │
│   [INTERNET] ────────── BOUNDARY 1 ────────── [DMZ] ────── BOUNDARY 2 ────── [CORE] │
│                                                                                      │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │                         TRUST BOUNDARY MAP                                   │   │
│   ├─────────────────────────────────────────────────────────────────────────────┤   │
│   │                                                                              │   │
│   │  ┌────────────┐    B1     ┌────────────┐    B2     ┌────────────┐           │   │
│   │  │  INTERNET  │ ─────────▶│    DMZ     │ ─────────▶│   CLUSTER  │           │   │
│   │  │            │           │            │           │            │           │   │
│   │  │  Untrusted │           │  Gateway   │           │  Services  │           │   │
│   │  │  Zone      │           │  WAF       │           │  Databases │           │   │
│   │  └────────────┘           └────────────┘           └─────┬──────┘           │   │
│   │                                                        │                   │   │
│   │                                                       B3                   │   │
│   │                                                        │                   │   │
│   │  ┌────────────┐    B4     ┌────────────┐    ┌─────────▼──────┐            │   │
│   │  │   DATA     │ ◀─────────│   CORE     │    │    DOMAIN      │            │   │
│   │  │   LAYER    │           │  SERVICES  │◀───│   SERVICES     │            │   │
│   │  │            │           │            │    │                │            │   │
│   │  │ PostgreSQL │           │ Auth       │    │ Order, Pricing │            │   │
│   │  │ Kafka      │           │ Security   │    │ Matching, etc. │            │   │
│   │  │ Audit      │           │ Config     │    │                │            │   │
│   │  └────────────┘           └────────────┘    └────────────────┘            │   │
│   │                                                                              │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Boundary 1: Internet → API Gateway (DMZ)

| Aspect | Implementation |
|--------|----------------|
| **Trust Level** | Untrusted → Semi-Trusted |
| **Primary Controls** | TLS 1.3, WAF, DDoS Protection |
| **Authentication** | JWT Validation (RS256) |
| **Network** | Public IP, DNS, CDN |
| **Monitoring** | Full request logging, anomaly detection |

**Security Controls:**

```yaml
Boundary_1_Controls:
  TLS:
    version: "1.3"
    cipher_suites:
      - TLS_AES_256_GCM_SHA384
      - TLS_CHACHA20_POLY1305_SHA256
    certificate_validation: strict
    hsts: true
    hsts_max_age: 31536000
  
  WAF:
    enabled: true
    rules:
      - OWASP_Top_10
      - SQL_Injection
      - XSS_Prevention
      - Path_Traversal
      - Rate_Limiting
  
  DDoS:
    provider: CloudFlare
    mode: "under_attack" # auto-activate on threshold
    rate_limit:
      requests_per_second: 100
      burst: 200
  
  JWT_Validation:
    algorithm: RS256
    issuer: "https://auth.cargobit.com"
    audience: "cargobit-api"
    required_claims: [sub, role, iat, exp]
    clock_skew_seconds: 30
```

### Boundary 2: API Gateway → Domain Services

| Aspect | Implementation |
|--------|----------------|
| **Trust Level** | Semi-Trusted → Trusted |
| **Primary Controls** | mTLS, NetworkPolicies, Service Mesh |
| **Authentication** | Service-to-Service JWT (5min TTL) |
| **Network** | Private Kubernetes Network |
| **Monitoring** | mTLS certificate rotation, mesh metrics |

**Security Controls:**

```yaml
Boundary_2_Controls:
  mTLS:
    mode: STRICT
    certificate_rotation: 24h
    cipher_suites:
      - ECDHE-ECDSA-AES256-GCM-SHA384
      - ECDHE-RSA-AES256-GCM-SHA384
    client_certificate_required: true
  
  NetworkPolicies:
    default_deny: true
    ingress_rules:
      - from:
          namespace: core
          pod: api-gateway
        ports: [8080]
    egress_rules:
      - to:
          namespace: core
        ports: [3100, 3200]  # Security-Config, Auth
  
  Service_Mesh:
    provider: Istio
    mtls_mode: STRICT
    envoy_sidecar: true
    access_logging: true
```

### Boundary 3: Domain Services → Core Services

| Aspect | Implementation |
|--------|----------------|
| **Trust Level** | Trusted → Highly Trusted |
| **Primary Controls** | mTLS, RBAC, Audit Logging |
| **Authentication** | Service Account JWT + mTLS |
| **Network** | Isolated Namespace |
| **Monitoring** | All config access logged |

**Security Controls:**

```yaml
Boundary_3_Controls:
  Service_Auth:
    type: "service_jwt"
    issuer: "internal-service-mesh"
    ttl_seconds: 300
    required_claims: [service_name, namespace, instance_id]
  
  RBAC:
    enforcement: true
    config_source: security-config-service
    cache_ttl_seconds: 30
  
  Audit_Logging:
    enabled: true
    fields:
      - timestamp
      - service_name
      - action
      - resource
      - decision
      - reason
    destination: audit-log-store
```

### Boundary 4: Core Services → Data Layer

| Aspect | Implementation |
|--------|----------------|
| **Trust Level** | Highly Trusted → Critical |
| **Primary Controls** | Private Network, Encryption at Rest, WORM |
| **Authentication** | Database credentials + Vault |
| **Network** | Private Subnet Only |
| **Monitoring** | Query logging, anomaly detection |

**Security Controls:**

```yaml
Boundary_4_Controls:
  Network:
    private_subnet: true
    no_public_ip: true
    firewall_rules:
      - source: core namespace
        destination: data namespace
        ports: [5432, 9092, 9200]
  
  Encryption:
    at_rest:
      algorithm: AES-256-GCM
      key_rotation: 90d
    in_transit:
      tls: true
      verify_ca: true
  
  Audit_Store:
    type: WORM
    immutable: true
    hash_chain: true
    retention_years: 5
    siem_integration: Splunk
  
  Database:
    credential_source: HashiCorp_Vault
    rotation_days: 30
    connection_pooling: PgBouncer
    ssl_mode: verify-full
```

---

## H.3 Security Controls per Layer

### Layer 1: External Access (Internet)

| Control Category | Implementation | Responsible Team |
|-----------------|----------------|------------------|
| **TLS** | TLS 1.3 only, HSTS, Certificate Pinning | Platform Team |
| **WAF** | OWASP Top 10, Custom Rules | Security Team |
| **DDoS Protection** | CloudFlare Enterprise | Platform Team |
| **DNS Security** | DNSSEC, CAA Records | Platform Team |
| **CDN** | Signed URLs, Token Auth | Platform Team |

**WAF Rules Configuration:**

```yaml
WAF_Rules:
  OWASP_Core_Rule_Set:
    - id: 920100
      name: "Invalid HTTP Request Line"
      action: block
      
    - id: 932100
      name: "Remote Command Execution"
      action: block
      
    - id: 941100
      name: "XSS Attack Detection"
      action: block
      
    - id: 942100
      name: "SQL Injection Detection"
      action: block
  
  Custom_Rules:
    - id: CB001
      name: "Block known malicious IPs"
      type: ip_blocklist
      source: threat_intelligence_feed
      update_interval: 1h
      
    - id: CB002
      name: "Geo-blocking for high-risk countries"
      type: geo_block
      countries: [] # Configured via Security-Config-Service
      
    - id: CB003
      name: "Rate limit per API key"
      type: rate_limit
      threshold: 1000
      window: 60s
      action: throttle
```

### Layer 2: API Gateway

| Control Category | Implementation | Responsible Team |
|-----------------|----------------|------------------|
| **Authentication** | JWT RS256, Keycloak/Azure AD | Security Team |
| **Authorization** | Route-level RBAC | Security Team |
| **Rate Limiting** | Token Bucket, Per-User Limits | Platform Team |
| **Request Logging** | Structured JSON, PII Masking | Platform Team |
| **Circuit Breaker** | Hystrix Pattern, Auto-Recovery | Platform Team |
| **mTLS Downstream** | Istio Service Mesh | Platform Team |

**Gateway Configuration:**

```yaml
API_Gateway:
  Authentication:
    jwt:
      algorithm: RS256
      public_key_endpoint: https://auth.cargobit.com/.well-known/jwks.json
      issuer: https://auth.cargobit.com
      audience: cargobit-api
      
  Authorization:
    route_based:
      - path: /api/admin/*
        roles: [ADMIN]
      - path: /api/transports/*
        roles: [SHIPPER, DISPATCHER, DRIVER]
      - path: /api/offers/*
        roles: [DISPATCHER, SHIPPER]
      - path: /api/wallet/*
        roles: [SHIPPER, DISPATCHER, ADMIN]
        
  Rate_Limits:
    default:
      requests_per_second: 100
      burst: 200
    authenticated:
      requests_per_second: 500
      burst: 1000
    per_endpoint:
      /api/auth/login:
        requests_per_minute: 10
      /api/wallet/payout:
        requests_per_hour: 5
        
  Circuit_Breaker:
    enabled: true
    failure_threshold: 50
    recovery_timeout: 30s
    half_open_requests: 5
    
  Logging:
    format: json
    fields:
      - timestamp
      - request_id
      - method
      - path
      - status_code
      - latency_ms
      - user_id
      - ip_address
    sensitive_fields:
      - password
      - token
      - api_key
    masking: "[REDACTED]"
```

### Layer 3: Domain Services

| Control Category | Implementation | Responsible Team |
|-----------------|----------------|------------------|
| **Authorization** | RBAC + ABAC (via Security-Config-Client) | Backend Teams |
| **Fraud Detection** | Real-time Scoring, Pattern Analysis | Risk Team |
| **Audit Logging** | All State Changes, Security Events | All Teams |
| **Input Validation** | JSON Schema, Business Rules | Backend Teams |
| **Output Sanitization** | PII Masking, Field Filtering | Backend Teams |
| **Error Handling** | No Stack Traces, Generic Messages | Backend Teams |

**Domain Service Security Integration:**

```yaml
Domain_Service_Security:
  Config_Client:
    service_url: https://security-config-service.core.svc.cluster.local:3100
    cache_ttl_seconds: 30
    retry_attempts: 3
    timeout_ms: 5000
    fallback_mode: last_known_good
    
  Authorization:
    type: hybrid
    rbac:
      source: security-config-service
      cache: local
    abac:
      source: security-config-service
      attributes:
        - user.role
        - user.companyId
        - resource.ownerId
        - resource.status
        - context.region
        
  Fraud_Scoring:
    enabled: true
    triggers:
      - action: ACCEPT_OFFER
      - action: INITIATE_PAYOUT
      - action: CREATE_TRANSPORT
        amount_threshold: 10000
    thresholds:
      green: 0-30
      yellow: 31-60
      red: 61-100
    mitigations:
      yellow:
        - extra_logging
        - delay_payout_24h
        - notify_support
      red:
        - block_action
        - create_support_ticket
        - notify_compliance
        
  Audit_Logging:
    events:
      - AUTHZ_DECISION
      - FRAUD_SCORE_CALCULATED
      - MITIGATION_APPLIED
      - CONFIG_RELOAD
      - STATE_CHANGE
    format: json
    destination: kafka://audit-events
```

### Layer 4: Core Services

| Control Category | Implementation | Responsible Team |
|-----------------|----------------|------------------|
| **Config Validation** | JSON Schema (strict), Cross-Field | Security Team |
| **Version Control** | Semantic Versioning, GitOps | Platform Team |
| **Change Management** | Approval Workflow, Audit Trail | Security Team |
| **Hot Reload** | WebSocket Push, Graceful Degradation | Platform Team |
| **Secret Management** | HashiCorp Vault, Dynamic Secrets | Security Team |
| **Identity Provider** | Keycloak, MFA, Password Policies | Security Team |

**Security-Config-Service Controls:**

```yaml
Security_Config_Service:
  Validation:
    schema: /schemas/security-config.schema.json
    strict_mode: true
    cross_field_rules:
      - name: fraud_weights_sum
        check: "carrier_score_weights.sum == 1.0"
      - name: threshold_order
        check: "observe_threshold < suspect_threshold"
      - name: max_discount_sanity
        check: "max_discount_vs_market < 0.9"
        
  Versioning:
    format: "YYYY-MM-DD-NN"
    retention_versions: 10
    rollback_enabled: true
    changelog_required: true
    
  Change_Management:
    approval_required: true
    approver_roles: [ADMIN, SECURITY_ENGINEER]
    dry_run_available: true
    notification_channels: [slack, email]
    
  Hot_Reload:
    enabled: true
    protocol: WebSocket
    push_on_change: true
    heartbeat_interval: 30s
    reconnect_timeout: 60s
    
  Secrets:
    provider: HashiCorp_Vault
    dynamic_secrets:
      - database_credentials
      - service_tokens
    static_secrets:
      - encryption_keys
      - signing_keys
```

### Layer 5: Data Layer

| Control Category | Implementation | Responsible Team |
|-----------------|----------------|------------------|
| **Encryption at Rest** | AES-256, Key Rotation | Platform Team |
| **Encryption in Transit** | TLS 1.3, mTLS | Platform Team |
| **Access Control** | Database RBAC, Row-Level Security | DBA Team |
| **Audit Logging** | WORM Storage, Hash Chain | Security Team |
| **Backup/Restore** | Encrypted Backups, Point-in-Time Recovery | DBA Team |
| **Data Retention** | Automated Deletion, Legal Hold | Compliance Team |

**Data Layer Security Configuration:**

```yaml
Data_Layer_Security:
  PostgreSQL:
    encryption:
      at_rest: AES-256-GCM
      key_provider: HashiCorp_Vault
      key_rotation_days: 90
    tls:
      mode: verify-full
      certificate: internal-ca
    access_control:
      type: row_level_security
      policies:
        - name: company_isolation
          condition: "company_id = current_user_company_id()"
        - name: audit_immutable
          table: audit_logs
          operations: [INSERT, SELECT]
    backup:
      encryption: AES-256
      retention_days: 365
      point_in_time_recovery: true
      
  Kafka:
    encryption:
      in_transit: TLS_1.3
      at_rest: AES-256
    authorization:
      type: ACL
      principals:
        - service: order-service
          topics: [order.*]
          operations: [READ, WRITE]
        - service: audit-service
          topics: [audit.*]
          operations: [READ]
          
  Audit_Log_Store:
    type: Elasticsearch
    settings:
      index.read_only: true
      index.lifecycle.name: audit-policy
    immutability:
      enabled: true
      hash_chain: SHA-256
      verification: daily
    retention:
      default_years: 5
      legal_hold: indefinite
    siem:
      enabled: true
      destination: Splunk
      realtime: true
```

---

## H.4 Network Architecture

### Kubernetes Network Policies

```yaml
# Default deny all ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: default
spec:
  podSelector: {}
  policyTypes:
    - Ingress
---
# Allow only API Gateway to domain namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-gateway
  namespace: domain
spec:
  podSelector: {}
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: core
          podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - protocol: TCP
          port: 8080
---
# Allow domain services to core services
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-domain-to-core
  namespace: core
spec:
  podSelector: {}
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: domain
      ports:
        - protocol: TCP
          port: 3100  # security-config-service
        - protocol: TCP
          port: 3200  # auth-service
---
# Allow core services to data layer
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-core-to-data
  namespace: data
spec:
  podSelector: {}
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: core
        - namespaceSelector:
            matchLabels:
              name: domain
      ports:
        - protocol: TCP
          port: 5432  # PostgreSQL
        - protocol: TCP
          port: 9092  # Kafka
        - protocol: TCP
          port: 9200  # Elasticsearch
```

---

## H.5 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              AUTHENTICATION FLOW                                     │
│                                                                                      │
│  ┌─────────┐     1. Login Request      ┌─────────────┐                              │
│  │  User   │ ─────────────────────────▶│ Auth Service │                             │
│  │         │     (username, password)  │  (Keycloak) │                              │
│  │         │                           └──────┬──────┘                              │
│  │         │                                  │                                      │
│  │         │     2. Verify Credentials         │                                      │
│  │         │                           ┌──────▼──────┐                              │
│  │         │                           │  User Store │                              │
│  │         │                           │ (PostgreSQL)│                              │
│  │         │                           └──────┬──────┘                              │
│  │         │                                  │                                      │
│  │         │     3. Return User + Roles        │                                      │
│  │         │ ◀────────────────────────────────┘                                      │
│  │         │                                                                          │
│  │         │     4. Issue JWT                                                       │
│  │         │ ◀─────────────────────────────────────────────────────────────────────  │
│  │         │        { sub, role, companyId, exp, iat }                              │
│  │         │                                                                          │
│  │         │     5. API Request with JWT                                            │
│  │         │ ───────────────────────────────────────▶┌─────────────┐                │
│  │         │         Authorization: Bearer <jwt>     │ API Gateway │                │
│  │         │                                          └──────┬──────┘                │
│  │         │                                                 │                        │
│  │         │     6. Validate JWT (RS256)                    │                        │
│  │         │     7. Extract Role + Claims                   │                        │
│  │         │     8. Route to Service                        │                        │
│  │         │                                          ┌─────▼─────┐                  │
│  │         │                                          │  Domain   │                  │
│  │         │                                          │  Service  │                  │
│  │         │                                          └─────┬─────┘                  │
│  │         │                                                 │                        │
│  │         │     9. AuthZ Check (RBAC + ABAC)                │                        │
│  │         │     10. Execute Action                          │                        │
│  │         │     11. Return Response                         │                        │
│  │         │ ◀──────────────────────────────────────────────┘                        │
│  │         │                                                                          │
│  └─────────┘                                                                          │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## H.6 Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              AUTHORIZATION FLOW                                      │
│                                                                                      │
│  ┌─────────────┐     Request + JWT          ┌─────────────────────────────────────┐ │
│  │ API Gateway │ ─────────────────────────▶│          Domain Service              │ │
│  │             │                            │                                      │ │
│  │  Pass JWT   │                            │  1. Extract Claims from JWT          │ │
│  │  Claims     │                            │     { userId, role, companyId }      │ │
│  └─────────────┘                            │                                      │ │
│                                             │  2. Load Security Config (cached)    │ │
│                                             │     ┌────────────────────────────┐   │ │
│                                             │     │ Security-Config-Client     │   │ │
│                                             │     │                            │   │ │
│                                             │     │ - RBAC Rules               │   │ │
│                                             │     │ - ABAC Policies            │   │ │
│                                             │     │ - Fraud Config             │   │ │
│                                             │     │ - Rate Limits              │   │ │
│                                             │     └────────────────────────────┘   │ │
│                                             │                                      │ │
│                                             │  3. RBAC Check                       │ │
│                                             │     ┌────────────────────────────┐   │ │
│                                             │     │ Permission Matrix          │   │ │
│                                             │     │                            │   │ │
│                                             │     │ Role: SHIPPER              │   │ │
│                                             │     │ Action: ACCEPT_OFFER       │   │ │
│                                             │     │ Result: ALLOW ✓            │   │ │
│                                             │     └────────────────────────────┘   │ │
│                                             │                                      │ │
│                                             │  4. ABAC Check (if RBAC passes)      │ │
│                                             │     ┌────────────────────────────┐   │ │
│                                             │     │ Attribute Policies         │   │ │
│                                             │     │                            │   │ │
│                                             │     │ user.companyId ==          │   │ │
│                                             │     │   offer.targetCompanyId    │   │ │
│                                             │     │ Result: ALLOW ✓            │   │ │
│                                             │     └────────────────────────────┘   │ │
│                                             │                                      │ │
│                                             │  5. Fraud Score (if sensitive action)│ │
│                                             │     ┌────────────────────────────┐   │ │
│                                             │     │ Fraud Engine               │   │ │
│                                             │     │                            │   │ │
│                                             │     │ Score: 45 (YELLOW)         │   │ │
│                                             │     │ Mitigations:               │   │ │
│                                             │     │ - delay_payout_24h         │   │ │
│                                             │     │ - extra_logging            │   │ │
│                                             │     └────────────────────────────┘   │ │
│                                             │                                      │ │
│                                             │  6. Execute + Apply Mitigations      │ │
│                                             │                                      │ │
│                                             │  7. Audit Log                        │ │
│                                             │     { timestamp, userId, action,     │ │
│                                             │       resource, decision, reason }   │ │
│                                             │                                      │ │
│                                             └─────────────────────────────────────┘ │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## H.7 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW DIAGRAM                                       │
│                                                                                      │
│  EXTERNAL                                                                            │
│  ┌────────────┐                                                                      │
│  │  Shipper   │                                                                      │
│  │    App     │                                                                      │
│  └─────┬──────┘                                                                      │
│        │ 1. Create Transport Order                                                  │
│        ▼                                                                             │
│  ┌────────────┐     2. Validate + Route      ┌────────────┐                         │
│  │ API Gateway│ ───────────────────────────▶ │   Order    │                         │
│  │            │                              │  Service   │                         │
│  └────────────┘                              └─────┬──────┘                         │
│                                                    │ 3. Create Order Event          │
│                                                    ▼                                │
│                                              ┌────────────┐                         │
│                                              │   Kafka    │                         │
│                                              │ order.created                        │
│                                              └─────┬──────┘                         │
│                                                    │                                │
│        ┌───────────────────────────────────────────┼───────────────────────────┐   │
│        │                                           │                           │   │
│        ▼                                           ▼                           ▼   │
│  ┌────────────┐                              ┌────────────┐              ┌────────┐│
│  │  Pricing   │                              │   Risk     │              │ Audit  ││
│  │  Service   │                              │  Service   │              │ Service││
│  │            │                              │            │              │        ││
│  │ 4. Calc    │                              │ 5. Score   │              │ 6. Log ││
│  │   Price    │                              │   Risk     │              │ Event  ││
│  └─────┬──────┘                              └─────┬──────┘              └────────┘│
│        │                                           │                           │   │
│        │ 7. pricing.calculated                     │ 8. risk.scored            │   │
│        ▼                                           ▼                           │   │
│  ┌────────────┐                              ┌────────────┐                    │   │
│  │   Kafka    │                              │   Kafka    │                    │   │
│  └─────┬──────┘                              └─────┬──────┘                    │   │
│        │                                           │                           │   │
│        └───────────────────┬───────────────────────┘                           │   │
│                            │                                                   │   │
│                            ▼                                                   │   │
│                      ┌────────────┐                                            │   │
│                      │  Bidding   │                                            │   │
│                      │  Service   │                                            │   │
│                      │            │                                            │   │
│                      │ 9. Receive │                                            │   │
│                      │   Bids     │                                            │   │
│                      └─────┬──────┘                                            │   │
│                            │ 10. Validate Bids                                 │   │
│                            │     (Fraud Check)                                 │   │
│                            ▼                                                   │   │
│                      ┌────────────┐                                            │   │
│                      │  Matching  │                                            │   │
│                      │  Service   │                                            │   │
│                      │            │                                            │   │
│                      │ 11. Match  │                                            │   │
│                      │   Best Bid │                                            │   │
│                      └─────┬──────┘                                            │   │
│                            │                                                   │   │
│                            │ 12. matching.completed                            │   │
│                            ▼                                                   │   │
│                      ┌────────────┐                                            │   │
│                      │ Execution  │                                            │   │
│                      │  Service   │                                            │   │
│                      │            │                                            │   │
│                      │ 13. Assign │                                            │   │
│                      │   Driver   │                                            │   │
│                      │ 14. Track  │                                            │   │
│                      │   Status   │                                            │   │
│                      └─────┬──────┘                                            │   │
│                            │                                                   │   │
│                            │ 15. execution.status.changed                      │   │
│                            ▼                                                   │   │
│                      ┌────────────┐                                            │   │
│                      │Notification│                                            │   │
│                      │  Service   │                                            │   │
│                      │            │                                            │   │
│                      │ 16. Notify │                                            │   │
│                      │  Shipper   │                                            │   │
│                      │  Carrier   │                                            │   │
│                      └────────────┘                                            │   │
│                                                                                  │   │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │   │
│  │                              DATA PERSISTENCE                               │ │   │
│  │                                                                             │ │   │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                   │ │   │
│  │   │ PostgreSQL  │    │   Kafka     │    │ Elasticsearch│                   │ │   │
│  │   │             │    │   (Logs)    │    │ (Audit)      │                   │ │   │
│  │   │ Orders      │    │             │    │              │                   │ │   │
│  │   │ Bids        │    │ Event Store │    │ Search       │                   │ │   │
│  │   │ Transports  │    │             │    │ Analytics    │                   │ │   │
│  │   │ Users       │    │             │    │              │                   │ │   │
│  │   └─────────────┘    └─────────────┘    └─────────────┘                   │ │   │
│  │                                                                             │ │   │
│  └────────────────────────────────────────────────────────────────────────────┘ │   │
│                                                                                  │   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## H.8 Quick Reference Card

### Security Controls Summary

| Layer | Primary Controls | Key Technologies |
|-------|-----------------|------------------|
| External | TLS 1.3, WAF, DDoS | CloudFlare, AWS Shield |
| Gateway | JWT Auth, Rate Limit, mTLS | Kong/Istio |
| Domain | RBAC/ABAC, Fraud Scoring, Audit | Security-Config-Client |
| Core | Config Validation, Hot Reload | Security-Config-Service |
| Data | Encryption, WORM Audit, RLS | PostgreSQL, Kafka, Vault |

### Trust Boundaries Summary

| Boundary | From → To | Primary Protection |
|----------|-----------|-------------------|
| B1 | Internet → Gateway | TLS, WAF, DDoS |
| B2 | Gateway → Domain | mTLS, NetworkPolicy |
| B3 | Domain → Core | Service JWT, Audit |
| B4 | Core → Data | Private Network, Encryption |

### Key Contacts

| Role | Team | Contact |
|------|------|---------|
| Security Architect | Security Team | security-arch@company.com |
| Platform SRE | Platform Team | platform-oncall@company.com |
| Security On-Call | Security Team | #security-oncall (Slack) |
| Incident Commander | All Teams | #incident-response (Slack) |

---

**Document Status:** ✅ Production-Ready  
**Next Review:** 2026-07-18  
**Approval:** Security Architecture Board
