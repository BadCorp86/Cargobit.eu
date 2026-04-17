# CargoBit End-to-End Deployment Playbook

**Version:** 2024-01-15-01  
**Owner:** Platform Team  
**Environment:** Production  

---

## Overview

This playbook describes the complete deployment sequence for the CargoBit Transport Platform. Following this order ensures proper dependency resolution and service availability.

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT PHASES                            │
├─────────────────────────────────────────────────────────────────┤
│  Phase 1: Infrastructure (K8s, Namespaces, Storage, Secrets)    │
│  Phase 2: Core Layer (Auth, Config, Gateway, Observability)     │
│  Phase 3: Domain Layer (Order → Pricing → Matching → Execution) │
│  Phase 4: Smoke Tests (Functional Validation)                    │
│  Phase 5: Load Tests (Performance Validation)                    │
│  Phase 6: Go-Live Checklist (Final Validation)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Infrastructure

### 1.1 Kubernetes Cluster

```bash
# Verify cluster access
kubectl cluster-info
kubectl get nodes

# Expected output: 3+ nodes, Ready status
```

### 1.2 Namespaces

```bash
# Create namespaces
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: core
  labels:
    type: core
---
apiVersion: v1
kind: Namespace
metadata:
  name: domain
  labels:
    type: domain
---
apiVersion: v1
kind: Namespace
metadata:
  name: data
  labels:
    type: data
---
apiVersion: v1
kind: Namespace
metadata:
  name: observability
  labels:
    name: observability
EOF

# Verify namespaces
kubectl get namespaces
```

### 1.3 Secrets

```bash
# Create JWT signing keys
kubectl create secret generic jwt-keys -n core \
  --from-literal=jwt-private-key="$(openssl rand -base64 32)" \
  --from-literal=jwt-public-key="$(openssl rand -base64 32)"

# Create mTLS certificates
kubectl create secret generic internal-ca -n core \
  --from-file=ca.crt=./certs/ca.crt \
  --from-file=ca.key=./certs/ca.key

# Create service-specific certificates
./scripts/generate-service-certs.sh pricing-service domain
./scripts/generate-service-certs.sh matching-service domain
./scripts/generate-service-certs.sh order-service domain
./scripts/generate-service-certs.sh risk-service domain
./scripts/generate-service-certs.sh security-config-service core

# Create database credentials
kubectl create secret generic postgres-credentials -n data \
  --from-literal=username=cargobit \
  --from-literal=password="$(openssl rand -base64 24)"

# Create Redis credentials
kubectl create secret generic redis-credentials -n data \
  --from-literal=password="$(openssl rand -base64 24)"

# Verify secrets
kubectl get secrets -n core
kubectl get secrets -n domain
kubectl get secrets -n data
```

### 1.4 Storage Infrastructure

```bash
# Deploy PostgreSQL
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install postgresql bitnami/postgresql -n data -f helm/data/postgresql/values.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql -n data --timeout=300s

# Deploy Redis
helm install redis bitnami/redis -n data -f helm/data/redis/values.yaml

# Wait for Redis to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis -n data --timeout=300s

# Deploy Kafka
helm repo add strimzi https://strimzi.io/charts/
helm install kafka strimzi/strimzi-kafka-operator -n data
kubectl apply -f kafka-cluster.yaml -n data

# Wait for Kafka to be ready
kubectl wait --for=condition=ready kafka/cargobit-kafka -n data --timeout=600s

# Deploy MinIO (S3-compatible storage)
helm install minio bitnami/minio -n data -f helm/data/minio/values.yaml

# Verify storage
kubectl get pods -n data
```

### Phase 1 Checklist

- [ ] Kubernetes cluster accessible
- [ ] Namespaces created (core, domain, data, observability)
- [ ] JWT keys created
- [ ] mTLS certificates created for all services
- [ ] PostgreSQL running
- [ ] Redis running
- [ ] Kafka running
- [ ] MinIO running

