# Go/No-Go Meeting Template – Governance Postcheck Release

<!--
Vorlage für das Release-Entscheidungs-Meeting.
Dauer: 30 Minuten
Teilnehmer: Release Manager, SRE, SecurityOwner, PlatformOwner, BuildOwner
-->

---

## Meeting-Info

| Feld | Wert |
|------|------|
| **Datum** | <!-- YYYY-MM-DD --> |
| **Zeit** | <!-- HH:MM – HH:MM --> |
| **Release** | <!-- Version/Tag --> |
| **Release Manager** | <!-- Name --> |
| **Notetaker** | <!-- Name --> |

---

## Teilnehmer

| Rolle | Name | Anwesend |
|-------|------|----------|
| Release Manager | <!-- Name --> | [ ] |
| SRE | <!-- Name --> | [ ] |
| SecurityOwner | <!-- Name --> | [ ] |
| PlatformOwner | <!-- Name --> | [ ] |
| BuildOwner | <!-- Name --> | [ ] |
| CI Owner | <!-- Name --> | [ ] |

---

## Agenda

### 1. Check-In (5 min)
- Vorstellung der Teilnehmer
- Ziel: Go/No-Go Entscheidung für Release

### 2. Status-Review (10 min)
- Pipeline-Status
- Test-Ergebnisse
- Sicherheits-Scan-Ergebnisse

### 3. Risiko-Assessment (10 min)
- Offene Issues
- Bekannte Limitationen
- Mitigation-Strategien

### 4. Entscheidung (5 min)
- Go / No-Go / Conditional Go
- Nächste Schritte

---

## Status-Checkliste

### Build & Security

| Kriterium | Status | Owner | Kommentar |
|-----------|--------|-------|-----------|
| Unit-Tests grün | ⬜/✅ | BuildOwner | |
| Integration-Tests grün | ⬜/✅ | BuildOwner | |
| SBOM erzeugt | ⬜/✅ | BuildOwner | |
| Trivy Scan | ⬜/✅ | SecurityOwner | Keine CRITICAL |
| Signatur erstellt | ⬜/✅ | CI Owner | Rekor-Index |
| Signatur verifiziert | ⬜/✅ | SecurityOwner | |

### Deployment

| Kriterium | Status | Owner | Kommentar |
|-----------|--------|-------|-----------|
| Canary 5–10% aktiv | ⬜/✅ | SRE | |
| Health-Probes OK | ⬜/✅ | SRE | |
| SLOs erfüllt | ⬜/✅ | SRE | > 99.5% |
| Rollback getestet | ⬜/✅ | SRE | |
| Admission Gate aktiv | ⬜/✅ | PlatformOwner | |

### Operations

| Kriterium | Status | Owner | Kommentar |
|-----------|--------|-------|-----------|
| Runbooks final | ⬜/✅ | SRE | |
| Key Rotation dokumentiert | ⬜/✅ | SecurityOwner | |
| Incident-Template bereit | ⬜/✅ | SRE | |
| On-Call informiert | ⬜/✅ | Release Manager | |

---

## Risiko-Assessment

### Identifizierte Risiken

| Risiko | Wahrscheinlichkeit | Impact | Mitigation | Owner |
|--------|-------------------|--------|------------|-------|
| <!-- Risiko 1 --> | H/M/N | H/M/N | <!-- Maßnahme --> | <!-- Name --> |
| <!-- Risiko 2 --> | H/M/N | H/M/N | <!-- Maßnahme --> | <!-- Name --> |
| <!-- Risiko 3 --> | H/M/N | H/M/N | <!-- Maßnahme --> | <!-- Name --> |

### Offene Blocker

| Blocker | Priorität | Owner | ETA |
|---------|-----------|-------|-----|
| <!-- Blocker 1 --> | P1/P2/P3 | <!-- Name --> | <!-- Datum --> |
| <!-- Blocker 2 --> | P1/P2/P3 | <!-- Name --> | <!-- Datum --> |

---

## Entscheidung

### Ergebnis

- [ ] **GO** – Release wird durchgeführt
- [ ] **NO-GO** – Release verschoben
- [ ] **CONDITIONAL GO** – Release mit Auflagen

### Bei CONDITIONAL GO

| Auflage | Owner | Deadline |
|---------|-------|----------|
| <!-- Auflage 1 --> | <!-- Name --> | <!-- Datum --> |
| <!-- Auflage 2 --> | <!-- Name --> | <!-- Datum --> |

---

## Nächste Schritte

| Aktion | Owner | Deadline |
|--------|-------|----------|
| <!-- Aktion 1 --> | <!-- Name --> | <!-- Datum --> |
| <!-- Aktion 2 --> | <!-- Name --> | <!-- Datum --> |
| <!-- Aktion 3 --> | <!-- Name --> | <!-- Datum --> |

---

## Nächstes Meeting

| Feld | Wert |
|------|------|
| **Datum** | <!-- YYYY-MM-DD --> |
| **Zeit** | <!-- HH:MM --> |
| **Thema** | <!-- Thema --> |

---

## Notizen

<!--
Freie Notizen während des Meetings
-->

---

*Block CT – Go/No-Go Meeting Template*
