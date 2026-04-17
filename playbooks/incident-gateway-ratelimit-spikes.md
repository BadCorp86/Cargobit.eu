# Incident Playbook: API-Gateway Rate-Limit Spikes

**Severity:** P2 - High  
**Service:** api-gateway  
**Last Updated:** 2024-01-15  
**Owner:** Platform Team  

---

## Quick Reference

| Metric | Threshold | Alert |
|--------|-----------|-------|
| 429 Rate | > 5% of requests | `rate-limit-spikes` |
| Legitimate 429s | > 1% | `rate-limit-false-positive` |
| Rate Limit Queue | > 1000 | `rate-limit-queue-full` |

---

## Trigger

1. **429-Rate steigt** auf > 5% aller Requests
2. **Carrier können nicht bieten** (429 auf POST /bids)
3. **Shipper können keine Orders erstellen** (429 auf POST /orders)
4. **User-Complaints über "Too Many Requests"**

---

## Impact

| Stakeholder | Impact |
|-------------|--------|
| Carrier | Keine Bids möglich |
| Shipper | Keine Orders möglich |
| Revenue | Direkter Umsatzverlust |
| Reputation | User-Frustration |

**Impact Score:** 8/10 (hoch)

---

## Diagnosis Steps

### Step 1: Check Gateway Metrics (2 min)

```bash
# Overall 429 rate
curl -s http://prometheus.observability:9090/api/v1/query \
  --data-urlencode 'query=sum(rate(http_requests_total{status="429"}[5m])) / sum(rate(http_requests_total[5m]))'

# 429 by route
curl -s http://prometheus.observability:9090/api/v1/query \
  --data-urlencode 'query=sum(rate(http_requests_total{status="429"}[5m])) by (route)'

# Rate limit counter status
curl -s http://prometheus.observability:9090/api/v1/query \
  --data-urlencode 'query=rate_limit_requests_total'
```

### Step 2: Check Rate Limit Logs (2 min)

```bash
# Recent rate limit hits
kubectl logs -n core -l app=api-gateway --tail=200 | grep -i "rate limit"

# Check specific route limits
kubectl logs -n core -l app=api-gateway --tail=500 | grep -E "(429|rate.*exceeded)"

# Check Redis rate limit storage
kubectl exec -n data redis-cli -- redis-cli KEYS "cargobit:ratelimit:*" | head -50
```

### Step 3: Check IP Distribution (2 min)

```bash
# Top IPs by request count
kubectl logs -n core -l app=api-gateway --tail=1000 | \
  grep -oP '\d+\.\d+\.\d+\.\d+' | sort | uniq -c | sort -rn | head -20

# Check for bot patterns (User-Agent)
kubectl logs -n core -l app=api-gateway --tail=500 | \
  grep -i "user-agent" | sort | uniq -c | sort -rn | head -10
```

### Step 4: Check Legitimate Traffic Patterns (2 min)

```bash
# Traffic by user (sub claim)
curl -s http://prometheus.observability:9090/api/v1/query \
  --data-urlencode 'query=topk(10, sum(rate(http_requests_total[5m])) by (user_id))'

# Carrier app version distribution
kubectl logs -n core -l app=api-gateway --tail=500 | \
  grep -oP 'carrier-app/\d+\.\d+\.\d+' | sort | uniq -c
```

### Step 5: Check Bot Traffic (2 min)

```bash
# Known bot patterns
kubectl logs -n core -l app=api-gateway --tail=500 | \
  grep -iE "(bot|crawler|scraper|python-requests|curl|wget)"

# Suspicious patterns (burst from single IP)
kubectl exec -n data redis-cli -- redis-cli --scan --pattern "cargobit:ratelimit:*" | \
  xargs -I {} redis-cli GET {} | sort -rn | head -20
```

---

## Immediate Actions

### Action 1: Temporarily Increase Limits

```bash
# Double rate limits for affected routes
kubectl patch configmap api-gateway-ratelimits -n core --type=json \
  -p '[{"op":"replace","path":"/data/orders.limit","value":"120"}]'

# Reload gateway
kubectl rollout restart deployment/api-gateway -n core
```

