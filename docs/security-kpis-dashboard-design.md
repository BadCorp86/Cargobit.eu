# Security-KPIs Dashboard-Design

> **CargoBit Transport Platform** — Security Dashboard für Grafana, PowerBI oder interne Dashboards
>
> *Klar, messbar, relevant — 1:1 umsetzbar*

---

## Übersicht

Dieses Dokument definiert ein komplettes Dashboard-Layout für Security-KPIs mit:

- **6 Dashboard-Sektionen** mit klaren KPIs
- **Visualisierungs-Typen** für jede Metrik
- **Datenquellen** und Query-Beispiele
- **Alerting-Thresholds** für kritische Werte

---

## AD.1 Dashboard-Sektionen

```
┌──────────────────────────────────────────────────────────────┐
│                  SECURITY KPI DASHBOARD                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Row 1: Security Posture    ← Gesamtsicht, Health-Check      │
│  Row 2: Identity & Access   ← AuthN/AuthZ Metriken           │
│  Row 3: Infrastructure      ← Platform Security              │
│  Row 4: Application Security ← Code & API Security           │
│  Row 5: Incident Response   ← IR Performance                 │
│  Row 6: Compliance          ← Audit Readiness                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## AD.2 KPIs pro Sektion

---

### 1. Security Posture

#### 1.1 mTLS Coverage

**Beschreibung:** Prozentsatz der Services mit aktiviertem mTLS

| Metrik | Details |
|--------|---------|
| **Name** | mTLS Coverage |
| **Typ** | Gauge (0-100%) |
| **Datenquelle** | Istio Metrics / Prometheus |
| **Query** | `sum(istio_tcp_connections_opened_total{connection_security_policy="mutual_tls"}) / sum(istio_tcp_connections_opened_total) * 100` |
| **Threshold** | 🟢 ≥95% / 🟡 80-95% / 🔴 <80% |
| **Ziel** | 100% für Production |

**Visualisierung:**
```
┌────────────────────────────┐
│     mTLS COVERAGE          │
│                            │
│        ╭─────────╮         │
│       ╱    97%    ╲        │
│      │      🟢     │       │
│       ╲           ╱        │
│        ╰─────────╯         │
│                            │
│  Target: 100%  Current: 97%│
└────────────────────────────┘
```

---

#### 1.2 NetworkPolicy Coverage

**Beschreibung:** Prozentsatz der Namespaces mit NetworkPolicies

| Metrik | Details |
|--------|---------|
| **Name** | NetworkPolicy Coverage |
| **Typ** | Gauge (0-100%) |
| **Datenquelle** | Kubernetes API / kubectl |
| **Query** | Custom metric from Policy Reporter |
| **Threshold** | 🟢 100% / 🟡 90-99% / 🔴 <90% |
| **Ziel** | 100% für Production Namespaces |

**Visualisierung:**
```
┌────────────────────────────┐
│  NETWORKPOLICY COVERAGE    │
│                            │
│  ████████████████████░ 95% │
│  🟡 Warning: 1 NS missing  │
│                            │
│  Namespaces: 20/21 secured │
└────────────────────────────┘
```

---

#### 1.3 Critical Vulnerabilities

**Beschreibung:** Anzahl der kritischen (CVSS ≥9.0) offenen Vulnerabilities

| Metrik | Details |
|--------|---------|
| **Name** | Critical Vulnerabilities |
| **Typ** | Number (Counter) |
| **Datenquelle** | Trivy/Snyk → Elasticsearch |
| **Query** | `vulnerability_count{severity="critical", status="open"}` |
| **Threshold** | 🟢 0 / 🟡 1-3 / 🔴 >3 |
| **Ziel** | 0 Critical |

**Visualisierung:**
```
┌────────────────────────────┐
│  CRITICAL VULNERABILITIES  │
│                            │
│         ┌─────┐            │
│         │  2  │ 🟡         │
│         └─────┘            │
│                            │
│  SLA: 24h patch time       │
│  Oldest: 12h (in SLA)      │
└────────────────────────────┘
```

---

#### 1.4 Patch Compliance Rate

**Beschreibung:** Prozentsatz der gepatchten Vulnerabilities innerhalb SLA

| Metrik | Details |
|--------|---------|
| **Name** | Patch Compliance |
| **Typ** | Gauge (0-100%) |
| **Datenquelle** | Vulnerability Management System |
| **Query** | `vulnerabilities_patched_within_sla / total_vulnerabilities * 100` |
| **Threshold** | 🟢 ≥95% / 🟡 85-95% / 🔴 <85% |
| **Ziel** | ≥95% |

**Visualisierung:**
```
┌────────────────────────────┐
│    PATCH COMPLIANCE        │
│                            │
│     ██████████████░ 92%    │
│            🟡              │
│                            │
│  Last 30 days: 48/52 SLA   │
└────────────────────────────┘
```

---

### 2. Identity & Access

#### 2.1 Open Admin Accounts

**Beschreibung:** Anzahl der aktiven Admin-Accounts

| Metrik | Details |
|--------|---------|
| **Name** | Active Admin Accounts |
| **Typ** | Number |
| **Datenquelle** | Keycloak / IdP API |
| **Query** | `keycloak_users_count{role="admin", status="enabled"}` |
| **Threshold** | 🟢 ≤3 / 🟡 4-5 / 🔴 >5 |
| **Ziel** | Minimale Anzahl Admins |

**Visualisierung:**
```
┌────────────────────────────┐
│   ACTIVE ADMIN ACCOUNTS    │
│                            │
│         ┌─────┐            │
│         │  3  │ 🟢         │
│         └─────┘            │
│                            │
│  Last reviewed: 3d ago     │
│  Next review: in 4d        │
└────────────────────────────┘
```

---

#### 2.2 MFA Adoption Rate

**Beschreibung:** Prozentsatz der User mit aktiviertem MFA

| Metrik | Details |
|--------|---------|
| **Name** | MFA Adoption |
| **Typ** | Gauge (0-100%) |
| **Datenquelle** | Keycloak / IdP |
| **Query** | `users_with_mfa / total_users * 100` |
| **Threshold** | 🟢 100% / 🟡 95-99% / 🔴 <95% |
| **Ziel** | 100% |

**Visualisierung:**
```
┌────────────────────────────┐
│      MFA ADOPTION          │
│                            │
│  ████████████████████ 100% │
│           🟢              │
│                            │
│  127/127 users enrolled    │
└────────────────────────────┘
```

---

#### 2.3 Access Review Completion

**Beschreibung:** Prozentsatz der durchgeführten Access Reviews

| Metrik | Details |
|--------|---------|
| **Name** | Access Review Completion |
| **Typ** | Gauge (0-100%) |
| **Datenquelle** | Access Management System |
| **Query** | `completed_reviews / total_reviews_required * 100` |
| **Threshold** | 🟢 100% / 🟡 90-99% / 🔴 <90% |
| **Ziel** | 100% bis Quartalsende |

**Visualisierung:**
```
┌────────────────────────────┐
│  ACCESS REVIEW COMPLETION  │
│                            │
│     ████████████████░ 98%  │
│            🟡              │
│                            │
│  Q4/2024: 49/50 reviewed   │
│  Overdue: 1 (escalated)    │
└────────────────────────────┘
```

---

#### 2.4 Failed Login Attempts (Trend)

**Beschreibung:** Trend der fehlgeschlagenen Login-Versuche

| Metrik | Details |
|--------|---------|
| **Name** | Failed Login Trend |
| **Typ** | Line Chart (Time Series) |
| **Datenquelle** | Keycloak Logs / SIEM |
| **Query** | `rate(keycloak_login_failures_total[5m])` |
| **Threshold** | Alert bei >10/min |
| **Ziel** | Keine Anomalien |

**Visualisierung:**
```
┌────────────────────────────────────────────┐
│        FAILED LOGIN ATTEMPTS (30d)         │
├────────────────────────────────────────────┤
│     ▓▓                                    ▓ │
│    ▓▓ ▓▓           ▓▓                    ▓▓│
│   ▓▓ ▓▓ ▓▓        ▓▓ ▓▓        ▓▓       ▓▓│
│  ▓▓ ▓▓ ▓▓ ▓▓     ▓▓ ▓▓ ▓▓     ▓▓ ▓▓     ▓▓│
│ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓  ▓▓ ▓▓ ▓▓ ▓▓  ▓▓ ▓▓ ▓▓  ▓▓ │
├────────────────────────────────────────────┤
│ Week 1    Week 2    Week 3    Week 4      │
│                                            │
│ Max: 145/day  Avg: 23/day  Trend: ↓ 12%   │
└────────────────────────────────────────────┘
```

---

### 3. Infrastructure Security

#### 3.1 Secrets Rotation Age

**Beschreibung:** Alter der Secrets in Tagen (Heatmap)

| Metrik | Details |
|--------|---------|
| **Name** | Secrets Rotation Age |
| **Typ** | Heatmap / Table |
| **Datenquelle** | HashiCorp Vault |
| **Query** | Vault secret metadata (creation_time) |
| **Threshold** | 🟢 <90d / 🟡 90-180d / 🔴 >180d |
| **Ziel** | Alle Secrets <90 Tage |

**Visualisierung:**
```
┌────────────────────────────────────────────┐
│           SECRETS ROTATION AGE             │
├────────────────────────────────────────────┤
│                                            │
│  Secret Path           │ Age     │ Status │
│  ──────────────────────┼─────────┼────────│
│  database/credentials  │  45d    │   🟢   │
│  api/external-keys     │  67d    │   🟢   │
│  kafka/brokers         │  89d    │   🟢   │
│  backup/encryption     │  102d   │   🟡   │
│  legacy/api-key        │  234d   │   🔴   │
│                                            │
│  Distribution:                             │
│  <90d: ████████████████░░░░ 85%           │
│  90-180d: ████░░░░░░░░░░░░░░ 12%          │
│  >180d: ██░░░░░░░░░░░░░░░░░░ 3%           │
└────────────────────────────────────────────┘
```

---

#### 3.2 Exposed Services

**Beschreibung:** Anzahl der direkt aus dem Internet erreichbaren Services

| Metrik | Details |
|--------|---------|
| **Name** | Exposed Services |
| **Typ** | Number |
| **Datenquelle** | Kubernetes Ingress/Service Inventory |
| **Query** | Count of services with LoadBalancer/Ingress |
| **Threshold** | 🟢 Known & documented / 🔴 Unexpected |
| **Ziel** | Nur dokumentierte Exposures |

**Visualisierung:**
```
┌────────────────────────────┐
│     EXPOSED SERVICES       │
│                            │
│         ┌─────┐            │
│         │  4  │ 🟢         │
│         └─────┘            │
│                            │
│  All documented & approved │
│  • api.cargobit.io         │
│  • status.cargobit.io      │
│  • grafana.cargobit.io     │
│  • docs.cargobit.io        │
└────────────────────────────┘
```

---

#### 3.3 Pod Security Violations

**Beschreibung:** Anzahl der Pod Security Policy Violations

| Metrik | Details |
|--------|---------|
| **Name** | PSP Violations |
| **Typ** | Number + Trend |
| **Datenquelle** | Kubernetes Audit Logs / OPA Gatekeeper |
| **Query** | `pod_security_violations_total` |
| **Threshold** | 🟢 0 / 🟡 1-5 / 🔴 >5 |
| **Ziel** | 0 Violations |

**Visualisierung:**
```
┌────────────────────────────┐
│  POD SECURITY VIOLATIONS   │
│                            │
│         ┌─────┐            │
│         │  0  │ 🟢         │
│         └─────┘            │
│                            │
│  Last 30 days: 0           │
│  Trend: ✅ Stable          │
└────────────────────────────┘
```

---

#### 3.4 Drift Detection Events

**Beschreibung:** Anzahl der Konfigurations-Drift Events

| Metrik | Details |
|--------|---------|
| **Name** | Drift Events |
| **Typ** | Table + Count |
| **Datenquelle** | ArgoCD / Terraform State |
| **Query** | GitOps sync status |
| **Threshold** | 🟢 0 / 🟡 1-3 / 🔴 >3 |
| **Ziel** | Kein Drift |

**Visualisierung:**
```
┌────────────────────────────────────────────┐
│           DRIFT DETECTION EVENTS           │
├────────────────────────────────────────────┤
│                                            │
│  Resource        │ Expected │ Actual │ Sts │
│  ────────────────┼──────────┼────────┼─────│
│  pricing-deploy  │ v2.1.3   │ v2.1.3 │ 🟢  │
│  matching-deploy │ v1.8.1   │ v1.8.1 │ 🟢  │
│  gateway-cm      │ rev:47   │ rev:47 │ 🟢  │
│                                            │
│  Summary:                                  │
│  ████████████████████████░░ 0 Drifts      │
│  Last scan: 5 min ago                      │
└────────────────────────────────────────────┘
```

---

### 4. Application Security

#### 4.1 SAST Findings

**Beschreibung:** Anzahl der SAST Findings nach Severity

| Metrik | Details |
|--------|---------|
| **Name** | SAST Findings |
| **Typ** | Stacked Bar Chart |
| **Datenquelle** | SonarQube / GitLab SAST |
| **Query** | SonarQube API |
| **Threshold** | 🟢 Critical: 0, High trending ↓ |
| **Ziel** | 0 Critical, Reduzierung High |

**Visualisierung:**
```
┌────────────────────────────────────────────┐
│         SAST FINDINGS (BY SEVERITY)        │
├────────────────────────────────────────────┤
│                                            │
│  Critical  ████████████████████████  0     │
│  High      ████████████████████████ 12     │
│  Medium    ████████████████████████ 45     │
│  Low       ████████████████████████ 128    │
│                                            │
│  Trend (Last 4 Weeks):                     │
│  Week 1  Week 2  Week 3  Week 4           │
│  █████   ████    ███     ██   ↓ 23%       │
│                                            │
│  Blocker: Critical findings fail build     │
└────────────────────────────────────────────┘
```

---

#### 4.2 DAST Findings

**Beschreibung:** Anzahl der DAST Findings aus dynamischen Scans

| Metrik | Details |
|--------|---------|
| **Name** | DAST Findings |
| **Typ** | Number + Table |
| **Datenquelle** | OWASP ZAP / Burp Suite |
| **Query** | DAST tool API |
| **Threshold** | 🟢 Critical/High: 0 |
| **Ziel** | 0 Critical/High |

**Visualisierung:**
```
┌────────────────────────────────────────────┐
│              DAST FINDINGS                 │
├────────────────────────────────────────────┤
│                                            │
│  Critical: 0  │  High: 1  │  Medium: 8    │
│      🟢       │    🟡     │     🟡        │
│                                            │
│  Open Findings (High):                     │
│  ┌──────────────────────────────────────┐ │
│  │ ID    │ Finding        │ Age  │ Owne │ │
│  ├───────┼────────────────┼──────┼──────┤ │
│  │ D-042 │ XSS reflected  │ 3d   │ Dev1 │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Last Scan: 2024-01-15                     │
│  SLA: High findings within 7 days          │
└────────────────────────────────────────────┘
```

---

#### 4.3 Dependency Vulnerabilities

**Beschreibung:** Anzahl der vulnerablen Dependencies

| Metrik | Details |
|--------|---------|
| **Name** | Dependency Vulnerabilities |
| **Typ** | Table + Trend |
| **Datenquelle** | Snyk / Dependabot |
| **Query** | Snyk API |
| **Threshold** | 🟢 Critical: 0, High trending ↓ |
| **Ziel** | 0 Critical in Production |

**Visualisierung:**
```
┌────────────────────────────────────────────┐
│        DEPENDENCY VULNERABILITIES          │
├────────────────────────────────────────────┤
│                                            │
│  Project          │ Critical │ High │ Med │
│  ─────────────────┼──────────┼──────┼─────│
│  pricing-service  │    0     │   2  │  5  │
│  matching-service │    0     │   1  │  3  │
│  gateway-service  │    0     │   0  │  2  │
│                                            │
│  Trend:                                    │
│  ██████████████████████████░░ ↓ 15%       │
│                                            │
│  Auto-PRs enabled for security updates     │
│  Last dependency update: 2d ago            │
└────────────────────────────────────────────┘
```

---

#### 4.4 API Rate-Limit Violations

**Beschreibung:** Anzahl der Rate-Limit Überschreitungen

| Metrik | Details |
|--------|---------|
| **Name** | Rate-Limit Violations |
| **Typ** | Line Chart |
| **Datenquelle** | API Gateway / Istio |
| **Query** | `rate(gateway_rate_limit_exceeded_total[5m])` |
| **Threshold** | Alert bei sustained increase |
| **Ziel** | Keine Anomalien |

**Visualisierung:**
```
┌────────────────────────────────────────────┐
│      API RATE-LIMIT VIOLATIONS (24h)       │
├────────────────────────────────────────────┤
│                                            │
│     ▓▓                                    ▓ │
│    ▓  ▓            ▓▓                    ▓ │
│   ▓    ▓          ▓  ▓         ▓        ▓▓│
│  ▓      ▓        ▓    ▓       ▓ ▓      ▓  │
│ ▓        ▓      ▓      ▓     ▓   ▓    ▓   │
├────────────────────────────────────────────┤
│ 00:00    06:00    12:00    18:00   24:00  │
│                                            │
│ Total: 847  Avg/min: 0.6  Peak: 23/min    │
│ No anomalies detected                      │
└────────────────────────────────────────────┘
```

---

### 5. Incident Response

#### 5.1 Mean Time To Detect (MTTD)

**Beschreibung:** Durchschnittliche Zeit bis zur Entdeckung eines Incidents

| Metrik | Details |
|--------|---------|
| **Name** | MTTD |
| **Typ** | Number (Minutes) |
| **Datenquelle** | Incident Management System (JIRA) |
| **Query** | Average time from incident start to detection |
| **Threshold** | 🟢 <15min / 🟡 15-30min / 🔴 >30min |
| **Ziel** | <15 Minuten |

**Visualisierung:**
```
┌────────────────────────────┐
│          MTTD              │
│                            │
│         ┌─────┐            │
│         │ 12m │ 🟢         │
│         └─────┘            │
│                            │
│  Target: <15min            │
│  Trend: ↓ 3min (vs last Q) │
└────────────────────────────┘
```

---

#### 5.2 Mean Time To Respond (MTTR)

**Beschreibung:** Durchschnittliche Zeit bis zur Response

| Metrik | Details |
|--------|---------|
| **Name** | MTTR |
| **Typ** | Number (Minutes) |
| **Datenquelle** | Incident Management System |
| **Query** | Average time from detection to response start |
| **Threshold** | 🟢 <30min / 🟡 30-60min / 🔴 >60min |
| **Ziel** | <30 Minuten |

**Visualisierung:**
```
┌────────────────────────────┐
│          MTTR              │
│                            │
│         ┌─────┐            │
│         │ 28m │ 🟢         │
│         └─────┘            │
│                            │
│  Target: <30min            │
│  Trend: ↓ 5min (vs last Q) │
└────────────────────────────┘
```

---

#### 5.3 Incidents per Month

**Beschreibung:** Anzahl der Security Incidents pro Monat

| Metrik | Details |
|--------|---------|
| **Name** | Monthly Incidents |
| **Typ** | Bar Chart |
| **Datenquelle** | Incident Management System |
| **Query** | Count of security incidents by month |
| **Threshold** | Trending ↓ |
| **Ziel** | Reduzierung über Zeit |

**Visualisierung:**
```
┌────────────────────────────────────────────┐
│        INCIDENTS PER MONTH (12m)           │
├────────────────────────────────────────────┤
│                                            │
│  J  F  M  A  M  J  J  A  S  O  N  D        │
│  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓        │
│  5  4  6  3  4  2  3  2  1  2  1  1        │
│                                            │
│  Trend: ↓ 67% (vs start of year)          │
│  Avg: 2.8/month  Total YTD: 34            │
└────────────────────────────────────────────┘
```

---

#### 5.4 Incident Severity Distribution

**Beschreibung:** Verteilung der Incidents nach Severity

| Metrik | Details |
|--------|---------|
| **Name** | Severity Distribution |
| **Typ** | Pie Chart |
| **Datenquelle** | Incident Management System |
| **Query** | Count by severity |
| **Threshold** | SEV-1/2 trending ↓ |
| **Ziel** | Weniger Critical Incidents |

**Visualisierung:**
```
┌────────────────────────────────────────────┐
│      INCIDENT SEVERITY DISTRIBUTION        │
├────────────────────────────────────────────┤
│                                            │
│              SEV-1: 2 (6%)                 │
│                  ┌───┐                     │
│          SEV-2   │   │  SEV-3              │
│          4 (12%) │   │  18 (53%)           │
│           ┌────┐ │   │ ┌────────────┐      │
│           │    │ │   │ │            │      │
│           └────┘ └───┘ └────────────┘      │
│              SEV-4: 10 (29%)               │
│                                            │
│  Total: 34 incidents (YTD)                 │
│  SEV-1/2: 6 (18%)  ← Focus for reduction  │
└────────────────────────────────────────────┘
```

---

### 6. Compliance Readiness

#### 6.1 ISO 27001 Control Coverage

**Beschreibung:** Prozentsatz der implementierten ISO 27001 Controls

| Metrik | Details |
|--------|---------|
| **Name** | ISO Control Coverage |
| **Typ** | Gauge (0-100%) |
| **Datenquelle** | Compliance Management System |
| **Query** | Implemented controls / Total controls |
| **Threshold** | 🟢 ≥95% / 🟡 85-95% / 🔴 <85% |
| **Ziel** | 100% für zertifizierte Controls |

**Visualisierung:**
```
┌────────────────────────────┐
│   ISO 27001 COVERAGE       │
│                            │
│        ╭─────────╮         │
│       ╱    97%    ╲        │
│      │      🟢     │       │
│       ╲           ╱        │
│        ╰─────────╯         │
│                            │
│  Controls: 112/115         │
│  Gap: 3 (remediation plan) │
└────────────────────────────┘
```

---

#### 6.2 SOC2 Evidence Completion

**Beschreibung:** Prozentsatz der gesammelten SOC2 Evidence

| Metrik | Details |
|--------|---------|
| **Name** | Evidence Completion |
| **Typ** | Gauge (0-100%) |
| **Datenquelle** | Evidence Repository |
| **Query** | Collected evidence / Required evidence |
| **Threshold** | 🟢 100% / 🟡 90-99% / 🔴 <90% |
| **Ziel** | 100% vor Audit |

**Visualisierung:**
```
┌────────────────────────────┐
│  SOC2 EVIDENCE COMPLETION  │
│                            │
│     ██████████████████░ 94%│
│            🟡              │
│                            │
│  Collected: 47/50          │
│  Missing: 3 (in progress)  │
└────────────────────────────┘
```

---

#### 6.3 Policy Review Status

**Beschreibung:** Status der Policy-Reviews

| Metrik | Details |
|--------|---------|
| **Name** | Policy Review Status |
| **Typ** | Table |
| **Datenquelle** | Policy Management System |
| **Query** | Policy review dates |
| **Threshold** | 🟢 All reviewed within 12 months |
| **Ziel** | 100% aktuell |

**Visualisierung:**
```
┌────────────────────────────────────────────┐
│          POLICY REVIEW STATUS              │
├────────────────────────────────────────────┤
│                                            │
│  Policy                │ Last Review │ Sts │
│  ──────────────────────┼─────────────┼─────│
│  Information Security  │ 2024-01-15  │ 🟢  │
│  Access Control        │ 2024-02-20  │ 🟢  │
│  Cryptography          │ 2024-03-10  │ 🟢  │
│  Incident Response     │ 2024-04-05  │ 🟢  │
│  Change Management     │ 2024-01-25  │ 🟢  │
│  Supplier Security     │ 2024-02-15  │ 🟢  │
│  Backup & Recovery     │ 2024-03-20  │ 🟢  │
│  Physical Security     │ 2024-04-01  │ 🟢  │
│  Asset Management      │ 2024-01-30  │ 🟢  │
│  Vulnerability Mgmt    │ 2024-02-28  │ 🟢  │
│  Secure Development    │ 2024-03-15  │ 🟢  │
│  Logging & Monitoring  │ 2024-04-10  │ 🟢  │
│                                            │
│  All policies reviewed within 12 months    │
└────────────────────────────────────────────┘
```

---

#### 6.4 Backup/Restore Test Success Rate

**Beschreibung:** Erfolgsrate der Backup/Restore Tests

| Metrik | Details |
|--------|---------|
| **Name** | Backup Test Success |
| **Typ** | Gauge (0-100%) |
| **Datenquelle** | Backup Test Reports |
| **Query** | Successful tests / Total tests |
| **Threshold** | 🟢 100% / 🟡 90-99% / 🔴 <90% |
| **Ziel** | 100% |

**Visualisierung:**
```
┌────────────────────────────┐
│  BACKUP/RESTORE SUCCESS    │
│                            │
│  █████████████████████ 100%│
│           🟢              │
│                            │
│  Tests this quarter: 4/4   │
│  Last test: 2024-01-10     │
│  All RTO/RPO targets met   │
└────────────────────────────┘
```

---

## AD.3 Dashboard-Layout (Visuelle Darstellung)

### Complete Dashboard View

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     CARGOBIT SECURITY DASHBOARD                              │
│                        Last Updated: 2024-01-19 14:32 UTC                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ╔════════════════════════════════════════════════════════════════════════╗ │
│  ║                        ROW 1: SECURITY POSTURE                          ║ │
│  ╠════════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                         ║ │
│  ║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ ║ │
│  ║  │mTLS Coverage │  │NetPol Coverage│ │Crit Vulns   │  │Patch Comp │ ║ │
│  ║  │              │  │              │  │              │  │            │ ║ │
│  ║  │    ╭───╮     │  │    ╭───╮     │  │    ┌───┐    │  │   ┌───┐   │ ║ │
│  ║  │   ╱ 97% ╲    │  │   ╱ 95% ╲    │  │    │ 2 │    │  │   │92%│   │ ║ │
│  ║  │   ╲ 🟢  ╱    │  │   ╲ 🟡  ╱    │  │    │🟡 │    │  │   │🟡 │   │ ║ │
│  ║  │    ╰───╯     │  │    ╰───╯     │  │    └───┘    │  │   └───┘   │ ║ │
│  ║  │  Target:100% │  │  1 NS missing│  │  SLA: 24h   │  │ 48/52 SLA │ ║ │
│  ║  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ ║ │
│  ║                                                                         ║ │
│  ╚════════════════════════════════════════════════════════════════════════╝ │
│                                                                              │
│  ╔════════════════════════════════════════════════════════════════════════╗ │
│  ║                     ROW 2: IDENTITY & ACCESS                            ║ │
│  ╠════════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                         ║ │
│  ║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ ║ │
│  ║  │Admin Accounts│  │MFA Adoption  │  │Access Reviews│  │Failed Login│ ║ │
│  ║  │              │  │              │  │              │  │   (Trend)  │ ║ │
│  ║  │    ┌───┐     │  │██████████████│  │████████████░ │  │    ▓▓     │ ║ │
│  ║  │    │ 3 │     │  │    100%      │  │     98%      │  │   ▓▓ ▓▓   │ ║ │
│  ║  │    │🟢 │     │  │     🟢       │  │     🟡       │  │  ▓▓   ▓▓  │ ║ │
│  ║  │    └───┘     │  │127/127 users │  │ 49/50 done   │  │ ↓ 12%     │ ║ │
│  ║  │ Review: 3d   │  │              │  │1 overdue     │  │Max:145/d  │ ║ │
│  ║  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ ║ │
│  ║                                                                         ║ │
│  ╚════════════════════════════════════════════════════════════════════════╝ │
│                                                                              │
│  ╔════════════════════════════════════════════════════════════════════════╗ │
│  ║                   ROW 3: INFRASTRUCTURE SECURITY                        ║ │
│  ╠════════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                         ║ │
│  ║  ┌────────────────────────────┐  ┌────────────────────────────────┐   ║ │
│  ║  │    SECRETS ROTATION AGE    │  │      EXPOSED SERVICES          │   ║ │
│  ║  │────────────────────────────│  │         ┌───┐                  │   ║ │
│  ║  │ db/creds      45d  🟢      │  │         │ 4 │ 🟢               │   ║ │
│  ║  │ api/keys      67d  🟢      │  │         └───┘                  │   ║ │
│  ║  │ kafka        89d  🟢       │  │  All documented                │   ║ │
│  ║  │ backup      102d  🟡       │  └────────────────────────────────┘   ║ │
│  ║  │ legacy      234d  🔴       │                                       ║ │
│  ║  │ <90d: 85% ████████████░░░  │                                       ║ │
│  ║  └────────────────────────────┘                                       ║ │
│  ║                                                                         ║ │
│  ║  ┌──────────────┐  ┌────────────────────────────────────────────────┐ ║ │
│  ║  │PSP Violations│  │              DRIFT DETECTION                    │ ║ │
│  ║  │    ┌───┐     │  │  Resource       │ Expected │ Actual │ Status   │ ║ │
│  ║  │    │ 0 │     │  │  pricing-deploy │ v2.1.3   │ v2.1.3 │   🟢     │ ║ │
│  ║  │    │🟢 │     │  │  matching-deploy│ v1.8.1   │ v1.8.1 │   🟢     │ ║ │
│  ║  │    └───┘     │  │  gateway-cm     │ rev:47   │ rev:47 │   🟢     │ ║ │
│  ║  │ Last 30d: 0  │  │  Summary: 0 Drifts  Last scan: 5 min ago       │ ║ │
│  ║  └──────────────┘  └────────────────────────────────────────────────┘ ║ │
│  ║                                                                         ║ │
│  ╚════════════════════════════════════════════════════════════════════════╝ │
│                                                                              │
│  ╔════════════════════════════════════════════════════════════════════════╗ │
│  ║                   ROW 4: APPLICATION SECURITY                           ║ │
│  ╠════════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                         ║ │
│  ║  ┌────────────────────────────────┐  ┌──────────────────────────────┐ ║ │
│  ║  │      SAST FINDINGS             │  │      DAST FINDINGS           │ ║ │
│  ║  │  Critical:  ████████████  0    │  │  Critical: 0  │ High: 1     │ ║ │
│  ║  │  High:     ████████████ 12     │  │      🟢       │    🟡       │ ║ │
│  ║  │  Medium:   ████████████ 45     │  │                              │ ║ │
│  ║  │  Low:      ████████████ 128    │  │  High Findings:              │ ║ │
│  ║  │  Trend: ↓ 23%                  │  │  D-042: XSS reflected (3d)   │ ║ │
│  ║  │  Critical blocks build         │  │  SLA: 7 days                 │ ║ │
│  ║  └────────────────────────────────┘  └──────────────────────────────┘ ║ │
│  ║                                                                         ║ │
│  ║  ┌────────────────────────────────────┐  ┌──────────────────────────┐ ║ │
│  ║  │    DEPENDENCY VULNERABILITIES      │  │  RATE-LIMIT VIOLATIONS   │ ║ │
│  ║  │  Project        │ Crit │ High │Med │  │      ▓▓                  │ ║ │
│  ║  │  pricing-svc    │  0   │  2   │ 5  │  │     ▓▓ ▓▓        ▓       │ ║ │
│  ║  │  matching-svc   │  0   │  1   │ 3  │  │    ▓    ▓      ▓▓ ▓▓     │ ║ │
│  ║  │  gateway-svc    │  0   │  0   │ 2  │  │  Trend: ↓  No anomalies  │ ║ │
│  ║  │  Trend: ↓ 15%   │ Auto-PRs enabled │  │  Total: 847  Avg: 0.6/m  │ ║ │
│  ║  └────────────────────────────────────┘  └──────────────────────────┘ ║ │
│  ║                                                                         ║ │
│  ╚════════════════════════════════════════════════════════════════════════╝ │
│                                                                              │
│  ╔════════════════════════════════════════════════════════════════════════╗ │
│  ║                   ROW 5: INCIDENT RESPONSE                              ║ │
│  ╠════════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                         ║ │
│  ║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ ║ │
│  ║  │    MTTD      │  │    MTTR      │  │Monthly Incid │  │ SEV Dist   │ ║ │
│  ║  │              │  │              │  │              │  │            │ ║ │
│  ║  │    ┌───┐     │  │    ┌───┐     │  │ J F M A M J  │  │    SEV-3   │ ║ │
│  ║  │    │12m│     │  │    │28m│     │  │ ▓▓▓▓▓▓▓▓▓▓▓▓ │  │   ██████   │ ║ │
│  ║  │    │🟢 │     │  │    │🟢 │     │  │ 5 4 6 3 4 2  │  │  SEV-4     │ ║ │
│  ║  │    └───┘     │  │    └───┘     │  │ Trend: ↓67%  │  │ ████ SEV-2 │ ║ │
│  ║  │ Target:<15m  │  │ Target:<30m  │  │ Avg: 2.8/mo  │  │ █ SEV-1    │ ║ │
│  ║  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ ║ │
│  ║                                                                         ║ │
│  ╚════════════════════════════════════════════════════════════════════════╝ │
│                                                                              │
│  ╔════════════════════════════════════════════════════════════════════════╗ │
│  ║                   ROW 6: COMPLIANCE READINESS                           ║ │
│  ╠════════════════════════════════════════════════════════════════════════╣ │
│  ║                                                                         ║ │
│  ║  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐   ║ │
│  ║  │ISO 27001 Cov │  │SOC2 Evidence │  │    POLICY REVIEW STATUS    │   ║ │
│  ║  │              │  │              │  │                            │   ║ │
│  ║  │    ╭───╮     │  │████████████░ │  │ Info Sec    │ 2024-01 │ 🟢 │   ║ │
│  ║  │   ╱ 97% ╲    │  │     94%      │  │ Access Ctrl │ 2024-02 │ 🟢 │   ║ │
│  ║  │   ╲ 🟢  ╱    │  │     🟡       │  │ Crypto      │ 2024-03 │ 🟢 │   ║ │
│  ║  │    ╰───╯     │  │ 47/50 done   │  │ IR Policy   │ 2024-04 │ 🟢 │   ║ │
│  ║  │112/115 ctrl  │  │ 3 in progress│  │ ... all reviewed ...       │   ║ │
│  ║  └──────────────┘  └──────────────┘  └────────────────────────────┘   ║ │
│  ║                                                                         ║ │
│  ║  ┌──────────────────────────────────────────────────────────────────┐ ║ │
│  ║  │              BACKUP/RESTORE TEST SUCCESS RATE                    │ ║ │
│  ║  │  ██████████████████████████████████████████████████ 100%        │ ║ │
│  ║  │  Tests this quarter: 4/4  │  Last test: 2024-01-10  │  All OK   │ ║ │
│  ║  └──────────────────────────────────────────────────────────────────┘ ║ │
│  ║                                                                         ║ │
│  ╚════════════════════════════════════════════════════════════════════════╝ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## AD.4 Alerting Configuration

### Critical Alerts (PagerDuty)

```
┌──────────────────────────────────────────────────────────────┐
│                 CRITICAL ALERT RULES                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ALERT NAME              │ CONDITION           │ SEVERITY   │
│  ────────────────────────┼─────────────────────┼────────────│
│  CriticalVulnDetected    │ CVSS >= 9.0 found   │ HIGH       │
│  MTTRBreached            │ MTTR > 60min        │ HIGH       │
│  MTTDBreached            │ MTTD > 30min        │ HIGH       │
│  AdminAccountAnomaly     │ New admin created   │ MEDIUM     │
│  mTLSCoverageDrop        │ Coverage < 90%      │ MEDIUM     │
│  BackupFailure           │ Backup failed       │ HIGH       │
│  DriftDetected           │ Config drift found  │ MEDIUM     │
│  CriticalSASTFinding     │ Critical in code    │ HIGH       │
│  MFAAdoptionDrop         │ Adoption < 95%      │ MEDIUM     │
│  AccessReviewOverdue     │ Review > 7d overdue │ MEDIUM     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Alert Routing

