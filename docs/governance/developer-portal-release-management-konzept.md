# 🧱 BLOCK AC — Developer-Portal Release-Management-Konzept

## Wie neue Versionen des Portals geplant, getestet und veröffentlicht werden

### Strukturiertes Release-Management für das CargoBit Developer Portal

Dieses Dokument definiert den Release-Management-Prozess für das CargoBit Developer Portal.

---

## 1. Release-Ziele

### 1.1 Primäre Ziele

| Ziel | Beschreibung | Metrik |
|------|--------------|--------|
| **Stabilität** | Keine Regressionen durch Releases | < 0.1% Rollback-Rate |
| **Vorhersehbarkeit** | Klare Release-Termine | 95% pünktliche Releases |
| **Transparenz** | Sichtbare Änderungen | 100% Changelog-Abdeckung |
| **Minimale Risiken** | Getestete Releases | 0 kritische Bugs nach Release |

### 1.2 Release-Prinzipien

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       Release Principles                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   1. Kleine, häufige Releases                                            │
│      Weniger Risiko, schnellere Feedback-Zyklen                          │
│                                                                           │
│   2. Automatisierung                                                     │
│      CI/CD für konsistente, reproduzierbare Deployments                  │
│                                                                           │
│   3. Feature Flags                                                       │
│      Entkopplung von Deployment und Release                              │
│                                                                           │
│   4. Rollback-Fähigkeit                                                  │
│      Schnelle Rücknahme bei Problemen                                    │
│                                                                           │
│   5. Transparente Kommunikation                                          │
│      Stakeholder rechtzeitig informieren                                 │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Release-Arten

### 2.1 Release-Kategorien

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Release Types                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ PATCH RELEASE (v1.0.x)                                          │   │
│   │                                                                  │   │
│   │ Häufigkeit: Nach Bedarf (mehrere pro Woche möglich)            │   │
│   │ Dauer: 1-2 Tage                                                  │   │
│   │ Scope:                                                           │   │
│   │   • Bugfixes                                                     │   │
│   │   • Broken Links                                                 │   │
│   │   • Kleine Content-Korrekturen                                  │   │
│   │   • Typo-Fixes                                                   │   │
│   │   • UI-Minor-Fixes                                              │   │
│   │                                                                  │   │
│   │ Approval: Content Owner                                         │   │
│   │ QA: Basic Regression                                             │   │
│   │ Downtime: Keiner                                                │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ MINOR RELEASE (v1.x.0)                                          │   │
│   │                                                                  │   │
│   │ Häufigkeit: 2-wöchentlich                                       │   │
│   │ Dauer: 1-2 Wochen                                                │   │
│   │ Scope:                                                           │   │
│   │   • Neue Dokumentationsseiten                                   │   │
│   │   • Neue Tool-Features                                          │   │
│   │   • UI-Verbesserungen                                           │   │
│   │   • Performance-Optimierungen                                   │   │
│   │   • Neue Sprachunterstützung                                    │   │
│   │                                                                  │   │
│   │ Approval: Portal Owner                                          │   │
│   │ QA: Full Regression                                              │   │
│   │ Downtime: Keiner (Blue-Green)                                   │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ MAJOR RELEASE (vx.0.0)                                          │   │
│   │                                                                  │   │
│   │ Häufigkeit: Quartalsweise                                       │   │
│   │ Dauer: 4-8 Wochen                                                │   │
│   │ Scope:                                                           │   │
│   │   • Neue Information Architecture                               │   │
│   │   • Design-System-Updates                                       │   │
│   │   • Große Tool-Erweiterungen                                    │   │
│   │   • Technologie-Stack-Updates                                   │   │
│   │   • Breaking Changes (mit Migration)                            │   │
│   │                                                                  │   │
│   │ Approval: VP Engineering                                        │   │
│   │ QA: Full Regression + Performance + Security                    │   │
│   │ Downtime: Ggf. kurzfristig (geplant)                            │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Release-Kalender

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Release Calendar 2024                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Q1 2024                                                               │
│   ────────                                                               │
│   Jan 15: v2.1.0 (Minor) - API Explorer Enhancements                    │
│   Jan 29: v2.1.1 (Patch) - Bugfixes                                      │
│   Feb 12: v2.2.0 (Minor) - Webhook Debugger Pro                         │
│   Feb 26: v2.2.1 (Patch) - Performance Fixes                            │
│   Mar 11: v2.3.0 (Minor) - i18n German                                  │
│   Mar 25: v3.0.0 (Major) - Design System 2.0                            │
│                                                                           │
│   Q2 2024                                                               │
│   ────────                                                               │
│   Apr 08: v3.0.1 (Patch) - Post-Launch Fixes                            │
│   Apr 22: v3.1.0 (Minor) - Partner Dashboard                            │
│   May 06: v3.1.1 (Patch) - Bugfixes                                      │
│   May 20: v3.2.0 (Minor) - Analytics Dashboard                          │
│   Jun 03: v3.2.1 (Patch) - Security Patches                             │
│   Jun 17: v3.3.0 (Minor) - i18n French                                  │
│                                                                           │
│   Q3 2024                                                               │
│   ────────                                                               │
│   Jul 01: v3.3.1 (Patch) - Bugfixes                                      │
│   Jul 15: v3.4.0 (Minor) - Sandbox 2.0                                  │
│   Aug 05: v3.4.1 (Patch) - Performance                                  │
│   Aug 19: v3.5.0 (Minor) - API Explorer v2                              │
│   Sep 02: v3.5.1 (Patch) - Bugfixes                                      │
│   Sep 16: v4.0.0 (Major) - Platform 4.0                                 │
│                                                                           │
│   Q4 2024                                                               │
│   ────────                                                               │
│   Oct 01: v4.0.1 (Patch) - Post-Launch Fixes                            │
│   Oct 15: v4.1.0 (Minor) - Enterprise Features                          │
│   Nov 05: v4.1.1 (Patch) - Security Updates                             │
│   Nov 19: v4.2.0 (Minor) - i18n Spanish                                 │
│   Dec 03: v4.2.1 (Patch) - Bugfixes                                      │
│   Dec 17: v4.2.2 (Patch) - Year-End Fixes                               │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Release-Prozess

