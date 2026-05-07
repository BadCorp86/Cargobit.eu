# DR – Change-Impact-Dokument

> **Zweck**: Detaillierte Analyse der Änderungen durch den Governance Postcheck für alle betroffenen Teams und Systeme. Identifiziert Risiken, Abhängigkeiten und Migrationspfade.

---

## 📊 Change-Impact-Übersicht

| Dimension | Impact | Risiko |
|-----------|--------|--------|
| CI/CD Pipeline | Hoch | Niedrig |
| Development Workflow | Mittel | Niedrig |
| Security Operations | Hoch | Mittel |
| Compliance/Audit | Hoch | Niedrig |
| Infrastructure | Mittel | Mittel |

---

## 1. Executive Summary

### Was ändert sich?

Der Governance Postcheck führt **verpflichtende Sicherheits- und Governance-Prüfungen** für alle Deployments ein. Die wichtigsten Änderungen:

| Bereich | Vorher | Nachher |
|---------|--------|---------|
| Image Signing | Optional | Verpflichtend (Keyless) |
| Vulnerability Scan | Manuell | Automatisch bei jedem Build |
| SBOM | Nicht vorhanden | Verpflichtend für alle Artefakte |
| Deployment | Direkt | Nach Admission Check |
| Rollback | Manuell | Automatisiert |

### Wann gilt das?

- **Ab**: Release-Datum (siehe Timeline)
- **Für**: Alle neuen Deployments
- **Bestehende**: 30 Tage Übergangsfrist

---

## 2. Betroffene Teams

### 2.1 Development Teams

| Änderung | Impact | Action Required |
|----------|--------|-----------------|
| Dockerfile Updates | Mittel | Dockerfile Hardening anwenden |
| Pipeline YAML | Mittel | Neue CI Jobs integrieren |
| Local Testing | Niedrig | Trivy lokal testen |
| PR Workflow | Niedrig | Keine Änderung |

**Migration**:
```bash
# 1. Dockerfile überprüfen
./scripts/validate-dockerfile.sh Dockerfile

# 2. Lokal testen
trivy image myapp:latest

# 3. Pipeline aktualisieren
# Siehe Block CQ für Snippets
```

---

### 2.2 Security Team

| Änderung | Impact | Action Required |
|----------|--------|-----------------|
| Policy Definition | Hoch | Admission Policies definieren |
| Key Management | Hoch | Key Rotation Runbook |
| Vulnerability Tracking | Mittel | Dashboard einrichten |
| Exception Process | Mittel | Process dokumentieren |

**Neue Verantwortlichkeiten**:
- Admission Policies approven
- Exception-Requests reviewen
- Security Dashboard monitoren
- Quarterly Security Review

---

### 2.3 SRE / Platform Engineering

| Änderung | Impact | Action Required |
|----------|--------|-----------------|
| Canary Rollout | Hoch | Canary Manifest deployen |
| Monitoring | Hoch | SLO Dashboards einrichten |
| Rollback Automation | Hoch | Rollback-Skripte testen |
| Incident Response | Mittel | Neue Runbooks integrieren |

**Neue Runbooks**:
- Debug Checklist (Block CF)
- Signature/Trivy Incident (Block CN)
- Rollback Decision Tree (Block CV)

---

### 2.4 CI/CD Team

| Änderung | Impact | Action Required |
|----------|--------|-----------------|
| Pipeline Jobs | Hoch | Neue Jobs implementieren |
| Secrets/OIDC | Mittel | OIDC konfigurieren |
| Artifact Storage | Mittel | Storage für SBOMs |
| Job Templates | Niedrig | Templates bereitstellen |

**Pipeline-Erweiterungen**:
```yaml
# Neue Jobs erforderlich
jobs:
  scan:
    # Trivy Scan
  sbom:
    # SBOM Generation
  sign:
    # cosign Keyless Signing
  verify:
    # Signature Verification
```

---

### 2.5 Compliance / Audit

| Änderung | Impact | Action Required |
|----------|--------|-----------------|
| Audit-Bundle | Niedrig | Struktur übernehmen |
| Documentation | Mittel | Policies dokumentieren |
| Exception Tracking | Mittel | Process etablieren |
| Quarterly Review | Mittel | Review-Termine planen |

---

## 3. Technische Änderungen

### 3.1 CI/CD Pipeline

**Neue Pipeline-Stages**:

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│  Build  │──▶│  Test   │──▶│  Scan   │──▶│  Sign   │──▶│ Deploy  │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
                                │             │
                                ▼             ▼
                          ┌─────────┐   ┌─────────┐
                          │ Trivy   │   │ cosign  │
                          │ Scan    │   │ Keyless │
                          └─────────┘   └─────────┘
                                │
                                ▼
                          ┌─────────┐
                          │  SBOM   │
                          │  Syft   │
                          └─────────┘
```

**Neue Environment Variables**:
```bash
COSIGN_EXPERIMENTAL=1
TRIVY_SEVERITY=HIGH,CRITICAL
SBOM_FORMAT=spdx-json
```

---

### 3.2 Kubernetes Admission Control

**Neue Policies**:

```yaml
# Kyverno Policy: Block unsigned images
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
spec:
  validationFailureAction: enforce
  background: false
  rules:
  - name: verify-signature
    match:
      resources:
        kinds:
        - Pod
    verifyImages:
    - imageReferences:
      - "ghcr.io/company/*"
      attestors:
      - entries:
        - keyless:
            subject: "github-actions"
            issuer: "https://token.actions.githubusercontent.com"
