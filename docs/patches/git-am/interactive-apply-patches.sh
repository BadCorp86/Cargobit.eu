#!/usr/bin/env bash
# interactive-apply-patches.sh
# Interaktives Script zum Anwenden der Patches mit Bestätigungen und Checks
#
# Verwendung:
#   ./interactive-apply-patches.sh [OPTIONS]
#
# Optionen:
#   --dry-run     Zeigt was passieren würde, ohne Änderungen
#   --no-push     Patch anwenden aber nicht pushen
#   --help        Zeigt diese Hilfe

set -euo pipefail

# ============================================
# Konfiguration
# ============================================
PATCH_DIR="$(dirname "$0")"
REMOTE="origin"
BASE_BRANCH="main"

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Patch-zu-Branch Mapping
declare -A PATCH_BRANCH_MAP=(
    ["0007-gitlab-ci.patch"]="ci/gitlab/postcheck-ci"
    ["0008-github-keyless-workflow.patch"]="ci/github/postcheck-keyless"
    ["0009-key-rotation-runbook.patch"]="ci/security/key-rotation-runbook"
)

# Commit-Messages
declare -A COMMIT_MSGS=(
    ["0007-gitlab-ci.patch"]="ci(postcheck): add GitLab CI pipeline to test build scan sign and push image"
    ["0008-github-keyless-workflow.patch"]="ci(postcheck): add GitHub Actions keyless workflow to build test scan push and sign image"
    ["0009-key-rotation-runbook.patch"]="chore(security): add key rotation and secret runbook for governance-postcheck"
)

# Flags
DRY_RUN=false
NO_PUSH=false

# ============================================
# Hilfsfunktionen
# ============================================
print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} ${BOLD}Governance PostCheck - Interactive Patch Applier${NC}                ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${CYAN}── $1 ──${NC}"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

ask_yes_no() {
    local prompt="$1"
    local default="${2:-n}"
    local answer
    
    if [ "$default" = "y" ]; then
        prompt="$prompt [Y/n]: "
    else
        prompt="$prompt [y/N]: "
    fi
    
    echo -ne "${YELLOW}$prompt${NC}"
    read -r answer
    
    if [ -z "$answer" ]; then
        answer="$default"
    fi
    
    case "$answer" in
        [Yy][Ee][Ss]|[Yy]) return 0 ;;
        *) return 1 ;;
    esac
}

show_help() {
    echo "Verwendung: $0 [OPTIONS]"
    echo ""
    echo "Optionen:"
    echo "  --dry-run     Zeigt was passieren würde, ohne Änderungen"
    echo "  --no-push     Patch anwenden aber nicht pushen"
    echo "  --help        Zeigt diese Hilfe"
    echo ""
    echo "Beispiele:"
    echo "  $0                    # Normaler Lauf mit Push"
    echo "  $0 --dry-run          # Nur anzeigen, nicht ausführen"
    echo "  $0 --no-push          # Anwenden ohne Push"
    exit 0
}

# ============================================
# Pre-flight Checks
# ============================================
check_git_repo() {
    print_section "Git Repository Check"
    
    if [ ! -d ".git" ]; then
        error "Nicht in einem Git Repository!"
        echo "Bitte wechsle in das Root-Verzeichnis deines Repos."
        exit 1
    fi
    success "In Git Repository: $(pwd)"
}

check_working_tree() {
    print_section "Working Tree Check"
    
    if [ -n "$(git status --porcelain)" ]; then
        error "Working Tree nicht sauber!"
        echo ""
        echo "Folgende Dateien haben uncommitted changes:"
        git status --short
        echo ""
        if ask_yes_no "Änderungen stashen und weitermachen?" "n"; then
            git stash push -m "auto-stash before patch apply"
            success "Änderungen gestashed"
        else
            error "Bitte committe oder stash deine Änderungen zuerst."
            exit 1
        fi
    else
        success "Working Tree ist sauber"
    fi
}

check_remote() {
    print_section "Remote Check"
    
    if ! git remote | grep -q "^${REMOTE}$"; then
        error "Remote '$REMOTE' nicht gefunden!"
        echo "Verfügbare Remotes:"
        git remote -v
        exit 1
    fi
    success "Remote '$REMOTE' gefunden"
}

