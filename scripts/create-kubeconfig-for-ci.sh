#!/usr/bin/env bash
# =============================================================================
# create-kubeconfig-for-ci.sh
# Erzeugt ein namespace-scoped kubeconfig für CI ServiceAccount
# =============================================================================
set -euo pipefail

# Usage:
#   ./scripts/create-kubeconfig-for-ci.sh <namespace> <serviceaccount> [github-repo] [github-owner]
# Example:
#   ./scripts/create-kubeconfig-for-ci.sh staging ci-deployer my-repo my-org

NAMESPACE=${1:-staging}
SA=${2:-ci-deployer}
GITHUB_REPO=${3:-}
GITHUB_OWNER=${4:-}

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# Temporäres Verzeichnis
TMPDIR=$(mktemp -d)
cleanup() { 
  log_info "Bereinige temporäre Dateien..."
  rm -rf "$TMPDIR"
}
trap cleanup EXIT

echo ""
echo "=========================================="
echo "  Kubeconfig Generator für CI"
echo "=========================================="
echo ""
echo "Namespace:       $NAMESPACE"
echo "ServiceAccount:  $SA"
echo "GitHub Repo:     ${GITHUB_REPO:-<nicht angegeben>}"
echo "GitHub Owner:    ${GITHUB_OWNER:-<nicht angegeben>}"
echo ""

# =============================================================================
# 1) Prüfe ServiceAccount existiert
# =============================================================================
log_info "Prüfe ServiceAccount..."
if ! kubectl -n "$NAMESPACE" get sa "$SA" >/dev/null 2>&1; then
  log_error "ServiceAccount '$SA' nicht gefunden in Namespace '$NAMESPACE'"
  log_info "Erstelle ServiceAccount mit: kubectl apply -f kubernetes/ci-serviceaccount-rbac.yaml"
  exit 1
fi
log_info "ServiceAccount gefunden: $SA"

# =============================================================================
# 2) Token und CA extrahieren
# =============================================================================
SECRET_NAME=$(kubectl -n "$NAMESPACE" get sa "$SA" -o jsonpath='{.secrets[0].name}' 2>/dev/null || true)

