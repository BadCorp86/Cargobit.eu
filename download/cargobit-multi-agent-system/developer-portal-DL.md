# DL – Automatisches Release-Tagging-System

> **Zweck**: Vollautomatische Versionskennzeichnung bei Merge auf Main-Branch. Unterstützt GitHub Actions und GitLab CI. Versionsschema: `vYYYY.MM.DD-SHA`.

---

## 🔄 GitHub Actions Version

```yaml
name: Auto Release Tagging

on:
  push:
    branches:
      - main

jobs:
  tag-release:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Determine Version
        id: version
        run: |
          DATE=$(date +'%Y.%m.%d')
          SHA=$(git rev-parse --short HEAD)
          echo "VERSION=v${DATE}-${SHA}" >> $GITHUB_ENV

      - name: Create Tag
        run: |
          git tag $VERSION
          git push origin $VERSION

      - name: Create Release Notes
        run: |
          gh release create $VERSION \
            --title "Release $VERSION" \
            --notes "Automatischer Release-Tag basierend auf Commit $SHA"
```

---

## 🦊 GitLab CI Version

```yaml
auto_tag:
  stage: release
  image: alpine:3.19
  script:
    - apk add --no-cache git
    - DATE=$(date +'%Y.%m.%d')
    - SHA=$(git rev-parse --short HEAD)
    - VERSION="v${DATE}-${SHA}"
    - git tag $VERSION
    - git push origin $VERSION
  only:
    - main
```

---

## 📋 Versionsschema-Erklärung

| Komponente | Format | Beispiel |
|------------|--------|----------|
| Präfix | `v` | `v` |
| Datum | `YYYY.MM.DD` | `2025.01.15` |
| Commit-SHA | Kurz-Hash (7 Zeichen) | `a1b2c3d` |
| **Resultat** | `vYYYY.MM.DD-SHA` | `v2025.01.15-a1b2c3d` |

---

## ⚙️ Erweiterte GitHub Actions (mit Changelog)

```yaml
name: Auto Release Tagging with Changelog

on:
  push:
    branches:
      - main

jobs:
  tag-release:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Determine Version
        id: version
        run: |
          DATE=$(date +'%Y.%m.%d')
          SHA=$(git rev-parse --short HEAD)
          echo "VERSION=v${DATE}-${SHA}" >> $GITHUB_ENV
          echo "DATE=$DATE" >> $GITHUB_ENV
          echo "SHA=$SHA" >> $GITHUB_ENV

      - name: Generate Changelog
        id: changelog
        run: |
          PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
          if [ -n "$PREV_TAG" ]; then
            CHANGELOG=$(git log $PREV_TAG..HEAD --pretty=format:"- %s (%h)" --no-merges)
          else
            CHANGELOG=$(git log --pretty=format:"- %s (%h)" --no-merges -20)
          fi
          echo "CHANGELOG<<EOF" >> $GITHUB_ENV
          echo "$CHANGELOG" >> $GITHUB_ENV
          echo "EOF" >> $GITHUB_ENV

      - name: Create Tag
        run: |
          git tag $VERSION
          git push origin $VERSION

      - name: Create Release Notes
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh release create $VERSION \
            --title "Release $VERSION" \
            --notes "## 🚀 Release $VERSION

          **Datum**: $DATE  
          **Commit**: $SHA

          ### 📝 Änderungen
          $CHANGELOG

          ---
          *Automatisch generiert durch CI/CD Pipeline*"

      - name: Trigger SBOM Generation
        run: |
          gh workflow run sbom-generation.yml -f version=$VERSION
```

---

## 🔐 Erforderliche Berechtigungen

### GitHub
```yaml
permissions:
  contents: write
```

### GitLab
- `api` Scope für Push-Zugriff
- `write_repository` für Tag-Erstellung

---

## 📎 Guided Links

| Thema | Block / Datei |
|-------|---------------|
| CI Pipeline | → `developer-portal-CC.md` |
| Release Process | → `developer-portal-CI.md` |
| SBOM Generation | → `developer-portal-CQ.md` |
| Release Dashboard | → `RELEASE_DASHBOARD.md` |
| PR Description Template | → `RELEASE_PR_DESCRIPTION.md` |

---

## ✅ Tag-Validierung (Post-Tagging)

```bash
# Tag-Existenz prüfen
git tag -l "v*"

# Tag-Details anzeigen
git show v2025.01.15-a1b2c3d

# Remote-Tags synchronisieren
git fetch --tags
```

---

*Block DL – Auto Release Tagging – v1.0*
