# ============================================
# CARGOBIT SECURITY GATEWAY - LOAD TEST CONFIG
# Version: 1.0 - Testziele, KPIs, Lastprofile
# ============================================

# ============================================
# 1. TESTZIELE & KPIs
# ============================================

## Primäre Ziele
- Wie verhält sich der Gateway bei hoher Request-Rate?
- Wie reagiert er bei Risk-Engine-Latenz?
- Wie stabil ist die Mitigation-Queue?
- Wie schnell werden Audit-Events geschrieben?
- Wie verhält sich das System bei RED-Spikes (Fraud-Wellen)?

## KPIs (Key Performance Indicators)

| Metrik | Zielwert | Kritisch |
|--------|----------|----------|
| P95 Latenz | < 120 ms | > 250 ms |
| P99 Latenz | < 250 ms | > 500 ms |
| Error-Rate | < 0.5% | > 2% |
| Audit-Write-Time | < 50 ms | > 100 ms |
| Risk-Engine-Timeout-Rate | < 0.1% | > 1% |
| Mitigation-Queue-Lag | < 2 Sekunden | > 5 Sekunden |

# ============================================
# 2. LASTPROFILE
# ============================================

## 2.1 Ramp-Up Test (Baseline)
**Simuliert normalen Traffic**

```yaml
start: 10 RPS
peak: 200 RPS
duration: 10 Minuten
ziel: Stabilität & Skalierung
```

**K6 Konfiguration:**
```bash
k6 run --env SCENARIO=ramp-up security-gateway.js
```

**Locust Konfiguration:**
```bash
locust -f security_gateway_loadtest.py SecurityGatewayUser \
  --users 200 --spawn-rate 10 --run-time 10m
```

---

## 2.2 Spike Test (Fraud-Welle)
**Simuliert plötzliche Risk-Spikes**

```yaml
0 → 1000 RPS in 5 Sekunden
30 Sekunden halten
Abfall auf 50 RPS
```

**Ziele:**
- Wie reagiert Risk-Engine?
- Werden RED-Cases korrekt blockiert?
- Werden Tickets & Notifications zuverlässig erstellt?

**K6 Konfiguration:**
```bash
k6 run --env SCENARIO=spike security-gateway.js
```

**Locust Konfiguration:**
```bash
locust -f security_gateway_loadtest.py RedSpikeUser \
  --users 1000 --spawn-rate 200 --run-time 1m
```

---

## 2.3 Soak Test (Langzeit)
**Simuliert 3 Stunden Dauerlast**

```yaml
150 RPS konstant
10% RED-Cases
20% YELLOW-Cases
70% GREEN-Cases
```

**Ziele:**
- Memory-Leaks erkennen
- Queue-Lag überwachen
- DB-Bottlenecks identifizieren

**K6 Konfiguration:**
```bash
k6 run --env SCENARIO=soak security-gateway.js
```

**Locust Konfiguration:**
```bash
locust -f security_gateway_loadtest.py SoakTestUser \
  --users 150 --spawn-rate 10 --run-time 3h
```

---

## 2.4 Stress Test (Kapazitätsgrenze)
**Bestimmt Maximalleistung**

```yaml
start: 200 RPS
steigerung: +100 RPS alle 2 Minuten
bis: Systemfehler auftreten
```

**K6 Konfiguration:**
```bash
k6 run --env SCENARIO=stress security-gateway.js
```

---

## 2.5 Chaos Test (Risk-Engine Down)
**Simuliert Ausfall der Risk-Engine**

```yaml
100 RPS konstant
risk-engine: nicht erreichbar / 500 / Timeout
```

**Ziele:**
- Fail-Safe Verhalten
- Audit-Logging
- Error-Rate
- Latenz-Degradation

**K6 Konfiguration:**
```bash
k6 run --env SCENARIO=chaos security-gateway.js
```

# ============================================
# 3. EMPFOHLENE METRIKEN & THRESHOLDS
# ============================================

## Gateway

| Metrik | Threshold | Alert |
|--------|-----------|-------|
| P95 Latenz | < 120 ms | > 200 ms |
| P99 Latenz | < 250 ms | > 400 ms |
| Error-Rate | < 0.5% | > 1% |
| CPU | < 70% | > 85% |
| Memory | < 75% | > 90% |

## Risk-Engine

| Metrik | Threshold | Alert |
|--------|-----------|-------|
| P95 Latenz | < 80 ms | > 150 ms |
| Timeout-Rate | < 0.1% | > 0.5% |

## Mitigation-Service

| Metrik | Threshold | Alert |
|--------|-----------|-------|
| Queue-Lag | < 2 Sekunden | > 5 Sekunden |
| 2FA-Delivery | < 5 Sekunden | > 10 Sekunden |

## Audit-Service

| Metrik | Threshold | Alert |
|--------|-----------|-------|
| Write-Latency | < 50 ms | > 100 ms |
| Backlog | < 1000 Events | > 5000 Events |

## Notification-Service

| Metrik | Threshold | Alert |
|--------|-----------|-------|
| Slack Delivery | < 2 Sekunden | > 5 Sekunden |
| Email Delivery | < 10 Sekunden | > 30 Sekunden |

