# ISO-27001 Audit-Simulation-Interview

> **CargoBit Transport Platform** — Realistische Audit-Simulation für Stage-1/Stage-2 Audits
>
> *Audit-tauglich, praxisnah, ohne operative Angriffstechniken*

---

## Übersicht

Dieses Dokument simuliert ein echtes ISO-27001 Zertifizierungsaudit. Es enthält:

- **Rollenverteilung** für das Audit-Interview
- **Vollständigen Fragenkatalog** mit 10 Themenbereichen
- **Bewertungslogik** — wie Auditoren denken und bewerten
- **Antwort-Vorlagen** für CargoBit-spezifische Kontexte

---

## AB.1 Rollen im Interview

### Teilnehmer und Verantwortlichkeiten

| Rolle | Verantwortung | Typische Fragen |
|-------|---------------|-----------------|
| **Auditor** | Stellt Fragen, prüft Nachweise, bewertet Konformität | Alle Fragen des Katalogs |
| **CISO / Security Lead** | Strategische Antworten, Policy-Ownership, Risiko-Management | ISMS, Governance, Compliance |
| **Platform Lead** | Technische Antworten, Architektur, Operations | Access Control, Cryptography, Infrastructure |
| **Compliance Lead** | Prozesse & Evidence, Dokumentation, Audit-Trail | Policies, Evidence, Reporting |

### Rollen-Definitionen

#### CISO / Security Lead
- **Ownership**: Security Policies, Risk Register, Security Strategy
- **Nachweise**: Policy-Dokumente, Risk-Assessment-Reports, Management-Reviews
- **Typische Antwort-Tiefe**: Strategisch, risikobasiert, business-aligned

#### Platform Lead
- **Ownership**: Technical Controls, Infrastructure, DevSecOps
- **Nachweise**: Architecture-Diagrams, Config-Files, Logs, Monitoring-Dashboards
- **Typische Antwort-Tiefe**: Technisch, implementierungsorientiert, operational

#### Compliance Lead
- **Ownership**: Documentation, Evidence-Collection, Audit-Preparation
- **Nachweise**: Process-Descriptions, Evidence-Folders, Control-Mappings
- **Typische Antwort-Tiefe**: Prozedural, dokumentiert, nachvollziehbar

---

## AB.2 Fragenkatalog

### 1. Information Security Management System (ISMS)

#### Frage 1.1: Geltungsbereich des ISMS
> **Auditor**: *"Können Sie den Geltungsbereich Ihres ISMS beschreiben?"*

**Erwartete Antwort-Elemente:**
- Klare Definition der in-scope Systeme
- Abgrenzung zu out-of-scope Komponenten
- Begründung der Scope-Wahl

**CargoBit-spezifische Antwort:**
```
Unser ISMS umfasst die CargoBit Transport-Plattform mit folgenden Komponenten:

IN-SCOPE:
├── Microservices
│   ├── Pricing Service
│   ├── Matching Service
│   ├── Gateway Service
│   └── Identity Provider (Keycloak)
├── Infrastructure
│   ├── Kubernetes Cluster (Production)
│   ├── PostgreSQL Databases (Primary/Replica)
│   ├── Kafka Event Streaming
│   └── Redis Cache
└── Supporting Systems
    ├── CI/CD Pipeline (GitLab CI)
    ├── Monitoring (Prometheus/Grafana)
    └── Secrets Management (HashiCorp Vault)

OUT-OF-SCOPE:
├── Development/Testing Environments
├── Employee Endpoints (separate ISMS)
└── Third-Party SaaS (covered by Supplier Security)

Begründung: Der Scope deckt alle geschäftskritischen Systeme ab, die
Transportdaten und Preisinformationen verarbeiten.
```

**Nachweise:**
- [ ] ISMS Scope Statement Dokument
- [ ] System-Landscape-Diagram
- [ ] Network-Segmentation-Diagram

---

#### Frage 1.2: Policy-Überprüfung
> **Auditor**: *"Wie stellen Sie sicher, dass Policies jährlich überprüft werden?"*

**Erwartete Antwort-Elemente:**
- Definierter Review-Zyklus
- Verantwortlichkeiten
- Dokumentierte Nachweise

**CargoBit-spezifische Antwort:**
```
Policy-Review-Prozess:

1. JAHRWESENTLICHER REVIEW-CYCLE
   ├── Q1: Information Security Policy (Owner: CISO)
   ├── Q2: Access Control & Cryptography Policies (Owner: Platform Lead)
   ├── Q3: Incident Response & Operations Policies (Owner: CISO)
   └── Q4: Supplier & Compliance Policies (Owner: Compliance Lead)

2. TRIGGER-BASIERTER REVIEW
   ├── Nach Sicherheitsvorfall (innerhalb 30 Tage)
   ├── Bei relevanter Gesetzesänderung (innerhalb 60 Tage)
   ├── Bei Architecture-Changes (innerhalb 14 Tage)
   └── Nach Audit-Findings (innerhalb 30 Tage)

3. PROZESS-SCHRITTE
   ├── Schritt 1: Draft-Review durch Policy-Owner
   ├── Schritt 2: Stakeholder-Consultation (2 Wochen)
   ├── Schritt 3: Legal/Compliance Sign-off
   ├── Schritt 4: Management Approval
   └── Schritt 5: Communication & Training

4. NACHWEISE
   ├── Policy-Review-Log (Confluence)
   ├── Version-History in Git
   └── Sign-off-Records (DocuSign)
```

**Nachweise:**
- [ ] Policy-Review-Log (letztes Jahr)
- [ ] Version-Control-History
- [ ] Management-Sign-offs

---

#### Frage 1.3: Risikomanagement
> **Auditor**: *"Wie erfolgt das Risikomanagement?"*

**Erwartete Antwort-Elemente:**
- Risiko-Identifikationsprozess
- Bewertungsmethodik
- Behandlungsstrategien
- Regelmäßige Reviews

**CargoBit-spezifische Antwort:**
```
Risikomanagement-Prozess (ISO 27005 aligned):

1. RISIKO-IDENTIFIKATION
   Quellen:
   ├── Threat Modeling (STRIDE, jährlich)
   ├── Vulnerability Scans (monatlich)
   ├── Pentest-Ergebnisse (vierteljährlich)
   ├── Incident-Postmortems (nach Bedarf)
   └── Threat Intelligence (kontinuierlich)

2. RISIKO-BEWERTUNG
   Methodik: Quantitative Risikoanalyse
   ├── Impact (1-5): Financial, Reputational, Operational, Compliance
   ├── Likelihood (1-5): Historical, Threat-Level, Control-Effektivität
   └── Risk Score = Impact × Likelihood

3. RISIKO-BEHANDLUNG
   ├── Mitigate: Controls implementieren (SLA: 30/60/90 Tage)
   ├── Transfer: Cyber-Versicherung, SLAs mit Dienstleistern
   ├── Accept: Business-Entscheidung, dokumentiert
   └── Avoid: Services/Systeme nicht betreiben

4. RISIKO-REVIEW
   ├── Monatlich: Risk Register Update
   ├── Quartalsweise: Management Risk Review
   └── Jährlich: Full Risk Assessment

5. DOKUMENTATION
   └── Risk Register: /docs/risk-register.md
```

