# CargoBit On-Call Runbook

> **Version:** 1.0.0  
> **Status:** Production-Ready  
> **Last Updated:** 2026-04-18  
> **Owner:** Platform Operations Team

---

## I.1 On-Call Golden Rules

### Die 5 unverhandelbaren Regeln

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          ON-CALL GOLDEN RULES                                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   1️⃣  USER IMPACT ZUERST                                                            │
│      "Wie viele Nutzer sind betroffen? Welche Funktion ist eingeschränkt?"          │
│      → Priorisiere immer User-Erfahrung über interne Systeme                        │
│                                                                                      │
│   2️⃣  CONTAINMENT VOR ROOT-CAUSE                                                    │
│      "Stop the bleeding first, investigate later"                                   │
│      → Schade begrenzen bevor du die Ursache suchst                                 │
│                                                                                      │
│   3️⃣  ROLLBACK > FIX                                                                │
│      "Wenn ein Rollback verfügbar ist, nutze es!"                                   │
│      → Ein funktionierendes System ist wichtiger als ein perfekter Fix              │
│                                                                                      │
│   4️⃣  KOMMUNIKATION ALLE 15 MINUTEN                                                 │
│      "Auch wenn es nichts Neues gibt: Update den Status"                            │
│      → Stakeholder im Dunkeln lassen ist schlimmer als der Incident                 │
│                                                                                      │
│   5️⃣  ALLES DOKUMENTIEREN                                                           │
│      "Was hast du getan? Was hast du beobachtet? Was ist der nächste Schritt?"      │
│      → Ohne Dokumentation kein Post-Incident-Review                                 │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Incident Priority Matrix

| Priority | User Impact | Response Time | Escalation |
|----------|-------------|---------------|------------|
| **SEV-1** | System unusable, all users affected | 5 minutes | Immediate to leadership |
| **SEV-2** | Major degradation, significant user impact | 15 minutes | After 30 min if unresolved |
| **SEV-3** | Minor degradation, limited user impact | 30 minutes | After 2 hours if unresolved |
| **SEV-4** | Low impact, workaround available | 2 hours | Standard escalation |

---

## I.2 On-Call Quick-Checklist

### Schritt 1: Ist es ein echter Incident?

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          INCIDENT VERIFICATION                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   □ ALERT PRÜFEN                                                                    │
│     • Alert in PagerDuty/OpsGenie bestätigt?                                        │
│     • Ist der Alert bereits acknowledged?                                           │
│     • Wann wurde der Alert ausgelöst?                                               │
│                                                                                      │
│   □ DASHBOARDS PRÜFEN                                                               │
│     • Grafana: https://grafana.cargobit.com                                         │
│     • Key Dashboards:                                                               │
│       - Platform Overview                                                           │
│       - Service Health                                                              │
│       - Error Rates                                                                 │
│       - Latency P95/P99                                                             │
│                                                                                      │
│   □ LOGS PRÜFEN                                                                     │
│     • Loki: https://logs.cargobit.com                                               │
│     • Key Queries:                                                                  │
│       - {namespace="domain"} |= "ERROR"                                             │
│       - {service="pricing-service"} |= "failed"                                     │
│       - {service="api-gateway"} |= "503"                                            │
│                                                                                      │
│   □ SYNTHETIC CHECKS                                                                │
│     • Health Endpoints:                                                             │
│       - https://api.cargobit.com/health                                             │
│       - https://api.cargobit.com/ready                                              │
│     • Synthetic Monitors in Grafana                                                 │
│                                                                                      │
│   ENTSCHEIDUNG:                                                                      │
│   → Bestätigter Incident → Weiter zu Schritt 2                                      │
│   → False Positive → Alert resolve + Dokumentation                                  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Schritt 2: Impact bestimmen

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          IMPACT ASSESSMENT                                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   USER GROUPS AFFECTED:                                                              │
│   □ Shipper (Versender)                                                             │
│     • Können Transporte anlegen?                                                    │
│     • Können Angebote annehmen?                                                     │
│     • Können Status sehen?                                                          │
│                                                                                      │
│   □ Carrier (Spediteure)                                                            │
│     • Können Angebote abgeben?                                                      │
│     • Können Aufträge annehmen?                                                     │
│     • Können Status updaten?                                                        │
│                                                                                      │
│   □ Driver (Fahrer)                                                                 │
│     • Können Jobs sehen?                                                            │
│     • Können Status updaten?                                                        │
│                                                                                      │
│   CRITICAL FUNCTIONS:                                                                │
│   □ Pricing-Service                                                                 │
│     • Preisberechnung funktional?                                                   │
│     • Antwortzeit < 200ms?                                                          │
│                                                                                      │
│   □ Matching-Service                                                                │
│     • Matching läuft?                                                               │
│     • Kafka Lag < 1000?                                                             │
│                                                                                      │
│   □ Payment/Wallet                                                                  │
│     • Auszahlungen möglich?                                                         │
│     • Keine Transaktionen hängen?                                                   │
│                                                                                      │
│   □ Security-Config-Service                                                         │
│     • Config geladen?                                                               │
│     • Alle Services haben aktuelle Config?                                          │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Schritt 3: Severity festlegen

