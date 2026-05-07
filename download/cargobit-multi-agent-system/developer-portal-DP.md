# DP – Release-Training-Deck (PowerPoint-Struktur)

> **Zweck**: Strukturierte Präsentationsvorlage für interne Schulungen zu Governance Postcheck. 12 Slides, modular erweiterbar.

---

## 📋 Slide-Struktur

### Slide 1: Titelfolie

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│     🛡️ Governance Postcheck                               │
│     Release Training – Platform Engineering               │
│                                                            │
│     Version 1.0 | Q1 2025                                 │
│     Platform Engineering | Security | SRE                 │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Elemente**:
- Logo (CargoBit)
- Titel: "Governance Postcheck Release Training"
- Untertitel: "Sichere, auditierbare Deployments"
- Datum & Presenter

---

### Slide 2: Agenda

```markdown
## Agenda

1. 🎯 Warum Governance Postcheck?
2. 🔐 Security & Signing
3. 🔍 Scanning & SBOM
4. 🚀 Deployment Workflow
5. 📊 Monitoring & SLOs
6. 🔄 Rollback & Recovery
7. 📋 Audit & Compliance
8. ❓ Q&A
```

---

### Slide 3: Warum Governance Postcheck?

**Content**:
```markdown
## Problemstellung

- Unkontrollierte Deployments
- Fehlende Audit-Trails
- Security-Lücken in Images
- Keine Transparenz über Artefakte

## Lösung

✅ Automatisierte Governance-Prüfungen
✅ Signierte, gescannte Images
✅ Vollständige SBOM-Transparenz
✅ Audit-fähige Pipelines
```

**Key Message**: "Kein Deployment ohne Governance-Check"

---

### Slide 4: Security & Signing

```markdown
## Keyless Signing mit cosign

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Build     │───▶│    Sign     │───▶│   Verify    │
│  (Docker)   │    │  (cosign)   │    │  (Rekor)    │
└─────────────┘    └─────────────┘    └─────────────┘

### Vorteile
- Keine manuellen Schlüssel
- OIDC-basierte Authentifizierung
- Transparenz-Log via Rekor
- Nachvollziehbarkeit garantiert

### Befehle
```bash
cosign sign --keyless ghcr.io/app:v1.0
cosign verify --keyless ghcr.io/app:v1.0
```
```

---

### Slide 5: Scanning & SBOM

```markdown
## Security Scanning Pipeline

### Trivy Scan
- Vulnerability-Erkennung (OS + Libraries)
- Severity-Levels: CRITICAL → Block
- SARIF-Output für GitHub Security

### SBOM mit Syft
- Software Bill of Materials
- Formate: SPDX, CycloneDX
- Vollständige Transparenz

### Pipeline Integration
```yaml
- name: Trivy Scan
  run: trivy image --severity HIGH,CRITICAL app:latest

- name: Generate SBOM
  run: syft app:latest -o spdx-json > sbom.json
```
```

---

### Slide 6: Deployment Workflow

```markdown
## Canary Deployment Prozess

     ┌──────────┐
     │  Build   │
     └────┬─────┘
          │
     ┌────▼─────┐
     │Security  │ ◀── Trivy + SBOM
     │  Scan    │
     └────┬─────┘
          │
     ┌────▼─────┐
     │  Sign    │ ◀── cosign Keyless
     └────┬─────┘
          │
     ┌────▼─────┐
     │ Canary   │ ◀── 5% → 25% → 50% → 100%
     │ Deploy   │
     └────┬─────┘
          │
     ┌────▼─────┐
     │ Monitor  │ ◀── SLO Tracking
     └──────────┘

### Timeline
- Canary 5%: 15 min
- Promotion: 30 min
- Full Rollout: 1h
```

---

### Slide 7: Monitoring & SLOs

```markdown
## SLO Targets

| Tier | Service | SLO | Error Budget |
|------|---------|-----|--------------|
| 1 | API Gateway | 99.9% | 43.8 sec/day |
| 1 | Auth | 99.9% | 43.8 sec/day |
| 2 | Task Queue | 99.5% | 7.2 min/day |
| 3 | Dashboard | 99.0% | 14.4 min/day |

## Health Score Formel
H = 0.25×L + 0.35×E + 0.20×S + 0.10×R + 0.10×A

- L = Latency (p95 < 200ms)
- E = Errors (< 0.1%)
- S = Saturation (< 80%)
- R = Release Success (> 99%)
- A = Audit Readiness (100%)
```

