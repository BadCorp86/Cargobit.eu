#!/usr/bin/env bash
set -euo pipefail

# gh-pr-merge-and-log.sh
# Usage:
#   ./scripts/gh-pr-merge-and-log.sh --repo-owner my-org --repo-name my-repo --pr-branch feat/reconciliation-task4 --approver "Your Name"

REPO_OWNER="my-org"
REPO_NAME="my-repo"
PR_BRANCH="feat/reconciliation-task4"
APPROVER="$(whoami)"
LOG_DIR="reports"
mkdir -p "$LOG_DIR"

while [[ $# -gt 0 ]]; do
  case $1 in
    --repo-owner) REPO_OWNER="$2"; shift 2;;
    --repo-name) REPO_NAME="$2"; shift 2;;
    --pr-branch) PR_BRANCH="$2"; shift 2;;
    --approver) APPROVER="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install and authenticate first." >&2
  exit 1
fi

echo "Checking PR status..."
gh pr view "$PR_BRANCH" --repo "${REPO_OWNER}/${REPO_NAME}" --json number,title,state,url > "$LOG_DIR/pr_info.json"
jq . "$LOG_DIR/pr_info.json"

echo "Merging PR..."
gh pr merge "$PR_BRANCH" --repo "${REPO_OWNER}/${REPO_NAME}" --merge --delete-branch > "$LOG_DIR/merge_output.txt" || {
  echo "Merge failed; see $LOG_DIR/merge_output.txt" >&2
  exit 1
}

# Create merge log entry
PR_NUMBER=$(jq -r '.number' "$LOG_DIR/pr_info.json")
PR_TITLE=$(jq -r '.title' "$LOG_DIR/pr_info.json")
PR_URL=$(jq -r '.url' "$LOG_DIR/pr_info.json")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "$LOG_DIR/merge_log_${PR_NUMBER}.md" <<EOF
# Merge Log - PR #${PR_NUMBER}

- **PR**: ${PR_TITLE}
- **URL**: ${PR_URL}
- **Merged by**: ${APPROVER}
- **Timestamp (UTC)**: ${TIMESTAMP}
- **Notes**:
  - Merge method: --merge
  - Post-merge actions: helm deploy, cronjob verification, newman E2E (see run-all-task4.sh)
EOF

echo "Merge complete. Log written to $LOG_DIR/merge_log_${PR_NUMBER}.md"