if [ -z "$SECRET_NAME" ]; then
  # Kubernetes 1.24+: Projected Token Flow
  log_info "Kein Secret am ServiceAccount - erstelle Token (Kubernetes 1.24+)..."
  SECRET_NAME="${SA}-token-$(date +%s)"
  
  # Token erstellen (24 Stunden gültig)
  kubectl -n "$NAMESPACE" create token "$SA" --duration=87600h -o json > "$TMPDIR/token.json" 2>/dev/null || {
    log_error "Token-Erstellung fehlgeschlagen"
    exit 1
  }
  TOKEN=$(jq -r '.status.token' "$TMPDIR/token.json")
  
  # CA und Server aus Cluster-Config
  CA_CERT=$(kubectl config view --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')
  SERVER=$(kubectl config view --raw -o jsonpath='{.clusters[0].cluster.server}')
else
  log_info "Secret gefunden: $SECRET_NAME"
  TOKEN=$(kubectl -n "$NAMESPACE" get secret "$SECRET_NAME" -o jsonpath='{.data.token}' | base64 --decode)
  CA_CERT=$(kubectl -n "$NAMESPACE" get secret "$SECRET_NAME" -o jsonpath='{.data.ca\.crt}')
  SERVER=$(kubectl config view --raw -o jsonpath='{.clusters[0].cluster.server}')
fi

if [ -z "$TOKEN" ] || [ -z "$CA_CERT" ] || [ -z "$SERVER" ]; then
  log_error "Token, CA oder Server konnten nicht extrahiert werden"
  exit 1
fi

log_info "Cluster API Server: $SERVER"

# =============================================================================
# 3) Kubeconfig erstellen
# =============================================================================
KUBECONFIG_FILE="$TMPDIR/kubeconfig-ci"
cat > "$KUBECONFIG_FILE" <<EOF
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: ${CA_CERT}
    server: ${SERVER}
  name: ${NAMESPACE}-cluster
contexts:
- context:
    cluster: ${NAMESPACE}-cluster
    user: ${SA}
    namespace: ${NAMESPACE}
  name: ${SA}-context
current-context: ${SA}-context
users:
- name: ${SA}
  user:
    token: ${TOKEN}
EOF

log_info "Kubeconfig erstellt: $KUBECONFIG_FILE"

# =============================================================================
# 4) Base64 kodieren für GitHub Secret
# =============================================================================
KUBECONFIG_B64=$(base64 -w0 "$KUBECONFIG_FILE")
log_info "Base64 kubeconfig Länge: ${#KUBECONFIG_B64} Zeichen"

# =============================================================================
# 5) Optional: GitHub Secret setzen
# =============================================================================
if [ -n "$GITHUB_REPO" ] && [ -n "$GITHUB_OWNER" ]; then
  if ! command -v gh >/dev/null 2>&1; then
    log_warn "GitHub CLI (gh) nicht gefunden"
    log_info "Installiere: https://cli.github.com/"
    log_info "Oder setze Secret manuell"
  else
    log_info "Setze GitHub Secret KUBE_CONFIG_DATA für ${GITHUB_OWNER}/${GITHUB_REPO}..."
    
    # Prüfe ob gh authentifiziert ist
    if ! gh auth status >/dev/null 2>&1; then
      log_warn "GitHub CLI nicht authentifiziert. Führe 'gh auth login' aus"
    else
      echo "$KUBECONFIG_B64" | gh secret set KUBE_CONFIG_DATA --repo "${GITHUB_OWNER}/${GITHUB_REPO}"
      log_info "GitHub Secret KUBE_CONFIG_DATA gesetzt"
    fi
  fi
fi

# =============================================================================
# 6) Output und Anleitung
# =============================================================================
echo ""
echo "=========================================="
echo "  Fertig!"
echo "=========================================="
echo ""

# Base64 Output (für Copy-Paste)
echo "--- BEGIN BASE64 KUBECONFIG ---"
echo "$KUBECONFIG_B64"
echo "--- END BASE64 KUBECONFIG ---"
echo ""

# Anleitung
cat <<INSTRUCTIONS
NÄCHSTE SCHRITTE:

1. GitHub Secret setzen (manuell):
   gh secret set KUBE_CONFIG_DATA --repo <owner>/<repo> --body '<base64-oben>'

2. Oder in GitHub UI:
   Repository → Settings → Secrets → New repository secret
   Name: KUBE_CONFIG_DATA
   Value: <base64-oben>

3. Weitere benötigte Secrets:
   - DOCKER_REGISTRY      (z.B. registry.example.com)
   - DOCKER_USERNAME
   - DOCKER_PASSWORD
   - DOCKER_NAMESPACE     (z.B. myteam)
   - KUBESEAL_CERT        (optional, für SealedSecrets)

4. CI Workflow testen:
   GitHub Actions → Helm Deploy and Test → Run workflow

SICHERHEITSHINWEISE:
- Token ist 10 Jahre (87600h) gültig - rotiere regelmäßig!
- Führe dieses Skript nur von vertrauenswürdigen Hosts aus
- Lösche temporäre kubeconfig-Dateien nach Gebrauch
- Dieses kubeconfig hat nur Zugriff auf Namespace: $NAMESPACE
INSTRUCTIONS

# Optional: Kubeconfig testen
echo ""
read -p "Kubeconfig jetzt testen? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  log_info "Teste Kubeconfig..."
  export KUBECONFIG="$KUBECONFIG_FILE"
  kubectl get pods -n "$NAMESPACE" && log_info "Test erfolgreich!" || log_error "Test fehlgeschlagen"
fi

echo ""
log_info "Fertig. Temporäre Dateien werden gelöscht."
