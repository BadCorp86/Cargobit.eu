#!/bin/bash
# ============================================
# CARGOBIT NEWMAN E2E TESTS - PAYOUTS
# Run Postman collections via Newman CLI
# ============================================

set -e

# Configuration
COLLECTION_FILE="postman_collection_payments_e2e.json"
ENV_FILE="${1:-postman_env_staging.json}"
REPORTS_DIR="reports"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[Newman] Starting E2E Payouts Test Suite...${NC}"
echo ""

# Check if Newman is installed
if ! command -v newman &> /dev/null; then
    echo -e "${RED}[Newman] Error: Newman is not installed${NC}"
    echo "Install with: npm install -g newman"
    exit 1
fi

# Check if collection exists
if [ ! -f "$COLLECTION_FILE" ]; then
    echo -e "${RED}[Newman] Error: Collection file not found: $COLLECTION_FILE${NC}"
    exit 1
fi

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}[Newman] Error: Environment file not found: $ENV_FILE${NC}"
    exit 1
fi

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Run Newman
echo -e "${YELLOW}[Newman] Running collection: $COLLECTION_FILE${NC}"
echo -e "${YELLOW}[Newman] Environment: $ENV_FILE${NC}"
echo ""

newman run "$COLLECTION_FILE" \
    -e "$ENV_FILE" \
    --reporters cli,junit,json \
    --reporter-junit-export "$REPORTS_DIR/newman-payouts.xml" \
    --reporter-json-export "$REPORTS_DIR/newman-payouts.json" \
    --timeout-request 30000 \
    --timeout-script 30000 \
    --delay-request 100 \
    --bail

# Check result
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}[Newman] All tests passed!${NC}"
    echo -e "${GREEN}[Newman] Reports saved to: $REPORTS_DIR/${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}[Newman] Tests failed!${NC}"
    echo -e "${RED}[Newman] Check reports in: $REPORTS_DIR/${NC}"
    exit 1
fi