```
┌──────────────────────────────────────────────────────────────┐
│                    ALERT ROUTING                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  HIGH Severity:                                              │
│  ├── PagerDuty → Security On-Call                           │
│  ├── Slack: #security-alerts                                │
│  └── Email: security-team@cargobit.io                       │
│                                                              │
│  MEDIUM Severity:                                            │
│  ├── Slack: #security-alerts                                │
│  └── Email: security-team@cargobit.io                       │
│                                                              │
│  Escalation:                                                 │
│  ├── No ack in 15min → Security Lead                        │
│  ├── No ack in 30min → CISO                                 │
│  └── SEV-1 automatic → CISO + CTO                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## AD.5 Data Sources & Integration

### Prometheus Metrics

```yaml
# prometheus.yml additions
scrape_configs:
  - job_name: 'istio-metrics'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace

  - job_name: 'vault-metrics'
    static_configs:
      - targets: ['vault.vault.svc:8200']

  - job_name: 'keycloak-metrics'
    static_configs:
      - targets: ['keycloak.keycloak.svc:8080']
```

### Grafana Datasources

```
┌──────────────────────────────────────────────────────────────┐
│                  GRAFANA DATASOURCES                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Prometheus                                               │
│     ├── URL: http://prometheus.monitoring.svc:9090          │
│     └── Use for: Metrics, Alerts                            │
│                                                              │
│  2. Loki                                                     │
│     ├── URL: http://loki.monitoring.svc:3100                │
│     └── Use for: Log queries                                │
│                                                              │
│  3. Elasticsearch                                            │
│     ├── URL: http://elasticsearch.logging.svc:9200          │
│     └── Use for: Audit logs, Security events                │
│                                                              │
│  4. PostgreSQL                                               │
│     ├── Host: postgres.readonly.svc                         │
│     └── Use for: Compliance data, Metrics                   │
│                                                              │
│  5. Custom API                                               │
│     ├── URL: http://metrics-api.internal                    │
│     └── Use for: External metrics (Snyk, SonarQube)         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## AD.6 Dashboard Implementation Notes

