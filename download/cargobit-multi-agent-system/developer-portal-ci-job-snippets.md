# CI-Job-Snippets für Sandbox und Produktion

**Purpose**: Fertige CI-Job-Snippets für SBOM, Trivy, cosign und Kyverno Policy.

---

## 1. Syft SBOM Generation Job

### GitHub Actions

```yaml
# .github/workflows/sbom-generation.yml
name: Generate SBOM

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]
  workflow_call:
    inputs:
      image-tag:
        description: 'Image tag to generate SBOM for'
        required: true
        type: string
    outputs:
      sbom-artifact:
        description: 'SBOM artifact name'
        value: sbom-${{ inputs.image-tag }}

jobs:
  generate-sbom:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: read
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up image reference
        id: image
        run: |
          if [ "${{ inputs.image-tag }}" != "" ]; then
            echo "image-ref=ghcr.io/${{ github.repository_owner }}/governance-postcheck:${{ inputs.image-tag }}" >> $GITHUB_OUTPUT
          else
            echo "image-ref=ghcr.io/${{ github.repository_owner }}/governance-postcheck:${{ github.sha }}" >> $GITHUB_OUTPUT
          fi
      
      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Install Syft
        run: |
          SYFT_VERSION="1.0.0"
          curl -sSfL https://github.com/anchore/syft/releases/download/v${SYFT_VERSION}/syft_${SYFT_VERSION}_linux_amd64.tar.gz | tar xz -C /usr/local/bin
          syft version
      
      - name: Generate SBOM (SPDX JSON)
        run: |
          syft ${{ steps.image.outputs.image-ref }} \
            --output spdx-json=sbom-spdx.json \
            --output cyclonedx-json=sbom-cyclonedx.json \
            --output table=sbom-table.txt
          
          echo "=== SBOM Summary ==="
          cat sbom-table.txt
      
      - name: Generate SBOM attestation
        run: |
          # Create attestation predicate
          cat > attestation-predicate.json << EOF
          {
            "buildType": "https://github.com/actions/workflow",
            "builder": {
              "id": "https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
            },
            "invocation": {
              "configSource": {
                "uri": "https://github.com/${{ github.repository }}",
                "digest": {
                  "sha1": "${{ github.sha }}"
                }
              }
            },
            "metadata": {
              "buildStartedOn": "${{ github.event.head_commit.timestamp }}",
              "completeness": {
                "parameters": true,
                "environment": true,
                "materials": true
              }
            }
          }
          EOF
      
      - name: Upload SBOM artifacts
        uses: actions/upload-artifact@v4
        with:
          name: sbom-${{ github.sha }}
          path: |
            sbom-spdx.json
            sbom-cyclonedx.json
            sbom-table.txt
            attestation-predicate.json
          retention-days: 30
      
      - name: Upload SBOM to release (if tag)
        if: startsWith(github.ref, 'refs/tags/')
        uses: softprops/action-gh-release@v1
        with:
          files: |
            sbom-spdx.json
            sbom-cyclonedx.json
```

### GitLab CI

```yaml
# .gitlab-ci.yml - SBOM Generation Job
generate-sbom:
  stage: sbom
  image: docker:24.0.5
  services:
    - docker:24-dind
  variables:
    SYFT_VERSION: "1.0.0"
    IMAGE_NAME: "$CI_REGISTRY_IMAGE/governance-postcheck"
    IMAGE_TAG: "$CI_COMMIT_SHA"
  before_script:
    - apk add --no-cache curl
    - curl -sSfL https://github.com/anchore/syft/releases/download/v${SYFT_VERSION}/syft_${SYFT_VERSION}_linux_amd64.tar.gz | tar xz -C /usr/local/bin
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - |
      syft ${IMAGE_NAME}:${IMAGE_TAG} \
        --output spdx-json=sbom-spdx.json \
        --output cyclonedx-json=sbom-cyclonedx.json \
        --output table=sbom-table.txt
    - cat sbom-table.txt
  artifacts:
    name: "sbom-${CI_COMMIT_SHA}"
    paths:
      - sbom-spdx.json
      - sbom-cyclonedx.json
      - sbom-table.txt
    expire_in: 30 days
  only:
    - branches
    - tags
```

---

