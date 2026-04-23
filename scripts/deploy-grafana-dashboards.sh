#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Grafana Dashboard Deploy Script
# =============================================================================
# Deployt alle CargoBit Grafana Dashboards via Kubernetes ConfigMap
#
# Usage: ./scripts/deploy-grafana-dashboards.sh [namespace]
# =============================================================================

NAMESPACE="${1:-monitoring}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=============================================="
echo "  Grafana Dashboard Deploy Script"
echo "=============================================="
echo "Namespace: $NAMESPACE"
echo "Project:   $PROJECT_ROOT"
echo "=============================================="

# Prüfe kubectl
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl not found"
    exit 1
fi

# Prüfe Namespace
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
    log_info "Creating namespace: $NAMESPACE"
    kubectl create namespace "$NAMESPACE"
fi

# Deploy Reconciliation Dashboard
log_info "Deploying Reconciliation Dashboard..."

kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-reconciliation
  namespace: $NAMESPACE
  labels:
    grafana_dashboard: "1"
    app.kubernetes.io/name: grafana-dashboard
    app.kubernetes.io/component: reconciliation
    app.kubernetes.io/part-of: cargobit
data:
  reconciliation.json: |
$(cat "$PROJECT_ROOT/observability/grafana/dashboards/reconciliation.json" | sed 's/^/    /')
EOF

log_success "Reconciliation Dashboard deployed"

# Deploy Gateway Dashboard (falls vorhanden)
if [ -f "$PROJECT_ROOT/observability/grafana/dashboards/gateway.json" ]; then
    log_info "Deploying Gateway Dashboard..."
    kubectl create configmap grafana-dashboard-gateway \
        --from-file=gateway.json="$PROJECT_ROOT/observability/grafana/dashboards/gateway.json" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
    log_success "Gateway Dashboard deployed"
fi

# Deploy Matching Service Dashboard (falls vorhanden)
if [ -f "$PROJECT_ROOT/observability/grafana/dashboards/matching-service.json" ]; then
    log_info "Deploying Matching Service Dashboard..."
    kubectl create configmap grafana-dashboard-matching \
        --from-file=matching-service.json="$PROJECT_ROOT/observability/grafana/dashboards/matching-service.json" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
    log_success "Matching Service Dashboard deployed"
fi

# Deploy Pricing Service Dashboard (falls vorhanden)
if [ -f "$PROJECT_ROOT/observability/grafana/dashboards/pricing-service.json" ]; then
    log_info "Deploying Pricing Service Dashboard..."
    kubectl create configmap grafana-dashboard-pricing \
        --from-file=pricing-service.json="$PROJECT_ROOT/observability/grafana/dashboards/pricing-service.json" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
    log_success "Pricing Service Dashboard deployed"
fi

# Zeige alle Dashboards
log_info "Deployed Dashboards:"
kubectl get configmaps -n "$NAMESPACE" -l grafana_dashboard=1 -o custom-columns=NAME:.metadata.name

echo ""
log_success "Dashboard deployment complete!"
echo ""
echo "Hinweis: Stelle sicher, dass Grafana für sidecar Dashboard-Import konfiguriert ist:"
echo "  - GF_AUTH_ANONYMOUS_ENABLED=true"
echo "  - Oder Dashboard Sidecar Container mit label selector: grafana_dashboard=1"