| SEV | Kriterien | Beispiele |
|-----|-----------|-----------|
| **SEV-1** | • Kompletter Ausfall der Plattform<br>• Keine User können arbeiten<br>• Datenverlust möglich | Pricing-Service down, DB unreachable, Auth failure |
| **SEV-2** | • Wichtige Funktion stark beeinträchtigt<br>• Viele User betroffen<br>• Workaround vorhanden aber mühsam | Matching verzögert, Pricing langsam, Teilausfall |
| **SEV-3** | • Einzelne Funktion beeinträchtigt<br>• Wenige User betroffen<br>• Workaround verfügbar | Einzelne API Errors, Performance-Schwankungen |
| **SEV-4** | • Kosmetische Issues<br>• Kein direkter User-Impact<br>• Kann auf nächsten Arbeitstag warten | Log-Format, nicht-kritische Alerts |

### Schritt 4: Sofortmaßnahmen

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          IMMEDIATE ACTIONS                                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   ROLLBACK OPTIONEN:                                                                 │
│   □ Letztes Deployment rollbacken                                                   │
│     kubectl rollout undo deployment/<service> -n <namespace>                        │
│                                                                                      │
│   □ Config rollbacken                                                               │
│     kubectl exec -it <pod> -n <namespace> -- /app/rollback-config                   │
│                                                                                      │
│   □ Feature Flag deaktivieren                                                       │
│     curl -X POST https://flags.cargobit.com/api/flags/<flag>/disable               │
│                                                                                      │
│   RESTART OPTIONEN:                                                                  │
│   □ Einzelnen Pod neustarten                                                        │
│     kubectl delete pod <pod> -n <namespace>                                         │
│     (HPA erstellt neuen Pod)                                                        │
│                                                                                      │
│   □ Komplettes Deployment neustarten                                                │
│     kubectl rollout restart deployment/<service> -n <namespace>                     │
│                                                                                      │
│   SCALING OPTIONEN:                                                                  │
│   □ Horizontal skalieren                                                            │
│     kubectl scale deployment/<service> --replicas=<n> -n <namespace>               │
│                                                                                      │
│   □ HPA Limits anpassen                                                             │
│     kubectl patch hpa <service>-hpa -n <namespace> -p '{"spec":{"maxReplicas":<n}}}'│
│                                                                                      │
│   RATE LIMIT ANPASSUNGEN:                                                           │
│   □ Temporäre Limits erhöhen                                                        │
│     kubectl patch configmap api-gateway-config -n core --patch='<yaml>'            │
│                                                                                      │
│   □ Rate Limit für bestimmte User aussetzen                                         │
│     redis-cli SET ratelimit:whitelist:<user_id> 3600                               │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Schritt 5: Kommunikation

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          COMMUNICATION PROTOCOL                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   SLACK/TEAMS CHANNEL:                                                               │
│   □ Incident Channel erstellen: #incident-YYYY-MM-DD-brief-description              │
│   □ Erste Nachricht (Template):                                                     │
│                                                                                      │
│   🚨 INCIDENT DETECTED                                                               │
│   Service: <Service Name>                                                           │
│   Severity: SEV-<1-4>                                                               │
│   Impact: <User Impact Description>                                                 │
│   Status: INVESTIGATING                                                             │
│   Incident Commander: @yourname                                                     │
│   Next Update: +15 min                                                              │
│                                                                                      │
│   □ Updates alle 15 Minuten:                                                        │
│                                                                                      │
│   📊 UPDATE [T+XX min]                                                              │
│   Current Status: <INVESTIGATING / MITIGATING / MONITORING>                         │
│   Actions Taken: <What did you do>                                                  │
│   Current Impact: <What's the user experience>                                      │
│   Next Steps: <What's next>                                                         │
│   Next Update: +15 min                                                              │
│                                                                                      │
│   STATUS PAGE UPDATE:                                                                │
│   □ https://status.cargobit.com                                                     │
│   □ Incident erstellen bei SEV-1/SEV-2                                              │
│   □ Template nutzen:                                                                │
│                                                                                      │
│   We are currently experiencing issues with <service>.                              │
│   Affected functionality: <description>                                             │
│   We are investigating and will provide updates.                                    │
│                                                                                      │
│   STAKEHOLDER BENACHRICHTIGEN:                                                      │
│   □ SEV-1: Sofort an Leadership (CTO, VP Engineering)                               │
│   □ SEV-2: Nach 30 min an Engineering Manager                                       │
│   □ SEV-3/4: Nur bei Bedarf                                                         │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Schritt 6: Übergabe

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          HANDOVER CHECKLIST                                          │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   DER NÄCHSTEN SCHICHT DOKUMENTIEREN:                                               │
│   □ Timeline:                                                                        │
│     • Wann started der Incident?                                                    │
│     • Was wurde wann getan?                                                         │
│     • Welche Ergebnisse hatten welche Aktionen?                                     │
│                                                                                      │
│   □ Logs:                                                                           │
│     • Relevante Log-Auszüge kopieren                                                │
│     • Links zu Loki-Queries                                                         │
│     • Screenshots von Dashboards                                                    │
│                                                                                      │
│   □ Hypothesen:                                                                     │
│     • Was denkst du ist die Ursache?                                                │
│     • Was wurde bereits ausgeschlossen?                                             │
│     • Was wurde noch nicht versucht?                                                │
│                                                                                      │
│   □ Workarounds:                                                                    │
│     • Gibt es aktive Workarounds?                                                   │
│     • Welche temporären Fixes sind aktiv?                                           │
│     • Was muss rückgängig gemacht werden?                                           │
│                                                                                      │
│   □ Offene Tasks:                                                                   │
│     • Was muss noch getan werden?                                                   │
│     • Welche Follow-ups sind geplant?                                               │
│     • Gibt es Deadlines?                                                            │
│                                                                                      │
│   HANDOVER MESSAGE TEMPLATE:                                                        │
│   🔄 HANDOVER to @next-oncall                                                       │
│   Incident: <description>                                                           │
│   Current Status: <status>                                                          │
│   Active Workarounds: <list>                                                        │
│   Next Steps: <list>                                                                │
│   Escalation Contact: @name if needed                                               │
│   Incident Channel: #incident-XXX                                                   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## I.3 Service-Specific Runbooks

