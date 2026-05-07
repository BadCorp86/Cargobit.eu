# Nächste konkrete Schritte zum Abschluss und Release

**Purpose**: Sequentieller Plan mit Befehlen, Prüfungen und Verantwortlichkeiten für Sandbox-Validierung, signierte Images und sichere Promotion.

---

## 1. Patches anwenden und Branches prüfen

### Aktion
Falls noch nicht geschehen, wende die Patch-Branches an und pushe sie.

```bash
# Interaktives Script aus Repo-Root
chmod +x ./apply_each_patch_interactive.sh
./apply_each_patch_interactive.sh ./postcheck-patches origin main
```

### Prüfung
Für jede Branch prüfen:

```bash
git fetch origin

# GitLab CI
git show origin/ci/gitlab/postcheck-ci:.gitlab-ci.yml | sed -n '1,120p'

# GitHub Actions
git show origin/ci/github/postcheck-keyless:.github/workflows/postcheck-ci-keyless.yml | sed -n '1,120p'

# Key Rotation Runbook
git show origin/ci/security/key-rotation-runbook:SECURITY/KEY_ROTATION.md | sed -n '1,120p'
```

### Validierung

- [ ] Alle Patch-Branches erstellt und gepusht
- [ ] GitLab CI Datei vorhanden und korrekt
- [ ] GitHub Actions Workflow vorhanden und korrekt
- [ ] Key Rotation Runbook vorhanden

---

## 2. Sandbox Secrets und OIDC konfigurieren

### GitHub Actions Secrets

| Secret | Erforderlich | Beschreibung |
|--------|--------------|--------------|
| `REGISTRY_USERNAME` | Ja | Registry Benutzername |
| `REGISTRY_PASSWORD` | Ja | Registry Passwort/Token |
| `GITHUB_TOKEN` | Automatisch | Für GHCR |
| `COSIGN_KEY` | Optional | Base64-encoded Private Key |
| `COSIGN_PASSWORD` | Optional | Passwort für verschlüsselten Key |

### OIDC Permissions (in Workflow)

```yaml
permissions:
  id-token: write  # Erforderlich für Keyless
  contents: read
  packages: write
```

### GitLab CI Variables

| Variable | Erforderlich | Beschreibung |
|----------|--------------|--------------|
| `CI_REGISTRY_USER` | Ja | GitLab Registry User |
| `CI_REGISTRY_PASSWORD` | Ja | GitLab Registry Token |
| `COSIGN_KEY_BASE64` | Optional | Base64-encoded Key |

### Prüfung

```bash
# GitHub: Workflow permissions in repo prüfen
gh api repos/:owner/:repo/actions/permissions

# GitLab: CI/CD Variables via UI prüfen
# Settings → CI/CD → Variables
```

### Validierung

- [ ] GitHub Secrets gesetzt
- [ ] OIDC Permission `id-token: write` aktiviert
- [ ] GitLab Variables gesetzt
- [ ] Runner unterstützt JWT/OIDC

---

## 3. CI Run beobachten und Logs sammeln

### Aktion
Erstelle PRs/MRs gegen `dev`/`sandbox` und beobachte die Pipelines.

### Pipeline Stages

```
┌─────────────────────────────────────────────────────────────────┐
│                    CI PIPELINE STAGES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │  Unit    │──▶│  Build   │──▶│  Trivy   │──▶│  Sign    │     │
│  │  Tests   │   │  Image   │   │  Scan    │   │  Image   │     │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘     │
│       │              │              │              │            │
│       ▼              ▼              ▼              ▼            │
│   junit.xml     build.log     trivy.json      sign.log         │
│                                                                  │
│                                              ┌──────────┐        │
│                                              │  Push    │        │
│                                              │  Image   │        │
│                                              └──────────┘        │
│                                                   │              │
│                                                   ▼              │
│                                            Sandbox Registry      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Wichtige Prüfungen

| Stage | Prüfung | Erfolgs-Kriterium |
|-------|---------|-------------------|
| Unit Tests | Alle Tests grün | 0 Failures |
| Build | Image erstellt | Size < 200MB |
| Trivy | Keine HIGH/CRITICAL | 0 Blockers |
| Sign | cosign erfolgreich | Rekor-Eintrag vorhanden |
| Push | Image in Registry | Tags korrekt |

### Logs herunterladen

```bash
# GitHub Actions
gh run download <run-id> -D ./artifacts

