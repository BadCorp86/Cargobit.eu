/**
 * CargoBit ML Feature Store Service
 * Events → Features → Training Data
 * 
 * Python equivalent implementation:
 * - snapshot_features_for_job: Store feature snapshot after job completion
 * - export_training_data: Export for ML training
 * - get_features_for_job: Retrieve features for prediction
 */

import { prisma } from '@/lib/db';
import { buildFeatures, type FeatureVector } from './matching-ml.service';

// ============================================
// TYPES
// ============================================

export interface TrainingDataRow {
  features: FeatureVector;
  label: boolean;
  transportId: string;
  transporterId: string;
}

export interface TrainingExport {
  X: FeatureVector[];
  y: boolean[];
  metadata: {
    totalSamples: number;
    positiveRatio: number;
    exportedAt: string;
  };
}

// ============================================
// 1. SNAPSHOT FEATURES FOR JOB (Python spec)
// ============================================

/**
 * Python equivalent:
 * def snapshot_features_for_job(db: Session, job_id: str):
 *     job = get_job(db, job_id)
 *     bid = get_accepted_bid(db, job_id)
 *     transporter = get_transporter(db, bid.transporter_id)
 *     
 *     features = build_features(job, transporter)
 *     
 *     # Label: erfolgreich, kein Dispute, payout_paid
 *     has_dispute = db.query(Dispute).filter(
 *         Dispute.job_id == job.id,
 *         Dispute.status.in_(["open", "resolved", "refunded"])
 *     ).count() > 0
 *     
 *     label = (job.status == "completed" and job.payout_status == "paid" and not has_dispute)
 *     
 *     row = MLTransporterJobFeatures(
 *         id=uuid4(),
 *         job_id=job.id,
 *         transporter_id=transporter.id,
 *         features=features,
 *         label=label,
 *     )
 *     db.add(row)
 *     db.commit()
 */