### I.3.1 Pricing-Service Runbook

#### Health Check Commands

```bash
# Pod Status prüfen
kubectl get pods -n domain -l app=pricing-service

# Ready Endpoint
kubectl exec -it <pod> -n domain -- curl -s localhost:8080/ready

# Fraud-Config Version prüfen
kubectl exec -it <pod> -n domain -- curl -s localhost:8080/config/version

# DB Connectivity
kubectl exec -it <pod> -n domain -- curl -s localhost:8080/health/db

# Logs streamen
kubectl logs -f -n domain -l app=pricing-service --tail=100
```

#### Common Issues & Solutions

**Issue: Pricing-Validation schlägt fehl**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  PRICING VALIDATION FAILURES                                                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  SYMPTOMS:                                                                          │
│  • HTTP 422 auf POST /api/pricing/validate                                          │
│  • "Invalid security config" in Logs                                                │
│  • Fraud-Config Version mismatch                                                    │
│                                                                                      │
│  DIAGNOSIS:                                                                         │
│  1. Config Version prüfen:                                                          │
│     kubectl exec -it <pod> -n domain -- curl localhost:8080/config/version          │
│     Vergleiche mit Security-Config-Service:                                         │
│     kubectl exec -it <pod> -n core -- curl localhost:3100/config/current            │
│                                                                                      │
│  2. Config Validierung triggern:                                                    │
│     kubectl exec -it <pod> -n core -- curl -X POST localhost:3100/config/validate   │
│                                                                                      │
│  3. Cache invalidieren:                                                             │
│     kubectl exec -it <pod> -n domain -- curl -X POST localhost:8080/config/reload   │
│                                                                                      │
│  IMMEDIATE FIX:                                                                     │
│  □ Config neu laden (Hot Reload)                                                    │
│  □ Wenn Config invalid: Rollback auf letzte Version                                 │
│     kubectl exec -it <pod> -n core -- curl -X POST localhost:3100/config/rollback   │
│  □ Pods neustarten                                                                  │
│     kubectl rollout restart deployment/pricing-service -n domain                    │
│                                                                                      │
│  ESCALATE TO: Security-Engineer On-Call                                             │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Issue: Pricing-Service Down**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  PRICING SERVICE DOWN                                                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  SYMPTOMS:                                                                          │
│  • Alle Pods nicht Ready                                                            │
│  • HTTP 503 auf /health                                                             │
│  • CrashLoopBackOff                                                                 │
│                                                                                      │
│  DIAGNOSIS:                                                                         │
│  1. Pod Status:                                                                     │
│     kubectl get pods -n domain -l app=pricing-service                               │
│                                                                                      │
│  2. Pod Logs:                                                                       │
│     kubectl logs -n domain <pod> --previous                                         │
│                                                                                      │
│  3. Events:                                                                         │
│     kubectl describe pod <pod> -n domain | grep -A 20 Events                        │
│                                                                                      │
│  4. Resource Usage:                                                                 │
│     kubectl top pods -n domain -l app=pricing-service                               │
│                                                                                      │
│  IMMEDIATE FIX:                                                                     │
│  □ Falls OOM: Memory erhöhen                                                        │
│     kubectl patch deployment pricing-service -n domain --patch='<yaml>'             │
│  □ Falls CrashLoopBackOff: Rollback                                                 │
│     kubectl rollout undo deployment/pricing-service -n domain                       │
│  □ Falls DB Issue: DB-Connectivity prüfen                                           │
│     kubectl exec -it <pod> -n domain -- nc -zv postgres.data.svc 5432               │
│                                                                                      │
│  FALLBACK:                                                                          │
│  □ Cache-Mode aktivieren (falls verfügbar)                                          │
│  □ Rate Limits erhöhen um Last zu reduzieren                                        │
│                                                                                      │
│  ESCALATE TO: Backend Team On-Call                                                  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

