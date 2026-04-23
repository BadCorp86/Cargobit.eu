#!/bin/bash
# =============================================================================
# CargoBit Schema Registration Script
# =============================================================================
# Registers all Avro schemas with Confluent Schema Registry
# Usage: ./register-schemas.sh [schema-registry-url]
# Example: ./register-schemas.sh http://localhost:8081
# =============================================================================

set -e

SCHEMA_REGISTRY="${1:-http://localhost:8081}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_DIR="${SCRIPT_DIR}/../schema-registry"

echo "========================================"
echo "CargoBit Schema Registration"
echo "========================================"
echo "Schema Registry: $SCHEMA_REGISTRY"
echo "Schema Directory: $SCHEMA_DIR"
echo "========================================"

# Function to register a schema
register_schema() {
    local topic=$1
    local schema_file=$2
    local subject="${topic}-value"
    
    echo "Registering schema: $subject"
    echo "  File: $schema_file"
    
    # Read schema and escape quotes
    SCHEMA_CONTENT=$(cat "$schema_file" | tr -d '\n' | sed 's/"/\\"/g')
    
    # Register with Schema Registry
    curl -s -X POST \
        -H "Content-Type: application/vnd.schemaregistry.v1+json" \
        --data "{\"schema\": \"$SCHEMA_CONTENT\"}" \
        "${SCHEMA_REGISTRY}/subjects/${subject}/versions"
    
    echo ""
}

# Register all schemas
register_schema "logistics.load-snapshot.v1" "${SCHEMA_DIR}/load-snapshot-created.avsc"
register_schema "logistics.capacity-state.v1" "${SCHEMA_DIR}/capacity-state-updated.avsc"
register_schema "logistics.suggestion.v1" "${SCHEMA_DIR}/suggestion-generated.avsc"
register_schema "logistics.suggestion-decision.v1" "${SCHEMA_DIR}/suggestion-decision-made.avsc"
register_schema "logistics.tour-route.v1" "${SCHEMA_DIR}/tour-route-updated.avsc"
register_schema "logistics.suggestion-outcome.v1" "${SCHEMA_DIR}/suggestion-outcome.avsc"

echo "========================================"
echo "Verifying registered schemas..."
echo "========================================"

# List all subjects
curl -s "${SCHEMA_REGISTRY}/subjects" | jq '.'

echo "========================================"
echo "Schema Registration Complete"
echo "========================================"
