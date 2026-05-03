# System Flow Dokumentation

> Datenfluss und Interaktionen im CargoBit Foundation Generator

---

## 1. Gesamtarchitektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CARGOBIT FOUNDATION GENERATOR                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     MULTI-AGENT SYSTEM (MAS)                       │  │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐   │  │
│  │  │ Architect │──▶│  Backend  │──▶│    SRE    │──▶│    QA     │   │  │
│  │  │   Agent   │   │   Agent   │   │   Agent   │   │   Agent   │   │  │
│  │  └───────────┘   └───────────┘   └───────────┘   └─────┬─────┘   │  │
│  │                                                        │         │  │
│  │                                          ┌─────────────▼────────┐ │  │
│  │                                          │   Compliance Agent   │ │  │
│  │                                          └──────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                          PIPELINE                                  │  │
│  │  ┌─────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐     │  │
│  │  │   Run   │──▶│ Validate  │──▶│  Assemble │──▶│  Publish  │     │  │
│  │  └─────────┘   └───────────┘   └───────────┘   └───────────┘     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                           OUTPUT                                   │  │
│  │  ┌─────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐     │  │
│  │  │  Prisma │   │    Src    │   │    Ops    │   │   Tests   │     │  │
│  │  └─────────┘   └───────────┘   └───────────┘   └───────────┘     │  │
│  │  ┌─────────┐   ┌───────────┐   ┌───────────────────────────┐     │  │
│  │  │  Docs   │   │Manifest + │   │      checksums.json       │     │  │
│  │  └─────────┘   │checksums  │   └───────────────────────────┘     │  │
│  │                └───────────┘                                       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Agent-Interaktionsfluss

```
                    START
                      │
                      ▼
┌─────────────────────────────────────┐
│        ORCHESTRATOR                 │
│  - Lädt config.json                 │
│  - Initialisiert Shared Context     │
│  - Sequenziert Agenten              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│       ARCHITECT AGENT               │
│  Output:                            │
│  ├── prisma/schema.prisma           │
│  ├── migrations/0001_init.sql       │
│  └── migrations/0002_indexes.sql    │
└──────────────┬──────────────────────┘
               │ Context: { schema, tables }
               ▼
┌─────────────────────────────────────┐
│        BACKEND AGENT                │
│  Output:                            │
│  ├── src/lib/rateLimit.ts           │
│  ├── src/middleware/rateLimit.ts    │
│  ├── src/webhooks/stripe.ts         │
│  ├── src/services/stripeEvents.ts   │
│  ├── src/services/auditLog.ts       │
│  └── src/jobs/auditVerify.ts        │
└──────────────┬──────────────────────┘
               │ Context: { services, endpoints }
               ▼
┌─────────────────────────────────────┐
│          SRE AGENT                  │
│  Output:                            │
│  ├── ops/backup-db.sh               │
│  ├── ops/restore-db.sh              │
│  ├── ops/cron-backup.yaml           │
│  └── ops/export-audit-log.ts        │
└──────────────┬──────────────────────┘
               │ Context: { scripts, schedules }
               ▼
┌─────────────────────────────────────┐
│           QA AGENT                  │
│  Output:                            │
│  ├── tests/rateLimit.test.ts        │
│  ├── tests/stripeWebhook.test.ts    │
│  └── tests/middleware/*.test.ts     │
└──────────────┬──────────────────────┘
               │ Context: { testCoverage }
               ▼
┌─────────────────────────────────────┐
│       COMPLIANCE AGENT              │
│  Output:                            │
│  ├── docs/security-policy.md        │
│  ├── docs/compliance-matrix.md      │
│  ├── docs/sla-definitions.md        │
│  ├── docs/incident-response.md      │
│  └── docs/on-call-playbook.md       │
└──────────────┬──────────────────────┘
               │
               ▼
              ENDE
```

---

## 3. Pipeline-Fluss

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PIPELINE EXECUTION                           │
└─────────────────────────────────────────────────────────────────────┘