### I.3.2 Matching-Service Runbook

#### Health Check Commands

```bash
# Pod Status
kubectl get pods -n domain -l app=matching-service

# Kafka Consumer Lag
kubectl exec -it <pod> -n domain -- curl -s localhost:8080/metrics | grep kafka_consumer_lag

# Worker Status
kubectl exec -it <pod> -n domain -- curl -s localhost:8080/workers/status

# Fraud-Penalty Status
kubectl exec -it <pod> -n domain -- curl -s localhost:8080/config/fraud-penalty

# CPU/Memory
kubectl top pods -n domain -l app=matching-service
```

#### Common Issues & Solutions

**Issue: Kafka Lag > 10.000 Events**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  KAFKA LAG HIGH                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  SYMPTOMS:                                                                          │
│  • Matching-Service Consumer Lag > 10.000                                           │
│  • Matchings werden nicht ausgeführt                                                │
│  • Alerts: "KafkaLagHigh"                                                           │
│                                                                                      │
│  DIAGNOSIS:                                                                         │
│  1. Aktuelle Lag:                                                                   │
│     kubectl exec -it <pod> -n domain -- curl localhost:8080/metrics                 │
│     grep kafka_consumer_lag                                                         │
│                                                                                      │
│  2. CPU Saturation:                                                                 │
│     kubectl top pods -n domain -l app=matching-service                              │
│                                                                                      │
│  3. Worker Threads:                                                                 │
│     kubectl exec -it <pod> -n domain -- curl localhost:8080/workers/status          │
│                                                                                      │
│  4. Kafka Broker Status:                                                            │
│     kubectl exec -it -n data <kafka-pod> -- kafka-broker-api-versions.sh            │
│                                                                                      │
│  IMMEDIATE FIX:                                                                     │
│  □ Workers skalieren                                                                │
│     kubectl scale deployment matching-service --replicas=10 -n domain               │
│                                                                                      │
│  □ HPA aktivieren/anpassen                                                          │
│     kubectl patch hpa matching-service-hpa -n domain -p '{"spec":{"maxReplicas":20}}'│
│                                                                                      │
│  □ Fraud-Penalty temporär deaktivieren (falls CPU-bound)                            │
│     kubectl exec -it <pod> -n domain -- curl -X POST localhost:8080/config/fraud-penalty/disable │
│                                                                                      │
│  □ Kafka Partitionen erhöhen (nur wenn nötig)                                       │
│     kubectl exec -it -n data <kafka-pod> -- kafka-topics.sh --alter --topic matching │
│     --partitions 20                                                                 │
│                                                                                      │
│  REBALANCE (wenn Workers nicht helfen):                                             │
│  □ Consumer Group Reset                                                             │
│     kubectl exec -it -n data <kafka-pod> -- kafka-consumer-groups.sh --reset-offsets│
│     --group matching-service --topic matching --to-latest --execute                 │
│                                                                                      │
│  ESCALATE TO: Platform Team On-Call                                                 │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Issue: Matching Stuck / No Matches Produced**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  MATCHING STUCK                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  SYMPTOMS:                                                                          │
│  • Keine neuen Matches in Dashboard                                                  │
│  • matching.completed Events fehlen                                                  │
│  • Worker Threads idle                                                              │
│                                                                                      │
│  DIAGNOSIS:                                                                         │
│  1. Matching Queue:                                                                 │
│     kubectl exec -it <pod> -n domain -- curl localhost:8080/queue/status            │
│                                                                                      │
│  2. Active Matching Jobs:                                                           │
│     kubectl exec -it <pod> -n domain -- curl localhost:8080/jobs/active             │
│                                                                                      │
│  3. Fraud-Filter Status:                                                            │
│     kubectl exec -it <pod> -n domain -- curl localhost:8080/fraud/status            │
│                                                                                      │
│  4. Database Locks:                                                                 │
│     kubectl exec -it -n data <postgres-pod> -- psql -c "SELECT * FROM pg_locks;"    │
│                                                                                      │
│  IMMEDIATE FIX:                                                                     │
│  □ Pods neustarten                                                                  │
│     kubectl rollout restart deployment/matching-service -n domain                   │
│                                                                                      │
│  □ Fraud-Penalty deaktivieren (Feature Flag)                                        │
│     curl -X POST https://flags.cargobit.com/api/flags/fraud-penalty/disable         │
│                                                                                      │
│  □ Dead Letter Queue prüfen                                                         │
│     kubectl exec -it <pod> -n domain -- curl localhost:8080/dlq/count               │
│                                                                                      │
│  □ Partition Rebalance forcieren                                                    │
│     kubectl rollout restart deployment/matching-service -n domain                   │
│                                                                                      │
│  ESCALATE TO: Backend Team On-Call + Platform Team                                  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

