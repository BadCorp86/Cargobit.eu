#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Task 4: Full Automation Script
# =============================================================================
# This script automates:
# 1. Apply patch and create branch/commit/push
# 2. Import Grafana dashboard via API
# 3. Create GitHub PR
#
# Usage: ./scripts/task4-full-automation.sh
# 
# Required Environment Variables:
# - GRAFANA_URL: Your Grafana instance URL (e.g., https://grafana.example.com)
# - GRAFANA_API_KEY: Grafana API key with admin permissions
# - PROMETHEUS_DATASOURCE: Name of your Prometheus datasource (default: Prometheus)
#
# Optional:
# - GITHUB_OWNER: GitHub owner/organization (default: from git remote)
# - BRANCH_NAME: Branch name (default: feat/reconciliation-task4)
# =============================================================================

# Configuration
BRANCH_NAME="${BRANCH_NAME:-feat/reconciliation-task4}"
PATCH_FILE="${PATCH_FILE:-patches/task4_reconciliation.patch}"
PROMETHEUS_DATASOURCE="${PROMETHEUS_DATASOURCE:-Prometheus}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${PURPLE}[STEP]${NC} $1"; }

echo "=============================================="
echo "  Task 4: Full Automation Script"
echo "=============================================="
echo "Branch:           $BRANCH_NAME"
echo "Patch:            $PATCH_FILE"
echo "Prometheus DS:    $PROMETHEUS_DATASOURCE"
echo "Project:          $PROJECT_ROOT"
echo "=============================================="
echo ""

# =============================================================================
# STEP 1: Apply Patch
# =============================================================================
apply_patch() {
    log_step "STEP 1: Applying patch and creating commit..."

    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        log_warn "You have uncommitted changes."
        read -p "Stash them? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git stash push -m "pre-task4-apply-$(date +%s)"
        else
            log_error "Cannot proceed with uncommitted changes"
            exit 1
        fi
    fi

    # Create branch
    if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
        log_warn "Branch already exists. Checking out..."
        git checkout "$BRANCH_NAME"
    else
        git checkout -b "$BRANCH_NAME"
        log_success "Created branch: $BRANCH_NAME"
    fi

    # Check if patch file exists
    if [ ! -f "$PATCH_FILE" ]; then
        log_error "Patch file not found: $PATCH_FILE"
        exit 1
    fi

    # Apply patch
    if git apply "$PATCH_FILE"; then
        log_success "Patch applied successfully"
    else
        log_error "Failed to apply patch. Check for conflicts."
        git checkout -- .
        exit 1
    fi

    # Stage and commit
    git add .
    git commit -m "feat(reconciliation): Task 4 Reconciliation API + Cron

- Add ReconciliationModule with NestJS DI
- Add GET /admin/reconciliation/open endpoint
- Add POST /admin/reconciliation/{id}/mark endpoint
- Add ReconciliationScheduler with 6h cron schedule
- Add Helm CronJob template for Kubernetes
- Add Postman collection for E2E testing
- Add Jest unit tests

Implements: Task 4 Payout Reconciliation"

    log_success "Commit created"

    # Push
    log_info "Pushing to origin..."
    if git push --set-upstream origin "$BRANCH_NAME" 2>/dev/null; then
        log_success "Pushed to origin/$BRANCH_NAME"
    else
        log_warn "Push failed. Push manually: git push --set-upstream origin $BRANCH_NAME"
    fi
}

