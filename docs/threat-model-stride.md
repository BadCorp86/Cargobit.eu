# Security Threat Model (STRIDE)

**CargoBit Transport Platform**  
**Version:** 1.0  
**Classification:** Internal – Security Team  
**Last Updated:** 2025-01-15

---

## 1. Executive Summary

This document presents a comprehensive STRIDE threat model for the CargoBit Transport Platform. STRIDE is a threat classification framework developed by Microsoft that categorizes threats into six types: **Spoofing**, **Tampering**, **Repudiation**, **Information Disclosure**, **Denial of Service**, and **Elevation of Privilege**. This analysis identifies potential security threats across all critical components and provides specific mitigations aligned with our security architecture and compliance requirements (ISO 27001, SOC2).

The threat model serves as a foundation for:
- Security architecture decisions
- Penetration testing scope definition
- Security control validation
- Risk assessment and prioritization
- Compliance evidence documentation

---

## 2. Components in Scope

| Component | Type | Criticality | Data Classification |
|-----------|------|-------------|---------------------|
| API-Gateway | Infrastructure | Critical | Public/Confidential |
| Auth-Service | Core Service | Critical | Confidential |
| Security-Config-Service | Core Service | Critical | Confidential |
| Pricing-Service | Domain Service | High | Confidential |
| Matching-Service | Domain Service | High | Confidential |
| Execution-Service | Domain Service | High | Confidential |
| Kafka/NATS | Messaging | Critical | Internal |
| Audit-Log-Store | Data Store | Critical | Confidential |
| Databases (PostgreSQL) | Data Store | Critical | Confidential |
| External Clients | External | Medium | Public |

---

## 3. STRIDE Analysis

### 3.1 API-Gateway

The API-Gateway is the single entry point for all external traffic and implements the first line of defense for the platform.

#### Spoofing (S)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| AG-S-001 | Attacker forges JWT tokens to impersonate legitimate users | Critical | JWT validation with RS256, short-lived tokens (15min access, 7d refresh), token blacklist on logout |
| AG-S-002 | Attacker spoofs service identity for internal API calls | High | mTLS between all services with certificate pinning, service mesh identity verification |
| AG-S-003 | Attacker uses stolen refresh tokens | High | Refresh token rotation, binding to device fingerprint, secure httpOnly cookies |
| AG-S-004 | Attacker impersonates carrier/shipper accounts | High | Multi-factor authentication for sensitive operations, anomaly detection on login patterns |

**Implementation Details:**
```
JWT Validation Pipeline:
1. Extract token from Authorization header
2. Verify signature with public key (JWKS rotation)
3. Validate issuer, audience, expiration
4. Check token against blacklist (Redis)
5. Extract claims and inject into request context
```

#### Tampering (T)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| AG-T-001 | Attacker modifies request parameters in transit | Critical | TLS 1.2+ mandatory, HSTS, certificate pinning for mobile apps |
| AG-T-002 | Attacker injects malicious payloads via API requests | Critical | WAF with OWASP Core Rule Set, input validation, request size limits |
| AG-T-003 | Attacker tampers with rate-limit configurations | High | Signed configuration files, config-change audit logging, 4-eyes approval |
| AG-T-004 | Attacker modifies request headers for privilege escalation | High | Header sanitization, signed request headers for internal communication |

**Request Signing Implementation:**
```
Internal Request Signing:
- All service-to-service requests signed with service identity
- Signature includes: timestamp, method, path, body hash
- Signature verification at destination service
- Reject requests older than 5 minutes
```

#### Repudiation (R)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| AG-R-001 | Attacker denies performing malicious actions | High | WORM audit logs with cryptographic integrity, correlation IDs across all requests |
| AG-R-002 | Attacker deletes or modifies audit trails | Critical | Immutable audit storage (S3 Object Lock), separate audit account, log forwarding to SIEM |
| AG-R-003 | Legitimate user actions cannot be traced | Medium | End-to-end correlation IDs, user context in all log entries, session tracking |

**Audit Log Schema:**
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "correlation_id": "corr-abc123",
  "user_id": "user-456",
  "service": "api-gateway",
  "action": "api_call",
  "resource": "/api/v1/orders",
  "method": "POST",
  "status": 200,
  "source_ip": "192.168.1.100",
  "user_agent": "CargoBit-Mobile/2.1.0",
  "signature": "sha256=..."
}
```

#### Information Disclosure (I)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| AG-I-001 | Attacker extracts sensitive data from error messages | High | Generic error responses, no stack traces, structured error codes |
| AG-I-002 | Attacker enumerates valid users/accounts | High | Generic authentication error messages, rate-limited login attempts |
| AG-I-003 | Attacker accesses internal API documentation | Critical | Internal API docs on separate domain, authentication required, IP whitelist |
| AG-I-004 | Attacker intercepts unencrypted traffic | Critical | TLS 1.2+ mandatory, HSTS with preload, no mixed content |

**Error Response Standard:**
```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Authentication failed",
    "request_id": "req-xyz789",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

