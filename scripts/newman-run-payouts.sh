#!/bin/bash
# ============================================
# CARGOBIT PAYOUTS NEWMAN E2E TEST RUNNER
# ============================================

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
REPORT_DIR="${REPORT_DIR:-./test-results/payouts}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "CargoBit Payouts E2E Test Runner"
echo "============================================"
echo "Base URL: $BASE_URL"
echo "Report Dir: $REPORT_DIR"
echo "Timestamp: $TIMESTAMP"
echo ""

# Check dependencies
if ! command -v newman &> /dev/null; then
    echo -e "${RED}Error: newman is not installed${NC}"
    echo "Install with: npm install -g newman"
    exit 1
fi

# Create report directory
mkdir -p "$REPORT_DIR"

# Run newman tests
echo -e "${YELLOW}Running Payouts E2E Tests...${NC}"
echo ""

newman run scripts/collections/payouts-e2e.postman_collection.json \
    --global-var "baseUrl=$BASE_URL" \
    --global-var "adminToken=$ADMIN_TOKEN" \
    --reporters cli,json \
    --reporter-json-export "$REPORT_DIR/payouts-$TIMESTAMP.json" \
    --bail \
    --timeout 60000 \
    --timeout-request 30000 \
    --delay-request 500

EXIT_CODE=$?

echo ""
echo "============================================"
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
else
    echo -e "${RED}✗ Tests failed with exit code: $EXIT_CODE${NC}"
fi
echo "============================================"
echo ""
echo "Report saved to: $REPORT_DIR/payouts-$TIMESTAMP.json"

exit $EXIT_CODE