---

### Slide 8: Rollback & Recovery

```markdown
## Rollback Decision Tree

        ┌─────────────────┐
        │ Error Rate      │
        │ > 1% ?          │
        └────────┬────────┘
           ╱           ╲
          YES           NO
          │             │
    ┌─────▼─────┐  ┌────▼────┐
    │ HARD      │  │ Monitor │
    │ ROLLBACK  │  │ 15 min  │
    │ (sofort)  │  └────┬────┘
    └───────────┘       │
                   ┌────▼────┐
                   │ SLO OK? │
                   └────┬────┘
                      ╱   ╲
                    YES    NO
                    │      │
              ┌─────▼──┐ ┌─▼───────┐
              │Promote │ │ SOFT    │
              │Next %  │ │ ROLLBACK│
              └────────┘ └─────────┘

### Rollback Commands
```bash
# Hard Rollback
./rollback.sh --version v1.2.3 --hard

# Soft Rollback
./rollback.sh --version v1.2.3 --soft
```
```

---

### Slide 9: Audit & Compliance

```markdown
## Audit-Bundle Struktur

audit/
├── 01_build/        → Dockerfile, Logs, SBOM
├── 02_signing/      → cosign Logs, Rekor Index
├── 03_ci_cd/        → Pipeline, Verify Logs
├── 04_deployment/   → Canary Manifest, Rollback Test
└── 05_governance/   → Security Policy, Key Rotation

## Compliance Mapping

| Standard | Kontrolle | Nachweis |
|----------|-----------|----------|
| DSGVO Art. 32 | Sicherheit | Signing + Encryption |
| ISO 27001 A.12.6.1 | Vulnerabilities | Trivy Scans |
| SOC 2 | Security | Admission Policy |
```

---

### Slide 10: Runbooks & Dokumentation

```markdown
## Verfügbare Runbooks

| Runbook | Zweck | Ort |
|---------|-------|-----|
| Debug Checklist | Incident Response | Block CF |
| Incident Template | Signatur/Trivy Issues | Block CN |
| Key Rotation | 90-Tage Rotation | Block CO |
| Rollback | Deployment Recovery | Block CV |
| Post-Incident | Blameless Review | Block CY |

## Dokumentations-Links

- 📖 Handbook: `CargoBit-Governance-Postcheck-Handbook.pdf`
- 📁 Audit-Bundle: `audit/`
- 🔄 CI Snippets: Block CQ
```

---

### Slide 11: Zusammenfassung

```markdown
## Key Takeaways

✅ **Security**: Keyless Signing + Trivy Scanning
✅ **Transparency**: SBOM für alle Artefakte
✅ **Control**: Admission Enforcement
✅ **Resilience**: Canary + Auto-Rollback
✅ **Compliance**: Audit-Ready Dokumentation

## Nächste Schritte

1. Runbooks lesen und üben
2. Key Rotation Drill durchführen
3. Rollback Test validieren
4. Fragen im #governance-support Channel
```

---

### Slide 12: Q&A

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│                    ❓ Fragen & Antworten                   │
│                                                            │
│                                                            │
│     Kontakt:                                               │
│     📧 governance@company.com                              │
│     💬 #governance-support                                 │
│     📖 docs.company.com/governance                         │
│                                                            │
│     Danke für die Teilnahme!                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 📎 Guided Links

| Thema | Block / Datei |
|-------|---------------|
| Debug Checklist | → `developer-portal-CF.md` |
| Incident Template | → `developer-portal-CN.md` |
| Key Rotation | → `developer-portal-CO.md` |
| Rollback Decision Tree | → `developer-portal-CV.md` |
| CI Job Snippets | → `developer-portal-CQ.md` |
| Audit-Bundle | → `developer-portal-DK.md` |

---

*Block DP – Release-Training-Deck – v1.0*
