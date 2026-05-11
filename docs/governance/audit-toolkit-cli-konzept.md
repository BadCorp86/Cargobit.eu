# CargoBit Audit Toolkit CLI-Konzept

**Dokument-Typ:** Technische CLI-Spezifikation  
**Version:** 1.0.0  
**Status:** Final  
**Letzte Aktualisierung:** 2024-01-15  
**Verantwortlich:** Platform Team  

---

## Inhaltsverzeichnis

1. [CLI-Übersicht](#1-cli-übersicht)
2. [Installation und Setup](#2-installation-und-setup)
3. [Globale Optionen](#3-globale-optionen)
4. [Security-Befehle](#4-security-befehle)
5. [Data Integrity-Befehle](#5-data-integrity-befehle)
6. [Determinism-Befehle](#6-determinism-befehle)
7. [Compliance-Befehle](#7-compliance-befehle)
8. [Operations-Befehle](#8-operations-befehle)
9. [Report-Befehle](#9-report-befehle)
10. [CI/CD Integration](#10-cicd-integration)
11. [Exit Codes und Error Handling](#11-exit-codes-und-error-handling)

---

## 1. CLI-Übersicht

### 1.1 Name und Version

```
Tool Name:    cargobit-audit
Version:      1.0.0
Package:      @cargobit/audit-toolkit
Repository:   github.com/cargobit/audit-toolkit
```

### 1.2 Zweck

Das `cargobit-audit` CLI-Tool ermöglicht automatisierte Audits des CargoBit-Systems in den Bereichen:

- Security (Sicherheit)
- Data Integrity (Datenintegrität)
- Determinism (Determinismus)
- Compliance (Compliance)
- Operations (Betrieb)

### 1.3 Architektur

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           cargobit-audit CLI                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  security   │  │    data     │  │determinism  │  │ compliance  │        │
│  │   <cmd>     │  │   <cmd>     │  │   <cmd>     │  │   <cmd>     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │    ops      │  │   report    │  │   config    │                         │
│  │   <cmd>     │  │   <cmd>     │  │   <cmd>     │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                          Core Services                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │   Logger    │  │   Config    │  │   Output    │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Installation und Setup

### 2.1 Installation

```bash
# Via npm
npm install -g @cargobit/audit-toolkit

# Via yarn
yarn global add @cargobit/audit-toolkit

# Via Homebrew (macOS)
brew tap cargobit/tools
brew install cargobit-audit

# Via Docker
docker pull cargobit/audit-toolkit:latest
docker run --rm cargobit/audit-toolkit --help
```

### 2.2 Erstkonfiguration

```bash
# Initialisierung
cargobit-audit init

# Konfigurationsdatei erstellen
cargobit-audit config create

# API-Key setzen
cargobit-audit config set api_key sk_live_xxx

# Umgebung setzen
cargobit-audit config set environment production
```

### 2.3 Konfigurationsdatei

```yaml
# ~/.cargobit-audit/config.yaml

version: "1.0"

api:
  base_url: "https://api.cargobit.io"
  api_key: "${CARGOBIT_API_KEY}"
  timeout: 30000

environment: production

modules:
  security:
    enabled: true
  data_integrity:
    enabled: true
  determinism:
    enabled: true
  compliance:
    enabled: true
  operations:
    enabled: true

output:
  format: json
  directory: ./reports
  retention_days: 90

notifications:
  slack:
    enabled: false
    webhook_url: ""
  email:
    enabled: false
    recipients: []
```

---

## 3. Globale Optionen

### 3.1 Hilfe und Version

```bash
# Hilfe anzeigen
cargobit-audit --help
cargobit-audit -h
cargobit-audit <command> --help

# Version anzeigen
cargobit-audit --version
cargobit-audit -v
```

### 3.2 Globale Flags

```bash
cargobit-audit [command] [options]

Options:
  -c, --config <path>      Path to config file (default: ~/.cargobit-audit/config.yaml)
  -e, --environment <env>  Environment: development, staging, production
  -o, --output <format>    Output format: json, yaml, table, markdown
  -q, --quiet              Suppress non-essential output
  -v, --verbose            Enable verbose logging
  --no-color               Disable colored output
  --dry-run                Run without making changes
```

### 3.3 Umgebungsvariablen

| Variable | Beschreibung | Default |
|----------|--------------|---------|
| `CARGOBIT_API_KEY` | API-Key für Authentifizierung | - |
| `CARGOBIT_API_URL` | API Base URL | `https://api.cargobit.io` |
| `CARGOBIT_ENV` | Umgebung | `production` |
| `CARGOBIT_CONFIG` | Pfad zur Konfiguration | `~/.cargobit-audit/config.yaml` |
| `CARGOBIT_OUTPUT` | Output-Format | `json` |

---

## 4. Security-Befehle

### 4.1 Übersicht

```bash
cargobit-audit security <subcommand> [options]

Subcommands:
  signatures    Validate webhook signatures
  ratelimits    Check rate limit configuration
  secrets       Scan for exposed secrets
  rbac          Validate RBAC configuration
  all           Run all security checks
```

### 4.2 signatures - Webhook-Signaturen validieren

```bash
cargobit-audit security signatures [options]

Options:
  --verify-timestamp    Verify timestamp for replay protection
  --max-age <seconds>   Maximum age for timestamps (default: 300)
  --algorithm <algo>    Signature algorithm (default: sha256)
  --sample-size <n>     Number of webhooks to sample (default: 100)

Examples:
  # Basic signature validation
  cargobit-audit security signatures

  # With timestamp verification
  cargobit-audit security signatures --verify-timestamp --max-age 600

  # Sample last 1000 webhooks
  cargobit-audit security signatures --sample-size 1000
```

**Output:**
```json
{
  "module": "security",
  "check": "webhook_signatures",
  "status": "PASS",
  "timestamp": "2024-01-15T10:30:00Z",
  "duration_ms": 1250,
  "metrics": {
    "total_webhooks": 1000,
    "valid_signatures": 1000,
    "invalid_signatures": 0,
    "expired_timestamps": 0
  },
  "findings": []
}
```

### 4.3 ratelimits - Rate-Limit-Konfiguration prüfen

```bash
cargobit-audit security ratelimits [options]

Options:
  --check-headers       Verify rate limit headers are set correctly
  --test-burst          Test burst handling
  --endpoints <list>    Specific endpoints to check (comma-separated)

Examples:
  # Check all rate limits
  cargobit-audit security ratelimits

  # Check specific endpoints
  cargobit-audit security ratelimits --endpoints "/payments,/wallets"

  # Test burst handling
  cargobit-audit security ratelimits --test-burst
```

### 4.4 secrets - Secrets-Exposure scannen

```bash
cargobit-audit security secrets [options]

Options:
  --scan-logs           Scan recent logs for secrets
  --scan-git            Scan git history for committed secrets
  --scan-env            Scan environment files (.env, .env.local, etc.)
  --severity <level>    Minimum severity to report: low, medium, high, critical

Examples:
  # Scan logs for secrets
  cargobit-audit security secrets --scan-logs

  # Full scan
  cargobit-audit security secrets --scan-logs --scan-git --scan-env

  # Only critical findings
  cargobit-audit security secrets --severity critical
```

### 4.5 rbac - RBAC-Konfiguration validieren

```bash
cargobit-audit security rbac [options]

Options:
  --check-hierarchy     Validate role hierarchy
  --detect-cycles       Detect circular permission dependencies
  --verify-users        Verify user role assignments

Examples:
  # Full RBAC audit
  cargobit-audit security rbac --check-hierarchy --detect-cycles --verify-users
```

---

## 5. Data Integrity-Befehle

### 5.1 Übersicht

```bash
cargobit-audit data <subcommand> [options]

Subcommands:
  ledger        Check ledger consistency
  referential   Validate referential integrity
  schema        Check for schema drift
  migrations    Analyze migration safety
  all           Run all data integrity checks
```

### 5.2 ledger - Ledger-Konsistenz prüfen

```bash
cargobit-audit data ledger [options]

Options:
  --verify-balances     Verify all wallet balances match ledger
  --check-chain         Verify transaction chain integrity
  --detect-duplicates   Check for duplicate entries
  --sample-size <n>     Number of wallets to sample (default: all)
  --parallel <n>        Number of parallel workers (default: 4)

Examples:
  # Full ledger audit
  cargobit-audit data ledger --verify-balances --check-chain

  # Sample 1000 wallets
  cargobit-audit data ledger --sample-size 1000

  # Parallel processing with 8 workers
  cargobit-audit data ledger --parallel 8
```

**Output:**
```json
{
  "module": "data_integrity",
  "check": "ledger_consistency",
  "status": "PASS",
  "timestamp": "2024-01-15T10:30:00Z",
  "duration_ms": 45000,
  "metrics": {
    "total_wallets": 5000,
    "total_transactions": 125000,
    "balance_discrepancies": 0,
    "chain_breaks": 0,
    "duplicates": 0
  },
  "findings": []
}
```

### 5.3 referential - Referenzielle Integrität validieren

```bash
cargobit-audit data referential [options]

Options:
  --find-orphans        Find orphaned records
  --check-foreign-keys  Validate all foreign key constraints
  --tables <list>       Specific tables to check

Examples:
  # Find all orphaned records
  cargobit-audit data referential --find-orphans

  # Check specific tables
  cargobit-audit data referential --tables "payments,wallets,webhooks"
```

### 5.4 schema - Schema-Drift erkennen

```bash
cargobit-audit data schema [options]

Options:
  --compare-prisma     Compare database with Prisma schema
  --check-migrations   Verify all migrations are applied
  --detect-changes     Detect untracked schema changes

Examples:
  # Compare with Prisma schema
  cargobit-audit data schema --compare-prisma

  # Full schema audit
  cargobit-audit data schema --compare-prisma --check-migrations --detect-changes
```

### 5.5 migrations - Migration-Sicherheit analysieren

```bash
cargobit-audit data migrations [options]

Options:
  --analyze-pending     Analyze pending migrations for risks
  --estimate-duration   Estimate migration duration
  --check-rollback      Verify rollback is possible

Examples:
  # Analyze pending migrations
  cargobit-audit data migrations --analyze-pending

  # Full migration safety audit
  cargobit-audit data migrations --analyze-pending --estimate-duration --check-rollback
```

---

## 6. Determinism-Befehle

### 6.1 Übersicht

```bash
cargobit-audit determinism <subcommand> [options]

Subcommands:
  compare       Compare outputs for identical inputs
  manifest      Validate output manifests
  checksums     Verify checksums
  patterns      Detect non-deterministic patterns
  all           Run all determinism checks
```

### 6.2 compare - Outputs vergleichen

```bash
cargobit-audit determinism compare <input1> <input2> [options]

Arguments:
  input1         Path to first output directory
  input2         Path to second output directory

Options:
  --strict           Fail on any difference
  --ignore <fields>  Fields to ignore in comparison
  --runs <n>         Number of runs to compare (default: 2)

Examples:
  # Compare two output directories
  cargobit-audit determinism compare ./output1 ./output2

  # Strict comparison
  cargobit-audit determinism compare ./output1 ./output2 --strict

  # Compare 10 runs
  cargobit-audit determinism compare ./baseline ./output --runs 10
```

### 6.3 manifest - Manifeste validieren

```bash
cargobit-audit determinism manifest [options]

Options:
  --verify-checksums    Verify all checksums in manifests
  --check-references    Validate internal references
  --validate-format     Check manifest format compliance

Examples:
  # Validate all manifests
  cargobit-audit determinism manifest --verify-checksums --check-references
```

### 6.4 checksums - Checksums verifizieren

```bash
cargobit-audit determinism checksums [options]

Options:
  --algorithm <algo>    Checksum algorithm: sha256, sha512 (default: sha256)
  --verify-stored       Compare with stored checksums
  --directory <path>    Directory to scan

Examples:
  # Verify all stored checksums
  cargobit-audit determinism checksums --verify-stored

  # Generate checksums for directory
  cargobit-audit determinism checksums --directory ./data
```

### 6.5 patterns - Nicht-deterministische Patterns erkennen

```bash
cargobit-audit determinism patterns [options]

Options:
  --scan-source        Scan source code for non-deterministic patterns
  --detect-random      Detect random number usage
  --detect-time        Detect time-based logic
  --detect-external    Detect external API calls

Examples:
  # Full pattern scan
  cargobit-audit determinism patterns --scan-source --detect-random --detect-time
```

---

## 7. Compliance-Befehle

### 7.1 Übersicht

```bash
cargobit-audit compliance <subcommand> [options]

Subcommands:
  gdpr          Check GDPR compliance
  retention     Validate retention policies
  documentation Check documentation completeness
  audit-logs    Verify audit log integrity
  sla           Check SLA compliance
  all           Run all compliance checks
```

### 7.2 gdpr - GDPR-Compliance prüfen

```bash
cargobit-audit compliance gdpr [options]

Options:
  --check-categories    Verify data category compliance
  --verify-deletion     Check data deletion procedures
  --audit-consent       Audit consent tracking
  --check-rights        Verify data subject rights implementation

Examples:
  # Full GDPR audit
  cargobit-audit compliance gdpr --check-categories --verify-deletion --audit-consent

  # Check data subject rights
  cargobit-audit compliance gdpr --check-rights
```

### 7.3 retention - Retention-Policies validieren

```bash
cargobit-audit compliance retention [options]

Options:
  --check-policies      Verify retention policies are defined
  --verify-enforcement  Check automatic enforcement
  --detect-violations   Find data exceeding retention periods

Examples:
  # Full retention audit
  cargobit-audit compliance retention --check-policies --verify-enforcement --detect-violations
```

### 7.4 documentation - Dokumentations-Vollständigkeit

```bash
cargobit-audit compliance documentation [options]

Options:
  --check-api-docs      Verify API documentation completeness
  --verify-policies     Check policy documentation
  --validate-runbooks   Verify runbook availability
  --required <list>     Required documentation types

Examples:
  # Check all documentation
  cargobit-audit compliance documentation --check-api-docs --verify-policies --validate-runbooks
```

### 7.5 audit-logs - Audit-Log-Integrität

```bash
cargobit-audit compliance audit-logs [options]

Options:
  --verify-integrity    Verify log integrity (hash chains)
  --check-sequence      Check for sequence gaps
  --detect-gaps         Find missing entries
  --period <days>       Time period to check (default: 30)

Examples:
  # Verify last 30 days of audit logs
  cargobit-audit compliance audit-logs --verify-integrity --period 30
```

### 7.6 sla - SLA-Compliance prüfen

```bash
cargobit-audit compliance sla [options]

Options:
  --period <days>       Time period to check (default: 30)
  --check-uptime        Verify uptime SLA
  --check-response      Check response time SLA
  --check-incidents     Verify incident response SLA

Examples:
  # Check all SLA metrics for last 30 days
  cargobit-audit compliance sla --period 30 --check-uptime --check-response
```

---

## 8. Operations-Befehle

### 8.1 Übersicht

```bash
cargobit-audit ops <subcommand> [options]

Subcommands:
  backups       Check backup integrity
  restore       Test restore procedures
  cronjobs      Validate cron job health
  monitoring    Check monitoring coverage
  all           Run all operations checks
```

### 8.2 backups - Backup-Integrität prüfen

```bash
cargobit-audit ops backups [options]

Options:
  --verify-integrity    Verify backup file integrity
  --check-encryption    Verify encryption status
  --test-restore        Simulate restore (dry-run)
  --check-schedule      Verify backup schedule

Examples:
  # Full backup audit
  cargobit-audit ops backups --verify-integrity --check-encryption --check-schedule

  # Test restore capability
  cargobit-audit ops backups --test-restore
```

### 8.3 restore - Restore-Prozeduren testen

```bash
cargobit-audit ops restore [options]

Options:
  --type <type>        Restore type: full, partial, point-in-time
  --target <env>       Target environment for test restore
  --dry-run            Simulate restore without executing
  --verify-data        Verify data integrity after restore

Examples:
  # Dry-run full restore
  cargobit-audit ops restore --type full --dry-run

  # Point-in-time restore test
  cargobit-audit ops restore --type point-in-time --dry-run
```

### 8.4 cronjobs - CronJob-Gesundheit prüfen

```bash
cargobit-audit ops cronjobs [options]

Options:
  --check-schedules     Verify cron schedules
  --check-last-runs     Check last execution status
  --check-errors        Analyze error rates
  --check-timeouts      Verify timeout configurations

Examples:
  # Full cron job audit
  cargobit-audit ops cronjobs --check-schedules --check-last-runs --check-errors
```

### 8.5 monitoring - Monitoring-Abdeckung prüfen

```bash
cargobit-audit ops monitoring [options]

Options:
  --analyze-coverage    Check service coverage
  --check-alerts        Verify alert configuration
  --verify-slos         Check SLO definitions
  --check-dashboards    Verify dashboard completeness

Examples:
  # Full monitoring audit
  cargobit-audit ops monitoring --analyze-coverage --check-alerts --verify-slos
```

---

## 9. Report-Befehle

### 9.1 Übersicht

```bash
cargobit-audit report <subcommand> [options]

Subcommands:
  generate      Generate a new report
  show          Display latest report
  list          List available reports
  export        Export report to file
  compare       Compare multiple reports
```

### 9.2 generate - Report generieren

```bash
cargobit-audit report generate [options]

Options:
  --modules <list>     Modules to include (default: all)
  --format <fmt>       Output format: json, yaml, html, pdf, markdown
  --output <path>      Output file path
  --template <name>    Report template to use

Examples:
  # Generate full report
  cargobit-audit report generate --format html --output ./reports/audit.html

  # Generate security-only report
  cargobit-audit report generate --modules security --format pdf
```

### 9.3 show - Report anzeigen

```bash
cargobit-audit report show [options]

Options:
  --last               Show latest report
  --id <report-id>     Show specific report by ID
  --format <fmt>       Display format

Examples:
  # Show latest report
  cargobit-audit report show --last

  # Show specific report
  cargobit-audit report show --id AUDIT-2024-001
```

### 9.4 list - Reports auflisten

```bash
cargobit-audit report list [options]

Options:
  --from <date>        Start date (YYYY-MM-DD)
  --to <date>          End date (YYYY-MM-DD)
  --module <name>      Filter by module
  --status <status>    Filter by status: pass, fail, warning

Examples:
  # List all reports
  cargobit-audit report list

  # List reports from January 2024
  cargobit-audit report list --from 2024-01-01 --to 2024-01-31
```

### 9.5 export - Report exportieren

```bash
cargobit-audit report export <report-id> [options]

Arguments:
  report-id            ID of the report to export

Options:
  --format <fmt>       Export format: json, yaml, html, pdf, markdown
  --output <path>      Output file path

Examples:
  # Export to PDF
  cargobit-audit report export AUDIT-2024-001 --format pdf --output ./audit-report.pdf
```

---

## 10. CI/CD Integration

### 10.1 GitHub Actions

```yaml
# .github/workflows/audit.yml
name: CargoBit Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install Audit Toolkit
        run: npm install -g @cargobit/audit-toolkit
      
      - name: Run Security Audit
        run: |
          cargobit-audit security all \
            --output json \
            --fail-on critical
      
      - name: Run Data Integrity Audit
        run: |
          cargobit-audit data all \
            --output json \
            --fail-on high
      
      - name: Generate Report
        if: always()
        run: |
          cargobit-audit report generate \
            --format html \
            --output ./reports/audit.html
      
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: audit-report
          path: ./reports/
```

### 10.2 GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - audit

audit:security:
  stage: audit
  image: node:20
  script:
    - npm install -g @cargobit/audit-toolkit
    - cargobit-audit security all --fail-on critical
  only:
    - main
    - merge_requests

audit:data:
  stage: audit
  image: node:20
  script:
    - npm install -g @cargobit/audit-toolkit
    - cargobit-audit data ledger --verify-balances
  only:
    - main

audit:compliance:
  stage: audit
  image: node:20
  script:
    - npm install -g @cargobit/audit-toolkit
    - cargobit-audit compliance all
  only:
    - schedules
```

### 10.3 Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
  agent any
  
  stages {
    stage('Audit') {
      parallel {
        stage('Security') {
          steps {
            sh 'npm install -g @cargobit/audit-toolkit'
            sh 'cargobit-audit security all --fail-on critical'
          }
        }
        stage('Data Integrity') {
          steps {
            sh 'cargobit-audit data ledger --verify-balances'
          }
        }
        stage('Compliance') {
          steps {
            sh 'cargobit-audit compliance all'
          }
        }
      }
    }
    
    stage('Report') {
      steps {
        sh 'cargobit-audit report generate --format html --output reports/audit.html'
        archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
      }
    }
  }
  
  post {
    failure {
      slackSend message: "Audit failed: ${env.BUILD_URL}"
    }
  }
}
```

---

## 11. Exit Codes und Error Handling

### 11.1 Exit Codes

| Code | Bedeutung | Beschreibung |
|------|-----------|--------------|
| 0 | SUCCESS | Alle Checks bestanden |
| 1 | WARNING | Warnungen gefunden, keine kritischen Fehler |
| 2 | ERROR | Fehler gefunden |
| 3 | CRITICAL | Kritische Fehler gefunden |
| 4 | CONFIG_ERROR | Konfigurationsfehler |
| 5 | AUTH_ERROR | Authentifizierungsfehler |
| 6 | NETWORK_ERROR | Netzwerkfehler |
| 7 | TIMEOUT_ERROR | Timeout |
| 8 | UNKNOWN_ERROR | Unbekannter Fehler |

### 11.2 Error Output

```json
{
  "error": {
    "code": "AUTH_ERROR",
    "message": "Invalid API key",
    "details": {
      "api_key_prefix": "sk_test_***",
      "reason": "key_expired"
    },
    "suggestion": "Generate a new API key in the dashboard"
  }
}
```

### 11.3 Retry Logic

```bash
# Enable automatic retry
cargobit-audit security all --retry 3 --retry-delay 5000

# Retry on specific errors
cargobit-audit security all --retry 3 --retry-on NETWORK_ERROR,TIMEOUT_ERROR
```

---

## Anhang

### A. Komplette Befehlsreferenz

```bash
# Global
cargobit-audit --help
cargobit-audit --version
cargobit-audit init
cargobit-audit config <subcommand>
cargobit-audit run --all

# Security
cargobit-audit security signatures
cargobit-audit security ratelimits
cargobit-audit security secrets
cargobit-audit security rbac
cargobit-audit security all

# Data Integrity
cargobit-audit data ledger
cargobit-audit data referential
cargobit-audit data schema
cargobit-audit data migrations
cargobit-audit data all

# Determinism
cargobit-audit determinism compare <dir1> <dir2>
cargobit-audit determinism manifest
cargobit-audit determinism checksums
cargobit-audit determinism patterns
cargobit-audit determinism all

# Compliance
cargobit-audit compliance gdpr
cargobit-audit compliance retention
cargobit-audit compliance documentation
cargobit-audit compliance audit-logs
cargobit-audit compliance sla
cargobit-audit compliance all

# Operations
cargobit-audit ops backups
cargobit-audit ops restore
cargobit-audit ops cronjobs
cargobit-audit ops monitoring
cargobit-audit ops all

# Reports
cargobit-audit report generate
cargobit-audit report show
cargobit-audit report list
cargobit-audit report export <id>
cargobit-audit report compare <id1> <id2>
```

### B. Output-Formate

| Format | Beschreibung | Verwendung |
|--------|--------------|------------|
| json | JSON-Objekt | Machine parsing, CI/CD |
| yaml | YAML-Dokument | Human-readable config |
| table | ASCII-Tabelle | Terminal output |
| markdown | Markdown-Format | Documentation |
| html | HTML-Report | Browser viewing |
| pdf | PDF-Report | Archives, Audits |

### C. Konfiguration-Referenz

```yaml
# Full configuration reference
version: "1.0"

api:
  base_url: string
  api_key: string
  timeout: number

environment: development | staging | production

modules:
  security:
    enabled: boolean
    checks:
      signatures: { enabled: boolean, options: {} }
      ratelimits: { enabled: boolean, options: {} }
      secrets: { enabled: boolean, options: {} }
      rbac: { enabled: boolean, options: {} }
  data_integrity:
    enabled: boolean
    checks: { ... }
  determinism:
    enabled: boolean
    checks: { ... }
  compliance:
    enabled: boolean
    checks: { ... }
  operations:
    enabled: boolean
    checks: { ... }

output:
  format: json | yaml | table | markdown | html | pdf
  directory: string
  retention_days: number
  filename_pattern: string

notifications:
  slack:
    enabled: boolean
    webhook_url: string
    channel: string
    on_severity: [critical, high, medium, low]
  email:
    enabled: boolean
    recipients: [string]
    on_severity: [critical, high]

logging:
  level: debug | info | warn | error
  file: string
```

---

**Dokument-Ende**

*Das Audit Toolkit CLI ist ein zentrales Werkzeug für die CargoBit-Systemüberwachung. Bei Fragen wende dich an das Platform Team.*
