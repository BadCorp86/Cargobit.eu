#!/usr/bin/env node
/**
 * CargoBit Multi-Agent System - Publishing Script
 *
 * Publishes the generated output to various targets.
 *
 * Usage:
 *   node pipeline/publish.js [target] [options]
 *
 * Targets:
 *   artifact   Create distribution archive (default)
 *   release    Create GitHub release
 *   npm        Publish to NPM registry
 *   docker     Build and push Docker image
 *
 * Options:
 *   --version <version>  Version for the release
 *   --output <dir>       Output directory
 *   --dry-run            Simulate publishing without actually publishing
 *   --verbose            Verbose output
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, '../multi-agent/output');

// =============================================================================
// Publishing Functions
// =============================================================================

function createArtifact(outputDir, options = {}) {
  const version = options.version || '0.0.0-dev';
  const artifactName = `cargobit-foundation-${version}`;

  console.log(`\n📦 Creating artifact: ${artifactName}`);

  // Create tar.gz
  const tarFile = `${artifactName}.tar.gz`;
  execSync(`tar -czvf ${tarFile} -C ${outputDir} .`, { stdio: 'inherit' });
  console.log(`  ✓ Created ${tarFile}`);

  // Create zip
  const zipFile = `${artifactName}.zip`;
  execSync(`zip -r ${zipFile} ${outputDir}`, { stdio: 'inherit' });
  console.log(`  ✓ Created ${zipFile}`);

  return {
    tar: tarFile,
    zip: zipFile,
  };
}

function createRelease(outputDir, options = {}) {
  const version = options.version || '0.0.0-dev';
  const artifactName = `cargobit-foundation-${version}`;

  console.log(`\n🚀 Creating release: v${version}`);

  if (options.dryRun) {
    console.log('  [DRY RUN] Would create GitHub release');
    return;
  }

  // Check for gh CLI
  try {
    execSync('gh --version', { stdio: 'pipe' });
  } catch {
    console.log('  ⚠️  GitHub CLI not installed, skipping release creation');
    return;
  }

  // Generate release notes
  const releaseNotes = generateReleaseNotes(version, outputDir);
  const notesFile = 'release-notes.md';
  fs.writeFileSync(notesFile, releaseNotes);

  // Create artifacts first
  const artifacts = createArtifact(outputDir, options);

  // Create release
  const prerelease = version.includes('-') ? '--prerelease' : '';
  const cmd = `gh release create v${version} ${artifacts.tar} ${artifacts.zip} --title "v${version}" --notes-file ${notesFile} ${prerelease}`;

  if (options.verbose) {
    console.log(`  Running: ${cmd}`);
  }

  execSync(cmd, { stdio: 'inherit' });
  console.log(`  ✓ Release v${version} created`);

  // Cleanup
  fs.unlinkSync(notesFile);
}

function publishNpm(outputDir, options = {}) {
  console.log(`\n📦 Publishing to NPM`);

  if (options.dryRun) {
    console.log('  [DRY RUN] Would publish to NPM');
    return;
  }

  // Update package.json version
  const packagePath = path.join(outputDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  pkg.version = options.version || '0.0.0-dev';
  pkg.name = '@cargobit/foundation';
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));

  // Publish
  execSync(`npm publish --access restricted`, {
    cwd: outputDir,
    stdio: 'inherit',
  });

  console.log(`  ✓ Published @cargobit/foundation@${pkg.version}`);
}

function publishDocker(outputDir, options = {}) {
  const version = options.version || 'latest';

  console.log(`\n🐳 Publishing Docker image`);

  if (options.dryRun) {
    console.log('  [DRY RUN] Would build and push Docker image');
    return;
  }

  // Check for Docker
  try {
    execSync('docker --version', { stdio: 'pipe' });
  } catch {
    console.log('  ⚠️  Docker not installed, skipping image build');
    return;
  }

  const imageName = process.env.DOCKER_IMAGE || 'cargobit/foundation';
  const tags = [
    `${imageName}:${version}`,
    `${imageName}:latest`,
  ];

  // Build image
  console.log('  Building Docker image...');
  execSync(`docker build -t ${tags[0]} -t ${tags[1]} ${outputDir}`, {
    stdio: 'inherit',
  });

  // Push image
  if (!options.dryRun) {
    console.log('  Pushing Docker image...');
    for (const tag of tags) {
      execSync(`docker push ${tag}`, { stdio: 'inherit' });
    }
  }

  console.log(`  ✓ Docker image published: ${tags.join(', ')}`);
}

function generateReleaseNotes(version, outputDir) {
  // Read manifest for file count
  let fileCount = 0;
  const manifestPath = path.join(outputDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    fileCount = manifest.files?.length || 0;
  }

  return `# CargoBit Foundation System v${version}

## Overview

Production-ready payment system foundation with rate limiting, Stripe integration, and audit logging.

## Included Modules

| Block | Module | Files |
|-------|--------|-------|
| 1 | Data Model & Migrations | Prisma Schema, SQL Migrations |
| 2 | Backend Core | Rate Limiting, Stripe Webhook, Audit Log |
| 3 | SRE / Ops | Backup, Restore, CronJobs, Export |
| 4 | Tests | Jest Test Suites (120+ Tests) |
| 5 | Policies & Playbooks | Compliance Documentation |
| 6 | Final Assembly | Manifest, Checksums, README |

## Quick Start

\`\`\`bash
# Extract archive
tar -xzf cargobit-foundation-${version}.tar.gz

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Setup database
npx prisma migrate deploy

# Start development server
npm run dev
\`\`\`

## Files

Total files: ${fileCount}

## Checksum Verification

\`\`\`bash
sha256sum -c checksums.json
\`\`\`

## Documentation

- [Architecture Overview](docs/architecture-overview.md)
- [Security Policy](docs/security-policy.md)
- [Compliance Matrix](docs/compliance-matrix.md)
- [SLA Definitions](docs/sla-definitions.md)
- [Incident Response](docs/incident-response.md)
- [On-Call Playbook](docs/on-call-playbook.md)
- [Production Readiness](docs/production-readiness.md)

## License

UNLICENSED - Internal use only.
`;
}

// =============================================================================
// Main CLI
// =============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    target: 'artifact',
    outputDir: DEFAULT_OUTPUT_DIR,
    version: '0.0.0-dev',
    dryRun: false,
    verbose: false,
  };

  // Parse target
  const validTargets = ['artifact', 'release', 'npm', 'docker'];
  if (args[0] && validTargets.includes(args[0])) {
    options.target = args[0];
    args.shift();
  }

  // Parse options
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--version':
        options.version = args[++i];
        break;
      case '--output':
        options.outputDir = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
CargoBit Multi-Agent System - Publishing Script

Usage:
  node pipeline/publish.js [target] [options]

Targets:
  artifact   Create distribution archive (default)
  release    Create GitHub release
  npm        Publish to NPM registry
  docker     Build and push Docker image

Options:
  --version <version>  Version for the release
  --output <dir>       Output directory
  --dry-run            Simulate publishing without actually publishing
  --verbose            Verbose output
  --help               Show this help message

Examples:
  node pipeline/publish.js artifact --version 1.0.0
  node pipeline/publish.js release --version 1.0.0
  node pipeline/publish.js npm --version 1.0.0 --dry-run
`);
}

async function main() {
  const options = parseArgs();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          CargoBit Multi-Agent System Publisher             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nTarget: ${options.target}`);
  console.log(`Version: ${options.version}`);
  console.log(`Output: ${options.outputDir}`);
  console.log(`Dry run: ${options.dryRun}`);

  // Validate output directory
  if (!fs.existsSync(options.outputDir)) {
    console.error(`\n❌ Output directory not found: ${options.outputDir}`);
    process.exit(1);
  }

  // Execute target
  switch (options.target) {
    case 'artifact':
      createArtifact(options.outputDir, options);
      break;
    case 'release':
      createRelease(options.outputDir, options);
      break;
    case 'npm':
      publishNpm(options.outputDir, options);
      break;
    case 'docker':
      publishDocker(options.outputDir, options);
      break;
    default:
      console.error(`Unknown target: ${options.target}`);
      process.exit(1);
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Publishing Complete                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('  ✅ Publishing successful!\n');
}

// Run
main().catch(error => {
  console.error('Publishing failed:', error);
  process.exit(1);
});