**Nachweise:**
- [ ] Risk Register (aktuell)
- [ ] Risk Assessment Reports
- [ ] Risk Treatment Decisions

---

### 2. Asset Management

#### Frage 2.1: Asset-Identifikation und -Klassifizierung
> **Auditor**: *"Wie identifizieren und klassifizieren Sie Assets?"*

**CargoBit-spezifische Antwort:**
```
Asset Management Prozess:

1. INVENTARISIERUNG
   ┌─────────────────────────────────────────────────────┐
   │ Asset-Typ          │ Quelle               │ Owner  │
   ├─────────────────────────────────────────────────────┤
   │ Kubernetes Cluster │ Terraform State      │ Platf. │
   │ Microservices      │ GitLab Repositories  │ Dev    │
   │ Databases          │ DB-Registry          │ DBA    │
   │ API Keys           │ Vault Inventory      │ Sec    │
   │ Endpoints          │ MDM Inventory        │ IT     │
   └─────────────────────────────────────────────────────┘

2. KLASSIFIZIERUNG
   ├── CONFIDENTIAL (Rot)
   │   ├── Personendaten (GDPR-relevant)
   │   ├── Preis-Algorithmen
   │   └── Secrets/Keys
   ├── INTERNAL (Gelb)
   │   ├── Interne Dokumente
   │   ├── Architektur-Pläne
   │   └── Logs
   └── PUBLIC (Grün)
       ├── Marketing-Material
       └── Öffentliche APIs

3. LABELLING
   ├── Kubernetes: Labels (data-classification=confidential)
   ├── GitLab: Protected Branches für Confidential-Code
   └── Vault: Path-basierte Klassifizierung

4. LIFECYCLE
   ├── Onboarding: Asset-Erfassung within 48h
   ├── Periodic Review: Quartalsweise
   └── Offboarding: Secure Disposal within 7 Tage
```

**Nachweise:**
- [ ] Asset Inventory (aktuell)
- [ ] Classification Policy
- [ ] Labelling-Guidelines

---

#### Frage 2.2: System-Owner
> **Auditor**: *"Wer ist Owner für kritische Systeme?"*

**CargoBit-spezifische Antwort:**
```
Ownership Matrix:

┌────────────────────┬──────────────────┬─────────────────┐
│ System             │ Technical Owner  │ Business Owner  │
├────────────────────┼──────────────────┼─────────────────┤
│ Pricing Service    │ Platform Lead    │ Head of Revenue │
│ Matching Service   │ Platform Lead    │ Head of Ops     │
│ Gateway Service    │ Platform Lead    │ CTO             │
│ Keycloak (IdP)     │ Security Lead    │ CISO            │
│ PostgreSQL Cluster │ DBA Lead         │ Platform Lead   │
│ Kafka Cluster      │ Platform Lead    │ Platform Lead   │
│ Kubernetes Cluster │ Platform Lead    │ CTO             │
│ Vault (Secrets)    │ Security Lead    │ CISO            │
└────────────────────┴──────────────────┴─────────────────┘

Verantwortlichkeiten Technical Owner:
├── Verfügbarkeit & Performance
├── Security Patching
├── Incident Response
└── Change Management

Verantwortlichkeiten Business Owner:
├── Business Continuity Requirements
├── Risk Acceptance
├── Budget Approval
└── Compliance Requirements
```

**Nachweise:**
- [ ] RACI Matrix
- [ ] Onboarding-Unterlagen für neue Owner

---

### 3. Access Control

#### Frage 3.1: Least-Privilege-Prinzip
> **Auditor**: *"Wie stellen Sie sicher, dass Zugriffe dem Least-Privilege-Prinzip folgen?"*

**CargoBit-spezifische Antwort:**
```
Least-Privilege Implementation:

1. ROLE-BASED ACCESS CONTROL (RBAC)
   ┌──────────────────────────────────────────────────┐
   │ Role         │ Permissions                     │
   ├──────────────────────────────────────────────────┤
   │ Viewer       │ Read-only auf assigned Namespaces│
   │ Developer    │ Read + Deploy (dev/staging)     │
   │ Senior Dev   │ Deploy + Debug (prod, limited)  │
   │ Platform Eng │ Full access (ops namespaces)    │
   │ Security     │ Audit logs, security tools     │
   │ Admin        │ Break-glass only               │
   └──────────────────────────────────────────────────┘

2. ATTRIBUTE-BASED ACCESS CONTROL (ABAC)
   Bedingungen für jeden Zugriff:
   ├── Team-Membership (verified via IdP)
   ├── Time-of-Day (prod-access: 06:00-22:00)
   ├── Location (prod-access: office/VPN only)
   ├── MFA-Status (required for prod)
   └── Training-Status (Security Training completed)

3. JUST-IN-TIME ACCESS
   ├── Prod-Access: max. 4 Stunden
   ├── Break-glass: max. 1 Stunde + Alert
   └── Automatic Revocation nach Zeitablauf

4. IMPLEMENTIERUNG
   ├── Kubernetes: RBAC + OPA Gatekeeper
   ├── Keycloak: Role Mappings + Conditions
   └── Vault: Policy-based Access

5. VERIFIZIERUNG
   └── Quarterly Access Reviews (automated reporting)
```

**Nachweise:**
- [ ] RBAC Configuration Files
- [ ] ABAC Policy Documents
- [ ] JIT-Access Logs

---

#### Frage 3.2: Joiner/Mover/Leaver-Prozess
> **Auditor**: *"Wie läuft der Joiner/Mover/Leaver-Prozess?"*

