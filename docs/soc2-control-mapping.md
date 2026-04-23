# SOC2 Control-Mapping für CargoBit

> **CargoBit Transport Platform** — Vollständiges SOC2 TSC Control-Mapping
>
> *Klar, präzise, direkt auf die Plattform-Architektur gemappt*

---

## Übersicht

Dieses Dokument mappt die CargoBit-Architektur vollständig auf die SOC2 Trust Service Criteria (TSC):

| TSC Criterion | Typ | Coverage |
|---------------|-----|----------|
| **Security** | Mandatory | ✅ Vollständig |
| **Availability** | Optional | ✅ Vollständig |
| **Processing Integrity** | Optional | ✅ Vollständig |
| **Confidentiality** | Optional | ✅ Vollständig |
| **Privacy** | Optional | ✅ Vollständig |

---

## AC.1 Security (Mandatory)

### CC1.1 – Control Environment

**Control-Beschreibung:**
Die Organisation etabliert eine Kultur der Integrität und ethischen Werte, dokumentiert die Verantwortlichkeiten und stellt angemessene Ressourcen für das ISMS bereit.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Tone at the Top | Executive Commitment durch CISO-Reporting an Board | Board Meeting Minutes |
| Security Culture | Security Awareness Training (jährlich + Onboarding) | Training Records |
| Responsibilities | RACI Matrix für alle Security Controls | Org Chart, RACI Doc |
| Resources | Budget-Plan, FTE-Allocation | Budget Docs |
| Accountability | Performance Reviews beinhalten Security-Ziele | HR Records |

**Evidence-Location:**
```
/evidence/soc2/security/CC1.1/
├── board-meeting-minutes.pdf
├── training-records.xlsx
├── raci-matrix.pdf
├── budget-allocation.xlsx
└── policy-sign-offs.pdf
```

---

### CC1.2 – Board Oversight

**Control-Beschreibung:**
Der Vorstand überwacht die Wirksamkeit des Internen Kontrollsystems.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Security Reporting | Quartalsweise Security-Report an Board | Security Dashboard |
| Risk Oversight | Risk Register Review im Board | Risk Register |
| Incident Reporting | Major Incidents werden an Board kommuniziert | Incident Reports |

---

### CC1.3 – Management Responsibilities

**Control-Beschreibung:**
Das Management definiert Verantwortlichkeiten für interne Kontrollen.

**CargoBit Umsetzung:**

| Rolle | Verantwortung | Nachweis |
|-------|---------------|----------|
| CISO | Security Strategy, Risk Management | Job Description |
| Platform Lead | Technical Controls, Operations | Job Description |
| Compliance Lead | Audit Preparation, Evidence | Job Description |

---

### CC1.4 – Competence

**Control-Beschreibung:**
Die Organisation stellt sicher, dass Mitarbeiter über die nötige Kompetenz verfügen.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Hiring | Background Checks für kritische Rollen | HR Policy |
| Training | Security Training für alle, Specialized für Security Team | Training Records |
| Certification | ISO 27001 Lead Implementer für CISO | Certificates |

---

### CC2.1 – Communication

**Control-Beschreibung:**
Die Organisation kommuniziert Informationen über interne Kontrollen.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Policies | Verfügbar in Confluence, Policy Acknowledgment | Policy Portal |
| Security Updates | Monthly Security Newsletter | Newsletter Archive |
| Incident Comm | Incident Communication Plan | Comm Plan |

---

### CC2.3 – Whistleblowing

**Control-Beschreibung:**
Es gibt Mechanismen zur Meldung von Fehlverhalten.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Reporting Channel | Anonymes Reporting über HR/Compliance | Whistleblower Policy |
| Non-Retaliation | Policy schützt Whistleblower | Policy Document |

---

### CC3.1 – Risk Assessment

**Control-Beschreibung:**
Die Organisation führt regelmäßige Risikoanalysen durch.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Risk Identification | STRIDE Threat Modeling, Vulnerability Scans | Threat Model |
| Risk Analysis | Quantitative (Impact × Likelihood) | Risk Register |
| Risk Response | Mitigate/Transfer/Accept/Avoid | Risk Treatment Log |
| Review Cycle | Monatlich + bei Änderungen | Risk Review Minutes |

---

### CC3.2 – Change Management

