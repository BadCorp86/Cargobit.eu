# CargoBit Security Gateway - CI/CD Pipeline Documentation

## Übersicht

Diese Dokumentation beschreibt die vollständige CI/CD-Test-Matrix für das CargoBit Security Gateway. Die Pipeline deckt alle 7 Test-Kategorien ab, die für ein Enterprise-Security-Gateway erforderlich sind.

---

## 🧱 Test-Matrix Übersicht

| Stage | Tests | Trigger | Blocker? | Dauer |
|-------|-------|---------|----------|-------|
| Build | Lint, Typecheck | Commit | ✅ Ja | ~2 min |
| Unit | Unit-Tests | Commit/PR | ✅ Ja | ~5 min |
| Integration | Integration-Tests | Develop | ✅ Ja | ~10 min |
| Contract | Pact Tests | Develop | ✅ Ja | ~5 min |
| E2E | Full Flow Tests | Main | ✅ Ja | ~15 min |
| Load | K6/Locust | Nightly | ⚠️ Warnung | ~30 min |
| Chaos | Fault Injection | Weekly | ⚠️ Warnung | ~20 min |
| Security | SAST/DAST | Commit/Nightly | ✅ Ja bei Critical | ~10 min |

---

## 📁 Dateistruktur

```
/home/z/my-project/
├── .github/
│   └── workflows/
│       └── security-gateway-ci.yml    # GitHub Actions Pipeline
├── ci/
│   ├── gitlab/
│   │   └── .gitlab-ci.yml             # GitLab CI Pipeline
│   ├── jenkins/
│   │   └── Jenkinsfile                # Jenkins Pipeline (optional)
│   └── azure-devops/
│       └── azure-pipelines.yml        # Azure DevOps Pipeline (optional)
├── tests/
│   ├── contract/
│   │   └── security-gateway.pact.test.ts  # Pact Contract Tests
│   ├── e2e/
│   │   ├── security-gateway.e2e.test.ts   # Playwright E2E Tests
│   │   └── global-setup.ts                 # E2E Setup
│   ├── security/
│   │   └── security-scan-config.yml        # SAST/DAST Config
│   └── chaos/
│       ├── chaos-experiments.yaml          # Chaos Mesh Experiments
│       └── chaos-test-runner.ts            # Chaos Test Orchestrator
├── load-tests/
│   ├── k6/
│   │   └── security-gateway.js             # K6 Load Tests
│   ├── locust/
│   │   └── security_gateway_loadtest.py    # Locust Load Tests
│   └── config/
│       └── README.md                        # Load Test Documentation
├── scripts/
│   └── test-data-generator/
│       └── index.ts                         # Test Data Generator
└── playwright.config.ts                     # Playwright Configuration
```

---

## 🧪 Unit Tests

### Trigger
- Jeder Commit
- Jeder Pull Request
- Pre-Merge Gate

### Scope
- Permission-Validator
- Risk-Client-Adapter
- Mitigation-Client-Adapter
- Decision-Engine
- Error-Handling
- Rate-Limit-Handling

### Pass/Fail Kriterien
- ✅ Coverage ≥ 85%
- ✅ P95 Test-Runtime < 200ms
- ✅ Keine ungemockten externen Calls

### Ausführung

```bash
# Alle Unit Tests
pnpm test:unit

# Mit Coverage
pnpm test:unit --coverage

# Spezifische Test-Datei
pnpm test:unit src/__tests__/security-gateway.unit.test.ts
```

---

## 🔗 Integration Tests

### Trigger
- Merge in develop
- Nightly Build

### Scope
- Gateway ↔ Risk-Engine
- Gateway ↔ Mitigation-Service
- Gateway ↔ Audit-Service
- Gateway ↔ Notification-Service
- Permission-Matrix (real JSON)

### Services (Docker)
- PostgreSQL 15
- Redis 7

### Pass/Fail Kriterien
- ✅ P95 Latenz < 150ms
- ✅ Keine 5xx Fehler
- ✅ Audit-Events korrekt geschrieben

### Ausführung

```bash
# Integration Tests
pnpm test:integration

# Mit spezifischer DB
DATABASE_URL=postgresql://... pnpm test:integration
```

---

## 📜 Contract Tests (Consumer-Driven)

### Trigger
- Merge in develop
- Vor jedem Release

### Scope
- Gateway API (OpenAPI)
- Risk-Engine API
- Mitigation-API
- Notification-API
- Audit-API

### Tools
- **Pact** / Pactflow
- **OpenAPI Validator**

### Pass/Fail Kriterien
- ✅ Kein Breaking Change
- ✅ Alle Provider-Contracts erfüllt

