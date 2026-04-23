# Vendor Security Assessment Framework

**CargoBit Transport Platform**  
**Framework zur Bewertung externer Dienstleister**  
**Dokument-ID:** VENDOR-SEC-2025-001  
**Klassifikation:** Intern – Procurement, Legal, Security  
**Datum:** 15. Januar 2025

---

## 1. Executive Summary

Dieses Framework definiert den Prozess zur Sicherheitsbewertung von externen Dienstleistern und Lieferanten. Es stellt sicher, dass alle Vendor-Beziehungen ein angemessenes Sicherheitsniveau aufweisen und Compliance-Anforderungen erfüllt werden.

### Zielsetzung

| Ziel | Beschreibung |
|------|--------------|
| Risiko-Identifikation | Sicherheitsrisiken bei Vendors frühzeitig erkennen |
| Compliance-Sicherung | Einhaltung regulatorischer Anforderungen gewährleisten |
| Entscheidungsgrundlage | Objektive Basis für Vendor-Auswahl schaffen |
| Kontinuierliche Überwachung | Regelmäßige Re-Evaluierung sicherstellen |

---

## 2. Assessment-Kategorien

### 2.1 Kategorien-Übersicht

| Nr. | Kategorie | Gewicht | Fokus |
|-----|-----------|---------|-------|
| 1 | Security Governance | 15% | Policies, Leadership |
| 2 | Access Control | 15% | AuthN/AuthZ, MFA |
| 3 | Infrastructure Security | 15% | Network, Encryption |
| 4 | Application Security | 10% | Pentests, SDLC |
| 5 | Data Protection & Privacy | 15% | Encryption, DSGVO |
| 6 | Compliance & Certifications | 15% | ISO, SOC2 |
| 7 | Incident Response | 10% | Process, Reporting |
| 8 | Business Continuity | 5% | DR, Backups |

### 2.2 Detaillierte Anforderungen

#### Kategorie 1: Security Governance

| ID | Anforderung | Score 3 | Score 2 | Score 1 |
|----|-------------|---------|---------|---------|
| 1.1 | Information Security Policy | Formal dokumentiert, jährlich review | Dokumentiert, unregelmäßiger Review | Keine Policy |
| 1.2 | CISO / Security Lead | Dedizierte Rolle, direkt berichtend | Teilzeit-Zuweisung | Keine definierte Rolle |
| 1.3 | Security Budget | Ausreichend budgetiert | Begrenzte Ressourcen | Kein Budget |
| 1.4 | Risk Management | Formales Risiko-Management Prozess | Ad-hoc Risiko-Bewertung | Kein Prozess |
| 1.5 | Security Awareness | Regelmäßige Trainings für alle | Einmalige Trainings | Keine Trainings |

#### Kategorie 2: Access Control

| ID | Anforderung | Score 3 | Score 2 | Score 1 |
|----|-------------|---------|---------|---------|
| 2.1 | MFA | MFA für alle Zugänge | MFA für Admins | Kein MFA |
| 2.2 | Access Reviews | Quartalsweise, dokumentiert | Jährlich | Keine Reviews |
| 2.3 | Least Privilege | RBAC + ABAC implementiert | RBAC implementiert | Kein formales System |
| 2.4 | Joiner/Mover/Leaver | Automatisierter Prozess | Halbautomatisch | Manueller Prozess |
| 2.5 | Privileged Access | PAM-Lösung, Session Recording | Kontrollierter Zugriff | Keine Kontrolle |

#### Kategorie 3: Infrastructure Security

| ID | Anforderung | Score 3 | Score 2 | Score 1 |
|----|-------------|---------|---------|---------|
| 3.1 | TLS/mTLS | TLS 1.3, mTLS intern | TLS 1.2+ | Alte TLS Versionen |
| 3.2 | Network Segmentation | Micro-Segmentation | VLANs/Basis-Segmentierung | Flat Network |
| 3.3 | Firewall/WAF | WAF + Next-Gen Firewall | Basis Firewall | Keine Firewall |
| 3.4 | Endpoint Security | EDR + MDM | Antivirus | Kein Schutz |
| 3.5 | Cloud Security | CSPM, Security Configs | Basis Cloud Security | Unkonfiguriert |

