# Incident-Template für Signatur/Trivy-Failures

**Purpose**: Standardisiertes Template für Incidents im Zusammenhang mit Signatur- und Trivy-Failures in CI/CD Pipelines.

---

## Incident Report Template

```markdown
# 🚨 Incident Report: [SIGNATURE_FAILURE | TRIVY_FAILURE]

## Metadata
| Field | Value |
|-------|-------|
| **Incident ID** | INC-YYYY-MM-DD-XXX |
| **Severity** | P1 / P2 / P3 / P4 |
| **Status** | Investigating / Identified / Mitigating / Resolved |
| **Started** | YYYY-MM-DD HH:MM UTC |
| **Detected By** | CI/CD Pipeline / Manual Review / Monitoring |
| **Incident Commander** | [Name] |
| **Slack Channel** | #inc-YYYY-MM-DD-xxx |

## Impact Summary
- **Service Affected**: governance-postcheck / [other service]
- **Pipeline**: GitHub Actions / GitLab CI
- **Branch**: [branch-name]
- **Commit**: [short-sha]
- **Image Tag**: [tag]
- **Users Affected**: [number or N/A for CI-only]
- **Deployment Blocked**: Yes / No

---

## Issue Description

### Type
- [ ] Signature verification failed
- [ ] Trivy scan found HIGH/CRITICAL vulnerabilities
- [ ] Keyless OIDC token issue
- [ ] Key rotation issue
- [ ] Registry push denied
- [ ] Other: _______________

### Error Message
```
[Paste relevant error output here]
```

---

## Investigation

### Signature Failure Checklist

- [ ] Check cosign version in CI runner
- [ ] Verify OIDC token availability (`id-token: write` permission)
- [ ] Check Rekor service availability
- [ ] Verify public key (if keyed signing)
- [ ] Check if key has been rotated
- [ ] Verify image digest matches

### Trivy Failure Checklist

- [ ] Identify CVE IDs
- [ ] Check severity (HIGH/CRITICAL)
- [ ] Identify affected package and version
- [ ] Check if fix version available
- [ ] Check for existing exception policy
- [ ] Assess exploitability in our context

---

## Root Cause Analysis

### What happened
[Describe the root cause in 2-3 sentences]

### Why it happened
[Explain the contributing factors]

### Timeline

| Time (UTC) | Event |
|------------|-------|
| HH:MM | CI run started |
| HH:MM | Failure detected |
| HH:MM | Incident created |
| HH:MM | [Update] |
| HH:MM | Incident resolved |

---

## Resolution

### Immediate Actions
1. [Action taken]
2. [Action taken]

### Workaround Applied
[Describe any temporary fixes]

### Permanent Fix
[Describe the permanent solution]

---

## CVE Details (if applicable)

| CVE ID | Severity | Package | Version | Fix Version | Risk Assessment |
|--------|----------|---------|---------|-------------|-----------------|
| CVE-XXXX-XXXXX | HIGH/CRITICAL | [package] | [version] | [fix-version] | [Accept/Risk/Mitigate] |

### Exception Request (if needed)
- **Justification**: [Why this CVE is acceptable]
- **Mitigation**: [Compensating controls]
- **Expiry Date**: [When to re-evaluate]
- **Approved By**: [Security Owner Name]

---

## Prevention Measures

### Short-term
- [ ] [Action item] - Owner: [Name] - Due: [Date]
- [ ] [Action item] - Owner: [Name] - Due: [Date]

### Long-term
- [ ] [Action item] - Owner: [Name] - Due: [Date]
- [ ] [Action item] - Owner: [Name] - Due: [Date]

---

## Lessons Learned

### What went well
- [Point 1]
- [Point 2]

### What could be improved
- [Point 1]
- [Point 2]

### Process Updates Needed
- [ ] Update CI/CD pipeline
- [ ] Update documentation
- [ ] Add monitoring/alerting
- [ ] Training for team
```

---

## Quick Triage Commands

### Signature Issues

```bash
# Check cosign version
cosign version

# Keyless verify (check OIDC)
cosign verify --keyless ghcr.io/ORG/governance-postcheck:TAG

# Check Rekor log
cosign verify --keyless --output=json ghcr.io/ORG/governance-postcheck:TAG | jq '.[0].bundle.Payload.body'

# Verify with public key (keyed)
echo "$COSIGN_PUB" > cosign.pub
cosign verify --key cosign.pub ghcr.io/ORG/governance-postcheck:TAG

# Re-sign image (if key compromised)
cosign sign --keyless ghcr.io/ORG/governance-postcheck:TAG

# Check signing keys
cosign public-key --key env://COSIGN_KEY
```