# GitLab CI
# CI/CD → Pipelines → <Pipeline> → Job Artifacts
```

### Artefakte

| Artefakt | Beschreibung |
|----------|--------------|
| `junit.xml` | Unit Test Results |
| `trivy.json` | Trivy Scan Results |
| `sbom.json` | Software Bill of Materials |
| `sign.log` | Signing Output + Rekor Index |

### Validierung

- [ ] Unit Tests grün
- [ ] Build erfolgreich
- [ ] Trivy: keine HIGH/CRITICAL (oder dokumentierte Ausnahme)
- [ ] Sign: cosign erfolgreich, Rekor-Eintrag sichtbar
- [ ] Push: Image in Sandbox-Registry

---

## 4. Verifikation lokal und in CI

### Signatur prüfen (Keyless)

```bash
# Keyless verify
IMAGE=ghcr.io/ORG/governance-postcheck:COMMIT_SHA
cosign verify --keyless "$IMAGE"
```

### Signatur prüfen (Keyed)

```bash
# Keyed verify (wenn public key vorhanden)
echo "$COSIGN_PUB" > cosign.pub
cosign verify --key cosign.pub registry.example.com/governance-postcheck:COMMIT_SHA
```

### SBOM und Trivy lokal prüfen

```bash
# Build lokal
docker build -f governance-postcheck/Dockerfile.hardened -t local/postcheck:dev .

# SBOM erzeugen
syft local/postcheck:dev -o json > sbom.json

# Trivy Scan
trivy image --format json --output trivy.json --severity CRITICAL,HIGH local/postcheck:dev
```

### Verifikation Matrix

| Check | Command | Erfolgs-Kriterium |
|-------|---------|-------------------|
| Keyless Verify | `cosign verify --keyless <image>` | Exit Code 0 |
| Keyed Verify | `cosign verify --key cosign.pub <image>` | Exit Code 0 |
| SBOM | `syft <image> -o json` | Valid JSON |
| Trivy | `trivy image --severity CRITICAL,HIGH` | 0 Findings |

### Validierung

- [ ] Keyless verify erfolgreich
- [ ] SBOM erzeugt und valide
- [ ] Trivy lokal clean

---

## 5. Canary Rollout, Monitoring und Rollback

### Canary Deploy

Deploye das signierte Image in einen Canary-Namespace mit 5–10% Traffic.

### Canary Manifest (Beispiel)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: governance-postcheck
  namespace: canary
spec:
  replicas: 3
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: {duration: 10m}
        - setWeight: 10
        - pause: {duration: 10m}
        - setWeight: 25
        - pause: {duration: 10m}
        - setWeight: 50
        - pause: {duration: 10m}
  selector:
    matchLabels:
      app: governance-postcheck
  template:
    spec:
      containers:
        - name: app
          image: ghcr.io/ORG/governance-postcheck@sha256:DIGEST
          ports:
            - containerPort: 8443
          livenessProbe:
            httpGet:
              path: /health
              port: 8443
          readinessProbe:
            httpGet:
              path: /ready
              port: 8443
```

### Health Checks und Monitoring

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Error Rate | > 1% | P2 Alert |
| p99 Latency | > 1s | P2 Alert |
| CPU Usage | > 80% | Warning |
| Memory Usage | > 85% | Warning |
| 5xx Responses | > 0.5% | P3 Alert |

### Prometheus Queries

```promql
# Error Rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# p99 Latency
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# CPU Usage
rate(container_cpu_usage_seconds_total{container="app"}[5m])
```

### Rollback Befehle

