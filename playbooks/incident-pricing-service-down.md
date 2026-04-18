# Incident Playbook: Pricing-Service Down / Validation Fails

**Severity:** P1 - Critical  
**Service:** pricing-service  
**Last Updated:** 2024-01-15  
**Owner:** Platform Team  

---

## Quick Reference

| Metric | Threshold | Alert |
|--------|-----------|-------|
| 5xx Rate | > 5% | `pricing-5xx-critical` |
| Validation Success | < 95% | `pricing-validation-failing` |
| Fraud Score Calculation | > 500ms P95 | `pricing-fraud-slow` |

---

## Trigger

1. **5xx-Rate steigt** auf > 5% im Pricing-Service
2. **Bid-Validation schlägt fehl** mit HTTP 500/503
3. **Fraud-Score wird nicht berechnet** (Timeout oder Error)
4. **Matching bekommt keine neuen validierten Bids** (Kafka Lag steigt)
5. **Health Check failed** - `/ready` returning 503

---

## Impact

| Stakeholder | Impact |
|-------------|--------|
| Carrier | Können keine Bids abgeben |
| Shipper | Orders bleiben ohne Angebote |
| Matching | Keine neuen Bids zum Matchen |
| Revenue | Direkter Umsatzverlust pro Minute |

**Business Impact Score:** 10/10 (kritisch)

---

## Diagnosis Steps

### Step 1: Check Pod Status (2 min)

```bash
# Check pod status
kubectl get pods -n domain -l app=pricing-service

# Check pod events
kubectl describe pod -n domain -l app=pricing-service | grep -A 20 "Events:"

# Check recent restarts
kubectl get events -n domain --sort-by='.lastTimestamp' | grep pricing-service
```

### Step 2: Check Logs (2 min)

```bash
# Recent error logs
kubectl logs -n domain -l app=pricing-service --tail=100 | grep -i error

# Check for specific errors
kubectl logs -n domain -l app=pricing-service --tail=500 | grep -E "(CONFIG|FRAUD|DB|TIMEOUT)"

# Structured log query (Loki)
logcli query '{service="pricing-service",level="error"}' --limit=100
```

### Step 3: Check Health Probes (1 min)

```bash
# Check readiness probe
kubectl exec -n domain deploy/pricing-service -- curl -s http://localhost:3000/ready

# Check liveness probe
kubectl exec -n domain deploy/pricing-service -- curl -s http://localhost:3000/health
```

### Step 4: Check Security-Config-Service Reachability (2 min)

```bash
# Test connection from pricing-service
kubectl exec -n domain deploy/pricing-service -- curl -s http://security-config-service.core:3005/v1/config

# Check config service status
kubectl get pods -n core -l app=security-config-service
```

### Step 5: Check Database Connectivity (2 min)

```bash
# Check DB connection pool
kubectl exec -n domain deploy/pricing-service -- curl -s http://localhost:3000/metrics | grep db_pool

# Direct DB test
kubectl run pg-test --rm -it --image=postgres:15 -- psql $DATABASE_URL -c "SELECT 1"
```

### Step 6: Check Kafka Lag (1 min)

```bash
# Check consumer lag
kubectl exec -n data kafka-console-consumer -- bootstrap-server kafka:9092 \
  --group pricing-service --from-beginning --max-messages 1

# Check lag metrics
curl -s http://prometheus.observability:9090/api/v1/query?query=kafka_consumer_lag{consumer_group="pricing-service"}
```

---

## Immediate Actions

### Action 1: Restart Single Pod (Rolling)

```bash
# Restart one pod at a time
kubectl rollout restart deployment/pricing-service -n domain

# Monitor rollout
kubectl rollout status deployment/pricing-service -n domain --timeout=300s
```

### Action 2: Enable Cache Fallback (if Config-Service unreachable)

```bash
# Enable fallback mode via ConfigMap
kubectl patch configmap pricing-service-config -n domain --type=merge \
  -p '{"data":{"CONFIG_FALLBACK_MODE":"cache"}}'

# Restart to apply
kubectl rollout restart deployment/pricing-service -n domain
```

### Action 3: Increase Rate Limit (if Traffic Spike)

```bash
# Temporarily increase rate limits
kubectl patch configmap api-gateway-ratelimits -n core --type=merge \
  -p '{"data":{"pricing_validate_limit":"600"}}'

# Reload gateway
kubectl rollout restart deployment/api-gateway -n core
```

### Action 4: Scale Up (if Resource Exhaustion)

```bash
# Scale pricing-service
kubectl scale deployment pricing-service -n domain --replicas=5

# Check HPA status
kubectl get hpa -n domain
```

---

## Root Cause Analysis

### Possible Root Causes

| Root Cause | Probability | Detection |
|------------|-------------|-----------|
| Config-Reload fehlgeschlagen | 30% | Check logs for "config reload failed" |
| Fraud-Config invalid | 25% | Schema validation errors in logs |
| DB-Connection Pool exhausted | 20% | Pool metrics show 100% utilization |
| Memory-Leak | 15% | Memory growth over time, OOMKilled |
| Kafka Consumer Issues | 10% | High lag, rebalance loops |

### Investigation Commands

```bash
# Check for config errors
kubectl logs -n domain -l app=pricing-service | grep -i "config" | tail -50

# Check memory trends
kubectl top pods -n domain -l app=pricing-service

# Check for OOMKilled
kubectl describe pod -n domain -l app=pricing-service | grep -i oom

# Check DB pool status
kubectl exec -n domain deploy/pricing-service -- curl -s localhost:9090/metrics | grep db_pool_active
```

---

## Follow-Up Actions

### Short-Term (24h)

- [ ] Config-Schema erweitern um fehlende Validierung
- [ ] Circuit-Breaker-Thresholds anpassen (z.B. 50% Fehler → Open)
- [ ] Autoscaling-Regeln prüfen (CPU Target anpassen)
- [ ] Alert-Thresholds verfeinern

### Medium-Term (1 Woche)

- [ ] Memory-Leak Investigation mit Profiling
- [ ] DB-Connection-Pool Sizing anpassen
- [ ] Cache-Fallback automatieren
- [ ] Runbook-Update basierend auf Learnings

### Long-Term (1 Monat)

- [ ] Chaos Engineering Test für Pricing-Service
- [ ] Automated Recovery Pipeline
- [ ] Cross-Team Training

---

## Communication Templates

### Internal Slack (at detection)

```
🚨 P1: Pricing-Service experiencing failures
- 5xx Rate: XX%
- Validation Success: XX%
- Investigation started by: @oncall
- Bridge: [link]
```

### Stakeholder Update (15 min after)

```
**Status:** Investigating
**Impact:** Carriers cannot submit bids, orders are not receiving offers
**Next Update:** +15 min
```

### Resolution (after fix)

```
✅ RESOLVED: Pricing-Service restored
- Root Cause: [RCA summary]
- Duration: XX minutes
- Affected: XX users
- Preventive Actions: [link to ticket]
```

---

## Escalation

| Level | Contact | Response Time |
|-------|---------|---------------|
| L1 | Platform On-Call | 5 min |
| L2 | Backend Lead | 15 min |
| L3 | CTO | 30 min |

---

## Related Playbooks

- [E.3 Fraud-Config Invalid](./incident-fraud-config-invalid.md)
- [E.4 Kafka Lag](./incident-kafka-lag.md)
- [Security-Config-Service Down](./incident-security-config-down.md)