#### Kategorie 4: Application Security

| ID | Anforderung | Score 3 | Score 2 | Score 1 |
|----|-------------|---------|---------|---------|
| 4.1 | Penetration Tests | Jährlich, externe Firma | Interne Tests | Keine Tests |
| 4.2 | SAST/DAST | In CI/CD integriert | Gelegentlich | Keine Tools |
| 4.3 | Dependency Scanning | Automatisch, blockend | Automatisch, warnend | Manuell |
| 4.4 | Secure SDLC | Threat Modeling, Code Reviews | Code Reviews | Kein Prozess |
| 4.5 | Vulnerability Remediation | < 7 Tage für Critical | < 30 Tage | Kein SLA |

#### Kategorie 5: Data Protection & Privacy

| ID | Anforderung | Score 3 | Score 2 | Score 1 |
|----|-------------|---------|---------|---------|
| 5.1 | Encryption at Rest | AES-256, Key Management | Basis Encryption | Keine Encryption |
| 5.2 | Data Classification | Vollständig klassifiziert | Teilweise | Keine Klassifizierung |
| 5.3 | DSGVO Compliance | DPO ernannt, Processes | Teilweise | Nicht compliant |
| 5.4 | Data Retention | Automatisiert, dokumentiert | Manuelles System | Keine Policy |
| 5.5 | Data Deletion | Automatisiert, verified | Auf Anfrage | Kein Prozess |

#### Kategorie 6: Compliance & Certifications

| ID | Anforderung | Score 3 | Score 2 | Score 1 |
|----|-------------|---------|---------|---------|
| 6.1 | ISO 27001 | Zertifiziert, aktuell | In Zertifizierung | Nicht zertifiziert |
| 6.2 | SOC 2 Type II | Aktuelles Report | Type I | Kein SOC 2 |
| 6.3 | Audit Reports | Regelmäßig, öffentlich | Auf Anfrage | Keine Reports |
| 6.4 | Regulatory Compliance | Alle relevanten erfüllt | Teilweise | Nicht compliant |
| 6.5 | Right to Audit | Vertraglich garantiert | Auf Anfrage | Nicht möglich |

#### Kategorie 7: Incident Response

| ID | Anforderung | Score 3 | Score 2 | Score 1 |
|----|-------------|---------|---------|---------|
| 7.1 | IR Plan | Dokumentiert, getestet | Dokumentiert | Kein Plan |
| 7.2 | Incident Reporting | < 24h Meldung, 24/7 | < 72h Meldung | Keine SLA |
| 7.3 | IR Team | Dediziertes Team | Teilzeit | Kein Team |
| 7.4 | Post-Incident | Lessons Learned, Report | Dokumentation | Kein Follow-up |
| 7.5 | Communication | Definierte Kontakte, SLAs | Ad-hoc | Keine Communication |

#### Kategorie 8: Business Continuity

| ID | Anforderung | Score 3 | Score 2 | Score 1 |
|----|-------------|---------|---------|---------|
| 8.1 | DR Plan | Dokumentiert, jährlich getestet | Dokumentiert | Kein Plan |
| 8.2 | Backup Strategy | Täglich, getestet, off-site | Täglich, on-site | Unregelmäßig |
| 8.3 | RTO/RPO | Definiert und getestet | Definiert | Nicht definiert |
| 8.4 | Redundancy | Multi-Region, HA | Single-Region HA | Single Point of Failure |
| 8.5 | Crisis Management | Plan, Übungen | Plan | Kein Plan |

---

## 3. Fragebogen