check_base_branch() {
    print_section "Base Branch Check"
    
    if ! git show-ref --verify --quiet "refs/heads/${BASE_BRANCH}"; then
        warning "Lokaler Branch '$BASE_BRANCH' nicht gefunden"
        if ask_yes_no "Branch von Remote checkout?" "y"; then
            git fetch "$REMOTE" "$BASE_BRANCH"
            git checkout -b "$BASE_BRANCH" "$REMOTE/$BASE_BRANCH"
            success "Branch '$BASE_BRANCH' erstellt"
        else
            exit 1
        fi
    else
        success "Base Branch '$BASE_BRANCH' vorhanden"
    fi
}

check_patch_files() {
    print_section "Patch-Dateien Check"
    
    local missing=0
    for patch in "${!PATCH_BRANCH_MAP[@]}"; do
        patch_path="$PATCH_DIR/$patch"
        if [ -f "$patch_path" ]; then
            success "Gefunden: $patch"
        else
            error "Fehlt: $patch"
            ((missing++))
        fi
    done
    
    if [ $missing -gt 0 ]; then
        echo ""
        error "$missing Patch-Datei(en) fehlen!"
        exit 1
    fi
}

check_ci_secrets() {
    print_section "CI Secrets Info"
    
    echo -e "${YELLOW}Bitte stelle sicher, dass folgende Secrets konfiguriert sind:${NC}"
    echo ""
    echo -e "${BOLD}GitHub Actions:${NC}"
    echo "  - GITHUB_TOKEN (automatisch)"
    echo "  - REGISTRY_USERNAME / REGISTRY_PASSWORD (optional)"
    echo "  - COSIGN_KEY + COSIGN_PASSWORD (nur bei keyed signing)"
    echo ""
    echo -e "${BOLD}GitLab CI:${NC}"
    echo "  - CI_REGISTRY_USER / CI_REGISTRY_PASSWORD"
    echo "  - COSIGN_KEY_BASE64 (nur bei keyed signing)"
    echo ""
    
    if ask_yes_no "Secrets sind konfiguriert, weitermachen?" "y"; then
        return 0
    else
        echo "Bitte konfiguriere die Secrets und starte das Script erneut."
        exit 0
    fi
}

# ============================================
# Hauptfunktionen
# ============================================
show_plan() {
    print_section "Ausführungsplan"
    
    echo -e "${BOLD}Folgende Aktionen werden durchgeführt:${NC}"
    echo ""
    
    local step=1
    for patch in "${!PATCH_BRANCH_MAP[@]}"; do
        branch="${PATCH_BRANCH_MAP[$patch]}"
        echo -e "${CYAN}$step.${NC} Patch: ${GREEN}$patch${NC}"
        echo "   → Branch: $branch"
        echo "   → Commit: ${COMMIT_MSGS[$patch]}"
        echo ""
        ((step++))
    done
    
    echo -e "${BOLD}Optionen:${NC}"
    echo "  Dry Run: $([ "$DRY_RUN" = true ] && echo "${YELLOW}JA${NC}" || echo "${GREEN}NEIN${NC}")"
    echo "  Push: $([ "$NO_PUSH" = true ] && echo "${YELLOW}NEIN${NC}" || echo "${GREEN}JA${NC}")"
    echo ""
}

