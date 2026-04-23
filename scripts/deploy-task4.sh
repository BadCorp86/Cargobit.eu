#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Task 4: Reconciliation Deploy Script
# =============================================================================
# Usage: ./scripts/deploy-task4.sh <kubeconfig-path|auto>
#
# Dieses Script:
# 1. Lintet das Helm Chart
# 2. Deployt nach Kubernetes (staging/production)
# 3. Verifiziert den CronJob
# 4. Startet einen manuellen Reconciliation Run
# 5. Sammelt Logs
# 6. Führt optional Newman E2E Tests aus
#
# Required Environment Variables:
# - KUBE_NAMESPACE (default: staging)
# - ADMIN_JWT (optional, für Newman E2E)
# - BASE_URL (optional, für Newman E2E)
# =============================================================================

KUBECONFIG_PATH=${1:-auto}
NAMESPACE=${KUBE_NAMESPACE:-staging}
CHART_PATH=${CHART_PATH:-helm/payments-service}
VALUES_FILE=${VALUES_FILE:-helm/payments-service/values.yaml}
VALUES_RECONCILIATION=${VALUES_RECONCILIATION:-helm/payments-service/values-reconciliation.yaml}
RELEASE_NAME=${RELEASE_NAME:-payments}

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Prüfe Required Tools
check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing=()

    if ! command -v helm &> /dev/null; then
        missing+=("helm")
    fi

    if ! command -v kubectl &> /dev/null; then
        missing+=("kubectl")
    fi

    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing[*]}"
        exit 1
    fi

    log_success "All prerequisites met"
}

# Setze Kubeconfig
setup_kubeconfig() {
    if [ "$KUBECONFIG_PATH" != "auto" ]; then
        if [ -f "$KUBECONFIG_PATH" ]; then
            export KUBECONFIG="$KUBECONFIG_PATH"
            log_success "Using kubeconfig: $KUBECONFIG_PATH"
        else
            log_error "Kubeconfig not found: $KUBECONFIG_PATH"
            exit 1
        fi
    else
        log_info "Using default kubeconfig"
    fi

    # Verify connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    log_success "Kubernetes connection verified"
}

# Helm Lint
helm_lint() {
    log_info "Linting Helm chart..."

    if helm lint "$CHART_PATH"; then
        log_success "Helm lint passed"
    else
        log_error "Helm lint failed"
        exit 1
    fi
}

# Helm Deploy
helm_deploy() {
    log_info "Deploying Helm chart to namespace: $NAMESPACE..."

    local values_args=("--values" "$VALUES_FILE")

    # Add reconciliation values if exists
    if [ -f "$VALUES_RECONCILIATION" ]; then
        values_args+=("--values" "$VALUES_RECONCILIATION")
    fi

    if helm upgrade --install "$RELEASE_NAME" "$CHART_PATH" \
        --namespace "$NAMESPACE" --create-namespace \
        "${values_args[@]}" \
        --wait --timeout 5m; then
        log_success "Helm deployment successful"
    else
        log_error "Helm deployment failed"
        exit 1
    fi
}

# Verify CronJob
verify_cronjob() {
    log_info "Verifying CronJob exists..."

    local cronjob_name="${RELEASE_NAME}-reconciliation"

    if kubectl -n "$NAMESPACE" get cronjob "$cronjob_name" &> /dev/null; then
        log_success "CronJob found: $cronjob_name"

        # Show schedule
        local schedule
        schedule=$(kubectl -n "$NAMESPACE" get cronjob "$cronjob_name" -o jsonpath='{.spec.schedule}')
        log_info "Schedule: $schedule"

        # Show last schedule time
        local last_schedule
        last_schedule=$(kubectl -n "$NAMESPACE" get cronjob "$cronjob_name" -o jsonpath='{.status.lastScheduleTime}' 2>/dev/null || echo "Never")
        log_info "Last scheduled: $last_schedule"
    else
        log_error "CronJob not found: $cronjob_name"
        log_warn "Check if reconciliation.enabled=true in values.yaml"
        exit 1
    fi
}

