# PR-Beschreibung – Governance Postcheck Release

<!--
Kopiere diese Vorlage in deine PR-Beschreibung.
Ersetze die Platzhalter mit den tatsächlichen Werten.
-->

## Zusammenfassung

Dieser PR führt die **Governance Postcheck** Pipeline ein und aktiviert die Release-Readiness-Validierung für alle Container-Images.

---

## Änderungen

### CI/CD Pipeline
- [ ] `syft` SBOM-Generierung hinzugefügt
- [ ] `trivy` Vulnerability-Scan mit SARIF-Output
- [ ] `cosign` Keyless-Signing mit Rekor-Transparenzlog
- [ ] Admission-Gate für unsignierte Images

### Security
- [ ] OIDC/ID-Token Integration (GitHub/GitLab)
- [ ] Registry-Secrets für Sandbox konfiguriert
- [ ] Key-Rotation-Runbook (`SECURITY/KEY_ROTATION.md`)

### Deployment
- [ ] Canary-Deployment Manifest
- [ ] Health-Probe Konfiguration
- [ ] Rollback-Workflow dokumentiert

---

## Release-Readiness Status

| Kriterium | Status | Details |
|-----------|--------|---------|
| Secrets & OIDC | <!-- ✅/⬜ --> | <!-- Details --> |
| Trivy & SBOM | <!-- ✅/⬜ --> | <!-- Details --> |
| Signatur-Verifikation | <!-- ✅/⬜ --> | <!-- Details --> |
| Canary Deploy | <!-- ✅/⬜ --> | <!-- Details --> |
| Admission Enforcement | <!-- ✅/⬜ --> | <!-- Details --> |
| Runbooks & Key Rotation | <!-- ✅/⬜ --> | <!-- Details --> |
| Go/No-Go | <!-- ✅/⬜ --> | <!-- Details --> |

---

## Test-Nachweis

### Lokale Tests
```bash
# SBOM generieren
syft <IMAGE> -o json > sbom.json

# Vulnerability Scan
trivy image --format sarif --output trivy.sarif <IMAGE>

# Signieren
cosign sign --keyless <IMAGE>

# Verifizieren
cosign verify --keyless <IMAGE>
```

### CI-Tests
- [ ] Pipeline auf `main` erfolgreich
- [ ] Sandbox-Deployment getestet
- [ ] Canary-Rollout 5% stabil

---

## Breaking Changes

<!--
Beschreibe hier alle Breaking Changes oder schreibe "Keine Breaking Changes".
-->

---

## Rollback-Plan

1. Canary auf 0% zurücksetzen
2. Vorheriges Image-Tag deployen
3. Incident-Template ausrollen falls nötig

---

## Checkliste für Reviewer

- [ ] CI-Pipeline erfolgreich
- [ ] SBOM als Artefakt vorhanden
- [ ] Trivy ohne CRITICAL Findings
- [ ] Signatur in Rekor verifizierbar
- [ ] Dokumentation aktualisiert

---

## Verwandte Issues

<!--
- Fixes #123
- Relates to #456
-->

---

## Sign-off

| Rolle | Name | Datum |
|-------|------|-------|
| Author | <!-- Name --> | <!-- Datum --> |
| Reviewer | <!-- Name --> | <!-- Datum --> |
| SecurityOwner | <!-- Name --> | <!-- Datum --> |
| Release Manager | <!-- Name --> | <!-- Datum --> |

---

*Block CS – PR-Beschreibung Template*
