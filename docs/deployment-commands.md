# CargoBit Deployment Commands Quick Reference

## Phase 1: Infrastructure

```bash
# Namespaces
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata: { name: core, labels: { type: core } }
---
apiVersion: v1
kind: Namespace
metadata: { name: domain, labels: { type: domain } }
---
apiVersion: v1
kind: Namespace
metadata: { name: data, labels: { type: data } }
---
apiVersion: v1
kind: Namespace
metadata: { name: observability, labels: { name: observability } }
EOF

# Secrets
kubectl create secret generic jwt-keys -n core --from-literal=jwt-private-key="$(openssl rand -base64 32)"
kubectl create secret generic internal-ca -n core --from-file=ca.crt=./certs/ca.crt

# PostgreSQL
helm install postgresql bitnami/postgresql -n data -f helm/data/postgresql/values.yaml

# Redis
helm install redis bitnami/redis -n data -f helm/data/redis/values.yaml

# Kafka
helm install kafka strimzi/strimzi-kafka-operator -n data
kubectl apply -f kafka-cluster.yaml -n data
```

## Phase 2: Core Layer

```bash
# Observability
helm install prometheus prometheus-community/prometheus -n observability -f helm/observability/prometheus/values.yaml
helm install grafana grafana/grafana -n observability -f helm/observability/grafana/values.yaml
helm install loki grafana/loki -n observability -f helm/observability/loki/values.yaml
helm install tempo grafana/tempo -n observability -f helm/observability/tempo/values.yaml

# Security-Config-Service
helm install security-config-service ./helm/core/security-config-service -n core
kubectl rollout status deployment/security-config-service -n core --timeout=300s

# Auth-Service
helm install auth-service ./helm/core/auth-service -n core

# API-Gateway
helm install api-gateway ./helm/core/api-gateway -n core
```

## Phase 3: Domain Layer

```bash
# Deploy in order
helm install carrier-service ./helm/domain/carrier-service -n domain
helm install shipper-service ./helm/domain/shipper-service -n domain
helm install order-service ./helm/domain/order-service -n domain
helm install pricing-service ./helm/domain/pricing-service -n domain
helm install bidding-service ./helm/domain/bidding-service -n domain
helm install matching-service ./helm/domain/matching-service -n domain
helm install execution-service ./helm/domain/execution-service -n domain
helm install risk-service ./helm/domain/risk-service -n domain
```

## Smoke Tests

```bash
# Pricing validation
curl -X POST https://api.cargobit.io/api/pricing/orders/test/bid/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"carrierId":"c1","bidAmount":1250}'

# Bid submission
curl -X POST https://api.cargobit.io/api/bids \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"o1","carrierId":"c1","amount":1250}'

# Matching
curl https://api.cargobit.io/api/matching/results/o1 -H "Authorization: Bearer $TOKEN"

# Config reload
curl -X POST https://api.cargobit.io/internal/config/reload -H "Authorization: Bearer $SYSTEM_TOKEN"
```

## Rollback

```bash
# Rollback deployment
kubectl rollout undo deployment/pricing-service -n domain

# Rollback config
kubectl exec -n core deploy/security-config-service -- \
  curl -X POST localhost:3005/v1/config/rollback \
  -H "Content-Type: application/json" \
  -d '{"targetVersion":"2024-01-14-01"}'
```

## Monitoring

```bash
# Check all pods
kubectl get pods -n domain -o wide

# Check resources
kubectl top pods -n domain

# Check SLOs
curl -s http://prometheus.observability:9090/api/v1/query?query=slo:pricing:availability:5m

# Check Kafka lag
kubectl exec -n data kafka-consumer-groups -- bootstrap-server kafka:9092 --describe --all-groups
```
