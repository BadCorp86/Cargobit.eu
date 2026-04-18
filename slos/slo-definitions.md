# CargoBit SLO/SLI Definitions

**Version:** 2024-01-15-01  
**Owner:** Platform Team  
**Review Cycle:** Quarterly  

---

## Overview

This document defines Service Level Objectives (SLOs) and Service Level Indicators (SLIs) for all CargoBit services. SLOs define the target reliability, while SLIs are the metrics used to measure that reliability.

### SLO Framework

| Term | Definition |
|------|------------|
| **SLI** | Service Level Indicator - A quantifiable measure of service behavior |
| **SLO** | Service Level Objective - A target value for an SLI |
| **Error Budget** | Allowed amount of unreliability within a time window |

### Error Budget Calculation

```
Error Budget = (1 - SLO) × Time Window

Example for 99.9% SLO over 30 days:
Error Budget = (1 - 0.999) × 30 × 24 × 60 = 43.2 minutes of downtime allowed
```

---

## F.1 Pricing-Service SLOs

### Service Description

The Pricing-Service validates bids, calculates fraud scores, and ensures pricing integrity.

### SLIs

| SLI Name | Description | Measurement |
|----------|-------------|-------------|
| `pricing_validation_latency` | Time to validate a bid | Histogram P95 |
| `pricing_error_rate` | Percentage of failed validations | Counter ratio |
| `fraud_score_calculation_time` | Time to calculate fraud score | Histogram P95 |
| `config_reload_time` | Time to reload security config | Gauge |
| `pricing_availability` | Percentage of successful requests | Counter ratio |

### SLOs

| SLO | Target | Window | Error Budget |
|-----|--------|--------|--------------|
| Validation Latency P95 | < 150 ms | 5 min rolling | N/A |
| Error Rate | < 0.1% | 5 min rolling | 43.2 min/month |
| Config Reload Time | < 2 s | Per operation | N/A |
| Availability | 99.9% | 30 days | 43.2 min/month |

### PromQL Queries

```promql
# Validation Latency P95
histogram_quantile(0.95, 
  sum(rate(pricing_validation_duration_seconds_bucket[5m])) by (le)
)

# Error Rate
sum(rate(http_requests_total{service="pricing-service",status=~"5.."}[5m])) 
/ sum(rate(http_requests_total{service="pricing-service"}[5m]))

# Availability
sum(rate(http_requests_total{service="pricing-service",status!~"5.."}[30d])) 
/ sum(rate(http_requests_total{service="pricing-service"}[30d]))

# Fraud Score Calculation Time
histogram_quantile(0.95, 
  sum(rate(fraud_detection_duration_seconds_bucket{service="pricing-service"}[5m])) by (le)
)
```

### Alerting Rules

```yaml
groups:
  - name: pricing-slo
    rules:
      - alert: PricingSLOReduced
        expr: |
          sum(rate(http_requests_total{service="pricing-service",status!~"5.."}[7d])) 
          / sum(rate(http_requests_total{service="pricing-service"}[7d])) < 0.999
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pricing SLO at risk"
          
      - alert: PricingErrorBudgetBurn
        expr: |
          (1 - sum(rate(http_requests_total{service="pricing-service",status!~"5.."}[1h])) 
          / sum(rate(http_requests_total{service="pricing-service"}[1h]))) 
          / (1 - 0.999) * 100 > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pricing burning error budget faster than 10x"
```

---

## F.2 Matching-Service SLOs

### Service Description

The Matching-Service matches carriers with transport orders based on scoring algorithms.

### SLIs

| SLI Name | Description | Measurement |
|----------|-------------|-------------|
| `matching_latency` | Time to complete matching | Histogram P95 |
| `events_processed` | Events processed per second | Counter rate |
| `fraud_penalty_calc_time` | Time to apply fraud penalty | Histogram P95 |
| `matching_availability` | Percentage of successful matches | Counter ratio |
| `kafka_lag` | Consumer lag behind producer | Gauge |

### SLOs

| SLO | Target | Window | Error Budget |
|-----|--------|--------|--------------|
| Matching Latency P95 | < 500 ms | 5 min rolling | N/A |
| Kafka Lag | < 1,000 events |实时 | N/A |
| Events Processed | > 100/sec | 5 min rolling | N/A |
| Availability | 99.9% | 30 days | 43.2 min/month |