### 3.1 Prozess-Übersicht

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Release Process                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Phase 1: Planning                                                      │
│   ─────────────────                                                      │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │
│   │  Scope      │ ─▶ │  Tickets    │ ─▶ │  QA Plan    │                │
│   │  Definition │    │  Creation   │    │  Creation   │                │
│   └─────────────┘    └─────────────┘    └─────────────┘                │
│                                                                           │
│   Phase 2: Development                                                   │
│   ────────────────────                                                   │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │
│   │  Content    │ ─▶ │    UI       │ ─▶ │   Tools     │                │
│   │  Creation   │    │  Updates    │    │  Updates    │                │
│   └─────────────┘    └─────────────┘    └─────────────┘                │
│          │                  │                  │                         │
│          └──────────────────┼──────────────────┘                         │
│                             │                                            │
│                             ▼                                            │
│                      ┌─────────────┐                                    │
│                      │    i18n     │                                    │
│                      │  Updates    │                                    │
│                      └─────────────┘                                    │
│                                                                           │
│   Phase 3: QA                                                            │
│   ───────────                                                            │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │
│   │  Full       │ ─▶ │Accessibility│ ─▶ │ Performance │                │
│   │  Regression │    │   Tests     │    │   Tests     │                │
│   └─────────────┘    └─────────────┘    └─────────────┘                │
│                             │                                            │
│                             ▼                                            │
│                      ┌─────────────┐                                    │
│                      │  Security   │                                    │
│                      │   Tests     │                                    │
│                      └─────────────┘                                    │
│                                                                           │
│   Phase 4: Release                                                       │
│   ─────────────────                                                      │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │
│   │  Deploy to  │ ─▶ │   Smoke     │ ─▶ │   Full      │                │
│   │  Staging    │    │   Tests     │    │   Deploy    │                │
│   └─────────────┘    └─────────────┘    └─────────────┘                │
│                                                                           │
│   Phase 5: Post-Release                                                  │
│   ───────────────────                                                    │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │
│   │ Changelog   │ ─▶ │  Analytics  │ ─▶ │  Developer  │                │
│   │  Publish    │    │   Review    │    │  Feedback   │                │
│   └─────────────┘    └─────────────┘    └─────────────┘                │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Phase 1: Planning

**Checkliste:**

| Item | Verantwortlich | Deadline |
|------|----------------|----------|
| Release-Scope definieren | Portal Owner | -2 Wochen |
| Jira-Tickets erstellen | Tech Lead | -2 Wochen |
| QA-Plan erstellen | QA Lead | -1 Woche |
| i18n-Scope definieren | i18n Owner | -1 Woche |
| Stakeholder informieren | Portal Owner | -1 Woche |

**Scope-Dokument:**

