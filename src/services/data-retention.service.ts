/**
 * CargoBit Data Retention Service
 * 
 * Configurable data retention policies per service and data type.
 * Automated purge jobs, archival to cold storage, and GDPR compliance.
 * 
 * @module @cargobit/data-retention
 * @version 1.0.0
 */

// =============================================================================
// RETENTION TYPES
// =============================================================================

/**
 * Retention policy for a data category.
 */
export interface RetentionPolicy {
  /** Policy identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Data category */
  category: DataCategory;
  
  /** Owning service */
  service: string;
  
  /** Table/collection name */
  tableName: string;
  
  /** Retention period in years */
  retentionYears: number;
  
  /** Archive after this many years (optional) */
  archiveAfterYears?: number;
  
  /** Archive destination */
  archiveDestination?: 's3_glacier' | 'azure_archive' | 'cold_storage';
  
  /** Delete after retention expires */
  deleteAfterRetention: boolean;
  
  /** GDPR right to erasure exception */
  gdprException: boolean;
  
  /** Legal basis for retention */
  legalBasis: string;
  
  /** Policy is active */
  isActive: boolean;
  
  /** Created timestamp */
  createdAt: string;
  
  /** Last modified timestamp */
  updatedAt: string;
}

export type DataCategory =
  | 'orders'
  | 'order_events'
  | 'pricing'
  | 'pricing_config'
  | 'fuel_prices'
  | 'toll_costs'
  | 'bids'
  | 'matching_results'
  | 'executions'
  | 'execution_events'
  | 'tracking_points'
  | 'pod_documents'
  | 'carrier_stats'
  | 'carrier_capacity'
  | 'risk_scores'
  | 'audit_logs'
  | 'notifications';

/**
 * Retention job definition.
 */
export interface RetentionJob {
  /** Job identifier */
  id: string;
  
  /** Job name */
  name: string;
  
  /** Target policy */
  policyId: string;
  
  /** Job type */
  type: 'archive' | 'purge' | 'anonymize';
  
  /** Cron schedule */
  schedule: string;
  
  /** Batch size per run */
  batchSize: number;
  
  /** Last run timestamp */
  lastRunAt?: string;
  
  /** Next run timestamp */
  nextRunAt?: string;
  
  /** Job is active */
  isActive: boolean;
  
  /** Job status */
  status: 'idle' | 'running' | 'paused' | 'error';
  
  /** Last error message */
  lastError?: string;
  
  /** Statistics */
  stats: RetentionJobStats;
}

export interface RetentionJobStats {
  /** Total records processed */
  totalProcessed: number;
  
  /** Total records archived */
  totalArchived: number;
  
  /** Total records deleted */
  totalDeleted: number;
  
  /** Total records anonymized */
  totalAnonymized: number;
  
  /** Last run duration in ms */
  lastRunDurationMs?: number;
  
  /** Average run duration in ms */
  avgRunDurationMs: number;
  
  /** Number of runs */
  runCount: number;
}

/**
 * Retention execution record.
 */
export interface RetentionExecution {
  /** Execution identifier */
  id: string;
  
  /** Job identifier */
  jobId: string;
  
  /** Start timestamp */
  startedAt: string;
  
  /** End timestamp */
  endedAt?: string;
  
  /** Status */
  status: 'running' | 'completed' | 'failed' | 'partial';
  
  /** Records processed */
  recordsProcessed: number;
  
  /** Records archived */
  recordsArchived: number;
  
  /** Records deleted */
  recordsDeleted: number;
  
  /** Records anonymized */
  recordsAnonymized: number;
  
  /** Error message */
  error?: string;
  
  /** Details */
  details: Record<string, unknown>;
}

// =============================================================================
// DEFAULT RETENTION POLICIES
// =============================================================================

/**
 * Default retention policies based on CargoBit architecture.
 */