### Action 2: Block Malicious IPs

```bash
# Get top offending IPs
OFFENDING_IPS=$(kubectl logs -n core -l app=api-gateway --tail=1000 | \
  grep -oP '\d+\.\d+\.\d+\.\d+' | sort | uniq -c | sort -rn | head -5 | awk '{print $2}')

# Add to blocklist
for ip in $OFFENDING_IPS; do
  kubectl exec -n core deploy/api-gateway -- curl -X POST localhost:8080/admin/blocklist \
    -H "Content-Type: application/json" -d "{\"ip\":\"$ip\",\"reason\":\"bot-traffic\"}"
done
```

### Action 3: Prioritize Carrier Traffic

```bash
# Enable carrier priority mode
kubectl patch configmap api-gateway-config -n core --type=merge \
  -p '{"data":{"CARRIER_PRIORITY_MODE":"true","CARRIER_BURST_MULTIPLIER":"3"}}'

kubectl rollout restart deployment/api-gateway -n core
```

### Action 4: Enable Adaptive Rate Limiting

```bash
# Switch to adaptive mode
kubectl patch configmap api-gateway-config -n core --type=merge \
  -p '{"data":{"RATE_LIMIT_MODE":"adaptive","ADAPTIVE_THRESHOLD":"80"}}'

kubectl rollout restart deployment/api-gateway -n core
```

---

## Root Cause Analysis

### Possible Root Causes

| Root Cause | Probability | Detection |
|------------|-------------|-----------|
| Carrier-App Bug (retry loop) | 35% | High 429 from same user-agent version |
| Bot-Traffic / Scraping | 25% | Suspicious IPs, patterns |
| Legitimer Traffic-Spike | 20% | Correlates with marketing event |
| Rate Limit Config zu niedrig | 15% | After config change |
| Redis Performance Issues | 5% | High latency on rate limit checks |

### Investigation Commands

```bash
# Check for retry storms
kubectl logs -n core -l app=api-gateway --tail=500 | \
  grep -i "retry" | grep -c "429"

# Check carrier app versions
kubectl logs -n core -l app=api-gateway --tail=1000 | \
  grep "carrier-app" | awk -F/ '{print $2}' | sort | uniq -c

# Check Redis latency
kubectl exec -n data redis-cli -- redis-cli --latency
```

---

## Follow-Up Actions

### Short-Term (24h)

- [ ] Adaptive Rate-Limits implementieren
- [ ] Bot-Detection aktivieren
- [ ] Carrier-App Fix koordinieren

### Medium-Term (1 Woche)

- [ ] User-Agent-basierte Limits
- [ ] Token Bucket Algorithm statt Fixed Window
- [ ] Rate Limit Dashboard erstellen

### Long-Term (1 Monat)

- [ ] ML-basierte Bot Detection
- [ ] Traffic Pattern Analysis
- [ ] Capacity Planning

---

## Rate Limit Configuration Reference

```yaml
# Current Configuration
routes:
  - route: "POST /orders"
    limit: 60
    windowSeconds: 60
    key: "sub"
    burstLimit: 10

  - route: "POST /bids"
    limit: 120
    windowSeconds: 60
    key: "sub"
    burstLimit: 20

  - route: "POST /pricing/**/bid/validate"
    limit: 300
    windowSeconds: 60
    key: "sub"

  - route: "POST /auth/login"
    limit: 10
    windowSeconds: 60
    key: "ip"

# Role Multipliers
roleMultipliers:
  ADMIN: 2.0
  SUPPORT: 1.5
  SYSTEM: 10.0
  SHIPPER: 1.0
  CARRIER: 1.0
```

---

## Escalation Matrix

| Severity | Condition | Escalation |
|----------|-----------|------------|
| P2 | 429 > 5% for 5 min | Platform On-Call |
| P1 | 429 > 20% for 2 min | + Backend Lead |
| P1 | Revenue Impact > 10k€/hr | + CTO |

---

## Related Playbooks

- [E.1 Pricing-Service Down](./incident-pricing-service-down.md)
- [DDoS Attack Response](./incident-ddos-attack.md)
