# DM – Automatisches Changelog-System

> **Zweck**: Vollautomatische Generierung strukturierter Changelogs aus Commit-Historie. Unterstützt Conventional Commits, Kategorisierung und Release-Notes-Integration.

---

## 🔄 GitHub Actions (Vollversion)

```yaml
name: Auto Changelog Generator

on:
  push:
    branches:
      - main
  workflow_dispatch:
    inputs:
      from_tag:
        description: 'Start-Tag (optional)'
        required: false
      to_tag:
        description: 'End-Tag (optional)'
        required: false

jobs:
  changelog:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate Changelog
        id: changelog
        run: |
          # Tags bestimmen
          LATEST_TAG=$(git describe --tags --abbrev=0 HEAD 2>/dev/null || echo "HEAD")
          PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
          
          # Datumsinformationen
          RELEASE_DATE=$(date +'%Y-%m-%d')
          
          # Commits kategorisieren
          echo "## 🚀 Features" > CHANGELOG_TEMP.md
          git log ${PREV_TAG}..${LATEST_TAG} --pretty=format:"- %s (%h)" --grep="^feat" --grep="^feature" -i >> CHANGELOG_TEMP.md 2>/dev/null || true
          
          echo -e "\n## 🐛 Bug Fixes" >> CHANGELOG_TEMP.md
          git log ${PREV_TAG}..${LATEST_TAG} --pretty=format:"- %s (%h)" --grep="^fix" --grep="^bugfix" -i >> CHANGELOG_TEMP.md 2>/dev/null || true
          
          echo -e "\n## 🔒 Security" >> CHANGELOG_TEMP.md
          git log ${PREV_TAG}..${LATEST_TAG} --pretty=format:"- %s (%h)" --grep="^security" --grep="^sec" -i >> CHANGELOG_TEMP.md 2>/dev/null || true
          
          echo -e "\n## 📚 Documentation" >> CHANGELOG_TEMP.md
          git log ${PREV_TAG}..${LATEST_TAG} --pretty=format:"- %s (%h)" --grep="^docs" --grep="^documentation" -i >> CHANGELOG_TEMP.md 2>/dev/null || true
          
          echo -e "\n## 🔧 Maintenance" >> CHANGELOG_TEMP.md
          git log ${PREV_TAG}..${LATEST_TAG} --pretty=format:"- %s (%h)" --grep="^chore" --grep="^refactor" --grep="^perf" -i >> CHANGELOG_TEMP.md 2>/dev/null || true
          
          # Leere Sektionen entfernen
          sed -i '/^## /{N;/\n$/d}' CHANGELOG_TEMP.md
          
          cat CHANGELOG_TEMP.md

      - name: Update CHANGELOG.md
        run: |
          if [ -f CHANGELOG.md ]; then
            # Neuen Eintrag vorbereiten
            HEADER="## [$(date +'%Y-%m-%d')] - $(git describe --tags --abbrev=0 HEAD 2>/dev/null || echo 'Unreleased')"
            echo -e "$HEADER\n$(cat CHANGELOG_TEMP.md)\n" > TEMP.md
            cat CHANGELOG.md >> TEMP.md
            mv TEMP.md CHANGELOG.md
          else
            echo "# Changelog" > CHANGELOG.md
            echo "" >> CHANGELOG.md
            echo "All notable changes to this project will be documented in this file." >> CHANGELOG.md
            echo "" >> CHANGELOG.md
            cat CHANGELOG_TEMP.md >> CHANGELOG.md
          fi
          
          rm -f CHANGELOG_TEMP.md

      - name: Commit Changelog
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add CHANGELOG.md
          git diff --quiet && git diff --staged --quiet || git commit -m "docs: update CHANGELOG.md [skip ci]"
          git push

      - name: Create Release Notes
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          TAG=$(git describe --tags --abbrev=0 HEAD 2>/dev/null || echo "")
          if [ -n "$TAG" ]; then
            gh release view $TAG --json body -q '.body' > RELEASE_NOTES_TEMP.md 2>/dev/null || true
            
            cat <<EOF > FULL_NOTES.md
          ## 📋 Änderungen in $TAG

          $(cat CHANGELOG.md | sed -n '/## \['"$(date +'%Y-%m-%d')"'\]/,/^## \[/p' | head -n -1)

          ---

          **Vollständiges Changelog**: [\`CHANGELOG.md\`](./CHANGELOG.md)
          EOF
            
            gh release edit $TAG --notes-file FULL_NOTES.md || true
          fi
```

---

## 🦊 GitLab CI Version

