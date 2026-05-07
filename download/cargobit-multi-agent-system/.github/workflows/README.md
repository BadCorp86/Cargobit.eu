# CI/CD Workflows

This directory contains reusable GitHub Actions workflows for the governance-postcheck service.

## Workflows

| Workflow | Purpose | File |
|----------|---------|------|
| **SBOM Generation** | Generate Software Bill of Materials | `sbom-generation.yml` |
| **Trivy Scan** | Security vulnerability scanning | `trivy-scan.yml` |
| **cosign Sign/Verify** | Image signing and verification | `cosign-sign-verify.yml` |
| **Complete Pipeline** | Full CI/CD pipeline | `complete-ci-pipeline.yml` |

## Usage

### Reusable Workflows

```yaml
# In your workflow
jobs:
  trivy:
    uses: ./.github/workflows/trivy-scan.yml
    with:
      image-tag: ${{ github.sha }}
  
  sbom:
    uses: ./.github/workflows/sbom-generation.yml
    with:
      image-tag: ${{ github.sha }}
  
  sign:
    uses: ./.github/workflows/cosign-sign-verify.yml
    with:
      image-tag: ${{ github.sha }}
      keyless: true
```

### Required Permissions

```yaml
permissions:
  id-token: write    # For OIDC/Keyless signing
  contents: read     # For checkout
  packages: write    # For GHCR push
  security-events: write  # For SARIF upload
```

### Required Secrets

| Secret | Description |
|--------|-------------|
| `GITHUB_TOKEN` | Automatically provided |
| `REGISTRY_USERNAME` | For external registries |
| `REGISTRY_PASSWORD` | For external registries |
| `KUBE_CONFIG` | Base64-encoded kubeconfig |

## Pipeline Stages

```
build → trivy → sbom → sign → deploy-gate → deploy-canary → deploy-production
```

## Pinned Versions

| Tool | Version |
|------|---------|
| Trivy | 0.43.0 |
| Syft | 1.0.0 |
| cosign | 2.1.0 |

## Kyverno Policies

See `../kyverno-policies/` for cluster admission policies.
