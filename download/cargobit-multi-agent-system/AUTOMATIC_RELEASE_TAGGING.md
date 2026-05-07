# Automatisches Release-Tagging-System

CI/CD Pipeline für automatische Versionierung und Release-Tags.

---

## Übersicht

Das Release-Tagging-System automatisiert:
- Semantic Versioning basierend auf Commit-Typen
- Git Tag Erstellung
- GitHub/GitLab Release Erstellung
- Changelog Generierung

---

## GitHub Actions Workflow

**Pfad:** `.github/workflows/release-tagging.yml`

```yaml
name: Automatic Release Tagging

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      release_type:
        description: 'Release Type'
        required: true
        type: choice
        options:
          - patch
          - minor
          - major
        default: 'patch'

jobs:
  tag-release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      
    outputs:
      new_version: ${{ steps.version.outputs.version }}
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Configure Git
        run: |
          git config user.name "release-bot"
          git config user.email "release-bot@users.noreply.github.com"
      
      - name: Get Current Version
        id: current
        run: |
          # Get latest tag or default to v0.0.0
          CURRENT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
          CURRENT_VERSION=${CURRENT_TAG#v}
          echo "version=$CURRENT_VERSION" >> $GITHUB_OUTPUT
          echo "Current version: $CURRENT_VERSION"
      
      - name: Determine Version Bump
        id: bump
        run: |
          CURRENT="${{ steps.current.outputs.version }}"
          
          # Split version
          IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
          
          # Determine bump type from commits or manual input
          if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
            BUMP_TYPE="${{ inputs.release_type }}"
          else
            # Analyze commits since last tag
            COMMITS=$(git log ${{ steps.current.outputs.version }}..HEAD --oneline 2>/dev/null || git log --oneline)
            
            if echo "$COMMITS" | grep -qE "^[a-f0-9]+ (feat|feature)!:"; then
              BUMP_TYPE="major"
            elif echo "$COMMITS" | grep -qE "^[a-f0-9]+ (feat|feature):"; then
              BUMP_TYPE="minor"
            else
              BUMP_TYPE="patch"
            fi
          fi
          
          # Calculate new version
          case $BUMP_TYPE in
            major)
              NEW_VERSION="$((MAJOR + 1)).0.0"
              ;;
            minor)
              NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
              ;;
            patch)
              NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
              ;;
          esac
          
          echo "bump_type=$BUMP_TYPE" >> $GITHUB_OUTPUT
          echo "version=$NEW_VERSION" >> $GITHUB_OUTPUT
          echo "New version: $NEW_VERSION (bump: $BUMP_TYPE)"
      
      - name: Generate Changelog
        id: changelog
        run: |
          CURRENT="${{ steps.current.outputs.version }}"
          NEW="${{ steps.bump.outputs.version }}"
          
          # Generate changelog from commits
          echo "## What's Changed" > CHANGELOG_ENTRY.md
          echo "" >> CHANGELOG_ENTRY.md
          
          # Features
          if git log v$CURRENT..HEAD --oneline 2>/dev/null | grep -qE "(feat|feature):"; then
            echo "### 🚀 New Features" >> CHANGELOG_ENTRY.md
            git log v$CURRENT..HEAD --pretty=format:"- %s" --grep="feat" 2>/dev/null >> CHANGELOG_ENTRY.md || true
            echo "" >> CHANGELOG_ENTRY.md
          fi
          
          # Bug fixes
          if git log v$CURRENT..HEAD --oneline 2>/dev/null | grep -qE "fix:"; then
            echo "### 🐛 Bug Fixes" >> CHANGELOG_ENTRY.md
            git log v$CURRENT..HEAD --pretty=format:"- %s" --grep="fix" 2>/dev/null >> CHANGELOG_ENTRY.md || true
            echo "" >> CHANGELOG_ENTRY.md
          fi
          
          # Security
          if git log v$CURRENT..HEAD --oneline 2>/dev/null | grep -qE "security"; then
            echo "### 🔒 Security" >> CHANGELOG_ENTRY.md
            git log v$CURRENT..HEAD --pretty=format:"- %s" --grep="security" 2>/dev/null >> CHANGELOG_ENTRY.md || true
            echo "" >> CHANGELOG_ENTRY.md
          fi
          
          # Other changes
          echo "### 📝 Other Changes" >> CHANGELOG_ENTRY.md
          git log v$CURRENT..HEAD --pretty=format:"- %s" 2>/dev/null | grep -vE "(feat|feature|fix|security):" >> CHANGELOG_ENTRY.md || true
          echo "" >> CHANGELOG_ENTRY.md
          
          # Store for release
          {
            echo 'changelog<<EOF'
            cat CHANGELOG_ENTRY.md
            echo 'EOF'
          } >> $GITHUB_OUTPUT
      
      - name: Create Git Tag
        run: |
          NEW_VERSION="${{ steps.bump.outputs.version }}"
          git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
          git push origin "v$NEW_VERSION"
          echo "Created tag: v$NEW_VERSION"
      
      - name: Update Version File
        run: |
          NEW_VERSION="${{ steps.bump.outputs.version }}"
          echo "$NEW_VERSION" > VERSION
          git add VERSION
          git commit -m "chore: bump version to $NEW_VERSION" || echo "No version file update needed"
          git push || true
      
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          tag_name: v${{ steps.bump.outputs.version }}
          name: Release v${{ steps.bump.outputs.version }}
          body: ${{ steps.changelog.outputs.changelog }}
          draft: false
          prerelease: false
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Output Version
        id: version
        run: |
          echo "version=${{ steps.bump.outputs.version }}" >> $GITHUB_OUTPUT

  notify:
    needs: tag-release
    runs-on: ubuntu-latest
    steps:
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🏷️ New Release Tag Created",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*New Release: v${{ needs.tag-release.outputs.new_version }}*\n\nCreated automatically from main branch."
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## GitLab CI Version

**Pfad:** `.gitlab-ci.yml`

```yaml
stages:
  - version
  - tag
  - release

