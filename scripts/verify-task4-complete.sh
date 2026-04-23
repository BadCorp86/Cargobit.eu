#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Task 4: Complete Verification Script
# =============================================================================
# This script runs ALL verification checks for Task 4 and generates a report.
#
# Usage: ./scripts/verify-task4-complete.sh [--namespace staging]
#
# Required Environment Variables (set these before running):
# - KUBECONFIG or KUBE_CONFIG_DATA
# - ADMIN_JWT (for Newman E2E)
# - BASE_URL (for Newman E2E, e.g., https://payments.staging.cargobit.io)
# =============================================================================

NAMESPACE="${1:-staging}"
REPORT_DIR="reports/task4-verification"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/verification-${TIMESTAMP}.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
SKIPPED_CHECKS=0

# Results array
declare -a RESULTS

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[SKIP]${NC} $1"; }
log_step() { echo -e "${PURPLE}[STEP]${NC} $1"; }

check_pass() {
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    RESULTS+=("✅ PASS: $1")
    log_success "$1"
}

check_fail() {
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    RESULTS+=("❌ FAIL: $1")
    log_error "$1"
}

check_skip() {
    SKIPPED_CHECKS=$((SKIPPED_CHECKS + 1))
    RESULTS+=("⏭️ SKIP: $1")
    log_warn "$1"
}

run_check() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

# Create report directory
mkdir -p "$REPORT_DIR"

echo "=============================================="
echo "  Task 4: Complete Verification"
echo "=============================================="
echo "Namespace:  $NAMESPACE"
echo "Report:     $REPORT_FILE"
echo "Timestamp:  $TIMESTAMP"
echo "=============================================="
echo ""

# Initialize report
cat > "$REPORT_FILE" << EOF
# Task 4 Verification Report

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Namespace:** $NAMESPACE

---

## Summary

| Category | Status |
|----------|--------|
| Total Checks | 0 |
| Passed | 0 |
| Failed | 0 |
| Skipped | 0 |

---

## Detailed Results

EOF

# =============================================================================
# CHECK 1: kubectl Connection
# =============================================================================
log_step "Check 1: Kubernetes Connection"
run_check

if kubectl cluster-info &>/dev/null; then
    check_pass "kubectl connected to cluster"
    CLUSTER_OK=true
else
    check_fail "kubectl cannot connect to cluster"
    CLUSTER_OK=false
fi

# =============================================================================
# CHECK 2: Namespace Exists
# =============================================================================
log_step "Check 2: Namespace $NAMESPACE"
run_check

if [ "$CLUSTER_OK" = true ]; then
    if kubectl get namespace "$NAMESPACE" &>/dev/null; then
        check_pass "Namespace $NAMESPACE exists"
        NS_OK=true
    else
        check_fail "Namespace $NAMESPACE not found"
        NS_OK=false
    fi
else
    check_skip "Namespace check (no cluster connection)"
    NS_OK=false
fi

# =============================================================================
# CHECK 3: Helm Release
# =============================================================================
log_step "Check 3: Helm Release 'payments'"
run_check

if [ "$NS_OK" = true ]; then
    if helm status payments -n "$NAMESPACE" &>/dev/null; then
        check_pass "Helm release 'payments' deployed"
        HELM_OK=true
        
        # Get release info
        HELM_INFO=$(helm status payments -n "$NAMESPACE" -o json 2>/dev/null || echo "{}")
        HELM_REVISION=$(echo "$HELM_INFO" | jq -r '.version // "unknown"')
        HELM_UPDATED=$(echo "$HELM_INFO" | jq -r '.info.last_deployed // "unknown"')
        echo "    Revision: $HELM_REVISION"
        echo "    Updated:  $HELM_UPDATED"
    else
        check_fail "Helm release 'payments' not found"
        HELM_OK=false
    fi
else
    check_skip "Helm release check (namespace not available)"
    HELM_OK=false
fi

# =============================================================================
# CHECK 4: CronJob Exists
# =============================================================================
log_step "Check 4: CronJob 'payments-reconciliation'"
run_check

if [ "$NS_OK" = true ]; then
    if kubectl -n "$NAMESPACE" get cronjob payments-reconciliation &>/dev/null; then
        check_pass "CronJob 'payments-reconciliation' exists"
        CRONJOB_OK=true
        
        # Get CronJob info
        CRONJOB_INFO=$(kubectl -n "$NAMESPACE" get cronjob payments-reconciliation -o json)
        CRONJOB_SCHEDULE=$(echo "$CRONJOB_INFO" | jq -r '.spec.schedule')
        CRONJOB_SUSPENDED=$(echo "$CRONJOB_INFO" | jq -r '.spec.suspend')
        CRONJOB_LAST_RUN=$(echo "$CRONJOB_INFO" | jq -r '.status.lastScheduleTime // "Never"')
        
        echo "    Schedule:   $CRONJOB_SCHEDULE"
        echo "    Suspended:  $CRONJOB_SUSPENDED"
        echo "    Last Run:   $CRONJOB_LAST_RUN"
    else
        check_fail "CronJob 'payments-reconciliation' not found"
        CRONJOB_OK=false
    fi