### Trivy Issues

```bash
# Quick scan
trivy image --severity CRITICAL,HIGH ghcr.io/ORG/governance-postcheck:TAG

# Full JSON report
trivy image --format json --output trivy-report.json --severity ALL ghcr.io/ORG/governance-postcheck:TAG

# SARIF for GitHub Security
trivy image --format sarif --output trivy.sarif --severity CRITICAL,HIGH ghcr.io/ORG/governance-postcheck:TAG

# Filter specific CVE
trivy image --severity CRITICAL,HIGH --ignorefile .trivyignore ghcr.io/ORG/governance-postcheck:TAG

# Check fix available
trivy image --severity CRITICAL,HIGH ghcr.io/ORG/governance-postcheck:TAG 2>&1 | grep -A5 "Fixed:"

# Generate .trivyignore
echo "# CVE-XXXX-XXXXX - Reason: [justification] - Expires: [date]" >> .trivyignore
```

### Registry Issues

```bash
# Check registry credentials
echo $REGISTRY_PASSWORD | docker login ghcr.io -u $REGISTRY_USERNAME --password-stdin

# List image tags
skopeo list-tags docker://ghcr.io/ORG/governance-postcheck

# Check image digest
skopeo inspect docker://ghcr.io/ORG/governance-postcheck:TAG | jq .Digest

# Pull and verify
docker pull ghcr.io/ORG/governance-postcheck:TAG
docker images ghcr.io/ORG/governance-postcheck
```

---

## Severity Classification

### P1 - Critical (Response: 5 min, Resolution: 30 min)

| Condition | Example |
|-----------|---------|
| Production deployment blocked | Critical security fix cannot be deployed |
| Active security vulnerability exploited | CVE with known exploit in production image |
| All CI pipelines blocked | Signing service unavailable |

### P2 - High (Response: 15 min, Resolution: 2 hours)

| Condition | Example |
|-----------|---------|
| Staging deployment blocked | Cannot promote to staging |
| HIGH vulnerability discovered | Trivy finds HIGH CVE in build |
| Key rotation failed | Old key expired, new key not working |

### P3 - Medium (Response: 30 min, Resolution: 8 hours)

| Condition | Example |
|-----------|---------|
| Single feature branch blocked | CI failure on feature branch |
| Non-critical CVE found | MEDIUM severity vulnerability |
| Intermittent signature failures | Sporadic OIDC issues |

### P4 - Low (Response: 4 hours, Resolution: 72 hours)

| Condition | Example |
|-----------|---------|
| Development environment issue | Sandbox CI failing |
| Documentation needs update | Process improvement |
| Warning-level findings | LOW severity CVE |

---

## Escalation Matrix

| Severity | First Response | Escalation (if no response in 5 min) |
|----------|----------------|-------------------------------------|
| P1 | @oncall-sre | @platform-lead → @security-lead → @engineering-director |
| P2 | @oncall-sre | @platform-lead → @security-lead |
| P3 | @build-owner | @security-owner |
| P4 | @build-owner | @team-lead |

---

## Common Resolutions

### Signature Failure: OIDC Token Not Available

```yaml
# Fix: Add to GitHub Actions workflow
permissions:
  id-token: write
  contents: read
```

### Signature Failure: Rekor Unavailable

```bash
# Temporary: Use keyed signing
cosign sign --key env://COSIGN_KEY ghcr.io/ORG/governance-postcheck:TAG
```

### Trivy: CVE with no fix available

```bash
# Add documented exception
echo "CVE-XXXX-XXXXX" >> .trivyignore
# Document reason in SECURITY/CVE_EXCEPTIONS.md
```

### Trivy: Base image vulnerable

```dockerfile
# Fix: Update base image
FROM python:3.11-slim@sha256:NEW_DIGEST
```

### Key Rotation: Old signatures invalid

```bash
# Re-sign all images with new key
for tag in v1.0.0 v1.0.1 v1.1.0; do
  cosign sign --key env://COSIGN_KEY ghcr.io/ORG/governance-postcheck:$tag
done
```

---

## Block Metadata

| Field | Value |
|-------|-------|
| **Block ID** | CN |
| **Title** | Incident-Template für Signatur/Trivy-Failures |
| **Category** | Incident Response, CI/CD, Security |
| **Related Blocks** | CG (Incident Response Runbook), CF (Debug Checklist), CL (Release Steps) |
| **Created** | 2026-05-07 |

---

*CargoBit Developer Portal – Multi-Agent System Documentation*
