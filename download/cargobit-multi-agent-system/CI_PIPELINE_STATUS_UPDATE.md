# Slack/Teams Announcement Templates – Go-Live

Vorlagen für Release-Ankündigungen auf Slack und Microsoft Teams.

---

## 🚀 Slack Announcement Template

### Pre-Release Ankündigung

```text
🚀 *Release Ankündigung – Governance Postcheck v2.0.0*

Hallo @everyone,

wir starten heute den Release-Prozess für Governance Postcheck v2.0.0.

*📅 Timeline:*
• Canary Start: Heute 14:00 Uhr
• Go/No-Go Meeting: Morgen 10:00 Uhr
• Production Release: Bei positiver Entscheidung

*📊 Was ist neu:*
• Vollständige OIDC/Keyless-Signing Integration
• Automatisierte SBOM-Generierung
• Kyverno Admission Policies
• Verbesserte Canary-Rollout-Strategie

*🔍 Status verfolgen:*
RELEASE_STATUS.md im Repo oder #release-updates Channel

Bei Fragen: @release-manager

Vielen Dank an alle Beteiligten! 🙏
```

---

### Go-Live Ankündigung

```text
🎉 *GO-LIVE – Governance Postcheck v2.0.0*

@everyone – Wir haben grünes Licht! 🟢

*✅ Go/No-Go Entscheidung: GO*
Das Go/No-Go Meeting wurde erfolgreich abgeschlossen.
Alle Kriterien sind erfüllt, Canary war stabil.

*📦 Release Details:*
• Version: v2.0.0
• Digest: `sha256:abc123...`
• Release Time: 2024-01-22 15:00 CET

*🔐 Security:*
• ✅ Trivy Scan: Keine CRITICAL Findings
• ✅ Signatur: Rekor-Index dokumentiert
• ✅ SBOM: Verfügbar im Release-Artefakt

*📊 Canary Results:*
• Dauer: 48h stabil
• Error Rate: 0.02% (Target: <0.1%)
• P99 Latency: 145ms (Target: <500ms)

*🔗 Links:*
• Release Notes: https://github.com/ORG/REPO/releases/tag/v2.0.0
• Dashboard: https://grafana.internal/d/governance
• Runbook: docs/runbooks/post-release.md

*📞 Support:*
Bei Problemen: #incident-response oder @sre-oncall

Danke an alle für die Unterstützung! 🙌
```

---

### Rollback Ankündigung

```text
⚠️ *ROLLBACK – Governance Postcheck v2.0.0*

@everyone – Wir haben einen Rollback durchgeführt.

*🔴 Grund:*
Erhöhte Error-Rate nach 50% Canary Promotion.
Error Rate: 2.3% (Threshold: 0.1%)

*📊 Timeline:*
• 14:30 – Canary promotion auf 50%
• 14:45 – Error-Rate Alert ausgelöst
• 15:00 – Rollback initiiert
• 15:05 – Service stabil (v1.9.5)

*✅ Aktueller Status:*
• Service läuft auf v1.9.5
• Alle SLOs erfüllt
• Kein User Impact nach Rollback

*📝 Nächste Schritte:*
1. Post-Incident Review: Morgen 10:00 Uhr
2. Root Cause Analysis läuft
3. Fixes werden entwickelt

*📞 Kontakt:*
@release-manager @sre-oncall

Mehr Details im Incident-Channel: #inc-2024-0122
```

---

## 📱 Microsoft Teams Announcement Template

### Pre-Release Ankündigung

```json
{
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "themeColor": "0076D7",
  "summary": "Release Ankündigung – Governance Postcheck v2.0.0",
  "sections": [{
    "activityTitle": "🚀 Release Ankündigung",
    "activitySubtitle": "Governance Postcheck v2.0.0",
    "facts": [
      {
        "name": "Canary Start",
        "value": "Heute 14:00 Uhr"
      },
      {
        "name": "Go/No-Go Meeting",
        "value": "Morgen 10:00 Uhr"
      },
      {
        "name": "Production Release",
        "value": "Bei positiver Entscheidung"
      }
    ],
    "markdown": true
  }],
  "potentialAction": [
    {
      "@type": "OpenUri",
      "name": "Release Status",
      "targets": [
        { "os": "default", "uri": "https://github.com/ORG/REPO/blob/main/RELEASE_STATUS.md" }
      ]
    },
    {
      "@type": "OpenUri",
      "name": "Dashboard",
      "targets": [
        { "os": "default", "uri": "https://grafana.internal/d/governance" }
      ]
    }
  ]
}
```

---

### Go-Live Ankündigung