### PromQL Queries

```promql
# Matching Latency P95
histogram_quantile(0.95, 
  sum(rate(matching_duration_seconds_bucket[5m])) by (le)
)

# Events Processed per Second
sum(rate(matching_operations_total{status="success"}[5m]))

# Kafka Lag
sum(kafka_consumer_lag{consumer_group="matching-service"})

# Availability
sum(rate(matching_operations_total{status="success"}[30d])) 
/ sum(rate(matching_operations_total[30d]))
```

### Alerting Rules

```yaml
groups:
  - name: matching-slo
    rules:
      - alert: MatchingLatencyHigh
        expr: |
          histogram_quantile(0.95, 
            sum(rate(matching_duration_seconds_bucket[5m])) by (le)
          ) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Matching latency P95 above 500ms"
          
      - alert: MatchingLagCritical
        expr: |
          sum(kafka_consumer_lag{consumer_group="matching-service"}) > 1000
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Matching consumer lag above 1000"
```

---

## F.3 Execution-Service SLOs

### Service Description

The Execution-Service handles transport execution status updates and proof of delivery.

### SLIs

| SLI Name | Description | Measurement |
|----------|-------------|-------------|
| `status_update_latency` | Time to process status update | Histogram P95 |
| `pod_upload_success` | POD upload success rate | Counter ratio |
| `execution_availability` | Percentage of successful updates | Counter ratio |

### SLOs

| SLO | Target | Window | Error Budget |
|-----|--------|--------|--------------|
| Status Update Latency P95 | < 200 ms | 5 min rolling | N/A |
| POD Upload Success | > 99.5% | 24h rolling | 7.2 min/day |
| Availability | 99.9% | 30 days | 43.2 min/month |

### PromQL Queries

```promql
# Status Update Latency P95
histogram_quantile(0.95, 
  sum(rate(execution_status_update_duration_seconds_bucket[5m])) by (le)
)

# POD Upload Success Rate
sum(rate(pod_uploads_total{status="success"}[24h])) 
/ sum(rate(pod_uploads_total[24h]))

# Availability
sum(rate(http_requests_total{service="execution-service",status!~"5.."}[30d])) 
/ sum(rate(http_requests_total{service="execution-service"}[30d]))
```

---

## F.4 API-Gateway SLOs

### Service Description

The API-Gateway handles authentication, authorization, rate limiting, and routing.

### SLIs

| SLI Name | Description | Measurement |
|----------|-------------|-------------|
| `auth_latency` | Time to validate JWT | Histogram P95 |
| `rate_limit_false_positive` | Legitimate requests blocked | Counter ratio |
| `upstream_latency` | Time to reach upstream service | Histogram P95 |
| `gateway_availability` | Percentage of successful requests | Counter ratio |
| `mtls_handshake_success` | mTLS handshake success rate | Counter ratio |

### SLOs

| SLO | Target | Window | Error Budget |
|-----|--------|--------|--------------|
| Auth Latency P95 | < 50 ms | 5 min rolling | N/A |
| Rate Limit False-Positives | < 0.1% | 24h rolling | 8.6 min/day |
| Upstream Latency P95 | < 100 ms | 5 min rolling | N/A |
| Availability | 99.99% | 30 days | 4.3 min/month |

### PromQL Queries

```promql
# Auth Latency P95
histogram_quantile(0.95, 
  sum(rate(jwt_validation_duration_seconds_bucket[5m])) by (le)
)

# Rate Limit False Positives
sum(rate(rate_limit_false_positives_total[24h])) 
/ sum(rate(http_requests_total{method="POST"}[24h]))

# Upstream Latency P95
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket{service="api-gateway"}[5m])) by (le)
)

# Gateway Availability
sum(rate(http_requests_total{service="api-gateway",status!~"5.."}[30d])) 
/ sum(rate(http_requests_total{service="api-gateway"}[30d]))

# mTLS Handshake Success
sum(rate(mtls_handshake_total{status="success"}[5m])) 
/ sum(rate(mtls_handshake_total[5m]))
```

### Alerting Rules

