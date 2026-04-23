# CargoBit Security-Gateway Test Suite

## 📋 Test-Übersicht

### Unit Tests (Gateway-Logik isoliert)

| Test Case | Scenario | Expected Result |
|-----------|----------|-----------------|
| TC-1 | Permission Allowed - SHIPPER_COMPANY → ACCEPT_OFFER | `allowed=true` |
| TC-2 | Permission Denied - SHIPPER → ASSIGN_DRIVER | `allowed=false`, `errorCode=PERMISSION_DENIED` |
| TC-3 | Risk GREEN → Allowed | `decision=allowed` |
| TC-4 | Risk YELLOW → Allowed with Mitigation | `decision=allowed_with_mitigation`, `mitigations=["delay"]` |
| TC-5 | Risk RED → Blocked | `decision=blocked`, Support-Ticket created |
| TC-6 | Risk-Engine Unavailable | `decision=blocked`, `errorCode=RISK_ENGINE_UNAVAILABLE` |
| TC-7 | Invalid Request (missing entity.id) | `400 INVALID_REQUEST` |
| TC-8 | Mitigation Apply Failure | `decision=blocked`, `errorCode=MITIGATION_FAILED` |

### Integration Tests (echte Services angebunden)

| Test ID | Flow | Services Involved |
|---------|------|-------------------|
| IT-1 | ACCEPT_OFFER (Green → Allowed) | Gateway → Permission → Risk → Audit |
| IT-2 | INITIATE_PAYOUT (Yellow → Delay) | Gateway → Permission → Risk → Mitigation → Queue → Audit → Notification |
| IT-3 | ACCEPT_OFFER (Red → Blocked) | Gateway → Permission → Risk → Support-Ticket → Notification → Audit |
| IT-4 | Permission Denied (No Risk Call) | Gateway → Permission → Audit |
| IT-5 | Risk Override by Support | Support → Gateway → Risk-Engine → Audit |

---

## 🧪 Unit Tests – Detail

### Test Case 1 – Permission Allowed

```gherkin
Given:
  - User role = SHIPPER_COMPANY
  - Action = ACCEPT_OFFER
  - Permission-Matrix erlaubt es

Expect:
  - decision = allowed (wenn Risk später grün ist)
  - Permission-Check wird als "true" zurückgegeben
```

### Test Case 2 – Permission Denied

```gherkin
Given:
  - User role = SHIPPER
  - Action = ASSIGN_DRIVER
  - Permission-Matrix verbietet es

Expect:
  - allowed = false
  - decision = permission_denied
  - errorCode = PERMISSION_DENIED
  - Risk-Engine wird NICHT aufgerufen
  - Audit-Event wird geschrieben
```

### Test Case 3 – Risk GREEN → Allowed

```gherkin
Given:
  - Permission OK
  - Risk-Engine returns { score: 12, level: "green" }

Expect:
  - decision = allowed
  - Keine Mitigation
  - Audit-Event: SECURITY_CHECK
```

### Test Case 4 – Risk YELLOW → Allowed with Mitigation

```gherkin
Given:
  - Permission OK
  - Risk-Engine returns { score: 54, level: "yellow" }
  - Mitigation-Service returns delay

Expect:
  - decision = allowed_with_mitigation
  - mitigations = ["delay", "extra_logging"]
  - Audit-Event: RISK_MITIGATION
```

### Test Case 5 – Risk RED → Blocked

```gherkin
Given:
  - Permission OK
  - Risk-Engine returns { score: 81, level: "red" }

Expect:
  - decision = blocked
  - allowed = false
  - Support-Ticket wird erstellt
  - Notification-Service wird getriggert
  - Audit-Event: RISK_BLOCKED
```

### Test Case 6 – Risk-Engine Unavailable

```gherkin
Given:
  - Permission OK
  - Risk-Engine Timeout

Expect:
  - decision = blocked (Fail-Safe)
  - errorCode = RISK_ENGINE_UNAVAILABLE
  - Audit-Event: SECURITY_SERVICE_UNAVAILABLE
```

### Test Case 7 – Invalid Request

```gherkin
Given:
  - Missing entity.id

Expect:
  - 400 INVALID_REQUEST
  - Kein Risk-Call
  - Kein Permission-Call
```

### Test Case 8 – Mitigation Apply Failure

```gherkin
Given:
  - Risk = YELLOW
  - Mitigation-Service returns error

Expect:
  - decision = blocked
  - errorCode = MITIGATION_FAILED
  - Audit-Event: MITIGATION_FAILED
```

---

## 🔗 Integration Tests – Flows

### 🟩 Integration Test 1 – GREEN Flow

```
transport-service
    → POST /security/check
        → Permission OK
        → RiskEngine: score=12, green
        → decision=allowed
        → Audit: SECURITY_CHECK
    ← allowed
```