apply_patch() {
    local patch="$1"
    local branch="$2"
    local commit_msg="$3"
    
    print_section "Patch: $patch"
    
    echo -e "${BOLD}Branch:${NC} $branch"
    echo -e "${BOLD}Patch:${NC} $PATCH_DIR/$patch"
    echo ""
    
    if [ "$DRY_RUN" = true ]; then
        warning "DRY RUN - Keine Änderungen"
        echo "Würde ausführen:"
        echo "  git checkout $BASE_BRANCH"
        echo "  git pull --ff-only $REMOTE $BASE_BRANCH"
        echo "  git checkout -b $branch"
        echo "  git am $PATCH_DIR/$patch"
        if [ "$NO_PUSH" = false ]; then
            echo "  git push -u $REMOTE $branch"
        fi
        return 0
    fi
    
    # Prüfe ob Branch bereits existiert
    if git show-ref --verify --quiet "refs/heads/${branch}"; then
        warning "Branch '$branch' existiert bereits"
        if ask_yes_no "Branch löschen und neu erstellen?" "n"; then
            git branch -D "$branch"
            success "Branch gelöscht"
        else
            warning "Überspringe $patch"
            return 0
        fi
    fi
    
    # Checkout Base Branch
    echo -e "\n${CYAN}Wechsle zu $BASE_BRANCH...${NC}"
    git checkout "$BASE_BRANCH"
    
    # Pull latest
    echo -e "${CYAN}Hole neueste Änderungen...${NC}"
    git pull --ff-only "$REMOTE" "$BASE_BRANCH" || {
        error "Pull fehlgeschlagen"
        return 1
    }
    
    # Branch erstellen
    echo -e "${CYAN}Erstelle Branch $branch...${NC}"
    git checkout -b "$branch"
    
    # Patch anwenden
    echo -e "${CYAN}Wende Patch an...${NC}"
    if git am --signoff "$PATCH_DIR/$patch"; then
        success "Patch erfolgreich angewendet"
    else
        error "git am fehlgeschlagen"
        echo ""
        warning "Versuche git apply als Fallback..."
        git am --abort 2>/dev/null || true
        
        if git apply "$PATCH_DIR/$patch"; then
            git add -A
            git commit -m "$commit_msg" --signoff
            success "Patch mit git apply angewendet"
        else
            error "Patch konnte nicht angewendet werden"
            git checkout "$BASE_BRANCH"
            git branch -D "$branch" 2>/dev/null || true
            return 1
        fi
    fi
    
    # Push
    if [ "$NO_PUSH" = false ]; then
        echo -e "\n${CYAN}Pushe Branch...${NC}"
        if git push -u "$REMOTE" "$branch"; then
            success "Branch gepushed: $branch"
        else
            error "Push fehlgeschlagen"
            return 1
        fi
    else
        warning "Push übersprungen (--no-push)"
    fi
    
    # Zurück zu Base Branch
    git checkout "$BASE_BRANCH"
    
    return 0
}

show_summary() {
    print_section "Zusammenfassung"
    
    echo -e "${BOLD}Erstellte Branches:${NC}"
    for patch in "${!PATCH_BRANCH_MAP[@]}"; do
        branch="${PATCH_BRANCH_MAP[$patch]}"
        if git show-ref --verify --quiet "refs/heads/${branch}"; then
            if git show-ref --verify --quiet "refs/remotes/${REMOTE}/${branch}"; then
                echo -e "  ${GREEN}✓${NC} $branch (gepushed)"
            else
                echo -e "  ${YELLOW}○${NC} $branch (lokal)"
            fi
        fi
    done
    
    echo ""
    echo -e "${BOLD}Nächste Schritte:${NC}"
    echo "  1. Erstelle Merge Request / Pull Request für jeden Branch"
    echo "  2. Weise Reviewer zu (siehe Template)"
    echo "  3. Teste Pipeline in Sandbox"
    echo "  4. Merge nach erfolgreichem Test"
    echo ""
    echo -e "${BOLD}CI Secrets Dokumentation:${NC}"
    echo "  Siehe SECURITY/KEY_ROTATION.md (nach Merge von 0009)"
}

# ============================================
# Main
# ============================================
main() {
    # Argumente parsen
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run) DRY_RUN=true; shift ;;
            --no-push) NO_PUSH=true; shift ;;
            --help|-h) show_help ;;
            *) echo "Unbekannte Option: $1"; show_help ;;
        esac
    done
    
    print_header
    
    # Pre-flight Checks
    check_git_repo
    check_working_tree
    check_remote
    check_base_branch
    check_patch_files
    check_ci_secrets
    
    # Plan zeigen
    show_plan
    
    # Bestätigung
    if [ "$DRY_RUN" = false ]; then
        if ! ask_yes_no "Ausführen?" "y"; then
            echo "Abgebrochen."
            exit 0
        fi
    fi
    
    # Patches anwenden
    local success_count=0
    local fail_count=0
    
    for patch in "${!PATCH_BRANCH_MAP[@]}"; do
        branch="${PATCH_BRANCH_MAP[$patch]}"
        commit_msg="${COMMIT_MSGS[$patch]}"
        
        if apply_patch "$patch" "$branch" "$commit_msg"; then
            ((success_count++))
        else
            ((fail_count++))
        fi
    done
    
    # Zusammenfassung
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}Erfolgreich:${NC} ${GREEN}$success_count${NC}"
    echo -e "${BOLD}Fehlgeschlagen:${NC} ${RED}$fail_count${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    
    show_summary
    
    echo -e "${GREEN}Fertig!${NC}"
}

# Script ausführen
main "$@"
