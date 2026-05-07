# Konkrete To-Do Checkliste vor Veröffentlichung

**Purpose**: Strukturierte Checkliste mit Steps, Commands, Owners und Deadlines für Go-Live.

---

## 1. Secrets und OIDC prüfen

**Ziel**: Keyless Signing zuverlässig machen und Registry-Zugriff in Sandbox sicherstellen.

### Schritte

#### GitHub Actions Secrets

```
Settings → Secrets and variables → Actions
```

| Secret | Erforderlich | Beschreibung |
|--------|--------------|--------------|
| `REGISTRY_USERNAME` | Ja | Registry Benutzername |
| `REGISTRY_PASSWORD` | Ja | Registry Passwort/Token |
| `COSIGN_KEY` | Optional | Base64-encoded Private Key |
| `COSIGN_PASSWORD` | Optional | Passwort für verschlüsselten Key |

#### GitLab CI Variables

```
Project → Settings → CI/CD → Variables
```

| Variable | Erforderlich | Beschreibung |
|----------|--------------|--------------|
| `CI_REGISTRY_USER` | Ja | GitLab Registry User |
| `CI_REGISTRY_PASSWORD` | Ja | GitLab Registry Token |
| `COSIGN_KEY_BASE64` | Optional | Base64-encoded Key |

#### OIDC Verification

**GitHub Actions:**
```yaml
# Test job für OIDC Token
- name: Print ID token
  run: |
    echo "ID_TOKEN=$(curl -s --fail \
      -H 'Authorization: Bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN' \
      -H 'Accept: application/json' \
      $ACTIONS_ID_TOKEN_REQUEST_URL)"
```

**GitLab CI:**
```yaml
- script:
  - echo "$CI_JOB_JWT" | head -c 64
```

### Validierung

- [ ] Secrets in Sandbox Repository/Project angelegt
- [ ] OIDC Token Test erfolgreich
- [ ] Sandbox Sign-Job mit `cosign sign --keyless` erfolgreich
- [ ] Rekor-Eintrag erzeugt

**Owner**: PlatformOwner (Secrets), CI Owner (OIDC test)
**Deadline**: 1–2 Tage

---

## 2. Trivy und SBOM

**Ziel**: Reproduzierbare SBOMs und stabile, gepinnte Scanner in CI.

### Trivy pinnen

**GitHub Actions:**
```yaml
uses: aquasecurity/trivy-action@v1.2.0
```

**CLI in Job:**
```bash
TRIVY_VERSION=0.43.0
curl -sSfL https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz | tar xz -C /usr/local/bin
```

### SBOM erzeugen

```bash
syft ghcr.io/ORG/governance-postcheck:${{ github.sha }} -o json > sbom.json
```

### Trivy Scan

```bash
trivy image --format json --output trivy.json --severity CRITICAL,HIGH ghcr.io/ORG/governance-postcheck:${{ github.sha }}
```

### Artefakte hochladen

```yaml
- name: Upload Trivy report
  uses: actions/upload-artifact@v3
  with:
    name: trivy-report
    path: trivy.json

- name: Upload SBOM
  uses: actions/upload-artifact@v3
  with:
    name: sbom
    path: sbom.json
```

### Policy definieren

| Severity | Action | Exception Path |
|----------|--------|----------------|
| CRITICAL | Block | `SECURITY/EXCEPTIONS.md` dokumentieren |
| HIGH | Block | `SECURITY/EXCEPTIONS.md` dokumentieren |
| MEDIUM | Warn | Review |
| LOW | Info | N/A |

### Validierung

- [ ] Trivy Version gepinnt
- [ ] SBOM generiert und als Artefakt gespeichert
- [ ] Trivy Report als Artefakt gespeichert
- [ ] Fail-on CRITICAL/HIGH konfiguriert
- [ ] Ausnahmepfad dokumentiert

**Owner**: SecurityOwner, BuildOwner
**Deadline**: 1–3 Tage

---

## 3. Signatur-Verifikation

**Ziel**: Signaturen automatisiert prüfen und Rekor-Einträge dokumentieren.

### CI Sign Job

```bash
# Keyless sign
cosign sign --keyless ghcr.io/ORG/governance-postcheck:${IMAGE_TAG}

# Smoke-Check verify
cosign verify --keyless ghcr.io/ORG/governance-postcheck:${IMAGE_TAG}
```

### GitHub Actions Workflow

```yaml
sign-and-verify:
  runs-on: ubuntu-latest
  permissions:
    id-token: write
    contents: read
    packages: write
  steps:
    - name: Install cosign
      uses: sigstore/cosign-installer@v3
    
    - name: Sign image keyless
      run: |
        cosign sign --yes ghcr.io/${{ github.repository_owner }}/governance-postcheck:${{ github.sha }}
    
    - name: Verify signature
      run: |
        cosign verify --keyless ghcr.io/${{ github.repository_owner }}/governance-postcheck:${{ github.sha }} | tee sign.log
    
    - name: Upload sign log
      uses: actions/upload-artifact@v3
      with:
        name: sign-log
        path: sign.log
```

### Lokale Prüfung