SCHRITT 1: RUN
┌─────────────────────────────────────────────────────────────────────┐
│  node pipeline/run.js                                               │
│  ─────────────────────                                              │
│  • Führt orchestrator.js aus                                        │
│  • Spawned Child Process mit 30min Timeout                          │
│  • Captured stdout/stderr                                           │
│  • Schreibt generation.log                                          │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
SCHRITT 2: VALIDATE
┌─────────────────────────────────────────────────────────────────────┐
│  node pipeline/validate.js                                          │
│  ─────────────────────────                                          │
│  • Prüft Required Files (22+)                                       │
│  • Validiert TypeScript-Syntax                                      │
│  • Prüft SQL-Migrations                                             │
│  • Validiert Dokumentation                                          │
│  • Prüft Shell-Skripte                                              │
│  • Validiert manifest.json                                          │
│  • Exit 0 = Success, Exit 1 = Failed                                │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
SCHRITT 3: ASSEMBLE
┌─────────────────────────────────────────────────────────────────────┐
│  node pipeline/assemble.js                                          │
│  ─────────────────────────                                          │
│  • Erstellt dist/ Verzeichnis                                       │
│  • Kopiert alle generierten Dateien                                 │
│  • Generiert package.json, tsconfig.json                            │
│  • Erstellt README.md, RELEASE_NOTES.md                             │
│  • Generiert release-manifest.json                                  │
│  • Erstellt .tar.gz Tarball                                         │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
SCHRITT 4: PUBLISH
┌─────────────────────────────────────────────────────────────────────┐
│  node pipeline/publish.js                                           │
│  ──────────────────────                                             │
│  • Prüft Prerequisites                                              │
│  • Git: commit + tag + push                                         │
│  • S3: Upload Tarball (optional)                                    │
│  • npm: Publish Package (optional)                                  │
│  • GitHub: Create Release (optional)                                │
│  • Slack: Send Notification (optional)                              │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
             ENDE
```

---

## 4. GitHub Actions Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GITHUB ACTIONS TRIGGER                            │
│  • push to main                                                     │
│  • workflow_dispatch (manuell)                                      │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         JOB: GENERATE                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Checkout Repository                                          │  │
│  │  Setup Node.js 20                                             │  │
│  │  Install Dependencies (npm ci)                                │  │
│  │  Run MAS (node pipeline/run.js)                               │  │
│  │  Validate Output (node pipeline/validate.js)                  │  │
│  │  Assemble Artifacts (node pipeline/assemble.js)               │  │
│  │  Upload Artifacts (actions/upload-artifact@v4)                │  │
│  │  Publish (node pipeline/publish.js)                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           JOB: TEST                                  │
│  Services: PostgreSQL 15, Redis 7                                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Download Artifacts                                            │  │
│  │  Install Dependencies                                          │  │
│  │  Run Tests (npm test)                                          │  │
│  │  Upload Coverage (codecov)                                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      JOB: SECURITY SCAN                              │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Trivy Vulnerability Scan                                      │  │
│  │  Upload SARIF to GitHub Security                               │  │
│  │  npm audit                                                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
             ERFOLG
```

---

## 5. Datenfluss im Detail

### Architect Agent → Backend Agent

```javascript
// Shared Context nach Architect Agent
{
  schema: {
    models: ['User', 'Payment', 'AuditLog', 'WebhookEvent'],
    relations: {
      User: { hasMany: ['Payment', 'AuditLog'] },
      Payment: { belongsTo: ['User'], hasMany: ['WebhookEvent'] }
    }
  },
  migrations: ['0001_init.sql', '0002_indexes.sql'],
  tables: ['users', 'payments', 'audit_logs', 'webhook_events']
}
```

### Backend Agent → SRE Agent

```javascript
// Shared Context nach Backend Agent
{
  services: ['rateLimit', 'stripeEvents', 'auditLog'],
  endpoints: [
    { path: '/webhooks/stripe', method: 'POST' },
    { path: '/api/audit', method: 'GET' }
  ],
  dependencies: {
    redis: { required: true },
    postgresql: { required: true },
    stripe: { required: true }
  }
}
```

### SRE Agent → QA Agent

```javascript
// Shared Context nach SRE Agent
{
  scripts: ['backup-db.sh', 'restore-db.sh'],
  schedules: ['cron-backup.yaml'],
  exports: ['export-audit-log.ts']
}
```

### QA Agent → Compliance Agent

```javascript
// Shared Context nach QA Agent
{
  testCoverage: {
    rateLimit: '95%',
    stripeWebhook: '92%',
    auditLog: '88%'
  },
  testFiles: 12,
  integrationTests: 3
}
```

---

## 6. Validierungs-Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     VALIDATION ENGINE                                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Struktur-Check │────▶│ TypeScript-Check│────▶│   SQL-Check     │
│                 │     │                 │     │                 │
│ • RequiredDirs  │     │ • Syntax        │     │ • CREATE        │
│ • RequiredFiles │     │ • Imports       │     │ • No DROP DB    │
│ • FileCount     │     │ • Exports       │     │ • No TRUNCATE   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Docs-Check    │────▶│ Manifest-Check  │────▶│   Final-Status  │
│                 │     │                 │     │                 │
│ • Title         │     │ • JSON valid    │     │ ✅ PASSED       │
│ • MinLength     │     │ • RequiredKeys  │     │ ❌ FAILED       │
│ • NoEmptySpace  │     │ • Files array   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 7. Output-Struktur nach Generierung

