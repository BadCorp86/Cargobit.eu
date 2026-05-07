# DQ – Stakeholder-FAQ

> **Zweck**: Häufige Fragen von Stakeholdern (Management, Security, Compliance, Audit) mit präzisen Antworten. Reduziert Rückfragen und beschleunigt Entscheidungen.

---

## 📋 FAQ – Kategorien

| Kategorie | Zielgruppe |
|-----------|------------|
| Allgemein | Alle Stakeholder |
| Security | Security Team, CISO |
| Compliance | Revision, Auditoren |
| Operations | SRE, Platform Engineering |
| Business | Management, Product Owner |

---

## 🎯 Allgemein

### Q1: Was ist der Governance Postcheck?

**A**: Der Governance Postcheck ist ein automatisiertes System, das sicherstellt, dass alle Deployments compliant, signiert, gescannt, audit-fähig und rollback-fähig sind. Er prüft jedes Artefakt vor dem Deployment auf Sicherheits- und Governance-Kriterien.

---

### Q2: Warum brauchen wir das?

**A**: 
- Reduzierte Audit-Kosten durch automatisierte Nachweise
- Minimiertes Sicherheitsrisiko durch verpflichtende Scans
- Höhere Deployment-Sicherheit durch Admission Enforcement
- Vollständige Nachvollziehbarkeit aller Releases

---

### Q3: Wer ist verantwortlich?

**A**:
| Rolle | Verantwortung |
|-------|---------------|
| Platform Engineering | Pipeline & Tools |
| Security | Policies & Standards |
| SRE | Betrieb & Monitoring |
| CI/CD Team | Automation |

---

## 🔐 Security

### Q4: Wie werden Images signiert?

**A**: Alle Images werden mittels **Keyless Signing** mit cosign signiert. Die Authentifizierung erfolgt über OIDC (GitHub/GitLab), keine manuellen Schlüssel erforderlich. Jede Signatur wird im Rekor Transparency Log gespeichert.

```bash
# Signatur erstellen
cosign sign --keyless ghcr.io/app:v1.0

# Signatur verifizieren
cosign verify --keyless ghcr.io/app:v1.0
```

---

### Q5: Was passiert bei Vulnerabilities?

**A**:
| Severity | Aktion |
|----------|--------|
| CRITICAL | Deployment blockiert |
| HIGH | Deployment blockiert |
| MEDIUM | Warning, Deployment möglich |
| LOW | Info-Log |

Die Policies können pro Projekt angepasst werden.

---

### Q6: Wie oft werden Scans durchgeführt?

**A**:
- **Build-Zeit**: Bei jedem Commit/PR
- **Runtime**: Täglich (scheduled scan)
- **On-Demand**: Manuell möglich

---

### Q7: Was ist eine SBOM und warum brauchen wir sie?

**A**: Eine **Software Bill of Materials (SBOM)** listet alle Komponenten eines Software-Artefakts auf:
- Alle Dependencies (direkt & transitiv)
- Versionen und Lizenzen
- CVE-Informationen

**Vorteile**:
- Schnelle Reaktion auf Zero-Day-Vulnerabilities
- Compliance-Nachweis (z.B. DSGVO, Cybersicherheit)
- Lieferketten-Transparenz

---

## 📋 Compliance

### Q8: Welche Standards werden erfüllt?

**A**:
| Standard | Kontrolle | Umsetzung |
|----------|-----------|-----------|
| DSGVO Art. 32 | Sicherheit der Verarbeitung | Encryption, Signing |
| DSGVO Art. 25 | Privacy by Design | Security-by-Default |
| ISO 27001 A.12.6.1 | Vulnerability Management | Trivy Scans |
| ISO 27001 A.14.2.2 | Änderungskontrolle | GitOps Pipeline |
| SOC 2 | Security | Admission Policy |

---

### Q9: Was ist im Audit-Bundle enthalten?

**A**:
```
audit/
├── 01_build/        → Dockerfile, Build-Logs, SBOM, Trivy
├── 02_signing/      → cosign Logs, Rekor Index
├── 03_ci_cd/        → Pipeline-Definition, Verify-Logs
├── 04_deployment/   → Canary-Manifest, Rollback-Test
└── 05_governance/   → Security Policy, Key Rotation, Exceptions
```

Alle Artefakte sind reproduzierbar und über Rekor nachvollziehbar.

---

### Q10: Wie werden Exceptions dokumentiert?