---

## Phase 2: Core Layer

### 2.1 Observability Stack

```bash
# Deploy Prometheus
helm install prometheus prometheus-community/prometheus -n observability \
  -f helm/observability/prometheus/values.yaml

# Deploy Grafana
helm install grafana grafana/grafana -n observability \
  -f helm/observability/grafana/values.yaml

# Deploy Loki (logs)
helm install loki grafana/loki -n observability \
  -f helm/observability/loki/values.yaml

# Deploy Tempo (tracing)
helm install tempo grafana/tempo -n observability \
  -f helm/observability/tempo/values.yaml

# Wait for observability stack
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=prometheus -n observability --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=grafana -n observability --timeout=300s

# Import dashboards
kubectl create configmap grafana-dashboards -n observability \
  --from-file=./observability/grafana/dashboards/

# Verify observability
kubectl get pods -n observability
kubectl port-forward svc/grafana -n observability 3000:80
# Open http://localhost:3000
```

### 2.2 Security-Config-Service

```bash
# Deploy Security-Config-Service
helm install security-config-service ./helm/core/security-config-service -n core

# Wait for deployment
kubectl rollout status deployment/security-config-service -n core --timeout=300s

# Verify config service
kubectl exec -n core deploy/security-config-service -- curl -s localhost:3005/health
kubectl exec -n core deploy/security-config-service -- curl -s localhost:3005/v1/config/version

# Seed initial config
kubectl exec -n core deploy/security-config-service -- curl -X POST localhost:3005/v1/config \
  -H "Content-Type: application/json" -d @./config/initial-security-config.json
```

### 2.3 Auth-Service

```bash
# Deploy Auth-Service
helm install auth-service ./helm/core/auth-service -n core

# Wait for deployment
kubectl rollout status deployment/auth-service -n core --timeout=300s

# Verify auth service
kubectl exec -n core deploy/auth-service -- curl -s localhost:3001/health
```

### 2.4 API-Gateway

```bash
# Deploy API-Gateway
helm install api-gateway ./helm/core/api-gateway -n core

# Wait for deployment
kubectl rollout status deployment/api-gateway -n core --timeout=300s

# Verify gateway
kubectl exec -n core deploy/api-gateway -- curl -s localhost:8080/health

# Test JWT validation
curl -X POST https://api.cargobit.io/auth/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"test-key"}' # Should return 401 for invalid key
```

### Phase 2 Checklist

- [ ] Prometheus running and scraping
- [ ] Grafana accessible with dashboards
- [ ] Loki receiving logs
- [ ] Tempo receiving traces
- [ ] Security-Config-Service healthy
- [ ] Config version confirmed (2024-01-15-01)
- [ ] Auth-Service healthy
- [ ] API-Gateway healthy and routing

---

## Phase 3: Domain Layer

### Deployment Order (Dependency-Based)

```
1. carrier-service    (no dependencies)
2. shipper-service    (no dependencies)
3. order-service      → depends on security-config, auth
4. pricing-service    → depends on security-config, kafka, redis
5. bidding-service    → depends on order, pricing
6. matching-service   → depends on pricing, kafka, security-config
7. execution-service  → depends on matching, order
8. risk-service       → depends on security-config, kafka
```

### 3.1 Carrier-Service

```bash
helm install carrier-service ./helm/domain/carrier-service -n domain
kubectl rollout status deployment/carrier-service -n domain --timeout=300s

# Verify
kubectl exec -n domain deploy/carrier-service -- curl -s localhost:3000/health
```

### 3.2 Shipper-Service

```bash
helm install shipper-service ./helm/domain/shipper-service -n domain
kubectl rollout status deployment/shipper-service -n domain --timeout=300s

# Verify
kubectl exec -n domain deploy/shipper-service -- curl -s localhost:3000/health
```

### 3.3 Order-Service

