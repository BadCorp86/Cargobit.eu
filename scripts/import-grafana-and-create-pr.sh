#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Import Grafana Dashboard and Create PR
# =============================================================================
# Usage:
#   ./scripts/import-grafana-and-create-pr.sh \
#     --grafana-url https://grafana.example.com \
#     --grafana-key <API_KEY> \
#     --datasource "Prometheus" \
#     --repo-owner my-org \
#     --repo-name my-repo \
#     --branch feat/reconciliation-task4
#
# Requirements:
#   - jq (for JSON manipulation)
#   - curl (for Grafana API)
#   - gh CLI (for PR creation, optional)
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --grafana-url) GRAFANA_URL="$2"; shift 2;;
    --grafana-key) GRAFANA_KEY="$2"; shift 2;;
    --datasource) DATASOURCE="$2"; shift 2;;
    --repo-owner) REPO_OWNER="$2"; shift 2;;
    --repo-name) REPO_NAME="$2"; shift 2;;
    --branch) BRANCH="$2"; shift 2;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --grafana-url   Grafana instance URL (required)"
      echo "  --grafana-key   Grafana API key (required)"
      echo "  --datasource    Prometheus datasource name (default: Prometheus)"
      echo "  --repo-owner    GitHub repo owner (required)"
      echo "  --repo-name     GitHub repo name (required)"
      echo "  --branch        Branch name (default: feat/reconciliation-task4)"
      exit 0
      ;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

# Validate required args
: "${GRAFANA_URL:?--grafana-url required}"
: "${GRAFANA_KEY:?--grafana-key required}"
: "${DATASOURCE:=Prometheus}"
: "${REPO_OWNER:?--repo-owner required}"
: "${REPO_NAME:?--repo-name required}"
: "${BRANCH:=feat/reconciliation-task4}"

# Check dependencies
if ! command -v jq >/dev/null 2>&1; then
    log_error "jq is required but not installed"
    exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
    log_error "curl is required but not installed"
    exit 1
fi

# Setup temp directory
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

DASH_JSON="$TMPDIR/grafana_dashboard.json"
SOURCE_DASHBOARD="observability/grafana/dashboards/reconciliation-prometheus.json"

echo "=============================================="
echo "  Grafana Import & PR Creation"
echo "=============================================="
echo "Grafana URL:  $GRAFANA_URL"
echo "Datasource:   $DATASOURCE"
echo "Repo:         ${REPO_OWNER}/${REPO_NAME}"
echo "Branch:       $BRANCH"
echo "=============================================="

# =============================================================================
# Step 1: Prepare Dashboard JSON
# =============================================================================
log_info "Step 1: Preparing dashboard JSON..."

if [ ! -f "$SOURCE_DASHBOARD" ]; then
    log_error "Dashboard file not found: $SOURCE_DASHBOARD"
    exit 1
fi

# Replace datasource name in JSON
jq --arg ds "$DATASOURCE" '
  walk(
    if type == "object" and has("datasource") then
      .datasource = $ds
    else
      .
    end
  )
' "$SOURCE_DASHBOARD" > "$DASH_JSON" 2>/dev/null || {
    # Fallback if walk() not available in older jq
    jq --arg ds "$DATASOURCE" '(.panels[]?.datasource) = $ds' "$SOURCE_DASHBOARD" > "$DASH_JSON"
}

log_success "Dashboard JSON prepared with datasource: $DATASOURCE"

# =============================================================================
# Step 2: Import to Grafana
# =============================================================================
log_info "Step 2: Importing dashboard to Grafana..."

HTTP_RESPONSE=$(curl -sS -w "%{http_code}" -o "$TMPDIR/resp.json" -X POST \
    "${GRAFANA_URL}/api/dashboards/db" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${GRAFANA_KEY}" \
    -d @"$DASH_JSON")

HTTP_CODE="${HTTP_RESPONSE:(-3)}"

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
    log_error "Grafana import failed (HTTP $HTTP_CODE)"
    echo "Response:"
    cat "$TMPDIR/resp.json" 2>/dev/null || echo "No response body"
    exit 1
fi

log_success "Dashboard imported successfully!"

# Parse and show result
DASHBOARD_URL=$(jq -r '.url // .slug // "N/A"' "$TMPDIR/resp.json" 2>/dev/null || echo "N/A")
DASHBOARD_ID=$(jq -r '.id // "N/A"' "$TMPDIR/resp.json" 2>/dev/null || echo "N/A")

echo ""
echo "Dashboard Details:"
echo "  ID:  $DASHBOARD_ID"
echo "  URL: ${GRAFANA_URL}${DASHBOARD_URL}"
echo ""

# =============================================================================
# Step 3: Create PR (optional)
# =============================================================================
log_info "Step 3: Creating PR..."

if ! command -v gh >/dev/null 2>&1; then
    log_warn "gh CLI not found; skipping PR creation"
    log_info "To create PR manually:"
    echo "  gh pr create --repo ${REPO_OWNER}/${REPO_NAME} --base main --head ${BRANCH}"
    exit 0
fi

# Check gh auth
if ! gh auth status &>/dev/null; then
    log_warn "gh CLI not authenticated. Run: gh auth login"
    exit 0
fi

PR_TITLE="feat(reconciliation): Task 4 Reconciliation API + Cron"

# Use PR body from template if exists
if [ -f "docs/pr-template-reconciliation.md" ]; then
    PR_BODY=$(cat docs/pr-template-reconciliation.md)
else
    PR_BODY=$'Summary:\nAdds ReconciliationModule with admin endpoints, reconciliation scheduler, Helm CronJob, Postman collection and unit tests.'
fi

log_info "Creating PR on ${REPO_OWNER}/${REPO_NAME} from branch ${BRANCH}..."

PR_URL=$(gh pr create \
    --repo "${REPO_OWNER}/${REPO_NAME}" \
    --base main \
    --head "${BRANCH}" \
    --title "$PR_TITLE" \
    --body "$PR_BODY" \
    2>/dev/null || echo "")

if [ -n "$PR_URL" ]; then
    log_success "PR created: $PR_URL"
else
    log_warn "PR creation failed or PR already exists"
    log_info "Check existing PRs: gh pr list --repo ${REPO_OWNER}/${REPO_NAME}"
fi

echo ""
log_success "Done!"
echo ""
echo "Summary:"
echo "  ✅ Dashboard imported to Grafana"
echo "  ✅ PR created on GitHub"
echo ""
echo "Next steps:"
echo "  1. Review the PR: gh pr view --web"
echo "  2. View dashboard: ${GRAFANA_URL}/d/payments-reconciliation"
echo "  3. Deploy to staging: ./scripts/deploy-task4.sh"
