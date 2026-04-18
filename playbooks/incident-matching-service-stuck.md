# Incident Playbook: Matching-Service Stuck / No Matches Produced

**Severity:** P1 - Critical  
**Service:** matching-service  
**Last Updated:** 2024-01-15  
**Owner:** Backend Team  

---

## Quick Reference

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Matching Latency P95 | > 1s | `matching-latency-high` |
| Kafka Lag | > 5000 | `matching-lag-critical` |
| Events/second | < 10 | `matching-stuck` |

---

## Trigger

1. **matching.completed Events fehlen** - Keine neuen Events in letzter Zeit
2. **Matching-Latency steigt** auf > 1s P95
3. **Kafka Lag steigt** auf > 5000 Events
4. **Orders bleiben im "Bidding" Status hängen**
5. **Carrier sehen keine Matching-Ergebnisse**

---

## Impact

| Stakeholder | Impact |
|-------------|--------|
| Shipper | Orders ohne Carrier-Zuweisung |
| Carrier | Keine Aufträge angezeigt |
| Operations | Backlog baut sich auf |
| Revenue | Orders werden nicht abgewickelt |

**Business Impact Score:** 9/10 (kritisch)

---

## Diagnosis Steps

### Step 1: Check Matching Metrics (2 min)

```bash
# Check matching latency
curl -s http://prometheus.observability:9090/api/v1/query \
  --data-urlencode 'query=histogram_quantile(0.95, matching_duration_seconds_bucket)'

# Check events processed
curl -s http://prometheus.observability:9090/api/v1/query \
  --data-urlencode 'query=rate(matching_operations_total[5m])'

# Check fraud penalty calculation time
curl -s http://prometheus.observability:9090/api/v1/query \
  --data-urlencode 'query=matching_fraud_penalty_duration_seconds'
```

### Step 2: Check Kafka Consumer Status (2 min)

```bash
# Check consumer group status
kubectl exec -n data kafka-consumer-groups -- bootstrap-server kafka:9092 \
  --describe --group matching-service

# Check lag per partition
kubectl exec -n data kafka-console-consumer -- bootstrap-server kafka:9092 \
  --from-beginning --max-messages 1 --topic pricing.validation.completed
```

### Step 3: Check Logs for Errors (2 min)

```bash
# Recent errors
kubectl logs -n domain -l app=matching-service --tail=200 | grep -i error

# Check for deadlocks
kubectl logs -n domain -l app=matching-service --tail=500 | grep -iE "(deadlock|timeout|stuck)"

# Check fraud penalty errors
kubectl logs -n domain -l app=matching-service --tail=500 | grep -i "fraud.*penalty"
```

### Step 4: Check Database Locks (2 min)

```bash
# Check for locks
kubectl exec -n domain deploy/matching-service -- curl -s localhost:9090/metrics | grep db_lock

# Direct DB query for locks
kubectl run pg-test --rm -it --image=postgres:15 -- psql $DATABASE_URL -c "
  SELECT pid, state, query, wait_event 
  FROM pg_stat_activity 
  WHERE wait_event IS NOT NULL;
"
```

### Step 5: Check Resource Saturation (1 min)

```bash
# CPU/Memory
kubectl top pods -n domain -l app=matching-service

# Check HPA status
kubectl get hpa matching-service -n domain

# Check for throttling
kubectl describe pod -n domain -l app=matching-service | grep -i cpu
```

---

## Immediate Actions

### Action 1: Scale Matching Workers

```bash
# Immediate scale up
kubectl scale deployment matching-service -n domain --replicas=6

# Check if autoscaling works
kubectl get hpa matching-service -n domain -w
```

### Action 2: Deactivate Fraud-Penalty Temporarily

```bash
# Disable fraud penalty via feature flag
kubectl patch configmap matching-service-config -n domain --type=merge \
  -p '{"data":{"FRAUD_PENALTY_ENABLED":"false"}}'

# Restart to apply
kubectl rollout restart deployment/matching-service -n domain
```

### Action 3: Trigger Kafka Partition Rebalance

```bash
# Reset consumer group (WARNING: will reprocess messages)
kubectl exec -n data kafka-consumer-groups -- bootstrap-server kafka:9092 \
  --group matching-service --reset-offsets --to-latest --execute --all-topics

# Restart consumers to trigger rebalance
kubectl rollout restart deployment/matching-service -n domain
```

### Action 4: Clear Stuck Orders (Manual Intervention)

```bash
# Get stuck orders
kubectl exec -n domain deploy/order-service -- curl -s localhost:3000/api/internal/stuck-orders

# Force status update (requires admin token)
curl -X POST https://api.cargobit.io/admin/orders/bulk-retry \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status":"bidding"}'
```

---

## Root Cause Analysis

### Possible Root Causes

| Root Cause | Probability | Detection |
|------------|-------------|-----------|
| Fraud-Score Calculation zu teuer | 35% | High CPU, slow matching.log |
| Deadlock in Bid-Aggregation | 25% | DB lock query shows blocking |
| Kafka Partition Hotspot | 20% | Uneven lag across partitions |
| Memory Pressure / GC | 10% | High memory, GC pauses in logs |
| Network Latency | 10% | High RTT to dependencies |

### Investigation Commands

```bash
# Profile matching service (if pprof enabled)
kubectl exec -n domain deploy/matching-service -- curl -s localhost:6060/debug/pprof/profile?seconds=30 > matching.prof

# Check for hot partitions
kubectl exec -n data kafka-topics -- bootstrap-server kafka:9092 \
  --describe --topic matching.requests

# Check GC logs
kubectl logs -n domain -l app=matching-service | grep -i "gc\|garbage"
```

---

## Follow-Up Actions

### Short-Term (24h)

- [ ] Matching-Profiling durchführen
- [ ] Fraud-Score Pre-Computation in Pricing-Service implementieren
- [ ] Partition-Key Strategie ändern (von orderId zu carrierId)

### Medium-Term (1 Woche)

- [ ] Fraud-Penalty Calculation optimieren (Caching)
- [ ] Matching-Algorithm refactoring
- [ ] Consumer Group Tuning (max.poll.records, fetch.max.bytes)

### Long-Term (1 Monat)

- [ ] Partition Rebalancing Automation
- [ ] Matching-Service Chaos Tests
- [ ] Performance Baseline Tests

---

## Related Metrics Dashboard

```
[Grafana Dashboard: matching-service]
┌─────────────────────────────────────────────────────────┐
│ Matching Latency P95: [████████░░] 850ms (threshold: 1s) │
│ Events/sec:            [████░░░░░░] 45/sec              │
│ Kafka Lag:             [██████████] 12,000 ⚠️           │
│ Fraud Penalty Time:    [██████░░░░] 120ms               │
└─────────────────────────────────────────────────────────┘
```

---

## Related Playbooks

- [E.1 Pricing-Service Down](./incident-pricing-service-down.md)
- [E.4 Kafka Lag](./incident-kafka-lag.md)