export async function snapshotFeaturesForJob(
  jobId: string
): Promise<{ success: boolean; featureId?: string; label?: boolean; error?: string }> {
  // Get job
  const transport = await prisma.transport.findUnique({
    where: { id: jobId },
    include: {
      pickupAddress: true,
      deliveryAddress: true,
      transportDetail: true,
      offers: { where: { status: 'ACCEPTED' } },
      assignment: { include: { driver: true } },
    },
  });
  
  if (!transport) {
    return { success: false, error: 'Job not found' };
  }
  
  // Get accepted bid and transporter
  const acceptedOffer = transport.offers[0];
  if (!acceptedOffer || !transport.assignment?.driver) {
    return { success: false, error: 'No accepted bid or assignment' };
  }
  
  const driver = transport.assignment.driver;
  
  // Build job object for features
  const job = {
    id: transport.id,
    originRegion: transport.pickupAddress.country,
    destinationRegion: transport.deliveryAddress.country,
    weightKg: transport.transportDetail?.weightKg ?? 0,
    distanceKm: transport.distanceKm ?? undefined,
  };
  
  // Build transporter object for features
  const transporter = {
    id: driver.id,
    regionFrom: driver.currentLocation 
      ? JSON.parse(driver.currentLocation).country || 'DE' 
      : 'DE',
    regionTo: null,
    capacityKg: 0, // Would need to fetch from vehicle
    rating: driver.ratingAvg,
    stats: {
      jobsWithShipper: 0, // Would need to calculate
      cancelRate: driver.completedTransports > 0 
        ? driver.cancelledTransports / driver.completedTransports 
        : 0,
    },
  };
  
  // Build features
  const features = buildFeatures(job, transporter);
  
  // Calculate label: successful = completed, no dispute, payout paid
  const hasDispute = await prisma.dispute.count({
    where: {
      transportId: jobId,
      status: { in: ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REFUNDED'] },
    },
  }) > 0;
  
  const payoutRecord = await prisma.systemSetting.findUnique({
    where: { key: `payout_${jobId}` },
  });
  const hasPayout = payoutRecord !== null;
  
  const label = transport.status === 'COMPLETED' && !hasDispute && hasPayout;
  
  // Check if feature snapshot already exists
  const existing = await prisma.mLTransporterJobFeature.findUnique({
    where: {
      transportId_transporterId: {
        transportId: jobId,
        transporterId: driver.id,
      },
    },
  });
  
  if (existing) {
    // Update with actual outcome
    await prisma.mLTransporterJobFeature.update({
      where: { id: existing.id },
      data: {
        label,
        actualOutcome: label,
      },
    });
    
    return { success: true, featureId: existing.id, label };
  }
  
  // Create new snapshot
  const featureRecord = await prisma.mLTransporterJobFeature.create({
    data: {
      transportId: jobId,
      transporterId: driver.id,
      features: JSON.stringify(features),
      label,
    },
  });
  
  console.log(`[ML] Feature snapshot created for job ${jobId}, label: ${label}`);
  
  return { success: true, featureId: featureRecord.id, label };
}

// ============================================
// 2. EXPORT TRAINING DATA (Python spec)
// ============================================

/**
 * Python equivalent:
 * def export_training_data(db: Session, limit: int = 10000):
 *     rows = db.query(MLTransporterJobFeatures).limit(limit).all()
 *     X = [r.features for r in rows]
 *     y = [r.label for r in rows]
 *     return X, y
 */
export async function exportTrainingData(
  limit: number = 10000,
  options?: {
    minCreatedAt?: Date;
    includePredictedOnly?: boolean;
  }
): Promise<TrainingExport> {
  const where: any = {};
  
  if (options?.minCreatedAt) {
    where.createdAt = { gte: options.minCreatedAt };
  }
  
  const rows = await prisma.mLTransporterJobFeature.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  
  const X: FeatureVector[] = [];
  const y: boolean[] = [];
  
  for (const row of rows) {
    try {
      const features = JSON.parse(row.features) as FeatureVector;
      X.push(features);
      y.push(row.label);
    } catch (e) {
      console.warn(`[ML] Failed to parse features for ${row.id}`);
    }
  }
  
  const positiveCount = y.filter(l => l).length;
  
  return {
    X,
    y,
    metadata: {
      totalSamples: X.length,
      positiveRatio: X.length > 0 ? positiveCount / X.length : 0,
      exportedAt: new Date().toISOString(),
    },
  };
}

// ============================================
// 3. GET FEATURES FOR PREDICTION
// ============================================

export async function getFeaturesForJob(
  jobId: string,
  transporterId: string
): Promise<FeatureVector | null> {
  const record = await prisma.mLTransporterJobFeature.findUnique({
    where: {
      transportId_transporterId: {
        transportId: jobId,
        transporterId,
      },
    },
  });
  
  if (!record) return null;
  
  return JSON.parse(record.features) as FeatureVector;
}

// ============================================
// 4. STORE PREDICTION
// ============================================

export async function storePrediction(
  jobId: string,
  transporterId: string,
  features: FeatureVector,
  predictedScore: number,
  modelVersion?: string
): Promise<string> {
  // Create or update feature record with prediction
  const record = await prisma.mLTransporterJobFeature.upsert({
    where: {
      transportId_transporterId: {
        transportId: jobId,
        transporterId,
      },
    },
    create: {
      transportId: jobId,
      transporterId,
      features: JSON.stringify(features),
      label: false, // Will be updated when job completes
      predictedScore,
      modelVersion,
    },
    update: {
      predictedScore,
      modelVersion,
    },
  });
  
  return record.id;
}

// ============================================
// 5. UPDATE ACTUAL OUTCOME (Feedback Loop)
// ============================================

export async function updateActualOutcome(
  jobId: string,
  transporterId: string,
  outcome: boolean
): Promise<void> {
  await prisma.mLTransporterJobFeature.updateMany({
    where: {
      transportId: jobId,
      transporterId,
    },
    data: {
      actualOutcome: outcome,
      label: outcome,
    },
  });
}

// ============================================
// 6. GET FEATURE STATISTICS
// ============================================

export async function getFeatureStatistics() {
  const total = await prisma.mLTransporterJobFeature.count();
  const positive = await prisma.mLTransporterJobFeature.count({
    where: { label: true },
  });
  const withPredictions = await prisma.mLTransporterJobFeature.count({
    where: { predictedScore: { not: null } },
  });
  const withActualOutcome = await prisma.mLTransporterJobFeature.count({
    where: { actualOutcome: { not: null } },
  });
  
  // Get average predicted score
  const avgScore = await prisma.mLTransporterJobFeature.aggregate({
    where: { predictedScore: { not: null } },
    _avg: { predictedScore: true },
  });
  
  return {
    totalSamples: total,
    positiveSamples: positive,
    negativeSamples: total - positive,
    positiveRatio: total > 0 ? positive / total : 0,
    withPredictions,
    withActualOutcome,
    avgPredictedScore: avgScore._avg.predictedScore,
  };
}

// ============================================
// EXPORTS
// ============================================

export const mlFeatureStore = {
  snapshotFeaturesForJob,
  exportTrainingData,
  getFeaturesForJob,
  storePrediction,
  updateActualOutcome,
  getFeatureStatistics,
};