```

**Impact**:
- Alle unsignierten Images werden blockiert
- Gilt für alle Namespaces (außer `kube-system`)
- Übergangsfrist: 30 Tage

---

### 3.3 Registry & Storage

**Neue Artefakte**:
| Artefakt | Größe/Monat | Speicherort |
|----------|-------------|-------------|
| SBOMs | ~5 MB/Release | Registry |
| Trivy Reports | ~2 MB/Release | Artifacts |
| Signatures | ~1 KB/Image | Registry |

**Retention Policy**:
- SBOMs: 90 Tage
- Trivy Reports: 30 Tage
- Signatures: Permanent

---

### 3.4 Monitoring & Alerting

**Neue Alerts**:
```yaml
# Prometheus Alert Rules
groups:
- name: governance-postcheck
  rules:
  - alert: UnsignedImageDeployed
    expr: image_signature_valid == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Unsigned image detected"
      
  - alert: VulnerabilityFound
    expr: trivy_vulnerabilities{severity="CRITICAL"} > 0
    for: 5m
    labels:
      severity: high
    annotations:
      summary: "Critical vulnerability in image"
```

**Neue Dashboards**:
- Governance Overview Dashboard
- Security Scan Results
- Signing Status
- SLO Tracking

---

## 4. Abhängigkeiten

### 4.1 Externe Dienste

| Dienst | Zweck | Status |
|--------|-------|--------|
| sigstore.dev | Keyless Signing | ✅ Verfügbar |
| Rekor | Transparency Log | ✅ Verfügbar |
| GitHub OIDC | Authentifizierung | ⚙️ Konfiguration |
| Trivy DB | Vulnerability DB | ✅ Verfügbar |

### 4.2 Interne Abhängigkeiten

| System | Abhängigkeit | Status |
|--------|--------------|--------|
| Kubernetes Cluster | Admission Controller | ⚙️ Installation |
| Container Registry | cosign Support | ✅ Vorhanden |
| CI/CD Platform | OIDC Support | ⚙️ Konfiguration |
| Monitoring Stack | Prometheus/Grafana | ✅ Vorhanden |

---

## 5. Migrations-Timeline

```
Woche 1-2: Vorbereitung
├── Pipeline Jobs implementieren
├── Admission Policies testen (audit mode)
├── Runbooks finalisieren
└── Team-Training

Woche 3-4: Staging
├── Staging Deployment
├── Canary Tests
├── Rollback Drills
└── Monitoring Validierung

Woche 5-6: Production
├── Admission Policies enforce
├── Production Canary
├── Full Rollout
└── Post-Release Review

Woche 7-8: Stabilisierung
├── Exception-Prozess aktiv
├── Optimierungen
└── Dokumentation final
```

---

## 6. Risikobewertung

### 6.1 Technische Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Pipeline Failures | Mittel | Hoch | Fallback-Pipeline, Testing |
| Signing Failures | Niedrig | Hoch | Manual Signing Process |
| Admission Blocking | Mittel | Mittel | Exception Process |
| Storage Exhaustion | Niedrig | Niedrig | Retention Policy |

### 6.2 Organisatorische Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Team Resistance | Mittel | Mittel | Training, Kommunikation |
| Process Delays | Mittel | Niedrig | Exception Process |
| Skill Gaps | Niedrig | Mittel | Training-Deck, Runbooks |

---

## 7. Rollback-Plan

### 7.1 System-Rollback

```bash
# Admission Policies deaktivieren
kubectl patch clusterpolicy verify-image-signatures \
  --type merge -p '{"spec":{"validationFailureAction":"audit"}}'

# Pipeline zurücksetzen
git revert <pipeline-commit>
```

### 7.2 Kommunikation bei Rollback

1. **Internal**: #governance-support Channel
2. **Stakeholder**: Email an Management
3. **Documentation**: Incident Report

---

## 8. Erfolgsmessung

### 8.1 KPIs

| KPI | Baseline | Target | Messung |
|-----|----------|--------|---------|
| Signed Images % | 0% | 100% | Wöchentlich |
| Vulnerability Blocking | 0 | Alle CRITICAL | Täglich |
| Audit Prep Time | 2 Wochen | 2 Tage | Pro Audit |
| Deployment Success | 85% | 99% | Täglich |
| MTTR | 4h | < 30min | Pro Incident |

### 8.2 Reporting

- **Weekly**: Governance Dashboard Review
- **Monthly**: Compliance Report
- **Quarterly**: Security Review Meeting

---

## 9. Support & Kontakte

| Thema | Kontakt | Kanal |
|-------|---------|-------|
| Pipeline Issues | CI/CD Team | #cicd-support |
| Security Questions | Security Team | #security-support |
| Policy Exceptions | Security Lead | security@company.com |
| General Questions | Platform Team | #governance-support |

---

## 📎 Guided Links

| Thema | Block / Datei |
|-------|---------------|
| CI Job Snippets | → `developer-portal-CQ.md` |
| Admission Policy | → `kyverno-policies/verify-cosign-signature.yaml` |
| Rollback Decision Tree | → `developer-portal-CV.md` |
| Training-Deck | → `developer-portal-DP.md` |
| Stakeholder-FAQ | → `developer-portal-DQ.md` |
| Compliance-Memo | → `developer-portal-DO.md` |

---

*Block DR – Change-Impact-Dokument – v1.0*