**A**:
1. **Request**: Ticket im Service-Desk
2. **Approval**: Security Team + Tech Lead
3. **Documentation**: `audit/05_governance/EXCEPTIONS.md`
4. **Review**: Quartalsweise Überprüfung aller Exceptions

---

### Q11: Wie lange werden Logs aufbewahrt?

**A**:
| Log-Typ | Aufbewahrung |
|---------|--------------|
| Build Logs | 90 Tage |
| Signatur Logs (Rekor) | Permanent |
| Audit Logs | 7 Jahre |
| Security Scan Results | 1 Jahr |

---

## 🔧 Operations

### Q12: Wie funktionieren Canary Deployments?

**A**:
```
5% Traffic (15 min) → 25% (30 min) → 50% (30 min) → 100%
     │                    │               │
     └── SLO Check ───────┴───────────────┘
```

Bei SLO-Verletzung: Automatischer Rollback auf vorherige Version.

---

### Q13: Was passiert bei einem Rollback?

**A**:
| Typ | Trigger | Aktion |
|-----|---------|--------|
| **Hard Rollback** | Error Rate > 1% | Sofortiger Rollback |
| **Soft Rollback** | SLO-Verletzung nach 15 min | Rollback nach Monitoring |

```bash
# Rollback ausführen
./rollback.sh --version v1.2.3
```

---

### Q14: Wie oft wird der Signing-Key rotiert?

**A**:
- **Standard**: Alle 90 Tage
- **Emergency**: Bei Verdacht auf Kompromittierung
- **Automatisch**: Via CI/CD Pipeline

Benachrichtigung: 14 Tage vor Ablauf.

---

### Q15: Was sind die SLO-Targets?

**A**:
| Tier | Service | Availability | Error Budget |
|------|---------|--------------|--------------|
| 1 (Critical) | API, Auth | 99.9% | 43.8 sec/Tag |
| 2 (Core) | Task Queue | 99.5% | 7.2 min/Tag |
| 3 (Supporting) | Dashboard | 99.0% | 14.4 min/Tag |

---

## 💼 Business

### Q16: Wie hoch ist der ROI?

**A**:
| Metric | Vorher | Nachher | Verbesserung |
|--------|--------|---------|--------------|
| Audit-Vorbereitung | 2 Wochen | 2 Tage | -85% |
| Security Incidents | 5/Jahr | 1/Jahr | -80% |
| Deployment-Fehler | 15% | 2% | -87% |
| MTTR | 4h | 30min | -87% |

---

### Q17: Welche Risiken werden minimiert?

**A**:
| Risiko | Mitigation |
|--------|------------|
| Unbefugte Deployments | Admission Enforcement |
| Vulnerable Images | Trivy + SBOM |
| Lieferketten-Angriffe | Signing + Rekor |
| Audit-Risiko | Vollständige Dokumentation |
| Datenschutzverstoß | DSGVO-konforme Prozesse |

---

### Q18: Wie sieht der Go-Live-Zeitplan aus?

**A**:
| Phase | Dauer | Aktivität |
|-------|-------|-----------|
| Phase 1 | 1 Woche | Staging Deployment |
| Phase 2 | 2 Wochen | Canary (5-10%) |
| Phase 3 | 1 Woche | Full Rollout |
| Phase 4 | Dauerhaft | Monitoring & Optimization |

---

### Q19: Was kostet das System?

**A**:
| Kostenart | Betrag |
|-----------|--------|
| Initial Setup | Intern (Platform Team) |
| CI/CD Runner | Bestehende Infrastruktur |
| Storage (Logs, SBOM) | ~50 GB/Monat |
| Wartung | 0.2 FTE |

**Kostenersparnis**: Audit-Aufwand -85%, Incident-Kosten -80%

---

### Q20: Wo finde ich Unterstützung?

**A**:
| Kanal | Zweck |
|-------|-------|
| 📧 governance@company.com | Formale Anfragen |
| 💬 #governance-support | Quick Questions |
| 📖 docs.company.com/governance | Dokumentation |
| 🎫 Service Desk | Tickets & Requests |

---

## 📎 Guided Links

| Thema | Block / Datei |
|-------|---------------|
| Executive Announcement | → `developer-portal-DJ.md` |
| Audit-Bundle | → `developer-portal-DK.md` |
| Compliance-Memo | → `developer-portal-DO.md` |
| Release-Poster | → `developer-portal-DN.md` |
| Training-Deck | → `developer-portal-DP.md` |

---

*Block DQ – Stakeholder-FAQ – v1.0*
