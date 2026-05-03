# CargoBit Incident Communication Templates
Version 1.0
Internal Use Only

---

# 1. Purpose

Dieses Dokument enthält vordefinierte Kommunikationsvorlagen für Incident-Szenarien. Es stellt sicher, dass Kommunikation konsistent, schnell und informativ ist.

---

# 2. Severity Levels

| Level | Description | Response |
|-------|-------------|----------|
| SEV-1 | Major outage | All hands, immediate |
| SEV-2 | Partial outage | Team response |
| SEV-3 | Minor issue | On-call response |

---

# 3. SEV-1 Templates

## 3.1 Initial Notification (Internal)

```
🚨 SEV-1 INCIDENT DECLARED

Service: CargoBit Payment API
Time: YYYY-MM-DD HH:MM UTC
Status: INVESTIGATING

Impact: Complete payment processing outage
Affected: All partners and users

Incident Commander: @name
Bridge: [Conference link]
War room: [Slack channel]

Next update: 30 minutes
```

## 3.2 Initial Notification (Partners)

```
Subject: [CRITICAL] CargoBit Service Outage

Dear Partner,

We are currently experiencing a major service outage affecting payment processing.

Status: Investigating
Impact: Payment processing unavailable
Started: YYYY-MM-DD HH:MM UTC

Our team is actively working on resolution. We will provide updates every 30 minutes.

Current recommended actions:
- Queue payments locally
- Do not retry automatically
- Monitor status page

We apologize for any inconvenience.

CargoBit Operations Team
```

## 3.3 Update Template (Internal)

```
🔄 SEV-1 UPDATE #X

Status: INVESTIGATING / IDENTIFIED / MONITORING
Time: YYYY-MM-DD HH:MM UTC

Progress:
- [Completed action]
- [In-progress action]

Current impact: [Description]
Estimated resolution: [Time or unknown]

Next update: 30 minutes
```

## 3.4 Resolution Template (Internal)

```
✅ SEV-1 RESOLVED

Duration: X hours Y minutes
Root cause: [Brief description]
Resolution: [Action taken]

Services restored:
- [Service 1]
- [Service 2]

Postmortem scheduled: [Date]
Postmortem owner: [Name]

Thank you for your patience.
```

## 3.5 Resolution Template (Partners)

```
Subject: [RESOLVED] CargoBit Service Outage

Dear Partner,

The service outage has been resolved.

Status: Resolved
Duration: X hours Y minutes
Root cause: [Brief description]

All services are now operational. We recommend:
- Processing any queued payments
- Verifying recent transactions

A detailed postmortem will be available within 72 hours.

We apologize for any inconvenience.

CargoBit Operations Team
```

---

# 4. SEV-2 Templates

## 4.1 Initial Notification (Internal)

```
⚠️ SEV-2 INCIDENT DECLARED

Service: CargoBit Webhook Processing
Time: YYYY-MM-DD HH:MM UTC
Status: INVESTIGATING

Impact: Delayed webhook delivery
Affected: Some partners

Incident Commander: @name

Next update: 1 hour
```

## 4.2 Initial Notification (Partners)

```
Subject: [WARNING] CargoBit Service Degradation

Dear Partner,

We are currently experiencing a partial service degradation.

Status: Investigating
Impact: Delayed webhook delivery
Started: YYYY-MM-DD HH:MM UTC

Payment processing is unaffected. We will provide updates hourly.

CargoBit Operations Team
```

---

# 5. SEV-3 Templates

## 5.1 Initial Notification (Internal)

```
📋 SEV-3 INCIDENT

Service: [Service name]
Time: YYYY-MM-DD HH:MM UTC
Status: INVESTIGATING

Impact: [Minimal description]
Affected: [Limited scope]

Owner: @name

Next update: As needed
```

## 5.2 No Partner Notification Required

SEV-3 incidents typically do not require partner notification unless specifically requested.

---

# 6. Status Page Templates

## 6.1 Incident Start

```
Investigating - We are currently investigating an issue affecting [service]. 
Users may experience [impact].

[Time] UTC
```

## 6.2 Update

```
Identified - The issue has been identified and a fix is being implemented.

[Time] UTC
```

## 6.3 Monitoring

```
Monitoring - A fix has been implemented and we are monitoring the results.

[Time] UTC
```

## 6.4 Resolved

```
Resolved - This incident has been resolved.

[Time] UTC
```

---

# 7. Postmortem Announcement

```
📋 POSTMORTEM AVAILABLE

Incident: [Incident name]
Date: YYYY-MM-DD
Duration: X hours Y minutes

Summary: [Brief summary]

Root cause: [Root cause]

Action items: [Number] items identified

Full report: [Link]

Questions: incident-review@cargobit.example.com
```

---

# 8. Summary

Diese Vorlagen stellen sicher, dass Kommunikation konsistent, schnell und informativ ist.

---

# 9. Contact

Operations Team
CargoBit Internal