### I.3.3 Execution-Service Runbook

#### Health Check Commands

```bash
# Pod Status
kubectl get pods -n domain -l app=execution-service

# Status Update Queue
kubectl exec -it <pod> -n domain -- curl -s localhost:8080/queue/status

# POD Upload Status
kubectl exec -it <pod> -n domain -- curl -s localhost:8080/pod/status

# Worker Health
kubectl exec -it <pod> -n domain -- curl -s localhost:8080/workers/health
```

#### Common Issues & Solutions

**Issue: Status Updates hängen**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  STATUS UPDATES STUCK                                                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  SYMPTOMS:                                                                          │
│  • Driver Status-Updates werden nicht verarbeitet                                   │
│  • Shipper sieht veralteten Status                                                   │
│  • Queue-Backlog wächst                                                             │
│                                                                                      │
│  DIAGNOSIS:                                                                         │
│  1. Queue Status:                                                                   │
│     kubectl exec -it <pod> -n domain -- curl localhost:8080/queue/status            │
│                                                                                      │
│  2. DB Locks:                                                                       │
│     SELECT * FROM pg_locks WHERE NOT granted;                                       │
│                                                                                      │
│  3. Active Transactions:                                                            │
│     SELECT * FROM pg_stat_activity WHERE state = 'active';                          │
│                                                                                      │
│  4. Worker Threads:                                                                 │
│     kubectl exec -it <pod> -n domain -- curl localhost:8080/workers/status          │
│                                                                                      │
│  IMMEDIATE FIX:                                                                     │
│  □ Blockierende Queries killen                                                      │
│     SELECT pg_cancel_backend(<pid>);                                                │
│                                                                                      │
│  □ Workers skalieren                                                                │
│     kubectl scale deployment execution-service --replicas=6 -n domain               │
│                                                                                      │
│  □ Queue flush (nur in Notfällen)                                                   │
│     kubectl exec -it <pod> -n domain -- curl -X POST localhost:8080/queue/reprocess │
│                                                                                      │
│  ESCALATE TO: Backend Team On-Call                                                  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