### 3.1 Governance

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SECTION 1: GOVERNANCE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1.1 Information Security Policy                                    │
│  □ Ja, formale Policy mit jährlichem Review                        │
│  □ Ja, aber unregelmäßiger Review                                  │
│  □ Nein                                                            │
│  Dokument verfügbar? □ Ja □ Nein                                   │
│                                                                     │
│  1.2 CISO / Security Lead                                           │
│  □ Dedizierte Vollzeit-Rolle                                       │
│  □ Teilzeit / Kombination mit anderer Rolle                        │
│  □ Keine definierte Rolle                                          │
│  Name: _______________ Berichtslinie: _______________              │
│                                                                     │
│  1.3 Security Budget                                                │
│  □ Dediziertes Budget                                              │
│  □ Teil des IT-Budgets                                             │
│  □ Kein definiertes Budget                                         │
│                                                                     │
│  1.4 Risk Management                                                │
│  □ Formales RM-Framework (z.B. ISO 27005)                          │
│  □ Ad-hoc Prozesse                                                 │
│  □ Kein definierter Prozess                                        │
│                                                                     │
│  1.5 Security Awareness Training                                    │
│  □ Regelmäßig für alle Mitarbeiter (Quartalsweise+)                │
│  □ Einmalig / Bei Onboarding                                       │
│  □ Keine Trainings                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Access Control

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SECTION 2: ACCESS CONTROL                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  2.1 Multi-Factor Authentication                                    │
│  □ MFA für alle Benutzerkonten                                     │
│  □ MFA nur für Administrative Zugänge                              │
│  □ Kein MFA                                                        │
│  MFA-Methoden: □ TOTP □ FIDO2 □ SMS □ Hardware Key                │
│                                                                     │
│  2.2 Access Reviews                                                 │
│  □ Quartalsweise oder häufiger                                     │
│  □ Jährlich                                                        │
│  □ Keine regelmäßigen Reviews                                      │
│  Letzter Review: _______________                                    │
│                                                                     │
│  2.3 Least Privilege / RBAC                                         │
│  □ RBAC + ABAC implementiert                                       │
│  □ RBAC implementiert                                              │
│  □ Kein formales Berechtigungssystem                               │
│                                                                     │
│  2.4 Joiner/Mover/Leaver Process                                    │
│  □ Vollautomatisiert mit HR-Integration                            │
│  □ Halbautomatisch (teilweise manuell)                             │
│  □ Vollständig manuell                                             │
│  SLA für Zugangssperrung: _______ Stunden                          │
│                                                                     │
│  2.5 Privileged Access Management                                   │
│  □ PAM-Lösung mit Session Recording                                │
│  □ Kontrollierter Zugang ohne PAM                                  │
│  □ Keine spezifische Kontrolle                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Infrastructure Security

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SECTION 3: INFRASTRUCTURE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  3.1 TLS / Encryption in Transit                                    │
│  □ TLS 1.3 für extern, mTLS intern                                 │
│  □ TLS 1.2+ für extern                                             │
│  □ TLS < 1.2 oder unsichere Protokolle                             │
│                                                                     │
│  3.2 Network Segmentation                                           │
│  □ Micro-Segmentation / Zero Trust                                 │
│  □ VLANs / Basis-Segmentierung                                     │
│  □ Flat Network                                                    │
│                                                                     │
│  3.3 Firewall / WAF                                                 │
│  □ WAF + Next-Gen Firewall                                         │
│  □ Basis Firewall                                                  │
│  □ Keine Firewall                                                  │
│                                                                     │
│  3.4 Endpoint Security                                              │
│  □ EDR + MDM + Endpoint Hardening                                  │
│  □ Antivirus + Basis-Konfiguration                                 │
│  □ Kein Endpoint-Schutz                                            │
│                                                                     │
│  3.5 Cloud Security                                                 │
│  □ CSPM + Cloud Security Best Practices                            │
│  □ Basis Cloud Security                                            │
│  □ Keine Cloud Security Measures                                   │
│  Cloud Provider: _______________                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.4 Application Security

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SECTION 4: APPLICATION SECURITY                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  4.1 Penetration Testing                                            │
│  □ Jährlich durch externe Firma                                    │
│  □ Intern oder unregelmäßig                                        │
│  □ Keine Penetration Tests                                         │
│  Letzter Pentest: _______________                                   │
│  Bericht verfügbar? □ Ja □ Nein □ Redacted                         │
│                                                                     │
│  4.2 SAST / DAST                                                    │
│  □ In CI/CD Pipeline integriert                                    │
│  □ Gelegentlich / Manuell                                          │
│  □ Keine automatisierten Tests                                     │
│  Tools: _______________                                             │
│                                                                     │
│  4.3 Dependency / Supply Chain Scanning                             │
│  □ Automatisch, blockt kritische Vulnerabilities                   │
│  □ Automatisch, nur Warnungen                                      │
│  □ Manuell oder gar nicht                                          │
│                                                                     │
│  4.4 Secure SDLC                                                    │
│  □ Threat Modeling + Code Reviews + Security Gates                 │
│  □ Code Reviews                                                    │
│  □ Kein definierter Prozess                                        │
│                                                                     │
│  4.5 Vulnerability Remediation SLA                                  │
│  □ Critical < 7 Tage, High < 30 Tage                              │
│  □ SLA definiert, aber nicht immer eingehalten                     │
│  □ Kein definiertes SLA                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.5 Data Protection

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SECTION 5: DATA PROTECTION                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  5.1 Encryption at Rest                                             │
│  □ AES-256 mit Key Management System                               │
│  □ Basis Encryption                                                │
│  □ Keine Encryption                                                │
│  Key Management: □ AWS KMS □ Vault □ Andere: _____                │
│                                                                     │
│  5.2 Data Classification                                            │
│  □ Vollständig klassifiziert, Policy implementiert                 │
│  □ Teilweise klassifiziert                                         │
│  □ Keine Klassifizierung                                           │
│                                                                     │
│  5.3 DSGVO / Privacy Compliance                                     │
│  □ Vollständig compliant, DPO ernannt                              │
│  □ Teilweise compliant                                             │
│  □ Nicht compliant                                                 │
│  DPO Kontakt: _______________                                       │
│                                                                     │
│  5.4 Data Retention                                                 │
│  □ Automatisierte Retention, dokumentiert                          │
│  □ Manuelles System                                                │
│  □ Keine Retention Policy                                          │
│                                                                     │
│  5.5 Data Deletion                                                  │
│  □ Automatisiert mit Verification                                  │
│  □ Auf Anfrage manuell                                             │
│  □ Kein definierter Prozess                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.6 Compliance

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SECTION 6: COMPLIANCE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  6.1 ISO 27001 Certification                                        │
│  □ Zertifiziert, aktuelles Zertifikat                             │
│  □ In Zertifizierung / geplant                                    │
│  □ Nicht zertifiziert                                              │
│  Zertifikat gültig bis: _______________                            │
│                                                                     │
│  6.2 SOC 2                                                          │
│  □ SOC 2 Type II, aktuelles Report                                │
│  □ SOC 2 Type I                                                   │
│  □ Kein SOC 2                                                     │
│  Report-Datum: _______________                                      │
│                                                                     │
│  6.3 Audit Reports verfügbar?                                       │
│  □ Ja, können zur Verfügung gestellt werden                        │
│  □ Ja, unter NDA                                                  │
│  □ Nein                                                            │
│                                                                     │
│  6.4 Weitere relevante Zertifizierungen                            │
│  □ ISO 27701 □ HIPAA □ PCI DSS □ Andere: _____                    │
│                                                                     │
│  6.5 Right to Audit                                                 │
│  □ Vertraglich garantiert                                         │
│  □ Auf Anfrage möglich                                            │
│  □ Nicht möglich                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.7 Incident Response

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SECTION 7: INCIDENT RESPONSE                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  7.1 Incident Response Plan                                         │
│  □ Dokumentiert und regelmäßig getestet                           │
│  □ Dokumentiert, nicht getestet                                   │
│  □ Kein Plan                                                       │
│  Letzter Test: _______________                                      │
│                                                                     │
│  7.2 Incident Reporting SLA                                         │
│  □ < 24 Stunden, 24/7 erreichbar                                  │
│  □ < 72 Stunden                                                   │
│  □ Kein definiertes SLA                                           │
│  Security-Contact: _______________                                  │
│                                                                     │
│  7.3 Incident Response Team                                         │
│  □ Dediziertes Team                                               │
│  □ Teilzeit / Kombination mit anderen Rollen                      │
│  □ Kein definiertes Team                                          │
│                                                                     │
│  7.4 Post-Incident Process                                          │
│  □ Formaler Lessons-Learned-Prozess, Report                      │
│  □ Dokumentation der Incidents                                    │
│  □ Kein definierter Prozess                                       │
│                                                                     │
│  7.5 Customer Communication                                         │
│  □ Definierte Kommunikationskanäle und SLAs                      │
│  □ Ad-hoc Kommunikation                                           │
│  □ Keine definierte Kommunikation                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.8 Business Continuity

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SECTION 8: BUSINESS CONTINUITY                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  8.1 Disaster Recovery Plan                                         │
│  □ Dokumentiert und jährlich getestet                             │
│  □ Dokumentiert, nicht getestet                                   │
│  □ Kein Plan                                                       │
│  Letzter Test: _______________                                      │
│                                                                     │
│  8.2 Backup Strategy                                                │
│  □ Täglich, getestet, off-site storage                            │
│  □ Täglich, on-site                                               │
│  □ Unregelmäßig oder gar nicht                                    │
│                                                                     │
│  8.3 RTO / RPO                                                      │
│  □ Definiert und in Tests bestätigt                               │
│  □ Definiert, nicht getestet                                      │
│  □ Nicht definiert                                                 │
│  RTO: _______ Stunden    RPO: _______ Stunden                     │
│                                                                     │
│  8.4 Redundancy / High Availability                                 │
│  □ Multi-Region / Multi-Cloud, HA                                │
│  □ Single-Region HA                                               │
│  □ Single Point of Failure                                        │
│                                                                     │
│  8.5 Crisis Management                                              │
│  □ Dokumentierter Plan mit regelmäßigen Übungen                   │
│  □ Plan vorhanden                                                  │
│  □ Kein Plan                                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Scoring-Modell