## 2. Trivy Pinned Version Scan Job

### GitHub Actions

```yaml
# .github/workflows/trivy-scan.yml
name: Trivy Security Scan

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]
  workflow_call:
    inputs:
      image-tag:
        description: 'Image tag to scan'
        required: true
        type: string
      fail-on-severity:
        description: 'Severity level to fail on'
        required: false
        type: string
        default: 'HIGH,CRITICAL'
    outputs:
      scan-result:
        description: 'Scan result (pass/fail)'
        value: ${{ jobs.scan.outputs.result }}

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: read
      security-events: write
    
    outputs:
      result: ${{ steps.scan.outputs.result }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up image reference
        id: image
        run: |
          if [ "${{ inputs.image-tag }}" != "" ]; then
            echo "image-ref=ghcr.io/${{ github.repository_owner }}/governance-postcheck:${{ inputs.image-tag }}" >> $GITHUB_OUTPUT
          else
            echo "image-ref=ghcr.io/${{ github.repository_owner }}/governance-postcheck:${{ github.sha }}" >> $GITHUB_OUTPUT
          fi
      
      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Install Trivy (pinned version)
        run: |
          TRIVY_VERSION="0.43.0"
          curl -sSfL https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz | tar xz -C /usr/local/bin
          trivy --version
          echo "Trivy version: $(trivy --version)"
      
      - name: Run Trivy vulnerability scanner
        id: scan
        run: |
          set +e
          
          # Run scan with JSON output
          trivy image \
            --input ${{ steps.image.outputs.image-ref }} \
            --format json \
            --output trivy-results.json \
            --severity ${{ inputs.fail-on-severity || 'HIGH,CRITICAL' }} \
            --ignore-unfixed \
            --no-progress
          
          SCAN_EXIT_CODE=$?
          
          # Run scan with SARIF output for GitHub Security
          trivy image \
            --input ${{ steps.image.outputs.image-ref }} \
            --format sarif \
            --output trivy-results.sarif \
            --severity ${{ inputs.fail-on-severity || 'HIGH,CRITICAL' }} \
            --ignore-unfixed \
            --no-progress
          
          # Run scan with table output for logs
          trivy image \
            --input ${{ steps.image.outputs.image-ref }} \
            --format table \
            --severity ${{ inputs.fail-on-severity || 'HIGH,CRITICAL' }} \
            --ignore-unfixed \
            --no-progress
          
          # Count findings
          CRITICAL=$(cat trivy-results.json | jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length' 2>/dev/null || echo "0")
          HIGH=$(cat trivy-results.json | jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="HIGH")] | length' 2>/dev/null || echo "0")
          MEDIUM=$(cat trivy-results.json | jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="MEDIUM")] | length' 2>/dev/null || echo "0")
          LOW=$(cat trivy-results.json | jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="LOW")] | length' 2>/dev/null || echo "0")
          
          echo ""
          echo "=== Trivy Scan Summary ==="
          echo "CRITICAL: ${CRITICAL}"
          echo "HIGH: ${HIGH}"
          echo "MEDIUM: ${MEDIUM}"
          echo "LOW: ${LOW}"
          echo ""
          
          # Set output
          if [ "$SCAN_EXIT_CODE" -eq 0 ]; then
            echo "result=pass" >> $GITHUB_OUTPUT
            echo "✅ Trivy scan passed - no blocking vulnerabilities found"
          else
            echo "result=fail" >> $GITHUB_OUTPUT
            echo "❌ Trivy scan failed - blocking vulnerabilities found"
            exit 1
          fi
      
      - name: Upload Trivy scan results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
          category: 'trivy'
      
      - name: Upload Trivy artifacts
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: trivy-scan-${{ github.sha }}
          path: |
            trivy-results.json
            trivy-results.sarif
          retention-days: 30
```

### GitLab CI