```bash
cosign verify --keyless ghcr.io/ORG/governance-postcheck@sha256:<DIGEST>
```

### Fallback (Keyed)

```bash
# Falls OIDC ausfällt
echo "$COSIGN_KEY" | base64 -d > cosign.key
cosign sign --key cosign.key ghcr.io/ORG/governance-postcheck:${IMAGE_TAG}
```

### Validierung

- [ ] Sign-Job erfolgreich mit Keyless
- [ ] Verify-Job erfolgreich
- [ ] Rekor-Index/UUID in PR/MR dokumentiert
- [ ] Fallback getestet (optional)

**Owner**: CI Owner, SecurityOwner
**Deadline**: parallel zu Schritt 1

---

## 4. Canary Deploy und Monitoring

**Ziel**: Sicheres, beobachtetes Rollout mit getesteter Rollback-Prozedur.

### Canary Deployment

```yaml
# Kubernetes Ingress Canary
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: governance-postcheck-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
spec:
  rules:
    - host: governance-postcheck.cargobit.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: governance-postcheck-canary
                port:
                  number: 8443
```

### Health Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8443
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 8443
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3
```

### Prometheus SLOs

```yaml
# Service Level Objectives
slos:
  - name: error-rate
    target: 0.001  # 0.1%
    window: 5m
    
  - name: latency-p99
    target: 0.5s   # 500ms
    window: 5m
    
  - name: availability
    target: 0.999  # 99.9%
    window: 30d
```

### Prometheus Alerts

```yaml
groups:
  - name: governance-postcheck
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on governance-postcheck"
      
      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High p99 latency on governance-postcheck"
      
      - alert: ReadinessFailures
        expr: increase(kube_pod_container_status_ready{container="governance-postcheck"}[5m]) == 0
        for: 5m
        labels:
          severity: warning
```

### Rollback Test

```bash
# Rollback simulieren
kubectl rollout undo deployment/governance-postcheck -n governance-postcheck-canary

# Status prüfen
kubectl rollout status deployment/governance-postcheck -n governance-postcheck-canary

# Fehler simulieren (optional)
kubectl set env deployment/governance-postcheck -n canary BAD_CONFIG=true
# Warten bis Pods unhealthy
kubectl rollout undo deployment/governance-postcheck -n canary
```

### Validierung

- [ ] Canary Deployment mit 5-10% Traffic aktiv
- [ ] Health Probes konfiguriert
- [ ] Monitoring Dashboards (Grafana) eingerichtet
- [ ] Alerts konfiguriert
- [ ] Rollback getestet und dokumentiert
- [ ] 24-48h Canary Beobachtung ohne kritische Alerts

**Owner**: Release Manager, SRE
**Timeline**: Canary 24–48 Stunden Beobachtung

---

## 5. Admission Enforcement

**Ziel**: Nur signierte Images in Prod zulassen.

### Deploy Pipeline Gate

```yaml
verify-before-deploy:
  runs-on: ubuntu-latest
  steps:
    - name: Install cosign
      uses: sigstore/cosign-installer@v3
    
    - name: Verify image signature
      run: |
        cosign verify --keyless ghcr.io/ORG/governance-postcheck@sha256:${{ env.DIGEST }}
```

### Kyverno Policy (Cluster Enforcement)

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-cosign-signature
spec:
  validationFailureAction: enforce
  background: false
  rules:
    - name: verify-cosign-signature
      match:
        resources:
          kinds:
            - Pod
      verifyImages:
        - imageReferences:
            - "ghcr.io/cargobit/*"
          attestors:
            - entries:
                - keys:
                    publicKeys: |- 
                      # Keyless verification via Rekor
                      -----BEGIN PUBLIC KEY-----
                      # Leave empty for keyless
                      -----END PUBLIC KEY-----
          required: true
```

### OPA Gatekeeper Policy (Alternative)

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: cosignverification
spec:
  crd:
    spec:
      names:
        kind: CosignVerification
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package cosign

        violate[msg] {
          input.review.kind.kind == "Pod"
          container := input.review.object.spec.containers[_]
          not is_signed(container.image)
          msg := sprintf("Image %v is not signed with cosign", [container.image])
        }

        is_signed(image) {
          # cosign verification logic
          true
        }
```

### Test

```bash
# Test: Unsigned Image deployen (muss fehlschlagen)
kubectl run test-unsigned --image=ghcr.io/cargobit/test-unsigned:latest -n production

# Expected: Error from server: admission webhook denied the request
```

### Validierung

- [ ] Deploy-Pipeline Gate implementiert
- [ ] Cluster Enforcement Policy konfiguriert (optional)
- [ ] Test mit unsigned Image durchgeführt
- [ ] Admission Controller lehnt unsigned Images ab

**Owner**: SRE, SecurityOwner
**Deadline**: vor Prod Promotion

---

## 6. Runbooks und Key Rotation

**Ziel**: Wiederholbare Rotation und Notfall-Prozeduren.

### KEY_ROTATION.md Finalisieren

```markdown
# Key Rotation Runbook

## Rotation Schedule
- Interval: 90 Tage
- Lead Time: 14 Tage
- Owner: SecurityOwner