### I.3.4 API Gateway Runbook

#### Health Check Commands

```bash
# Gateway Status
kubectl get pods -n core -l app=api-gateway

# JWT Validation Errors
kubectl logs -n core -l app=api-gateway --tail=100 | grep -i jwt

# Rate Limit Status
kubectl exec -it <pod> -n core -- curl -s localhost:8080/stats/ratelimit

# Upstream Health
kubectl exec -it <pod> -n core -- curl -s localhost:8080/health/upstream
```

#### Common Issues & Solutions

**Issue: Rate Limit Spikes**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  RATE LIMIT SPIKES                                                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  SYMPTOMS:                                                                          │
│  • HTTP 429 Responses spikes                                                        │
│  • Legitime User werden gedrosselt                                                  │
│  • Alerts: "RateLimitHigh"                                                          │
│                                                                                      │
│  DIAGNOSIS:                                                                         │
│  1. Top IPs nach Requests:                                                          │
│     kubectl exec -it <pod> -n core -- curl localhost:8080/stats/top-ips             │
│                                                                                      │
│  2. Rate Limit Hits:                                                                │
│     kubectl exec -it <pod> -n core -- curl localhost:8080/stats/ratelimit           │
│                                                                                      │
│  3. Bot Pattern Detection:                                                          │
│     kubectl logs -n core -l app=api-gateway --tail=1000 | grep -i bot               │
│                                                                                      │
│  IMMEDIATE FIX:                                                                     │
│  □ Temporär Limits erhöhen                                                          │
│     kubectl patch configmap api-gateway-config -n core --patch='                    │
│     data:                                                                           │
│       rate_limits.yaml: |                                                           │
│         default:                                                                    │
│           requests_per_second: 500                                                  │
│           burst: 1000                                                               │
│     '                                                                                │
│                                                                                      │
│  □ Bot-IPs blockieren                                                               │
│     kubectl exec -it <pod> -n core -- curl -X POST localhost:8080/blocklist/add     │
│     -d '{"ips": ["x.x.x.x", "y.y.y.y"]}'                                            │
│                                                                                      │
│  □ Carrier-IPs priorisieren (Whitelist)                                             │
│     redis-cli SET ratelimit:whitelist:carrier:<id> 86400                            │
│                                                                                      │
│  ESCALATE TO: Security Team On-Call                                                 │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Issue: JWT Validation Errors**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  JWT VALIDATION ERRORS                                                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  SYMPTOMS:                                                                          │
│  • HTTP 401 Responses                                                               │
│  • "Invalid token" in Logs                                                          │
│  • User können sich nicht authentifizieren                                          │
│                                                                                      │
│  DIAGNOSIS:                                                                         │
│  1. JWT Error Types:                                                                │
│     kubectl logs -n core -l app=api-gateway --tail=500 | grep -i "jwt_error" |      │
│     awk '{print $NF}' | sort | uniq -c                                              │
│                                                                                      │
│  2. Auth Service Health:                                                            │
│     kubectl exec -it <pod> -n core -- curl localhost:3200/health                    │
│                                                                                      │
│  3. JWKS Endpoint:                                                                  │
│     curl -s https://auth.cargobit.com/.well-known/jwks.json | jq .                  │
│                                                                                      │
│  4. Clock Skew:                                                                     │
│     kubectl exec -it <pod> -n core -- date                                          │
│     date                                                                             │
│                                                                                      │
│  IMMEDIATE FIX:                                                                     │
│  □ JWKS Cache invalidieren                                                          │
│     kubectl exec -it <pod> -n core -- curl -X POST localhost:8080/cache/jwks/clear  │
│                                                                                      │
│  □ Clock sync (falls drift)                                                         │
│     kubectl rollout restart deployment/api-gateway -n core                          │
│                                                                                      │
│  □ Fallback: Service Token Mode (nur Auth-Service down)                             │
│     kubectl patch configmap api-gateway-config -n core --patch='...'                │
│                                                                                      │
│  ESCALATE TO: Security Team On-Call + Auth Team                                     │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