**Control-Beschreibung:**
Risiken werden bei Änderungen berücksichtigt.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Change Review | Security Review bei Major Changes | Change Tickets |
| Risk Assessment | Pre-Change Risk Assessment | Risk Assessment Form |

---

### CC4.1 – Monitoring

**Control-Beschreibung:**
Die Organisation überwacht die Wirksamkeit interner Kontrollen.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| KPI Tracking | Security KPI Dashboard | Dashboard Screenshot |
| Control Testing | Quarterly Control Tests | Test Reports |
| Audit Program | Internal Audit Program | Audit Schedule |

---

### CC5.1 – Control Activities

**Control-Beschreibung:**
Die Organisation implementiert Kontrollaktivitäten.

**CargoBit Umsetzung:**

| Control Type | Examples | Nachweis |
|--------------|----------|----------|
| Preventive | RBAC, mTLS, Input Validation | Config Files |
| Detective | SIEM, Audit Logs, Monitoring | Dashboard |
| Corrective | Incident Response, Patching | Playbooks |

---

### CC5.2 – Technology Controls

**Control-Beschreibung:**
Kontrollen sind in die Technologie integriert.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Automated Controls | IaC Validation, Automated Scanning | CI/CD Pipeline |
| Consistency | GitOps, Config Management | Git Commits |

---

### CC6.1 – Logical Access

**Control-Beschreibung:**
Der logische Zugriff ist angemessen eingeschränkt.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Authentication | Keycloak IdP, MFA required | IdP Config |
| Authorization | RBAC + ABAC in Kubernetes | RBAC Config |
| Least Privilege | Just-in-Time Access, minimal permissions | Access Policy |
| Session Management | Session Timeout, Token Rotation | Auth Config |

**Architektur-Details:**

```
┌─────────────────────────────────────────────────────┐
│                 ACCESS FLOW                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  User → Keycloak (IdP) → MFA Challenge             │
│           │                                         │
│           ▼                                         │
│  Token Issued (JWT, 1h TTL)                         │
│           │                                         │
│           ▼                                         │
│  API Gateway validates Token                        │
│           │                                         │
│           ▼                                         │
│  Kubernetes RBAC checks permissions                 │
│           │                                         │
│           ▼                                         │
│  OPA Gatekeeper enforces ABAC policies              │
│           │                                         │
│           ▼                                         │
│  Service access granted/denied                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### CC6.2 – Access Registration

**Control-Beschreibung:**
Die Registrierung neuer Benutzer ist kontrolliert.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Provisioning | HR-triggered account creation | HR-IdP Integration |
| Approval | Manager approval required | Approval Workflow |
| Documentation | Access Log maintained | Access Logs |

---

### CC6.3 – Access Removal

**Control-Beschreibung:**
Der Entzug von Zugriffsrechten ist kontrolliert.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Deprovisioning | Automated on termination | HR-IdP Integration |
| Timeline | Critical access: 1h, All access: 4h | Policy Document |
| Verification | Weekly access audit | Audit Reports |

---

### CC6.4 – Access Review

**Control-Beschreibung:**
Zugriffsrechte werden regelmäßig überprüft.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Review Frequency | Quarterly (standard), Monthly (privileged) | Review Schedule |
| Review Process | Manager attestation via tool | Review Records |
| Remediation | Automated removal on non-attestation | Remediation Logs |

---

### CC6.5 – Physical Access

**Control-Beschreibung:**
Der physische Zugriff ist kontrolliert.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Data Center | AWS DC, no physical access needed | AWS SOC2 Report |
| Office | Badge access, visitor logs | Access Logs |

---

### CC6.6 – Network Security

**Control-Beschreibung:**
Netzwerkzugriffe sind angemessen geschützt.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Segmentation | Kubernetes NetworkPolicies | NetworkPolicy YAML |
| Encryption | mTLS for all internal traffic | Istio Config |
| Boundary | WAF, API Gateway | Gateway Config |

**Architektur-Details:**

```
┌─────────────────────────────────────────────────────┐
│              NETWORK ARCHITECTURE                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Internet                                           │
│      │                                              │
│      ▼                                              │
│  ┌─────────────┐                                    │
│  │    WAF      │ ← Layer 7 Protection               │
│  └─────────────┘                                    │
│      │                                              │
│      ▼                                              │
│  ┌─────────────┐                                    │
│  │ API Gateway │ ← TLS Termination, Auth            │
│  └─────────────┘                                    │
│      │ (mTLS)                                       │
│      ▼                                              │
│  ┌─────────────────────────────────────────────┐    │
│  │              KUBERNETES CLUSTER              │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐     │    │
│  │  │ Gateway │  │ Pricing │  │Matching │     │    │
│  │  │   NS    │──│   NS    │──│   NS    │     │    │
│  │  └─────────┘  └─────────┘  └─────────┘     │    │
│  │       │            │             │          │    │
│  │       │ (mTLS)     │ (mTLS)      │          │    │
│  │       ▼            ▼             ▼          │    │
│  │  ┌─────────────────────────────────────┐   │    │
│  │  │           DATABASE NS               │   │    │
│  │  └─────────────────────────────────────┘   │    │
│  │                                             │    │
│  │  NetworkPolicies: Default Deny All         │    │
│  │  Explicit Allow Rules Only                 │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### CC6.7 – Data Protection