else
    check_skip "CronJob check (namespace not available)"
    CRONJOB_OK=false
fi

# =============================================================================
# CHECK 5: Backend Deployment
# =============================================================================
log_step "Check 5: Backend Deployment"
run_check

if [ "$NS_OK" = true ]; then
    if kubectl -n "$NAMESPACE" get deployment payments-backend &>/dev/null; then
        DEPLOY_INFO=$(kubectl -n "$NAMESPACE" get deployment payments-backend -o json)
        READY_REPLICAS=$(echo "$DEPLOY_INFO" | jq -r '.status.readyReplicas // 0')
        DESIRED_REPLICAS=$(echo "$DEPLOY_INFO" | jq -r '.status.replicas // 0')
        
        if [ "$READY_REPLICAS" -ge 1 ]; then
            check_pass "Backend deployment ready ($READY_REPLICAS/$DEIRED_REPLICAS)"
            BACKEND_OK=true
        else
            check_fail "Backend deployment not ready ($READY_REPLICAS/$DEIRED_REPLICAS)"
            BACKEND_OK=false
        fi
    else
        check_fail "Backend deployment not found"
        BACKEND_OK=false
    fi
else
    check_skip "Backend deployment check (namespace not available)"
    BACKEND_OK=false
fi

# =============================================================================
# CHECK 6: Secrets
# =============================================================================
log_step "Check 6: Required Secrets"
run_check

if [ "$NS_OK" = true ]; then
    SECRETS_OK=true
    
    # Check for payments-secrets
    if kubectl -n "$NAMESPACE" get secret payments-secrets &>/dev/null; then
        echo "    ✅ payments-secrets exists"
        
        # Check for required keys
        for KEY in STRIPE_SECRET_KEY DATABASE_URL JWT_SECRET; do
            if kubectl -n "$NAMESPACE" get secret payments-secrets -o jsonpath="{.data.$KEY}" &>/dev/null; then
                echo "    ✅ $KEY present"
            else
                echo "    ❌ $KEY missing"
                SECRETS_OK=false
            fi
        done
    else
        echo "    ❌ payments-secrets not found"
        SECRETS_OK=false
    fi
    
    if [ "$SECRETS_OK" = true ]; then
        check_pass "All required secrets present"
    else
        check_fail "Some secrets missing"
    fi
else
    check_skip "Secrets check (namespace not available)"
fi

# =============================================================================
# CHECK 7: Newman E2E Tests
# =============================================================================
log_step "Check 7: Newman E2E Tests"
run_check

if [ -n "${ADMIN_JWT:-}" ] && [ -n "${BASE_URL:-}" ]; then
    if command -v newman &>/dev/null; then
        log_info "Running Newman E2E tests..."
        
        # Create environment file
        ENV_FILE="$REPORT_DIR/postman_env.json"
        cat > "$ENV_FILE" << EOF
{
  "name": "$NAMESPACE",
  "values": [
    {"key": "base_url", "value": "$BASE_URL", "enabled": true},
    {"key": "admin_jwt", "value": "$ADMIN_JWT", "enabled": true}
  ]
}
EOF

        # Run Newman
        NEWMAN_REPORT="${REPORT_DIR}/newman-report.xml"
        if newman run postman/postman_reconciliation.json \
            -e "$ENV_FILE" \
            --reporters cli,junit \
            --reporter-junit-export "$NEWMAN_REPORT" \
            --timeout-request 30000 2>&1 | tee "${REPORT_DIR}/newman-output.txt"; then
            check_pass "Newman E2E tests passed"
            NEWMAN_OK=true
        else
            check_fail "Newman E2E tests failed"
            NEWMAN_OK=false
        fi
    else
        check_skip "Newman not installed"
    fi
else
    check_skip "Newman E2E (ADMIN_JWT or BASE_URL not set)"
fi

# =============================================================================
# CHECK 8: Metrics Endpoint
# =============================================================================
log_step "Check 8: Prometheus Metrics"
run_check

if [ -n "${BASE_URL:-}" ]; then
    METRICS_URL="${BASE_URL}/api/metrics/reconciliation"
    
    if curl -sfS "$METRICS_URL" -o "${REPORT_DIR}/metrics.txt" 2>/dev/null; then
        # Check for reconciliation metrics
        if grep -q "reconciliation_runs_total" "${REPORT_DIR}/metrics.txt"; then
            check_pass "Reconciliation metrics available"
            METRICS_OK=true
            
            # Count metrics
            METRIC_COUNT=$(grep -c "^reconciliation_" "${REPORT_DIR}/metrics.txt" || echo "0")
            echo "    Metrics found: $METRIC_COUNT"
        else
            check_fail "Reconciliation metrics not found in response"
            METRICS_OK=false
        fi
    else
        check_fail "Cannot reach metrics endpoint: $METRICS_URL"
        METRICS_OK=false
    fi