### Ausführung

```bash
# Consumer Tests
pnpm test:contract

# Publish to Pact Broker
PACT_BROKER_URL=https://... pnpm pact-broker publish pacts

# Verify Provider
RUN_PROVIDER_VERIFICATION=true pnpm test:contract
```

### Contract Beispiele

```typescript
// Green Case Contract
{
  "uponReceiving": "a security check request for green user",
  "willRespondWith": {
    "status": 200,
    "body": {
      "decision": "allowed",
      "riskLevel": "green",
      "riskScore": 14
    }
  }
}
```

---

## 🧪 E2E Tests

### Trigger
- Merge in main
- Pre-Production Deploy

### Scope
- Domain-Service → Gateway → Risk → Mitigation → Audit → Notification
- Green / Yellow / Red Cases
- Support Override
- Admin Operations

### Tools
- **Playwright** (Browser + API)
- **Postman Collection Runner**

### Pass/Fail Kriterien
- ✅ Alle Flows erfolgreich
- ✅ Keine unhandled errors
- ✅ Audit-Trail vollständig

### Ausführung

```bash
# Alle E2E Tests
pnpm test:e2e

# Mit UI (Debugging)
pnpm exec playwright test --ui

# Spezifischer Browser
pnpm exec playwright test --project=chromium

# Generate Report
pnpm exec playwright show-report
```

### Test Cases

| Test | User | Expected |
|------|------|----------|
| Green Flow | u_1001 | allowed |
| Yellow Flow | u_1002 | allowed_with_mitigation |
| Red Flow | u_1003 | blocked |
| Permission Denied | driver-001 | permission_denied |

---

## ⚡ Load Tests

### Trigger
- Nightly
- Vor jedem Major Release
- Manuell bei Performance-Regressionen

### KPIs

| Metrik | Zielwert | Kritisch |
|--------|----------|----------|
| P95 Latenz | < 120ms | > 250ms |
| P99 Latenz | < 250ms | > 500ms |
| Error-Rate | < 0.5% | > 2% |
| Audit-Write-Time | < 50ms | > 100ms |

### Load Profile

#### 1. Ramp-Up Test (Baseline)
```yaml
start: 10 RPS
peak: 200 RPS
duration: 10 Minuten
```

#### 2. Spike Test (Fraud-Welle)
```yaml
0 → 1000 RPS in 5 Sekunden
30 Sekunden halten
Abfall auf 50 RPS
```

#### 3. Soak Test (Langzeit)
```yaml
150 RPS konstant
duration: 3 Stunden
distribution: 70% green, 20% yellow, 10% red
```

#### 4. Stress Test (Kapazitätsgrenze)
```yaml
start: 200 RPS
steigerung: +100 RPS alle 2 Minuten
```

#### 5. Chaos Test (Risk-Engine Down)
```yaml
100 RPS konstant
risk-engine: nicht erreichbar
```

### Ausführung

```bash
# K6 - Ramp-Up
k6 run --env SCENARIO=ramp-up load-tests/k6/security-gateway.js

# K6 - Spike
k6 run --env SCENARIO=spike load-tests/k6/security-gateway.js

# K6 - Soak (3h)
k6 run --env SCENARIO=soak load-tests/k6/security-gateway.js

# K6 - Stress
k6 run --env SCENARIO=stress load-tests/k6/security-gateway.js

# Locust - Web UI
locust -f load-tests/locust/security_gateway_loadtest.py

# Locust - Headless
locust -f load-tests/locust/security_gateway_loadtest.py \
  SecurityGatewayUser --users 200 --spawn-rate 10 --run-time 10m --headless
```

---

## 🧨 Chaos Tests

### Trigger
- Weekly (Sonntags)
- Pre-Production
- Manuell

### Experiments

| Experiment | Beschreibung | Dauer |
|------------|--------------|-------|
| Risk-Engine Latency | 500ms Latency Injection | 5 min |
| Risk-Engine Pod Failure | Pod Kill | 2 min |
| Database Latency | 200ms PostgreSQL Latency | 3 min |
| Notification Down | Service unavailable | 5 min |
| Network Partition | Gateway ↔ Risk Engine | 3 min |
| CPU Stress | 80% CPU Load | 5 min |
| Memory Stress | 512MB Allocation | 3 min |
| DNS Failure | Risk-Engine DNS Error | 2 min |

### Pass/Fail Kriterien
- ✅ Gateway bleibt erreichbar
- ✅ Fail-Safe greift (block)
- ✅ Audit-Events werden trotzdem geschrieben
- ✅ Keine Silent Failures

### Ausführung