**Ergebnis:** Aktion wird ausgeführt.

---

### 🟨 Integration Test 2 – YELLOW Flow

```
wallet-service
    → POST /security/check
        → Permission OK
        → RiskEngine: score=54, yellow
        → MitigationService.apply(delay)
        → decision=allowed_with_mitigation
        → Notification: payout delayed
        → Audit: RISK_MITIGATION
    ← allowed_with_mitigation
```

**Ergebnis:** Aktion wird ausgeführt, aber verzögert/abgesichert.

---

### 🟥 Integration Test 3 – RED Flow

```
transport-service
    → POST /security/check
        → Permission OK
        → RiskEngine: score=81, red
        → decision=blocked
        → SupportTicketService.create
        → NotificationService.send(slack/email)
        → Audit: RISK_BLOCKED
    ← blocked
```

**Ergebnis:** Aktion blockiert, Support informiert.

---

### 🔄 Integration Test 4 – Permission Denied Flow

```
domain-service
    → POST /security/check
        → Permission DENIED
        → Risk-Engine NOT called
        → Mitigation NOT called
        → Notification NOT called
        → Audit: PERMISSION_DENIED
    ← permission_denied
```

**Ergebnis:** Sofortige Ablehnung ohne weitere Checks.

---

### 🔄 Integration Test 5 – Support Override Flow

```
support-dashboard
    → POST /security/risk/override
        → Role check: SUPPORT ✓
        → RiskEngine.update(score=20, level=green)
        → Audit: RISK_OVERRIDE
    ← ok

# Next security check:
domain-service
    → POST /security/check
        → RiskEngine: score=20, green (overridden)
        → decision=allowed
    ← allowed
```

**Ergebnis:** Nächster Security-Check wird grün.

---

## 📊 Permission Matrix

| Role | CREATE_TRANSPORT | VIEW_TRANSPORT | ACCEPT_OFFER | ACCEPT_JOB | MAKE_OFFER | ASSIGN_DRIVER | UPDATE_STATUS | VIEW_WALLET | INITIATE_PAYOUT | MANAGE_VEHICLES | MANAGE_USERS | MANAGE_PLANS |
|------|-----------------|----------------|--------------|------------|------------|---------------|---------------|-------------|-----------------|-----------------|--------------|--------------|
| ADMIN | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| SUPPORT | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| SHIPPER_COMPANY | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| SHIPPER_PRIVATE | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| DISPATCHER | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| DRIVER_SELF_EMPLOYED | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MARKETER | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## ⚠️ Risk Thresholds

| Level | Score Range | Decision | Actions |
|-------|-------------|----------|---------|
| 🟢 GREEN | 0-30 | Allow | Proceed normally |
| 🟡 YELLOW | 31-60 | Allow + Mitigations | Apply mitigations, log, notify |
| 🔴 RED | 61-100 | Block | Create ticket, notify support, log |

---

## 🛡️ Mitigation Types

| Type | Description | Use Case |
|------|-------------|----------|
| `delay` | Zeitverzögerung | Payouts, Transaktionen |
| `2fa` | Zwei-Faktor-Authentifizierung | High-Value Transaktionen |
| `gps_check` | GPS-Verifizierung | Driver Actions |
| `extra_logging` | Erweitertes Logging | Alle YELLOW Cases |
| `document_recheck` | Dokumenten-Neuprüfung | KYC/KYC Expired |
| `manual_review` | Manuelle Überprüfung | Sensitive Assignments |
| `amount_limit` | Betragslimitierung | High-Value Payouts |

---

## 📡 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/security/check` | POST | Core Hybrid Security Check |
| `/api/security/permissions/validate` | POST | Quick Permission Check |
| `/api/security/risk/override` | POST | Manual Risk Override |
| `/api/security/mitigation/apply` | POST | Trigger Mitigation |
| `/api/security/risk/{entityType}/{entityId}` | GET | Get Risk Status |
| `/api/security/health` | GET | Service Health Check |
| `/api/security/error-codes` | GET | Error Code Definitions |

---

## 🚀 Test Execution

```bash
# Run unit tests
bun test src/__tests__/security-gateway.unit.test.ts

# Run integration tests
bun test src/__tests__/security-gateway.integration.test.ts

# Run all tests
bun test
```

---

## 📝 Test Coverage

- ✅ Permission Matrix (7 roles × 12 actions)
- ✅ Risk Level Thresholds (GREEN/YELLOW/RED)
- ✅ Mitigation Types (7 types)
- ✅ Error Codes (20+ codes)
- ✅ API Response Formats
- ✅ End-to-End Flows
- ✅ Override Scenarios

---

*Generated by CargoBit Security-Gateway Test Suite v1.0.0*