else
    check_skip "Metrics check (BASE_URL not set)"
fi

# =============================================================================
# CHECK 9: Health Endpoint
# =============================================================================
log_step "Check 9: Health Endpoint"
run_check

if [ -n "${BASE_URL:-}" ]; then
    HEALTH_URL="${BASE_URL}/api/health"
    
    HEALTH_RESPONSE=$(curl -sfS "$HEALTH_URL" 2>/dev/null || echo '{"status":"error"}')
    
    if echo "$HEALTH_RESPONSE" | jq -e '.status == "ok" or .status == "healthy"' &>/dev/null; then
        check_pass "Health endpoint returns OK"
        HEALTH_OK=true
    else
        check_fail "Health endpoint not healthy"
        HEALTH_OK=false
    fi
else
    check_skip "Health check (BASE_URL not set)"
fi

# =============================================================================
# CHECK 10: PR Status
# =============================================================================
log_step "Check 10: PR Status"
run_check

if command -v gh &>/dev/null && gh auth status &>/dev/null; then
    PR_INFO=$(gh pr list --head feat/reconciliation-task4 --state all --json number,title,state,url 2>/dev/null || echo "[]")
    
    if [ "$PR_INFO" != "[]" ]; then
        PR_STATE=$(echo "$PR_INFO" | jq -r '.[0].state // "unknown"')
        PR_NUMBER=$(echo "$PR_INFO" | jq -r '.[0].number // "N/A"')
        PR_URL=$(echo "$PR_INFO" | jq -r '.[0].url // "N/A"')
        
        echo "    PR #$PR_NUMBER: $PR_STATE"
        echo "    URL: $PR_URL"
        
        if [ "$PR_STATE" = "MERGED" ]; then
            check_pass "PR is merged"
        elif [ "$PR_STATE" = "OPEN" ]; then
            check_fail "PR is open (needs merge)"
        else
            check_fail "PR state: $PR_STATE"
        fi
    else
        check_fail "No PR found for branch feat/reconciliation-task4"
    fi
else
    check_skip "PR check (gh CLI not available or not authenticated)"
fi

# =============================================================================
# Generate Final Report
# =============================================================================
echo ""
echo "=============================================="
echo "  Verification Summary"
echo "=============================================="

# Update report with final counts
cat > "$REPORT_FILE" << EOF
# Task 4 Verification Report

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Namespace:** $NAMESPACE

---

## Summary

| Category | Count |
|----------|-------|
| Total Checks | $TOTAL_CHECKS |
| Passed | $PASSED_CHECKS |
| Failed | $FAILED_CHECKS |
| Skipped | $SKIPPED_CHECKS |

---

## Detailed Results

EOF

# Add all results
for result in "${RESULTS[@]}"; do
    echo "- $result" >> "$REPORT_FILE"
done

# Add recommendations
cat >> "$REPORT_FILE" << EOF

---

## Recommendations

EOF

if [ "$FAILED_CHECKS" -gt 0 ]; then
    echo "### Actions Required" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    [ "$HELM_OK" = false ] && echo "- Deploy Helm release: \`./scripts/deploy-task4.sh\`" >> "$REPORT_FILE"
    [ "$CRONJOB_OK" = false ] && echo "- Enable reconciliation CronJob in values.yaml" >> "$REPORT_FILE"
    [ "$SECRETS_OK" = false ] && echo "- Configure required secrets in Kubernetes" >> "$REPORT_FILE"
    
    echo "" >> "$REPORT_FILE"
fi

echo "### Next Steps" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "1. Review failed checks above" >> "$REPORT_FILE"
echo "2. Run \`./scripts/deploy-task4.sh\` if Helm release missing" >> "$REPORT_FILE"
echo "3. Set ADMIN_JWT and BASE_URL environment variables for E2E tests" >> "$REPORT_FILE"
echo "4. Merge PR if not yet merged" >> "$REPORT_FILE"
echo "5. Import Grafana dashboard: observability/grafana/dashboards/reconciliation-prometheus.json" >> "$REPORT_FILE"

# Print summary
echo ""
echo "Total:    $TOTAL_CHECKS"
echo -e "Passed:   ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed:   ${RED}$FAILED_CHECKS${NC}"
echo -e "Skipped:  ${YELLOW}$SKIPPED_CHECKS${NC}"
echo ""
echo "Report saved to: $REPORT_FILE"

# Exit code based on failed checks
if [ "$FAILED_CHECKS" -gt 0 ]; then
    echo ""
    log_error "Some checks failed. Review the report for details."
    exit 1
else
    echo ""
    log_success "All checks passed!"
    exit 0
fi
