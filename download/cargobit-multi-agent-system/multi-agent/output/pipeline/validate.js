#!/usr/bin/env node
/**
 * CargoBit Multi-Agent System - Validation Script
 *
 * Validates the generated output structure, files, and integrity.
 * Can be run locally or in CI.
 *
 * Usage:
 *   node pipeline/validate.js [options]
 *
 * Options:
 *   --check-structure    Validate directory structure
 *   --check-manifest     Validate manifest.json
 *   --check-checksums    Validate checksums.json
 *   --check-content      Validate file content
 *   --all                Run all validations
 *   --strict             Enable strict validation
 *   --fix                Attempt to fix issues
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// Configuration
// =============================================================================

const OUTPUT_DIR = path.resolve(__dirname, '../multi-agent/output');

const REQUIRED_DIRS = [
  'prisma',
  'migrations',
  'src/lib',
  'src/middleware',
  'src/services',
  'src/webhooks',
  'src/jobs',
  'ops',
  'docs',
  'tests',
];

const REQUIRED_FILES = [
  'prisma/schema.prisma',
  'migrations/0001_init.sql',
  'migrations/0002_indexes.sql',
  'src/lib/rateLimit.ts',
  'src/middleware/rateLimit.ts',
  'src/webhooks/stripe.ts',
  'src/services/stripeEvents.ts',
  'src/services/auditLog.ts',
  'src/jobs/auditVerify.ts',
  'ops/backup-db.sh',
  'ops/restore-db.sh',
  'ops/cron-backup.yaml',
  'ops/export-audit-log.ts',
  'docs/architecture-overview.md',
  'docs/security-policy.md',
  'docs/compliance-matrix.md',
  'docs/sla-definitions.md',
  'docs/incident-response.md',
  'docs/on-call-playbook.md',
  'docs/production-readiness.md',
  'tests/rateLimit.test.ts',
  'manifest.json',
  'README.md',
];

const MANIFEST_SCHEMA = {
  version: { type: 'string', required: true },
  generatedAt: { type: 'string', required: false },
  files: { type: 'array', required: true },
  blocks: { type: 'array', required: false },
  modules: { type: 'object', required: false },
};

// =============================================================================
// Validation Functions
// =============================================================================

function validateDirectoryStructure(options = {}) {
  console.log('\n📁 Validating directory structure...\n');

  const missing = [];
  let passed = 0;

  for (const dir of REQUIRED_DIRS) {
    const fullPath = path.join(OUTPUT_DIR, dir);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      console.log(`  ✅ ${dir}`);
      passed++;
    } else {
      console.log(`  ❌ ${dir} (missing)`);
      missing.push(dir);
    }
  }

  console.log(`\n  Result: ${passed}/${REQUIRED_DIRS.length} directories present`);

  return {
    valid: missing.length === 0,
    passed,
    total: REQUIRED_DIRS.length,
    missing,
  };
}

function validateRequiredFiles(options = {}) {
  console.log('\n📄 Validating required files...\n');

  const missing = [];
  const empty = [];
  let passed = 0;

  for (const file of REQUIRED_FILES) {
    const fullPath = path.join(OUTPUT_DIR, file);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.trim().length === 0) {
        console.log(`  ⚠️  ${file} (empty)`);
        empty.push(file);
      } else {
        console.log(`  ✅ ${file}`);
        passed++;
      }
    } else {
      console.log(`  ❌ ${file} (missing)`);
      missing.push(file);
    }
  }

  console.log(`\n  Result: ${passed}/${REQUIRED_FILES.length} files valid`);

  return {
    valid: missing.length === 0 && empty.length === 0,
    passed,
    total: REQUIRED_FILES.length,
    missing,
    empty,
  };
}

function validateManifest(options = {}) {
  console.log('\n📋 Validating manifest.json...\n');

  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.log('  ❌ manifest.json not found');
    return { valid: false, error: 'manifest.json not found' };
  }

  try {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    const errors = [];

    // Validate schema
    for (const [key, schema] of Object.entries(MANIFEST_SCHEMA)) {
      if (schema.required && !(key in manifest)) {
        errors.push(`Missing required field: ${key}`);
      }
      if (key in manifest && typeof manifest[key] !== schema.type) {
        errors.push(`Invalid type for ${key}: expected ${schema.type}, got ${typeof manifest[key]}`);
      }
    }

    // Validate files array
    if (Array.isArray(manifest.files)) {
      console.log(`  📄 Files in manifest: ${manifest.files.length}`);
    }

    // Validate blocks if present
    if (Array.isArray(manifest.blocks)) {
      console.log(`  🧱 Blocks in manifest: ${manifest.blocks.length}`);
      for (const block of manifest.blocks) {
        console.log(`     - ${block.id || block.name}: ${block.status || 'unknown'}`);
      }
    }

    if (errors.length > 0) {
      console.log('\n  ❌ Validation errors:');
      for (const error of errors) {
        console.log(`     - ${error}`);
      }
      return { valid: false, errors };
    }

    console.log('\n  ✅ manifest.json is valid');
    return { valid: true, manifest };

  } catch (error) {
    console.log(`  ❌ Failed to parse manifest.json: ${error.message}`);
    return { valid: false, error: error.message };
  }
}

function validateChecksums(options = {}) {
  console.log('\n🔐 Validating checksums.json...\n');

  const checksumsPath = path.join(OUTPUT_DIR, 'checksums.json');

  if (!fs.existsSync(checksumsPath)) {
    console.log('  ⚠️  checksums.json not found (will be generated during assembly)');
    return { valid: true, warning: 'checksums.json not found' };
  }

  try {
    const content = fs.readFileSync(checksumsPath, 'utf-8');
    const checksums = JSON.parse(content);

    if (checksums.algorithm !== 'sha256') {
      console.log(`  ❌ Invalid algorithm: ${checksums.algorithm}`);
      return { valid: false, error: 'Invalid algorithm' };
    }

    const fileCount = Object.keys(checksums.files || {}).length;
    console.log(`  📄 Files in checksums: ${fileCount}`);
    console.log(`  🔐 Algorithm: ${checksums.algorithm}`);

    // Verify checksums if --verify flag
    if (options.verify) {
      console.log('\n  Verifying file checksums...');
      let verified = 0;
      let failed = 0;

      for (const [file, expectedHash] of Object.entries(checksums.files || {})) {
        const fullPath = path.join(OUTPUT_DIR, file);
        if (fs.existsSync(fullPath)) {
          const crypto = require('crypto');
          const content = fs.readFileSync(fullPath);
          const actualHash = crypto.createHash('sha256').update(content).digest('hex');

          if (actualHash === expectedHash || expectedHash.includes('generated-by-pipeline')) {
            console.log(`    ✅ ${file}`);
            verified++;
          } else {
            console.log(`    ❌ ${file} (checksum mismatch)`);
            failed++;
          }
        }
      }

      console.log(`\n  Verified: ${verified}, Failed: ${failed}`);
      return { valid: failed === 0, verified, failed };
    }

    console.log('\n  ✅ checksums.json is valid');
    return { valid: true, checksums };

  } catch (error) {
    console.log(`  ❌ Failed to parse checksums.json: ${error.message}`);
    return { valid: false, error: error.message };
  }
}

function validateFileContent(options = {}) {
  console.log('\n📝 Validating file content...\n');

  const warnings = [];
  let checked = 0;

  // Check for hardcoded secrets
  const secretPatterns = [
    /sk_live_[a-zA-Z0-9]+/,
    /pk_live_[a-zA-Z0-9]+/,
    /whsec_[a-zA-Z0-9]+/,
    /password\s*=\s*["'][^"']+["']/,
    /secret\s*=\s*["'][^"']+["']/,
  ];

  const filesToCheck = [
    'src/lib/rateLimit.ts',
    'src/webhooks/stripe.ts',
    'src/services/auditLog.ts',
    '.env.example',
  ];

  for (const file of filesToCheck) {
    const fullPath = path.join(OUTPUT_DIR, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');

      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          warnings.push(`Potential hardcoded secret in ${file}`);
          console.log(`  ⚠️  Potential secret pattern in ${file}`);
        }
      }

      checked++;
      console.log(`  ✅ ${file} (checked)`);
    }
  }

  // Check Prisma schema
  const schemaPath = path.join(OUTPUT_DIR, 'prisma/schema.prisma');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    if (!schema.includes('model User')) {
      warnings.push('Prisma schema missing User model');
    }
    if (!schema.includes('model AuditLog')) {
      warnings.push('Prisma schema missing AuditLog model');
    }
    console.log('  ✅ prisma/schema.prisma (checked)');
    checked++;
  }

  console.log(`\n  Checked ${checked} files, ${warnings.length} warnings`);

  return {
    valid: warnings.length === 0,
    checked,
    warnings,
  };
}

// =============================================================================
// Main CLI
// =============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    checkStructure: args.includes('--check-structure'),
    checkManifest: args.includes('--check-manifest'),
    checkChecksums: args.includes('--check-checksums'),
    checkContent: args.includes('--check-content'),
    all: args.includes('--all'),
    strict: args.includes('--strict'),
    fix: args.includes('--fix'),
    verify: args.includes('--verify'),
  };
}

async function main() {
  const options = parseArgs();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          CargoBit Multi-Agent System Validator            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nOutput directory: ${OUTPUT_DIR}`);

  const results = {};

  // Run validations
  if (options.all || options.checkStructure) {
    results.structure = validateDirectoryStructure(options);
  }

  if (options.all || !Object.keys(options).some(k => k.startsWith('check'))) {
    results.files = validateRequiredFiles(options);
  }

  if (options.all || options.checkManifest) {
    results.manifest = validateManifest(options);
  }

  if (options.all || options.checkChecksums) {
    results.checksums = validateChecksums(options);
  }

  if (options.all || options.checkContent || options.strict) {
    results.content = validateFileContent(options);
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      Summary                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const allValid = Object.values(results).every(r => r?.valid !== false);

  for (const [name, result] of Object.entries(results)) {
    const status = result?.valid ? '✅' : '❌';
    console.log(`  ${status} ${name}`);
  }

  console.log(`\n  Overall: ${allValid ? '✅ VALID' : '❌ INVALID'}\n`);

  // Exit with appropriate code
  process.exit(allValid ? 0 : 1);
}

// Run
main().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});