### 4.1 Score-Berechnung

```
Gesamtscore = Σ (Kategorie-Score × Gewicht)

Beispiel:
  Governance:      2.5 × 15% = 0.375
  Access Control:  2.8 × 15% = 0.420
  Infrastructure:  2.2 × 15% = 0.330
  Application:     2.0 × 10% = 0.200
  Data Protection: 2.5 × 15% = 0.375
  Compliance:      3.0 × 15% = 0.450
  Incident Resp:   2.0 × 10% = 0.200
  Business Cont:   2.0 × 5%  = 0.100
  ─────────────────────────────────
  Gesamtscore:                      2.45
```

### 4.2 Score-Interpretation

| Score | Bedeutung | Empfehlung |
|-------|-----------|------------|
| **3.0** | Enterprise-Level Security | Vendor uneingeschränkt akzeptiert |
| **2.5 - 2.9** | Gute Security, kleinere Lücken | Vendor akzeptiert |
| **2.0 - 2.4** | Solide, aber mit Lücken | Mit Auflagen akzeptiert |
| **1.5 - 1.9** | Signifikante Risiken | Nur mit erheblichen Auflagen |
| **< 1.5** | Unzureichende Security | Vendor ablehnen |

### 4.3 Entscheidungslogik

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VENDOR DECISION MATRIX                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Score ≥ 2.5 ─────────────────────────────────────────────────────▶│
│                                                                     │
│      ┌─────────────────────────────────────────────────────────┐   │
│      │  VENDOR AKZEPTIERT                                      │   │
│      │                                                          │   │
│      │  • Standard-Vertrag mit Security-Klauseln              │   │
│      │  • Jährliche Re-Evaluierung                             │   │
│      │  • Incident-Reporting SLA                               │   │
│      └─────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Score 1.5 – 2.4 ─────────────────────────────────────────────────▶│
│                                                                     │
│      ┌─────────────────────────────────────────────────────────┐   │
│      │  MIT AUFLAGEN AKZEPTIERT                                │   │
│      │                                                          │   │
│      │  Auflagen dokumentieren:                                 │   │
│      │  • Fristen für Verbesserungen                           │   │
│      │  • Kompensierende Controls unsererseits                 │   │
│      │  • Erhöhte Überwachung                                  │   │
│      │  • Quartalsweise Review statt jährlich                  │   │
│      └─────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Score < 1.5 ─────────────────────────────────────────────────────▶│
│                                                                     │
│      ┌─────────────────────────────────────────────────────────┐   │
│      │  VENDOR ABGELEHNT                                       │   │
│      │                                                          │   │
│      │  • Risiko zu hoch                                       │   │
│      │  • Alternative Anbieter evaluieren                      │   │
│      │  • Bei strategischer Notwendigkeit:                     │   │
│      │    Executive Approval + umfassende Mitigation           │   │
│      └─────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Required Artifacts

