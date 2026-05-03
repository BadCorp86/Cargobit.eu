#!/usr/bin/env node
/**
 * CargoBit Multi-Agent System - Assembly Script
 *
 * Assembles the final output from all agent outputs.
 * Generates manifest.json and checksums.json.
 *
 * Usage:
 *   node pipeline/assemble.js [options]
 *
 * Options:
 *   --output <dir>       Output directory (default: multi-agent/output)
 *   --generate-manifest  Generate manifest.json
 *   --generate-checksums Generate checksums.json
 *   --clean              Clean output directory before assembly
 *   --verbose            Verbose output
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, '../multi-agent/output');

// =============================================================================
// Assembly Functions
// =============================================================================

function gatherFiles(outputDir) {
  const files = {};

  function walk(dir, baseDir = '') {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(baseDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath, relativePath);
      } else if (entry.isFile()) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        files[relativePath] = content;
      }
    }
  }

  walk(outputDir);
  return files;
}

function generateManifest(files, options = {}) {
  const manifest = {
    version: options.version || '1.0.0',
    generatedAt: new Date().toISOString(),
    generator: 'cargobit-multi-agent-system',
    files: Object.keys(files)
      .sort()
      .map(filePath => ({
        path: filePath,
        type: getFileType(filePath),
      })),
    blocks: [
      {
        id: 'block-1',
        name: 'Data Model & Migrations',
        status: 'complete',
      },
      {
        id: 'block-2',
        name: 'Backend Core',
        status: 'complete',
      },
      {
        id: 'block-3',
        name: 'SRE / Ops',
        status: 'complete',
      },
      {
        id: 'block-4',
        name: 'Tests',
        status: 'complete',
      },
      {
        id: 'block-5',
        name: 'Policies & Playbooks',
        status: 'complete',
      },
      {
        id: 'block-6',
        name: 'Final Assembly',
        status: 'complete',
      },
    ],
    statistics: {
      totalFiles: Object.keys(files).length,
      byType: getFileTypeStats(files),
    },
  };

  return manifest;
}

function generateChecksums(files, options = {}) {
  const checksums = {
    algorithm: 'sha256',
    generatedAt: new Date().toISOString(),
    version: options.version || '1.0.0',
    files: {},
  };

  for (const [filePath, content] of Object.entries(files)) {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    checksums.files[filePath] = `sha256:${hash}`;
  }

  return checksums;
}

function getFileType(filePath) {
  const ext = path.extname(filePath);
  const dir = path.dirname(filePath);

  const typeMap = {
    '.prisma': 'schema',
    '.sql': 'migration',
    '.ts': getFileTypeFromPath(filePath),
    '.tsx': 'component',
    '.js': 'script',
    '.json': 'config',
    '.md': 'doc',
    '.yaml': 'config',
    '.yml': 'config',
    '.sh': 'ops',
    '.env.example': 'config',
  };

  return typeMap[ext] || 'other';
}

function getFileTypeFromPath(filePath) {
  if (filePath.includes('/lib/')) return 'library';
  if (filePath.includes('/middleware/')) return 'middleware';
  if (filePath.includes('/webhooks/')) return 'webhook';
  if (filePath.includes('/services/')) return 'service';
  if (filePath.includes('/jobs/')) return 'job';
  if (filePath.includes('/tests/')) return 'test';
  if (filePath.includes('/ops/')) return 'ops';
  return 'source';
}

function getFileTypeStats(files) {
  const stats = {};

  for (const filePath of Object.keys(files)) {
    const type = getFileType(filePath);
    stats[type] = (stats[type] || 0) + 1;
  }

  return stats;
}

function writeOutput(outputDir, files, manifest, checksums, options = {}) {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write files
  if (options.verbose) {
    console.log('Writing files...');
  }

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(outputDir, filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content);

    if (options.verbose) {
      console.log(`  ✓ ${filePath}`);
    }
  }

  // Write manifest
  if (manifest) {
    const manifestPath = path.join(outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`  ✓ manifest.json`);
  }

  // Write checksums
  if (checksums) {
    const checksumsPath = path.join(outputDir, 'checksums.json');
    fs.writeFileSync(checksumsPath, JSON.stringify(checksums, null, 2));
    console.log(`  ✓ checksums.json`);
  }
}

function cleanOutput(outputDir) {
  if (fs.existsSync(outputDir)) {
    console.log(`Cleaning output directory: ${outputDir}`);
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
}

// =============================================================================
// Main CLI
// =============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    outputDir: DEFAULT_OUTPUT_DIR,
    generateManifest: true,
    generateChecksums: true,
    clean: false,
    verbose: false,
    version: '1.0.0',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--output':
        options.outputDir = args[++i];
        break;
      case '--version':
        options.version = args[++i];
        break;
      case '--generate-manifest':
        options.generateManifest = true;
        break;
      case '--generate-checksums':
        options.generateChecksums = true;
        break;
      case '--clean':
        options.clean = true;
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
CargoBit Multi-Agent System - Assembly Script

Usage:
  node pipeline/assemble.js [options]

Options:
  --output <dir>       Output directory (default: multi-agent/output)
  --version <version>  Version for manifest (default: 1.0.0)
  --generate-manifest  Generate manifest.json (default: true)
  --generate-checksums Generate checksums.json (default: true)
  --clean              Clean output directory before assembly
  --verbose            Verbose output
  --help               Show this help message
`);
}

async function main() {
  const options = parseArgs();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          CargoBit Multi-Agent System Assembler             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nOutput directory: ${options.outputDir}`);
  console.log(`Version: ${options.version}`);

  // Clean if requested
  if (options.clean) {
    cleanOutput(options.outputDir);
  }

  // Gather files
  console.log('\n📦 Gathering files...');
  const files = gatherFiles(options.outputDir);
  console.log(`Found ${Object.keys(files).length} files`);

  // Generate manifest
  let manifest = null;
  if (options.generateManifest) {
    console.log('\n📋 Generating manifest.json...');
    manifest = generateManifest(files, options);
    console.log(`  Files: ${manifest.files.length}`);
    console.log(`  Blocks: ${manifest.blocks.length}`);
  }

  // Generate checksums
  let checksums = null;
  if (options.generateChecksums) {
    console.log('\n🔐 Generating checksums.json...');
    checksums = generateChecksums(files, options);
    console.log(`  Algorithm: ${checksums.algorithm}`);
    console.log(`  Files: ${Object.keys(checksums.files).length}`);
  }

  // Write output
  console.log('\n💾 Writing output...');
  writeOutput(options.outputDir, files, manifest, checksums, options);

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      Assembly Complete                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`  Files processed: ${Object.keys(files).length}`);
  console.log(`  Output directory: ${options.outputDir}`);
  console.log('\n  ✅ Assembly successful!\n');
}

// Run
main().catch(error => {
  console.error('Assembly failed:', error);
  process.exit(1);
});