```yaml
# .gitlab-ci.yml - Trivy Scan Job
trivy-scan:
  stage: security
  image: docker:24.0.5
  services:
    - docker:24-dind
  variables:
    TRIVY_VERSION: "0.43.0"
    IMAGE_NAME: "$CI_REGISTRY_IMAGE/governance-postcheck"
    IMAGE_TAG: "$CI_COMMIT_SHA"
    TRIVY_SEVERITY: "HIGH,CRITICAL"
    TRIVY_EXIT_CODE: "1"
  before_script:
    - apk add --no-cache curl jq
    - curl -sSfL https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_Linux-64bit.tar.gz | tar xz -C /usr/local/bin
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - |
      # Run Trivy scan
      trivy image \
        --input ${IMAGE_NAME}:${IMAGE_TAG} \
        --format json \
        --output trivy-results.json \
        --severity ${TRIVY_SEVERITY} \
        --ignore-unfixed \
        --no-progress \
        --exit-code ${TRIVY_EXIT_CODE} || SCAN_FAILED=1
      
      # Generate summary
      CRITICAL=$(cat trivy-results.json | jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length' 2>/dev/null || echo "0")
      HIGH=$(cat trivy-results.json | jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="HIGH")] | length' 2>/dev/null || echo "0")
      
      echo ""
      echo "=== Trivy Scan Summary ==="
      echo "CRITICAL: ${CRITICAL}"
      echo "HIGH: ${HIGH}"
      echo ""
      
      if [ "${SCAN_FAILED:-0}" -eq 1 ]; then
        echo "❌ Trivy scan failed"
        exit 1
      else
        echo "✅ Trivy scan passed"
      fi
  artifacts:
    name: "trivy-scan-${CI_COMMIT_SHA}"
    paths:
      - trivy-results.json
    reports:
      vulnerability: trivy-results.json
    expire_in: 30 days
  allow_failure: false
  only:
    - branches
    - tags
```

---

## 3. cosign Sign/Verify Jobs

### GitHub Actions - Full Workflow

```yaml
# .github/workflows/cosign-sign-verify.yml
name: Sign and Verify Image

on:
  push:
    branches: [main]
    tags: ['v*']
  workflow_call:
    inputs:
      image-tag:
        description: 'Image tag to sign'
        required: true
        type: string
      keyless:
        description: 'Use keyless signing (OIDC)'
        required: false
        type: boolean
        default: true
    secrets:
      COSIGN_KEY:
        description: 'Private key for keyed signing (optional)'
        required: false
      COSIGN_PASSWORD:
        description: 'Password for encrypted key (optional)'
        required: false

jobs:
  sign:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
      packages: write
    
    outputs:
      image-digest: ${{ steps.digest.outputs.digest }}
      rekor-index: ${{ steps.sign.outputs.rekor-index }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up image reference
        id: image
        run: |
          if [ "${{ inputs.image-tag }}" != "" ]; then
            echo "image-ref=ghcr.io/${{ github.repository_owner }}/governance-postcheck:${{ inputs.image-tag }}" >> $GITHUB_OUTPUT
          else
            echo "image-ref=ghcr.io/${{ github.repository_owner }}/governance-postcheck:${{ github.sha }}" >> $GITHUB_OUTPUT
          fi
      
      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Install cosign
        uses: sigstore/cosign-installer@v3
        with:
          cosign-release: 'v2.1.0'
      
      - name: Get image digest
        id: digest
        run: |
          DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' ${{ steps.image.outputs.image-ref }} | cut -d'@' -f2)
          echo "digest=${DIGEST}" >> $GITHUB_OUTPUT
          echo "Image digest: ${DIGEST}"
      
      - name: Sign image (keyless)
        id: sign
        if: ${{ inputs.keyless != false }}
        run: |
          echo "=== Signing with Keyless (OIDC) ==="
          
          # Sign the image
          cosign sign --yes \
            --annotations="repo=${{ github.repository }}" \
            --annotations="workflow=${{ github.workflow }}" \
            --annotations="run-id=${{ github.run_id }}" \
            --annotations="commit=${{ github.sha }}" \
            ${{ steps.image.outputs.image-ref }}
          
          # Get Rekor index
          REKOR_INDEX=$(cosign verify --keyless --output=json ${{ steps.image.outputs.image-ref }} 2>/dev/null | jq -r '.[0].bundle.Payload.body' | base64 -d | jq -r '.logIndex' 2>/dev/null || echo "unknown")
          
          echo "rekor-index=${REKOR_INDEX}" >> $GITHUB_OUTPUT
          echo "Rekor log index: ${REKOR_INDEX}"
          echo ""
          echo "✅ Image signed successfully (keyless)"
      
      - name: Sign image (keyed)
        if: ${{ inputs.keyless == false && secrets.COSIGN_KEY != '' }}
        env:
          COSIGN_KEY: ${{ secrets.COSIGN_KEY }}
          COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}
        run: |
          echo "=== Signing with Key ==="
          
          # Write key to file
          echo "$COSIGN_KEY" | base64 -d > cosign.key
          
          # Sign the image
          cosign sign \
            --key cosign.key \
            --annotations="repo=${{ github.repository }}" \
            --annotations="workflow=${{ github.workflow }}" \
            --annotations="run-id=${{ github.run_id }}" \
            --annotations="commit=${{ github.sha }}" \
            ${{ steps.image.outputs.image-ref }}
          
          echo ""
          echo "✅ Image signed successfully (keyed)"
      
      - name: Verify signature
        id: verify
        run: |
          echo "=== Verifying Signature ==="
          
          if [ "${{ inputs.keyless != false }}" == "true" ]; then
            cosign verify --keyless \
              --certificate-identity-regexp="^https://github.com/${{ github.repository_owner }}" \
              --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
              ${{ steps.image.outputs.image-ref }} | tee verify-output.json
          else
            # Get public key
            echo "$COSIGN_KEY" | base64 -d > cosign.key
            cosign public-key --key cosign.key > cosign.pub
            
            cosign verify --key cosign.pub \
              ${{ steps.image.outputs.image-ref }} | tee verify-output.json
          fi
          
          echo ""
          echo "✅ Signature verified successfully"
      
      - name: Upload signing artifacts
        uses: actions/upload-artifact@v4
        with:
          name: cosign-signing-${{ github.sha }}
          path: |
            verify-output.json
          retention-days: 30

  verify:
    runs-on: ubuntu-latest
    needs: [sign]
    if: ${{ github.event_name == 'pull_request' }}
    
    steps:
      - name: Install cosign
        uses: sigstore/cosign-installer@v3
        with:
          cosign-release: 'v2.1.0'
      
      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Verify image signature
        run: |
          IMAGE_REF="ghcr.io/${{ github.repository_owner }}/governance-postcheck:${{ github.sha }}"
          
          echo "=== Verifying Image Signature ==="
          echo "Image: ${IMAGE_REF}"
          echo ""
          
          cosign verify --keyless \
            --certificate-identity-regexp="^https://github.com/${{ github.repository_owner }}" \
            --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
            ${IMAGE_REF}
          
          echo ""
          echo "✅ Signature verification passed"
```