### 5.1 Dokumente anfordern

| Dokument | Zweck | Wann anfordern |
|----------|-------|----------------|
| ISO 27001 Zertifikat | Compliance-Nachweis | Vor Vertrag |
| SOC 2 Type II Report | Security Controls | Vor Vertrag |
| Penetration Test Report | Application Security | Vor Vertrag |
| Incident Response Plan | IR Capability | Bei Bedarf |
| Data Flow Diagram | Data Handling | Bei Datenverarbeitung |
| Architektur-Übersicht | Infrastructure | Bei Hosting-Services |
| SLA-Dokument | Verfügbarkeit | Vor Vertrag |
| DPA (Data Processing Agreement) | DSGVO | Bei personenbezogenen Daten |
| Insurance Certificate | Risk Transfer | Bei kritischem Vendor |

### 5.2 Dokument-Checkliste

```
□ ISO 27001 Zertifikat (gültig)
□ SOC 2 Type II Report (< 12 Monate)
□ Penetration Test Report (< 12 Monate)
□ Incident Response Plan
□ Data Flow Diagram
□ Architektur-Dokumentation
□ SLA-Dokument
□ DPA / AV-Vertrag
□ Insurance Certificate
□ Security Policy (Auszug)
□ NDAs
```

---

## 6. Assessment-Prozess