#### Denial of Service (D)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| AG-D-001 | Attacker overwhelms API with requests | Critical | Rate limiting per subject/IP, token bucket algorithm, circuit breakers |
| AG-D-002 | Attacker sends large payloads | High | Request size limits (1MB default), streaming for large files, timeout enforcement |
| AG-D-003 | Attacker targets expensive endpoints | High | Query complexity limits, pagination requirements, cache for expensive queries |
| AG-D-004 | Resource exhaustion via slow requests | Medium | Request timeout (30s default), connection limits, slowloris protection |

**Rate Limiting Strategy:**
```yaml
rate_limits:
  global:
    requests_per_second: 10000
    burst: 15000
  per_user:
    requests_per_minute: 300
    burst: 500
  per_ip:
    requests_per_minute: 600
    burst: 1000
  authenticated_endpoints:
    requests_per_minute: 1000
  unauthenticated_endpoints:
    requests_per_minute: 60
```

#### Elevation of Privilege (E)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| AG-E-001 | Attacker gains admin privileges | Critical | Role-based access control (RBAC), privilege verification at every endpoint |
| AG-E-002 | Attacker accesses other tenant's data | Critical | Tenant isolation, tenant context validation in every request |
| AG-E-003 | Attacker bypasses authorization checks | Critical | Authorization at gateway AND service level, deny by default |
| AG-E-004 | Attacker exploits service-to-service trust | High | Service mesh authorization, least privilege for service accounts |

**Authorization Architecture:**
```
Request Flow:
1. Gateway: Validate JWT, extract roles/permissions
2. Gateway: Check RBAC policy for endpoint
3. Gateway: Inject user context into request
4. Service: Validate user context
5. Service: Apply ABAC rules for resource access
6. Service: Log access decision with reasoning
```

---

### 3.2 Security-Config-Service

The Security-Config-Service manages all security configurations including rate limits, fraud thresholds, and access policies.

#### Spoofing (S)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| SCS-S-001 | Unauthorized service pretends to be config service | Critical | mTLS with certificate verification, service mesh identity, mutual authentication |
| SCS-S-002 | Attacker forges config update requests | High | Signed configuration updates, service-to-service auth tokens |

#### Tampering (T)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| SCS-T-001 | Attacker modifies security configurations | Critical | Git-backed version history, signed commits, 4-eyes approval for all changes |
| SCS-T-002 | Attacker injects malicious config values | Critical | JSON Schema validation, strict type checking, range validation for numeric values |
| SCS-T-003 | Attacker bypasses config validation | High | Schema validation before apply, dry-run mode, rollback capability |

**Configuration Validation Pipeline:**
```
1. Developer submits config change (PR)
2. CI/CD runs schema validation
3. Security team reviews (4-eyes)
4. Config is signed and stored in Git
5. Config service pulls and verifies signature
6. Dry-run validation against test environment
7. Apply to production with audit log
8. Automatic rollback on validation failure
```

#### Repudiation (R)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| SCS-R-001 | Config changes cannot be attributed | Critical | Git commit signatures, audit trail with user attribution, change approval workflow |
| SCS-R-002 | Config rollback not traceable | High | All rollbacks logged with reason, approval required for emergency rollbacks |

#### Information Disclosure (I)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| SCS-I-001 | Sensitive config values exposed | Critical | Encryption at rest, secrets in dedicated secret store, no logging of sensitive values |
| SCS-I-002 | Config API accessible without auth | Critical | mTLS required, internal-only API, no external exposure |

#### Denial of Service (D)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| SCS-D-001 | Config service unavailable | Critical | Local cache in each service, fallback to last known good config, circuit breaker pattern |
| SCS-D-002 | Config update blocks services | High | Async config distribution, versioned configs, graceful reload |

**Fallback Mechanism:**
```go
func GetConfig(key string) (*Config, error) {
    // Try local cache first
    if cached, ok := localCache.Get(key); ok {
        return cached, nil
    }
    
    // Try config service with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()
    
    config, err := configClient.Get(ctx, key)
    if err != nil {
        // Fallback to cached version
        return fallbackCache.Get(key)
    }
    
    // Update local cache
    localCache.Set(key, config, 5*time.Minute)
    return config, nil
}
```