```
/output
├── prisma/
│   └── schema.prisma           # Generiert von Architect Agent
│
├── migrations/
│   ├── 0001_init.sql           # Generiert von Architect Agent
│   └── 0002_indexes.sql        # Generiert von Architect Agent
│
├── src/
│   ├── lib/
│   │   └── rateLimit.ts        # Generiert von Backend Agent
│   ├── middleware/
│   │   └── rateLimit.ts        # Generiert von Backend Agent
│   ├── webhooks/
│   │   └── stripe.ts           # Generiert von Backend Agent
│   ├── services/
│   │   ├── stripeEvents.ts     # Generiert von Backend Agent
│   │   └── auditLog.ts         # Generiert von Backend Agent
│   └── jobs/
│       └── auditVerify.ts      # Generiert von Backend Agent
│
├── ops/
│   ├── backup-db.sh            # Generiert von SRE Agent
│   ├── restore-db.sh           # Generiert von SRE Agent
│   ├── cron-backup.yaml        # Generiert von SRE Agent
│   └── export-audit-log.ts     # Generiert von SRE Agent
│
├── tests/
│   ├── rateLimit.test.ts       # Generiert von QA Agent
│   ├── stripeWebhook.test.ts   # Generiert von QA Agent
│   └── middleware/
│       └── rateLimit.test.ts   # Generiert von QA Agent
│
├── docs/
│   ├── security-policy.md      # Generiert von Compliance Agent
│   ├── compliance-matrix.md    # Generiert von Compliance Agent
│   ├── sla-definitions.md      # Generiert von Compliance Agent
│   ├── incident-response.md    # Generiert von Compliance Agent
│   └── on-call-playbook.md     # Generiert von Compliance Agent
│
├── manifest.json               # Generiert von Pipeline
├── checksums.json              # Generiert von Pipeline
└── README.md                   # Generiert von Pipeline
```

---

## 8. Fehlerbehandlungs-Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING                                    │
└─────────────────────────────────────────────────────────────────────┘

FEHLER IN RUN
┌─────────────────────────────────────────────────────────────────────┐
│  Mögliche Ursachen:                                                 │
│  • orchestrator.js nicht gefunden                                   │
│  • Agent wirft Exception                                            │
│  • Timeout (> 30 Minuten)                                           │
│                                                                      │
│  Behandlung:                                                         │
│  • Logs schreiben nach generation.log                               │
│  • Exit Code 1                                                       │
│  • CI bricht ab                                                      │
└─────────────────────────────────────────────────────────────────────┘

FEHLER IN VALIDATE
┌─────────────────────────────────────────────────────────────────────┐
│  Mögliche Ursachen:                                                 │
│  • Required files fehlen                                            │
│  • Forbidden patterns (TODO, FIXME)                                 │
│  • Invalid JSON in manifest                                         │
│                                                                      │
│  Behandlung:                                                         │
│  • Detaillierte Fehlerausgabe                                       │
│  • Exit Code 1                                                       │
│  • CI bricht ab                                                      │
└─────────────────────────────────────────────────────────────────────┘

FEHLER IN PUBLISH
┌─────────────────────────────────────────────────────────────────────┐
│  Mögliche Ursachen:                                                 │
│  • GITHUB_TOKEN fehlt oder ungültig                                 │
│  • Git remote nicht konfiguriert                                    │
│  • AWS credentials fehlen                                           │
│                                                                      │
│  Behandlung:                                                         │
│  • Fallback zu --dry-run Modus                                      │
│  • Warnung ausgeben                                                  │
│  • Exit Code 0 (bei optionalen Publish-Zielen)                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Compliance-Integration

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPLIANCE MAPPING                                │
└─────────────────────────────────────────────────────────────────────┘

PCI-DSS SAQ-A
┌─────────────────────────────────────────────────────────────────────┐
│  Anforderung              │ Erfüllung durch                          │
│  ─────────────────────────┼─────────────────────────────────────────│
│  Keine Kartendaten        │ Stripe-Integration outsourced           │
│  Webhook-Sicherheit       │ Signature verification in stripe.ts      │
│  Audit-Logging            │ auditLog.ts + hash chain                │
│  Access Control           │ Rate limiting in rateLimit.ts           │
└─────────────────────────────────────────────────────────────────────┘

GDPR
┌─────────────────────────────────────────────────────────────────────┐
│  Anforderung              │ Erfüllung durch                          │
│  ─────────────────────────┼─────────────────────────────────────────│
│  Datenminimierung         │ Schema design in schema.prisma          │
│  Auskunftsrecht           │ export-audit-log.ts                      │
│  Löschrecht               │ Backup/Restore scripts                   │
│  Verarbeitungsnachweis    │ Audit logging + hash chain               │
└─────────────────────────────────────────────────────────────────────┘

SOC2-Type2
┌─────────────────────────────────────────────────────────────────────┐
│  Anforderung              │ Erfüllung durch                          │
│  ─────────────────────────┼─────────────────────────────────────────│
│  Change Management        │ GitHub Actions + PR Workflow             │
│  Monitoring               │ Ops scripts + schedules                  │
│  Incident Response        │ incident-response.md playbook            │
│  Access Control           │ Role-based rate limiting                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

*Generiert von CargoBit Multi-Agent System*
