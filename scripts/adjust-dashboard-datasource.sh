#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Dashboard Datasource Adjustment Helper
# =============================================================================
# Usage: ./scripts/adjust-dashboard-datasource.sh <new-datasource-name>
#
# This script adjusts the datasource name in all Grafana dashboard JSON files.
# =============================================================================

DATASOURCE="${1:-Prometheus}"
DASHBOARD_DIR="observability/grafana/dashboards"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo "=============================================="
echo "  Dashboard Datasource Adjustment"
echo "=============================================="
echo "New Datasource: $DATASOURCE"
echo "Directory:      $DASHBOARD_DIR"
echo "=============================================="

# Check for jq
if ! command -v jq >/dev/null 2>&1; then
    log_warn "jq not found, will use sed (less safe)"
    USE_JQ=false
else
    USE_JQ=true
fi

# Process each dashboard file
for DASHBOARD in "$DASHBOARD_DIR"/*.json; do
    if [ ! -f "$DASHBOARD" ]; then
        continue
    fi

    FILENAME=$(basename "$DASHBOARD")
    BACKUP="${DASHBOARD}.bak"

    log_info "Processing: $FILENAME"

    # Create backup
    cp "$DASHBOARD" "$BACKUP"

    if [ "$USE_JQ" = true ]; then
        # Use jq for safe JSON manipulation
        # Try multiple approaches for different JSON structures
        
        # Approach 1: Direct panel datasource
        if jq -e '.panels[]?.datasource' "$BACKUP" >/dev/null 2>&1; then
            jq --arg ds "$DATASOURCE" '
                (.panels[]?.datasource) = $ds |
                (.panels[]?.targets[]?.datasource) = $ds
            ' "$BACKUP" > "$DASHBOARD" 2>/dev/null || {
                # Fallback: simpler replacement
                jq --arg ds "$DATASOURCE" '(.panels[]?.datasource) = $ds' "$BACKUP" > "$DASHBOARD"
            }
        # Approach 2: Nested panels in rows
        elif jq -e '.rows[]?.panels[]?.datasource' "$BACKUP" >/dev/null 2>&1; then
            jq --arg ds "$DATASOURCE" '
                (.rows[]?.panels[]?.datasource) = $ds
            ' "$BACKUP" > "$DASHBOARD"
        else
            log_warn "  No datasource fields found or unknown structure"
            rm -f "$BACKUP"
            continue
        fi
    else
        # Use sed (less safe, but works without jq)
        sed -E "s/\"datasource\"[[:space:]]*:[[:space:]]*\"[^\"]*\"/\"datasource\":\"$DATASOURCE\"/g" \
            "$BACKUP" > "$DASHBOARD"
    fi

    # Validate JSON
    if [ "$USE_JQ" = true ]; then
        if jq . "$DASHBOARD" >/dev/null 2>&1; then
            log_success "  ✅ Updated and validated"
            rm -f "$BACKUP"
        else
            log_warn "  ⚠️ JSON validation failed, restoring backup"
            mv "$BACKUP" "$DASHBOARD"
        fi
    else
        # Basic validation without jq
        if grep -q '"datasource"' "$DASHBOARD"; then
            log_success "  ✅ Updated (not validated - install jq for validation)"
            rm -f "$BACKUP"
        else
            log_warn "  ⚠️ Update may have failed, restoring backup"
            mv "$BACKUP" "$DASHBOARD"
        fi
    fi
done

echo ""
log_success "Done!"
echo ""
echo "Verify changes:"
echo "  grep -r 'datasource' $DASHBOARD_DIR/*.json"
echo ""
echo "To restore from backups (if needed):"
echo "  for f in $DASHBOARD_DIR/*.json.bak; do mv \"\$f\" \"\${f%.bak}\"; done"
