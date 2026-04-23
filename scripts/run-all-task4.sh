#!/usr/bin/env bash
set -euo pipefail

# run-all-task4.sh
# Usage:
#   ./scripts/run-all-task4.sh --repo-owner my-org --repo-name my-repo --pr-branch feat/reconciliation-task4 \
#     --kubeconfig ~/.kube/config --namespace staging --run-newman

REPO_OWNER="my-org"
REPO_NAME="my-repo"
PR_BRANCH="feat/reconciliation-task4"
KUBECONFIG_PATH="${HOME}/.kube/config"
NAMESPACE="staging"
RUN_NEWMAN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --repo-owner) REPO_OWNER="$2"; shift 2;;
    --repo-name) REPO_NAME="$2"; shift 2;;
    --pr-branch) PR_BRANCH="$2"; shift 2;;
    --kubeconfig) KUBECONFIG_PATH="$2"; shift 2;;
    --namespace) NAMESPACE="$2"; shift 2;;
    --run-newman) RUN_NEWMAN=true; shift;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

export KUBECONFIG="$KUBECONFIG_PATH"

# 1) Merge PR and log
./scripts/gh-pr-merge-and-log.sh --repo-owner "$REPO_OWNER" --repo-name "$REPO_NAME" --pr-branch "$PR_BRANCH" --approver "$(whoami)"

# 2) Deploy and verify
if [ "$RUN_NEWMAN" = true ]; then
  ./scripts/deploy-and-verify-task4.sh --repo-owner "$REPO_OWNER" --repo-name "$REPO_NAME" --pr-branch "$PR_BRANCH" --kubeconfig "$KUBECONFIG_PATH" --namespace "$NAMESPACE" --run-newman
else
  ./scripts/deploy-and-verify-task4.sh --repo-owner "$REPO_OWNER" --repo-name "$REPO_NAME" --pr-branch "$PR_BRANCH" --kubeconfig "$KUBECONFIG_PATH" --namespace "$NAMESPACE"
fi

# 3) Metrics and DB verification (DB_URL optional)
./scripts/verify-metrics-and-db.sh --metrics-url "https://payments.staging.example.com/metrics" --prometheus-url "http://prometheus:9090" --report-dir "reports"