**Control-Beschreibung:**
Daten sind angemessen geschützt.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Classification | Data Classification Policy | Policy Doc |
| Encryption at Rest | AES-256 for databases, backups | Encryption Config |
| Encryption in Transit | TLS 1.2+, mTLS internal | TLS Config |
| Key Management | HashiCorp Vault, 90-day rotation | Vault Config |

---

### CC7.1 – Vulnerability Management

**Control-Beschreibung:**
Schwachstellen werden systematisch gemanagt.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Scanning | Trivy (containers), Snyk (deps), Nessus (infra) | Scan Reports |
| Classification | CVSS v3.1 | Classification Policy |
| Remediation SLA | Critical: 24h, High: 7d, Medium: 30d | Patch Policy |
| Verification | Re-scan after patching | Re-scan Reports |

---

### CC7.2 – Monitoring

**Control-Beschreibung:**
Das System wird angemessen überwacht.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Metrics | Prometheus + Grafana | Dashboard Screenshot |
| Logging | Loki + Elasticsearch | Log Config |
| Alerting | PagerDuty integration | Alert Rules |
| SIEM | Security Event Correlation | SIEM Dashboard |

**Monitoring Stack:**

```
┌─────────────────────────────────────────────────────┐
│              OBSERVABILITY STACK                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐     ┌─────────────┐               │
│  │ Prometheus  │     │   Loki      │               │
│  │  (Metrics)  │     │   (Logs)    │               │
│  └─────────────┘     └─────────────┘               │
│        │                   │                        │
│        └────────┬──────────┘                        │
│                 ▼                                   │
│         ┌─────────────┐                             │
│         │   Grafana   │ ← Dashboards                │
│         └─────────────┘                             │
│                 │                                   │
│                 ▼                                   │
│         ┌─────────────┐                             │
│         │  Alertmanager│ → PagerDuty                │
│         └─────────────┘                             │
│                                                     │
│  Security Alerts:                                   │
│  ├── Failed Login Threshold                         │
│  ├── Privilege Escalation                           │
│  ├── mTLS Failures                                  │
│  ├── Certificate Expiry                             │
│  └── Anomaly Detection                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### CC7.3 – Incident Response

**Control-Beschreibung:**
Die Organisation hat Prozesse für Security Incidents.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Definition | Clear incident definition | IR Policy |
| Classification | SEV-1 to SEV-4 | Classification Doc |
| Response Process | NIST-aligned phases | IR Playbook |
| Team | On-call rotation, escalation | On-Call Schedule |
| Postmortem | Root cause analysis required | Postmortem Template |

---

### CC7.4 – Recovery

**Control-Beschreibung:**
Die Organisation kann sich von Incidents erholen.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Backups | Daily, encrypted, offsite | Backup Config |
| Restore Testing | Quarterly restore tests | Test Reports |
| DR Plan | Documented DR procedures | DR Plan |
| DR Testing | Semi-annual DR exercises | DR Test Reports |

---

### CC8.1 – Change Management

**Control-Beschreibung:**
Änderungen sind kontrolliert und autorisiert.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Change Process | 4-Eyes Review, Git-based | Change Policy |
| Authorization | Manager/Lead approval for prod | Approval Records |
| Documentation | Git versioning, CHANGELOG | Git History |
| Testing | Automated tests, staging deployment | CI/CD Pipeline |
| Rollback | GitOps rollback capability | Rollback Procedure |

**Change Flow:**

```
┌─────────────────────────────────────────────────────┐
│              CHANGE MANAGEMENT FLOW                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Developer creates PR                               │
│         │                                           │
│         ▼                                           │
│  ┌─────────────────┐                                │
│  │ Automated Checks │ ← Lint, Test, SAST, Dep Scan  │
│  └─────────────────┘                                │
│         │ Pass                                      │
│         ▼                                           │
│  ┌─────────────────┐                                │
│  │  Peer Review    │ ← 4-Eyes Principle             │
│  └─────────────────┘                                │
│         │ Approved                                  │
│         ▼                                           │
│  ┌─────────────────┐                                │
│  │ Lead Approval   │ ← For production changes       │
│  └─────────────────┘                                │
│         │ Approved                                  │
│         ▼                                           │
│  ┌─────────────────┐                                │
│  │ Deploy to Staging│ ← Automated                   │
│  └─────────────────┘                                │
│         │ Validated                                 │
│         ▼                                           │
│  ┌─────────────────┐                                │
│  │ Deploy to Prod  │ ← GitOps (ArgoCD)              │
│  └─────────────────┘                                │
│         │                                           │
│         ▼                                           │
│  ┌─────────────────┐                                │
│  │ Post-Deploy     │ ← Automated validation         │
│  │ Validation      │   Rollback if failed           │
│  └─────────────────┘                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### CC8.2 – Development Lifecycle

