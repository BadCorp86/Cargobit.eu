# Secret Rotation Audit Template

## Audit-Log für Secret-Rotation

Diese Datei dokumentiert alle Secret-Rotationen für Compliance und Security-Audits.

---

## Rotation-Historie

| Datum | Secret-Typ | Rotiert von | GitHub Run ID | Namespace | Status | Notizen |
|-------|------------|-------------|---------------|-----------|--------|---------|
| YYYY-MM-DD | stripe-keys | @username | 1234567890 | staging | ✓ | Erste Rotation |
| YYYY-MM-DD | admin-jwt | @username | 1234567891 | staging | ✓ | - |
| YYYY-MM-DD | k8s-token | @username | 1234567892 | staging | ✓ | - |

---

## Durchgeführte Rotationen

### 2026-04-22 - Initiales Setup

**Durchgeführt von:** CI/CD Pipeline  
**Trigger:** Manuell (workflow_dispatch)  
**Run ID:** -  

| Secret | Alte Version | Neue Version | Gültigkeit |
|--------|--------------|--------------|------------|
| STRIPE_SECRET_KEY | - | Neue Erstellung | Bis zur Deaktivierung |
| ADMIN_JWT | - | Neue Erstellung | 90 Tage |
| KUBE_CONFIG_DATA | - | Neue Erstellung | 90 Tage |

**Notizen:**
- Initiales Setup der CI/CD Secrets
- Alle Secrets frisch erstellt

---

## Geplante Rotationen

| Nächstes Datum | Secret-Typ | Verantwortlich | Status |
|----------------|------------|----------------|--------|
| 2026-05-22 | admin-jwt | CI (automatisch) | Geplant |
| 2026-05-22 | k8s-token | CI (automatisch) | Geplant |
| 2026-07-21 | stripe-keys | Manuell | Geplant |

---

## Verfahrensanweisung

### Manuelle Rotation

1. **Trigger:**
   - GitHub Actions → Rotate Secrets → Run workflow
   - Oder: `gh workflow run rotate-secrets.yml`

2. **Verifikation:**
   - Prüfe Workflow-Output in GitHub Actions
   - Verifiziere Deployment noch funktioniert
   - Aktualisiere diese Audit-Datei

3. **Bei Fehlschlag:**
   - Prüfe Logs in GitHub Actions
   - Rollback: Vorherige Version wiederherstellen
   - Incident erstellen falls kritisch

### Automatische Rotation

- **Schedule:** Jeden Sonntag 03:00 UTC
- **Benachrichtigung:** Slack bei Erfolg/Misserfolg
- **Review:** Wöchentlich prüfen

---

## Secrets-Übersicht

### GitHub Repository Secrets

| Secret Name | Beschreibung | Rotation | Zugriff |
|-------------|--------------|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe API Key | Monatlich | Payments Service |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook Secret | Bei Bedarf | Webhooks |
| `DATABASE_URL` | PostgreSQL Connection | Quartalsweise | Backend |
| `REDIS_HOST` | Redis Hostname | Selten | Backend/Worker |
| `REDIS_PORT` | Redis Port | Selten | Backend/Worker |
| `ADMIN_JWT` | Admin JWT Token | Monatlich | Smoke Tests |
| `KUBE_CONFIG_DATA` | Kubernetes Config | Monatlich | Deployments |
| `DOCKER_REGISTRY` | Registry URL | Selten | CI |
| `DOCKER_USERNAME` | Registry User | Bei Personalwechsel | CI |
| `DOCKER_PASSWORD` | Registry Token | Bei Verdacht | CI |
| `DOCKER_NAMESPACE` | Registry Namespace | Selten | CI |
| `KUBESEAL_CERT` | SealedSecret Cert | Jährlich | SealedSecrets |
| `ADMIN_TOKEN` | GitHub PAT | Bei Personalwechsel | Secret Rotation |
| `JWT_SECRET` | JWT Signier-Secret | Jährlich | JWT Erstellung |

### Kubernetes Secrets (pro Namespace)

| Secret Name | Namespace | Typ | Rotation |
|-------------|-----------|-----|----------|
| `payments-secrets` | staging | SealedSecret | Über GitHub |
| `payments-secrets` | production | SealedSecret | Über GitHub |

---

## Sicherheitsrichtlinien

### Zugangskontrolle

- GitHub Secrets: Nur Repository Admins
- Kubernetes Secrets: Nur über CI/CD
- Rotation: Automatisiert bevorzugt

### Incident Response

Bei Verdacht auf Kompromittierung:

1. **Sofort:**
   - Alle betroffenen Secrets rotieren
   - Incident Ticket erstellen
   - Team benachrichtigen

2. **Innerhalb 24h:**
   - Audit-Logs prüfen
   - Zugriffsmuster analysieren
   - Ggf. Zugriff einschränken

3. **Innerhalb 7 Tagen:**
   - Post-Mortem erstellen
   - Maßnahmen ableiten
   - Dokumentation aktualisieren

---

## Kontakte

| Rolle | Name | Kontakt |
|-------|------|---------|
| Security Lead | - | security@cargobit.io |
| Platform Team | - | platform@cargobit.io |
| On-Call | - | PagerDuty |

---

*Zuletzt aktualisiert: 2026-04-22*
*Verantwortlich: Platform Team*