### I.3.5 Security-Config-Service Runbook

#### Health Check Commands

```bash
# Service Status
kubectl get pods -n core -l app=security-config-service

# Config Version
kubectl exec -it <pod> -n core -- curl -s localhost:3100/config/current | jq .version

# Config Validation
kubectl exec -it <pod> -n core -- curl -s localhost:3100/config/validate

# WebSocket Connections
kubectl exec -it <pod> -n core -- curl -s localhost:3100/connections/count
```

#### Common Issues & Solutions

**Issue: Fraud-Config Invalid / Reload Fails**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  FRAUD CONFIG INVALID                                                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  SYMPTOMS:                                                                          │
│  • "Config validation failed" in Logs                                               │
│  • Services können Config nicht laden                                               │
│  • Fraud-Scoring funktioniert nicht                                                 │
│                                                                                      │
│  DIAGNOSIS:                                                                         │
│  1. Config Validierung:                                                             │
│     kubectl exec -it <pod> -n core -- curl localhost:3100/config/validate           │
│                                                                                      │
│  2. Schema Validation:                                                              │
│     kubectl exec -it <pod> -n core -- curl localhost:3100/config/schema-check       │
│                                                                                      │
│  3. Cross-Field Validation:                                                         │
│     kubectl exec -it <pod> -n core -- curl localhost:3100/config/cross-field-check  │
│                                                                                      │
│  IMMEDIATE FIX:                                                                     │
│  □ Rollback auf letzte gültige Version                                              │
│     kubectl exec -it <pod> -n core -- curl -X POST localhost:3100/config/rollback   │
│                                                                                      │
│  □ Config-Reload blockieren                                                         │
│     kubectl exec -it <pod> -n core -- curl -X POST localhost:3100/config/lock       │
│                                                                                      │
│  □ Services mit alter Config neu starten                                            │
│     kubectl rollout restart deployment/pricing-service -n domain                    │
│     kubectl rollout restart deployment/matching-service -n domain                   │
│                                                                                      │
│  ESCALATE TO: Security Team On-Call                                                 │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## I.4 Escalation Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          ESCALATION MATRIX                                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────┬─────────────────┬─────────────────┬─────────────────┐         │
│  │ Service          │ Primary On-Call │ Secondary       │ Tertiary        │         │
│  ├──────────────────┼─────────────────┼─────────────────┼─────────────────┤         │
│  │ Pricing-Service  │ Backend Team    │ Platform Team   │ Security Team   │         │
│  │ Matching-Service │ Backend Team    │ Platform Team   │ Security Team   │         │
│  │ Execution-Service│ Backend Team    │ Platform Team   │ -               │         │
│  │ API Gateway      │ Platform Team   │ Security Team   │ -               │         │
│  │ Security-Config  │ Security Team   │ Platform Team   │ -               │         │
│  │ Auth Service     │ Security Team   │ Platform Team   │ -               │         │
│  │ Kafka            │ Platform Team   │ Backend Team    │ -               │         │
│  │ PostgreSQL       │ DBA Team        │ Platform Team   │ -               │         │
│  └──────────────────┴─────────────────┴─────────────────┴─────────────────┘         │
│                                                                                      │
│  ESCALATION TIMELINE:                                                               │
│  ┌───────────────────────────────────────────────────────────────────────────┐      │
│  │ SEV-1: Immediate escalation to Primary + Secondary                        │      │
│  │ SEV-2: After 30 min, escalate to Secondary                                │      │
│  │ SEV-3: After 2 hours, escalate to Secondary                               │      │
│  │ SEV-4: Standard business hours escalation                                 │      │
│  └───────────────────────────────────────────────────────────────────────────┘      │
│                                                                                      │
│  CONTACT INFORMATION:                                                               │
│  ┌──────────────────┬──────────────────────────────────────────────────────┐         │
│  │ Team             │ Contact                                              │         │
│  ├──────────────────┼──────────────────────────────────────────────────────┤         │
│  │ Backend On-Call  │ PagerDuty: backend-oncall, Slack: #backend-oncall    │         │
│  │ Platform On-Call │ PagerDuty: platform-oncall, Slack: #platform-oncall  │         │
│  │ Security On-Call │ PagerDuty: security-oncall, Slack: #security-oncall  │         │
│  │ DBA On-Call      │ PagerDuty: dba-oncall, Slack: #dba-oncall            │         │
│  │ Leadership       │ Email: leadership@company.com (SEV-1 only)           │         │
│  └──────────────────┴──────────────────────────────────────────────────────┘         │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## I.5 Key Dashboards & Links