```bash
# Kubernetes: Rollback Deployment auf vorherige Revision
kubectl rollout undo deployment/governance-postcheck -n canary

# Spezifische Revision
kubectl rollout undo deployment/governance-postcheck -n canary --to-revision=2

# Argo Rollouts: Abort und Promote
kubectl argo rollouts abort governance-postcheck -n canary
kubectl argo rollouts promote governance-postcheck -n canary --full

# Canary Traffic auf 0 setzen
kubectl patch service governance-postcheck -n canary --type=json \
  -p='[{"op": "replace", "path": "/spec/selector/version", "value": "stable"}]'
```

### Validierung

- [ ] Canary Deployment erfolgreich
- [ ] 5-10% Traffic aktiv
- [ ] Monitoring Dashboards grün
- [ ] Keine kritischen Alerts
- [ ] Rollback getestet

---

## 6. Final Promotion, Post-Release Aufgaben und Governance

### Promotion Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROMOTION WORKFLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Canary ──────▶ Staging ──────▶ Production                     │
│    │               │                │                           │
│    │               │                └── Requires:              │
│    │               │                    ├── 2 Approvals        │
│    │               │                    ├── Sign verified      │
│    │               │                    └── Trivy clean        │
│    │               │                                         │
│    │               └── Integration Tests                     │
│    │                                                          │
│    └── 24–48h Monitoring                                     │
│       ├── Error Rate < 0.1%                                  │
│       ├── p99 Latency < 500ms                                │
│       └── No Critical Alerts                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Promotion Checklist

- [ ] 24–48h Canary Monitoring ohne kritische Alerts
- [ ] Signatur verifiziert (`cosign verify`)
- [ ] Trivy Report clean oder akzeptierte Ausnahmen
- [ ] SBOM archiviert
- [ ] Integration Tests auf Staging bestanden
- [ ] 2 Approvals für Production

### Post-Release Aufgaben

| Aufgabe | Owner | Deadline |
|---------|-------|----------|
| Rekor-Einträge prüfen | Security Owner | +1 Tag |
| SBOMs archivieren | Build Owner | +1 Tag |
| Key Rotation planen | Security Owner | +7 Tage |
| Release-Notes schreiben | Release Manager | +1 Tag |
| Trivy-Ausnahmen dokumentieren | Security Owner | +3 Tage |
| Owners in PR/MR dokumentieren | Release Manager | +1 Tag |

### Key Rotation Zeitplan

| Rotation | Zeitpunkt | Typ |
|----------|-----------|-----|
| Erste Rotation | +90 Tage | Geplant |
| Regelmäßig | Alle 90 Tage | Automatisch |
| Notfall | Bei Verdacht | Sofort |

### Empfohlene Owners

| Rolle | Verantwortung |
|-------|---------------|
| **Build Owner** | Dockerfile und CI |
| **Security Owner** | Trivy-Triage, Key-Rotation |
| **Release Manager** | Canary/Promotion und Rollback |
| **SRE** | Monitoring, Alerts, Incident Response |

### RACI Matrix

| Aufgabe | Build Owner | Security Owner | Release Manager | SRE |
|---------|-------------|----------------|-----------------|-----|
| Dockerfile | **R** | C | I | I |
| Trivy Policy | C | **R** | I | I |
| Key Rotation | I | **R** | I | C |
| Canary Deploy | I | I | **R** | **R** |
| Monitoring | I | I | A | **R** |
| Production Deploy | I | A | **R** | **R** |

**R** = Responsible, **A** = Accountable, **C** = Consulted, **I** = Informed

---

## Nächste Artefakte (Optionen)

| Option | Beschreibung |
|--------|--------------|
| **(1)** | Canary-Deployment-Manifest (Kubernetes) mit Image-Digest und Health Probes |
| **(2)** | Incident-Template für Signatur/Trivy-Failures |
| **(3)** | Key-Rotation Kalender-Template mit konkreten Schritten |

---

## Block Metadata

| Field | Value |
|-------|-------|
| **Block ID** | CL |
| **Title** | Nächste konkrete Schritte zum Abschluss und Release |
| **Category** | Release Management, CI/CD, Operations |
| **Related Blocks** | CI (Release Checklist), CG (Incident Response), CK (Patch 0011) |
| **Created** | 2026-05-07 |

---

*CargoBit Developer Portal – Multi-Agent System Documentation*