```json
{
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "themeColor": "28A745",
  "summary": "GO-LIVE – Governance Postcheck v2.0.0",
  "sections": [{
    "activityTitle": "🎉 GO-LIVE – Governance Postcheck v2.0.0",
    "activitySubtitle": "Release erfolgreich deployed",
    "facts": [
      {
        "name": "Version",
        "value": "v2.0.0"
      },
      {
        "name": "Go/No-Go",
        "value": "✅ GO"
      },
      {
        "name": "Canary",
        "value": "48h stabil"
      },
      {
        "name": "Error Rate",
        "value": "0.02%"
      },
      {
        "name": "P99 Latency",
        "value": "145ms"
      }
    ],
    "markdown": true,
    "text": "**Security Status:**\n✅ Trivy Scan: Keine CRITICAL\n✅ Signatur: Rekor dokumentiert\n✅ SBOM: Verfügbar"
  }],
  "potentialAction": [
    {
      "@type": "OpenUri",
      "name": "Release Notes",
      "targets": [
        { "os": "default", "uri": "https://github.com/ORG/REPO/releases/tag/v2.0.0" }
      ]
    },
    {
      "@type": "OpenUri",
      "name": "Grafana Dashboard",
      "targets": [
        { "os": "default", "uri": "https://grafana.internal/d/governance" }
      ]
    }
  ]
}
```

---

### Incident Alert (Teams)

```json
{
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "themeColor": "DC3545",
  "summary": "INCIDENT – Rollback durchgeführt",
  "sections": [{
    "activityTitle": "⚠️ INCIDENT – Rollback v2.0.0",
    "activitySubtitle": "Rollback auf v1.9.5 durchgeführt",
    "facts": [
      {
        "name": "Status",
        "value": "🔴 ROLLBACK"
      },
      {
        "name": "Grund",
        "value": "Error Rate 2.3%"
      },
      {
        "name": "Aktueller Stand",
        "value": "v1.9.5 stabil"
      },
      {
        "name": "Post-Incident Review",
        "value": "Morgen 10:00 Uhr"
      }
    ],
    "markdown": true
  }],
  "potentialAction": [
    {
      "@type": "OpenUri",
      "name": "Incident Channel",
      "targets": [
        { "os": "default", "uri": "https://teams.microsoft.com/l/channel/inc-2024-0122" }
      ]
    }
  ]
}
```

---

## 📧 Email Announcement Template

### Go-Live Email

```text
Subject: ✅ GO-LIVE: Governance Postcheck v2.0.0 erfolgreich deployed

Liebe Kolleginnen und Kollegen,

wir freuen uns, euch mitzuteilen, dass Governance Postcheck v2.0.0 
erfolgreich in Production deployed wurde.

═══════════════════════════════════════════════════════════
RELEASE DETAILS
═══════════════════════════════════════════════════════════

Version:        v2.0.0
Release Time:   2024-01-22 15:00 CET
Digest:         sha256:abc123def456...

═══════════════════════════════════════════════════════════
SECURITY STATUS
═══════════════════════════════════════════════════════════

✅ Trivy Scan:      Keine CRITICAL Findings
✅ Signatur:        Keyless via OIDC/Rekor
✅ SBOM:            Verfügbar als Release-Artefakt
✅ Admission Gate:  Kyverno Policy aktiv

═══════════════════════════════════════════════════════════
CANARY RESULTS (48h)
═══════════════════════════════════════════════════════════

Traffic:        100%
Error Rate:     0.02% (Target: <0.1%) ✅
P99 Latency:    145ms (Target: <500ms) ✅
SLO:            99.95% (Target: >99.5%) ✅

═══════════════════════════════════════════════════════════
NEUE FEATURES
═══════════════════════════════════════════════════════════

• OIDC/Keyless-Signing Integration
• Automatisierte SBOM-Generierung (Syft)
• Kyverno Admission Policies
• Verbesserte Canary-Rollout-Strategie
• Key-Rotation Automatisierung

═══════════════════════════════════════════════════════════
LINKS
═══════════════════════════════════════════════════════════

Release Notes:  https://github.com/ORG/REPO/releases/tag/v2.0.0
Dashboard:      https://grafana.internal/d/governance
Documentation:  https://docs.internal/governance-postcheck

═══════════════════════════════════════════════════════════
SUPPORT
═══════════════════════════════════════════════════════════

Bei Problemen:
• Slack: #incident-response
• Email: sre-oncall@company.com
• PagerDuty: Alert via Dashboard

Vielen Dank an alle Beteiligten für die Unterstützung!

Beste Grüße,
Das Release Team
```

---

## 📋 Kanal-Konfiguration

| Event | Kanal | Template |
|-------|-------|----------|
| Pre-Release | #release-updates | Slack Pre-Release |
| Go-Live | #general, #release-updates | Slack/Teams Go-Live |
| Rollback | #incident-response, #general | Slack/Teams Incident |
| Post-Incident | #incident-response | Email Post-Mortem |

---

*Block DI – Slack/Teams Announcement Templates*
