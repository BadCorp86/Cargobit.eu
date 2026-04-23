#!/usr/bin/env bash
set -euo pipefail

# deploy-and-verify-task4.sh
# Usage:
#   ./scripts/deploy-and-verify-task4.sh \
#     --repo-owner my-org --repo-name my-repo --pr-branch feat/reconciliation-task4 \
#     --kubeconfig ~/.kube/config --namespace staging --release payments \
#     [--run-newman]

# Defaults (override via args)
REPO_OWNER="my-org"
REPO_NAME="my-repo"
PR_BRANCH="feat/reconciliation-task4"
KUBECONFIG_PATH="${HOME}/.kube/config"
NAMESPACE="staging"
RELEASE="payments"
VALUES_FILE="helm/payments/values.yaml"
CHART_PATH="helm/payments"
RUN_NEWMAN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --repo-owner) REPO_OWNER="$2"; shift 2;;
    --repo-name) REPO_NAME="$2"; shift 2;;
    --pr-branch) PR_BRANCH="$2"; shift 2;;
    --kubeconfig) KUBECONFIG_PATH="$2"; shift 2;;
    --namespace) NAMESPACE="$2"; shift 2;;
    --release) RELEASE="$2"; shift 2;;
    --values-file) VALUES_FILE="$2"; shift 2;;
    --chart-path) CHART_PATH="$2"; shift 2;;
    --run-newman) RUN_NEWMAN=true; shift;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

export KUBECONFIG="$KUBECONFIG_PATH"

echo "1) Verify PR exists and is open..."
if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install gh and authenticate before running this script." >&2
  exit 1
fi

PR_INFO=$(gh pr view "$PR_BRANCH" --repo "${REPO_OWNER}/${REPO_NAME}" --json number,title,state,url 2>/dev/null || true)
if [ -z "$PR_INFO" ]; then
  echo "PR $PR_BRANCH not found in ${REPO_OWNER}/${REPO_NAME}. Aborting." >&2
  exit 1
fi
echo "PR info: $PR_INFO"

echo "2) Merge PR (fast-forward merge) if open..."
gh pr merge "$PR_BRANCH" --repo "${REPO_OWNER}/${REPO_NAME}" --merge || {
  echo "gh pr merge failed. Resolve conflicts manually." >&2
  exit 1
}

echo "3) Helm lint and deploy"
helm lint "$CHART_PATH" || echo "helm lint warnings"
helm upgrade --install "$RELEASE" "$CHART_PATH" \
  --namespace "$NAMESPACE" --create-namespace \
  --values "$VALUES_FILE" \
  --wait --timeout 5m

echo "4) Verify CronJob exists"
if ! kubectl -n "$NAMESPACE" get cronjob "${RELEASE}-reconciliation" >/dev/null 2>&1; then
  echo "CronJob ${RELEASE}-reconciliation not found in $NAMESPACE" >&2
  exit 1
fi
echo "CronJob present."

echo "5) Trigger manual job and stream logs"
TS=$(date +%s)
JOB_NAME="temp-recon-${TS}"
kubectl -n "$NAMESPACE" create job --from=cronjob/"${RELEASE}-reconciliation" "${JOB_NAME}"
echo "Waiting for pod..."
sleep 2
POD=$(kubectl -n "$NAMESPACE" get pods -l job-name="${JOB_NAME}" -o jsonpath='{.items[0].metadata.name}')
echo "Pod: $POD"
kubectl -n "$NAMESPACE" logs "$POD" --tail=500 || true

if [ "$RUN_NEWMAN" = true ]; then
  if ! command -v newman >/dev/null 2>&1; then
    echo "Newman not installed; skipping E2E." >&2
  else
    echo "Running Newman E2E (postman_reconciliation.json)..."
    newman run postman_reconciliation.json -e postman_env_staging.json --reporters cli,junit --reporter-junit-export reports/newman-reconciliation.xml || {
      echo "Newman tests failed; check reports/newman-reconciliation.xml" >&2
      exit 1
    }
    echo "Newman E2E passed."
  fi
fi

echo "Deploy and basic verification finished."
