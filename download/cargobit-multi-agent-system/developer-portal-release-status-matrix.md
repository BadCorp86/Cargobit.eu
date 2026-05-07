# Release-Status-Matrix – Governance Postcheck

<!--
Automatische Status-Matrix zur Pflege im Repo.
Aktualisiere die Status-Werte bei jedem Release.
Status: ⬜ TODO | 🔄 IN PROGRESS | ✅ DONE | ❌ BLOCKED
-->

---

## Release: <!-- VERSION/TAG -->

| Datum | <!-- YYYY-MM-DD --> |
|-------|---------------------|
| Release Manager | <!-- Name --> |
| Target Release | <!-- Datum --> |

---

## Status-Übersicht

| # | Kriterium | Status | Owner | Zuletzt aktualisiert |
|---|-----------|--------|-------|----------------------|
| 1 | Secrets & OIDC prüfen | ⬜ TODO | PlatformOwner | <!-- Datum --> |
| 2 | Trivy & SBOM | ⬜ TODO | SecurityOwner | <!-- Datum --> |
| 3 | Signatur-Verifikation | ⬜ TODO | CI Owner | <!-- Datum --> |
| 4 | Canary Deploy & Monitoring | ⬜ TODO | SRE | <!-- Datum --> |
| 5 | Admission Enforcement | ⬜ TODO | SRE | <!-- Datum --> |
| 6 | Runbooks & Key Rotation | ⬜ TODO | SecurityOwner | <!-- Datum --> |
| 7 | Go/No-Go Entscheidung | ⬜ TODO | Release Manager | <!-- Datum --> |

---

## Detaillierter Status

### 1. Secrets & OIDC prüfen

| Sub-Task | Status | Details |
|----------|--------|---------|
| Registry-Secrets gesetzt | ⬜ | |
| GitHub: `id-token: write` | ⬜ | |
| GitLab: `CI_JOB_JWT` | ⬜ | |
| Rekor-Eintrag erzeugt | ⬜ | |

### 2. Trivy & SBOM

| Sub-Task | Status | Details |
|----------|--------|---------|
| Trivy Version gepinnt | ⬜ | Version: <!-- X.Y.Z --> |
| SBOM erzeugt | ⬜ | Artefakt: `sbom.json` |
| SARIF hochgeladen | ⬜ | Artefakt: `trivy.sarif` |
| Policy definiert | ⬜ | Threshold: HIGH/CRITICAL |

### 3. Signatur-Verifikation

| Sub-Task | Status | Details |
|----------|--------|---------|
| `cosign sign --keyless` | ⬜ | |
| `cosign verify --keyless` | ⬜ | |
| Rekor-Index dokumentiert | ⬜ | Index: <!-- UUID --> |
| Lokale Verifikation | ⬜ | |

### 4. Canary Deploy & Monitoring

| Sub-Task | Status | Details |
|----------|--------|---------|
| Canary aktiv | ⬜ | Traffic: <!-- X% --> |
| Health-Probes | ⬜ | Liveness: ✅ Readiness: ✅ |
| SLO-Monitoring | ⬜ | SLO: > 99.5% |
| Rollback getestet | ⬜ | |

### 5. Admission Enforcement

| Sub-Task | Status | Details |
|----------|--------|---------|
| Deploy-Gate aktiv | ⬜ | |
| Kyverno/Gatekeeper | ⬜ | Policy: <!-- Name --> |
| Test: Unsigned Image | ⬜ | Ergebnis: Blocked ✅ |

### 6. Runbooks & Key Rotation

| Sub-Task | Status | Details |
|----------|--------|---------|
| `KEY_ROTATION.md` final | ⬜ | |
| Rotation-Drill | ⬜ | Datum: <!-- YYYY-MM-DD --> |
| Notfallrotation | ⬜ | |
| Kalendertermine | ⬜ | Nächste Rotation: <!-- Datum --> |

### 7. Go/No-Go Entscheidung

| Sub-Task | Status | Details |
|----------|--------|---------|
| Unit-Tests grün | ⬜ | |
| Trivy keine CRITICAL | ⬜ | |
| Signatur verifiziert | ⬜ | |
| Canary stabil 24–48h | ⬜ | |
| Rollback getestet | ⬜ | |

---

## Health Score

```
H = 0.25×L + 0.35×E + 0.20×S + 0.10×R + 0.10×A
```

| Komponente | Gewicht | Status | Score |
|------------|---------|--------|-------|
| L – Latency | 25% | <!-- Status --> | <!-- 0–100 --> |
| E – Errors | 35% | <!-- Status --> | <!-- 0–100 --> |
| S – Saturation | 20% | <!-- Status --> | <!-- 0–100 --> |
| R – Resources | 10% | <!-- Status --> | <!-- 0–100 --> |
| A – Availability | 10% | <!-- Status --> | <!-- 0–100 --> |
| **Total** | **100%** | | **<!-- Score -->** |

---

## Timeline

| Datum | Meilenstein | Status |
|-------|-------------|--------|
| <!-- Datum --> | Release-Branch erstellt | ⬜ |
| <!-- Datum --> | CI-Pipeline grün | ⬜ |
| <!-- Datum --> | Security-Scan abgeschlossen | ⬜ |
| <!-- Datum --> | Canary aktiviert | ⬜ |
| <!-- Datum --> | Go/No-Go Meeting | ⬜ |
| <!-- Datum --> | Production Release | ⬜ |

---

## Blocker & Risiken

| Typ | Beschreibung | Priorität | Owner | Status |
|-----|--------------|-----------|-------|--------|
| <!-- Blocker --> | <!-- Beschreibung --> | P1/P2/P3 | <!-- Name --> | ⬜/🔄/✅/❌ |

---

## Änderungshistorie

| Datum | Änderung | Author |
|-------|----------|--------|
| <!-- Datum --> | <!-- Änderung --> | <!-- Name --> |

---

*Block CU – Release-Status-Matrix*
