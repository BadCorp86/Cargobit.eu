# Key-Rotation Kalender-Template

**Purpose**: Strukturierter Kalender und Runbook für regelmäßige Key-Rotation von Signing Keys.

---

## Rotation Schedule Overview

| Key Type | Rotation Interval | Lead Time | Owner |
|----------|-------------------|-----------|-------|
| **cosign Keyless OIDC** | N/A (automatic) | - | Platform Team |
| **cosign Keyed (KMS)** | 90 Tage | 14 Tage | Security Owner |
| **Registry Credentials** | 90 Tage | 7 Tage | DevOps Team |
| **Service Account Tokens** | 30 Tage | 3 Tage | Platform Team |
| **Database Credentials** | 90 Tage | 7 Tage | DBA Team |

---

## Key-Rotation Calendar 2026

### Q1 2026

| Datum | Key Type | Status | Assigned To |
|-------|----------|--------|-------------|
| 2026-01-15 | cosign Signing Key | ✅ Completed | @security-lead |
| 2026-01-31 | Registry Credentials | ✅ Completed | @devops-team |
| 2026-02-15 | Service Account Tokens | ✅ Completed | @platform-team |
| 2026-02-28 | Database Credentials | ✅ Completed | @dba-team |
| 2026-03-15 | cosign Signing Key | ✅ Completed | @security-lead |
| 2026-03-31 | Registry Credentials | ✅ Completed | @devops-team |

### Q2 2026

| Datum | Key Type | Status | Assigned To |
|-------|----------|--------|-------------|
| 2026-04-15 | cosign Signing Key | 🔄 In Progress | @security-lead |
| 2026-04-30 | Registry Credentials | ⏳ Scheduled | @devops-team |
| 2026-05-15 | Service Account Tokens | ⏳ Scheduled | @platform-team |
| 2026-05-30 | Database Credentials | ⏳ Scheduled | @dba-team |
| 2026-06-15 | cosign Signing Key | ⏳ Scheduled | @security-lead |
| 2026-06-30 | Registry Credentials | ⏳ Scheduled | @devops-team |

### Q3 2026

| Datum | Key Type | Status | Assigned To |
|-------|----------|--------|-------------|
| 2026-07-15 | cosign Signing Key | ⏳ Scheduled | @security-lead |
| 2026-07-31 | Registry Credentials | ⏳ Scheduled | @devops-team |
| 2026-08-15 | Service Account Tokens | ⏳ Scheduled | @platform-team |
| 2026-08-31 | Database Credentials | ⏳ Scheduled | @dba-team |
| 2026-09-15 | cosign Signing Key | ⏳ Scheduled | @security-lead |
| 2026-09-30 | Registry Credentials | ⏳ Scheduled | @devops-team |

### Q4 2026

| Datum | Key Type | Status | Assigned To |
|-------|----------|--------|-------------|
| 2026-10-15 | cosign Signing Key | ⏳ Scheduled | @security-lead |
| 2026-10-31 | Registry Credentials | ⏳ Scheduled | @devops-team |
| 2026-11-15 | Service Account Tokens | ⏳ Scheduled | @platform-team |
| 2026-11-30 | Database Credentials | ⏳ Scheduled | @dba-team |
| 2026-12-15 | cosign Signing Key | ⏳ Scheduled | @security-lead |
| 2026-12-31 | Registry Credentials | ⏳ Scheduled | @devops-team |

---

## cosign Key Rotation Runbook

### Pre-Rotation Checklist (T-14 Tage)

- [ ] Schedule rotation date in team calendar
- [ ] Notify affected teams via Slack/Email
- [ ] Verify access to KMS/HSM
- [ ] Prepare rollback plan
- [ ] Create rotation ticket in tracking system

### Rotation Steps

#### Step 1: Generate New Key Pair (T-1 Tag)

```bash
# Option A: Generate new key pair locally
cosign generate-key-pair
# Output: cosign.key (private), cosign.pub (public)

# Option B: Generate in KMS (recommended for production)
cosign generate-key-pair kms://azure-keyvault://cargobit-signing-key-v2
cosign generate-key-pair awskms://alias/cargobit-signing-key-v2
cosign generate-key-pair gcpkms://projects/cargobit/locations/global/keyRings/signing/cryptoKeys/key-v2

# Verify new key
cosign public-key --key cosign.key
```

#### Step 2: Store New Key in CI/CD Secrets (T-1 Tag)

```bash
# GitHub Actions - Update secrets
gh secret set COSIGN_KEY_NEW < cosign.key
gh secret set COSIGN_PUB_NEW < cosign.pub

# GitLab CI - Update variables
glab variable set COSIGN_KEY_NEW --type file < cosign.key
glab variable set COSIGN_PUB_NEW --type file < cosign.pub

# Verify secrets are set
gh secret list | grep COSIGN
```

#### Step 3: Update CI Workflows (Tag der Rotation)