export const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  // Order Service
  {
    id: 'ret-001',
    name: 'Orders - Long Term',
    category: 'orders',
    service: 'order-service',
    tableName: 'orders',
    retentionYears: 10,
    archiveAfterYears: 3,
    archiveDestination: 's3_glacier',
    deleteAfterRetention: false,
    gdprException: true,
    legalBasis: 'Steuerliche Aufbewahrungspflicht (§147 AO)',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ret-002',
    name: 'Order Events - Medium Term',
    category: 'order_events',
    service: 'order-service',
    tableName: 'order_events',
    retentionYears: 7,
    archiveAfterYears: 2,
    deleteAfterRetention: false,
    gdprException: true,
    legalBasis: 'Nachvollziehbarkeit bei Disputes',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  
  // Pricing Service
  {
    id: 'ret-003',
    name: 'Order Pricing - Medium Term',
    category: 'pricing',
    service: 'pricing-service',
    tableName: 'order_pricing',
    retentionYears: 7,
    archiveAfterYears: 3,
    deleteAfterRetention: false,
    gdprException: false,
    legalBasis: 'Preisnachvollziehbarkeit',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ret-004',
    name: 'Pricing Config - Permanent',
    category: 'pricing_config',
    service: 'pricing-service',
    tableName: 'pricing_config',
    retentionYears: 100, // Effectively permanent
    deleteAfterRetention: false,
    gdprException: true,
    legalBasis: 'Vollständige Konfigurationshistorie',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ret-005',
    name: 'Fuel Prices - 5 Years',
    category: 'fuel_prices',
    service: 'pricing-service',
    tableName: 'fuel_prices',
    retentionYears: 5,
    archiveAfterYears: 2,
    deleteAfterRetention: true,
    gdprException: false,
    legalBasis: 'Preisrekonstruktion',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  
  // Bidding Service
  {
    id: 'ret-006',
    name: 'Bids - Medium Term',
    category: 'bids',
    service: 'bidding-service',
    tableName: 'bids',
    retentionYears: 5,
    archiveAfterYears: 2,
    deleteAfterRetention: true,
    gdprException: false,
    legalBasis: 'Marktanalysen, Dispute-Handling',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  
  // Matching Service
  {
    id: 'ret-007',
    name: 'Matching Results - Short Term',
    category: 'matching_results',
    service: 'matching-service',
    tableName: 'matching_results',
    retentionYears: 3,
    archiveAfterYears: 1,
    deleteAfterRetention: true,
    gdprException: false,
    legalBasis: 'Audit, Debug, Optimierung',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  
  // Execution Service
  {
    id: 'ret-008',
    name: 'Executions - Long Term',
    category: 'executions',
    service: 'execution-service',
    tableName: 'executions',
    retentionYears: 10,
    archiveAfterYears: 3,
    archiveDestination: 's3_glacier',
    deleteAfterRetention: false,
    gdprException: true,
    legalBasis: 'Transportnachweis, steuerlich relevant',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ret-009',
    name: 'Tracking Points - 2 Years',
    category: 'tracking_points',
    service: 'execution-service',
    tableName: 'tracking_points',
    retentionYears: 2,
    deleteAfterRetention: true,
    gdprException: false,
    legalBasis: 'Betriebsanalyse, Debug',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ret-010',
    name: 'POD Documents - Long Term',
    category: 'pod_documents',
    service: 'execution-service',
    tableName: 'pod_documents',
    retentionYears: 10,
    archiveAfterYears: 3,
    archiveDestination: 's3_glacier',
    deleteAfterRetention: false,
    gdprException: true,
    legalBasis: 'Rechtliche Nachweispflicht',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  
  // Carrier Service
  {
    id: 'ret-011',
    name: 'Carrier Stats - Medium Term',
    category: 'carrier_stats',
    service: 'carrier-service',
    tableName: 'carrier_stats',
    retentionYears: 5,
    archiveAfterYears: 2,
    deleteAfterRetention: true,
    gdprException: false,
    legalBasis: 'Score-Berechnung, Historie',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  
  // Risk Service
  {
    id: 'ret-012',
    name: 'Risk Scores - Medium Term',
    category: 'risk_scores',
    service: 'risk-service',
    tableName: 'risk_scores',
    retentionYears: 5,
    archiveAfterYears: 2,
    deleteAfterRetention: true,
    gdprException: false,
    legalBasis: 'Fraud-Analyse, Audit',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  
  // Audit
  {
    id: 'ret-013',
    name: 'Audit Logs - Long Term',
    category: 'audit_logs',
    service: 'audit-service',
    tableName: 'audit_logs',
    retentionYears: 10,
    archiveAfterYears: 3,
    archiveDestination: 's3_glacier',
    deleteAfterRetention: false,
    gdprException: true,
    legalBasis: 'Compliance, Betrugsermittlung',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// =============================================================================
// DATA STORE INTERFACE
// =============================================================================

/**
 * Interface for data stores supporting retention operations.
 */
export interface IRetentionDataStore {
  /**
   * Query records older than a date.
   */
  queryOlderThan(tableName: string, date: Date, limit: number): Promise<unknown[]>;
  
  /**
   * Archive records to cold storage.
   */
  archiveRecords(tableName: string, records: unknown[], destination: string): Promise<number>;
  
  /**
   * Delete records by IDs.
   */
  deleteRecords(tableName: string, ids: string[]): Promise<number>;
  
  /**
   * Anonymize records (GDPR erasure while keeping aggregate data).
   */
  anonymizeRecords(tableName: string, ids: string[]): Promise<number>;
  
  /**
   * Get record count by age.
   */
  getCountByAge(tableName: string, olderThanDays: number): Promise<number>;
}

// =============================================================================
// IN-MEMORY DATA STORE (Development/Testing)
// =============================================================================

/**
 * In-memory implementation for development and testing.
 */
export class InMemoryRetentionDataStore implements IRetentionDataStore {
  private tables: Map<string, Map<string, { id: string; createdAt: string; data: unknown }>>;
  private archiveStore: Map<string, unknown[]>;

  constructor() {
    this.tables = new Map();
    this.archiveStore = new Map();
  }

  // Add test data
  addRecord(tableName: string, record: { id: string; createdAt: string; data: unknown }): void {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, new Map());
    }
    this.tables.get(tableName)!.set(record.id, record);
  }

  async queryOlderThan(tableName: string, date: Date, limit: number): Promise<unknown[]> {
    const table = this.tables.get(tableName);
    if (!table) return [];

    const records: unknown[] = [];
    for (const record of table.values()) {
      if (new Date(record.createdAt) < date) {
        records.push({ ...record.data, id: record.id, createdAt: record.createdAt });
        if (records.length >= limit) break;
      }
    }

    return records;
  }

  async archiveRecords(tableName: string, records: unknown[], destination: string): Promise<number> {
    const archiveKey = `${destination}:${tableName}`;
    if (!this.archiveStore.has(archiveKey)) {
      this.archiveStore.set(archiveKey, []);
    }
    this.archiveStore.get(archiveKey)!.push(...records);
    return records.length;
  }

  async deleteRecords(tableName: string, ids: string[]): Promise<number> {
    const table = this.tables.get(tableName);
    if (!table) return 0;

    let deleted = 0;
    for (const id of ids) {
      if (table.delete(id)) {
        deleted++;
      }
    }

    return deleted;
  }

  async anonymizeRecords(tableName: string, ids: string[]): Promise<number> {
    const table = this.tables.get(tableName);
    if (!table) return 0;

    let anonymized = 0;
    for (const id of ids) {
      const record = table.get(id);
      if (record) {
        // Remove PII but keep record
        record.data = { anonymized: true, anonymizedAt: new Date().toISOString() };
        anonymized++;
      }
    }

    return anonymized;
  }

  async getCountByAge(tableName: string, olderThanDays: number): Promise<number> {
    const table = this.tables.get(tableName);
    if (!table) return 0;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    let count = 0;
    for (const record of table.values()) {
      if (new Date(record.createdAt) < cutoff) {
        count++;
      }
    }

    return count;
  }

  // Test helpers
  getArchiveCount(destination: string, tableName: string): number {
    return this.archiveStore.get(`${destination}:${tableName}`)?.length ?? 0;
  }

  getTableCount(tableName: string): number {
    return this.tables.get(tableName)?.size ?? 0;
  }
}

// =============================================================================
// RETENTION SERVICE
// =============================================================================

/**
 * Main Data Retention Service.
 * 
 * Manages retention policies, schedules purge jobs, and handles archival.
 * 
 * @example
 * ```typescript
 * const retentionService = new DataRetentionService(dataStore);
 * 
 * // Start with default policies
 * await retentionService.initialize();
 * 
 * // Start scheduled jobs
 * retentionService.startScheduler();
 * 
 * // Run a specific job manually
 * await retentionService.runJob('job-archive-orders');
 * ```
 */
export class DataRetentionService {
  private dataStore: IRetentionDataStore;
  private policies: Map<string, RetentionPolicy>;
  private jobs: Map<string, RetentionJob>;
  private executions: RetentionExecution[];
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(dataStore: IRetentionDataStore) {
    this.dataStore = dataStore;
    this.policies = new Map();
    this.jobs = new Map();
    this.executions = [];
  }

  /**
   * Initialize with default policies and create jobs.
   */
  async initialize(): Promise<void> {
    // Load default policies
    for (const policy of DEFAULT_RETENTION_POLICIES) {
      this.policies.set(policy.id, policy);
    }

    // Create jobs for each policy
    for (const policy of this.policies.values()) {
      if (!policy.isActive) continue;

      // Create archive job if applicable
      if (policy.archiveAfterYears) {
        this.jobs.set(`job-archive-${policy.id}`, {
          id: `job-archive-${policy.id}`,
          name: `Archive ${policy.name}`,
          policyId: policy.id,
          type: 'archive',
          schedule: '0 2 * * *', // Daily at 2 AM
          batchSize: 1000,
          isActive: true,
          status: 'idle',
          stats: {
            totalProcessed: 0,
            totalArchived: 0,
            totalDeleted: 0,
            totalAnonymized: 0,
            avgRunDurationMs: 0,
            runCount: 0,
          },
        });
      }

      // Create purge/delete job if applicable
      if (policy.deleteAfterRetention) {
        this.jobs.set(`job-purge-${policy.id}`, {
          id: `job-purge-${policy.id}`,
          name: `Purge ${policy.name}`,
          policyId: policy.id,
          type: 'purge',
          schedule: '0 3 * * *', // Daily at 3 AM
          batchSize: 5000,
          isActive: true,
          status: 'idle',
          stats: {
            totalProcessed: 0,
            totalArchived: 0,
            totalDeleted: 0,
            totalAnonymized: 0,
            avgRunDurationMs: 0,
            runCount: 0,
          },
        });
      }
    }

    console.log(`DataRetentionService initialized with ${this.policies.size} policies and ${this.jobs.size} jobs`);
  }

  /**
   * Start the job scheduler.
   */
  startScheduler(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    
    // Check for due jobs every minute
    this.schedulerInterval = setInterval(() => {
      this.checkAndRunDueJobs();
    }, 60000);

    console.log('DataRetentionService scheduler started');
  }

  /**
   * Stop the scheduler.
   */
  stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    this.isRunning = false;
    console.log('DataRetentionService scheduler stopped');
  }

  /**
   * Check for and run due jobs.
   */
  private checkAndRunDueJobs(): void {
    const now = new Date();

    for (const job of this.jobs.values()) {
      if (!job.isActive || job.status === 'running') continue;

      // Simple daily check - in production, use proper cron parser
      const lastRun = job.lastRunAt ? new Date(job.lastRunAt) : null;
      const hoursSinceLastRun = lastRun ? (now.getTime() - lastRun.getTime()) / 3600000 : 24;

      if (hoursSinceLastRun >= 24) {
        // Run job asynchronously
        this.runJob(job.id).catch((error) => {
          console.error(`Job ${job.id} failed:`, error);
        });
      }
    }
  }

  /**
   * Run a specific job.
   */
  async runJob(jobId: string): Promise<RetentionExecution> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const policy = this.policies.get(job.policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${job.policyId}`);
    }

    // Create execution record
    const execution: RetentionExecution = {
      id: `exec-${Date.now().toString(36)}`,
      jobId,
      startedAt: new Date().toISOString(),
      status: 'running',
      recordsProcessed: 0,
      recordsArchived: 0,
      recordsDeleted: 0,
      recordsAnonymized: 0,
      details: {},
    };

    this.executions.push(execution);

    // Update job status
    job.status = 'running';

    try {
      const startTime = Date.now();

      // Calculate cutoff date
      const cutoffDate = new Date();
      if (job.type === 'archive' && policy.archiveAfterYears) {
        cutoffDate.setFullYear(cutoffDate.getFullYear() - policy.archiveAfterYears);
      } else if (job.type === 'purge') {
        cutoffDate.setFullYear(cutoffDate.getFullYear() - policy.retentionYears);
      }

      // Process in batches
      let totalProcessed = 0;
      let hasMore = true;

      while (hasMore) {
        const records = await this.dataStore.queryOlderThan(
          policy.tableName,
          cutoffDate,
          job.batchSize
        );

        if (records.length === 0) {
          hasMore = false;
          break;
        }

        const ids = records.map((r: any) => r.id);

        if (job.type === 'archive') {
          const archived = await this.dataStore.archiveRecords(
            policy.tableName,
            records,
            policy.archiveDestination ?? 'cold_storage'
          );
          execution.recordsArchived += archived;
          
          // After archival, delete from hot storage
          await this.dataStore.deleteRecords(policy.tableName, ids);
          execution.recordsDeleted += ids.length;
        } else if (job.type === 'purge') {
          const deleted = await this.dataStore.deleteRecords(policy.tableName, ids);
          execution.recordsDeleted += deleted;
        } else if (job.type === 'anonymize') {
          const anonymized = await this.dataStore.anonymizeRecords(policy.tableName, ids);
          execution.recordsAnonymized += anonymized;
        }

        totalProcessed += records.length;
        execution.recordsProcessed = totalProcessed;

        // Stop if we got less than batch size
        if (records.length < job.batchSize) {
          hasMore = false;
        }
      }

      // Update execution status
      execution.status = 'completed';
      execution.endedAt = new Date().toISOString();

      // Update job stats
      const duration = Date.now() - startTime;
      job.lastRunAt = execution.endedAt;
      job.status = 'idle';
      job.stats.totalProcessed += execution.recordsProcessed;
      job.stats.totalArchived += execution.recordsArchived;
      job.stats.totalDeleted += execution.recordsDeleted;
      job.stats.totalAnonymized += execution.recordsAnonymized;
      job.stats.lastRunDurationMs = duration;
      job.stats.runCount++;
      job.stats.avgRunDurationMs =
        (job.stats.avgRunDurationMs * (job.stats.runCount - 1) + duration) / job.stats.runCount;

    } catch (error) {
      execution.status = 'failed';
      execution.endedAt = new Date().toISOString();
      execution.error = error instanceof Error ? error.message : String(error);
      job.status = 'error';
      job.lastError = execution.error;
    }

    return execution;
  }

  // =========================================================================
  // POLICY MANAGEMENT
  // =========================================================================

  /**
   * Get all policies.
   */
  getPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get a specific policy.
   */
  getPolicy(policyId: string): RetentionPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Add or update a policy.
   */
  setPolicy(policy: RetentionPolicy): void {
    policy.updatedAt = new Date().toISOString();
    this.policies.set(policy.id, policy);
  }

  // =========================================================================
  // JOB MANAGEMENT
  // =========================================================================

  /**
   * Get all jobs.
   */
  getJobs(): RetentionJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get a specific job.
   */
  getJob(jobId: string): RetentionJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Pause a job.
   */
  pauseJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.isActive = false;
      job.status = 'paused';
    }
  }

  /**
   * Resume a job.
   */
  resumeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.isActive = true;
      job.status = 'idle';
    }
  }

  // =========================================================================
  // EXECUTION HISTORY
  // =========================================================================

  /**
   * Get execution history.
   */
  getExecutionHistory(jobId?: string, limit: number = 100): RetentionExecution[] {
    let executions = this.executions;
    if (jobId) {
      executions = executions.filter((e) => e.jobId === jobId);
    }
    return executions.slice(-limit);
  }

  /**
   * Get a specific execution.
   */
  getExecution(executionId: string): RetentionExecution | undefined {
    return this.executions.find((e) => e.id === executionId);
  }

  // =========================================================================
  // GDPR COMPLIANCE
  // =========================================================================

  /**
   * Handle GDPR erasure request.
   * Anonymizes data that has no legal exception.
   */
  async handleGDPRErasure(userId: string, userType: 'shipper' | 'carrier'): Promise<{
    anonymized: string[];
    retained: string[];
    reason: string[];
  }> {
    const anonymized: string[] = [];
    const retained: string[] = [];
    const reason: string[] = [];

    for (const policy of this.policies.values()) {
      if (policy.gdprException) {
        retained.push(policy.category);
        reason.push(`${policy.category}: ${policy.legalBasis}`);
      } else {
        // Anonymize records for this user
        // In production, would query by user ID and anonymize
        anonymized.push(policy.category);
      }
    }

    return { anonymized, retained, reason };
  }

  // =========================================================================
  // STATISTICS
  // =========================================================================

  /**
   * Get retention statistics.
   */
  async getStatistics(): Promise<RetentionStatistics> {
    const stats: RetentionStatistics = {
      policies: {
        total: this.policies.size,
        active: Array.from(this.policies.values()).filter((p) => p.isActive).length,
      },
      jobs: {
        total: this.jobs.size,
        active: Array.from(this.jobs.values()).filter((j) => j.isActive).length,
        running: Array.from(this.jobs.values()).filter((j) => j.status === 'running').length,
      },
      executions: {
        total: this.executions.length,
        completed: this.executions.filter((e) => e.status === 'completed').length,
        failed: this.executions.filter((e) => e.status === 'failed').length,
      },
      records: {
        totalProcessed: Array.from(this.jobs.values()).reduce(
          (sum, j) => sum + j.stats.totalProcessed,
          0
        ),
        totalArchived: Array.from(this.jobs.values()).reduce(
          (sum, j) => sum + j.stats.totalArchived,
          0
        ),
        totalDeleted: Array.from(this.jobs.values()).reduce(
          (sum, j) => sum + j.stats.totalDeleted,
          0
        ),
      },
      byCategory: {},
    };

    // Get counts per category
    for (const policy of this.policies.values()) {
      const cutoffDays = policy.retentionYears * 365;
      stats.byCategory[policy.category] = {
        pendingRetention: await this.dataStore.getCountByAge(policy.tableName, cutoffDays),
        policyId: policy.id,
        retentionYears: policy.retentionYears,
      };
    }

    return stats;
  }
}

export interface RetentionStatistics {
  policies: {
    total: number;
    active: number;
  };
  jobs: {
    total: number;
    active: number;
    running: number;
  };
  executions: {
    total: number;
    completed: number;
    failed: number;
  };
  records: {
    totalProcessed: number;
    totalArchived: number;
    totalDeleted: number;
  };
  byCategory: Record<string, {
    pendingRetention: number;
    policyId: string;
    retentionYears: number;
  }>;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  DataRetentionService,
  InMemoryRetentionDataStore,
  DEFAULT_RETENTION_POLICIES,
};