```bash
# Alle Chaos Tests
pnpm test:chaos

# Mit Chaos Mesh
kubectl apply -f tests/chaos/chaos-experiments.yaml

# Cleanup
kubectl delete -f tests/chaos/chaos-experiments.yaml
```

---

## 🔐 Security Tests (SAST/DAST)

### Trigger
- Jeder Commit (SAST)
- Nightly (DAST)
- Pre-Production

### Scope
- Dependency Scans
- Static Code Analysis
- OpenAPI Security Scan
- OWASP Top 10
- SSRF / RCE / Injection Tests

### Tools

| Tool | Typ | Zweck |
|------|-----|-------|
| Semgrep | SAST | Static Code Analysis |
| Trivy | Dependency | Container/Vuln Scan |
| Snyk | Dependency | CVE Scanner |
| Gitleaks | Secret | Secret Detection |
| OWASP ZAP | DAST | Runtime Security |

### Pass/Fail Kriterien
- ✅ Keine High/Critical Findings
- ✅ Keine offenen CVEs

### Ausführung

```bash
# Semgrep
semgrep --config "p/security-audit" --config "p/secrets" .

# Trivy
trivy fs . --severity CRITICAL,HIGH

# Snyk
snyk test

# npm audit
pnpm audit --audit-level=high
```

---

## 📊 Pipeline Gates

### Deployment Gates

```mermaid
graph TD
    A[Commit] --> B[Build]
    B --> C{Unit Tests}
    C -->|Pass| D{Integration Tests}
    C -->|Fail| Z[Block]
    D -->|Pass| E{Contract Tests}
    D -->|Fail| Z
    E -->|Pass| F{E2E Tests}
    E -->|Fail| Z
    F -->|Pass| G{Security Scan}
    F -->|Fail| Z
    G -->|No Critical| H[Deploy Staging]
    G -->|Critical Found| Z
    H --> I{Load Tests}
    I -->|Pass| J[Deploy Production]
    I -->|Warn| K[Manual Review]
```

---

## 🔧 Konfiguration

### GitHub Secrets

| Secret | Beschreibung |
|--------|--------------|
| `AWS_ACCESS_KEY_ID` | AWS Access Key |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key |
| `SNYK_TOKEN` | Snyk API Token |
| `PACT_BROKER_URL` | Pact Broker URL |
| `PACT_BROKER_TOKEN` | Pact Broker Token |
| `SLACK_WEBHOOK_URL` | Slack Notifications |

### Umgebungsvariablen

```bash
# .env.ci
BASE_URL=http://localhost:3004
RISK_ENGINE_URL=http://localhost:3003
DATABASE_URL=postgresql://test:test@localhost:5432/cargobit_test
REDIS_URL=redis://localhost:6379
API_KEY=test-api-key
```

---

## 📈 Monitoring & Alerts

### Prometheus Queries

```promql
# Request Rate
rate(http_requests_total{service="security-gateway"}[1m])

# Error Rate
rate(http_requests_total{service="security-gateway",status=~"5.."}[1m])
  / rate(http_requests_total{service="security-gateway"}[1m])

# P95 Latency
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket{service="security-gateway"}[1m])
)

# Decision Distribution
sum by (decision) (rate(security_decisions_total[1m]))
```

### Alert Rules

| Alert | Condition | Severity |
|-------|-----------|----------|
| HighErrorRate | Error > 1% | Critical |
| HighLatencyP95 | P95 > 250ms | Warning |
| MitigationQueueBacklog | Lag > 5s | Critical |
| RiskEngineTimeout | Timeout > 0.1% | Critical |

---

## 🚀 Quick Start

```bash
# 1. Dependencies installieren
pnpm install

# 2. Test-Daten generieren
pnpm tsx scripts/test-data-generator/index.ts ./test-data

# 3. Unit Tests
pnpm test:unit

# 4. Integration Tests
pnpm test:integration

# 5. E2E Tests
pnpm test:e2e

# 6. Load Tests (K6)
k6 run --env SCENARIO=ramp-up load-tests/k6/security-gateway.js

# 7. Security Scan
pnpm audit && semgrep --config "p/security-audit" .
```

---

## 📝 Changelog

### Version 2.0 (2026-04-15)
- ✅ GitHub Actions Pipeline mit 10 Stages
- ✅ GitLab CI Unterstützung
- ✅ Contract Tests mit Pact
- ✅ E2E Tests mit Playwright
- ✅ Chaos Mesh Integration
- ✅ Test Data Generator
- ✅ Comprehensive Documentation

### Version 1.0
- K6 Load Tests
- Locust Load Tests
- Load Test Configuration