**Control-Beschreibung:**
Software-Entwicklung folgt definierten Standards.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Secure SDLC | Security in every phase | SDLC Policy |
| Code Review | Mandatory for all changes | PR Records |
| Testing | Unit, Integration, E2E, Security | Test Reports |
| Deployment | GitOps, automated pipelines | Pipeline Config |

---

### CC9.1 – Service Organization Considerations

**Control-Beschreibung:**
Dienstleister werden angemessen gemanagt.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Assessment | Vendor Security Assessment | Assessment Reports |
| Contracts | DPA, Security Clauses | Contracts |
| Monitoring | SLA monitoring, annual review | SLA Reports |

---

## AC.2 Availability

### A1.1 – Availability Commitments

**Control-Beschreibung:**
Die Organisation definiert Verfügbarkeits-Commitments.

**CargoBit Umsetzung:**

| Service | SLO Target | Measurement | Nachweis |
|---------|------------|-------------|----------|
| Pricing Service | 99.9% | Prometheus metrics | SLO Dashboard |
| Matching Service | 99.9% | Prometheus metrics | SLO Dashboard |
| Gateway Service | 99.95% | Prometheus metrics | SLO Dashboard |
| API Endpoints | 99.5% | External monitoring | Status Page |

---

### A1.2 – Availability Monitoring

**Control-Beschreibung:**
Die Verfügbarkeit wird überwacht.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Health Checks | Kubernetes probes, synthetic monitors | Health Config |
| Dashboards | Real-time availability dashboard | Grafana Dashboard |
| Alerting | Availability < SLO triggers alert | Alert Rules |
| External Monitoring | Pingdom/UptimeRobot | External Reports |

---

### A1.3 – Incident Handling

**Control-Beschreibung:**
Incidents, die die Verfügbarkeit beeinträchtigen, werden behandelt.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Incident Process | On-call runbooks, escalation | Runbook |
| Response Time | SEV-1: 15min, SEV-2: 1h | SLA Policy |
| Communication | Status page updates | Status Page |
| Recovery | Documented recovery procedures | Recovery Runbook |

---

### A1.4 – Disaster Recovery

**Control-Beschreibung:**
Es gibt Pläne für Disaster Recovery.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| RTO | 1 hour for Tier-1 services | DR Plan |
| RPO | 15 minutes for critical data | DR Plan |
| DR Testing | Semi-annual full DR exercises | DR Test Reports |
| Backup Verification | Daily integrity checks | Backup Logs |

**DR Architecture:**