```bash
helm install order-service ./helm/domain/order-service -n domain
kubectl rollout status deployment/order-service -n domain --timeout=300s

# Verify
kubectl exec -n domain deploy/order-service -- curl -s localhost:3000/health

# Check DB connection
kubectl exec -n domain deploy/order-service -- curl -s localhost:9090/metrics | grep db_pool_active
```

### 3.4 Pricing-Service

```bash
helm install pricing-service ./helm/domain/pricing-service -n domain
kubectl rollout status deployment/pricing-service -n domain --timeout=300s

# Verify
kubectl exec -n domain deploy/pricing-service -- curl -s localhost:3000/health
kubectl exec -n domain deploy/pricing-service -- curl -s localhost:3000/ready

# Check config connection
kubectl exec -n domain deploy/pricing-service -- curl -s http://security-config-service.core:3005/v1/config/version
```

### 3.5 Bidding-Service

```bash
helm install bidding-service ./helm/domain/bidding-service -n domain
kubectl rollout status deployment/bidding-service -n domain --timeout=300s

# Verify
kubectl exec -n domain deploy/bidding-service -- curl -s localhost:3000/health
```

### 3.6 Matching-Service

```bash
helm install matching-service ./helm/domain/matching-service -n domain
kubectl rollout status deployment/matching-service -n domain --timeout=300s

# Verify
kubectl exec -n domain deploy/matching-service -- curl -s localhost:3000/health

# Check Kafka consumer group
kubectl exec -n data kafka-consumer-groups -- bootstrap-server kafka:9092 \
  --describe --group matching-service
```

### 3.7 Execution-Service

```bash
helm install execution-service ./helm/domain/execution-service -n domain
kubectl rollout status deployment/execution-service -n domain --timeout=300s

# Verify
kubectl exec -n domain deploy/execution-service -- curl -s localhost:3000/health
```

### 3.8 Risk-Service

```bash
helm install risk-service ./helm/domain/risk-service -n domain
kubectl rollout status deployment/risk-service -n domain --timeout=300s

# Verify
kubectl exec -n domain deploy/risk-service -- curl -s localhost:3000/health
```

### Phase 3 Checklist

- [ ] Carrier-Service healthy
- [ ] Shipper-Service healthy
- [ ] Order-Service healthy
- [ ] Pricing-Service healthy
- [ ] Bidding-Service healthy
- [ ] Matching-Service healthy
- [ ] Execution-Service healthy
- [ ] Risk-Service healthy
- [ ] All services connected to Security-Config
- [ ] All services connected to Kafka
- [ ] All services connected to PostgreSQL

---

## Phase 4: Smoke Tests

### 4.1 Pricing Validation

```bash
# Test bid validation
curl -X POST https://api.cargobit.io/api/pricing/orders/test-order/bid/validate \
  -H "Authorization: Bearer $CARRIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "carrierId": "carrier-001",
    "bidAmount": 1250.00,
    "currency": "EUR"
  }'

# Expected: 200 OK with fraud score
```

### 4.2 Bid Submission

```bash
# Submit a bid
curl -X POST https://api.cargobit.io/api/bids \
  -H "Authorization: Bearer $CARRIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-001",
    "carrierId": "carrier-001",
    "amount": 1250.00,
    "currency": "EUR"
  }'

# Expected: 201 Created with bid ID
```

### 4.3 Matching Flow

```bash
# Create order
curl -X POST https://api.cargobit.io/api/orders \
  -H "Authorization: Bearer $SHIPPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": {"lat": 52.52, "lng": 13.405},
    "deliveryLocation": {"lat": 48.8566, "lng": 2.3522},
    "cargoType": "PALLET",
    "weight": 500
  }'

# Expected: 201 Created with order ID

# Wait for matching (10 seconds)
sleep 10

# Check matching results
curl https://api.cargobit.io/api/matching/results/order-001 \
  -H "Authorization: Bearer $SHIPPER_TOKEN"

# Expected: 200 OK with ranked carriers
```