```yaml
# .github/workflows/postcheck-ci-keyless.yml
# Update to use new key
env:
  COSIGN_KEY: ${{ secrets.COSIGN_KEY_NEW }}  # Changed from COSIGN_KEY
```

#### Step 4: Re-Sign Existing Images (Tag der Rotation)

```bash
#!/bin/bash
# re-sign-images.sh

# List of production images to re-sign
IMAGES=(
  "ghcr.io/cargobit/governance-postcheck:v1.0.0"
  "ghcr.io/cargobit/governance-postcheck:v1.0.1"
  "ghcr.io/cargobit/governance-postcheck:v1.1.0"
  "ghcr.io/cargobit/api-proxy:v2.0.0"
)

NEW_KEY="cosign.key"

for image in "${IMAGES[@]}"; do
  echo "Re-signing $image..."
  cosign sign --key $NEW_KEY "$image"
  
  # Verify new signature
  cosign verify --key cosign.pub "$image" && echo "✅ Verified: $image"
done

echo "Re-signing complete!"
```

#### Step 5: Verify Signatures (Tag der Rotation)

```bash
#!/bin/bash
# verify-all-signatures.sh

IMAGES=(
  "ghcr.io/cargobit/governance-postcheck:v1.0.0"
  "ghcr.io/cargobit/governance-postcheck:v1.0.1"
  "ghcr.io/cargobit/governance-postcheck:v1.1.0"
)

NEW_PUB="cosign.pub"

for image in "${IMAGES[@]}"; do
  echo "Verifying $image..."
  if cosign verify --key $NEW_PUB "$image"; then
    echo "✅ $image - VERIFIED"
  else
    echo "❌ $image - FAILED"
    exit 1
  fi
done
```

#### Step 6: Archive Old Key (T+1 Tag)

```bash
# Create archive directory
mkdir -p archive/keys/$(date +%Y-%m)

# Archive old key with timestamp
cp cosign.key.old archive/keys/$(date +%Y-%m)/cosign.key.$(date +%Y%m%d)
cp cosign.pub.old archive/keys/$(date +%Y-%m)/cosign.pub.$(date +%Y%m%d)

# Create manifest
cat > archive/keys/$(date +%Y-%m)/manifest.json << EOF
{
  "rotation_date": "$(date -I)",
  "old_key_id": "$(sha256sum cosign.key.old | cut -d' ' -f1)",
  "new_key_id": "$(sha256sum cosign.key | cut -d' ' -f1)",
  "rotated_by": "$(git config user.email)",
  "images_re_signed": [
    "ghcr.io/cargobit/governance-postcheck:v1.0.0",
    "ghcr.io/cargobit/governance-postcheck:v1.0.1",
    "ghcr.io/cargobit/governance-postcheck:v1.1.0"
  ]
}
EOF

# Upload to secure storage (e.g., S3, Azure Blob)
aws s3 sync archive/keys/ s3://cargobit-secure-archive/keys/
```

#### Step 7: Update Documentation (T+1 Tag)

```bash
# Update KEY_ROTATION.md
cat >> SECURITY/KEY_ROTATION.md << EOF

## Rotation $(date +%Y-%m-%d)

- **Date**: $(date -I)
- **Performed by**: $(git config user.email)
- **Old Key ID**: $(sha256sum cosign.key.old | cut -d' ' -f1 | head -c16)
- **New Key ID**: $(sha256sum cosign.key | cut -d' ' -f1 | head -c16)
- **Images Re-signed**: 3
- **Status**: ✅ Completed

EOF
```

### Post-Rotation Checklist (T+1 Tag)

- [ ] All images verified with new key
- [ ] CI/CD pipeline runs successfully with new key
- [ ] Old key archived in secure storage
- [ ] Documentation updated
- [ ] Team notified of completion
- [ ] Next rotation date scheduled

---

## Emergency Key Rotation

### Triggers

| Trigger | Action | Timeline |
|---------|--------|----------|
| Key compromised | Immediate rotation | < 1 hour |
| Unauthorized access detected | Immediate rotation | < 1 hour |
| KMS/HSM breach notification | Immediate rotation | < 4 hours |
| Suspicious signing activity | Investigation + rotation | < 8 hours |

### Emergency Rotation Commands