# =============================================================================
# STEP 2: Import Grafana Dashboard
# =============================================================================
import_grafana_dashboard() {
    log_step "STEP 2: Importing Grafana dashboard..."

    # Check environment variables
    if [ -z "${GRAFANA_URL:-}" ] || [ -z "${GRAFANA_API_KEY:-}" ]; then
        log_warn "GRAFANA_URL or GRAFANA_API_KEY not set."
        log_info "Skipping Grafana import. Set these variables to automate:"
        echo "  export GRAFANA_URL=https://grafana.example.com"
        echo "  export GRAFANA_API_KEY=your-api-key"
        echo ""
        log_info "Or import manually via UI: observability/grafana/dashboards/reconciliation-prometheus.json"
        return 0
    fi

    # Create dashboard JSON with correct datasource
    DASHBOARD_FILE=$(mktemp)
    
    cat > "$DASHBOARD_FILE" << EOF
{
  "dashboard": {
    "annotations": { "list": [] },
    "description": "CargoBit Reconciliation Dashboard",
    "editable": true,
    "gnetId": null,
    "graphTooltip": 0,
    "id": null,
    "links": [],
    "panels": [
      {
        "datasource": "${PROMETHEUS_DATASOURCE}",
        "fieldConfig": { "defaults": {}, "overrides": [] },
        "gridPos": { "h": 6, "w": 12, "x": 0, "y": 0 },
        "id": 1,
        "options": {},
        "targets": [
          {
            "expr": "sum by (result) (increase(reconciliation_runs_total[1d]))",
            "format": "time_series",
            "interval": "",
            "legendFormat": "{{result}}",
            "refId": "A"
          }
        ],
        "title": "Reconciliation Runs (last 24h)",
        "type": "timeseries"
      },
      {
        "datasource": "${PROMETHEUS_DATASOURCE}",
        "fieldConfig": { "defaults": {}, "overrides": [] },
        "gridPos": { "h": 6, "w": 6, "x": 0, "y": 6 },
        "id": 2,
        "options": {},
        "targets": [
          {
            "expr": "sum(reconciliation_open_payouts_gauge)",
            "format": "time_series",
            "interval": "",
            "legendFormat": "",
            "refId": "A"
          }
        ],
        "title": "Open Payouts",
        "type": "stat"
      },
      {
        "datasource": "${PROMETHEUS_DATASOURCE}",
        "fieldConfig": { "defaults": {}, "overrides": [] },
        "gridPos": { "h": 6, "w": 6, "x": 6, "y": 6 },
        "id": 3,
        "options": {},
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(reconciliation_duration_seconds_bucket[5m])) by (le))",
            "format": "time_series",
            "interval": "",
            "legendFormat": "p95",
            "refId": "A"
          }
        ],
        "title": "Reconciliation Duration p95",
        "type": "timeseries"
      }
    ],
    "schemaVersion": 30,
    "style": "dark",
    "tags": ["payments", "reconciliation"],
    "templating": { "list": [] },
    "time": { "from": "now-6h", "to": "now" },
    "timepicker": {},
    "timezone": "",
    "title": "Payments Reconciliation",
    "uid": "payments-reconciliation",
    "version": 1
  },
  "overwrite": true
}
EOF

    # Import via API
    log_info "Importing dashboard to Grafana..."
    
    HTTP_CODE=$(curl -s -o /dev/stdout -w "%{http_code}" -X POST \
        "${GRAFANA_URL}/api/dashboards/db" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
        -d @"$DASHBOARD_FILE")

    rm -f "$DASHBOARD_FILE"

    if echo "$HTTP_CODE" | grep -q "200\|201"; then
        log_success "Dashboard imported successfully"
        log_info "View at: ${GRAFANA_URL}/d/payments-reconciliation"
    else
        log_warn "Dashboard import may have failed. HTTP code: $HTTP_CODE"
        log_info "Import manually via Grafana UI"
    fi
}

# =============================================================================
# STEP 3: Create PR
# =============================================================================
create_pr() {
    log_step "STEP 3: Creating GitHub PR..."

    if ! command -v gh &> /dev/null; then
        log_warn "gh CLI not found. Create PR manually:"
        echo ""
        echo "  1. Go to your GitHub repo"
        echo "  2. Create PR from branch: $BRANCH_NAME"
        echo "  3. Use PR body from: docs/pr-template-reconciliation.md"
        return 0
    fi

    # Check gh auth
    if ! gh auth status &> /dev/null; then
        log_warn "gh CLI not authenticated. Run: gh auth login"
        return 0
    fi

    # Create PR
    log_info "Creating PR..."
    
    PR_URL=$(gh pr create \
        --base main \
        --head "$BRANCH_NAME" \
        --title "feat(reconciliation): Task 4 Reconciliation API + Cron" \
        --body-file docs/pr-template-reconciliation.md \
        2>/dev/null || echo "")

    if [ -n "$PR_URL" ]; then
        log_success "PR created: $PR_URL"
        
        # Show PR status
        log_info "PR Status:"
        gh pr view --web 2>/dev/null || true
    else
        log_warn "PR creation failed. Create manually via GitHub UI"
    fi
}

# =============================================================================
# Main
# =============================================================================
main() {
    echo ""
    
    # Run steps
    apply_patch
    echo ""
    
    import_grafana_dashboard
    echo ""
    
    create_pr
    echo ""

    # Summary
    echo "=============================================="
    log_success "Task 4 Automation Complete!"
    echo "=============================================="
    echo ""
    echo "Next steps:"
    echo "  1. Review the PR on GitHub"
    echo "  2. Run tests: npm run test -- --testPathPattern=src/reconciliation"
    echo "  3. Deploy to staging: ./scripts/deploy-task4.sh"
    echo "  4. Run Newman E2E: newman run postman/postman_reconciliation.json"
    echo ""
    echo "Files:"
    echo "  - Patch:     patches/task4_reconciliation.patch"
    echo "  - PR Body:   docs/pr-template-reconciliation.md"
    echo "  - Dashboard: observability/grafana/dashboards/reconciliation-prometheus.json"
    echo "  - Deploy:    scripts/deploy-task4.sh"
}

# Run
main "$@"