```yaml
stages:
  - changelog

generate_changelog:
  stage: changelog
  image: alpine:3.19
  before_script:
    - apk add --no-cache git bash
  script:
    - |
      LATEST_TAG=$(git describe --tags --abbrev=0 HEAD 2>/dev/null || echo "HEAD")
      PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
      RELEASE_DATE=$(date +'%Y-%m-%d')
      
      # CHANGELOG.md generieren
      echo "# Changelog" > CHANGELOG.md
      echo "" >> CHANGELOG.md
      echo "## [$RELEASE_DATE]" >> CHANGELOG.md
      
      # Features
      echo "### 🚀 Features" >> CHANGELOG.md
      git log ${PREV_TAG}..${LATEST_TAG} --pretty=format:"- %s (%h)" --grep="^feat" -i >> CHANGELOG.md 2>/dev/null || true
      echo "" >> CHANGELOG.md
      
      # Bug Fixes
      echo "### 🐛 Bug Fixes" >> CHANGELOG.md
      git log ${PREV_TAG}..${LATEST_TAG} --pretty=format:"- %s (%h)" --grep="^fix" -i >> CHANGELOG.md 2>/dev/null || true
      echo "" >> CHANGELOG.md
      
      # Security
      echo "### 🔒 Security" >> CHANGELOG.md
      git log ${PREV_TAG}..${LATEST_TAG} --pretty=format:"- %s (%h)" --grep="^security" -i >> CHANGELOG.md 2>/dev/null || true
      echo "" >> CHANGELOG.md
      
      # Docs
      echo "### 📚 Documentation" >> CHANGELOG.md
      git log ${PREV_TAG}..${LATEST_TAG} --pretty=format:"- %s (%h)" --grep="^docs" -i >> CHANGELOG.md 2>/dev/null || true
      echo "" >> CHANGELOG.md
      
  artifacts:
    paths:
      - CHANGELOG.md
    expire_in: 30 days
  only:
    - main
```

---

## 📋 Conventional Commits Referenz

| Prefix | Kategorie | Emoji |
|--------|-----------|-------|
| `feat:` | Features | 🚀 |
| `fix:` | Bug Fixes | 🐛 |
| `security:` | Security | 🔒 |
| `docs:` | Documentation | 📚 |
| `chore:` | Maintenance | 🔧 |
| `refactor:` | Refactoring | ♻️ |
| `perf:` | Performance | ⚡ |
| `test:` | Tests | ✅ |
| `ci:` | CI/CD | 🔄 |
| `deps:` | Dependencies | 📦 |

---

## 📄 Beispiel-Output

```markdown
# Changelog

## [2025-01-15] - v2025.01.15-a1b2c3d

### 🚀 Features
- feat: add keyless signing support for artifacts (b2c3d4e)
- feat: implement automated rollback mechanism (c3d4e5f)

### 🐛 Bug Fixes
- fix: resolve memory leak in admission controller (d4e5f6g)
- fix: correct SBOM generation for multi-arch images (e5f6g7h)

### 🔒 Security
- security: update Trivy to v0.48.0 (f6g7h8i)
- security: patch CVE-2025-1234 in base image (g7h8i9j)

### 📚 Documentation
- docs: update key rotation runbook (h8i9j0k)
- docs: add governance policy examples (i9j0k1l)

### 🔧 Maintenance
- chore: bump Go to 1.21 (j0k1l2m)
- refactor: optimize pipeline caching (k1l2m3n)
```

---

## ⚙️ Konfiguration (changelog-config.json)

```json
{
  "categories": [
    { "title": "🚀 Features", "labels": ["feat", "feature"] },
    { "title": "🐛 Bug Fixes", "labels": ["fix", "bugfix"] },
    { "title": "🔒 Security", "labels": ["security", "sec"] },
    { "title": "📚 Documentation", "labels": ["docs", "documentation"] },
    { "title": "🔧 Maintenance", "labels": ["chore", "refactor", "perf"] }
  ],
  "ignore_labels": ["skip-changelog", "release"],
  "sort": "DESC",
  "template": "compact"
}
```

---

## 📎 Guided Links

| Thema | Block / Datei |
|-------|---------------|
| Auto Release Tagging | → `developer-portal-DL.md` |
| Release PR Description | → `RELEASE_PR_DESCRIPTION.md` |
| Release Dashboard | → `RELEASE_DASHBOARD.md` |
| CI Pipeline | → `developer-portal-CC.md` |

---

*Block DM – Automatisches Changelog-System – v1.0*
