#!/bin/bash
# apply-git-am-patches.sh
# Wendet alle git format-patch kompatiblen Patches mit git am an

set -e

PATCH_DIR="$(dirname "$0")"
PATCHES=(
    "0007-gitlab-ci.patch"
    "0008-github-keyless-workflow.patch"
    "0009-key-rotation-runbook.patch"
)

echo "=== Git AM Patch Application Script ==="
echo "Patch Directory: $PATCH_DIR"
echo ""

# Prüfe ob wir in einem Git Repo sind
if [ ! -d ".git" ]; then
    echo "Error: Not in a git repository. Please run from repo root."
    exit 1
fi

# Wende jeden Patch an
for patch in "${PATCHES[@]}"; do
    patch_path="$PATCH_DIR/$patch"
    
    if [ -f "$patch_path" ]; then
        echo "Applying: $patch"
        git am "$patch_path" || {
            echo "Error applying $patch"
            echo "Run 'git am --abort' to cancel"
            exit 1
        }
        echo "✓ Applied: $patch"
    else
        echo "⚠ Patch not found: $patch_path"
    fi
done

echo ""
echo "=== All patches applied successfully ==="
echo ""
echo "Applied files:"
echo "  - .gitlab-ci.yml"
echo "  - .github/workflows/postcheck-ci-keyless.yml"
echo "  - SECURITY/KEY_ROTATION.md"
echo ""
echo "Next steps:"
echo "  1. Configure CI secrets (see SECURITY/KEY_ROTATION.md)"
echo "  2. Push to remote: git push -u origin HEAD"
echo "  3. Create Merge Request / Pull Request"