#### Elevation of Privilege (E)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| SCS-E-001 | Attacker gains config admin rights | Critical | Strict RBAC, only security team can modify, break-glass procedure for emergencies |
| SCS-E-002 | Service gains excessive config access | High | Service-specific config scopes, least privilege per service |

---

### 3.3 Pricing-Service

The Pricing-Service calculates prices and applies fraud scoring for all transportation orders.

#### Spoofing (S)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| PS-S-001 | Attacker submits fraudulent pricing requests | High | Request validation, shipper verification, order authenticity check |
| PS-S-002 | Attacker spoofs carrier pricing data | High | Carrier authentication, pricing data signature verification |

#### Tampering (T)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| PS-T-001 | Attacker manipulates pricing calculations | Critical | Server-side pricing only, input validation, calculation audit trail |
| PS-T-002 | Attacker modifies fraud scores | Critical | Fraud score signed, server-side calculation, anomaly detection on score changes |
| PS-T-003 | Attacker tampers with price history | High | Immutable price records, audit trail, version history |

#### Repudiation (R)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| PS-R-001 | Pricing disputes cannot be resolved | High | Complete audit trail for every pricing decision, input/output logging |
| PS-R-002 | Fraud score changes not traceable | High | Fraud score audit log with reasoning, model version tracking |

#### Information Disclosure (I)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| PS-I-001 | Pricing algorithms exposed | Critical | Black-box pricing API, no algorithm details in responses |
| PS-I-002 | Fraud model details leaked | High | Model parameters encrypted, internal-only model API |
| PS-I-003 | Competitor pricing data exposed | High | Tenant isolation, data access controls |

#### Denial of Service (D)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| PS-D-001 | Complex pricing requests exhaust resources | High | Calculation timeout, complexity limits, async processing for bulk requests |
| PS-D-002 | Fraud scoring backlog | Medium | Async fraud scoring, priority queuing, scaling based on queue depth |

#### Elevation of Privilege (E)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| PS-E-001 | Attacker accesses pricing for other shippers | Critical | Shipper context validation, data isolation, query filtering |
| PS-E-002 | Attacker bypasses fraud checks | Critical | Fraud check mandatory, cannot be disabled, audit on fraud decisions |

**Fraud Score Integration:**
```
Order Flow with Fraud Check:
1. Order received → Pricing Service
2. Pricing Service calculates base price
3. Fraud score calculated (async)
4. If fraud_score > threshold:
   - Alert to Risk Team
   - Order flagged for review
   - Price calculation paused
5. If fraud_score <= threshold:
   - Price finalized
   - Order proceeds to matching
```

---

### 3.4 Matching-Service

The Matching-Service pairs shipments with carriers based on availability, preferences, and optimization algorithms.

#### Spoofing (S)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| MS-S-001 | Fake carrier bids injected | High | Carrier authentication, bid signature verification, carrier reputation check |
| MS-S-002 | Fake shipments matched | High | Shipment verification with order service, order signature validation |

#### Tampering (T)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| MS-T-001 | Attacker manipulates matching scores | Critical | Server-side matching, score calculation audit, anomaly detection |
| MS-T-002 | Attacker modifies carrier preferences | High | Preference change validation, audit trail, rate limiting on preference changes |
| MS-T-003 | Event injection into Kafka | Critical | Kafka ACLs, message signing, schema registry validation |

**Kafka Security:**
```yaml
kafka_security:
  protocol: SASL_SSL
  mechanism: SCRAM-SHA-512
  ssl:
    enabled: true
    certificate: /etc/kafka/client.crt
    key: /etc/kafka/client.key
    ca: /etc/kafka/ca.crt
  acl:
    matching_service:
      - topic: orders
        permission: read
      - topic: matches
        permission: write
```

#### Repudiation (R)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| MS-R-001 | Matching decisions cannot be explained | High | Match reasoning logged, score breakdown available, audit trail |
| MS-R-002 | Carrier selection disputes | Medium | Complete selection criteria logged, preference history preserved |

#### Information Disclosure (I)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| MS-I-001 | Carrier data exposed to competitors | Critical | Carrier data isolation, no cross-carrier queries, encrypted at rest |
| MS-I-002 | Matching algorithm details leaked | High | Black-box matching API, no algorithm internals in responses |

#### Denial of Service (D)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| MS-D-001 | Matching queue overwhelmed | High | Queue-based processing, back-pressure, auto-scaling |
| MS-D-002 | Slow matching blocks orders | Medium | Matching timeout (30s), fallback to simpler algorithm, async matching |

#### Elevation of Privilege (E)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| MS-E-001 | Attacker forces specific carrier match | High | Match selection tamper-proof, server-side randomization, audit on manual overrides |
| MS-E-002 | Carrier sees competitor bids | Critical | Carrier isolation, bid confidentiality, sealed bid process |

