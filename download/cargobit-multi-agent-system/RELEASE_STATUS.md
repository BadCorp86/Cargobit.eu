# Release Status Matrix – Governance Postcheck

Diese Matrix wird fortlaufend gepflegt und zeigt den aktuellen Stand aller release-kritischen Bereiche.

| Bereich | Beschreibung | Status | Letztes Update | Owner |
|--------|--------------|--------|----------------|--------|
| **Secrets & OIDC** | Secrets gesetzt, OIDC getestet | ⬜ TODO | – | PlatformOwner |
| **Trivy & SBOM** | Scanner gepinnt, SBOM erzeugt | ⬜ TODO | – | SecurityOwner |
| **Signatur-Verifikation** | cosign sign/verify erfolgreich | ⬜ TODO | – | CI Owner |
| **Canary Deploy** | Canary stabil, Rollback getestet | ⬜ TODO | – | Release Manager |
| **Admission Enforcement** | Signatur-Gate aktiv | ⬜ TODO | – | SRE |
| **Key Rotation** | Rotation-Runbook & Drill | ⬜ TODO | – | SecurityOwner |
| **Go/No-Go** | Entscheidung dokumentiert | ⬜ TODO | – | Release Manager |

---

## Legende
- ⬜ TODO – noch offen  
- 🟡 IN PROGRESS – in Arbeit  
- 🟢 DONE – abgeschlossen  

---

## Hinweise
- Änderungen an dieser Matrix erfolgen **nur über PRs**.  
- Jede Änderung muss mit Logs/Artefakten belegt werden.  
- Die Matrix ist Teil des **Audit-Trails**.

---

*Block DF – Release Status Matrix*