**CargoBit-spezifische Antwort:**
```
JML-Prozess (Identity Lifecycle Management):

┌─────────────────────────────────────────────────────────┐
│                    JOINER PROCESS                       │
├─────────────────────────────────────────────────────────┤
│ Day -7  │ Hiring-Request approved by Manager           │
│ Day -3  │ Account created in IdP (automated via HR API)│
│ Day 0   │ Onboarding-Session                           │
│         │ ├── Security Awareness Training (pflicht)    │
│         │ ├── MFA-Setup                                │
│         │ └── Role-Assignment (least-privilege start)  │
│ Day +7  │ Access Review durch Manager                  │
│ Day +30 │ Full Access Grant nach Training-Abschluss    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    MOVER PROCESS                        │
├─────────────────────────────────────────────────────────┤
│ Day 0   │ Role-Change approved by both Managers        │
│ Day +1  │ Old access revoked (automated)               │
│ Day +1  │ New access granted per new role              │
│ Day +7  │ Access Review durch neuen Manager            │
│         │ Security Training für neue Role (falls nötig)│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    LEAVER PROCESS                       │
├─────────────────────────────────────────────────────────┤
│ Day 0   │ Termination initiated by HR                  │
│ Hour +1 │ Critical access revoked (prod, admin)        │
│ Hour +4 │ All access revoked (automated via HR API)    │
│ Day +1  │ Account disabled (not deleted for audit)     │
│ Day +30 │ Account archived, logs retained              │
│ Day +90 │ Account permanently deleted (GDPR-compliant) │
└─────────────────────────────────────────────────────────┘

AUTOMATION:
├── HR-System → IdP Integration (daily sync)
├── IdP → Kubernetes RBAC (real-time)
└── Automated Alerts bei Anomalien
```

**Nachweise:**
- [ ] JML Process Documentation
- [ ] HR-IdP Integration Logs
- [ ] Access Revocation Reports

---

#### Frage 3.3: Access Reviews
> **Auditor**: *"Wie oft führen Sie Access Reviews durch?"*

**CargoBit-spezifische Antwort:**
```
Access Review Schedule:

┌────────────────────────────────────────────────────┐
│ Review Type         │ Frequency │ Scope           │
├────────────────────────────────────────────────────┤
│ Standard Access     │ Quarterly │ Alle User       │
│ Privileged Access   │ Monthly   │ Admin, Break-   │
│                     │           │ glass, Security │
│ Service Accounts    │ Quarterly │ Alle SAs        │
│ API Keys            │ Quarterly │ Alle Keys       │
│ External Access     │ Monthly   │ Vendors,        │
│                     │           │ Contractors     │
└────────────────────────────────────────────────────┘

REVIEW-PROZESS:
1. Automated Report generiert (IdP + K8s RBAC)
2. Manager-Review in Dedicated Tool (Access Manager)
3. Decision: Keep / Modify / Revoke
4. Automatic Implementation bei Revoke
5. Audit-Log der Decisions

COMPLETION RATES (Letzte 4 Quartale):
├── Q1/2024: 98% (2 overdue, auto-revoked)
├── Q2/2024: 100%
├── Q3/2024: 97% (5 overdue, escalated to HR)
└── Q4/2024: 99% (1 overdue, pending termination)
```

**Nachweise:**
- [ ] Access Review Reports (letzte 4 Quartale)
- [ ] Remediation Actions
- [ ] Escalation Records

---

### 4. Cryptography

#### Frage 4.1: Verschlüsselungsstandards
> **Auditor**: *"Welche Standards nutzen Sie für Verschlüsselung in Transit und at Rest?"*

**CargoBit-spezifische Antwort:**
```
Cryptography Standards:

1. ENCRYPTION IN TRANSIT
   ┌────────────────────────────────────────────────┐
   │ Scope            │ Protocol    │ Min-Version  │
   ├────────────────────────────────────────────────┤
   │ External API     │ TLS         │ 1.2+ (1.3 pref)│
   │ Service-to-Serv. │ mTLS        │ 1.2+         │
   │ Database Conn.   │ TLS         │ 1.2+         │
   │ Kafka            │ mTLS        │ 1.2+         │
   │ Vault            │ TLS         │ 1.3          │
   └────────────────────────────────────────────────┘

   Cipher Suites (Bevorzugt):
   ├── TLS_AES_256_GCM_SHA384 (TLS 1.3)
   ├── TLS_CHACHA20_POLY1305_SHA256
   └── TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384

2. ENCRYPTION AT REST
   ┌────────────────────────────────────────────────┐
   │ Data Type        │ Algorithm   │ Key Size     │
   ├────────────────────────────────────────────────┤
   │ Database (PGP)   │ AES-256-GCM │ 256 bit      │
   │ Secrets (Vault)  │ AES-256-GCM │ 256 bit      │
   │ Backups          │ AES-256-CBC │ 256 bit      │
   │ Logs             │ AES-256-GCM │ 256 bit      │
   │ File Storage     │ AES-256-GCM │ 256 bit      │
   └────────────────────────────────────────────────┘

3. KEY MANAGEMENT
   ├── Storage: HashiCorp Vault (HSM-backed)
   ├── Rotation: Automated, 90-day cycle
   ├── Access: Role-based, audit-logged
   └── Backup: Split-key recovery

4. VERBOTENE ALGORITHMEN
   ├── MD5, SHA1 für Signaturen
   ├── DES, 3DES, RC4
   ├── RSA < 2048 bit
   └── ECB Mode
```

**Nachweise:**
- [ ] TLS Configuration Files
- [ ] Vault Audit Logs
- [ ] Key Rotation Schedule

---

#### Frage 4.2: Schlüsselverwaltung
> **Auditor**: *"Wie verwalten Sie Schlüssel (Rotation, Storage, Zugriff)?"*

**CargoBit-spezifische Antwort:**
```
Key Management Lifecycle:

1. KEY GENERIERUNG
   ├── Ort: HashiCorp Vault (HSM-sealed)
   ├── Entropy: Hardware RNG
   └── Standards: FIPS 140-2 Level 3

2. KEY STORAGE
   ┌──────────────────────────────────────────────┐
   │ Key Type        │ Location    │ Protection  │
   ├──────────────────────────────────────────────┤
   │ Master Key      │ HSM         │ Hardware    │
   │ Data Encr. Keys │ Vault       │ Auto-unseal │
   │ TLS Certs       │ Vault PKI   │ Auto-renew  │
   │ API Keys        │ Vault KV    │ Policy-based│
   │ Service Tokens  │ Vault       │ TTL-limited │
   └──────────────────────────────────────────────┘

3. KEY ROTATION
   ┌──────────────────────────────────────────────┐
   │ Key Type        │ Rotation    │ Automation  │
   ├──────────────────────────────────────────────┤
   │ Data Encr. Keys │ 90 Tage     │ Automated   │
   │ TLS Certificates│ 90 Tage     │ cert-manager│
   │ API Keys        │ 180 Tage    │ Semi-auto   │
   │ Service Tokens  │ 24h TTL     │ Auto-renew  │
   │ Database Creds  │ 1h TTL      │ Dynamic     │
   └──────────────────────────────────────────────┘

4. ACCESS CONTROLS
   ├── Vault Policies (path-based)
   ├── Audit Logging (file + SIEM)
   ├── Break-glass Procedure (documented)
   └── Emergency Rotation Procedure

5. KEY BACKUP & RECOVERY
   ├── Vault Snapshots (täglich, verschlüsselt)
   ├── Recovery Keys (Shamir's Secret Sharing, 5/3)
   ├── Offline Backup (geographical split)
   └── Recovery Tests (quartalsweise)
```

