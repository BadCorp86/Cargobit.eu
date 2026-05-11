# Governance PostCheck - Patches

Dieses Verzeichnis enthält alle Patches für das governance-postcheck Projekt.

## Verzeichnisstruktur

```
patches/
├── git-am/                              # Git format-patch (mbox-Style)
│   ├── 0007-gitlab-ci.patch             # GitLab CI Pipeline
│   ├── 0008-github-keyless-workflow.patch # GitHub Actions Keyless
│   ├── 0009-key-rotation-runbook.patch  # Security Runbook
│   ├── apply-patches.sh                 # Einfaches Apply-Script
│   └── create-branches-and-apply-patches.sh  # Full-Featured Script
├── 0005-add-gitlab-mr-template-with-handles.patch
├── 0006-add-github-pr-template-with-handles.patch
├── 0007-add-gitlab-ci.patch
├── 0008-add-github-keyless-workflow.patch
├── 0009-add-key-rotation-runbook.patch
└── 0010-add-github-actions-ci.patch
```

## Verwendung

### Option 1: Alle Branches automatisch erstellen

```bash
# Ins Repo wechseln
cd /path/to/your/repo

# Script ausführen (ohne Push)
/path/to/create-branches-and-apply-patches.sh

# Oder mit Push
/path/to/create-branches-and-apply-patches.sh --push
```

### Option 2: Einzelne Patches mit git am

```bash
# Branch erstellen
git checkout -b ci/gitlab/postcheck-ci

# Patch anwenden
git am patches/git-am/0007-gitlab-ci.patch

# Push
git push -u origin ci/gitlab/postcheck-ci
```

### Option 3: Einzelne Patches mit git apply

```bash
# Branch erstellen
git checkout -b ci/gitlab/postcheck-ci

# Patch anwenden
git apply patches/0007-add-gitlab-ci.patch

# Dateien hinzufügen und committen
git add .gitlab-ci.yml
git commit -m "ci(postcheck): add GitLab CI pipeline"
git push -u origin ci/gitlab/postcheck-ci
```

## Branch-Namen

| Patch | Branch | Beschreibung |
|-------|--------|--------------|
| 0007 | `ci/gitlab/postcheck-ci` | GitLab CI Pipeline |
| 0008 | `ci/github/postcheck-keyless` | GitHub Actions Keyless |
| 0009 | `ci/security/key-rotation-runbook` | Security Runbook |

## Voraussetzungen

1. **Sauberes Arbeitsverzeichnis**: `git status` sollte keine uncommitted changes zeigen
2. **Aktiver main/master Branch**: Patches werden von main angewendet
3. **Remote konfiguriert**: Für Push-Option

## Troubleshooting

### git am schlägt fehl

```bash
# Abbrechen
git am --abort

# Mit git apply versuchen
git apply patches/0007-add-gitlab-ci.patch
git add -A
git commit -m "ci(postcheck): add GitLab CI pipeline"
```

### Branch existiert bereits

```bash
# Branch löschen
git branch -D ci/gitlab/postcheck-ci

# Neu erstellen
git checkout -b ci/gitlab/postcheck-ci
git am patches/git-am/0007-gitlab-ci.patch
```

### Push fehlgeschlagen

```bash
# Remote prüfen
git remote -v

# Force push (vorsichtig!)
git push -f origin ci/gitlab/postcheck-ci
```

## Nach dem Anwenden

1. **Merge Requests erstellen** (GitLab) oder **Pull Requests** (GitHub)
2. **Reviewer zuweisen** (siehe Template)
3. **CI Secrets konfigurieren** (siehe `SECURITY/KEY_ROTATION.md`)
4. **Pipeline testen** in Sandbox-Umgebung
