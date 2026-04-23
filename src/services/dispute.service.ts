/**
 * CargoBit Dispute Service
 * Dispute creation, admin review, refund processing
 * 
 * Python equivalent implementation:
 * - create_dispute: Open dispute for a job
 * - resolve_dispute: Admin decision + refund
 * - process_refund_for_job: Wallet refund logic
 */

import { prisma } from '@/lib/db';
import type { DisputeStatus, DisputeAction } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface CreateDisputeRequest {
  reason: string;
  description?: string;
  evidence?: string[];  // URLs to documents
}

export interface ResolveDisputeRequest {
  action: DisputeAction;
  resolution: string;
  refundAmountCents?: number;
}

export interface DisputeResult {
  success: boolean;
  disputeId?: string;
  status?: DisputeStatus;
  error?: string;
}

// ============================================
// 1. CREATE DISPUTE (Python spec)
// ============================================

/**
 * Python equivalent:
 * @router.post("/jobs/{job_id}/disputes")
 * def create_dispute(
 *     job_id: str,
 *     req: CreateDisputeRequest,
 *     db: Session = Depends(get_db),
 *     user_id: str = Depends(get_current_user),
 * ):
 *     job = get_job(db, job_id)
 *     if not job:
 *         raise HTTPException(404, "Job not found")
 *     
 *     dispute = Dispute(
 *         id=uuid4(),
 *         job_id=job.id,
 *         created_by=user_id,
 *         reason=req.reason,
 *         status="open",
 *     )
 *     db.add(dispute)
 *     job.status = "in_dispute"
 *     db.add(job)
 *     db.commit()
 *     return {"status": "open", "dispute_id": str(dispute.id)}
 */
export async function createDispute(
  jobId: string,
  userId: string,
  req: CreateDisputeRequest
): Promise<DisputeResult> {
  // Get job
  const transport = await prisma.transport.findUnique({
    where: { id: jobId },
  });
  
  if (!transport) {
    return { success: false, error: 'Job not found' };
  }
  
  // Check if user is involved (shipper or transporter)
  const driver = await prisma.driver.findFirst({ where: { userId } });
  const isShipper = transport.shipperUserId === userId;
  const isTransporter = driver && 
    (await prisma.assignment.findFirst({
      where: { transportId: jobId, driverId: driver.id },
    }));
  
  if (!isShipper && !isTransporter) {
    return { success: false, error: 'Not authorized to create dispute' };
  }
  
  // Check if dispute already exists
  const existingDispute = await prisma.dispute.findFirst({
    where: { transportId: jobId, status: { in: ['OPEN', 'IN_REVIEW'] } },
  });
  
  if (existingDispute) {
    return { 
      success: false, 
      error: 'Dispute already exists for this job',
      disputeId: existingDispute.id,
    };
  }
  
  // Create dispute
  const dispute = await prisma.$transaction(async (tx) => {
    const d = await tx.dispute.create({
      data: {
        transportId: jobId,
        createdById: userId,
        reason: req.reason,
        description: req.description,
        status: 'OPEN',
        evidence: req.evidence ? JSON.stringify(req.evidence) : null,
      },
    });
    
    // Update transport status (no IN_DISPUTE status, use note)
    await tx.transportStatusHistory.create({
      data: {
        transportId: jobId,
        status: transport.status,
        changedBy: userId,
        note: `Dispute opened: ${req.reason}`,
      },
    });
    
    return d;
  });
  
  // Notify admins
  const admins = await prisma.user.findMany({
    where: { roles: { some: { role: { name: 'ADMIN' } } } },
  });
  
  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'NEW_DISPUTE',
        title: 'Neuer Dispute',
        message: `Dispute für Job ${jobId}: ${req.reason}`,
        data: JSON.stringify({ disputeId: dispute.id, jobId }),
      },
    });
  }
  
  return { 
    success: true, 
    disputeId: dispute.id, 
    status: 'OPEN' 
  };
}

// ============================================
// 2. RESOLVE DISPUTE (Python spec)
// ============================================

/**
 * Python equivalent:
 * @router.post("/disputes/{dispute_id}/resolve")
 * def resolve_dispute(
 *     dispute_id: str,
 *     req: ResolveDisputeRequest,
 *     db: Session = Depends(get_db),
 *     admin_id: str = Depends(require_admin),
 * ):
 *     d = get_dispute(db, dispute_id)
 *     job = get_job(db, d.job_id)
 *     bid = get_accepted_bid(db, job.id)
 *     
 *     if req.action.startswith("refund"):
 *         amount = req.refund_amount_cents or bid.price_cents
 *         process_refund_for_job(db, job, amount)
 *         d.status = "refunded"
 *         job.status = "refunded"
 *     elif req.action == "reject":
 *         d.status = "rejected"
 *         job.status = "completed"
 *     
 *     d.resolution = req.resolution
 *     db.add(d)
 *     db.add(job)
 *     db.commit()
 *     return {"status": d.status}
 */
