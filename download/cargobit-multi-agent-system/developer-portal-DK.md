# DK – Audit-Bundle (Struktur + README)

> **Zweck**: Vollständige Sammlung aller sicherheits-, build- und release-relevanten Artefakte für interne und externe Audits. Audit-ready, reproduzierbar.

---

## 📁 Ordnerstruktur (empfohlen)

```
audit/
├── 01_build/
│   ├── Dockerfile.hardened
│   ├── build.log
│   ├── sbom.json
│   └── trivy.json
├── 02_signing/
│   ├── sign.log
│   ├── rekor-index.txt
│   └── cosign.pub
├── 03_ci_cd/
│   ├── pipeline.yml
│   ├── verify-job.log
│   └── artifact-manifest.txt
├── 04_deployment/
│   ├── canary-manifest.yaml
│   ├── rollback-test.log
│   └── admission-policy.yaml
├── 05_governance/
│   ├── SECURITY_POLICY.md
│   ├── KEY_ROTATION.md
│   └── EXCEPTIONS.md
└── README.md
```

---

## 📄 README für das Audit-Bundle

```markdown
# Audit‑Bundle – Governance Postcheck

Dieses Bundle enthält alle sicherheits‑, build‑ und release‑relevanten Artefakte für interne und externe Audits.

---

## 📦 Inhalt

### 1. Build‑Nachweise (`01_build/`)
- Hardened Dockerfile
- Build‑Logs
- SBOM (syft)
- Trivy Scan (JSON/SARIF)

### 2. Signatur‑Nachweise (`02_signing/`)
- cosign sign/verify Logs
- Rekor‑Index (Transparenz‑Log)
- Öffentlicher Schlüssel (falls keyed)

### 3. CI/CD‑Nachweise (`03_ci_cd/`)
- Pipeline‑Definition
- Verify‑Job‑Logs
- Artefakt‑Manifest

### 4. Deployment‑Nachweise (`04_deployment/`)
- Canary Deployment Manifest
- Rollback‑Test
- Admission‑Policy (Kyverno/Gatekeeper)

### 5. Governance‑Dokumente (`05_governance/`)
- Security Policy
- Key Rotation Runbook
- Exceptions Dokumentation

---

## 🔍 Audit‑Relevante Links
- **Signatur‑Verifikation** → Block CF
- **Trivy & SBOM** → Block CQ
- **Admission Enforcement** → Block CL
- **Key Rotation** → Block CN

---

## 📝 Hinweise für Auditoren
- Alle Artefakte sind reproduzierbar über CI/CD.  
- Jede Build‑ und Signatur‑Operation ist über Rekor nachvollziehbar.  
- Deployments sind ausschließlich Digest‑basiert und signatur‑validiert.
```

---

## 📎 Guided Links (Intern)

| Thema | Block / Datei |
|-------|---------------|
| CI/CD Pipeline | → `developer-portal-CC.md` |
| Security Scanning | → `developer-portal-CQ.md` |
| Admission Controller | → `developer-portal-CL.md` |
| Key Rotation | → `developer-portal-CN.md` |
| Security Policy | → `developer-portal-CM.md` |
| Exception Process | → `developer-portal-CO.md` |

---

## ✅ Audit-Checkliste (Quick Reference)

| Nachweis | Datei | Status |
|----------|-------|--------|
| Hardened Dockerfile | `01_build/Dockerfile.hardened` | ☐ |
| SBOM generiert | `01_build/sbom.json` | ☐ |
| Trivy Scan | `01_build/trivy.json` | ☐ |
| Signatur-Log | `02_signing/sign.log` | ☐ |
| Rekor-Index | `02_signing/rekor-index.txt` | ☐ |
| Pipeline-Definition | `03_ci_cd/pipeline.yml` | ☐ |
| Canary-Manifest | `04_deployment/canary-manifest.yaml` | ☐ |
| Rollback-Test | `04_deployment/rollback-test.log` | ☐ |
| Admission-Policy | `04_deployment/admission-policy.yaml` | ☐ |
| Security Policy | `05_governance/SECURITY_POLICY.md` | ☐ |
| Key Rotation Runbook | `05_governance/KEY_ROTATION.md` | ☐ |

---

*Block DK – Audit-Bundle – v1.0*