| Resource | URL | Purpose |
|----------|-----|---------|
| Grafana Main | https://grafana.cargobit.com | All dashboards |
| Platform Overview | https://grafana.cargobit.com/d/platform | System health |
| Service Health | https://grafana.cargobit.com/d/services | Per-service metrics |
| SLO Dashboard | https://grafana.cargobit.com/d/slos | SLO tracking |
| Loki Logs | https://logs.cargobit.com | Log search |
| Tempo Traces | https://traces.cargobit.com | Distributed tracing |
| AlertManager | https://alerts.cargobit.com | Active alerts |
| Status Page | https://status.cargobit.com | Public status |
| PagerDuty | https://cargobit.pagerduty.com | Incident management |

---

## I.6 Quick Command Reference

```bash
# === KUBERNETES ===
kubectl get pods -A | grep -v Running     # Show problematic pods
kubectl logs -f <pod> -n <ns> --tail=100   # Stream logs
kubectl exec -it <pod> -n <ns> -- sh      # Shell into pod
kubectl port-forward svc/<svc> 8080:8080 -n <ns>  # Port forward

# === ROLLBACK ===
kubectl rollout undo deployment/<deploy> -n <ns>           # Rollback deployment
kubectl rollout history deployment/<deploy> -n <ns>        # Show rollout history
kubectl rollout restart deployment/<deploy> -n <ns>        # Restart deployment

# === SCALING ===
kubectl scale deployment/<deploy> --replicas=<n> -n <ns>   # Manual scale
kubectl autoscale deployment/<deploy> --min=2 --max=10 --cpu-percent=80 -n <ns>

# === DEBUGGING ===
kubectl describe pod <pod> -n <ns>                         # Pod details
kubectl top pods -n <ns>                                   # Resource usage
kubectl get events -n <ns> --sort-by='.lastTimestamp'     # Recent events

# === REDIS (Rate Limits) ===
redis-cli KEYS "ratelimit:*"                               # List rate limit keys
redis-cli GET "ratelimit:<user_id>"                        # Get specific limit
redis-cli SET "ratelimit:whitelist:<id>" 3600              # Whitelist user

# === POSTGRESQL ===
kubectl exec -it -n data <postgres-pod> -- psql -U postgres -d cargobit
SELECT * FROM pg_stat_activity WHERE state = 'active';    # Active queries
SELECT pg_cancel_backend(<pid>);                           # Kill query
```

---

**Document Status:** ✅ Production-Ready  
**Next Review:** 2026-07-18  
**Approval:** Platform Operations Team
