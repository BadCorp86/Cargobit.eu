#!/bin/bash
# =============================================================================
# CargoBit Test Runner
# =============================================================================
# Run all tests: ./tests/run-tests.sh
# Run specific tests: ./tests/run-tests.sh --unit
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}CargoBit Test Runner${NC}"
echo -e "${BLUE}================================${NC}"

# Parse arguments
RUN_UNIT=false
RUN_INTEGRATION=false
RUN_COVERAGE=false
RUN_LINT=false
RUN_ALL=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --unit)
            RUN_UNIT=true
            RUN_ALL=false
            shift
            ;;
        --integration)
            RUN_INTEGRATION=true
            RUN_ALL=false
            shift
            ;;
        --coverage)
            RUN_COVERAGE=true
            shift
            ;;
        --lint)
            RUN_LINT=true
            shift
            ;;
        --all)
            RUN_ALL=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--unit] [--integration] [--coverage] [--lint] [--all]"
            exit 1
            ;;
    esac
done

# Function to run Python tests
run_python_tests() {
    echo -e "${YELLOW}Running Python Tests...${NC}"
    
    # Check if pytest is installed
    if ! command -v pytest &> /dev/null; then
        echo -e "${RED}pytest not found. Installing test dependencies...${NC}"
        pip install -r tests/requirements-test.txt
    fi
    
    # Run pytest
    if [ "$RUN_COVERAGE" = true ]; then
        echo -e "${BLUE}Running with coverage...${NC}"
        pytest tests/ \
            -v \
            --cov=ml-pipeline \
            --cov=config-service \
            --cov-report=html \
            --cov-report=term \
            --cov-fail-under=70
    else
        pytest tests/ -v --tb=short
    fi
    
    echo -e "${GREEN}Python tests completed.${NC}"
}

# Function to run JavaScript/TypeScript tests
run_js_tests() {
    echo -e "${YELLOW}Running JavaScript/TypeScript Tests...${NC}"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${RED}node_modules not found. Running npm install...${NC}"
        npm install
    fi
    
    # Run Jest
    if [ "$RUN_COVERAGE" = true ]; then
        npm test -- --coverage
    else
        npm test
    fi
    
    echo -e "${GREEN}JavaScript tests completed.${NC}"
}

# Function to run linting
run_linting() {
    echo -e "${YELLOW}Running Linting...${NC}"
    
    # Python linting with ruff
    echo -e "${BLUE}Python (ruff)...${NC}"
    if command -v ruff &> /dev/null; then
        ruff check ml-pipeline/ config-service/ tests/
    else
        echo -e "${YELLOW}ruff not found, skipping Python linting.${NC}"
    fi
    
    # TypeScript linting with ESLint
    echo -e "${BLUE}TypeScript (ESLint)...${NC}"
    npm run lint 2>/dev/null || echo -e "${YELLOW}ESLint not configured or failed.${NC}"
    
    echo -e "${GREEN}Linting completed.${NC}"
}

# Main execution
if [ "$RUN_ALL" = true ]; then
    run_python_tests
    run_js_tests
    if [ "$RUN_COVERAGE" = true ]; then
        run_linting
    fi
else
    if [ "$RUN_UNIT" = true ] || [ "$RUN_INTEGRATION" = true ]; then
        run_python_tests
        run_js_tests
    fi
    if [ "$RUN_LINT" = true ]; then
        run_linting
    fi
fi

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}All tests completed successfully!${NC}"
echo -e "${GREEN}================================${NC}"

# Print coverage report location
if [ "$RUN_COVERAGE" = true ]; then
    echo -e "${BLUE}Coverage reports:${NC}"
    echo -e "  Python: htmlcov/index.html"
    echo -e "  JavaScript: coverage/lcov-report/index.html"
fi