**Nachweise:**
- [ ] Vault Configuration
- [ ] Rotation Logs
- [ ] Recovery Test Reports

---

### 5. Operations Security

#### Frage 5.1: Logging & Unveränderbarkeit
> **Auditor**: *"Wie stellen Sie sicher, dass Logs vollständig und unveränderbar sind?"*

**CargoBit-spezifische Antwort:**
```
Logging Architecture:

1. LOG-ARCHITEKTUR
   ┌───────────────────────────────────────────────────┐
   │ Source        │ Log Type    │ Destination        │
   ├───────────────────────────────────────────────────┤
   │ Kubernetes    │ Audit Logs  │ WORM Storage       │
   │ Applications  │ App Logs    │ Elasticsearch      │
   │ API Gateway   │ Access Logs │ Elasticsearch      │
   │ Database      │ Query Logs  │ WORM Storage       │
   │ Vault         │ Audit Logs  │ WORM Storage       │
   │ IdP           │ Auth Logs   │ WORM Storage       │
   └───────────────────────────────────────────────────┘

2. WORM (Write-Once-Read-Many) IMPLEMENTATION
   ├── Storage: S3 Object Lock (Compliance Mode)
   ├── Retention: 12 Monate minimum, 24 Monate für Audit
   ├── Verification: Checksum validation
   └── Tamper Detection: Alert bei Modification-Attempt

3. LOG-INHALTE
   Pflichtfelder für jeden Log-Eintrag:
   ├── Timestamp (ISO 8601, UTC)
   ├── Source (Service/Host)
   ├── Event Type
   ├── Actor (User/Service Account)
   ├── Action
   ├── Resource
   ├── Result (Success/Failure)
   └── Correlation ID

4. COMPLETENESS VERIFICATION
   ├── Daily log volume comparison
   ├── Gap detection alerts
   └── Hash-chain verification (daily)

5. LOG PROTECTION
   ├── No direct write access for operators
   ├── Automated ingestion only
   └── Access via read-only interfaces
```

**Nachweise:**
- [ ] WORM Storage Configuration
- [ ] Log Retention Policy
- [ ] Completeness Verification Reports

---

#### Frage 5.2: Sicherheitsrelevantes Monitoring
> **Auditor**: *"Wie überwachen Sie sicherheitsrelevante Events?"*

**CargoBit-spezifische Antwort:**
```
Security Monitoring Stack:

1. MONITORING ARCHITECTURE
   ┌─────────────────────────────────────────────────┐
   │ Layer          │ Tool         │ Scope          │
   ├─────────────────────────────────────────────────┤
   │ Infrastructure │ Prometheus   │ Metrics        │
   │ Application    │ Grafana Loki │ Logs           │
   │ Security       │ SIEM         │ Correlation    │
   │ Audit          │ WORM Storage │ Long-term      │
   └─────────────────────────────────────────────────┘

2. ALERTING RULES
   ┌─────────────────────────────────────────────────┐
   │ Event                    │ Severity │ Response │
   ├─────────────────────────────────────────────────┤
   │ Failed Login (>5/min)    │ High     │ Auto-block│
   │ Privilege Escalation     │ Critical │ PagerDuty│
   │ Config Drift Detected    │ High     │ Alert    │
   │ Certificate Expiry (<7d) │ Medium   │ Alert    │
   │ mTLS Failure             │ High     │ Alert    │
   │ Vault Unseal Failure     │ Critical │ PagerDuty│
   │ Bulk Data Access         │ High     │ Review   │
   │ API Rate Limit Exceeded  │ Medium   │ Alert    │
   └─────────────────────────────────────────────────┘

3. SIEM CORRELATION
   Use Cases:
   ├── Brute-Force Detection (IdP + Gateway logs)
   ├── Lateral Movement (K8s audit + Network logs)
   ├── Data Exfiltration (DB audit + Network)
   └── Privilege Abuse (RBAC changes + Actions)

4. ON-CALL INTEGRATION
   ├── Tier 1: Platform On-Call (auto-escalation 15min)
   ├── Tier 2: Security On-Call (escalation 30min)
   └── Tier 3: CISO (critical only)
```

**Nachweise:**
- [ ] Alert Rules Configuration
- [ ] SIEM Dashboard Screenshots
- [ ] On-Call Runbook

---

#### Frage 5.3: Schwachstellenmanagement
> **Auditor**: *"Wie gehen Sie mit Schwachstellen um?"*

**CargoBit-spezifische Antwort:**
```
Vulnerability Management Process:

1. SCANNING
   ┌─────────────────────────────────────────────────┐
   │ Type           │ Tool       │ Frequency        │
   ├─────────────────────────────────────────────────┤
   │ Container      │ Trivy      │ Every build      │
   │ Dependencies   │ Snyk       │ Daily            │
   │ Infrastructure │ Nessus     │ Weekly           │
   │ Web Apps       │ OWASP ZAP  │ Weekly           │
   │ Code (SAST)    │ SonarQube  │ Every PR         │
   │ Code (DAST)    │ OWASP ZAP  │ Weekly           │
   └─────────────────────────────────────────────────┘

2. CLASSIFICATION (CVSS v3.1)
   ├── Critical (9.0-10.0): Patch within 24h
   ├── High (7.0-8.9): Patch within 7 days
   ├── Medium (4.0-6.9): Patch within 30 days
   └── Low (0.1-3.9): Patch within 90 days

3. TRIAGE-PROZESS
   Schritt 1: Automated Scan → Ticket Creation
   Schritt 2: Security Team Triage (daily)
   Schritt 3: Assign to Owner
   Schritt 4: Patch/Remediation
   Schritt 5: Re-scan & Verify
   Schritt 6: Close Ticket

4. EXCEPTION PROCESS
   ├── Risk Acceptance (business decision, documented)
   ├── Compensating Controls (if patch not possible)
   └── Review Cycle (quarterly)

5. REPORTING
   ├── Weekly: Vuln Summary to Platform Team
   ├── Monthly: Trend Report to Management
   └── Quarterly: Full Assessment to CISO
```

**Nachweise:**
- [ ] Scan Reports (letzte 3 Monate)
- [ ] Patch Compliance Metrics
- [ ] Risk Acceptance Documents

---

### 6. Communications Security

#### Frage 6.1: Netzwerksegmentierung
> **Auditor**: *"Wie segmentieren Sie Ihr Netzwerk?"*