### 6.1 Prozess-Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VENDOR ASSESSMENT PROCESS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Phase 1: Initiation                                                │
│  ─────────────────────                                              │
│  □ Vendor identifiziert durch Procurement/Business                 │
│  □ Initialer Risk-Tier bestimmt (Critical/Important/Standard)      │
│  □ Assessment-Team assigned                                        │
│                                                                     │
│          │                                                          │
│          ▼                                                          │
│                                                                     │
│  Phase 2: Information Gathering                                     │
│  ───────────────────────────────                                    │
│  □ Fragebogen an Vendor gesendet                                   │
│  □ Dokumente angefordert                                           │
│  □ Zertifikate verifiziert                                         │
│  □ Referenzen eingeholt (optional)                                 │
│                                                                     │
│          │                                                          │
│          ▼                                                          │
│                                                                     │
│  Phase 3: Assessment                                                │
│  ──────────────────                                                 │
│  □ Fragebogen ausgewertet                                          │
│  □ Score berechnet                                                 │
│  □ Gap-Analyse erstellt                                            │
│  □ Risiko-Bewertung dokumentiert                                   │
│                                                                     │
│          │                                                          │
│          ▼                                                          │
│                                                                     │
│  Phase 4: Decision                                                  │
│  ──────────────                                                     │
│  □ Entscheidung gemäß Score-Matrix                                 │
│  □ Auflagen definiert (falls nötig)                                │
│  □ Approval durch CISO/Procurement                                 │
│  □ Vendor informiert                                               │
│                                                                     │
│          │                                                          │
│          ▼                                                          │
│                                                                     │
│  Phase 5: Contract & Monitoring                                     │
│  ─────────────────────────────────                                  │
│  □ Security-Klauseln in Vertrag                                    │
│  □ Re-Evaluations-Termin gesetzt                                   │
│  □ Monitoring-Kadenz definiert                                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Timeline

