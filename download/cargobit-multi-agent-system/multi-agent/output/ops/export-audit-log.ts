/**
 * Audit Log Export Tool
 * CargoBit Payment System
 * 
 * Exports audit logs for compliance, GDPR requests, and archival.
 * 
 * Usage:
 *   npx ts-node ops/export-audit-log.ts --start 2024-01-01 --end 2024-01-31
 *   npx ts-node ops/export-audit-log.ts --actor user_123
 *   npx ts-node ops/export-audit-log.ts --verify
 */

import { prisma } from "../src/db";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// =============================================================================
// CONFIGURATION
// =============================================================================

const EXPORT_DIR = process.env.EXPORT_DIR || "/var/exports/cargobit";
const BATCH_SIZE = 10000;

// =============================================================================
// TYPES
// =============================================================================

interface ExportOptions {
  startDate?: Date;
  endDate?: Date;
  actor?: string;
  entity?: string;
  action?: string;
  format: "json" | "csv";
  verifyOnly: boolean;
}

// =============================================================================
# EXPORT FUNCTIONS
# =============================================================================

/**
 * Export audit logs to JSON
 */
async function exportToJson(
  options: ExportOptions
): Promise<{ file: string; count: number; size: number }> {
  const where: any = {};
  
  if (options.startDate) where.timestamp = { ...where.timestamp, gte: options.startDate };
  if (options.endDate) where.timestamp = { ...where.timestamp, lte: options.endDate };
  if (options.actor) where.actor = options.actor;
  if (options.entity) where.entity = options.entity;
  if (options.action) where.action = options.action;
  
  // Create export directory
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `audit_export_${timestamp}.json`;
  const filepath = path.join(EXPORT_DIR, filename);
  
  console.log(`Exporting to: ${filepath}`);
  
  // Stream logs
  let count = 0;
  const writeStream = fs.createWriteStream(filepath);
  writeStream.write('[\n');
  
  let first = true;
  let skip = 0;
  let hasMore = true;
  
  while (hasMore) {
    const batch = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "asc" },
      skip,
      take: BATCH_SIZE,
    });
    
    if (batch.length === 0) {
      hasMore = false;
    } else {
      for (const log of batch) {
        if (!first) writeStream.write(',\n');
        first = false;
        
        writeStream.write(JSON.stringify({
          id: log.id,
          timestamp: log.timestamp.toISOString(),
          actor: log.actor,
          action: log.action,
          entity: log.entity,
          entityId: log.entityId,
          metadata: log.metadata,
          prevHash: log.prevHash,
          hash: log.hash,
        }));
        
        count++;
      }
      
      skip += BATCH_SIZE;
      console.log(`Exported ${count} records...`);
    }
  }
  
  writeStream.write('\n]');
  writeStream.end();
  
  // Wait for write to complete
  await new Promise(resolve => writeStream.on('finish', resolve));
  
  const stats = fs.statSync(filepath);
  
  return { file: filepath, count, size: stats.size };
}

/**
 * Export audit logs to CSV
 */
async function exportToCsv(
  options: ExportOptions
): Promise<{ file: string; count: number; size: number }> {
  const where: any = {};
  
  if (options.startDate) where.timestamp = { ...where.timestamp, gte: options.startDate };
  if (options.endDate) where.timestamp = { ...where.timestamp, lte: options.endDate };
  if (options.actor) where.actor = options.actor;
  
  // Create export directory
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `audit_export_${timestamp}.csv`;
  const filepath = path.join(EXPORT_DIR, filename);
  
  console.log(`Exporting to: ${filepath}`);
  
  const writeStream = fs.createWriteStream(filepath);
  
  // CSV header
  writeStream.write('id,timestamp,actor,action,entity,entityId,prevHash,hash\n');
  
  let count = 0;
  let skip = 0;
  let hasMore = true;
  
  while (hasMore) {
    const batch = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "asc" },
      skip,
      take: BATCH_SIZE,
      select: {
        id: true,
        timestamp: true,
        actor: true,
        action: true,
        entity: true,
        entityId: true,
        prevHash: true,
        hash: true,
      }
    });
    
    if (batch.length === 0) {
      hasMore = false;
    } else {
      for (const log of batch) {
        const row = [
          log.id,
          log.timestamp.toISOString(),
          log.actor,
          log.action,
          log.entity,
          log.entityId,
          log.prevHash || '',
          log.hash,
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
        
        writeStream.write(row + '\n');
        count++;
      }
      
      skip += BATCH_SIZE;
      console.log(`Exported ${count} records...`);
    }
  }
  
  writeStream.end();
  await new Promise(resolve => writeStream.on('finish', resolve));
  
  const stats = fs.statSync(filepath);
  
  return { file: filepath, count, size: stats.size };
}