**CargoBit-spezifische Antwort:**
```
Network Segmentation Architecture:

1. ZONE-MODELL
   ┌────────────────────────────────────────────────────┐
   │ Zone        │ Trust Level │ Components            │
   ├────────────────────────────────────────────────────┤
   │ Public      │ Untrusted   │ Load Balancer, CDN    │
   │ DMZ         │ Low         │ API Gateway, WAF      │
   │ Application │ Medium      │ Microservices         │
   │ Data        │ High        │ Databases, Kafka      │
   │ Management  │ High        │ Vault, Monitoring     │
   └────────────────────────────────────────────────────┘

2. KUBERNETES NETWORK POLICIES
   ┌────────────────────────────────────────────────────┐
   │ Namespace   │ Ingress From        │ Egress To     │
   ├────────────────────────────────────────────────────┤
   │ gateway     │ public, dmz         │ pricing, match│
   │ pricing     │ gateway             │ db, kafka     │
   │ matching    │ gateway             │ db, kafka     │
   │ db          │ pricing, matching   │ backup        │
   │ monitoring  │ all (read-only)     │ all          │
   │ vault       │ all (authenticated) │ hsm           │
   └────────────────────────────────────────────────────┘

3. DEFAULT-DENY POLICY
   ├── All namespaces: Default deny all ingress/egress
   ├── Explicit allow rules only
   └── No wildcard rules in production

4. CROSS-ZONE COMMUNICATION
   ├── API Gateway → Services: mTLS required
   ├── Services → Database: TLS + IP whitelist
   └── Management → All: VPN + MFA + Audit
```

**Nachweise:**
- [ ] Network Diagram
- [ ] NetworkPolicy YAML Files
- [ ] Zone Definition Document

---

#### Frage 6.2: mTLS & NetworkPolicies
> **Auditor**: *"Wie schützen Sie interne Services?"*

**CargoBit-spezifische Antwort:**
```
Internal Service Protection:

1. mTLS IMPLEMENTATION (Istio Service Mesh)
   ┌─────────────────────────────────────────────────┐
   │ Component     │ mTLS Mode   │ Enforcement     │
   ├─────────────────────────────────────────────────┤
   │ Gateway       │ STRICT      │ Mandatory       │
   │ Pricing       │ STRICT      │ Mandatory       │
   │ Matching      │ STRICT      │ Mandatory       │
   │ DB Access     │ STRICT      │ Mandatory       │
   │ Monitoring    │ PERMISSIVE  │ Gradual rollout │
   └─────────────────────────────────────────────────┘

   Certificate Management:
   ├── Istio CA (Citadel) for service identities
   ├── Automatic rotation (24h validity)
   └── SPIFFE IDs for workload identity

2. NETWORKPOLICIES
   Example (Pricing Service):
   ┌─────────────────────────────────────────────────┐
   │ apiVersion: networking.k8s.io/v1               │
   │ kind: NetworkPolicy                            │
   │ metadata:                                      │
   │   name: pricing-policy                         │
   │   namespace: pricing                           │
   │ spec:                                          │
   │   podSelector: {}                              │
   │   policyTypes: [Ingress, Egress]               │
   │   ingress:                                     │
   │   - from: [{namespaceSelector:                 │
   │       matchLabels: {name: gateway}}]           │
   │     ports: [{port: 8080}]                      │
   │   egress:                                      │
   │   - to: [{namespaceSelector:                   │
   │       matchLabels: {name: postgres}}]          │
   │     ports: [{port: 5432}]                      │
   └─────────────────────────────────────────────────┘

3. VERIFICATION
   ├── Automated tests (CI/CD)
   ├── Periodic pen tests
   └── Continuous monitoring (Grafana)
```

**Nachweise:**
- [ ] Istio Configuration Files
- [ ] NetworkPolicy YAML Files
- [ ] mTLS Coverage Report

---

### 7. Supplier Management

#### Frage 7.1: Dienstleister-Sicherheit
> **Auditor**: *"Wie bewerten Sie die Sicherheit Ihrer Dienstleister?"*

**CargoBit-spezifische Antwort:**
```
Supplier Security Assessment:

1. KATEGORISIERUNG
   ┌──────────────────────────────────────────────────┐
   │ Category │ Risk Level │ Examples                │
   ├──────────────────────────────────────────────────┤
   │ Critical │ High       │ Cloud Provider (AWS),  │
   │          │            │ IdP (Keycloak support) │
   │ Standard │ Medium     │ Monitoring (Datadog),  │
   │          │            │ CI/CD (GitLab)         │
   │ Low      │ Low        │ Office Tools, Marketing│
   └──────────────────────────────────────────────────┘

2. ASSESSMENT-PROZESS
   Vor Vertragsabschluss:
   ├── Security Questionnaire (VSA Framework)
   ├── SOC2 Type II oder ISO 27001 Nachweis
   ├── Data Processing Agreement (DPA)
   └── Security Review durch Security Team

   Während der Partnerschaft:
   ├── Annual Re-Assessment
   ├── Security Incident Notifications ( contractual)
   └── Right to Audit (in contract)

3. SCORING (0-3 Scale)
   ┌──────────────────────────────────────────────────┐
   │ Score │ Meaning              │ Action           │
   ├──────────────────────────────────────────────────┤
   │ ≥2.5  │ Enterprise-Level     │ Approved         │
   │ 1.5-2.4│ Adequate with gaps  │ Conditional +    │
   │       │                      │ compensating ctrl│
   │ <1.5  │ High Risk            │ Rejected /       │
   │       │                      │ Risk Acceptance  │
   └──────────────────────────────────────────────────┘

4. CURRENT SUPPLIER STATUS
   ├── AWS: Score 2.9 (SOC2, ISO 27001, CSA STAR)
   ├── GitLab: Score 2.7 (SOC2 Type II)
   └── Datadog: Score 2.6 (SOC2 Type II)
```

**Nachweise:**
- [ ] Vendor Assessment Reports
- [ ] DPA Templates
- [ ] Supplier Inventory

---

#### Frage 7.2: SLA-Überwachung
> **Auditor**: *"Wie stellen Sie sicher, dass SLAs eingehalten werden?"*