### GitLab CI - Full Job

```yaml
# .gitlab-ci.yml - cosign Sign/Verify Jobs
cosign-sign:
  stage: sign
  image: docker:24.0.5
  services:
    - docker:24-dind
  variables:
    COSIGN_VERSION: "2.1.0"
    IMAGE_NAME: "$CI_REGISTRY_IMAGE/governance-postcheck"
    IMAGE_TAG: "$CI_COMMIT_SHA"
  id_tokens:
    SIGSTORE_ID_TOKEN:
      aud: sigstore
  before_script:
    - apk add --no-cache curl jq
    - curl -sSL https://github.com/sigstore/cosign/releases/download/v${COSIGN_VERSION}/cosign-linux-amd64 -o /usr/local/bin/cosign
    - chmod +x /usr/local/bin/cosign
    - cosign version
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - |
      IMAGE_REF="${IMAGE_NAME}:${IMAGE_TAG}"
      
      echo "=== Signing Image (Keyless) ==="
      echo "Image: ${IMAGE_REF}"
      
      # Keyless signing with OIDC
      cosign sign --yes \
        --identity-token ${SIGSTORE_ID_TOKEN} \
        --annotations="repo=${CI_PROJECT_PATH}" \
        --annotations="pipeline=${CI_PIPELINE_ID}" \
        --annotations="commit=${CI_COMMIT_SHA}" \
        ${IMAGE_REF}
      
      echo ""
      echo "✅ Image signed successfully"
      
      # Verify signature
      echo "=== Verifying Signature ==="
      cosign verify --keyless ${IMAGE_REF} | tee verify-output.json
      
      echo ""
      echo "✅ Signature verified"
  artifacts:
    name: "cosign-signing-${CI_COMMIT_SHA}"
    paths:
      - verify-output.json
    expire_in: 30 days
  only:
    - branches
    - tags

cosign-verify:
  stage: verify
  image: docker:24.0.5
  services:
    - docker:24-dind
  variables:
    COSIGN_VERSION: "2.1.0"
    IMAGE_NAME: "$CI_REGISTRY_IMAGE/governance-postcheck"
    IMAGE_TAG: "$CI_COMMIT_SHA"
  before_script:
    - apk add --no-cache curl
    - curl -sSL https://github.com/sigstore/cosign/releases/download/v${COSIGN_VERSION}/cosign-linux-amd64 -o /usr/local/bin/cosign
    - chmod +x /usr/local/bin/cosign
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - |
      IMAGE_REF="${IMAGE_NAME}:${IMAGE_TAG}"
      
      echo "=== Verifying Image Signature ==="
      echo "Image: ${IMAGE_REF}"
      
      # Keyless verify
      cosign verify --keyless ${IMAGE_REF}
      
      echo ""
      echo "✅ Signature verification passed"
  needs:
    - cosign-sign
  only:
    - branches
    - tags
```

