#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# PR Status Check Script
# =============================================================================
# Usage: ./scripts/check-pr-status.sh [branch-name] [--web]
#
# Requires: gh CLI authenticated
# =============================================================================

BRANCH="${1:-feat/reconciliation-task4}"
OPEN_WEB=false

# Check for --web flag
if [ "$2" = "--web" ] || [ "$1" = "--web" ]; then
    OPEN_WEB=true
    if [ "$1" = "--web" ]; then
        BRANCH="${2:-feat/reconciliation-task4}"
    fi
fi

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=============================================="
echo "  PR Status Check"
echo "=============================================="
echo "Branch: $BRANCH"
echo "=============================================="

# Check gh CLI
if ! command -v gh >/dev/null 2>&1; then
    echo -e "${RED}[ERROR]${NC} gh CLI not found"
    echo "Install: brew install gh or https://cli.github.com/"
    exit 1
fi

# Check gh auth
if ! gh auth status &>/dev/null; then
    echo -e "${RED}[ERROR]${NC} gh CLI not authenticated"
    echo "Run: gh auth login"
    exit 1
fi

# Get repo info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")

if [ -z "$REPO" ]; then
    echo -e "${RED}[ERROR]${NC} Not in a GitHub repository"
    exit 1
fi

echo "Repo:   $REPO"
echo ""

# Open in browser if --web flag
if [ "$OPEN_WEB" = true ]; then
    echo "Opening PR in browser..."
    gh pr view "$BRANCH" --web 2>/dev/null || {
        echo -e "${YELLOW}[WARN]${NC} No PR found for branch: $BRANCH"
        echo "Create one with: gh pr create"
    }
    exit 0
fi

# Get PR info
PR_INFO=$(gh pr view "$BRANCH" --json number,title,state,headRefName,baseRefName,url,author,createdAt,updatedAt 2>/dev/null || echo "")

if [ -z "$PR_INFO" ]; then
    echo -e "${YELLOW}[WARN]${NC} No PR found for branch: $BRANCH"
    echo ""
    echo "Create one with:"
    echo "  gh pr create --base main --head $BRANCH --title \"Your title\" --body \"Your description\""
    exit 0
fi

# Parse and display PR info
NUMBER=$(echo "$PR_INFO" | jq -r '.number')
TITLE=$(echo "$PR_INFO" | jq -r '.title')
STATE=$(echo "$PR_INFO" | jq -r '.state')
HEAD=$(echo "$PR_INFO" | jq -r '.headRefName')
BASE=$(echo "$PR_INFO" | jq -r '.baseRefName')
URL=$(echo "$PR_INFO" | jq -r '.url')
AUTHOR=$(echo "$PR_INFO" | jq -r '.author.login')
CREATED=$(echo "$PR_INFO" | jq -r '.createdAt')
UPDATED=$(echo "$PR_INFO" | jq -r '.updatedAt')

# State color
case "$STATE" in
    OPEN) STATE_COLOR="$GREEN" ;;
    MERGED) STATE_COLOR="$BLUE" ;;
    CLOSED) STATE_COLOR="$RED" ;;
    *) STATE_COLOR="$YELLOW" ;;
esac

echo "PR Details:"
echo "  Number:    #$NUMBER"
echo "  Title:     $TITLE"
echo -e "  State:     ${STATE_COLOR}$STATE${NC}"
echo "  Author:    @$AUTHOR"
echo "  Branch:    $HEAD → $BASE"
echo "  Created:   $CREATED"
echo "  Updated:   $UPDATED"
echo "  URL:       $URL"
echo ""

# Get checks status if available
CHECKS=$(gh pr checks "$BRANCH" 2>/dev/null || echo "")

if [ -n "$CHECKS" ] && [ "$CHECKS" != "no checks found" ]; then
    echo "Checks:"
    echo "$CHECKS"
fi

echo ""
echo "Commands:"
echo "  View in browser:  gh pr view $BRANCH --web"
echo "  Merge:            gh pr merge $BRANCH"
echo "  Close:            gh pr close $BRANCH"
echo ""
echo "JSON output:"
gh pr view "$BRANCH" --json number,title,state,headRefName,baseRefName,url
