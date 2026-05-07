# CI-Pipeline für automatische Status-Matrix Aktualisierung

GitHub Actions Workflow zur automatischen Aktualisierung der Release Status Matrix.

---

## Workflow-Datei

**Pfad:** `.github/workflows/release-status-update.yml`

```yaml
name: Release Status Matrix Update

on:
  push:
    branches: [main]
    paths:
      - 'RELEASE_STATUS.md'
  workflow_dispatch:
    inputs:
      area:
        description: 'Bereich zum Aktualisieren'
        required: true
        type: choice
        options:
          - secrets-oidc
          - trivy-sbom
          - signature
          - canary
          - admission
          - key-rotation
          - gonogo
      status:
        description: 'Neuer Status'
        required: true
        type: choice
        options:
          - TODO
          - IN_PROGRESS
          - DONE
      comment:
        description: 'Kommentar'
        required: false
        default: ''

jobs:
  update-status:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Configure Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
      
      - name: Update Status Matrix
        id: update
        run: |
          # Status mapping
          case "${{ inputs.status }}" in
            TODO) emoji="⬜" ;;
            IN_PROGRESS) emoji="🟡" ;;
            DONE) emoji="🟢" ;;
          esac
          
          # Area mapping
          case "${{ inputs.area }}" in
            secrets-oidc) area_name="Secrets & OIDC" ;;
            trivy-sbom) area_name="Trivy & SBOM" ;;
            signature) area_name="Signatur-Verifikation" ;;
            canary) area_name="Canary Deploy" ;;
            admission) area_name="Admission Enforcement" ;;
            key-rotation) area_name="Key Rotation" ;;
            gonogo) area_name="Go/No-Go" ;;
          esac
          
          # Get current timestamp
          timestamp=$(date '+%Y-%m-%d %H:%M')
          
          # Update the file using sed
          sed -i "s/| \*\*${area_name}\*\* | \(.*\) | \(.*\) | \(.*\) | \(.*\) |/| **${area_name}** | \1 | ${emoji} ${inputs.status} | ${timestamp} | \4 |/" RELEASE_STATUS.md
          
          echo "area_name=${area_name}" >> $GITHUB_OUTPUT
          echo "new_status=${emoji} ${inputs.status}" >> $GITHUB_OUTPUT
      
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          title: "chore: Update Release Status - ${{ steps.update.outputs.area_name }}"
          body: |
            ## Status Update
            
            **Bereich:** ${{ steps.update.outputs.area_name }}
            **Neuer Status:** ${{ steps.update.outputs.new_status }}
            **Kommentar:** ${{ inputs.comment }}
            
            ---
            
            Automatisch generiert durch GitHub Actions.
          branch: automated/status-update-${{ github.run_id }}
          commit-message: "chore: update release status matrix"
          labels: |
            automated
            release-status
          reviewers: ${{ vars.RELEASE_MANAGER_GH_HANDLE }}
```

---

## Verwendung

### Manuelle Auslösung

```bash
# Via GitHub CLI
gh workflow run release-status-update.yml \
  -f area=canary \
  -f status=DONE \
  -f comment="Canary stabil nach 48h"
```

### Automatische Aktualisierung

Die Pipeline aktualisiert sich automatisch, wenn:
- `RELEASE_STATUS.md` geändert wird
- Andere Workflows (Trivy, Cosign) erfolgreich abgeschlossen sind

---

## Integration mit anderen Workflows

### Nach Trivy-Scan

```yaml
# In .github/workflows/security-scan.yml
jobs:
  scan:
    # ... scan steps ...
    
  update-status:
    needs: scan
    if: success()
    uses: ./.github/workflows/release-status-update.yml
    with:
      area: trivy-sbom
      status: DONE
      comment: "Trivy Scan ohne CRITICAL findings"
```

### Nach Cosign-Signing

```yaml
# In .github/workflows/sign.yml
jobs:
  sign:
    # ... sign steps ...
    
  update-status:
    needs: sign
    if: success()
    uses: ./.github/workflows/release-status-update.yml
    with:
      area: signature
      status: DONE
      comment: "Image signiert, Rekor-Index dokumentiert"
```

---

## Webhook-basierte Aktualisierung

```yaml
name: Webhook Status Update

on:
  repository_dispatch:
    types: [release-status-update]

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Process Webhook
        run: |
          AREA="${{ github.event.client_payload.area }}"
          STATUS="${{ github.event.client_payload.status }}"
          COMMENT="${{ github.event.client_payload.comment }}"
          
          # Update logic here
          echo "Updating ${AREA} to ${STATUS}: ${COMMENT}"
```

---

## Slack-Benachrichtigung bei Änderungen

```yaml
  notify:
    needs: update-status
    runs-on: ubuntu-latest
    steps:
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "📊 Release Status Update",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*${{ steps.update.outputs.area_name }}* → ${{ steps.update.outputs.new_status }}\nKommentar: ${{ inputs.comment }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## API-Endpunkt für externe Systeme

```bash
# Via curl
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/ORG/REPO/dispatches \
  -d '{
    "event_type": "release-status-update",
    "client_payload": {
      "area": "canary",
      "status": "DONE",
      "comment": "Canary promotion erfolgreich"
    }
  }'
```

---

*Block DG – CI-Pipeline für Status-Matrix*