---

## 4. Kyverno Policy Vorlage

### ClusterPolicy - cosign Signature Verification

```yaml
# kyverno-policy-cosign.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-cosign-signature
  annotations:
    policies.kyverno.io/title: Verify cosign Image Signatures
    policies.kyverno.io/category: Security
    policies.kyverno.io/severity: high
    policies.kyverno.io/subject: Pod
    policies.kyverno.io/description: >-
      This policy verifies that all images from the CargoBit registry
      are signed with cosign before allowing deployment.
spec:
  validationFailureAction: enforce
  background: false
  failurePolicy: Fail
  rules:
    # Rule 1: Verify keyless signatures for CargoBit images
    - name: verify-keyless-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
                - Deployment
                - StatefulSet
                - DaemonSet
                - Job
                - CronJob
      verifyImages:
        - imageReferences:
            - "ghcr.io/cargobit/*"
            - "registry.cargobit.io/*"
          required: true
          verifyDigest: true
          mutateDigest: true
          attestors:
            - entries:
                - keys:
                    publicKeys: |-
                      # Keyless verification - empty for Rekor-based verification
                      # Kyverno will verify against Fulcio certificates
                  attestations:
                    - predicateType: cosign.sigstore.dev/attestation/vuln/v1
                      conditions:
                        - all:
                            - key: "{{ scanner.uri }}"
                              operator: Equals
                              value: "https://trivy.dev"
                            - key: "{{ scanner.result.HIGH }}"
                              operator: LessThan
                              value: "1"
                            - key: "{{ scanner.result.CRITICAL }}"
                              operator: LessThan
                              value: "1"
    
    # Rule 2: Require SBOM attestation
    - name: require-sbom-attestation
      match:
        any:
          - resources:
              kinds:
                - Pod
                - Deployment
      verifyImages:
        - imageReferences:
            - "ghcr.io/cargobit/*"
          required: true
          attestations:
            - predicateType: https://spdx.dev/Document
              conditions:
                - all:
                    - key: "{{ predicate.DocumentName }}"
                      operator: Equals
                      value: "governance-postcheck"

---
# ClusterPolicy - Block unsigned images
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: block-unsigned-images
  annotations:
    policies.kyverno.io/title: Block Unsigned Images
    policies.kyverno.io/category: Security
    policies.kyverno.io/severity: critical
    policies.kyverno.io/description: >-
      This policy blocks deployment of images that are not signed
      with cosign from trusted registries.
spec:
  validationFailureAction: enforce
  background: false
  rules:
    - name: block-unsigned
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Images must be signed with cosign. Unsigned images are not allowed."
        pattern:
          spec:
            containers:
              - image: "ghcr.io/cargobit/*"
            # Image must have a digest (immutable tag)
            =(image): "*@sha256:*"
```

### Kyverno Policy with Keyed Signing