```
┌─────────────────────────────────────────────────────┐
│              DISASTER RECOVERY                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  PRIMARY REGION (eu-central-1)                      │
│  ┌─────────────────────────────────────────────┐    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐     │    │
│  │  │ Pricing │  │Matching │  │ Gateway │     │    │
│  │  └─────────┘  └─────────┘  └─────────┘     │    │
│  │       │                                       │    │
│  │       ▼                                       │    │
│  │  ┌─────────────┐                             │    │
│  │  │ PostgreSQL  │ ← Primary                   │    │
│  │  └─────────────┘                             │    │
│  └─────────────────────────────────────────────┘    │
│        │                                            │
│        │ Replication (async)                        │
│        ▼                                            │
│  DR REGION (eu-west-1)                              │
│  ┌─────────────────────────────────────────────┐    │
│  │  ┌─────────────┐                             │    │
│  │  │ PostgreSQL  │ ← Replica                   │    │
│  │  └─────────────┘                             │    │
│  │       │                                       │    │
│  │       ▼ (on failover)                         │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐     │    │
│  │  │ Pricing │  │Matching │  │ Gateway │     │    │
│  │  └─────────┘  └─────────┘  └─────────┘     │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Failover Process:                                  │
│  1. Detect failure (automated)                      │
│  2. Promote replica to primary                      │
│  3. Update DNS/routing                              │
│  4. Spin up DR services                             │
│  5. Verify functionality                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## AC.3 Processing Integrity

### PI1.1 – Input Validation

**Control-Beschreibung:**
Eingabedaten werden validiert.

**CargoBit Umsetzung:**

| Service | Validation | Implementierung | Nachweis |
|---------|------------|-----------------|----------|
| Pricing | Schema validation | JSON Schema, business rules | API Spec |
| Matching | Input sanitization | Parameterized queries | Code Review |
| Gateway | Rate limiting, WAF | API Gateway rules | Gateway Config |

**Validation Architecture:**

```
┌─────────────────────────────────────────────────────┐
│              INPUT VALIDATION                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Incoming Request                                   │
│         │                                           │
│         ▼                                           │
│  ┌─────────────────┐                                │
│  │   API Gateway   │                                │
│  │  ─────────────  │                                │
│  │  • Rate Limit   │ ← DoS Protection               │
│  │  • WAF Rules    │ ← Injection Prevention         │
│  │  • Auth Check   │ ← Authorization                │
│  └─────────────────┘                                │
│         │ Pass                                      │
│         ▼                                           │
│  ┌─────────────────┐                                │
│  │  Schema Val.    │ ← JSON Schema Validation       │
│  │  (in Service)   │   for request body             │
│  └─────────────────┘                                │
│         │ Valid                                     │
│         ▼                                           │
│  ┌─────────────────┐                                │
│  │ Business Rules  │ ← Domain-specific validation   │
│  │ Validation      │   (e.g., price range)          │
│  └─────────────────┘                                │
│         │ Valid                                     │
│         ▼                                           │
│  ┌─────────────────┐                                │
│  │ Fraud Checks    │ ← Fraud score calculation      │
│  │                 │   for suspicious patterns      │
│  └─────────────────┘                                │
│         │                                           │
│         ▼                                           │
│  Process Request                                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### PI1.2 – Processing Accuracy

**Control-Beschreibung:**
Die Verarbeitung ist korrekt und vollständig.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Audit Trail | All matching decisions logged | Audit Logs |
| Idempotency | Idempotent processing for retries | Code Review |
| Reconciliation | Daily reconciliation of processed items | Reconciliation Reports |
| Testing | Extensive test coverage for algorithms | Test Reports |

---

### PI1.3 – Completeness

**Control-Beschreibung:**
Die Verarbeitung ist vollständig.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Event Streaming | Kafka with acks=all | Kafka Config |
| Dead Letter Queue | Failed events to DLQ for review | DLQ Monitoring |
| Monitoring | End-to-end flow monitoring | Flow Dashboard |
| Alerts | Processing gap alerts | Alert Rules |

---

### PI1.4 – Processing Monitoring

**Control-Beschreibung:**
Die Verarbeitung wird überwacht.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Metrics | Processing latency, throughput, errors | Metrics Dashboard |
| Anomaly Detection | Fraud score anomalies, volume anomalies | Detection Rules |
| Alerts | Processing degradation alerts | Alert Config |

---

## AC.4 Confidentiality