## Rotation Steps

### T-14: Preparation
- [ ] Schedule rotation date
- [ ] Notify affected teams
- [ ] Verify KMS/HSM access

### T-1: Generate New Key
- [ ] Generate new key pair in KMS
- [ ] Store public key in CI secrets

### T-0: Rotation Day
- [ ] Update CI secrets
- [ ] Re-sign production images
- [ ] Verify all signatures

### T+1: Archive Old Key
- [ ] Archive old key in secure storage
- [ ] Update documentation
- [ ] Schedule next rotation
```

### Rotation Drill

```bash
#!/bin/bash
# rotation-drill.sh

echo "=== Key Rotation Drill ==="
echo "Date: $(date)"

# 1. Generate new key
echo "1. Generating new key..."
cosign generate-key-pair
NEW_KEY_ID=$(sha256sum cosign.key | cut -d' ' -f1 | head -c16)

# 2. Test signature in sandbox
echo "2. Testing signature in sandbox..."
cosign sign --key cosign.key ghcr.io/cargobit/governance-postcheck:sandbox-test
cosign verify --key cosign.pub ghcr.io/cargobit/governance-postcheck:sandbox-test

# 3. Update CI secret (dry-run)
echo "3. CI secret update would happen here"

# 4. Verify
echo "4. Verification..."
echo "New Key ID: $NEW_KEY_ID"
echo "✅ Drill complete"
```

### Notfallrotation

```bash
#!/bin/bash
# emergency-rotation.sh

echo "🚨 EMERGENCY KEY ROTATION"

# 1. Generate new key immediately
cosign generate-key-pair

# 2. Update all CI secrets immediately
gh secret set COSIGN_KEY < cosign.key
gh secret set COSIGN_PUB < cosign.pub

# 3. Re-sign all production images
for tag in $(cat production-images.txt); do
  cosign sign --key cosign.key ghcr.io/cargobit/governance-postcheck:$tag
done

# 4. Revoke old key in KMS
# (KMS-specific commands)

# 5. Notify security team
curl -X POST $SLACK_WEBHOOK -d '{"text": "🚨 Emergency key rotation completed"}'
```

### Kalender

```
Key Rotation Schedule 2026:
- 2026-04-15 ✅ Completed
- 2026-07-15 ⏳ Scheduled
- 2026-10-15 ⏳ Scheduled
- 2027-01-15 ⏳ Scheduled

Emergency Drill Schedule:
- 2026-06-15 ⏳ Scheduled
- 2026-12-15 ⏳ Scheduled
```

### Validierung

- [ ] `SECURITY/KEY_ROTATION.md` finalisiert
- [ ] Rotation Drill durchgeführt
- [ ] Notfallrotation dokumentiert
- [ ] Kalender-Termine erstellt
- [ ] Next rotation scheduled

**Owner**: SecurityOwner, PlatformOwner
**Intervalle**: Rotation alle 90 Tage; Emergency Drill alle 180 Tage

---

## Quick Verification Commands Summary

```bash
# === Trivy ===
trivy image --format json --output trivy.json --severity CRITICAL,HIGH <image-ref>

# === SBOM ===
syft <image-ref> -o json > sbom.json

# === Signing ===
cosign sign --keyless <image-ref>
cosign verify --keyless <image-ref>

# === Kubernetes ===
kubectl rollout undo deployment/governance-postcheck -n governance-postcheck-canary
kubectl rollout status deployment/governance-postcheck -n canary

# === Key Rotation ===
cosign generate-key-pair
cosign sign --key cosign.key <image-ref>
```

---

## Go / No-Go Kriterien

### Go-Kriterien ✅

| Kriterium | Status |
|-----------|--------|
| Unit Tests | ✅ Grün |
| Trivy | ✅ Keine ungeklärten HIGH/CRITICAL |
| cosign verify | ✅ Erfolgreich |
| Canary 24-48h | ✅ Stabil |
| Rollback | ✅ Getestet |

### No-Go-Kriterien ❌

| Kriterium | Action |
|-----------|--------|
| OIDC/Signing instabil | Fix vor Release |
| Kritische CVEs ungeklärt | Triage und Fix |
| Admission Enforcement fehlt | Implementieren |
| Canary Alerts | Investigate und Fix |

---

## Nächster Schritt

1. Führe **Secrets und OIDC Tests** in Sandbox aus
2. Melde Ergebnisse (Erfolg/Fehler + Logs)
3. CI-Job-Snippets werden automatisch generiert:
   - `syft` SBOM generation
   - `trivy` pinned version
   - `cosign` sign/verify
   - Kyverno Policy Vorlage

---

## Block Metadata

| Field | Value |
|-------|-------|
| **Block ID** | CP |
| **Title** | Konkrete To-Do Checkliste vor Veröffentlichung |
| **Category** | Release Management, Go-Live Checklist |
| **Related Blocks** | CL (Release Steps), CI (Release Checklist), CM (Canary Manifest) |
| **Created** | 2026-05-07 |

---

*CargoBit Developer Portal – Multi-Agent System Documentation*
