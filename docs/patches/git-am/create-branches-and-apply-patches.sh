#!/usr/bin/env bash
# create-branches-and-apply-patches.sh
# Erstellt drei separate Branches und wendet die Patches an
#
# Verwendung:
#   ./create-branches-and-apply-patches.sh [--push]
#
# Optionen:
#   --push    Push alle Branches nach dem Anwenden der Patches

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUSH_MODE="${1:-}"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Patch-Konfiguration
declare -A PATCHES=(
    ["ci/gitlab/postcheck-ci"]="0007-gitlab-ci.patch"
    ["ci/github/postcheck-keyless"]="0008-github-keyless-workflow.patch"
    ["ci/security/key-rotation-runbook"]="0009-key-rotation-runbook.patch"
)

# Commit-Messages (Fallback für git apply)
declare -A COMMIT_MSGS=(
    ["ci/gitlab/postcheck-ci"]="ci(postcheck): add GitLab CI pipeline to test build scan sign and push image"
    ["ci/github/postcheck-keyless"]="ci(postcheck): add GitHub Actions keyless workflow to build test scan push and sign image"
    ["ci/security/key-rotation-runbook"]="chore(security): add key rotation and secret runbook for governance-postcheck"
)

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}  Governance PostCheck - Branch Creator${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""

# Prüfe ob wir in einem Git Repo sind
if [ ! -d ".git" ]; then
    echo -e "${RED}Error: Nicht in einem Git Repository.${NC}"
    echo "Bitte führe das Script im Root-Verzeichnis deines Repos aus."
    exit 1
fi

# Prüfe ob Patch-Dateien existieren
echo -e "${YELLOW}Prüfe Patch-Dateien...${NC}"
for branch in "${!PATCHES[@]}"; do
    patch_file="${SCRIPT_DIR}/${PATCHES[$branch]}"
    if [ ! -f "$patch_file" ]; then
        echo -e "${RED}Error: Patch nicht gefunden: $patch_file${NC}"
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} ${PATCHES[$branch]}"
done
echo ""

# Aktuellen Branch speichern
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Aktueller Branch: ${CURRENT_BRANCH}${NC}"
echo ""

# Prüfe auf uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}Error: Uncommitted Changes vorhanden.${NC}"
    echo "Bitte committe oder stash deine Änderungen zuerst."
    git status --short
    exit 1
fi

# Branches erstellen und Patches anwenden
SUCCESS_COUNT=0
FAIL_COUNT=0

for branch in "${!PATCHES[@]}"; do
    patch_file="${SCRIPT_DIR}/${PATCHES[$branch]}"
    commit_msg="${COMMIT_MSGS[$branch]}"
    
    echo -e "${BLUE}-----------------------------------------------${NC}"
    echo -e "${YELLOW}Branch: ${branch}${NC}"
    echo -e "Patch: ${PATCHES[$branch]}"
    echo ""
    
    # Prüfe ob Branch bereits existiert
    if git show-ref --verify --quiet "refs/heads/${branch}"; then
        echo -e "${YELLOW}Branch existiert bereits. Überspringe...${NC}"
        continue
    fi
    
    # Neuen Branch erstellen
    echo -e "Erstelle Branch..."
    git checkout -b "$branch" 2>/dev/null
    
    # Versuche git am
    echo -e "Wende Patch an (git am)..."
    if git am "$patch_file" 2>/dev/null; then
        echo -e "${GREEN}✓ Patch erfolgreich angewendet mit git am${NC}"
        ((SUCCESS_COUNT++))
    else
        # Fallback: git am fehlgeschlagen, abbrechen und mit git apply versuchen
        git am --abort 2>/dev/null || true
        
        echo -e "${YELLOW}git am fehlgeschlagen, versuche git apply...${NC}"
        
        # Zurück zum Ausgangszustand
        git checkout "$CURRENT_BRANCH" 2>/dev/null
        git branch -D "$branch" 2>/dev/null || true
        git checkout -b "$branch" 2>/dev/null
        
        if git apply "$patch_file" 2>/dev/null; then
            # Dateien zum Commit hinzufügen
            git add -A
            
            # Commit erstellen
            git commit -m "$commit_msg" --signoff 2>/dev/null
            
            echo -e "${GREEN}✓ Patch erfolgreich angewendet mit git apply${NC}"
            ((SUCCESS_COUNT++))
        else
            echo -e "${RED}✗ Patch fehlgeschlagen${NC}"
            git checkout "$CURRENT_BRANCH" 2>/dev/null
            git branch -D "$branch" 2>/dev/null || true
            ((FAIL_COUNT++))
        fi
    fi
    
    # Zurück zum Ausgangsbranch
    git checkout "$CURRENT_BRANCH" 2>/dev/null
    echo ""
done

# Zusammenfassung
echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}  Zusammenfassung${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "Erfolgreich: ${GREEN}${SUCCESS_COUNT}${NC}"
echo -e "Fehlgeschlagen: ${RED}${FAIL_COUNT}${NC}"
echo ""

# Erstellte Branches auflisten
echo -e "${YELLOW}Erstellte Branches:${NC}"
for branch in "${!PATCHES[@]}"; do
    if git show-ref --verify --quiet "refs/heads/${branch}"; then
        echo -e "  ${GREEN}✓${NC} ${branch}"
    fi
done
echo ""

# Push-Option
if [ "$PUSH_MODE" == "--push" ]; then
    echo -e "${YELLOW}Pushe alle Branches...${NC}"
    for branch in "${!PATCHES[@]}"; do
        if git show-ref --verify --quiet "refs/heads/${branch}"; then
            echo -e "Pushing ${branch}..."
            git push -u origin "$branch" 2>/dev/null || {
                echo -e "${RED}Push fehlgeschlagen für ${branch}${NC}"
            }
        fi
    done
    echo -e "${GREEN}Push abgeschlossen.${NC}"
else
    echo -e "${YELLOW}Nächste Schritte:${NC}"
    echo "  1. Prüfe die Branches: git branch -a"
    echo "  2. Push mit: $0 --push"
    echo "  3. Oder manuell pushen:"
    for branch in "${!PATCHES[@]}"; do
        echo "     git push -u origin ${branch}"
    done
fi

echo ""
echo -e "${GREEN}Fertig!${NC}"