---

### 3.5 Audit-Log-Store

The Audit-Log-Store maintains immutable audit records for compliance and forensic analysis.

#### Spoofing (S)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| ALS-S-001 | Fake audit entries injected | Critical | Entry signing, source verification, chain-of-custody validation |

#### Tampering (T)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| ALS-T-001 | Audit logs modified after creation | Critical | WORM storage (S3 Object Lock), cryptographic hashes, Merkle tree verification |
| ALS-T-002 | Audit log deletion | Critical | Immutable storage, no delete API, separate audit account |

**WORM Implementation:**
```yaml
s3_audit_bucket:
  versioning: enabled
  object_lock:
    mode: COMPLIANCE
    retain_until: "+7 years"
  encryption:
    type: aws:kms
    key: alias/audit-encryption-key
  replication:
    destination: audit-backup-bucket
    status: enabled
```

#### Repudiation (R)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| ALS-R-001 | Log integrity cannot be verified | Critical | Cryptographic chain, regular integrity checks, third-party attestation |

#### Information Disclosure (I)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| ALS-I-001 | Sensitive data in audit logs | High | PII scrubbing, field-level encryption, access controls |
| ALS-I-002 | Unauthorized access to audit logs | Critical | Strict RBAC, audit log access is itself audited, separate access management |

#### Denial of Service (D)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| ALS-D-001 | Audit log storage exhausted | Medium | Auto-scaling storage, retention policies, compression |
| ALS-D-002 | Audit log ingestion blocked | High | Async ingestion, local buffer, multiple ingestion endpoints |

#### Elevation of Privilege (E)

| Threat ID | Threat Description | Risk Level | Mitigation |
|-----------|-------------------|------------|------------|
| ALS-E-001 | Attacker gains audit admin access | Critical | Break-glass only, MFA required, security team approval |

---

## 4. Threat Summary Matrix

| Component | S | T | R | I | D | E | Critical | High | Medium |
|-----------|---|---|---|---|---|---|----------|------|--------|
| API-Gateway | 4 | 4 | 3 | 4 | 4 | 4 | 8 | 13 | 2 |
| Security-Config-Service | 2 | 3 | 2 | 2 | 2 | 2 | 4 | 7 | 2 |
| Pricing-Service | 2 | 3 | 2 | 3 | 2 | 2 | 3 | 9 | 2 |
| Matching-Service | 2 | 3 | 2 | 2 | 2 | 2 | 2 | 9 | 1 |
| Audit-Log-Store | 1 | 2 | 1 | 2 | 2 | 1 | 5 | 3 | 1 |
| **Total** | **11** | **15** | **10** | **13** | **12** | **11** | **22** | **41** | **8** |

---

## 5. Mitigation Priority

### P0 - Immediate (Within 2 Weeks)

1. **AG-S-001**: JWT token forgery mitigation - Implement token blacklist
2. **AG-T-001**: TLS enforcement - Audit all endpoints
3. **ALS-T-001**: WORM storage implementation for audit logs
4. **SCS-T-001**: Git-backed config with signing

### P1 - Short-term (Within 1 Month)

1. **AG-E-001**: RBAC implementation at all endpoints
2. **PS-T-002**: Fraud score signing
3. **MS-T-003**: Kafka ACLs and message signing
4. **AG-I-001**: Error message sanitization audit

### P2 - Medium-term (Within 3 Months)

1. **AG-D-001**: Advanced rate limiting per subject
2. **MS-E-002**: Sealed bid process implementation
3. **ALS-R-001**: Third-party log attestation
4. **All services**: Complete audit trail implementation

---

## 6. Threat Model Maintenance

### Review Schedule

| Trigger | Action |
|---------|--------|
| New service deployment | Update threat model |
| Security incident | Retrospective analysis |
| Quarterly | Scheduled review |
| Architecture change | Impact assessment |

### Version Control

- All threat model changes tracked in Git
- Changes require security team approval
- Historical versions preserved for audit

### Integration with Development

- Threat model referenced in security reviews
- STRIDE checklist included in PR template
- Automated threat modeling in CI/CD pipeline

---

## 7. References

- OWASP API Security Top 10
- Microsoft STRIDE Methodology
- NIST SP 800-154 (Guide to Data-Centric System Threat Modeling)
- ISO 27001 A.12.6.1 (Technical Vulnerability Management)
- Internal: Security Architecture Diagram, Data Flow Diagram

---

**Document Control:**  
**Owner:** Security Team  
**Reviewers:** Architecture Team, DevOps Team  
**Next Review:** 2025-04-15
