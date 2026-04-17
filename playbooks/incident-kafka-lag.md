# Incident Playbook: Kafka Lag / Event-Backpressure

**Severity:** P2 - High  
**Service:** Kafka Infrastructure  
**Last Updated:** 2024-01-15  
**Owner:** Platform Team  

---

## Quick Reference

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Consumer Lag | > 10,000 | `kafka-lag-critical` |
| Consumer Lag | > 5,000 | `kafka-lag-warning` |
| Processing Rate | < 100/sec | `kafka-processing-degraded` |

---

## Trigger

1. **Lag > 10,000 Events** auf einer Consumer Group
2. **Matching/Pricing verzögert** sich deutlich
3. **Alert: kafka_consumer_lag > threshold**
4. **Event Processing Latency steigt**

---

## Impact

| Stakeholder | Impact |
|-------------|--------|
| Users | Langsame Reaktionszeiten |
| Operations | Backlog baut sich auf |
| System | Eventual Consistency gestört |

**Impact Score:** 7/10 (hoch)

---

## Diagnosis Steps

### Step 1: Check Lag Metrics (2 min)

```bash
# Overall lag
curl -s http://prometheus.observability:9090/api/v1/query \
  --data-urlencode 'query=sum(kafka_consumer_lag) by (consumer_group)'

# Lag per topic
curl -s http://prometheus.observability:9090/api/v1/query \
  --data-urlencode 'query=kafka_consumer_lag by (topic, consumer_group)'

# Lag per partition
kubectl exec -n data kafka-consumer-groups -- bootstrap-server kafka:9092 \
  --describe --all-groups
```

### Step 2: Check Consumer Performance (2 min)

```bash
# Processing rate
curl -s http://prometheus.observability:9090/api/v1/query \
  --data-urlencode 'query=rate(kafka_messages_consumed_total[5m])'

# Consumer errors
curl -s http://prometheus.observability:9090/api/v1/query \
  --data-urlencode 'query=rate(kafka_consumer_errors_total[5m])'
```

### Step 3: Check Resource Saturation (2 min)

```bash
# Consumer pod resources
kubectl top pods -n domain

# Check for throttling
kubectl describe pods -n domain -l app=matching-service | grep -i "cpu\|memory"

# Check network
kubectl exec -n domain deploy/matching-service -- curl -s localhost:9090/metrics | grep network
```

### Step 4: Check Partition Distribution (2 min)

```bash
# Check partition assignments
kubectl exec -n data kafka-consumer-groups -- bootstrap-server kafka:9092 \
  --describe --group matching-service

# Check for hot partitions
kubectl exec -n data kafka-run-class kafka.tools.GetOffsetShell \
  --broker-list kafka:9092 --topic pricing.validation.completed --time -1
```

### Step 5: Identify Slow Consumers (2 min)

```bash
# Check processing time per consumer
kubectl logs -n domain -l app=matching-service --tail=100 | grep -i "processing.*ms"

# Check for DLQ messages
kubectl exec -n data kafka-console-consumer -- bootstrap-server kafka:9092 \
  --topic matching.dlq --from-beginning --max-messages 10
```

---

## Immediate Actions

### Action 1: Scale Consumers

```bash
# Scale matching-service
kubectl scale deployment matching-service -n domain --replicas=8

# Scale pricing-service
kubectl scale deployment pricing-service -n domain --replicas=5

# Monitor lag reduction
watch 'kubectl exec -n data kafka-consumer-groups -- bootstrap-server kafka:9092 --describe --group matching-service'
```

### Action 2: Increase Partitions (if needed)

```bash
# Check current partitions
kubectl exec -n data kafka-topics -- bootstrap-server kafka:9092 \
  --describe --topic pricing.validation.completed

# Increase partitions (CAUTION: only increase, never decrease)
kubectl exec -n data kafka-topics -- bootstrap-server kafka:9092 \
  --alter --topic pricing.validation.completed --partitions 12

# Trigger rebalance
kubectl rollout restart deployment/matching-service -n domain
```

### Action 3: Restart Slow Consumers

```bash
# Identify slow consumer pod
kubectl logs -n domain -l app=matching-service --tail=50 | grep "slow"

# Delete problematic pod
kubectl delete pod matching-service-abc123 -n domain

# Verify rebalance
kubectl logs -n domain -l app=matching-service --tail=20 | grep -i rebalance
```

### Action 4: Pause Non-Critical Consumers (if needed)

```bash
# Pause notification consumer (lowest priority)
kubectl scale deployment notification-consumer -n domain --replicas=0

# Resume when lag is resolved
kubectl scale deployment notification-consumer -n domain --replicas=2
```

---

## Root Cause Analysis

### Possible Root Causes

| Root Cause | Probability | Detection |
|------------|-------------|-----------|
| Matching-Service CPU-bound | 35% | High CPU on consumer pods |
| Pricing-Service I/O-bound | 25% | High DB wait times |
| Unbalanced partitions | 20% | Lag concentrated on few partitions |
| Slow message processing | 15% | High processing time per message |
| Network issues | 5% | High RTT to Kafka |

### Investigation Commands

```bash
# Consumer processing time distribution
kubectl exec -n domain deploy/matching-service -- curl -s localhost:9090/metrics | \
  grep 'matching_duration_seconds_bucket'

# Check for message size spikes
kubectl exec -n data kafka-console-consumer -- bootstrap-server kafka:9092 \
  --topic pricing.validation.completed --max-messages 10 | wc -c

# Network latency to Kafka
kubectl exec -n domain deploy/matching-service -- ping -c 3 kafka.data.svc.cluster.local
```

---

## Follow-Up Actions

### Short-Term (24h)

- [ ] Consumer-Group Tuning (max.poll.records, fetch.min.bytes)
- [ ] Monitor lag recovery rate
- [ ] Document root cause

### Medium-Term (1 Woche)

- [ ] Repartitioning strategy review
- [ ] Consumer autoscaling tuning
- [ ] Backpressure monitoring improvements

### Long-Term (1 Monat)

- [ ] Implement lag-based autoscaling
- [ ] Partition rebalancing automation
- [ ] Capacity planning based on traffic patterns

---

## Kafka Tuning Parameters

```yaml
# Consumer Configuration
max.poll.records: 500        # Records per poll
fetch.min.bytes: 1048576     # 1MB minimum fetch
fetch.max.wait.ms: 500       # Max wait time
session.timeout.ms: 30000    # Session timeout
heartbeat.interval.ms: 10000 # Heartbeat interval
max.poll.interval.ms: 300000 # Max time between polls

# Producer Configuration
batch.size: 16384            # Batch size
linger.ms: 5                 # Wait for batching
compression.type: lz4        # Compression
acks: 1                      # Ack level
```

---

## Lag Recovery Estimation

```
Recovery Time = Current Lag / Processing Rate

Example:
- Current Lag: 50,000 messages
- Processing Rate: 1,000 msg/sec
- Recovery Time: 50,000 / 1,000 = 50 seconds
```

---

## Related Playbooks

- [E.1 Pricing-Service Down](./incident-pricing-service-down.md)
- [E.2 Matching-Service Stuck](./incident-matching-service-stuck.md)