export async function resolveDispute(
  disputeId: string,
  adminId: string,
  req: ResolveDisputeRequest
): Promise<DisputeResult> {
  // Get dispute
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
  });
  
  if (!dispute) {
    return { success: false, error: 'Dispute not found' };
  }
  
  // Get related entities
  const transport = await prisma.transport.findUnique({
    where: { id: dispute.transportId },
    include: { 
      offers: { where: { status: 'ACCEPTED' } },
      assignment: true,
    },
  });
  
  if (!transport) {
    return { success: false, error: 'Transport not found' };
  }
  
  const acceptedOffer = transport.offers[0];
  
  // Calculate refund amount
  let refundAmount = 0;
  if (req.action === 'REFUND_FULL' && acceptedOffer) {
    refundAmount = acceptedOffer.price;
  } else if (req.action === 'REFUND_PARTIAL' && req.refundAmountCents) {
    refundAmount = req.refundAmountCents / 100;
  }
  
  // Process resolution
  const result = await prisma.$transaction(async (tx) => {
    // Process refund if applicable
    if (refundAmount > 0 && req.action !== 'REJECT') {
      await processRefundForJob(tx, dispute.transportId, transport.shipperUserId, refundAmount);
    }
    
    // Update dispute
    const updated = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: req.action === 'REJECT' ? 'REJECTED' : 'REFUNDED',
        action: req.action,
        resolution: req.resolution,
        refundAmount: refundAmount > 0 ? refundAmount : null,
        reviewedById: adminId,
        reviewedAt: new Date(),
        resolvedAt: new Date(),
      },
    });
    
    // Create audit log
    await tx.transportStatusHistory.create({
      data: {
        transportId: dispute.transportId,
        status: transport.status,
        changedBy: adminId,
        note: `Dispute resolved: ${req.action} - ${req.resolution}`,
      },
    });
    
    return updated;
  });
  
  // Notify parties
  await prisma.notification.create({
    data: {
      userId: dispute.createdById,
      type: 'DISPUTE_RESOLVED',
      title: 'Dispute resolved',
      message: `Your dispute has been resolved: ${req.resolution}`,
      data: JSON.stringify({ disputeId, action: req.action }),
    },
  });
  
  return { 
    success: true, 
    disputeId, 
    status: result.status 
  };
}

// ============================================
// 3. PROCESS REFUND FOR JOB
// ============================================

async function processRefundForJob(
  tx: any,
  transportId: string,
  shipperUserId: string,
  amount: number
): Promise<void> {
  // Get shipper wallet
  let shipperWallet = await tx.wallet.findFirst({
    where: { ownerUserId: shipperUserId },
  });
  
  if (!shipperWallet) {
    shipperWallet = await tx.wallet.create({
      data: {
        ownerUserId: shipperUserId,
        balance: 0,
        currency: 'EUR',
        status: 'ACTIVE',
      },
    });
  }
  
  // Credit shipper wallet
  await tx.wallet.update({
    where: { id: shipperWallet.id },
    data: { balance: { increment: amount } },
  });
  
  // Create transaction record
  await tx.walletTransaction.create({
    data: {
      walletId: shipperWallet.id,
      type: 'REFUND',
      amount,
      currency: 'EUR',
      relatedTransportId: transportId,
      description: 'Dispute refund',
      processedAt: new Date(),
    },
  });
}

// ============================================
// 4. GET DISPUTES
// ============================================

export async function getDisputes(options?: {
  status?: DisputeStatus;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};
  if (options?.status) {
    where.status = options.status;
  }
  
  const disputes = await prisma.dispute.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 20,
    skip: options?.offset || 0,
    include: {
      transport: {
        select: {
          id: true,
          status: true,
          shipperUserId: true,
        },
      },
    },
  });
  
  return disputes;
}

// ============================================
// 5. GET DISPUTE BY ID
// ============================================

export async function getDisputeById(disputeId: string) {
  return prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      transport: {
        include: {
          offers: { where: { status: 'ACCEPTED' } },
          assignment: { include: { driver: true } },
        },
      },
    },
  });
}

// ============================================
// EXPORTS
// ============================================

export const disputeService = {
  createDispute,
  resolveDispute,
  getDisputes,
  getDisputeById,
};