### C1.1 – Encryption

**Control-Beschreibung:**
Vertrauliche Informationen sind verschlüsselt.

**CargoBit Umsetzung:**

| Scope | Encryption | Key Management | Nachweis |
|-------|------------|----------------|----------|
| In Transit | TLS 1.2+, mTLS | cert-manager, Vault | TLS Config |
| At Rest (DB) | AES-256-GCM | Vault, 90-day rotation | Encryption Config |
| At Rest (Backups) | AES-256-CBC | Vault, separate keys | Backup Config |
| Secrets | Vault encryption | HSM-backed | Vault Config |

---

### C1.2 – Access Restrictions

**Control-Beschreibung:**
Der Zugriff auf vertrauliche Informationen ist eingeschränkt.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Data Classification | Confidential, Internal, Public | Classification Policy |
| Access Controls | ABAC based on classification | Policy Config |
| Network Segmentation | NetworkPolicies for data tier | NetworkPolicy YAML |
| Audit Logging | All data access logged | Audit Logs |

---

### C1.3 – Retention

**Control-Beschreibung:**
Vertrauliche Informationen werden nach definierten Regeln aufbewahrt.

**CargoBit Umsetzung:**

| Data Type | Retention | Disposal | Nachweis |
|-----------|-----------|----------|----------|
| Audit Logs | 24 months | Secure deletion | Retention Policy |
| PII | As per DPA | Secure deletion | DPA |
| Backups | 30 days | Overwrite + deletion | Backup Policy |
| Logs | 90 days | Automated purge | Log Config |

---

## AC.5 Privacy

### P1.1 – PII Inventory

**Control-Beschreibung:**
Die Organisation führt ein Inventar personenbezogener Daten.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Data Inventory | Documented in Data Classification | Inventory Doc |
| Processing Activities | ROPA (Record of Processing Activities) | ROPA |
| Data Flows | Data Flow Diagram | DFD Document |

---

### P1.2 – Consent

**Control-Beschreibung:**
Einwilligungen werden eingeholt und verwaltet.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Privacy Policy | Publicly available, versioned | Privacy Policy |
| Consent Management | Consent tracking in IdP | Consent Records |
| Opt-out | Data deletion requests handled | Deletion Process |

---

### P1.3 – Data Minimization

**Control-Beschreibung:**
Nur notwendige Daten werden erhoben.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Collection Limits | Only necessary fields collected | API Spec |
| Logging | No PII in logs | Logging Policy |
| Retention | Minimum retention for purpose | Retention Policy |

---

### P1.4 – Data Deletion

**Control-Beschreibung:**
Daten werden auf Antrag gelöscht.

**CargoBit Umsetzung:**

| Aspekt | Implementierung | Nachweis |
|--------|-----------------|----------|
| Deletion Request | Documented process, 30-day SLA | Deletion Process |
| Verification | Confirmation of deletion | Deletion Records |
| Backups | Deletion from backups within retention | Backup Policy |

---

## Control Summary Matrix

### Security (CC-Series)

| Control | Control Name | Status | Owner | Review Date |
|---------|--------------|--------|-------|-------------|
| CC1.1 | Control Environment | ✅ Implemented | CISO | Quarterly |
| CC1.2 | Board Oversight | ✅ Implemented | CISO | Quarterly |
| CC1.3 | Management Responsibilities | ✅ Implemented | CISO | Quarterly |
| CC1.4 | Competence | ✅ Implemented | HR | Annually |
| CC2.1 | Communication | ✅ Implemented | Compliance | Quarterly |
| CC2.3 | Whistleblowing | ✅ Implemented | HR | Annually |
| CC3.1 | Risk Assessment | ✅ Implemented | CISO | Monthly |
| CC3.2 | Change Risk | ✅ Implemented | Platform Lead | Per Change |
| CC4.1 | Monitoring | ✅ Implemented | Platform Lead | Continuous |
| CC5.1 | Control Activities | ✅ Implemented | CISO | Quarterly |
| CC5.2 | Technology Controls | ✅ Implemented | Platform Lead | Continuous |
| CC6.1 | Logical Access | ✅ Implemented | Platform Lead | Monthly |
| CC6.2 | Access Registration | ✅ Implemented | Platform Lead | Per Event |
| CC6.3 | Access Removal | ✅ Implemented | Platform Lead | Per Event |
| CC6.4 | Access Review | ✅ Implemented | Managers | Quarterly |
| CC6.5 | Physical Access | ✅ Implemented | IT | Monthly |
| CC6.6 | Network Security | ✅ Implemented | Platform Lead | Monthly |
| CC6.7 | Data Protection | ✅ Implemented | CISO | Quarterly |
| CC7.1 | Vulnerability Mgmt | ✅ Implemented | Security | Weekly |
| CC7.2 | Monitoring | ✅ Implemented | Platform Lead | Continuous |
| CC7.3 | Incident Response | ✅ Implemented | Security | Per Event |
| CC7.4 | Recovery | ✅ Implemented | Platform Lead | Quarterly |
| CC8.1 | Change Management | ✅ Implemented | Platform Lead | Per Change |
| CC8.2 | Development Lifecycle | ✅ Implemented | Dev Leads | Continuous |
| CC9.1 | Service Org | ✅ Implemented | Compliance | Annually |

