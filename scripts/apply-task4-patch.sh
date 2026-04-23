#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Task 4: Apply Patch and Create PR
# =============================================================================
# This script applies the reconciliation patch, commits, and creates a PR
#
# Usage: ./scripts/apply-task4-patch.sh [branch-name]
# =============================================================================

BRANCH_NAME="${1:-feat/reconciliation-task4}"
PATCH_FILE="patches/task4_reconciliation.patch"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_ROOT"

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

echo "=============================================="
echo "  Task 4: Apply Patch & Create PR"
echo "=============================================="
echo "Branch:    $BRANCH_NAME"
echo "Patch:     $PATCH_FILE"
echo "=============================================="

# Check if git repo
if [ ! -d ".git" ]; then
    log_error "Not a git repository"
    exit 1
fi

# Check if patch file exists
if [ ! -f "$PATCH_FILE" ]; then
    log_error "Patch file not found: $PATCH_FILE"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    log_warn "You have uncommitted changes. Stashing..."
    git stash push -m "pre-task4-apply-$(date +%s)"
fi

# Create and checkout branch
log_info "Creating branch: $BRANCH_NAME"
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    log_warn "Branch already exists. Checking out..."
    git checkout "$BRANCH_NAME"
else
    git checkout -b "$BRANCH_NAME"
fi

# Apply patch
log_info "Applying patch..."
if git apply "$PATCH_FILE"; then
    log_success "Patch applied successfully"
else
    log_error "Failed to apply patch. Check for conflicts."
    git checkout -- .
    exit 1
fi

# Show changed files
log_info "Changed files:"
git status --short

# Stage all changes
log_info "Staging changes..."
git add .

# Commit
log_info "Creating commit..."
git commit -m "feat(reconciliation): Task 4 Reconciliation API + Cron

- Add ReconciliationModule with NestJS DI
- Add GET /admin/reconciliation/open endpoint
- Add POST /admin/reconciliation/{id}/mark endpoint
- Add ReconciliationScheduler with 6h cron schedule
- Add Helm CronJob template for Kubernetes
- Add Postman collection for E2E testing
- Add Jest unit tests
- Add Grafana dashboard with Prometheus datasource

Implements: Task 4 Payout Reconciliation
"

log_success "Commit created"

# Push
log_info "Pushing to origin..."
if git push --set-upstream origin "$BRANCH_NAME" 2>/dev/null; then
    log_success "Pushed to origin/$BRANCH_NAME"
else
    log_warn "Push failed. You may need to authenticate or push manually:"
    echo "  git push --set-upstream origin $BRANCH_NAME"
fi

# Check for gh CLI
if command -v gh &> /dev/null; then
    log_info "Creating PR with gh CLI..."

    # Read PR body from template
    PR_BODY=$(cat docs/pr-template-reconciliation.md)

    if gh pr create \
        --base main \
        --head "$BRANCH_NAME" \
        --title "feat(reconciliation): Task 4 Reconciliation API + Cron" \
        --body "$PR_BODY"; then
        log_success "PR created successfully!"
    else
        log_warn "PR creation failed. Create manually or check gh auth status."
        echo "  gh auth status"
        echo "  gh pr create --base main --head $BRANCH_NAME"
    fi
else
    log_info "gh CLI not found. Create PR manually:"
    echo ""
    echo "  1. Go to: https://github.com/$(git remote get-url origin | sed 's/.*github.com[/:]//;s/.git$//')/pull/new/$BRANCH_NAME"
    echo "  2. Or run: gh pr create --base main --head $BRANCH_NAME"
fi

echo ""
log_success "Done! 🎉"
echo ""
echo "Next steps:"
echo "  1. Review changes in the PR"
echo "  2. Run tests: npm run test -- --testPathPattern=src/reconciliation"
echo "  3. Deploy to staging: ./scripts/deploy-task4.sh"
echo "  4. Import Grafana dashboard: observability/grafana/dashboards/reconciliation-prometheus.json"
