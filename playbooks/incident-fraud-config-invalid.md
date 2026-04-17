# Incident Playbook: Fraud-Config Invalid / Reload Fails

**Severity:** P2 - High  
**Service:** security-config-service  
**Last Updated:** 2024-01-15  
**Owner:** Security Team  

---

## Quick Reference

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Config Validation | failed | `config-validation-failed` |
| Config Version Stale | > 24h | `config-version-stale` |
| Schema Violations | > 0 | `config-schema-violation` |

---

## Trigger

1. **Security-Config-Service meldet INVALID_CONFIG** in Logs/Metrics
2. **Pricing/Matching bleiben auf alter Config-Version**
3. **Config-Reload API returned 400** mit Validation Errors
4. **Alert: config_validation_errors_total > 0**

---

## Impact

| Stakeholder | Impact |
|-------------|--------|
| Compliance | Neue Fraud-Regeln greifen nicht |
| Operations | Fehlende Fraud-Detection-Updates |
| Business | Risiko von Fraud-Schäden |

**Compliance Risk Score:** 8/10 (hoch)

---

## Diagnosis Steps

### Step 1: Check Config Service Logs (2 min)

```bash
# Check validation errors
kubectl logs -n core -l app=security-config-service --tail=100 | grep -i "validation\|invalid"

# Check recent reload attempts
kubectl logs -n core -l app=security-config-service --tail=200 | grep -i "reload"

# Check specific error details
kubectl logs -n core -l app=security-config-service | grep -A 10 "VALIDATION_ERROR"
```

### Step 2: Check JSON Schema Validation Output (2 min)

```bash
# Get current config
kubectl exec -n core deploy/security-config-service -- curl -s localhost:3005/v1/config

# Run validation manually
kubectl exec -n core deploy/security-config-service -- curl -s localhost:3005/v1/config/validate

# Check schema version
kubectl exec -n core deploy/security-config-service -- curl -s localhost:3005/v1/config/version
```

### Step 3: Check Config Source (Git/S3) (2 min)

```bash
# Check if source is accessible
kubectl exec -n core deploy/security-config-service -- curl -s $CONFIG_SOURCE_URL

# Check last commit/etag
kubectl logs -n core -l app=security-config-service | grep -i "source\|fetch"

# Compare with database version
kubectl exec -n core deploy/security-config-service -- curl -s localhost:3005/v1/config/diff
```

### Step 4: Check Cross-Field Validation (2 min)

```bash
# Test fraud weights sum
kubectl exec -n core deploy/security-config-service -- node -e "
const config = require('/config/security-config.json');
const sum = Object.values(config.fraud.carrierScore.weights).reduce((a,b)=>a+b,0);
console.log('Carrier weights sum:', sum, sum === 1 ? '✓' : '✗');
"

# Test thresholds
kubectl exec -n core deploy/security-config-service -- node -e "
const config = require('/config/security-config.json');
const t = config.fraud.carrierScore.thresholds;
console.log('Thresholds:', t.observe, '<', t.suspect, t.observe < t.suspect ? '✓' : '✗');
"
```

---

## Immediate Actions

### Action 1: Rollback to Last Known Good Config

```bash
# List available versions
kubectl exec -n core deploy/security-config-service -- curl -s localhost:3005/v1/config/versions

# Rollback to previous version
kubectl exec -n core deploy/security-config-service -- curl -X POST \
  localhost:3005/v1/config/rollback \
  -H "Content-Type: application/json" \
  -d '{"targetVersion":"2024-01-14-01"}'

# Verify rollback
kubectl exec -n core deploy/security-config-service -- curl -s localhost:3005/v1/config/version
```

### Action 2: Block Config Reload

```bash
# Enable maintenance mode
kubectl patch configmap security-config-service-config -n core --type=merge \
  -p '{"data":{"RELOAD_ENABLED":"false"}}'

# Restart to apply
kubectl rollout restart deployment/security-config-service -n core
```

### Action 3: Notify Admin Team

```bash
# Send Slack notification
curl -X POST $SLACK_WEBHOOK_URL -d '{
  "text": "🚨 Fraud Config Invalid - Rollback performed",
  "attachments": [{
    "color": "danger",
    "fields": [
      {"title": "Service", "value": "security-config-service", "short": true},
      {"title": "Status", "value": "Rolled back to previous version", "short": true}
    ]
  }]
}'
```

### Action 4: Fix Config and Re-validate

```bash
# Get invalid config for review
kubectl exec -n core deploy/security-config-service -- cat /config/pending/security-config.json

# Edit config locally
# ... fix the validation errors ...

# Validate fixed config
cat security-config-fixed.json | kubectl exec -i -n core deploy/security-config-service -- \
  curl -X POST localhost:3005/v1/config/validate -H "Content-Type: application/json" -d @-

# Apply fixed config
cat security-config-fixed.json | kubectl exec -i -n core deploy/security-config-service -- \
  curl -X POST localhost:3005/v1/config -H "Content-Type: application/json" -d @-
```

---

## Root Cause Analysis

### Possible Root Causes

| Root Cause | Probability | Detection |
|------------|-------------|-----------|
| Fraud-Weights ≠ 1 | 40% | Cross-field validation failed |
| Thresholds falsch (observe >= suspect) | 25% | Threshold validation error |
| Syntaxfehler (typo, missing bracket) | 20% | JSON parse error |
| Missing required fields | 10% | Schema validation error |
| Version format wrong | 5% | Pattern mismatch |

### Common Validation Errors

```json
// Example: Weights don't sum to 1
{
  "fraud": {
    "carrierScore": {
      "weights": {
        "cancelRate": 0.3,
        "disputeRate": 0.3,
        "noShowRate": 0.2,
        "patternScore": 0.3  // Sum = 1.1 ✗
      }
    }
  }
}

// Example: Threshold order wrong
{
  "fraud": {
    "carrierScore": {
      "thresholds": {
        "observe": 0.6,
        "suspect": 0.4  // observe > suspect ✗
      }
    }
  }
}
```

---

## Follow-Up Actions

### Short-Term (24h)

- [ ] Config-Editor mit Live-Validation bereitstellen
- [ ] Pre-Commit Hooks für Config-Validation
- [ ] Alert-Notification an Security-Team

### Medium-Term (1 Woche)

- [ ] Config-UI mit Validierungs-Feedback
- [ ] Automated Config-Testing Pipeline
- [ ] Config-Diff-Review Process

### Long-Term (1 Monat)

- [ ] GitOps-basierte Config-Verwaltung
- [ ] Config-Change Approval Workflow
- [ ] Cross-Team Training

---

## Config Validation Checklist

Before applying any config change:

- [ ] JSON Syntax valid (use `jq . config.json`)
- [ ] All required fields present
- [ ] Fraud weights sum to exactly 1.0
- [ ] Bid weights sum to exactly 1.0
- [ ] Thresholds: observe < suspect
- [ ] maxDiscountVsMarket < 0.9
- [ ] Version format: YYYY-MM-DD-NN
- [ ] No unknown fields (strict mode)
- [ ] Rate limits are reasonable values

---

## Related Playbooks

- [E.1 Pricing-Service Down](./incident-pricing-service-down.md)
- [E.2 Matching-Service Stuck](./incident-matching-service-stuck.md)
