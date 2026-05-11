# Developer Onboarding Guide

> Willkommen beim CargoBit Foundation Generator

Dieser Guide führt neue Entwickler durch das System und erklärt alle wichtigen Konzepte.

---

## 1. Was macht dieses System?

Das System generiert die **komplette technische Foundation** für die CargoBit Payment App:

- Datenbank-Schema (Prisma)
- SQL-Migrationen
- Backend-Services
- Ops-Skripte (Backup/Restore)
- Dokumentation
- Tests

---

## 2. Wie funktioniert es?

### Multi-Agent-Architektur

Das System verwendet **5 spezialisierte Agenten**:

```
┌─────────────────────────────────────────────────────────────┐
│                    MULTI-AGENT SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │
│  │  Architect  │──▶│   Backend   │──▶│     SRE     │        │
│  │   Agent     │   │    Agent    │   │    Agent    │        │
│  └─────────────┘   └─────────────┘   └─────────────┘        │
│         │                 │                 │                │
│         │                 │                 │                │
│         ▼                 ▼                 ▼                │
│  ┌─────────────┐   ┌─────────────┐                          │
│  │     QA      │──▶│ Compliance  │                          │
│  │   Agent     │   │   Agent     │                          │
│  └─────────────┘   └─────────────┘                          │
│         │                 │                                  │
│         └────────┬────────┘                                  │
│                  ▼                                           │
│         ┌─────────────┐                                      │
│         │   Output    │                                      │
│         └─────────────┘                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Deterministische Pipeline

Die Pipeline stellt sicher, dass jeder Durchlauf **identische Ergebnisse** liefert:

1. **Run** — Führt alle Agenten aus
2. **Validate** — Prüft Output-Korrektheit
3. **Assemble** — Erstellt Manifest & Checksums
4. **Publish** — Publiziert zu Zielen

---

## 3. Wichtige Verzeichnisse

| Verzeichnis | Beschreibung |
|-------------|--------------|
| `/multi-agent` | Logik für die Artefakt-Generierung |
| `/pipeline` | CI-Pipeline-Logik |
| `/output` | Generierte Artefakte |

### Verzeichnis-Details

```
/cargobit-foundation
│
├── /multi-agent               # Agenten-Logik
│   ├── orchestrator.js        # Orchestrierung
│   ├── config.json            # Konfiguration
│   └── /agents                # Alle 5 Agenten
│
├── /pipeline                  # Pipeline-Skripte
│   ├── run.js                 # MAS ausführen
│   ├── validate.js            # Output validieren
│   ├── assemble.js            # Release erstellen
│   └── publish.js             # Publizieren
│
└── /output                    # Generierte Foundation
    ├── /prisma                # DB-Schema
    ├── /migrations            # SQL-Migrationen
    ├── /src                   # Quellcode
    ├── /ops                   # Ops-Skripte
    ├── /tests                 # Tests
    └── /docs                  # Dokumentation