| Phase | Dauer | Verantwortlich |
|-------|-------|----------------|
| Initiation | 1-2 Tage | Procurement |
| Information Gathering | 1-2 Wochen | Security Team |
| Assessment | 3-5 Tage | Security Team |
| Decision | 2-3 Tage | CISO + Procurement |
| Contract & Setup | 1-2 Wochen | Legal + Procurement |

---

## 7. Re-Evaluation

### 7.1 Re-Evaluation-Zeitplan

| Vendor-Tier | Häufigkeit | Auslöser |
|-------------|------------|----------|
| Critical | Jährlich + bei Änderungen | Security Incident, Contract Renewal |
| Important | Alle 2 Jahre | Contract Renewal |
| Standard | Bei Bedarf | Verdacht auf Probleme |

### 7.2 Auslöser für Ad-hoc Assessment

- Security Incident beim Vendor
- Signifikante Änderungen am Service
- Negative Presse / Reputation
- Expiration von Zertifikaten
- Audit-Findings

---

## 8. Template: Assessment-Report

```markdown
# Vendor Security Assessment Report

## 1. Grundinformationen
- **Vendor-Name:** _______________
- **Service/Produkt:** _______________
- **Assessment-Datum:** _______________
- **Assessor:** _______________
- **Risk Tier:** □ Critical □ Important □ Standard

## 2. Score-Übersicht
| Kategorie | Score | Gewicht | Beitrag |
|-----------|-------|---------|---------|
| Governance | __ | 15% | __ |
| Access Control | __ | 15% | __ |
| Infrastructure | __ | 15% | __ |
| Application | __ | 10% | __ |
| Data Protection | __ | 15% | __ |
| Compliance | __ | 15% | __ |
| Incident Response | __ | 10% | __ |
| Business Continuity | __ | 5% | __ |
| **Gesamt** | | | **__** |

## 3. Stärken
- 
- 
- 

## 4. Schwächen / Gaps
- 
- 
- 

## 5. Empfehlung
□ Akzeptiert
□ Mit Auflagen akzeptiert
□ Abgelehnt

## 6. Auflagen (falls zutreffend)
| Auflage | Frist | Verantwortlich |
|---------|-------|----------------|
| | | |

## 7. Genehmigung
| Rolle | Name | Datum |
|-------|------|-------|
| CISO | | |
| Procurement Lead | | |
```

---

## 9. Dokument-Information

| Attribut | Wert |
|-----------|------|
| Owner | Security Team |
| Reviewer | Procurement, Legal |
| Version | 1.0 |
| Status | Aktiv |
| Nächster Review | 2026-01-15 |

---

**Genehmigung:**

| Rolle | Name | Unterschrift | Datum |
|-------|------|--------------|-------|
| CISO | | | |
| Procurement Lead | | | |
| Legal | | | |