# ============================================
# 4. TESTDATEN-STRATEGIE
# ============================================

## Green Cases (70%)
```json
{
  "user": {"id": "u_1001", "role": "SHIPPER_COMPANY"},
  "entity": {
    "type": "transaction",
    "id": "tx_3001",
    "context": {
      "amount": 1200,
      "international": false,
      "iban_age_hours": 240
    }
  }
}
```

**Merkmale:**
- Kleine Beträge (< 5000€)
- Alte IBAN (> 48h)
- Keine internationalen Transfers
- KYC vollständig

---

## Yellow Cases (20%)
```json
{
  "user": {"id": "u_1002", "role": "SHIPPER_COMPANY"},
  "entity": {
    "type": "transaction",
    "id": "tx_3002",
    "context": {
      "amount": 18000,
      "iban_age_hours": 12,
      "payout_method": "SEPA"
    }
  }
}
```

**Merkmale:**
- Neue IBAN (< 24h)
- Mittlere Beträge (5000-50000€)
- Ungewöhnliche Geo-Daten
- KYC pending

---

## Red Cases (10%)
```json
{
  "user": {"id": "u_1003", "role": "SHIPPER_COMPANY"},
  "entity": {
    "type": "transaction",
    "id": "tx_3003",
    "context": {
      "amount": 52000,
      "international": true,
      "hazmat": false,
      "iban_age_hours": 6
    }
  }
}
```

**Merkmale:**
- Hohe Beträge (> 50000€)
- Internationale Transfers
- KYB-Fehler
- Fraud-Flags

# ============================================
# 5. EXECUTION COMMANDS
# ============================================

## K6 Commands

```bash
# Ramp-Up Test
k6 run --env SCENARIO=ramp-up --env BASE_URL=http://localhost:3004 k6/security-gateway.js

# Spike Test
k6 run --env SCENARIO=spike k6/security-gateway.js

# Soak Test (3 Stunden)
k6 run --env SCENARIO=soak k6/security-gateway.js

# Stress Test
k6 run --env SCENARIO=stress k6/security-gateway.js

# Chaos Test
k6 run --env SCENARIO=chaos k6/security-gateway.js

# Permission Denied Test
k6 run --env SCENARIO=permission-denied k6/security-gateway.js

# Risk Override Test
k6 run --env SCENARIO=risk-override k6/security-gateway.js

# Mitigation Apply Test
k6 run --env SCENARIO=mitigation-apply k6/security-gateway.js
```

## Locust Commands

```bash
# Web UI Mode
locust -f locust/security_gateway_loadtest.py

# Headless - Basic Load
locust -f locust/security_gateway_loadtest.py SecurityGatewayUser \
  --users 200 --spawn-rate 10 --run-time 10m --headless

# Headless - Spike Test
locust -f locust/security_gateway_loadtest.py RedSpikeUser \
  --users 1000 --spawn-rate 200 --run-time 1m --headless

# Headless - Soak Test
locust -f locust/security_gateway_loadtest.py SoakTestUser \
  --users 150 --spawn-rate 10 --run-time 3h --headless

# Headless - Mixed Traffic
locust -f locust/security_gateway_loadtest.py MixedTrafficUser \
  --users 300 --spawn-rate 20 --run-time 30m --headless

# Distributed Mode (Master)
locust -f locust/security_gateway_loadtest.py --master

# Distributed Mode (Worker)
locust -f locust/security_gateway_loadtest.py --worker --master-host=<master-ip>
```

# ============================================
# 6. GRAFANA DASHBOARD QUERIES
# ============================================

## Prometheus Queries

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

# P99 Latency
histogram_quantile(0.99, 
  rate(http_request_duration_seconds_bucket{service="security-gateway"}[1m])
)

# Decision Distribution
sum by (decision) (rate(security_decisions_total[1m]))

# Risk Level Distribution
sum by (level) (rate(risk_evaluations_total[1m]))

# Mitigation Queue Lag
mitigation_queue_lag_seconds

# Audit Write Latency
histogram_quantile(0.95, 
  rate(audit_write_duration_seconds_bucket[1m])
)
```

# ============================================
# 7. ALERTING RULES
# ============================================

## Prometheus Alert Rules

```yaml
groups:
  - name: security-gateway-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{service="security-gateway",status=~"5.."}[5m])
          / rate(http_requests_total{service="security-gateway"}[5m]) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on Security Gateway"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HighLatencyP95
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_seconds_bucket{service="security-gateway"}[5m])
          ) > 0.25
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High P95 latency on Security Gateway"
          description: "P95 latency is {{ $value | humanizeDuration }}"

      - alert: MitigationQueueBacklog
        expr: mitigation_queue_lag_seconds > 5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Mitigation queue backlog detected"
          description: "Queue lag is {{ $value }} seconds"

      - alert: RiskEngineTimeout
        expr: |
          rate(risk_engine_timeouts_total[5m]) > 0.001
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Risk Engine timeout rate high"
          description: "Timeout rate is {{ $value | humanizePercentage }}"
```