```bash
#!/bin/bash
# emergency-key-rotation.sh

set -e

echo "🚨 EMERGENCY KEY ROTATION STARTED"
echo "Timestamp: $(date -Iseconds)"

# 1. Generate new key immediately
echo "1. Generating new key..."
cosign generate-key-pair
NEW_KEY_ID=$(sha256sum cosign.key | cut -d' ' -f1 | head -c16)
echo "New Key ID: $NEW_KEY_ID"

# 2. Update CI secrets immediately
echo "2. Updating CI secrets..."
gh secret set COSIGN_KEY < cosign.key
gh secret set COSIGN_PUB < cosign.pub

# 3. Re-sign all production images
echo "3. Re-signing all images..."
for tag in $(skopeo list-tags docker://ghcr.io/cargobit/governance-postcheck | jq -r '.Tags[]'); do
  cosign sign --key cosign.key "ghcr.io/cargobit/governance-postcheck:$tag"
done

# 4. Verify all images
echo "4. Verifying signatures..."
for tag in $(skopeo list-tags docker://ghcr.io/cargobit/governance-postcheck | jq -r '.Tags[]'); do
  cosign verify --key cosign.pub "ghcr.io/cargobit/governance-postcheck:$tag" && echo "✅ $tag"
done

# 5. Notify security team
echo "5. Notifying security team..."
curl -X POST "$SLACK_WEBHOOK_URL" -d '{
  "text": "🚨 EMERGENCY KEY ROTATION COMPLETED",
  "attachments": [{
    "fields": [
      {"title": "Timestamp", "value": "'$(date -Iseconds)'", "short": true},
      {"title": "New Key ID", "value": "'$NEW_KEY_ID'", "short": true}
    ]
  }]
}'

echo "✅ EMERGENCY ROTATION COMPLETE"
```

---

## Rotation Status Dashboard

```yaml
# Prometheus recording rules for key rotation monitoring
groups:
  - name: key_rotation
    interval: 1h
    rules:
      - record: key:rotation:days_since_last
        expr: |
          time() - on() group_left
          (key_rotation_timestamp{key_type="cosign"} / 1000) / 86400
      
      - record: key:rotation:days_until_due
        expr: |
          90 - key:rotation:days_since_last
      
      - alert: KeyRotationDueSoon
        expr: key:rotation:days_until_due < 14
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Key rotation due in {{ $value }} days"
          description: "cosign signing key rotation is due soon"
      
      - alert: KeyRotationOverdue
        expr: key:rotation:days_until_due < 0
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "Key rotation overdue by {{ $value }} days"
          description: "cosign signing key rotation is overdue"
```

---

## Key Rotation Tracking Template

```markdown
# Key Rotation Log

## Rotation Entry

| Field | Value |
|-------|-------|
| **Date** | YYYY-MM-DD |
| **Key Type** | cosign Signing Key |
| **Rotation Reason** | Scheduled / Emergency |
| **Performed By** | Name (email) |
| **Old Key ID** | SHA256[:16] |
| **New Key ID** | SHA256[:16] |
| **Images Re-signed** | Count |
| **Verification Status** | ✅ All verified |
| **Rollback Plan** | [Link to archived key] |

### Steps Completed
- [ ] New key generated
- [ ] CI secrets updated
- [ ] Images re-signed
- [ ] Signatures verified
- [ ] Old key archived
- [ ] Documentation updated
- [ ] Team notified

### Issues Encountered
[Document any issues and resolutions]

### Notes
[Additional notes]
```

---

## Notifications Setup

### Slack Notifications

```yaml
# .github/workflows/key-rotation-reminder.yml
name: Key Rotation Reminder

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC

jobs:
  check-rotation:
    runs-on: ubuntu-latest
    steps:
      - name: Check key rotation status
        run: |
          LAST_ROTATION="2026-04-15"
          DAYS_SINCE=$(( ($(date +%s) - $(date -d $LAST_ROTATION +%s)) / 86400 ))
          DAYS_UNTIL=$(( 90 - DAYS_SINCE ))
          
          if [ $DAYS_UNTIL -lt 14 ]; then
            curl -X POST ${{ secrets.SLACK_WEBHOOK }} -d "{
              \"text\": \"⚠️ Key rotation due in $DAYS_UNTIL days\",
              \"attachments\": [{\"color\": \"warning\", \"text\": \"Schedule rotation at https://internal.cargobit.io/key-rotation\"}]
            }"
          fi
```

### Calendar Integration

```bash
# Generate ICS calendar file
cat > key-rotation-calendar.ics << 'EOF'
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CargoBit//Key Rotation Calendar//EN
BEGIN:VEVENT
DTSTART:20260415T090000Z
DTEND:20260415T100000Z
RRULE:FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=15
SUMMARY:cosign Key Rotation
DESCRIPTION:Rotate cosign signing key for image signing
LOCATION:https://internal.cargobit.io/key-rotation
END:VEVENT
BEGIN:VEVENT
DTSTART:20260401T090000Z
DTEND:20260401T100000Z
RRULE:FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1
SUMMARY:Registry Credentials Rotation
DESCRIPTION:Rotate registry credentials
END:VEVENT
BEGIN:VEVENT
DTSTART:20260215T090000Z
DTEND:20260215T100000Z
RRULE:FREQ=MONTHLY
SUMMARY:Service Account Token Rotation
DESCRIPTION:Rotate service account tokens
END:VEVENT
END:VCALENDAR
EOF
```

---

## Block Metadata

| Field | Value |
|-------|-------|
| **Block ID** | CO |
| **Title** | Key-Rotation Kalender-Template |
| **Category** | Security, Key Management, Compliance |
| **Related Blocks** | CL (Release Steps), CN (Incident Template), CD (Keyless Key Management) |
| **Created** | 2026-05-07 |

---

*CargoBit Developer Portal – Multi-Agent System Documentation*
