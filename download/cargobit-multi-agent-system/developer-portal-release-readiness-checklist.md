# Release-Readiness Checkliste – Governance Postcheck
*(für PR-Beschreibung oder `RELEASE_CHECKLIST.md`)*

| Aufgabe | Beschreibung | Status | Owner |
|--------|--------------|--------|--------|
| [ ] **Secrets & OIDC prüfen** | Registry-Secrets gesetzt, OIDC/ID-Token getestet, Keyless-Sign-Job erfolgreich | ⬜ TODO | PlatformOwner / CI Owner |
| [ ] **Trivy & SBOM** | Trivy gepinnt, SBOM (syft) erzeugt, Artefakte hochgeladen, Policy definiert | ⬜ TODO | SecurityOwner / BuildOwner |
| [ ] **Signatur-Verifikation** | `cosign sign --keyless` + `cosign verify --keyless` erfolgreich, Rekor-Index dokumentiert | ⬜ TODO | CI Owner / SecurityOwner |
| [ ] **Canary Deploy & Monitoring** | Canary (5–10%), Health-Probes, SLO-Monitoring, Rollback-Test durchgeführt | ⬜ TODO | Release Manager / SRE |
| [ ] **Admission Enforcement** | Deploy-Gate (`cosign verify`) aktiv, optional Kyverno/Gatekeeper Policy getestet | ⬜ TODO | SRE / SecurityOwner |
| [ ] **Runbooks & Key Rotation** | `SECURITY/KEY_ROTATION.md` final, Rotation-Drill geplant/ausgeführt | ⬜ TODO | SecurityOwner / PlatformOwner |
| [ ] **Go/No-Go Entscheidung** | Alle Kriterien erfüllt, Canary stabil 24–48h, Risiken dokumentiert | ⬜ TODO | Release Manager |

---

## 1. Secrets & OIDC prüfen

- [ ] Registry-Secrets in Sandbox gesetzt
- [ ] GitHub: `permissions: id-token: write` aktiv
- [ ] GitLab: `CI_JOB_JWT` vorhanden
- [ ] Sandbox-Sign-Job erzeugt Rekor-Eintrag

**Status:** ⬜ TODO

---

## 2. Trivy & SBOM

- [ ] Trivy Version gepinnt
- [ ] SBOM (`syft`) erzeugt und als Artefakt gespeichert
- [ ] Trivy JSON/SARIF hochgeladen
- [ ] Policy für HIGH/CRITICAL definiert

**Status:** ⬜ TODO

---

## 3. Signatur-Verifikation

- [ ] CI führt `cosign sign --keyless` aus
- [ ] CI führt `cosign verify --keyless` aus
- [ ] Rekor-Index dokumentiert
- [ ] Lokale Verifikation erfolgreich

**Status:** ⬜ TODO

---

## 4. Canary Deploy & Monitoring

- [ ] Canary Deployment (Digest-basiert) aktiv
- [ ] Traffic-Split 5–10%
- [ ] Health-Probes funktionieren
- [ ] Prometheus SLOs überwacht
- [ ] Rollback getestet

**Status:** ⬜ TODO

---

## 5. Admission Enforcement

- [ ] Deploy-Pipeline blockiert unsignierte Images
- [ ] Optional: Kyverno/Gatekeeper Policy aktiv
- [ ] Test: Unsigned Image → Deploy wird abgelehnt

**Status:** ⬜ TODO

---

## 6. Runbooks & Key Rotation

- [ ] `SECURITY/KEY_ROTATION.md` finalisiert
- [ ] Rotation-Drill durchgeführt
- [ ] Notfallrotation dokumentiert
- [ ] Kalendertermine erstellt

**Status:** ⬜ TODO

---

## 7. Go/No-Go Entscheidung

- [ ] Unit-Tests grün
- [ ] Trivy ohne ungeklärte HIGH/CRITICAL Findings
- [ ] Signatur-Verifikation erfolgreich
- [ ] Canary stabil 24–48h
- [ ] Rollback erfolgreich getestet

**Status:** ⬜ TODO

---

## Quick Reference

| Phase | Kriterium | Target |
|-------|-----------|--------|
| Build | SBOM + Signatur | 100% |
| Scan | Trivy | Keine CRITICAL |
| Deploy | Canary | 5–10% → 100% |
| Runtime | SLOs | > 99.5% |
| Security | Key Rotation | 90 Tage |

---

*Block CR – Release-Readiness Checkliste*