### Availability (A-Series)

| Control | Control Name | Status | Owner | Review Date |
|---------|--------------|--------|-------|-------------|
| A1.1 | Availability Commitments | ✅ Implemented | Platform Lead | Monthly |
| A1.2 | Availability Monitoring | ✅ Implemented | Platform Lead | Continuous |
| A1.3 | Incident Handling | ✅ Implemented | On-Call | Per Event |
| A1.4 | Disaster Recovery | ✅ Implemented | Platform Lead | Semi-Annual |

### Processing Integrity (PI-Series)

| Control | Control Name | Status | Owner | Review Date |
|---------|--------------|--------|-------|-------------|
| PI1.1 | Input Validation | ✅ Implemented | Dev Leads | Per Release |
| PI1.2 | Processing Accuracy | ✅ Implemented | Dev Leads | Monthly |
| PI1.3 | Completeness | ✅ Implemented | Platform Lead | Daily |
| PI1.4 | Processing Monitoring | ✅ Implemented | Platform Lead | Continuous |

### Confidentiality (C-Series)

| Control | Control Name | Status | Owner | Review Date |
|---------|--------------|--------|-------|-------------|
| C1.1 | Encryption | ✅ Implemented | Security | Quarterly |
| C1.2 | Access Restrictions | ✅ Implemented | Security | Quarterly |
| C1.3 | Retention | ✅ Implemented | Compliance | Quarterly |

### Privacy (P-Series)

| Control | Control Name | Status | Owner | Review Date |
|---------|--------------|--------|-------|-------------|
| P1.1 | PII Inventory | ✅ Implemented | DPO | Annually |
| P1.2 | Consent | ✅ Implemented | Legal | Annually |
| P1.3 | Data Minimization | ✅ Implemented | Dev Leads | Per Release |
| P1.4 | Data Deletion | ✅ Implemented | Compliance | Per Request |

---

## Evidence Collection Schedule

```
┌──────────────────────────────────────────────────────────────┐
│                    EVIDENCE COLLECTION                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  DAILY (Automated)                                           │
│  ├── Backup completion logs                                  │
│  ├── Security scan results                                   │
│  ├── Access logs (automated archival)                        │
│  └── Availability metrics                                    │
│                                                              │
│  WEEKLY                                                      │
│  ├── Vulnerability scan reports                              │
│  ├── Security alert summary                                  │
│  └── Patch compliance report                                 │
│                                                              │
│  MONTHLY                                                     │
│  ├── Access review completion                                │
│  ├── SLA compliance report                                   │
│  ├── Security KPI report                                     │
│  └── Vendor status update                                    │
│                                                              │
│  QUARTERLY                                                   │
│  ├── Control effectiveness testing                           │
│  ├── Policy review status                                    │
│  ├── Backup/restore test results                             │
│  ├── Risk register update                                    │
│  └── Training completion report                              │
│                                                              │
│  ANNUALLY                                                    │
│  ├── Policy updates and sign-offs                            │
│  ├── Vendor re-assessment                                    │
│  ├── Full DR test                                            │
│  ├── Penetration test report                                 │
│  └── External audit results                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

*Dokument-Version: 1.0 | Erstellt: 2024-01 | Nächste Überprüfung: 2025-01*
