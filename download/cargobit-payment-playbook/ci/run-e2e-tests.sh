#!/bin/bash
# =============================================================================
# CargoBit Payment E2E Test Runner
# Newman CI Script für automatisierte Postman Collection Ausführung
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="${PROJECT_ROOT}/reports"
COLLECTION_FILE="${PROJECT_ROOT}/postman_collection_payments_e2e.json"
ENV_FILE="${PROJECT_ROOT}/postman_env_staging.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Newman installation
    if ! command -v newman &> /dev/null; then
        log_error "Newman not found. Installing..."
        npm install -g newman newman-reporter-junitfull newman-reporter-htmlextra
    fi
    
    # Check collection file
    if [[ ! -f "$COLLECTION_FILE" ]]; then
        log_error "Collection file not found: $COLLECTION_FILE"
        exit 1
    fi
    
    # Check environment file
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "Environment file not found: $ENV_FILE"
        log_info "Creating environment template..."
        create_env_template
        exit 1
    fi
    
    # Create reports directory
    mkdir -p "$REPORTS_DIR"
    
    log_success "Prerequisites check passed"
}

# Create environment template
create_env_template() {
    cat > "$ENV_FILE" << 'EOF'
{
  "id": "staging-env",
  "name": "CargoBit Staging",
  "values": [
    { "key": "base_url", "value": "https://staging.cargobit.example.com", "type": "default" },
    { "key": "admin_jwt", "value": "Bearer <YOUR_ADMIN_JWT>", "type": "secret" },
    { "key": "stripe_test_secret", "value": "whsec_<YOUR_STRIPE_WEBHOOK_SECRET>", "type": "secret" },
    { "key": "jobId", "value": "", "type": "any" },
    { "key": "payment_intent_id", "value": "", "type": "any" },
    { "key": "payment_id", "value": "", "type": "any" },
    { "key": "refund_id", "value": "", "type": "any" },
    { "key": "wallet_count_before", "value": "0", "type": "any" }
  ],
  "_postman_variable_scope": "environment"
}
EOF
    log_info "Environment template created at: $ENV_FILE"
    log_warning "Please update the environment values before running tests"
}

# Run Newman tests
run_tests() {
    local environment="${1:-staging}"
    local iteration_count="${2:-1}"
    
    log_info "Running E2E tests for environment: $environment"
    log_info "Iteration count: $iteration_count"
    
    # Run Newman with multiple reporters
    newman run "$COLLECTION_FILE" \
        --environment "$ENV_FILE" \
        --iteration-count "$iteration_count" \
        --reporters cli,junitfull,htmlextra \
        --reporter-junitfull-export "$REPORTS_DIR/newman-results.xml" \
        --reporter-htmlextra-export "$REPORTS_DIR/newman-report.html" \
        --reporter-htmlextra-title "CargoBit Payment E2E Tests" \
        --reporter-htmlextra-logs \
        --reporter-htmlextra-testPaging \
        --bail \
        --timeout 60000 \
        --timeout-request 30000 \
        --delay-request 500 \
        2>&1 | tee "$REPORTS_DIR/newman-output.log"
    
    local exit_code=${PIPESTATUS[0]}
    
    if [[ $exit_code -eq 0 ]]; then
        log_success "All tests passed!"
    else
        log_error "Some tests failed. Exit code: $exit_code"
    fi
    
    return $exit_code
}

# Run with retry logic
run_with_retry() {
    local max_retries="${1:-3}"
    local retry_delay="${2:-30}"
    local attempt=1
    
    while [[ $attempt -le $max_retries ]]; do
        log_info "Attempt $attempt of $max_retries"
        
        if run_tests; then
            log_success "Tests passed on attempt $attempt"
            return 0
        fi
        
        if [[ $attempt -lt $max_retries ]]; then
            log_warning "Tests failed, retrying in ${retry_delay}s..."
            sleep "$retry_delay"
        fi
        
        ((attempt++))
    done
    
    log_error "Tests failed after $max_retries attempts"
    return 1
}

# Generate summary report
generate_summary() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local summary_file="$REPORTS_DIR/test-summary.json"
    
    # Parse JUnit XML for summary
    local total_tests=0
    local failed_tests=0
    local passed_tests=0
    
    if [[ -f "$REPORTS_DIR/newman-results.xml" ]]; then
        total_tests=$(grep -oP 'tests="\K[0-9]+' "$REPORTS_DIR/newman-results.xml" | head -1 || echo "0")
        failed_tests=$(grep -oP 'failures="\K[0-9]+' "$REPORTS_DIR/newman-results.xml" | head -1 || echo "0")
        passed_tests=$((total_tests - failed_tests))
    fi
    
    cat > "$summary_file" << EOF
{
  "timestamp": "$timestamp",
  "environment": "staging",
  "total_tests": $total_tests,
  "passed": $passed_tests,
  "failed": $failed_tests,
  "success_rate": "$(awk "BEGIN {printf \"%.2f\", ($passed_tests/$total_tests)*100}")%",
  "reports": {
    "junit": "$REPORTS_DIR/newman-results.xml",
    "html": "$REPORTS_DIR/newman-report.html",
    "log": "$REPORTS_DIR/newman-output.log"
  }
}
EOF
    
    log_info "Summary report generated: $summary_file"
    cat "$summary_file"
}

# Cleanup old reports
cleanup_old_reports() {
    local keep_days="${1:-7}"
    log_info "Cleaning up reports older than $keep_days days..."
    find "$REPORTS_DIR" -name "*.xml" -o -name "*.html" -o -name "*.log" | \
        while read -r file; do
            if [[ $(find "$file" -mtime +$keep_days 2>/dev/null) ]]; then
                rm -f "$file"
                log_info "Removed old report: $file"
            fi
        done
}

# Main function
main() {
    local command="${1:-run}"
    
    case "$command" in
        run)
            check_prerequisites
            run_tests
            generate_summary
            ;;
        retry)
            check_prerequisites
            run_with_retry "${2:-3}" "${3:-30}"
            generate_summary
            ;;
        init)
            create_env_template
            ;;
        clean)
            cleanup_old_reports "${2:-7}"
            ;;
        summary)
            generate_summary
            ;;
        *)
            echo "Usage: $0 {run|retry|init|clean|summary}"
            echo ""
            echo "Commands:"
            echo "  run           Run tests once (default)"
            echo "  retry [n] [d] Run tests with retry (n=attempts, d=delay in seconds)"
            echo "  init          Create environment template"
            echo "  clean [d]     Clean reports older than d days (default: 7)"
            echo "  summary       Generate summary report"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
