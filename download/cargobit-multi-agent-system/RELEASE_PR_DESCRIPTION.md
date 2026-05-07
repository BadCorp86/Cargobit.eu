# Release-Readiness PR – Governance Postcheck

Dieser PR dient der finalen Überprüfung aller sicherheits-, build- und release-kritischen Schritte vor der Veröffentlichung der Plattform.  
Er basiert auf der vollständigen Release-Checkliste und umfasst die Bereiche Secrets/OIDC, Scanning, Signing, Canary-Rollout, Admission-Enforcement und Key-Rotation.

## 🎯 Ziel
Sicherstellen, dass die Plattform **audit-ready**, **signiert**, **gescannt**, **rollback-fähig** und **produktionsreif** ist.

---

## ✅ Release-Readiness Checkliste

| Aufgabe | Beschreibung | Status | Owner |
|--------|--------------|--------|--------|
| [ ] **Secrets & OIDC prüfen** | Registry-Secrets gesetzt, OIDC getestet, Keyless-Sign-Job erfolgreich | ⬜ TODO | PlatformOwner / CI Owner |
| [ ] **Trivy & SBOM** | Trivy gepinnt, SBOM erzeugt, Artefakte hochgeladen | ⬜ TODO | SecurityOwner / BuildOwner |
| [ ] **Signatur-Verifikation** | cosign sign/verify erfolgreich, Rekor-Index dokumentiert | ⬜ TODO | CI Owner / SecurityOwner |
| [ ] **Canary Deploy & Monitoring** | Canary (5–10%), Monitoring aktiv, Rollback getestet | ⬜ TODO | Release Manager / SRE |
| [ ] **Admission Enforcement** | Deploy-Gate aktiv, optional Kyverno/Gatekeeper | ⬜ TODO | SRE / SecurityOwner |
| [ ] **Runbooks & Key Rotation** | Rotation-Runbook final, Drill geplant/ausgeführt | ⬜ TODO | SecurityOwner / PlatformOwner |
| [ ] **Go/No-Go Entscheidung** | Alle Kriterien erfüllt, Canary stabil | ⬜ TODO | Release Manager |

---

## 🔍 Wichtige Verifikationen

- cosign verify (Keyless):  
  `cosign verify --keyless ghcr.io/ORG/governance-postcheck@sha256:<DIGEST>`
- Trivy Scan:  
  `trivy image --severity CRITICAL,HIGH <image>`
- SBOM:  
  `syft <image> -o json > sbom.json`
- Rollback Test:  
  `kubectl rollout undo deployment/governance-postcheck -n governance-postcheck-canary`

---

## 📎 Artefakte
Bitte folgende Artefakte anhängen:
- `trivy.json`
- `sbom.json`
- `sign.log` (inkl. Rekor-Index)
- Canary-Dashboard Screenshot
- Rollback-Test Screenshot

---

## 📝 Reviewer Hinweise
- Fokus auf **Security Gates**, **Signaturen**, **Rollback-Fähigkeit**, **Digest-basierte Deploys**.
- Keine Freigabe ohne Canary-Stabilität (24–48h).

---

*Block DD – PR-fertige Beschreibung*
