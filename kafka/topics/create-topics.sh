#!/bin/bash
# =============================================================================
# CargoBit Kafka Topic Creation Script
# =============================================================================
# Usage: ./create-topics.sh [kafka-bootstrap-server]
# Example: ./create-topics.sh kafka.cargobit.io:9092
# =============================================================================

set -e

BOOTSTRAP_SERVER="${1:-localhost:9092}"
PARTITIONS="${PARTITIONS:-6}"
REPLICATION="${REPLICATION:-3}"

echo "========================================"
echo "CargoBit Kafka Topic Creation"
echo "========================================"
echo "Bootstrap Server: $BOOTSTRAP_SERVER"
echo "Partitions: $PARTITIONS"
echo "Replication Factor: $REPLICATION"
echo "========================================"

# Topic 1: load-snapshot
echo "Creating topic: logistics.load-snapshot.v1"
kafka-topics.sh --bootstrap-server "$BOOTSTRAP_SERVER" \
  --create \
  --topic logistics.load-snapshot.v1 \
  --partitions "$PARTITIONS" \
  --replication-factor "$REPLICATION" \
  --config retention.ms=604800000 \
  --config compression.type=zstd \
  --config cleanup.policy=delete

# Topic 2: capacity-state
echo "Creating topic: logistics.capacity-state.v1"
kafka-topics.sh --bootstrap-server "$BOOTSTRAP_SERVER" \
  --create \
  --topic logistics.capacity-state.v1 \
  --partitions "$PARTITIONS" \
  --replication-factor "$REPLICATION" \
  --config retention.ms=604800000 \
  --config compression.type=zstd \
  --config cleanup.policy=compact \
  --config min.compaction.lag.ms=3600000

# Topic 3: suggestion
echo "Creating topic: logistics.suggestion.v1"
kafka-topics.sh --bootstrap-server "$BOOTSTRAP_SERVER" \
  --create \
  --topic logistics.suggestion.v1 \
  --partitions "$PARTITIONS" \
  --replication-factor "$REPLICATION" \
  --config retention.ms=2592000000 \
  --config compression.type=zstd \
  --config cleanup.policy=delete

# Topic 4: suggestion-decision
echo "Creating topic: logistics.suggestion-decision.v1"
kafka-topics.sh --bootstrap-server "$BOOTSTRAP_SERVER" \
  --create \
  --topic logistics.suggestion-decision.v1 \
  --partitions "$PARTITIONS" \
  --replication-factor "$REPLICATION" \
  --config retention.ms=31536000000 \
  --config compression.type=zstd \
  --config cleanup.policy=delete

# Topic 5: tour-route
echo "Creating topic: logistics.tour-route.v1"
kafka-topics.sh --bootstrap-server "$BOOTSTRAP_SERVER" \
  --create \
  --topic logistics.tour-route.v1 \
  --partitions "$PARTITIONS" \
  --replication-factor "$REPLICATION" \
  --config retention.ms=31536000000 \
  --config compression.type=zstd \
  --config cleanup.policy=compact,delete \
  --config min.compaction.lag.ms=86400000

# Topic 6: suggestion-outcome (ML Training)
echo "Creating topic: logistics.suggestion-outcome.v1"
kafka-topics.sh --bootstrap-server "$BOOTSTRAP_SERVER" \
  --create \
  --topic logistics.suggestion-outcome.v1 \
  --partitions "$PARTITIONS" \
  --replication-factor "$REPLICATION" \
  --config retention.ms=31536000000 \
  --config compression.type=zstd \
  --config cleanup.policy=delete

echo "========================================"
echo "Topic Creation Complete"
echo "========================================"

# List all created topics
echo "Verifying topics..."
kafka-topics.sh --bootstrap-server "$BOOTSTRAP_SERVER" --list | grep logistics

echo "========================================"
echo "Done."
