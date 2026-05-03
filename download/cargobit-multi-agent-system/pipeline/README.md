# CargoBit Code Generator Pipeline

> Enterprise-grade CI/CD pipeline for deterministic code generation

This pipeline executes the full multi-agent system and produces a complete technical foundation for the CargoBit payment system.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                       │
│  .github/workflows/generate-foundation.yml                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Pipeline Steps                               │
│                                                                  │
│  1. Run (run.js)        → Execute Multi-Agent System            │
│  2. Validate (validate.js) → Verify output correctness          │
│  3. Assemble (assemble.js) → Package release artifacts          │
│  4. Publish (publish.js)   → Deploy to targets                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Output Artifacts                              │
│                                                                  │
│  • dist/                   - Distribution directory              │
│  • cargobit-foundation.tar.gz - Release tarball                  │
│  • manifest.json           - File manifest                       │
│  • checksums.json          - SHA-256 checksums                   │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Local Execution

```bash
# Run complete pipeline
node pipeline/run.js && node pipeline/validate.js && node pipeline/assemble.js

# Or run individual steps
node pipeline/run.js        # Generate code
node pipeline/validate.js   # Validate output
node pipeline/assemble.js   # Create release package
node pipeline/publish.js    # Publish to targets
```

### CI/CD Execution

The pipeline automatically runs on:
- Push to `main` branch (when multi-agent or pipeline files change)
- Manual trigger via `workflow_dispatch`

## Pipeline Steps

### 1. Run Multi-Agent System (`run.js`)

Generates all artifacts using the multi-agent orchestrator:

```bash
node pipeline/run.js
```

**Output:**
- `multi-agent/output/` - Generated code
- `generation.log` - Execution log

**Features:**
- 30-minute timeout protection
- Real-time stdout/stderr capture
- Detailed logging

### 2. Validate Output (`validate.js`)

Ensures generated code meets quality standards:

```bash
node pipeline/validate.js          # Run all validations
node pipeline/validate.js --typescript  # TypeScript only
node pipeline/validate.js --sql         # SQL only
node pipeline/validate.js --manifest    # Manifest only
```

**Validation Checks:**
- File structure completeness
- TypeScript syntax and patterns
- SQL migration validity
- Documentation quality
- Shell script correctness
- Manifest integrity

**Forbidden Patterns:**
- `TODO` comments
- `FIXME` comments
- `any` types (warning)
- `console.log` in non-test files (warning)

### 3. Assemble Artifacts (`assemble.js`)

Creates a release package:

```bash
node pipeline/assemble.js
```

**Generated Files:**
- `dist/package.json` - Package configuration
- `dist/tsconfig.json` - TypeScript configuration
- `dist/README.md` - Package documentation
- `dist/RELEASE_NOTES.md` - Release notes
- `dist/release-manifest.json` - Release metadata
- `cargobit-foundation-{version}.tar.gz` - Tarball

### 4. Publish (`publish.js`)

Deploys to configured targets:

```bash
node pipeline/publish.js           # Full publish
node pipeline/publish.js --dry-run # Check only
node pipeline/publish.js --git-only # Git only
node pipeline/publish.js --s3-only  # S3 only
```

**Publish Targets:**
- Git repository (commit + tag + push)
- S3 bucket (artifact storage)
- npm registry (optional)
- GitHub Releases

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_TOKEN` | GitHub API token | For releases |
| `AWS_ACCESS_KEY_ID` | AWS access key | For S3 |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | For S3 |
| `AWS_REGION` | AWS region | Optional (default: eu-west-1) |
| `S3_BUCKET` | S3 bucket name | For S3 |
| `NPM_TOKEN` | npm registry token | For npm |
| `SLACK_WEBHOOK_URL` | Slack webhook | For notifications |
| `GIT_BRANCH` | Git branch | Optional (default: main) |

### Workflow Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `version` | Release version | From config |
| `dry_run` | Skip publish step | `false` |

## Determinism Rules

To ensure reproducible builds:

1. **No timestamps in generated files** (except logs)
2. **No random values** in code
3. **Alphabetically sorted** file lists
4. **Consistent ordering** of JSON keys
5. **Fixed versions** in dependencies

## Output Structure

```
dist/
├── prisma/
│   └── schema.prisma        # Database schema
├── migrations/
│   ├── 0001_init.sql        # Initial migration
│   └── 0002_indexes.sql     # Index migration
├── src/
│   ├── lib/                 # Core libraries
│   ├── middleware/          # Express middleware
│   ├── webhooks/            # Stripe webhooks
│   ├── services/            # Business logic
│   └── jobs/                # Scheduled jobs
├── ops/
│   ├── backup-db.sh         # Backup script
│   ├── restore-db.sh        # Restore script
│   └── cron-backup.yaml     # Cron configuration
├── tests/
│   └── *.test.ts            # Test files
├── docs/
│   └── *.md                 # Documentation
├── package.json
├── tsconfig.json
├── README.md
├── RELEASE_NOTES.md
├── release-manifest.json
└── manifest.json
```

## CI/CD Integration

### GitHub Actions

The workflow includes:

1. **Generate Job**
   - Runs multi-agent system
   - Validates output
   - Assembles artifacts
   - Publishes to targets

2. **Test Job**
   - PostgreSQL service container
   - Redis service container
   - Full test suite execution
   - Coverage upload to Codecov

3. **Security Scan Job**
   - Trivy vulnerability scanning
   - npm audit
   - SARIF upload to GitHub Security

### Triggering

```yaml
# Automatic: Push to main
on:
  push:
    branches: [main]
    paths:
      - 'multi-agent/**'
      - 'pipeline/**'

# Manual: workflow_dispatch
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Release version'
      dry_run:
        type: boolean
```

## Monitoring

### Pipeline Metrics

The pipeline logs:
- Generation duration
- File count
- Total size
- Validation results
- Publish status

### Notifications

Slack notifications include:
- Version number
- Success/failure status
- Timestamp
- Artifact links

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `Output directory missing` | Run `run.js` first |
| `Validation failed` | Check forbidden patterns |
| `Git push failed` | Check GITHUB_TOKEN permissions |
| `S3 upload failed` | Verify AWS credentials |

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* node pipeline/run.js

# Dry run publish
node pipeline/publish.js --dry-run
```

## Best Practices

1. **Version Pinning**: Always pin dependency versions
2. **Idempotency**: Pipeline should be safely re-runnable
3. **Atomic Operations**: Use transactions where possible
4. **Secret Management**: Never log secrets
5. **Audit Trail**: All operations logged

## Security Considerations

- All secrets passed via environment variables
- No secrets in generated code
- Git commits use bot identity
- Release tags are immutable
- Artifacts signed with checksums

## License

UNLICENSED - Internal use only

---

*Generated by CargoBit Multi-Agent System*