**CargoBit-spezifische Antwort:**
```
SLA Management:

1. KRITISCHE SLAs
   ┌──────────────────────────────────────────────────┐
   │ Supplier │ SLA Metric        │ Target  │ Current │
   ├──────────────────────────────────────────────────┤
   │ AWS      │ Availability      │ 99.95%  │ 99.98%  │
   │ AWS      │ RTO (Support)     │ <4h     │ <2h     │
   │ GitLab   │ CI/CD Uptime      │ 99.9%   │ 99.92%  │
   │ Datadog  │ Ingestion Latency │ <5min   │ <3min   │
   └──────────────────────────────────────────────────┘

2. MONITORING
   ├── Automated availability checks (Prometheus)
   ├── Monthly SLA reports from suppliers
   └── Quarterly review with critical suppliers

3. ESCALATION PROCESS
   ├── SLA Breach → Alert to Platform Lead
   ├── Repeated Breaches → Contract Review
   └── Critical Breach → Emergency vendor call

4. CONTRACTUAL CLAUSES
   ├── SLA credit terms
   ├── Right to terminate for repeated breaches
   └── Alternative supplier identification
```

**Nachweise:**
- [ ] SLA Reports (letzte 12 Monate)
- [ ] Contract SLA Clauses
- [ ] Escalation Records

---

### 8. Incident Management

#### Frage 8.1: Definition Sicherheitsvorfall
> **Auditor**: *"Wie definieren Sie einen Sicherheitsvorfall?"*

**CargoBit-spezifische Antwort:**
```
Security Incident Definition:

DEFINITION:
Ein Sicherheitsvorfall ist jedes Ereignis, das:
├── Die Vertraulichkeit, Integrität oder Verfügbarkeit
│   von Systemen oder Daten beeinträchtigt oder
├── Sicherheitsrichtlinien verletzt oder
├── Unautorisierten Zugriff auf Systeme/Daten ermöglicht oder
└── Eine Bedrohung für die Business-Continuity darstellt

BEISPIELE (nicht vollständig):
┌────────────────────────────────────────────────────┐
│ Category          │ Examples                      │
├────────────────────────────────────────────────────┤
│ Unauthorized      │ Account compromise, privilege │
│ Access            │ escalation, credential theft  │
├────────────────────────────────────────────────────┤
│ Data Breach       │ Data exfiltration, leak to    │
│                   │ unauthorized parties          │
├────────────────────────────────────────────────────┤
│ Availability      │ DDoS, ransomware, destructive │
│ Attack            │ malware                       │
├────────────────────────────────────────────────────┤
│ Policy Violation  │ Insider threat, policy bypass │
├────────────────────────────────────────────────────┤
│ Security Event    │ Malware detection, intrusion  │
│                   │ detection, vulnerability      │
│                   │ exploitation attempt          │
└────────────────────────────────────────────────────┘

ABGRENZUNG zu Security Events:
├── Security Event: Beobachtung, noch kein Schaden
├── Security Incident: Bestätigter Vorfall mit Impact
└── Escalation bei Unsicherheit: Immer als Incident behandeln
```

**Nachweise:**
- [ ] Incident Definition in Policy
- [ ] Classification Examples

---

#### Frage 8.2: Incident-Response-Prozess
> **Auditor**: *"Wie läuft Ihr Incident-Response-Prozess ab?"*

**CargoBit-spezifische Antwort:**
```
Incident Response Process (NIST-aligned):

┌──────────────────────────────────────────────────────┐
│ PHASE 1: DETECTION & ANALYSIS                        │
├──────────────────────────────────────────────────────┤
│ 1. Detection (Automated/Monitoring/User Report)      │
│ 2. Initial Triage (Security On-Call)                 │
│ 3. Severity Classification:                          │
│    ├── SEV-1 (Critical): 15min response, CISO       │
│    ├── SEV-2 (High): 1h response, Security Lead     │
│    ├── SEV-3 (Medium): 4h response, Platform        │
│    └── SEV-4 (Low): 24h response, normal queue      │
└──────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────┐
│ PHASE 2: CONTAINMENT                                 │
├──────────────────────────────────────────────────────┤
│ 1. Incident Commander assigned                       │
│ 2. War Room initiated (SEV-1/2)                      │
│ 3. Short-term containment:                           │
│    ├── Isolate affected systems                      │
│    ├── Block malicious IPs/accounts                  │
│    └── Preserve evidence                             │
│ 4. Long-term containment:                            │
│    ├── Rebuild from clean state                      │
│    └── Apply patches                                 │
└──────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────┐
│ PHASE 3: ERADICATION & RECOVERY                      │
├──────────────────────────────────────────────────────┤
│ 1. Root Cause Analysis                               │
│ 2. Remove threat (malware, accounts, backdoors)      │
│ 3. Verify eradication                                │
│ 4. Restore services (from backup if needed)          │
│ 5. Validate system integrity                         │
└──────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────┐
│ PHASE 4: POST-INCIDENT ACTIVITY                      │
├──────────────────────────────────────────────────────┤
│ 1. Postmortem (within 72h)                           │
│ 2. Lessons Learned documented                        │
│ 3. Action Items assigned                             │
│ 4. Policy/Control updates                            │
│ 5. External notification (if required)               │
└──────────────────────────────────────────────────────┘

DOCUMENTATION:
├── Incident Ticket (JIRA)
├── Timeline Log (real-time updates)
├── Communication Log
└── Postmortem Document
```

**Nachweise:**
- [ ] Incident Response Policy
- [ ] Incident Playbooks
- [ ] Postmortem Templates

---

#### Frage 8.3: Beispiel eines vergangenen Incidents
> **Auditor**: *"Können Sie ein Beispiel eines vergangenen Incidents beschreiben?"*

**CargoBit-spezifische Antwort:**
```
INCIDENT EXAMPLE (anonymisiert für Audit):

┌──────────────────────────────────────────────────────┐
│ INCIDENT ID: INC-2024-017                            │
├──────────────────────────────────────────────────────┤
│ Date: 2024-08-15                                     │
│ Severity: SEV-2 (High)                               │
│ Category: Unauthorized Access                        │
└──────────────────────────────────────────────────────┘

TIMELINE:
┌────────────────────────────────────────────────────┐
│ Time     │ Event                                   │
├────────────────────────────────────────────────────┤
│ 09:23    │ Alert: Failed login attempts detected  │
│ 09:25    │ Security On-Call triaged, escalated    │
│ 09:30    │ Incident Commander assigned             │
│ 09:35    │ Compromised account identified         │
│ 09:40    │ Account disabled, sessions revoked     │
│ 09:45    │ War Room initiated                     │
│ 10:00    │ Lateral movement attempt detected      │
│ 10:15    │ Affected namespace isolated            │
│ 10:30    │ Credential rotation initiated          │
│ 11:00    │ Root cause: Phishing → credential theft│
│ 14:00    │ Systems restored, monitoring enhanced  │
│ 16:00    │ Incident closed                        │
│ Day+2    │ Postmortem completed                   │
└────────────────────────────────────────────────────┘

ROOT CAUSE:
├── Employee clicked phishing link
├── Entered credentials on fake login page
├── No MFA enabled for this account (exception)
└── Attacker attempted lateral movement

REMEDIATION ACTIONS:
├── MFA enforced for all accounts (no exceptions)
├── Phishing simulation training increased
├── Email filtering enhanced
└── Detection rules improved

METRICS:
├── MTTD (Mean Time To Detect): 2 minutes
├── MTTR (Mean Time To Respond): 25 minutes
├── Business Impact: Limited (contained quickly)
└── Customer Impact: None
```