### Grafana Dashboard JSON (Excerpt)

```json
{
  "dashboard": {
    "title": "CargoBit Security KPIs",
    "uid": "security-kpis",
    "panels": [
      {
        "title": "mTLS Coverage",
        "type": "gauge",
        "gridPos": {"x": 0, "y": 0, "w": 6, "h": 4},
        "targets": [
          {
            "expr": "sum(istio_tcp_connections_opened_total{connection_security_policy=\"mutual_tls\"}) / sum(istio_tcp_connections_opened_total) * 100",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"color": "red", "value": 0},
                {"color": "yellow", "value": 80},
                {"color": "green", "value": 95}
              ]
            },
            "max": 100,
            "min": 0,
            "unit": "percent"
          }
        }
      }
    ]
  }
}
```

### Refresh Intervals

```
┌──────────────────────────────────────────────────────────────┐
│                 REFRESH INTERVALS                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Real-time metrics:    30 seconds                           │
│  Aggregated metrics:   5 minutes                            │
│  Compliance data:      1 hour                               │
│  Historical trends:    Daily refresh                        │
│                                                              │
│  Auto-refresh enabled for all panels                         │
│  Manual refresh button available                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## AD.7 KPI Summary Table

| Sektion | KPI | Ziel | Threshold | Datenquelle |
|---------|-----|------|-----------|-------------|
| Security Posture | mTLS Coverage | 100% | 🟢≥95 / 🟡80-95 / 🔴<80 | Istio |
| Security Posture | NetworkPolicy Coverage | 100% | 🟢100 / 🟡90-99 / 🔴<90 | K8s API |
| Security Posture | Critical Vulns | 0 | 🟢0 / 🟡1-3 / 🔴>3 | Trivy/Snyk |
| Security Posture | Patch Compliance | ≥95% | 🟢≥95 / 🟡85-95 / 🔴<85 | Vuln Mgmt |
| Identity | Admin Accounts | ≤3 | 🟢≤3 / 🟡4-5 / 🔴>5 | Keycloak |
| Identity | MFA Adoption | 100% | 🟢100 / 🟡95-99 / 🔴<95 | Keycloak |
| Identity | Access Review | 100% | 🟢100 / 🟡90-99 / 🔴<90 | Access Mgmt |
| Infrastructure | Secrets Age | <90d | 🟢<90 / 🟡90-180 / 🔴>180 | Vault |
| Infrastructure | PSP Violations | 0 | 🟢0 / 🟡1-5 / 🔴>5 | K8s Audit |
| Infrastructure | Drift Events | 0 | 🟢0 / 🟡1-3 / 🔴>3 | ArgoCD |
| Application | SAST Critical | 0 | 🟢0 / 🔴>0 | SonarQube |
| Application | DAST High+ | 0 | 🟢0 / 🟡1-2 / 🔴>2 | OWASP ZAP |
| Incident | MTTD | <15min | 🟢<15 / 🟡15-30 / 🔴>30 | JIRA |
| Incident | MTTR | <30min | 🟢<30 / 🟡30-60 / 🔴>60 | JIRA |
| Compliance | ISO Coverage | 100% | 🟢≥95 / 🟡85-95 / 🔴<85 | GRC Tool |
| Compliance | SOC2 Evidence | 100% | 🟢100 / 🟡90-99 / 🔴<90 | Evidence Repo |
| Compliance | Backup Tests | 100% | 🟢100 / 🟡90-99 / 🔴<90 | Test Reports |

---

*Dokument-Version: 1.0 | Erstellt: 2024-01 | Nächste Überprüfung: 2025-01*