```markdown
# Release v2.1.0 Scope

## Summary
API Explorer Enhancements mit verbessertem Code-Editor und Response-Viewer.

## Features
- [ ] Code Editor mit Auto-Complete
- [ ] Response Timing Metrics
- [ ] Code Snippet Expansion (Go, Java)

## Content
- [ ] Update API Reference für neue Features
- [ ] Add Guide für Auto-Complete

## i18n
- [ ] Translate new strings (DE, FR)

## Bugfixes
- [ ] Fix code copy button
- [ ] Fix dark mode toggle

## Timeline
- Development Start: Jan 01
- Code Freeze: Jan 10
- QA Start: Jan 11
- QA End: Jan 13
- Release: Jan 15
```

### 3.3 Phase 2: Development

**Branching Strategy:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       Branching Strategy                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   main (Production)                                                      │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│        │                                                                  │
│        └──────────────────────┐                                         │
│                                 │                                         │
│   develop (Integration)       ▼                                         │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│        │                                                                  │
│        ├──────────────────────┼──────────────────────┐                  │
│        │                      │                      │                  │
│   feature/api-explorer  feature/code-editor  feature/response-viewer   │
│   ━━━━━━━━━━━━━━━━━━━   ━━━━━━━━━━━━━━━━━━━   ━━━━━━━━━━━━━━━━━━━━      │
│                                                                           │
│   Rules:                                                                 │
│   • feature/* für neue Features                                          │
│   • fix/* für Bugfixes                                                   │
│   • content/* für Content-Updates                                        │
│   • PRs benötigen 2 Approvals                                            │
│   • CI muss grün sein                                                    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Phase 3: QA

**QA-Checkliste:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      QA Sign-off Checklist                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Functional Testing:                                                    │
│   [ ] Alle neuen Features funktionieren                                  │
│   [ ] Alle Bugfixes sind verifiziert                                     │
│   [ ] Keine Regressionen entdeckt                                        │
│   [ ] Cross-Browser Testing (Chrome, Firefox, Safari)                   │
│   [ ] Responsive Testing (Desktop, Tablet, Mobile)                      │
│                                                                           │
│   Content Testing:                                                       │
│   [ ] Alle Content-Updates sind korrekt                                  │
│   [ ] Links sind funktionierend                                          │
│   [ ] Code-Beispiele sind ausführbar                                     │
│   [ ] i18n ist vollständig                                               │
│                                                                           │
│   Performance Testing:                                                   │
│   [ ] Lighthouse Score > 95                                              │
│   [ ] Core Web Vitals in Ziel                                            │
│   [ ] Keine Performance-Regression                                       │
│                                                                           │
│   Accessibility Testing:                                                 │
│   [ ] Axe Scan ohne Violations                                           │
│   [ ] Tastaturnavigation funktioniert                                    │
│   [ ] Screenreader-kompatibel                                            │
│                                                                           │
│   Security Testing:                                                      │
│   [ ] Keine neuen Vulnerabilities                                        │
│   [ ] Dependency Scan bestanden                                          │
│   [ ] Security Headers korrekt                                           │
│                                                                           │
│   Sign-off:                                                              │
│   QA Lead: ________________  Date: ____________                         │
│   Tech Lead: _______________  Date: ____________                        │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.5 Phase 4: Release

**Deployment-Pipeline:**

```yaml
# Deployment Pipeline
stages:
  - name: Staging
    trigger: manual
    environment: staging
    steps:
      - build
      - test
      - deploy
      
  - name: Smoke Tests
    trigger: automatic
    steps:
      - health-check
      - critical-path-tests
      
  - name: Production
    trigger: manual
    environment: production
    strategy: blue-green
    steps:
      - deploy-blue
      - smoke-tests-blue
      - switch-traffic
      - monitor
      
  - name: Post-Deploy
    trigger: automatic
    steps:
      - verify-metrics
      - send-notification
      - update-changelog
```

**Blue-Green Deployment:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Blue-Green Deployment                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Before Release:                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                  │   │
│   │   Users ─────────────────▶ Blue (v2.0.0) ───────────────▶ DB    │   │
│   │                              │                                   │   │
│   │                              │ Active                            │   │
│   │                              ▼                                   │   │
│   │                          Green (v2.0.0)                         │   │
│   │                              │                                   │   │
│   │                              │ Inactive                          │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│   During Release:                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                  │   │
│   │   Users ─────────────────▶ Blue (v2.0.0) ───────────────▶ DB    │   │
│   │                              │                                   │   │
│   │                              │ Active                            │   │
│   │                              ▼                                   │   │
│   │                          Green (v2.1.0)  ◀─── Deploy            │   │
│   │                              │                                   │   │
│   │                              │ Warming up                        │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│   After Release:                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                  │   │
│   │   Users ─────────────────▶ Blue (v2.0.0)                        │   │
│   │                              │                                   │   │
│   │                              │ Inactive (Rollback ready)        │   │
│   │                              ▼                                   │   │
│   │                          Green (v2.1.0) ───────────────▶ DB     │   │
│   │                              │                                   │   │
│   │                              │ Active                            │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.6 Phase 5: Post-Release

**Post-Release-Checkliste:**

| Task | Verantwortlich | Timing |
|------|----------------|--------|
| Changelog veröffentlichen | Content Owner | Sofort |
| Slack-Ankündigung | Portal Owner | Sofort |
| Email an Partner | Marketing | < 1 Stunde |
| Analytics-Monitoring | Tech Lead | 24 Stunden |
| Support-Briefing | Support Lead | < 4 Stunden |
| Retrospective | Team | 1 Woche |

---

## 4. Rollback-Prozess

### 4.1 Rollback-Entscheidung

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Rollback Decision Matrix                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Kriterien für Rollback:                                                │
│                                                                           │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Severity │ Error Rate │ Response Time │ Decision                 │   │
│   ├─────────────────────────────────────────────────────────────────┤   │
│   │ Critical │ > 10%      │ N/A           │ Immediate Rollback       │   │
│   │ High     │ > 5%       │ > 3x baseline │ Rollback within 15 min  │   │
│   │ Medium   │ > 2%       │ > 2x baseline │ Assess, potentially fix │   │
│   │ Low      │ > 1%       │ > 1.5x base   │ Fix forward             │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│   Rollback Authority:                                                    │
│   • Critical/High: Any Engineer (PagerDuty)                             │
│   • Medium: Tech Lead                                                    │
│   • Low: Normal fix process                                              │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Rollback-Prozedur

```bash
# Rollback Script
#!/bin/bash

# Get current version
CURRENT=$(kubectl get service portal -o jsonpath='{.spec.selector.version}')

# Get previous version
PREVIOUS=$(kubectl get deployment portal-blue -o jsonpath='{.spec.template.metadata.labels.version}')

# Switch traffic back
kubectl patch service portal -p "{\"spec\":{\"selector\":{\"version\":\"$PREVIOUS\"}}}"

# Verify
kubectl rollout status deployment/portal-$PREVIOUS

# Notify
./notify-rollback.sh $CURRENT $PREVIOUS
```

---

## 5. Release-Artefakte

### 5.1 Changelog

```markdown
# Changelog

## [2.1.0] - 2024-01-15

### Added
- API Explorer: Auto-Complete für Endpoints
- API Explorer: Response Timing Metrics
- Code Snippets: Go und Java Support
- i18n: German translations für neue Features

### Changed
- Verbesserte Performance des Code Editors
- Dark Mode Toggle Animation

### Fixed
- Code Copy Button funktioniert jetzt zuverlässig
- Broken Links in API Reference behoben
- Mobile Navigation verbessert

### Security
- Dependency Updates für Sicherheitslücken

### Performance
- LCP verbessert von 1.8s auf 1.3s
- Bundle Size reduziert um 15%

## [2.0.1] - 2024-01-08

### Fixed
- Webhook Debugger Performance Issue
- Accessibility Labels für Buttons
```

### 5.2 Release Notes

```markdown
# Release Notes v2.1.0

## Highlights

### 🚀 API Explorer Auto-Complete
Der API Explorer unterstützt jetzt Auto-Complete für alle Endpoints. 
Beginnen Sie zu tippen und sehen Sie Vorschläge.

### ⏱️ Response Timing Metrics
Sehen Sie genau, wie lange Ihre API-Requests dauern, 
aufgeschlüsselt nach DNS, Verbindung und Response.

### 🌐 Neue Code-Sprachen
Go und Java sind jetzt in den Code-Snippets verfügbar.

## Breaking Changes
Keine Breaking Changes in diesem Release.

## Known Issues
- Safari hat ein bekanntes Problem mit dem Copy-Button (Fix in 2.1.1)

## Upgrading
Keine Migration notwendig. Automatisch verfügbar.

## Feedback
Haben Sie Feedback? Kontaktieren Sie uns unter feedback@cargobit.dev
```

### 5.3 Deployment Checklist

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Deployment Checklist                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Pre-Deploy:                                                            │
│   [ ] QA Sign-off erhalten                                               │
│   [ ] Staging erfolgreich deployed                                       │
│   [ ] Smoke Tests auf Staging bestanden                                  │
│   [ ] Changelog vorbereitet                                              │
│   [ ] Rollback-Plan dokumentiert                                         │
│   [ ] Stakeholder informiert                                             │
│   [ ] On-Call Engineer verfügbar                                         │
│                                                                           │
│   Deploy:                                                                │
│   [ ] Green Environment deployed                                         │
│   [ ] Health Checks bestanden                                            │
│   [ ] Smoke Tests auf Green bestanden                                    │
│   [ ] Traffic zu Green gewechselt                                        │
│   [ ] Monitoring Dashboards geprüft                                      │
│                                                                           │
│   Post-Deploy:                                                           │
│   [ ] Error Rate normal                                                  │
│   [ ] Response Times normal                                              │
│   [ ] Changelog veröffentlicht                                           │
│   [ ] Ankündigungen versendet                                            │
│   [ ] Blue Environment bereit für Rollback                               │
│                                                                           │
│   Sign-off:                                                              │
│   Tech Lead: ________________  Time: ____________                       │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Release-Communikation

### 6.1 Kommunikations-Plan

| Stakeholder | Kanal | Timing | Inhalt |
|-------------|-------|--------|--------|
| **Engineering Team** | Slack #releases | -1 Woche | Release Plan |
| **QA Team** | Slack #qa | -1 Woche | QA Scope |
| **Support Team** | Email | -1 Tag | Release Notes |
| **Partner** | Email | Release Tag | Feature Highlights |
| **Public** | Changelog | Release Tag | Full Changelog |
| **Social Media** | Twitter, LinkedIn | Release Tag | Announcement |

### 6.2 Kommunikations-Templates

**Internal Slack Announcement:**

```
🚀 Release v2.1.0 deployed to production!

✨ Features:
• API Explorer Auto-Complete
• Response Timing Metrics
• Go & Java Code Snippets

🐛 Fixes:
• Code Copy Button
• Broken Links
• Mobile Navigation

📊 Metrics:
• LCP: 1.3s (-28%)
• Error Rate: 0.1% (stable)

🔗 Changelog: https://cargobit.dev/changelog

Questions? Ping @portal-team
```

**Partner Email:**

```
Subject: CargoBit Developer Portal v2.1.0 - New Features Available

Dear Partner,

We're excited to announce new features in the CargoBit Developer Portal:

✨ API Explorer Auto-Complete
   Get instant suggestions as you type endpoints

⏱️ Response Timing Metrics
   See detailed timing for every API request

🌐 New Code Languages
   Go and Java snippets now available

All features are immediately available in your dashboard.

View the full changelog: https://cargobit.dev/changelog

Questions? Contact your account manager or reply to this email.

Best regards,
The CargoBit Team
```

---

## 7. Release-Metriken

### 7.1 Release-Dashboard

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      Release Metrics Dashboard                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Release Success Rate: 98.5%                                           │
│   ████████████████████████████████████████████░░░░                      │
│                                                                           │
│   ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐           │
│   │ Mean Lead Time  │ │ Rollback Rate   │ │ Deploy Frequency │           │
│   │                 │ │                 │ │                  │           │
│   │    8.5 Tage     │ │      1.5%       │ │    2.1/Woche    │           │
│   │   ✓ Good        │ │   ✓ Excellent   │ │   ✓ Good         │           │
│   └─────────────────┘ └─────────────────┘ └─────────────────┘           │
│                                                                           │
│   ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│   Release History (Last 6 Months)                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐│
│   │                                                                      ││
│   │   Major:  ██                                                2       ││
│   │   Minor:  ████████████████████████████████                 12       ││
│   │   Patch:  ████████████████████████████████████████████    24       ││
│   │                                                                      ││
│   └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│   ─────────────────────────────────────────────────────────────────────── │
│                                                                           │
│   Recent Releases                                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐│
│   │ Version │ Date       │ Status    │ Issues │ Rollback               ││
│   ├─────────────────────────────────────────────────────────────────────┤│
│   │ v2.1.0  │ 2024-01-15 │ ✅ Success│ 0      │ No                     ││
│   │ v2.0.1  │ 2024-01-08 │ ✅ Success│ 1      │ No                     ││
│   │ v2.0.0  │ 2024-01-01 │ ✅ Success│ 2      │ No                     ││
│   │ v1.9.0  │ 2023-12-15 │ ⚠️ Issues │ 3      │ No                     ││
│   │ v1.8.0  │ 2023-12-01 │ ✅ Success│ 0      │ No                     ││
│   └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

*Dieses Release-Management-Konzept gewährleistet strukturierte, nachvollziehbare und risikoarme Releases für das CargoBit Developer Portal.*