**Nachweise:**
- [ ] Incident Ticket
- [ ] Postmortem Document
- [ ] Action Items Completion

---

### 9. Business Continuity

#### Frage 9.1: Backup & Restore-Tests
> **Auditor**: *"Wie testen Sie Backups und Restore-Prozesse?"*

**CargoBit-spezifische Antwort:**
```
Backup & Restore Testing:

1. BACKUP CONFIGURATION
   ┌──────────────────────────────────────────────────┐
   │ Data Type       │ Frequency │ Retention │ Enc   │
   ├──────────────────────────────────────────────────┤
   │ PostgreSQL      │ Daily     │ 30 days   │ Yes   │
   │ Application     │ Daily     │ 14 days   │ Yes   │
   │ Configs (Git)   │ Continuous│ Forever   │ N/A   │
   │ Secrets (Vault) │ Daily     │ 90 days   │ Yes   │
   │ Audit Logs      │ Continuous│ 24 months │ Yes   │
   └──────────────────────────────────────────────────┘

2. BACKUP VERIFICATION
   ├── Automated: Daily integrity checks
   ├── Checksum validation after each backup
   └── Alert on backup failures

3. RESTORE TESTING SCHEDULE
   ┌──────────────────────────────────────────────────┐
   │ Test Type        │ Frequency    │ Scope         │
   ├──────────────────────────────────────────────────┤
   │ Table Restore    │ Monthly      │ Random tables │
   │ Full DB Restore  │ Quarterly    │ Staging env   │
   │ DR Failover      │ Semi-annually│ Full DR       │
   │ Secrets Recovery │ Quarterly    │ Key secrets   │
   └──────────────────────────────────────────────────┘

4. RESTORE TEST PROCEDURE
   Schritt 1: Select backup (random or targeted)
   Schritt 2: Restore to isolated environment
   Schritt 3: Verify data integrity
   Schritt 4: Verify application functionality
   Schritt 5: Document results
   Schritt 6: Clean up test environment

5. TEST RESULTS (Letzte 4 Quartale)
   ├── Q1/2024: Full DR Test - SUCCESS (RTO achieved)
   ├── Q2/2024: Table Restore - SUCCESS (12 tables)
   ├── Q3/2024: Full DB Restore - SUCCESS (staging)
   └── Q4/2024: Secrets Recovery - SUCCESS
```

**Nachweise:**
- [ ] Backup Configuration
- [ ] Restore Test Reports
- [ ] DR Test Results

---

#### Frage 9.2: RTO/RPO-Ziele
> **Auditor**: *"Welche RTO/RPO-Ziele haben Sie definiert?"*

**CargoBit-spezifische Antwort:**
```
RTO/RPO Targets:

1. DEFINIERTES ZIEL
   ┌──────────────────────────────────────────────────┐
   │ Service         │ RTO Target │ RPO Target │ Tier │
   ├──────────────────────────────────────────────────┤
   │ Pricing Service │ 1 hour     │ 15 minutes │ 1    │
   │ Matching        │ 1 hour     │ 15 minutes │ 1    │
   │ Gateway         │ 30 minutes │ 0          │ 1    │
   │ Database        │ 2 hours    │ 15 minutes │ 1    │
   │ Monitoring      │ 4 hours    │ 1 hour     │ 2    │
   │ Internal Tools  │ 8 hours    │ 24 hours   │ 3    │
   └──────────────────────────────────────────────────┘

2. VERIFIZIERUNG
   ├── RTO: Tested in DR exercises
   ├── RPO: Verified by backup frequency
   └── Gap Analysis: Quarterly

3. ACHIEVED PERFORMANCE
   ┌──────────────────────────────────────────────────┐
   │ Test Date  │ Service  │ RTO Achieved │ RPO Ach. │
   ├──────────────────────────────────────────────────┤
   │ 2024-Q1    │ Full DR  │ 45 minutes   │ 12 min   │
   │ 2024-Q2    │ DB Only  │ 1.5 hours    │ 10 min   │
   │ 2024-Q3    │ Gateway  │ 20 minutes   │ 0        │
   │ 2024-Q4    │ Full DR  │ 50 minutes   │ 14 min   │
   └──────────────────────────────────────────────────┘

4. CONTINUOUS IMPROVEMENT
   ├── Automation improvements
   ├── Faster failover procedures
   └── Regular runbook updates
```

**Nachweise:**
- [ ] RTO/RPO Policy
- [ ] DR Test Reports
- [ ] Improvement Roadmap

---

### 10. Compliance

#### Frage 10.1: Gesetzliche Anforderungen
> **Auditor**: *"Wie stellen Sie sicher, dass gesetzliche Anforderungen eingehalten werden?"*

**CargoBit-spezifische Antwort:`
```
Compliance Framework:

1. RELEVANTE REGULATORY REQUIREMENTS
   ┌──────────────────────────────────────────────────┐
   │ Regulation │ Scope               │ Owner        │
   ├──────────────────────────────────────────────────┤
   │ GDPR       │ EU Personendaten    │ DPO         │
   │ ISO 27001  │ ISMS                │ CISO        │
   │ SOC 2      │ Service Controls    │ CISO        │
   │ NIS2       │ Critical Infra (EU) │ CISO        │
   └──────────────────────────────────────────────────┘

2. COMPLIANCE MANAGEMENT PROCESS
   ├── Regulatory Monitoring (Legal Team + Subscriptions)
   ├── Impact Assessment bei neuen Regulations
   ├── Gap Analysis & Remediation Planning
   ├── Control Implementation
   ├── Evidence Collection
   └── Audit Preparation

3. POLICY ALIGNMENT
   ├── Annual review against current regulations
   ├── Legal review of all security policies
   └── External legal consultation (quarterly)

4. REGULATORY CHANGE MANAGEMENT
   ├── Legal updates tracked in dedicated system
   ├── Impact assessment within 30 days
   ├── Remediation plan within 60 days
   └── Implementation within 90 days

5. AUDIT & CERTIFICATION STATUS
   ├── ISO 27001: Certified (last audit: 2024-03)
   ├── SOC 2 Type II: Certified (last audit: 2024-06)
   └── GDPR: DPO appointed, annual review