```

---

## 4. Agenten im Detail

### Architect Agent
**Verantwortung:** Architektur & Datenmodell

**Generiert:**
- `prisma/schema.prisma` — Prisma-Schema
- `migrations/0001_init.sql` — Initiale Migration
- `migrations/0002_indexes.sql` — Index-Migration

**Aufgaben:**
- Datenmodell definieren
- Tabellen & Relationen
- Indizes für Performance

---

### Backend Agent
**Verantwortung:** Backend-Services

**Generiert:**
- `src/lib/rateLimit.ts` — Rate-Limiting
- `src/middleware/rateLimit.ts` — Middleware
- `src/webhooks/stripe.ts` — Stripe-Webhooks
- `src/services/stripeEvents.ts` — Event-Verarbeitung
- `src/services/auditLog.ts` — Audit-Logging
- `src/jobs/auditVerify.ts` — Audit-Verifikation

**Aufgaben:**
- Business-Logik implementieren
- Externe Integrationen
- Security-Features

---

### SRE Agent
**Verantwortung:** Ops & Infrastruktur

**Generiert:**
- `ops/backup-db.sh` — Backup-Skript
- `ops/restore-db.sh` — Restore-Skript
- `ops/cron-backup.yaml` — Cron-Konfiguration
- `ops/export-audit-log.ts` — Audit-Export

**Aufgaben:**
- Backup & Restore
- Monitoring
- Wartungs-Skripte

---

### QA Agent
**Verantwortung:** Tests

**Generiert:**
- `tests/rateLimit.test.ts` — Rate-Limit Tests
- `tests/stripeWebhook.test.ts` — Webhook Tests
- `tests/middleware/rateLimit.test.ts` — Middleware Tests

**Aufgaben:**
- Unit-Tests
- Integration-Tests
- Test-Coverage

---

### Compliance Agent
**Verantwortung:** Dokumentation & Compliance

**Generiert:**
- `docs/security-policy.md` — Security-Policy
- `docs/compliance-matrix.md` — Compliance-Übersicht
- `docs/sla-definitions.md` — SLAs
- `docs/incident-response.md` — Incident-Response
- `docs/on-call-playbook.md` — On-Call-Playbook

**Aufgaben:**
- Security-Dokumentation
- Compliance-Nachweise
- Operative Runbooks

---

## 5. Wie man beiträgt

### Neuen Agent hinzufügen

1. Neue Datei in `/multi-agent/agents/` erstellen
2. Agent-Interface implementieren
3. In `orchestrator.js` registrieren
4. Tests hinzufügen

### Pipeline erweitern

1. Neues Skript in `/pipeline/` erstellen
2. In GitHub Workflow integrieren
3. Dokumentation aktualisieren

### Validierung hinzufügen

1. Neue Check-Funktion in `validate.js`
2. Zur Validierungs-Pipeline hinzufügen
3. Fehlermeldungen definieren

---

## 6. Regeln

### WICHTIG: Diese Regeln müssen eingehalten werden!

| Regel | Grund |
|-------|-------|
| Keine Secrets im Code | Security |
| Keine Zeitstempel | Determinismus |
| Keine Zufallswerte | Reproduzierbarkeit |
| Alphabetische Sortierung | Konsistenz |
| Fixierte Versionen | Stabilität |

### Determinismus-Checkliste

- [ ] Keine `Date.now()` oder `new Date()` in generierten Dateien
- [ ] Keine `Math.random()` oder `crypto.randomBytes()`
- [ ] Dateilisten immer alphabetisch sortieren
- [ ] JSON-Keys in konsistenter Reihenfolge
- [ ] Dependencies mit exakten Versionen

---

## 7. Testing

### Tests ausführen

```bash
# Alle Tests
npm test

# Spezifische Tests
npm test -- rateLimit

# Mit Coverage
npm test -- --coverage
```

### Test-Struktur

```
/tests
├── rateLimit.test.ts          # Rate-Limit Tests
├── stripeWebhook.test.ts      # Webhook Tests
├── middleware/
│   └── rateLimit.test.ts      # Middleware Tests
└── services/
    └── stripeEvents.test.ts   # Service Tests
```

---

## 8. CI/CD

### GitHub Actions

Jeder Push triggert automatisch:

1. **Build** — Dependencies installieren
2. **Generate** — MAS ausführen
3. **Validate** — Output prüfen
4. **Test** — Tests ausführen
5. **Security Scan** — Vulnerability-Check
6. **Publish** — Bei Success

### Workflow-Datei

`.github/workflows/generate-foundation.yml`

---

## 9. Debugging

### Häufige Probleme

| Problem | Lösung |
|---------|--------|
| `Output directory missing` | `node pipeline/run.js` ausführen |
| `Validation failed` | Logs prüfen, forbidden patterns entfernen |
| `Git push failed` | GITHUB_TOKEN prüfen |
| `Timeout` | Pipeline-Dauer erhöhen |

### Verbose-Modus

```bash
# Detaillierte Logs
DEBUG=* node pipeline/run.js

# Dry-Run für Publish
node pipeline/publish.js --dry-run
```

---

## 10. Nächste Schritte

1. **Repository klonen**
   ```bash
   git clone git@github.com:your-org/cargobit-foundation.git
   cd cargobit-foundation
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **System ausführen**
   ```bash
   node pipeline/run.js
   ```

4. **Output inspizieren**
   ```bash
   tree output
   ```

5. **Tests ausführen**
   ```bash
   npm test
   ```

---

## 11. Kontakte

| Rolle | Verantwortung |
|-------|---------------|
| Tech Lead | Architekturentscheidungen |
| DevOps | CI/CD, Infrastruktur |
| Security | Security-Reviews |
| Compliance | Compliance-Checks |

---

## 12. Ressourcen

- [Pipeline README](../pipeline/README.md)
- [System README](../README.md)
- [Security Policy](../output/docs/security-policy.md)
- [Compliance Matrix](../output/docs/compliance-matrix.md)

---

*Willkommen im Team! 🚀*