```yaml
groups:
  - name: gateway-slo
    rules:
      - alert: GatewayAuthSlow
        expr: |
          histogram_quantile(0.95, 
            sum(rate(jwt_validation_duration_seconds_bucket[5m])) by (le)
          ) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Gateway auth latency P95 above 50ms"
          
      - alert: GatewayAvailabilityReduced
        expr: |
          sum(rate(http_requests_total{service="api-gateway",status!~"5.."}[1h])) 
          / sum(rate(http_requests_total{service="api-gateway"}[1h])) < 0.9999
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Gateway availability below 99.99%"
```

---

## F.5 Order-Service SLOs

### SLIs

| SLI Name | Description | Measurement |
|----------|-------------|-------------|
| `order_creation_latency` | Time to create order | Histogram P95 |
| `order_status_update_latency` | Time to update status | Histogram P95 |
| `order_availability` | Percentage of successful operations | Counter ratio |

### SLOs

| SLO | Target | Window | Error Budget |
|-----|--------|--------|--------------|
| Order Creation P95 | < 300 ms | 5 min rolling | N/A |
| Status Update P95 | < 200 ms | 5 min rolling | N/A |
| Availability | 99.9% | 30 days | 43.2 min/month |

---

## F.6 Risk-Service SLOs

### SLIs

| SLI Name | Description | Measurement |
|----------|-------------|-------------|
| `risk_calculation_latency` | Time to calculate risk score | Histogram P95 |
| `risk_escalation_latency` | Time to escalate to support | Histogram P95 |
| `risk_availability` | Percentage of successful calculations | Counter ratio |

### SLOs

| SLO | Target | Window | Error Budget |
|-----|--------|--------|--------------|
| Risk Calculation P95 | < 250 ms | 5 min rolling | N/A |
| Escalation Latency | < 500 ms | 5 min rolling | N/A |
| Availability | 99.9% | 30 days | 43.2 min/month |

---

## F.7 Security-Config-Service SLOs

### SLIs

| SLI Name | Description | Measurement |
|----------|-------------|-------------|
| `config_fetch_latency` | Time to fetch config | Histogram P95 |
| `config_validation_latency` | Time to validate config | Histogram P95 |
| `cache_hit_rate` | Percentage of cache hits | Counter ratio |
| `config_availability` | Percentage of successful fetches | Counter ratio |

### SLOs

| SLO | Target | Window | Error Budget |
|-----|--------|--------|--------------|
| Config Fetch P95 | < 100 ms | 5 min rolling | N/A |
| Cache Hit Rate | > 90% | 24h rolling | N/A |
| Availability | 99.99% | 30 days | 4.3 min/month |

---

## SLO Dashboard Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CARGOBIT SLO DASHBOARD                           │
├─────────────────────────────────────────────────────────────────────────┤
│ Service            │ SLO      │ Current  │ Status │ Error Budget Burn  │
├────────────────────┼──────────┼──────────┼────────┼────────────────────┤
│ Pricing-Service    │ 99.9%    │ 99.95%   │ ✅     │ 0.5x (healthy)     │
│ Matching-Service   │ 99.9%    │ 99.87%   │ ⚠️     │ 1.3x (warning)     │
│ Execution-Service  │ 99.9%    │ 99.92%   │ ✅     │ 0.8x (healthy)     │
│ API-Gateway        │ 99.99%   │ 99.98%   │ ⚠️     │ 2x (attention)     │
│ Order-Service      │ 99.9%    │ 99.93%   │ ✅     │ 0.7x (healthy)     │
│ Risk-Service       │ 99.9%    │ 99.91%   │ ✅     │ 0.9x (healthy)     │
│ Security-Config    │ 99.99%   │ 99.99%   │ ✅     │ 0.1x (healthy)     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Error Budget Policy

| Burn Rate | Action |
|-----------|--------|
| < 1x | Normal operations |
| 1x - 2x | Review in daily standup |
| 2x - 5x | Freeze non-critical releases |
| > 5x | Incident response, all hands |

---

## Review Schedule

- **Daily:** Automated SLO report in Slack
- **Weekly:** Platform team review
- **Monthly:** Stakeholder report
- **Quarterly:** SLO target review and adjustment