```

**Nachweise:**
- [ ] Regulatory Register
- [ ] Compliance Matrix
- [ ] Certificates

---

#### Frage 10.2: Evidence-Dokumentation
> **Auditor**: *"Wie dokumentieren Sie Evidence für Audits?"*

**CargoBit-spezifische Antwort:**
```
Evidence Management System:

1. EVIDENCE REPOSITORY
   ├── Location: Confluence + Git (versioned)
   ├── Structure: By Framework (ISO 27001, SOC2)
   ├── Access: Role-based, audit-logged
   └── Retention: Minimum 3 years

2. EVIDENCE TYPES
   ┌──────────────────────────────────────────────────┐
   │ Type           │ Examples                      │
   ├──────────────────────────────────────────────────┤
   │ Policies       │ Signed policy documents       │
   │ Procedures     │ Process documentation         │
   │ Logs           │ Audit logs, access logs       │
   │ Reports        │ Scan reports, assessments     │
   │ Screenshots    │ Dashboard configs, settings   │
   │ Configs        │ YAML files, IaC               │
   │ Certificates   │ External certs, attestations  │
   └──────────────────────────────────────────────────┘

3. EVIDENCE COLLECTION PROCESS
   ├── Automated: Logs, metrics, scan results
   ├── Semi-automated: Screenshots, exports
   └── Manual: Policy sign-offs, meeting minutes

4. EVIDENCE ORGANIZATION
   /evidence/
   ├── iso27001/
   │   ├── A.5-Policies/
   │   ├── A.6-Organization/
   │   ├── A.7-HR/
   │   ├── A.8-Assets/
   │   ├── A.9-Access/
   │   ├── A.10-Cryptography/
   │   ├── A.11-Physical/
   │   ├── A.12-Operations/
   │   ├── A.13-Communications/
   │   ├── A.14-Development/
   │   ├── A.15-Suppliers/
   │   ├── A.16-Incident/
   │   └── A.17-BCP/
   └── soc2/
       ├── Security/
       ├── Availability/
       ├── Processing-Integrity/
       ├── Confidentiality/
       └── Privacy/

5. PRE-AUDIT EVIDENCE REVIEW
   ├── Internal review 4 weeks before audit
   ├── Gap identification and remediation
   └── Mock evidence collection test
```

**Nachweise:**
- [ ] Evidence Repository Structure
- [ ] Collection Schedule
- [ ] Evidence Index

---

## AB.3 Bewertungslogik

### Wie Auditoren denken

Auditoren bewerten nach einem 4-Stufen-Modell:

```
┌────────────────────────────────────────────────────────┐
│ STUFE 1: EXISTENZ                                     │
├────────────────────────────────────────────────────────┤
│ Frage: Gibt es das geforderte Element?                │
│ Prüfung: Dokumentvorhandensein, Prozess definiert     │
│ Ergebnis: Ja / Nein / Teilweise                       │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ STUFE 2: DOKUMENTATION                                │
├────────────────────────────────────────────────────────┤
│ Frage: Ist das Element hinreichend dokumentiert?      │
│ Prüfung: Policy vollständig, Prozess beschrieben,     │
│          Verantwortlichkeiten definiert               │
│ Ergebnis: Vollständig / Teilweise / Unzureichend      │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ STUFE 3: IMPLEMENTIERUNG                              │
├────────────────────────────────────────────────────────┤
│ Frage: Wird das Dokumentierte in der Praxis gelebt?   │
│ Prüfung: Logs, Evidence, Interviews, Beobachtung      │
│ Ergebnis: Umgesetzt / Teilweise / Nicht umgesetzt     │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ STUFE 4: WIRKSAMKEIT                                  │
├────────────────────────────────────────────────────────┤
│ Frage: Führt die Implementierung zum gewünschten      │
│        Ergebnis?                                      │
│ Prüfung: Metrics, Incident Trends, Audit-Ergebnisse   │
│ Ergebnis: Wirksam / Teilwirksam / Unwirksam           │
└────────────────────────────────────────────────────────┘
```

### Bewertungskriterien pro Stufe

| Stufe | Kriterien | Typische Nachweise |
|-------|-----------|-------------------|
| Existenz | Dokument/Prozess existiert | Policy-Datei, Prozess-Beschreibung |
| Dokumentation | Vollständig, aktuell, genehmigt | Version, Datum, Sign-off |
| Implementierung | Tatsächlich angewendet | Logs, Tickets, Interviews |
| Wirksamkeit | Ziel erreicht | Metrics, Audits, Incidents |

### Häufige Audit-Findings

```
┌────────────────────────────────────────────────────────┐
│ FINDING-TYPEN (Schlecht → Gut)                        │
├────────────────────────────────────────────────────────┤
│ Major Non-Conformity:                                  │
│ ├── Systemischer Mangel in Stufe 1 oder 2             │
│ ├── Führt zu Zertifikats-Verlust-Risiko               │
│ └── Remediation innerhalb 3 Monaten                   │
├────────────────────────────────────────────────────────┤
│ Minor Non-Conformity:                                  │
│ ├── Isolierte Abweichung in Stufe 3                   │
│ ├── Keine direkte Zertifikats-Gefährdung              │
│ └── Remediation innerhalb 6 Monaten                   │
├────────────────────────────────────────────────────────┤
│ Observation:                                           │
│ ├── Verbesserungspotenzial ohne Non-Conformity        │
│ ├── Empfehlung, keine Verpflichtung                   │
│ └── Optional zur Umsetzung                            │
├────────────────────────────────────────────────────────┤
│ Positive Observation:                                  │
│ ├── Besonders gute Praxis                             │
│ ├── Kann als Best Practice dienen                     │
│ └── Wird im Audit-Report erwähnt                      │
└────────────────────────────────────────────────────────┘
```

---

## Anhang: Interview-Vorbereitungscheckliste

### Vor dem Audit (2 Wochen)

- [ ] Alle Policy-Dokumente versioniert und signiert
- [ ] Evidence-Repository vollständig und organisiert
- [ ] Interview-Teilnehmer informiert und vorbereitet
- [ ] Räumlichkeiten/Videokonferenz eingerichtet
- [ ] System-Access für Auditor vorbereitet (read-only)

### Während des Audits

- [ ] Pünktlicher Start
- [ ] Klare Rollenverteilung
- [ ] Nachweise griffbereit
- [ ] Offene, ehrliche Kommunikation
- [ ] Nicht auf Fragen antworten, die nicht gestellt wurden

### Nach dem Audit

- [ ] Findings dokumentieren
- [ ] Corrective Action Plan erstellen
- [ ] Deadlines definieren
- [ ] Follow-up-Termin vereinbaren

---

*Dokument-Version: 1.0 | Erstellt: 2024-01 | Nächste Überprüfung: 2025-01*