### 4.4 Execution Status Update

```bash
# Update transport status
curl -X POST https://api.cargobit.io/api/executions/transport-001/status \
  -H "Authorization: Bearer $CARRIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_TRANSIT",
    "location": {"lat": 50.0, "lng": 10.0}
  }'

# Expected: 200 OK
```

### 4.5 Fraud-Score Calculation

```bash
# Trigger fraud score calculation
curl -X POST https://api.cargobit.io/api/risk/calculate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "CARRIER",
    "entityId": "carrier-001"
  }'

# Expected: 200 OK with risk score
```

### 4.6 Config Reload

```bash
# Trigger config reload
curl -X POST https://api.cargobit.io/internal/config/reload \
  -H "Authorization: Bearer $SYSTEM_TOKEN"

# Expected: 200 OK

# Verify new version
curl https://api.cargobit.io/internal/config/version \
  -H "Authorization: Bearer $SYSTEM_TOKEN"

# Expected: Current version (e.g., 2024-01-15-01)
```

### Phase 4 Checklist

- [ ] Pricing validation returns fraud score
- [ ] Bid submission creates bid record
- [ ] Matching flow produces ranked carriers
- [ ] Status update works end-to-end
- [ ] Fraud score calculation works
- [ ] Config reload works

---

## Phase 5: Load Tests

### 5.1 Test Configuration

```yaml
# load-test-config.yaml
scenarios:
  orders:
    rate: 1000  # orders per minute
    duration: 10m
    
  bids:
    rate: 5000  # bids per minute
    duration: 10m
    
  status_updates:
    rate: 2000  # updates per minute
    duration: 10m
```

### 5.2 Run Load Tests

```bash
# Install k6
brew install k6  # or equivalent

# Run order load test
k6 run --vus 100 --duration 10m ./load-tests/orders.js

# Run bid load test
k6 run --vus 200 --duration 10m ./load-tests/bids.js

# Run status update load test
k6 run --vus 150 --duration 10m ./load-tests/status-updates.js

# Run fraud score stress test
k6 run --vus 50 --duration 5m ./load-tests/fraud-scoring.js

# Run gateway rate limit test
k6 run --vus 300 --duration 5m ./load-tests/gateway-ratelimit.js
```

### 5.3 Monitor During Load Tests

```bash
# Watch pod scaling
watch kubectl get pods -n domain

# Watch resource usage
watch kubectl top pods -n domain

# Watch SLO metrics
curl -s http://prometheus.observability:9090/api/v1/query \
  --data-urlencode 'query=slo:pricing:availability:5m'

# Watch error rates
curl -s http://prometheus.observability:9090/api/v1/query \
  --data-urlencode 'query=sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)'
```

### Phase 5 Checklist

- [ ] Order load test: 1000/min for 10 min
- [ ] Bid load test: 5000/min for 10 min
- [ ] Status update test: 2000/min for 10 min
- [ ] Fraud score stress test passed
- [ ] Gateway rate limit test passed
- [ ] All SLOs maintained during load
- [ ] HPA scaling worked correctly

---

## Phase 6: Go-Live Checklist

### 6.1 SLO Dashboards

```bash
# Verify Grafana dashboards are active
curl -s http://grafana.observability:3000/api/search?query=slo

# Verify SLO recording rules
curl -s http://prometheus.observability:9090/api/v1/rules | jq '.data.groups[].name' | grep slo

# Take SLO baseline snapshot
curl -s http://prometheus.observability:9090/api/v1/query \
  --data-urlencode 'query=slo:pricing:error_budget_remaining:30d' > slo-baseline.json
```

### 6.2 Alerting

```bash
# Verify alert rules are loaded
curl -s http://prometheus.observability:9090/api/v1/rules | jq '.data.groups[].rules[].name'

# Test alert notification
curl -X POST http://prometheus.observability:9090/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{"labels":{"alertname":"TestAlert","severity":"none"},"annotations":{"summary":"Test alert"}}]'

# Verify Slack/PagerDuty integration
# Check #platform-alerts channel for test alert
```