// =============================================================================
# VERIFICATION
# =============================================================================

/**
 * Verify audit chain integrity
 */
async function verifyChain(): Promise<{ valid: boolean; errors: string[]; count: number }> {
  console.log("Verifying audit chain integrity...\n");
  
  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: "asc" },
    select: {
      id: true,
      actor: true,
      action: true,
      entity: true,
      entityId: true,
      metadata: true,
      prevHash: true,
      hash: true,
    }
  });
  
  const errors: string[] = [];
  let prevHash = "";
  
  for (const log of logs) {
    // Verify prevHash link
    if (log.prevHash !== prevHash) {
      errors.push(`Broken chain at ${log.id}: expected prevHash="${prevHash}", got="${log.prevHash}"`);
    }
    
    // Verify hash
    const payload = JSON.stringify({
      actor: log.actor,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      metadata: log.metadata,
      prevHash: log.prevHash,
    });
    
    const expectedHash = crypto.createHash("sha256").update(payload).digest("hex");
    
    if (log.hash !== expectedHash) {
      errors.push(`Hash mismatch at ${log.id}: entry may be tampered`);
    }
    
    prevHash = log.hash;
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.slice(0, 10), // Limit output
    count: logs.length,
  };
}

// =============================================================================
# CLI
# =============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  const options: ExportOptions = {
    format: "json",
    verifyOnly: false,
  };
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--start":
        options.startDate = new Date(args[++i]);
        break;
      case "--end":
        options.endDate = new Date(args[++i]);
        break;
      case "--actor":
        options.actor = args[++i];
        break;
      case "--entity":
        options.entity = args[++i];
        break;
      case "--action":
        options.action = args[++i];
        break;
      case "--format":
        options.format = args[++i] as "json" | "csv";
        break;
      case "--verify":
        options.verifyOnly = true;
        break;
      case "--help":
        console.log(`
Audit Log Export Tool

Usage: npx ts-node ops/export-audit-log.ts [OPTIONS]

Options:
  --start DATE    Start date (ISO format)
  --end DATE      End date (ISO format)
  --actor ID      Filter by actor
  --entity TYPE   Filter by entity type
  --action TYPE   Filter by action type
  --format FORMAT Output format: json | csv (default: json)
  --verify        Only verify chain integrity
  --help          Show this help

Examples:
  npx ts-node ops/export-audit-log.ts --start 2024-01-01 --end 2024-01-31
  npx ts-node ops/export-audit-log.ts --actor user_123 --format csv
  npx ts-node ops/export-audit-log.ts --verify
`);
        process.exit(0);
    }
  }
  
  // Verify mode
  if (options.verifyOnly) {
    const result = await verifyChain();
    
    console.log("\n========================================");
    console.log("VERIFICATION RESULT");
    console.log("========================================");
    console.log(`Valid: ${result.valid ? "YES" : "NO"}`);
    console.log(`Entries checked: ${result.count}`);
    console.log(`Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log("\nErrors:");
      result.errors.forEach(e => console.log(`  - ${e}`));
    }
    
    process.exit(result.valid ? 0 : 1);
  }
  
  // Export mode
  console.log("========================================");
  console.log("CargoBit Audit Log Export");
  console.log("========================================");
  
  if (options.startDate) console.log(`Start: ${options.startDate.toISOString()}`);
  if (options.endDate) console.log(`End: ${options.endDate.toISOString()}`);
  if (options.actor) console.log(`Actor: ${options.actor}`);
  console.log(`Format: ${options.format}`);
  console.log("========================================\n");
  
  const result = options.format === "csv" 
    ? await exportToCsv(options)
    : await exportToJson(options);
  
  console.log("\n========================================");
  console.log("EXPORT COMPLETE");
  console.log("========================================");
  console.log(`File: ${result.file}`);
  console.log(`Records: ${result.count}`);
  console.log(`Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
  
  process.exit(0);
}

main().catch(error => {
  console.error("Export failed:", error);
  process.exit(1);
});
