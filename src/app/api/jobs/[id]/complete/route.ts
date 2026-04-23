/**
 * CargoBit Complete Job Endpoint - PRODUCTION READY
 * POST /api/jobs/[id]/complete - Mark job as completed
 * 
 * Status transition: IN_TRANSIT → COMPLETED
 * Optional: Trigger automatic payout
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { payoutService } from '@/services/payout.service';

// ============================================
// TYPES
// ============================================

interface CompleteJobRequest {
  delivery_photo_url?: string;
  pod_signature_url?: string;
  notes?: string;
  trigger_payout?: boolean;  // Default: true
}

// ============================================
// POST /api/jobs/[id]/complete
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id: jobId } = await params;
    const body: CompleteJobRequest = await request.json().catch(() => ({}));
    
    // Get job
    const transport = await prisma.transport.findUnique({
      where: { id: jobId },
      include: {
        assignment: { include: { driver: true } },
        offers: { where: { status: 'ACCEPTED' } },
      },
    });
    
    if (!transport) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Check authorization
    const driver = await prisma.driver.findFirst({
      where: { userId },
    });
    
    const isAdmin = request.headers.get('x-user-role') === 'ADMIN';
    const isAssignedDriver = driver && transport.assignment?.driverId === driver.id;
    
    if (!isAdmin && !isAssignedDriver) {
      return NextResponse.json(
        { error: 'Only assigned driver or admin can complete this job' },
        { status: 403 }
      );
    }
    
    // Check status
    const completableStatuses = ['IN_TRANSIT', 'PICKUP_DONE', 'DELIVERY_DONE'];
    if (!completableStatuses.includes(transport.status)) {
      return NextResponse.json(
        { error: `Job status '${transport.status}' cannot be completed` },
        { status: 400 }
      );
    }
    
    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update job status
      const updatedJob = await tx.transport.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          deliveredAt: new Date(),
        },
      });
      
      // Create status history
      await tx.transportStatusHistory.create({
        data: {
          transportId: jobId,
          status: 'COMPLETED',
          changedBy: userId,
          note: body.notes || 'Job completed',
        },
      });
      
      // Create delivery documents if provided
      if (body.delivery_photo_url) {
        await tx.document.create({
          data: {
            transportId: jobId,
            type: 'foto_delivery',
            name: 'Delivery Photo',
            fileUrl: body.delivery_photo_url,
            createdBy: userId,
          },
        });
      }
      
      if (body.pod_signature_url) {
        await tx.document.create({
          data: {
            transportId: jobId,
            type: 'pod',
            name: 'Proof of Delivery',
            fileUrl: body.pod_signature_url,
            isSigned: true,
            signedAt: new Date(),
            createdBy: userId,
          },
        });
      }
      
      // Update driver stats
      if (transport.assignment?.driverId) {
        await tx.driver.update({
          where: { id: transport.assignment.driverId },
          data: {
            completedTransports: { increment: 1 },
          },
        });
      }
      
      return updatedJob;
    });
    
    // Trigger automatic payout (default: true)
    let payoutResult = null;
    
    if (body.trigger_payout !== false && transport.assignment?.driverId) {
      const connectStatus = await payoutService.getConnectStatus(transport.assignment.driverId);
      
      if (connectStatus.payoutsEnabled) {
        payoutResult = await payoutService.processPayoutForJob(jobId);
      }
    }
    
    // Notify shipper
    await prisma.notification.create({
      data: {
        userId: transport.shipperUserId,
        type: 'TRANSPORT_COMPLETED',
        title: 'Transport abgeschlossen',
        message: `Der Transport ${jobId} wurde erfolgreich abgeschlossen.`,
        data: JSON.stringify({ jobId }),
      },
    });
    
    // Response
    const response: any = {
      status: 'completed',
      job_id: jobId,
      completed_at: result.completedAt!.toISOString(),
    };
    
    if (payoutResult) {
      response.payout = {
        success: payoutResult.success,
        reference: payoutResult.payoutReference,
        amount: payoutResult.netAmount,
        error: payoutResult.error,
      };
    }
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('[API] POST /jobs/[id]/complete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete job' },
      { status: 500 }
    );
  }
}
