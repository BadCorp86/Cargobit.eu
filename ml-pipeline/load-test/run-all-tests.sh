#!/bin/bash
# =============================================================================
# CargoBit ML Service - Load Test Runner
# =============================================================================
#
# Runs all load test scenarios sequentially and generates combined report.
#
# Usage:
#   ./run-all-tests.sh
#   ML_SERVICE_URL=http://ml-service:8080 ./run-all-tests.sh
#

set -e

# Configuration
ML_SERVICE_URL=${ML_SERVICE_URL:-"http://localhost:8080"}
RESULTS_DIR="./results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "CargoBit ML Service Load Test Suite"
echo "========================================"
echo ""
echo "Target: $ML_SERVICE_URL"
echo "Results: $RESULTS_DIR"
echo ""

# Create results directory
mkdir -p $RESULTS_DIR

# Health check
echo -e "${YELLOW}Checking service health...${NC}"
HEALTH=$(curl -s $ML_SERVICE_URL/health || echo "")
if [ -z "$HEALTH" ]; then
    echo -e "${RED}ERROR: Service not reachable at $ML_SERVICE_URL${NC}"
    exit 1
fi
echo -e "${GREEN}Service is healthy${NC}"
echo ""

# Function to run test
run_test() {
    local name=$1
    local script=$2
    
    echo ""
    echo "========================================"
    echo -e "${YELLOW}Running: $name${NC}"
    echo "========================================"
    
    ML_SERVICE_URL=$ML_SERVICE_URL k6 run --out json=$RESULTS_DIR/${name}_${TIMESTAMP}.json $script 2>&1 | tee $RESULTS_DIR/${name}_${TIMESTAMP}.txt
    
    local exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ $name PASSED${NC}"
    else
        echo -e "${RED}✗ $name FAILED${NC}"
    fi
    
    return $exit_code
}

# Run all scenarios
PASSED=0
FAILED=0

# Scenario 1: Baseline Scoring
if run_test "baseline" "scenario-1-baseline.js"; then
    ((PASSED++))
else
    ((FAILED++))
fi

sleep 30  # Cooldown between tests

# Scenario 2: Explainability
if run_test "explainability" "scenario-2-explainability.js"; then
    ((PASSED++))
else
    ((FAILED++))
fi

sleep 30

# Scenario 3: Mixed Traffic
if run_test "mixed" "scenario-3-mixed.js"; then
    ((PASSED++))
else
    ((FAILED++))
fi

sleep 30

# Scenario 4: Cold Start
if run_test "coldstart" "scenario-4-coldstart.js"; then
    ((PASSED++))
else
    ((FAILED++))
fi

# Generate summary
echo ""
echo "========================================"
echo "LOAD TEST SUMMARY"
echo "========================================"
echo ""
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""
echo "Results saved to: $RESULTS_DIR/"
echo ""

# Generate combined report
cat << EOF > $RESULTS_DIR/summary_${TIMESTAMP}.txt
========================================
CargoBit ML Service Load Test Report
========================================
Date: $(date)
Target: $ML_SERVICE_URL

Results:
- Scenario 1 (Baseline): See baseline_${TIMESTAMP}.txt
- Scenario 2 (Explainability): See explainability_${TIMESTAMP}.txt
- Scenario 3 (Mixed): See mixed_${TIMESTAMP}.txt
- Scenario 4 (Cold Start): See coldstart_${TIMESTAMP}.txt

Total: $PASSED passed, $FAILED failed
EOF

echo "Summary report: $RESULTS_DIR/summary_${TIMESTAMP}.txt"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check results for details.${NC}"
    exit 1
fi