### 6.3 On-Call Rotation

```bash
# Verify PagerDuty schedule
# https://yourcompany.pagerduty.com/schedules

# Add on-call to monitoring
kubectl create configmap on-call-config -n observability \
  --from-literal=primary="platform-team@example.com" \
  --from-literal=secondary="backend-team@example.com"
```

### 6.4 Incident Playbooks

```bash
# Verify playbooks are accessible
ls -la playbooks/

# Distribute to team
# - Upload to Confluence
# - Pin in Slack channel
# - Add to PagerDuty runbook links
```

### 6.5 Config Version Pinned

```bash
# Pin current config version
CURRENT_VERSION=$(curl -s http://security-config-service.core:3005/v1/config/version)
echo "Pinned version: $CURRENT_VERSION"

# Store in configmap
kubectl create configmap pinned-config-version -n core \
  --from-literal=version="$CURRENT_VERSION"

# Set rollback target
kubectl create configmap rollback-config -n core \
  --from-literal=target-version="$CURRENT_VERSION"
```

### 6.6 Canary Deployment

```bash
# Enable canary for pricing-service
kubectl apply -f - <<EOF
apiVersion: flagger.app/v1beta3
kind: Canary
metadata:
  name: pricing-service
  namespace: domain
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: pricing-service
  progressDeadlineSeconds: 600
  service:
    port: 3000
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
EOF

# Verify canary is active
kubectl get canary -n domain
```

### 6.7 Rollback Plan

```bash
# Create rollback script
cat > rollback.sh << 'EOF'
#!/bin/bash
VERSION=$1

# Rollback pricing-service
kubectl rollout undo deployment/pricing-service -n domain

# Rollback matching-service
kubectl rollout undo deployment/matching-service -n domain

# Rollback to previous config
kubectl exec -n core deploy/security-config-service -- \
  curl -X POST localhost:3005/v1/config/rollback \
  -H "Content-Type: application/json" \
  -d "{\"targetVersion\":\"$VERSION\"}"

echo "Rollback complete"
EOF

chmod +x rollback.sh

# Store rollback instructions
kubectl create configmap rollback-instructions -n core \
  --from-file=rollback.sh=rollback.sh
```

### Phase 6 Checklist

- [ ] SLO dashboards active and visible
- [ ] All alert rules loaded and firing to correct channels
- [ ] On-call rotation defined in PagerDuty
- [ ] Incident playbooks distributed to team
- [ ] Config version pinned and documented
- [ ] Canary deployment enabled for critical services
- [ ] Rollback plan tested and documented
- [ ] Rollback script accessible

---

## Post-Deployment

### Immediate Actions (First Hour)

1. Monitor SLO dashboard for anomalies
2. Check error rates in Grafana
3. Verify Kafka consumer lag is stable
4. Confirm all alerts are flowing correctly

### Daily Actions (First Week)

1. Review SLO performance in daily standup
2. Check error budget burn rate
3. Monitor HPA scaling behavior
4. Review slow queries in database logs

### Weekly Actions (First Month)

1. SLO target review
2. Error budget status report
3. Capacity planning review
4. Incident trend analysis

---

## Troubleshooting

### Common Issues

| Issue | Diagnosis | Resolution |
|-------|-----------|------------|
| Service not starting | Check logs, events, configmaps | Verify secrets, config, resources |
| Database connection fails | Check credentials, network policy | Verify secret, policy allows egress |
| Kafka consumer lag high | Check consumer performance | Scale consumers, check for slow processing |
| Config not loading | Check security-config-service | Verify config version, validation |

### Emergency Contacts

| Role | Contact |
|------|---------|
| Platform On-Call | pagerduty.com/platform |
| Backend Lead | backend-lead@example.com |
| CTO | cto@example.com |