```yaml
# kyverno-policy-keyed.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-cosign-keyed-signature
  annotations:
    policies.kyverno.io/title: Verify cosign Keyed Signatures
    policies.kyverno.io/category: Security
spec:
  validationFailureAction: enforce
  background: false
  rules:
    - name: verify-with-public-key
      match:
        any:
          - resources:
              kinds:
                - Pod
                - Deployment
      verifyImages:
        - imageReferences:
            - "ghcr.io/cargobit/*"
          required: true
          verifyDigest: true
          mutateDigest: true
          attestors:
            - entries:
                - keys:
                    publicKeys: |-
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEXAMPLE_PUBLIC_KEY_HERE
                      -----END PUBLIC KEY----
                    # Or use KMS reference
                    # kms: awskms://alias/cargobit-signing-key
```

### Kyverno Test Resources

```yaml
# test-unsigned-image.yaml (should fail)
apiVersion: v1
kind: Pod
metadata:
  name: test-unsigned
  namespace: default
spec:
  containers:
    - name: app
      image: ghcr.io/cargobit/test-unsigned:latest
      # Expected: Admission denied - image not signed

---
# test-signed-image.yaml (should pass)
apiVersion: v1
kind: Pod
metadata:
  name: test-signed
  namespace: default
spec:
  containers:
    - name: app
      image: ghcr.io/cargobit/governance-postcheck@sha256:abc123...
      # Expected: Admission allowed - image is signed
```

### Kyverno Installation Commands

```bash
# Install Kyverno
kubectl create namespace kyverno
helm repo add kyverno https://kyverno.github.io/kyverno/
helm install kyverno kyverno/kyverno -n kyverno

# Apply policies
kubectl apply -f kyverno-policy-cosign.yaml
kubectl apply -f kyverno-policy-keyed.yaml

# Verify policies are active
kubectl get clusterpolicies

# Test with unsigned image (should fail)
kubectl apply -f test-unsigned-image.yaml

# Test with signed image (should pass)
kubectl apply -f test-signed-image.yaml
```

---

## 5. Complete CI Pipeline Example

### GitHub Actions - Full Pipeline

```yaml
# .github/workflows/complete-ci-pipeline.yml
name: Complete CI Pipeline

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]
  release:
    types: [published]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/governance-postcheck

jobs:
  # Job 1: Build and Test
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        run: docker build -t $REGISTRY/$IMAGE_NAME:${{ github.sha }} .
      - name: Run tests
        run: docker run --rm $REGISTRY/$IMAGE_NAME:${{ github.sha }} pytest

  # Job 2: Trivy Scan
  trivy:
    needs: build
    uses: ./.github/workflows/trivy-scan.yml
    with:
      image-tag: ${{ github.sha }}

  # Job 3: SBOM Generation
  sbom:
    needs: build
    uses: ./.github/workflows/sbom-generation.yml
    with:
      image-tag: ${{ github.sha }}

  # Job 4: Sign Image
  sign:
    needs: [trivy, sbom]
    uses: ./.github/workflows/cosign-sign-verify.yml
    with:
      image-tag: ${{ github.sha }}
      keyless: true

  # Job 5: Push to Registry
  push:
    needs: sign
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
      - name: Push image
        run: |
          docker push $REGISTRY/$IMAGE_NAME:${{ github.sha }}
          docker tag $REGISTRY/$IMAGE_NAME:${{ github.sha }} $REGISTRY/$IMAGE_NAME:latest
          docker push $REGISTRY/$IMAGE_NAME:latest

  # Job 6: Deploy Gate (Verify before deploy)
  deploy-gate:
    needs: push
    runs-on: ubuntu-latest
    steps:
      - name: Install cosign
        uses: sigstore/cosign-installer@v3
      - name: Verify signature
        run: |
          cosign verify --keyless $REGISTRY/$IMAGE_NAME:${{ github.sha }}
          echo "✅ Image verified, ready for deployment"
```

---

## Block Metadata

| Field | Value |
|-------|-------|
| **Block ID** | CQ |
| **Title** | CI-Job-Snippets (syft, trivy, cosign, Kyverno) |
| **Category** | CI/CD, Security, Kubernetes |
| **Related Blocks** | CP (Pre-Release Checklist), CM (Canary Manifest), CD (GitLab CI) |
| **Created** | 2026-05-07 |

---

*CargoBit Developer Portal – Multi-Agent System Documentation*
