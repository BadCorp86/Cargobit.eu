# Kafka Topics Overview

| Topic | Partitions | Replication | Retention | Cleanup | Purpose |
|-------|------------|-------------|-----------|---------|---------|
| `logistics.load-snapshot.v1` | 6 | 3 | 7 days | delete | Load snapshots (time-series) |
| `logistics.capacity-state.v1` | 6 | 3 | 7 days | compact | Current capacity state |
| `logistics.suggestion.v1` | 6 | 3 | 30 days | delete | All suggestions for analytics |
| `logistics.suggestion-decision.v1` | 6 | 3 | 365 days | delete | Decision audit trail |
| `logistics.tour-route.v1` | 6 | 3 | 365 days | compact,delete | Route history |
| `logistics.suggestion-outcome.v1` | 6 | 3 | 365 days | delete | ML training data |

## Partitioning Keys

| Topic | Key | Reason |
|-------|-----|--------|
| load-snapshot.v1 | tourId | Order per tour |
| capacity-state.v1 | tourId | Consistent state per tour |
| suggestion.v1 | tourId | Group by tour |
| suggestion-decision.v1 | suggestionId | Unique per decision |
| tour-route.v1 | tourId | Route history per tour |
| suggestion-outcome.v1 | suggestionId | Unique outcome |

## Quick Start

```bash
# Create topics (Kafka CLI)
./kafka/topics/create-topics.sh kafka.cargobit.io:9092

# Register schemas (Schema Registry)
./kafka/topics/register-schemas.sh http://schema-registry.cargobit.io:8081

# Or with Strimzi (Kubernetes)
kubectl apply -f kafka/topics/kafka-topics.yaml -n cargobit-kafka
```

## Verification

```bash
# List topics
kafka-topics.sh --bootstrap-server kafka.cargobit.io:9092 --list | grep logistics

# Describe topic
kafka-topics.sh --bootstrap-server kafka.cargobit.io:9092 \
  --describe --topic logistics.suggestion-outcome.v1

# Check schema
curl http://schema-registry.cargobit.io:8081/subjects/logistics.suggestion-outcome.v1-value/versions/latest
```