determine-version:
  stage: version
  image: alpine:3.19
  script:
    - apk add --no-cache git
    - |
      # Get current version
      CURRENT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
      CURRENT_VERSION=${CURRENT_TAG#v}
      
      # Parse version
      MAJOR=$(echo $CURRENT_VERSION | cut -d. -f1)
      MINOR=$(echo $CURRENT_VERSION | cut -d. -f2)
      PATCH=$(echo $CURRENT_VERSION | cut -d. -f3)
      
      # Determine bump from commits
      COMMITS=$(git log $CURRENT_TAG..HEAD --oneline 2>/dev/null || git log --oneline -10)
      
      if echo "$COMMITS" | grep -qE "BREAKING CHANGE|!:"; then
        NEW_VERSION="$((MAJOR + 1)).0.0"
      elif echo "$COMMITS" | grep -qE "^feat:"; then
        NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
      else
        NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
      fi
      
      echo "NEW_VERSION=$NEW_VERSION" >> version.env
      echo "New version will be: $NEW_VERSION"
  artifacts:
    reports:
      dotenv: version.env

create-tag:
  stage: tag
  image: alpine:3.19
  needs:
    - determine-version
  script:
    - apk add --no-cache git
    - git config user.name "release-bot"
    - git config user.email "release-bot@example.com"
    - git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
    - git push --tags "https://oauth2:${GITLAB_TOKEN}@${CI_REPOSITORY_URL#*@}"
  only:
    - main

create-release:
  stage: release
  image: alpine:3.19
  needs:
    - determine-version
    - create-tag
  script:
    - apk add --no-cache curl
    - |
      # Generate changelog
      CHANGELOG=$(git log $(git describe --tags --abbrev=0 HEAD~)..HEAD --pretty=format:"- %s")
      
      # Create GitLab release
      curl --request POST \
        --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
        --header "Content-Type: application/json" \
        --data "{
          \"name\": \"Release v$NEW_VERSION\",
          \"tag_name\": \"v$NEW_VERSION\",
          \"description\": \"## Changes\n\n$CHANGELOG\"
        }" \
        "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/releases"
  only:
    - main
```

---

## Commit-Konventionen

### Semantic Commit Messages

| Typ | Beschreibung | Version-Bump |
|-----|--------------|--------------|
| `feat:` | Neue Funktion | MINOR |
| `fix:` | Bug-Fix | PATCH |
| `feat!:` oder `BREAKING CHANGE` | Breaking Change | MAJOR |
| `docs:` | Dokumentation | Kein Bump |
| `chore:` | Wartung | PATCH |
| `refactor:` | Refactoring | PATCH |
| `test:` | Tests | Kein Bump |
| `security:` | Security-Fix | PATCH |

### Beispiele

```bash
# Patch Release (0.0.1 → 0.0.2)
git commit -m "fix: resolve authentication timeout issue"
git commit -m "chore: update dependencies"

# Minor Release (0.0.1 → 0.1.0)
git commit -m "feat: add new user dashboard"

# Major Release (0.0.1 → 1.0.0)
git commit -m "feat!: redesign API endpoints"
git commit -m "feat: new API
BREAKING CHANGE: API v1 deprecated"
```

---

## VERSION-Datei

**Pfad:** `VERSION`

```
2.0.0
```

### Automatische Aktualisierung

Die Pipeline aktualisiert automatisch:
1. `VERSION` Datei
2. Git Tag (`v2.0.0`)
3. GitHub/GitLab Release
4. Changelog

---

## Release-Badge für README

```markdown
[![Release](https://img.shields.io/github/v/release/ORG/REPO.svg?style=flat-square)](https://github.com/ORG/REPO/releases/latest)
```

---

## Manuelles Auslösen

```bash
# GitHub CLI
gh workflow run release-tagging.yml -f release_type=minor

# GitLab API
curl --request POST \
  --header "PRIVATE-TOKEN: $TOKEN" \
  --form "ref=main" \
  --form "variables[RELEASE_TYPE]=minor" \
  "https://gitlab.com/api/v4/projects/ID/pipeline"
```

---

*Block DL – Automatisches Release-Tagging-System*