# Trigger Manual Run
trigger_manual_run() {
    log_info "Triggering manual reconciliation run..."

    local ts
    ts=$(date +%s)
    local job_name="manual-recon-${ts}"
    local cronjob_name="${RELEASE_NAME}-reconciliation"

    # Create job from cronjob
    if kubectl -n "$NAMESPACE" create job --from=cronjob/"$cronjob_name" "$job_name"; then
        log_success "Job created: $job_name"
    else
        log_error "Failed to create job"
        exit 1
    fi

    # Wait for pod
    log_info "Waiting for pod to start..."
    sleep 3

    local pod
    pod=$(kubectl -n "$NAMESPACE" get pods -l job-name="$job_name" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

    if [ -z "$pod" ]; then
        log_warn "Pod not found yet, waiting longer..."
        sleep 5
        pod=$(kubectl -n "$NAMESPACE" get pods -l job-name="$job_name" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    fi

    if [ -z "$pod" ]; then
        log_error "Pod not found for job: $job_name"
        return 1
    fi

    log_info "Pod: $pod"

    # Wait for pod to be ready
    log_info "Waiting for pod to complete..."
    kubectl -n "$NAMESPACE" wait --for=condition=Ready pod/"$pod" --timeout=60s 2>/dev/null || true

    # Stream logs
    log_info "Streaming logs (max 200 lines)..."
    echo "---"
    kubectl -n "$NAMESPACE" logs "$pod" --tail=200 || true
    echo "---"

    # Check job status
    local job_status
    job_status=$(kubectl -n "$NAMESPACE" get job "$job_name" -o jsonpath='{.status.conditions[0].type}' 2>/dev/null || echo "Unknown")
    log_info "Job status: $job_status"

    # Cleanup job (optional)
    # kubectl -n "$NAMESPACE" delete job "$job_name" 2>/dev/null || true
}

# Newman E2E Tests
run_newman_e2e() {
    if [ -z "${ADMIN_JWT:-}" ] || [ -z "${BASE_URL:-}" ]; then
        log_warn "ADMIN_JWT or BASE_URL not set; skipping Newman E2E"
        return 0
    fi

    if ! command -v newman &> /dev/null; then
        log_warn "Newman not installed; skipping E2E"
        return 0
    fi

    log_info "Running Newman E2E tests..."

    # Create environment file
    local env_file="postman_env_${NAMESPACE}.json"
    cat > "$env_file" <<EOF
{
  "id": "env-${NAMESPACE}",
  "name": "${NAMESPACE}",
  "values": [
    { "key": "base_url", "value": "${BASE_URL}", "enabled": true },
    { "key": "admin_jwt", "value": "${ADMIN_JWT}", "enabled": true }
  ]
}
EOF

    # Create reports directory
    mkdir -p reports

    # Run Newman
    if newman run postman/postman_reconciliation.json \
        -e "$env_file" \
        --reporters cli,junit \
        --reporter-junit-export reports/newman-reconciliation.xml \
        --timeout-request 30000; then
        log_success "Newman E2E passed"
        log_info "Report: reports/newman-reconciliation.xml"
    else
        log_error "Newman E2E failed"
        return 1
    fi
}

# Show Status
show_status() {
    log_info "Collecting Helm release status..."
    helm status "$RELEASE_NAME" -n "$NAMESPACE"

    echo ""
    log_info "Recent pods:"
    kubectl -n "$NAMESPACE" get pods -l "app.kubernetes.io/instance=$RELEASE_NAME" --sort-by=.metadata.creationTimestamp | tail -5

    echo ""
    log_info "Recent events:"
    kubectl -n "$NAMESPACE" get events --sort-by=.metadata.creationTimestamp | tail -10
}

# Main
main() {
    echo "=============================================="
    echo "  Task 4: Reconciliation Deploy Script"
    echo "=============================================="
    echo "Namespace:    $NAMESPACE"
    echo "Chart:        $CHART_PATH"
    echo "Release:      $RELEASE_NAME"
    echo "=============================================="
    echo ""

    check_prerequisites
    setup_kubeconfig
    helm_lint
    helm_deploy
    verify_cronjob
    trigger_manual_run
    run_newman_e2e
    show_status

    echo ""
    log_success "Deploy complete!"
}

# Run
main "$@"
